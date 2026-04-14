import { CheckCircle2, Send } from "lucide-react";
import { useEffect, useState } from "react";
import type { InputTaskData } from "./taskTypes";

type InputTaskProps = {
  task: InputTaskData;
  completed: boolean;
  initialValue: string;
  onSubmit: (value: string) => void;
};

export function InputTask({ task, completed, initialValue, onSubmit }: InputTaskProps) {
  const [value, setValue] = useState(initialValue);
  const placeholder = String(task.config?.placeholder || "Write your response...");
  const buttonLabel = String(task.config?.buttonLabel || "Save response");
  const prompt = String(task.config?.prompt || "Reflect briefly and respond.");

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleSubmit = () => {
    const trimmedValue = value.trim();
    if (!trimmedValue) {
      return;
    }

    onSubmit(trimmedValue);
  };

  return (
    <div className="space-y-4 rounded-[24px] bg-white/70 p-5 ring-1 ring-slate-100">
      <label className="block text-sm font-medium text-slate-600">
        Reflection
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          className="mt-2 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
        />
      </label>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">{prompt}</p>
        <button
          type="button"
          onClick={handleSubmit}
          className="inline-flex items-center gap-2 rounded-full bg-slate-800 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-900"
        >
          <Send className="h-4 w-4" />
          {buttonLabel}
        </button>
      </div>

      {completed && (
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          Reflection complete
        </div>
      )}
    </div>
  );
}