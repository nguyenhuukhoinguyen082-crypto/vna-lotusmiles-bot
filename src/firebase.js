const admin = require('firebase-admin');
const config = require('./config');

let db;

function initFirebase() {
  if (db) return db;

  const credentials = JSON.parse(config.firebase.credentialsJson);
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
};
