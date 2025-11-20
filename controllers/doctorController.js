const Doctor = require('../models/Doctor');
const Student = require('../models/Student');
const Evaluation = require('../models/Evaluation');
const Application = require('../models/Application');
const Internship = require('../models/Internship');

exports.getDashboard = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ user: req.user.id })
      .populate('service')
      .populate('establishment');

    if (!doctor) {
      return res.status(404).render('error', {
        error: 'Profil médecin non trouvé',
        user: req.user
      });
    }

    // Get students supervised by this doctor
    const supervisedStudents = await Student.find()
      .populate('user');

    // Get evaluations to complete
    const pendingEvaluations = await Evaluation.find({
      doctor: doctor._id,
      status: 'draft'
    })
    .populate('student')
    .populate('internship')
    .limit(5);

    const completedEvaluations = await Evaluation.find({
      doctor: doctor._id,
      status: 'submitted'
    })
    .populate('student')
    .populate('internship');

    res.render('doctor/dashboard', {
      doctor,
      supervisedStudents,
      pendingEvaluations,
      completedEvaluations,
      title: 'Tableau de Bord Médecin Superviseur'
    });
  } catch (error) {
    console.error('Doctor dashboard error:', error);
    res.status(500).render('error', {
      error: 'Erreur lors du chargement du tableau de bord',
      user: req.user
    });
  }
};

exports.getStudents = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ user: req.user.id });
    
    // Get applications where students are in internships supervised by this doctor
    const applications = await Application.find({
      status: 'accepted',
      internship: { 
        $in: await Internship.find({ 
          service: doctor.service,
          establishment: doctor.establishment
        }).distinct('_id')
      }
    })
    .populate('student')
    .populate('internship')
    .sort({ appliedAt: -1 });

    res.render('doctor/students', {
      students: applications.map(app => ({
        student: app.student,
        internship: app.internship,
        application: app
      })),
      title: 'Étudiants Supervisés'
    });
  } catch (error) {
    console.error('Students error:', error);
    res.status(500).render('error', {
      error: 'Erreur lors du chargement des étudiants',
      user: req.user
    });
  }
};

exports.getStudentDetails = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('user');

    if (!student) {
      return res.status(404).render('error', {
        error: 'Étudiant non trouvé',
        user: req.user
      });
    }

    // Get current internship
    const application = await Application.findOne({
      student: student._id,
      status: 'accepted'
    })
    .populate('internship');

    res.render('doctor/student-details', {
      student,
      internship: application ? application.internship : null,
      title: `Profil de ${student.firstName} ${student.lastName}`
    });
  } catch (error) {
    console.error('Student details error:', error);
    res.status(500).render('error', {
      error: 'Erreur lors du chargement du profil étudiant',
      user: req.user
    });
  }
};

exports.getEvaluations = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ user: req.user.id });
    const { status } = req.query;
    
    let filter = { doctor: doctor._id };
    if (status) filter.status = status;

    const evaluations = await Evaluation.find(filter)
      .populate('student')
      .populate('internship')
      .populate('chief')
      .sort({ submittedAt: -1 });

    res.render('doctor/evaluations', {
      evaluations,
      filters: { status },
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

exports.createEvaluation = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ user: req.user.id });
    const { applicationId } = req.params;

    const application = await Application.findById(applicationId)
      .populate('student')
      .populate('internship');

    if (!application || application.status !== 'accepted') {
      return res.status(404).render('error', {
        error: 'Candidature non trouvée ou non acceptée',
        user: req.user
      });
    }

    // Check if evaluation already exists
    let evaluation = await Evaluation.findOne({
      application: applicationId,
      doctor: doctor._id
    });

    if (!evaluation) {
      evaluation = await Evaluation.create({
        application: applicationId,
        student: application.student._id,
        internship: application.internship._id,
        doctor: doctor._id,
        chief: application.internship.chief,
        status: 'draft'
      });
    }

    res.render('doctor/evaluation-form', {
      evaluation,
      student: application.student,
      internship: application.internship,
      title: 'Évaluation de Stage'
    });
  } catch (error) {
    console.error('Create evaluation error:', error);
    res.status(500).render('error', {
      error: 'Erreur lors de la création de l\'évaluation',
      user: req.user
    });
  }
};

exports.submitEvaluation = async (req, res) => {
  try {
    const { id } = req.params;
    const { attendance, practicalSkills, professionalBehavior, doctorComments } = req.body;

    const evaluation = await Evaluation.findOne({
      _id: id,
      doctor: await Doctor.findOne({ user: req.user.id }).select('_id')
    });

    if (!evaluation) {
      return res.status(404).json({
        success: false,
        error: 'Évaluation non trouvée'
      });
    }

    evaluation.attendance = parseFloat(attendance);
    evaluation.practicalSkills = parseFloat(practicalSkills);
    evaluation.professionalBehavior = parseFloat(professionalBehavior);
    evaluation.doctorComments = doctorComments;
    evaluation.status = 'submitted';
    
    await evaluation.save();

    // TODO: Send notification to chief

    res.json({
      success: true,
      message: 'Évaluation soumise avec succès'
    });
  } catch (error) {
    console.error('Submit evaluation error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la soumission de l\'évaluation'
    });
  }
};