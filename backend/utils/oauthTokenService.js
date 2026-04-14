const User = require("../models/userModel");

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const FACEBOOK_TOKEN_URL =
  "https://graph.facebook.com/v22.0/oauth/access_token";

const SUPPORTED_PROVIDERS = new Set(["google", "github", "facebook"]);

const ensureProvider = (provider) => {
  const normalized = String(provider || "")
    .toLowerCase()
    .trim();
  if (!SUPPORTED_PROVIDERS.has(normalized)) {
    throw new Error(`Unsupported provider: ${provider}`);
  }
  return normalized;
};

const isAccessTokenFresh = (tokenData, safetyWindowMs = 2 * 60 * 1000) => {
  if (!tokenData?.accessToken) return false;
  if (!tokenData?.expiresAt) return true;
  return new Date(tokenData.expiresAt).getTime() - safetyWindowMs > Date.now();
};

const assertFetchSupport = () => {
  if (typeof fetch !== "function") {
    throw new Error(
      "Global fetch is not available in this Node runtime. Upgrade Node.js or add a fetch polyfill.",
    );
  }
};

const refreshGoogleToken = async (tokenData) => {
  if (!tokenData?.refreshToken) {
    throw new Error("Google refresh token is missing for this user.");
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth client credentials are not configured.");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: tokenData.refreshToken,
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const payload = await response.json();

  if (!response.ok || !payload.access_token) {
    throw new Error(
      `Google token refresh failed: ${payload.error_description || payload.error || response.statusText}`,
    );
  }

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token || tokenData.refreshToken,
    tokenType: payload.token_type || tokenData.tokenType,
    scope: payload.scope || tokenData.scope,
    expiresAt: payload.expires_in
      ? new Date(Date.now() + payload.expires_in * 1000)
      : tokenData.expiresAt,
    refreshTokenExpiresAt: tokenData.refreshTokenExpiresAt,
    updatedAt: new Date(),
  };
};

const refreshGitHubToken = async (tokenData) => {
  if (!tokenData?.refreshToken) {
    throw new Error(
      "GitHub refresh token is missing for this user (expiring user tokens might not be enabled).",
    );
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("GitHub OAuth client credentials are not configured.");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: tokenData.refreshToken,
  });

  const response = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const payload = await response.json();

  if (!response.ok || !payload.access_token) {
    throw new Error(
      `GitHub token refresh failed: ${payload.error_description || payload.error || response.statusText}`,
    );
  }

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token || tokenData.refreshToken,
    tokenType: payload.token_type || tokenData.tokenType,
    scope: payload.scope || tokenData.scope,
    expiresAt: payload.expires_in
      ? new Date(Date.now() + payload.expires_in * 1000)
      : tokenData.expiresAt,
    refreshTokenExpiresAt: payload.refresh_token_expires_in
      ? new Date(Date.now() + payload.refresh_token_expires_in * 1000)
      : tokenData.refreshTokenExpiresAt,
    updatedAt: new Date(),
  };
};

const refreshFacebookToken = async (tokenData) => {
  if (!tokenData?.accessToken) {
    throw new Error("Facebook access token is missing for this user.");
  }

  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error("Facebook OAuth app credentials are not configured.");
  }

  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: tokenData.accessToken,
  });

  const response = await fetch(`${FACEBOOK_TOKEN_URL}?${params.toString()}`, {
    method: "GET",
  });

  const payload = await response.json();

  if (!response.ok || !payload.access_token) {
    throw new Error(
      `Facebook token exchange failed: ${payload.error?.message || response.statusText}`,
    );
  }

  return {
    accessToken: payload.access_token,
    refreshToken: tokenData.refreshToken,
    tokenType: payload.token_type || tokenData.tokenType,
    scope: tokenData.scope,
    expiresAt: payload.expires_in
      ? new Date(Date.now() + payload.expires_in * 1000)
      : tokenData.expiresAt,
    refreshTokenExpiresAt: tokenData.refreshTokenExpiresAt,
    updatedAt: new Date(),
  };
};

const refreshByProvider = async (provider, tokenData) => {
  switch (provider) {
    case "google":
      return refreshGoogleToken(tokenData);
    case "github":
      return refreshGitHubToken(tokenData);
    case "facebook":
      return refreshFacebookToken(tokenData);
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
};

const getValidProviderAccessToken = async ({
  userId,
  provider,
  forceRefresh = false,
}) => {
  assertFetchSupport();

  const normalizedProvider = ensureProvider(provider);
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found.");
  }

  const tokenData = user.oauthTokens?.[normalizedProvider];

  if (!tokenData?.accessToken) {
    throw new Error(
      `No ${normalizedProvider} access token found for this user.`,
    );
  }

  if (!forceRefresh && isAccessTokenFresh(tokenData)) {
    return {
      provider: normalizedProvider,
      accessToken: tokenData.accessToken,
      expiresAt: tokenData.expiresAt,
      updatedAt: tokenData.updatedAt,
      source: "stored",
    };
  }

  const refreshed = await refreshByProvider(normalizedProvider, tokenData);

  user.oauthTokens = user.oauthTokens || {};
  user.oauthTokens[normalizedProvider] = {
    ...(tokenData.toObject?.() || tokenData),
    ...refreshed,
  };
  await user.save({ validateBeforeSave: false });

  return {
    provider: normalizedProvider,
    accessToken: user.oauthTokens[normalizedProvider].accessToken,
    expiresAt: user.oauthTokens[normalizedProvider].expiresAt,
    updatedAt: user.oauthTokens[normalizedProvider].updatedAt,
    source: "refreshed",
  };
};

module.exports = {
  getValidProviderAccessToken,
};
