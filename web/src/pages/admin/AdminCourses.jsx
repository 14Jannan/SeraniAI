import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:7001"; // change if you use env later

function getToken() {
  // adjust key if your project uses a different storage key
  return (
    localStorage.getItem("token") || localStorage.getItem("authToken") || ""
  );
}

async function apiGet(path) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json();
}

async function apiRequest(path, method, body, isFormData = false) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      Authorization: `Bearer ${token}`,
    },
    ...(body !== undefined
      ? { body: isFormData ? body : JSON.stringify(body) }
      : {}),
  });

  return res;
}

const StatCard = ({ label, value }) => (
  <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/5 p-5">
    <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
    <div className="mt-2 text-3xl font-semibold text-gray-900 dark:text-gray-100">
      {value}
    </div>
  </div>
);

export default function AdminCourses() {
  const emptyCourseForm = {
    title: "",
    instructorName: "",
    description: "",
    category: "",
    level: "Beginner",
    thumbnailUrl: "",
    isPublished: true,
  };

  const [stats, setStats] = useState(null);
  const [courses, setCourses] = useState([]);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [thumbnail, setThumbnail] = useState(null);
  const [newCourse, setNewCourse] = useState(emptyCourseForm);
  const [editingCourseId, setEditingCourseId] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [isSavingCourse, setIsSavingCourse] = useState(false);
  const [deletingCourseId, setDeletingCourseId] = useState(null);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [initialCourseData, setInitialCourseData] = useState(emptyCourseForm);
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  const query = useMemo(() => search.trim(), [search]);

  const displayedCourses = useMemo(() => {
    const filtered = courses.filter((course) => {
      const levelMatch =
        levelFilter === "all" || (course.level || "") === levelFilter;
      const statusMatch =
        statusFilter === "all" ||
        (statusFilter === "published"
          ? !!course.isPublished
          : !course.isPublished);

      return levelMatch && statusMatch;
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "title-asc")
        return (a.title || "").localeCompare(b.title || "");
      if (sortBy === "title-desc")
        return (b.title || "").localeCompare(a.title || "");
      if (sortBy === "oldest")
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    return sorted;
  }, [courses, levelFilter, statusFilter, sortBy]);

  const extractErrorMessage = async (res, fallback) => {
    try {
      const data = await res.json();
      return data?.message || data?.error || fallback;
    } catch {
      try {
        const text = await res.text();
        return text || fallback;
      } catch {
        return fallback;
      }
    }
  };

  const isCourseFormDirty =
    JSON.stringify(newCourse) !== JSON.stringify(initialCourseData) ||
    !!thumbnail;

  const closeCourseModal = () => {
    if (isSavingCourse) return;

    if (isCourseFormDirty) {
      const ok = window.confirm("You have unsaved changes. Discard changes?");
      if (!ok) return;
    }

    setShowModal(false);
    setEditingCourseId(null);
    setFormErrors({});
    setThumbnail(null);
  };

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const data = await apiGet("/api/admin/categories");
      setCategories(Array.isArray(data) ? data : []);
    } catch (e) {
      setFeedback({
        type: "error",
        message: e.message || "Failed to load categories",
      });
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleCreateCategory = async () => {
    const name = newCategoryName.trim();
    if (!name || isAddingCategory) return;

    try {
      setIsAddingCategory(true);
      setFeedback({ type: "", message: "" });

      const res = await apiRequest("/api/admin/categories", "POST", { name });

      if (!res.ok) {
        const message = await extractErrorMessage(
          res,
          "Failed to create category",
        );
        throw new Error(message);
      }

      const created = await res.json();
      setCategories((prev) => {
        const exists = prev.some(
          (category) =>
            category.name.toLowerCase() === created.name.toLowerCase(),
        );
        if (exists) return prev;
        return [...prev, created].sort((a, b) => a.name.localeCompare(b.name));
      });

      setNewCourse((prev) => ({ ...prev, category: created.name }));
      setFormErrors((prev) => ({ ...prev, category: "" }));
      setNewCategoryName("");
      setFeedback({ type: "success", message: "Category created" });
    } catch (e) {
      setFeedback({
        type: "error",
        message: e.message || "Failed to create category",
      });
    } finally {
      setIsAddingCategory(false);
    }
  };

  const validateCourseForm = () => {
    const errors = {};

    if (!newCourse.title.trim()) errors.title = "Course title is required";
    if (!newCourse.description.trim())
      errors.description = "Course description is required";
    if (!newCourse.instructorName.trim())
      errors.instructorName = "Instructor name is required";
    if (!newCourse.category.trim()) errors.category = "Category is required";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateCourse = async () => {
    if (isSavingCourse) return;
    if (!validateCourseForm()) return;

    try {
      setIsSavingCourse(true);
      setFeedback({ type: "", message: "" });
      const token = localStorage.getItem("token");

      const formData = new FormData();
      formData.append("title", newCourse.title);
      formData.append("instructorName", newCourse.instructorName);
      formData.append("description", newCourse.description);
      formData.append("category", newCourse.category);
      formData.append("level", newCourse.level);
      formData.append("isPublished", String(newCourse.isPublished));

      if (thumbnail) {
        formData.append("thumbnail", thumbnail);
      }

      const res = await fetch("http://localhost:7001/api/admin/courses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const message = await extractErrorMessage(res, "Error creating course");
        throw new Error(message);
      }

      const created = await res.json();

      setCourses((prev) => [created, ...prev]);
      setShowModal(false);
      setFormErrors({});
      setFeedback({ type: "success", message: "Course created successfully" });
    } catch (error) {
      console.error(error);
      setFeedback({
        type: "error",
        message: error.message || "Error creating course",
      });
    } finally {
      setIsSavingCourse(false);
    }
  };
  const handleDeleteCourse = async (id, title) => {
    if (deletingCourseId) return;

    const ok = window.confirm(`Delete course "${title || "this course"}"?`);
    if (!ok) return;

    try {
      setDeletingCourseId(id);
      setFeedback({ type: "", message: "" });
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:7001/api/admin/courses/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const message = await extractErrorMessage(res, "Delete failed");
        throw new Error(message);
      }

      // Remove from UI immediately
      setCourses((prev) => prev.filter((c) => c._id !== id));
      setFeedback({ type: "success", message: "Course deleted successfully" });
    } catch (e) {
      console.error(e);
      setFeedback({ type: "error", message: e.message || "Delete failed" });
    } finally {
      setDeletingCourseId(null);
    }
  };
  const handleUpdateCourse = async () => {
    if (isSavingCourse) return;
    if (!validateCourseForm()) return;

    try {
      setIsSavingCourse(true);
      setFeedback({ type: "", message: "" });
      const token = localStorage.getItem("token");

      const formData = new FormData();
      formData.append("title", newCourse.title);
      formData.append("instructorName", newCourse.instructorName);
      formData.append("description", newCourse.description);
      formData.append("category", newCourse.category);
      formData.append("level", newCourse.level);
      formData.append("isPublished", String(newCourse.isPublished));

      if (thumbnail) {
        formData.append("thumbnail", thumbnail);
      }

      const res = await fetch(
        `http://localhost:7001/api/admin/courses/${editingCourseId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        },
      );

      if (!res.ok) {
        const message = await extractErrorMessage(res, "Update failed");
        throw new Error(message);
      }

      const updated = await res.json();

      setCourses((prev) =>
        prev.map((x) => (x._id === updated._id ? updated : x)),
      );

      setShowModal(false);
      setEditingCourseId(null);
      setFormErrors({});
      setFeedback({ type: "success", message: "Course updated successfully" });
    } catch (e) {
      console.error(e);
      setFeedback({ type: "error", message: e.message || "Update failed" });
    } finally {
      setIsSavingCourse(false);
    }
  };

  const navigate = useNavigate();
  const handleOpenLessons = (course) => {
    if (!course?._id) {
      console.error("courseId is undefined");
      return;
    }

    navigate(`/admin/courses/${course._id}/lessons`, {
      state: {
        courseTitle: course.title || "Selected Course",
      },
    });
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoadingStats(true);
        const data = await apiGet("/api/admin/course-dashboard");
        if (mounted) setStats(data);
      } catch (e) {
        if (mounted) setError(e.message);
      } finally {
        if (mounted) setLoadingStats(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoadingCourses(true);
        setError("");
        const data = await apiGet(
          `/api/admin/courses${query ? `?search=${encodeURIComponent(query)}` : ""}`,
        );
        if (mounted) setCourses(Array.isArray(data) ? data : []);
      } catch (e) {
        if (mounted) setError(e.message);
      } finally {
        if (mounted) setLoadingCourses(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [query]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Courses Management
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage courses, lessons, and enrollments.
          </p>
        </div>

        <button
          className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition"
          onClick={() => {
            if (isSavingCourse) return;
            setEditingCourseId(null);
            setFormErrors({});
            setFeedback({ type: "", message: "" });
            setThumbnail(null);
            setNewCourse(emptyCourseForm);
            setInitialCourseData(emptyCourseForm);
            setNewCategoryName("");
            setShowModal(true);
          }}
        >
          + Add Course
        </button>
      </div>

      {feedback.message ? (
        <div
          className={`rounded-xl px-4 py-3 text-sm ${
            feedback.type === "success"
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Courses"
          value={loadingStats ? "…" : (stats?.totalCourses ?? 0)}
        />
        <StatCard
          label="Total Lessons"
          value={loadingStats ? "…" : (stats?.totalLessons ?? 0)}
        />
        <StatCard
          label="Total Enrolled"
          value={loadingStats ? "…" : (stats?.totalEnrolled ?? 0)}
        />
        <StatCard
          label="Avg Rating"
          value={loadingStats ? "…" : (stats?.avgRating ?? "N/A")}
        />
      </div>

      {/* Search + table */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/5 p-5">
        <div className="flex flex-col gap-3 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Manage Courses
          </h2>

          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-black/20 p-3 md:p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Filters & Sort
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setLevelFilter("all");
                  setStatusFilter("all");
                  setSortBy("newest");
                }}
                className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-black/30 hover:bg-gray-100 dark:hover:bg-white/10 transition"
              >
                Reset
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 w-full">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search courses..."
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-black/30 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500/40"
              />

              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-black/30 focus:ring-2 focus:ring-blue-500/40"
              >
                <option value="all">All Levels</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-black/30 focus:ring-2 focus:ring-blue-500/40"
              >
                <option value="all">All Status</option>
                <option value="published">Published</option>
                <option value="draft">Hidden</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-black/30 focus:ring-2 focus:ring-blue-500/40"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="title-asc">Title A-Z</option>
                <option value="title-desc">Title Z-A</option>
              </select>
            </div>
          </div>
        </div>

        {error ? (
          <div className="text-sm text-red-600 dark:text-red-400 whitespace-pre-wrap">
            {error}
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                <th className="py-3 pr-4">Course</th>
                <th className="py-3 pr-4">Category</th>
                <th className="py-3 pr-4">Lessons</th>
                <th className="py-3 pr-4">Enrolled</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loadingCourses ? (
                <tr>
                  <td
                    className="py-6 text-gray-500 dark:text-gray-400"
                    colSpan={6}
                  >
                    Loading courses…
                  </td>
                </tr>
              ) : displayedCourses.length === 0 ? (
                <tr>
                  <td
                    className="py-6 text-gray-500 dark:text-gray-400"
                    colSpan={6}
                  >
                    No courses match the current filters.
                  </td>
                </tr>
              ) : (
                displayedCourses.map((c) => (
                  <tr
                    key={c._id}
                    className="border-b border-gray-100 dark:border-gray-800"
                  >
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0">
                          {c.thumbnailUrl ? (
                            <img
                              src={c.thumbnailUrl}
                              alt={c.title}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : null}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {c.title}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {c.instructorName || "—"}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 pr-4">
                      <span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200">
                        {c.category || "—"}
                      </span>
                    </td>

                    <td className="py-4 pr-4">{c.lessonsCount ?? 0}</td>
                    <td className="py-4 pr-4">{c.enrolledCount ?? 0}</td>

                    <td className="py-4 pr-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs ${
                          c.isPublished
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                            : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                        }`}
                      >
                        {c.isPublished ? "Published" : "Hidden"}
                      </span>
                    </td>

                    <td className="py-4 pr-0">
                      <div className="flex justify-end gap-2">
                        <button
                          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/10 transition"
                          onClick={() => {
                            if (isSavingCourse) return;
                            setEditingCourseId(c._id);
                            setFormErrors({});
                            setFeedback({ type: "", message: "" });
                            setThumbnail(null);
                            const currentCourse = {
                              title: c.title || "",
                              instructorName: c.instructorName || "",
                              description: c.description || "",
                              category: c.category || "",
                              level: c.level || "Beginner",
                              thumbnailUrl: c.thumbnailUrl || "",
                              isPublished: c.isPublished !== false,
                            };
                            setNewCourse(currentCourse);
                            setInitialCourseData(currentCourse);
                            setNewCategoryName("");
                            setShowModal(true);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="px-3 py-2 rounded-lg border border-blue-500 text-blue-600 hover:bg-blue-50 transition"
                          onClick={() => handleOpenLessons(c)}
                        >
                          Lessons
                        </button>

                        <button
                          disabled={deletingCourseId === c._id}
                          className="px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
                          onClick={() => handleDeleteCourse(c._id, c.title)}
                        >
                          {deletingCourseId === c._id
                            ? "Deleting..."
                            : "Delete"}
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
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-lg p-6 animate-scaleIn">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {editingCourseId ? "Edit Course" : "Add New Course"}
            </h2>

            <div className="space-y-4">
              <input
                placeholder="Course Title"
                value={newCourse.title}
                onChange={(e) => {
                  setNewCourse({ ...newCourse, title: e.target.value });
                  setFormErrors((prev) => ({ ...prev, title: "" }));
                }}
                className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-black/20 text-gray-900 dark:text-gray-100"
              />
              {formErrors.title ? (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {formErrors.title}
                </p>
              ) : null}
              <textarea
                placeholder="Course Description"
                value={newCourse.description}
                onChange={(e) => {
                  setNewCourse({ ...newCourse, description: e.target.value });
                  setFormErrors((prev) => ({ ...prev, description: "" }));
                }}
                className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-black/20 text-gray-900 dark:text-gray-100"
              />
              {formErrors.description ? (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {formErrors.description}
                </p>
              ) : null}

              <input
                placeholder="Instructor Name"
                value={newCourse.instructorName}
                onChange={(e) => {
                  setNewCourse({
                    ...newCourse,
                    instructorName: e.target.value,
                  });
                  setFormErrors((prev) => ({ ...prev, instructorName: "" }));
                }}
                className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-black/20 text-gray-900 dark:text-gray-100"
              />
              {formErrors.instructorName ? (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {formErrors.instructorName}
                </p>
              ) : null}

              <select
                value={newCourse.category}
                onChange={(e) => {
                  setNewCourse({ ...newCourse, category: e.target.value });
                  setFormErrors((prev) => ({ ...prev, category: "" }));
                }}
                className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-black/20 text-gray-900 dark:text-gray-100"
              >
                <option value="">Select Category</option>
                {categories.map((category) => (
                  <option
                    key={category._id || category.name}
                    value={category.name}
                  >
                    {category.name}
                  </option>
                ))}
              </select>
              {formErrors.category ? (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {formErrors.category}
                </p>
              ) : null}

              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-black/20">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                  Create Category
                </p>
                <div className="flex gap-2">
                  <input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="New category name"
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black/30"
                  />
                  <button
                    type="button"
                    disabled={isAddingCategory || !newCategoryName.trim()}
                    onClick={handleCreateCategory}
                    className="px-3 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isAddingCategory ? "Adding..." : "Add"}
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {loadingCategories
                    ? "Loading categories..."
                    : `${categories.length} categories available`}
                </p>
              </div>

              <select
                value={newCourse.level}
                onChange={(e) =>
                  setNewCourse({ ...newCourse, level: e.target.value })
                }
                className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-black/20 text-gray-900 dark:text-gray-100"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>

              <select
                value={String(newCourse.isPublished)}
                onChange={(e) =>
                  setNewCourse({
                    ...newCourse,
                    isPublished: e.target.value === "true",
                  })
                }
                className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-black/20 text-gray-900 dark:text-gray-100"
              >
                <option value="true">Published</option>
                <option value="false">Hidden</option>
              </select>

              <input
                type="file"
                accept="image/*"
                onChange={(e) => setThumbnail(e.target.files[0])}
                className="w-full px-4 py-2 rounded-xl border"
              />
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button disabled={isSavingCourse} onClick={closeCourseModal}>
                Cancel
              </button>

              <button
                disabled={isSavingCourse}
                onClick={
                  editingCourseId ? handleUpdateCourse : handleCreateCourse
                }
                className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSavingCourse
                  ? editingCourseId
                    ? "Updating..."
                    : "Saving..."
                  : editingCourseId
                    ? "Update Course"
                    : "Save Course"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
