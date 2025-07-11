
"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface CardSwapProps {
  cards: Array<{
    id: string;
    thumbnail: string;
    title: string;
    onClick?: () => void;
  }>;
  className?: string;
}

export const CardSwap: React.FC<CardSwapProps> = ({ cards, className }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextCard = () => {
    setCurrentIndex((prev) => (prev + 1) % cards.length);
  };

  const prevCard = () => {
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
  };

  if (cards.length === 0) return null;

  return (
    <div className={cn("relative w-full h-full", className)}>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.3 }}
          className="w-full h-full cursor-pointer"
          onClick={cards[currentIndex]?.onClick}
        >
          <div className="relative w-full h-full rounded-lg overflow-hidden bg-muted">
            <img
              src={cards[currentIndex]?.thumbnail}
              alt={cards[currentIndex]?.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
              <p className="text-white text-sm font-medium truncate">
                {cards[currentIndex]?.title}
              </p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {cards.length > 1 && (
        <>
          <button
            onClick={prevCard}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors z-10"
          >
            ←
          </button>
          <button
            onClick={nextCard}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors z-10"
          >
            →
          </button>
        </>
      )}

      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
        {cards.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={cn(
              "w-2 h-2 rounded-full transition-colors",
              index === currentIndex ? "bg-white" : "bg-white/50"
            )}
          />
        ))}
      </div>
    </div>
  );
};
