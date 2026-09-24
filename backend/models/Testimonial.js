const mongoose = require('mongoose');

const testimonialSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  message: { type: String, required: true, trim: true, maxlength: 1000 },
  rating: { type: Number, required: true, min: 1, max: 5 },
  published: { type: Boolean, default: false }
}, { timestamps: true });

testimonialSchema.index({ published: 1, createdAt: -1 });

module.exports = mongoose.model('Testimonial', testimonialSchema);
