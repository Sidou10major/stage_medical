const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    unique: true
  },
  firstName: { 
    type: String, 
    required: true,
    trim: true
  },
  lastName: { 
    type: String, 
    required: true,
    trim: true
  },
  specialty: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    trim: true
  },
  licenseNumber: {
    type: String,
    unique: true
  },
  establishment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Establishment'
  },
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service'
  },
  isActive: { type: Boolean, default: true }
});

module.exports = mongoose.model('Doctor', doctorSchema);