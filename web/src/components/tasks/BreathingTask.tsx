import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Pause, Play, RotateCcw, CheckCircle2 } from "lucide-react";
import type { BreathingTaskData } from "./taskTypes";

type BreathingTaskProps = {
  task: BreathingTaskData;
  completed: boolean;
  onComplete: () => void;
};

type BreathingPhase = "idle" | "inhale" | "hold" | "exhale";

export function BreathingTask({ task, completed, onComplete }: BreathingTaskProps) {
  const inhaleSeconds = Number(task.config?.inhale || 4);
  const holdSeconds = Number(task.config?.hold || 4);
  const exhaleSeconds = Number(task.config?.exhale || 4);
  const holdAfterExhaleSeconds = Number(task.config?.holdAfterExhale || 0);
  const cycles = Number(task.config?.cycles || 4);

  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState<BreathingPhase>("idle");
  const [cycleCount, setCycleCount] = useState(0);

  const phaseSequence = useMemo(
    () => {
      const sequence = [
        { phase: "inhale" as const, duration: inhaleSeconds },
        { phase: "hold" as const, duration: holdSeconds },
        { phase: "exhale" as const, duration: exhaleSeconds },
      ];

      if (holdAfterExhaleSeconds > 0) {
        sequence.push({ phase: "hold" as const, duration: holdAfterExhaleSeconds });
      }

      return sequence;
    },
    [exhaleSeconds, holdAfterExhaleSeconds, holdSeconds, inhaleSeconds]
  );

  const phaseLabel = useMemo(() => {
    if (phase === "idle") {
      return "Ready to begin";
    }

    return phase === "hold"
      ? "Hold gently"
      : phase === "inhale"
        ? "Inhale slowly"
        : "Exhale softly";
  }, [phase]);

  useEffect(() => {
    if (!isRunning) {
      return undefined;
    }

    let cancelled = false;
    let timeoutId: number | undefined;
    let stepIndex = 0;
    let completedCycles = cycleCount;

    const runStep = () => {
      if (cancelled) {
        return;
      }

      const currentStep = phaseSequence[stepIndex];
      setPhase(currentStep.phase);

      timeoutId = window.setTimeout(() => {
        if (cancelled) {
          return;
        }

        const previousStep = currentStep;
        stepIndex = (stepIndex + 1) % phaseSequence.length;
        const nextStep = phaseSequence[stepIndex];

        if (previousStep.phase === "exhale" && nextStep.phase === "inhale") {
          completedCycles += 1;
          setCycleCount(completedCycles);

          if (completedCycles >= cycles) {
            setIsRunning(false);
            onComplete();
            return;
          }
        }

        runStep();
      }, currentStep.duration * 1000);
    };

    runStep();

    return () => {
      cancelled = true;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [cycleCount, cycles, isRunning, onComplete, phaseSequence]);

  const handleStart = () => {
    if (completed) {
      return;
    }

    setIsRunning(true);
    if (phase === "idle") {
      setPhase("inhale");
    }
  };

  const handlePause = () => {
    setIsRunning((value) => !value);
  };

  const handleReset = () => {
    setIsRunning(false);
    setPhase("idle");
    setCycleCount(0);
  };

  const circleScale = phase === "inhale" ? 1.12 : phase === "hold" ? 1.04 : 0.92;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_240px]">
      <div className="rounded-[24px] bg-gradient-to-br from-emerald-50 via-white to-blue-50 p-5">
        <div className="flex flex-col items-center gap-4 text-center">
          <motion.div
            animate={{ scale: circleScale }}
            transition={{ duration: 1.8, ease: "easeInOut" }}
            className="flex h-44 w-44 items-center justify-center rounded-full bg-gradient-to-br from-emerald-300 via-teal-200 to-blue-200 shadow-[0_18px_45px_rgba(45,110,90,0.18)]"
          >
            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-white/80 backdrop-blur">
              <div className="text-center">
                <p className="text-sm font-medium uppercase tracking-[0.3em] text-emerald-700">
                  {phase === "idle" ? "Start" : phase}
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-700">{phaseLabel}</p>
              </div>
            </div>
          </motion.div>

          <div className="space-y-1">
            <p className="text-sm text-slate-500">Completed cycles</p>
            <p className="text-2xl font-semibold text-slate-800">
              {cycleCount}/{cycles}
            </p>
          </div>

          {completed ? (
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              Breathing session complete
            </div>
          ) : (
            <div className="flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={handleStart}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700"
              >
                <Play className="h-4 w-4" />
                Start
              </button>
              <button
                type="button"
                onClick={handlePause}
                className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
              >
                <Pause className="h-4 w-4" />
                {isRunning ? "Pause" : "Resume"}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-200"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </button>
            </div>
          )}
        </div>
      </div>

      <aside className="rounded-[24px] bg-slate-50 p-5">
        <p className="text-sm font-semibold text-slate-700">Flow</p>
        <div className="mt-4 space-y-3 text-sm text-slate-600">
          <div className={`rounded-2xl px-4 py-3 ${phase === "inhale" ? "bg-emerald-100 text-emerald-800" : "bg-white"}`}>
            Inhale for {inhaleSeconds} seconds
          </div>
          <div className={`rounded-2xl px-4 py-3 ${phase === "hold" ? "bg-blue-100 text-blue-800" : "bg-white"}`}>
            Hold for {holdSeconds} seconds
          </div>
          <div className={`rounded-2xl px-4 py-3 ${phase === "exhale" ? "bg-violet-100 text-violet-700" : "bg-white"}`}>
            Exhale for {exhaleSeconds} seconds
          </div>
        </div>
        <p className="mt-4 text-xs leading-5 text-slate-500">
          Breathe gently and let the animation guide the pace. Keep the shoulders relaxed.
        </p>
      </aside>
    </div>
  );
}