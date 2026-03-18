const { getOrCreateCollection } = require("./config/chromaClient");
require("dotenv").config();

async function diagnoseMemory(query, userId) {
    try {
        console.log(`--- DIagnostics for: "${query}" (User: ${userId}) ---`);
        const collection = await getOrCreateCollection();

        // 1. Check total count
        const count = await collection.count();
        console.log(`Total items in ChromaDB: ${count}`);

        // 2. Perform query with NO filter first to see what's in there
        console.log("\nSearching ALL records (No filter):");
        const allResults = await collection.query({
            queryTexts: [query],
            nResults: 5
        });
        allResults.documents[0].forEach((doc, i) => {
            console.log(`- [${allResults.metadatas[0][i].role}] (Dist: ${allResults.distances[0][i].toFixed(4)}) : ${doc}`);
        });

        // 3. Perform query WITH filter
        console.log(`\nSearching with filter { userId: "${userId}" }:`);
        const filteredResults = await collection.query({
            queryTexts: [query],
            nResults: 10,
            where: { userId: userId }
        });

        if (filteredResults.documents[0].length > 0) {
            filteredResults.documents[0].forEach((doc, i) => {
                const dist = filteredResults.distances[0][i];
                console.log(`- Match ${i + 1} [Dist: ${dist.toFixed(4)}]: ${doc}`);
            });
        } else {
            console.log("No results found with this userId filter.");
        }

    } catch (error) {
        console.error("DIAGNOSTIC ERROR:", error);
    }
}

// Common user ID from previous logs
const TARGET_USER = "698ccfa92e57d64849eb6aa9";
diagnoseMemory("What is my name? my name info", TARGET_USER);
