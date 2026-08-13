const Chat = require("../models/chatModels");
const Journal = require("../models/journalModel");
const User = require("../models/userModel");
const mongoose = require("mongoose");
const Enrollment = require("../models/enrollmentModel");
const Course = require("../models/courseModel");
const Lesson = require("../models/lessonModel");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { saveJournalEntry } = require("../utils/journalUtils");
const OpenAI = require("openai");
const { PDFParse } = require("pdf-parse");
const { generateSystemPrompt } = require("../utils/promptBuilder");
const ChromaDBService = require("../services/chromaDBService");
const UserTaskProgress = require("../models/userTaskProgressModel");
const { Task } = require("../models/taskModel");
const langchainService = require("../services/langchainService");



const chromadb = new ChromaDBService();

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

function getModelName() {
  return process.env.MODEL || "gpt-4o-mini";
}

async function extractTextFromFile(filePath, fileType) {
  try {
    if (fileType.includes("pdf")) {
      const dataBuffer = fs.readFileSync(filePath);
      const parser = new PDFParse({ data: dataBuffer });
      const data = await parser.getText();
      await parser.destroy();
      return data.text;
    } else if (fileType.includes("text/plain")) {
      return fs.readFileSync(filePath, "utf8");
    }
    return "";
  } catch (err) {
    console.error("Extraction error:", err);
    return "";
  }
}

async function isFirstChatOfDay(userId) {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // Check if there are any assistant messages created today across all chats
    const count = await Chat.countDocuments({
      user: userId,
      messages: {
        $elemMatch: {
          role: "assistant",
          createdAt: { $gte: startOfDay }
        }
      }
    });

    return count === 0;
  } catch (err) {
    console.error("isFirstChatOfDay error:", err);
    return false;
  }
}



async function getDailyReminders(userId) {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    let reminders = [];

    // 1. Check for active courses based on lessonProgress
    const user = await User.findById(userId);
    if (user && user.lessonProgress.length > 0) {
      const lessonIds = user.lessonProgress
        .map((lp) => lp.lessonId)
        .filter((id) => id && mongoose.Types.ObjectId.isValid(id));
      
      if (lessonIds.length > 0) {
        const activeCoursesCount = (await Lesson.find({ _id: { $in: lessonIds } }).distinct("courseId")).length;
        if (activeCoursesCount > 0) {
          reminders.push(`You have ${activeCoursesCount} active course(s) to work on.`);
        }
      }
    }

    // 2. Check if journal entry exists for today
    const todayJournal = await Journal.findOne({
      user: userId,
      createdAt: { $gte: startOfDay }
    });
    if (!todayJournal) {
      reminders.push("You haven't written a journal entry today. Reflection can be a great way to start your day!");
    }

    // 3. Check streak/lesson completion
    if (!user) {
      if (reminders.length > 0) {
        return "\n\n--- DAILY REMINDER ---\n" + reminders.map(r => `• ${r}`).join("\n");
      }
      return "";
    }
    const lastLessonDate = user.lastLessonCompletedAt ? new Date(user.lastLessonCompletedAt) : null;
    if (!lastLessonDate || lastLessonDate < startOfDay) {
      reminders.push("Don't forget to complete a lesson today to maintain your learning streak!");
    }

    // 4. (Removed task reminder to align with wellness-only focus during stress)
    
    if (reminders.length > 0) {
      return "\n\n--- DAILY REMINDER ---\n" + reminders.map(r => `• ${r}`).join("\n");
    }
    return "";
  } catch (err) {
    console.error("getDailyReminders error:", err);
    return "";
  }
}

/**
 * Determines mood situation from today's journals + optional fallback message text.
 * Returns:
 *  { situation: 'negative' | 'positive' | 'none', moods, categories }
 */
async function detectMoodSituation(userId, userMessageText = "") {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const NEGATIVE_MOODS = ["sad", "depressed", "lonely", "anxious", "nervous", "worried",
    "stressed", "overwhelmed", "angry", "irritated", "frustrated", "exhausted", "tired"];
  const POSITIVE_MOODS = ["happy", "excited", "energetic", "content", "grateful", "calm", "motivated", "great", "good"];

  const moodToCategory = {
    "sad": "Emotional Regulation",
    "depressed": "Emotional Regulation",
    "lonely": "Relationships",
    "anxious": "Anxiety",
    "nervous": "Anxiety",
    "worried": "Stress",
    "stressed": "Stress",
    "overwhelmed": "Stress",
    "busy": "Mindfulness",
    "tired": "Sleep",
    "exhausted": "Sleep",
    "sleepy": "Sleep",
    "happy": "Self-Care",
    "excited": "Mindfulness",
    "energetic": "Mindfulness",
    "angry": "Emotional Regulation",
    "irritated": "Stress",
    "frustrated": "Emotional Regulation",
    "content": "Self-Care",
    "grateful": "Self-Care",
    "calm": "Mindfulness",
    "motivated": "Mindfulness",
  };

  // Source 1: today's journals
  let moods = [];
  try {
    const todayJournals = await Journal.find({
      user: userId,
      createdAt: { $gte: startOfDay }
    }).select("mood");
    moods = todayJournals.map(j => j.mood).filter(m => m && m.trim());
  } catch (err) {
    console.error("detectMoodSituation journal fetch error:", err);
  }

  // Source 2: fallback — check first message text for mood keywords
  if (moods.length === 0 && userMessageText) {
    const lower = userMessageText.toLowerCase();
    [...NEGATIVE_MOODS, ...POSITIVE_MOODS].forEach(keyword => {
      if (lower.includes(keyword)) moods.push(keyword);
    });
  }

  if (moods.length === 0) return { situation: "none", moods: [], categories: [] };

  // Determine situation
  const isNegative = moods.some(m =>
    NEGATIVE_MOODS.some(neg => m.toLowerCase().includes(neg))
  );
  const isPositive = moods.some(m =>
    POSITIVE_MOODS.some(pos => m.toLowerCase().includes(pos))
  );

  const categories = new Set();
  moods.forEach(m => {
    for (const [key, cat] of Object.entries(moodToCategory)) {
      if (m.toLowerCase().includes(key)) categories.add(cat);
    }
  });

  return {
    situation: isNegative ? "negative" : isPositive ? "positive" : "none",
    moods,
    categories: Array.from(categories),
  };
}

/**
 * Called at the START of every NEW chat session.
 * Returns { message, courses, wellnessButton } based on detected mood.
 */
async function getNewChatMoodSuggestion(userId, userMessageText = "") {
  try {
    const { situation, moods, categories } = await detectMoodSituation(userId, userMessageText);

    if (situation === "none") return { message: null, courses: [], wellnessButton: false };

    const moodLabel = moods.slice(0, 2).join(" and ");

    if (situation === "negative") {
      // Negative mood → suggest wellness tasks button
      const message = `\n\nI can see you're feeling **${moodLabel}** today. That's completely okay — be gentle with yourself. I've prepared some calming wellness exercises that might help you feel more grounded: [button:Go to Wellness Tasks:/dashboard/tasks]`;
      return { message, courses: [], wellnessButton: true };
    }

    if (situation === "positive") {
      // Positive mood → suggest learning courses
      const suggestedCourses = [];
      for (const cat of categories) {
        const results = await suggestCourses(cat);
        suggestedCourses.push(...results);
        if (suggestedCourses.length >= 3) break;
      }
      // Fallback: general courses if no category match
      if (suggestedCourses.length === 0) {
        const fallback = await suggestCourses("wellness");
        suggestedCourses.push(...fallback);
      }
      const uniqueCourses = Array.from(new Set(suggestedCourses.map(c => c.id.toString())))
        .map(id => suggestedCourses.find(c => c.id.toString() === id))
        .slice(0, 3);

      const message = uniqueCourses.length > 0
        ? `\n\nYou're feeling **${moodLabel}** — what a great energy to start with! Here are some courses that match your vibe:`
        : null;
      return { message, courses: uniqueCourses, wellnessButton: false };
    }

    return { message: null, courses: [], wellnessButton: false };
  } catch (err) {
    console.error("getNewChatMoodSuggestion error:", err);
    return { message: null, courses: [], wellnessButton: false };
  }
}

async function getTodayContext(userId, userMessage = "", localDateStr = "") {
  try {
    const startOfDay = localDateStr ? new Date(localDateStr) : new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const dateKey = startOfDay.getFullYear() + '-' + String(startOfDay.getMonth() + 1).padStart(2, '0') + '-' + String(startOfDay.getDate()).padStart(2, '0');

    let context = `CURRENT_DATE: ${startOfDay.toDateString()}\n`;
    context += `FILTERED_GOOGLE_CALENDAR_EVENTS: [No calendar data provided in this request]\n\n`;
    const todayJournals = await Journal.find({
      user: userId,
      createdAt: { $gte: startOfDay }
    });

    // 2. Get Today's Lesson Notes/Journal from lessonProgress
    const user = await User.findById(userId).select("lessonProgress");
    const todayLessonActivities = user.lessonProgress?.filter(lp => lp.updatedAt >= startOfDay) || [];

    // 3. Get Today's Tasks (ONLY if stress/anxiety detected or explicitly asked about wellness/exercises)
    const lowerMsg = userMessage.toLowerCase();
    const stressKeywords = ["stress", "anxious", "sad", "bad", "overwhelmed", "tired", "worried", "nervous"];
    const wellnessKeywords = ["wellness", "exercise", "calm", "relax", "breathing", "daily task"];
    const isStressed = stressKeywords.some(word => lowerMsg.includes(word));
    const askedAboutWellness = wellnessKeywords.some(word => lowerMsg.includes(word));

    let taskContext = "";
    if (isStressed || askedAboutWellness) {
      const progress = await UserTaskProgress.findOne({ user: userId, dateKey });
      if (progress && progress.taskIds.length > 0) {
        const todayTasks = await Task.find({ taskId: { $in: progress.taskIds } });
        if (todayTasks.length > 0) {
          taskContext = "DAILY WELLNESS EXERCISES:\n" + todayTasks.map(t => {
            const isCompleted = progress.completedTaskIds.includes(t.taskId);
            return `- [${isCompleted ? "COMPLETED" : "PENDING"}] ${t.title} (${t.category}, ${t.duration} mins)`;
          }).join("\n") + "\n\n";
        }
      }
    }

    // (Already declared above, appending now)
    if (todayJournals.length > 0) {
      context += "TODAY'S JOURNAL ENTRIES:\n" + todayJournals.map(j => `- [Title: ${j.title || "Untitled"}] Content: ${j.content}`).join("\n") + "\n\n";
    }

    if (todayLessonActivities.length > 0) {
      context += "TODAY'S LESSON PROGRESS & NOTES:\n" + todayLessonActivities.map(lp => `- Notes: ${lp.notes || "None"}, Journal: ${lp.journal || "None"}`).join("\n") + "\n\n";
    }

    context += taskContext;

    return context;
  } catch (err) {
    console.error("Context fetch error:", err);
    return "";
  }
}

const TOOLS = [
  {
    type: "function",
    function: {
      name: "create_journal_entry",
      description: "Create a new journal entry for the user. Use this when the user explicitly asks to write, save, or record something in their journal.",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "A short, descriptive title for the journal entry."
          },
          content: {
            type: "string",
            description: "The main text content of the journal entry."
          },
          mood: {
            type: "string",
            description: "The user's mood (e.g., Happy, Reflective, Tired, Excited)."
          },
          tags: {
            type: "array",
            items: { type: "string" },
            description: "A list of relevant tags or keywords."
          }
        },
        required: ["content"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "suggest_courses",
      description: "Suggest real courses from the database based on user interest, mood, or goals. Returns Course ID, Title, Description, and Thumbnail.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Keyword to search for courses (e.g., mindfulness, stress, coding)."
          }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "generate_image",
      description: "Generate an image based on a descriptive prompt using DALL-E 3.",
      parameters: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
            description: "A detailed description of the image to generate."
          }
        },
        required: ["prompt"]
      }
    }
  }
];

async function suggestCourses(query) {
  try {
    let courses = await Course.find({
      $or: [
        { title: { $regex: query, $options: "i" } },
        { category: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } }
      ],
      isPublished: true,
      isDeleted: false
    }).limit(3).lean();

    if (courses.length === 0) {
      courses = await Course.find({
        isPublished: true,
        isDeleted: false
      }).limit(3).lean();
    }

    const results = [];
    for (const course of courses) {
      // Find the first lesson to get a video reference if needed
      const firstLesson = await Lesson.findOne({ courseId: course._id }).sort({ order: 1 }).lean();
      results.push({
        id: course._id,
        title: course.title,
        description: course.description.slice(0, 100) + "...",
        thumbnailUrl: course.thumbnailUrl || (firstLesson ? firstLesson.thumbnail : ""),
        category: course.category
      });
    }
    return results;
  } catch (err) {
    console.error("suggestCourses error:", err);
    return [];
  }
}

async function determineRole(userMessage) {
  if (!process.env.OPENAI_API_KEY) return "general";

  try {
    const response = await openai.chat.completions.create({
      model: getModelName(),
      messages: [
        {
          role: "system",
          content: `Classify the user's message into one of these intents: "journal", "course", or "general".
- "journal": If talking about their day, feelings, daily reflection, or wanting to write a journal.
- "course": If asking for course suggestions, learning paths, or educational advice.
- "general": For anything else, casual chat, or academic help.
Respond ONLY with one of the three words: journal, course, or general.`
        },
        { role: "user", content: userMessage }
      ],
      temperature: 0,
      max_tokens: 10
    });

    const intent = response.choices[0].message.content.trim().toLowerCase();
    return ["journal", "course", "general"].includes(intent) ? intent : "general";
  } catch (err) {
    console.error("Role determination error:", err);
    return "general";
  }
}

async function getAiReply(history, context = "", tools = null, roleKey = "general", user = null, isNewChat = false, localDateStr = "") {
  if (!process.env.OPENAI_API_KEY) {
    return { content: "OPENAI_API_KEY is not set in backend/.env" };
  }

  const userName = user?.name || "User";

  // Combine history with retrieved context if available
  const messages = (history || [])
    .slice(-20)
    .map((m) => ({ role: m.role, content: m.content, tool_calls: m.tool_calls, tool_call_id: m.tool_call_id }));

  if (roleKey || context) {
    // Check if system message already exists
    const hasSystem = messages.some(m => m.role === "system");
    if (!hasSystem) {
      const systemPrompt = generateSystemPrompt(roleKey, user, context, isNewChat, localDateStr);
      messages.unshift({
        role: "system",
        content: systemPrompt
      });
    }
  }

  const completion = await openai.chat.completions.create({
    model: getModelName(),
    messages,
    temperature: 0.7,
    tools: tools || undefined,
  });

  return completion?.choices?.[0]?.message || { content: "No reply" };
}

exports.sendMessage = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Not authorized" });

    const { message, sessionId, editIndex, localDate } = req.body;
    const clean = (message || "").trim();

    // Check if we have a file OR message
    if (!clean && !req.file) {
      return res.status(400).json({ message: "Message or file is required" });
    }

    let fileData = "";
    let fileMeta = { url: "", type: "" };

    if (req.file) {
      fileMeta.url = "/uploads/" + req.file.filename;
      fileMeta.type = req.file.mimetype;
      fileData = await extractTextFromFile(req.file.path, req.file.mimetype);
    }

    let chat;

    if (sessionId) {
      chat = await Chat.findOne({ _id: sessionId, user: userId });
      if (!chat) return res.status(404).json({ message: "Chat session not found" });

      // Handle Edit: Truncate messages if editIndex is passed
      if (editIndex !== undefined && editIndex !== null) {
        const idx = parseInt(editIndex, 10);
        if (!isNaN(idx) && idx >= 0 && idx < chat.messages.length) {
          console.log(`Editing message at index ${idx}. Truncating future messages.`);
          chat.messages = chat.messages.slice(0, idx);
        }
      }
    } else {
      chat = await Chat.create({
        user: userId,
        title: clean.slice(0, 40),
        messages: [],
      });
    }

    // 1) Save user message
    chat.messages.push({
      role: "user",
      content: clean || (req.file ? `Uploaded file: ${req.file.originalname}` : ""),
      fileUrl: fileMeta.url,
      fileType: fileMeta.type
    });

    // 2) Prepare Context (Today's Data + Semantic Search + File Content)
    let todayContext = await getTodayContext(userId, clean, localDate);

    // Prepend file content to message if present
    const augmentedMessage = fileData
      ? `[IMPORTANT SYSTEM NOTE: I have just uploaded a new file. The content of this NEW file is provided below. You MUST base your answer primarily on THIS file's content, rather than any previous files or past context, unless I explicitly ask otherwise.]\n\n--- CURRENT UPLOADED FILE CONTENT ---\n${fileData}\n--- END OF FILE CONTENT ---\n\nUSER MESSAGE: ${clean}`
      : clean;
    
    let searchContext = "";
    const lowerMsg = clean.toLowerCase();
    const isAskingAboutToday = lowerMsg.includes("today") || lowerMsg.includes("now") || lowerMsg.includes("current");

    try {
      // 1. Search journals for context (Skip past journals if explicitly asking about today)
      if (!isAskingAboutToday) {
        const journalData = await chromadb.search(clean, "journals", 3, { userId: userId.toString() });
        if (journalData && journalData.results && journalData.results.length > 0) {
          const docs = journalData.results.map(r => r.document);
          searchContext += "PAST JOURNALS (for background context):\n" + docs.join("\n") + "\n\n";
        }
      }

      // 2. Search past chat messages for memory
      const chatData = await chromadb.search(clean, "chat_messages", 5, { userId: userId.toString() });
      if (chatData && chatData.results && chatData.results.length > 0) {
        const docs = chatData.results.map(r => r.document);
        searchContext += "PAST CONVERSATION MEMORIES:\n" + docs.join("\n") + "\n\n";
      }

      // 3. Search for available courses
      const courseData = await chromadb.search(clean, "courses", 5);
      if (courseData && courseData.results && courseData.results.length > 0) {
        const docs = courseData.results.map(r => r.document);
        searchContext += "AVAILABLE COURSES FROM OUR PLATFORM (ONLY suggest these, NEVER invent others):\n" + docs.join("\n") + "\n\n";
      }
    } catch (err) {
      console.error("Vector search error:", err);
    }

    // 2.5) Select Role based on message
    const selectedRole = await determineRole(clean);
    console.log(`Automatically selected role: ${selectedRole}`);

    // Check if this is the very first message in the chat
    const isNewChat = chat.messages.length <= 1;

    // 3) Generate AI reply (with Tool support and selected role)
    const fullContext = (todayContext + "\n" + searchContext).trim();

    let reply = "";
    let suggestedCourses = [];
    let assistantMessage;

    // Use LangChain for advanced RAG if it's a journal/memory related query and NOT a tool-heavy request
    const needsAdvancedRAG = (selectedRole === "journal" || lowerMsg.includes("history") || lowerMsg.includes("past")) && !req.file;

    if (needsAdvancedRAG) {
      console.log("Using LangChain for advanced RAG retrieval...");
      try {
        const langchainReply = await langchainService.executeRagQuery(
          userId, 
          clean, 
          chat.messages, 
          req.user, 
          selectedRole, 
          isNewChat, 
          localDate
        );
        reply = langchainReply;
      } catch (err) {
        console.error("LangChain RAG error, falling back to standard flow:", err);
        const messagesForAI = chat.messages.map(m => ({
          role: m.role,
          content: m.content,
          tool_calls: m.tool_calls,
          tool_call_id: m.tool_call_id
        }));
        messagesForAI[messagesForAI.length - 1].content = augmentedMessage;
        const aiResponse = await getAiReply(messagesForAI, fullContext, TOOLS, selectedRole, req.user, isNewChat, localDate);
        reply = aiResponse.content || "No reply";
      }
    } else {
      const messagesForAI = chat.messages.map(m => ({
        role: m.role,
        content: m.content,
        tool_calls: m.tool_calls,
        tool_call_id: m.tool_call_id
      }));
      // Override the last user message with augmented content for AI context
      messagesForAI[messagesForAI.length - 1].content = augmentedMessage;

      let aiResponse = await getAiReply(messagesForAI, fullContext, TOOLS, selectedRole, req.user, isNewChat, localDate);

      // Handle tool calls
      while (aiResponse.tool_calls) {
        chat.messages.push({
          role: "assistant",
          content: aiResponse.content || "",
          tool_calls: aiResponse.tool_calls
        });

        for (const toolCall of aiResponse.tool_calls) {
          if (toolCall.function.name === "create_journal_entry") {
            const args = JSON.parse(toolCall.function.arguments);
            try {
              const journal = await saveJournalEntry(userId, args);
              chat.messages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: JSON.stringify({ success: true, journalId: journal._id, message: "Journal entry created successfully" })
              });
            } catch (err) {
              chat.messages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: JSON.stringify({ success: false, error: err.message })
              });
            }
          } else if (toolCall.function.name === "suggest_courses") {
            const args = JSON.parse(toolCall.function.arguments);
            try {
              const courseResults = await suggestCourses(args.query);
              suggestedCourses = courseResults; // Store for final response
              chat.messages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: JSON.stringify({ success: true, courses: courseResults })
              });
            } catch (err) {
              chat.messages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: JSON.stringify({ success: false, error: err.message })
              });
            }
          } else if (toolCall.function.name === "generate_image") {
            const args = JSON.parse(toolCall.function.arguments);
            try {
              console.log(`Generating image for prompt: ${args.prompt}`);
              const imageResponse = await openai.images.generate({
                model: "dall-e-3",
                prompt: args.prompt,
                n: 1,
                size: "1024x1024",
              });
              const tempImageUrl = imageResponse.data[0].url;
              
              // Download and save locally
              const fileName = `generated-${Date.now()}.png`;
              const filePath = path.join(__dirname, "..", "uploads", fileName);
              const response = await axios({
                url: tempImageUrl,
                method: 'GET',
                responseType: 'stream'
              });
              
              const writer = fs.createWriteStream(filePath);
              response.data.pipe(writer);
              
              await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
              });

              const localImageUrl = `/uploads/${fileName}`;
              const protocol = req.protocol;
              const host = req.get('host');
              const fullImageUrl = `${protocol}://${host}${localImageUrl}`;
              
              chat.messages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: JSON.stringify({ success: true, imageUrl: localImageUrl, message: "Image generated and saved successfully" })
              });
              // Append the local image to the final reply
              reply += `\n\n![Generated Image](${fullImageUrl})`;
            } catch (err) {
              console.error("Image generation error:", err);
              chat.messages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: JSON.stringify({ success: false, error: err.message })
              });
            }
          } else {
            // Handle unknown tools to satisfy OpenAI requirements
            chat.messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify({ success: false, error: `Tool '${toolCall.function.name}' is not implemented.` })
            });
          }
        }

        const updatedHistory = chat.messages.map(m => ({
          role: m.role,
          content: m.content,
          tool_calls: m.tool_calls,
          tool_call_id: m.tool_call_id
        }));
        aiResponse = await getAiReply(updatedHistory, fullContext, TOOLS, selectedRole, req.user, isNewChat, localDate);
      }
      // Strip any markdown images from AI content (they are often expired/broken)
      // Use a more robust regex that handles potential whitespace/newlines
      const aiContent = aiResponse.content || "";
      const cleanedAiContent = aiContent.replace(/!\[[\s\S]*?\]\([\s\S]*?\)/g, "").trim();
      
      const imageMarkdown = reply.includes("![Generated Image]") ? reply : "";
      reply = imageMarkdown ? (cleanedAiContent + "\n\n" + imageMarkdown).trim() : cleanedAiContent;
    }

    // 4) On every NEW chat session, check mood and suggest wellness tasks OR courses
    if (isNewChat && !req.file) {
      const moodSuggestion = await getNewChatMoodSuggestion(userId, clean);

      if (moodSuggestion.message) {
        reply += moodSuggestion.message;
      }

      if (moodSuggestion.courses.length > 0) {
        // Merge suggested courses, avoiding duplicates
        const existingIds = new Set(suggestedCourses.map(c => c.id.toString()));
        moodSuggestion.courses.forEach(course => {
          if (!existingIds.has(course.id.toString())) {
            suggestedCourses.push(course);
          }
        });
      }
    }

    // 5) Save final assistant message
    assistantMessage = { role: "assistant", content: reply, courses: suggestedCourses };
    chat.messages.push(assistantMessage);

    await chat.save();

    // 6) Index in ChromaDB for future memory
    try {
      const userMsg = chat.messages[chat.messages.length - 2];
      // Index User Message
      await chromadb.addEmbedding(userMsg.content, "chat_messages", {
        role: "user",
        userId: userId.toString(),
        sessionId: chat._id.toString(),
        timestamp: new Date().toISOString()
      });
      // Index Assistant Reply
      await chromadb.addEmbedding(reply, "chat_messages", {
        role: "assistant",
        userId: userId.toString(),
        sessionId: chat._id.toString(),
        timestamp: new Date().toISOString()
      });
    } catch (indexErr) {
      console.error("Failed to index chat in ChromaDB:", indexErr.message);
    }

    return res.status(200).json({
      sessionId: chat._id,
      reply,
      userMessage: chat.messages[chat.messages.length - 2],
      courses: suggestedCourses
    });
  } catch (err) {
    console.error("sendMessage error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      console.log("getHistory: No user ID found in request object");
      return res.status(401).json({ message: "Not authorized" });
    }

    console.log(`Fetching history for user: ${userId}`);

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
      // Note: ChromaDBService.deleteEmbeddings usually takes IDs. 
      // If the backend service supports clearing by metadata, we should use that.
      // For now, we'll try to clear specific session embeddings if we had their IDs.
      // Since we don't have IDs easily here, we might just log or implement a better delete in the service.
      console.log(`Need to delete vector embeddings for session: ${req.params.id}`);
    } catch (err) {
      console.error("ChromaDB session deletion error:", err);
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

    return res.status(200).json({ message: "All chat history cleared" });
  } catch (err) {
    console.error("clearHistory error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
