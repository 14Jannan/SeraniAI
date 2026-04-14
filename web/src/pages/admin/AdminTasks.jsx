import { useEffect, useMemo, useState } from "react";
import { FiEdit2, FiPlus, FiPower, FiTrash2, FiX } from "react-icons/fi";
import {
  createTask,
  deleteTask,
  fetchAllTasks,
  updateTask,
} from "../../api/tasksApi";

const CATEGORY_OPTIONS = [
  "Mindfulness",
  "Stress Relief",
  "Emotional Awareness",
  "Self-Care",
  "Focus",
];

const TYPE_OPTIONS = ["breathing", "timer", "input", "guided", "action"];
const DIFFICULTY_OPTIONS = ["easy", "medium", "hard"];

const emptyForm = {
  id: "",
  title: "",
  category: "Mindfulness",
  duration: "3 min",
  type: "guided",
  isActive: true,
  difficulty: "easy",
  configText: "{}",
};

function toForm(task) {
  return {
    id: task.id || "",
    title: task.title || "",
    category: task.category || "Mindfulness",
    duration: task.duration || "3 min",
    type: task.type || "guided",
    isActive: !!task.isActive,
    difficulty: task.difficulty || "easy",
    configText: JSON.stringify(task.config || {}, null, 2),
  };
}

export default function AdminTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState("");
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await fetchAllTasks();
      setTasks(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesQuery =
        !query ||
        (task.title || "").toLowerCase().includes(query) ||
        (task.id || "").toLowerCase().includes(query);

      const matchesCategory =
        categoryFilter === "all" || task.category === categoryFilter;

      return matchesQuery && matchesCategory;
    });
  }, [categoryFilter, search, tasks]);

  const openCreate = () => {
    setEditingTaskId("");
    setFormData(emptyForm);
    setIsModalOpen(true);
  };

  const openEdit = (task) => {
    setEditingTaskId(task.id);
    setFormData(toForm(task));
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setIsModalOpen(false);
    setEditingTaskId("");
  };

  const onChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const onSave = async () => {
    if (saving) return;

    try {
      setSaving(true);
      setFeedback("");
      setError("");

      let parsedConfig = {};
      try {
        parsedConfig = JSON.parse(formData.configText || "{}");
      } catch {
        throw new Error("Config must be valid JSON");
      }

      const payload = {
        id: formData.id,
        title: formData.title,
        category: formData.category,
        duration: formData.duration,
        type: formData.type,
        isActive: formData.isActive,
        difficulty: formData.difficulty,
        config: parsedConfig,
      };

      if (!payload.id || !payload.title) {
        throw new Error("Task id and title are required");
      }

      if (editingTaskId) {
        const updated = await updateTask(editingTaskId, payload);
        setTasks((current) =>
          current.map((task) => (task.id === editingTaskId ? updated : task))
        );
        setFeedback("Task updated");
      } else {
        const created = await createTask(payload);
        setTasks((current) => [created, ...current]);
        setFeedback("Task created");
      }

      closeModal();
    } catch (e) {
      setError(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id) => {
    const ok = window.confirm("Delete this task?");
    if (!ok) return;

    try {
      setError("");
      await deleteTask(id);
      setTasks((current) => current.filter((task) => task.id !== id));
      setFeedback("Task deleted");
    } catch (e) {
      setError(e.message || "Delete failed");
    }
  };

  const onToggleActive = async (task) => {
    try {
      setError("");
      const updated = await updateTask(task.id, { isActive: !task.isActive });
      setTasks((current) =>
        current.map((row) => (row.id === task.id ? updated : row))
      );
    } catch (e) {
      setError(e.message || "Failed to toggle task");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Task Management</h1>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-white shadow hover:bg-emerald-700"
        >
          <FiPlus />
          Add Task
        </button>
      </div>

      <div className="flex flex-wrap gap-3 rounded-2xl bg-white p-4 shadow dark:bg-[#0d1a2e]">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by title or id"
          className="min-w-[240px] flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-900"
        />
        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
        >
          <option value="all">All categories</option>
          {CATEGORY_OPTIONS.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="rounded-lg bg-rose-100 px-4 py-2 text-rose-700">{error}</div>}
      {feedback && <div className="rounded-lg bg-emerald-100 px-4 py-2 text-emerald-700">{feedback}</div>}

      <div className="overflow-hidden rounded-2xl bg-white shadow dark:bg-[#0d1a2e]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3">Task</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Difficulty</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center">
                    Loading tasks...
                  </td>
                </tr>
              ) : filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center">
                    No tasks found.
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => (
                  <tr key={task.id} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800 dark:text-white">{task.title}</div>
                      <div className="text-xs text-gray-500">{task.id}</div>
                    </td>
                    <td className="px-4 py-3">{task.category}</td>
                    <td className="px-4 py-3">{task.type}</td>
                    <td className="px-4 py-3 capitalize">{task.difficulty}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          task.isActive
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {task.isActive ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => onToggleActive(task)}
                          className="rounded-md p-2 text-gray-600 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                          title="Toggle Active"
                        >
                          <FiPower />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(task)}
                          className="rounded-md p-2 text-blue-600 transition hover:bg-blue-50"
                          title="Edit Task"
                        >
                          <FiEdit2 />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(task.id)}
                          className="rounded-md p-2 text-rose-600 transition hover:bg-rose-50"
                          title="Delete Task"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#0d1a2e]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                {editingTaskId ? "Edit Task" : "Create Task"}
              </h2>
              <button type="button" onClick={closeModal} className="rounded p-1 text-gray-500 hover:bg-gray-100">
                <FiX />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm">
                Task ID
                <input
                  name="id"
                  value={formData.id}
                  onChange={onChange}
                  disabled={!!editingTaskId}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                />
              </label>
              <label className="text-sm">
                Title
                <input
                  name="title"
                  value={formData.title}
                  onChange={onChange}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                />
              </label>
              <label className="text-sm">
                Category
                <select
                  name="category"
                  value={formData.category}
                  onChange={onChange}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                >
                  {CATEGORY_OPTIONS.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                Type
                <select
                  name="type"
                  value={formData.type}
                  onChange={onChange}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                >
                  {TYPE_OPTIONS.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                Duration
                <input
                  name="duration"
                  value={formData.duration}
                  onChange={onChange}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                />
              </label>
              <label className="text-sm">
                Difficulty
                <select
                  name="difficulty"
                  value={formData.difficulty}
                  onChange={onChange}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                >
                  {DIFFICULTY_OPTIONS.map((difficulty) => (
                    <option key={difficulty} value={difficulty}>
                      {difficulty}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="mt-4 block text-sm">
              Config JSON
              <textarea
                name="configText"
                value={formData.configText}
                onChange={onChange}
                rows={8}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-xs dark:border-gray-700 dark:bg-gray-900"
              />
            </label>

            <label className="mt-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={onChange}
              />
              Active task
            </label>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={saving}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Task"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
