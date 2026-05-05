import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import journalApi from "../../api/journalApi";
import { useTheme } from "../../context/ThemeContext";

const MOODS = [
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

const normalizeTags = (value) =>
  String(value || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12);

export const AddJournalScreen = ({ navigation, route }) => {
  const { colors } = useTheme();
  const params = route?.params || {};
  const mode = params.mode || "add";
  const entry = params.entry || null;
  const readOnly = mode === "view";

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mood, setMood] = useState("neutral");
  const [tagsText, setTagsText] = useState("");
  const [saving, setSaving] = useState(false);
  const [refreshingInsight, setRefreshingInsight] = useState(false);
  const [error, setError] = useState("");
  const [journal, setJournal] = useState(entry);

  useEffect(() => {
    const source = entry || {};

    setTitle(source.title || "");
    setContent(source.content || "");
    setMood(String(source.mood || "neutral").toLowerCase());
    setTagsText(Array.isArray(source.tags) ? source.tags.join(", ") : "");
    setJournal(source);
  }, [entry, params.mode]);

  const aiInsight = journal?.aiInsight || null;

  const formattedCreatedAt = useMemo(() => {
    if (!journal?.createdAt) {
      return new Date().toDateString();
    }

    return new Date(journal.createdAt).toLocaleString();
  }, [journal]);

  const handleSave = async () => {
    if (!title.trim() && !content.trim()) {
      setError("Please add a title or some content.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        title: title.trim(),
        content: content.trim(),
        mood,
        tags: normalizeTags(tagsText),
      };

      const response = mode === "edit" && journal?._id
        ? await journalApi.updateJournal(journal._id, payload)
        : await journalApi.createJournal(payload);

      setJournal(response.journal);
      navigation.goBack();
    } catch (saveError) {
      setError(saveError.response?.data?.message || "Failed to save journal entry.");
    } finally {
      setSaving(false);
    }
  };

  const handleRefreshInsight = async () => {
    if (!journal?._id) {
      return;
    }

    try {
      setRefreshingInsight(true);
      setError("");
      const response = await journalApi.refreshInsight(journal._id);
      if (response?.journal) {
        setJournal(response.journal);
      }
    } catch (refreshError) {
      setError(refreshError.response?.data?.message || "Failed to refresh insight.");
    } finally {
      setRefreshingInsight(false);
    }
  };

  const handleSwitchToEdit = () => {
    navigation.replace("JournalEditor", { mode: "edit", entry: journal });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primaryStrong }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={18} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{readOnly ? "View Entry" : mode === "edit" ? "Edit Entry" : "New Entry"}</Text>
          <Text style={styles.headerSubtitle}>{formattedCreatedAt}</Text>
        </View>

        {!readOnly ? (
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.surface }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={[styles.saveButtonText, { color: colors.primary }]}>
                {mode === "edit" ? "Update" : "Save"}
              </Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.surface }]}
            onPress={handleSwitchToEdit}
          >
            <Text style={[styles.saveButtonText, { color: colors.primary }]}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      {!!error && (
        <View
          style={[
            styles.errorBox,
            { backgroundColor: colors.warningBg, borderColor: colors.warningBorder },
          ]}
        >
          <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.muted }]}>Title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            editable={!readOnly}
            placeholder="Entry title"
            placeholderTextColor={colors.muted}
            style={[
              styles.input,
              { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg },
            ]}
          />

          <Text style={[styles.label, { color: colors.muted }]}>Mood</Text>
          <View style={styles.moodWrap}>
            {MOODS.map((item) => (
              <TouchableOpacity
                key={item}
                onPress={() => !readOnly && setMood(item)}
                style={[
                  styles.moodChip,
                  {
                    backgroundColor: mood === item ? colors.primary : colors.inputBg,
                    borderColor: colors.border,
                  },
                ]}
                disabled={readOnly}
              >
                <Text
                  style={[
                    styles.moodChipText,
                    { color: mood === item ? colors.primaryText : colors.muted },
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, { color: colors.muted }]}>Journal entry</Text>
          <TextInput
            value={content}
            onChangeText={setContent}
            editable={!readOnly}
            placeholder="Write your thoughts here..."
            placeholderTextColor={colors.muted}
            multiline
            textAlignVertical="top"
            style={[
              styles.textArea,
              { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg },
            ]}
          />

          <Text style={[styles.label, { color: colors.muted }]}>Tags</Text>
          <TextInput
            value={tagsText}
            onChangeText={setTagsText}
            editable={!readOnly}
            placeholder="focus, gratitude, work"
            placeholderTextColor={colors.muted}
            style={[
              styles.input,
              { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg },
            ]}
          />
          <Text style={[styles.helperText, { color: colors.muted }]}>
            Separate tags with commas. Keep them short and useful for search.
          </Text>
        </View>

        {!!aiInsight && (
          <View style={[styles.insightCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.insightHeader}>
              <View style={styles.insightTitleRow}>
                <Feather name="sparkles" size={16} color={colors.primary} />
                <Text style={[styles.insightTitle, { color: colors.text }]}>AI Insight</Text>
              </View>

              {!!journal?._id && (
                <TouchableOpacity
                  onPress={handleRefreshInsight}
                  style={[styles.refreshButton, { backgroundColor: colors.inputBg }]}
                  disabled={refreshingInsight}
                >
                  {refreshingInsight ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Text style={[styles.refreshText, { color: colors.primary }]}>Refresh</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>

            <Text style={[styles.insightText, { color: colors.text }]}>
              {aiInsight.summary || "No insight summary yet."}
            </Text>
            {!!aiInsight.emotionalTone && (
              <Text style={[styles.suggestedText, { color: colors.muted }]}>Tone: {aiInsight.emotionalTone}</Text>
            )}
            {!!Array.isArray(aiInsight.keyThemes) && aiInsight.keyThemes.length > 0 && (
              <View style={styles.themeRow}>
                {aiInsight.keyThemes.slice(0, 4).map((themeItem) => (
                  <View key={themeItem} style={[styles.themeChip, { backgroundColor: colors.inputBg }]}>
                    <Text style={[styles.themeChipText, { color: colors.muted }]}>{themeItem}</Text>
                  </View>
                ))}
              </View>
            )}
            {!!aiInsight.suggestedAction && (
              <Text style={[styles.suggestedText, { color: colors.muted }]}>Suggested action: {aiInsight.suggestedAction}</Text>
            )}
          </View>
        )}

        {readOnly && (
          <View style={styles.readOnlyNotice}>
            <Text style={[styles.readOnlyText, { color: colors.muted }]}>This entry is read-only. Use Edit to make changes.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 18,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#FFFFFF" },
  headerSubtitle: { marginTop: 4, fontSize: 12, color: "rgba(255,255,255,0.72)" },
  saveButton: {
    minWidth: 78,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: { fontSize: 14, fontWeight: "800" },
  errorBox: {
    borderWidth: 1,
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 14,
    padding: 14,
  },
  errorText: { fontSize: 13, fontWeight: "600" },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    marginTop: 12,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    minHeight: 220,
  },
  helperText: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 17,
  },
  moodWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  moodChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  moodChipText: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  insightCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginTop: 14,
  },
  insightHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  insightTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  insightTitle: { fontSize: 16, fontWeight: "800" },
  refreshButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  refreshText: { fontSize: 12, fontWeight: "800" },
  insightText: { marginTop: 12, fontSize: 14, lineHeight: 20 },
  themeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  themeChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  themeChipText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  suggestedText: { marginTop: 10, fontSize: 13, lineHeight: 19 },
  readOnlyNotice: {
    marginTop: 14,
    alignItems: "center",
  },
  readOnlyText: { fontSize: 12, fontWeight: "700" },
});

export default AddJournalScreen;