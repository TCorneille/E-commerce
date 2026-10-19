
const Cart = require('../models/cartModel');
const Product = require('../models/productModel');

// Helper: Format cart items and calculate totals
const formatCartResponse = (cart) => {
  let total = 0;
  let discountedTotal = 0;
  let totalQuantity = 0;

  const products = (cart.products || [])
    .filter((item) => item && item.product)
    .map((item) => {
      const product = item.product;
      const price = Number(product.price) || 0;
      const quantity = Number(item.quantity) || 0;
      const discountPercentage = Math.min(
        100,
        Math.max(0, Number(product.discountPercentage) || 0)
      );

      const itemTotal = Number((price * quantity).toFixed(2));
      const itemDiscountedTotal = Number(
        (itemTotal * (1 - discountPercentage / 100)).toFixed(2)
      );

      total += itemTotal;
      discountedTotal += itemDiscountedTotal;
      totalQuantity += quantity;

      return {
        id: product._id,
        title: product.title,
        price,
        quantity,
        total: itemTotal,
        discountPercentage,
        discountedTotal: itemDiscountedTotal,
        thumbnail: product.thumbnail,
      };
    });

  return {
    id: cart._id,
    userId: cart.user,
    products,
    total: Number(total.toFixed(2)),
    discountedTotal: Number(discountedTotal.toFixed(2)),
    totalProducts: products.length,
    totalQuantity,
  };
};

// Helper: Check authenticated user
const getAuthenticatedUserId = (req, res) => {
  if (!req.user || !req.user._id) {
    res.status(401).json({
      success: false,
      error: 'Authentication required. Please log in.',
    });
    return null;
  }

  return req.user._id;
};

// Helper: Return a consistent error response
const handleCartError = (res, error, operation) => {
  console.error(`${operation} Error:`, error);

  return res.status(500).json({
    success: false,
    error: `Failed to ${operation.toLowerCase()}.`,
    details:
      process.env.NODE_ENV === 'production'
        ? undefined
        : error.message,
  });
};

// GET /api/v1/cart
// Get the authenticated user's cart
exports.getCart = async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req, res);
    if (!userId) return;

    const cart = await Cart.findOne({ user: userId }).populate({
      path: 'products.product',
      select: 'title price discountPercentage thumbnail images stock',
    });

    if (!cart) {
      return res.status(200).json({
        success: true,
        data: {
          id: null,
          userId,
          products: [],
          total: 0,
          discountedTotal: 0,
          totalProducts: 0,
          totalQuantity: 0,
        },
      });
    }

    // Exclude products that have been deleted
    cart.products = (cart.products || []).filter(
      (item) => item && item.product
    );

    return res.status(200).json({
      success: true,
      data: formatCartResponse(cart),
    });
  } catch (error) {
    return handleCartError(res, error, 'Retrieve cart');
  }
};

// POST /api/v1/cart
// Add a product or increase its quantity
exports.addToCart = async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req, res);
    if (!userId) return;

    const { productId, quantity = 1 } = req.body || {};

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: 'Product ID is required.',
      });
    }

    const parsedQuantity = Number(quantity);

    if (
      !Number.isSafeInteger(parsedQuantity) ||
      parsedQuantity < 1
    ) {
      return res.status(400).json({
        success: false,
        error: 'Quantity must be a positive integer.',
      });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found.',
      });
    }

    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      cart = new Cart({
        user: userId,
        products: [],
      });
    }

    const existingItemIndex = cart.products.findIndex(
      (item) =>
        item.product &&
        item.product.toString() === product._id.toString()
    );

    const currentQuantity =
      existingItemIndex >= 0
        ? cart.products[existingItemIndex].quantity
        : 0;

    const newQuantity = currentQuantity + parsedQuantity;

    // Check stock only if the product schema defines stock
    if (
      product.stock != null &&
      newQuantity > Number(product.stock)
    ) {
      return res.status(400).json({
        success: false,
        error: `Only ${product.stock} items available in stock.`,
      });
    }

    if (existingItemIndex >= 0) {
      cart.products[existingItemIndex].quantity = newQuantity;
    } else {
      cart.products.push({
        product: product._id,
        quantity: parsedQuantity,
      });
    }

    await cart.save();

    await cart.populate({
      path: 'products.product',
      select: 'title price discountPercentage thumbnail images stock',
    });

    return res.status(200).json({
      success: true,
      message: 'Product added to cart.',
      data: formatCartResponse(cart),
    });
  } catch (error) {
    return handleCartError(res, error, 'Add product to cart');
  }
};

// PUT /api/v1/cart/items/:productId
// Update a product quantity; zero removes the item
exports.updateCartItemQuantity = async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req, res);
    if (!userId) return;

    const { productId } = req.params;
    const parsedQuantity = Number(req.body?.quantity);

    if (
      !Number.isSafeInteger(parsedQuantity) ||
      parsedQuantity < 0
    ) {
      return res.status(400).json({
        success: false,
        error: 'Quantity must be a non-negative integer.',
      });
    }

    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
      return res.status(404).json({
        success: false,
        error: 'Cart not found.',
      });
    }

    const itemIndex = cart.products.findIndex(
      (item) =>
        item.product &&
        item.product.toString() === productId
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Product not found in cart.',
      });
    }

    if (parsedQuantity === 0) {
      cart.products.splice(itemIndex, 1);
    } else {
      const product = await Product.findById(productId);

      if (!product) {
        cart.products.splice(itemIndex, 1);
      } else {
        if (
          product.stock != null &&
          parsedQuantity > Number(product.stock)
        ) {
          return res.status(400).json({
            success: false,
            error: `Only ${product.stock} items available in stock.`,
          });
        }

        cart.products[itemIndex].quantity = parsedQuantity;
      }
    }

    await cart.save();

    await cart.populate({
      path: 'products.product',
      select: 'title price discountPercentage thumbnail images stock',
    });

    cart.products = cart.products.filter(
      (item) => item && item.product
    );

    return res.status(200).json({
      success: true,
      message:
        parsedQuantity === 0
          ? 'Product removed from cart.'
          : 'Cart quantity updated.',
      data: formatCartResponse(cart),
    });
  } catch (error) {
    return handleCartError(res, error, 'Update cart');
  }
};

// DELETE /api/v1/cart/items/:productId
// Remove one product from the cart
exports.removeCartItem = async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req, res);
    if (!userId) return;

    const { productId } = req.params;

    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
      return res.status(404).json({
        success: false,
        error: 'Cart not found.',
      });
    }

    cart.products = cart.products.filter(
      (item) =>
        item.product &&
        item.product.toString() !== productId
    );

    await cart.save();

    await cart.populate({
      path: 'products.product',
      select: 'title price discountPercentage thumbnail images stock',
    });

    return res.status(200).json({
      success: true,
      message: 'Item removed from cart.',
      data: formatCartResponse(cart),
    });
  } catch (error) {
    return handleCartError(res, error, 'Remove cart item');
  }
};

// DELETE /api/v1/cart
// Remove every product from the cart
exports.clearCart = async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req, res);
    if (!userId) return;

    const cart = await Cart.findOne({ user: userId });

    if (cart) {
      cart.products = [];
      await cart.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Cart cleared successfully.',
      data: {
        id: cart ? cart._id : null,
        userId,
        products: [],
        total: 0,
        discountedTotal: 0,
        totalProducts: 0,
        totalQuantity: 0,
      },
    });
  } catch (error) {
    return handleCartError(res, error, 'Clear cart');
  }
};
