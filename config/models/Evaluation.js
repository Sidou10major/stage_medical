const mongoose = require('mongoose');

const evaluationSchema = new mongoose.Schema({
  application: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  internship: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Internship',
    required: true
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
  chief: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceChief',
    required: true
  },
  // Notes from doctor
  attendance: {
    type: Number,
    min: 0,
    max: 20
  },
  practicalSkills: {
    type: Number,
    min: 0,
    max: 20
  },
  professionalBehavior: {
    type: Number,
    min: 0,
    max: 20
  },
  doctorComments: String,
  // Validation from chief
  chiefValidation: {
    type: Boolean,
    default: false
  },
  chiefComments: String,
  chiefValidatedAt: Date,
  // Final score
  finalScore: Number,
  status: {
    type: String,
    enum: ['draft', 'submitted', 'validated', 'rejected'],
    default: 'draft'
  },
  submittedAt: Date,
  certificateGenerated: {
    type: Boolean,
    default: false
  },
  certificatePath: String
});

evaluationSchema.pre('save', function(next) {
  if (this.attendance && this.practicalSkills && this.professionalBehavior) {
    this.finalScore = (this.attendance + this.practicalSkills + this.professionalBehavior) / 3;
  }
  
  if (this.status === 'submitted' && !this.submittedAt) {
    this.submittedAt = new Date();
  }
  
  if (this.chiefValidation && !this.chiefValidatedAt) {
    this.chiefValidatedAt = new Date();
    this.status = 'validated';
  }
  next();
});

module.exports = mongoose.model('Evaluation', evaluationSchema);