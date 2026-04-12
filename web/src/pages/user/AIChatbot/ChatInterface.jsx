import React, { useEffect, useState } from "react";
import { History, Plus, User } from "lucide-react";
import { fetchHistory, fetchSession, sendMessage } from "../../../api/chatApi";
import HistoryDrawer from "./HistoryDrawer";
import SeraniAILogo from "./SeraniAILogo";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";

function ChatInterface() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  // Mongo sessions list (history)
  const [conversations, setConversations] = useState([]);

  // The currently opened MongoDB chat session id
  const [activeSessionId, setActiveSessionId] = useState(null);

  // Message Editing State
  const [editingMessageIndex, setEditingMessageIndex] = useState(null);
  const [editingMessageContent, setEditingMessageContent] = useState(null);

  // History Drawer state
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Load history and last active session on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetchHistory();
        setConversations(res.data || []);
        
        // Restore last active session if exists
        const lastSession = localStorage.getItem("lastActiveChatSessionId");
        if (lastSession) {
          openChatFromHistory(lastSession);
        }
      } catch (e) {
        console.error("fetchHistory error:", e);
      }
    })();
  }, []);

  // Persist session ID to localStorage
  useEffect(() => {
    if (activeSessionId) {
      localStorage.setItem("lastActiveChatSessionId", activeSessionId);
    }
  }, [activeSessionId]);

  // ✅ CLICK HISTORY ITEM: open that chat
  const openChatFromHistory = async (mongoId) => {
    try {
      setLoading(true);
      setActiveSessionId(mongoId);
      const res = await fetchSession(mongoId);
      setMessages(res.data?.messages || []);
      setEditingMessageIndex(null);
      setEditingMessageContent(null);
    } catch (e) {
      console.error("fetchSession error:", e);
    } finally {
      setLoading(false);
    }
  };

  // New chat: clear UI, create new session when first message sent
  const newChat = () => {
    setActiveSessionId(null);
    setMessages([]);
    setEditingMessageIndex(null);
    setEditingMessageContent(null);
    localStorage.removeItem("lastActiveChatSessionId");
  };

  const toggleHistory = () => {
    setIsHistoryOpen(!isHistoryOpen);
  };

  const handleEditMessage = (content, index) => {
    setEditingMessageIndex(index);
    setEditingMessageContent(content);
  };

  const handleCancelEdit = () => {
    setEditingMessageIndex(null);
    setEditingMessageContent(null);
  };

  const handleMoodSelect = (message) => {
    sendToBackend(message);
  };

  // Send message: handles normal send, mood send, and edits
  const sendToBackend = async (text, file = null) => {
    const clean = (text || "").trim();
    if (!clean) return;

    let updatedMessages = [...messages];

    // If editing, remove all messages after the edited message, and replace the edited message itself
    if (editingMessageIndex !== null) {
      // Logic: remove everything from the edited index onward
      updatedMessages = updatedMessages.slice(0, editingMessageIndex);
      // Then proceed as if sending a new message from that point
      setEditingMessageIndex(null);
      setEditingMessageContent(null);
    }

    // show user msg immediately
    const nextMessages = [...updatedMessages, { role: "user", content: clean }];
    setMessages(nextMessages);

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("message", clean);
      if (activeSessionId) formData.append("sessionId", activeSessionId);
      if (file) formData.append("file", file);
      if (editingMessageIndex !== null) formData.append("editIndex", editingMessageIndex);

      const res = await sendMessage(formData);
      const { sessionId, reply, userMessage, courses } = res.data;

      // If it was a new chat, backend created sessionId
      if (!activeSessionId) setActiveSessionId(sessionId);

      // show assistant msg and update user msg with file info
      const finalMessages = [...nextMessages];
      if (userMessage) {
        finalMessages[finalMessages.length - 1] = userMessage;
      }
      setMessages([...finalMessages, { role: "assistant", content: reply, courses: courses || [] }]);

      // refresh history list so sidebar updates
      const his = await fetchHistory();
      setConversations(his.data || []);
    } catch (e) {
      console.error("sendMessage error:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#f0f9ff] dark:bg-[#0F172A] p-4 lg:p-6 gap-4 lg:gap-6 transition-colors duration-500">
      {/* History Drawer - Floating Overlay */}
      <HistoryDrawer
        conversations={conversations}
        onOpenChat={openChatFromHistory}
        onNewChat={newChat}
        activeSessionId={activeSessionId}
        setConversations={setConversations}
        setActiveSessionId={setActiveSessionId}
        setMessages={setMessages}
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />

      {/* Main Chat Panel - Floating rounded card */}
      <div className="flex-1 flex flex-col bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-[40px] shadow-2xl border border-white/50 dark:border-gray-700/50 overflow-hidden relative transition-all duration-500">
        
        {/* Modern Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 dark:border-white/5 bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm z-10 transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <SeraniAILogo size={24} color="#ffffff" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white text-lg tracking-tight">SeraniAI</h2>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Active</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <button
              onClick={toggleHistory}
              className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all flex items-center gap-2"
             >
                <History size={14} />
                <span>History</span>
             </button>

             <button
              onClick={newChat}
              className="px-4 py-2 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors capitalize tracking-wide"
             >
               + New Conversation
             </button>
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-hidden relative">
          <MessageList
            messages={messages}
            loading={loading}
            onEditMessage={handleEditMessage}
            onMoodSelect={handleMoodSelect}
          />
        </div>

        {/* Input Area */}
        <div className="p-6 pt-0">
          <MessageInput
            onSend={sendToBackend}
            loading={loading}
            editValue={editingMessageContent}
            onCancelEdit={handleCancelEdit}
          />
        </div>
      </div>
    </div>
  );
}

export default ChatInterface;
