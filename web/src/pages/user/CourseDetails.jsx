import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { getStoredToken } from "../../utils/authStorage";

const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:7001";

const getCourseProgressStorageKey = (courseId) => `course-progress-${courseId}`;

const getStoredCourseProgress = (courseId) => {
  if (!courseId) {
    return {
      completedLessons: [],
      activeLessonIndex: 0,
      lessonProgress: {},
    };
  }

  try {
    const raw = localStorage.getItem(getCourseProgressStorageKey(courseId));
    if (!raw) {
      return {
        completedLessons: [],
        activeLessonIndex: 0,
        lessonProgress: {},
      };
    }

    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      return {
        completedLessons: parsed,
        activeLessonIndex: 0,
        lessonProgress: {},
      };
    }

    return {
      completedLessons: Array.isArray(parsed.completedLessons) ? parsed.completedLessons : [],
      activeLessonIndex: Number.isInteger(parsed.activeLessonIndex) ? parsed.activeLessonIndex : 0,
      lessonProgress:
        parsed.lessonProgress && typeof parsed.lessonProgress === "object"
          ? parsed.lessonProgress
          : {},
    };
  } catch (error) {
    console.error("Failed to read saved course progress", error);
    return {
      completedLessons: [],
      activeLessonIndex: 0,
      lessonProgress: {},
    };
  }
};

export default function CourseDetails() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);

  const [lessons, setLessons] = useState([]);
  const [activeLessonIndex, setActiveLessonIndex] = useState(0);
  const [completedLessons, setCompletedLessons] = useState([]);
  const [lessonProgress, setLessonProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("notes");
  const [notes, setNotes] = useState("");
  const [journal, setJournal] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [streak, setStreak] = useState(0);
  const [notesSaveState, setNotesSaveState] = useState("saved");
  const [lessonDataReady, setLessonDataReady] = useState(false);
  const [derivedDurationSeconds, setDerivedDurationSeconds] = useState({});
  const location = useLocation();
const courseTitle = location.state?.courseTitle || "Course";

  useEffect(() => {
    const restoredProgress = getStoredCourseProgress(courseId);
    setCompletedLessons(restoredProgress.completedLessons);
    setActiveLessonIndex(restoredProgress.activeLessonIndex || 0);
    setLessonProgress(restoredProgress.lessonProgress || {});
  }, [courseId]);

  useEffect(() => {
    if (!courseId) return;

    const payload = {
      completedLessons,
      activeLessonIndex,
      lessonProgress,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(getCourseProgressStorageKey(courseId), JSON.stringify(payload));
  }, [activeLessonIndex, completedLessons, courseId, lessonProgress]);

  useEffect(() => {
    if (!lessons.length) return;

    let nextIndex = activeLessonIndex;

    if (location.state?.lessonId) {
      const index = lessons.findIndex(
        (lesson) => lesson._id.toString() === location.state.lessonId.toString()
      );
      if (index !== -1) {
        nextIndex = index;
      }
    }

    nextIndex = Math.min(Math.max(nextIndex, 0), lessons.length - 1);

    setActiveLessonIndex((current) => (current === nextIndex ? current : nextIndex));
  }, [activeLessonIndex, lessons, location.state?.lessonId]);

  useEffect(() => {
    setLoading(true);
    setError("");

    fetch(`${API_URL}/api/lessons/course/${courseId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load lessons");
        return res.json();
      })
      .then((data) => {
        setLessons(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error(err);
        setError("Unable to load lessons right now.");
      })
      .finally(() => setLoading(false));
  }, [courseId]);

  useEffect(() => {
    const fetchStreak = async () => {
      try {
        const token = getStoredToken();
        if (!token) return;

        const res = await fetch(`${API_URL}/api/streak/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) return;

        const data = await res.json();
        setStreak(data?.streakCount || 0);
      } catch (err) {
        console.error("Error fetching streak:", err);
      }
    };

    fetchStreak();
  }, [courseId]);

  useEffect(() => {
    if (!lessons.length) return;

    // Track if component unmounts to prevent setting state on unmounted component
    let cancelled = false;

    const deriveDurations = async () => {
      // Auto-derive video duration from actual video metadata when lesson duration is missing or invalid.
      // This handles lessons where admin didn't specify duration—we extract it directly from the video file.
      const candidates = lessons.filter((lesson) => {
        const minutes = Number(lesson.duration);
        return (
          (!Number.isFinite(minutes) || minutes <= 0) &&
          (lesson.videoUrl || lesson.videoFile)
        );
      });

      if (!candidates.length) return;

      // Create virtual video elements to load metadata and extract duration (in seconds).
      // This allows us to show accurate video length without requiring user to upload duration manually.
      const results = await Promise.all(
        candidates.map(
          (lesson) =>
            new Promise((resolve) => {
              const video = document.createElement("video");
              video.preload = "metadata";

              video.onloadedmetadata = () => {
                const seconds = Math.max(1, Math.round(video.duration || 0));
                resolve({ id: lesson._id, seconds });
              };

              video.onerror = () => resolve({ id: lesson._id, seconds: null });
              // Support both external URLs (videoUrl) and uploaded files (videoFile stored at API_URL + path)
              video.src = lesson.videoUrl || `${API_URL}${lesson.videoFile}`;
            })
        )
      );

      // Prevent state update if component unmounted while fetching durations
      if (cancelled) return;

      // Store derived durations in state, indexed by lesson ID for quick lookup
      setDerivedDurationSeconds((prev) => {
        const next = { ...prev };
        results.forEach(({ id, seconds }) => {
          if (seconds && seconds > 0) {
            next[id] = seconds;
          }
        });
        return next;
      });
    };

    deriveDurations();

    return () => {
      cancelled = true;
    };
  }, [lessons]);

  useEffect(() => {
    const activeLesson = lessons[activeLessonIndex];
    if (!activeLesson?._id) return;

    // Prevent state updates if user navigates away before async fetch completes
    let ignore = false;

    const loadLessonData = async () => {
      setLessonDataReady(false);
      setNotesSaveState("saved");
      setIsPlaying(false);

      // Prefer localStorage for faster UX; backend data will override if user is logged in
      const savedNotes = localStorage.getItem(`lesson-notes-${activeLesson._id}`) || "";
      const savedJournal = localStorage.getItem(`lesson-journal-${activeLesson._id}`) || "";
      const token = getStoredToken();

      // If not logged in, use only localStorage data
      if (!token) {
        if (!ignore) {
          setNotes(savedNotes);
          setJournal(savedJournal);
          setLessonDataReady(true);
        }
        return;
      }

      try {
        // Fetch backend-synced personal notes for this lesson
        const res = await fetch(`${API_URL}/api/lessons/${activeLesson._id}/personal-notes`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error("Failed to load personal notes");
        }

        const data = await res.json();

        if (!ignore) {
          // Backend data takes priority; fall back to localStorage if empty
          setNotes(data?.notes ?? savedNotes);
          setJournal(data?.journal ?? savedJournal);
          setLessonDataReady(true);
        }
      } catch (err) {
        console.error("Error loading lesson notes:", err);
        if (!ignore) {
          // If backend fails, use localStorage and mark as local-only
          setNotes(savedNotes);
          setJournal(savedJournal);
          setNotesSaveState("local");
          setLessonDataReady(true);
        }
      }
    };

    loadLessonData();

    return () => {
      ignore = true;
    };
  }, [activeLessonIndex, lessons]);

  // Auto-save notes and journal with debouncing (700ms) to avoid excessive backend requests
  useEffect(() => {
    const activeLesson = lessons[activeLessonIndex];
    if (!activeLesson?._id || !lessonDataReady) return;

    // Always save to localStorage first for offline availability
    localStorage.setItem(`lesson-notes-${activeLesson._id}`, notes);
    localStorage.setItem(`lesson-journal-${activeLesson._id}`, journal);

    const token = getStoredToken();

    if (!token) {
      setNotesSaveState("local");
      return;
    }

    setNotesSaveState("saving");

    // Debounce backend sync—wait 700ms of inactivity before uploading.
    // This prevents rapid API calls while user is still actively typing.
    const timeoutId = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/api/lessons/${activeLesson._id}/personal-notes`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ notes, journal }),
        });

        if (!res.ok) {
          throw new Error("Failed to save personal notes");
        }

        setNotesSaveState("saved");
      } catch (err) {
        console.error("Error saving lesson notes:", err);
        // If save fails, mark as local-only (data is not lost since localStorage keeps it)
        setNotesSaveState("local");
      }
    }, 700);

    return () => clearTimeout(timeoutId);
  }, [notes, journal, activeLessonIndex, lessons, lessonDataReady]);

  const activeLesson = lessons[activeLessonIndex];

  const saveLessonProgress = (seconds) => {
    if (!activeLesson?._id) return;

    const safeSeconds = Math.max(0, Math.floor(seconds || 0));
    setLessonProgress((previous) => ({
      ...previous,
      [activeLesson._id]: safeSeconds,
    }));
  };

  const progress = useMemo(() => {
    if (!lessons.length) return 0;
    return Math.round((completedLessons.length / lessons.length) * 100);
  }, [completedLessons, lessons]);

  const getLessonDurationSeconds = (lesson) => {
    const storedMinutes = Number(lesson?.duration);

    if (Number.isFinite(storedMinutes) && storedMinutes > 0) {
      return Math.round(storedMinutes * 60);
    }

    return derivedDurationSeconds[lesson?._id] || null;
  };

  const formatDuration = (seconds) => {
    const totalSeconds = Number(seconds);

    if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
      return "Duration pending";
    }

    const rounded = Math.round(totalSeconds);
    const hours = Math.floor(rounded / 3600);
    const minutes = Math.floor((rounded % 3600) / 60);
    const remainingSeconds = rounded % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }

    return `${remainingSeconds}s`;
  };

  const getLessonDurationLabel = (lesson) => {
    const seconds = getLessonDurationSeconds(lesson);
    return formatDuration(seconds);
  };

  const watchedSeconds = lessons
    .slice(0, completedLessons.length)
    .reduce((sum, lesson) => {
      const seconds = getLessonDurationSeconds(lesson);
      return Number.isFinite(seconds) && seconds > 0 ? sum + seconds : sum;
    }, 0);

  const addCompletedLesson = (index) => {
    setCompletedLessons((prev) => [...new Set([...prev, index])]);
  };

  const completeLessonStreak = async () => {
    try {
      const token = getStoredToken();
      if (!token) return;

      const res = await fetch(`${API_URL}/api/streak/complete-lesson`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          lessonId: activeLesson?._id,
        }),
      });

      if (!res.ok) return;

      const data = await res.json();
      setStreak(data?.streakCount || 0);
    } catch (err) {
      console.error("Error updating streak:", err);
    }
  };

  const goNextLesson = () => {
    if (activeLessonIndex < lessons.length - 1) {
      setActiveLessonIndex((prev) => prev + 1);
    }
  };

  const goPrevLesson = () => {
    if (activeLessonIndex > 0) {
      setActiveLessonIndex((prev) => prev - 1);
    }
  };

  const handleLessonClick = (index) => {
    setActiveLessonIndex(index);
  };

  const markCompleted = async () => {
    if (completedLessons.includes(activeLessonIndex)) return;
    addCompletedLesson(activeLessonIndex);
    await completeLessonStreak();
  };

  // Auto-complete lesson when video finishes and auto-advance to next lesson
  const handleVideoEnded = async () => {
    setIsPlaying(false);

    // Mark as completed if not already (ensures streak is updated)
    if (!completedLessons.includes(activeLessonIndex)) {
      addCompletedLesson(activeLessonIndex);
      await completeLessonStreak();
    }

    // Automatically move to next lesson for seamless progression
    goNextLesson();
  };

  const togglePlay = () => {
    if (!videoRef.current) return;

    if (videoRef.current.paused) {
      videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
  };

  const handleStartJournal = () => {
    navigate("/dashboard/journal");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center text-gray-500 dark:text-gray-300">
        Loading lessons...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center text-red-500">
        {error}
      </div>
    );
  }

  if (!lessons.length) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center text-gray-500 dark:text-gray-300">
        No lessons found for this course.
      </div>
    );
  }

  const currentCompleted = completedLessons.includes(activeLessonIndex);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* top section */}
<div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
  <div className="max-w-[1500px] mx-auto px-4 md:px-6 py-4">

    <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">

      <span
        className="cursor-pointer hover:text-purple-600"
        onClick={() => navigate("/dashboard/courses")}
      >
        {courseTitle}
      </span>

      <span>›</span>

      <span className="font-medium text-gray-700 dark:text-gray-200">
        Lesson {activeLessonIndex + 1}
      </span>

    </div>

  </div>
</div>
      <div className="max-w-[1500px] mx-auto grid grid-cols-1 xl:grid-cols-[1.8fr_360px] gap-0">
        {/* left main content */}
        <div className="border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 min-h-screen">
          {/* video block */}
          <div className="p-4 md:p-6">
            <div className="overflow-hidden rounded-3xl shadow-xl bg-gradient-to-r from-purple-700 via-pink-600 to-red-500">
              <div className="relative group">
                {activeLesson.videoUrl || activeLesson.videoFile ? (
                  <video
                    ref={videoRef}
                    src={activeLesson.videoUrl || `${API_URL}${activeLesson.videoFile}`}
                    onLoadedMetadata={() => {
                      const storedSeconds = lessonProgress[activeLesson._id];
                      if (!videoRef.current || !Number.isFinite(storedSeconds) || storedSeconds <= 0) return;

                      const maxDuration = Number(videoRef.current.duration);
                      const resumeAt = Number.isFinite(maxDuration) && maxDuration > 0
                        ? Math.min(storedSeconds, Math.max(1, Math.floor(maxDuration - 1)))
                        : storedSeconds;

                      if (resumeAt > 0) {
                        videoRef.current.currentTime = resumeAt;
                      }
                    }}
                    onTimeUpdate={(event) => saveLessonProgress(event.currentTarget.currentTime)}
                    onEnded={handleVideoEnded}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    controls
                    className="w-full h-[280px] md:h-[420px] xl:h-[500px] object-cover bg-black/30"
                  />
                ) : (
                  <div className="h-[280px] md:h-[420px] xl:h-[500px] flex items-center justify-center text-white text-lg">
                    Video unavailable
                  </div>
                )}

                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <div className="flex items-center gap-6 opacity-90">
                    <button
                      onClick={goPrevLesson}
                      className="pointer-events-auto bg-white/20 hover:bg-white/30 text-white rounded-full w-12 h-12 flex items-center justify-center backdrop-blur"
                    >
                      ◀
                    </button>

                    <button
                      onClick={togglePlay}
                      className="pointer-events-auto bg-white text-purple-700 hover:bg-purple-50 rounded-full w-16 h-16 flex items-center justify-center text-2xl shadow-lg"
                    >
                      {isPlaying ? "⏸" : "▶"}
                    </button>

                    <button
                      onClick={goNextLesson}
                      className="pointer-events-auto bg-white/20 hover:bg-white/30 text-white rounded-full w-12 h-12 flex items-center justify-center backdrop-blur"
                    >
                      ▶
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* lesson header */}
            <div className="mt-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {activeLesson.title}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                  <span>{getLessonDurationLabel(activeLesson)}</span>
                  <span>•</span>
                  <span>Lesson {activeLessonIndex + 1} of {lessons.length}</span>
                  <span>•</span>
                  <span className="text-yellow-500">★ 4.9</span>
                  <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                    Progress {progress}%
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={markCompleted}
                  disabled={currentCompleted}
                  className={`px-4 py-2 rounded-xl font-medium transition ${
                    currentCompleted
                      ? "bg-gray-300 text-gray-600 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400"
                      : "bg-green-600 hover:bg-green-700 text-white"
                  }`}
                >
                  {currentCompleted ? "Completed" : "Mark Complete"}
                </button>

                <button
                  onClick={goPrevLesson}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Prev
                </button>

                <button
                  onClick={goNextLesson}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 text-white hover:opacity-90"
                >
                  Next
                </button>
              </div>
            </div>

            <p className="mt-4 text-gray-600 dark:text-gray-300 leading-7">
              {activeLesson.description || "No description available for this lesson."}
            </p>
          </div>

          {/* notes/journal section */}
          <div className="border-t border-gray-200 dark:border-gray-800">
            <div className="px-4 md:px-6 pt-4 flex gap-6 border-b border-gray-200 dark:border-gray-800">
              <button
                onClick={() => setActiveTab("notes")}
                className={`pb-3 text-sm font-medium border-b-2 transition ${
                  activeTab === "notes"
                    ? "border-purple-600 text-purple-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                Notes
              </button>

              <button
                onClick={() => setActiveTab("journal")}
                className={`pb-3 text-sm font-medium border-b-2 transition ${
                  activeTab === "journal"
                    ? "border-pink-600 text-pink-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                Journal
              </button>
            </div>

            <div className="p-4 md:p-6">
              {activeTab === "notes" ? (
                <div className="space-y-4">
                  <div className="rounded-2xl bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/30 p-4">
                    <h3 className="font-semibold text-purple-800 dark:text-purple-300 mb-3">
                      Your Notes
                    </h3>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Write the key ideas from this lesson..."
                      className="w-full h-56 rounded-2xl border border-purple-200 dark:border-purple-800/40 bg-white dark:bg-gray-900 p-4 outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    />
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      {notesSaveState === "saving"
                        ? "Saving..."
                        : notesSaveState === "local"
                          ? "Saved locally for this lesson"
                          : "Saved to your account for this lesson"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-gradient-to-r from-purple-100 via-pink-50 to-red-50 dark:from-purple-900/20 dark:via-pink-900/10 dark:to-red-900/10 border border-purple-100 dark:border-purple-900/30 p-4">
                    <h4 className="font-semibold text-purple-800 dark:text-purple-300 mb-2">
                      Serani Insight
                    </h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Self-awareness grows when you notice emotional patterns without judging them.
                      Use your notes to track repeated triggers, calming techniques, and personal wins.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-2xl bg-pink-50 dark:bg-pink-900/10 border border-pink-100 dark:border-pink-900/30 p-4">
                    <h3 className="font-semibold text-pink-700 dark:text-pink-300 mb-3">
                      Reflection Journal
                    </h3>
                    <textarea
                      value={journal}
                      onChange={(e) => setJournal(e.target.value)}
                      placeholder="What did you learn from this lesson? How does it connect to your life?"
                      className="w-full h-56 rounded-2xl border border-pink-200 dark:border-pink-800/40 bg-white dark:bg-gray-900 p-4 outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                    />
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      {notesSaveState === "saving"
                        ? "Saving..."
                        : notesSaveState === "local"
                          ? "Saved locally for this lesson"
                          : "Saved to your account for this lesson"}
                    </p>
                  </div>

                  <div className="flex justify-between items-center gap-3 flex-wrap">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Save your reflection and continue in your journal.
                    </p>
                    <button
                      onClick={handleStartJournal}
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 text-white hover:opacity-90"
                    >
                      Continue to Journal
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* right sidebar */}
        <aside className="bg-gray-50 dark:bg-gray-950 p-4 md:p-5 space-y-5">
          {/* progress card */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-800 p-5">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Your Progress
            </h3>

            <div className="mt-4 flex items-center gap-4">
              <div className="relative w-16 h-16 rounded-full bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 p-[4px]">
                <div className="w-full h-full rounded-full bg-white dark:bg-gray-900 flex items-center justify-center text-sm font-bold text-purple-700 dark:text-purple-300">
                  {progress}%
                </div>
              </div>

              <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                <p>{completedLessons.length} of {lessons.length} done</p>
                <p>{watchedSeconds > 0 ? `${formatDuration(watchedSeconds)} watched` : "Watch time updates after durations are added"}</p>
                <p>{journal.trim() ? "1 journal note" : "0 journal notes"}</p>
              </div>
            </div>
          </div>

          {/* streak */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-800 p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{streak}-day streak</h3>
              <span
                className={`text-xs px-3 py-1 rounded-full ${
                  streak > 0
                    ? "bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-300"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                }`}
              >
                {streak > 0 ? "On fire!" : "Start today"}
              </span>
            </div>

            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Complete one lesson daily to keep your streak growing.
            </p>

            <div className="mt-4 grid grid-cols-7 gap-2 text-center text-xs">
              {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
                <div key={day + i}>
                  <div className="text-gray-400 mb-2">{day}</div>
                  <div
                    className={`h-2 rounded-full ${
                      i < Math.min(streak, 7)
                        ? "bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400"
                        : "bg-gray-200 dark:bg-gray-700"
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* lesson list */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="p-5 border-b border-gray-200 dark:border-gray-800">
              <h3 className="font-semibold">Module 1 Lessons</h3>
            </div>

            <div className="max-h-[460px] overflow-y-auto">
              {lessons.map((lesson, index) => {
                const isActive = index === activeLessonIndex;
                const isCompleted = completedLessons.includes(index);

                return (
                  <button
                    key={lesson._id}
                    onClick={() => handleLessonClick(index)}
                    className={`w-full text-left px-4 py-4 border-b border-gray-100 dark:border-gray-800 transition ${
                      isActive
                        ? "bg-gradient-to-r from-purple-50 via-pink-50 to-red-50 dark:from-purple-900/20 dark:via-pink-900/10 dark:to-red-900/10"
                        : "hover:bg-gray-50 dark:hover:bg-gray-800/60"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        {isCompleted ? (
                          <div className="w-5 h-5 rounded-full bg-green-500 text-white text-xs flex items-center justify-center">
                            ✓
                          </div>
                        ) : isActive ? (
                          <div className="w-5 h-5 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center">
                            ▶
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border border-gray-300 dark:border-gray-600" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <p
                          className={`text-sm font-medium truncate ${
                            isActive
                              ? "text-purple-700 dark:text-purple-300"
                              : "text-gray-800 dark:text-gray-200"
                          }`}
                        >
                          {index + 1}. {lesson.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {getLessonDurationLabel(lesson)}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* up next */}
          {activeLessonIndex < lessons.length - 1 && (
            <div className="rounded-3xl p-5 text-white bg-gradient-to-r from-purple-700 via-pink-600 to-red-500 shadow-lg">
              <p className="text-xs uppercase tracking-wide opacity-80">Up next</p>
              <h4 className="mt-2 font-semibold">
                {lessons[activeLessonIndex + 1]?.title}
              </h4>
              <button
                onClick={goNextLesson}
                className="mt-4 w-full py-3 rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur"
              >
                Start Lesson {activeLessonIndex + 2}
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}