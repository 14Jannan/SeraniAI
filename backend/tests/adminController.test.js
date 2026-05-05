import { createRequire } from "node:module";
import { beforeEach, describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const bcrypt = require("bcryptjs");
const User = require("../models/userModel");
const {
  createUser,
  deleteUser,
  getAllUsers,
  updateUser,
} = require("../controllers/adminController");

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe("adminController", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("getAllUsers", () => {
    it("returns users without passwords", async () => {
      const users = [{ _id: "1", email: "a@test.com" }];
      vi.spyOn(User, "find").mockReturnValue({
        select: vi.fn().mockResolvedValue(users),
      });

      const res = mockRes();
      await getAllUsers({}, res);

      expect(User.find).toHaveBeenCalledWith({});
      expect(res.json).toHaveBeenCalledWith(users);
    });

    it("returns 500 when query fails", async () => {
      vi.spyOn(User, "find").mockReturnValue({
        select: vi.fn().mockRejectedValue(new Error("DB error")),
      });

      const res = mockRes();
      await getAllUsers({}, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "DB error" });
    });
  });

  describe("createUser", () => {
    it("returns 400 if required fields are missing", async () => {
      const req = {
        body: { name: "Alice", email: "a@test.com", password: "pass" },
      };
      const res = mockRes();

      await createUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Please provide all fields",
      });
    });

    it("returns 400 if user already exists", async () => {
      vi.spyOn(User, "findOne").mockResolvedValue({ _id: "u1" });

      const req = {
        body: {
          name: "Alice",
          email: "a@test.com",
          password: "pass",
          role: "user",
        },
      };
      const res = mockRes();

      await createUser(req, res);

      expect(User.findOne).toHaveBeenCalledWith({ email: "a@test.com" });
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "User already exists" });
    });

    it("creates a user with hashed password and normalized enterprise role", async () => {
      vi.spyOn(User, "findOne").mockResolvedValue(null);
      vi.spyOn(bcrypt, "genSalt").mockResolvedValue("salt");
      vi.spyOn(bcrypt, "hash").mockResolvedValue("hashed-password");
      vi.spyOn(User, "create").mockResolvedValue({
        _id: "u2",
        name: "Enterprise User",
        email: "enterprise@test.com",
        role: "enterpriseUser",
      });

      const req = {
        body: {
          name: "Enterprise User",
          email: "enterprise@test.com",
          password: "pass123",
          role: "enterprise",
        },
      };
      const res = mockRes();

      await createUser(req, res);

      expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
      expect(bcrypt.hash).toHaveBeenCalledWith("pass123", "salt");
      expect(User.create).toHaveBeenCalledWith({
        name: "Enterprise User",
        email: "enterprise@test.com",
        password: "hashed-password",
        role: "enterpriseUser",
        isVerified: true,
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        _id: "u2",
        name: "Enterprise User",
        email: "enterprise@test.com",
        role: "enterpriseUser",
      });
    });

    it("returns 500 when create throws", async () => {
      vi.spyOn(User, "findOne").mockResolvedValue(null);
      vi.spyOn(bcrypt, "genSalt").mockResolvedValue("salt");
      vi.spyOn(bcrypt, "hash").mockResolvedValue("hashed-password");
      vi.spyOn(User, "create").mockRejectedValue(new Error("write failed"));

      const req = {
        body: {
          name: "Alice",
          email: "a@test.com",
          password: "pass",
          role: "user",
        },
      };
      const res = mockRes();

      await createUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "Server Error" });
    });
  });

  describe("updateUser", () => {
    it("returns 404 when user is not found", async () => {
      vi.spyOn(User, "findById").mockResolvedValue(null);

      const req = { params: { id: "missing" }, body: {} };
      const res = mockRes();
      await updateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
    });

    it("updates fields and role mapping when password is not provided", async () => {
      const userDoc = {
        _id: "u5",
        name: "Old Name",
        email: "old@test.com",
        role: "user",
        save: vi.fn().mockResolvedValue({
          _id: "u5",
          name: "New Name",
          email: "new@test.com",
          role: "enterpriseUser",
        }),
      };
      vi.spyOn(User, "findById").mockResolvedValue(userDoc);

      const req = {
        params: { id: "u5" },
        body: { name: "New Name", email: "new@test.com", role: "enterprise" },
      };
      const res = mockRes();
      await updateUser(req, res);

      expect(userDoc.name).toBe("New Name");
      expect(userDoc.email).toBe("new@test.com");
      expect(userDoc.role).toBe("enterpriseUser");
      expect(userDoc.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        _id: "u5",
        name: "New Name",
        email: "new@test.com",
        role: "enterpriseUser",
      });
    });

    it("rehashes password when password is provided", async () => {
      const userDoc = {
        _id: "u6",
        name: "Same",
        email: "same@test.com",
        role: "user",
        password: "old-hash",
        save: vi.fn().mockResolvedValue({
          _id: "u6",
          name: "Same",
          email: "same@test.com",
          role: "user",
        }),
      };
      vi.spyOn(User, "findById").mockResolvedValue(userDoc);
      vi.spyOn(bcrypt, "genSalt").mockResolvedValue("salt");
      vi.spyOn(bcrypt, "hash").mockResolvedValue("new-hash");

      const req = {
        params: { id: "u6" },
        body: { password: "new-pass" },
      };
      const res = mockRes();
      await updateUser(req, res);

      expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
      expect(bcrypt.hash).toHaveBeenCalledWith("new-pass", "salt");
      expect(userDoc.password).toBe("new-hash");
    });

    it("returns 500 when lookup fails", async () => {
      vi.spyOn(User, "findById").mockRejectedValue(new Error("DB down"));

      const req = { params: { id: "u7" }, body: {} };
      const res = mockRes();
      await updateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "Server Error" });
    });
  });

  describe("deleteUser", () => {
    it("removes user and returns success message", async () => {
      const userDoc = {
        deleteOne: vi.fn().mockResolvedValue({ acknowledged: true }),
      };
      vi.spyOn(User, "findById").mockResolvedValue(userDoc);

      const req = { params: { id: "u8" } };
      const res = mockRes();
      await deleteUser(req, res);

      expect(userDoc.deleteOne).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ message: "User removed" });
    });

    it("returns 404 when user to delete is missing", async () => {
      vi.spyOn(User, "findById").mockResolvedValue(null);

      const req = { params: { id: "missing" } };
      const res = mockRes();
      await deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
    });

    it("returns 500 when delete lookup fails", async () => {
      vi.spyOn(User, "findById").mockRejectedValue(new Error("read error"));

      const req = { params: { id: "u9" } };
      const res = mockRes();
      await deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "Server Error" });
    });
  });
});
