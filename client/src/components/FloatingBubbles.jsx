import React, { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * Lightweight floating bubble background animation with soft ambient gradient.
 * Respects prefers-reduced-motion by disabling floating motion.
 */
export const FloatingBubbles = ({ count = 14, className = '' }) => {
  const shouldReduceMotion = useReducedMotion();

  // Generate deterministic bubble specs so re-renders don't cause jitter
  const bubbles = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => {
      const size = 16 + (i * 7) % 28; // 16px to 44px
      const left = 5 + (i * 17.5) % 90; // 5% to 95%
      const duration = 12 + (i * 3) % 12; // 12s to 24s
      const delay = (i * 1.6) % 10;
      const sway = 15 + (i * 5) % 25; // sway range in px

      return {
        id: i,
        size,
        left,
        duration,
        delay,
        sway,
      };
    });
  }, [count]);

  return (
    <div
      className={`absolute inset-0 pointer-events-none overflow-hidden select-none z-0 ${className}`}
      aria-hidden="true"
    >
      {/* Soft Ambient Radial Background Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(186,230,253,0.35)_0%,rgba(224,242,254,0.15)_50%,transparent_80%)]" />

      {/* Floating Translucent Bubbles */}
      {bubbles.map((b) => {
        if (shouldReduceMotion) {
          // Static placement for reduced motion preference
          return (
            <div
              key={b.id}
              style={{
                width: `${b.size}px`,
                height: `${b.size}px`,
                left: `${b.left}%`,
                top: `${(b.id * 18) % 85}%`,
              }}
              className="absolute rounded-full border border-sky-300/40 bg-sky-200/20 backdrop-blur-[0.5px]"
            />
          );
        }

        return (
          <motion.div
            key={b.id}
            initial={{ y: '110vh', x: 0, opacity: 0 }}
            animate={{
              y: '-20vh',
              x: [-b.sway, b.sway, -b.sway],
              opacity: [0, 0.45, 0.6, 0.35, 0],
            }}
            transition={{
              y: {
                duration: b.duration,
                repeat: Infinity,
                delay: b.delay,
                ease: 'linear',
              },
              x: {
                duration: b.duration * 0.45,
                repeat: Infinity,
                repeatType: 'reverse',
                ease: 'easeInOut',
              },
              opacity: {
                duration: b.duration,
                repeat: Infinity,
                delay: b.delay,
                times: [0, 0.15, 0.5, 0.85, 1],
              },
            }}
            style={{
              width: `${b.size}px`,
              height: `${b.size}px`,
              left: `${b.left}%`,
            }}
            className="absolute rounded-full border border-sky-300/45 bg-gradient-to-tr from-sky-200/25 to-white/40 shadow-xs will-change-transform"
          >
            {/* Tiny Specular Bubble Reflection Dot */}
            <div className="w-1.5 h-1.5 rounded-full bg-white/70 absolute top-1 left-1" />
          </motion.div>
        );
      })}
    </div>
  );
};
