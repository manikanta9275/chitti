const express = require('express');
const router = express.Router();

const {
  getMembers,
  getMemberById,
  createMember,
  updateMember,
  deactivateMember,
  activateMember,
  deleteMemberPayments
} = require('../controllers/memberController');

const { protect, authorize } = require('../middleware/auth');

// All authenticated users can view members
router.use(protect);

router.get('/', getMembers);
router.get('/:id', getMemberById);

// Admin-only operations
router.post('/', authorize('admin'), createMember);
router.put('/:id', authorize('admin'), updateMember);
router.patch('/:id/deactivate', authorize('admin'), deactivateMember);
router.patch('/:id/activate', authorize('admin'), activateMember);
router.delete('/:id/payments', authorize('admin'), deleteMemberPayments);

module.exports = router;
