import React, { useEffect, useRef, useState } from "react";
import SeraniAILogo from "./SeraniAILogo";
import { User, Copy, Check, Edit, FileText, Download, PlayCircle, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

function MessageList({ messages = [], loading = false, onEditMessage = null, onMoodSelect = null }) {
  const bottomRef = useRef(null);
  const navigate = useNavigate();
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
    { emoji: "😊", label: "Happy", color: "from-yellow-400/20 to-orange-400/20", iconColor: "text-orange-500", message: "I'm feeling happy today! Let's talk about something positive." },
    { emoji: "😢", label: "Sad", color: "from-blue-400/20 to-indigo-400/20", iconColor: "text-blue-500", message: "I'm feeling a bit down. Can we talk?" },
    { emoji: "🤩", label: "Excited", color: "from-orange-400/20 to-red-400/20", iconColor: "text-orange-600", message: "I'm so excited! I have something to share!" },
    { emoji: "😰", label: "Stressed", color: "from-red-400/20 to-rose-400/20", iconColor: "text-red-500", message: "I'm feeling stressed. I could use some advice." },
    { emoji: "🤔", label: "Curious", color: "from-purple-400/20 to-blue-400/20", iconColor: "text-purple-500", message: "I'm curious and want to learn something new!" },
    { emoji: "💭", label: "Thoughtful", color: "from-indigo-400/20 to-purple-400/20", iconColor: "text-indigo-500", message: "I'm in a reflective mood. Let's have a deep conversation." },
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
          return <mark key={key} className="bg-yellow-200 dark:bg-yellow-800/50 dark:text-yellow-100 rounded px-1">{part.slice(2, -2)}</mark>;
        }
        if (part.startsWith('**') && part.endsWith('**')) {
          return <span key={key} className="font-bold text-gray-800 dark:text-gray-100">{part.slice(2, -2)}</span>;
        }
        if (part.startsWith('*') && part.endsWith('*')) {
          return <em key={key} className="italic text-gray-700 dark:text-gray-300">{part.slice(1, -1)}</em>;
        }
        if (part.startsWith('##') && part.endsWith('##')) {
          return <span key={key} className="text-lg font-bold text-blue-600 dark:text-blue-400 mx-1">{part.slice(2, -2)}</span>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return <code key={key} className="bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded font-mono text-sm">{part.slice(1, -1)}</code>;
        }
        return <span key={key}>{part}</span>;
      });
    };

    const flushBlock = (key) => {
      if (currentBlock.length > 0) {
        if (blockType === 'ul') {
          renderedElements.push(<ul key={`ul-${key}`} className="list-disc ml-6 my-2 flex flex-col gap-1.5">{currentBlock}</ul>);
        } else if (blockType === 'ol') {
          renderedElements.push(<ol key={`ol-${key}`} className="list-decimal ml-6 my-2 flex flex-col gap-1.5">{currentBlock}</ol>);
        } else if (blockType === 'code') {
          renderedElements.push(
            <div key={`code-${key}`} className="my-4 rounded-3xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-900/50">
              <div className="bg-gray-50 dark:bg-gray-900 px-5 py-3 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest">{language || 'code'}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(currentBlock.join('\n'))}
                  className="text-[10px] text-blue-600 font-bold uppercase tracking-widest hover:text-blue-700 transition-all"
                >
                  Copy
                </button>
              </div>
              <pre className="p-5 overflow-x-auto">
                <code className="text-[13px] font-mono text-gray-800 dark:text-gray-200 leading-relaxed block whitespace-pre">
                  {currentBlock.join('\n')}
                </code>
              </pre>
            </div>
          );
        } else if (blockType === 'table') {
          const rows = currentBlock.filter(row => !row.match(/^[\s|:-]+$/));
          renderedElements.push(
            <div key={`table-${key}`} className="my-4 overflow-x-auto rounded-[32px] border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-900/50">
              <table className="w-full text-[13px] text-left border-collapse">
                <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
                  <tr>
                    {rows[0].split('|').filter(c => c.trim() !== '').map((cell, i) => (
                      <th key={i} className="px-5 py-4 font-black text-gray-400 uppercase text-[10px] tracking-widest">
                        {processText(cell.trim(), `head-${i}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                  {rows.slice(1).map((row, i) => (
                    <tr key={i} className="hover:bg-blue-50/10 dark:hover:bg-blue-900/10 transition-colors">
                      {row.split('|').filter(c => c.trim() !== '').map((cell, j) => (
                        <td key={j} className="px-5 py-4 text-gray-600 dark:text-gray-300">{processText(cell.trim(), `cell-${i}-${j}`)}</td>
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
        renderedElements.push(<div key={`div-${i}`} className="mb-2 leading-relaxed text-gray-700 dark:text-gray-300 font-medium">{processText(line, `div-text-${i}`)}</div>);
      }
      i++;
    }

    flushBlock('final');
    return renderedElements;
  };

  if (messages.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center p-8 lg:p-12 overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-4xl w-full text-center"
        >
          <div className="mb-12">
            <h2 className="text-4xl font-black text-gray-900 dark:text-white mb-4 tracking-tight">
              Hello! How are you feeling <span className="text-blue-600">today?</span>
            </h2>
            <p className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-xs">
              Select your mood to start our session
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {moods.map((mood, idx) => (
              <motion.button
                key={mood.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                onClick={() => onMoodSelect && onMoodSelect(mood.message)}
                className={`group relative p-8 bg-white dark:bg-gray-800/40 rounded-[32px] border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-900 shadow-sm hover:shadow-2xl transition-all duration-500 flex flex-col items-center gap-4 overflow-hidden`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${mood.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <span className="text-5xl group-hover:scale-125 transition-transform duration-500 relative z-10">
                  {mood.emoji}
                </span>
                <span className={`text-[10px] font-black uppercase tracking-[0.2em] relative z-10 ${mood.iconColor}`}>
                  {mood.label}
                </span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-6 py-6 lg:px-12 lg:py-10 scrollbar-hide">
      <div className="max-w-5xl mx-auto space-y-10">
        <AnimatePresence mode="popLayout">
          {messages
            .filter(msg => msg.role !== "tool" && !(msg.role === "assistant" && msg.tool_calls && !msg.content))
            .map((msg, index) => {
              const isUser = msg.role === "user";

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div
                  className={`flex gap-4 ${isUser ? "flex-row-reverse" : "flex-row"
                    } max-w-[90%] lg:max-w-[80%] items-end`}
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 flex-shrink-0 mb-1">
                    {isUser ? (
                      <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center shadow-lg border border-gray-100 dark:border-gray-700">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/20">
                        <SeraniAILogo size={20} color="#ffffff" />
                      </div>
                    )}
                  </div>

                  {/* Message bubble and actions */}
                  <div className={`flex flex-col gap-2 ${isUser ? "items-end" : "items-start"}`}>
                    {/* Bubble */}
                    <div
                      className={`px-6 py-4 rounded-[32px] shadow-sm text-[15px] leading-relaxed break-words relative transition-all duration-300 ${isUser
                        ? "bg-blue-600 text-white rounded-br-none shadow-blue-500/10"
                        : "bg-white/80 dark:bg-gray-900/80 backdrop-blur-md text-gray-800 dark:text-gray-100 border border-white dark:border-gray-800 rounded-bl-none"
                        }`}
                    >
                      {msg.fileUrl && (
                        <div className="mb-4 p-3 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="p-2.5 bg-blue-500/20 rounded-xl text-white">
                              <FileText size={18} />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-bold truncate">
                                {msg.fileUrl.split("/").pop().split("-").slice(1).join("-") || "Document"}
                              </span>
                              <span className="text-[10px] opacity-70 font-bold uppercase tracking-widest">
                                {msg.fileType?.split("/")[1] || "File"}
                              </span>
                            </div>
                          </div>
                          <a
                            href={`http://localhost:7001${msg.fileUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-all"
                          >
                            <Download size={14} />
                          </a>
                        </div>
                      )}
                      {renderMessageContent(msg.content)}

                      {/* Course Suggestions Card */}
                      {msg.courses && msg.courses.length > 0 && (
                        <div className="mt-8 flex flex-col gap-4">
                           <div className="h-[1px] w-full bg-black/5 dark:bg-white/5" />
                          <div className="flex items-center gap-2">
                             <Sparkles size={14} className="text-blue-400" />
                             <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Recommendations</p>
                          </div>
                          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                            {msg.courses.map((course) => (
                              <motion.div 
                                key={course.id}
                                whileHover={{ y: -5 }}
                                className="min-w-[280px] max-w-[280px] bg-white dark:bg-gray-800 rounded-[32px] overflow-hidden border border-gray-100 dark:border-gray-700 shadow-xl flex flex-col group/card transition-all duration-300"
                              >
                                <div className="relative h-36 overflow-hidden">
                                  {course.thumbnailUrl ? (
                                    <img 
                                      src={course.thumbnailUrl.startsWith('http') ? course.thumbnailUrl : `http://localhost:7001${course.thumbnailUrl}`} 
                                      alt={course.title}
                                      className="w-full h-full object-cover group-hover/card:scale-110 transition-transform duration-700"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-400">
                                      <PlayCircle size={48} strokeWidth={1} />
                                    </div>
                                  )}
                                  <div className="absolute top-4 right-4 px-3 py-1 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg">
                                    {course.category}
                                  </div>
                                </div>
                                <div className="p-5 flex flex-col gap-2 flex-grow">
                                  <h4 className="font-black text-sm text-gray-900 dark:text-gray-100 line-clamp-1">{course.title}</h4>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 font-medium">
                                    {course.description}
                                  </p>
                                  <button
                                    onClick={() => navigate(`/dashboard/course/${course.id}`)}
                                    className="mt-4 w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-blue-500/20 active:scale-95"
                                  >
                                    Explore Course
                                  </button>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action buttons - show on hover */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: hoveredIndex === index ? 1 : 0 }}
                      className={`flex gap-3 px-2 transition-all ${isUser ? "justify-end" : "justify-start"}`}
                    >
                      <button
                        onClick={() => handleCopy(msg.content, index)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Copy message"
                      >
                        {copiedIndex === index ? (
                          <Check size={14} className="text-emerald-500" />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
                      {isUser && onEditMessage && (
                        <button
                          onClick={() => handleEdit(msg.content, index)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Edit message"
                        >
                          <Edit size={14} />
                        </button>
                      )}
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Loading bubble */}
        {loading && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 flex justify-start"
          >
            <div className="flex gap-4 items-end">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <SeraniAILogo size={20} color="#ffffff" />
              </div>

              <div className="px-6 py-4 rounded-[32px] bg-white/80 dark:bg-gray-900/80 rounded-bl-none border border-white dark:border-gray-800 shadow-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" />
                  <div
                    className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  />
                  <div
                    className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce"
                    style={{ animationDelay: "0.4s" }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} className="h-10" />
      </div>
    </div>
  );
}

export default MessageList;
