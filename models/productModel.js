const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'A product must have a title'],
      trim: true,
      maxlength: [100, 'A product title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    price: {
      type: Number,
      required: [true, 'A product must have a price'],
      min: [0, 'A product price must be a positive number'],
    },
    category: {
      type: String,
      required: [true, 'A product must have a category'],
    },
    stock: {
      type: Number,
      required: [true, 'A product must have a stock quantity'],
      min: [0, 'A product stock quantity must be a positive number'],
    },
    images: [
      {
        type: String,
      },
    ],
    reviews: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        rating: {
          type: Number,
          min: 1,
          max: 5,
        },
        comment: {
          type: String,
          trim: true,
        },
      },
    ],
  },

  {
    timestamps: true,
  }
);

// ✅ Direct default export
const Product = mongoose.model('Product', productSchema);
module.exports = Product;