import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const Toast = ({ message, type = 'info', isVisible, onClose }) => {
  if (!isVisible || !message) return null;

  const bgStyles = {
    info: 'bg-navy text-white',
    success: 'bg-mint text-white',
    error: 'bg-coral-pink text-white',
    warning: 'bg-sunny-yellow text-navy',
  };

  const icons = {
    info: <Info className="w-5 h-5" />,
    success: <CheckCircle2 className="w-5 h-5" />,
    error: <AlertCircle className="w-5 h-5" />,
    warning: <AlertCircle className="w-5 h-5" />,
  };

  return (
    <AnimatePresence>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className={`flex items-center gap-3 px-5 py-3 rounded-2xl shadow-soft-lg font-heading font-medium text-sm ${
            bgStyles[type] || bgStyles.info
          }`}
        >
          {icons[type]}
          <span>{message}</span>
          {onClose && (
            <button
              onClick={onClose}
              className="ml-2 hover:opacity-80 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
