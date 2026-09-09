const express = require('express');
const router = express.Router();

// Import controller functions
const {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController'); // Adjust path as needed

// Root route handlers: /api/products
router
  .route('/')
  .get(getAllProducts)
  .post(createProduct);

// Parametric route handlers: /api/products/:id
router
  .route('/:id')
  .get(getProductById)
  .put(updateProduct)
  .delete(deleteProduct);

module.exports = router;