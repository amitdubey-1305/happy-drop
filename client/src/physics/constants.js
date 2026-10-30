export const WORLD = {
  width: 600,
  height: 800,
};

export const GRAVITY = {
  x: 0,
  y: 1.0,
  scale: 0.001,
};

export const FIXED_STEP = 1000 / 60; // 16.666ms

export const WATER = {
  radius: 4,
  spawnEveryMs: 45,
  maxParticles: 250,
  friction: 0.01,
  frictionAir: 0.01,
  restitution: 0.1,
  density: 0.003,
  maxSpeed: 18,
};

export const STROKE = {
  thickness: 10,
  minPointDistance: 8,
};

// "dynamic" (falls and moves) or "static" (fixed in air)
export const STROKE_MODE = 'dynamic';

// Toggle for gooey liquid filter on water particles
export const WATER_GOOEY_EFFECT = true;

