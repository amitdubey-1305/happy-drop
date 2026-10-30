const express = require('express');
const statsController = require('../controllers/statsController');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/stats/me (protected)
router.get('/me', auth, statsController.getStatsMe);

module.exports = router;
