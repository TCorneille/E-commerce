const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');
const { protect }= require('../controllers/authController');

router.use(protect);

// GET /api/account - View balance & voucher status
router.get('/', accountController.getAccount);

// POST /api/account/deposit - Top up balance
router.post('/deposit', accountController.deposit);

// POST /api/account/withdraw - Cash out funds
router.post('/withdraw', accountController.withdraw);

module.exports = router;