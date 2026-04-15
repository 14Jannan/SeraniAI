export type TaskCategory =
  | "Mindfulness"
  | "Stress Relief"
  | "Emotional Awareness"
  | "Self-Care"
  | "Focus";

export type TaskDifficulty = "easy" | "medium" | "hard";

export type TaskType = "breathing" | "timer" | "input" | "guided" | "action";

export type BaseTask = {
  id: string;
  type: TaskType;
  title: string;
  category: TaskCategory;
  duration: string;
  isActive: boolean;
  difficulty: TaskDifficulty;
  config: Record<string, unknown>;
};

export type BreathingTaskData = BaseTask & {
  type: "breathing";
  config: {
    inhale: number;
    hold: number;
    exhale: number;
    holdAfterExhale?: number;
    cycles?: number;
  };
};

export type TimerTaskData = BaseTask & {
  type: "timer";
  config: {
    minutes: number;
    instruction?: string;
  };
};

export type InputTaskData = BaseTask & {
  type: "input";
  config: {
    prompt?: string;
    placeholder?: string;
    buttonLabel?: string;
  };
};

export type GuidedTaskData = BaseTask & {
  type: "guided";
  config: {
    steps: string[];
  };
};

export type ActionTaskData = BaseTask & {
  type: "action";
  config: {
    instruction: string;
    minutes?: number;
  };
};

export type TaskData =
  | BreathingTaskData
  | TimerTaskData
  | InputTaskData
  | GuidedTaskData
  | ActionTaskData;

export type TaskProgress = {
  taskIds: string[];
  completedTaskIds: string[];
  taskResults: Record<string, unknown>;
  xp: number;
  dateKey: string;
};

export type JournalMap = Record<string, string>;