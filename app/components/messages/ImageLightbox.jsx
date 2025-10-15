"use client";

import { useEffect } from "react";

/**
 * Simple full-screen image lightbox with keyboard support.
 * Props:
 *  - images: [{ src: string, alt?: string }]
 *  - index: number (current image)
 *  - onClose: () => void
 *  - onPrev: () => void
 *  - onNext: () => void
 */
export default function ImageLightbox({ images = [], index = 0, onClose, onPrev, onNext }) {
  const img = images[index];

  // Disable background scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Keyboard: Esc, ←, →
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
      if (e.key === "ArrowLeft") onPrev?.();
      if (e.key === "ArrowRight") onNext?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onPrev, onNext]);

  if (!img) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] flex items-center justify-center"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />

      {/* Content */}
      <div className="relative z-10 max-w-[92vw] max-h-[90vh] flex items-center justify-center">
        <img
          src={img.src}
          alt={img.alt || "image"}
          className="max-h-[90vh] max-w-[92vw] object-contain rounded-lg shadow-2xl"
          draggable={false}
        />
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 rounded-full bg-white/10 px-3 py-1.5 text-white hover:bg-white/20"
          aria-label="Close"
        >
          ✕
        </button>

        {/* Prev / Next */}
        {images.length > 1 && (
          <>
            <button
              onClick={onPrev}
              className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-white hover:bg-white/20"
              aria-label="Previous image"
            >
              ‹
            </button>
            <button
              onClick={onNext}
              className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-white hover:bg-white/20"
              aria-label="Next image"
            >
              ›
            </button>
            <div className="absolute bottom-[-36px] left-1/2 -translate-x-1/2 text-xs text-white/80">
              {index + 1} / {images.length}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
