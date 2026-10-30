/**
 * mulberry32 32-bit pseudo-random number generator
 * Produces deterministic numbers in range [0, 1) based on a numeric or string seed.
 */
const hashStringToSeed = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
};

const createMulberry32 = (seed) => {
  let state = typeof seed === 'number' ? seed >>> 0 : hashStringToSeed(String(seed));
  return function () {
    let t = (state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const randomRange = (rng, min, max) => min + rng() * (max - min);
const randomInt = (rng, min, max) => Math.floor(min + rng() * (max - min + 1));

/**
 * Checks whether an obstacle intersects or is too close to a protected zone
 */
const isOverlapping = (rectA, rectB, padding = 15) => {
  return !(
    rectA.x + rectA.width + padding < rectB.x ||
    rectA.x > rectB.x + rectB.width + padding ||
    rectA.y + rectA.height + padding < rectB.y ||
    rectA.y > rectB.y + rectB.height + padding
  );
};

/**
 * Procedurally generates a level based on a deterministic seed.
 * - Tap is near the top
 * - Glass is near the bottom and never directly below the tap
 * - 1 to 4 obstacles in safe middle zones
 * - Generous maxInk allocation
 */
const generateLevel = (seed) => {
  const rng = createMulberry32(seed);

  // 1. Tap: near the top of the 600x800 canvas
  const tapX = Math.round(randomRange(rng, 100, 500));
  const tapY = Math.round(randomRange(rng, 80, 160));
  const tapWaterDrops = randomInt(rng, 30, 45);

  const tapRect = {
    x: tapX - 25,
    y: tapY - 20,
    width: 50,
    height: 40,
  };

  // 2. Glass: near the bottom, never directly under the tap (min horizontal distance 80px)
  let glassX;
  if (tapX < 300) {
    const minGlassX = Math.max(tapX + 80, 310);
    glassX = Math.round(randomRange(rng, minGlassX, 520));
  } else {
    const maxGlassX = Math.min(tapX - 80, 290);
    glassX = Math.round(randomRange(rng, 80, maxGlassX));
  }

  const glassY = Math.round(randomRange(rng, 580, 680));
  const glassWidth = 60;
  const glassHeight = 120;

  const glassRect = {
    x: glassX,
    y: glassY,
    width: glassWidth,
    height: glassHeight,
  };

  // 3. Obstacles: 1 to 4 in safe vertical zone between tap and glass
  const obstacleCount = randomInt(rng, 1, 4);
  const obstacleTypes = ['box', 'platform', 'wedge'];
  const obstacles = [];

  const safeZoneMinY = tapY + 70;
  const safeZoneMaxY = glassY - 90;

  for (let i = 0; i < obstacleCount; i++) {
    const type = obstacleTypes[randomInt(rng, 0, obstacleTypes.length - 1)];
    const width = type === 'platform' ? randomInt(rng, 60, 110) : randomInt(rng, 35, 60);
    const height = type === 'platform' ? randomInt(rng, 15, 30) : randomInt(rng, 35, 70);

    let candidateRect;
    let attempts = 0;
    let placed = false;

    while (attempts < 25 && !placed) {
      attempts++;
      const x = Math.round(randomRange(rng, 60, 540 - width));
      const y = Math.round(randomRange(rng, safeZoneMinY, safeZoneMaxY - height));

      candidateRect = { x, y, width, height };

      // Ensure no collision with tap, glass, or other placed obstacles
      const collidesWithTap = isOverlapping(candidateRect, tapRect, 20);
      const collidesWithGlass = isOverlapping(candidateRect, glassRect, 20);
      const collidesWithOther = obstacles.some((obs) => isOverlapping(candidateRect, obs, 20));

      if (!collidesWithTap && !collidesWithGlass && !collidesWithOther) {
        placed = true;
      }
    }

    if (placed && candidateRect) {
      obstacles.push({
        id: `obs-${i + 1}`,
        type,
        x: candidateRect.x,
        y: candidateRect.y,
        width: candidateRect.width,
        height: candidateRect.height,
        rotation: randomInt(rng, -25, 25),
      });
    }
  }

  // 4. Generous max ink and star thresholds
  const distance = Math.hypot(glassX - tapX, glassY - tapY);
  const maxInk = Math.round(Math.max(450, distance * 0.9) + randomRange(rng, 50, 100));

  const starThresholds = {
    threeStars: Math.round(maxInk * 0.35),
    twoStars: Math.round(maxInk * 0.65),
    oneStar: Math.round(maxInk * 0.9),
  };

  return {
    seed,
    name: `Procedural Level ${seed}`,
    difficulty: 'procedural',
    targetWater: randomInt(rng, 20, 30),
    maxInk,
    world: {
      width: 600,
      height: 800,
    },
    starThresholds,
    tap: {
      x: tapX,
      y: tapY,
      waterDrops: tapWaterDrops,
    },
    glass: {
      x: glassX,
      y: glassY,
      width: glassWidth,
      height: glassHeight,
    },
    obstacles,
  };
};

module.exports = {
  createMulberry32,
  generateLevel,
};
