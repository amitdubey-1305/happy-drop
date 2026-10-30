import React from 'react';

export const Card = ({ children, className = '', onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-3xl p-6 border-2 border-sky-100 shadow-soft transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:border-sky-blue hover:shadow-soft-lg' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};
