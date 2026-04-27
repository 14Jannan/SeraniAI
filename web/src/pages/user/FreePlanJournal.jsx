import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import AddJournal from "./AddJournal";

const API_URL = "http://localhost:7001/api/journals";

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateInputAsLocal = (dateString) => {
  if (!dateString) {
    return new Date();
  }

  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const getLocalDateKey = (date) => {
  if (!date) {
    return "";
  }

  return getLocalDateString(date);
};

const monthOptions = [
  { value: 0, label: "January" },
  { value: 1, label: "February" },
  { value: 2, label: "March" },
  { value: 3, label: "April" },
  { value: 4, label: "May" },
  { value: 5, label: "June" },
  { value: 6, label: "July" },
  { value: 7, label: "August" },
  { value: 8, label: "September" },
  { value: 9, label: "October" },
  { value: 10, label: "November" },
  { value: 11, label: "December" },
];

const FreePlanJournal = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [mode, setMode] = useState("list"); // list | add | edit | view | dateEvent
  const [entries, setEntries] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);

  const token = localStorage.getItem("token");
  const dateFromQuery = searchParams.get("date");

  useEffect(() => {
    if (dateFromQuery) {
      const parsed = parseDateInputAsLocal(dateFromQuery);
      setSelectedDate(dateFromQuery);
      setCalendarMonth(parsed);
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

  const sortedEntries = useMemo(() => {
    return [...entries].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [entries]);

  const calendarData = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    const firstWeekday = monthStart.getDay();
    const daysInMonth = monthEnd.getDate();
    const prevMonthEnd = new Date(year, month, 0).getDate();

    const cells = [];
    for (let index = 0; index < 42; index += 1) {
      let day;
      let isCurrentMonth = true;

      if (index < firstWeekday) {
        day = prevMonthEnd - firstWeekday + index + 1;
        isCurrentMonth = false;
      } else if (index >= firstWeekday + daysInMonth) {
        day = index - (firstWeekday + daysInMonth) + 1;
        isCurrentMonth = false;
      } else {
        day = index - firstWeekday + 1;
      }

      const today = new Date();
      const isToday =
        isCurrentMonth &&
        day === today.getDate() &&
        month === today.getMonth() &&
        year === today.getFullYear();

      cells.push({ day, isCurrentMonth, isToday, key: `${index}-${day}` });
    }

    return {
      monthLabel: calendarMonth.toLocaleDateString(undefined, {
        month: "short",
        year: "numeric",
      }),
      cells,
    };
  }, [calendarMonth]);

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 50;
    const endYear = currentYear + 10;
    const years = [];

    for (let year = endYear; year >= startYear; year -= 1) {
      years.push(year);
    }

    return years;
  }, []);

  useEffect(() => {
    const parsed = parseDateInputAsLocal(selectedDate);
    setCalendarMonth(parsed);
  }, [selectedDate]);

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
    setSelectedDate(getLocalDateString());
    setMode("list");
    setSelectedEntry(null);
    navigate("/dashboard/journal", { replace: true });
  };

  const handleTodayClick = () => {
    const today = getLocalDateString();
    setCalendarMonth(new Date());
    setSelectedDate(today);
    setMode("dateEvent");
    setShowCalendar(false);
  };

  const handleDateClick = (day) => {
    const newDate = new Date(
      calendarMonth.getFullYear(),
      calendarMonth.getMonth(),
      day
    );
    const dateKey = getLocalDateKey(newDate);
    setSelectedDate(dateKey);
    setMode("dateEvent");
    setShowCalendar(false);
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

  const displayedEntries = sortedEntries;

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
        <div className="relative flex items-center gap-3">
          <button
            onClick={handleTodayClick}
            type="button"
            className="bg-blue-700 hover:bg-blue-800 text-white px-3 py-2 rounded-lg font-semibold relative z-10"
          >
            Today
          </button>

          <div className="inline-flex items-center overflow-hidden rounded-lg shadow-sm bg-blue-700 text-white relative z-20">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setShowCalendar((prev) => !prev);
              }}
              className="flex items-center gap-2 px-3 py-2 font-semibold hover:bg-blue-800 cursor-pointer relative z-30"
            >
              <CalendarDays size={18} />
              <span>{formatSelectedDate(selectedDate)}</span>
            </button>
          </div>

          {showCalendar && (
            <div
              className={`absolute right-0 top-full z-50 mt-2 w-[280px] rounded-2xl border p-4 shadow-2xl ${
                theme === "dark"
                  ? "border-slate-700 bg-slate-950"
                  : "border-gray-200 bg-white"
              }`}
            >
              <div className="mb-3 flex items-center justify-between">
                  <h4
                    className={`font-semibold ${
                      theme === "dark" ? "text-gray-100" : "text-gray-700"
                    }`}
                  >
                    Calendar
                  </h4>
              </div>

                <div className="mb-3 grid grid-cols-2 gap-2">
                  <select
                    value={calendarMonth.getFullYear()}
                    onChange={(event) => {
                      setCalendarMonth(
                        new Date(
                          Number(event.target.value),
                          calendarMonth.getMonth(),
                          1
                        )
                      );
                    }}
                    className={`rounded-lg border px-2 py-2 text-sm outline-none ${
                      theme === "dark"
                        ? "border-slate-700 bg-slate-900 text-gray-100"
                        : "border-gray-200 bg-white text-gray-700"
                    }`}
                  >
                    {yearOptions.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>

                  <select
                    value={calendarMonth.getMonth()}
                    onChange={(event) => {
                      setCalendarMonth(
                        new Date(
                          calendarMonth.getFullYear(),
                          Number(event.target.value),
                          1
                        )
                      );
                    }}
                    className={`rounded-lg border px-2 py-2 text-sm outline-none ${
                      theme === "dark"
                        ? "border-slate-700 bg-slate-900 text-gray-100"
                        : "border-gray-200 bg-white text-gray-700"
                    }`}
                  >
                    {monthOptions.map((month) => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                </div>

              <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                  <div
                    key={day}
                    className={`font-semibold ${
                      theme === "dark" ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1 text-center">
                {calendarData.cells.map((cell) => {
                  const cellDate = cell.isCurrentMonth
                    ? new Date(
                        calendarMonth.getFullYear(),
                        calendarMonth.getMonth(),
                        cell.day
                      )
                    : null;
                  const isSelected =
                    cellDate && getLocalDateKey(cellDate) === selectedDate;

                  return (
                    <button
                      key={cell.key}
                      type="button"
                      onClick={() => cell.isCurrentMonth && handleDateClick(cell.day)}
                      disabled={!cell.isCurrentMonth}
                      className={`h-8 w-8 rounded-full text-xs font-medium disabled:cursor-default ${
                        isSelected
                          ? "bg-blue-600 text-white"
                          : cell.isToday
                            ? "bg-blue-500 text-white"
                            : cell.isCurrentMonth
                              ? theme === "dark"
                                ? "text-gray-200 hover:bg-slate-800"
                                : "text-gray-700 hover:bg-gray-100"
                              : theme === "dark"
                                ? "text-gray-600"
                                : "text-gray-300"
                      }`}
                    >
                      {cell.day}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDate(getLocalDateString());
                    setCalendarMonth(new Date());
                    setMode("dateEvent");
                    setShowCalendar(false);
                  }}
                  className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                >
                  Jump to today
                </button>

                <button
                  type="button"
                  onClick={() => setShowCalendar(false)}
                  className={`text-sm font-semibold ${
                    theme === "dark" ? "text-gray-300" : "text-gray-600"
                  }`}
                >
                  Close
                </button>
              </div>
            </div>
          )}

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
        ) : displayedEntries.length === 0 ? (
          <p className={theme === "dark" ? "text-gray-400" : "text-gray-500"}>
            No journal entries yet.
          </p>
        ) : (
          displayedEntries.map((entry) => (
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

export default FreePlanJournal;