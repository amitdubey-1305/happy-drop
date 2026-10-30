const express = require('express');
const progressController = require('../controllers/progressController');
const auth = require('../middleware/auth');

const router = express.Router();

// Protected — only logged-in users can see the dashboard
router.get('/', auth, progressController.getDashboard);

module.exports = router;
