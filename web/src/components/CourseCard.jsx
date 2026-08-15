import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play } from "lucide-react";
import { motion } from "framer-motion";
import { API_BASE_URL } from "../utils/apiBaseUrl";

const API_URL = API_BASE_URL;

function getStoredCourseProgress(course) {
  if (Number.isFinite(Number(course?.progress))) {
    return Math.max(0, Math.min(100, Math.round(Number(course.progress))));
  }
  if (!course?._id) return 0;
  try {
    const raw = localStorage.getItem(`course-progress-${course._id}`);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    if (Number.isFinite(Number(parsed?.percentage))) {
      return Math.max(0, Math.min(100, Math.round(Number(parsed.percentage))));
    }
    const completedCount = Array.isArray(parsed?.completedLessons)
      ? parsed.completedLessons.length
      : 0;
    const total =
      Number(parsed?.totalLessons) || Number(course?.lessonsCount) || 0;
    if (total > 0 && completedCount > 0) {
      return Math.max(
        0,
        Math.min(100, Math.round((completedCount / total) * 100))
      );
    }
  } catch {
    return 0;
  }
  return 0;
}

const CourseCard = ({ course, horizontal }) => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(() => getStoredCourseProgress(course));

  useEffect(() => {
    setProgress(getStoredCourseProgress(course));

    const handleProgressUpdate = (event) => {
      if (
        event?.detail?.courseId === course?._id &&
        Number.isFinite(event?.detail?.percentage)
      ) {
        setProgress(
          Math.max(0, Math.min(100, Math.round(Number(event.detail.percentage))))
        );
      } else {
        setProgress(getStoredCourseProgress(course));
      }
    };

    window.addEventListener("serani-course-progress-updated", handleProgressUpdate);
    window.addEventListener("storage", handleProgressUpdate);

    return () => {
      window.removeEventListener(
        "serani-course-progress-updated",
        handleProgressUpdate
      );
      window.removeEventListener("storage", handleProgressUpdate);
    };
  }, [course]);

  const handleClick = () => {
    navigate(`/dashboard/course/${course._id}`, {
      state: {
        courseTitle: course.title,
      },
    });
  };
  /* -------- IMAGE FIX -------- */

  const imageUrl = course.thumbnailUrl
    ? course.thumbnailUrl.startsWith("http")
      ? course.thumbnailUrl
      : `${API_URL}${course.thumbnailUrl}`
    : "https://via.placeholder.com/400";

  return (

    <motion.div
      whileHover={{ rotateX: 4, rotateY: -4, scale: 1.03 }}
      transition={{ duration: 0.3 }}
      onClick={handleClick}
      className={`bg-white rounded-xl shadow-lg overflow-hidden cursor-pointer group
      ${horizontal ? "min-w-[320px]" : ""}`}
    >

      {/* IMAGE */}
      <div className="relative overflow-hidden">

        <img
          src={imageUrl}
          alt={course.title}
          className="h-56 w-full object-cover group-hover:scale-110 transition duration-500"
        />

        {/* DARK OVERLAY */}
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition"></div>

        {/* PLAY BUTTON */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">

          <div className="bg-white p-4 rounded-full shadow-lg animate-pulse">
            <Play className="text-green-600" size={28} />
          </div>

        </div>

        {/* CATEGORY */}
        <span className="absolute top-4 left-4 text-xs bg-white px-3 py-1 rounded-full shadow">

          {course.category || "Course"}

        </span>

      </div>

      {/* CONTENT */}
      <div className="p-5">

        <h3 className="font-semibold text-lg group-hover:text-green-600 transition">

          {course.title}

        </h3>

        <p className="text-sm text-gray-500 mt-1">

          Instructor: {course.instructorName || "Unknown"}

        </p>

        <div className="flex justify-between text-sm text-gray-400 mt-3">

          <span>{course.level || "Beginner"}</span>
          <span>{progress}%</span>

        </div>

        {/* PROGRESS BAR */}
        <div className="mt-2 bg-gray-200 h-2 rounded-full overflow-hidden">

          <div
            className="bg-green-500 h-2 transition-all duration-700"
            style={{ width: `${progress}%` }}
          />

        </div>

      </div>

    </motion.div>

  );
};

export default CourseCard;