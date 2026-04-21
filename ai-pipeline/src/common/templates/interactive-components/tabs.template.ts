/**
 * Returns a complete React tabs component as a TSX source string.
 * Uses state-based tab switching with Framer Motion animated transitions.
 */
export function getTabsTemplate(): string {
  return `'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface TabItem {
  /** Tab header label */
  label: string;
  /** Tab panel content — rendered as HTML */
  content: string;
}

export interface TabsProps {
  tabs: TabItem[];
  /** Index of the initially active tab (default: 0). */
  defaultActive?: number;
  className?: string;
}

export default function Tabs({ tabs, defaultActive = 0, className = '' }: TabsProps) {
  const [activeIndex, setActiveIndex] = useState(defaultActive);

  if (tabs.length === 0) return null;

  return (
    <div className={\`tabs \${className}\`.trim()}>
      {/* Tab Headers */}
      <div
        role="tablist"
        style={{
          display: 'flex',
          borderBottom: '2px solid #e5e7eb',
          gap: '0.25rem',
        }}
      >
        {tabs.map((tab, index) => (
          <button
            key={index}
            role="tab"
            aria-selected={index === activeIndex}
            onClick={() => setActiveIndex(index)}
            style={{
              padding: '0.75rem 1.25rem',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: index === activeIndex ? 600 : 400,
              color: index === activeIndex ? 'var(--color-accent, #2563eb)' : '#6b7280',
              borderBottom: index === activeIndex ? '2px solid currentColor' : '2px solid transparent',
              marginBottom: '-2px',
              transition: 'color 0.2s, border-color 0.2s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div style={{ position: 'relative', overflow: 'hidden', minHeight: '4rem' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeIndex}
            role="tabpanel"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            style={{ padding: '1.25rem 0' }}
            dangerouslySetInnerHTML={{ __html: tabs[activeIndex].content }}
          />
        </AnimatePresence>
      </div>
    </div>
  );
}
`;
}
