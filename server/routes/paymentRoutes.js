const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authMiddleware } = require('../middleware/auth');

// Cryptomus
router.post('/cryptomus/create', authMiddleware, (req, res) => paymentController.createCryptomus(req, res));
router.post('/cryptomus/webhook', express.json(), (req, res) => paymentController.handleCryptomusWebhook(req, res));


// NowPayments
router.post('/nowpayment/create', authMiddleware, (req, res) => paymentController.createNowPayments(req, res));
router.post('/nowpayment/webhook', express.json(), (req, res) => paymentController.handleNowPaymentsWebhook(req, res));

// Binance Pay
router.post('/binance/create', authMiddleware, (req, res) => paymentController.createBinance(req, res));
router.post('/binance/webhook', express.json(), (req, res) => paymentController.handleBinanceWebhook(req, res));

// Transaction History
router.get('/transactions', authMiddleware, (req, res) => paymentController.getUserTransactions(req, res));

module.exports = router;
