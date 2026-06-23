import { createRequire } from "node:module";
import { beforeEach, describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const { protect } = require("../middleware/authMiddleware");

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe("authMiddleware - protect", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    process.env.JWT_SECRET = "test_secret";
  });

  it("returns 401 when no Authorization header is present", async () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = vi.fn();

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Not authorized, no token" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when Authorization header does not start with Bearer", async () => {
    const req = { headers: { authorization: "Basic abc123" } };
    const res = mockRes();
    const next = vi.fn();

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Not authorized, no token" });
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next() and attaches req.user when token is valid", async () => {
    vi.spyOn(jwt, "verify").mockReturnValue({ id: "u1" });
    const fakeUser = { _id: "u1", name: "Alice", role: "user" };
    const selectMock = vi.fn().mockResolvedValue(fakeUser);
    vi.spyOn(User, "findById").mockReturnValue({ select: selectMock });

    const req = { headers: { authorization: "Bearer valid-token" } };
    const res = mockRes();
    const next = vi.fn();

    await protect(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith("valid-token", "test_secret");
    expect(User.findById).toHaveBeenCalledWith("u1");
    expect(selectMock).toHaveBeenCalledWith("-password");
    expect(req.user).toBe(fakeUser);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 401 when the decoded user no longer exists", async () => {
    vi.spyOn(jwt, "verify").mockReturnValue({ id: "deleted-user" });
    const selectMock = vi.fn().mockResolvedValue(null);
    vi.spyOn(User, "findById").mockReturnValue({ select: selectMock });

    const req = { headers: { authorization: "Bearer valid-token" } };
    const res = mockRes();
    const next = vi.fn();

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Not authorized, user not found",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 with a token-expired message for expired tokens", async () => {
    const expiredError = new Error("jwt expired");
    expiredError.name = "TokenExpiredError";
    vi.spyOn(jwt, "verify").mockImplementation(() => {
      throw expiredError;
    });

    const req = { headers: { authorization: "Bearer expired-token" } };
    const res = mockRes();
    const next = vi.fn();

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Not authorized, token expired",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 with an invalid-token message for malformed tokens", async () => {
    const malformedError = new Error("jwt malformed");
    malformedError.name = "JsonWebTokenError";
    vi.spyOn(jwt, "verify").mockImplementation(() => {
      throw malformedError;
    });

    const req = { headers: { authorization: "Bearer garbage" } };
    const res = mockRes();
    const next = vi.fn();

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Not authorized, invalid token",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 with a generic failure message for any other error", async () => {
    vi.spyOn(jwt, "verify").mockImplementation(() => {
      throw new Error("unexpected failure");
    });

    const req = { headers: { authorization: "Bearer whatever" } };
    const res = mockRes();
    const next = vi.fn();

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Not authorized, token failed",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("does not query the database when the token verification throws", async () => {
    vi.spyOn(jwt, "verify").mockImplementation(() => {
      throw new Error("bad token");
    });
    const findByIdSpy = vi.spyOn(User, "findById");

    const req = { headers: { authorization: "Bearer whatever" } };
    const res = mockRes();
    const next = vi.fn();

    await protect(req, res, next);

    expect(findByIdSpy).not.toHaveBeenCalled();
  });
});
