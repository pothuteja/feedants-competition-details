const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Competition = require('../models/Competition');
const Registration = require('../models/Registration');
const authenticate = require('../middleware/auth');

const getLifecycle = (competition, now = new Date()) => {
  const dates = competition.dates || {};
  if (now < dates.registerBefore) return 'registration_open';
  if (now < dates.submissionStarts) return 'submission_upcoming';
  if (now <= dates.submissionEnds) return 'submission_open';
  if (now < dates.resultDate) return 'submission_closed';
  return 'results_published';
};

const getUserId = value => typeof value === 'string' ? value.trim() : '';

const toCompetitionResponse = (competition, registration) => ({
  competition,
  lifecycle: getLifecycle(competition),
  isRegistered: Boolean(registration),
  hasSubmitted: Boolean(registration && registration.submissionUrl),
  registration: registration ? {
    registeredAt: registration.registeredAt,
    submittedAt: registration.submittedAt,
    submissionUrl: registration.submissionUrl
  } : null
});

// GET /api/competitions/current
router.get('/current', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const competition = await Competition.findOne().sort({ createdAt: -1 });

    if (!competition) {
      return res.status(404).json({ success: false, message: 'प्रतियोगिता नहीं मिली' });
    }

    const registration = await Registration.findOne({
      competitionId: competition._id,
      userId
    });

    res.json({ success: true, ...toCompetitionResponse(competition, registration) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/competitions/:id
// Fetches competition data and tells the app if the user is registered or submitted.
router.get('/:id', authenticate, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'अमान्य प्रतियोगिता' });
    }
    const userId = req.user.id;
    const competition = await Competition.findById(req.params.id);

    if (!competition) {
      return res.status(404).json({ success: false, message: 'प्रतियोगिता नहीं मिली' });
    }

    const registration = await Registration.findOne({
      competitionId: req.params.id,
      userId
    });

    res.json({ success: true, ...toCompetitionResponse(competition, registration) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/competitions/:id/register
// ATOMIC REGISTRATION: Prevents overbooking even if thousands of users click simultaneously!
router.post('/:id/register', authenticate, async (req, res) => {
  const userId = req.user.id;

  try {
    if (!userId || !mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'अमान्य उपयोगकर्ता या प्रतियोगिता' });
    }

    let updatedComp;
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const competition = await Competition.findById(req.params.id).session(session);
        if (!competition) {
          throw Object.assign(new Error('प्रतियोगिता नहीं मिली'), { status: 404 });
        }
        if (getLifecycle(competition) !== 'registration_open') {
          throw Object.assign(new Error('पंजीकरण की समय सीमा समाप्त हो गई है'), { status: 409 });
        }

        updatedComp = await Competition.findOneAndUpdate(
          {
            _id: req.params.id,
            'dates.registerBefore': { $gt: new Date() },
            $expr: { $lt: ['$bookedSpots', '$totalSpots'] }
          },
          { $inc: { bookedSpots: 1 } },
          { new: true, session }
        );

        if (!updatedComp) {
          throw Object.assign(new Error('स्थान उपलब्ध नहीं हैं या प्रतियोगिता उपलब्ध नहीं है'), { status: 409 });
        }

        await Registration.create([{ userId, competitionId: competition._id }], { session });
      });
    } catch (transactionError) {
      if (transactionError.code === 11000) {
        return res.status(409).json({ success: false, message: 'इस प्रतियोगिता के लिए पहले से पंजीकरण हो चुका है' });
      }
      if (transactionError.status) {
        return res.status(transactionError.status).json({ success: false, message: transactionError.message });
      }
      throw transactionError;
    } finally {
      await session.endSession();
    }

    res.json({
      success: true,
      message: 'पंजीकरण सफल',
      bookedSpots: updatedComp.bookedSpots,
      totalSpots: updatedComp.totalSpots
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/competitions/:id/submit
// Uploads submission link for a registered user
router.post('/:id/submit', authenticate, async (req, res) => {
  const userId = req.user.id;
  const submissionUrl = typeof req.body.submissionUrl === 'string' ? req.body.submissionUrl.trim() : '';

  try {
    if (!userId || !mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'अमान्य उपयोगकर्ता या प्रतियोगिता' });
    }
    if (!submissionUrl || submissionUrl.length > 2048) {
      return res.status(400).json({ success: false, message: 'मान्य प्रस्तुति लिंक आवश्यक है' });
    }
    try {
      const parsedUrl = new URL(submissionUrl);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error('invalid protocol');
    } catch {
      return res.status(400).json({ success: false, message: 'मान्य प्रस्तुति लिंक आवश्यक है' });
    }

    const competition = await Competition.findById(req.params.id);
    if (!competition) {
      return res.status(404).json({ success: false, message: 'प्रतियोगिता नहीं मिली' });
    }
    if (getLifecycle(competition) !== 'submission_open') {
      return res.status(409).json({ success: false, message: 'अभी प्रस्तुति जमा करने का समय नहीं है', lifecycle: getLifecycle(competition) });
    }

    const reg = await Registration.findOneAndUpdate(
      { competitionId: req.params.id, userId, submissionUrl: null },
      { submissionUrl, submittedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!reg) {
      const existing = await Registration.exists({ competitionId: req.params.id, userId });
      return res.status(existing ? 409 : 400).json({
        success: false,
        message: existing ? 'प्रस्तुति पहले ही जमा हो चुकी है' : 'उपयोगकर्ता ने इस प्रतियोगिता के लिए पंजीकरण नहीं किया है'
      });
    }

    res.json({ success: true, message: 'प्रस्तुति सफलतापूर्वक प्राप्त हुई', registration: reg });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;