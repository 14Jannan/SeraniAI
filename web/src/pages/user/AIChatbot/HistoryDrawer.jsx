import React, { useState } from "react";
import { Trash2, AlertCircle, X, History, Plus } from "lucide-react";
import { deleteSession, clearHistory } from "../../../api/chatApi";
import { motion, AnimatePresence } from "framer-motion";

function HistoryDrawer({
  conversations,
  onOpenChat,
  onNewChat,
  activeSessionId,
  setConversations,
  setActiveSessionId,
  setMessages,
  isOpen,
  onClose
}) {
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    try {
      await deleteSession(id);
      setConversations((prev) => prev.filter((chat) => chat._id !== id));
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
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100]"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-4 bottom-4 right-4 w-[320px] bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-[40px] shadow-2xl border border-white/50 dark:border-gray-700/50 flex flex-col z-[101] overflow-hidden"
          >
            {/* Header */}
            <div className="p-8 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 dark:bg-blue-900/40 rounded-xl text-blue-600">
                  <History size={20} />
                </div>
                <div>
                    <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Chat History</h2>
                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-0.5">Your past conversations</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-all hover:scale-110"
              >
                <X size={20} />
              </button>
            </div>

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 scrollbar-hide">
              {conversations.length === 0 ? (
                <div className="text-center py-20">
                  <div className="bg-gray-50 dark:bg-gray-800/50 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-100 dark:border-gray-800">
                    <AlertCircle size={20} className="text-gray-300" />
                  </div>
                  <p className="text-gray-400 dark:text-gray-600 text-xs font-bold uppercase tracking-widest whitespace-nowrap">No history yet</p>
                </div>
              ) : (
                conversations.map((chat) => (
                  <motion.div
                    key={chat._id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => {
                      onOpenChat(chat._id);
                      onClose(); // Close on selection 
                    }}
                    className={`group flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all duration-300 border ${
                      activeSessionId === chat._id
                        ? "bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-900 shadow-xl shadow-blue-500/5 text-blue-600 dark:text-blue-400"
                        : "bg-transparent border-transparent hover:bg-white dark:hover:bg-white/5 hover:border-gray-100 dark:hover:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    <span className="truncate text-xs font-bold leading-none tracking-tight">
                      {chat.title || "Untitled Chat"}
                    </span>
                    <button
                      onClick={(e) => handleDelete(e, chat._id)}
                      className={`p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/40 hover:text-red-600 dark:hover:text-red-400 transition-all ${
                        activeSessionId === chat._id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      }`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-8 pt-4 space-y-4">
               {conversations.length > 0 && !showClearConfirm && (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="w-full flex items-center justify-center gap-2 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-red-500 bg-gray-50 dark:bg-gray-800/50 rounded-2xl transition-all"
                >
                  <Trash2 size={12} />
                  <span>Clear All</span>
                </button>
               )}

              {showClearConfirm && (
                <div className="space-y-3 animate-in fade-in zoom-in duration-300">
                  <button
                    onClick={handleClearAll}
                    className="w-full bg-red-600 text-white py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-xl shadow-red-500/20"
                  >
                    Confirm Clear All
                  </button>
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="w-full bg-gray-100 dark:bg-gray-800 text-gray-500 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default HistoryDrawer;
