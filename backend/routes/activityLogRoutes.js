const express = require('express');
const router = express.Router();
const { getActivityLogs } = require('../controllers/activityLogController');
const { protect } = require('../middleware/auth');

// All authenticated accounts can view payment & system update history
router.use(protect);

router.get('/', getActivityLogs);

module.exports = router;

