import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { GuidedTaskData } from "./taskTypes";

type GuidedTaskProps = {
  task: GuidedTaskData;
  completed: boolean;
  onComplete: () => void;
};

export function GuidedTask({ task, completed, onComplete }: GuidedTaskProps) {
  const steps = Array.isArray(task.config?.steps) && task.config.steps.length > 0
    ? task.config.steps
    : ["Take one gentle breath and return your attention to the present moment."];
  const [stepIndex, setStepIndex] = useState(0);

  const visibleStepIndex = completed ? steps.length - 1 : stepIndex;
  const isLastStep = visibleStepIndex === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
      return;
    }

    setStepIndex((currentStep) => Math.min(currentStep + 1, steps.length - 1));
  };

  return (
    <div className="space-y-5 rounded-[24px] bg-white/70 p-5 ring-1 ring-slate-100">
      <div className="flex items-center justify-between gap-4 text-sm text-slate-500">
        <span>
          Step {visibleStepIndex + 1} of {steps.length}
        </span>
        <span className="rounded-full bg-violet-50 px-3 py-1 text-violet-700">Guided flow</span>
      </div>

      <div className="min-h-28 rounded-3xl bg-gradient-to-br from-violet-50 via-white to-blue-50 p-5 ring-1 ring-white">
        <AnimatePresence mode="wait">
          <motion.p
            key={visibleStepIndex}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
            className="text-lg leading-8 text-slate-700"
          >
            {steps[visibleStepIndex]}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-slate-500">
          Move through each prompt slowly and breathe between steps.
        </div>
        <button
          type="button"
          onClick={handleNext}
          className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-violet-700"
        >
          {isLastStep ? "Complete session" : "Next step"}
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {completed && (
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          Guided task complete
        </div>
      )}
    </div>
  );
}