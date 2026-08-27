const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authMiddleware } = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');

// Protect all admin routes with auth and admin verification
router.use(authMiddleware, adminMiddleware);

router.get('/stats', (req, res) => adminController.getStats(req, res));
router.get('/users', (req, res) => adminController.getUsers(req, res));
router.post('/users/balance', (req, res) => adminController.updateUserBalance(req, res));
router.get('/orders', (req, res) => adminController.getAllOrders(req, res));
router.get('/transactions', (req, res) => adminController.getAllTransactions(req, res));
router.get('/settings', (req, res) => adminController.getSettings(req, res));
router.post('/settings', (req, res) => adminController.updateSettings(req, res));

module.exports = router;
