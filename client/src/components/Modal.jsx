import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-md' }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className={`w-full ${maxWidth} bg-white rounded-3xl p-6 shadow-soft-lg border-2 border-sky-100 relative overflow-hidden`}
        >
          <div className="flex items-center justify-between mb-4">
            {title && <h3 className="text-xl font-heading font-bold text-navy">{title}</h3>}
            {onClose && (
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-soft hover:bg-slate-200 flex items-center justify-center text-navy transition ml-auto"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div>{children}</div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
