/**
 * Returns a complete React lightbox component as a TSX source string.
 * Provides an image lightbox overlay for gallery images.
 */
export function getLightboxTemplate(): string {
  return `'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

export interface LightboxImage {
  src: string;
  alt?: string;
  /** Optional thumbnail (defaults to src). */
  thumbnail?: string;
}

export interface LightboxProps {
  images: LightboxImage[];
  /** Number of columns in the thumbnail grid (default: 3). */
  columns?: number;
  /** Gap between thumbnails in px (default: 8). */
  gap?: number;
  className?: string;
}

export default function Lightbox({
  images,
  columns = 3,
  gap = 8,
  className = '',
}: LightboxProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const isOpen = activeIndex !== null;

  const close = useCallback(() => setActiveIndex(null), []);

  const prev = useCallback(() => {
    setActiveIndex((i) => (i !== null && i > 0 ? i - 1 : images.length - 1));
  }, [images.length]);

  const next = useCallback(() => {
    setActiveIndex((i) => (i !== null && i < images.length - 1 ? i + 1 : 0));
  }, [images.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, close, prev, next]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (images.length === 0) return null;

  const overlay = (
    <AnimatePresence>
      {isOpen && activeIndex !== null && (
        <motion.div
          key="lightbox-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={close}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.85)',
          }}
        >
          {/* Close */}
          <button
            onClick={close}
            aria-label="Close lightbox"
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              background: 'none',
              border: 'none',
              color: '#fff',
              fontSize: '2rem',
              cursor: 'pointer',
              zIndex: 10001,
              lineHeight: 1,
            }}
          >
            &times;
          </button>

          {/* Prev */}
          {images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                prev();
              }}
              aria-label="Previous image"
              style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                color: '#fff',
                fontSize: '1.5rem',
                borderRadius: '50%',
                width: '3rem',
                height: '3rem',
                cursor: 'pointer',
                zIndex: 10001,
              }}
            >
              &#8592;
            </button>
          )}

          {/* Image */}
          <motion.img
            key={activeIndex}
            src={images[activeIndex].src}
            alt={images[activeIndex].alt ?? ''}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.25 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '90vw',
              maxHeight: '85vh',
              objectFit: 'contain',
              borderRadius: '0.5rem',
            }}
          />

          {/* Next */}
          {images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
              aria-label="Next image"
              style={{
                position: 'absolute',
                right: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                color: '#fff',
                fontSize: '1.5rem',
                borderRadius: '50%',
                width: '3rem',
                height: '3rem',
                cursor: 'pointer',
                zIndex: 10001,
              }}
            >
              &#8594;
            </button>
          )}

          {/* Counter */}
          <span
            style={{
              position: 'absolute',
              bottom: '1rem',
              left: '50%',
              transform: 'translateX(-50%)',
              color: 'rgba(255,255,255,0.7)',
              fontSize: '0.875rem',
            }}
          >
            {activeIndex + 1} / {images.length}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className={\`lightbox-gallery \${className}\`.trim()}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: \`repeat(\${columns}, 1fr)\`,
          gap: \`\${gap}px\`,
        }}
      >
        {images.map((image, index) => (
          <button
            key={index}
            onClick={() => setActiveIndex(index)}
            style={{
              padding: 0,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              overflow: 'hidden',
              borderRadius: '0.25rem',
              aspectRatio: '1',
            }}
          >
            <img
              src={image.thumbnail ?? image.src}
              alt={image.alt ?? ''}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              loading="lazy"
            />
          </button>
        ))}
      </div>
      {typeof document !== 'undefined' ? createPortal(overlay, document.body) : null}
    </div>
  );
}
`;
}
