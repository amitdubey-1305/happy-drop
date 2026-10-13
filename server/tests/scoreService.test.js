const { starsFromInk, scoreFor } = require('../services/scoreService');

describe('Score Service', () => {
  describe('starsFromInk', () => {
    it('should award 3 stars when ratio is <= 0.40', () => {
      expect(starsFromInk(0, 100)).toBe(3);
      expect(starsFromInk(20, 100)).toBe(3);
      expect(starsFromInk(40, 100)).toBe(3);
    });

    it('should award 2 stars when ratio is > 0.40 and <= 0.70', () => {
      expect(starsFromInk(41, 100)).toBe(2);
      expect(starsFromInk(55, 100)).toBe(2);
      expect(starsFromInk(70, 100)).toBe(2);
    });

    it('should award 1 star when ratio is > 0.70', () => {
      expect(starsFromInk(71, 100)).toBe(1);
      expect(starsFromInk(90, 100)).toBe(1);
      expect(starsFromInk(100, 100)).toBe(1);
      expect(starsFromInk(120, 100)).toBe(1);
    });
  });

  describe('scoreFor', () => {
    it('should calculate max possible score for a flawless run within par time', () => {
      const score = scoreFor({
        stars: 3,
        inkUsed: 0,
        maxInk: 100,
        completionTime: 5,
        parTime: 10,
      });

      // 500 base + 300 (3 stars) + 200 (100% ink saved) + 100 (under par time) = 1100
      expect(score).toBe(1100);
    });

    it('should include 3-star bonus and partial ink bonus without time bonus if par time missed', () => {
      const score = scoreFor({
        stars: 3,
        inkUsed: 20,
        maxInk: 100,
        completionTime: 15,
        parTime: 10,
      });

      // 500 base + 300 (3 stars) + round(200 * 0.8) [160] + 0 = 960
      expect(score).toBe(960);
    });

    it('should calculate score for 2-star run meeting par time', () => {
      const score = scoreFor({
        stars: 2,
        inkUsed: 50,
        maxInk: 100,
        completionTime: 8,
        parTime: 10,
      });

      // 500 base + 0 (not 3 stars) + round(200 * 0.5) [100] + 100 = 700
      expect(score).toBe(700);
    });

    it('should clamp ink bonus to 0 when inkUsed exceeds maxInk', () => {
      const score = scoreFor({
        stars: 1,
        inkUsed: 120,
        maxInk: 100,
        completionTime: 20,
        parTime: 10,
      });

      // 500 base + 0 + 0 + 0 = 500
      expect(score).toBe(500);
    });
  });
});
