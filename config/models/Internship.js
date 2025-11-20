const mongoose = require('mongoose');

const internshipSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true,
    trim: true
  },
  description: { 
    type: String, 
    required: true 
  },
  service: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Service', 
    required: true 
  },
  establishment: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Establishment', 
    required: true 
  },
  chief: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'ServiceChief', 
    required: true 
  },
  duration: {
    type: Number,
    required: true,
    min: 1
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  availablePlaces: {
    type: Number,
    required: true,
    min: 1
  },
  totalPlaces: {
    type: Number,
    required: true,
    min: 1
  },
  requirements: [String],
  skills: [String],
  isActive: { 
    type: Boolean, 
    default: true 
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  publishedAt: Date
});

internshipSchema.pre('save', function(next) {
  if (this.isPublished && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

module.exports = mongoose.model('Internship', internshipSchema);