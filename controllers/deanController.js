const Dean = require('../models/Dean');
const User = require('../models/User');
const Student = require('../models/Student');
const Doctor = require('../models/Doctor');
const ServiceChief = require('../models/ServiceChief');
const Establishment = require('../models/Establishment');
const Service = require('../models/Service');
const Internship = require('../models/Internship');
const Application = require('../models/Application');

exports.getDashboard = async (req, res) => {
  try {
    const dean = await Dean.findOne({ user: req.user.id });

    if (!dean) {
      return res.status(404).render('error', {
        error: 'Profil doyen non trouvé',
        user: req.user
      });
    }

    // Key statistics
    const stats = {
      totalStudents: await Student.countDocuments(),
      studentsWithInternship: await Application.countDocuments({ status: 'accepted' }),
      totalDoctors: await Doctor.countDocuments(),
      totalServiceChiefs: await ServiceChief.countDocuments(),
      totalEstablishments: await Establishment.countDocuments(),
      totalServices: await Service.countDocuments(),
      activeInternships: await Internship.countDocuments({ isActive: true, isPublished: true }),
      placementRate: 0
    };

    // Calculate placement rate
    if (stats.totalStudents > 0) {
      stats.placementRate = ((stats.studentsWithInternship / stats.totalStudents) * 100).toFixed(1);
    }

    // Recent activity
    const recentStudents = await Student.find()
      .populate('user')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentEstablishments = await Establishment.find()
      .sort({ createdAt: -1 })
      .limit(5);

    // Alerts
    const studentsWithoutInternship = stats.totalStudents - stats.studentsWithInternship;
    const servicesWithoutInternships = await Service.countDocuments({
      _id: { 
        $nin: await Internship.distinct('service', { isActive: true }) 
      }
    });

    res.render('dean/dashboard', {
      dean,
      stats,
      recentStudents,
      recentEstablishments,
      alerts: {
        studentsWithoutInternship,
        servicesWithoutInternships
      },
      title: 'Tableau de Bord Administrateur'
    });
  } catch (error) {
    console.error('Dean dashboard error:', error);
    res.status(500).render('error', {
      error: 'Erreur lors du chargement du tableau de bord',
      user: req.user
    });
  }
};

// User Management
exports.getUsers = async (req, res) => {
  try {
    const { role, search } = req.query;
    let filter = {};
    
    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 });

    res.render('dean/users', {
      users,
      filters: { role, search },
      title: 'Gestion des Utilisateurs'
    });
  } catch (error) {
    console.error('Users error:', error);
    res.status(500).render('error', {
      error: 'Erreur lors du chargement des utilisateurs',
      user: req.user
    });
  }
};

exports.createUserForm = async (req, res) => {
  try {
    res.render('dean/create-user', {
      title: 'Créer un Utilisateur'
    });
  } catch (error) {
    console.error('Create user form error:', error);
    res.status(500).render('error', {
      error: 'Erreur lors du chargement du formulaire',
      user: req.user
    });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { email, password, role, firstName, lastName, matricule, level, phone, specialty, licenseNumber, service, establishment } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).render('dean/create-user', {
        error: 'Un utilisateur avec cet email existe déjà',
        formData: req.body,
        user: req.user,
        title: 'Créer un Utilisateur'
      });
    }

    // Create user
    const user = await User.create({
      email: email.toLowerCase(),
      password: password,
      role: role,
      mustChangePassword: true
    });

    // Create specific profile based on role
    switch (role) {
      case 'student':
        if (await Student.findOne({ matricule: matricule.toUpperCase() })) {
          await User.findByIdAndDelete(user._id);
          return res.status(400).render('dean/create-user', {
            error: 'Un étudiant avec ce matricule existe déjà',
            formData: req.body,
            user: req.user,
            title: 'Créer un Utilisateur'
          });
        }
        
        await Student.create({
          user: user._id,
          matricule: matricule.toUpperCase(),
          firstName,
          lastName,
          level,
          phone
        });
        break;

      case 'doctor':
        await Doctor.create({
          user: user._id,
          firstName,
          lastName,
          specialty,
          licenseNumber,
          phone,
          service,
          establishment
        });
        break;

      case 'service_chief':
        await ServiceChief.create({
          user: user._id,
          firstName,
          lastName,
          phone,
          service,
          establishment
        });
        break;

      case 'dean':
        await Dean.create({
          user: user._id,
          firstName,
          lastName,
          phone
        });
        break;
    }

    // TODO: Send email with credentials

    res.redirect('/dean/users');
  } catch (error) {
    console.error('Create user error:', error);
    
    // Clean up if user was created but profile failed
    if (req.body.email) {
      await User.findOneAndDelete({ email: req.body.email.toLowerCase() });
    }

    res.status(500).render('dean/create-user', {
      error: 'Erreur lors de la création de l\'utilisateur',
      formData: req.body,
      user: req.user,
      title: 'Créer un Utilisateur'
    });
  }
};

exports.toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé'
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      success: true,
      message: `Utilisateur ${user.isActive ? 'activé' : 'désactivé'} avec succès`,
      isActive: user.isActive
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la modification du statut'
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé'
      });
    }

    const tempPassword = Math.random().toString(36).slice(-8);
    user.password = tempPassword;
    user.mustChangePassword = true;
    await user.save();

    // TODO: Send email with temporary password

    res.json({
      success: true,
      message: 'Mot de passe réinitialisé avec succès',
      tempPassword: tempPassword // In production, this should be sent via email only
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la réinitialisation du mot de passe'
    });
  }
};

// Establishments Management
exports.getEstablishments = async (req, res) => {
  try {
    const establishments = await Establishment.find()
      .populate('services')
      .sort({ createdAt: -1 });

    res.render('dean/establishments', {
      establishments,
      title: 'Gestion des Établissements'
    });
  } catch (error) {
    console.error('Establishments error:', error);
    res.status(500).render('error', {
      error: 'Erreur lors du chargement des établissements',
      user: req.user
    });
  }
};

exports.createEstablishment = async (req, res) => {
  try {
    const { name, address, city, postalCode, phone, email, type } = req.body;

    await Establishment.create({
      name,
      address: {
        street: address,
        city,
        postalCode
      },
      phone,
      email,
      type
    });

    res.redirect('/dean/establishments');
  } catch (error) {
    console.error('Create establishment error:', error);
    res.status(500).render('dean/create-establishment', {
      error: 'Erreur lors de la création de l\'établissement',
      formData: req.body,
      user: req.user,
      title: 'Créer un Établissement'
    });
  }
};

// Services Management
exports.getServices = async (req, res) => {
  try {
    const services = await Service.find()
      .populate('establishment')
      .populate('chief')
      .sort({ createdAt: -1 });

    const establishments = await Establishment.find({ isActive: true });

    res.render('dean/services', {
      services,
      establishments,
      title: 'Gestion des Services'
    });
  } catch (error) {
    console.error('Services error:', error);
    res.status(500).render('error', {
      error: 'Erreur lors du chargement des services',
      user: req.user
    });
  }
};

exports.createService = async (req, res) => {
  try {
    const { name, description, code, establishment, capacity } = req.body;

    if (await Service.findOne({ code: code.toUpperCase() })) {
      return res.status(400).render('dean/create-service', {
        error: 'Un service avec ce code existe déjà',
        formData: req.body,
        user: req.user,
        title: 'Créer un Service'
      });
    }

    await Service.create({
      name,
      description,
      code: code.toUpperCase(),
      establishment,
      capacity: parseInt(capacity)
    });

    res.redirect('/dean/services');
  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).render('dean/create-service', {
      error: 'Erreur lors de la création du service',
      formData: req.body,
      user: req.user,
      title: 'Créer un Service'
    });
  }
};

// Statistics and Reports
exports.getStatistics = async (req, res) => {
  try {
    // Student statistics
    const studentStats = {
      byLevel: await Student.aggregate([
        { $group: { _id: '$level', count: { $sum: 1 } } }
      ]),
      withInternship: await Application.countDocuments({ status: 'accepted' }),
      withoutInternship: await Student.countDocuments() - await Application.countDocuments({ status: 'accepted' })
    };

    // Establishment statistics
    const establishmentStats = await Establishment.aggregate([
      {
        $lookup: {
          from: 'internships',
          localField: '_id',
          foreignField: 'establishment',
          as: 'internships'
        }
      },
      {
        $project: {
          name: 1,
          internshipCount: { $size: '$internships' },
          studentCount: {
            $size: {
              $filter: {
                input: '$internships',
                as: 'internship',
                cond: { $eq: ['$$internship.isActive', true] }
              }
            }
          }
        }
      }
    ]);

    // Service statistics
    const serviceStats = await Service.aggregate([
      {
        $lookup: {
          from: 'internships',
          localField: '_id',
          foreignField: 'service',
          as: 'internships'
        }
      },
      {
        $project: {
          name: 1,
          code: 1,
          internshipCount: { $size: '$internships' },
          activeInternships: {
            $size: {
              $filter: {
                input: '$internships',
                as: 'internship',
                cond: {
                  $and: [
                    { $eq: ['$$internship.isActive', true] },
                    { $eq: ['$$internship.isPublished', true] }
                  ]
                }
              }
            }
          }
        }
      }
    ]);

    // Monthly internship trends
    const monthlyTrends = await Internship.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.render('dean/statistics', {
      studentStats,
      establishmentStats,
      serviceStats,
      monthlyTrends,
      title: 'Statistiques et Rapports'
    });
  } catch (error) {
    console.error('Statistics error:', error);
    res.status(500).render('error', {
      error: 'Erreur lors du chargement des statistiques',
      user: req.user
    });
  }
};

exports.exportReport = async (req, res) => {
  try {
    // Generate PDF report (simplified version)
    const reportData = {
      generatedAt: new Date(),
      totalStudents: await Student.countDocuments(),
      totalInternships: await Internship.countDocuments(),
      placementRate: ((await Application.countDocuments({ status: 'accepted' }) / await Student.countDocuments()) * 100).toFixed(1),
      activeEstablishments: await Establishment.countDocuments({ isActive: true }),
      activeServices: await Service.countDocuments({ isActive: true })
    };

    // In a real application, you would use a PDF generation library like pdfkit
    // For now, we'll return JSON
    res.json({
      success: true,
      data: reportData,
      message: 'Rapport généré avec succès'
    });
  } catch (error) {
    console.error('Export report error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la génération du rapport'
    });
  }
};