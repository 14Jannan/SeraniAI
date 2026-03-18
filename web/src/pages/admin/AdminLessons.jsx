import { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation, useParams } from "react-router-dom";
import {
  FiEdit,
  FiTrash2,
  FiEye,
  FiThumbsUp,
  FiThumbsDown,
  FiStar,
} from "react-icons/fi";

const AdminLessons = () => {
  const emptyLessonForm = {
    title: "",
    description: "",
    videoUrl: "",
    thumbnail: null,
    video: null,
  };

  const { courseId } = useParams();
  const location = useLocation();

  const [lessons, setLessons] = useState([]);
  const [courseName, setCourseName] = useState(
    location.state?.courseTitle || "",
  );
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [isSavingLesson, setIsSavingLesson] = useState(false);
  const [deletingLessonId, setDeletingLessonId] = useState(null);
  const [reorderingLessonId, setReorderingLessonId] = useState(null);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [initialLessonData, setInitialLessonData] = useState(emptyLessonForm);
  const [lessonSearch, setLessonSearch] = useState("");
  const [lessonSort, setLessonSort] = useState("order-asc");
  const [videoFilter, setVideoFilter] = useState("all");

  const [newLesson, setNewLesson] = useState(emptyLessonForm);

  const displayedLessons = useMemo(() => {
    const query = lessonSearch.trim().toLowerCase();

    const filtered = lessons.filter((lesson) => {
      const titleMatch =
        !query || (lesson.title || "").toLowerCase().includes(query);
      const hasVideo = !!lesson.videoFile || !!lesson.videoUrl;
      const videoMatch =
        videoFilter === "all" ||
        (videoFilter === "with-video" ? hasVideo : !hasVideo);

      return titleMatch && videoMatch;
    });

    const sorted = [...filtered].sort((a, b) => {
      if (lessonSort === "title-asc")
        return (a.title || "").localeCompare(b.title || "");
      if (lessonSort === "title-desc")
        return (b.title || "").localeCompare(a.title || "");
      if (lessonSort === "newest")
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      if (lessonSort === "oldest")
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      return (a.order || 0) - (b.order || 0);
    });

    return sorted;
  }, [lessons, lessonSearch, lessonSort, videoFilter]);

  /* ---------------- FETCH LESSONS ---------------- */

  const fetchLessons = useCallback(async () => {
    try {
      const res = await fetch(
        `http://localhost:7001/api/lessons/course/${courseId}`,
      );

      const data = await res.json();

      setLessons(data);
    } catch (err) {
      console.log(err);
    }
  }, [courseId]);

  useEffect(() => {
    fetchLessons();
  }, [courseId, fetchLessons]);

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

  const isLessonFormDirty =
    newLesson.title !== initialLessonData.title ||
    newLesson.description !== initialLessonData.description ||
    newLesson.videoUrl !== initialLessonData.videoUrl ||
    !!newLesson.thumbnail ||
    !!newLesson.video;

  const closeLessonModal = () => {
    if (isSavingLesson) return;

    if (isLessonFormDirty) {
      const ok = window.confirm("You have unsaved changes. Discard changes?");
      if (!ok) return;
    }

    setShowModal(false);
    setFormErrors({});
  };

  useEffect(() => {
    let mounted = true;

    const fetchCourseName = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("http://localhost:7001/api/admin/courses", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();

        if (!mounted || !Array.isArray(data)) return;

        const course = data.find((item) => item._id === courseId);
        setCourseName(course?.title || "Selected Course");
      } catch (err) {
        if (mounted) {
          setCourseName("Selected Course");
        }
        console.log(err);
      }
    };

    fetchCourseName();

    return () => {
      mounted = false;
    };
  }, [courseId]);

  const validateLessonForm = () => {
    const errors = {};

    if (!newLesson.title.trim()) errors.title = "Lesson title is required";
    if (!newLesson.description.trim())
      errors.description = "Lesson description is required";
    if (!newLesson.videoUrl.trim() && !newLesson.video) {
      errors.video = "Add video URL or upload a video file";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /* ---------------- SAVE LESSON ---------------- */

  const handleSaveLesson = async () => {
    if (isSavingLesson) return;
    if (!validateLessonForm()) return;

    try {
      setIsSavingLesson(true);
      setFeedback({ type: "", message: "" });

      const formData = new FormData();

      formData.append("courseId", courseId);
      formData.append("title", newLesson.title);
      formData.append("description", newLesson.description);
      formData.append("videoUrl", newLesson.videoUrl);
      formData.append("order", lessons.length + 1);

      if (newLesson.thumbnail)
        formData.append("thumbnail", newLesson.thumbnail);

      if (newLesson.video) formData.append("video", newLesson.video);

      if (editingId) {
        const res = await fetch(
          `http://localhost:7001/api/lessons/${editingId}`,
          {
            method: "PUT",
            body: formData,
          },
        );

        if (!res.ok) {
          const message = await extractErrorMessage(
            res,
            "Failed to update lesson",
          );
          throw new Error(message);
        }
      } else {
        const res = await fetch(`http://localhost:7001/api/lessons`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const message = await extractErrorMessage(
            res,
            "Failed to create lesson",
          );
          throw new Error(message);
        }
      }

      fetchLessons();

      setShowModal(false);
      setEditingId(null);
      setFormErrors({});
      setFeedback({
        type: "success",
        message: editingId
          ? "Lesson updated successfully"
          : "Lesson created successfully",
      });

      setNewLesson(emptyLessonForm);
    } catch (err) {
      console.log(err);
      setFeedback({
        type: "error",
        message: err.message || "Failed to save lesson",
      });
    } finally {
      setIsSavingLesson(false);
    }
  };

  /* ---------------- DELETE LESSON ---------------- */

  const handleDelete = async (id) => {
    if (deletingLessonId) return;

    if (!window.confirm("Delete this lesson?")) return;

    try {
      setDeletingLessonId(id);
      setFeedback({ type: "", message: "" });

      const res = await fetch(`http://localhost:7001/api/lessons/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const message = await extractErrorMessage(
          res,
          "Failed to delete lesson",
        );
        throw new Error(message);
      }

      fetchLessons();
      setFeedback({ type: "success", message: "Lesson deleted successfully" });
    } catch (err) {
      console.log(err);
      setFeedback({
        type: "error",
        message: err.message || "Failed to delete lesson",
      });
    } finally {
      setDeletingLessonId(null);
    }
  };

  const handleMoveLesson = async (lessonId, direction) => {
    if (reorderingLessonId || deletingLessonId || isSavingLesson) return;

    const ordered = [...lessons].sort(
      (a, b) => (a.order || 0) - (b.order || 0),
    );
    const currentIndex = ordered.findIndex((item) => item._id === lessonId);

    if (currentIndex < 0) return;

    const targetIndex =
      direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= ordered.length) return;

    const currentLesson = ordered[currentIndex];
    const targetLesson = ordered[targetIndex];

    const currentOrder = Number(currentLesson.order) || currentIndex + 1;
    const targetOrder = Number(targetLesson.order) || targetIndex + 1;

    try {
      setReorderingLessonId(lessonId);
      setFeedback({ type: "", message: "" });

      const currentPayload = new FormData();
      currentPayload.append("order", targetOrder);

      const targetPayload = new FormData();
      targetPayload.append("order", currentOrder);

      const [resA, resB] = await Promise.all([
        fetch(`http://localhost:7001/api/lessons/${currentLesson._id}`, {
          method: "PUT",
          body: currentPayload,
        }),
        fetch(`http://localhost:7001/api/lessons/${targetLesson._id}`, {
          method: "PUT",
          body: targetPayload,
        }),
      ]);

      if (!resA.ok || !resB.ok) {
        const message = !resA.ok
          ? await extractErrorMessage(resA, "Failed to reorder lessons")
          : await extractErrorMessage(resB, "Failed to reorder lessons");
        throw new Error(message);
      }

      await fetchLessons();
      setFeedback({ type: "success", message: "Lesson order updated" });
    } catch (err) {
      console.log(err);
      setFeedback({
        type: "error",
        message: err.message || "Failed to reorder lessons",
      });
    } finally {
      setReorderingLessonId(null);
    }
  };

  /* ---------------- EDIT LESSON ---------------- */

  const handleEdit = (lesson) => {
    setEditingId(lesson._id);

    setNewLesson({
      title: lesson.title,
      description: lesson.description,
      videoUrl: lesson.videoUrl,
      thumbnail: null,
      video: null,
    });

    setFormErrors({});
    setFeedback({ type: "", message: "" });
    setInitialLessonData({
      title: lesson.title,
      description: lesson.description,
      videoUrl: lesson.videoUrl,
      thumbnail: null,
      video: null,
    });

    setShowModal(true);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Course Lessons</h2>
          <p className="text-sm text-gray-500 mt-1">
            {courseName || "Selected Course"}
          </p>
        </div>

        <button
          onClick={() => {
            if (isSavingLesson) return;
            setFormErrors({});
            setFeedback({ type: "", message: "" });
            setEditingId(null);
            setNewLesson(emptyLessonForm);
            setInitialLessonData(emptyLessonForm);
            setShowModal(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          + Add Lesson
        </button>
      </div>

      {feedback.message ? (
        <div
          className={`mb-4 rounded-xl px-4 py-3 text-sm ${
            feedback.type === "success"
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-3 md:p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Filters & Sort
          </p>
          <button
            type="button"
            onClick={() => {
              setLessonSearch("");
              setLessonSort("order-asc");
              setVideoFilter("all");
            }}
            className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 transition"
          >
            Reset
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input
            value={lessonSearch}
            onChange={(e) => setLessonSearch(e.target.value)}
            placeholder="Search lessons..."
            className="border border-gray-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500/40 outline-none"
          />

          <select
            value={lessonSort}
            onChange={(e) => setLessonSort(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500/40 outline-none"
          >
            <option value="order-asc">Order</option>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="title-asc">Title A-Z</option>
            <option value="title-desc">Title Z-A</option>
          </select>

          <select
            value={videoFilter}
            onChange={(e) => setVideoFilter(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500/40 outline-none"
          >
            <option value="all">All Lessons</option>
            <option value="with-video">With Video</option>
            <option value="without-video">Without Video</option>
          </select>
        </div>
      </div>

      {/* ---------- LESSON CARDS ---------- */}

      <div className="grid md:grid-cols-3 gap-6">
        {displayedLessons.map((lesson, index) => (
          <div
            key={lesson._id}
            className="bg-white rounded-xl shadow hover:shadow-lg transition"
          >
            <img
              src={`http://localhost:7001${lesson.thumbnail}`}
              alt=""
              className="h-44 w-full object-cover rounded-t-xl"
            />

            <div className="p-4">
              <h3 className="font-semibold">
                Lesson {lesson.order || index + 1}: {lesson.title}
              </h3>

              <p className="text-sm text-gray-500">{lesson.description}</p>

              <div className="flex gap-4 mt-3 text-gray-600 text-sm">
                <div className="flex items-center gap-1">
                  <FiEye /> {lesson.views || 0}
                </div>

                <div className="flex items-center gap-1">
                  <FiStar /> {lesson.rating || 0}
                </div>

                <div className="flex items-center gap-1">
                  <FiThumbsUp /> {lesson.likes || 0}
                </div>

                <div className="flex items-center gap-1">
                  <FiThumbsDown /> {lesson.dislikes || 0}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button
                  disabled={reorderingLessonId === lesson._id}
                  onClick={() => handleMoveLesson(lesson._id, "up")}
                  className="text-xs px-2 py-1 border rounded disabled:opacity-50"
                >
                  Up
                </button>

                <button
                  disabled={reorderingLessonId === lesson._id}
                  onClick={() => handleMoveLesson(lesson._id, "down")}
                  className="text-xs px-2 py-1 border rounded disabled:opacity-50"
                >
                  Down
                </button>

                <button onClick={() => handleEdit(lesson)}>
                  <FiEdit />
                </button>

                <button
                  disabled={deletingLessonId === lesson._id}
                  onClick={() => handleDelete(lesson._id)}
                  className="disabled:opacity-60"
                >
                  {deletingLessonId === lesson._id ? "..." : <FiTrash2 />}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ---------- MODAL ---------- */}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center">
          <div className="bg-white p-6 rounded-xl w-[450px]">
            <h2 className="text-lg font-semibold mb-4">
              {editingId ? "Edit Lesson" : "Add Lesson"}
            </h2>

            <input
              placeholder="Lesson title"
              className="border p-2 w-full mb-3"
              value={newLesson.title}
              onChange={(e) => {
                setNewLesson({ ...newLesson, title: e.target.value });
                setFormErrors((prev) => ({ ...prev, title: "" }));
              }}
            />
            {formErrors.title ? (
              <p className="text-sm text-red-600 mb-3">{formErrors.title}</p>
            ) : null}

            <textarea
              placeholder="Description"
              className="border p-2 w-full mb-3"
              value={newLesson.description}
              onChange={(e) => {
                setNewLesson({ ...newLesson, description: e.target.value });
                setFormErrors((prev) => ({ ...prev, description: "" }));
              }}
            />
            {formErrors.description ? (
              <p className="text-sm text-red-600 mb-3">
                {formErrors.description}
              </p>
            ) : null}

            <input
              placeholder="Video URL"
              className="border p-2 w-full mb-3"
              value={newLesson.videoUrl}
              onChange={(e) => {
                setNewLesson({ ...newLesson, videoUrl: e.target.value });
                setFormErrors((prev) => ({ ...prev, video: "" }));
              }}
            />

            <p className="text-xs text-gray-500 mb-3">
              Duration will be auto-detected from the uploaded video.
            </p>

            <label className="text-sm font-medium">Thumbnail</label>

            <input
              type="file"
              className="mb-3"
              onChange={(e) =>
                setNewLesson({
                  ...newLesson,
                  thumbnail: e.target.files[0],
                })
              }
            />

            <label className="text-sm font-medium">
              <br /> Video File
            </label>

            <input
              type="file"
              className="mb-3"
              onChange={(e) =>
                setNewLesson({
                  ...newLesson,
                  video: e.target.files[0],
                })
              }
            />
            {formErrors.video ? (
              <p className="text-sm text-red-600 mb-3">{formErrors.video}</p>
            ) : null}

            <div className="flex justify-end gap-3 mt-5">
              <button disabled={isSavingLesson} onClick={closeLessonModal}>
                Cancel
              </button>

              <button
                disabled={isSavingLesson}
                onClick={handleSaveLesson}
                className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSavingLesson ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLessons;
