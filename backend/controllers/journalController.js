const Journal = require("../models/journalModel");
const { saveJournalEntry } = require("../utils/journalUtils");

// Create new journal entry
const createJournal = async (req, res) => {
  try {
    const { title, content, mood, tags } = req.body;

    const journal = await saveJournalEntry(req.user._id, {
      title,
      content,
      mood,
      tags,
    });

    res.status(201).json({
      success: true,
      message: "Journal entry created successfully",
      journal,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to create journal entry",
      error: error.message,
    });
  }
};

// Get all journal entries of logged-in user
const getMyJournals = async (req, res) => {
  try {
    const journals = await Journal.find({ user: req.user._id }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      journals,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch journal entries",
      error: error.message,
    });
  }
};

// Get single journal entry
const getJournalById = async (req, res) => {
  try {
    const journal = await Journal.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!journal) {
      return res.status(404).json({
        success: false,
        message: "Journal entry not found",
      });
    }

    res.status(200).json({
      success: true,
      journal,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch journal entry",
      error: error.message,
    });
  }
};

// Update journal entry
const updateJournal = async (req, res) => {
  try {
    const { title, content, mood, tags, isFavorite } = req.body;

    const journal = await Journal.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!journal) {
      return res.status(404).json({
        success: false,
        message: "Journal entry not found",
      });
    }

    if (title !== undefined) journal.title = title;
    if (content !== undefined) journal.content = content;
    if (mood !== undefined) journal.mood = mood;
    if (tags !== undefined) journal.tags = Array.isArray(tags) ? tags : [];
    if (isFavorite !== undefined) journal.isFavorite = isFavorite;

    const updatedJournal = await journal.save();

    res.status(200).json({
      success: true,
      message: "Journal entry updated successfully",
      journal: updatedJournal,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update journal entry",
      error: error.message,
    });
  }
};

// Delete journal entry
const deleteJournal = async (req, res) => {
  try {
    const journal = await Journal.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!journal) {
      return res.status(404).json({
        success: false,
        message: "Journal entry not found",
      });
    }

    await journal.deleteOne();


    res.status(200).json({
      success: true,
      message: "Journal entry deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete journal entry",
      error: error.message,
    });
  }
};

module.exports = {
  createJournal,
  getMyJournals,
  getJournalById,
  updateJournal,
  deleteJournal,
};