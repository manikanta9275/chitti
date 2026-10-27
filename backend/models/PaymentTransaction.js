const mongoose = require('mongoose');

const paymentTransactionSchema = new mongoose.Schema(
  {
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      required: true,
      index: true
    },
    // Amount in integer paise
    amountPaise: {
      type: Number,
      required: true,
      min: [1, 'Transaction amount must be greater than zero']
    },
    transactionType: {
      type: String,
      enum: ['INSTALLMENT', 'FULL_PAYMENT', 'ADJUSTMENT'],
      default: 'INSTALLMENT'
    },
    enteredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    enteredByName: {
      type: String,
      required: true
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

paymentTransactionSchema.virtual('amountRupees').get(function () {
  return this.amountPaise / 100;
});

const PaymentTransaction = mongoose.model('PaymentTransaction', paymentTransactionSchema);

module.exports = PaymentTransaction;

