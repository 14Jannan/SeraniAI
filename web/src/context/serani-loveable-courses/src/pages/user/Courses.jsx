import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";

import HeroSection from "@/components/HeroSection";
import CategoryFilter from "@/components/CategoryFilter";
import CourseCard from "@/components/CourseCard";

// Interim/demo data (replace with API later)
const coursesData = [
  {
    id: 1,
    title: "AI for Emotional Wellness (Basics)",
    description:
      "Understand how AI can support mood tracking and emotional support tools.",
    category: "AI",
    level: "Beginner",
    aiTag: "AI",
    duration: "35 min",
    progress: 40,
    thumbnail:
      "https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?auto=format&fit=crop&w=900&q=60",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
  },
  {
    id: 2,
    title: "Journaling Techniques (Guided)",
    description:
      "Simple guided prompts to reduce stress and improve clarity.",
    category: "Wellness",
    level: "Beginner",
    duration: "25 min",
    progress: 0,
    thumbnail:
      "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=900&q=60",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
  },
  {
    id: 3,
    title: "Mindfulness Mini Sessions",
    description:
      "Short breathing & grounding routines you can practice daily.",
    category: "Wellness",
    level: "Intermediate",
    duration: "15 min",
    progress: 10,
    thumbnail:
      "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=900&q=60",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
  },
  {
    id: 4,
    title: "Prompting for Better AI Responses",
    description:
      "Learn how to ask questions to get clearer and safer AI outputs.",
    category: "AI",
    level: "Intermediate",
    aiTag: "Prompting",
    duration: "30 min",
    progress: 0,
    thumbnail:
      "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=900&q=60",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
  },
  {
    id: 5,
    title: "Building Habits that Stick",
    description:
      "Practical methods to build consistent routines for mental wellness.",
    category: "Lifestyle",
    level: "Advanced",
    duration: "20 min",
    progress: 60,
    thumbnail:
      "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=900&q=60",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
  },
];

export default function Courses() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCourse, setActiveCourse] = useState(null);

  const closePlayer = () => setActiveCourse(null);

  // Close modal with ESC + prevent background scroll when modal open
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") closePlayer();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (activeCourse) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [activeCourse]);

  const categories = useMemo(() => {
    const set = new Set(coursesData.map((c) => c.category));
    return ["All", ...Array.from(set)];
  }, []);

  const filteredCourses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return coursesData.filter((course) => {
      const matchesCategory =
        selectedCategory === "All" || course.category === selectedCategory;

      const matchesSearch =
        !q ||
        course.title.toLowerCase().includes(q) ||
        course.description.toLowerCase().includes(q) ||
        course.category.toLowerCase().includes(q) ||
        (course.level || "").toLowerCase().includes(q) ||
        (course.aiTag || "").toLowerCase().includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const inProgressCourses = useMemo(
    () => coursesData.filter((c) => (c.progress || 0) > 0),
    []
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-xl">Serani AI</span>
          </div>
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a className="text-foreground" href="#">
              Courses
            </a>
            <a className="hover:text-foreground" href="#">
              My Progress
            </a>
            <a className="hover:text-foreground" href="#">
              Community
            </a>
          </nav>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-foreground">
            S
          </div>
        </div>
      </header>

      <main className="container space-y-10 py-8">
        {/* Hero */}
        <HeroSection searchQuery={searchQuery} onSearchChange={setSearchQuery} />

        {/* Continue Learning */}
        {inProgressCourses.length > 0 && (
          <section className="space-y-5">
            <motion.h2
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-display text-2xl"
            >
              Continue Learning
            </motion.h2>

            {/* Horizontal scroll like Loveable */}
            <div className="flex gap-6 overflow-x-auto pb-2">
              {inProgressCourses.map((course, i) => (
                <div key={course.id} className="min-w-[320px] max-w-[320px]">
                  <CourseCard
                    course={course}
                    index={i}
                    onPlay={setActiveCourse}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* All Courses */}
        <section className="space-y-5">
          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-2xl"
          >
            Recommended for You
          </motion.h2>

          <CategoryFilter
            categories={categories}
            selected={selectedCategory}
            onSelect={setSelectedCategory}
          />

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCourses.map((course, i) => (
              <CourseCard
                key={course.id}
                course={course}
                index={i}
                onPlay={setActiveCourse}
              />
            ))}
          </div>

          {filteredCourses.length === 0 && (
            <div className="rounded-2xl border border-border bg-card p-10 text-center">
              <p className="text-muted-foreground">
                No courses found. Try a different filter or search term.
              </p>
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-border">
        <div className="container py-8 text-center">
          <p className="text-sm text-muted-foreground">
            © 2026 Serani AI · Emotional wellness powered by artificial intelligence
          </p>
        </div>
      </footer>

      {/* Video Modal */}
      <AnimatePresence>
        {activeCourse && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 p-4"
            onClick={closePlayer}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              transition={{ duration: 0.18 }}
              className="w-full max-w-4xl overflow-hidden rounded-2xl border border-border bg-card shadow-soft"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 border-b border-border p-5">
                <div>
                  <h3 className="font-display text-xl text-card-foreground">
                    {activeCourse.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {activeCourse.category} • {activeCourse.duration}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closePlayer}
                  className="rounded-xl bg-secondary p-2 text-secondary-foreground hover:opacity-90"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="aspect-video bg-black">
                <iframe
                  className="h-full w-full"
                  src={activeCourse.videoUrl}
                  title={activeCourse.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
