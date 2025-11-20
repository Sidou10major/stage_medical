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
  
  const cookieOptions = {
    expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  };

  res.cookie('jwt', token, cookieOptions);

  // Remove password from output
  user.password = undefined;

  return token;
};

exports.login = async (req, res) => {
  try {
    const { email, password, matricule } = req.body;

    // Student login with matricule
    if (matricule) {
      const student = await Student.findOne({ matricule: matricule.toUpperCase() }).populate('user');
      
      if (!student || !student.user || !(await student.user.correctPassword(password))) {
        return res.status(401).render('auth/login', { 
          error: 'Matricule ou mot de passe incorrect',
          layout: false
        });
      }
      
      if (!student.user.isActive) {
        return res.status(401).render('auth/login', { 
          error: 'Votre compte est désactivé. Contactez l\'administration.',
          layout: false
        });
      }

      createSendToken(student.user, 200, res);
      await student.user.updateLastLogin();
      
      return res.redirect('/student/dashboard');
    }

    // Other users login with email
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user || !(await user.correctPassword(password))) {
      return res.status(401).render('auth/login', { 
        error: 'Email ou mot de passe incorrect',
        layout: false
      });
    }

    if (!user.isActive) {
      return res.status(401).render('auth/login', { 
        error: 'Votre compte est désactivé. Contactez l\'administration.',
        layout: false
      });
    }

    createSendToken(user, 200, res);
    await user.updateLastLogin();

    // Redirect based on role
    switch(user.role) {
      case 'student':
        res.redirect('/student/dashboard');
        break;
      case 'doctor':
        res.redirect('/doctor/dashboard');
        break;
      case 'service_chief':
        res.redirect('/service-chief/dashboard');
        break;
      case 'dean':
        res.redirect('/dean/dashboard');
        break;
      default:
        res.redirect('/');
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).render('auth/login', { 
      error: 'Erreur de connexion. Veuillez réessayer.',
      layout: false
    });
  }
};

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  res.redirect('/auth/login');
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const user = await User.findById(req.user.id);

    if (!(await user.correctPassword(currentPassword))) {
      return res.status(400).render('auth/change-password', {
        error: 'Mot de passe actuel incorrect',
        user: req.user
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).render('auth/change-password', {
        error: 'Les mots de passe ne correspondent pas',
        user: req.user
      });
    }

    user.password = newPassword;
    user.mustChangePassword = false;
    await user.save();

    res.render('auth/change-password', {
      success: 'Mot de passe modifié avec succès',
      user: req.user
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).render('auth/change-password', {
      error: 'Erreur lors du changement de mot de passe',
      user: req.user
    });
  }
};

exports.showLogin = (req, res) => {
  res.render('auth/login', { layout: false });
};

exports.showChangePassword = (req, res) => {
  res.render('auth/change-password', { user: req.user });
};