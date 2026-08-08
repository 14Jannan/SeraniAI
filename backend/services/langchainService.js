const { ChatOpenAI } = require("@langchain/openai");
const { BaseRetriever } = require("@langchain/core/retrievers");
const { Document } = require("@langchain/core/documents");
const { StringOutputParser } = require("@langchain/core/output_parsers");
const { RunnableSequence, RunnablePassthrough } = require("@langchain/core/runnables");
const { ChatPromptTemplate, MessagesPlaceholder } = require("@langchain/core/prompts");
const ChromaDBService = require("./chromaDBService");
const { generateSystemPrompt } = require("../utils/promptBuilder");

class ChromaRetriever extends BaseRetriever {
  lc_namespace = ["langchain", "retrievers", "custom"];

  constructor(fields) {
    super(fields);
    this.chromadb = new ChromaDBService();
    this.userId = fields.userId;
    this.collection = fields.collection || "journals";
    this.nResults = fields.nResults || 5;
  }

  async _getRelevantDocuments(query) {
    try {
      const whereFilter = this.collection === "courses" ? null : { userId: this.userId.toString() };
      const results = await this.chromadb.search(query, this.collection, this.nResults, whereFilter);

      if (!results || !results.results) return [];

      return results.results.map(
        (res) =>
          new Document({
            pageContent: res.document,
            metadata: res.metadata || {},
          })
      );
    } catch (error) {
      console.error(`ChromaRetriever error for collection ${this.collection}:`, error);
      return [];
    }
  }
}

class LangchainService {
  constructor() {
    this.model = new ChatOpenAI({
      modelName: process.env.MODEL || "gpt-4o-mini",
      temperature: 0.7,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * @param {string} userId - User ID
   * @param {string} question - User question
   * @param {Array} history - Chat history
   * @param {Object} user - The full User object
   * @param {string} roleKey - The prompt role key
   * @param {boolean} isNewChat - Whether this is a new chat
   * @param {string} localDateStr - User's local date string
   * @returns {Promise<string>} AI Response
   */
  async executeRagQuery(userId, question, history = [], user, roleKey = "general", isNewChat = false, localDateStr = "") {
    try {
      // 1. Create retrievers for different collections
      const journalRetriever = new ChromaRetriever({ userId, collection: "journals", nResults: 3 });
      const chatRetriever = new ChromaRetriever({ userId, collection: "chat_messages", nResults: 5 });
      const courseRetriever = new ChromaRetriever({ userId, collection: "courses", nResults: 3 });

      // 2. Fetch context manually for now to combine them (LangChain MultiQuery or Ensemble could be used later)
      const [journalDocs, chatDocs, courseDocs] = await Promise.all([
        journalRetriever._getRelevantDocuments(question),
        chatRetriever._getRelevantDocuments(question),
        courseRetriever._getRelevantDocuments(question),
      ]);

      let combinedContext = [...journalDocs, ...chatDocs]
        .map((doc) => doc.pageContent)
        .join("\n\n---\n\n");

      const courseContext = courseDocs.map((doc) => doc.pageContent).join("\n\n---\n\n");
      if (courseContext) {
        combinedContext += "\n\n--- AVAILABLE COURSES FROM OUR PLATFORM ---\n" + courseContext;
      }

      // 3. Format history for LangChain
      const formattedHistory = history.slice(-10).map((msg) => {
        if (msg.role === "user") return ["human", msg.content];
        if (msg.role === "assistant") return ["ai", msg.content];
        return ["system", msg.content];
      });

      // 4. Generate the dynamic system prompt using promptBuilder
      const systemPrompt = generateSystemPrompt(roleKey, user, combinedContext, isNewChat, localDateStr);

      // 5. Create a dynamic ChatPromptTemplate
      const dynamicPrompt = ChatPromptTemplate.fromMessages([
        ["system", systemPrompt],
        new MessagesPlaceholder("history"),
        ["human", "{question}"],
      ]);

      // 6. Run the chain
      const chain = RunnableSequence.from([
        {
          question: new RunnablePassthrough(),
          history: () => formattedHistory,
        },
        dynamicPrompt,
        this.model,
        new StringOutputParser(),
      ]);

      const response = await chain.invoke(question);
      return response;
    } catch (error) {
      console.error("LangchainService executeRagQuery error:", error);
      throw error;
    }
  }
}

module.exports = new LangchainService();
