const axios = require("axios");
require("dotenv").config();

/**
 * Diagnostic tool for ChromaDB
 * Query ChromaDB and inspect search results
 * Make sure the ChromaDB service is running at CHROMA_API_URL
 */
async function diagnoseMemory(query, userId) {
  try {
    console.log(`--- Diagnostics for: "${query}" (User: ${userId}) ---`);
    const chromaApiUrl = process.env.CHROMA_API_URL || "http://localhost:5000/api";

    // Check health
    try {
      const health = await axios.get(`${chromaApiUrl}/health`);
      console.log("ChromaDB service status:", health.data.status);
    } catch (err) {
      console.error("ChromaDB service is not running. Start it first with: python chroma_service/run.py");
      return;
    }

    // 1. Check collection count
    try {
      const countResponse = await axios.get(`${chromaApiUrl}/collection-count/chat_messages`);
      console.log(`Total items in ChatMessages collection: ${countResponse.data.count}`);
    } catch (err) {
      console.log("Could not get collection count:", err.message);
    }

    // 2. Perform search
    console.log("\nSearching chat messages:");
    try {
      const searchResponse = await axios.post(`${chromaApiUrl}/search`, {
        query,
        collection: "chat_messages",
        n_results: 5
      });

      if (searchResponse.data.results && searchResponse.data.results.length > 0) {
        searchResponse.data.results.forEach((result, i) => {
          const distance = searchResponse.data.distances[0][i];
          console.log(`- Match ${i + 1} [Distance: ${distance.toFixed(4)}]: ${result.document.substring(0, 100)}...`);
          console.log(`  Metadata:`, result.metadata);
        });
      } else {
        console.log("No results found.");
      }
    } catch (err) {
      console.error("Search failed:", err.message);
    }
  } catch (error) {
    console.error("DIAGNOSTIC ERROR:", error.message);
  }
}

// Example usage
const TARGET_USER = "698ccfa92e57d64849eb6aa9"; // Replace with actual user ID
diagnoseMemory("What is my name?", TARGET_USER);
