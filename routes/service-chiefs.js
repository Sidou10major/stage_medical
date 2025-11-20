const express = require('express');
const router = express.Router();
const serviceChiefController = require('../controllers/serviceChiefController');
const { protect, restrictTo } = require('../middleware/auth');

// All routes are protected and restricted to service chiefs
router.use(protect);
router.use(restrictTo('service_chief'));

// Dashboard
router.get('/dashboard', serviceChiefController.getDashboard);

// Internships
router.get('/internships', serviceChiefController.getInternships);
router.get('/internships/create', serviceChiefController.createInternship);
router.post('/internships', serviceChiefController.storeInternship);

// Applications
router.get('/applications', serviceChiefController.getApplications);
router.post('/applications/:id/status', serviceChiefController.updateApplicationStatus);

// Evaluations
router.get('/evaluations', serviceChiefController.getEvaluations);
router.post('/evaluations/:id/validate', serviceChiefController.validateEvaluation);

module.exports = router;