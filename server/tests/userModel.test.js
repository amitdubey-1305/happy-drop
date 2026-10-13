const bcrypt = require('bcryptjs');
const User = require('../models/User');

describe('User Model Schema & Methods', () => {
  it('should validate a valid user successfully with correct defaults', async () => {
    const user = new User({
      name: 'Happy Player',
      email: 'player@example.com',
      password: 'StrongPassword123!',
    });

    await expect(user.validate()).resolves.toBeUndefined();
    expect(user.totalStars).toBe(0);
    expect(user.completedLevels).toBe(0);
    expect(user.perfectLevels).toBe(0);
  });

  it('should fail validation when required fields are missing', async () => {
    const user = new User({});
    await expect(user.validate()).rejects.toThrow();
  });

  it('should enforce name length boundaries (2 to 50 characters)', async () => {
    const shortNameUser = new User({
      name: 'A',
      email: 'valid@example.com',
      password: 'Password123!',
    });
    await expect(shortNameUser.validate()).rejects.toThrow();

    const longNameUser = new User({
      name: 'A'.repeat(51),
      email: 'valid@example.com',
      password: 'Password123!',
    });
    await expect(longNameUser.validate()).rejects.toThrow();
  });

  it('should reject invalid email formats', async () => {
    const invalidEmailUser = new User({
      name: 'Player One',
      email: 'not-a-valid-email',
      password: 'Password123!',
    });
    await expect(invalidEmailUser.validate()).rejects.toThrow();
  });

  it('should lowercase and trim email address', () => {
    const user = new User({
      name: ' Player ',
      email: '  Gamer@Example.COM  ',
      password: 'Password123!',
    });
    expect(user.name).toBe('Player');
    expect(user.email).toBe('gamer@example.com');
  });

  it('should correctly verify password with comparePassword method', async () => {
    const rawPassword = 'SecretPassword123!';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(rawPassword, salt);

    const user = new User({
      name: 'Player Two',
      email: 'player2@example.com',
      password: hashedPassword,
    });

    const isMatch = await user.comparePassword(rawPassword);
    const isWrongMatch = await user.comparePassword('WrongPassword');

    expect(isMatch).toBe(true);
    expect(isWrongMatch).toBe(false);
  });

  it('should have the leaderboard compound index defined', () => {
    const indexes = User.schema.indexes();
    const leaderboardIndex = indexes.find(
      ([fields]) =>
        fields.totalStars === -1 &&
        fields.completedLevels === -1 &&
        fields.perfectLevels === -1 &&
        fields.createdAt === 1
    );

    expect(leaderboardIndex).toBeDefined();
  });
});
