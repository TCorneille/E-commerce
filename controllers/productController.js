const Product = require('../models/productModel');

// @desc    Create a product
// @route   POST /api/products
exports.createProduct = async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json({
      success: true,
      data: product,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Get all products with filtering, search, sorting & pagination
// @route   GET /api/products
exports.getAllProducts = async (req, res) => {
  try {
    const {
      category,
      brand,
      search,
      minPrice,
      maxPrice,
      minRating,
      availabilityStatus,
      sortBy = 'createdAt',
      order = 'desc',
      page = 1,
      limit = 10,
    } = req.query;

    let query = {};

    // 1. Category & Brand Filtering
    if (category) query.category = category.toLowerCase();
    if (brand) query.brand = { $regex: brand, $options: 'i' };
    if (availabilityStatus) query.availabilityStatus = availabilityStatus;

    // 2. Text Search (across title, description, and tags)
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
      ];
    }

    // 3. Price Range Filtering
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // 4. Rating Filtering
    if (minRating) {
      query.rating = { $gte: Number(minRating) };
    }

    // 5. Pagination calculation
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    // 6. Sorting configuration
    const sortOptions = {};
    sortOptions[sortBy] = order === 'asc' ? 1 : -1;

    // Execute queries in parallel
    const [products, totalProducts] = await Promise.all([
      Product.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Product.countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalProducts / limitNum);

    res.status(200).json({
      success: true,
      count: products.length,
      totalProducts,
      totalPages,
      currentPage: pageNum,
      data: products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Get single product by ID
// @route   GET /api/products/:id
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
      });
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'Invalid Product ID format',
    });
  }
};

// @desc    Update product by ID
// @route   PUT /api/products/:id
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
      });
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Delete product by ID
// @route   DELETE /api/products/:id
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Add review to product & recalculate rating
// @route   POST /api/products/:id/reviews
exports.addProductReview = async (req, res) => {
  try {
    const { rating, comment, reviewerName, reviewerEmail } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
      });
    }

    // Push new review
    const newReview = {
      rating: Number(rating),
      comment,
      reviewerName,
      reviewerEmail,
      date: new Date(),
    };

    product.reviews.push(newReview);

    // Recalculate average rating and total review count
    product.numReviews = product.reviews.length;
    const totalRatingSum = product.reviews.reduce((acc, item) => item.rating + acc, 0);
    product.rating = Number((totalRatingSum / product.reviews.length).toFixed(2));

    await product.save();

    res.status(201).json({
      success: true,
      message: 'Review added successfully',
      data: product,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};