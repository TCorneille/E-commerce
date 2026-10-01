const express = require('express');
const router = express.Router();
const checkoutController = require('../controllers/checkoutController');
const { protect } = require('../controllers/authController');


router.use(protect);


router.post('/', checkoutController.processCheckout);

module.exports = router;