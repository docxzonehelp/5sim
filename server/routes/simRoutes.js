const express = require('express');
const router = express.Router();
const simController = require('../controllers/simController');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/auth');

// Public endpoints (with profit markup applied)
router.get('/countries', (req, res) => simController.getCountries(req, res));
router.get('/products', (req, res) => simController.getProducts(req, res));
router.get('/prices', (req, res) => simController.getPrices(req, res));

// Authenticated user actions
router.post('/buy', authMiddleware, (req, res) => simController.buy(req, res));
router.get('/order/:id', authMiddleware, (req, res) => simController.checkOrder(req, res));
router.get('/orders/active', authMiddleware, (req, res) => simController.getActiveOrders(req, res));
router.get('/orders/history', authMiddleware, (req, res) => simController.getOrderHistory(req, res));
router.post('/order/:id/cancel', authMiddleware, (req, res) => simController.cancelOrder(req, res));
router.post('/order/:id/finish', authMiddleware, (req, res) => simController.finishOrder(req, res));
router.post('/order/:id/ban', authMiddleware, (req, res) => simController.banOrder(req, res));

module.exports = router;
