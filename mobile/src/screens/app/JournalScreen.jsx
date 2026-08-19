import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useFocusEffect } from "@react-navigation/native";
import journalApi from "../../api/journalApi";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { FreePlanJournalScreen } from "./FreePlanJournalScreen";

// ─── Constants ───────────────────────────────────────────────────────────────

const MOOD_OPTIONS = [
  "all", "happy", "grateful", "hopeful", "calm", "excited",
  "stressed", "anxious", "overwhelmed", "sad", "lonely",
  "tired", "angry", "depressed", "neutral",
];

const MOOD_STYLE_MAP = {
  happy: { backgroundColor: "#D1FAE5", color: "#047857" },
  grateful: { backgroundColor: "#DCFCE7", color: "#166534" },
  hopeful: { backgroundColor: "#DBEAFE", color: "#1D4ED8" },
  calm: { backgroundColor: "#E0E7FF", color: "#4338CA" },
  excited: { backgroundColor: "#FEF3C7", color: "#B45309" },
  stressed: { backgroundColor: "#FFE4E6", color: "#BE123C" },
  anxious: { backgroundColor: "#FFEDD5", color: "#C2410C" },
  overwhelmed: { backgroundColor: "#FEE2E2", color: "#B91C1C" },
  sad: { backgroundColor: "#E0E7FF", color: "#4338CA" },
  lonely: { backgroundColor: "#DBEAFE", color: "#1D4ED8" },
  tired: { backgroundColor: "#E2E8F0", color: "#475569" },
  angry: { backgroundColor: "#FFEDD5", color: "#C2410C" },
  depressed: { backgroundColor: "#F3E8FF", color: "#7E22CE" },
  neutral: { backgroundColor: "#E5E7EB", color: "#4B5563" },
};

const SORT_OPTIONS = [
  { key: "newest", label: "Newest" },
  { key: "oldest", label: "Oldest" },
  { key: "mood", label: "Mood" },
];

const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Returns "YYYY-MM-DD" in local time — mirrors web getLocalDateString()
const getLocalDateString = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

// Mirrors web buildJournalFilename() — safe kebab-case title + date
const buildJournalFilename = (title, dateString) => {
  const safeTitle = (title || "journal-entry")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${safeTitle || "journal-entry"}-${dateString || getLocalDateString()}.pdf`;
};

const formatDate = (dateString) => {
  if (!dateString) return "Just now";
  return new Date(dateString).toLocaleDateString(undefined, {
    month: "short", day: "numeric", year: "numeric",
  });
};

const _today = new Date();
const formatShortDate = (date) => {
  if (!date) return "";
  if (
    date.getFullYear() === _today.getFullYear() &&
    date.getMonth() === _today.getMonth() &&
    date.getDate() === _today.getDate()
  ) return "Today";
  return `${MONTH_NAMES[date.getMonth()].slice(0, 3)} ${date.getDate()}`;
};

const estimateReadTime = (content) => {
  const words = String(content || "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200)) || 1;
};

const getMoodStyle = (mood) =>
  MOOD_STYLE_MAP[String(mood || "neutral").toLowerCase()] || MOOD_STYLE_MAP.neutral;

const isSameDay = (d1, d2) =>
  d1.getFullYear() === d2.getFullYear() &&
  d1.getMonth() === d2.getMonth() &&
  d1.getDate() === d2.getDate();

// Returns true when an entry's createdAt falls on today's local calendar date.
const isCreatedToday = (isoString) => {
  if (!isoString) return false;
  const entry = new Date(isoString);
  const now = new Date();
  return isSameDay(entry, now);
};

const buildJournalHtml = (entry) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: Georgia, serif; padding: 40px 48px; color: #0F172A; max-width: 700px; margin: 0 auto; line-height: 1.7; }
    h1 { font-size: 28px; margin-bottom: 6px; }
    .meta { font-size: 13px; color: #64748B; margin-bottom: 20px; }
    .mood-badge { display:inline-block; background:#DBEAFE; color:#1D4ED8; border-radius:999px; padding:3px 12px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:20px; }
    hr { border:none; border-top:1px solid #E2E8F0; margin:24px 0; }
    .content { font-size:15px; white-space:pre-wrap; }
    .insight { margin-top:28px; background:#F0F9FF; border-left:4px solid #2563EB; padding:14px 18px; border-radius:6px; font-size:13px; color:#1E40AF; font-style:italic; }
    .insight-label { font-weight:700; font-style:normal; margin-bottom:6px; display:block; }
    .footer { margin-top:40px; font-size:11px; color:#94A3B8; text-align:center; }
  </style>
</head>
<body>
  <h1>${entry?.title || "Untitled Entry"}</h1>
  <div class="meta">${formatDate(entry?.createdAt)} &nbsp;·&nbsp; ${estimateReadTime(entry?.content)} min read</div>
  ${entry?.mood ? `<span class="mood-badge">${String(entry.mood).toUpperCase()}</span>` : ""}
  <hr />
  <div class="content">${String(entry?.content || "No content.").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
  ${entry?.aiInsight?.summary
    ? `<div class="insight"><span class="insight-label">✦ AI Insight</span>${String(entry.aiInsight.summary).replace(/</g, "&lt;")}</div>`
    : ""}
  <div class="footer">Generated by SeraniAI · ${new Date().toLocaleDateString()}</div>
</body>
</html>
`;

// ─── Sub-components ───────────────────────────────────────────────────────────

const LockedCard = ({ colors, styles }) => (
  <View style={[styles.lockCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <View style={[styles.lockIcon, { backgroundColor: colors.inputBg }]}>
      <Feather name="lock" size={22} color={colors.primary} />
    </View>
    <Text style={[styles.lockTitle, { color: colors.text }]}>Journal is a paid feature</Text>
    <Text style={[styles.lockCopy, { color: colors.muted }]}>
      Your journal unlocks for Pro and enterprise users.
    </Text>
  </View>
);

// ── Mood Picker Modal ─────────────────────────────────────────────────────────
const MoodModal = ({ visible, selectedMood, onSelect, onClose, colors, styles }) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
      <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
        <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
        <Text style={[styles.modalTitle, { color: colors.text }]}>Filter by Mood</Text>
        <View style={styles.modalGrid}>
          {MOOD_OPTIONS.map((mood) => {
            const active = selectedMood === mood;
            const mStyle = getMoodStyle(mood);
            return (
              <TouchableOpacity
                key={mood}
                style={[
                  styles.modalMoodPill,
                  active
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : { backgroundColor: mStyle.backgroundColor, borderColor: "transparent" },
                ]}
                onPress={() => { onSelect(mood); onClose(); }}
              >
                <Text style={[styles.modalMoodText, { color: active ? "#FFFFFF" : mStyle.color }]}>
                  {mood === "all" ? "All Moods" : mood}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </TouchableOpacity>
  </Modal>
);

// ── Calendar Modal — 42-cell grid matching web sidebar ────────────────────────
const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const CalendarModal = ({ visible, selectedDate, onSelect, onClose, colors, styles, sp, wp, hp }) => {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  // Sync view to the selected date or today whenever modal opens
  React.useEffect(() => {
    if (visible) {
      const base = selectedDate || today;
      setViewYear(base.getFullYear());
      setViewMonth(base.getMonth());
    }
  }, [visible]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  // Build 42-cell grid (6 rows × 7 cols) — mirrors web calendarData
  const cells = useMemo(() => {
    const monthStart = new Date(viewYear, viewMonth, 1);
    const monthEnd = new Date(viewYear, viewMonth + 1, 0);
    const firstWkday = monthStart.getDay();        // 0 = Sun
    const daysInMonth = monthEnd.getDate();
    const prevEnd = new Date(viewYear, viewMonth, 0).getDate();
    const result = [];
    for (let i = 0; i < 42; i++) {
      let day, isCurrent = true;
      if (i < firstWkday) {
        day = prevEnd - firstWkday + i + 1; isCurrent = false;
      } else if (i >= firstWkday + daysInMonth) {
        day = i - (firstWkday + daysInMonth) + 1; isCurrent = false;
      } else {
        day = i - firstWkday + 1;
      }
      const cellDate = isCurrent ? new Date(viewYear, viewMonth, day) : null;
      const isToday = !!cellDate && isSameDay(cellDate, today);
      const isSelected = !!cellDate && !!selectedDate && isSameDay(cellDate, selectedDate);
      result.push({ day, isCurrent, isToday, isSelected, cellDate, key: `${i}-${day}` });
    }
    return result;
  }, [viewYear, viewMonth, selectedDate]);

  const monthLabel = `${MONTH_NAMES[viewMonth]} ${viewYear}`;

  const handleSelectDay = (cell) => {
    if (!cell.isCurrent) return;
    onSelect(cell.cellDate);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity
          activeOpacity={1}
          style={[styles.calendarSheet, { backgroundColor: colors.surface }]}
        >
          {/* Drag handle */}
          <View style={[styles.modalHandle, { backgroundColor: colors.border, alignSelf: "center" }]} />

          {/* Month navigation — matches web: label left, arrows right */}
          <View style={styles.calendarHeader}>
            <Text style={[styles.calMonthTitle, { color: colors.text }]}>{monthLabel}</Text>
            <View style={styles.calNavRow}>
              <TouchableOpacity onPress={prevMonth} style={styles.calNavBtn}>
                <Feather name="chevron-left" size={sp(18)} color="#3B82F6" />
              </TouchableOpacity>
              <TouchableOpacity onPress={nextMonth} style={styles.calNavBtn}>
                <Feather name="chevron-right" size={sp(18)} color="#3B82F6" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Day-of-week headers: Sun Mon Tue Wed Thu Fri Sat */}
          <View style={styles.calDayRow}>
            {DAY_HEADERS.map((d) => (
              <Text key={d} style={[styles.calDayLabel, { color: colors.muted }]}>{d}</Text>
            ))}
          </View>

          {/* 42-cell grid */}
          <View style={styles.calGrid}>
            {cells.map((cell) => {
              const cellBg = cell.isSelected
                ? "#6366F1"   // indigo-500 (selected)
                : cell.isToday
                  ? "#3B82F6"   // blue-500 (today)
                  : "transparent";
              const cellTextColor = (cell.isSelected || cell.isToday)
                ? "#FFFFFF"
                : cell.isCurrent
                  ? colors.text
                  : colors.muted;
              return (
                <TouchableOpacity
                  key={cell.key}
                  style={[
                    styles.calCell,
                    { backgroundColor: cellBg, borderRadius: sp(14) },
                  ]}
                  onPress={() => handleSelectDay(cell)}
                  disabled={!cell.isCurrent}
                  activeOpacity={cell.isCurrent ? 0.7 : 1}
                >
                  <Text
                    style={[
                      styles.calCellText,
                      { color: cellTextColor, opacity: cell.isCurrent ? 1 : 0.35 },
                    ]}
                  >
                    {cell.day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Actions */}
          <View style={styles.calActions}>
            {/* Back to Today — resets filter to today's date */}
            <TouchableOpacity
              style={[styles.calTodayBtn, { backgroundColor: "#EEF2FF" }]}
              onPress={() => {
                onSelect(new Date()); // reset to today, not null
                onClose();
              }}
            >
              <Feather name="arrow-left" size={sp(12)} color="#6366F1" />
              <Text style={[styles.calTodayText, { color: "#6366F1" }]}>Back to Today</Text>
            </TouchableOpacity>

            {/* Cancel — close without changing */}
            <TouchableOpacity
              style={[styles.calCancelBtn, { backgroundColor: colors.inputBg }]}
              onPress={onClose}
            >
              <Text style={[styles.calCancelText, { color: colors.muted }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export const JournalScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  // Route free-plan users (role === "user") to the simplified journal experience.
  if (user?.role === "user") {
    return <FreePlanJournalScreen />;
  }

  const isPaidUser = true; // Pro / Enterprise / Admin always get the full screen

  // Responsive scale helpers
  const BASE = 390;
  const sp = useCallback((size) => Math.round(size * (width / BASE)), [width]);
  const wp = useCallback((pct) => (width * pct) / 100, [width]);
  const hp = useCallback((pct) => (height * pct) / 100, [height]);

  const styles = useMemo(() => makeStyles(sp, wp, hp, colors), [width, height, colors]);

  // ── State
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [searchText, setSearchText] = useState("");
  const [selectedMood, setSelectedMood] = useState("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sortBy, setSortBy] = useState("newest");
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [downloadingId, setDownloadingId] = useState("");
  const [moodModalVisible, setMoodModalVisible] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calendarDate, setCalendarDate] = useState(null); // null = no filter

  // ── Data fetching
  const loadJournalData = useCallback(async ({ showRefreshing = false } = {}) => {
    if (!isPaidUser) { setLoading(false); setRefreshing(false); return; }
    try {
      setError("");
      if (showRefreshing) setRefreshing(true);
      else setLoading(true);
      const [journalsResponse, summaryResponse] = await Promise.all([
        journalApi.getJournals(),
        journalApi.getJournalSummary(),
      ]);
      setEntries(Array.isArray(journalsResponse.journals) ? journalsResponse.journals : []);
      setSummary(summaryResponse.summary || null);
    } catch (fetchError) {
      setError(fetchError.response?.data?.message || "Failed to load journal data.");
      setEntries([]); setSummary(null);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, [isPaidUser]);

  useFocusEffect(useCallback(() => { loadJournalData(); }, [loadJournalData]));

  // ── Filtering
  const filteredEntries = useMemo(() => {
    const lowerSearch = searchText.trim().toLowerCase();
    const list = entries.filter((entry) => {
      if (favoritesOnly && !entry.isFavorite) return false;
      if (selectedMood !== "all") {
        if (String(entry.mood || "neutral").toLowerCase() !== selectedMood) return false;
      }
      if (calendarDate) {
        const entryDate = new Date(entry.createdAt);
        if (!isSameDay(entryDate, calendarDate)) return false;
      }
      if (lowerSearch) {
        const haystack = [entry.title, entry.content, entry.mood, ...(entry.tags || [])]
          .join(" ").toLowerCase();
        if (!haystack.includes(lowerSearch)) return false;
      }
      return true;
    });
    return [...list].sort((a, b) => {
      const tA = new Date(a.createdAt).getTime();
      const tB = new Date(b.createdAt).getTime();
      if (sortBy === "oldest") return tA - tB;
      if (sortBy === "mood") return String(a.mood || "").localeCompare(String(b.mood || ""));
      return tB - tA;
    });
  }, [entries, favoritesOnly, searchText, selectedMood, sortBy, calendarDate]);

  // ── Actions
  const handleDelete = (entry) => {
    Alert.alert("Delete journal entry", `Delete "${entry.title || "this entry"}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try {
            setActionLoadingId(entry._id);
            await journalApi.deleteJournal(entry._id);
            await loadJournalData({ showRefreshing: true });
          } catch (deleteError) {
            setError(deleteError.response?.data?.message || "Failed to delete entry.");
          } finally { setActionLoadingId(""); }
        },
      },
    ]);
  };

  const handleToggleFavorite = async (entry) => {
    try {
      setActionLoadingId(entry._id);
      const response = await journalApi.updateJournal(entry._id, { isFavorite: !entry.isFavorite });
      if (response?.journal) {
        setEntries((prev) => prev.map((item) => (item._id === entry._id ? response.journal : item)));
      }
      await loadJournalData({ showRefreshing: true });
    } catch (favoriteError) {
      setError(favoriteError.response?.data?.message || "Failed to update favorite.");
    } finally { setActionLoadingId(""); }
  };

  const handleRefreshInsight = async (entry) => {
    try {
      setActionLoadingId(entry._id);
      const response = await journalApi.refreshInsight(entry._id);
      if (response?.journal) {
        setEntries((prev) => prev.map((item) => (item._id === entry._id ? response.journal : item)));
      }
      await loadJournalData({ showRefreshing: true });
    } catch (refreshError) {
      setError(refreshError.response?.data?.message || "Failed to refresh insight.");
    } finally { setActionLoadingId(""); }
  };

  const handleDownloadPDF = async (entry) => {
    try {
      setDownloadingId(entry._id);
      const html = buildJournalHtml(entry);
      const { uri } = await Print.printToFileAsync({ html });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        // Filename mirrors web: safe-kebab-title-YYYY-MM-DD.pdf
        const filename = buildJournalFilename(
          entry.title,
          entry.createdAt ? getLocalDateString(new Date(entry.createdAt)) : getLocalDateString()
        );
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: filename,
          UTI: "com.adobe.pdf",
        });
      } else {
        Alert.alert("Not available", "Sharing is not available on this device.");
      }
    } catch (pdfError) {
      Alert.alert("Error", "Failed to generate PDF.");
    } finally { setDownloadingId(""); }
  };

  // ── Sort cycle
  const cycleSortBy = () => {
    setSortBy((current) => {
      const idx = SORT_OPTIONS.findIndex((o) => o.key === current);
      return SORT_OPTIONS[(idx + 1) % SORT_OPTIONS.length].key;
    });
  };
  const currentSortLabel = SORT_OPTIONS.find((o) => o.key === sortBy)?.label ?? "Newest";

  // ── Entry card renderer
  const renderEntry = ({ item }) => {
    const moodStyle = getMoodStyle(item.mood);
    const isLoading = actionLoadingId === item._id;
    const isDownloading = downloadingId === item._id;

    return (
      <TouchableOpacity
        style={[styles.entryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => navigation.navigate("JournalEditor", { mode: "view", entry: item })}
        activeOpacity={0.85}
      >
        {/* Header row */}
        <View style={styles.entryHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.entryTitle, { color: colors.text }]} numberOfLines={1}>
              {item.title || "Untitled Entry"}
            </Text>
            <View style={styles.metaRow}>
              <Text style={[styles.metaText, { color: colors.muted }]}>{formatDate(item.createdAt)}</Text>
              <Text style={[styles.metaDot, { color: colors.muted }]}> • </Text>
              <Text style={[styles.metaText, { color: colors.muted }]}>
                {estimateReadTime(item.content)} min read
              </Text>
            </View>
          </View>

          {/* Favourite icon */}
          <TouchableOpacity onPress={() => handleToggleFavorite(item)} style={styles.iconBtn} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Feather name="star" size={sp(18)} color={item.isFavorite ? "#F59E0B" : colors.muted} />
            )}
          </TouchableOpacity>
        </View>

        {/* Mood badge only (no tag chips) */}
        <View style={styles.moodRow}>
          <View style={[styles.moodChip, { backgroundColor: moodStyle.backgroundColor }]}>
            <Text style={[styles.moodChipText, { color: moodStyle.color }]}>
              {String(item.mood || "neutral").toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Content preview */}
        <Text style={[styles.entryContent, { color: colors.muted }]} numberOfLines={3}>
          {item.content || "No content yet."}
        </Text>

        {/* AI insight box */}
        {!!item.aiInsight?.summary && (
          <View style={[styles.insightBox, { backgroundColor: colors.inputBg }]}>
            <Feather name="help-circle" size={sp(14)} color={colors.primary} />
            <Text style={[styles.insightText, { color: colors.text }]} numberOfLines={2}>
              {item.aiInsight.summary}
            </Text>
          </View>
        )}

        {/* Icon-only action row: Edit · Refresh · Download · Delete */}
        <View style={styles.actionRow}>
          {isCreatedToday(item.createdAt) && (
            <TouchableOpacity
              style={[styles.actionIcon, { backgroundColor: colors.inputBg }]}
              onPress={() => navigation.navigate("JournalEditor", { mode: "edit", entry: item })}
              disabled={isLoading}
            >
              <Feather name="edit-2" size={sp(14)} color={colors.primary} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionIcon, { backgroundColor: colors.inputBg }]}
            onPress={() => handleRefreshInsight(item)}
            disabled={isLoading}
          >
            <Feather name="refresh-cw" size={sp(14)} color={colors.primary} />
          </TouchableOpacity>

          {/* Download */}
          <TouchableOpacity
            style={[styles.actionIcon, { backgroundColor: "#EFF6FF" }]}
            onPress={() => handleDownloadPDF(item)}
            disabled={isDownloading || isLoading}
          >
            {isDownloading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Feather name="download" size={sp(14)} color={colors.primary} />
            )}
          </TouchableOpacity>

          {/* Delete */}
          <TouchableOpacity
            style={[styles.actionIcon, { backgroundColor: "#FEE2E2" }]}
            onPress={() => handleDelete(item)}
            disabled={isLoading}
          >
            <Feather name="trash-2" size={sp(14)} color="#DC2626" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };



  // ─── Paid view ───────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Hero ── */}
      <View style={[styles.hero, { backgroundColor: "#0F172A" }]}>
        <Text style={styles.heroTitle}>Journal</Text>
        <Text style={[styles.heroSubtitle, { color: "#93C5FD" }]}>
          Capture entries, explore insights, and revisit AI reflections.
        </Text>

        <View style={styles.heroActions}>
          {/* Insights pill */}
          <TouchableOpacity
            style={[styles.quickPill, { backgroundColor: colors.surface }]}
            onPress={() => navigation.navigate("JournalInsights")}
          >
            <Feather name="bar-chart-2" size={sp(15)} color={colors.primary} />
            <Text style={[styles.quickPillText, { color: colors.text }]}>Insights</Text>
          </TouchableOpacity>

          {/* Mood pill */}
          <TouchableOpacity
            style={[styles.quickPill, { backgroundColor: colors.surface }]}
            onPress={() => navigation.navigate("JournalMoodPie", { entries })}
          >
            <Feather name="pie-chart" size={sp(15)} color={colors.primary} />
            <Text style={[styles.quickPillText, { color: colors.text }]}>Mood</Text>
          </TouchableOpacity>

          {/* Streak badge */}
          <View style={[styles.streakCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.streakLabel, { color: colors.muted }]}>Current streak</Text>
            <View style={styles.streakRow}>
              <Text style={[styles.streakValue, { color: colors.text }]}>
                {summary?.streak ?? 0} days
              </Text>
              <Feather name="zap" size={sp(16)} color="#F59E0B" />
            </View>
          </View>
        </View>
      </View>

      {/* ── List ── */}
      <FlatList
        data={filteredEntries}
        keyExtractor={(item) => item._id}
        renderItem={renderEntry}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadJournalData({ showRefreshing: true })}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={(
          <View>
            {/* Search bar */}
            <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Feather name="search" size={sp(16)} color={colors.muted} />
              <TextInput
                value={searchText}
                onChangeText={setSearchText}
                placeholder="Search title, content, or mood..."
                placeholderTextColor={colors.muted}
                style={[styles.searchInput, { color: colors.text }]}
              />
              {!!searchText && (
                <TouchableOpacity onPress={() => setSearchText("")}>
                  <Feather name="x" size={sp(16)} color={colors.muted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Filter bar */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterBar}>

              {/* Favorites */}
              <TouchableOpacity
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: favoritesOnly ? colors.primary : colors.surface,
                    borderColor: favoritesOnly ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setFavoritesOnly((prev) => !prev)}
              >
                <Feather name="star" size={sp(13)} color={favoritesOnly ? "#FFFFFF" : colors.muted} />
                <Text style={[styles.filterPillText, { color: favoritesOnly ? "#FFFFFF" : colors.muted }]}>
                  Favorites
                </Text>
              </TouchableOpacity>

              {/* Sort */}
              <TouchableOpacity
                style={[styles.filterPill, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={cycleSortBy}
              >
                <Feather name="sliders" size={sp(13)} color={colors.muted} />
                <Text style={[styles.filterPillText, { color: colors.muted }]}>{currentSortLabel}</Text>
                <Feather name="chevron-down" size={sp(12)} color={colors.muted} />
              </TouchableOpacity>

              {/* Mood */}
              <TouchableOpacity
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: selectedMood !== "all" ? colors.primary : colors.surface,
                    borderColor: selectedMood !== "all" ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setMoodModalVisible(true)}
              >
                <Text style={[styles.filterPillText, { color: selectedMood !== "all" ? "#FFFFFF" : colors.muted }]}>
                  {selectedMood === "all" ? "All Moods" : selectedMood}
                </Text>
                <Feather
                  name="chevron-down"
                  size={sp(12)}
                  color={selectedMood !== "all" ? "#FFFFFF" : colors.muted}
                />
              </TouchableOpacity>

              {/* Date calendar pill */}
              <TouchableOpacity
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: calendarDate ? colors.primary : colors.surface,
                    borderColor: calendarDate ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setCalendarVisible(true)}
              >
                <Feather name="calendar" size={sp(13)} color={calendarDate ? "#FFFFFF" : colors.muted} />
                <Text style={[styles.filterPillText, { color: calendarDate ? "#FFFFFF" : colors.muted }]}>
                  {calendarDate ? formatShortDate(calendarDate) : "Date"}
                </Text>
                {calendarDate && (
                  <TouchableOpacity
                    hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                    onPress={() => setCalendarDate(null)}
                  >
                    <Feather name="x" size={sp(12)} color="#FFFFFF" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            </ScrollView>

            {/* Entries header */}
            <View style={styles.entriesHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={[styles.entriesTitle, { color: colors.text }]}>Entries</Text>
                {/* "Return to all" when calendar filter is active */}
                {!!calendarDate && (
                  <TouchableOpacity
                    style={[styles.clearDateBtn, { backgroundColor: colors.inputBg }]}
                    onPress={() => setCalendarDate(null)}
                  >
                    <Feather name="arrow-left" size={sp(12)} color={colors.muted} />
                    <Text style={[styles.clearDateText, { color: colors.muted }]}>All entries</Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text style={[styles.entriesCount, { color: colors.muted }]}>
                {filteredEntries.length} found
              </Text>
            </View>

            {/* Error */}
            {!!error && (
              <View style={[styles.errorBox, { backgroundColor: colors.warningBg, borderColor: colors.warningBorder }]}>
                <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={(
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {loading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Feather name="book-open" size={sp(26)} color={colors.muted} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  {calendarDate ? `No entries on ${formatShortDate(calendarDate)}` : "No matching entries"}
                </Text>
                <Text style={[styles.emptyCopy, { color: colors.muted }]}>
                  {calendarDate
                    ? "Try a different date or tap 'All entries' to see everything."
                    : "Try a different search or create a new entry."}
                </Text>
              </>
            )}
          </View>
        )}
      />

      {/* ── FAB (lowered) ── */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate("JournalEditor", { mode: "add" })}
        activeOpacity={0.85}
      >
        <Feather name="plus" size={sp(24)} color="#FFFFFF" />
      </TouchableOpacity>

      {/* ── Mood Modal ── */}
      <MoodModal
        visible={moodModalVisible}
        selectedMood={selectedMood}
        onSelect={setSelectedMood}
        onClose={() => setMoodModalVisible(false)}
        colors={colors}
        styles={styles}
      />

      {/* ── Calendar Modal ── */}
      <CalendarModal
        visible={calendarVisible}
        selectedDate={calendarDate}
        onSelect={setCalendarDate}
        onClose={() => setCalendarVisible(false)}
        colors={colors}
        styles={styles}
        sp={sp}
        wp={wp}
        hp={hp}
      />
    </View>
  );
};

// ─── Responsive StyleSheet factory ───────────────────────────────────────────

const makeStyles = (sp, wp, hp, colors) =>
  StyleSheet.create({
    container: { flex: 1 },

    // ── Hero
    hero: {
      paddingHorizontal: wp(5),
      paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight || 24) + 12 : hp(7),
      paddingBottom: hp(2.5),
      borderBottomLeftRadius: 28,
      borderBottomRightRadius: 28,
    },
    heroTitle: { fontSize: sp(28), fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.5 },
    heroSubtitle: { marginTop: 4, fontSize: sp(13), lineHeight: sp(19) },
    heroActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: wp(2.5),
      marginTop: hp(1.8),
      flexWrap: "wrap",
    },

    // ── Quick pills
    quickPill: {
      flexDirection: "row", alignItems: "center", gap: 6,
      borderRadius: 999,
      paddingHorizontal: wp(4), paddingVertical: hp(1),
      shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
    },
    quickPillText: { fontSize: sp(13), fontWeight: "700" },

    // ── Streak
    streakCard: {
      borderRadius: 14,
      paddingHorizontal: wp(3.5), paddingVertical: hp(0.9),
      marginLeft: "auto",
      shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
    },
    streakLabel: { fontSize: sp(10), fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
    streakRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
    streakValue: { fontSize: sp(16), fontWeight: "800" },

    // ── List
    listContent: {
      paddingHorizontal: wp(4.5),
      paddingTop: hp(2),
      paddingBottom: hp(14),
    },

    // ── Search
    searchBox: {
      flexDirection: "row", alignItems: "center", gap: 10,
      borderWidth: 1, borderRadius: 16,
      paddingHorizontal: wp(4), paddingVertical: hp(1.6),
    },
    searchInput: { flex: 1, fontSize: sp(14), padding: 0 },

    // ── Filter bar
    filterBar: {
      flexDirection: "row", gap: wp(2),
      marginTop: hp(1.5), paddingRight: wp(2),
    },
    filterPill: {
      flexDirection: "row", alignItems: "center", gap: 5,
      borderWidth: 1, borderRadius: 999,
      paddingHorizontal: wp(3.5), paddingVertical: hp(0.9),
    },
    filterPillText: { fontSize: sp(12), fontWeight: "700", textTransform: "capitalize" },

    // ── Entries header
    entriesHeader: {
      flexDirection: "row", justifyContent: "space-between", alignItems: "center",
      marginTop: hp(2), marginBottom: hp(0.5),
    },
    entriesTitle: { fontSize: sp(16), fontWeight: "800" },
    entriesCount: { fontSize: sp(12), fontWeight: "600" },
    clearDateBtn: {
      flexDirection: "row", alignItems: "center", gap: 4,
      borderRadius: 999, paddingHorizontal: wp(2.5), paddingVertical: 4,
    },
    clearDateText: { fontSize: sp(11), fontWeight: "700" },

    // ── Error
    errorBox: {
      borderWidth: 1, borderRadius: 14,
      padding: wp(4), marginTop: hp(1.5),
    },
    errorText: { fontSize: sp(13), fontWeight: "600" },

    // ── Entry card
    entryCard: {
      borderWidth: 1, borderRadius: 20,
      padding: wp(4), marginTop: hp(1.5),
      shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
    },
    entryHeader: {
      flexDirection: "row", alignItems: "flex-start",
      justifyContent: "space-between", gap: 10,
    },
    entryTitle: { fontSize: sp(17), fontWeight: "800", letterSpacing: -0.2 },
    metaRow: { flexDirection: "row", alignItems: "center", marginTop: 4, flexWrap: "wrap" },
    metaText: { fontSize: sp(12), fontWeight: "500" },
    metaDot: { fontSize: sp(12) },
    iconBtn: {
      width: sp(34), height: sp(34), borderRadius: sp(17),
      alignItems: "center", justifyContent: "center",
    },
    moodRow: { flexDirection: "row", marginTop: hp(1) },
    moodChip: { borderRadius: 999, paddingHorizontal: wp(2.5), paddingVertical: 4 },
    moodChipText: { fontSize: sp(10), fontWeight: "800", letterSpacing: 0.5 },
    entryContent: { marginTop: hp(1), fontSize: sp(13), lineHeight: sp(20) },
    insightBox: {
      flexDirection: "row", alignItems: "flex-start", gap: 8,
      borderRadius: 12, padding: wp(3), marginTop: hp(1),
    },
    insightText: { flex: 1, fontSize: sp(12), lineHeight: sp(18), fontStyle: "italic" },

    // ── Action row (icon-only)
    actionRow: { flexDirection: "row", gap: wp(2), marginTop: hp(1.2) },
    actionIcon: {
      width: sp(34), height: sp(34), borderRadius: sp(17),
      alignItems: "center", justifyContent: "center",
    },

    // ── FAB — lowered to just above tab bar
    fab: {
      position: "absolute",
      bottom: hp(3.5),
      right: wp(5),
      width: sp(56), height: sp(56), borderRadius: sp(28),
      alignItems: "center", justifyContent: "center",
      shadowColor: "#2563EB",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35, shadowRadius: 10, elevation: 8,
    },

    // ── Empty
    emptyCard: {
      borderWidth: 1, borderRadius: 20,
      alignItems: "center", justifyContent: "center",
      padding: wp(6), marginTop: hp(2), minHeight: hp(18),
    },
    emptyTitle: { marginTop: hp(1.5), fontSize: sp(16), fontWeight: "800" },
    emptyCopy: { marginTop: 6, fontSize: sp(13), textAlign: "center", lineHeight: sp(19) },

    // ── Lock
    lockWrapper: { padding: wp(4.5) },
    lockCard: { borderWidth: 1, borderRadius: 20, padding: wp(5), alignItems: "center" },
    lockIcon: {
      width: sp(52), height: sp(52), borderRadius: sp(26),
      alignItems: "center", justifyContent: "center", marginBottom: hp(1.5),
    },
    lockTitle: { fontSize: sp(18), fontWeight: "800", textAlign: "center" },
    lockCopy: { marginTop: 8, fontSize: sp(13), textAlign: "center", lineHeight: sp(19) },

    // ── Mood Modal
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
    modalSheet: {
      borderTopLeftRadius: 28, borderTopRightRadius: 28,
      paddingHorizontal: wp(5), paddingTop: hp(1.5), paddingBottom: hp(5),
      shadowColor: "#000", shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.15, shadowRadius: 12, elevation: 20,
    },
    modalHandle: {
      width: 40, height: 4, borderRadius: 2,
      alignSelf: "center", marginBottom: hp(2),
    },
    modalTitle: { fontSize: sp(18), fontWeight: "800", marginBottom: hp(2) },
    modalGrid: { flexDirection: "row", flexWrap: "wrap", gap: wp(2) },
    modalMoodPill: { borderRadius: 999, paddingHorizontal: wp(3.5), paddingVertical: hp(0.9), borderWidth: 1.5 },
    modalMoodText: { fontSize: sp(12), fontWeight: "700", textTransform: "capitalize" },

    // ── Calendar Modal (42-cell, web-matching)
    calendarSheet: {
      borderTopLeftRadius: 28, borderTopRightRadius: 28,
      paddingHorizontal: wp(4.5), paddingTop: hp(1.5), paddingBottom: hp(4.5),
      shadowColor: "#000", shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.15, shadowRadius: 12, elevation: 20,
    },
    calendarHeader: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      marginBottom: hp(1.8), marginTop: hp(1),
    },
    calMonthTitle: { fontSize: sp(16), fontWeight: "800" },
    calNavRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    calNavBtn: {
      width: sp(28), height: sp(28), borderRadius: sp(6),
      alignItems: "center", justifyContent: "center",
    },
    calDayRow: {
      flexDirection: "row",
      marginBottom: hp(0.8),
    },
    calDayLabel: {
      width: `${100 / 7}%`,
      fontSize: sp(11), fontWeight: "700",
      textAlign: "center",
    },
    calGrid: { flexDirection: "row", flexWrap: "wrap" },
    calCell: {
      width: `${100 / 7}%`,
      aspectRatio: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 2,
    },
    calCellText: { fontSize: sp(13), fontWeight: "600" },
    calActions: {
      flexDirection: "row", justifyContent: "space-between",
      alignItems: "center",
      marginTop: hp(2.5), gap: wp(2),
    },
    calTodayBtn: {
      flexDirection: "row", alignItems: "center", gap: 5,
      borderRadius: 999, paddingHorizontal: wp(4), paddingVertical: hp(1.1),
    },
    calTodayText: { fontSize: sp(13), fontWeight: "700" },
    calCancelBtn: {
      borderRadius: 999, paddingHorizontal: wp(4), paddingVertical: hp(1.1),
    },
    calCancelText: { fontSize: sp(13), fontWeight: "700" },
  });

export default JournalScreen;