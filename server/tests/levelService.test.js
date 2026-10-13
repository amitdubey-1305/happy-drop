const levelService = require('../services/levelService');
const LevelProgress = require('../models/LevelProgress');

describe('Level Service', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getAllLevels', () => {
    it('should return a non-empty list of levels', () => {
      const levels = levelService.getAllLevels();
      expect(Array.isArray(levels)).toBe(true);
      expect(levels.length).toBeGreaterThan(0);
      expect(levels[0]).toHaveProperty('id', 1);
      expect(levels[0]).toHaveProperty('starThresholds');
    });
  });

  describe('getLevelById', () => {
    it('should return the correct level when valid id is passed', () => {
      const level = levelService.getLevelById(1);
      expect(level).toBeDefined();
      expect(level.id).toBe(1);
      expect(level.name).toBe('First Drop');
    });

    it('should throw 404 LEVEL_NOT_FOUND when level id does not exist', () => {
      expect(() => levelService.getLevelById(9999)).toThrow(
        expect.objectContaining({
          statusCode: 404,
          code: 'LEVEL_NOT_FOUND',
        })
      );
    });
  });

  describe('isLevelUnlocked', () => {
    const mockUserId = 'user-555';

    it('should always unlock level 1', async () => {
      const unlocked = await levelService.isLevelUnlocked(mockUserId, 1);
      expect(unlocked).toBe(true);
    });

    it('should keep level 2 locked if level 1 has no progress', async () => {
      jest.spyOn(LevelProgress, 'findOne').mockResolvedValue(null);

      const unlocked = await levelService.isLevelUnlocked(mockUserId, 2);
      expect(unlocked).toBe(false);
    });

    it('should keep level 2 locked if level 1 has 0 stars (started but not completed)', async () => {
      jest.spyOn(LevelProgress, 'findOne').mockResolvedValue({
        userId: mockUserId,
        levelId: 1,
        stars: 0,
      });

      const unlocked = await levelService.isLevelUnlocked(mockUserId, 2);
      expect(unlocked).toBe(false);
    });

    it('should unlock level 2 if level 1 was completed with 1 or more stars', async () => {
      jest.spyOn(LevelProgress, 'findOne').mockResolvedValue({
        userId: mockUserId,
        levelId: 1,
        stars: 1,
      });

      const unlocked = await levelService.isLevelUnlocked(mockUserId, 2);
      expect(unlocked).toBe(true);
    });

    it('should unlock level 3 if level 2 was completed with 3 stars', async () => {
      jest.spyOn(LevelProgress, 'findOne').mockImplementation(({ levelId }) => {
        if (levelId === 2) {
          return Promise.resolve({ userId: mockUserId, levelId: 2, stars: 3 });
        }
        return Promise.resolve(null);
      });

      const unlocked = await levelService.isLevelUnlocked(mockUserId, 3);
      expect(unlocked).toBe(true);
    });
  });
});
