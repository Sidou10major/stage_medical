const { body, validationResult } = require('express-validator');

exports.handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  next();
};

exports.loginValidation = [
  body('email')
    .if(body('matricule').not().exists())
    .isEmail()
    .normalizeEmail()
    .withMessage('Email invalide'),
  body('matricule')
    .if(body('email').not().exists())
    .isLength({ min: 5 })
    .withMessage('Matricule requis'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Le mot de passe doit contenir au moins 6 caractères')
];

exports.studentProfileValidation = [
  body('firstName')
    .notEmpty()
    .trim()
    .withMessage('Le prénom est requis'),
  body('lastName')
    .notEmpty()
    .trim()
    .withMessage('Le nom est requis'),
  body('level')
    .isIn(['L1', 'L2', 'L3', 'M1', 'M2'])
    .withMessage('Niveau invalide'),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Numéro de téléphone invalide')
];

exports.internshipValidation = [
  body('title')
    .notEmpty()
    .trim()
    .withMessage('Le titre est requis'),
  body('description')
    .notEmpty()
    .trim()
    .withMessage('La description est requise'),
  body('duration')
    .isInt({ min: 1 })
    .withMessage('La durée doit être un nombre positif'),
  body('availablePlaces')
    .isInt({ min: 1 })
    .withMessage('Le nombre de places doit être un nombre positif'),
  body('startDate')
    .isDate()
    .withMessage('Date de début invalide'),
  body('endDate')
    .isDate()
    .withMessage('Date de fin invalide')
];