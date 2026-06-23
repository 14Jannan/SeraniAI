import { createRequire } from "node:module";
import express from "express";
import cookieParser from "cookie-parser";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const User = require("../models/userModel");
const authRoutes = require("../routes/authRoutes");

// IMPORTANT: vi.mock() cannot intercept modules loaded via require() (this
// whole backend is CommonJS) - it only works for modules reached through
// static `import` syntax. We instead use vi.spyOn() against the
// already-loaded `nodemailer` module object's `createTransport` method,
// which patches the shared singleton in place. Without this, register/login
// flows that trigger emailService.js would attempt a real Gmail SMTP
// connection during tests.
//
// Note: authRoutes.js also requires `passport` at the top level for its
// OAuth callback routes. This is safe to leave real/unmocked here because
// passport.authenticate(provider, options) only returns a middleware
// function at require-time - it does not perform any network I/O until an
// actual request hits one of the OAuth routes, none of which these
// integration tests exercise.
const sendMailMock = vi.fn();

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api/auth", authRoutes);
  return app;
};

describe("auth routes (integration)", () => {
  let app;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    sendMailMock.mockResolvedValue({ messageId: "test-message-id" });
    vi.spyOn(nodemailer, "createTransport").mockReturnValue({
      sendMail: sendMailMock,
    });
    process.env.JWT_SECRET = "test_secret";
    process.env.JWT_REFRESH_SECRET = "test_refresh_secret";
    process.env.EMAIL_USER = "test@seraniai.com";
    process.env.EMAIL_PASS = "test-app-password";
    app = buildApp();
  });

  describe("POST /api/auth/register", () => {
    it("rejects an invalid payload before it ever reaches the controller", async () => {
      const findOneSpy = vi.spyOn(User, "findOne");

      const res = await request(app).post("/api/auth/register").send({
        name: "A", // too short
        email: "not-an-email",
        password: "123",
        confirmPassword: "123",
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Validation failed");
      expect(findOneSpy).not.toHaveBeenCalled();
    });

    it("registers a new user end-to-end and returns 201", async () => {
      vi.spyOn(User, "findOne").mockResolvedValue(null);
      vi.spyOn(User, "create").mockResolvedValue({
        _id: "u1",
        email: "alice@test.com",
      });

      const res = await request(app).post("/api/auth/register").send({
        name: "Alice",
        email: "alice@test.com",
        password: "password1",
        confirmPassword: "password1",
      });

      expect(res.status).toBe(201);
      expect(res.body.email).toBe("alice@test.com");
      expect(sendMailMock).toHaveBeenCalled();
    });

    it("returns 400 when passwords do not match (controller-level check)", async () => {
      const res = await request(app).post("/api/auth/register").send({
        name: "Alice",
        email: "alice@test.com",
        password: "password1",
        confirmPassword: "password2",
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Passwords do not match.");
    });
  });

  describe("POST /api/auth/login", () => {
    const verifiedUser = {
      _id: "u1",
      name: "Bob",
      email: "bob@test.com",
      role: "user",
      isVerified: true,
      password: "hashed",
    };

    it("rejects a request with no password via validation middleware", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "bob@test.com" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Validation failed");
    });

    it("logs in successfully and sets a refresh cookie", async () => {
      vi.spyOn(User, "findOne").mockResolvedValue(verifiedUser);
      vi.spyOn(bcrypt, "compare").mockResolvedValue(true);

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "bob@test.com", password: "correct-password" });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeTruthy();
      expect(res.body.user.email).toBe("bob@test.com");

      const setCookieHeader = res.headers["set-cookie"] || [];
      expect(setCookieHeader.some((c) => c.startsWith("refreshToken="))).toBe(
        true,
      );
    });

    it("sets a persistent (Max-Age) refresh cookie when rememberMe=true", async () => {
      vi.spyOn(User, "findOne").mockResolvedValue(verifiedUser);
      vi.spyOn(bcrypt, "compare").mockResolvedValue(true);

      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "bob@test.com",
          password: "correct-password",
          rememberMe: true,
        });

      const setCookieHeader = res.headers["set-cookie"] || [];
      const refreshCookie = setCookieHeader.find((c) =>
        c.startsWith("refreshToken="),
      );
      expect(refreshCookie).toMatch(/Max-Age=/);

      const rememberMeCookie = setCookieHeader.find((c) =>
        c.startsWith("rememberMe="),
      );
      expect(rememberMeCookie).toBeTruthy();
    });

    it("returns 400 for wrong credentials without leaking whether the email exists", async () => {
      vi.spyOn(User, "findOne").mockResolvedValue(verifiedUser);
      vi.spyOn(bcrypt, "compare").mockResolvedValue(false);

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "bob@test.com", password: "wrong-password" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Invalid credentials");
    });
  });

  describe("GET /api/auth/me (protected route)", () => {
    it("returns 401 without a Bearer token", async () => {
      const res = await request(app).get("/api/auth/me");
      expect(res.status).toBe(401);
    });

    it("returns 401 for a token signed with the wrong secret", async () => {
      const badToken = jwt.sign({ id: "u1" }, "wrong-secret", {
        expiresIn: "15m",
      });

      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${badToken}`);

      expect(res.status).toBe(401);
    });

    it("returns the current user profile for a valid token", async () => {
      const token = jwt.sign({ id: "u1" }, process.env.JWT_SECRET, {
        expiresIn: "15m",
      });
      const fakeUser = {
        _id: "u1",
        name: "Alice",
        email: "alice@test.com",
        role: "user",
        status: "active",
      };
      vi.spyOn(User, "findById").mockReturnValue({
        select: vi.fn().mockResolvedValue(fakeUser),
      });

      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.email).toBe("alice@test.com");
    });
  });

  describe("POST /api/auth/refresh", () => {
    it("returns 401 when no refresh token cookie is present", async () => {
      const res = await request(app).post("/api/auth/refresh");
      expect(res.status).toBe(401);
    });

    it("issues a new access token and rotates the refresh cookie", async () => {
      const refreshToken = jwt.sign(
        { id: "u1" },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: "7d" },
      );
      vi.spyOn(User, "findById").mockResolvedValue({
        _id: "u1",
        role: "user",
        name: "Bob",
        email: "bob@test.com",
      });
      vi.spyOn(jwt, "sign")
        .mockReturnValueOnce("rotated-access-token")
        .mockReturnValueOnce("rotated-refresh-token");

      const res = await request(app)
        .post("/api/auth/refresh")
        .set("Cookie", [`refreshToken=${refreshToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.token).toBe("rotated-access-token");

      const setCookieHeader = res.headers["set-cookie"] || [];
      const newRefreshCookie = setCookieHeader.find((c) =>
        c.startsWith("refreshToken="),
      );
      // The rotated cookie value should differ from the one we sent in -
      // this is what prevents a stolen refresh token from being reused
      // indefinitely once it's been rotated.
      expect(newRefreshCookie).toContain("rotated-refresh-token");
      expect(newRefreshCookie).not.toContain(refreshToken);
    });

    it("returns 403 for a tampered/invalid refresh token", async () => {
      const res = await request(app)
        .post("/api/auth/refresh")
        .set("Cookie", ["refreshToken=not-a-real-jwt"]);

      expect(res.status).toBe(403);
    });
  });

  describe("POST /api/auth/logout", () => {
    it("clears the refresh and rememberMe cookies", async () => {
      const res = await request(app).post("/api/auth/logout");

      expect(res.status).toBe(200);
      const setCookieHeader = res.headers["set-cookie"] || [];
      // clearCookie() shows up as a Set-Cookie with an immediate Expires in the past.
      expect(
        setCookieHeader.some((c) => c.startsWith("refreshToken=;")),
      ).toBe(true);
      expect(setCookieHeader.some((c) => c.startsWith("rememberMe=;"))).toBe(
        true,
      );
    });
  });
});
