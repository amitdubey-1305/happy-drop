const mongoose = require('mongoose');

const gameSessionSchema = new mongoose.Schema(
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
    status: {
      type: String,
      enum: ['active', 'completed', 'abandoned'],
      default: 'active',
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    },
    inkUsed: {
      type: Number,
    },
    stars: {
      type: Number,
      min: 0,
      max: 3,
    },
    score: {
      type: Number,
    },
    completionTime: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index on (userId, levelId, status)
gameSessionSchema.index({ userId: 1, levelId: 1, status: 1 });

const GameSession = mongoose.model('GameSession', gameSessionSchema);

module.exports = GameSession;
