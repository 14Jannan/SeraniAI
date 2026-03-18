import React, { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import { fetchHistory, fetchSession, sendMessage } from "../../../api/chatApi";
import { Sun, PanelLeftOpen, User } from "lucide-react";
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

  // Sidebar visibility
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Load history on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetchHistory();
        setConversations(res.data || []);
      } catch (e) {
        console.error("fetchHistory error:", e);
      }
    })();
  }, []);

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
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
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
  const sendToBackend = async (text) => {
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

      const res = await sendMessage(clean, activeSessionId);
      const { sessionId, reply } = res.data;

      // If it was a new chat, backend created sessionId
      if (!activeSessionId) setActiveSessionId(sessionId);

      // show assistant msg
      setMessages([...nextMessages, { role: "assistant", content: reply }]);

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
    <div className="flex h-[91vh]">
      {isSidebarOpen && (
        <Sidebar
          conversations={conversations}
          onOpenChat={openChatFromHistory}
          onNewChat={newChat}
          activeSessionId={activeSessionId}
          setConversations={setConversations}
          setActiveSessionId={setActiveSessionId}
          setMessages={setMessages}
          onToggleSidebar={toggleSidebar}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-white border-gray-200 text-black">
          <div className="flex items-center gap-3">
            {!isSidebarOpen && (
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 hover:text-green-600 transition-all border border-transparent hover:border-gray-100 active:scale-90"
                title="Open sidebar"
              >
                <PanelLeftOpen size={20} />
              </button>
            )}
            <SeraniAILogo />
            <span className="font-semibold text-lg">SeraniAI</span>
          </div>

          <div className="flex items-center gap-2">
            <Sun className="cursor-pointer" />
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <MessageList
            messages={messages}
            loading={loading}
            onEditMessage={handleEditMessage}
            onMoodSelect={handleMoodSelect}
          />
        </div>

        {/* Input */}
        <MessageInput
          onSend={sendToBackend}
          loading={loading}
          editValue={editingMessageContent}
          onCancelEdit={handleCancelEdit}
        />
      </div>
    </div>
  );
}

export default ChatInterface;
