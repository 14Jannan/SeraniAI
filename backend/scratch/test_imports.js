try {
  const { ChatOpenAI } = require("@langchain/openai");
  const { BaseRetriever } = require("@langchain/core/retrievers");
  console.log("LangChain imports successful!");
  process.exit(0);
} catch (error) {
  console.error("LangChain imports failed:", error.message);
  process.exit(1);
}
