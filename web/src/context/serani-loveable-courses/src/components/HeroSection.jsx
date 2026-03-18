import React from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";

export default function HeroSection({ searchQuery, onSearchChange }) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-hero-gradient">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />

      <div className="relative p-6 sm:p-8">
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="font-display text-3xl sm:text-4xl text-foreground"
        >
          What do you want to learn today?
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="mt-2 max-w-2xl text-muted-foreground"
        >
          Explore short, guided sessions built for emotional wellness—powered by AI.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.14 }}
          className="mt-6"
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search courses, categories, keywords..."
              className="w-full rounded-2xl border border-border bg-background/80 px-11 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
