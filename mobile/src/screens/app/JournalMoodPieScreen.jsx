import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import journalApi from "../../api/journalApi";
import { useTheme } from "../../context/ThemeContext";
import { MoodPieChart, MOOD_COLORS, getMoodColor } from "../../components/MoodPieChart";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Returns "YYYY-MM-DD" in local time
const getLocalDateString = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const formatDayLabel = (dateInput) => {
  return new Date(dateInput).toLocaleDateString(undefined, {
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

export const JournalMoodPieScreen = ({ navigation, route }) => {
  const { colors } = useTheme();

  // Mode: "week" | "month"
  const [timeRange, setTimeRange] = useState("week");
  // Tracks selected month for monthly view (defaults to current month)
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const [entries, setEntries] = useState(route.params?.entries || []);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // Year options for month picker modal (past 5 years to next year)
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = currentYear - 4; y <= currentYear + 1; y += 1) {
      years.push(y);
    }
    return years;
  }, []);

  const loadData = useCallback(async ({ isRefresh = false } = {}) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError("");

      const [journalsRes, summaryRes] = await Promise.all([
        journalApi.getJournals(),
        journalApi.getJournalSummary(timeRange, timeRange),
      ]);

      setEntries(Array.isArray(journalsRes?.journals) ? journalsRes.journals : []);
      setSummary(summaryRes?.summary || null);
    } catch (fetchError) {
      setError(fetchError.response?.data?.message || "Failed to load mood analysis.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [timeRange]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Calculate inclusive period window and aggregate entries for the active range
  const periodMoodDetails = useMemo(() => {
    let rangeStart = new Date();
    rangeStart.setHours(0, 0, 0, 0);

    if (timeRange === "month") {
      const sm = selectedMonth || new Date();
      rangeStart = new Date(sm.getFullYear(), sm.getMonth(), 1);
    } else {
      // Sunday of current week
      rangeStart.setDate(rangeStart.getDate() - rangeStart.getDay());
    }

    let rangeEnd = new Date(rangeStart);
    if (timeRange === "month") {
      rangeEnd = new Date(rangeStart.getFullYear(), rangeStart.getMonth() + 1, 1);
    } else {
      rangeEnd.setDate(rangeEnd.getDate() + 7);
    }

    // Filter entries belonging to this period
    const periodEntries = entries
      .filter((entry) => {
        if (!entry?.createdAt) return false;
        const entryDate = new Date(entry.createdAt);
        return entryDate >= rangeStart && entryDate < rangeEnd;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Aggregate counts by mood
    const moodCounts = periodEntries.reduce((acc, entry) => {
      const mood = String(entry.mood || "neutral").toLowerCase();
      acc[mood] = (acc[mood] || 0) + 1;
      return acc;
    }, {});

    const total = Object.values(moodCounts).reduce((sum, count) => sum + count, 0);

    const moodRows = Object.entries(moodCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([mood, count]) => ({
        mood,
        count,
        percent: total ? Math.round((count / total) * 100) : 0,
        color: getMoodColor(mood),
      }));

    const primaryMood = moodRows[0]?.mood || "neutral";
    const dominantMoodLabel = primaryMood.charAt(0).toUpperCase() + primaryMood.slice(1);

    // Build day buckets for the breakdown list
    const totalDays =
      timeRange === "month"
        ? new Date(rangeStart.getFullYear(), rangeStart.getMonth() + 1, 0).getDate()
        : 7;

    const dayBuckets = Array.from({ length: totalDays }, (_, index) => {
      const dayDate = new Date(rangeStart);
      dayDate.setDate(rangeStart.getDate() + index);
      const dayKey = getLocalDateString(dayDate);

      return {
        dayKey,
        dayDate,
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
      moodRows,
      dominantMoodLabel,
      dayBuckets,
    };
  }, [entries, timeRange, selectedMonth]);

  // Month navigation handlers
  const handlePrevMonth = () => {
    const sm = selectedMonth || new Date();
    setSelectedMonth(new Date(sm.getFullYear(), sm.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    const sm = selectedMonth || new Date();
    setSelectedMonth(new Date(sm.getFullYear(), sm.getMonth() + 1, 1));
  };

  const formattedPeriodRange = useMemo(() => {
    if (timeRange === "month") {
      const sm = selectedMonth || new Date();
      const lastDay = new Date(sm.getFullYear(), sm.getMonth() + 1, 0).getDate();
      const monthShort = MONTH_NAMES[sm.getMonth()].slice(0, 3);
      return `${monthShort} 1, ${sm.getFullYear()} - ${monthShort} ${lastDay}, ${sm.getFullYear()}`;
    }

    const start = periodMoodDetails.rangeStart;
    const end = new Date(periodMoodDetails.rangeEnd.getTime() - 1);
    return `${formatDayLabel(start)} - ${formatDayLabel(end)}`;
  }, [timeRange, selectedMonth, periodMoodDetails]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { backgroundColor: colors.primaryStrong }]}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.surface }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Feather name="arrow-left" size={18} color={colors.primary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>
              {timeRange === "month" ? "Monthly Mood Progress" : "Weekly Mood Progress"}
            </Text>
            <Text style={[styles.subtitle, { color: "#93C5FD" }]}>
              {formattedPeriodRange}
            </Text>
          </View>
        </View>

        {/* Weekly / Monthly Segmented Switcher */}
        <View style={styles.segmentWrap}>
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              timeRange === "week"
                ? { backgroundColor: colors.surface }
                : { backgroundColor: "transparent" },
            ]}
            onPress={() => setTimeRange("week")}
            activeOpacity={0.8}
          >
            <Feather
              name="calendar"
              size={14}
              color={timeRange === "week" ? colors.primary : "rgba(255, 255, 255, 0.8)"}
            />
            <Text
              style={[
                styles.segmentText,
                { color: timeRange === "week" ? colors.primary : "#FFFFFF" },
              ]}
            >
              This Week
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentBtn,
              timeRange === "month"
                ? { backgroundColor: colors.surface }
                : { backgroundColor: "transparent" },
            ]}
            onPress={() => setTimeRange("month")}
            activeOpacity={0.8}
          >
            <Feather
              name="clock"
              size={14}
              color={timeRange === "month" ? colors.primary : "rgba(255, 255, 255, 0.8)"}
            />
            <Text
              style={[
                styles.segmentText,
                { color: timeRange === "month" ? colors.primary : "#FFFFFF" },
              ]}
            >
              This Month
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData({ isRefresh: true })}
            tintColor={colors.primary}
          />
        }
      >
        {/* Monthly navigation bar when in Monthly mode */}
        {timeRange === "month" && (
          <View style={[styles.monthNavCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TouchableOpacity
              onPress={handlePrevMonth}
              style={[styles.navArrowBtn, { backgroundColor: colors.inputBg }]}
              activeOpacity={0.7}
            >
              <Feather name="chevron-left" size={18} color={colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowMonthPicker(true)}
              style={styles.monthTitleWrap}
              activeOpacity={0.7}
            >
              <Text style={[styles.monthTitleText, { color: colors.text }]}>
                {MONTH_NAMES[selectedMonth.getMonth()]} {selectedMonth.getFullYear()}
              </Text>
              <Feather name="chevron-down" size={15} color={colors.muted} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleNextMonth}
              style={[styles.navArrowBtn, { backgroundColor: colors.inputBg }]}
              activeOpacity={0.7}
            >
              <Feather name="chevron-right" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
        )}

        {!!error && (
          <View style={[styles.messageCard, { backgroundColor: colors.warningBg, borderColor: colors.warningBorder }]}>
            <Text style={[styles.messageText, { color: colors.text }]}>{error}</Text>
          </View>
        )}

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.muted }]}>Loading mood statistics...</Text>
          </View>
        ) : (
          <>
            {/* ── Pie / Donut Chart Card ── */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.chartWrap}>
                <MoodPieChart
                  data={periodMoodDetails.moodRows}
                  size={190}
                  strokeWidth={22}
                  centerBg={colors.surface}
                  iconColor={colors.muted}
                  iconSize={30}
                  fallbackColor={colors.border}
                />
              </View>

              <Text style={[styles.dominantMoodTitle, { color: colors.text }]}>
                {periodMoodDetails.total > 0
                  ? `Mostly ${periodMoodDetails.dominantMoodLabel}`
                  : "No mood entries"}
              </Text>

              <Text style={[styles.periodSubtitle, { color: colors.muted }]}>
                {periodMoodDetails.total > 0
                  ? `Based on ${periodMoodDetails.total} mood-tagged ${
                      periodMoodDetails.total === 1 ? "entry" : "entries"
                    } this ${timeRange}`
                  : `No mood data found for this ${timeRange}.`}
              </Text>

              {/* Mood breakdown legend with visible slice colors */}
              <View style={styles.legendContainer}>
                {periodMoodDetails.moodRows.length > 0 ? (
                  periodMoodDetails.moodRows.map((row) => (
                    <View key={row.mood} style={styles.legendRow}>
                      <View style={styles.legendLeft}>
                        <View style={[styles.colorDot, { backgroundColor: row.color }]} />
                        <Text style={[styles.legendMoodName, { color: colors.text }]}>
                          {row.mood}
                        </Text>
                      </View>
                      <Text style={[styles.legendStatText, { color: colors.muted }]}>
                        {row.count} ({row.percent}%)
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={[styles.emptyLegendText, { color: colors.muted }]}>
                    No journal entries recorded for this {timeRange}.
                  </Text>
                )}
              </View>
            </View>

            {/* ── Daily / Date Breakdown Card ── */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>
                  {timeRange === "month" ? "Date Breakdown" : "Daily Breakdown"}
                </Text>
                <Feather name="list" size={16} color={colors.primary} />
              </View>

              <View style={styles.breakdownList}>
                {periodMoodDetails.dayBuckets.map((bucket) => {
                  const hasEntries = bucket.entries.length > 0;

                  return (
                    <View
                      key={bucket.dayKey}
                      style={[
                        styles.dayCard,
                        {
                          backgroundColor: colors.inputBg,
                          borderColor: hasEntries ? colors.border : "transparent",
                        },
                      ]}
                    >
                      <View style={styles.dayCardHeader}>
                        <Text style={[styles.dayCardTitle, { color: colors.text }]}>
                          {bucket.dayLabel}
                        </Text>
                        <Text style={[styles.dayEntryCount, { color: colors.muted }]}>
                          {bucket.entries.length} {bucket.entries.length === 1 ? "entry" : "entries"}
                        </Text>
                      </View>

                      {hasEntries ? (
                        <View style={styles.dayEntriesWrap}>
                          {bucket.entries.map((entry) => {
                            const moodColor = getMoodColor(entry.mood);
                            return (
                              <View
                                key={entry._id}
                                style={[styles.entryItemRow, { backgroundColor: colors.surface }]}
                              >
                                <View style={{ flex: 1 }}>
                                  <Text style={[styles.entryItemTitle, { color: colors.text }]} numberOfLines={1}>
                                    {entry.title || "Untitled Entry"}
                                  </Text>
                                  <Text style={[styles.entryItemTime, { color: colors.muted }]}>
                                    {formatTimeLabel(entry.createdAt)}
                                  </Text>
                                </View>
                                <View style={[styles.moodTagBadge, { backgroundColor: `${moodColor}20` }]}>
                                  <View style={[styles.smallMoodDot, { backgroundColor: moodColor }]} />
                                  <Text style={[styles.moodTagText, { color: moodColor }]}>
                                    {entry.mood || "neutral"}
                                  </Text>
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      ) : (
                        <Text style={[styles.noEntriesText, { color: colors.muted }]}>
                          No journal entries.
                        </Text>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* ── Month & Year Picker Modal ── */}
      <Modal visible={showMonthPicker} transparent animationType="fade" onRequestClose={() => setShowMonthPicker(false)}>
        <TouchableWithoutFeedback onPress={() => setShowMonthPicker(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback>
              <View style={[styles.pickerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.pickerHeader}>
                  <Text style={[styles.pickerTitle, { color: colors.text }]}>Select Month & Year</Text>
                  <TouchableOpacity onPress={() => setShowMonthPicker(false)}>
                    <Feather name="x" size={18} color={colors.muted} />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.pickerSectionLabel, { color: colors.muted }]}>YEAR</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.yearsRow}>
                  {yearOptions.map((y) => {
                    const isSelected = selectedMonth.getFullYear() === y;
                    return (
                      <TouchableOpacity
                        key={y}
                        style={[
                          styles.yearChip,
                          {
                            backgroundColor: isSelected ? colors.primary : colors.inputBg,
                            borderColor: isSelected ? colors.primary : colors.border,
                          },
                        ]}
                        onPress={() => setSelectedMonth(new Date(y, selectedMonth.getMonth(), 1))}
                      >
                        <Text
                          style={[
                            styles.yearChipText,
                            { color: isSelected ? "#FFFFFF" : colors.text },
                          ]}
                        >
                          {y}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <Text style={[styles.pickerSectionLabel, { color: colors.muted, marginTop: 14 }]}>MONTH</Text>
                <View style={styles.monthsGrid}>
                  {MONTH_NAMES.map((mName, idx) => {
                    const isSelected = selectedMonth.getMonth() === idx;
                    return (
                      <TouchableOpacity
                        key={mName}
                        style={[
                          styles.monthChip,
                          {
                            backgroundColor: isSelected ? colors.primary : colors.inputBg,
                            borderColor: isSelected ? colors.primary : colors.border,
                          },
                        ]}
                        onPress={() => {
                          setSelectedMonth(new Date(selectedMonth.getFullYear(), idx, 1));
                          setShowMonthPicker(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.monthChipText,
                            { color: isSelected ? "#FFFFFF" : colors.text },
                          ]}
                        >
                          {mName.slice(0, 3)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 18,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    gap: 14,
  },
  headerTopRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 22, fontWeight: "900", color: "#FFFFFF" },
  subtitle: { marginTop: 4, fontSize: 13, lineHeight: 18 },
  segmentWrap: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 14,
    padding: 3,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 11,
    gap: 6,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "700",
  },
  content: { padding: 18, gap: 14 },
  monthNavCard: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navArrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  monthTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  monthTitleText: {
    fontSize: 16,
    fontWeight: "800",
  },
  loadingWrap: { paddingVertical: 48, alignItems: "center", gap: 12 },
  loadingText: { fontSize: 13, fontWeight: "600" },
  messageCard: { borderWidth: 1, borderRadius: 16, padding: 14 },
  messageText: { fontSize: 13, fontWeight: "600" },
  card: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  chartWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
  },
  dominantMoodTitle: {
    marginTop: 10,
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
  },
  periodSubtitle: {
    marginTop: 4,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  legendContainer: {
    marginTop: 18,
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.15)",
    paddingTop: 14,
    gap: 10,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  legendLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendMoodName: {
    fontSize: 14,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  legendStatText: {
    fontSize: 13,
    fontWeight: "600",
  },
  emptyLegendText: {
    textAlign: "center",
    fontSize: 13,
    fontStyle: "italic",
    paddingVertical: 8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  cardTitle: { fontSize: 17, fontWeight: "900" },
  breakdownList: { gap: 10 },
  dayCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  dayCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dayCardTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  dayEntryCount: {
    fontSize: 12,
    fontWeight: "600",
  },
  dayEntriesWrap: { gap: 6, marginTop: 4 },
  entryItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 10,
    borderRadius: 10,
    gap: 10,
  },
  entryItemTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  entryItemTime: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
  },
  moodTagBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 5,
  },
  smallMoodDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  moodTagText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  noEntriesText: {
    fontSize: 12,
    fontStyle: "italic",
    marginTop: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  pickerCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  pickerTitle: { fontSize: 17, fontWeight: "900" },
  pickerSectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  yearsRow: { gap: 8, paddingBottom: 4 },
  yearChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  yearChipText: { fontSize: 13, fontWeight: "800" },
  monthsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  monthChip: {
    width: "30.5%",
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  monthChipText: { fontSize: 13, fontWeight: "800" },
});

export default JournalMoodPieScreen;
