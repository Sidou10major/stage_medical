const express = require('express');
const router = express.Router();
const Internship = require('../models/Internship');
const { protect, optionalAuth } = require('../middleware/auth');

// Public internships list
router.get('/', async (req, res) => {
  try {
    const { service, establishment, search, page = 1, limit = 10 } = req.query;
    let filter = { 
      isActive: true, 
      isPublished: true 
    };

    if (service) filter.service = service;
    if (establishment) filter.establishment = establishment;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const internships = await Internship.find(filter)
      .populate('service')
      .populate('establishment')
      .populate('chief')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Internship.countDocuments(filter);

    res.status(200).json({
      status: 'success',
      data: {
        internships,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Public internships error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors du chargement des stages'
    });
  }
});

// Get internship details (public)
router.get('/:id', async (req, res) => {
  try {
    const internship = await Internship.findById(req.params.id)
      .populate('service')
      .populate('establishment')
      .populate('chief');

    if (!internship) {
      return res.status(404).json({
        status: 'error',
        message: 'Stage non trouvé'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        internship
      }
    });
  } catch (error) {
    console.error('Internship details error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors du chargement du stage'
    });
  }
});

module.exports = router;