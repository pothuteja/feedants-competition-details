const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const mongoose = require('mongoose');
const Competition = require('./models/Competition');
require('dotenv').config();

const seedData = {
  title: 'फीडएंट्स शास्त्रीय नृत्य',
  tags: ['नृत्य', 'बहु-विजेता'],
  certificateProvided: true,
  prizePool: 1500,
  entryFee: 99,
  totalSpots: 20,
  bookedSpots: 1,
  judge: {
    name: 'मंजू दुबे',
    title: 'पेशेवर कथक नृत्यांगना',
    experience: '12+ वर्षों का अनुभव',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300'
  },
  dates: {
    registerBefore: new Date(Date.now() + 30 * 60 * 1000),
    submissionStarts: new Date(Date.now() + 60 * 60 * 1000),
    submissionEnds: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    resultDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000)
  },
  previousWinners: [
    { name: 'रिया शाह', rank: 'प्रथम विजेता', thumbnail: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200' },
    { name: 'आरव मेहता', rank: 'प्रथम विजेता', thumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200' },
    { name: 'नेहा वर्मा', rank: 'द्वितीय विजेता', thumbnail: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200' },
    { name: 'ईशिता चौ...', rank: 'तृतीय विजेता', thumbnail: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200' }
  ],
  about: 'यह ऑनलाइन शास्त्रीय नृत्य प्रतियोगिता सभी आयु वर्गों के लिए खुली है। कहीं से भी भाग लें और अपनी प्रतिभा दिखाएं। पारंपरिक नृत्य के माध्यम से अपने जुनून को व्यक्त करें।',
  judgingParameters: 'ताल, भाव, लय, तकनीक और वेशभूषा प्रस्तुति।',
  rules: '1. वीडियो 1-3 मिनट का होना चाहिए।\n2. बिना संपादन वाला वीडियो आवश्यक है।\n3. सभी आयु वर्गों के लिए खुला है।',
  rewards: [
    { position: 'प्रथम विजेता', amount: 550 },
    { position: 'द्वितीय विजेता', amount: 300 },
    { position: 'तृतीय विजेता', amount: 240 },
    { position: 'चतुर्थ विजेता', amount: 200 },
    { position: 'पंचम विजेता', amount: 130 },
    { position: 'षष्ठ विजेता', amount: 80 }
  ]
};

async function seedDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { family: 4 });
    await Competition.deleteMany({});
    const created = await Competition.create(seedData);
    console.log('✅ Database Seeded Successfully!');
    console.log('📌 COMPETITION ID:', created._id.toString());
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding Error:', err);
    process.exit(1);
  }
}

seedDB();