import React from 'react';
import { motion } from 'framer-motion';

export const Button = ({
  children,
  variant = 'primary', // 'primary' | 'secondary' | 'icon'
  onClick,
  disabled = false,
  className = '',
  type = 'button',
  title,
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-heading font-semibold transition select-none disabled:opacity-50 disabled:pointer-events-none cursor-pointer';

  let variantStyles = '';

  if (variant === 'primary') {
    variantStyles = 'bg-sky-blue hover:bg-[#2094db] text-white text-base py-3 px-6 rounded-2xl shadow-soft font-bold border-b-4 border-[#1c80bd] active:border-b-0 active:translate-y-1';
  } else if (variant === 'secondary') {
    variantStyles = 'bg-white hover:bg-slate-50 text-navy border-2 border-navy/15 text-base py-3 px-6 rounded-2xl shadow-soft font-bold active:bg-slate-100';
  } else if (variant === 'icon') {
    variantStyles = 'w-11 h-11 p-2 bg-white hover:bg-slate-50 text-navy border border-navy/10 rounded-2xl shadow-soft flex items-center justify-center';
  }

  return (
    <motion.button
      type={type}
      whileTap={{ scale: disabled ? 1 : 0.94 }}
      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${baseStyles} ${variantStyles} ${className}`}
    >
      {children}
    </motion.button>
  );
};
