const { PromptTemplate, ChatPromptTemplate, MessagesPlaceholder } = require("@langchain/core/prompts");

const CONDENSE_QUESTION_PROMPT = ChatPromptTemplate.fromMessages([
  ["system", "Given a conversation history and a follow-up question, rephrase the follow-up question to be a standalone question that can be answered using the provided context. If it's already standalone, return it as is."],
  new MessagesPlaceholder("history"),
  ["human", "{question}"],
]);

module.exports = {
  CONDENSE_QUESTION_PROMPT,
};
