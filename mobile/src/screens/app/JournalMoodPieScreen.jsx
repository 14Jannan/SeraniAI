import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import journalApi from "../../api/journalApi";
import { useTheme } from "../../context/ThemeContext";

const PALETTE = ["#2563EB", "#14B8A6", "#F59E0B", "#EF4444", "#8B5CF6", "#22C55E", "#EC4899", "#64748B"];

export const JournalMoodPieScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await journalApi.getJournalSummary();
      setSummary(response.summary || null);
    } catch (fetchError) {
      setError(fetchError.response?.data?.message || "Failed to load mood breakdown.");
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSummary();
    }, [loadSummary]),
  );

  const moodRows = useMemo(() => {
    const entries = Object.entries(summary?.moodCounts || {});
    const total = entries.reduce((sum, [, count]) => sum + Number(count || 0), 0) || 1;

    return entries
      .sort((left, right) => Number(right[1]) - Number(left[1]))
      .map(([mood, count], index) => ({
        mood,
        count,
        percent: Math.round((Number(count || 0) / total) * 100),
        color: PALETTE[index % PALETTE.length],
      }));
  }, [summary]);

  const totalEntries = moodRows.reduce((sum, row) => sum + Number(row.count || 0), 0);
  const topMood = moodRows[0];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primaryStrong }]}>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.surface }]} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={18} color={colors.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Mood chart</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>Mood distribution from your journal entries.</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {!!error && (
          <View style={[styles.messageCard, { backgroundColor: colors.warningBg, borderColor: colors.warningBorder }]}>
            <Text style={[styles.messageText, { color: colors.text }]}>{error}</Text>
          </View>
        )}

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <>
            <View style={[styles.pieCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.pieRing, { borderColor: colors.primary }]}>
                <Text style={[styles.pieValue, { color: colors.text }]}>{totalEntries}</Text>
                <Text style={[styles.pieLabel, { color: colors.muted }]}>entries</Text>
              </View>
              <Text style={[styles.pieCaption, { color: colors.muted }]}>
                {topMood ? `Top mood: ${topMood.mood}` : "No mood data yet."}
              </Text>
            </View>

            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Mood breakdown</Text>
                <Feather name="pie-chart" size={16} color={colors.primary} />
              </View>
              <View style={styles.legendWrap}>
                {moodRows.map((row) => (
                  <View key={row.mood} style={styles.legendRow}>
                    <View style={styles.legendLabelWrap}>
                      <View style={[styles.legendDot, { backgroundColor: row.color }]} />
                      <Text style={[styles.legendText, { color: colors.text }]}>{row.mood}</Text>
                    </View>
                    <Text style={[styles.legendValue, { color: colors.muted }]}>{row.count} ({row.percent}%)</Text>
                  </View>
                ))}
              </View>
            </View>
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
  title: { fontSize: 26, fontWeight: "900", color: "#FFFFFF" },
  subtitle: { marginTop: 6, fontSize: 13, lineHeight: 18 },
  content: { padding: 18, gap: 14 },
  loadingWrap: { paddingVertical: 40, alignItems: "center" },
  messageCard: { borderWidth: 1, borderRadius: 16, padding: 14 },
  messageText: { fontSize: 13, fontWeight: "600" },
  pieCard: { borderWidth: 1, borderRadius: 20, padding: 18, alignItems: "center" },
  pieRing: {
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  pieValue: { fontSize: 34, fontWeight: "900" },
  pieLabel: { marginTop: 4, fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
  pieCaption: { marginTop: 12, fontSize: 13, fontWeight: "600" },
  card: { borderWidth: 1, borderRadius: 20, padding: 16 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { fontSize: 16, fontWeight: "900" },
  legendWrap: { marginTop: 14, gap: 10 },
  legendRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  legendLabelWrap: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { fontSize: 13, fontWeight: "700", textTransform: "capitalize" },
  legendValue: { fontSize: 12, fontWeight: "700" },
});

export default JournalMoodPieScreen;
