import React, { useState } from "react";
import { CalendarDays, User, Save } from "lucide-react";

const Journal = () => {
  const [title, setTitle] = useState("");
  const [entry, setEntry] = useState("");

  return (
    <div className="min-h-screen bg-slate-200 dark:bg-[#0F172A] flex transition-colors duration-300">

      {/* Main Content */}
      <main className="flex-1 p-10">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-semibold text-slate-700 dark:text-white">
            Journal
          </h2>

          <div className="flex items-center gap-4 text-indigo-500 dark:text-indigo-400">
            <CalendarDays className="cursor-pointer" />
            <User className="cursor-pointer" />
          </div>
        </div>

        {/* Journal Card */}
        <div className="max-w-3xl bg-white dark:bg-[#1E293B] rounded-2xl shadow-xl p-8 border border-slate-200 dark:border-slate-700 transition-colors duration-300">
          {/* Title Row */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
            <input
              type="text"
              placeholder="Entry Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-xl font-medium text-slate-700 dark:text-white bg-transparent outline-none w-full placeholder:text-slate-400"
            />
            <button className="ml-4 p-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition">
              <Save size={16} />
            </button>
          </div>

          {/* Date */}
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm mt-4 border-b border-slate-200 dark:border-slate-700 pb-3">
            <CalendarDays size={16} />
            <span>{new Date().toDateString()}</span>
          </div>

          {/* Entry Area */}
          <textarea
            placeholder="Your entry here"
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
            className="w-full mt-6 h-72 resize-none outline-none text-slate-600 dark:text-slate-300 bg-transparent placeholder:text-slate-400"
          />
        </div>
      </main>
    </div>
  );
};

export default Journal;
