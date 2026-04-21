/**
 * Returns a complete React accordion component as a TSX source string.
 * Uses Framer Motion AnimatePresence for open/close animations.
 */
export function getAccordionTemplate(): string {
  return `'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface AccordionItem {
  /** Visible header / question */
  question: string;
  /** Expandable body content (plain text or HTML string) */
  answer: string;
}

export interface AccordionProps {
  items: AccordionItem[];
  /** Allow multiple panels open at once (default: false). */
  allowMultiple?: boolean;
  className?: string;
}

export default function Accordion({
  items,
  allowMultiple = false,
  className = '',
}: AccordionProps) {
  const [openIndices, setOpenIndices] = useState<Set<number>>(new Set());

  const toggle = (index: number) => {
    setOpenIndices((prev) => {
      const next = new Set(allowMultiple ? prev : []);
      if (prev.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <div className={\`accordion \${className}\`.trim()}>
      {items.map((item, index) => {
        const isOpen = openIndices.has(index);
        return (
          <div key={index} className="accordion-item" style={{ borderBottom: '1px solid #e5e7eb' }}>
            <button
              onClick={() => toggle(index)}
              aria-expanded={isOpen}
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem 0',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1.05rem',
                fontWeight: 600,
                textAlign: 'left',
                color: 'inherit',
              }}
            >
              <span>{item.question}</span>
              <motion.span
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                style={{ fontSize: '1.25rem', lineHeight: 1 }}
              >
                &#x25BE;
              </motion.span>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  style={{ overflow: 'hidden' }}
                >
                  <div
                    style={{ paddingBottom: '1rem', color: '#4b5563' }}
                    dangerouslySetInnerHTML={{ __html: item.answer }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
`;
}
