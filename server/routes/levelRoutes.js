const express = require('express');
const levelController = require('../controllers/levelController');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, levelController.getLevels);
// Declared BEFORE /:id so 'generated' is not treated as a dynamic level ID
router.get('/generated/:seed', auth, levelController.getGeneratedLevel);
router.get('/:id', auth, levelController.getLevelById);

module.exports = router;
