const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true
    },
    displayName: {
      type: String,
      required: [true, 'Display name is required'],
      trim: true
    },
    pinHash: {
      type: String,
      required: [true, 'PIN hash is required'],
      select: false // Do not return pinHash in standard queries
    },
    role: {
      type: String,
      enum: {
        values: ['admin', 'user'],
        message: 'Role must be either admin or user'
      },
      default: 'user'
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Method to verify entered PIN against stored bcrypt hash
userSchema.methods.matchPin = async function (enteredPin) {
  return await bcrypt.compare(enteredPin, this.pinHash);
};

// Static helper to hash a plain-text PIN
userSchema.statics.hashPin = async function (pin) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(pin, salt);
};

const User = mongoose.model('User', userSchema);

module.exports = User;

