import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import journalApi from "../../api/journalApi";
import { useTheme } from "../../context/ThemeContext";

export const JournalInsightsScreen = ({ navigation }) => {
  const { colors } = useTheme();

  // Mode: "week" | "month"
  const [insightRange, setInsightRange] = useState("week");
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadSummary = useCallback(async ({ isRefresh = false } = {}) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError("");

      const response = await journalApi.getJournalSummary(insightRange, insightRange);
      setSummary(response.summary || null);
    } catch (fetchError) {
      setError(fetchError.response?.data?.message || "Failed to load journal insights.");
      setSummary(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [insightRange]);

  useFocusEffect(
    useCallback(() => {
      loadSummary();
    }, [loadSummary])
  );

  const weeklyActivity = summary?.weeklyActivity || [
    { label: "Sun", count: 0 },
    { label: "Mon", count: 0 },
    { label: "Tue", count: 0 },
    { label: "Wed", count: 0 },
    { label: "Thu", count: 0 },
    { label: "Fri", count: 0 },
    { label: "Sat", count: 0 },
  ];

  const topTags = summary?.topTags || [];

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
            <Text style={styles.title}>AI Insights</Text>
            <Text style={[styles.subtitle, { color: "#93C5FD" }]}>
              {insightRange === "week"
                ? "Your weekly reflection and writing pattern."
                : "Your monthly reflection and writing pattern."}
            </Text>
          </View>
        </View>

        {/* Weekly / Monthly Segmented Switcher */}
        <View style={styles.segmentWrap}>
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              insightRange === "week"
                ? { backgroundColor: colors.surface }
                : { backgroundColor: "transparent" },
            ]}
            onPress={() => setInsightRange("week")}
            activeOpacity={0.8}
          >
            <Feather
              name="calendar"
              size={14}
              color={insightRange === "week" ? colors.primary : "rgba(255, 255, 255, 0.8)"}
            />
            <Text
              style={[
                styles.segmentText,
                { color: insightRange === "week" ? colors.primary : "#FFFFFF" },
              ]}
            >
              This Week
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentBtn,
              insightRange === "month"
                ? { backgroundColor: colors.surface }
                : { backgroundColor: "transparent" },
            ]}
            onPress={() => setInsightRange("month")}
            activeOpacity={0.8}
          >
            <Feather
              name="clock"
              size={14}
              color={insightRange === "month" ? colors.primary : "rgba(255, 255, 255, 0.8)"}
            />
            <Text
              style={[
                styles.segmentText,
                { color: insightRange === "month" ? colors.primary : "#FFFFFF" },
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
            onRefresh={() => loadSummary({ isRefresh: true })}
            tintColor={colors.primary}
          />
        }
      >
        {!!error && (
          <View style={[styles.messageCard, { backgroundColor: colors.warningBg, borderColor: colors.warningBorder }]}>
            <Text style={[styles.messageText, { color: colors.text }]}>{error}</Text>
          </View>
        )}

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.muted }]}>Analyzing your journal insights...</Text>
          </View>
        ) : (
          <>
            {/* ── AI Period Insight Card ── */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <View style={[styles.sparkleIconWrap, { backgroundColor: `${colors.primary}18` }]}>
                    <Feather name="zap" size={16} color={colors.primary} />
                  </View>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>
                    {insightRange === "week" ? "Weekly AI Insight" : "Monthly AI Insight"}
                  </Text>
                </View>
                <View style={[styles.rangeBadge, { backgroundColor: colors.inputBg }]}>
                  <Text style={[styles.rangeBadgeText, { color: colors.muted }]}>
                    {insightRange === "week" ? "Week" : "Month"}
                  </Text>
                </View>
              </View>

              <View style={[styles.insightContentBox, { backgroundColor: colors.inputBg }]}>
                <Text style={[styles.insightBodyText, { color: colors.text }]}>
                  {summary?.periodInsight ||
                    "You write most often in the evening and your mood is trending positively. Great job staying consistent with your reflections!"}
                </Text>
              </View>
            </View>

            {/* ── Activity & Consistency Card ── */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Feather name="calendar" size={16} color={colors.primary} />
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Your Activity</Text>
                </View>
                <View style={styles.streakBadge}>
                  <Feather name="award" size={14} color="#F59E0B" />
                  <Text style={styles.streakBadgeText}>{summary?.streak || 0} Day Streak</Text>
                </View>
              </View>

              <View style={styles.activityGrid}>
                {weeklyActivity.map((day, index) => {
                  const isActive = day.count > 0;
                  return (
                    <View key={`${day.label}-${index}`} style={styles.activityCol}>
                      <Text style={[styles.activityDayLabel, { color: colors.muted }]}>
                        {day.label.slice(0, 3)}
                      </Text>
                      <View
                        style={[
                          styles.activityBubble,
                          isActive
                            ? { backgroundColor: "#10B981" }
                            : { backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border },
                        ]}
                      >
                        {isActive ? (
                          <Feather name="check" size={13} color="#FFFFFF" />
                        ) : (
                          <Text style={[styles.bubbleCountZero, { color: colors.muted }]}>-</Text>
                        )}
                      </View>
                      {isActive && (
                        <Text style={[styles.entryCountSub, { color: "#10B981" }]}>
                          {day.count}
                        </Text>
                      )}
                    </View>
                  );
                })}
              </View>

              <Text style={[styles.activityFooterText, { color: colors.muted }]}>
                Keep writing regularly to build momentum and uncover deeper emotional patterns.
              </Text>
            </View>

            {/* ── Top Themes & Tags Card ── */}
            {topTags.length > 0 && (
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <Feather name="tag" size={16} color={colors.primary} />
                    <Text style={[styles.cardTitle, { color: colors.text }]}>Top Recurring Themes</Text>
                  </View>
                </View>

                <View style={styles.tagsWrap}>
                  {topTags.map((t) => (
                    <View
                      key={t.tag}
                      style={[styles.tagPill, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                    >
                      <Text style={[styles.tagText, { color: colors.text }]}>#{t.tag}</Text>
                      <View style={[styles.tagCountBadge, { backgroundColor: colors.surface }]}>
                        <Text style={[styles.tagCountText, { color: colors.primary }]}>{t.count}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
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
  title: { fontSize: 24, fontWeight: "900", color: "#FFFFFF" },
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
    gap: 14,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sparkleIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontSize: 17, fontWeight: "900" },
  rangeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  rangeBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  streakBadgeText: {
    color: "#B45309",
    fontSize: 12,
    fontWeight: "800",
  },
  insightContentBox: {
    padding: 16,
    borderRadius: 16,
  },
  insightBodyText: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "500",
  },
  activityGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  activityCol: {
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  activityDayLabel: {
    fontSize: 11,
    fontWeight: "700",
  },
  activityBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  bubbleCountZero: {
    fontSize: 12,
    fontWeight: "600",
  },
  entryCountSub: {
    fontSize: 10,
    fontWeight: "800",
  },
  activityFooterText: {
    fontSize: 12,
    lineHeight: 18,
  },
  tagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tagPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 13,
    fontWeight: "700",
  },
  tagCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  tagCountText: {
    fontSize: 11,
    fontWeight: "800",
  },
});

export default JournalInsightsScreen;
