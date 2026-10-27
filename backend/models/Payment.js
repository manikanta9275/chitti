const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
      index: true
    },
    collectionPeriodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CollectionPeriod',
      required: true,
      index: true
    },
    collectionDate: {
      type: Number,
      required: true,
      min: 1,
      max: 31
    },
    // Amounts in integer paise (100 paise = 1 INR)
    actualAmountPaise: {
      type: Number,
      required: true,
      default: 100000 // ₹1,000
    },
    totalPaidPaise: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    status: {
      type: String,
      enum: ['NOT_PAID', 'PARTIAL', 'PAID'],
      default: 'NOT_PAID',
      index: true
    },
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    lastUpdatedByName: {
      type: String,
      default: 'System'
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for rupee values
paymentSchema.virtual('actualAmountRupees').get(function () {
  return this.actualAmountPaise / 100;
});

paymentSchema.virtual('totalPaidRupees').get(function () {
  return this.totalPaidPaise / 100;
});

paymentSchema.virtual('balancePaise').get(function () {
  return Math.max(0, this.actualAmountPaise - this.totalPaidPaise);
});

paymentSchema.virtual('balanceRupees').get(function () {
  return (this.actualAmountPaise - this.totalPaidPaise) / 100;
});

// Helper method to recalculate status based on amounts
paymentSchema.methods.recalculateStatus = function () {
  if (this.totalPaidPaise >= this.actualAmountPaise) {
    this.status = 'PAID';
  } else if (this.totalPaidPaise > 0) {
    this.status = 'PARTIAL';
  } else {
    this.status = 'NOT_PAID';
  }
};

// Compound unique index: exactly one payment record per member per date in a period
paymentSchema.index(
  { memberId: 1, collectionPeriodId: 1, collectionDate: 1 },
  { unique: true }
);

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;

