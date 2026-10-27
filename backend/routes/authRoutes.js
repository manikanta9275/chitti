const express = require('express');
const router = express.Router();
const { login, getMe, getAccounts, logout } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Public routes
router.post('/login', login);
router.get('/accounts', getAccounts);
router.post('/logout', logout);

// Protected routes
router.get('/me', protect, getMe);

module.exports = router;

