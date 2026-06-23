import { createRequire } from "node:module";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const User = require("../models/userModel");
const oauthTokenService = require("../utils/oauthTokenService");

const { getValidProviderAccessToken } = oauthTokenService;

const makeUser = (oauthTokens = {}) => ({
  _id: "u1",
  oauthTokens,
  save: vi.fn().mockResolvedValue(undefined),
});

describe("oauthTokenService.getValidProviderAccessToken", () => {
  let originalFetch;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    originalFetch = global.fetch;
    process.env.GOOGLE_CLIENT_ID = "google-client-id";
    process.env.GOOGLE_CLIENT_SECRET = "google-client-secret";
    process.env.GITHUB_CLIENT_ID = "github-client-id";
    process.env.GITHUB_CLIENT_SECRET = "github-client-secret";
    process.env.FACEBOOK_APP_ID = "facebook-app-id";
    process.env.FACEBOOK_APP_SECRET = "facebook-app-secret";
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("throws for an unsupported provider", async () => {
    vi.spyOn(User, "findById").mockResolvedValue(makeUser());

    await expect(
      getValidProviderAccessToken({ userId: "u1", provider: "twitter" }),
    ).rejects.toThrow("Unsupported provider: twitter");
  });

  it("throws when the user cannot be found", async () => {
    vi.spyOn(User, "findById").mockResolvedValue(null);

    await expect(
      getValidProviderAccessToken({ userId: "missing", provider: "google" }),
    ).rejects.toThrow("User not found.");
  });

  it("throws when the user has no stored access token for the provider", async () => {
    vi.spyOn(User, "findById").mockResolvedValue(makeUser({}));

    await expect(
      getValidProviderAccessToken({ userId: "u1", provider: "google" }),
    ).rejects.toThrow("No google access token found for this user.");
  });

  it("returns the stored token without refreshing when it is still fresh", async () => {
    const user = makeUser({
      google: {
        accessToken: "fresh-token",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        updatedAt: new Date(),
      },
    });
    vi.spyOn(User, "findById").mockResolvedValue(user);
    global.fetch = vi.fn();

    const result = await getValidProviderAccessToken({
      userId: "u1",
      provider: "google",
    });

    expect(result.source).toBe("stored");
    expect(result.accessToken).toBe("fresh-token");
    expect(global.fetch).not.toHaveBeenCalled();
    expect(user.save).not.toHaveBeenCalled();
  });

  it("treats a token with no expiresAt as fresh (never refreshes it)", async () => {
    const user = makeUser({
      github: { accessToken: "token-without-expiry" },
    });
    vi.spyOn(User, "findById").mockResolvedValue(user);
    global.fetch = vi.fn();

    const result = await getValidProviderAccessToken({
      userId: "u1",
      provider: "github",
    });

    expect(result.source).toBe("stored");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("refreshes an expired Google token and persists the new value", async () => {
    const user = makeUser({
      google: {
        accessToken: "old-token",
        refreshToken: "google-refresh-token",
        expiresAt: new Date(Date.now() - 1000), // already expired
      },
    });
    vi.spyOn(User, "findById").mockResolvedValue(user);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: "new-google-token",
        token_type: "Bearer",
        scope: "email profile",
        expires_in: 3600,
      }),
    });

    const result = await getValidProviderAccessToken({
      userId: "u1",
      provider: "google",
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "https://oauth2.googleapis.com/token",
      expect.objectContaining({ method: "POST" }),
    );
    expect(result.source).toBe("refreshed");
    expect(result.accessToken).toBe("new-google-token");
    expect(user.oauthTokens.google.accessToken).toBe("new-google-token");
    expect(user.save).toHaveBeenCalledWith({ validateBeforeSave: false });
  });

  it("forces a refresh even when the stored token is still fresh if forceRefresh is true", async () => {
    const user = makeUser({
      google: {
        accessToken: "still-fresh-token",
        refreshToken: "google-refresh-token",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    vi.spyOn(User, "findById").mockResolvedValue(user);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: "forced-refresh-token",
        expires_in: 3600,
      }),
    });

    const result = await getValidProviderAccessToken({
      userId: "u1",
      provider: "google",
      forceRefresh: true,
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(result.source).toBe("refreshed");
    expect(result.accessToken).toBe("forced-refresh-token");
  });

  it("throws when Google credentials are not configured", async () => {
    delete process.env.GOOGLE_CLIENT_ID;
    const user = makeUser({
      google: {
        accessToken: "old-token",
        refreshToken: "google-refresh-token",
        expiresAt: new Date(Date.now() - 1000),
      },
    });
    vi.spyOn(User, "findById").mockResolvedValue(user);

    await expect(
      getValidProviderAccessToken({ userId: "u1", provider: "google" }),
    ).rejects.toThrow("Google OAuth client credentials are not configured.");
  });

  it("throws when there is no Google refresh token to use", async () => {
    const user = makeUser({
      google: {
        accessToken: "old-token",
        expiresAt: new Date(Date.now() - 1000),
      },
    });
    vi.spyOn(User, "findById").mockResolvedValue(user);

    await expect(
      getValidProviderAccessToken({ userId: "u1", provider: "google" }),
    ).rejects.toThrow("Google refresh token is missing for this user.");
  });

  it("throws a descriptive error when Google's token endpoint rejects the request", async () => {
    const user = makeUser({
      google: {
        accessToken: "old-token",
        refreshToken: "google-refresh-token",
        expiresAt: new Date(Date.now() - 1000),
      },
    });
    vi.spyOn(User, "findById").mockResolvedValue(user);

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      statusText: "Bad Request",
      json: async () => ({ error: "invalid_grant" }),
    });

    await expect(
      getValidProviderAccessToken({ userId: "u1", provider: "google" }),
    ).rejects.toThrow(/Google token refresh failed/);
  });

  it("refreshes an expired GitHub token and persists the new value", async () => {
    const user = makeUser({
      github: {
        accessToken: "old-gh-token",
        refreshToken: "github-refresh-token",
        expiresAt: new Date(Date.now() - 1000),
      },
    });
    vi.spyOn(User, "findById").mockResolvedValue(user);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: "new-gh-token",
        expires_in: 28800,
        refresh_token_expires_in: 15897600,
      }),
    });

    const result = await getValidProviderAccessToken({
      userId: "u1",
      provider: "github",
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "https://github.com/login/oauth/access_token",
      expect.objectContaining({ method: "POST" }),
    );
    expect(result.accessToken).toBe("new-gh-token");
    expect(result.source).toBe("refreshed");
  });

  it("throws when GitHub has no refresh token available", async () => {
    const user = makeUser({
      github: {
        accessToken: "old-gh-token",
        expiresAt: new Date(Date.now() - 1000),
      },
    });
    vi.spyOn(User, "findById").mockResolvedValue(user);

    await expect(
      getValidProviderAccessToken({ userId: "u1", provider: "github" }),
    ).rejects.toThrow(/GitHub refresh token is missing/);
  });

  it("refreshes an expired Facebook token via long-lived token exchange", async () => {
    const user = makeUser({
      facebook: {
        accessToken: "old-fb-token",
        expiresAt: new Date(Date.now() - 1000),
      },
    });
    vi.spyOn(User, "findById").mockResolvedValue(user);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: "new-fb-token",
        token_type: "bearer",
        expires_in: 5184000,
      }),
    });

    const result = await getValidProviderAccessToken({
      userId: "u1",
      provider: "facebook",
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("graph.facebook.com"),
      expect.objectContaining({ method: "GET" }),
    );
    expect(result.accessToken).toBe("new-fb-token");
  });

  it("throws when Facebook has no access token to exchange", async () => {
    const user = makeUser({ facebook: {} });
    vi.spyOn(User, "findById").mockResolvedValue(user);

    await expect(
      getValidProviderAccessToken({ userId: "u1", provider: "facebook" }),
    ).rejects.toThrow("No facebook access token found for this user.");
  });

  it("is case-insensitive and trims whitespace around the provider name", async () => {
    const user = makeUser({
      google: {
        accessToken: "fresh-token",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    vi.spyOn(User, "findById").mockResolvedValue(user);

    const result = await getValidProviderAccessToken({
      userId: "u1",
      provider: "  GOOGLE  ",
    });

    expect(result.provider).toBe("google");
  });

  it("throws if the global fetch implementation is unavailable", async () => {
    const user = makeUser({
      google: {
        accessToken: "old-token",
        refreshToken: "google-refresh-token",
        expiresAt: new Date(Date.now() - 1000),
      },
    });
    vi.spyOn(User, "findById").mockResolvedValue(user);
    // Simulate an old Node runtime without global fetch.
    // eslint-disable-next-line no-global-assign
    global.fetch = undefined;

    await expect(
      getValidProviderAccessToken({ userId: "u1", provider: "google" }),
    ).rejects.toThrow(/Global fetch is not available/);
  });
});
