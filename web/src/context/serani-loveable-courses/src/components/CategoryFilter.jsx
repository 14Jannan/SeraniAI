import React from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

export default function CategoryFilter({ categories, selected, onSelect }) {
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((cat, idx) => {
        const active = selected === cat;
        return (
          <motion.button
            key={cat}
            type="button"
            onClick={() => onSelect(cat)}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: idx * 0.02 }}
            className="focus:outline-none"
          >
            <Badge
              variant={active ? "primary" : "default"}
              className="cursor-pointer select-none"
            >
              {cat}
            </Badge>
          </motion.button>
        );
      })}
    </div>
  );
}
