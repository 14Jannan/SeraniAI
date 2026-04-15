import React, { useEffect, useRef, useState } from "react";
import SeraniAILogo from "./SeraniAILogo";
import { User, Copy, Check, Edit } from "lucide-react";

function MessageList({ messages = [], loading = false, onEditMessage = null, onMoodSelect = null }) {
  const bottomRef = useRef(null);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleCopy = (content, index) => {
    navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleEdit = (content, index) => {
    if (onEditMessage) {
      onEditMessage(content, index);
    }
  };

  const moods = [
    { emoji: "😊", label: "Happy", color: "hover:border-yellow-400 hover:text-yellow-600", message: "I'm feeling happy today! Let's talk about something positive." },
    { emoji: "😢", label: "Sad", color: "hover:border-blue-400 hover:text-blue-600", message: "I'm feeling a bit down. Can we talk?" },
    { emoji: "🤩", label: "Excited", color: "hover:border-orange-400 hover:text-orange-600", message: "I'm so excited! I have something to share!" },
    { emoji: "😰", label: "Stressed", color: "hover:border-red-400 hover:text-red-600", message: "I'm feeling stressed. I could use some advice." },
    { emoji: "🤔", label: "Curious", color: "hover:border-purple-400 hover:text-purple-600", message: "I'm curious and want to learn something new!" },
    { emoji: "💭", label: "Thoughtful", color: "hover:border-indigo-400 hover:text-indigo-600", message: "I'm in a reflective mood. Let's have a deep conversation." },
  ];

  const renderMessageContent = (content) => {
    if (!content) return null;

    const lines = content.split('\n');
    let currentBlock = [];
    let blockType = null; // 'ul', 'ol', 'code', 'table'
    let language = '';
    const renderedElements = [];

    const processText = (text, keyPrefix) => {
      if (!text) return null;
      const parts = text.split(/(==.*?==|\*\*.*?\*\*|##.*?##|\*.*?\*|`.*?`)/g);
      return parts.map((part, i) => {
        const key = `${keyPrefix}-${i}`;
        if (part.startsWith('==') && part.endsWith('==')) {
          return <mark key={key} className="bg-yellow-200 rounded px-1">{part.slice(2, -2)}</mark>;
        }
        if (part.startsWith('**') && part.endsWith('**')) {
          return <span key={key} className="font-medium text-gray-700 italic">{part.slice(2, -2)}</span>;
        }
        if (part.startsWith('*') && part.endsWith('*')) {
          return <strong key={key} className="font-bold text-gray-900">{part.slice(1, -1)}</strong>;
        }
        if (part.startsWith('##') && part.endsWith('##')) {
          return <span key={key} className="text-xl font-bold text-blue-700 mx-1 align-middle">{part.slice(2, -2)}</span>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return <code key={key} className="bg-gray-200 text-red-600 px-1.5 py-0.5 rounded font-mono text-sm">{part.slice(1, -1)}</code>;
        }
        return <span key={key}>{part}</span>;
      });
    };

    const flushBlock = (key) => {
      if (currentBlock.length > 0) {
        if (blockType === 'ul') {
          renderedElements.push(<ul key={`ul-${key}`} className="list-disc ml-6 my-2 flex flex-col gap-1">{currentBlock}</ul>);
        } else if (blockType === 'ol') {
          renderedElements.push(<ol key={`ol-${key}`} className="list-decimal ml-6 my-2 flex flex-col gap-1">{currentBlock}</ol>);
        } else if (blockType === 'code') {
          renderedElements.push(
            <div key={`code-${key}`} className="my-4 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
              <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-gray-50 to-gray-100">
                <span className="text-xs text-gray-500 uppercase font-bold tracking-tight">{language || 'code'}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(currentBlock.join('\n'))}
                  className="text-xs text-blue-600 hover:text-blue-700 font-semibold transition-all hover:scale-105"
                >
                  Copy
                </button>
              </div>
              <pre className="bg-gray-50/50 p-4 overflow-x-auto backdrop-blur-sm">
                <code className="text-[13px] font-mono text-gray-800 leading-relaxed block whitespace-pre">
                  {currentBlock.join('\n')}
                </code>
              </pre>
            </div>
          );
        } else if (blockType === 'table') {
          const rows = currentBlock.filter(row => !row.match(/^[\s|:-]+$/));
          renderedElements.push(
            <div key={`table-${key}`} className="my-4 overflow-x-auto rounded-xl border border-gray-100 shadow-md">
              <table className="w-full text-[14px] text-left text-gray-600 border-collapse">
                <thead className="bg-gray-50/80 backdrop-blur-sm border-b border-gray-100">
                  <tr>
                    {rows[0].split('|').filter(c => c.trim() !== '').map((cell, i) => (
                      <th key={i} className="px-5 py-4 font-bold text-gray-800 uppercase text-xs tracking-wider">
                        {processText(cell.trim(), `head-${i}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rows.slice(1).map((row, i) => (
                    <tr key={i} className="hover:bg-blue-50/20 transition-colors duration-150">
                      {row.split('|').filter(c => c.trim() !== '').map((cell, j) => (
                        <td key={j} className="px-5 py-4 text-gray-600 leading-relaxed">{processText(cell.trim(), `cell-${i}-${j}`)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        currentBlock = [];
        blockType = null;
        language = '';
      }
    };

    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      const trimmedLine = line.trim();

      if (trimmedLine.startsWith('```')) {
        flushBlock(i);
        blockType = 'code';
        language = trimmedLine.slice(3).trim();
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          currentBlock.push(lines[i]);
          i++;
        }
        flushBlock(i);
        i++;
        continue;
      }

      if (trimmedLine.startsWith('|') && trimmedLine.endsWith('|')) {
        if (blockType !== 'table') {
          flushBlock(i);
          blockType = 'table';
        }
        currentBlock.push(line);
        i++;
        continue;
      }

      const bulletMatch = line.match(/^(\s*)([-*])\s+(.*)/);
      const numberMatch = line.match(/^(\s*)(\d+[\.\)])\s+(.*)/);

      if (bulletMatch) {
        if (blockType !== 'ul') flushBlock(i);
        blockType = 'ul';
        currentBlock.push(<li key={`li-${i}`} className="pl-1 mb-1">{processText(bulletMatch[3], `li-text-${i}`)}</li>);
        i++;
        continue;
      }

      if (numberMatch) {
        if (blockType !== 'ol') flushBlock(i);
        blockType = 'ol';
        currentBlock.push(<li key={`li-${i}`} className="pl-1 mb-1">{processText(numberMatch[3], `li-text-${i}`)}</li>);
        i++;
        continue;
      }

      flushBlock(i);
      if (trimmedLine === '') {
        renderedElements.push(<div key={`br-${i}`} className="h-4" />);
      } else {
        renderedElements.push(<div key={`div-${i}`} className="mb-2 leading-relaxed text-gray-700">{processText(line, `div-text-${i}`)}</div>);
      }
      i++;
    }

    flushBlock('final');
    return renderedElements;
  };

  // ==========================
  // WELCOME SCREEN WITH MOODS
  // ==========================
  if (messages.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-white p-8">
        <div className="max-w-3xl w-full">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-semibold text-gray-800 mb-2">
              How are you feeling today?
            </h2>
            <p className="text-gray-600">
              Select your mood to start a conversation
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {moods.map((mood) => (
              <button
                key={mood.label}
                onClick={() => onMoodSelect && onMoodSelect(mood.message)}
                className={`group p-4 bg-white border border-gray-200 rounded-xl hover:shadow-lg transition-all duration-300 flex flex-col items-center gap-2 hover:-translate-y-1 ${mood.color}`}
              >
                <span className="text-3xl group-hover:scale-125 transition-transform duration-300">
                  {mood.emoji}
                </span>
                <span className="text-sm font-medium text-gray-600 transition-colors duration-300">
                  {mood.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-white scrollbar-thin scrollbar-thumb-gray-200">
      <div className="max-w-5xl mx-auto px-10 py-8">
        {messages.map((msg, index) => {
          const isUser = msg.role === "user";

          return (
            <div
              key={index}
              className={`mb-8 flex ${isUser ? "justify-end" : "justify-start"}`}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div
                className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"
                  } max-w-[85%]`}
              >
                {/* Avatar */}
                <div className="w-9 h-9 flex-shrink-0 mt-1">
                  {isUser ? (
                    <div className="w-9 h-9 bg-blue-500 rounded-full flex items-center justify-center shadow-md">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  ) : (
                    <div className="w-9 h-9 bg-green-500 rounded-full flex items-center justify-center shadow-md">
                      <SeraniAILogo size={16} color="#ffffff" />
                    </div>
                  )}
                </div>

                {/* Message bubble and actions */}
                <div className="flex flex-col gap-1 w-full">
                  {/* Bubble */}
                  <div
                    className={`px-5 py-3 rounded-2xl shadow-sm text-[15px] leading-relaxed break-words ${isUser
                      ? "bg-blue-100 text-gray-900 rounded-br-sm"
                      : "bg-gray-100 text-gray-900 rounded-bl-sm"
                      } w-full`}
                  >
                    {renderMessageContent(msg.content)}
                  </div>

                  {/* Action buttons - show on hover */}
                  <div
                    className={`flex gap-2 h-7 ${isUser ? "justify-end" : "justify-start"} transition-opacity duration-200 ${hoveredIndex === index ? "opacity-100" : "opacity-0"
                      }`}
                  >
                    <button
                      onClick={() => handleCopy(msg.content, index)}
                      className="p-1.5 rounded hover:bg-gray-200 transition-colors"
                      title="Copy message"
                    >
                      {copiedIndex === index ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-600" />
                      )}
                    </button>
                    {/* Edit button - only show for user messages */}
                    {isUser && onEditMessage && (
                      <button
                        onClick={() => handleEdit(msg.content, index)}
                        className="p-1.5 rounded hover:bg-gray-200 transition-colors"
                        title="Edit message"
                      >
                        <Edit className="w-4 h-4 text-gray-600" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading bubble */}
        {loading && (
          <div className="mb-8 flex justify-start">
            <div className="flex gap-3 max-w-[65%]">
              <div className="w-9 h-9 bg-green-500 rounded-full flex items-center justify-center shadow-md">
                <SeraniAILogo size={16} color="#ffffff" />
              </div>

              <div className="px-5 py-3 rounded-2xl bg-gray-100 shadow-sm rounded-bl-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  />
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.4s" }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} className="h-4" />
      </div>
    </div>
  );
}

export default MessageList;
