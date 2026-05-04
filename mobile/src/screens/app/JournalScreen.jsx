import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import journalApi from "../../api/journalApi";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { isPaidJournalRole } from "../../utils/roles";

const MOOD_OPTIONS = [
  "all",
  "happy",
  "grateful",
  "hopeful",
  "calm",
  "excited",
  "stressed",
  "anxious",
  "overwhelmed",
  "sad",
  "lonely",
  "tired",
  "angry",
  "depressed",
  "neutral",
];

const MOOD_STYLE_MAP = {
  happy: { backgroundColor: "#D1FAE5", color: "#047857" },
  grateful: { backgroundColor: "#DCFCE7", color: "#166534" },
  hopeful: { backgroundColor: "#E0F2FE", color: "#0369A1" },
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

const formatDate = (dateString) => {
  if (!dateString) {
    return "Just now";
  }

  return new Date(dateString).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const estimateReadTime = (content) => {
  const words = String(content || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  return Math.max(1, Math.round(words / 200)) || 1;
};

const getMoodStyle = (mood) =>
  MOOD_STYLE_MAP[String(mood || "neutral").toLowerCase()] || MOOD_STYLE_MAP.neutral;

const LockedCard = ({ colors }) => (
  <View
    style={[
      styles.lockCard,
      { backgroundColor: colors.surface, borderColor: colors.border },
    ]}
  >
    <View style={[styles.lockIcon, { backgroundColor: colors.inputBg }]}>
      <Feather name="lock" size={22} color={colors.primary} />
    </View>
    <Text style={[styles.lockTitle, { color: colors.text }]}>Journal is a paid feature</Text>
    <Text style={[styles.lockCopy, { color: colors.muted }]}>Your journal unlocks for Pro and enterprise users.</Text>
  </View>
);

export const JournalScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const isPaidUser = isPaidJournalRole(user?.role);

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

  const loadJournalData = useCallback(async ({ showRefreshing = false } = {}) => {
    if (!isPaidUser) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setError("");
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [journalsResponse, summaryResponse] = await Promise.all([
        journalApi.getJournals(),
        journalApi.getJournalSummary(),
      ]);

      setEntries(Array.isArray(journalsResponse.journals) ? journalsResponse.journals : []);
      setSummary(summaryResponse.summary || null);
    } catch (fetchError) {
      setError(fetchError.response?.data?.message || "Failed to load journal data.");
      setEntries([]);
      setSummary(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isPaidUser]);

  useFocusEffect(
    useCallback(() => {
      loadJournalData();
    }, [loadJournalData]),
  );

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

      if (lowerSearch) {
        const haystack = [entry.title, entry.content, entry.mood, ...(entry.tags || [])]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(lowerSearch)) {
          return false;
        }
      }

      return true;
    });

    return [...list].sort((a, b) => {
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
  }, [entries, favoritesOnly, searchText, selectedMood, sortBy]);

  const handleDelete = (entry) => {
    Alert.alert("Delete journal entry", `Delete ${entry.title || "this entry"}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setActionLoadingId(entry._id);
            await journalApi.deleteJournal(entry._id);
            await loadJournalData({ showRefreshing: true });
          } catch (deleteError) {
            setError(deleteError.response?.data?.message || "Failed to delete entry.");
          } finally {
            setActionLoadingId("");
          }
        },
      },
    ]);
  };

  const handleToggleFavorite = async (entry) => {
    try {
      setActionLoadingId(entry._id);
      const response = await journalApi.updateJournal(entry._id, {
        isFavorite: !entry.isFavorite,
      });

      if (response?.journal) {
        setEntries((prev) => prev.map((item) => (item._id === entry._id ? response.journal : item)));
      }

      await loadJournalData({ showRefreshing: true });
    } catch (favoriteError) {
      setError(favoriteError.response?.data?.message || "Failed to update favorite.");
    } finally {
      setActionLoadingId("");
    }
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
    } finally {
      setActionLoadingId("");
    }
  };

  const renderEntry = ({ item }) => {
    const moodStyle = getMoodStyle(item.mood);

    return (
      <TouchableOpacity
        style={[
          styles.entryCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
        onPress={() => navigation.navigate("JournalEditor", { mode: "view", entry: item })}
      >
        <View style={styles.entryHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.entryTitle, { color: colors.text }]} numberOfLines={1}>
              {item.title || "Untitled Entry"}
            </Text>
            <View style={styles.metaRow}>
              <Text style={[styles.metaText, { color: colors.muted }]}>{formatDate(item.createdAt)}</Text>
              <Text style={[styles.metaDot, { color: colors.muted }]}>•</Text>
              <Text style={[styles.metaText, { color: colors.muted }]}>{estimateReadTime(item.content)} min read</Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => handleToggleFavorite(item)}
            style={styles.iconButton}
            disabled={actionLoadingId === item._id}
          >
            <Feather
              name={item.isFavorite ? "star" : "star"}
              size={18}
              color={item.isFavorite ? "#F59E0B" : colors.muted}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.tagRow}>
          <View style={[styles.moodChip, moodStyle]}>
            <Text style={[styles.moodChipText, { color: moodStyle.color }]}>
              {String(item.mood || "neutral").toUpperCase()}
            </Text>
          </View>
          {Array.isArray(item.tags) &&
            item.tags.slice(0, 2).map((tag) => (
              <View key={tag} style={[styles.tagChip, { backgroundColor: colors.inputBg }]}>
                <Text style={[styles.tagChipText, { color: colors.muted }]}>{tag}</Text>
              </View>
            ))}
        </View>

        <Text style={[styles.entryContent, { color: colors.muted }]} numberOfLines={3}>
          {item.content || "No content yet."}
        </Text>

        {!!item.aiInsight?.summary && (
          <View style={[styles.insightBox, { backgroundColor: colors.inputBg }]}>
            <Feather name="sparkles" size={14} color={colors.primary} />
            <Text style={[styles.insightText, { color: colors.text }]} numberOfLines={2}>
              {item.aiInsight.summary}
            </Text>
          </View>
        )}

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionPill, { backgroundColor: colors.inputBg }]}
            onPress={() => navigation.navigate("JournalEditor", { mode: "edit", entry: item })}
          >
            <Feather name="edit-2" size={14} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.primary }]}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionPill, { backgroundColor: colors.inputBg }]}
            onPress={() => handleRefreshInsight(item)}
            disabled={actionLoadingId === item._id}
          >
            <Feather name="refresh-cw" size={14} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.primary }]}>Refresh</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionPill, { backgroundColor: colors.warningBg }]}
            onPress={() => handleDelete(item)}
            disabled={actionLoadingId === item._id}
          >
            <Feather name="trash-2" size={14} color="#DC2626" />
            <Text style={[styles.actionText, { color: "#DC2626" }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (!isPaidUser) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.hero, { backgroundColor: colors.primaryStrong }]}>
          <Text style={styles.heroTitle}>Journal</Text>
          <Text style={[styles.heroSubtitle, { color: colors.muted }]}>Paid journaling is available for Pro and enterprise users.</Text>
        </View>
        <View style={styles.lockWrapper}>
          <LockedCard colors={colors} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.hero, { backgroundColor: colors.primaryStrong }]}>
        <View style={styles.heroTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Journal</Text>
            <Text style={[styles.heroSubtitle, { color: colors.muted }]}>
              Capture entries, see mood trends, and revisit AI insights.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.newButton, { backgroundColor: colors.surface }]}
            onPress={() => navigation.navigate("JournalEditor", { mode: "add" })}
          >
            <Feather name="plus" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{summary?.streak || 0}</Text>
            <Text style={[styles.summaryLabel, { color: colors.muted }]}>day streak</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{entries.length}</Text>
            <Text style={[styles.summaryLabel, { color: colors.muted }]}>entries</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{summary?.topTags?.length || 0}</Text>
            <Text style={[styles.summaryLabel, { color: colors.muted }]}>top tags</Text>
          </View>
        </View>
      </View>

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
        ListHeaderComponent={(
          <View>
            <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Feather name="search" size={16} color={colors.muted} />
              <TextInput
                value={searchText}
                onChangeText={setSearchText}
                placeholder="Search titles, moods, tags..."
                placeholderTextColor={colors.muted}
                style={[styles.searchInput, { color: colors.text }]}
              />
            </View>

            <View style={styles.filterRow}>
              <TouchableOpacity
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: favoritesOnly ? colors.inputBg : colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setFavoritesOnly((prev) => !prev)}
              >
                <Feather name="star" size={14} color={favoritesOnly ? "#F59E0B" : colors.muted} />
                <Text style={[styles.filterText, { color: favoritesOnly ? colors.text : colors.muted }]}>
                  Favorites
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterPill, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() =>
                  setSortBy((current) =>
                    current === "newest" ? "oldest" : current === "oldest" ? "mood" : "newest"
                  )
                }
              >
                <Feather name="sliders" size={14} color={colors.muted} />
                <Text style={[styles.filterText, { color: colors.muted }]}>{sortBy}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.moodFilterRow}>
              {MOOD_OPTIONS.map((mood) => (
                <TouchableOpacity
                  key={mood}
                  style={[
                    styles.moodFilterPill,
                    {
                      backgroundColor: selectedMood === mood ? colors.primary : colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => setSelectedMood(mood)}
                >
                  <Text
                    style={[
                      styles.moodFilterText,
                      { color: selectedMood === mood ? colors.primaryText : colors.muted },
                    ]}
                  >
                    {mood === "all" ? "All" : mood}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={[styles.insightPanel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Weekly insight</Text>
                <Feather name="trending-up" size={16} color={colors.primary} />
              </View>
              <Text style={[styles.insightCopy, { color: colors.muted }]}>
                {summary?.periodInsight || "Your reflections are building a clearer pattern. Keep writing regularly to surface your trend."}
              </Text>

              {!!Array.isArray(summary?.weeklyActivity) && summary.weeklyActivity.length > 0 && (
                <View style={styles.activityRow}>
                  {summary.weeklyActivity.map((day) => (
                    <View key={`${day.label}-${day.count}`} style={styles.activityItem}>
                      <Text style={[styles.activityLabel, { color: colors.muted }]}>{day.label}</Text>
                      <View
                        style={[
                          styles.activityDot,
                          {
                            backgroundColor: day.count > 0 ? colors.primary : colors.inputBg,
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <Text style={[styles.activityCount, { color: day.count > 0 ? colors.primaryText : colors.muted }]}>
                          {day.count}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {!!Array.isArray(summary?.topTags) && summary.topTags.length > 0 && (
                <View style={styles.tagSummaryRow}>
                  {summary.topTags.slice(0, 4).map((tag) => (
                    <View key={tag.tag} style={[styles.summaryTagChip, { backgroundColor: colors.inputBg }]}>
                      <Text style={[styles.summaryTagText, { color: colors.muted }]}>{tag.tag}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {!!error && (
              <View style={[styles.errorBox, { backgroundColor: colors.warningBg, borderColor: colors.warningBorder }]}>
                <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
              </View>
            )}

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Entries</Text>
              <Text style={[styles.sectionCount, { color: colors.muted }]}>{filteredEntries.length} found</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={(
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {loading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Feather name="book-open" size={22} color={colors.muted} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No matching entries</Text>
                <Text style={[styles.emptyCopy, { color: colors.muted }]}>Try a different search or create a new entry to start building your journal.</Text>
              </>
            )}
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: {
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  heroTitle: { fontSize: 28, fontWeight: "800", color: "#FFFFFF" },
  heroSubtitle: { marginTop: 6, fontSize: 13, lineHeight: 18 },
  newButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  summaryValue: { fontSize: 18, fontWeight: "800" },
  summaryLabel: { fontSize: 11, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.4 },
  listContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 28,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  filterRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  filterText: { fontSize: 13, fontWeight: "700", textTransform: "capitalize" },
  moodFilterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  moodFilterPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  moodFilterText: { fontSize: 12, fontWeight: "700", textTransform: "capitalize" },
  insightPanel: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginTop: 14,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: { fontSize: 16, fontWeight: "800" },
  sectionCount: { fontSize: 12, fontWeight: "700" },
  insightCopy: { marginTop: 10, fontSize: 13, lineHeight: 19 },
  activityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
    marginTop: 14,
  },
  activityItem: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  activityLabel: { fontSize: 11, fontWeight: "700" },
  activityDot: {
    minWidth: 26,
    minHeight: 26,
    paddingHorizontal: 6,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  activityCount: { fontSize: 11, fontWeight: "800" },
  tagSummaryRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  summaryTagChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  summaryTagText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  errorBox: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginTop: 14,
  },
  errorText: { fontSize: 13, fontWeight: "600" },
  entryCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginTop: 14,
  },
  entryHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  entryTitle: { fontSize: 18, fontWeight: "800" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4, flexWrap: "wrap" },
  metaText: { fontSize: 12, fontWeight: "600" },
  metaDot: { fontSize: 12, fontWeight: "700" },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  moodChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  moodChipText: { fontSize: 11, fontWeight: "800" },
  tagChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  tagChipText: { fontSize: 11, fontWeight: "700" },
  entryContent: { marginTop: 12, fontSize: 14, lineHeight: 20 },
  insightBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
  },
  insightText: { flex: 1, fontSize: 13, lineHeight: 18 },
  actionRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 14 },
  actionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  actionText: { fontSize: 12, fontWeight: "800" },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    padding: 22,
    marginTop: 16,
    minHeight: 150,
  },
  emptyTitle: { marginTop: 12, fontSize: 16, fontWeight: "800" },
  emptyCopy: { marginTop: 6, fontSize: 13, textAlign: "center", lineHeight: 19 },
  lockWrapper: { padding: 18 },
  lockCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    alignItems: "center",
  },
  lockIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  lockTitle: { fontSize: 18, fontWeight: "800", textAlign: "center" },
  lockCopy: { marginTop: 8, fontSize: 13, textAlign: "center", lineHeight: 19 },
});

export default JournalScreen;