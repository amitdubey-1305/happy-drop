const { generateLevel } = require('../services/levelGenerator');

describe('Level Generator Service', () => {
  it('should deterministically produce identical level data for the same seed', () => {
    const levelA = generateLevel(42);
    const levelB = generateLevel(42);

    expect(levelA).toEqual(levelB);
  });

  it('should produce different level layouts for different seeds', () => {
    const levelA = generateLevel(101);
    const levelB = generateLevel(202);

    expect(levelA.tap.x).not.toEqual(levelB.tap.x);
    expect(levelA.glass.x).not.toEqual(levelB.glass.x);
  });

  it('should place tap near the top and glass near the bottom', () => {
    const level = generateLevel(777);

    expect(level.tap.y).toBeLessThan(150);
    expect(level.glass.y).toBeGreaterThan(450);
  });

  it('should never place the glass directly under the tap', () => {
    // Test across 10 different seeds to ensure consistency
    for (const seed of [1, 2, 5, 10, 42, 99, 123, 500, 789, 1000]) {
      const level = generateLevel(seed);
      const horizontalDistance = Math.abs(level.glass.x - level.tap.x);

      expect(horizontalDistance).toBeGreaterThanOrEqual(60);
    }
  });

  it('should generate between 1 and 4 obstacles within safe zones', () => {
    for (const seed of [10, 20, 30, 40, 50]) {
      const level = generateLevel(seed);

      expect(level.obstacles.length).toBeGreaterThanOrEqual(1);
      expect(level.obstacles.length).toBeLessThanOrEqual(4);

      // Verify obstacles do not overlap tap or glass vertically
      level.obstacles.forEach((obs) => {
        expect(obs.y).toBeGreaterThanOrEqual(level.tap.y + 40);
        expect(obs.y + obs.height).toBeLessThanOrEqual(level.glass.y);
      });
    }
  });

  it('should provide generous maxInk and valid star thresholds', () => {
    const level = generateLevel(888);

    expect(level.maxInk).toBeGreaterThanOrEqual(450);
    expect(level.starThresholds.threeStars).toBeLessThan(level.starThresholds.twoStars);
    expect(level.starThresholds.twoStars).toBeLessThan(level.starThresholds.oneStar);
    expect(level.starThresholds.oneStar).toBeLessThanOrEqual(level.maxInk);
  });
});
