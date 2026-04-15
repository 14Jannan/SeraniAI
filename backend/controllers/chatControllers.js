const Chat = require("../models/chatModels");
const Journal = require("../models/journalModel");
const User = require("../models/userModel");
const Enrollment = require("../models/enrollmentModel");
const Course = require("../models/courseModel");
const Lesson = require("../models/lessonModel");
const { saveJournalEntry } = require("../utils/journalUtils");
const OpenAI = require("openai");
const { getOrCreateCollection } = require("../config/chromaClient");
const fs = require("fs");
const path = require("path");
const pdf = require("pdf-parse");
const roles = require("../config/roles.json");

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
      const data = await pdf(dataBuffer);
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
      const lessonIds = user.lessonProgress.map(lp => lp.lessonId);
      const activeCoursesCount = (await Lesson.find({ _id: { $in: lessonIds } }).distinct("courseId")).length;
      if (activeCoursesCount > 0) {
        reminders.push(`You have ${activeCoursesCount} active course(s) to work on.`);
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

    if (reminders.length > 0) {
      return "\n\n--- DAILY REMINDER ---\n" + reminders.map(r => `• ${r}`).join("\n");
    }
    return "";
  } catch (err) {
    console.error("getDailyReminders error:", err);
    return "";
  }
}

async function getMoodBasedCourseSuggestions(userId) {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayJournals = await Journal.find({
      user: userId,
      createdAt: { $gte: startOfDay }
    }).select("mood content");

    if (todayJournals.length === 0) return { message: null, courses: [] };

    // Extract moods and map them to categories
    const moods = todayJournals.map(j => j.mood).filter(m => m);
    if (moods.length === 0) return { message: null, courses: [] };

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
      "frustrated": "Emotional Regulation"
    };

    let categoriesToSearch = new Set();
    moods.forEach(m => {
      const lowerMood = m.toLowerCase();
      for (const [key, cat] of Object.entries(moodToCategory)) {
        if (lowerMood.includes(key)) {
          categoriesToSearch.add(cat);
        }
      }
    });

    if (categoriesToSearch.size === 0) {
      categoriesToSearch.add(moods[0]);
    }

    const suggestedCourses = [];
    for (const cat of categoriesToSearch) {
      const results = await suggestCourses(cat);
      suggestedCourses.push(...results);
      if (suggestedCourses.length >= 3) break;
    }

    const uniqueCourses = Array.from(new Set(suggestedCourses.map(c => c.id.toString())))
      .map(id => suggestedCourses.find(c => c.id.toString() === id))
      .slice(0, 3);

    const moodText = moods.join(", ");
    const message = `\n\nI noticed you're feeling **${moodText}** today according to your journal. Based on your mood, I've selected some courses that might help you find balance or support:`;

    return { message, courses: uniqueCourses };
  } catch (err) {
    console.error("getMoodBasedCourseSuggestions error:", err);
    return { message: null, courses: [] };
  }
}

async function getTodayContext(userId) {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // 1. Get Today's Journal Entries
    const todayJournals = await Journal.find({
      user: userId,
      createdAt: { $gte: startOfDay }
    });

    // 2. Get Today's Lesson Notes/Journal from lessonProgress
    const user = await User.findById(userId).select("lessonProgress");
    const todayLessonActivities = user.lessonProgress?.filter(lp => lp.updatedAt >= startOfDay) || [];

    let context = "";
    if (todayJournals.length > 0) {
      context += "TODAY'S JOURNAL ENTRIES:\n" + todayJournals.map(j => `- [Title: ${j.title || "Untitled"}] Content: ${j.content}`).join("\n") + "\n\n";
    }

    if (todayLessonActivities.length > 0) {
      context += "TODAY'S LESSON PROGRESS & NOTES:\n" + todayLessonActivities.map(lp => `- Notes: ${lp.notes || "None"}, Journal: ${lp.journal || "None"}`).join("\n") + "\n\n";
    }

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
  }
];

async function suggestCourses(query) {
  try {
    const courses = await Course.find({
      $or: [
        { title: { $regex: query, $options: "i" } },
        { category: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } }
      ],
      isPublished: true,
      isDeleted: false
    }).limit(3).lean();

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

async function getAiReply(history, context = "", tools = null, roleKey = "general") {
  if (!process.env.OPENAI_API_KEY) {
    return { content: "OPENAI_API_KEY is not set in backend/.env" };
  }

  // Get instructions for the selected role
  const roleInstructions = roles[roleKey] || roles.general;

  const groqClient = getGroqClient();
  if (!groqClient) {
    return "Groq client could not be initialized";
  }

  // Combine history with retrieved context if available
  const messages = (history || [])
    .slice(-20)
    .map((m) => ({ role: m.role, content: m.content, tool_calls: m.tool_calls, tool_call_id: m.tool_call_id }));

  if (context || roleInstructions) {
    // Check if system message already exists
    const hasSystem = messages.some(m => m.role === "system");
    if (!hasSystem) {
      messages.unshift({
        role: "system",
        content: `${roleInstructions}\n\nYou are SeraniAI, a helpful assistant. Below is additional context for this conversation, which may include past memories, today's journal/lesson activities, and content from uploaded files. Use this information to provide accurate and personalized responses.\n\nCONTEXT:\n${context}`
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

    const { message, sessionId, editIndex } = req.body;
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
    let todayContext = await getTodayContext(userId);
    
    // Prepend file content to message if present
    const augmentedMessage = fileData 
      ? `[IMPORTANT SYSTEM NOTE: I have just uploaded a new file. The content of this NEW file is provided below. You MUST base your answer primarily on THIS file's content, rather than any previous files or past context, unless I explicitly ask otherwise.]\n\n--- CURRENT UPLOADED FILE CONTENT ---\n${fileData}\n--- END OF FILE CONTENT ---\n\nUSER MESSAGE: ${clean}` 
      : clean;
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
            const metadata = results.metadatas[0][idx];
            const source = metadata.source || "chat";
            const role = metadata.role ? `(${metadata.role})` : "";
            
            if (source === "journal") {
              contextItems.push(`[PAST JOURNAL ENTRY]: ${doc}`);
            } else {
              contextItems.push(`[PAST CONVERSATION ${role}]: ${doc}`);
            }
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

    // 2.5) Select Role based on message
    const selectedRole = await determineRole(clean);
    console.log(`Automatically selected role: ${selectedRole}`);

    // 3) Generate AI reply (with Tool support and selected role)
    const fullContext = (todayContext + "\n" + searchContext).trim();
    
    const messagesForAI = chat.messages.map(m => ({ 
      role: m.role, 
      content: m.content,
      tool_calls: m.tool_calls,
      tool_call_id: m.tool_call_id
    }));
    // Override the last user message with augmented content for AI context
    messagesForAI[messagesForAI.length - 1].content = augmentedMessage;

    let aiResponse = await getAiReply(messagesForAI, fullContext, TOOLS, selectedRole);

    let suggestedCourses = [];

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
        }
      }

      const updatedHistory = chat.messages.map(m => ({
        role: m.role,
        content: m.content,
        tool_calls: m.tool_calls,
        tool_call_id: m.tool_call_id
      }));
      aiResponse = await getAiReply(updatedHistory, fullContext, TOOLS, selectedRole);
    }

    let reply = aiResponse.content || "No reply";

    // 4) Check for first chat of the day and add reminders/mood suggestions
    const firstChat = await isFirstChatOfDay(userId);
    if (firstChat) {
      // 4a) Daily Reminders
      const reminders = await getDailyReminders(userId);
      if (reminders) {
        reply += reminders;
      }

      // 4b) Mood-based Course Suggestions
      const moodSuggestions = await getMoodBasedCourseSuggestions(userId);
      if (moodSuggestions.message && moodSuggestions.courses.length > 0) {
        reply += moodSuggestions.message;
        // Merge suggested courses, avoiding duplicates
        const existingIds = new Set(suggestedCourses.map(c => c.id.toString()));
        moodSuggestions.courses.forEach(course => {
          if (!existingIds.has(course.id.toString())) {
            suggestedCourses.push(course);
          }
        });
      }
    }

    // 5) Save final assistant message
    chat.messages.push({ role: "assistant", content: reply, courses: suggestedCourses });

    await chat.save();

    // 5) Index messages in ChromaDB
    try {
      const collection = await getOrCreateCollection();
      const timestamp = new Date().toISOString();

      // The final assistant reply is the last message
      const assistantMessage = chat.messages[chat.messages.length - 1];
      // The user message is the one we saved at the beginning of this function
      // (It's still 'clean' or the file placeholder)
      
      await collection.add({
        ids: [`${chat._id}-user-${Date.now()}-u`, `${chat._id}-assistant-${Date.now()}-a`],
        documents: [clean || "Uploaded file", reply],
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
