import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  BatteryCharging,
  CheckCircle2,
  Flower2,
  Focus,
  Loader2,
  Sparkles,
  TimerReset,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ActionTask } from "../../components/tasks/ActionTask";
import { BreathingTask } from "../../components/tasks/BreathingTask";
import { GuidedTask } from "../../components/tasks/GuidedTask";
import { InputTask } from "../../components/tasks/InputTask";
import { TaskCard } from "../../components/tasks/TaskCard";
import { TimerTask } from "../../components/tasks/TimerTask";
import { useLocalStorageState } from "../../components/tasks/useLocalStorageState";
import type { TaskData, TaskProgress } from "../../components/tasks/taskTypes";
import {
  fetchDailyTasks,
  fetchTaskProgress,
  fetchTaskStreak,
  saveTaskProgress,
} from "../../api/tasksApi";

type MoodKey = "low" | "neutral" | "focused" | "anxious";

const STORAGE_KEYS = {
  mood: "serani-mood-selection",
  localProgress: "serani-task-local-progress",
  taskResults: "serani-task-results",
};

const MOOD_TASK_HINTS: Record<MoodKey, string[]> = {
  low: ["Self-Care", "Stress Relief"],
  neutral: ["Mindfulness", "Emotional Awareness"],
  focused: ["Focus", "Mindfulness"],
  anxious: ["Stress Relief", "Mindfulness"],
};

const toneIconMap = {
  breathing: Flower2,
  timer: TimerReset,
  input: Sparkles,
  guided: Focus,
  action: BatteryCharging,
};

function todayDateKey() {
  return new Date().toISOString().slice(0, 10);
}

function TaskRenderer({
  task,
  completed,
  savedResult,
  onComplete,
  onSaveResult,
}: {
  task: TaskData;
  completed: boolean;
  savedResult: string;
  onComplete: () => void;
  onSaveResult: (value: string) => void;
}) {
  switch (task.type) {
    case "breathing":
      return <BreathingTask task={task} completed={completed} onComplete={onComplete} />;
    case "timer":
      return <TimerTask task={task} completed={completed} onComplete={onComplete} />;
    case "input":
      return (
        <InputTask
          task={task}
          completed={completed}
          initialValue={savedResult}
          onSubmit={(value) => {
            onSaveResult(value);
            onComplete();
          }}
        />
      );
    case "guided":
      return <GuidedTask task={task} completed={completed} onComplete={onComplete} />;
    case "action":
      return <ActionTask task={task} completed={completed} onComplete={onComplete} />;
    default:
      return null;
  }
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dateKey, setDateKey] = useState(todayDateKey());
  const [streakCount, setStreakCount] = useState(0);

  const [selectedMood, setSelectedMood] = useLocalStorageState<MoodKey>(STORAGE_KEYS.mood, "neutral");
  const [completedTaskIds, setCompletedTaskIds] = useLocalStorageState<string[]>(STORAGE_KEYS.localProgress, []);
  const [taskResults, setTaskResults] = useLocalStorageState<Record<string, string>>(STORAGE_KEYS.taskResults, {});

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const [{ dateKey: backendDateKey, tasks: backendTasks, progress }, streak] = await Promise.all([
          fetchDailyTasks(),
          fetchTaskStreak(),
        ]);

        if (!active) {
          return;
        }

        const normalizedTasks = (backendTasks || []).filter((task: TaskData) => task.isActive);

        setDateKey(backendDateKey || todayDateKey());
        setTasks(normalizedTasks);
        setStreakCount(streak.taskStreakCount || 0);

        if (progress && Array.isArray(progress.completedTaskIds)) {
          setCompletedTaskIds(progress.completedTaskIds);
        } else {
          const progressFromEndpoint = await fetchTaskProgress(backendDateKey || todayDateKey());
          setCompletedTaskIds(progressFromEndpoint.completedTaskIds || []);
          setTaskResults((currentResults) => ({
            ...currentResults,
            ...(progressFromEndpoint.taskResults || {}),
          }));
        }
      } catch (loadError) {
        console.error(loadError);
        setError("Unable to load daily tasks right now.");
      } finally {
        setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [setCompletedTaskIds, setTaskResults]);

  useEffect(() => {
    if (!dateKey || tasks.length === 0) {
      return;
    }

    const sync = async () => {
      try {
        await saveTaskProgress({
          dateKey,
          taskIds: tasks.map((task) => task.id),
          completedTaskIds,
          taskResults,
        });
      } catch (syncError) {
        console.error("Failed to sync progress", syncError);
      }
    };

    sync();
  }, [completedTaskIds, dateKey, taskResults, tasks]);

  const filteredTasks = useMemo(() => {
    const preferredCategories = MOOD_TASK_HINTS[selectedMood] || [];

    const preferred = tasks.filter((task) => preferredCategories.includes(task.category));
    const other = tasks.filter((task) => !preferredCategories.includes(task.category));

    return [...preferred, ...other].slice(0, 5);
  }, [selectedMood, tasks]);

  const completedCount = completedTaskIds.length;
  const totalCount = Math.max(filteredTasks.length, 1);
  const progress = Math.round((completedCount / totalCount) * 100);
  const xp = completedCount * 10;
  const nextTask = filteredTasks.find((task) => !completedTaskIds.includes(task.id));

  const stats = [
    { label: "Completed", value: `${completedCount}/${totalCount}`, icon: CheckCircle2, tone: "text-emerald-600" },
    { label: "Progress", value: `${progress}%`, icon: BarChart3, tone: "text-blue-600" },
    { label: "XP", value: `${xp}`, icon: Sparkles, tone: "text-violet-600" },
  ];

  const moodOptions: Array<{ key: MoodKey; label: string }> = [
    { key: "low", label: "Low Energy" },
    { key: "neutral", label: "Neutral" },
    { key: "focused", label: "Focused" },
    { key: "anxious", label: "Anxious" },
  ];

  const markComplete = (taskId: string) => {
    setCompletedTaskIds((current) => (current.includes(taskId) ? current : [...current, taskId]));
  };

  const handleSaveResult = (taskId: string, value: string) => {
    setTaskResults((current) => ({
      ...current,
      [taskId]: value,
    }));
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-3 text-slate-600 shadow-sm ring-1 ring-slate-200">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading mindful tasks...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full rounded-[32px] bg-[radial-gradient(circle_at_top,_rgba(213,248,230,0.9),_transparent_40%),linear-gradient(180deg,_#f8fffc_0%,_#f7f9ff_100%)] p-4 sm:p-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <motion.header
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[32px] border border-white/70 bg-white/85 p-6 shadow-[0_20px_60px_rgba(85,112,104,0.10)] backdrop-blur"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
                  <Sparkles className="h-4 w-4" />
                  Serani AI daily mind tasks
                </div>
                <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-800 sm:text-5xl">
                  Interactive wellness flow
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                  Mood-aware rotation of active tasks from your admin library. Date: {dateKey}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-900 px-4 py-3 text-white shadow-lg">
                <p className="text-xs text-white/70">Current task streak</p>
                <p className="text-2xl font-semibold">{streakCount} days</p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {moodOptions.map((mood) => (
                <button
                  key={mood.key}
                  type="button"
                  onClick={() => setSelectedMood(mood.key)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    selectedMood === mood.key
                      ? "bg-emerald-600 text-white shadow"
                      : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {mood.label}
                </button>
              ))}
            </div>
          </motion.header>

          <section className="grid gap-4 sm:grid-cols-3">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="rounded-[28px] border border-white/70 bg-white/85 p-5 shadow-[0_16px_40px_rgba(85,112,104,0.08)]"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-slate-500">{stat.label}</p>
                      <p className="mt-1 text-2xl font-semibold text-slate-800">{stat.value}</p>
                    </div>
                    <Icon className={`h-6 w-6 ${stat.tone}`} />
                  </div>
                </div>
              );
            })}
          </section>

          <section className="space-y-4">
            <div className="h-3 overflow-hidden rounded-full bg-white/90 shadow-inner ring-1 ring-white">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.45 }}
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-blue-400 to-violet-400"
              />
            </div>

            {error && (
              <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-200">{error}</div>
            )}

            <div className="space-y-4">
              {filteredTasks.map((task) => {
                const completed = completedTaskIds.includes(task.id);
                const Icon = toneIconMap[task.type];
                const savedResult = taskResults[task.id] || "";

                return (
                  <TaskCard key={task.id} task={task} completed={completed}>
                    <div className="mb-4 flex items-center gap-3 text-slate-500">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50">
                        <Icon className="h-5 w-5 text-slate-700" />
                      </div>
                      <p className="text-xs text-slate-400">Interactive {task.type} task</p>
                    </div>

                    <TaskRenderer
                      task={task}
                      completed={completed}
                      savedResult={savedResult}
                      onComplete={() => markComplete(task.id)}
                      onSaveResult={(value) => handleSaveResult(task.id, value)}
                    />
                  </TaskCard>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <div className="rounded-[30px] border border-white/70 bg-white/85 p-5 shadow-[0_16px_40px_rgba(85,112,104,0.08)]">
            <h3 className="text-lg font-semibold text-slate-800">Mood-based suggestion</h3>
            <p className="mt-3 text-sm text-slate-500">
              {nextTask
                ? `Next recommended: ${nextTask.title}`
                : "All tasks complete. Take a calm recovery pause."}
            </p>
          </div>

          <div className="rounded-[30px] border border-white/70 bg-white/85 p-5 shadow-[0_16px_40px_rgba(85,112,104,0.08)]">
            <h3 className="text-lg font-semibold text-slate-800">Daily rotation notes</h3>
            <div className="mt-3 space-y-2 text-sm text-slate-500">
              <p>Tasks are sampled from active admin tasks only.</p>
              <p>Journaling is optional, not forced as daily repetition.</p>
              <p>Progress is saved locally and synced to backend.</p>
            </div>
          </div>
        </aside>
      </div>

      <AnimatePresence>
        {completedCount > 0 && completedCount === filteredTasks.length && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-50 rounded-[24px] bg-slate-900 px-5 py-4 text-white shadow-2xl"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Daily flow complete</p>
                <p className="text-sm text-white/70">You earned {xp} XP today.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
