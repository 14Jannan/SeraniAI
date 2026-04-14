import { CheckCircle2, Play, Pause, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ActionTaskData } from "./taskTypes";

type ActionTaskProps = {
  task: ActionTaskData;
  completed: boolean;
  onComplete: () => void;
};

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const remainder = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

export function ActionTask({ task, completed, onComplete }: ActionTaskProps) {
  const initialSeconds = Number(task.config?.minutes || 2) * 60;
  const instruction = String(task.config?.instruction || "Do one gentle supportive action for your body.");

  const [remainingSeconds, setRemainingSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (!isRunning || remainingSeconds <= 0) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setRemainingSeconds((value) => {
        if (value <= 1) {
          window.clearInterval(interval);
          setIsRunning(false);
          onComplete();
          return 0;
        }
        return value - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isRunning, onComplete, remainingSeconds]);

  const progress = useMemo(() => {
    if (initialSeconds <= 0) {
      return 0;
    }
    return Math.round(((initialSeconds - remainingSeconds) / initialSeconds) * 100);
  }, [initialSeconds, remainingSeconds]);

  return (
    <div className="space-y-4 rounded-[24px] bg-white/70 p-5 ring-1 ring-slate-100">
      <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">
        {instruction}
      </p>

      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">Action timer</p>
          <p className="mt-1 text-4xl font-semibold tracking-tight text-slate-800">{formatTime(remainingSeconds)}</p>
        </div>
        <div className="text-lg font-semibold text-slate-700">{progress}%</div>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-blue-400 transition-all duration-300"
          style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setIsRunning((value) => !value)}
          className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700"
        >
          {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {isRunning ? "Pause" : "Start"}
        </button>
        <button
          type="button"
          onClick={() => {
            setIsRunning(false);
            setRemainingSeconds(initialSeconds);
          }}
          className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </button>
      </div>

      {completed && (
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          Action completed
        </div>
      )}
    </div>
  );
}
