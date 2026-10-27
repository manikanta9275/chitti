const mongoose = require('mongoose');

const collectionPeriodSchema = new mongoose.Schema(
  {
    month: {
      type: Number,
      required: [true, 'Month is required (1-12)'],
      min: 1,
      max: 12
    },
    year: {
      type: Number,
      required: [true, 'Year is required'],
      min: 2020,
      max: 2100
    },
    collectionDates: {
      type: [Number],
      default: [],
      validate: {
        validator: function (arr) {
          return !arr || arr.length === 0 || arr.every(d => d >= 1 && d <= 31);
        },
        message: 'Collection dates must be valid calendar days between 1 and 31'
      }
    },
    // Store in integer paise (1 Rupee = 100 paise) to prevent floating-point rounding issues
    basicAmountPaise: {
      type: Number,
      default: 500000 // Default basic amount: ₹5,000 (500,000 paise)
    },
    bonusPaise: {
      type: Number,
      default: 0 // Default monthly bonus: ₹0
    },
    actualAmountPaise: {
      type: Number,
      required: [true, 'Common actual collection amount is required'],
      min: [0, 'Amount cannot be negative'],
      default: 500000 // Default actual amount: ₹5,000 (500,000 paise)
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual field for rupees
collectionPeriodSchema.virtual('actualAmountRupees').get(function () {
  return this.actualAmountPaise / 100;
});

collectionPeriodSchema.virtual('basicAmountRupees').get(function () {
  return (this.basicAmountPaise !== undefined ? this.basicAmountPaise : 500000) / 100;
});

collectionPeriodSchema.virtual('bonusRupees').get(function () {
  return (this.bonusPaise || 0) / 100;
});

// Compound unique index so each month/year period is configured once
collectionPeriodSchema.index({ month: 1, year: 1 }, { unique: true });

const CollectionPeriod = mongoose.model('CollectionPeriod', collectionPeriodSchema);

module.exports = CollectionPeriod;

