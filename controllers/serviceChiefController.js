const ServiceChief = require('../models/ServiceChief');
const Internship = require('../models/Internship');
const Application = require('../models/Application');
const Evaluation = require('../models/Evaluation');
const Service = require('../models/Service');
const Establishment = require('../models/Establishment');

exports.getDashboard = async (req, res) => {
  try {
    const chief = await ServiceChief.findOne({ user: req.user.id })
      .populate('service')
      .populate('establishment');

    if (!chief) {
      return res.status(404).render('error', {
        error: 'Profil chef de service non trouvé',
        user: req.user
      });
    }

    const stats = {
      pendingApplications: await Application.countDocuments({
        internship: { $in: await Internship.find({ chief: chief._id }).distinct('_id') },
        status: 'pending'
      }),
      activeInternships: await Internship.countDocuments({
        chief: chief._id,
        isActive: true,
        isPublished: true
      }),
      pendingEvaluations: await Evaluation.countDocuments({
        chief: chief._id,
        status: 'submitted'
      }),
      totalStudents: await Application.countDocuments({
        internship: { $in: await Internship.find({ chief: chief._id }).distinct('_id') },
        status: 'accepted'
      })
    };

    // Urgent applications (pending for more than 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const urgentApplications = await Application.find({
      internship: { $in: await Internship.find({ chief: chief._id }).distinct('_id') },
      status: 'pending',
      appliedAt: { $lte: sevenDaysAgo }
    })
    .populate('student')
    .populate('internship')
    .limit(5);

    // Active internships
    const activeInternships = await Internship.find({
      chief: chief._id,
      isActive: true,
      isPublished: true
    })
    .populate('service')
    .populate('establishment');

    // Pending evaluations
    const pendingEvaluations = await Evaluation.find({
      chief: chief._id,
      status: 'submitted'
    })
    .populate('student')
    .populate('internship')
    .populate('doctor')
    .limit(5);

    res.render('service-chief/dashboard', {
      chief,
      stats,
      urgentApplications,
      activeInternships,
      pendingEvaluations,
      title: 'Tableau de Bord Chef de Service'
    });
  } catch (error) {
    console.error('Chief dashboard error:', error);
    res.status(500).render('error', {
      error: 'Erreur lors du chargement du tableau de bord',
      user: req.user
    });
  }
};

exports.getInternships = async (req, res) => {
  try {
    const chief = await ServiceChief.findOne({ user: req.user.id });
    const internships = await Internship.find({ chief: chief._id })
      .populate('service')
      .populate('establishment')
      .sort({ createdAt: -1 });

    res.render('service-chief/internships', {
      internships,
      title: 'Gestion des Stages'
    });
  } catch (error) {
    console.error('Internships error:', error);
    res.status(500).render('error', {
      error: 'Erreur lors du chargement des stages',
      user: req.user
    });
  }
};

exports.createInternship = async (req, res) => {
  try {
    const chief = await ServiceChief.findOne({ user: req.user.id });
    const services = await Service.find({ isActive: true });
    const establishments = await Establishment.find({ isActive: true });

    res.render('service-chief/create-internship', {
      services,
      establishments,
      chief,
      title: 'Créer un Stage'
    });
  } catch (error) {
    console.error('Create internship form error:', error);
    res.status(500).render('error', {
      error: 'Erreur lors du chargement du formulaire',
      user: req.user
    });
  }
};

exports.storeInternship = async (req, res) => {
  try {
    const chief = await ServiceChief.findOne({ user: req.user.id });
    const {
      title,
      description,
      service,
      establishment,
      duration,
      startDate,
      endDate,
      availablePlaces,
      requirements,
      skills
    } = req.body;

    const internship = await Internship.create({
      title,
      description,
      service,
      establishment,
      chief: chief._id,
      duration: parseInt(duration),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      availablePlaces: parseInt(availablePlaces),
      totalPlaces: parseInt(availablePlaces),
      requirements: requirements ? requirements.split(',').map(r => r.trim()) : [],
      skills: skills ? skills.split(',').map(s => s.trim()) : [],
      isPublished: true
    });

    // TODO: Notify students about new internship

    res.redirect('/service-chief/internships');
  } catch (error) {
    console.error('Store internship error:', error);
    res.status(500).render('error', {
      error: 'Erreur lors de la création du stage',
      user: req.user
    });
  }
};

exports.getApplications = async (req, res) => {
  try {
    const chief = await ServiceChief.findOne({ user: req.user.id });
    const { status, internship } = req.query;
    
    let filter = {
      internship: { $in: await Internship.find({ chief: chief._id }).distinct('_id') }
    };

    if (status) filter.status = status;
    if (internship) filter.internship = internship;

    const applications = await Application.find(filter)
      .populate('student')
      .populate('internship')
      .populate('processedBy')
      .sort({ appliedAt: -1 });

    const internships = await Internship.find({ chief: chief._id, isActive: true });

    const stats = {
      pending: await Application.countDocuments({ ...filter, status: 'pending' }),
      accepted: await Application.countDocuments({ ...filter, status: 'accepted' }),
      rejected: await Application.countDocuments({ ...filter, status: 'rejected' })
    };

    res.render('service-chief/applications', {
      applications,
      internships,
      stats,
      filters: { status, internship },
      title: 'Gestion des Candidatures'
    });
  } catch (error) {
    console.error('Applications error:', error);
    res.status(500).render('error', {
      error: 'Erreur lors du chargement des candidatures',
      user: req.user
    });
  }
};

exports.updateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;
    const chief = await ServiceChief.findOne({ user: req.user.id });

    const application = await Application.findOne({
      _id: id,
      internship: { $in: await Internship.find({ chief: chief._id }).distinct('_id') }
    }).populate('internship');

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Candidature non trouvée'
      });
    }

    application.status = status;
    application.processedBy = chief._id;
    
    if (status === 'rejected' && rejectionReason) {
      application.rejectionReason = rejectionReason;
    }

    await application.save();

    // TODO: Send notification to student

    // Update available places if accepted
    if (status === 'accepted') {
      await Internship.findByIdAndUpdate(application.internship._id, {
        $inc: { availablePlaces: -1 }
      });
    }

    res.json({
      success: true,
      message: 'Statut mis à jour avec succès'
    });
  } catch (error) {
    console.error('Update application status error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour'
    });
  }
};

exports.getEvaluations = async (req, res) => {
  try {
    const chief = await ServiceChief.findOne({ user: req.user.id });
    const { status } = req.query;
    
    let filter = { chief: chief._id };
    if (status) filter.status = status;

    const evaluations = await Evaluation.find(filter)
      .populate('student')
      .populate('internship')
      .populate('doctor')
      .sort({ submittedAt: -1 });

    res.render('service-chief/evaluations', {
      evaluations,
      filters: { status },
      title: 'Évaluations des Stages'
    });
  } catch (error) {
    console.error('Evaluations error:', error);
    res.status(500).render('error', {
      error: 'Erreur lors du chargement des évaluations',
      user: req.user
    });
  }
};

exports.validateEvaluation = async (req, res) => {
  try {
    const { id } = req.params;
    const { chiefComments } = req.body;
    const chief = await ServiceChief.findOne({ user: req.user.id });

    const evaluation = await Evaluation.findOne({
      _id: id,
      chief: chief._id,
      status: 'submitted'
    });

    if (!evaluation) {
      return res.status(404).json({
        success: false,
        error: 'Évaluation non trouvée'
      });
    }

    evaluation.chiefValidation = true;
    evaluation.chiefComments = chiefComments;
    evaluation.status = 'validated';
    await evaluation.save();

    // TODO: Generate certificate PDF
    // TODO: Send notification to student

    res.json({
      success: true,
      message: 'Évaluation validée avec succès'
    });
  } catch (error) {
    console.error('Validate evaluation error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la validation'
    });
  }
};