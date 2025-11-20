const mongoose = require('mongoose');

const deanSchema = new mongoose.Schema({
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
  phone: {
    type: String,
    trim: true
  },
  title: {
    type: String,
    default: 'Doyen'
  },
  isActive: { type: Boolean, default: true }
});

module.exports = mongoose.model('Dean', deanSchema);