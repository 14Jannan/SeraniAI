import React, { useState } from "react";
import { Trash2, PanelLeftClose, AlertCircle } from "lucide-react";
import { deleteSession, clearHistory } from "../../../api/chatApi";

function Sidebar({
  conversations,
  onOpenChat,
  onNewChat,
  activeSessionId,
  setConversations,
  setActiveSessionId,
  setMessages,
  onToggleSidebar,
}) {
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleDelete = async (e, id) => {
    e.stopPropagation(); // prevent opening chat

    try {
      await deleteSession(id);

      setConversations((prev) =>
        prev.filter((chat) => chat._id !== id)
      );

      if (activeSessionId === id) {
        setActiveSessionId(null);
        setMessages([]);
      }
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const handleClearAll = async () => {
    try {
      await clearHistory();
      setConversations([]);
      setActiveSessionId(null);
      setMessages([]);
      setShowClearConfirm(false);
    } catch (error) {
      console.error("Clear history error:", error);
    }
  };

  return (
    <div className="w-72 border-r bg-white flex flex-col h-full animate-in slide-in-from-left duration-300">
      {/* Top Section: New Chat + Close Toggle */}
      <div className="p-4 flex items-center gap-2">
        <button
          onClick={onNewChat}
          className="flex-1 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 font-medium rounded-xl py-2.5 flex items-center justify-center gap-2 transition-all hover:bg-gray-50 active:scale-95 shadow-sm"
        >
          <span className="text-xl text-gray-400">+</span>
          <span>New Chat</span>
        </button>
        <button
          onClick={onToggleSidebar}
          className="p-2.5 rounded-xl hover:bg-gray-100 text-gray-400 transition-all border border-transparent hover:border-gray-100 active:scale-90"
          title="Close sidebar"
        >
          <PanelLeftClose size={20} />
        </button>
      </div>

      {/* Refined Section Title */}
      <div className="px-5 pt-2 pb-1">
        <h2 className="text-[12px] font-semibold text-gray-500 uppercase tracking-tight">
          Recent Conversations
        </h2>
      </div>
      <div className="px-5 mb-2">
        <div className="h-[1px] w-8 bg-gray-200" />
      </div>

      {/* Chat History List */}
      <div className="flex-1 overflow-y-auto px-3 space-y-1.5 scrollbar-thin scrollbar-thumb-gray-200">
        {conversations.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-400 text-sm">No conversations yet</p>
          </div>
        ) : (
          conversations.map((chat) => (
            <div
              key={chat._id}
              onClick={() => onOpenChat(chat._id)}
              className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-200 ${activeSessionId === chat._id
                ? "bg-blue-50 border border-blue-100 text-blue-700 shadow-sm"
                : "hover:bg-gray-50 text-gray-600 border border-transparent"
                }`}
            >
              <span className="truncate text-sm font-medium">
                {chat.title || (chat.messages?.[0]?.content) || "Empty chat"}
              </span>

              <button
                onClick={(e) => handleDelete(e, chat._id)}
                className={`p-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 transition-all ${activeSessionId === chat._id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  }`}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Footer / Clear All */}
      {conversations.length > 0 && (
        <div className="p-4 border-t bg-gray-50/30">
          {!showClearConfirm ? (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
            >
              <Trash2 size={14} />
              <span>Clear All Conversations</span>
            </button>
          ) : (
            <div className="space-y-3 animate-in fade-in zoom-in duration-200">
              <div className="flex items-center gap-2 text-red-600 bg-red-50 p-2 rounded-lg border border-red-100">
                <AlertCircle size={14} />
                <span className="text-xs font-semibold uppercase tracking-tight">Are you sure?</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleClearAll}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white py-1.5 rounded-lg text-xs font-bold transition-colors"
                >
                  Yes, Clear
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-1.5 rounded-lg text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Sidebar;
