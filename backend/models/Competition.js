const mongoose = require('mongoose');

const competitionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  tags: [{ type: String }],
  certificateProvided: { type: Boolean, default: true },
  prizePool: { type: Number, required: true, min: 0 },
  entryFee: { type: Number, required: true, min: 0 },
  totalSpots: { type: Number, required: true, min: 1 },
  bookedSpots: { type: Number, default: 0, min: 0 },
  judge: {
    name: String,
    title: String,
    experience: String,
    image: String,
    introVideoUrl: String
  },
  dates: {
    registerBefore: { type: Date, required: true },
    submissionStarts: { type: Date, required: true },
    submissionEnds: { type: Date, required: true },
    resultDate: { type: Date, required: true }
  },
  previousWinners: [{
    name: String,
    rank: String,
    thumbnail: String,
    videoUrl: String
  }],
  about: String,
  judgingParameters: String,
  rules: String,
  rewards: [{
    position: String,
    amount: Number
  }],
  referralCode: String,
  referralRewardAmount: Number
}, { timestamps: true });

competitionSchema.index({ createdAt: -1 });

competitionSchema.pre('validate', function validateDates(next) {
  const { registerBefore, submissionStarts, submissionEnds, resultDate } = this.dates || {};
  if (registerBefore && submissionStarts && registerBefore > submissionStarts) {
    return next(new Error('Registration must close before submissions start'));
  }
  if (submissionStarts && submissionEnds && submissionStarts >= submissionEnds) {
    return next(new Error('Submission end must be after submission start'));
  }
  if (submissionEnds && resultDate && submissionEnds > resultDate) {
    return next(new Error('Result date must be after submissions end'));
  }
  if (this.bookedSpots > this.totalSpots) {
    return next(new Error('Booked spots cannot exceed total spots'));
  }
  next();
});

module.exports = mongoose.model('Competition', competitionSchema);