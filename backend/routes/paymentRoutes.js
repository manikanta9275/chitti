const express = require('express');
const router = express.Router();
const {
  getCollectionPayments,
  addPaymentTransaction,
  getPaymentDetails,
  getDashboardSummary,
  getMemberStatement
} = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

// All authenticated accounts (Admin, Mani, Mavayya, Ganesh) can view and record payments
router.use(protect);

router.get('/', getCollectionPayments);
router.get('/dashboard/summary', getDashboardSummary);
router.get('/member-statement/:memberId', getMemberStatement);
router.get('/:id', getPaymentDetails);
router.post('/:id/transactions', addPaymentTransaction);

module.exports = router;

