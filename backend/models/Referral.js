const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
  referrerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  clicks: { type: Number, default: 0, min: 0 },
  signups: { type: Number, default: 0, min: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Referral', referralSchema);
