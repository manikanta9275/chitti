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
    },
    // Optional star in start of member name (toggleable in Members Directory)
    isStarred: {
      type: Boolean,
      default: false
    },
    // Initial / previous pending balance carried over (in paise)
    initialPendingPaise: {
      type: Number,
      default: 0,
      min: 0
    },
    // Number of chittis this member holds (1 = single, 2 = double, 3 = triple, etc.)
    chittiCount: {
      type: Number,
      default: 1,
      min: [1, 'Chitti count must be at least 1'],
      max: [10, 'Chitti count cannot exceed 10']
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

memberSchema.virtual('initialPendingRupees').get(function () {
  return (this.initialPendingPaise || 0) / 100;
});

memberSchema.index({ isActive: 1, assignedDates: 1 });

const Member = mongoose.model('Member', memberSchema);

module.exports = Member;
