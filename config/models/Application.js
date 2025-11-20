const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
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
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'cancelled'],
    default: 'pending'
  },
  appliedAt: {
    type: Date,
    default: Date.now
  },
  processedAt: Date,
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceChief'
  },
  rejectionReason: String,
  notes: String
});

applicationSchema.index({ student: 1, internship: 1 }, { unique: true });

applicationSchema.pre('save', function(next) {
  if (this.status !== 'pending' && !this.processedAt) {
    this.processedAt = new Date();
  }
  next();
});

module.exports = mongoose.model('Application', applicationSchema);