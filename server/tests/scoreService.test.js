const { starsFromInk, scoreFor } = require('../services/scoreService');

describe('Score Service Unit Tests (Task 10.2)', () => {
  describe('starsFromInk - Boundaries & Ink 0', () => {
    it('awards 3 stars when inkUsed is 0 (ratio 0.0)', () => {
      expect(starsFromInk(0, 100)).toBe(3);
      expect(starsFromInk(0, 300)).toBe(3);
    });

    it('awards 3 stars at exact 0.40 boundary', () => {
      // 40 / 100 = 0.40 exactly
      expect(starsFromInk(40, 100)).toBe(3);
      // 120 / 300 = 0.40 exactly
      expect(starsFromInk(120, 300)).toBe(3);
    });

    it('awards 2 stars just above 0.40 boundary', () => {
      // 40.1 / 100 = 0.401 > 0.40
      expect(starsFromInk(40.1, 100)).toBe(2);
      expect(starsFromInk(41, 100)).toBe(2);
    });

    it('awards 2 stars at exact 0.70 boundary', () => {
      // 70 / 100 = 0.70 exactly
      expect(starsFromInk(70, 100)).toBe(2);
      // 210 / 300 = 0.70 exactly
      expect(starsFromInk(210, 300)).toBe(2);
    });

    it('awards 1 star just above 0.70 boundary', () => {
      // 70.1 / 100 = 0.701 > 0.70
      expect(starsFromInk(70.1, 100)).toBe(1);
      expect(starsFromInk(71, 100)).toBe(1);
    });

    it('handles negative ink or zero maxInk safely', () => {
      expect(starsFromInk(-5, 100)).toBe(3);
      expect(starsFromInk(50, 0)).toBe(1);
    });
  });

  describe('scoreFor - Par Time Bonus & Ink 0', () => {
    it('calculates score with 0 ink used and par time bonus', () => {
      const score = scoreFor({
        stars: 3,
        inkUsed: 0,
        maxInk: 100,
        completionTime: 10,
        parTime: 15, // 10 <= 15 -> qualifies for par bonus
      });

      // 500 (base) + 300 (3 stars) + 200 (100% ink saved) + 100 (par bonus) = 1100
      expect(score).toBe(1100);
    });

    it('calculates score with 0 ink used WITHOUT par time bonus', () => {
      const score = scoreFor({
        stars: 3,
        inkUsed: 0,
        maxInk: 100,
        completionTime: 20,
        parTime: 15, // 20 > 15 -> no par bonus
      });

      // 500 (base) + 300 (3 stars) + 200 (100% ink saved) + 0 (no par bonus) = 1000
      expect(score).toBe(1000);
    });

    it('calculates score exactly at par time boundary (completionTime === parTime)', () => {
      const score = scoreFor({
        stars: 3,
        inkUsed: 40,
        maxInk: 100,
        completionTime: 15,
        parTime: 15, // 15 <= 15 -> gets 100 par bonus
      });

      // 500 base + 300 (3 stars) + round(200 * (1 - 0.40)) [120] + 100 (par bonus) = 1020
      expect(score).toBe(1020);
    });

    it('calculates score just over par time (completionTime === parTime + 1)', () => {
      const score = scoreFor({
        stars: 3,
        inkUsed: 40,
        maxInk: 100,
        completionTime: 16,
        parTime: 15, // 16 > 15 -> 0 par bonus
      });

      // 500 base + 300 + 120 + 0 = 920
      expect(score).toBe(920);
    });

    it('calculates score without par time bonus for 2-star run', () => {
      const score = scoreFor({
        stars: 2,
        inkUsed: 60,
        maxInk: 100,
        completionTime: 25,
        parTime: 15, // over par
      });

      // 500 base + 0 (not 3 stars) + round(200 * 0.4) [80] + 0 = 580
      expect(score).toBe(580);
    });

    it('clamps ink bonus to 0 when inkUsed equals or exceeds maxInk', () => {
      const score = scoreFor({
        stars: 1,
        inkUsed: 100,
        maxInk: 100,
        completionTime: 30,
        parTime: 15,
      });

      // 500 base + 0 + 0 + 0 = 500
      expect(score).toBe(500);
    });
  });
});
