const axios = require("axios");
require("dotenv").config();

/**
 * Simple diagnostic tool for ChromaDB
 * Verify ChromaDB is running and check collection status
 * Make sure the ChromaDB service is running at CHROMA_API_URL
 */
async function run() {
  try {
    const chromaApiUrl = process.env.CHROMA_API_URL || "http://localhost:5000/api";
    console.log(`1. Connecting to ChromaDB at ${chromaApiUrl}...`);

    // Check health
    console.log("2. Checking service health...");
    const healthResponse = await axios.get(`${chromaApiUrl}/health`);
    console.log("3. Service status:", healthResponse.data.status);

    // Check collections
    const collections = ["journals", "courses", "chat_messages", "users"];
    console.log("\n4. Checking collection counts:");
    for (const collection of collections) {
      try {
        const countResponse = await axios.get(`${chromaApiUrl}/collection-count/${collection}`);
        console.log(`   - ${collection}: ${countResponse.data.count} documents`);
      } catch (err) {
        console.log(`   - ${collection}: Error - ${err.message}`);
      }
    }

    console.log("\n5. ChromaDB diagnostic complete!");
  } catch (err) {
    console.error("DIAGNOSTIC FAILED:", err.message);
    console.error("\nMake sure ChromaDB service is running:");
    console.error("  1. cd chroma_service");
    console.error("  2. python run.py (or start.bat on Windows)");
  }
}

run();
