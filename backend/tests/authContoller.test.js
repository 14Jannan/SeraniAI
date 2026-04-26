import { createRequire } from "node:module";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { sendVerificationEmailMock } = vi.hoisted(() => ({
  sendVerificationEmailMock: vi.fn(),
}));

vi.mock("../utils/emailService", () => ({
  default: sendVerificationEmailMock,
  __esModule: true,
}));

const require = createRequire(import.meta.url);
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const otpGenerator = require("otp-generator");
const User = require("../models/userModel");
const oauthTokenService = require("../utils/oauthTokenService");
const {
  registerUser,
  verifyEmail,
  loginUser,
  forgotPassword,
  resetPassword,
  refreshAccessToken,
  logoutUser,
  getOAuthProviderToken,
  getCurrentUser,
} = require("../controllers/authController");

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.cookie = vi.fn().mockReturnValue(res);
  res.clearCookie = vi.fn().mockReturnValue(res);
  return res;
};

describe("authController", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    process.env.JWT_SECRET = "test_secret";
    process.env.JWT_REFRESH_SECRET = "test_refresh_secret";
  });

  describe("registerUser", () => {
    it("returns 400 when passwords do not match", async () => {
      const res = mockRes();

      await registerUser(
        {
          body: {
            name: "Alice",
            email: "alice@test.com",
            password: "abc",
            confirmPassword: "xyz",
            role: "user",
          },
        },
        res,
      );

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Passwords do not match.",
      });
    });

    it("returns 400 when user already exists", async () => {
      vi.spyOn(User, "findOne").mockResolvedValue({ _id: "u1" });
      const res = mockRes();

      await registerUser(
        {
          body: {
            name: "Alice",
            email: "alice@test.com",
            password: "pass",
            confirmPassword: "pass",
            role: "user",
          },
        },
        res,
      );

      expect(User.findOne).toHaveBeenCalledWith({ email: "alice@test.com" });
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "User already exists" });
    });

    it("hashes password and creates user before email failure returns 500", async () => {
      vi.spyOn(User, "findOne").mockResolvedValue(null);
      vi.spyOn(bcrypt, "genSalt").mockResolvedValue("salt");
      vi.spyOn(bcrypt, "hash").mockResolvedValue("hashed-password");
      vi.spyOn(otpGenerator, "generate").mockReturnValue("123456");
      vi.spyOn(User, "create").mockResolvedValue({
        _id: "u2",
        email: "alice@test.com",
      });

      const res = mockRes();
      await registerUser(
        {
          body: {
            name: "Alice",
            email: "alice@test.com",
            password: "pass",
            confirmPassword: "pass",
            role: "user",
          },
        },
        res,
      );

      expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
      expect(bcrypt.hash).toHaveBeenCalledWith("pass", "salt");
      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "alice@test.com",
          password: "hashed-password",
          role: "user",
          otp: "123456",
        }),
      );
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it("returns 500 when register fails", async () => {
      vi.spyOn(User, "findOne").mockRejectedValue(new Error("DB crash"));
      const res = mockRes();

      await registerUser(
        {
          body: {
            name: "Alice",
            email: "alice@test.com",
            password: "pass",
            confirmPassword: "pass",
          },
        },
        res,
      );

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "DB crash" });
    });
  });

  describe("verifyEmail", () => {
    const makeUser = () => ({
      _id: "u1",
      name: "Alice",
      email: "alice@test.com",
      role: "user",
      isVerified: false,
      otp: "123456",
      otpExpires: new Date(Date.now() + 60000),
      save: vi.fn().mockResolvedValue(undefined),
    });

    it("returns 400 when user not found", async () => {
      vi.spyOn(User, "findOne").mockResolvedValue(null);
      const res = mockRes();

      await verifyEmail(
        { body: { email: "ghost@test.com", otp: "123456" } },
        res,
      );

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
    });

    it("returns 400 when already verified", async () => {
      vi.spyOn(User, "findOne").mockResolvedValue({
        ...makeUser(),
        isVerified: true,
      });
      const res = mockRes();

      await verifyEmail(
        { body: { email: "alice@test.com", otp: "123456" } },
        res,
      );

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "User already verified",
      });
    });

    it("returns 400 for invalid otp", async () => {
      vi.spyOn(User, "findOne").mockResolvedValue(makeUser());
      const res = mockRes();

      await verifyEmail(
        { body: { email: "alice@test.com", otp: "000000" } },
        res,
      );

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Invalid OTP" });
    });

    it("returns 400 for expired otp", async () => {
      vi.spyOn(User, "findOne").mockResolvedValue({
        ...makeUser(),
        otpExpires: new Date(Date.now() - 1000),
      });
      const res = mockRes();

      await verifyEmail(
        { body: { email: "alice@test.com", otp: "123456" } },
        res,
      );

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "OTP has expired" });
    });

    it("verifies user, sets cookie and returns token", async () => {
      const user = makeUser();
      vi.spyOn(User, "findOne").mockResolvedValue(user);
      vi.spyOn(jwt, "sign")
        .mockReturnValueOnce("access-token")
        .mockReturnValueOnce("refresh-token");
      const res = mockRes();

      await verifyEmail(
        { body: { email: "alice@test.com", otp: "123456" } },
        res,
      );

      expect(user.save).toHaveBeenCalled();
      expect(res.cookie).toHaveBeenCalledWith(
        "refreshToken",
        "refresh-token",
        expect.objectContaining({ httpOnly: true }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ token: "access-token" }),
      );
    });
  });

  describe("loginUser", () => {
    const verifiedUser = {
      _id: "u2",
      name: "Bob",
      email: "bob@test.com",
      role: "user",
      isVerified: true,
      password: "hashedpassword",
    };

    it("returns 400 when email or password missing", async () => {
      const res = mockRes();
      await loginUser({ body: { email: "", password: "" } }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Email and password are required",
      });
    });

    it("returns 400 when user not found", async () => {
      vi.spyOn(User, "findOne").mockResolvedValue(null);
      const res = mockRes();

      await loginUser({ body: { email: "x@test.com", password: "pass" } }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Invalid credentials" });
    });

    it("returns 400 for oauth-only account", async () => {
      vi.spyOn(User, "findOne").mockResolvedValue({
        ...verifiedUser,
        password: null,
      });
      const res = mockRes();

      await loginUser(
        { body: { email: "bob@test.com", password: "pass" } },
        res,
      );

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("social login"),
        }),
      );
    });

    it("returns 400 for password mismatch", async () => {
      vi.spyOn(User, "findOne").mockResolvedValue(verifiedUser);
      vi.spyOn(bcrypt, "compare").mockResolvedValue(false);
      const res = mockRes();

      await loginUser(
        { body: { email: "bob@test.com", password: "wrong" } },
        res,
      );

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Invalid credentials" });
    });

    it("returns 401 when account not verified", async () => {
      vi.spyOn(User, "findOne").mockResolvedValue({
        ...verifiedUser,
        isVerified: false,
      });
      vi.spyOn(bcrypt, "compare").mockResolvedValue(true);
      const res = mockRes();

      await loginUser(
        { body: { email: "bob@test.com", password: "pass" } },
        res,
      );

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("returns token and sets refresh cookie on success", async () => {
      vi.spyOn(User, "findOne").mockResolvedValue(verifiedUser);
      vi.spyOn(bcrypt, "compare").mockResolvedValue(true);
      vi.spyOn(jwt, "sign")
        .mockReturnValueOnce("access-token")
        .mockReturnValueOnce("refresh-token");
      const res = mockRes();

      await loginUser(
        { body: { email: "bob@test.com", password: "pass" } },
        res,
      );

      expect(res.cookie).toHaveBeenCalledWith(
        "refreshToken",
        "refresh-token",
        expect.objectContaining({ sameSite: "Lax" }),
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ token: "access-token" }),
      );
    });
  });

  describe("forgotPassword", () => {
    it("returns 404 when user is missing", async () => {
      vi.spyOn(User, "findOne").mockResolvedValue(null);
      const res = mockRes();

      await forgotPassword({ body: { email: "none@test.com" } }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
    });

    it("clears otp when email sending fails", async () => {
      const user = {
        otp: null,
        otpExpires: null,
        save: vi.fn().mockResolvedValue(undefined),
      };
      vi.spyOn(User, "findOne").mockResolvedValue(user);
      vi.spyOn(otpGenerator, "generate").mockReturnValue("654321");
      sendVerificationEmailMock.mockRejectedValue(new Error("smtp fail"));
      const res = mockRes();

      await forgotPassword({ body: { email: "carol@test.com" } }, res);

      expect(user.save).toHaveBeenCalledTimes(2);
      expect(user.otp).toBeUndefined();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "Error sending email" });
    });
  });

  describe("resetPassword", () => {
    const makeUser = () => ({
      otp: "111222",
      otpExpires: new Date(Date.now() + 60000),
      password: "old",
      save: vi.fn().mockResolvedValue(undefined),
    });

    it("returns 400 for invalid otp", async () => {
      vi.spyOn(User, "findOne").mockResolvedValue({
        ...makeUser(),
        otp: "999999",
      });
      const res = mockRes();

      await resetPassword(
        {
          body: { email: "a@test.com", otp: "111222", newPassword: "newpass" },
        },
        res,
      );

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Invalid or expired OTP",
      });
    });

    it("resets password and clears otp on success", async () => {
      const user = makeUser();
      vi.spyOn(User, "findOne").mockResolvedValue(user);
      vi.spyOn(bcrypt, "genSalt").mockResolvedValue("salt");
      vi.spyOn(bcrypt, "hash").mockResolvedValue("new-hash");
      const res = mockRes();

      await resetPassword(
        {
          body: { email: "a@test.com", otp: "111222", newPassword: "newpass" },
        },
        res,
      );

      expect(user.password).toBe("new-hash");
      expect(user.otp).toBeUndefined();
      expect(user.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("refreshAccessToken", () => {
    it("returns 401 without refresh token", async () => {
      const res = mockRes();

      await refreshAccessToken({ cookies: {} }, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Not authenticated" });
    });

    it("returns 401 when user not found", async () => {
      vi.spyOn(jwt, "verify").mockReturnValue({ id: "u1" });
      vi.spyOn(User, "findById").mockResolvedValue(null);
      const res = mockRes();

      await refreshAccessToken({ cookies: { refreshToken: "ok" } }, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
    });

    it("returns 403 for invalid refresh token", async () => {
      vi.spyOn(jwt, "verify").mockImplementation(() => {
        throw new Error("bad token");
      });
      const res = mockRes();

      await refreshAccessToken({ cookies: { refreshToken: "bad" } }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: "Invalid or expired refresh token",
      });
    });

    it("returns new access token on success", async () => {
      vi.spyOn(jwt, "verify").mockReturnValue({ id: "u1" });
      vi.spyOn(User, "findById").mockResolvedValue({ _id: "u1", role: "user" });
      vi.spyOn(jwt, "sign").mockReturnValue("new-access-token");
      const res = mockRes();

      await refreshAccessToken({ cookies: { refreshToken: "ok" } }, res);

      expect(res.json).toHaveBeenCalledWith({ token: "new-access-token" });
    });
  });

  describe("logoutUser", () => {
    it("clears refresh cookie and returns success", () => {
      const res = mockRes();
      logoutUser({}, res);

      expect(res.clearCookie).toHaveBeenCalledWith("refreshToken");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Logged out successfully",
      });
    });
  });

  describe("getOAuthProviderToken", () => {
    it("returns provider token payload", async () => {
      vi.spyOn(
        oauthTokenService,
        "getValidProviderAccessToken",
      ).mockResolvedValue({
        provider: "google",
        accessToken: "provider-token",
        source: "refresh",
        expiresAt: null,
        updatedAt: null,
      });

      const req = {
        params: { provider: "google" },
        query: { forceRefresh: "true" },
        user: { _id: "u1" },
      };
      const res = mockRes();

      await getOAuthProviderToken(req, res);

      expect(
        oauthTokenService.getValidProviderAccessToken,
      ).toHaveBeenCalledWith({
        userId: "u1",
        provider: "google",
        forceRefresh: true,
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ accessToken: "provider-token" }),
      );
    });

    it("returns 400 when oauth provider token fetch fails", async () => {
      vi.spyOn(
        oauthTokenService,
        "getValidProviderAccessToken",
      ).mockRejectedValue(new Error("provider not linked"));

      const req = {
        params: { provider: "google" },
        query: {},
        user: { _id: "u1" },
      };
      const res = mockRes();

      await getOAuthProviderToken(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "provider not linked" });
    });
  });

  describe("getCurrentUser", () => {
    it("returns 401 when user is missing", async () => {
      const res = mockRes();
      await getCurrentUser({ user: null }, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Not authorized" });
    });

    it("returns current user profile", async () => {
      const req = {
        user: {
          _id: "u1",
          name: "Eve",
          email: "eve@test.com",
          role: "user",
          enterpriseId: null,
          status: "active",
        },
      };
      const res = mockRes();

      await getCurrentUser(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ email: "eve@test.com" }),
      );
    });
  });
});
