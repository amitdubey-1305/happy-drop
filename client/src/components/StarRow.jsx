import React from 'react';
import { motion } from 'framer-motion';

export const StarRow = ({ stars = 0, max = 3, size = 'md' }) => {
  const sizeMap = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  const starSize = sizeMap[size] || sizeMap.md;

  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: max }, (_, index) => {
        const starNum = index + 1;
        const isFilled = starNum <= stars;

        return (
          <motion.div
            key={starNum}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="relative flex items-center justify-center"
          >
            <svg
              viewBox="0 0 24 24"
              className={`${starSize} transition-all duration-300 drop-shadow-sm`}
              fill={isFilled ? '#FFC93C' : '#CBD5E1'}
              stroke={isFilled ? '#E0A820' : '#94A3B8'}
              strokeWidth="1.5"
              strokeLinejoin="round"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </motion.div>
        );
      })}
    </div>
  );
};
