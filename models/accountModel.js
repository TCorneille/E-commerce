const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Account must belong to a user'],
      unique: true
    },
    balance: {
      type: Number,
      default: 0,
      min: [0, 'Balance cannot be negative']
    },
    lifetimeVoucherUsed: {
      type: Number,
      default: 0,
      max: [1000, 'Lifetime voucher cap is $1000']
    }
  },
  { timestamps: true }
);

const Account = mongoose.model('Account', accountSchema);
module.exports = Account;