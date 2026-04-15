import React, { useState, useEffect, useRef } from "react";
import { Send, X } from "lucide-react";
import ListeningAnimation from "./ListeningAnimation";

function MessageInput({ onSend, loading, editValue = null, onCancelEdit = null }) {
  const [text, setText] = useState("");
  const textareaRef = useRef(null);

  // Auto-expand textarea height
  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const newHeight = Math.min(textarea.scrollHeight, 200); // Max height of 200px
      textarea.style.height = `${newHeight}px`;
    }
  };

  // Adjust height when text changes
  useEffect(() => {
    adjustHeight();
  }, [text]);

  // When editValue changes, populate the input and adjust height
  useEffect(() => {
    if (editValue !== null) {
      setText(editValue);
      // Wait for React to update the state/DOM before adjusting height
      setTimeout(adjustHeight, 0);
    }
  }, [editValue]);

  const handleSend = () => {
    const cleanText = text.trim();
    if (!cleanText || loading) return;
    onSend(cleanText);
    setText("");
    // Reset height after sending
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleCancel = () => {
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    if (onCancelEdit) onCancelEdit();
  };

  return (
    <div className="border-t p-4 bg-white">
      <div className="max-w-3xl mx-auto">
        {editValue !== null && (
          <div className="mb-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-between text-blue-700 text-xs font-semibold animate-in fade-in slide-in-from-bottom-1 duration-200">
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
              Editing message...
            </span>
            <button
              onClick={handleCancel}
              className="hover:bg-blue-100 p-1 rounded transition-colors"
              title="Cancel editing"
            >
              <X size={12} />
            </button>
          </div>
        )}
        <div className="relative flex gap-3 border border-gray-200 rounded-2xl p-3 shadow-sm bg-gray-50 focus-within:bg-white focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-50 transition-all duration-200">
          <textarea
            ref={textareaRef}
            className="flex-1 resize-none outline-none bg-transparent relative z-10 text-[15px] leading-relaxed py-1"
            rows={1}
            placeholder=""
            value={text}
            disabled={loading}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
              if (e.key === "Escape" && editValue !== null) {
                handleCancel();
              }
            }}
          />

          {/* Listening Animation as dynamic placeholder */}
          {!text && editValue === null && (
            <ListeningAnimation />
          )}

          <button
            onClick={handleSend}
            disabled={!text.trim() || loading}
            className={`p-2 rounded-xl transition-all h-10 w-10 flex items-center justify-center ${!text.trim() || loading
                ? "text-gray-300 cursor-not-allowed"
                : "bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95"
              }`}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default MessageInput;
