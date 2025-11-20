const express = require('express');
const router = express.Router();
const deanController = require('../controllers/deanController');
const { protect, restrictTo } = require('../middleware/auth');

// All routes are protected and restricted to dean
router.use(protect);
router.use(restrictTo('dean'));

// Dashboard
router.get('/dashboard', deanController.getDashboard);

// User Management
router.get('/users', deanController.getUsers);
router.get('/users/create', deanController.createUserForm);
router.post('/users', deanController.createUser);
router.post('/users/:id/toggle-status', deanController.toggleUserStatus);
router.post('/users/:id/reset-password', deanController.resetPassword);

// Establishments Management
router.get('/establishments', deanController.getEstablishments);
router.post('/establishments', deanController.createEstablishment);

// Services Management
router.get('/services', deanController.getServices);
router.post('/services', deanController.createService);

// Statistics and Reports
router.get('/statistics', deanController.getStatistics);
router.get('/reports/export', deanController.exportReport);

module.exports = router;