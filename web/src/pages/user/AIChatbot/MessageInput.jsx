import React, { useState, useEffect, useRef } from "react";
import { Send, X, Paperclip, FileText } from "lucide-react";
import ListeningAnimation from "./ListeningAnimation";

function MessageInput({ onSend, loading, editValue = null, onCancelEdit = null }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);
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
    onSend(cleanText, file);
    setText("");
    setFile(null);
    // Reset height after sending
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
    }
    // reset input value to allow selecting same file again
    e.target.value = "";
  };

  const removeFile = () => {
    setFile(null);
  };

  const handleCancel = () => {
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    if (onCancelEdit) onCancelEdit();
  };

  return (
    <div className="border-t border-gray-200 dark:border-white/5 p-4 bg-white dark:bg-[#0F172A] transition-colors duration-300">
      <div className="max-w-3xl mx-auto">
        {editValue !== null && (
          <div className="mb-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 rounded-lg flex items-center justify-between text-blue-700 dark:text-blue-300 text-xs font-semibold animate-in fade-in slide-in-from-bottom-1 duration-200">
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

        {/* File Preview Chip */}
        {file && (
          <div className="mb-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/30 border border-green-100 dark:border-green-800 rounded-lg flex items-center justify-between text-green-700 dark:text-green-300 text-xs font-semibold animate-in fade-in slide-in-from-bottom-1 duration-200">
            <span className="flex items-center gap-2">
              <FileText size={14} className="text-green-500" />
              <span className="truncate max-w-[200px]">{file.name}</span>
              <span className="text-gray-400 font-normal">({(file.size / 1024).toFixed(1)} KB)</span>
            </span>
            <button
              onClick={removeFile}
              className="hover:bg-green-100 p-1 rounded transition-colors"
              title="Remove file"
            >
              <X size={12} />
            </button>
          </div>
        )}

        <div className="relative flex gap-3 border border-gray-200 dark:border-white/10 rounded-2xl p-3 shadow-sm bg-gray-50 dark:bg-white/5 focus-within:bg-white dark:focus-within:bg-white/10 focus-within:border-blue-300 dark:focus-within:border-white/20 focus-within:ring-4 focus-within:ring-blue-50 dark:focus-within:ring-blue-900/20 transition-all duration-200">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".pdf,.txt"
            onChange={handleFileChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="p-2 text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-xl transition-all active:scale-95"
            title="Attach a document (PDF, TXT)"
          >
            <Paperclip size={20} />
          </button>

          <textarea
            ref={textareaRef}
            className="flex-1 resize-none outline-none bg-transparent relative z-10 text-[15px] leading-relaxed py-1 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
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
            disabled={(!text.trim() && !file) || loading}
            className={`p-2 rounded-xl transition-all h-10 w-10 flex items-center justify-center ${(!text.trim() && !file) || loading
                ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                : "bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none hover:bg-blue-700 active:scale-95"
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
