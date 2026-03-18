import React from 'react';
import { FiCalendar, FiUser, FiPaperclip, FiArrowUp, FiSave } from 'react-icons/fi';

const DashboardHome = () => {
  return (
    <div className="h-full flex flex-col relative">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-normal text-gray-800 dark:text-gray-200">Home</h1>
        <div className="flex gap-4">
          <button className="p-2 text-blue-500 hover:bg-blue-100 rounded-full transition dark:hover:bg-gray-800">
            <FiCalendar size={24} />
          </button>
          <button className="p-2 text-blue-600 hover:bg-blue-100 rounded-full transition dark:hover:bg-gray-800">
            <FiUser size={24} />
          </button>
        </div>
      </div>

      {/* Main Content - Two Columns */}
      <div className="flex flex-1 gap-8">
        
        {/* Left Column: Journal/Entry Card */}
        <div className="w-full md:w-2/3">
          <div className="bg-white dark:bg-white/5 rounded-xl shadow-sm p-8 h-full min-h-[500px] border border-transparent dark:border-gray-700">
            
            {/* Title Input */}
            <div className="flex justify-between items-center border-b border-gray-300 dark:border-gray-600 pb-2 mb-4">
              <input 
                type="text" 
                placeholder="Entry Title" 
                className="text-4xl font-light bg-transparent outline-none text-gray-400 placeholder-gray-400 w-full"
              />
              <button className="text-purple-500 hover:text-purple-600 transition">
                <FiSave size={28} />
              </button>
            </div>

            {/* Date Display */}
            <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400 mb-6">
              <div className="bg-blue-500 text-white p-1 rounded">
                <FiCalendar size={16} />
              </div>
              <span className="text-lg">Sat. 12/20/2025</span>
            </div>

            {/* Text Area */}
            <textarea 
              className="w-full h-full bg-transparent resize-none outline-none text-gray-600 dark:text-gray-300 text-xl font-light placeholder-gray-300"
              placeholder="Your entry here"
            ></textarea>
          </div>
        </div>

        {/* Right Column: Empty space (as per design) or Widgets */}
        <div className="hidden md:block md:w-1/3">
           {/* Empty for now to match PDF spacious look */}
        </div>
      </div>

      {/* Bottom Right: Ask Anything Bar */}
      <div className="absolute bottom-6 right-0 w-full md:w-1/3">
        <div className="bg-blue-50 dark:bg-gray-100 rounded-2xl p-2 flex items-center shadow-md border border-blue-100">
          <input 
            type="text" 
            placeholder="Ask anything" 
            className="flex-1 bg-transparent px-4 py-2 outline-none text-gray-700 placeholder-gray-500"
          />
          <div className="flex gap-2 text-gray-500">
            <button className="p-2 hover:bg-gray-200 rounded-full transition"><FiPaperclip /></button>
            <button className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"><FiArrowUp /></button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;