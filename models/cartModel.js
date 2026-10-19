const mongoose = require('mongoose');

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
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    products: [cartItemSchema],
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        // Safe mapping with fallbacks
        const formattedProducts = (ret.products || []).map((item) => {
          const product = (item && typeof item.product === 'object' && item.product) ? item.product : {};
          const price = product.price || 0;
          const discountPercentage = product.discountPercentage || 0;
          const itemTotal = Number((price * item.quantity).toFixed(2));
          const itemDiscountedTotal = Number(
            (itemTotal * (1 - discountPercentage / 100)).toFixed(2)
          );

          return {
            id: product._id || item.product,
            title: product.title || '',
            price: price,
            quantity: item.quantity,
            total: itemTotal,
            discountPercentage: discountPercentage,
            discountedTotal: itemDiscountedTotal,
            thumbnail: product.thumbnail || '',
          };
        });

        return {
          id: ret._id,
          userId: ret.user,
          products: formattedProducts,
          total: ret.total || 0,
          discountedTotal: ret.discountedTotal || 0,
          totalProducts: ret.totalProducts || 0,
          totalQuantity: ret.totalQuantity || 0,
        };
      },
    },
  }
);

// Synchronous query pre-hook to auto-populate products on all find queries
cartSchema.pre(/^find/, function (next) {
  this.populate('products.product');
  next();
});

// Virtuals for calculated totals with safe checks
cartSchema.virtual('totalProducts').get(function () {
  return this.products ? this.products.length : 0;
});

cartSchema.virtual('totalQuantity').get(function () {
  return this.products
    ? this.products.reduce((acc, item) => acc + (item.quantity || 0), 0)
    : 0;
});

cartSchema.virtual('total').get(function () {
  if (!this.products) return 0;
  return Number(
    this.products
      .reduce((acc, item) => {
        const price = (item.product && typeof item.product === 'object') ? (item.product.price || 0) : 0;
        return acc + price * (item.quantity || 0);
      }, 0)
      .toFixed(2)
  );
});

cartSchema.virtual('discountedTotal').get(function () {
  if (!this.products) return 0;
  return Number(
    this.products
      .reduce((acc, item) => {
        const price = (item.product && typeof item.product === 'object') ? (item.product.price || 0) : 0;
        const discount = (item.product && typeof item.product === 'object') ? (item.product.discountPercentage || 0) : 0;
        const itemTotal = price * (item.quantity || 0);
        return acc + itemTotal * (1 - discount / 100);
      }, 0)
      .toFixed(2)
  );
});

const Cart = mongoose.model('Cart', cartSchema);
module.exports = Cart;