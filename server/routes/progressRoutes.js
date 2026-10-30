const express = require('express');
const progressController = require('../controllers/progressController');
const auth = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.get('/', auth, progressController.getAllProgress);
router.get('/:levelId', auth, progressController.getProgressByLevel);

module.exports = router;
