const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const competitionRoutes = require('./routes/competitions');
const authRoutes = require('./routes/auth');
const paymentRoutes = require('./routes/payments');
const communityRoutes = require('./routes/community');

const app = express();
app.use(cors());
app.use(express.json());

// Attach API routes
app.use('/api/competitions', competitionRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/community', communityRoutes);
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/feedants_competitions';

const startServer = () => {
  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
  server.on('error', error => {
    if (error.code === 'EADDRINUSE') {
      console.error(`⚠️ Port ${PORT} is already in use. Stop the other backend or set a different PORT in .env.`);
      process.exitCode = 1;
      return;
    }
    console.error('⚠️ Server error:', error.message);
    process.exitCode = 1;
  });
  return server;
};

const connectDatabase = async () => {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');
};

if (require.main === module) {
  connectDatabase()
    .then(startServer)
    .catch(err => {
      console.error('⚠️ MongoDB Connection Error:', err.message);
      console.log('📌 Starting server without MongoDB. API routes requiring the database will fail until MongoDB is available.');
      startServer();
    });
}

module.exports = { app, connectDatabase, startServer };