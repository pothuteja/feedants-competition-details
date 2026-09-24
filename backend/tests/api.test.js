const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

process.env.JWT_SECRET = 'test-secret';

const { app } = require('../server');
const User = require('../models/User');
const Competition = require('../models/Competition');
const Registration = require('../models/Registration');

let mongo;
let competition;
let token;

const datesFor = (overrides = {}) => ({
  registerBefore: new Date(Date.now() + 60 * 60 * 1000),
  submissionStarts: new Date(Date.now() + 2 * 60 * 60 * 1000),
  submissionEnds: new Date(Date.now() + 3 * 60 * 60 * 1000),
  resultDate: new Date(Date.now() + 4 * 60 * 60 * 1000),
  ...overrides
});

beforeAll(async () => {
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongo.getUri());
});

afterEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Competition.deleteMany({}),
    Registration.deleteMany({})
  ]);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

test('registers and logs in a user', async () => {
  const registerResponse = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Test User', email: 'test@example.com', password: 'password123' });

  expect(registerResponse.status).toBe(201);
  expect(registerResponse.body.success).toBe(true);
  expect(registerResponse.body.token).toBeTruthy();

  const loginResponse = await request(app)
    .post('/api/auth/login')
    .send({ email: 'test@example.com', password: 'password123' });

  expect(loginResponse.status).toBe(200);
  expect(loginResponse.body.token).toBeTruthy();
  token = loginResponse.body.token;
});

test('rejects duplicate registration and unauthenticated competition access', async () => {
  const payload = { name: 'Test User', email: 'duplicate@example.com', password: 'password123' };
  await request(app).post('/api/auth/register').send(payload);

  const duplicateResponse = await request(app).post('/api/auth/register').send(payload);
  expect(duplicateResponse.status).toBe(409);

  const protectedResponse = await request(app).get('/api/competitions/current');
  expect(protectedResponse.status).toBe(401);
});

test('allows one registration and one submission during open lifecycle windows', async () => {
  const authResponse = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Participant', email: 'participant@example.com', password: 'password123' });
  token = authResponse.body.token;

  competition = await Competition.create({
    title: 'Test Competition',
    prizePool: 100,
    entryFee: 10,
    totalSpots: 1,
    dates: datesFor(),
    rewards: []
  });

  const registrationResponse = await request(app)
    .post(`/api/competitions/${competition._id}/register`)
    .set('Authorization', `Bearer ${token}`);

  expect(registrationResponse.status).toBe(200);
  expect(registrationResponse.body.bookedSpots).toBe(1);

  competition.dates = datesFor({
    registerBefore: new Date(Date.now() - 2 * 60 * 60 * 1000),
    submissionStarts: new Date(Date.now() - 60 * 60 * 1000),
    submissionEnds: new Date(Date.now() + 60 * 60 * 1000),
    resultDate: new Date(Date.now() + 2 * 60 * 60 * 1000)
  });
  await competition.save();

  const submissionResponse = await request(app)
    .post(`/api/competitions/${competition._id}/submit`)
    .set('Authorization', `Bearer ${token}`)
    .send({ submissionUrl: 'https://example.com/video.mp4' });

  expect(submissionResponse.status).toBe(200);

  const duplicateSubmissionResponse = await request(app)
    .post(`/api/competitions/${competition._id}/submit`)
    .set('Authorization', `Bearer ${token}`)
    .send({ submissionUrl: 'https://example.com/another.mp4' });

  expect(duplicateSubmissionResponse.status).toBe(409);
});

test('rejects registration when competition is full', async () => {
  const authResponse = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Participant', email: 'full@example.com', password: 'password123' });
  token = authResponse.body.token;

  competition = await Competition.create({
    title: 'Full Competition',
    prizePool: 100,
    entryFee: 10,
    totalSpots: 1,
    bookedSpots: 1,
    dates: datesFor(),
    rewards: []
  });

  const response = await request(app)
    .post(`/api/competitions/${competition._id}/register`)
    .set('Authorization', `Bearer ${token}`);

  expect(response.status).toBe(409);
});
