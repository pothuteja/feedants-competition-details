const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
  userId: { type: String, required: true, trim: true, minlength: 1, maxlength: 128 },
  competitionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Competition', required: true },
  registeredAt: { type: Date, default: Date.now },
  submissionUrl: { type: String, default: null, trim: true, maxlength: 2048 },
  submittedAt: { type: Date, default: null },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
  paymentOrderId: { type: String, default: null },
  paymentId: { type: String, default: null },
  paidAt: { type: Date, default: null }
}, { timestamps: true });

// Prevent a user from registering twice for the exact same competition
registrationSchema.index({ userId: 1, competitionId: 1 }, { unique: true });

module.exports = mongoose.model('Registration', registrationSchema);