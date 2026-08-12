import { beforeEach, describe, expect, it, vi } from "vitest";

const Journal = require("../../models/journalModel");
const {
  getMyJournals,
  getJournalById,
  deleteJournal,
} = require("../../controllers/journalController");

const USER_ID = "507f191e810c19729de860e1";
const JOURNAL_ID = "507f191e810c19729de860e2";

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe("journalController unit tests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  describe("getMyJournals", () => {
    it("returns user journals", async () => {
      vi.spyOn(Journal, "find").mockReturnValue({
        sort: vi.fn().mockResolvedValue([{ _id: JOURNAL_ID, title: "My Day" }]),
      });

      const req = { user: { _id: USER_ID } };
      const res = mockRes();

      await getMyJournals(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        journals: [{ _id: JOURNAL_ID, title: "My Day" }],
      });
    });
  });

  describe("getJournalById", () => {
    it("returns 404 when journal is not found", async () => {
      vi.spyOn(Journal, "findOne").mockResolvedValue(null);

      const req = { user: { _id: USER_ID }, params: { id: JOURNAL_ID } };
      const res = mockRes();

      await getJournalById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Journal entry not found",
      });
    });

    it("returns 200 with journal data when found", async () => {
      vi.spyOn(Journal, "findOne").mockResolvedValue({ _id: JOURNAL_ID, title: "Journal 1" });

      const req = { user: { _id: USER_ID }, params: { id: JOURNAL_ID } };
      const res = mockRes();

      await getJournalById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        journal: { _id: JOURNAL_ID, title: "Journal 1" },
      });
    });
  });

  describe("deleteJournal", () => {
    it("returns 404 if journal to delete does not exist", async () => {
      vi.spyOn(Journal, "findOne").mockResolvedValue(null);

      const req = { user: { _id: USER_ID }, params: { id: JOURNAL_ID } };
      const res = mockRes();

      await deleteJournal(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("deletes entry and returns 200 success", async () => {
      const mockDoc = { deleteOne: vi.fn().mockResolvedValue(true) };
      vi.spyOn(Journal, "findOne").mockResolvedValue(mockDoc);

      const req = { user: { _id: USER_ID }, params: { id: JOURNAL_ID } };
      const res = mockRes();

      await deleteJournal(req, res);

      expect(mockDoc.deleteOne).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Journal entry deleted successfully",
      });
    });
  });
});
