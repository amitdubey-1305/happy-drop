const express = require('express');
const leaderboardController = require('../controllers/leaderboardController');
const auth = require('../middleware/auth');

const router = express.Router();

// All leaderboard routes are protected
router.get('/me', auth, leaderboardController.getRank);
router.get('/', auth, leaderboardController.getTop);

module.exports = router;
