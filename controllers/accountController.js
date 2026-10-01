const Account = require('../models/accountModel');
const Transaction = require('../models/transactionModel');

// @desc    Get user's current account balance and voucher info
// @route   GET /api/account
// @access  Private
exports.getAccount = async (req, res) => {
  try {
    const userId = req.user._id;

    // Fetch existing account or return default values if not created yet
    let account = await Account.findOne({ user: userId });

    if (!account) {
      account = {
        balance: 0,
        lifetimeVoucherUsed: 0
      };
    }

    const remainingVoucherPool = Math.max(0, 1000 - (account.lifetimeVoucherUsed || 0));

    res.status(200).json({
      success: true,
      data: {
        balance: account.balance,
        lifetimeVoucherUsed: account.lifetimeVoucherUsed || 0,
        remainingVoucherPool
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Deposit funds into user account
// @route   POST /api/account/deposit
// @access  Private
exports.deposit = async (req, res) => {
  try {
    const userId = req.user._id;
    const { amount, description } = req.body;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Deposit amount must be a positive number'
      });
    }

    // 1. Fetch or create account
    let account = await Account.findOne({ user: userId });
    if (!account) {
      account = await Account.create({ user: userId, balance: 0 });
    }

    // 2. Increment account balance
    account.balance += parsedAmount;
    await account.save();

    // 3. Record transaction ledger entry
    const transaction = await Transaction.create({
      user: userId,
      type: 'deposit',
      amount: parsedAmount,
      accountAmount: parsedAmount,
      description: description || `Deposited $${parsedAmount.toFixed(2)} to account`
    });

    res.status(200).json({
      success: true,
      message: `Successfully deposited $${parsedAmount.toFixed(2)}`,
      data: {
        newBalance: account.balance,
        transaction
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Withdraw funds from user account
// @route   POST /api/account/withdraw
// @access  Private
exports.withdraw = async (req, res) => {
  try {
    const userId = req.user._id;
    const { amount, description } = req.body;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Withdrawal amount must be a positive number'
      });
    }

    // 1. Fetch account
    const account = await Account.findOne({ user: userId });
    if (!account || account.balance < parsedAmount) {
      return res.status(400).json({
        success: false,
        error: `Insufficient balance! Available: $${account ? account.balance.toFixed(2) : '0.00'}`
      });
    }

    // 2. Deduct balance
    account.balance -= parsedAmount;
    await account.save();

    // 3. Record transaction ledger entry
    const transaction = await Transaction.create({
      user: userId,
      type: 'withdraw',
      amount: parsedAmount,
      accountAmount: parsedAmount,
      description: description || `Withdrew $${parsedAmount.toFixed(2)} from account`
    });

    res.status(200).json({
      success: true,
      message: `Successfully withdrew $${parsedAmount.toFixed(2)}`,
      data: {
        newBalance: account.balance,
        transaction
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};