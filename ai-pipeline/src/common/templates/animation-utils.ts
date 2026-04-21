// ── Animation Utilities Template ──────────────────────────────────────────
// Returns source code as a string for injection into generated React projects.

/**
 * Template code for animation utilities - injected into generated React projects.
 * Returns the source code as a string for writing to the output project.
 */
export function getAnimationUtilsTemplate(): string {
  return `// Animation utilities for WordPress-migrated React components
// Uses Framer Motion for scroll and hover animations

import { useInView } from 'framer-motion';
import { useRef } from 'react';

/** Options for the scroll-triggered animation hook. */
export interface ScrollAnimationOptions {
  /** If true, animation fires only once (default: true). */
  once?: boolean;
  /** IntersectionObserver rootMargin (default: '-100px'). */
  margin?: string;
}

/**
 * Hook for scroll-triggered entrance animations.
 * Attaches a ref to the target element and tracks in-view state.
 */
export function useScrollAnimation(options?: ScrollAnimationOptions) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, {
    once: options?.once ?? true,
    margin: options?.margin ?? '-100px',
  });
  return { ref, isInView };
}

/** Entrance animation variants for Framer Motion \`<motion.div>\`. */
export const entranceVariants = {
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
  fadeInUp: {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0 },
  },
  fadeInDown: {
    hidden: { opacity: 0, y: -40 },
    visible: { opacity: 1, y: 0 },
  },
  fadeInLeft: {
    hidden: { opacity: 0, x: -40 },
    visible: { opacity: 1, x: 0 },
  },
  fadeInRight: {
    hidden: { opacity: 0, x: 40 },
    visible: { opacity: 1, x: 0 },
  },
  zoomIn: {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1 },
  },
  bounceIn: {
    hidden: { opacity: 0, scale: 0.3 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { type: 'spring', damping: 12 },
    },
  },
  slideInUp: {
    hidden: { y: 60 },
    visible: { y: 0 },
  },
  slideInDown: {
    hidden: { y: -60 },
    visible: { y: 0 },
  },
  slideInLeft: {
    hidden: { x: -60 },
    visible: { x: 0 },
  },
  slideInRight: {
    hidden: { x: 60 },
    visible: { x: 0 },
  },
} as const;

/** Hover animation presets — pass to \`whileHover\` on a \`<motion.div>\`. */
export const hoverPresets = {
  grow: { scale: 1.05 },
  shrink: { scale: 0.95 },
  pulse: { scale: [1, 1.05, 1], transition: { duration: 0.3 } },
  push: { scale: 0.95 },
  float: { y: -5 },
  shadow: { boxShadow: '0 10px 30px rgba(0,0,0,0.15)' },
} as const;

/** Default transition used by entrance animations. */
export const defaultTransition = { duration: 0.5, ease: 'easeOut' } as const;

export type EntranceAnimationType = keyof typeof entranceVariants;
export type HoverAnimationType = keyof typeof hoverPresets;
`;
}
