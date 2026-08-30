const { db, admin } = require('../../config/firebase');
const { BookingError } = require('./errors');
const { tierForLifetimeMiles } = require('../lotusmiles/tierConfig');

/**
 * Cancels a confirmed booking by PNR (scoped to the requesting user — you
 * can't cancel someone else's booking by guessing their PNR). Frees the seat
 * on the flight and claws back the miles that booking earned, all in one
 * transaction. Returns tier-change info the caller can pass to syncTierRole().
 */
async function cancelBooking({ userId, pnr }) {
  const lookup = await db.collection('bookings')
    .where('pnr', '==', pnr.toUpperCase())
    .where('userId', '==', userId)
    .limit(1)
    .get();

  if (lookup.empty) {
    throw new BookingError(`No booking found for PNR ${pnr.toUpperCase()} under your account.`);
  }

  const bookingRef = lookup.docs[0].ref;
  const bookingData = lookup.docs[0].data();

  if (bookingData.status !== 'confirmed') {
    throw new BookingError(`That booking is already ${bookingData.status}.`);
  }

  const flightRef = db.collection('flights').doc(bookingData.flightId);
  const accountRef = db.collection('lotusmilesAccounts').doc(userId);

  return db.runTransaction(async (tx) => {
    const [flightSnap, accountSnap] = await Promise.all([tx.get(flightRef), tx.get(accountRef)]);

    if (flightSnap.exists) {
      tx.update(flightRef, {
        [`booked.${bookingData.fareClass}`]: admin.firestore.FieldValue.increment(-1),
      });
    }

    let tierChanged = false;
    let previousTier = null;
    let newTier = null;

    if (accountSnap.exists) {
      const account = accountSnap.data();
      const newBalance = Math.max(0, account.balance - bookingData.milesEarned);
      const newLifetime = Math.max(0, account.lifetimeMiles - bookingData.milesEarned);
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

    tx.update(bookingRef, { status: 'cancelled', cancelledAt: admin.firestore.Timestamp.now() });

    return { ...bookingData, status: 'cancelled', tierChanged, previousTier, newTier };
  });
}

module.exports = { cancelBooking };
