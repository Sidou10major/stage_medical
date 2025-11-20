const Student = require('../models/Student');
const Internship = require('../models/Internship');
const Application = require('../models/Application');
const Evaluation = require('../models/Evaluation');
const Service = require('../models/Service');
const Establishment = require('../models/Establishment');

exports.getDashboard = async (req, res) => {
  try {
    const student = await Student.findOne({ user: req.user.id })
      .populate('user');
    
    if (!student) {
      return res.status(404).render('error', { 
        error: 'Profil étudiant non trouvé',
        user: req.user
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

    // Get recommended internships based on student level
    const recommendedInternships = await Internship.find({
      isActive: true,
      isPublished: true,
      startDate: { $gte: new Date() }
    })
    .populate('service')
    .populate('establishment')
    .limit(3);

    res.render('student/dashboard', {
      student,
      applications,
      stats,
      recommendedInternships,
      title: 'Tableau de Bord Étudiant'
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).render('error', { 
      error: 'Erreur lors du chargement du tableau de bord',
      user: req.user
    });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const student = await Student.findOne({ user: req.user.id })
      .populate('user');

    res.render('student/profile', {
      student,
      title: 'Mon Profil'
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).render('error', { 
      error: 'Erreur lors du chargement du profil',
      user: req.user
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, level, phone } = req.body;
    const student = await Student.findOne({ user: req.user.id });

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

    res.redirect('/student/profile');
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).render('error', { 
      error: 'Erreur lors de la mise à jour du profil',
      user: req.user
    });
  }
};

exports.getInternships = async (req, res) => {
  try {
    const { service, establishment, search } = req.query;
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
      .sort({ createdAt: -1 });

    const services = await Service.find({ isActive: true });
    const establishments = await Establishment.find({ isActive: true });

    res.render('student/internships', {
      internships,
      services,
      establishments,
      filters: { service, establishment, search },
      title: 'Stages Disponibles'
    });
  } catch (error) {
    console.error('Internships error:', error);
    res.status(500).render('error', { 
      error: 'Erreur lors du chargement des stages',
      user: req.user
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
      return res.status(404).render('error', { 
        error: 'Stage non trouvé',
        user: req.user
      });
    }

    // Check if student already applied
    const student = await Student.findOne({ user: req.user.id });
    const existingApplication = await Application.findOne({
      student: student._id,
      internship: internship._id
    });

    res.render('student/internship-details', {
      internship,
      hasApplied: !!existingApplication,
      title: internship.title
    });
  } catch (error) {
    console.error('Internship details error:', error);
    res.status(500).render('error', { 
      error: 'Erreur lors du chargement du stage',
      user: req.user
    });
  }
};

exports.applyToInternship = async (req, res) => {
  try {
    const student = await Student.findOne({ user: req.user.id });
    const { id } = req.params;

    // Check if student profile is completed
    if (!student.profileCompleted) {
      return res.status(400).json({
        success: false,
        error: 'Veuillez compléter votre profil avant de postuler'
      });
    }

    const existingApplication = await Application.findOne({
      student: student._id,
      internship: id
    });

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        error: 'Vous avez déjà postulé à ce stage'
      });
    }

    const internship = await Internship.findById(id);
    if (!internship || !internship.isActive || internship.availablePlaces <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Ce stage n\'est plus disponible'
      });
    }

    await Application.create({
      student: student._id,
      internship: id,
      status: 'pending'
    });

    // TODO: Send notification to service chief

    res.json({
      success: true,
      message: 'Candidature envoyée avec succès'
    });
  } catch (error) {
    console.error('Apply error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la candidature'
    });
  }
};

exports.getApplications = async (req, res) => {
  try {
    const student = await Student.findOne({ user: req.user.id });
    const applications = await Application.find({ student: student._id })
      .populate('internship')
      .populate('processedBy')
      .sort({ appliedAt: -1 });

    res.render('student/applications', {
      applications,
      title: 'Mes Candidatures'
    });
  } catch (error) {
    console.error('Applications error:', error);
    res.status(500).render('error', { 
      error: 'Erreur lors du chargement des candidatures',
      user: req.user
    });
  }
};

exports.cancelApplication = async (req, res) => {
  try {
    const student = await Student.findOne({ user: req.user.id });
    const { id } = req.params;

    const application = await Application.findOne({
      _id: id,
      student: student._id,
      status: 'pending'
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Candidature non trouvée ou ne peut pas être annulée'
      });
    }

    application.status = 'cancelled';
    await application.save();

    res.json({
      success: true,
      message: 'Candidature annulée avec succès'
    });
  } catch (error) {
    console.error('Cancel application error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'annulation'
    });
  }
};

exports.getEvaluations = async (req, res) => {
  try {
    const student = await Student.findOne({ user: req.user.id });
    const evaluations = await Evaluation.find({ student: student._id })
      .populate('internship')
      .populate('doctor')
      .populate('chief')
      .sort({ submittedAt: -1 });

    res.render('student/evaluations', {
      evaluations,
      title: 'Mes Évaluations'
    });
  } catch (error) {
    console.error('Evaluations error:', error);
    res.status(500).render('error', { 
      error: 'Erreur lors du chargement des évaluations',
      user: req.user
    });
  }
};

exports.downloadCertificate = async (req, res) => {
  try {
    const evaluation = await Evaluation.findById(req.params.id)
      .populate('student')
      .populate('internship');

    if (!evaluation || !evaluation.certificatePath) {
      return res.status(404).render('error', {
        error: 'Attestation non trouvée',
        user: req.user
      });
    }

    // Check if the student owns this evaluation
    const student = await Student.findOne({ user: req.user.id });
    if (evaluation.student._id.toString() !== student._id.toString()) {
      return res.status(403).render('error', {
        error: 'Accès non autorisé',
        user: req.user
      });
    }

    const filePath = path.join(__dirname, '../public', evaluation.certificatePath);
    res.download(filePath);
  } catch (error) {
    console.error('Download certificate error:', error);
    res.status(500).render('error', {
      error: 'Erreur lors du téléchargement',
      user: req.user
    });
  }
};