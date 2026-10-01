const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
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
      default: 0
    },
    voucherAmount: {
      type: Number,
      default: 0
    },
    description: String
  },
  { timestamps: true }
);

// Auto-populate user info
transactionSchema.pre(/^find/, function (next) {
  this.populate({ path: 'user', select: 'name email' });
  next();
});

const Transaction = mongoose.model('Transaction', transactionSchema);
module.exports = Transaction;