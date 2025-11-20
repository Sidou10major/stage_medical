const express = require('express');
const router = express.Router();
const Service = require('../../models/Service');

// Public services list
router.get('/', async (req, res) => {
  try {
    const services = await Service.find({ isActive: true })
      .populate('establishment')
      .sort({ name: 1 });

    res.status(200).json({
      status: 'success',
      data: {
        services
      }
    });
  } catch (error) {
    console.error('Services API error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors du chargement des services'
    });
  }
});

module.exports = router;