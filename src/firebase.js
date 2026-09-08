const admin = require('firebase-admin');
const config = require('./config');

let db;

function initFirebase() {
  if (db) return db;

  if (!config.firebase.credentialsJson) {
    throw new Error(
      'Missing FIREBASE_CREDENTIALS_JSON in .env. ' +
      'Add your Firebase service-account JSON string to FIREBASE_CREDENTIALS_JSON and the ' +
      'database URL to FIREBASE_DATABASE_URL, then restart the bot.'
    );
  }

  if (!config.firebase.databaseUrl) {
    throw new Error(
      'Missing FIREBASE_DATABASE_URL in .env. ' +
      'Set it to your Firebase Realtime Database URL, e.g. https://your-project.firebaseio.com'
    );
  }

  let credentials;
  try {
    credentials = JSON.parse(config.firebase.credentialsJson);
  } catch (e) {
    throw new Error(
      'FIREBASE_CREDENTIALS_JSON is not valid JSON. ' +
      'It must be a single-line JSON string of your Firebase service account. Original error: ' + e.message
    );
  }

  admin.initializeApp({
    credential: admin.credential.cert(credentials),
    databaseURL: config.firebase.databaseUrl,
  });

  db = admin.database();
  return db;
}

function getDb() {
  if (!db) initFirebase();
  return db;
}

// Exam progress
async function getExamProgress(userId) {
  const snap = await getDb().ref(`exams/${userId}`).once('value');
  return snap.val();
}

async function saveExamProgress(userId, data) {
  await getDb().ref(`exams/${userId}`).set(data);
}

async function updateExamProgress(userId, updates) {
  await getDb().ref(`exams/${userId}`).update(updates);
}

async function clearExamProgress(userId) {
  await getDb().ref(`exams/${userId}`).remove();
}

// Submitted exams (for instructor queue)
async function submitExam(examId, data) {
  await getDb().ref(`submittedExams/${examId}`).set(data);
}

async function getSubmittedExam(examId) {
  const snap = await getDb().ref(`submittedExams/${examId}`).once('value');
  return snap.val();
}

async function updateSubmittedExam(examId, updates) {
  await getDb().ref(`submittedExams/${examId}`).update(updates);
}

async function removeSubmittedExam(examId) {
  await getDb().ref(`submittedExams/${examId}`).remove();
}

// Graded results
async function saveResult(userId, data) {
  await getDb().ref(`results/${userId}`).set(data);
}

async function getResult(userId) {
  const snap = await getDb().ref(`results/${userId}`).once('value');
  return snap.val();
}

// Phase 2 evaluations
async function savePhase2Eval(evalId, data) {
  await getDb().ref(`phase2Evals/${evalId}`).set(data);
}

async function getPhase2Eval(evalId) {
  const snap = await getDb().ref(`phase2Evals/${evalId}`).once('value');
  return snap.val();
}

async function updatePhase2Eval(evalId, updates) {
  await getDb().ref(`phase2Evals/${evalId}`).update(updates);
}

// Phase 2 hosting sessions
async function saveHostingSession(sessionId, data) {
  await getDb().ref(`hostingSessions/${sessionId}`).set(data);
}

async function getHostingSession(sessionId) {
  const snap = await getDb().ref(`hostingSessions/${sessionId}`).once('value');
  return snap.val();
}

async function removeHostingSession(sessionId) {
  await getDb().ref(`hostingSessions/${sessionId}`).remove();
}

// Phase 3 supervision requests
async function saveSupervisionRequest(userId, data) {
  await getDb().ref(`supervisionRequests/${userId}`).set(data);
}

async function getSupervisionRequest(userId) {
  const snap = await getDb().ref(`supervisionRequests/${userId}`).once('value');
  return snap.val();
}

// Dynamic bot configuration (persists across restarts)
async function getBotConfig(key) {
  const snap = await getDb().ref(`botConfig/${key}`).once('value');
  return snap.val();
}

async function setBotConfig(key, value) {
  await getDb().ref(`botConfig/${key}`).set(value);
}

async function getAllBotConfig() {
  const snap = await getDb().ref('botConfig').once('value');
  return snap.val() || {};
}

// Grading channel helper
async function getGradingChannelId() {
  return getBotConfig('gradingChannelId');
}

async function setGradingChannelId(channelId) {
  return setBotConfig('gradingChannelId', channelId);
}

module.exports = {
  initFirebase,
  getDb,
  getExamProgress,
  saveExamProgress,
  updateExamProgress,
  clearExamProgress,
  submitExam,
  getSubmittedExam,
  updateSubmittedExam,
  removeSubmittedExam,
  saveResult,
  getResult,
  savePhase2Eval,
  getPhase2Eval,
  updatePhase2Eval,
  saveHostingSession,
  getHostingSession,
  removeHostingSession,
  saveSupervisionRequest,
  getSupervisionRequest,
  getBotConfig,
  setBotConfig,
  getAllBotConfig,
  getGradingChannelId,
  setGradingChannelId,
};
