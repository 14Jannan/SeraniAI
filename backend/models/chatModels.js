const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant", "system", "tool"],
      required: true,
    },
    content: { type: String, required: false }, // Optional for tool calls
    tool_calls: { type: Array, default: undefined },
    tool_call_id: { type: String, default: undefined },
    fileUrl: { type: String, default: "" },
    fileType: { type: String, default: "" },
    courses: { type: Array, default: [] },
  },
  { timestamps: true, _id: false }
);

const chatSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, default: "New chat" },
    messages: { type: [chatMessageSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Chat", chatSchema);
