"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, ZoomIn, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CarouselImage {
  id: string;
  display_url: string;
  alt_text?: string | null;
  is_primary?: boolean;
}

interface PhotoCarouselProps {
  images: CarouselImage[];
  title: string;
}

export function PhotoCarousel({ images, title }: PhotoCarouselProps) {
  const [current, setCurrent] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  const prev = useCallback(() => setCurrent((i) => (i === 0 ? images.length - 1 : i - 1)), [images.length]);
  const next = useCallback(() => setCurrent((i) => (i === images.length - 1 ? 0 : i + 1)), [images.length]);

  const activeImage = images[current];

  if (images.length === 0) {
    return (
      <div className="rounded-3xl border border-border bg-muted h-[400px] flex items-center justify-center">
        <p className="text-sm text-muted-foreground">No images available</p>
      </div>
    );
  }

  return (
    <>
      {/* ── Main Viewer ─────────────────────────────────────── */}
      <div className="rounded-3xl border border-border overflow-hidden bg-card shadow-sm">
        <div className="relative h-[400px] lg:h-[480px] bg-muted group">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={current}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0"
            >
              <Image
                src={activeImage.display_url}
                alt={activeImage.alt_text ?? title}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 720px"
                priority={current === 0}
              />
            </motion.div>
          </AnimatePresence>

          {/* Navigation arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm hover:bg-black/70"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={next}
                className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm hover:bg-black/70"
                aria-label="Next image"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          {/* Zoom button */}
          <button
            onClick={() => setLightbox(true)}
            className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm hover:bg-black/70"
            aria-label="Open fullscreen"
          >
            <ZoomIn className="h-4 w-4" />
          </button>

          {/* Image counter */}
          {images.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white backdrop-blur-sm">
              {current + 1} / {images.length}
            </div>
          )}
        </div>

        {/* ── Thumbnails ─────────────────────────────────────── */}
        {images.length > 1 && (
          <div className="flex gap-2 p-3 overflow-x-auto scrollbar-hide">
            {images.map((img, i) => (
              <button
                key={img.id}
                onClick={() => setCurrent(i)}
                className={cn(
                  "relative h-16 w-20 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all",
                  i === current
                    ? "border-primary opacity-100"
                    : "border-transparent opacity-60 hover:opacity-90"
                )}
                aria-label={`View image ${i + 1}`}
              >
                <Image
                  src={img.display_url}
                  alt={img.alt_text ?? `Image ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Lightbox ────────────────────────────────────────── */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95"
            onClick={() => setLightbox(false)}
          >
            <div className="relative w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
              <div className="relative h-[85vh] w-[90vw] max-w-5xl">
                <Image
                  src={activeImage.display_url}
                  alt={activeImage.alt_text ?? title}
                  fill
                  className="object-contain"
                  sizes="90vw"
                  quality={95}
                />
              </div>

              <button
                onClick={() => setLightbox(false)}
                className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                aria-label="Close lightbox"
              >
                <X className="h-5 w-5" />
              </button>

              {images.length > 1 && (
                <>
                  <button onClick={prev} className="absolute left-4 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors">
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button onClick={next} className="absolute right-4 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors">
                    <ChevronRight className="h-6 w-6" />
                  </button>
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                    {images.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrent(i)}
                        className={cn("h-1.5 rounded-full transition-all", i === current ? "w-6 bg-white" : "w-1.5 bg-white/40")}
                        aria-label={`Go to image ${i + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
