import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import type { TaskData } from "./taskTypes";

type TaskCardProps = {
  task: TaskData;
  completed: boolean;
  children: ReactNode;
};

export function TaskCard({ task, completed, children }: TaskCardProps) {
  const toneClassByCategory: Record<string, string> = {
    Mindfulness: "from-blue-200 to-sky-100",
    "Stress Relief": "from-emerald-200 to-teal-100",
    "Emotional Awareness": "from-violet-200 to-purple-100",
    "Self-Care": "from-amber-200 to-orange-100",
    Focus: "from-lime-200 to-green-100",
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="relative overflow-hidden rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_18px_50px_rgba(90,118,108,0.10)] backdrop-blur"
    >
      <div
        className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${toneClassByCategory[task.category] || "from-slate-200 to-slate-100"}`}
      />

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
              {task.category}
            </span>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
              {task.duration}
            </span>
            <span className="rounded-full bg-violet-50 px-3 py-1 text-violet-700">
              {task.difficulty}
            </span>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-slate-800">{task.title}</h3>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {completed ? (
            <motion.div
              key="completed"
              initial={{ opacity: 0, scale: 0.7, rotate: -10 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.25 }}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-sm"
            >
              <CheckCircle2 className="h-6 w-6" />
            </motion.div>
          ) : (
            <motion.div
              key="spark"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400"
            >
              <Sparkles className="h-5 w-5" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-5">{children}</div>
    </motion.article>
  );
}