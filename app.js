const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cookieParser = require('cookie-parser');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/students');
const doctorRoutes = require('./routes/doctors');
const serviceChiefRoutes = require('./routes/service-chiefs');
const deanRoutes = require('./routes/dean');
const internshipRoutes = require('./routes/internships');
const applicationRoutes = require('./routes/applications');
const evaluationRoutes = require('./routes/evaluations');
const establishmentRoutes = require('./routes/establishments');

// Import database connection
const connectDB = require('./config/database');

// Initialize Express app
const app = express();

// Connect to database
connectDB();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('public'));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Global variables middleware
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  res.locals.currentPath = req.path;
  next();
});

// Routes
app.use('/auth', authRoutes);
app.use('/student', studentRoutes);
app.use('/doctor', doctorRoutes);
app.use('/service-chief', serviceChiefRoutes);
app.use('/dean', deanRoutes);
app.use('/internships', internshipRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/evaluations', evaluationRoutes);
app.use('/api/establishments', establishmentRoutes);

// Home route
app.get('/', (req, res) => {
  if (req.cookies.jwt && req.cookies.jwt !== 'loggedout') {
    // User is logged in, redirect to appropriate dashboard
    return res.redirect('/auth/login');
  }
  res.redirect('/auth/login');
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).render('error', {
    error: 'Page non trouvée',
    user: req.user || null,
    title: 'Page Non Trouvée'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err.stack);
  
  res.status(500).render('error', {
    error: process.env.NODE_ENV === 'development' ? err.message : 'Une erreur est survenue',
    user: req.user || null,
    title: 'Erreur'
  });
});

// Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
  console.log(`Environnement: ${process.env.NODE_ENV}`);
  console.log(`URL: http://localhost:${PORT}`);
});

module.exports = app;