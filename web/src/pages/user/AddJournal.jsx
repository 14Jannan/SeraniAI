import React, { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  Save,
  ArrowLeft,
  Download,
  Mic,
  MicOff,
  Sparkles,
  RefreshCcw,
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

const normalizeSpokenTranscript = (spokenValue) => {
  const text = spokenValue
    .replace(/\bfull stop\b/gi, ".")
    .replace(/\bperiod\b/gi, ".")
    .replace(/\bcomma\b/gi, ",")
    .replace(/\bquestion mark\b/gi, "?")
    .replace(/\bexclamation mark\b/gi, "!")
    .replace(/\bnew line\b/gi, "\n")
    .replace(/\bnext line\b/gi, "\n")
    .replace(/\bparagraph\b/gi, "\n\n");

  return text.replace(/\s+([,.!?])/g, "$1").replace(/\n\s+/g, "\n").trim();
};

const capitalizeFirstLetter = (value) => {
  if (!value) {
    return value;
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const appendSpokenText = (currentValue, spokenValue) => {
  const trimmedSpoken = normalizeSpokenTranscript(spokenValue);

  if (!trimmedSpoken) {
    return currentValue;
  }

  if (!currentValue.trim()) {
    const normalized = capitalizeFirstLetter(trimmedSpoken);
    return /[.!?]$/.test(normalized) ? normalized : `${normalized}.`;
  }

  const trimmedCurrent = currentValue.trimEnd();
  const needsLineBreak =
    /[.!?]$/.test(trimmedCurrent) || trimmedCurrent.endsWith("\n");
  const separator = needsLineBreak ? "\n" : " ";
  const normalized = capitalizeFirstLetter(trimmedSpoken);

  return `${trimmedCurrent}${separator}${normalized}`.replace(/\s+\n/g, "\n");
};

const AddJournal = ({
  onBack,
  onSave,
  onDownload,
  onRefreshInsight,
  initialData = null,
  isEdit = false,
  readOnly = false,
}) => {
  const { theme } = useTheme();
  const recognitionRef = useRef(null);

  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState("");
  const [speechError, setSpeechError] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [refreshingInsight, setRefreshingInsight] = useState(false);

  const aiInsight = initialData?.aiInsight || null;

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || "");
      setText(initialData.text || "");
    } else {
      setTitle("");
      setText("");
    }
  }, [initialData]);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = true;
    recognition.maxAlternatives = 3;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event) => {
      let bestTranscript = "";
      let bestConfidence = -1;

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (!result.isFinal) {
          continue;
        }

        for (
          let alternativeIndex = 0;
          alternativeIndex < result.length;
          alternativeIndex += 1
        ) {
          const alternative = result[alternativeIndex];
          if (alternative.confidence > bestConfidence) {
            bestConfidence = alternative.confidence;
            bestTranscript = alternative.transcript;
          }
        }
      }

      const cleanTranscript = bestTranscript.trim();
      if (!cleanTranscript) {
        return;
      }

      setText((current) => appendSpokenText(current, cleanTranscript));
    };

    recognition.onerror = () => {
      setSpeechError("Voice input is unavailable right now.");
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;

      try {
        recognition.stop();
      } catch (error) {
        void error;
      }

      recognitionRef.current = null;
    };
  }, []);

  const toggleVoiceInput = () => {
    setSpeechError("");

    if (!speechSupported) {
      setSpeechError("Voice input is not supported in this browser.");
      return;
    }

    const recognition = recognitionRef.current;
    if (!recognition) {
      setSpeechError("Voice input is not ready yet.");
      return;
    }

    if (isListening) {
      recognition.stop();
      return;
    }

    try {
      recognition.start();
    } catch (error) {
      setSpeechError("Unable to start voice input. Try again.");
      setIsListening(false);
    }
  };

  const handleRefreshInsight = async () => {
    if (typeof onRefreshInsight !== "function" || !initialData?._id) {
      return;
    }

    try {
      setRefreshingInsight(true);
      setLocalError("");
      await onRefreshInsight(initialData._id);
    } catch (err) {
      setLocalError(err.message || "Failed to refresh insight");
    } finally {
      setRefreshingInsight(false);
    }
  };

  const handleSave = async () => {
    if (readOnly) {
      return;
    }

    if (!title.trim() && !text.trim()) {
      setLocalError("Please add a title or some content.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
    }

    try {
      setSaving(true);
      setLocalError("");

      const payload = {
        title: title.trim(),
        text: text.trim(),
        mood: "",
      };

      if (isEdit) {
        await onSave({ _id: initialData?._id, ...payload });
      } else {
        await onSave(payload);
      }
    } catch (err) {
      setLocalError(err.message || "Failed to save journal");
    } finally {
      setSaving(false);
    }
  };

  const containerClass =
    theme === "dark"
      ? "bg-slate-900 border-slate-700 text-gray-100"
      : "bg-white border-gray-200 text-gray-700";

  return (
    <div
      className={`w-full h-full flex flex-col p-4 ${
        theme === "dark" ? "bg-slate-950" : "bg-white"
      }`}
    >
      <div className="flex justify-between items-center mb-4 gap-3">
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

        <div className="flex items-center gap-3">
          {typeof onDownload === "function" && readOnly && (
            <button
              type="button"
              onClick={onDownload}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg"
            >
              <Download size={16} />
              Download PDF
            </button>
          )}

          {typeof onRefreshInsight === "function" && initialData?._id && (
            <button
              type="button"
              onClick={handleRefreshInsight}
              disabled={refreshingInsight}
              className="flex items-center gap-2 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 disabled:opacity-60 px-4 py-2 rounded-lg"
            >
              <RefreshCcw size={15} />
              {refreshingInsight ? "Refreshing..." : "Refresh Insight"}
            </button>
          )}

          {!readOnly && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white px-4 py-2 rounded-lg"
            >
              <Save size={16} />
              {saving ? "Saving..." : isEdit ? "Update" : "Save"}
            </button>
          )}
        </div>
      </div>

      {localError && (
        <div className="mb-4 rounded-lg bg-red-100 text-red-700 px-4 py-3 border border-red-200">
          {localError}
        </div>
      )}

      {speechError && (
        <div className="mb-4 rounded-lg bg-amber-100 text-amber-800 px-4 py-3 border border-amber-200">
          {speechError}
        </div>
      )}

      <div className={`flex-1 rounded-xl shadow p-6 border flex flex-col gap-4 ${containerClass}`}>
        <input
          type="text"
          placeholder="Entry Title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          readOnly={readOnly}
          className={`w-full text-xl font-semibold border-b pb-2 outline-none ${
            theme === "dark"
              ? "bg-slate-900 text-white border-slate-700 placeholder-gray-500"
              : "bg-white text-black border-gray-200 placeholder-gray-400"
          }`}
        />

        <div
          className={`flex items-center gap-2 ${
            theme === "dark" ? "text-gray-400" : "text-gray-500"
          }`}
        >
          <CalendarDays size={16} />
          <span>{isEdit ? "Editing entry" : new Date().toDateString()}</span>
        </div>

        {!readOnly && (
          <div>
            <button
              type="button"
              onClick={toggleVoiceInput}
              className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 transition-colors ${
                isListening
                  ? "border-rose-400 bg-rose-50 text-rose-600"
                  : theme === "dark"
                    ? "border-slate-700 bg-slate-900 text-gray-300 hover:bg-slate-800"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
              title={isListening ? "Stop voice input" : "Start voice input"}
            >
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
              <span>{isListening ? "Stop mic" : "Start mic"}</span>
            </button>
          </div>
        )}

        <textarea
          placeholder="Write your thoughts..."
          value={text}
          onChange={(event) => setText(event.target.value)}
          readOnly={readOnly}
          className={`w-full flex-1 min-h-[220px] resize-none rounded-lg border px-4 py-4 outline-none ${
            theme === "dark"
              ? "bg-slate-900 text-gray-100 border-slate-700 placeholder-gray-500"
              : "bg-white text-gray-600 border-gray-200 placeholder-gray-400"
          }`}
        />

        {aiInsight?.summary && (
          <div
            className={`rounded-xl border p-4 ${
              theme === "dark"
                ? "bg-slate-950 border-slate-700"
                : "bg-indigo-50 border-indigo-100"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={16} className="text-indigo-500" />
              <h4 className="font-semibold text-indigo-600">AI Insight</h4>
            </div>
            <p className={theme === "dark" ? "text-gray-300" : "text-gray-700"}>
              {aiInsight.summary}
            </p>
            {aiInsight.suggestedAction && (
              <p className={theme === "dark" ? "text-gray-400 mt-2 text-sm" : "text-gray-600 mt-2 text-sm"}>
                Suggested action: {aiInsight.suggestedAction}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AddJournal;
