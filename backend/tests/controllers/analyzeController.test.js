import { beforeEach, describe, expect, it, vi } from "vitest";

const Journal = require("../../models/journalModel");
const Chat = require("../../models/chatModels");
const { getAnalysis } = require("../../controllers/analyzeController");

const USER_ID = "507f191e810c19729de860e1";

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

describe("analyzeController unit tests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("returns calculated mood timeline, wellbeing stats, and insights", async () => {
    vi.spyOn(Journal, "find").mockImplementation(() =>
      makeQueryMock([
        { createdAt: new Date().toISOString(), mood: "happy", title: "Good Day" },
      ])
    );

    vi.spyOn(Chat, "find").mockImplementation(() =>
      makeQueryMock([
        {
          createdAt: new Date().toISOString(),
          messages: [{ role: "user", content: "Hello AI" }],
        },
      ])
    );

    const req = { user: { _id: USER_ID, name: "Alice" } };
    const res = mockRes();

    await getAnalysis(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        moodTimeline: expect.any(Array),
        wellbeing: expect.any(Object),
        stats: expect.any(Object),
        weeklyActivity: expect.any(Array),
      })
    );
  });

  it("handles empty journals and chats gracefully", async () => {
    vi.spyOn(Journal, "find").mockImplementation(() => makeQueryMock([]));
    vi.spyOn(Chat, "find").mockImplementation(() => makeQueryMock([]));

    const req = { user: { _id: USER_ID, name: "Bob" } };
    const res = mockRes();

    await getAnalysis(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        stats: expect.objectContaining({ totalChats: 0, journalCount: 0 }),
      })
    );
  });
});
