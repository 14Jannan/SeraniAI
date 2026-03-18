const Chat = require("./models/chatModels");
const { getOrCreateCollection } = require("./config/chromaClient");
const mongoose = require("mongoose");
require("dotenv").config();

async function reindex() {
    try {
        await mongoose.connect(process.env.CONNECTION_STRING);
        console.log("Connected to MongoDB.");

        const collection = await getOrCreateCollection();
        console.log("Connected to ChromaDB.");

        const chats = await Chat.find({});
        console.log(`Found ${chats.length} chat sessions.`);

        for (const chat of chats) {
            const userId = chat.user.toString();
            const sessionId = chat._id.toString();

            const documents = [];
            const ids = [];
            const metadatas = [];

            chat.messages.forEach((m, idx) => {
                ids.push(`${sessionId}-${m.role}-${idx}`);
                documents.push(m.content);
                metadatas.push({
                    userId,
                    sessionId,
                    role: m.role,
                    timestamp: m.timestamp?.toISOString() || new Date().toISOString()
                });
            });

            if (documents.length > 0) {
                console.log(`Indexing ${documents.length} messages for session ${sessionId}...`);
                await collection.add({
                    ids,
                    documents,
                    metadatas
                });
            }
        }

        console.log("Re-indexing complete!");
        process.exit(0);
    } catch (error) {
        console.error("Re-indexing error:", error);
        process.exit(1);
    }
}

reindex();
