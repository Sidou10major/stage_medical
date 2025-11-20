const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { loginValidation, handleValidationErrors } = require('../middleware/validation');
const { protect } = require('../middleware/auth');

// Public routes
router.get('/login', authController.showLogin);
router.post('/login', loginValidation, handleValidationErrors, authController.login);

// Protected routes
router.use(protect);
router.get('/logout', authController.logout);
router.get('/change-password', authController.showChangePassword);
router.post('/change-password', authController.changePassword);

module.exports = router;