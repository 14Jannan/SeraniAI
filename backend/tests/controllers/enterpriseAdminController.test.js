import { beforeEach, describe, expect, it, vi } from "vitest";

const User = require("../../models/userModel");
const Enterprise = require("../../models/enterpriseModel");
const Subscription = require("../../models/subscriptionModel");
const EnterpriseInvite = require("../../models/enterpriseInviteModel");
const { getEnterpriseUsers } = require("../../controllers/enterpriseAdminController");

const USER_ID = "507f191e810c19729de860e1";
const ENT_ID = "507f191e810c19729de860e2";

function makeQueryMock(resolvedValue) {
  const mock = {
    select: vi.fn(),
    sort: vi.fn(),
    limit: vi.fn(),
    lean: vi.fn(),
    then: (resolve) => resolve(resolvedValue),
  };
  mock.select.mockReturnValue(mock);
  mock.sort.mockReturnValue(mock);
  mock.limit.mockReturnValue(mock);
  mock.lean.mockReturnValue(mock);
  return mock;
}

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe("enterpriseAdminController unit tests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  describe("getEnterpriseUsers", () => {
    it("returns 400 if user is not linked to an enterprise", async () => {
      const req = { user: { enterpriseId: null } };
      const res = mockRes();

      await getEnterpriseUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "EnterpriseAdmin is not linked to an enterprise",
      });
    });

    it("returns enterprise users and invites successfully", async () => {
      vi.spyOn(Enterprise, "findById").mockImplementation(() =>
        makeQueryMock({ _id: ENT_ID, ownerId: USER_ID })
      );

      const mockUserObj = {
        _id: USER_ID,
        name: "Employee 1",
        toObject: () => ({ _id: USER_ID, name: "Employee 1" }),
      };

      vi.spyOn(User, "find").mockImplementation(() =>
        makeQueryMock([mockUserObj])
      );

      vi.spyOn(Subscription, "findOne").mockImplementation(() =>
        makeQueryMock({ seats: 5 })
      );

      vi.spyOn(EnterpriseInvite, "updateMany").mockResolvedValue({ modifiedCount: 0 });

      vi.spyOn(EnterpriseInvite, "find").mockImplementation(() =>
        makeQueryMock([])
      );

      const req = { user: { _id: USER_ID, enterpriseId: ENT_ID } };
      const res = mockRes();

      await getEnterpriseUsers(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          seatLimit: 5,
          seatsUsed: 1,
          users: expect.any(Array),
          invites: expect.any(Array),
        })
      );
    });
  });
});
