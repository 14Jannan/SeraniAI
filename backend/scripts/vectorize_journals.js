const mongoose = require("mongoose");
const Journal = require("../models/journalModel");
const { getOrCreateCollection } = require("../config/vectraClient");
require("dotenv").config();

async function vectorizeExisting() {
  try {
    console.log("Connecting to MongoDB...");
    const connectionString =
      process.env.CONNECTION_STRING ||
      process.env.MONGODB_URI ||
      process.env.MONGO_URI ||
      "mongodb://localhost:27017/seraniai";

    await mongoose.connect(connectionString);
    console.log("Connected.");

    const journals = await Journal.find({});
    console.log(`Found ${journals.length} journals to vectorize.`);

    const collection = await getOrCreateCollection();

    for (const journal of journals) {
      console.log(`Vectorizing journal: ${journal._id} - ${journal.title}`);
      await collection.add({
        ids: [`journal-${journal._id}`],
        documents: [journal.content],
        metadatas: [
          {
            userId: journal.user.toString(),
            source: "journal",
            journalId: journal._id.toString(),
            timestamp: journal.createdAt.toISOString(),
          },
        ],
      });
    }

    console.log("--- DONE ---");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

vectorizeExisting();
