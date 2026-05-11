const roles = require('../config/roles.json');

/**
 * Generates a dynamic system prompt based on structured role data.
 * @param {string} roleKey - The key for the role (journal, course, general).
 * @param {object} user - The user object containing preferences.
 * @param {string} context - Additional context (retrieved memory, today's activity).
 * @param {boolean} isNewChat - Whether this is the first message of a new session.
 * @param {string} localDateStr - The user's local date string.
 * @returns {string} - The generated system prompt.
 */
function generateSystemPrompt(roleKey, user, context = "", isNewChat = false, localDateStr = "") {
  const role = roles[roleKey] || roles.general;
  const userName = user?.name || "User";
  const preferences = user?.preferences || {};

  const currentLocal = localDateStr ? new Date(localDateStr).toDateString() : new Date().toDateString();

  // Construct personalization snippet
  let personalization = "";
  if (preferences.profession || preferences.goals) {
    personalization = `\n# USER PROFILE & CONTEXT
- Profession: ${preferences.profession || "Not specified"}
- Interests: ${preferences.interests?.join(", ") || "Not specified"}
- Core Goals: ${preferences.goals || "Not specified"}
- Expectations from AI: ${preferences.expectations || "Not specified"}
- Communication Style: ${preferences.communicationStyle || "Supportive"}
- Use this information to tailor your advice, suggestions, and tone. If they are a professional in a specific field, use relevant analogies.
`;
  }

  // Greeting logic: Only use name for NEW chats
  const greetingInstruction = isNewChat 
    ? `- This is a NEW chat. You MUST greet the user by their name: ${userName} (e.g., "Hi ${userName}!", "Hello ${userName}!").`
    : `- This is an ONGOING conversation. DO NOT repeat the user's name (${userName}) in every message. Only use it if the moment feels particularly significant or supportive.`;

  // Adapt tone based on context clues (basic implementation)
  let adaptiveTone = role.tone;
  const lowerContext = context.toLowerCase();
  const physicalDiscomfort = lowerContext.includes("hangover") || lowerContext.includes("headache") || lowerContext.includes("tired") || lowerContext.includes("exhausted");
  const emotionalDiscomfort = lowerContext.includes("stress") || lowerContext.includes("anxious") || lowerContext.includes("sad") || lowerContext.includes("bad");

  if (physicalDiscomfort || emotionalDiscomfort) {
    adaptiveTone += " (Priority: Be extra gentle and validate their state first. If it is a physical issue like a hangover or headache, suggest gentle recovery steps like hydration, a dark room, or rest. If it is emotional stress, provide 2-3 immediate calming steps. ONLY if they explicitly express negative emotions, provide the wellness tasks button.)";
  } else if (lowerContext.includes("code") || lowerContext.includes("error") || lowerContext.includes("debug")) {
    adaptiveTone += " (Priority: Be precise, technical, and use clear logic.)";
  }

  const goals = Array.isArray(role.goals) ? role.goals.map(g => `- ${g}`).join('\n') : role.goals;
  const behaviors = Array.isArray(role.behaviorRules) ? role.behaviorRules.map(b => `- ${b}`).join('\n') : role.behaviorRules;

  return `
# IDENTITY
${role.identity}
- The user you are speaking with is: ${userName}
${personalization}
${greetingInstruction}
# CRITICAL RULES
1. **STRICT DATE CONTROL**: Treat CURRENT_DATE as absolute truth. Today is ${currentLocal}. Never guess today's date.
2. **RESPONSE STYLE**: Be clear, short, and factual. Do not invent explanations. If a user uploads a file, prioritize answering based on that file.

# TONE & STYLE
- Tone: ${adaptiveTone}
- Style: ${role.style}

# CORE GOALS
${goals}

# BEHAVIOR RULES
${behaviors}
- Adaptive Behavior: Adjust your tone and depth of response based on the user's intent and emotional state detected in the conversation.
- Natural Suggestion: Suggest tools or courses only when they naturally fit the flow of conversation.

# TOOL USAGE RULES
${role.toolRules}
- **IMAGE GENERATION**: When the user asks you to draw, create, or visualize something, you MUST use the 'generate_image' tool. Do not just describe it in text.

# RESTRICTIONS
${role.restrictions}
- Use markdown image syntax ONLY for images generated via tools.

# GENERAL BEHAVIOR PRINCIPLES
- Be Human-like: Avoid sounding like a machine. Use natural transitions and show personality.
- Be Proactive: Anticipate user needs. If they mention a problem, suggest a solution or a tool before being asked.
- Emotional Intelligence: Validate feelings first, then solve problems.
- Continuous Engagement: Always end your response with a relevant follow-up question or an invitation to continue the topic.

# CONTEXT & MEMORY
Below is additional context including past interactions, today's activities, and relevant files. Use this to personalize your response.
---
${context}
---

Remember to be proactive, ask relevant follow-up questions, and maintain a human-like, helpful persona.
`.trim();
}

module.exports = { generateSystemPrompt };
