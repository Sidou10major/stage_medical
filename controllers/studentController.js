const Student = require('../models/Student');
const Internship = require('../models/Internship');
const Application = require('../models/Application');
const Evaluation = require('../models/Evaluation');

// Helper function to get student by user ID
const getStudentByUserId = async (userId) => {
  return await Student.findOne({ user: userId });
};

exports.getDashboard = async (req, res) => {
  try {
    const student = await getStudentByUserId(req.user.id);
    
    if (!student) {
      return res.status(404).json({
        status: 'error',
        message: 'Profil étudiant non trouvé'
      });
    }

    const applications = await Application.find({ student: student._id })
      .populate('internship')
      .sort({ appliedAt: -1 })
      .limit(5);

    const stats = {
      pending: await Application.countDocuments({ 
        student: student._id, 
        status: 'pending' 
      }),
      accepted: await Application.countDocuments({ 
        student: student._id, 
        status: 'accepted' 
      }),
      rejected: await Application.countDocuments({ 
        student: student._id, 
        status: 'rejected' 
      }),
      total: await Application.countDocuments({ student: student._id })
    };

    const recommendedInternships = await Internship.find({
      isActive: true,
      isPublished: true,
      startDate: { $gte: new Date() }
    })
    .populate('service')
    .populate('establishment')
    .limit(3);

    res.status(200).json({
      status: 'success',
      data: {
        student,
        applications,
        stats,
        recommendedInternships
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors du chargement du tableau de bord'
    });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const student = await getStudentByUserId(req.user.id);

    res.status(200).json({
      status: 'success',
      data: {
        student
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors du chargement du profil'
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, level, phone } = req.body;
    const student = await getStudentByUserId(req.user.id);

    student.firstName = firstName;
    student.lastName = lastName;
    student.level = level;
    student.phone = phone;

    // Handle document upload
    if (req.file) {
      student.documents.push({
        name: req.body.documentName || 'Document',
        filePath: `/uploads/${req.file.filename}`,
        originalName: req.file.originalname,
        fileSize: req.file.size
      });
    }

    // Check profile completion
    student.checkProfileCompletion();
    await student.save();

    res.status(200).json({
      status: 'success',
      data: {
        student
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la mise à jour du profil'
    });
  }
};

exports.getInternships = async (req, res) => {
  try {
    const { service, establishment, search, page = 1, limit = 10 } = req.query;
    let filter = { 
      isActive: true, 
      isPublished: true,
      startDate: { $gte: new Date() }
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
    console.error('Internships error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors du chargement des stages'
    });
  }
};

exports.getInternshipDetails = async (req, res) => {
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

    // Check if student already applied
    const student = await getStudentByUserId(req.user.id);
    const existingApplication = await Application.findOne({
      student: student._id,
      internship: internship._id
    });

    res.status(200).json({
      status: 'success',
      data: {
        internship,
        hasApplied: !!existingApplication
      }
    });
  } catch (error) {
    console.error('Internship details error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors du chargement du stage'
    });
  }
};

exports.applyToInternship = async (req, res) => {
  try {
    const student = await getStudentByUserId(req.user.id);
    const { id } = req.params;

    // Check if student profile is completed
    if (!student.profileCompleted) {
      return res.status(400).json({
        status: 'error',
        message: 'Veuillez compléter votre profil avant de postuler'
      });
    }

    const existingApplication = await Application.findOne({
      student: student._id,
      internship: id
    });

    if (existingApplication) {
      return res.status(400).json({
        status: 'error',
        message: 'Vous avez déjà postulé à ce stage'
      });
    }

    const internship = await Internship.findById(id);
    if (!internship || !internship.isActive || internship.availablePlaces <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Ce stage n\'est plus disponible'
      });
    }

    const application = await Application.create({
      student: student._id,
      internship: id,
      status: 'pending'
    });

    // TODO: Send notification to service chief

    res.status(201).json({
      status: 'success',
      data: {
        application
      }
    });
  } catch (error) {
    console.error('Apply error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la candidature'
    });
  }
};

exports.getApplications = async (req, res) => {
  try {
    const student = await getStudentByUserId(req.user.id);
    const { status, page = 1, limit = 10 } = req.query;
    
    let filter = { student: student._id };
    if (status) filter.status = status;

    const applications = await Application.find(filter)
      .populate('internship')
      .populate('processedBy')
      .sort({ appliedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Application.countDocuments(filter);

    res.status(200).json({
      status: 'success',
      data: {
        applications,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Applications error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors du chargement des candidatures'
    });
  }
};

exports.cancelApplication = async (req, res) => {
  try {
    const student = await getStudentByUserId(req.user.id);
    const { id } = req.params;

    const application = await Application.findOne({
      _id: id,
      student: student._id,
      status: 'pending'
    });

    if (!application) {
      return res.status(404).json({
        status: 'error',
        message: 'Candidature non trouvée ou ne peut pas être annulée'
      });
    }

    application.status = 'cancelled';
    await application.save();

    res.status(200).json({
      status: 'success',
      message: 'Candidature annulée avec succès'
    });
  } catch (error) {
    console.error('Cancel application error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de l\'annulation'
    });
  }
};

exports.getEvaluations = async (req, res) => {
  try {
    const student = await getStudentByUserId(req.user.id);
    const evaluations = await Evaluation.find({ student: student._id })
      .populate('internship')
      .populate('doctor')
      .populate('chief')
      .sort({ submittedAt: -1 });

    res.status(200).json({
      status: 'success',
      data: {
        evaluations
      }
    });
  } catch (error) {
    console.error('Evaluations error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors du chargement des évaluations'
    });
  }
};