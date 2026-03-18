import React from "react";
import { motion } from "framer-motion";
import { Play, Clock3, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function CourseCard({ course, index = 0, onPlay }) {
  const progress = Number(course.progress || 0);
  const canPlay = Boolean(course.videoUrl);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04 }}
      className="group overflow-hidden rounded-2xl border border-border bg-card shadow-card"
    >
      <button
        type="button"
        onClick={() => canPlay && onPlay?.(course)}
        className="relative h-44 w-full bg-muted"
        aria-label={canPlay ? `Play ${course.title}` : `${course.title}`}
      >
        {course.thumbnail ? (
          <img
            src={course.thumbnail}
            alt={course.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            No thumbnail
          </div>
        )}

        <div className="absolute inset-0 bg-black/10 transition-colors group-hover:bg-black/30" />

        <div className="absolute left-3 top-3 flex items-center gap-2">
          <Badge className="bg-background/80 text-foreground" variant="outline">
            {course.category}
          </Badge>
          {course.level ? (
            <Badge className="bg-background/80 text-foreground" variant="outline">
              {course.level}
            </Badge>
          ) : null}
        </div>

        <div className="absolute bottom-3 left-3 flex items-center gap-2 text-xs text-foreground">
          <div className="flex items-center gap-1 rounded-full bg-background/80 px-3 py-1">
            <Clock3 className="h-3.5 w-3.5" />
            {course.duration}
          </div>
          {course.aiTag ? (
            <div className="flex items-center gap-1 rounded-full bg-background/80 px-3 py-1">
              <Sparkles className="h-3.5 w-3.5" />
              {course.aiTag}
            </div>
          ) : null}
        </div>

        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={
              "flex h-12 w-12 items-center justify-center rounded-full bg-background/85 shadow-soft transition-transform duration-200 group-hover:scale-110" +
              (canPlay ? "" : " opacity-60")
            }
          >
            <Play className="h-5 w-5 text-foreground" style={{ marginLeft: 1 }} />
          </div>
        </div>
      </button>

      <div className="p-5">
        <h3 className="font-display text-lg text-card-foreground">
          {course.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
          {course.description}
        </p>

        <div className="mt-4">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-primary"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>{progress}% completed</span>
            <button
              type="button"
              onClick={() => canPlay && onPlay?.(course)}
              className={
                "rounded-xl px-4 py-2 text-xs font-semibold transition" +
                (canPlay
                  ? " bg-primary text-primary-foreground hover:opacity-90"
                  : " bg-muted text-muted-foreground cursor-not-allowed")
              }
              disabled={!canPlay}
            >
              {progress > 0 ? "Resume" : "Start"}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
