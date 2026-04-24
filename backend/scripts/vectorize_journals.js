const mongoose = require('mongoose');
const Journal = require('../models/journalModel');
const ChromaDBService = require('../services/chromaDBService');
require('dotenv').config();

const chromadb = new ChromaDBService();

async function vectorizeExisting() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.CONNECTION_STRING);
    console.log('Connected.');

    const journals = await Journal.find({});
    console.log(`Found ${journals.length} journals to vectorize.`);

    for (const journal of journals) {
      console.log(`Vectorizing journal: ${journal._id} - ${journal.title}`);
      try {
        await chromadb.addEmbedding(journal.content, "journals", {
          userId: journal.user.toString(),
          source: "journal",
          journalId: journal._id.toString(),
          timestamp: journal.createdAt.toISOString(),
          title: journal.title || ""
        });
      } catch (e) {
        console.error(`Failed to vectorize journal ${journal._id}:`, e.message);
      }
    }

    console.log('--- DONE ---');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

vectorizeExisting();
