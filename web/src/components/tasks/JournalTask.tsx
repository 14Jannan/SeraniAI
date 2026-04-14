import { useEffect, useState } from "react";
import { CheckCircle2, Save } from "lucide-react";
import type { JournalTaskData } from "./taskTypes";

type JournalTaskProps = {
  task: JournalTaskData;
  completed: boolean;
  initialValue: string;
  onSave: (value: string) => void;
};

export function JournalTask({ task, completed, initialValue, onSave }: JournalTaskProps) {
  const [value, setValue] = useState(initialValue);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleSave = () => {
    const trimmedValue = value.trim();
    if (!trimmedValue) {
      return;
    }

    onSave(trimmedValue);
    setSavedAt(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
  };

  return (
    <div className="space-y-4 rounded-[24px] bg-white/70 p-5 ring-1 ring-slate-100">
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={task.placeholder}
        className="min-h-40 w-full resize-none rounded-3xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-slate-500">
          {savedAt ? `Saved at ${savedAt}` : "Write a few honest lines and save them locally."}
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-violet-700"
        >
          <Save className="h-4 w-4" />
          Save journal
        </button>
      </div>

      {completed && (
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          Reflection saved
        </div>
      )}
    </div>
  );
}