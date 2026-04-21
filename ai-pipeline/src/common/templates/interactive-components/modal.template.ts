/**
 * Returns a complete React modal component as a TSX source string.
 * Uses React Portal with Framer Motion enter/exit animations.
 */
export function getModalTemplate(): string {
  return `'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

export interface ModalProps {
  /** Text for the trigger button. */
  triggerText?: string;
  /** Trigger element type: 'button' | 'link' (default: 'button'). */
  triggerType?: 'button' | 'link';
  /** Modal content — rendered as HTML string. */
  content: string;
  /** Optional title shown in the modal header. */
  title?: string;
  className?: string;
  children?: React.ReactNode;
}

export default function Modal({
  triggerText = 'Open',
  triggerType = 'button',
  content,
  title,
  className = '',
  children,
}: ModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  const close = useCallback(() => setIsOpen(false), []);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, close]);

  // Prevent body scroll when modal is open
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

  const trigger =
    triggerType === 'link' ? (
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          setIsOpen(true);
        }}
        style={{ cursor: 'pointer' }}
      >
        {triggerText}
      </a>
    ) : (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          padding: '0.6rem 1.25rem',
          border: 'none',
          borderRadius: '0.375rem',
          background: 'var(--color-accent, #2563eb)',
          color: '#fff',
          fontSize: '0.95rem',
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        {triggerText}
      </button>
    );

  const overlay = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={close}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.5)',
          }}
        >
          <motion.div
            key="modal-content"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            style={{
              background: '#fff',
              borderRadius: '0.75rem',
              padding: '2rem',
              maxWidth: '560px',
              width: '90%',
              maxHeight: '85vh',
              overflowY: 'auto',
              position: 'relative',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            }}
          >
            {/* Close button */}
            <button
              onClick={close}
              aria-label="Close modal"
              style={{
                position: 'absolute',
                top: '0.75rem',
                right: '0.75rem',
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                lineHeight: 1,
                color: '#6b7280',
              }}
            >
              &times;
            </button>

            {title && (
              <h2 style={{ margin: '0 0 1rem', fontSize: '1.25rem', fontWeight: 600 }}>
                {title}
              </h2>
            )}

            {children ?? (
              <div dangerouslySetInnerHTML={{ __html: content }} />
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className={\`modal-wrapper \${className}\`.trim()}>
      {trigger}
      {typeof document !== 'undefined' ? createPortal(overlay, document.body) : null}
    </div>
  );
}
`;
}
