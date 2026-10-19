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
        // Defensive transformation for raw/unpopulated data
        const safeProducts = Array.isArray(ret.products) ? ret.products : [];
        
        const formattedProducts = safeProducts.map((item) => {
          const product = (item && typeof item.product === 'object' && item.product !== null) 
            ? item.product 
            : {};
          
          const price = typeof product.price === 'number' ? product.price : 0;
          const discountPercentage = typeof product.discountPercentage === 'number' ? product.discountPercentage : 0;
          const qty = item && typeof item.quantity === 'number' ? item.quantity : 1;
          
          const itemTotal = Number((price * qty).toFixed(2));
          const itemDiscountedTotal = Number(
            (itemTotal * (1 - discountPercentage / 100)).toFixed(2)
          );

          return {
            id: product._id || item?.product || '',
            title: product.title || 'Product',
            price: price,
            quantity: qty,
            total: itemTotal,
            discountPercentage: discountPercentage,
            discountedTotal: itemDiscountedTotal,
            thumbnail: product.thumbnail || (product.images && product.images[0]) || '',
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

// Auto-populate query pre-hook using standard synchronous syntax
cartSchema.pre(/^find/, function (next) {
  this.populate('products.product');
  next();
});

// Safe Virtuals
cartSchema.virtual('totalProducts').get(function () {
  return Array.isArray(this.products) ? this.products.length : 0;
});

cartSchema.virtual('totalQuantity').get(function () {
  if (!Array.isArray(this.products)) return 0;
  return this.products.reduce((acc, item) => acc + (item?.quantity || 0), 0);
});

cartSchema.virtual('total').get(function () {
  if (!Array.isArray(this.products)) return 0;
  return Number(
    this.products
      .reduce((acc, item) => {
        const product = item?.product;
        const price = (product && typeof product === 'object') ? (product.price || 0) : 0;
        const qty = item?.quantity || 0;
        return acc + price * qty;
      }, 0)
      .toFixed(2)
  );
});

cartSchema.virtual('discountedTotal').get(function () {
  if (!Array.isArray(this.products)) return 0;
  return Number(
    this.products
      .reduce((acc, item) => {
        const product = item?.product;
        const price = (product && typeof product === 'object') ? (product.price || 0) : 0;
        const discount = (product && typeof product === 'object') ? (product.discountPercentage || 0) : 0;
        const itemTotal = price * (item?.quantity || 0);
        return acc + itemTotal * (1 - discount / 100);
      }, 0)
      .toFixed(2)
  );
});

const Cart = mongoose.model('Cart', cartSchema);
module.exports = Cart;