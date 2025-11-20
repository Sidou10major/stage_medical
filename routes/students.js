const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { protect, restrictTo } = require('../middleware/auth');
const upload = require('../middleware/upload');

// All routes are protected and restricted to students
router.use(protect);
router.use(restrictTo('student'));

// Dashboard
router.get('/dashboard', studentController.getDashboard);

// Profile
router.get('/profile', studentController.getProfile);
router.post('/profile', upload.single('document'), studentController.updateProfile);

// Internships
router.get('/internships', studentController.getInternships);
router.get('/internships/:id', studentController.getInternshipDetails);
router.post('/internships/:id/apply', studentController.applyToInternship);

// Applications
router.get('/applications', studentController.getApplications);
router.post('/applications/:id/cancel', studentController.cancelApplication);

// Evaluations
router.get('/evaluations', studentController.getEvaluations);
router.get('/evaluations/:id/certificate', studentController.downloadCertificate);

module.exports = router;