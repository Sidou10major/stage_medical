const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    unique: true
  },
  matricule: { 
    type: String, 
    required: true, 
    unique: true,
    uppercase: true,
    trim: true
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
  level: { 
    type: String, 
    required: true,
    enum: ['L1', 'L2', 'L3', 'M1', 'M2']
  },
  phone: {
    type: String,
    trim: true
  },
  documents: [{
    name: String,
    filePath: String,
    originalName: String,
    uploadDate: { type: Date, default: Date.now },
    fileSize: Number
  }],
  profileCompleted: { type: Boolean, default: false },
  completedAt: Date
});

studentSchema.methods.checkProfileCompletion = function() {
  const requiredFields = ['firstName', 'lastName', 'level', 'phone'];
  const hasDocuments = this.documents && this.documents.length > 0;
  
  const isCompleted = requiredFields.every(field => this[field]) && hasDocuments;
  
  if (isCompleted && !this.profileCompleted) {
    this.profileCompleted = true;
    this.completedAt = new Date();
  }
  
  return isCompleted;
};

module.exports = mongoose.model('Student', studentSchema);