import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  Book, 
  MessageSquare, 
  Plus, 
  Play, 
  ChevronRight, 
  TrendingUp, 
  PenTool, 
  GraduationCap,
  Calendar,
  Clock,
  ArrowUpRight,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';

const API_URL = "http://localhost:7001";

const DashboardHome = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [weeklyReport, setWeeklyReport] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_URL}/api/users/dashboard-stats`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data');
        }
        
        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const handleGenerateReport = async () => {
    try {
      setIsGeneratingReport(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/api/users/weekly-report`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate weekly report');
      }
      
      const result = await response.json();
      setWeeklyReport(result.report);
      setShowReportModal(true);
    } catch (err) {
      console.error("Report generation error:", err);
      alert("Failed to generate report. Please try again later.");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
          <p className="text-gray-500 font-medium animate-pulse">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-6 rounded-3xl flex items-center gap-4 text-red-700 dark:text-red-400">
          <AlertCircle size={24} />
          <div>
            <h3 className="font-bold">Error</h3>
            <p className="text-sm">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-2 text-xs font-bold uppercase tracking-wider underline underline-offset-4"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { userName, stats, recentActivity, journalTrends } = data;

  const statCards = [
    { label: 'Total Journals', value: stats.totalJournals, icon: PenTool, color: 'text-purple-600', bg: 'bg-purple-100', trend: 'Updated' },
    { label: 'Active Courses', value: stats.activeCourses, icon: GraduationCap, color: 'text-blue-600', bg: 'bg-blue-100', trend: 'In Progress' },
    { label: 'Completed Lessons', value: stats.completedLessons, icon: BookOpen, color: 'text-emerald-600', bg: 'bg-emerald-100', trend: 'Total Progress' },
    { label: 'AI Interactions', value: stats.aiInteractions, icon: MessageSquare, color: 'text-amber-600', bg: 'bg-amber-100', trend: 'Active Chat' },
  ];

  const quickActions = [
    { title: 'New Journal Entry', desc: 'Reflect on your day', icon: Plus, link: '/dashboard/journal', color: 'bg-purple-600' },
    { title: 'View Courses', desc: 'Continue learning', icon: Play, link: '/dashboard/courses', color: 'bg-emerald-600' },
    { title: 'Ask SeraniAI', desc: 'Get instant answers', icon: MessageSquare, link: '/dashboard/chat', color: 'bg-blue-600' },
  ];

  return (
    <div className="p-6 lg:p-10 space-y-10 max-w-[1600px] mx-auto overflow-y-auto h-full scrollbar-hide relative">
      
      {/* Welcome Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
            Welcome back, <span className="text-blue-600">{userName || 'User'}!</span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">
            Your personal productivity hub is ready.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white dark:bg-gray-800 p-2 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="bg-blue-50 dark:bg-blue-900/40 p-2 rounded-xl text-blue-600">
            <Calendar size={20} />
          </div>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 pr-4">
            {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:-translate-y-1 transition-all group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`${stat.bg} ${stat.color} p-3 rounded-2xl group-hover:scale-110 transition-transform`}>
                <stat.icon size={24} />
              </div>
              <TrendingUp className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" size={18} />
            </div>
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{stat.value}</h3>
            <p className="text-gray-500 dark:text-gray-400 font-medium text-sm mt-1">{stat.label}</p>
            <div className="mt-4 pt-4 border-t border-gray-50 dark:border-gray-700">
              <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold">{stat.trend}</span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* Left Column: Progress & Actions */}
        <div className="lg:col-span-2 space-y-10">
          
          {/* Productivity Graph */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-gray-800 p-8 rounded-[40px] shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden group"
          >
            <div className="flex justify-between items-center mb-10">
              <div>
                <h3 className="text-xl font-bold dark:text-white">Journal Activity</h3>
                <p className="text-sm text-gray-500 mt-1">Consistency over the last 7 days</p>
              </div>
              <div className="hidden sm:flex gap-2">
                {['M','T','W','T','F','S','S'].map((d, i) => (
                  <span key={i} className="text-[10px] font-bold text-gray-400">{d}</span>
                ))}
              </div>
            </div>

            {/* Simple SVG Chart */}
            <div className="h-48 w-full flex items-end justify-between gap-3 group/chart">
              {(() => {
                const maxVal = Math.max(...journalTrends, 5);
                const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                const today = new Date();
                
                return journalTrends.map((val, i) => {
                  const d = new Date();
                  d.setDate(today.getDate() - (6 - i));
                  const dayName = dayNames[d.getDay()];
                  
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-3">
                      <div 
                        className="w-full bg-blue-100 dark:bg-blue-900/30 rounded-full relative group-hover:opacity-50 hover:!opacity-100 transition-all duration-500 overflow-hidden"
                        style={{ height: `${Math.max((val / maxVal) * 100, 5)}%` }}
                      >
                        <motion.div 
                          initial={{ height: 0 }}
                          animate={{ height: '100%' }}
                          transition={{ delay: 0.5 + (i * 0.1), duration: 0.8 }}
                          className="absolute bottom-0 w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-full"
                        />
                      </div>
                      <span className="text-[10px] font-bold text-gray-400">{dayName}</span>
                    </div>
                  );
                });
              })()}
            </div>

            <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-10 transition-opacity">
              <ArrowUpRight size={100} className="text-blue-600" />
            </div>
          </motion.div>

          {/* Quick Actions */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <TrendingUp className="text-blue-600" size={18} />
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {quickActions.map((action, i) => (
                <Link to={action.link} key={action.title}>
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="p-5 flex items-center gap-4 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm hover:border-blue-200 dark:hover:border-blue-900 transition-all"
                  >
                    <div className={`${action.color} p-3 rounded-2xl text-white shadow-lg shadow-blue-500/20`}>
                      <action.icon size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold dark:text-white">{action.title}</h4>
                      <p className="text-[11px] text-gray-500 font-medium truncate">{action.desc}</p>
                    </div>
                    <ChevronRight className="ml-auto text-gray-300" size={16} />
                  </motion.div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Recent Activity */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white dark:bg-gray-800 p-8 rounded-[40px] shadow-sm border border-gray-100 dark:border-gray-700"
        >
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold dark:text-white">Recent Activity</h3>
            <Link to="/dashboard/journal" className="text-blue-600 hover:text-blue-700 text-xs font-bold uppercase tracking-widest">
              View All
            </Link>
          </div>

          <div className="space-y-6">
            {recentActivity.length === 0 ? (
                <div className="text-center py-10">
                    <p className="text-sm text-gray-400 font-medium tracking-tight">No recent activity found.</p>
                </div>
            ) : (
                recentActivity.map((item, i) => (
                    <div key={i} className="flex gap-4 group">
                        <div className="pt-1">
                        <div className={`p-2 rounded-xl bg-gray-50 dark:bg-gray-900 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 transition-colors`}>
                            {item.type === 'journal' ? (
                                <PenTool className="text-purple-500 group-hover:scale-110 transition-transform" size={18} />
                            ) : (
                                <MessageSquare className="text-blue-500 group-hover:scale-110 transition-transform" size={18} />
                            )}
                        </div>
                        </div>
                        <div className="flex-1 pb-6 border-b border-gray-50 dark:border-gray-700 last:border-0">
                        <div className="flex justify-between items-start">
                            <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 transition-colors">
                            {item.title}
                            </h4>
                            <span className="text-[10px] text-gray-400 font-bold whitespace-nowrap ml-2 uppercase">
                            {new Date(item.time).toLocaleDateString()}
                            </span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1 font-medium capitalize">
                            <Clock size={10} />
                            {item.type} interaction
                        </p>
                        </div>
                    </div>
                ))
            )}
          </div>

          <button 
            onClick={handleGenerateReport}
            disabled={isGeneratingReport}
            className="w-full mt-6 py-4 bg-gray-50 dark:bg-gray-900 rounded-2xl text-sm font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 group"
          >
            {isGeneratingReport ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span>Analyzing Week...</span>
              </>
            ) : (
              <>
                <TrendingUp className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span>Generate Weekly Report</span>
              </>
            )}
          </button>
        </motion.div>
      </div>

      {/* Weekly Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setShowReportModal(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-[40px] shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10">
              <div className="flex items-center gap-4">
                <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-xl shadow-blue-500/20">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold dark:text-white">Weekly Progress Report</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">AI Analysis & Insights</p>
                </div>
              </div>
              <button 
                onClick={() => setShowReportModal(false)}
                className="p-3 rounded-2xl bg-white dark:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 shadow-sm border border-gray-100 dark:border-gray-700 transition-all"
              >
                <Plus size={20} className="rotate-45" />
              </button>
            </div>

            {/* Content */}
            <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
              <div className="prose prose-blue dark:prose-invert max-w-none">
                <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                  {weeklyReport}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-8 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-4">
              <button 
                onClick={() => setShowReportModal(false)}
                className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-xl shadow-blue-500/20 hover:bg-blue-700 hover:-translate-y-0.5 transition-all"
              >
                Got it!
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
};

export default DashboardHome;