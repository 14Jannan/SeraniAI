import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  CalendarDays,
  Trash2,
  Pencil,
  Download,
  Search,
  Star,
  StarOff,
  Sparkles,
  List,
  LayoutGrid,
  RefreshCcw,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Flame,
  Smile,
} from "lucide-react";
import { jsPDF } from "jspdf";
import { useTheme } from "../../context/ThemeContext";
import AddJournal from "./AddJournal";

const API_URL = "http://localhost:7001/api/journals";
const SUMMARY_URL = `${API_URL}/stats/summary`;

const MOOD_COLORS = {
  happy: "bg-emerald-100 text-emerald-700",
  grateful: "bg-green-100 text-green-700",
  hopeful: "bg-sky-100 text-sky-700",
  calm: "bg-cyan-100 text-cyan-700",
  excited: "bg-amber-100 text-amber-700",
  stressed: "bg-rose-100 text-rose-700",
  anxious: "bg-orange-100 text-orange-700",
  overwhelmed: "bg-red-100 text-red-700",
  sad: "bg-indigo-100 text-indigo-700",
  lonely: "bg-blue-100 text-blue-700",
  tired: "bg-slate-200 text-slate-700",
  angry: "bg-red-200 text-red-800",
  depressed: "bg-violet-100 text-violet-700",
  neutral: "bg-gray-100 text-gray-600",
};

const MOOD_RING_COLORS = {
  happy: "#34d399",
  grateful: "#34d399",
  hopeful: "#f472b6",
  calm: "#a78bfa",
  excited: "#fbbf24",
  stressed: "#fb7185",
  anxious: "#fb923c",
  overwhelmed: "#f87171",
  sad: "#38bdf8",
  lonely: "#60a5fa",
  tired: "#94a3b8",
  angry: "#f97316",
  depressed: "#8b5cf6",
  neutral: "#94a3b8",
};

const MOOD_DOT_CLASSES = {
  happy: "bg-emerald-400",
  grateful: "bg-emerald-400",
  hopeful: "bg-pink-400",
  calm: "bg-violet-400",
  excited: "bg-amber-400",
  stressed: "bg-rose-400",
  anxious: "bg-orange-400",
  overwhelmed: "bg-red-400",
  sad: "bg-sky-400",
  lonely: "bg-blue-400",
  tired: "bg-slate-400",
  angry: "bg-orange-500",
  depressed: "bg-violet-500",
  neutral: "bg-slate-400",
};

const WEEK_LABELS = ["W", "T", "F", "S", "S", "M", "T"];

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const buildJournalFilename = (title, dateString) => {
  const safeTitle = (title || "journal-entry")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  return `${safeTitle || "journal-entry"}-${dateString || getLocalDateString()}.pdf`;
};

const estimateReadTime = (content) => {
  const words = String(content || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  if (!words) {
    return 1;
  }

  return Math.max(1, Math.round(words / 200));
};

const getMoodClass = (mood) => {
  const key = String(mood || "neutral").toLowerCase();
  return MOOD_COLORS[key] || MOOD_COLORS.neutral;
};

const downloadJournalPdf = (entry) => {
  const pdf = new jsPDF();
  const marginLeft = 14;
  const topMargin = 18;
  const bottomMargin = 16;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - marginLeft * 2;
  const createdDate = entry?.createdAt
    ? new Date(entry.createdAt).toLocaleString()
    : new Date().toLocaleString();
  const title = entry?.title?.trim() || "Untitled Entry";
  const content = entry?.content?.trim() || "";

  pdf.setFontSize(18);
  pdf.setFont("helvetica", "bold");
  pdf.text("Journal Entry", marginLeft, topMargin);

  pdf.setFontSize(12);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Title: ${title}`, marginLeft, 30, { maxWidth: contentWidth });
  pdf.text(`Date: ${createdDate}`, marginLeft, 38, { maxWidth: contentWidth });

  const lines = pdf.splitTextToSize(content || "No content provided.", contentWidth);
  let currentY = 52;

  lines.forEach((line) => {
    if (currentY > pageHeight - bottomMargin) {
      pdf.addPage();
      currentY = topMargin;
    }

    pdf.text(line, marginLeft, currentY);
    currentY += 7;
  });

  pdf.save(
    buildJournalFilename(
      title,
      entry?.createdAt ? getLocalDateString(new Date(entry.createdAt)) : getLocalDateString()
    )
  );
};

const Journal = () => {
  const { theme } = useTheme();

  const [mode, setMode] = useState("list");
  const [entries, setEntries] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchText, setSearchText] = useState("");
  const [selectedMood, setSelectedMood] = useState("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState("list");
  const [refreshingInsightId, setRefreshingInsightId] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);
  const [insightTimeRange, setInsightTimeRange] = useState("week");
  const [showInsightDropdown, setShowInsightDropdown] = useState(false);
  const [moodTimeRange, setMoodTimeRange] = useState("week");
  const [showMoodDropdown, setShowMoodDropdown] = useState(false);
  const [showMoodModal, setShowMoodModal] = useState(false);

  const token = localStorage.getItem("token");

  const commonHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const fetchJournals = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(API_URL, { method: "GET", headers: commonHeaders });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch journals");
      }

      setEntries(data.journals || []);
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async ({ moodRange = moodTimeRange, insightRange = insightTimeRange } = {}) => {
    try {
      setSummaryLoading(true);
      const url = new URL(SUMMARY_URL);
      url.searchParams.set("moodRange", moodRange);
      url.searchParams.set("insightRange", insightRange);
      const response = await fetch(url.toString(), { method: "GET", headers: commonHeaders });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch summary");
      }

      setSummary(data.summary || null);
    } catch (err) {
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    fetchJournals();
  }, [token]);

  useEffect(() => {
    fetchSummary({ moodRange: moodTimeRange, insightRange: insightTimeRange });
  }, [token, moodTimeRange, insightTimeRange]);

  const filteredEntries = useMemo(() => {
    const lowerSearch = searchText.trim().toLowerCase();

    const list = entries.filter((entry) => {
      if (favoritesOnly && !entry.isFavorite) {
        return false;
      }

      if (selectedMood !== "all") {
        const mood = String(entry.mood || "neutral").toLowerCase();
        if (mood !== selectedMood) {
          return false;
        }
      }

      if (selectedDate) {
        const entryDate = getLocalDateString(new Date(entry.createdAt));
        const filterDate = getLocalDateString(selectedDate);
        if (entryDate !== filterDate) {
          return false;
        }
      }

      if (lowerSearch) {
        const haystack = [entry.title, entry.content, entry.mood]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(lowerSearch)) {
          return false;
        }
      }

      return true;
    });

    const sorted = [...list].sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();

      if (sortBy === "oldest") {
        return timeA - timeB;
      }

      if (sortBy === "mood") {
        return String(a.mood || "").localeCompare(String(b.mood || ""));
      }

      return timeB - timeA;
    });

    return sorted;
  }, [entries, searchText, favoritesOnly, selectedMood, sortBy, selectedDate]);

  const handleCreate = async (newEntry) => {
    try {
      setError("");

      const response = await fetch(API_URL, {
        method: "POST",
        headers: commonHeaders,
        body: JSON.stringify({
          title: newEntry.title,
          content: newEntry.text,
          mood: newEntry.mood,
          tags: newEntry.tags,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to save journal");
      }

      setEntries((prev) => [data.journal, ...prev]);
      setMode("list");
      setSelectedEntry(null);
      fetchSummary();
    } catch (err) {
      setError(err.message || "Failed to save journal");
      throw err;
    }
  };

  const handleUpdate = async (updatedEntry) => {
    try {
      setError("");

      const response = await fetch(`${API_URL}/${updatedEntry._id}`, {
        method: "PUT",
        headers: commonHeaders,
        body: JSON.stringify({
          title: updatedEntry.title,
          content: updatedEntry.text,
          mood: updatedEntry.mood,
          tags: updatedEntry.tags,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update journal");
      }

      setEntries((prev) =>
        prev.map((entry) =>
          entry._id === updatedEntry._id ? data.journal : entry
        )
      );

      setSelectedEntry(data.journal);
      setMode("list");
      fetchSummary();
    } catch (err) {
      setError(err.message || "Failed to update journal");
      throw err;
    }
  };

  const handleDelete = async (id) => {
    try {
      setError("");
      const response = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete journal");
      }

      setEntries((prev) => prev.filter((entry) => entry._id !== id));
      fetchSummary();
    } catch (err) {
      setError(err.message || "Failed to delete journal");
    }
  };

  const toggleFavorite = async (entry) => {
    try {
      const response = await fetch(`${API_URL}/${entry._id}`, {
        method: "PUT",
        headers: commonHeaders,
        body: JSON.stringify({ isFavorite: !entry.isFavorite }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update favorite");
      }

      setEntries((prev) => prev.map((item) => (item._id === entry._id ? data.journal : item)));
      fetchSummary();
    } catch (err) {
      setError(err.message || "Failed to update favorite");
    }
  };

  const handleRefreshInsight = async (id) => {
    try {
      setRefreshingInsightId(id);
      const response = await fetch(`${API_URL}/${id}/refresh-insight`, {
        method: "POST",
        headers: commonHeaders,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to refresh insight");
      }

      setEntries((prev) => prev.map((item) => (item._id === id ? data.journal : item)));
      if (selectedEntry?._id === id) {
        setSelectedEntry(data.journal);
      }
      fetchSummary();
    } finally {
      setRefreshingInsightId("");
    }
  };

  const clearFilters = () => {
    setSearchText("");
    setSelectedMood("all");
    setFavoritesOnly(false);
    setSortBy("newest");
    setSelectedDate(null);
    setCalendarMonth(new Date());
  };

  const handleDateClick = (day) => {
    if (day) {
      const newDate = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
      setSelectedDate(newDate);
    }
  };

  const handleEditClick = (entry) => {
    setSelectedEntry(entry);
    setMode("edit");
  };

  const handleViewClick = (entry) => {
    setSelectedEntry(entry);
    setMode("view");
  };

  const handleBack = () => {
    setMode("list");
    setSelectedEntry(null);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatDayLabel = (dateInput) => {
    const date = new Date(dateInput);
    return date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatTimeLabel = (dateInput) => {
    return new Date(dateInput).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const dominantMood = useMemo(() => {
    if (!summary?.moodCounts) {
      return "neutral";
    }
    const sorted = Object.entries(summary.moodCounts).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || "neutral";
  }, [summary]);

  const moodStats = useMemo(() => {
    const moodCounts = summary?.moodCounts || {};
    const entries = Object.entries(moodCounts).sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((sum, [, count]) => sum + count, 0);

    const fallbackMood = dominantMood || "neutral";
    const primaryMood = entries[0]?.[0] || fallbackMood;
    const moodLabel = String(primaryMood).replace(/^(.)/, (match) => match.toUpperCase());
    const legend = entries.slice(0, 3).map(([mood, count]) => ({
      mood,
      count,
      percent: total ? Math.round((count / total) * 100) : 0,
    }));

    return {
      total,
      moodLabel,
      legend,
      ring: entries.length
        ? (() => {
            let cursor = 0;
            return entries
              .map(([mood, count]) => {
                const start = cursor;
                const percent = total ? (count / total) * 100 : 0;
                cursor += percent;
                return `${MOOD_RING_COLORS[mood] || MOOD_RING_COLORS.neutral} ${start}% ${cursor}%`;
              })
              .join(", ");
          })()
        : `${MOOD_RING_COLORS.neutral} 0 100%`,
    };
  }, [summary, dominantMood, moodTimeRange]);

  const periodMoodDetails = useMemo(() => {
    const rangeStart = new Date();
    rangeStart.setHours(0, 0, 0, 0);

    if (moodTimeRange === "month") {
      rangeStart.setDate(1);
    } else {
      rangeStart.setDate(rangeStart.getDate() - rangeStart.getDay());
    }

    const rangeEnd = new Date(rangeStart);
    if (moodTimeRange === "month") {
      rangeEnd.setMonth(rangeEnd.getMonth() + 1);
    } else {
      rangeEnd.setDate(rangeEnd.getDate() + 7);
    }

    const periodEntries = entries
      .filter((entry) => {
        if (!entry?.createdAt) {
          return false;
        }
        const createdAt = new Date(entry.createdAt);
        return createdAt >= rangeStart && createdAt < rangeEnd;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const moodCounts = periodEntries.reduce((acc, entry) => {
      const mood = String(entry.mood || "neutral").toLowerCase();
      acc[mood] = (acc[mood] || 0) + 1;
      return acc;
    }, {});

    const moodRows = Object.entries(moodCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([mood, count]) => ({ mood, count }));

    const total = moodRows.reduce((sum, row) => sum + row.count, 0);
    const moodRowsWithPercent = moodRows.map((row) => ({
      ...row,
      percent: total ? Math.round((row.count / total) * 100) : 0,
    }));

    const ring = moodRowsWithPercent.length
      ? (() => {
          let cursor = 0;
          return moodRowsWithPercent
            .map(({ mood, count }) => {
              const start = cursor;
              const percent = total ? (count / total) * 100 : 0;
              cursor += percent;
              return `${MOOD_RING_COLORS[mood] || MOOD_RING_COLORS.neutral} ${start}% ${cursor}%`;
            })
            .join(", ");
        })()
      : `${MOOD_RING_COLORS.neutral} 0 100%`;

    const totalDays = moodTimeRange === "month"
      ? new Date(rangeStart.getFullYear(), rangeStart.getMonth() + 1, 0).getDate()
      : 7;

    const dayBuckets = Array.from({ length: totalDays }, (_, index) => {
      const dayDate = new Date(rangeStart);
      dayDate.setDate(rangeStart.getDate() + index);
      const dayKey = getLocalDateString(dayDate);

      return {
        dayKey,
        dayLabel: formatDayLabel(dayDate),
        entries: periodEntries.filter(
          (entry) => getLocalDateString(new Date(entry.createdAt)) === dayKey
        ),
      };
    });

    return {
      rangeStart,
      rangeEnd,
      entries: periodEntries,
      total,
      moodRows: moodRowsWithPercent,
      ring,
      dayBuckets,
    };
  }, [entries, moodTimeRange]);

  const weeklyActivity = summary?.weeklyActivity || [
    { label: "W", count: 0 },
    { label: "T", count: 0 },
    { label: "F", count: 0 },
    { label: "S", count: 0 },
    { label: "S", count: 0 },
    { label: "M", count: 0 },
    { label: "T", count: 0 },
  ];

  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const calendarData = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    const firstWeekday = monthStart.getDay();
    const daysInMonth = monthEnd.getDate();
    const prevMonthEnd = new Date(year, month, 0).getDate();

    const cells = [];
    for (let index = 0; index < 42; index += 1) {
      let day;
      let isCurrentMonth = true;

      if (index < firstWeekday) {
        day = prevMonthEnd - firstWeekday + index + 1;
        isCurrentMonth = false;
      } else if (index >= firstWeekday + daysInMonth) {
        day = index - (firstWeekday + daysInMonth) + 1;
        isCurrentMonth = false;
      } else {
        day = index - firstWeekday + 1;
      }

      const today = new Date();
      const isToday = isCurrentMonth && day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
      cells.push({ day, isCurrentMonth, isToday, key: `${index}-${day}` });
    }

    return {
      monthLabel: calendarMonth.toLocaleDateString(undefined, { month: "short", year: "numeric" }),
      cells,
    };
  }, [calendarMonth]);

  if (mode === "add") {
    return <AddJournal onBack={handleBack} onSave={handleCreate} />;
  }

  if (mode === "edit") {
    return (
      <AddJournal
        onBack={handleBack}
        onSave={handleUpdate}
        onRefreshInsight={handleRefreshInsight}
        initialData={{
          _id: selectedEntry?._id,
          title: selectedEntry?.title || "",
          text: selectedEntry?.content || "",
          mood: selectedEntry?.mood || "",
          tags: selectedEntry?.tags || [],
          aiInsight: selectedEntry?.aiInsight || null,
        }}
        isEdit={true}
      />
    );
  }

  if (mode === "view") {
    return (
      <AddJournal
        onBack={handleBack}
        onSave={async () => {}}
        onDownload={() => downloadJournalPdf(selectedEntry)}
        onRefreshInsight={handleRefreshInsight}
        initialData={{
          _id: selectedEntry?._id,
          title: selectedEntry?.title || "",
          text: selectedEntry?.content || "",
          mood: selectedEntry?.mood || "",
          tags: selectedEntry?.tags || [],
          aiInsight: selectedEntry?.aiInsight || null,
        }}
        readOnly={true}
      />
    );
  }

  return (
    <div className={`w-full h-full p-4 overflow-x-hidden ${theme === "dark" ? "bg-slate-950" : "bg-slate-100"}`}>
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-5 h-full min-w-0">
        <div className={`rounded-2xl border ${theme === "dark" ? "border-slate-700 bg-slate-900" : "border-gray-200 bg-white"} p-5 flex flex-col min-h-0 min-w-0`}>
          <div className="flex flex-wrap items-center gap-3">
            <div className={`flex-1 min-w-[220px] rounded-lg border px-3 py-2 flex items-center gap-2 ${theme === "dark" ? "border-slate-700 bg-slate-950" : "border-gray-200 bg-gray-50"}`}>
              <Search size={16} className={theme === "dark" ? "text-gray-400" : "text-gray-500"} />
              <input
                type="text"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search your entries or moods..."
                className={`w-full bg-transparent outline-none ${theme === "dark" ? "text-gray-100 placeholder-gray-500" : "text-gray-700 placeholder-gray-400"}`}
              />
            </div>

            <button
              className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
              onClick={() => setMode("add")}
            >
              <Plus size={16} />
              New Entry
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-4">
            <select
              value={selectedMood}
              onChange={(event) => setSelectedMood(event.target.value)}
              className={`rounded-lg border px-3 py-2 text-sm ${theme === "dark" ? "bg-slate-950 border-slate-700 text-gray-200" : "bg-white border-gray-200 text-gray-700"}`}
            >
              <option value="all">All Moods</option>
              {Object.keys(MOOD_COLORS).map((mood) => (
                <option key={mood} value={mood}>
                  {mood}
                </option>
              ))}
            </select>

            <button
              onClick={() => setFavoritesOnly((prev) => !prev)}
              className={`rounded-lg border px-3 py-2 text-sm flex items-center gap-2 ${favoritesOnly ? "border-amber-300 text-amber-600 bg-amber-50" : theme === "dark" ? "bg-slate-950 border-slate-700 text-gray-200" : "bg-white border-gray-200 text-gray-700"}`}
            >
              <Filter size={14} />
              Favorites
            </button>

            <button
              onClick={clearFilters}
              className="text-sm text-indigo-600 px-2 py-2"
            >
              Clear Filters
            </button>

            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className={`ml-auto rounded-lg border px-3 py-2 text-sm ${theme === "dark" ? "bg-slate-950 border-slate-700 text-gray-200" : "bg-white border-gray-200 text-gray-700"}`}
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="mood">Mood</option>
            </select>

            <div className="rounded-lg border overflow-hidden flex">
              <button
                onClick={() => setViewMode("list")}
                className={`px-3 py-2 ${viewMode === "list" ? "bg-indigo-500 text-white" : "bg-white text-gray-500"}`}
              >
                <List size={14} />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`px-3 py-2 ${viewMode === "grid" ? "bg-indigo-500 text-white" : "bg-white text-gray-500"}`}
              >
                <LayoutGrid size={14} />
              </button>
            </div>
          </div>

          <div className={`mt-3 text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
            {filteredEntries.length} entries found
          </div>

          {error && (
            <div className="mt-3 rounded-lg bg-red-100 text-red-700 px-4 py-3 border border-red-200">
              {error}
            </div>
          )}

          <div className={`mt-3 flex-1 min-w-0 overflow-y-auto overflow-x-hidden pr-1 ${viewMode === "grid" ? "grid grid-cols-1 lg:grid-cols-2 gap-3" : "space-y-3"}`}>
            {loading ? (
              <p className={theme === "dark" ? "text-gray-400" : "text-gray-500"}>Loading journal entries...</p>
            ) : filteredEntries.length === 0 ? (
              <p className={theme === "dark" ? "text-gray-400" : "text-gray-500"}>No journal entries match your filters.</p>
            ) : (
              filteredEntries.map((entry) => (
                <article
                  key={entry._id}
                  onClick={() => handleViewClick(entry)}
                  className={`rounded-xl border cursor-pointer p-4 transition hover:shadow-md ${theme === "dark" ? "bg-slate-950 border-slate-700" : "bg-white border-gray-200"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className={`text-lg font-semibold ${theme === "dark" ? "text-gray-100" : "text-gray-800"}`}>
                      {entry.title || "Untitled Entry"}
                    </h4>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleFavorite(entry);
                      }}
                      className={entry.isFavorite ? "text-amber-500" : "text-gray-400"}
                      title={entry.isFavorite ? "Unfavorite" : "Favorite"}
                    >
                      {entry.isFavorite ? <Star size={16} /> : <StarOff size={16} />}
                    </button>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className={`px-2 py-1 rounded-full font-semibold ${getMoodClass(entry.mood || "neutral")}`}>
                      {(entry.mood || "neutral").toUpperCase()}
                    </span>
                    <span className={theme === "dark" ? "text-gray-400" : "text-gray-500"}>{formatDate(entry.createdAt)}</span>
                    <span className={theme === "dark" ? "text-gray-500" : "text-gray-400"}>• {estimateReadTime(entry.content)} min read</span>
                  </div>

                  <p className={`mt-2 line-clamp-3 whitespace-pre-wrap ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                    {entry.content}
                  </p>

                  {entry.aiInsight?.summary && (
                    <p className={`mt-3 text-sm ${theme === "dark" ? "text-indigo-300" : "text-indigo-600"}`}>
                      <Sparkles size={14} className="inline mr-1" />
                      {entry.aiInsight.summary}
                    </p>
                  )}

                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        downloadJournalPdf(entry);
                      }}
                      className="p-2 rounded-lg text-gray-400 hover:text-emerald-500 hover:bg-emerald-50"
                      title="Download PDF"
                    >
                      <Download size={16} />
                    </button>

                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleEditClick(entry);
                      }}
                      className="p-2 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50"
                      title="Edit"
                    >
                      <Pencil size={16} />
                    </button>

                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleRefreshInsight(entry._id);
                      }}
                      disabled={refreshingInsightId === entry._id}
                      className="p-2 rounded-lg text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 disabled:opacity-60"
                      title="Refresh insight"
                    >
                      <RefreshCcw size={16} />
                    </button>

                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDelete(entry._id);
                      }}
                      className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>

        <aside className={`rounded-2xl border ${theme === "dark" ? "border-slate-700 bg-slate-900" : "border-gray-200 bg-white"} p-4 space-y-4 overflow-y-auto overflow-x-hidden min-w-0`}>
          <section className={`rounded-[18px] border p-4 shadow-[0_1px_0_rgba(15,23,42,0.03)] ${theme === "dark" ? "border-slate-700 bg-slate-950" : "border-gray-200 bg-white"}`}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">{calendarData.monthLabel}</h4>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}
                  className={`w-6 h-6 rounded flex items-center justify-center hover:bg-blue-100 ${theme === "dark" ? "hover:bg-blue-900" : ""}`}
                >
                  <ChevronLeft size={16} className="text-blue-500" />
                </button>
                <button
                  onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}
                  className={`w-6 h-6 rounded flex items-center justify-center hover:bg-blue-100 ${theme === "dark" ? "hover:bg-blue-900" : ""}`}
                >
                  <ChevronRight size={16} className="text-blue-500" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className={`font-semibold ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
              {calendarData.cells.map((cell) => {
                const cellDate = cell.isCurrentMonth ? new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), cell.day) : null;
                const isSelected = selectedDate && cellDate && getLocalDateString(cellDate) === getLocalDateString(selectedDate);
                return (
                  <button
                    key={cell.key}
                    onClick={() => cell.isCurrentMonth && handleDateClick(cell.day)}
                    disabled={!cell.isCurrentMonth}
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium disabled:cursor-default ${
                      isSelected
                        ? "bg-indigo-500 text-white"
                        : cell.isToday
                          ? "bg-blue-500 text-white"
                          : cell.isCurrentMonth
                            ? theme === "dark"
                              ? "text-gray-300 hover:bg-slate-800 cursor-pointer"
                              : "text-gray-900 hover:bg-gray-200 cursor-pointer"
                            : theme === "dark"
                              ? "text-gray-600"
                              : "text-gray-300"
                    }`}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>

            <button className={`mt-3 text-sm font-medium ${theme === "dark" ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"}`}>
              View Calendar
            </button>
          </section>

          <section
            role="button"
            tabIndex={0}
            onClick={() => setShowMoodModal(true)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setShowMoodModal(true);
              }
            }}
            className={`rounded-[18px] border p-4 shadow-[0_1px_0_rgba(15,23,42,0.03)] cursor-pointer ${theme === "dark" ? "border-slate-700 bg-slate-950" : "border-gray-200 bg-white"}`}
          >
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-[18px] leading-none">Mood</h4>
              <div className="relative">
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    setShowMoodDropdown(!showMoodDropdown);
                  }}
                  className={`inline-flex items-center gap-1 text-[15px] leading-none ${theme === "dark" ? "text-gray-300 hover:text-gray-100" : "text-gray-700 hover:text-gray-900"}`}
                >
                  {moodTimeRange === "week" ? "This Week" : "This Month"}
                  <ChevronDown size={14} />
                </button>
                {showMoodDropdown && (
                  <div
                    onClick={(event) => event.stopPropagation()}
                    className={`absolute right-0 mt-2 w-32 rounded-lg border shadow-lg z-10 ${theme === "dark" ? "border-slate-700 bg-slate-950" : "border-gray-200 bg-white"}`}
                  >
                    <button
                      onClick={() => {
                        setMoodTimeRange("week");
                        setShowMoodDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm rounded-t-lg ${moodTimeRange === "week" ? theme === "dark" ? "bg-slate-800" : "bg-blue-50" : ""} ${theme === "dark" ? "text-gray-300 hover:bg-slate-800" : "text-gray-700 hover:bg-gray-50"}`}
                    >
                      This Week
                    </button>
                    <button
                      onClick={() => {
                        setMoodTimeRange("month");
                        setShowMoodDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm rounded-b-lg ${moodTimeRange === "month" ? theme === "dark" ? "bg-slate-800" : "bg-blue-50" : ""} ${theme === "dark" ? "text-gray-300 hover:bg-slate-800" : "text-gray-700 hover:bg-gray-50"}`}
                    >
                      This Month
                    </button>
                  </div>
                )}
              </div>
            </div>

            {summaryLoading ? (
              <p className={theme === "dark" ? "text-gray-400 text-sm mt-4" : "text-gray-600 text-sm mt-4"}>Loading...</p>
            ) : (
              <div className="mt-4 flex flex-col items-center text-center">
                <div
                  className="relative h-[110px] w-[110px] rounded-full p-3"
                  style={{ background: `conic-gradient(${moodStats.ring})` }}
                >
                  <div className={`absolute inset-[22px] rounded-full flex items-center justify-center ${theme === "dark" ? "bg-slate-950" : "bg-white"}`}>
                    <Smile size={24} className="text-slate-500" />
                  </div>
                </div>

                <p className="text-xl font-bold mt-3 leading-tight">Mostly {moodStats.moodLabel}</p>
                <p className={theme === "dark" ? "text-gray-400 text-sm mt-1" : "text-gray-600 text-sm mt-1"}>
                  {moodStats.total > 0
                    ? `Based on your ${moodTimeRange === "week" ? "weekly" : "monthly"} entries`
                    : `No mood entries in this ${moodTimeRange}.`}
                </p>

                <div className="mt-3 w-full space-y-2">
                  {moodStats.legend.length > 0 ? moodStats.legend.map((item) => (
                    <div key={item.mood} className="flex items-center justify-center gap-2 text-sm">
                      <span className={`h-2 w-2 rounded-full ${MOOD_DOT_CLASSES[item.mood] || MOOD_DOT_CLASSES.neutral}`} />
                      <span className="capitalize">{item.mood}</span>
                      <span className={theme === "dark" ? "text-gray-400" : "text-gray-500"}>{item.percent}%</span>
                    </div>
                  )) : (
                    <div className={theme === "dark" ? "text-gray-400 text-sm" : "text-gray-500 text-sm"}>No mood data yet.</div>
                  )}
                </div>
              </div>
            )}
          </section>

          {showMoodModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-black/45"
                onClick={() => setShowMoodModal(false)}
              />
              <div
                className={`relative w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl border p-5 ${theme === "dark" ? "border-slate-700 bg-slate-900" : "border-gray-200 bg-white"}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-bold">
                      {moodTimeRange === "month" ? "Monthly Mood Progress" : "Weekly Mood Progress"}
                    </h3>
                    <p className={theme === "dark" ? "text-gray-400 text-sm" : "text-gray-500 text-sm"}>
                      {`${formatDayLabel(periodMoodDetails.rangeStart)} - ${formatDayLabel(
                        new Date(periodMoodDetails.rangeEnd.getTime() - 1)
                      )}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowMoodModal(false)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium ${theme === "dark" ? "bg-slate-800 text-gray-200 hover:bg-slate-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                  >
                    Close
                  </button>
                </div>

                <div className="mt-5 grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-5 items-start">
                  <div className={`sticky top-0 self-start rounded-xl border p-4 ${theme === "dark" ? "border-slate-700 bg-slate-950" : "border-gray-200 bg-gray-50"}`}>
                    <div
                      className="mx-auto relative h-[180px] w-[180px] rounded-full p-5"
                      style={{ background: `conic-gradient(${periodMoodDetails.ring})` }}
                    >
                      <div className={`absolute inset-[36px] rounded-full flex items-center justify-center ${theme === "dark" ? "bg-slate-950" : "bg-white"}`}>
                        <Smile size={30} className="text-slate-500" />
                      </div>
                    </div>
                    <p className="mt-4 text-center text-sm font-semibold">
                      {periodMoodDetails.total} mood-tagged entries this {moodTimeRange}
                    </p>
                    <div className="mt-3 space-y-2">
                      {periodMoodDetails.moodRows.length > 0 ? periodMoodDetails.moodRows.map((item) => (
                        <div key={item.mood} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${MOOD_DOT_CLASSES[item.mood] || MOOD_DOT_CLASSES.neutral}`} />
                            <span className="capitalize">{item.mood}</span>
                          </div>
                          <span className={theme === "dark" ? "text-gray-400" : "text-gray-500"}>
                            {item.count} ({item.percent}%)
                          </span>
                        </div>
                      )) : (
                        <p className={theme === "dark" ? "text-gray-400 text-sm" : "text-gray-500 text-sm"}>
                          {`No mood data this ${moodTimeRange}.`}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className={`max-h-[calc(90vh-140px)] overflow-y-auto rounded-xl border p-4 ${theme === "dark" ? "border-slate-700 bg-slate-950" : "border-gray-200 bg-gray-50"}`}>
                    <h4 className="font-semibold">{moodTimeRange === "month" ? "Date Breakdown" : "Daily Breakdown"}</h4>
                    <div className="mt-3 space-y-3">
                      {periodMoodDetails.dayBuckets.map((day) => (
                        <div
                          key={day.dayKey}
                          className={`rounded-lg border p-3 ${theme === "dark" ? "border-slate-700 bg-slate-900" : "border-gray-200 bg-white"}`}
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold">{day.dayLabel}</p>
                            <span className={theme === "dark" ? "text-xs text-gray-400" : "text-xs text-gray-500"}>
                              {day.entries.length} {day.entries.length === 1 ? "entry" : "entries"}
                            </span>
                          </div>

                          {day.entries.length > 0 ? (
                            <div className="mt-2 space-y-2">
                              {day.entries.map((entry) => (
                                <div key={entry._id} className="rounded-md border border-transparent p-2">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-sm font-medium truncate">{entry.title || "Untitled Entry"}</p>
                                    <span className={theme === "dark" ? "text-xs text-gray-400" : "text-xs text-gray-500"}>
                                      {formatTimeLabel(entry.createdAt)}
                                    </span>
                                  </div>
                                  <div className="mt-1 flex items-center gap-2">
                                    <span className={`h-2 w-2 rounded-full ${MOOD_DOT_CLASSES[String(entry.mood || "neutral").toLowerCase()] || MOOD_DOT_CLASSES.neutral}`} />
                                    <span className="text-xs capitalize">{entry.mood || "neutral"}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className={theme === "dark" ? "text-xs text-gray-400 mt-2" : "text-xs text-gray-500 mt-2"}>No journal entries.</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <section className={`rounded-[18px] border p-4 shadow-[0_1px_0_rgba(15,23,42,0.03)] ${theme === "dark" ? "border-slate-700 bg-slate-950" : "border-gray-200 bg-white"}`}>
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-[18px] leading-none">Your Streak</h4>
              <div className="flex items-center gap-1 text-amber-500">
                <Flame size={18} />
                <span className="text-xl font-bold">{summary?.streak || 0}</span>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-2 text-center mt-3">
              {weeklyActivity.map((day, index) => (
                <div key={`${day.label}-${index}`} className="flex flex-col items-center gap-1">
                  <span className={`text-[12px] ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>{day.label}</span>
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold ${day.count > 0 ? "bg-emerald-500 text-white" : theme === "dark" ? "bg-slate-800 text-slate-500" : "bg-slate-100 text-slate-400"}`}>
                    {day.count > 0 ? "✓" : ""}
                  </div>
                </div>
              ))}
            </div>
            <p className={theme === "dark" ? "text-gray-400 text-sm mt-3" : "text-gray-600 text-sm mt-3"}>
              Keep it going! You&apos;re doing great.
            </p>
          </section>

          <section className={`rounded-[18px] border p-4 shadow-[0_1px_0_rgba(15,23,42,0.03)] ${theme === "dark" ? "border-slate-700 bg-slate-950" : "border-gray-200 bg-white"}`}>
            <div className="flex items-start justify-between gap-3">
              <h4 className="font-semibold text-[18px] leading-none">AI Insights</h4>
              <div className="relative">
                <button
                  onClick={() => setShowInsightDropdown(!showInsightDropdown)}
                  className={`inline-flex items-center gap-1 text-[15px] leading-none ${theme === "dark" ? "text-gray-300 hover:text-gray-100" : "text-gray-700 hover:text-gray-900"}`}
                >
                  {insightTimeRange === "week" ? "This Week" : "This Month"}
                  <ChevronDown size={14} />
                </button>
                {showInsightDropdown && (
                  <div className={`absolute right-0 mt-2 w-32 rounded-lg border shadow-lg z-10 ${theme === "dark" ? "border-slate-700 bg-slate-950" : "border-gray-200 bg-white"}`}>
                    <button
                      onClick={() => {
                        setInsightTimeRange("week");
                        setShowInsightDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm rounded-t-lg ${insightTimeRange === "week" ? theme === "dark" ? "bg-slate-800" : "bg-blue-50" : ""} ${theme === "dark" ? "text-gray-300 hover:bg-slate-800" : "text-gray-700 hover:bg-gray-50"}`}
                    >
                      This Week
                    </button>
                    <button
                      onClick={() => {
                        setInsightTimeRange("month");
                        setShowInsightDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm rounded-b-lg ${insightTimeRange === "month" ? theme === "dark" ? "bg-slate-800" : "bg-blue-50" : ""} ${theme === "dark" ? "text-gray-300 hover:bg-slate-800" : "text-gray-700 hover:bg-gray-50"}`}
                    >
                      This Month
                    </button>
                  </div>
                )}
              </div>
            </div>
            <p className={theme === "dark" ? "text-gray-300 text-[15px] mt-4 leading-relaxed break-words" : "text-gray-700 text-[15px] mt-4 leading-relaxed break-words"}>
              {summary?.periodInsight || "You write most often in the evening and your mood is trending positively. Great job staying consistent!"}
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default Journal;
