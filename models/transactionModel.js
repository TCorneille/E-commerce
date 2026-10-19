
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Transaction must belong to a user']
    },

    type: {
      type: String,
      enum: ['deposit', 'withdraw', 'payment'],
      required: [true, 'Transaction must have a type']
    },

    amount: {
      type: Number,
      required: [true, 'Transaction total amount is required'],
      min: [0.01, 'Amount must be positive']
    },

    accountAmount: {
      type: Number,
      default: 0,
      min: [0, 'Account amount cannot be negative']
    },

    voucherAmount: {
      type: Number,
      default: 0,
      min: [0, 'Voucher amount cannot be negative']
    },

    description: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Automatically populate user information for find queries.
// Do not call next() in this middleware.
transactionSchema.pre(/^find/, function () {
  this.populate({
    path: 'user',
    select: 'name email'
  });
});

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
