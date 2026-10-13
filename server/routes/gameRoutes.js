const express = require('express');
const { z } = require('zod');
const gameController = require('../controllers/gameController');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');

const router = express.Router();

const startSchema = z.object({
  levelId: z.number({ required_error: 'levelId is required' }).int('levelId must be an integer'),
});

const completeSchema = z.object({
  sessionId: z
    .string({ required_error: 'sessionId is required' })
    .regex(/^[a-f\d]{24}$/i, 'sessionId must be a valid ObjectId'),
  levelId: z.number({ required_error: 'levelId is required' }).int('levelId must be an integer'),
  inkUsed: z
    .number({ required_error: 'inkUsed is required' })
    .min(0, 'inkUsed must be >= 0'),
  completionTime: z
    .number({ required_error: 'completionTime is required' })
    .min(0, 'completionTime must be >= 0'),
});

router.post('/start', auth, validate(startSchema), gameController.start);
router.post('/complete', auth, validate(completeSchema), gameController.complete);

module.exports = router;
