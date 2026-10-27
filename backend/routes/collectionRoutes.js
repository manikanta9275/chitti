const express = require('express');
const router = express.Router();
const {
  getCollectionPeriods,
  getCurrentCollectionPeriod,
  configureCollectionPeriod,
  addCollectionDate
} = require('../controllers/collectionController');
const { protect, authorize } = require('../middleware/auth');

// All authenticated users can read collection periods
router.use(protect);

router.get('/', getCollectionPeriods);
router.get('/current', getCurrentCollectionPeriod);

// Admin-only: configure dates and common actual collection amount
router.post('/configure', authorize('admin'), configureCollectionPeriod);
router.post('/add-date', authorize('admin'), addCollectionDate);

// Admin delete endpoints
const { deleteAllPaymentsForDate, resetAllDatabaseData } = require('../controllers/collectionDeleteController');
router.delete('/date', authorize('admin'), deleteAllPaymentsForDate);
router.delete('/reset-database', authorize('admin'), resetAllDatabaseData);

// Export router
module.exports = router;


