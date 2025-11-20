const User = require('../models/User');
const Student = require('../models/Student');
const Doctor = require('../models/Doctor');
const ServiceChief = require('../models/ServiceChief');
const Dean = require('../models/Dean');
const jwt = require('jsonwebtoken');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  
  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        mustChangePassword: user.mustChangePassword
      }
    }
  });
};

exports.login = async (req, res) => {
  try {
    const { email, password, matricule } = req.body;

    // Student login with matricule
    if (matricule) {
      const student = await Student.findOne({ matricule: matricule.toUpperCase() }).populate('user');
      
      if (!student || !student.user || !(await student.user.correctPassword(password))) {
        return res.status(401).json({
          status: 'error',
          message: 'Matricule ou mot de passe incorrect'
        });
      }
      
      if (!student.user.isActive) {
        return res.status(401).json({
          status: 'error',
          message: 'Votre compte est désactivé. Contactez l\'administration.'
        });
      }

      await student.user.updateLastLogin();
      createSendToken(student.user, 200, res);
      return;
    }

    // Other users login with email
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user || !(await user.correctPassword(password))) {
      return res.status(401).json({
        status: 'error',
        message: 'Email ou mot de passe incorrect'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        status: 'error',
        message: 'Votre compte est désactivé. Contactez l\'administration.'
      });
    }

    await user.updateLastLogin();
    createSendToken(user, 200, res);

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur de connexion. Veuillez réessayer.'
    });
  }
};

exports.logout = (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Déconnexion réussie'
  });
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);

    if (!(await user.correctPassword(currentPassword))) {
      return res.status(400).json({
        status: 'error',
        message: 'Mot de passe actuel incorrect'
      });
    }

    user.password = newPassword;
    user.mustChangePassword = false;
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Mot de passe modifié avec succès'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors du changement de mot de passe'
    });
  }
};

exports.getMe = async (req, res) => {
  try {
    let userData;
    
    switch(req.user.role) {
      case 'student':
        userData = await Student.findOne({ user: req.user.id }).populate('user');
        break;
      case 'doctor':
        userData = await Doctor.findOne({ user: req.user.id }).populate('user');
        break;
      case 'service_chief':
        userData = await ServiceChief.findOne({ user: req.user.id }).populate('user');
        break;
      case 'dean':
        userData = await Dean.findOne({ user: req.user.id }).populate('user');
        break;
      default:
        userData = await User.findById(req.user.id);
    }

    res.status(200).json({
      status: 'success',
      data: {
        user: userData
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la récupération du profil'
    });
  }
};