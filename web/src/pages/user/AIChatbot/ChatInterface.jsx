import React, { useEffect, useState } from "react";
import { History, Plus, BarChart2 } from "lucide-react";
import { fetchHistory, fetchSession, sendMessage } from "../../../api/chatApi";
import HistoryDrawer from "./HistoryDrawer";
import SeraniAILogo from "./SeraniAILogo";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import OnboardingForm from "./OnboardingForm";
import AnalyzePanel from "./AnalyzePanel";
import { useTheme } from "../../../context/ThemeContext";

function ChatInterface() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

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

  // Analyze panel state
  const [isAnalyzeOpen, setIsAnalyzeOpen] = useState(false);

  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Load history and last active session on mount
  useEffect(() => {
    (async () => {
      try {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        const premiumRoles = ["enterpriseUser", "enterpriseAdmin"];
        if (premiumRoles.includes(user.role) && user.onboardingStatus !== "completed") {
          setShowOnboarding(true);
        }

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
      formData.append("localDate", new Date().toDateString());
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
    <div
      className={`flex h-full w-full overflow-hidden p-4 lg:p-6 gap-4 lg:gap-6 transition-colors duration-500 ${
        isDark
          ? "bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.16),_transparent_34%),linear-gradient(180deg,_#07111f_0%,_#040816_100%)]"
          : "bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.14),_transparent_34%),linear-gradient(180deg,_#f8fbff_0%,_#eef4ff_100%)]"
      }`}
    >
      {showOnboarding && <OnboardingForm onComplete={() => setShowOnboarding(false)} />}
      
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
      <div className="flex-1 min-w-0 flex flex-col bg-white/95 dark:bg-[#0b1322]/95 backdrop-blur-xl rounded-[28px] shadow-[0_35px_75px_-45px_rgba(15,23,42,0.45)] border border-slate-200/70 dark:border-white/10 overflow-hidden relative transition-all duration-500">
        
        {/* Modern Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-200/70 dark:border-white/10 bg-white/95 dark:bg-[#0b1322]/95 backdrop-blur-sm z-10 transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
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
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-200 bg-slate-100 dark:bg-white/5 rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 transition-all flex items-center gap-2"
             >
                <History size={14} />
                <span>History</span>
             </button>
             <button
              onClick={() => setIsAnalyzeOpen(!isAnalyzeOpen)}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
                isAnalyzeOpen
                  ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg shadow-blue-500/20"
                  : "text-slate-600 dark:text-slate-200 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10"
              }`}
             >
                <BarChart2 size={14} />
                <span>Analyze</span>
             </button>
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-hidden relative">
          <MessageList
            messages={messages}
            loading={loading}
            onEditMessage={handleEditMessage}
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

      {/* Analyze Panel */}
      <AnalyzePanel isOpen={isAnalyzeOpen} onClose={() => setIsAnalyzeOpen(false)} />
    </div>
  );
}

export default ChatInterface;
