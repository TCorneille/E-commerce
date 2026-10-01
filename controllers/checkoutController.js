const Account = require('../models/accountModel');
const Transaction = require('../models/transactionModel');
const Cart = require('../models/cartModel');

// @desc    Process payment using Account + Voucher rules
// @route   POST /api/checkout
// @access  Private
exports.processCheckout = async (req, res) => {
  try {
    const userId = req.user._id;

    // 1. Fetch user's cart
    const cart = await Cart.findOne({ user: userId }).populate('products.product');
    if (!cart || cart.products.length === 0) {
      return res.status(400).json({ success: false, error: 'Cart is empty' });
    }

    // 2. Fetch or initialize user's Account balance record
    let account = await Account.findOne({ user: userId });
    if (!account) {
      account = await Account.create({ user: userId, balance: 0, lifetimeVoucherUsed: 0 });
    }

    // 3. Calculate Cart Total
    const cartTotal = cart.products.reduce((acc, item) => {
      if (!item.product) return acc;
      const price = item.product.price || 0;
      const discount = item.product.discountPercentage || 0;
      const finalPrice = price * (1 - discount / 100);
      return acc + finalPrice * item.quantity;
    }, 0);

    const roundedTotal = Number(cartTotal.toFixed(2));

    // 4. Determine if first purchase (by checking transaction ledger)
    const paymentCount = await Transaction.countDocuments({ user: userId, type: 'payment' });
    const isFirstTime = paymentCount === 0;

    // 5. Compute Voucher & Account split based on your rules
    const remainingVoucherPool = Math.max(0, 1000 - account.lifetimeVoucherUsed);
    let voucherToUse = 0;
    let accountToUse = 0;

    if (isFirstTime) {
      // First purchase: Use voucher up to $200 (capped by remaining pool and cart total)
      voucherToUse = Math.min(roundedTotal, 200, remainingVoucherPool);
      accountToUse = Number((roundedTotal - voucherToUse).toFixed(2));
    } else {
      // Subsequent purchases:
      const requiredAccountShare = Number((roundedTotal * 0.7).toFixed(2));
      const remainingCartShare = Number((roundedTotal - requiredAccountShare).toFixed(2));

      if (roundedTotal <= requiredAccountShare) {
        accountToUse = roundedTotal;
        voucherToUse = 0;
      } else {
        accountToUse = requiredAccountShare;
        voucherToUse = Math.min(remainingCartShare, 200, remainingVoucherPool);
        
        // If voucher pool is exhausted/capped, account covers remaining amount
        accountToUse = Number((roundedTotal - voucherToUse).toFixed(2));
      }
    }

    // 6. Verify account has enough balance
    if (account.balance < accountToUse) {
      return res.status(400).json({
        success: false,
        error: `Insufficient balance! Account needs $${accountToUse.toFixed(
          2
        )}, but your available balance is $${account.balance.toFixed(2)}`
      });
    }

    // 7. Update Account state
    account.balance -= accountToUse;
    account.lifetimeVoucherUsed += voucherToUse;
    await account.save();

    // 8. Log the payment entry into Transaction ledger
    const transaction = await Transaction.create({
      user: userId,
      type: 'payment',
      amount: roundedTotal,
      accountAmount: accountToUse,
      voucherAmount: voucherToUse,
      description: `Cart Checkout ($${accountToUse} Account, $${voucherToUse} Voucher)`
    });

    // 9. Clear cart
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