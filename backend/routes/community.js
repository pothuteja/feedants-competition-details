const express = require('express');
const crypto = require('crypto');
const Referral = require('../models/Referral');
const Testimonial = require('../models/Testimonial');
const User = require('../models/User');
const authenticate = require('../middleware/auth');

const router = express.Router();

router.get('/testimonials', authenticate, async (req, res) => {
  try {
    const testimonials = await Testimonial.find({ published: true })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    res.json({ success: true, testimonials });
  } catch {
    res.status(500).json({ success: false, message: 'Could not load testimonials' });
  }
});

router.post('/testimonials', authenticate, async (req, res) => {
  try {
    const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';
    const rating = Number(req.body.rating);
    if (!message || message.length > 1000 || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'A message and rating from 1 to 5 are required' });
    }

    const user = await User.findById(req.user.id).select('name');
    if (!user) return res.status(401).json({ success: false, message: 'User not found' });

    const testimonial = await Testimonial.create({
      userId: user._id,
      name: user.name,
      message,
      rating,
      published: false
    });
    res.status(201).json({ success: true, testimonial });
  } catch {
    res.status(500).json({ success: false, message: 'Could not create testimonial' });
  }
});

router.get('/referrals/me', authenticate, async (req, res) => {
  try {
    let referral = await Referral.findOne({ referrerId: req.user.id });
    if (!referral) {
      referral = await Referral.create({
        referrerId: req.user.id,
        code: crypto.randomBytes(5).toString('hex').toUpperCase()
      });
    }
    res.json({
      success: true,
      referral: {
        code: referral.code,
        link: `https://feedants.com/r/${referral.code}`,
        clicks: referral.clicks,
        signups: referral.signups
      }
    });
  } catch {
    res.status(500).json({ success: false, message: 'Could not load referral link' });
  }
});

router.post('/referrals/:code/click', async (req, res) => {
  const referral = await Referral.findOneAndUpdate(
    { code: String(req.params.code).toUpperCase() },
    { $inc: { clicks: 1 } },
    { new: true }
  );
  if (!referral) return res.status(404).json({ success: false, message: 'Referral not found' });
  res.json({ success: true });
});

module.exports = router;
