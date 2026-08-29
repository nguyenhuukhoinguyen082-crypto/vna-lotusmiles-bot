const { db, admin } = require('../../config/firebase');
const { BookingError } = require('./errors');
const { tierForLifetimeMiles } = require('../lotusmiles/tiers');

/**
 * Cancels a confirmed booking by PNR (scoped to the requesting user — you
 * can't cancel someone else's booking by guessing their PNR). Frees the seat
 * on the flight and claws back the miles that booking earned, all in one
 * transaction.
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

    if (accountSnap.exists) {
      const account = accountSnap.data();
      const newBalance = Math.max(0, account.balance - bookingData.milesEarned);
      const newLifetime = Math.max(0, account.lifetimeMiles - bookingData.milesEarned);
      tx.set(accountRef, {
        ...account,
        balance: newBalance,
        lifetimeMiles: newLifetime,
        tier: tierForLifetimeMiles(newLifetime).key,
        lastActivityAt: admin.firestore.Timestamp.now(),
      });
    }

    tx.update(bookingRef, { status: 'cancelled', cancelledAt: admin.firestore.Timestamp.now() });

    return { ...bookingData, status: 'cancelled' };
  });
}

module.exports = { cancelBooking };
