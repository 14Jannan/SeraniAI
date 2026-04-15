const Chat = require("../models/chatModels");
const Groq = require("groq-sdk");
const { getOrCreateCollection } = require("../config/chromaClient");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

function getModelName() {
  // you already have MODEL in .env
  return process.env.MODEL || "llama-3.1-8b-instant";
}

async function getAiReply(history, context = "") {
  if (!process.env.GROQ_API_KEY) {
    return "GROQ_API_KEY is not set in backend/.env";
  }

  // Combine history with retrieved context if available
  const messages = (history || [])
    .slice(-20)
    .map((m) => ({ role: m.role, content: m.content }));

  if (context) {
    messages.unshift({
      role: "system",
      content: `IMPORTANT: Information below is from the user's PERMANENT MEMORY of past conversations. If the user asks something you previously claimed not to know, use this data to provide the correct answer now.\n\nPAST CONTEXT:\n${context}`
    });
  }

  const completion = await groq.chat.completions.create({
    model: getModelName(),
    messages,
    temperature: 0.7,
  });

  return completion?.choices?.[0]?.message?.content?.trim() || "No reply";
}

exports.sendMessage = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Not authorized" });

    const { message, sessionId } = req.body;
    const clean = (message || "").trim();
    if (!clean) return res.status(400).json({ message: "Message is required" });

    let chat;

    if (sessionId) {
      chat = await Chat.findOne({ _id: sessionId, user: userId });
      if (!chat) return res.status(404).json({ message: "Chat session not found" });
    } else {
      chat = await Chat.create({
        user: userId,
        title: clean.slice(0, 40),
        messages: [],
      });
    }

    // 1) Save user message
    chat.messages.push({ role: "user", content: clean });

    // 2) Semantic Search with ChromaDB
    let searchContext = "";
    try {
      const collection = await getOrCreateCollection();
      const results = await collection.query({
        queryTexts: [clean],
        nResults: 15, // Higher number to find actual facts among similar questions
        where: { userId: userId.toString() }
      });

      if (results && results.documents && results.documents[0].length > 0) {
        // Use a Set to avoid duplicate messages in context
        const uniqueDocs = new Set();
        const contextItems = [];

        results.documents[0].forEach((doc, idx) => {
          if (!uniqueDocs.has(doc)) {
            uniqueDocs.add(doc);
            const role = results.metadatas[0][idx].role;
            contextItems.push(`[${role.toUpperCase()}]: ${doc}`);
          }
        });

        searchContext = contextItems.join("\n---\n");
        console.log(`ChromaDB found ${contextItems.length} unique relevant context items.`);
      } else {
        console.log("ChromaDB: No relevant context found for query.");
      }
    } catch (chromaErr) {
      console.error("ChromaDB query error:", chromaErr);
    }

    // 3) Generate AI reply using Groq
    const reply = await getAiReply(chat.messages, searchContext);

    // 4) Save assistant message
    chat.messages.push({ role: "assistant", content: reply });

    await chat.save();

    // 5) Index messages in ChromaDB
    try {
      const collection = await getOrCreateCollection();
      const timestamp = new Date().toISOString();

      await collection.add({
        ids: [`${chat._id}-user-${chat.messages.length - 2}`, `${chat._id}-assistant-${chat.messages.length - 1}`],
        documents: [clean, reply],
        metadatas: [
          { userId: userId.toString(), sessionId: chat._id.toString(), role: "user", timestamp },
          { userId: userId.toString(), sessionId: chat._id.toString(), role: "assistant", timestamp }
        ]
      });
    } catch (chromaIdxErr) {
      console.error("ChromaDB indexing error:", chromaIdxErr);
    }

    return res.status(200).json({
      sessionId: chat._id,
      reply,
    });
  } catch (err) {
    console.error("sendMessage error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Not authorized" });

    const chats = await Chat.find({ user: userId })
      .select("_id title updatedAt createdAt")
      .sort({ updatedAt: -1 });

    return res.status(200).json(chats);
  } catch (err) {
    console.error("getHistory error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.getSession = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Not authorized" });

    const chat = await Chat.findOne({ _id: req.params.id, user: userId });
    if (!chat) return res.status(404).json({ message: "Chat session not found" });

    return res.status(200).json(chat);
  } catch (err) {
    console.error("getSession error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.deleteSession = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Not authorized" });

    const deleted = await Chat.findOneAndDelete({ _id: req.params.id, user: userId });
    if (!deleted) return res.status(404).json({ message: "Chat session not found" });

    // Delete from ChromaDB
    try {
      const collection = await getOrCreateCollection();
      await collection.delete({
        where: { sessionId: req.params.id }
      });
    } catch (chromaErr) {
      console.error("ChromaDB session deletion error:", chromaErr);
    }

    return res.status(200).json({ message: "Chat deleted" });
  } catch (err) {
    console.error("deleteSession error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.clearHistory = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Not authorized" });

    await Chat.deleteMany({ user: userId });

    // Delete from ChromaDB
    try {
      const collection = await getOrCreateCollection();
      await collection.delete({
        where: { userId: userId.toString() }
      });
    } catch (chromaErr) {
      console.error("ChromaDB history clear error:", chromaErr);
    }

    return res.status(200).json({ message: "All chat history cleared" });
  } catch (err) {
    console.error("clearHistory error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
