const Account = require('../models/accountModel');
const Transaction = require('../models/transactionModel');
const Cart = require('../models/cartModel');

// @desc    Process payment using Account + Voucher dynamic rules
// @route   POST /api/checkout
// @access  Private
exports.processCheckout = async (req, res) => {
  try {
    const userId = req.user._id;

    // 1. Fetch user's cart
    const cart = await Cart.findOne({ user: userId }).populate('products.product');
    if (!cart || !cart.products || cart.products.length === 0) {
      return res.status(400).json({ success: false, error: 'Cart is empty' });
    }

    // 2. Fetch or initialize user's Account balance record
    let account = await Account.findOne({ user: userId });
    if (!account) {
      account = await Account.create({ user: userId, balance: 0, lifetimeVoucherUsed: 0 });
    }

    // 3. Calculate current Cart Total
    const cartTotal = cart.products.reduce((acc, item) => {
      if (!item.product) return acc;
      const price = item.product.price || 0;
      const discount = item.product.discountPercentage || 0;
      const finalPrice = price * (1 - discount / 100);
      return acc + finalPrice * item.quantity;
    }, 0);

    const roundedTotal = Number(cartTotal.toFixed(2));

    if (roundedTotal <= 0) {
      return res.status(400).json({ success: false, error: 'Cart total must be greater than $0.00' });
    }

    // 4. Fetch the user's FIRST transaction (to retrieve 1st checkout total)
    const firstPayment = await Transaction.findOne({ user: userId, type: 'payment' })
      .sort({ createdAt: 1 }); // Oldest payment

    const isFirstTime = !firstPayment;
    const remainingVoucherPool = Math.max(0, 1000 - (account.lifetimeVoucherUsed || 0));

    let voucherToUse = 0;
    let accountToUse = 0;

    if (isFirstTime) {
      // Rule 1: First purchase — Use voucher up to $200 (capped by remaining pool and total)
      voucherToUse = Math.min(roundedTotal, 200, remainingVoucherPool);
      accountToUse = Number((roundedTotal - voucherToUse).toFixed(2));
    } else {
      // Calculate 70% threshold of the 1st checkout total
      const firstCheckoutTotal = firstPayment.amount || 0;
      const threshold70Percent = Number((firstCheckoutTotal * 0.7).toFixed(2));

      if (roundedTotal > threshold70Percent) {
        // Rule 2A: Subsequent checkout > 70% of 1st checkout total → 100% Account wallet
        accountToUse = roundedTotal;
        voucherToUse = 0;
      } else {
        // Rule 2B: Subsequent checkout <= 70% of 1st checkout total → 30% Voucher split allowed
        const voucherShare = Number((roundedTotal * 0.3).toFixed(2));
        voucherToUse = Math.min(voucherShare, 200, remainingVoucherPool);
        accountToUse = Number((roundedTotal - voucherToUse).toFixed(2));
      }
    }

    // 5. Verify user has enough account wallet balance
    if (account.balance < accountToUse) {
      return res.status(400).json({
        success: false,
        error: `Insufficient balance! Required from Account wallet: $${accountToUse.toFixed(
          2
        )}, but available balance is $${account.balance.toFixed(2)}`
      });
    }

    // 6. Update Account state
    account.balance -= accountToUse;
    account.lifetimeVoucherUsed = (account.lifetimeVoucherUsed || 0) + voucherToUse;
    await account.save();

    // 7. Log payment into Transaction ledger
    const transaction = await Transaction.create({
      user: userId,
      type: 'payment',
      amount: roundedTotal,
      accountAmount: accountToUse,
      voucherAmount: voucherToUse,
      description: `Cart Checkout ($${accountToUse.toFixed(2)} Account, $${voucherToUse.toFixed(2)} Voucher)`
    });

    // 8. Clear cart
    cart.products = [];
    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Checkout completed successfully!',
      data: {
        transaction,
        accountBalance: account.balance,
        lifetimeVoucherUsed: account.lifetimeVoucherUsed,
        remainingVoucherPool: Math.max(0, 1000 - account.lifetimeVoucherUsed)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};