const Transaction = require('../models/transactionModel');

// @desc    Get current user's transaction history
// @route   GET /api/v1/transactions
// @access  Private
exports.getUserTransactions = async (req, res) => {
  try {
    const userId = req.user._id;

    // Fetch user transactions sorted by newest first
    const transactions = await Transaction.find({ user: userId })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};