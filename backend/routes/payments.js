const express = require('express');
const crypto = require('crypto');
const mongoose = require('mongoose');
const Razorpay = require('razorpay');
const Competition = require('../models/Competition');
const Registration = require('../models/Registration');
const authenticate = require('../middleware/auth');

const router = express.Router();

const getLifecycle = competition => {
  const now = new Date();
  if (now < competition.dates.registerBefore) return 'registration_open';
  if (now < competition.dates.submissionStarts) return 'submission_upcoming';
  if (now <= competition.dates.submissionEnds) return 'submission_open';
  if (now < competition.dates.resultDate) return 'submission_closed';
  return 'results_published';
};

const hasRazorpayCredentials = () => (
  process.env.RAZORPAY_KEY_ID &&
  process.env.RAZORPAY_KEY_SECRET &&
  !process.env.RAZORPAY_KEY_ID.startsWith('your-') &&
  !process.env.RAZORPAY_KEY_SECRET.startsWith('your-')
);

const getRazorpay = () => new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

router.post('/orders', authenticate, async (req, res) => {
  try {
    if (!hasRazorpayCredentials()) {
      return res.status(503).json({ success: false, message: 'Payment service is not configured' });
    }
    if (!mongoose.isValidObjectId(req.body.competitionId)) {
      return res.status(400).json({ success: false, message: 'Invalid competition' });
    }

    const competition = await Competition.findById(req.body.competitionId);
    if (!competition) return res.status(404).json({ success: false, message: 'Competition not found' });
    if (getLifecycle(competition) !== 'registration_open') {
      return res.status(409).json({ success: false, message: 'Registration is closed' });
    }

    const existing = await Registration.findOne({ competitionId: competition._id, userId: req.user.id });
    if (existing) return res.status(409).json({ success: false, message: 'Already registered' });

    const order = await getRazorpay().orders.create({
      amount: Math.round(competition.entryFee * 100),
      currency: 'INR',
      receipt: `competition_${competition._id}_${req.user.id}`,
      notes: { competitionId: competition._id.toString(), userId: req.user.id }
    });

    res.status(201).json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not create payment order' });
  }
});

router.post('/verify', authenticate, async (req, res) => {
  try {
    if (!hasRazorpayCredentials()) {
      return res.status(503).json({ success: false, message: 'Payment service is not configured' });
    }

    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, competitionId } = req.body;
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !mongoose.isValidObjectId(competitionId)) {
      return res.status(400).json({ success: false, message: 'Payment details are incomplete' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      return res.status(400).json({ success: false, message: 'Payment verification failed' });
    }

    const competition = await Competition.findOneAndUpdate(
      {
        _id: competitionId,
        'dates.registerBefore': { $gt: new Date() },
        $expr: { $lt: ['$bookedSpots', '$totalSpots'] }
      },
      { $inc: { bookedSpots: 1 } },
      { new: true }
    );

    if (!competition) return res.status(409).json({ success: false, message: 'No spots left or registration is closed' });

    try {
      const registration = await Registration.create({
        userId: req.user.id,
        competitionId,
        paymentStatus: 'paid',
        paymentOrderId: razorpayOrderId,
        paymentId: razorpayPaymentId,
        paidAt: new Date()
      });
      return res.status(201).json({ success: true, registration, bookedSpots: competition.bookedSpots });
    } catch (error) {
      await Competition.updateOne({ _id: competition._id, bookedSpots: { $gt: 0 } }, { $inc: { bookedSpots: -1 } });
      if (error.code === 11000) return res.status(409).json({ success: false, message: 'Already registered' });
      throw error;
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not verify payment' });
  }
});

module.exports = router;
