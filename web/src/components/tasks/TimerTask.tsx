import { useEffect, useMemo, useState } from "react";
import { Pause, Play, RotateCcw, CheckCircle2 } from "lucide-react";
import type { TimerTaskData } from "./taskTypes";

type TimerTaskProps = {
  task: TimerTaskData;
  completed: boolean;
  onComplete: () => void;
};

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const remainingSeconds = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}

export function TimerTask({ task, completed, onComplete }: TimerTaskProps) {
  const initialSeconds = Number(task.config?.minutes || 4) * 60;
  const instruction = String(task.config?.instruction || "Stay present until the timer ends.");
  const [remainingSeconds, setRemainingSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (!isRunning || remainingSeconds <= 0) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setRemainingSeconds((currentSeconds) => {
        if (currentSeconds <= 1) {
          window.clearInterval(interval);
          setIsRunning(false);
          onComplete();
          return 0;
        }

        return currentSeconds - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isRunning, onComplete, remainingSeconds]);

  const progress = useMemo(() => {
    if (initialSeconds === 0) {
      return 0;
    }

    return Math.max(0, Math.min(100, ((initialSeconds - remainingSeconds) / initialSeconds) * 100));
  }, [initialSeconds, remainingSeconds]);

  const resetTimer = () => {
    setIsRunning(false);
    setRemainingSeconds(initialSeconds);
  };

  return (
    <div className="space-y-4 rounded-[24px] bg-white/70 p-5 ring-1 ring-slate-100">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">Countdown</p>
          <p className="mt-1 text-4xl font-semibold tracking-tight text-slate-800">
            {formatTime(remainingSeconds)}
          </p>
        </div>
        <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-100 to-emerald-100 p-2">
          <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-sm font-medium text-slate-500">
            {Math.round(progress)}%
          </div>
        </div>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-400 via-emerald-400 to-violet-400 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setIsRunning((value) => !value)}
          className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
        >
          {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {isRunning ? "Pause" : "Start"}
        </button>
        <button
          type="button"
          onClick={resetTimer}
          className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </button>
      </div>

      <p className="text-sm text-slate-500">{instruction}</p>

      {completed && (
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          Timer completed
        </div>
      )}
    </div>
  );
}