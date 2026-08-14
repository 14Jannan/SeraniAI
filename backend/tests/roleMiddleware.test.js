import { createRequire } from "node:module";
import { describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const { authorize } = require("../middleware/roleMiddleware");

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe("roleMiddleware authorize()", () => {
  it("returns 401 when req.user is missing (authMiddleware didn't run / no token)", () => {
    const req = {};
    const res = mockRes();
    const next = vi.fn();

    authorize("admin")(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when the user's role is not in the allowed list", () => {
    const req = { user: { role: "user" } };
    const res = mockRes();
    const next = vi.fn();

    authorize("admin")(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("user") }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next() when the user's role is in the allowed list", () => {
    const req = { user: { role: "admin" } };
    const res = mockRes();
    const next = vi.fn();

    authorize("admin")(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("allows any of multiple permitted roles", () => {
    const req = { user: { role: "enterpriseUser" } };
    const res = mockRes();
    const next = vi.fn();

    authorize("admin", "enterpriseUser")(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it("SECURITY: an 'x-dev-admin' header can never bypass role checks (no dev-override exists)", () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalOverrideFlag = process.env.DEV_ALLOW_ADMIN_OVERRIDE;
    process.env.NODE_ENV = "development";
    process.env.DEV_ALLOW_ADMIN_OVERRIDE = "true";

    try {
      const req = {
        user: { role: "user" },
        headers: { "x-dev-admin": "true" },
      };
      const res = mockRes();
      const next = vi.fn();

      authorize("admin")(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
      expect(req.user.role).toBe("user");
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
      if (originalOverrideFlag === undefined) {
        delete process.env.DEV_ALLOW_ADMIN_OVERRIDE;
      } else {
        process.env.DEV_ALLOW_ADMIN_OVERRIDE = originalOverrideFlag;
      }
    }
  });
});
