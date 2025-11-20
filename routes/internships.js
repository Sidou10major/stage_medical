const express = require('express');
const router = express.Router();
const Internship = require('../models/Internship');
const { protect, optionalAuth } = require('../middleware/auth');

// Public internships list (with optional auth for personalized features)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const internships = await Internship.find({ 
      isActive: true, 
      isPublished: true 
    })
    .populate('service')
    .populate('establishment')
    .sort({ createdAt: -1 });

    res.render('internships/public-list', {
      internships,
      user: req.user,
      title: 'Stages Disponibles'
    });
  } catch (error) {
    console.error('Public internships error:', error);
    res.status(500).render('error', {
      error: 'Erreur lors du chargement des stages',
      user: req.user
    });
  }
});

module.exports = router;