import React from 'react';

export const Spinner = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        className={`${
          sizeClasses[size] || sizeClasses.md
        } rounded-full border-sky-blue/20 border-t-sky-blue animate-spin`}
      />
    </div>
  );
};
