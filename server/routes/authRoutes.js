const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');

router.post('/register', (req, res) => authController.register(req, res));
router.post('/login', (req, res) => authController.login(req, res));
router.post('/google', (req, res) => authController.googleAuth(req, res));
router.post('/forgot-password', (req, res) => authController.forgotPassword(req, res));
router.post('/reset-password', (req, res) => authController.resetPassword(req, res));
router.get('/profile', authMiddleware, (req, res) => authController.getProfile(req, res));
router.post('/update-password', authMiddleware, (req, res) => authController.updatePassword(req, res));

module.exports = router;
