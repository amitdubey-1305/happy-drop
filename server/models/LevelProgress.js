const mongoose = require('mongoose');

const levelProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'userId is required'],
    },
    levelId: {
      type: Number,
      required: [true, 'levelId is required'],
    },
    stars: {
      type: Number,
      default: 0,
      min: 0,
      max: 3,
    },
    bestInkUsed: {
      type: Number,
    },
    bestTime: {
      type: Number,
    },
    bestScore: {
      type: Number,
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index on (userId, levelId)
levelProgressSchema.index({ userId: 1, levelId: 1 }, { unique: true });

const LevelProgress = mongoose.model('LevelProgress', levelProgressSchema);

module.exports = LevelProgress;
