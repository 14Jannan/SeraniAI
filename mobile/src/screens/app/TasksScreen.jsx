import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
import { useTheme } from "../../context/ThemeContext";
import taskApi from "../../api/taskApi";

const MOOD_TASK_HINTS = {
  low: ["Self-Care", "Stress Relief"],
  neutral: ["Mindfulness", "Emotional Awareness"],
  focused: ["Focus", "Mindfulness"],
  anxious: ["Stress Relief", "Mindfulness"],
};

const normalizeId = (value) => String(value || "").trim();

const taskProgressStorageKey = (dateKey) => `daily-task-progress-${dateKey || "default"}`;

const uniqueIds = (ids) => {
  if (!Array.isArray(ids)) {
    return [];
  }

  return Array.from(new Set(ids.map(normalizeId).filter(Boolean)));
};

export const TasksScreen = () => {
  const { colors } = useTheme();

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");
  const [dateKey, setDateKey] = React.useState("");
  const [tasks, setTasks] = React.useState([]);
  const [streakCount, setStreakCount] = React.useState(0);
  const [selectedMood, setSelectedMood] = React.useState("neutral");
  const [completedTaskIds, setCompletedTaskIds] = React.useState([]);
  const [taskResults, setTaskResults] = React.useState({});
  const [syncing, setSyncing] = React.useState(false);

  const persistTaskProgress = React.useCallback(async (nextCompletedTaskIds, nextTaskResults = taskResults, nextDateKey = dateKey) => {
    if (!nextDateKey) {
      return;
    }

    try {
      await AsyncStorage.setItem(
        taskProgressStorageKey(nextDateKey),
        JSON.stringify({
          completedTaskIds: uniqueIds(nextCompletedTaskIds),
          taskResults: nextTaskResults || {},
          updatedAt: new Date().toISOString(),
        }),
      );
    } catch (error) {
      // Keep local persistence non-blocking.
    }
  }, [dateKey, taskResults]);

  const loadData = React.useCallback(async (isRefresh = false) => {
    try {
      setError("");
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [{ dateKey: dKey, tasks: dailyTasks, progress }, streak] = await Promise.all([
        taskApi.fetchDailyTasks(),
        taskApi.fetchTaskStreak(),
      ]);

      const nextDateKey = dKey || "";
      setDateKey(nextDateKey);
      const activeTasks = Array.isArray(dailyTasks)
        ? dailyTasks.filter((task) => task?.isActive !== false)
        : [];
      setTasks(activeTasks);

      const validTaskIdSet = new Set(
        activeTasks.map((task) => normalizeId(task.id || task.taskId)).filter(Boolean),
      );

      let storedProgress = { completedTaskIds: [], taskResults: {} };
      try {
        const rawStored = await AsyncStorage.getItem(taskProgressStorageKey(nextDateKey));
        if (rawStored) {
          const parsedStored = JSON.parse(rawStored);
          storedProgress = {
            completedTaskIds: uniqueIds(parsedStored?.completedTaskIds),
            taskResults: parsedStored?.taskResults && typeof parsedStored.taskResults === "object"
              ? parsedStored.taskResults
              : {},
          };
        }
      } catch (error) {
        storedProgress = { completedTaskIds: [], taskResults: {} };
      }

      const serverCompleted = uniqueIds(progress?.completedTaskIds).filter((id) =>
        validTaskIdSet.has(id),
      );
      const sanitizedCompleted = serverCompleted.length
        ? serverCompleted
        : storedProgress.completedTaskIds.filter((id) => validTaskIdSet.has(id));
      setCompletedTaskIds(sanitizedCompleted);
      setTaskResults(
        progress?.taskResults && typeof progress.taskResults === "object"
          ? progress.taskResults
          : storedProgress.taskResults || {},
      );
      setStreakCount(streak?.taskStreakCount || 0);
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Unable to load daily tasks right now.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredTasks = React.useMemo(() => {
    const preferredCategories = MOOD_TASK_HINTS[selectedMood] || [];

    const preferred = tasks.filter((task) => preferredCategories.includes(task.category));
    const other = tasks.filter((task) => !preferredCategories.includes(task.category));

    return [...preferred, ...other].slice(0, 5);
  }, [selectedMood, tasks]);

  const completedCount = completedTaskIds.length;
  const totalCount = Math.max(filteredTasks.length, 1);
  const progress = Math.round((completedCount / totalCount) * 100);
  const xp = completedCount * 10;

  React.useEffect(() => {
    if (!dateKey) return;

    persistTaskProgress(completedTaskIds, taskResults, dateKey);
  }, [completedTaskIds, dateKey, persistTaskProgress, taskResults]);

  React.useEffect(() => {
    if (!dateKey || !tasks.length) return;

    const syncProgress = async () => {
      try {
        setSyncing(true);
        await taskApi.saveTaskProgress({
          dateKey,
          taskIds: uniqueIds(tasks.map((task) => task.id || task.taskId)),
          completedTaskIds: uniqueIds(completedTaskIds),
          taskResults,
        });
      } catch (syncError) {
        // Keep local progress; surface only load/save initiated errors.
      } finally {
        setSyncing(false);
      }
    };

    syncProgress();
  }, [completedTaskIds, dateKey, taskResults, tasks]);

  const toggleComplete = (taskId) => {
    const id = normalizeId(taskId);
    if (!id) {
      return;
    }

    setCompletedTaskIds((current) => {
      const nextValue = current.includes(id)
        ? current.filter((existingId) => existingId !== id)
        : uniqueIds([...current, id]);

      persistTaskProgress(nextValue, taskResults, dateKey);
      return nextValue;
    });
  };

  const moodOptions = [
    { key: "low", label: "Low Energy" },
    { key: "neutral", label: "Neutral" },
    { key: "focused", label: "Focused" },
    { key: "anxious", label: "Anxious" },
  ];

  if (loading) {
    return (
      <View style={[styles.loadingWrap, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadData(true)}
          tintColor={colors.primary}
        />
      }
    >
      <View style={[styles.header, { backgroundColor: colors.primaryStrong }]}> 
        <Text style={styles.headerTitle}>Daily Tasks</Text>
        <Text style={[styles.headerSubtitle, { color: colors.muted }]}> 
          Mood-aware task flow for {dateKey || "today"}
        </Text>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
          <Text style={[styles.statLabel, { color: colors.muted }]}>Completed</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>{completedCount}/{totalCount}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
          <Text style={[styles.statLabel, { color: colors.muted }]}>Progress</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>{progress}%</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
          <Text style={[styles.statLabel, { color: colors.muted }]}>Streak</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>{streakCount}d</Text>
        </View>
      </View>

      <Text style={[styles.xpText, { color: colors.primary }]}>XP Earned: {xp}</Text>
      <Text style={[styles.syncText, { color: colors.muted }]}>
        {syncing ? "Syncing progress..." : "Progress synced"}
      </Text>

      <View style={styles.moodRow}>
        {moodOptions.map((mood) => {
          const isActive = selectedMood === mood.key;

          return (
            <TouchableOpacity
              key={mood.key}
              style={[
                styles.moodChip,
                {
                  backgroundColor: isActive ? colors.primary : colors.surface,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setSelectedMood(mood.key)}
              accessibilityRole="button"
              accessibilityLabel={`Select ${mood.label} mood`}
            >
              <Text style={{ color: isActive ? "#FFFFFF" : colors.text, fontWeight: "700" }}>
                {mood.label}
              </Text>
            </TouchableOpacity>
          );
        })}
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
            onPress={() => loadData(true)}
            accessibilityRole="button"
            accessibilityLabel="Retry loading tasks"
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.taskList}>
        {filteredTasks.map((task) => {
          const id = task.id || task.taskId;
          const safeId = normalizeId(id);
          const done = completedTaskIds.includes(safeId);

          return (
            <TouchableOpacity
              key={safeId || task.title}
              style={[
                styles.taskCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: done ? colors.primary : colors.border,
                },
              ]}
              onPress={() => toggleComplete(safeId)}
              accessibilityRole="button"
              accessibilityLabel={`Toggle completion for ${task.title}`}
            >
              <View style={styles.taskHeader}>
                <Text style={[styles.taskTitle, { color: colors.text }]}>{task.title}</Text>
                <Feather name={done ? "check-circle" : "circle"} size={18} color={done ? colors.primary : colors.muted} />
              </View>
              <Text style={[styles.taskMeta, { color: colors.muted }]}>
                {task.category} | {task.duration} | {task.type}
              </Text>
            </TouchableOpacity>
          );
        })}

        {filteredTasks.length === 0 && (
          <Text style={[styles.emptyText, { color: colors.muted }]}>No tasks available today.</Text>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 24,
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
    fontSize: 24,
    fontWeight: "bold",
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 13,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 18,
    marginTop: 14,
  },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "700",
  },
  statValue: {
    marginTop: 3,
    fontSize: 18,
    fontWeight: "700",
  },
  xpText: {
    marginTop: 12,
    marginHorizontal: 18,
    fontSize: 14,
    fontWeight: "700",
  },
  syncText: {
    marginTop: 4,
    marginHorizontal: 18,
    fontSize: 12,
    fontWeight: "600",
  },
  moodRow: {
    marginTop: 10,
    paddingHorizontal: 18,
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
  taskList: {
    marginTop: 12,
    paddingHorizontal: 18,
    gap: 10,
  },
  taskCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    boxShadow: "0px 6px 12px rgba(15, 23, 42, 0.08)",
    elevation: 3,
  },
  taskHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  taskTitle: {
    flex: 1,
    paddingRight: 8,
    fontSize: 15,
    fontWeight: "700",
  },
  taskMeta: {
    fontSize: 12,
    fontWeight: "600",
  },
  emptyText: {
    marginTop: 16,
    textAlign: "center",
    fontSize: 14,
  },
});
