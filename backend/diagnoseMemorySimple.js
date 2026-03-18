const { getOrCreateCollection } = require("./config/chromaClient");
require("dotenv").config();

async function run() {
    try {
        console.log("1. Starting collection access...");
        const collection = await getOrCreateCollection();
        console.log("2. Collection accessed.");

        console.log("3. Counting documents...");
        const count = await collection.count();
        console.log(`4. Count: ${count}`);

        if (count === 0) {
            console.log("ERROR: Collection is empty. Re-indexing might have failed.");
            return;
        }

        console.log("5. Fetching ALL documents to see user IDs...");
        const data = await collection.get({
            limit: 100,
            include: ["metadatas", "documents"]
        });

        const userIds = [...new Set(data.metadatas.map(m => m.userId))];
        console.log("6. Unique User IDs in DB:", userIds);

        const targetUser = userIds[0]; // Just take the first one found for testing
        if (!targetUser) {
            console.log("ERROR: No User IDs found in metadata.");
            return;
        }

        console.log(`7. Testing query for User: ${targetUser} with query "name"`);
        const results = await collection.query({
            queryTexts: ["name"],
            nResults: 5,
            where: { userId: targetUser }
        });

        console.log("8. Query Results:", JSON.stringify(results, null, 2));

    } catch (err) {
        console.error("DIAGNOSTIC FAILED AT STEP:", err.message);
        if (err.stack) console.error(err.stack);
    }
}

run();
