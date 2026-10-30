import React from 'react';
import { Link } from 'react-router-dom';

export const Logo = ({ size = 'md', showText = true }) => {
  const sizeMap = {
    sm: { drop: 'w-7 h-7', text: 'text-lg' },
    md: { drop: 'w-10 h-10', text: 'text-2xl' },
    lg: { drop: 'w-16 h-16', text: 'text-4xl' },
  };

  const current = sizeMap[size] || sizeMap.md;

  return (
    <Link to="/" className="inline-flex items-center gap-2.5 select-none group">
      {/* Original Happy Drop Smiling Water Drop Icon */}
      <div className={`relative ${current.drop} transition-transform group-hover:scale-105`}>
        <svg viewBox="0 0 64 64" fill="none" className="w-full h-full drop-shadow-sm">
          <defs>
            <linearGradient id="navDropGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#2BA7F0" />
            </linearGradient>
          </defs>
          <path
            d="M32 4 C32 4, 10 32, 10 44 C10 54 20 62 32 62 C44 62 54 54 54 44 C54 32, 32 4, 32 4 Z"
            fill="url(#navDropGrad)"
            stroke="#12355B"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          <path
            d="M22 36 C22 30, 28 20, 32 16"
            stroke="#FFFFFF"
            strokeWidth="3.5"
            strokeLinecap="round"
            opacity="0.75"
          />
          <circle cx="26" cy="42" r="3" fill="#12355B" />
          <circle cx="38" cy="42" r="3" fill="#12355B" />
          <path
            d="M27 47 Q32 53 37 47"
            stroke="#12355B"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="20" cy="46" r="2.5" fill="#FF6B9D" opacity="0.8" />
          <circle cx="44" cy="46" r="2.5" fill="#FF6B9D" opacity="0.8" />
        </svg>
      </div>

      {showText && (
        <span className={`font-heading font-black tracking-tight text-navy ${current.text}`}>
          HAPPY <span className="text-sky-blue">DROP</span>
        </span>
      )}
    </Link>
  );
};
