const { db } = require('../../config/firebase');

async function listConfirmedBookings(userId) {
  const snapshot = await db.collection('bookings')
    .where('userId', '==', userId)
    .where('status', '==', 'confirmed')
    .orderBy('bookedAt', 'desc')
    .get();
  return snapshot.docs.map(d => d.data());
}

module.exports = { listConfirmedBookings };
