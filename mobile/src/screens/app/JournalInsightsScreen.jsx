import React, { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import journalApi from "../../api/journalApi";
import { useTheme } from "../../context/ThemeContext";

export const JournalInsightsScreen = ({ navigation }) => {
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
      setError(fetchError.response?.data?.message || "Failed to load journal insights.");
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primaryStrong }]}>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.surface }]} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={18} color={colors.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Weekly insight</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>Your journal pattern for the current week.</Text>
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
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Period insight</Text>
                <Feather name="trending-up" size={16} color={colors.primary} />
              </View>
              <Text style={[styles.cardCopy, { color: colors.muted }]}> 
                {summary?.periodInsight || "No insight available yet."}
              </Text>
            </View>

            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Weekly activity</Text>
                <Feather name="calendar" size={16} color={colors.primary} />
              </View>
              <View style={styles.weekRow}>
                {Array.isArray(summary?.weeklyActivity) && summary.weeklyActivity.map((day) => (
                  <View key={day.label} style={styles.weekItem}>
                    <Text style={[styles.dayLabel, { color: colors.muted }]}>{day.label}</Text>
                    <View style={[styles.dayBubble, { backgroundColor: day.count > 0 ? colors.primary : colors.inputBg }]}>
                      <Text style={{ color: day.count > 0 ? colors.primaryText : colors.muted, fontWeight: "800" }}>
                        {day.count}
                      </Text>
                    </View>
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
  card: { borderWidth: 1, borderRadius: 20, padding: 16 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { fontSize: 16, fontWeight: "900" },
  cardCopy: { marginTop: 10, fontSize: 14, lineHeight: 20 },
  weekRow: { flexDirection: "row", justifyContent: "space-between", gap: 6, marginTop: 14 },
  weekItem: { flex: 1, alignItems: "center", gap: 6 },
  dayLabel: { fontSize: 11, fontWeight: "700" },
  dayBubble: { minWidth: 28, minHeight: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },

});

export default JournalInsightsScreen;
