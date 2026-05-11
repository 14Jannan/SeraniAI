const langchainService = require("../services/langchainService");
const mongoose = require("mongoose");

// Mock data
const userId = new mongoose.Types.ObjectId();
const question = "How have I been feeling lately based on my journals?";
const history = [
  { role: "user", content: "Hi Serani!" },
  { role: "assistant", content: "Hello! How can I help you today?" }
];
const userPreferences = {
  communicationStyle: "Supportive",
  profession: "Software Engineer",
  goals: "Improve work-life balance"
};

async function testRag() {
  console.log("Starting LangChain RAG test...");
  try {
    const user = { name: "Test User", preferences: userPreferences };
    const reply = await langchainService.executeRagQuery(userId, question, history, user, "journal", true, new Date().toISOString());
    console.log("RAG Reply successful!");
    console.log("Reply:", reply);
    process.exit(0);
  } catch (error) {
    console.error("RAG test failed:", error);
    process.exit(1);
  }
}

// Note: This requires a running ChromaDB service and valid OpenAI key
// For this test, we just check if it initializes and attempts retrieval
testRag();
