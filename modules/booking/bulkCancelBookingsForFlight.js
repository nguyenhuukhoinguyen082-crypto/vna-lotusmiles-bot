const { db, admin } = require('../../config/firebase');
const { tierForLifetimeMiles } = require('../lotusmiles/tierConfig');

/**
 * Cancels every confirmed booking on a flight (e.g. because the whole flight
 * was cancelled) and claws back the miles each one earned. Each booking is
 * cancelled in its own transaction — simpler and safer than one giant
 * transaction spanning every affected passenger's account. Returns one entry
 * per cancelled booking, each with tier-change info the caller can pass to
 * syncTierRole() for that user.
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

    const result = await db.runTransaction(async (tx) => {
      const accountSnap = await tx.get(accountRef);

      let tierChanged = false;
      let previousTier = null;
      let newTier = null;

      if (accountSnap.exists) {
        const account = accountSnap.data();
        const newBalance = Math.max(0, account.balance - booking.milesEarned);
        const newLifetime = Math.max(0, account.lifetimeMiles - booking.milesEarned);
        previousTier = account.tier;
        newTier = (await tierForLifetimeMiles(newLifetime)).key;
        tierChanged = newTier !== previousTier;

        tx.set(accountRef, {
          ...account,
          balance: newBalance,
          lifetimeMiles: newLifetime,
          tier: newTier,
          lastActivityAt: admin.firestore.Timestamp.now(),
        });
      }

      tx.update(doc.ref, { status: 'cancelled', cancelledAt: admin.firestore.Timestamp.now() });

      return { ...booking, tierChanged, previousTier, newTier };
    });

    cancelled.push(result);
  }
  return cancelled;
}

module.exports = { bulkCancelBookingsForFlight };
