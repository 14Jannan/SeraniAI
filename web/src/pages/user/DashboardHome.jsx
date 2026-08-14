import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Loader2,
  CheckCircle,
  Download,
  Heart,
  X,
  Sparkles,
  Info,
  BarChart2,
  PieChart
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { getStoredToken } from "../../utils/authStorage";
import notify from "../../utils/notifications";
import { API_BASE_URL } from "../../utils/apiBaseUrl";

const API_URL = API_BASE_URL;

const DashboardHome = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [weeklyReport, setWeeklyReport] = useState(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  
  const [activeTab, setActiveTab] = useState('journal');
  const [chartType, setChartType] = useState('bar');

  const [dismissedItems, setDismissedItems] = useState([]);
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [showWellnessModal, setShowWellnessModal] = useState(false);
  const [journalContent, setJournalContent] = useState("");
  const [isSavingJournal, setIsSavingJournal] = useState(false);
  const [selectedMood, setSelectedMood] = useState(null);
  const [isSavingMood, setIsSavingMood] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('serani_dismissed_recommendations') || '[]');
    const valid = stored.filter(item => {
      const diff = new Date() - new Date(item.timestamp);
      return diff < 24 * 60 * 60 * 1000;
    });
    setDismissedItems(valid.map(v => v.id));
    if (stored.length !== valid.length) {
      localStorage.setItem('serani_dismissed_recommendations', JSON.stringify(valid));
    }
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const token = getStoredToken();
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

  const handleDownloadReport = async () => {
    if (!weeklyReport) return;

    // Loaded on demand - jsPDF (and its optional html2canvas dependency)
    // is ~250kB and only ever needed when the user actually clicks
    // "download report", not on every dashboard page load.
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const title = "Weekly Progress Report - SeraniAI";

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(37, 99, 235); // Blue-600
    doc.text(title, margin, 25);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128); // Gray-500
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, margin, 35);

    // Divider
    doc.setDrawColor(229, 231, 235); // Gray-200
    doc.line(margin, 40, pageWidth - margin, 40);

    // Content
    doc.setFontSize(11);
    doc.setTextColor(55, 65, 81); // Gray-700
    doc.setLineHeightFactor(1.5);

    const splitText = doc.splitTextToSize(weeklyReport, pageWidth - (margin * 2));
    let cursorY = 50;
    const lineHeight = 7; // Approximate line height for font size 11

    splitText.forEach((line) => {
      if (cursorY > pageHeight - 30) {
        doc.addPage();
        cursorY = 20; // Reset cursor on new page
      }

      // Handle bold formatting in PDF
      if (line.includes('**')) {
        const parts = line.split(/(\*\*.*?\*\*)/g);
        let currentX = margin;

        parts.forEach((part) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            doc.setFont("helvetica", "bold");
            doc.setTextColor(37, 99, 235); // Blue-600 for emphasis
            const cleanPart = part.slice(2, -2);
            doc.text(cleanPart, currentX, cursorY);
            currentX += doc.getTextWidth(cleanPart);
          } else {
            doc.setFont("helvetica", "normal");
            doc.setTextColor(55, 65, 81); // Gray-700
            doc.text(part, currentX, cursorY);
            currentX += doc.getTextWidth(part);
          }
        });
      } else {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(55, 65, 81);
        doc.text(line, margin, cursorY);
      }

      cursorY += lineHeight;
    });

    // Footer - Add to all pages
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175); // Gray-400
      doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      doc.text("SeraniAI - Your Personal Growth Companion", margin, pageHeight - 10);
    }

    doc.save(`SeraniAI_Weekly_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleGenerateReport = async () => {
    try {
      setIsGeneratingReport(true);
      const token = getStoredToken();
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
      notify.success("Report Generated", "Your weekly progress report is ready for viewing.");
    } catch (err) {
      console.error("Report generation error:", err);
      notify.error("Report Generation Failed", "Failed to generate weekly report. Please try again later.");
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

  const { userName, stats, recentActivity, recentLessons = [], journalTrends, chatTrends, courseTrends, recommendations = [], completionStatus } = data;

  const handleDismiss = (id) => {
    const newDismissed = [...dismissedItems, id];
    setDismissedItems(newDismissed);
    
    const stored = JSON.parse(localStorage.getItem('serani_dismissed_recommendations') || '[]');
    stored.push({ id, timestamp: new Date().toISOString() });
    localStorage.setItem('serani_dismissed_recommendations', JSON.stringify(stored));
  };

  const activeRecommendations = recommendations.filter(r => !dismissedItems.includes(r.id));

  const statCards = [
    { label: 'Total Journals', value: stats.totalJournals, icon: PenTool, color: 'text-purple-600', bg: 'bg-green-100', trend: 'Updated' },
    { label: 'Daily Tasks', value: stats.dailyTasks, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100', trend: 'Today' },
    { label: 'Completed Lessons', value: stats.completedLessons, icon: BookOpen, color: 'text-emerald-600', bg: 'bg-emerald-100', trend: 'Total Progress' },
    { label: 'AI Interactions', value: stats.aiInteractions, icon: MessageSquare, color: 'text-amber-600', bg: 'bg-amber-100', trend: 'Active Chat' },
  ];

  const handleSaveJournal = async () => {
    try {
      setIsSavingJournal(true);
      const token = getStoredToken();
      const response = await fetch(`${API_URL}/api/journals`, {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          title: "Quick Reflection",
          content: journalContent,
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save journal entry');
      }

      setJournalContent("");
      setShowJournalModal(false);
      notify.success("Journal Saved", "Your quick reflection has been recorded.");
      // Refresh dashboard stats
      window.location.reload();
    } catch (err) {
      console.error("Journal save error:", err);
      notify.error("Save Failed", "Failed to save journal entry. Please try again later.");
    } finally {
      setIsSavingJournal(false);
    }
  };

  const handleSaveMood = async () => {
    try {
      setIsSavingMood(true);
      const token = getStoredToken();
      
      // Map emoji to mood string
      const moodMap = {
        '😢': 'sad',
        '😐': 'neutral', 
        '🙂': 'happy',
        '😁': 'excited'
      };
      
      const moodString = moodMap[selectedMood] || 'neutral';
      
      const response = await fetch(`${API_URL}/api/journals`, {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          title: "Mood Check",
          content: `Feeling ${moodString} ${selectedMood}`,
          mood: moodString
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save mood');
      }

      setSelectedMood(null);
      setShowWellnessModal(false);
      notify.success("Mood Logged", `Logged your mood as ${moodString}.`);
      // Refresh dashboard stats
      window.location.reload();
    } catch (err) {
      console.error("Mood save error:", err);
      notify.error("Mood Error", "Failed to save mood. Please try again later.");
    } finally {
      setIsSavingMood(false);
    }
  };


  // Quick Actions removed in favor of Recommendations

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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
              <div>
                <h3 className="text-xl font-bold dark:text-white">Activity Trends</h3>
                <p className="text-sm text-gray-500 mt-1">Your consistency over the last 7 days</p>
              </div>
              
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 p-1.5 rounded-2xl border border-gray-100 dark:border-gray-700 z-10">
                <button 
                  onClick={() => setChartType('bar')}
                  className={`p-2 rounded-xl transition-all ${chartType === 'bar' ? 'bg-white dark:bg-gray-800 shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                >
                  <BarChart2 size={16} />
                </button>
                <button 
                  onClick={() => setChartType('pie')}
                  className={`p-2 rounded-xl transition-all ${chartType === 'pie' ? 'bg-white dark:bg-gray-800 shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                >
                  <PieChart size={16} />
                </button>
              </div>
            </div>

            {chartType === 'bar' ? (
              <div className="relative z-10">
                <div className="flex flex-wrap gap-2 mb-8">
                  {['journal', 'chat', 'courses'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'bg-gray-50 dark:bg-gray-900 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                    >
                      {tab === 'chat' ? 'AI Chat' : tab}
                    </button>
                  ))}
                </div>
                
                {/* SVG Bar Chart */}
                <div className="h-48 w-full flex items-end justify-between gap-3 px-2">
                  {(() => {
                    const getTrends = () => {
                      if (activeTab === 'chat') return Array.isArray(chatTrends) ? chatTrends : [0,0,0,0,0,0,0];
                      if (activeTab === 'courses') return Array.isArray(courseTrends) ? courseTrends : [0,0,0,0,0,0,0];
                      return Array.isArray(journalTrends) ? journalTrends : [0,0,0,0,0,0,0];
                    };
                    const trends = getTrends();
                    const maxVal = Math.max(...trends, 5);
                    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                    const todayRef = new Date();

                    return trends.map((val, i) => {
                      const d = new Date();
                      d.setDate(todayRef.getDate() - (6 - i));
                      const dayName = dayNames[d.getDay()];
                      const isToday = i === 6;
                      const barHeight = val > 0 ? Math.max((val / maxVal) * 100, 15) : 0;
                      
                      let colorClass = isToday ? 'bg-blue-600' : 'bg-blue-300 dark:bg-blue-800';
                      if (activeTab === 'chat') colorClass = isToday ? 'bg-amber-500' : 'bg-amber-200 dark:bg-amber-900/50';
                      if (activeTab === 'courses') colorClass = isToday ? 'bg-emerald-500' : 'bg-emerald-200 dark:bg-emerald-900/50';
                      
                      let textClass = isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400';
                      if (activeTab === 'chat') textClass = isToday ? 'text-amber-500 dark:text-amber-400' : 'text-gray-400';
                      if (activeTab === 'courses') textClass = isToday ? 'text-emerald-500 dark:text-emerald-400' : 'text-gray-400';

                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-3 h-full justify-end">
                          <div
                            className={`w-full max-w-[40px] rounded-t-xl relative transition-all duration-500 ${colorClass}`}
                            style={{ height: `${barHeight}%` }}
                          >
                            {val > 0 && (
                              <span className={`absolute -top-6 left-0 w-full text-center text-[10px] font-bold ${textClass}`}>
                                {val}
                              </span>
                            )}
                          </div>
                          <span className={`text-[10px] font-bold transition-colors ${textClass}`}>
                            {dayName}
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            ) : (
              // Pie Chart View
              <div className="h-64 w-full flex items-center justify-center gap-8 px-4 py-4 relative z-10">
                {(() => {
                   const jTotal = Array.isArray(journalTrends) ? journalTrends.reduce((a,b)=>a+b,0) : 0;
                   const cTotal = Array.isArray(chatTrends) ? chatTrends.reduce((a,b)=>a+b,0) : 0;
                   const lTotal = Array.isArray(courseTrends) ? courseTrends.reduce((a,b)=>a+b,0) : 0;
                   const total = jTotal + cTotal + lTotal || 1; 
                   
                   const jPct = (jTotal / total) * 100;
                   const cPct = (cTotal / total) * 100;
                   const lPct = (lTotal / total) * 100;
                   
                   const radius = 15.91549430918954;
                   const strokeWidth = 8;
                   return (
                     <div className="flex flex-col sm:flex-row items-center gap-10 w-full justify-center">
                       <div className="relative w-48 h-48 drop-shadow-xl shrink-0">
                         <svg viewBox="0 0 40 40" className="w-full h-full -rotate-90">
                            {/* Background track */}
                            <circle cx="20" cy="20" r={radius} fill="transparent" stroke="currentColor" className="text-gray-100 dark:text-gray-800" strokeWidth={strokeWidth} />
                            
                            {/* Journal Segment */}
                            {jPct > 0 && (
                              <circle cx="20" cy="20" r={radius} fill="transparent" stroke="#3b82f6" strokeWidth={strokeWidth} strokeDasharray={`${jPct} ${100 - jPct}`} strokeDashoffset={0} className="transition-all duration-1000 ease-out" />
                            )}
                            
                            {/* Chat Segment */}
                            {cPct > 0 && (
                              <circle cx="20" cy="20" r={radius} fill="transparent" stroke="#f59e0b" strokeWidth={strokeWidth} strokeDasharray={`${cPct} ${100 - cPct}`} strokeDashoffset={-jPct} className="transition-all duration-1000 ease-out" />
                            )}
                            
                            {/* Course Segment */}
                            {lPct > 0 && (
                              <circle cx="20" cy="20" r={radius} fill="transparent" stroke="#10b981" strokeWidth={strokeWidth} strokeDasharray={`${lPct} ${100 - lPct}`} strokeDashoffset={-(jPct + cPct)} className="transition-all duration-1000 ease-out" />
                            )}
                         </svg>
                         <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl font-black text-gray-800 dark:text-white">{jTotal + cTotal + lTotal}</span>
                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Actions</span>
                         </div>
                       </div>
                       
                       <div className="flex flex-col gap-4">
                         <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 px-4 py-3 rounded-2xl w-40">
                           <div className="w-3 h-3 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50 shrink-0"></div>
                           <div>
                             <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Journals</p>
                             <p className="text-sm font-bold text-gray-900 dark:text-white">{jTotal}</p>
                           </div>
                         </div>
                         <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 rounded-2xl w-40">
                           <div className="w-3 h-3 rounded-full bg-amber-500 shadow-lg shadow-amber-500/50 shrink-0"></div>
                           <div>
                             <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">AI Chat</p>
                             <p className="text-sm font-bold text-gray-900 dark:text-white">{cTotal}</p>
                           </div>
                         </div>
                         <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3 rounded-2xl w-40">
                           <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50 shrink-0"></div>
                           <div>
                             <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Courses</p>
                             <p className="text-sm font-bold text-gray-900 dark:text-white">{lTotal}</p>
                           </div>
                         </div>
                       </div>
                     </div>
                   );
                })()}
              </div>
            )}

            <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-5 transition-opacity pointer-events-none">
              {chartType === 'pie' ? <PieChart size={150} className="text-blue-600" /> : <BarChart2 size={150} className="text-blue-600" />}
            </div>
          </motion.div>

          {/* Recommendations */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <Sparkles className="text-blue-600" size={18} />
              Recommended for You
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence>
                {activeRecommendations.length > 0 ? (
                  activeRecommendations.map((rec) => (
                    <motion.div
                      key={rec.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="p-5 flex flex-col bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm relative group h-full"
                    >
                      {/* Top part: Icon + Text */}
                      <div className="flex items-start gap-4 mb-4">
                        {/* Icon */}
                        <div className={`p-3 rounded-2xl text-white shadow-lg shrink-0 ${rec.priority === 'high' ? 'bg-purple-600 shadow-purple-500/20' : rec.type === 'courses' ? 'bg-emerald-600 shadow-emerald-500/20' : 'bg-blue-600 shadow-blue-500/20'}`}>
                          {rec.type === 'journal' ? <PenTool size={20} /> :
                           rec.type === 'wellness' ? <Heart size={20} /> :
                           rec.type === 'courses' ? <BookOpen size={20} /> :
                           <CheckCircle size={20} />}
                        </div>
                        
                        {/* Text content */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                             <h4 className="text-sm font-bold dark:text-white">{rec.title}</h4>
                             {rec.priority === 'high' && (
                               <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-[9px] font-bold uppercase tracking-wider">High Priority</span>
                             )}
                          </div>
                          <p className="text-[11px] text-gray-500 font-medium mt-1 flex items-start gap-1">
                            <Info size={12} className="shrink-0 mt-0.5" />
                            <span>{rec.reason}</span>
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-2 mt-auto pt-4 border-t border-gray-50 dark:border-gray-700/50">
                        {rec.dismissible && (
                          <button
                            onClick={(e) => { e.preventDefault(); handleDismiss(rec.id); }}
                            className="px-3 py-2 text-[11px] font-bold text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-xl transition-all whitespace-nowrap"
                          >
                            Maybe Later
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (rec.actionType === 'modal') {
                              if (rec.type === 'journal') setShowJournalModal(true);
                              if (rec.type === 'wellness') setShowWellnessModal(true);
                            } else if (rec.link) {
                              navigate(rec.link);
                            }
                          }}
                          className="px-4 py-2 bg-gray-50 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 text-xs font-bold rounded-xl transition-colors whitespace-nowrap"
                        >
                          {rec.actionType === 'modal' ? 'Start Now' : 'View'}
                        </button>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="md:col-span-2 p-10 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-[32px] border border-emerald-100 dark:border-emerald-800/30 flex flex-col items-center justify-center text-center space-y-4 shadow-sm"
                  >
                    <div className="p-5 bg-emerald-100 dark:bg-emerald-800/50 rounded-full text-emerald-600 dark:text-emerald-400 mb-2">
                      <Sparkles size={40} />
                    </div>
                    <h4 className="text-2xl font-bold text-emerald-800 dark:text-emerald-300">
                      {completionStatus?.message || "Great job today!"}
                    </h4>
                    <p className="text-base text-emerald-600/80 dark:text-emerald-400/80 font-medium max-w-md">
                      You've completed all recommended activities. Take some time to relax!
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
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

      {/* Recently Accessed Lessons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6 pt-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold dark:text-white flex items-center gap-2">
            <GraduationCap className="text-blue-600" size={24} />
            {recentLessons.length > 0 ? "Recently Accessed Lessons" : "Start Your Learning Journey"}
          </h3>
          <Link to="/dashboard/courses" className="text-blue-600 hover:text-blue-700 text-xs font-bold uppercase tracking-widest">
            {recentLessons.length > 0 ? "Explore More" : "View All Courses"}
          </Link>
        </div>
        
        {recentLessons.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {recentLessons.map((lesson, i) => (
              <motion.div
                key={lesson._id || i}
                whileHover={{ y: -5 }}
                className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden group cursor-pointer"
                onClick={() => navigate(`/dashboard/course/${lesson.courseId}`, { state: { lessonId: lesson._id, courseTitle: lesson.courseTitle } })}
              >
                <div className="aspect-video relative overflow-hidden">
                  <img 
                    src={lesson.thumbnailUrl || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60'} 
                    alt={lesson.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                    <span className="text-white text-xs font-bold flex items-center gap-1">
                      <Play size={12} fill="currentColor" /> Resume Lesson
                    </span>
                  </div>
                  <div className="absolute top-3 left-3 px-2 py-1 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg shadow-sm">
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">{lesson.courseTitle}</span>
                  </div>
                </div>
                <div className="p-5">
                  <h4 className="font-bold text-gray-900 dark:text-white line-clamp-1 group-hover:text-blue-600 transition-colors">
                    {lesson.title}
                  </h4>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-gray-400">
                      <Clock size={12} />
                      <span className="text-[10px] font-bold">
                        Accessed {new Date(lesson.lastAccessedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                      <ChevronRight size={16} />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-[32px] p-10 border border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center text-center space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-full text-blue-600">
              <BookOpen size={32} />
            </div>
            <div>
              <h4 className="text-lg font-bold dark:text-white">No lessons accessed yet</h4>
              <p className="text-sm text-gray-500 max-w-sm mt-1">
                Explore our courses and start your first lesson to see your progress here.
              </p>
            </div>
            <Link 
              to="/dashboard/courses"
              className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all"
            >
              Start Learning
            </Link>
          </div>
        )}
      </motion.div>

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
                  {(() => {
                    if (!weeklyReport) return null;
                    const parts = weeklyReport.split(/(\*\*.*?\*\*)/g);
                    return parts.map((part, i) => {
                      if (part.startsWith('**') && part.endsWith('**')) {
                        return <strong key={i} className="text-blue-600 dark:text-blue-400 font-extrabold">{part.slice(2, -2)}</strong>;
                      }
                      return part;
                    });
                  })()}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-8 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-4">
              <button
                onClick={handleDownloadReport}
                className="px-6 py-3 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 rounded-2xl font-bold shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all flex items-center gap-2"
              >
                <Download size={18} />
                Download PDF
              </button>
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

      {/* Quick Journal Modal */}
      {showJournalModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setShowJournalModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-[32px] shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-xl font-bold dark:text-white flex items-center gap-2">
                <PenTool className="text-purple-600" size={20} /> Quick Reflection
              </h3>
              <button onClick={() => setShowJournalModal(false)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6">
              <textarea 
                value={journalContent}
                onChange={(e) => setJournalContent(e.target.value)}
                placeholder="What's on your mind today?" 
                className="w-full h-32 p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-purple-600 focus:border-transparent resize-none dark:text-white outline-none"
              ></textarea>
              <button 
                onClick={handleSaveJournal} 
                disabled={isSavingJournal || !journalContent.trim()}
                className="w-full mt-4 py-3 bg-purple-600 text-white rounded-2xl font-bold shadow-lg shadow-purple-500/20 hover:bg-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSavingJournal ? <Loader2 className="animate-spin" size={20} /> : "Save Entry"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Wellness Check Modal */}
      {showWellnessModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setShowWellnessModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-[32px] shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-xl font-bold dark:text-white flex items-center gap-2">
                <Heart className="text-pink-600" size={20} /> How are you?
              </h3>
              <button onClick={() => setShowWellnessModal(false)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6 flex flex-col items-center gap-6">
              <div className="flex justify-center gap-4 text-4xl">
                {['😢', '😐', '🙂', '😁'].map(emoji => (
                  <button 
                    key={emoji} 
                    onClick={() => setSelectedMood(emoji)}
                    className={`hover:scale-125 transition-transform origin-bottom ${selectedMood === emoji ? 'scale-125 drop-shadow-md' : 'opacity-50 hover:opacity-100'}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <button 
                onClick={handleSaveMood} 
                disabled={isSavingMood || !selectedMood}
                className="w-full py-3 bg-pink-600 text-white rounded-2xl font-bold shadow-lg shadow-pink-500/20 hover:bg-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSavingMood ? <Loader2 className="animate-spin" size={20} /> : "Log Mood"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Floating Quick Ask */}
      <motion.div 
        initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <Link to="/dashboard/chat">
          <button className="group flex items-center justify-center w-14 h-14 bg-blue-600 text-white rounded-full shadow-2xl shadow-blue-500/40 hover:w-40 hover:bg-blue-700 transition-all duration-300 overflow-hidden">
            <MessageSquare size={24} className="shrink-0" />
            <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-[100px] group-hover:ml-2 font-bold text-sm transition-all duration-300">
              Ask Serani
            </span>
          </button>
        </Link>
      </motion.div>

    </div>
  );
};

export default DashboardHome;