import { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation, useParams } from "react-router-dom";
import { getStoredToken } from "../../utils/authStorage";
import {
  FiEdit,
  FiTrash2,
  FiEye,
  FiThumbsUp,
  FiThumbsDown,
  FiStar,
} from "react-icons/fi";
import ConfirmModal from "../../components/ConfirmModal";

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "";
const CLOUDINARY_UPLOAD_PRESET =
  import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "";
const CLOUDINARY_FOLDERS = {
  lessonThumbnail: "seraniai/lessons/thumbnails",
  lessonVideo: "seraniai/lessons/videos",
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:7001";

function getAuthHeaders() {
  // Lesson mutations are admin-protected; attach bearer token for write operations.
  const token = getStoredToken() || localStorage.getItem("authToken") || "";
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function resolveMediaUrl(url) {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${API_BASE}${url}`;
}

async function uploadToCloudinary(file, resourceType, folder) {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error("Cloudinary is not configured in the web app");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
    {
      method: "POST",
      body: formData,
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Cloudinary upload failed");
  }

  return res.json();
}

const AdminLessons = () => {
  const emptyLessonForm = {
    title: "",
    description: "",
    videoUrl: "",
    thumbnailUrl: "",
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
  const [thumbnailPreview, setThumbnailPreview] = useState("");
  const [lessonToDelete, setLessonToDelete] = useState(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

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
      const res = await fetch(`${API_BASE}/api/lessons/course/${courseId}`);

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
    newLesson.thumbnailUrl !== initialLessonData.thumbnailUrl ||
    !!newLesson.thumbnail ||
    !!newLesson.video;

  const closeLessonModal = (force = false) => {
    if (isSavingLesson) return;

    if (!force && isLessonFormDirty) {
      setShowDiscardConfirm(true);
      return;
    }

    setShowDiscardConfirm(false);
    setShowModal(false);
    setFormErrors({});
    setThumbnailPreview("");
  };

  useEffect(() => {
    let mounted = true;

    const fetchCourseName = async () => {
      try {
        const token = getStoredToken();
        const res = await fetch(`${API_BASE}/api/admin/courses`, {
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

      let thumbnailUrl = newLesson.thumbnailUrl || "";
      let videoUrl = newLesson.videoUrl || "";

      if (newLesson.thumbnail) {
        const uploadedThumbnail = await uploadToCloudinary(
          newLesson.thumbnail,
          "image",
          CLOUDINARY_FOLDERS.lessonThumbnail,
        );
        thumbnailUrl = uploadedThumbnail.secure_url;
      }

      if (newLesson.video) {
        const uploadedVideo = await uploadToCloudinary(
          newLesson.video,
          "video",
          CLOUDINARY_FOLDERS.lessonVideo,
        );
        videoUrl = uploadedVideo.secure_url;
      }

      const formData = new FormData();

      formData.append("courseId", courseId);
      formData.append("title", newLesson.title);
      formData.append("description", newLesson.description);
      formData.append("videoUrl", videoUrl);
      formData.append("order", lessons.length + 1);
      formData.append("thumbnailUrl", thumbnailUrl);

      if (editingId) {
        const res = await fetch(
          `${API_BASE}/api/lessons/${editingId}`,
          {
            method: "PUT",
            headers: {
              ...getAuthHeaders(),
            },
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
        const res = await fetch(`${API_BASE}/api/lessons`, {
          method: "POST",
          headers: {
            ...getAuthHeaders(),
          },
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
      setThumbnailPreview("");
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

  const handleConfirmDeleteLesson = async () => {
    if (!lessonToDelete || deletingLessonId) return;
    const id = lessonToDelete._id;

    try {
      setDeletingLessonId(id);
      setFeedback({ type: "", message: "" });

      const res = await fetch(`${API_BASE}/api/lessons/${id}`, {
        method: "DELETE",
        headers: {
          ...getAuthHeaders(),
        },
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
      setLessonToDelete(null);
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

      // Swap two adjacent order values to move one lesson up/down atomically.
      const [resA, resB] = await Promise.all([
        fetch(`${API_BASE}/api/lessons/${currentLesson._id}`, {
          method: "PUT",
          headers: {
            ...getAuthHeaders(),
          },
          body: currentPayload,
        }),
        fetch(`${API_BASE}/api/lessons/${targetLesson._id}`, {
          method: "PUT",
          headers: {
            ...getAuthHeaders(),
          },
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
      thumbnailUrl: lesson.thumbnail || "",
      thumbnail: null,
      video: null,
    });

    setFormErrors({});
    setFeedback({ type: "", message: "" });
    setInitialLessonData({
      title: lesson.title,
      description: lesson.description,
      videoUrl: lesson.videoUrl,
      thumbnailUrl: lesson.thumbnail || "",
      thumbnail: null,
      video: null,
    });

    setThumbnailPreview(resolveMediaUrl(lesson.thumbnail));

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
            setThumbnailPreview("");
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
              src={resolveMediaUrl(lesson.thumbnail) || "https://via.placeholder.com/400"}
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
                  onClick={() => setLessonToDelete(lesson)}
                  className="text-red-500 hover:text-red-700 disabled:opacity-60 cursor-pointer"
                  aria-label={`Delete lesson ${lesson.title || ""}`}
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
        <div className="fixed inset-0 z-50 overflow-auto bg-black/40 flex items-start sm:items-center justify-center p-4">
          <div className="bg-white p-6 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
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
              accept="image/*"
              className="mb-3"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setNewLesson({
                  ...newLesson,
                  thumbnail: file,
                });
                setThumbnailPreview(
                  file
                    ? URL.createObjectURL(file)
                    : resolveMediaUrl(newLesson.thumbnailUrl),
                );
              }}
            />

            {thumbnailPreview ? (
              <img
                src={thumbnailPreview}
                alt="Lesson thumbnail preview"
                className="h-32 w-full object-cover rounded-lg mb-3 border"
              />
            ) : null}

            <label className="text-sm font-medium">
              <br /> Video File
            </label>

            <input
              type="file"
              accept="video/*"
              className="mb-3"
              onChange={(e) =>
                setNewLesson({
                  ...newLesson,
                  video: e.target.files?.[0] || null,
                })
              }
            />
            {formErrors.video ? (
              <p className="text-sm text-red-600 mb-3">{formErrors.video}</p>
            ) : null}

            <div className="flex justify-end gap-3 mt-5">
              <button
                disabled={isSavingLesson}
                onClick={() => closeLessonModal(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
              >
                Cancel
              </button>

              <button
                disabled={isSavingLesson}
                onClick={handleSaveLesson}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSavingLesson ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discard Unsaved Changes Confirmation Modal */}
      <ConfirmModal
        isOpen={showDiscardConfirm}
        onClose={() => setShowDiscardConfirm(false)}
        onConfirm={() => closeLessonModal(true)}
        title="Discard Unsaved Changes"
        message="You have unsaved changes in this lesson form. Are you sure you want to discard your changes?"
        confirmText="Discard Changes"
        cancelText="Keep Editing"
        variant="warning"
      />

      {/* Delete Lesson Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(lessonToDelete)}
        onClose={() => setLessonToDelete(null)}
        onConfirm={handleConfirmDeleteLesson}
        title="Delete Lesson"
        message={`Are you sure you want to delete "${lessonToDelete?.title || "this lesson"}"? This action cannot be undone.`}
        confirmText="Delete Lesson"
        cancelText="Cancel"
        variant="danger"
        isLoading={Boolean(deletingLessonId)}
        loadingText="Deleting..."
      />
    </div>
  );
};

export default AdminLessons;
