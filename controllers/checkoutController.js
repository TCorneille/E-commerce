const Account = require('../models/accountModel');
const Transaction = require('../models/transactionModel');
const Cart = require('../models/cartModel');

// @desc    Process payment using Account + Voucher dynamic rules
// @route   POST /api/v1/checkout
// @access  Private
exports.processCheckout = async (req, res) => {
  try {
    const userId = req.user._id;

    // 1. Fetch user's cart and populate product details
    const cart = await Cart.findOne({ user: userId }).populate('products.product');
    if (!cart || !cart.products || cart.products.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cart is empty' 
      });
    }

    // 2. Fetch or initialize user's Account balance record
    let account = await Account.findOne({ user: userId });
    if (!account) {
      account = await Account.create({ 
        user: userId, 
        balance: 0, 
        lifetimeVoucherUsed: 0 
      });
    }

    // 3. Calculate current Cart Total (accounting for potential discounts)
    const cartTotal = cart.products.reduce((acc, item) => {
      if (!item || !item.product) return acc;
      const price = item.product.price || 0;
      const discount = item.product.discountPercentage || 0;
      const finalPrice = price * (1 - discount / 100);
      return acc + finalPrice * item.quantity;
    }, 0);

    const roundedTotal = Number(cartTotal.toFixed(2));

    if (roundedTotal <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cart total must be greater than $0.00' 
      });
    }

    // 4. Safely query the user's FIRST transaction ledger entry
    const firstPayment = await Transaction.findOne({ user: userId, type: 'payment' })
      .sort({ createdAt: 1 });

    const isFirstTime = !firstPayment;
    const remainingVoucherPool = Math.max(0, 1000 - (account.lifetimeVoucherUsed || 0));

    let voucherToUse = 0;
    let accountToUse = 0;

    if (isFirstTime) {
      // Rule 1: First purchase — Cover up to $200 with voucher (capped by total and lifetime pool)
      voucherToUse = Math.min(roundedTotal, 200, remainingVoucherPool);
      accountToUse = Number((roundedTotal - voucherToUse).toFixed(2));
    } else {
      // Rule 2: Subsequent purchase — Compare against 70% of 1st checkout total
      const firstCheckoutTotal = firstPayment?.amount || 0;
      const threshold70Percent = Number((firstCheckoutTotal * 0.7).toFixed(2));

      if (roundedTotal > threshold70Percent) {
        // Current total exceeds 70% of 1st purchase → 100% Account Wallet payment
        accountToUse = roundedTotal;
        voucherToUse = 0;
      } else {
        // Current total <= 70% of 1st purchase → 30% Voucher split allowed
        const voucherShare = Number((roundedTotal * 0.3).toFixed(2));
        voucherToUse = Math.min(voucherShare, 200, remainingVoucherPool);
        accountToUse = Number((roundedTotal - voucherToUse).toFixed(2));
      }
    }

    // 5. Verify account balance is sufficient to cover required wallet portion
    if (account.balance < accountToUse) {
      return res.status(400).json({
        success: false,
        error: `Insufficient account balance! Required from wallet: $${accountToUse.toFixed(
          2
        )}, but available balance is $${account.balance.toFixed(2)}`
      });
    }

    // 6. Update Account state
    account.balance -= accountToUse;
    account.lifetimeVoucherUsed = (account.lifetimeVoucherUsed || 0) + voucherToUse;
    await account.save();

    // 7. Log transaction ledger entry
    const transaction = await Transaction.create({
      user: userId,
      type: 'payment',
      amount: roundedTotal,
      accountAmount: accountToUse,
      voucherAmount: voucherToUse,
      description: `Cart Checkout ($${accountToUse.toFixed(2)} Account, $${voucherToUse.toFixed(2)} Voucher)`
    });

    // 8. Clear user cart
    cart.products = [];
    await cart.save();

    return res.status(200).json({
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
    console.error('Checkout Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};