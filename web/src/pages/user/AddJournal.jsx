import React, { useEffect, useState } from "react";
import { CalendarDays, Save, ArrowLeft } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

const AddJournal = ({ onBack, onSave, initialData = null, isEdit = false }) => {
  const { theme } = useTheme();

  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || "");
      setText(initialData.text || "");
    } else {
      setTitle("");
      setText("");
    }
  }, [initialData]);

  const handleSave = async () => {
    if (!title.trim() && !text.trim()) {
      setLocalError("Please add a title or some content.");
      return;
    }

    try {
      setSaving(true);
      setLocalError("");

      if (isEdit) {
        await onSave({
          _id: initialData?._id,
          title: title.trim(),
          text: text.trim(),
        });
      } else {
        await onSave({
          title: title.trim(),
          text: text.trim(),
        });
      }
    } catch (err) {
      setLocalError(err.message || "Failed to save journal");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={`w-full h-full flex flex-col p-4 ${
        theme === "dark" ? "bg-slate-950" : "bg-white"
      }`}
    >
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={onBack}
          className={`flex items-center gap-2 ${
            theme === "dark"
              ? "text-gray-300 hover:text-white"
              : "text-gray-600 hover:text-black"
          }`}
        >
          <ArrowLeft size={18} />
          Back
        </button>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white px-4 py-2 rounded-lg"
        >
          <Save size={16} />
          {saving ? "Saving..." : isEdit ? "Update" : "Save"}
        </button>
      </div>

      {localError && (
        <div className="mb-4 rounded-lg bg-red-100 text-red-700 px-4 py-3 border border-red-200">
          {localError}
        </div>
      )}

      <div
        className={`flex-1 ${
          theme === "dark"
            ? "bg-slate-900 border-slate-700"
            : "bg-white border-gray-200"
        } rounded-xl shadow p-6 border flex flex-col`}
      >
        <input
          type="text"
          placeholder="Entry Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={`w-full text-xl font-semibold border-b pb-2 outline-none ${
            theme === "dark"
              ? "bg-slate-900 text-white border-slate-700 placeholder-gray-500"
              : "bg-white text-black border-gray-200 placeholder-gray-400"
          }`}
        />

        <div
          className={`flex items-center gap-2 ${
            theme === "dark"
              ? "text-gray-400 border-slate-700"
              : "text-gray-500 border-gray-200"
          } mt-4 border-b pb-2`}
        >
          <CalendarDays size={16} />
          <span>
            {isEdit ? "Editing entry" : new Date().toDateString()}
          </span>
        </div>

        <textarea
          placeholder="Write your thoughts..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className={`w-full flex-1 mt-4 resize-none outline-none ${
            theme === "dark"
              ? "bg-slate-900 text-gray-100 placeholder-gray-500"
              : "bg-white text-gray-600 placeholder-gray-400"
          }`}
        />
      </div>
    </div>
  );
};

export default AddJournal;