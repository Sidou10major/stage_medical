const mongoose = require('mongoose');

const establishmentSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  address: {
    street: String,
    city: String,
    postalCode: String,
    country: { type: String, default: 'Algérie' }
  },
  phone: String,
  email: String,
  type: {
    type: String,
    enum: ['CHU', 'Hôpital', 'Clinique', 'Centre de santé'],
    default: 'Hôpital'
  },
  services: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service'
  }],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Establishment', establishmentSchema);