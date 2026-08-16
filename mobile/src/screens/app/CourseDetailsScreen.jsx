import React from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import courseApi from "../../api/courseApi";

const progressStorageKey = (courseId) => `course-progress-${courseId}`;

const readStoredProgress = async (courseId) => {
  if (!courseId) {
    return { completedLessonIndexes: [], activeLessonIndex: 0 };
  }

  try {
    const stored = await AsyncStorage.getItem(progressStorageKey(courseId));
    if (!stored) {
      return { completedLessonIndexes: [], activeLessonIndex: 0 };
    }

    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) {
      return { completedLessonIndexes: parsed, activeLessonIndex: 0 };
    }

    return {
      completedLessonIndexes: Array.isArray(parsed.completedLessonIndexes)
        ? parsed.completedLessonIndexes
        : Array.isArray(parsed.completedLessons)
          ? parsed.completedLessons
          : [],
      activeLessonIndex: Number.isInteger(parsed.activeLessonIndex) ? parsed.activeLessonIndex : 0,
    };
  } catch (error) {
    return { completedLessonIndexes: [], activeLessonIndex: 0 };
  }
};

const persistProgress = async (courseId, payload) => {
  if (!courseId) {
    return;
  }

  await AsyncStorage.setItem(progressStorageKey(courseId), JSON.stringify(payload));
};

export const CourseDetailsScreen = ({ route }) => {
  const { colors } = useTheme();
  const { courseId, courseTitle } = route.params || {};

  const [lessons, setLessons] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");
  const [activeLessonIndex, setActiveLessonIndex] = React.useState(0);
  const [completedLessonIndexes, setCompletedLessonIndexes] = React.useState([]);
  const [notes, setNotes] = React.useState("");
  const [journal, setJournal] = React.useState("");
  const [savingNotes, setSavingNotes] = React.useState(false);
  const [markingComplete, setMarkingComplete] = React.useState(false);

  const activeLesson = lessons[activeLessonIndex];

  const loadLessons = React.useCallback(async (isRefresh = false) => {
    if (!courseId) {
      setError("Invalid course selected");
      setLoading(false);
      return;
    }

    try {
      setError("");
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [lessonData, storedProgress] = await Promise.all([
        courseApi.getLessonsByCourse(courseId),
        readStoredProgress(courseId),
      ]);

      setCompletedLessonIndexes(storedProgress.completedLessonIndexes || []);
      setLessons(Array.isArray(lessonData) ? lessonData : []);
      setActiveLessonIndex(Math.min(Math.max(storedProgress.activeLessonIndex || 0, 0), (lessonData || []).length - 1));
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Failed to load lessons");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [courseId]);

  React.useEffect(() => {
    loadLessons();
  }, [loadLessons]);

  React.useEffect(() => {
    if (!activeLesson?._id) {
      setNotes("");
      setJournal("");
      return;
    }

    let ignore = false;

    const loadPersonalData = async () => {
      try {
        const data = await courseApi.getLessonPersonalNotes(activeLesson._id);
        if (!ignore) {
          setNotes(data?.notes || "");
          setJournal(data?.journal || "");
        }
      } catch (notesError) {
        if (!ignore) {
          setNotes("");
          setJournal("");
        }
      }
    };

    loadPersonalData();

    return () => {
      ignore = true;
    };
  }, [activeLesson?._id]);

  const saveProgressToStorage = async (nextIndexes, nextActiveIndex = activeLessonIndex) => {
    if (!courseId) return;
    const completed = Array.isArray(nextIndexes) ? nextIndexes : completedLessonIndexes;
    const total = lessons.length;
    const percentage = total > 0 ? Math.round((completed.length / total) * 100) : 0;

    await persistProgress(courseId, {
      courseId,
      completedLessonIndexes: completed,
      completedLessons: completed,
      activeLessonIndex: Number.isInteger(nextActiveIndex) ? nextActiveIndex : 0,
      totalLessons: total,
      percentage,
      updatedAt: new Date().toISOString(),
    });
  };

  const markLessonCompleted = async (index) => {
    if (completedLessonIndexes.includes(index) || markingComplete) {
      return;
    }

    try {
      setMarkingComplete(true);
      const next = [...completedLessonIndexes, index];
      setCompletedLessonIndexes(next);
      await saveProgressToStorage(next, index);

      const lesson = lessons[index];
      if (lesson?._id) {
        await courseApi.markLessonCompleteForStreak(lesson._id);
      }
    } catch (streakError) {
      // Do not block lesson completion if streak update fails.
    } finally {
      setMarkingComplete(false);
    }
  };

  const saveNotesAndJournal = async () => {
    if (!activeLesson?._id) {
      return;
    }

    const sanitizedNotes = String(notes || "").trim();
    const sanitizedJournal = String(journal || "").trim();

    if (!sanitizedNotes && !sanitizedJournal) {
      Alert.alert("Validation", "Write notes or journal text before saving.");
      return;
    }

    if (sanitizedNotes.length > 5000 || sanitizedJournal.length > 5000) {
      Alert.alert("Validation", "Notes and journal should be under 5000 characters.");
      return;
    }

    try {
      setSavingNotes(true);
      await courseApi.saveLessonPersonalNotes(activeLesson._id, {
        notes: sanitizedNotes,
        journal: sanitizedJournal,
      });
      Alert.alert("Saved", "Lesson notes saved successfully.");
    } catch (saveError) {
      Alert.alert(
        "Save Failed",
        saveError.response?.data?.message || "Could not save lesson notes.",
      );
    } finally {
      setSavingNotes(false);
    }
  };

  const openVideo = async () => {
    if (!activeLesson) {
      return;
    }

    const videoPath = activeLesson.videoUrl || activeLesson.videoFile;
    const url = courseApi.getFileUrl(videoPath);

    if (!url) {
      Alert.alert("Unavailable", "No video available for this lesson.");
      return;
    }

    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      Alert.alert("Unavailable", "Cannot open this video URL.");
      return;
    }

    await Linking.openURL(url);
    await markLessonCompleted(activeLessonIndex);
  };

  React.useEffect(() => {
    if (!courseId) {
      return;
    }

    const persistCurrentState = async () => {
      await saveProgressToStorage(completedLessonIndexes, activeLessonIndex);
    };

    persistCurrentState();
  }, [activeLessonIndex, completedLessonIndexes, courseId]);

  const progress = React.useMemo(() => {
    if (!lessons.length) return 0;
    return Math.round((completedLessonIndexes.length / lessons.length) * 100);
  }, [completedLessonIndexes, lessons]);

  if (loading) {
    return (
      <View style={[styles.loadingWrap, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!lessons.length) {
    return (
      <View style={[styles.loadingWrap, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.muted }}>No lessons found for this course.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primaryStrong }]}> 
        <Text style={styles.headerTitle}>{courseTitle || "Course Lessons"}</Text>
        <Text style={[styles.headerSubtitle, { color: colors.muted }]}> 
          Progress: {progress}% ({completedLessonIndexes.length}/{lessons.length})
        </Text>
      </View>

      {!!error && (
        <View
          style={[
            styles.errorWrap,
            {
              backgroundColor: colors.warningBg,
              borderColor: colors.warningBorder,
            },
          ]}
        >
          <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={() => loadLessons(true)}
            accessibilityRole="button"
            accessibilityLabel="Retry loading lessons"
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={lessons}
        horizontal
        keyExtractor={(item, index) => item._id || String(index)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.lessonTabs}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadLessons(true)}
            tintColor={colors.primary}
          />
        }
        renderItem={({ item, index }) => {
          const isActive = index === activeLessonIndex;
          const isDone = completedLessonIndexes.includes(index);

          return (
            <TouchableOpacity
              style={[
                styles.lessonTab,
                {
                  backgroundColor: isActive ? colors.primary : colors.surface,
                  borderColor: colors.border,
                },
              ]}
              onPress={async () => {
                const nextIndex = index;
                setActiveLessonIndex(nextIndex);
                await saveProgressToStorage(completedLessonIndexes, nextIndex);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Open lesson ${index + 1}`}
            >
              <Text style={{ color: isActive ? "#FFFFFF" : colors.text, fontWeight: "700" }}>
                {index + 1}. {item.title || "Lesson"}
              </Text>
              {isDone && <Feather name="check-circle" size={16} color={isActive ? "#FFFFFF" : colors.primary} />}
            </TouchableOpacity>
          );
        }}
      />

      <View style={[styles.detailsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
        <Text style={[styles.lessonTitle, { color: colors.text }]}>
          {activeLesson?.title || "Lesson"}
        </Text>
        <Text style={[styles.lessonMeta, { color: colors.muted }]}> 
          Duration: {activeLesson?.duration || "Not specified"}
        </Text>
        <Text style={[styles.lessonDescription, { color: colors.muted }]}> 
          {activeLesson?.description || "No lesson description available."}
        </Text>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={openVideo}
            accessibilityRole="button"
            accessibilityLabel="Open current lesson video"
          >
            <Text style={styles.primaryButtonText}>Open Video</Text>
            <Feather name="play-circle" size={16} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: colors.border, backgroundColor: colors.inputBg }]}
            onPress={() => markLessonCompleted(activeLessonIndex)}
            accessibilityRole="button"
            accessibilityLabel="Mark lesson complete"
            disabled={markingComplete}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
              {markingComplete ? "Updating..." : "Mark Complete"}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.fieldLabel, { color: colors.text }]}>Personal Notes</Text>
        <TextInput
          style={[
            styles.textArea,
            { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text },
          ]}
          placeholder="Write your lesson notes..."
          value={notes}
          onChangeText={setNotes}
          multiline
          textAlignVertical="top"
          maxLength={5000}
          accessibilityLabel="Personal lesson notes"
          placeholderTextColor={colors.muted}
        />

        <Text style={[styles.fieldLabel, { color: colors.text }]}>Journal Reflection</Text>
        <TextInput
          style={[
            styles.textArea,
            { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text },
          ]}
          placeholder="How did this lesson help you today?"
          value={journal}
          onChangeText={setJournal}
          multiline
          textAlignVertical="top"
          maxLength={5000}
          accessibilityLabel="Journal reflection"
          placeholderTextColor={colors.muted}
        />

        <TouchableOpacity
          style={[styles.saveNotesButton, { backgroundColor: colors.primaryStrong }]}
          onPress={saveNotesAndJournal}
          disabled={savingNotes}
          accessibilityRole="button"
          accessibilityLabel="Save lesson notes"
        >
          <Text style={styles.saveNotesButtonText}>{savingNotes ? "Saving..." : "Save Notes"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    paddingTop: 46,
    paddingBottom: 22,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "bold",
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 13,
  },
  errorWrap: {
    borderWidth: 1,
    marginHorizontal: 18,
    marginTop: 12,
    borderRadius: 12,
    padding: 10,
  },
  errorText: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  retryButton: {
    marginTop: 8,
    alignSelf: "center",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  lessonTabs: {
    paddingHorizontal: 18,
    paddingTop: 14,
    gap: 8,
  },
  lessonTab: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailsCard: {
    margin: 18,
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    boxShadow: "0px 6px 12px rgba(15, 23, 42, 0.08)",
    elevation: 3,
  },
  lessonTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  lessonMeta: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
  },
  lessonDescription: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
  },
  actionRow: {
    marginTop: 12,
    flexDirection: "row",
    gap: 10,
  },
  primaryButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  secondaryButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryButtonText: {
    fontWeight: "700",
  },
  fieldLabel: {
    marginTop: 14,
    marginBottom: 6,
    fontWeight: "700",
    fontSize: 13,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 88,
    padding: 12,
  },
  saveNotesButton: {
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  saveNotesButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
