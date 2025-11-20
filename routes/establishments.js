const express = require('express');
const router = express.Router();
const Establishment = require('../models/Establishment');
const { optionalAuth } = require('../middleware/auth');

// Public establishments list
router.get('/', optionalAuth, async (req, res) => {
  try {
    const establishments = await Establishment.find({ isActive: true })
      .populate('services')
      .sort({ name: 1 });

    res.json({
      success: true,
      data: establishments
    });
  } catch (error) {
    console.error('Establishments API error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du chargement des établissements'
    });
  }
});

module.exports = router;