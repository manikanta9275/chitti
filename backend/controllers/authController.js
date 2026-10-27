const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Helper to generate signed JWT token
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      username: user.username,
      role: user.role
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE || '7d'
    }
  );
};

// @desc    Authenticate user by username and PIN
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { username, pin } = req.body;

    // Validation
    if (!username || !pin) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both username and PIN.'
      });
    }

    const cleanUsername = username.trim().toLowerCase();

    // Find user by username and include pinHash (which is select: false by default)
    const user = await User.findOne({ username: cleanUsername }).select('+pinHash');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or PIN.'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact the administrator.'
      });
    }

    // Check entered PIN against hashed PIN in DB
    const isMatch = await user.matchPin(pin.toString());

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or PIN.'
      });
    }

    // Generate JWT token
    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: `Welcome back, ${user.displayName}!`,
      token,
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during authentication. Please try again.'
    });
  }
};

// @desc    Get currently logged in user profile
// @route   GET /api/auth/me
// @access  Private (Protected by JWT)
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-pinHash');
    return res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    console.error('GetMe Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving user profile.'
    });
  }
};

// @desc    Get list of active accounts for login selection
// @route   GET /api/auth/accounts
// @access  Public
const getAccounts = async (req, res) => {
  try {
    const accounts = await User.find({ isActive: true })
      .select('username displayName role')
      .sort({ role: 1, displayName: 1 });

    return res.status(200).json({
      success: true,
      accounts
    });
  } catch (error) {
    console.error('GetAccounts Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving accounts list.'
    });
  }
};

// @desc    Logout user / invalidate session client-side
// @route   POST /api/auth/logout
// @access  Public
const logout = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully.'
  });
};

module.exports = {
  login,
  getMe,
  getAccounts,
  logout
};

