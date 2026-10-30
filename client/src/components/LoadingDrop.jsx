import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * Friendly original bouncing water droplet loading animation
 */
export const LoadingDrop = ({ message = 'Loading...', className = '' }) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className={`flex flex-col items-center justify-center py-8 text-center ${className}`}>
      {/* Bouncing Droplet Character */}
      <motion.div
        animate={
          shouldReduceMotion
            ? {}
            : {
                y: [0, -22, 0],
                scaleY: [1, 1.12, 0.85, 1],
                scaleX: [1, 0.9, 1.14, 1],
              }
        }
        transition={{
          duration: 0.95,
          repeat: Infinity,
          ease: 'easeInOut',
          times: [0, 0.45, 0.85, 1],
        }}
        className="relative w-16 h-16 flex items-center justify-center drop-shadow-md select-none"
      >
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full overflow-visible"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="loadDropGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#0284C7" />
            </linearGradient>
          </defs>

          {/* Water Droplet Body */}
          <path
            d="M 50 12 C 50 12 24 48 24 70 C 24 85 35 96 50 96 C 65 96 76 85 76 70 C 76 48 50 12 50 12 Z"
            fill="url(#loadDropGrad)"
            stroke="#0369A1"
            strokeWidth="3"
            strokeLinejoin="round"
          />

          {/* Glossy Curved Highlight */}
          <path
            d="M 33 55 C 33 45 42 30 46 25"
            stroke="#FFFFFF"
            strokeWidth="3.5"
            strokeLinecap="round"
            opacity="0.8"
          />

          {/* Cute Friendly Face */}
          {/* Left Eye */}
          <circle cx="42" cy="65" r="3" fill="#0F172A" />
          <circle cx="41" cy="64" r="1" fill="#FFFFFF" />

          {/* Right Eye */}
          <circle cx="58" cy="65" r="3" fill="#0F172A" />
          <circle cx="57" cy="64" r="1" fill="#FFFFFF" />

          {/* Cheerful Smile */}
          <path
            d="M 46 72 Q 50 77 54 72"
            stroke="#0F172A"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />

          {/* Rosy Cheek Blush */}
          <circle cx="36" cy="69" r="2.5" fill="#FB7185" opacity="0.6" />
          <circle cx="64" cy="69" r="2.5" fill="#FB7185" opacity="0.6" />
        </svg>
      </motion.div>

      {/* Synchronized Soft Droplet Shadow */}
      <motion.div
        animate={
          shouldReduceMotion
            ? {}
            : {
                scaleX: [1, 0.55, 1],
                opacity: [0.35, 0.12, 0.35],
              }
        }
        transition={{
          duration: 0.95,
          repeat: Infinity,
          ease: 'easeInOut',
          times: [0, 0.45, 0.85, 1],
        }}
        className="w-12 h-2.5 bg-navy/25 rounded-full mt-1 blur-[1px]"
      />

      {/* Friendly Caption */}
      {message && (
        <p className="text-xs font-heading font-bold text-navy/70 mt-3 tracking-wide">
          {message}
        </p>
      )}
    </div>
  );
};
