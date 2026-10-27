const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema(
  {
    memberId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Member name is required'],
      trim: true
    },
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true
    },
    // Collection dates this member is assigned to (e.g. 5, 10, 15, 20, 25, 30)
    assignedDates: {
      type: [Number],
      default: [5],
      validate: {
        validator: function (arr) {
          return arr && arr.length > 0 && arr.every((d) => d >= 1 && d <= 31);
        },
        message: 'Assigned dates must be valid calendar days between 1 and 31'
      }
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

const Member = mongoose.model('Member', memberSchema);

module.exports = Member;
