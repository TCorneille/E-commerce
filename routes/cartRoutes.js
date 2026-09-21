const express = require('express');
const router = express.Router();
const {
  getCart,
  addToCart,
  updateCartItemQuantity,
  removeCartItem,
  clearCart,
} = require('../controllers/cartController');
const { protect } = require('../controllers/authController');

router.use(protect); // Require authentication for all cart routes

router.route('/')
  .get(getCart)
  .post(addToCart)
  .delete(clearCart);

router.route('/items/:productId')
  .put(updateCartItemQuantity)
  .delete(removeCartItem);

module.exports = router;