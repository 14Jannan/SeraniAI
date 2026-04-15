import React, { useEffect, useState } from "react";
import { Plus, CalendarDays, Trash2, Pencil } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import AddJournal from "./AddJournal";

const API_URL = "http://localhost:7001/api/journals";

const Journal = () => {
  const { theme } = useTheme();

  const [mode, setMode] = useState("list"); // list | add | edit
  const [entries, setEntries] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");

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
  }, []);

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

  const handleAddClick = () => {
    setSelectedEntry(null);
    setMode("add");
  };

  const handleBack = () => {
    setMode("list");
    setSelectedEntry(null);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
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

  return (
    <div
      className={`w-full h-full flex flex-col ${
        theme === "dark" ? "bg-slate-950" : "bg-white"
      }`}
    >
      <div className="bg-blue-500 px-6 py-4 flex justify-end">
        <button
          onClick={handleAddClick}
          className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg font-semibold"
        >
          <Plus size={18} />
          ADD ENTRY
        </button>
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
              className={`${
                theme === "dark"
                  ? "bg-slate-900 border-slate-700"
                  : "bg-white border-gray-200"
              } rounded-lg shadow p-4 border-l-4 border-green-500`}
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
                    onClick={() => handleEditClick(entry)}
                    className="p-2 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50"
                    title="Edit"
                  >
                    <Pencil size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(entry._id)}
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