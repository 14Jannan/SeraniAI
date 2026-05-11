const mongoose = require("mongoose");
const { encrypt, decrypt } = require("../utils/encryption");


const chatMessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant", "system", "tool"],
      required: true,
    },
    content: { 
      type: String, 
      required: false,
      set: encrypt,
      get: decrypt
    }, // Optional for tool calls
    tool_calls: { type: Array, default: undefined },
    tool_call_id: { type: String, default: undefined },
    fileUrl: { type: String, default: "" },
    fileType: { type: String, default: "" },
    courses: { type: Array, default: [] },
  },
  { 
    timestamps: true, 
    _id: false,
    toJSON: { getters: true },
    toObject: { getters: true }
  }
);

const chatSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { 
      type: String, 
      default: "New chat",
      set: encrypt,
      get: decrypt
    },
    messages: { type: [chatMessageSchema], default: [] },
  },
  { 
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true }
  }
);

module.exports = mongoose.model("Chat", chatSchema);
