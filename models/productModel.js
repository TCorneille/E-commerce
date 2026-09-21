const mongoose = require('mongoose');

// 1. Dimensions Subdocument Schema
const dimensionsSchema = new mongoose.Schema(
  {
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
    depth: { type: Number, default: 0 },
  },
  { _id: false }
);

// 2. Review Subdocument Schema
const reviewSchema = new mongoose.Schema(
  {
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
      default: '',
    },
    date: {
      type: Date,
      default: Date.now,
    },
    reviewerName: {
      type: String,
      required: true,
      trim: true,
    },
    reviewerEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
  },
  { _id: false }
);

// 3. Meta Subdocument Schema
const metaSchema = new mongoose.Schema(
  {
    barcode: { type: String, trim: true, default: '' },
    qrCode: { type: String, trim: true, default: '' },
  },
  {
    timestamps: true,
    _id: false,
  }
);

// 4. Main Product Schema
const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'A product must have a title'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    category: {
      type: String,
      required: [true, 'A product must have a category'],
      trim: true,
      lowercase: true,
    },
    price: {
      type: Number,
      required: [true, 'A product must have a price'],
      min: [0, 'Price must be non-negative'],
    },
    discountPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    stock: {
      type: Number,
      required: [true, 'Stock quantity is required'],
      min: 0,
      default: 0,
    },
    tags: {
      type: [String],
      default: [],
    },
    brand: {
      type: String,
      trim: true,
      default: '',
    },
    sku: {
      type: String,
      trim: true,
      required: true,
      unique: true,
    },
    weight: {
      type: Number,
      default: 0,
    },
    dimensions: {
      type: dimensionsSchema,
      default: () => ({}),
    },
    warrantyInformation: {
      type: String,
      default: '',
    },
    shippingInformation: {
      type: String,
      default: '',
    },
    availabilityStatus: {
      type: String,
      enum: ['In Stock', 'Low Stock', 'Out of Stock'],
      default: 'In Stock',
    },
    reviews: {
      type: [reviewSchema],
      default: [],
    },
    returnPolicy: {
      type: String,
      default: '',
    },
    minimumOrderQuantity: {
      type: Number,
      default: 1,
      min: 1,
    },
    meta: {
      type: metaSchema,
      default: () => ({}),
    },
    thumbnail: {
      type: String,
      default: '',
    },
    images: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Virtual for dynamic discounted price calculation
productSchema.virtual('discountedPrice').get(function () {
  if (!this.price) return 0;
  const discount = this.discountPercentage || 0;
  return Number((this.price * (1 - discount / 100)).toFixed(2));
});

// Indexes for searching & filtering
productSchema.index({ title: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1, price: 1 });

const Product = mongoose.model('Product', productSchema);
module.exports = Product;