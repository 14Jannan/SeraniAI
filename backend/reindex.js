const axios = require("axios");
const Chat = require("./models/chatModels");
const mongoose = require("mongoose");
require("dotenv").config();

/**
 * Re-index all chat messages into ChromaDB
 * Make sure the ChromaDB service is running at CHROMA_API_URL
 */
async function reindex() {
  try {
    await mongoose.connect(process.env.CONNECTION_STRING);
    console.log("Connected to MongoDB.");

    const chromaApiUrl = process.env.CHROMA_API_URL || "http://localhost:5000/api";
    console.log(`Connected to ChromaDB at ${chromaApiUrl}`);

    const chats = await Chat.find({});
    console.log(`Found ${chats.length} chat sessions.`);

    let totalIndexed = 0;
    for (const chat of chats) {
      const userId = chat.user.toString();
      const sessionId = chat._id.toString();

      for (let idx = 0; idx < chat.messages.length; idx++) {
        const message = chat.messages[idx];
        try {
          await axios.post(`${chromaApiUrl}/embed`, {
            text: message.content,
            collection: "chat_messages",
            metadata: {
              userId,
              sessionId,
              role: message.role,
              timestamp: message.createdAt?.toISOString() || new Date().toISOString(),
              messageIndex: idx
            }
          });
          totalIndexed++;
        } catch (err) {
          console.error(`Failed to index message ${idx} from session ${sessionId}:`, err.message);
        }
      }
      console.log(`Indexed ${chat.messages.length} messages for session ${sessionId}`);
    }

    console.log(`Re-indexing complete! Total messages indexed: ${totalIndexed}`);
    process.exit(0);
  } catch (error) {
    console.error("Re-indexing error:", error);
    process.exit(1);
  }
}

reindex();
    }
}

reindex();
