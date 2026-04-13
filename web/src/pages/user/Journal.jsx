import React, { useEffect, useRef, useState, useMemo } from "react";
import { Plus, CalendarDays, Trash2, Pencil, ArrowLeft } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import AddJournal from "./AddJournal";
import { useNavigate, useSearchParams } from "react-router-dom";

const API_URL = "http://localhost:7001/api/journals";

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const parseDateInputAsLocal = (dateString) => {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const Journal = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [mode, setMode] = useState("list"); // list | add | edit | view | dateEvent
  const [entries, setEntries] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const dateInputRef = useRef(null);

  const token = localStorage.getItem("token");
  const dateFromQuery = searchParams.get("date");

  useEffect(() => {
    if (dateFromQuery) {
      setSelectedDate(dateFromQuery);
      setMode("dateEvent");
    }
  }, [dateFromQuery]);

  const fetchJournals = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(API_URL, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch journals");
      }

      setEntries(data.journals || []);
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJournals();
  }, [token]);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const createdAt = entry.createdAt;
      if (!createdAt) {
        return false;
      }

      return getLocalDateString(new Date(createdAt)) === selectedDate;
    });
  }, [entries, selectedDate]);

  const handleCreate = async (newEntry) => {
    try {
      setError("");

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: newEntry.title,
          content: newEntry.text,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to save journal");
      }

      setEntries((prev) => [data.journal, ...prev]);
      setMode("list");
      setSelectedEntry(null);
    } catch (err) {
      setError(err.message || "Failed to save journal");
      throw err;
    }
  };

  const handleUpdate = async (updatedEntry) => {
    try {
      setError("");

      const response = await fetch(`${API_URL}/${updatedEntry._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: updatedEntry.title,
          content: updatedEntry.text,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update journal");
      }

      setEntries((prev) =>
        prev.map((entry) =>
          entry._id === updatedEntry._id ? data.journal : entry
        )
      );

      setMode("list");
      setSelectedEntry(null);
    } catch (err) {
      setError(err.message || "Failed to update journal");
      throw err;
    }
  };

  const handleDelete = async (id) => {
    try {
      setError("");

      const response = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete journal");
      }

      setEntries((prev) => prev.filter((entry) => entry._id !== id));
    } catch (err) {
      setError(err.message || "Failed to delete journal");
    }
  };

  const handleEditClick = (entry) => {
    setSelectedEntry(entry);
    setMode("edit");
  };

  const handleViewClick = (entry) => {
    setSelectedEntry(entry);
    setMode("view");
  };

  const handleAddClick = () => {
    setSelectedEntry(null);
    setMode("add");
  };

  const handleBack = () => {
    setMode("list");
    setSelectedEntry(null);
  };

  const handleBackFromDateEvent = () => {
    setMode("list");
    setSelectedEntry(null);
    navigate("/dashboard/journal");
  };

  const handleTodayClick = () => {
    const today = getLocalDateString();
    setSelectedDate(today);
    setMode("dateEvent");
  };

  const handleViewSelectedDate = () => {
    if (!selectedDate) {
      return;
    }
    setMode("dateEvent");
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatSelectedDate = (dateString) => {
    const [year, month, day] = dateString.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString();
  };

  if (mode === "add") {
    return <AddJournal onBack={handleBack} onSave={handleCreate} />;
  }

  if (mode === "edit") {
    return (
      <AddJournal
        onBack={handleBack}
        onSave={handleUpdate}
        initialData={{
          _id: selectedEntry?._id,
          title: selectedEntry?.title || "",
          text: selectedEntry?.content || "",
        }}
        isEdit={true}
      />
    );
  }

  if (mode === "view") {
    return (
      <AddJournal
        onBack={handleBack}
        onSave={async () => {}}
        initialData={{
          _id: selectedEntry?._id,
          title: selectedEntry?.title || "",
          text: selectedEntry?.content || "",
        }}
        readOnly={true}
      />
    );
  }

  // Theme classes for date event mode
  const bgClass = theme === "dark" ? "bg-slate-950" : "bg-white";
  const scrollBgClass = theme === "dark" ? "bg-slate-950" : "bg-gray-100";
  const darkText = theme === "dark" ? "text-gray-400" : "text-gray-500";
  const darkCardBg =
    theme === "dark"
      ? "bg-slate-900 border-slate-700"
      : "bg-white border-gray-200";
  const darkTitle = theme === "dark" ? "text-gray-100" : "text-gray-700";
  const darkContent = theme === "dark" ? "text-gray-400" : "text-gray-500";

  // Date Event mode (filtered by date)
  if (mode === "dateEvent") {
    return (
      <div className={"w-full h-full flex flex-col " + bgClass}>
        <div className="bg-blue-500 px-6 py-4 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBackFromDateEvent}
            className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg font-semibold"
          >
            <ArrowLeft size={16} />
            Back
          </button>

          <div className="flex items-center gap-2 text-white font-semibold">
            <CalendarDays size={18} />
            <span>{parseDateInputAsLocal(selectedDate).toDateString()}</span>
          </div>
        </div>

        <div className={"flex-1 p-6 space-y-4 overflow-y-auto " + scrollBgClass}>
          {error && (
            <div className="rounded-lg bg-red-100 text-red-700 px-4 py-3 border border-red-200">
              {error}
            </div>
          )}

          {loading ? (
            <p className={darkText}>Loading journal entries...</p>
          ) : filteredEntries.length === 0 ? (
            <p className={darkText}>No journal entries for this date.</p>
          ) : (
            filteredEntries.map((entry) => (
              <div
                key={entry._id}
                className={
                  "rounded-lg shadow p-4 border-l-4 border-green-500 " +
                  darkCardBg
                }
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h4 className={"text-lg font-semibold " + darkTitle}>
                      {entry.title || "Untitled Entry"}
                    </h4>
                    <p
                      className={"mt-2 whitespace-pre-wrap " + darkContent}
                    >
                      {entry.content}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditClick(entry);
                      }}
                      className="p-2 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50"
                      title="Edit"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(entry._id);
                      }}
                      className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-full h-full flex flex-col ${
        theme === "dark" ? "bg-slate-950" : "bg-white"
      }`}
    >
      <div className="bg-blue-500 px-6 py-4 flex justify-end">
        <div className="flex items-center gap-3">
          <button
            onClick={handleTodayClick}
            className="bg-blue-700 hover:bg-blue-800 text-white px-3 py-2 rounded-lg font-semibold"
          >
            Today
          </button>

          <div className="flex items-stretch overflow-hidden rounded-lg shadow-sm">
            <label
              className="relative flex items-center gap-2 bg-blue-700 text-white px-3 py-2 cursor-pointer"
              onClick={() => {
                if (dateInputRef.current?.showPicker) {
                  dateInputRef.current.showPicker();
                } else {
                  dateInputRef.current?.focus();
                }
              }}
            >
              <CalendarDays size={18} />
              <span>{formatSelectedDate(selectedDate)}</span>
              <input
                ref={dateInputRef}
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                }}
                onBlur={() => {
                  handleViewSelectedDate();
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </label>
          </div>

          <button
            onClick={handleAddClick}
            className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg font-semibold"
          >
            <Plus size={18} />
            ADD ENTRY
          </button>
        </div>
      </div>

      <div
        className={`${
          theme === "dark"
            ? "bg-slate-900 border-slate-700"
            : "bg-white border-gray-200"
        } border-b px-6 py-3`}
      >
        <h3
          className={`font-semibold ${
            theme === "dark" ? "text-gray-300" : "text-gray-600"
          }`}
        >
          ALL ENTRIES
        </h3>
      </div>

      <div
        className={`flex-1 p-6 space-y-4 overflow-y-auto ${
          theme === "dark" ? "bg-slate-950" : "bg-gray-100"
        }`}
      >
        {error && (
          <div className="rounded-lg bg-red-100 text-red-700 px-4 py-3 border border-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <p className={theme === "dark" ? "text-gray-400" : "text-gray-500"}>
            Loading journal entries...
          </p>
        ) : entries.length === 0 ? (
          <p className={theme === "dark" ? "text-gray-400" : "text-gray-500"}>
            No journal entries yet.
          </p>
        ) : (
          entries.map((entry) => (
            <div
              key={entry._id}
              onClick={() => handleViewClick(entry)}
              className={`${
                theme === "dark"
                  ? "bg-slate-900 border-slate-700"
                  : "bg-white border-gray-200"
              } rounded-lg shadow p-4 border-l-4 border-green-500 cursor-pointer`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h4
                    className={`text-lg font-semibold ${
                      theme === "dark" ? "text-gray-100" : "text-gray-700"
                    }`}
                  >
                    {entry.title || "Untitled Entry"}
                  </h4>

                  <p
                    className={`${
                      theme === "dark" ? "text-gray-400" : "text-gray-500"
                    } mt-1 line-clamp-3 whitespace-pre-wrap`}
                  >
                    {entry.content}
                  </p>

                  <div
                    className={`flex items-center gap-2 text-sm ${
                      theme === "dark" ? "text-gray-500" : "text-gray-400"
                    } mt-3`}
                  >
                    <CalendarDays size={16} />
                    <span>{formatDate(entry.createdAt)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditClick(entry);
                    }}
                    className="p-2 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50"
                    title="Edit"
                  >
                    <Pencil size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(entry._id);
                    }}
                    className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Journal;