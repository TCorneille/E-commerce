
const mongoose = require('mongoose');

// Cart item schema
const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
  },
  {
    _id: false,
  }
);

// Cart schema
const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    products: {
      type: [cartItemSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
    toObject: {
      virtuals: true,
    },
  }
);

// Virtual: Number of distinct products in the cart
cartSchema.virtual('totalProducts').get(function () {
  if (!Array.isArray(this.products)) return 0;

  return this.products.filter(
    (item) => item && item.product
  ).length;
});

// Virtual: Total quantity of all products
cartSchema.virtual('totalQuantity').get(function () {
  if (!Array.isArray(this.products)) return 0;

  return this.products.reduce((total, item) => {
    if (!item || !item.product) return total;

    return total + (Number(item.quantity) || 0);
  }, 0);
});

// Virtual: Total price before discounts
cartSchema.virtual('total').get(function () {
  if (!Array.isArray(this.products)) return 0;

  const total = this.products.reduce((sum, item) => {
    if (
      !item ||
      !item.product ||
      typeof item.product !== 'object'
    ) {
      return sum;
    }

    const price = Number(item.product.price) || 0;
    const quantity = Number(item.quantity) || 0;

    return sum + price * quantity;
  }, 0);

  return Number(total.toFixed(2));
});

// Virtual: Total price after discounts
cartSchema.virtual('discountedTotal').get(function () {
  if (!Array.isArray(this.products)) return 0;

  const total = this.products.reduce((sum, item) => {
    if (
      !item ||
      !item.product ||
      typeof item.product !== 'object'
    ) {
      return sum;
    }

    const price = Number(item.product.price) || 0;
    const discount = Math.min(
      100,
      Math.max(
        0,
        Number(item.product.discountPercentage) || 0
      )
    );
    const quantity = Number(item.quantity) || 0;

    return (
      sum +
      price * quantity * (1 - discount / 100)
    );
  }, 0);

  return Number(total.toFixed(2));
});

// Create and export the Cart model
const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;
