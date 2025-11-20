const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  description: String,
  code: {
    type: String,
    unique: true,
    uppercase: true,
    trim: true
  },
  establishment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Establishment',
    required: true
  },
  chief: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceChief'
  },
  capacity: {
    type: Number,
    default: 5
  },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Service', serviceSchema);