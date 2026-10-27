const express = require('express');
const router = express.Router();
const { generateReminder } = require('../controllers/reminderController');
const { protect, authorize } = require('../middleware/auth');

// WhatsApp reminders are strictly Admin Only per Section 9
router.use(protect);
router.use(authorize('admin'));

router.post('/generate', generateReminder);

module.exports = router;

