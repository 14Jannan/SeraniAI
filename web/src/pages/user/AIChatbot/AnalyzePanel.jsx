import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Brain, TrendingUp, MessageSquare, BookOpen,
  Flame, Sparkles, Loader2, AlertCircle, RefreshCw,
  Calendar, Activity,
} from "lucide-react";
import { fetchAnalysis } from "../../../api/analyzeApi";

// ─── Mood Sparkline (pure SVG) ──────────────────────────────────────────────
function MoodSparkline({ timeline }) {
  const WIDTH = 100;
  const HEIGHT = 40;
  const PADDING = 2;

  const validPoints = timeline.map((d, i) => ({ ...d, i })).filter((d) => d.score !== null);

  if (validPoints.length < 2) {
    return (
      <div className="flex items-center justify-center h-10 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        Not enough data yet
      </div>
    );
  }

  const xStep = (WIDTH - PADDING * 2) / (timeline.length - 1);
  const yScale = (score) =>
    HEIGHT - PADDING - ((score - 1) / 9) * (HEIGHT - PADDING * 2);

  // Build polyline points from ALL positions (leave gaps for nulls)
  const segments = [];
  let currentSeg = [];

  timeline.forEach((d, i) => {
    const x = PADDING + i * xStep;
    if (d.score !== null) {
      const y = yScale(d.score);
      currentSeg.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    } else {
      if (currentSeg.length >= 2) segments.push([...currentSeg]);
      currentSeg = [];
    }
  });
  if (currentSeg.length >= 2) segments.push(currentSeg);

  // Last point for dot
  const last = validPoints[validPoints.length - 1];
  const lastX = PADDING + last.i * xStep;
  const lastY = yScale(last.score);

  const scoreColor = last.score >= 7 ? "#10b981" : last.score >= 4.5 ? "#f59e0b" : "#ef4444";

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-10">
      {/* Horizontal guide lines */}
      {[1, 5, 10].map((v) => (
        <line
          key={v}
          x1={PADDING}
          x2={WIDTH - PADDING}
          y1={yScale(v)}
          y2={yScale(v)}
          stroke="currentColor"
          strokeWidth="0.3"
          className="text-slate-200 dark:text-slate-700"
          strokeDasharray="2,2"
        />
      ))}

      {/* Gradient fill area */}
      {segments.map((seg, si) => {
        const firstPt = seg[0].split(",");
        const lastPt = seg[seg.length - 1].split(",");
        return (
          <polygon
            key={`fill-${si}`}
            points={`${seg.join(" ")} ${lastPt[0]},${HEIGHT} ${firstPt[0]},${HEIGHT}`}
            fill="url(#sparkGrad)"
            opacity="0.15"
          />
        );
      })}

      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={scoreColor} stopOpacity="0.8" />
          <stop offset="100%" stopColor={scoreColor} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Lines */}
      {segments.map((seg, si) => (
        <polyline
          key={`line-${si}`}
          points={seg.join(" ")}
          fill="none"
          stroke={scoreColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}

      {/* Last point dot */}
      <circle cx={lastX} cy={lastY} r="2.5" fill={scoreColor} />
      <circle cx={lastX} cy={lastY} r="5" fill={scoreColor} opacity="0.2" />
    </svg>
  );
}

// ─── Wellbeing Ring (SVG) ───────────────────────────────────────────────────
function WellbeingRing({ score, label, color }) {
  const R = 42;
  const CIRC = 2 * Math.PI * R;
  const fill = ((score - 1) / 9) * CIRC;

  const colors = {
    emerald: { stroke: "#10b981", text: "text-emerald-500", bg: "from-emerald-500/10 to-emerald-600/5" },
    amber: { stroke: "#f59e0b", text: "text-amber-500", bg: "from-amber-500/10 to-amber-600/5" },
    red: { stroke: "#ef4444", text: "text-red-500", bg: "from-red-500/10 to-red-600/5" },
  };
  const c = colors[color] || colors.emerald;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`relative w-24 h-24 rounded-full bg-gradient-to-br ${c.bg} flex items-center justify-center`}>
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full -rotate-90">
          <circle cx="50" cy="50" r={R} fill="none" stroke="currentColor" strokeWidth="7"
            className="text-slate-100 dark:text-slate-800" />
          <motion.circle
            cx="50" cy="50" r={R}
            fill="none"
            stroke={c.stroke}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            initial={{ strokeDashoffset: CIRC }}
            animate={{ strokeDashoffset: CIRC - fill }}
            transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
          />
        </svg>
        <div className="text-center z-10">
          <div className={`text-xl font-black ${c.text}`}>{score}</div>
          <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">/10</div>
        </div>
      </div>
      <div className={`text-xs font-black ${c.text} uppercase tracking-widest`}>{label}</div>
    </div>
  );
}

// ─── Weekly Heatmap ──────────────────────────────────────────────────────────
function WeeklyHeatmap({ data }) {
  const levelColors = [
    "bg-slate-100 dark:bg-slate-800",
    "bg-blue-100 dark:bg-blue-900/40",
    "bg-blue-200 dark:bg-blue-800/60",
    "bg-blue-400 dark:bg-blue-600",
    "bg-blue-600 dark:bg-blue-500",
  ];

  return (
    <div className="flex items-center gap-1.5">
      {data.map(({ day, count, level }) => (
        <div key={day} className="flex flex-col items-center gap-1">
          <motion.div
            whileHover={{ scale: 1.2 }}
            title={`${day}: ${count} messages`}
            className={`w-8 h-8 rounded-xl ${levelColors[level]} transition-all cursor-default relative group`}
          >
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-bold px-2 py-0.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              {count} msg
            </div>
          </motion.div>
          <span className="text-[9px] font-black text-slate-400 uppercase">{day[0]}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Tag Pill ────────────────────────────────────────────────────────────────
const TAG_COLORS = [
  "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
];

function TopicTag({ label, index }) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.07 }}
      className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${TAG_COLORS[index % TAG_COLORS.length]}`}
    >
      #{label}
    </motion.span>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, iconColor }) {
  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3 flex flex-col gap-1 items-center text-center min-w-0">
      <div className={`w-7 h-7 rounded-xl ${iconColor} flex items-center justify-center`}>
        <Icon size={13} className="text-white" />
      </div>
      <div className="text-lg font-black text-slate-900 dark:text-white leading-none">{value}</div>
      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-tight">{label}</div>
    </div>
  );
}

// ─── Section Heading ─────────────────────────────────────────────────────────
function SectionLabel({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon size={13} className="text-blue-500" />
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.18em]">{label}</span>
    </div>
  );
}

// ─── Skeleton Loader ─────────────────────────────────────────────────────────
function SkeletonBlock({ className }) {
  return <div className={`bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse ${className}`} />;
}

// ─── Main AnalyzePanel ───────────────────────────────────────────────────────
function AnalyzePanel({ isOpen, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAnalysis();
      setData(res.data);
    } catch (err) {
      console.error("AnalyzePanel fetch error:", err);
      setError("Could not load your insights. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="analyze-panel"
          initial={{ opacity: 0, x: 40, width: 0 }}
          animate={{ opacity: 1, x: 0, width: 360 }}
          exit={{ opacity: 0, x: 40, width: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="flex-shrink-0 h-full overflow-hidden"
          style={{ minWidth: 0 }}
        >
          <div className="h-full w-[360px] bg-white dark:bg-[#0b1322] border border-slate-200/70 dark:border-white/10 rounded-[28px] shadow-[0_35px_75px_-45px_rgba(15,23,42,0.4)] flex flex-col overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Brain size={16} className="text-white" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-sm tracking-tight">My Insights</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Last 30 days</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={load}
                  disabled={loading}
                  className="p-2 text-slate-400 hover:text-sky-500 transition-colors rounded-xl hover:bg-slate-50 dark:hover:bg-white/5"
                  title="Refresh"
                >
                  <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors rounded-xl hover:bg-slate-50 dark:hover:bg-white/5"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6 scrollbar-hide">

              {/* Error */}
              {error && (
                <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-2xl p-4">
                  <AlertCircle size={15} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs font-bold text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              {/* Loading skeleton */}
              {loading && !data && (
                <div className="space-y-5">
                  <SkeletonBlock className="h-28" />
                  <SkeletonBlock className="h-20" />
                  <SkeletonBlock className="h-16" />
                  <SkeletonBlock className="h-24" />
                  <SkeletonBlock className="h-12" />
                </div>
              )}

              {/* Loaded content */}
              {data && (
                <>
                  {/* ① Wellbeing Score + Stats */}
                  <div className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800/60 rounded-[22px] p-5 border border-slate-100 dark:border-slate-800">
                    <SectionLabel icon={Activity} label="Wellbeing Score" />
                    <div className="flex items-center gap-5">
                      <WellbeingRing
                        score={data.wellbeing.score}
                        label={data.wellbeing.label}
                        color={data.wellbeing.color}
                      />
                      <div className="flex-1 flex flex-col gap-2">
                        <div className="flex gap-2">
                          <StatCard
                            icon={MessageSquare}
                            label="Chats"
                            value={data.stats.totalChats}
                            iconColor="bg-blue-500"
                          />
                          <StatCard
                            icon={BookOpen}
                            label="Journals"
                            value={data.stats.journalCount}
                            iconColor="bg-violet-500"
                          />
                        </div>
                        <div className="flex gap-2">
                          <StatCard
                            icon={Flame}
                            label="Streak"
                            value={`${data.stats.journalStreak}d`}
                            iconColor="bg-amber-500"
                          />
                          <StatCard
                            icon={Calendar}
                            label="Busiest"
                            value={data.stats.busiestDay}
                            iconColor="bg-emerald-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ② Mood Timeline */}
                  <div className="bg-slate-50 dark:bg-slate-900/60 rounded-[22px] p-5 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-3">
                      <SectionLabel icon={TrendingUp} label="Mood Timeline" />
                      <span className="text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">30 days</span>
                    </div>
                    <MoodSparkline timeline={data.moodTimeline} />
                    <div className="flex items-center justify-between mt-2 px-0.5">
                      {["1", "5", "10"].map((v) => (
                        <span key={v} className="text-[9px] font-black text-slate-300 dark:text-slate-600">{v}</span>
                      ))}
                    </div>
                  </div>

                  {/* ③ This Week's Activity */}
                  <div className="bg-slate-50 dark:bg-slate-900/60 rounded-[22px] p-5 border border-slate-100 dark:border-slate-800">
                    <SectionLabel icon={Activity} label="This Week's Activity" />
                    <WeeklyHeatmap data={data.weeklyActivity} />
                    <p className="mt-2 text-[9px] font-bold text-slate-400">
                      Avg {data.stats.avgMessages} messages per conversation
                    </p>
                  </div>

                  {/* ④ Top Themes */}
                  <div className="bg-slate-50 dark:bg-slate-900/60 rounded-[22px] p-5 border border-slate-100 dark:border-slate-800">
                    <SectionLabel icon={Sparkles} label="Top Topics" />
                    <div className="flex flex-wrap gap-2">
                      {data.topThemes.map((theme, i) => (
                        <TopicTag key={theme} label={theme} index={i} />
                      ))}
                    </div>
                  </div>

                  {/* ⑤ AI Personal Insight */}
                  <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-violet-700 rounded-[22px] p-5">
                    {/* Subtle glow blob */}
                    <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                    <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-white/10 rounded-full blur-2xl pointer-events-none" />

                    <div className="relative flex items-start gap-3">
                      <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Brain size={14} className="text-white" />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-blue-200 uppercase tracking-widest mb-2">
                          AI Personal Insight
                        </p>
                        <p className="text-xs font-semibold text-white leading-relaxed">
                          {data.insight}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Footer note */}
                  <p className="text-center text-[9px] font-bold text-slate-300 dark:text-slate-600 pb-2">
                    Based on your journals & conversations · Updated live
                  </p>
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default AnalyzePanel;
