const { db, admin } = require('../../config/firebase');
const { tierForLifetimeMiles } = require('../lotusmiles/tiers');

/**
 * Cancels every confirmed booking on a flight (e.g. because the whole flight
 * was cancelled) and claws back the miles each one earned. Each booking is
 * cancelled in its own transaction — simpler and safer than one giant
 * transaction spanning every affected passenger's account.
 */
async function bulkCancelBookingsForFlight(flightId) {
  const snapshot = await db.collection('bookings')
    .where('flightId', '==', flightId)
    .where('status', '==', 'confirmed')
    .get();

  const cancelled = [];
  for (const doc of snapshot.docs) {
    const booking = doc.data();
    const accountRef = db.collection('lotusmilesAccounts').doc(booking.userId);

    await db.runTransaction(async (tx) => {
      const accountSnap = await tx.get(accountRef);
      if (accountSnap.exists) {
        const account = accountSnap.data();
        const newBalance = Math.max(0, account.balance - booking.milesEarned);
        const newLifetime = Math.max(0, account.lifetimeMiles - booking.milesEarned);
        tx.set(accountRef, {
          ...account,
          balance: newBalance,
          lifetimeMiles: newLifetime,
          tier: tierForLifetimeMiles(newLifetime).key,
          lastActivityAt: admin.firestore.Timestamp.now(),
        });
      }
      tx.update(doc.ref, { status: 'cancelled', cancelledAt: admin.firestore.Timestamp.now() });
    });

    cancelled.push(booking);
  }
  return cancelled;
}

module.exports = { bulkCancelBookingsForFlight };
