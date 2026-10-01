const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

// GET /api/transactions - Get current user's transaction ledger history
router.get('/', transactionController.getUserTransactions);

// GET /api/transactions/:id - Get specific transaction details
router.get('/:id', transactionController.getTransactionById);

module.exports = router;