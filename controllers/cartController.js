const Cart = require('../models/cartModel');
const Product = require('../models/productModel');

// Helper function to format cart items & compute totals
const formatCartResponse = (cart) => {
  let total = 0;
  let discountedTotal = 0;
  let totalQuantity = 0;

  const formattedProducts = cart.products
    .filter((item) => item.product != null) // Guard against deleted products
    .map((item) => {
      const product = item.product;
      const price = product.price || 0;
      const discountPercentage = product.discountPercentage || 0;
      const itemTotal = Number((price * item.quantity).toFixed(2));
      const itemDiscountedTotal = Number(
        (itemTotal * (1 - discountPercentage / 100)).toFixed(2)
      );

      total += itemTotal;
      discountedTotal += itemDiscountedTotal;
      totalQuantity += item.quantity;

      return {
        id: product._id,
        title: product.title,
        price,
        quantity: item.quantity,
        total: itemTotal,
        discountPercentage,
        discountedTotal: itemDiscountedTotal,
        thumbnail: product.thumbnail,
      };
    });

  return {
    id: cart._id,
    userId: cart.user,
    products: formattedProducts,
    total: Number(total.toFixed(2)),
    discountedTotal: Number(discountedTotal.toFixed(2)),
    totalProducts: formattedProducts.length,
    totalQuantity,
  };
};

// @desc    Get current user's cart
// @route   GET /api/cart
// @access  Private (req.user required)
exports.getCart = async (req, res) => {
  try {
    const userId = req.user._id;

    let cart = await Cart.findOne({ user: userId }).populate('products.product');

    if (!cart) {
      cart = await Cart.create({ user: userId, products: [] });
    }

    res.status(200).json({
      success: true,
      data: formatCartResponse(cart),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Add item to cart or increment quantity
// @route   POST /api/cart
// @access  Private
exports.addToCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: 'Product ID is required',
      });
    }

    const parsedQuantity = parseInt(quantity, 10);
    if (isNaN(parsedQuantity) || parsedQuantity < 1) {
      return res.status(400).json({
        success: false,
        error: 'Quantity must be a positive integer',
      });
    }

    // Check product existence and available stock
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
      });
    }

    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = new Cart({ user: userId, products: [] });
    }

    // Check if product already exists in cart
    const existingItemIndex = cart.products.findIndex(
      (item) => item.product.toString() === productId
    );

    let newQuantity = parsedQuantity;
    if (existingItemIndex > -1) {
      newQuantity = cart.products[existingItemIndex].quantity + parsedQuantity;
    }

    // Verify stock limits
    if (product.stock < newQuantity) {
      return res.status(400).json({
        success: false,
        error: `Only ${product.stock} items available in stock`,
      });
    }

    if (existingItemIndex > -1) {
      cart.products[existingItemIndex].quantity = newQuantity;
    } else {
      cart.products.push({ product: productId, quantity: parsedQuantity });
    }

    await cart.save();
    await cart.populate('products.product');

    res.status(200).json({
      success: true,
      message: 'Product added to cart',
      data: formatCartResponse(cart),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Update item quantity in cart
// @route   PUT /api/cart/items/:productId
// @access  Private
exports.updateCartItemQuantity = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId } = req.params;
    const { quantity } = req.body;

    const parsedQuantity = parseInt(quantity, 10);
    if (isNaN(parsedQuantity) || parsedQuantity < 0) {
      return res.status(400).json({
        success: false,
        error: 'Quantity must be 0 or greater',
      });
    }

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        error: 'Cart not found',
      });
    }

    const itemIndex = cart.products.findIndex(
      (item) => item.product.toString() === productId
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Product not found in cart',
      });
    }

    // If quantity set to 0, remove the item
    if (parsedQuantity === 0) {
      cart.products.splice(itemIndex, 1);
    } else {
      // Stock check
      const product = await Product.findById(productId);
      if (product && product.stock < parsedQuantity) {
        return res.status(400).json({
          success: false,
          error: `Only ${product.stock} items available in stock`,
        });
      }
      cart.products[itemIndex].quantity = parsedQuantity;
    }

    await cart.save();
    await cart.populate('products.product');

    res.status(200).json({
      success: true,
      message: 'Cart updated',
      data: formatCartResponse(cart),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Remove an item from cart
// @route   DELETE /api/cart/items/:productId
// @access  Private
exports.removeCartItem = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId } = req.params;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        error: 'Cart not found',
      });
    }

    cart.products = cart.products.filter(
      (item) => item.product.toString() !== productId
    );

    await cart.save();
    await cart.populate('products.product');

    res.status(200).json({
      success: true,
      message: 'Item removed from cart',
      data: formatCartResponse(cart),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Clear entire cart
// @route   DELETE /api/cart
// @access  Private
exports.clearCart = async (req, res) => {
  try {
    const userId = req.user._id;

    const cart = await Cart.findOne({ user: userId });
    if (cart) {
      cart.products = [];
      await cart.save();
    }

    res.status(200).json({
      success: true,
      message: 'Cart cleared successfully',
      data: {
        userId,
        products: [],
        total: 0,
        discountedTotal: 0,
        totalProducts: 0,
        totalQuantity: 0,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};