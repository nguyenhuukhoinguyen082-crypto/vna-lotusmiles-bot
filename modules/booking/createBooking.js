const { db, admin } = require('../../config/firebase');
const { generatePnr } = require('./pnr');
const { BookingError } = require('./errors');
const { calculateEarnedMiles } = require('../lotusmiles/calculateEarnedMiles');
const { getTier, tierForLifetimeMiles } = require('../lotusmiles/tiers');

/**
 * Books a seat on a flight for a user. Runs as a single Firestore transaction
 * so a capacity check-then-increment can't race with a simultaneous booking,
 * and so the flight update, booking record, and Lotusmiles credit either all
 * happen together or not at all.
 */
async function createBooking({ userId, userTag, flightId, fareClass }) {
  const flightRef = db.collection('flights').doc(flightId);
  const bookingRef = db.collection('bookings').doc(`${flightId}_${userId}`);
  const accountRef = db.collection('lotusmilesAccounts').doc(userId);

  return db.runTransaction(async (tx) => {
    const [flightSnap, bookingSnap, accountSnap] = await Promise.all([
      tx.get(flightRef),
      tx.get(bookingRef),
      tx.get(accountRef),
    ]);

    if (!flightSnap.exists) {
      throw new BookingError('That flight no longer exists.');
    }
    const flight = flightSnap.data();

    if (flight.status !== 'scheduled') {
      throw new BookingError('That flight is no longer open for booking.');
    }
    if (bookingSnap.exists && bookingSnap.data().status === 'confirmed') {
      throw new BookingError(`You already have a confirmed booking on ${flight.flightNumber} (PNR ${bookingSnap.data().pnr}).`);
    }

    const capacity = flight.capacity[fareClass];
    const booked = flight.booked[fareClass];
    if (capacity === undefined) {
      throw new BookingError(`"${fareClass}" isn't a valid fare class on this flight.`);
    }
    if (booked >= capacity) {
      throw new BookingError(`${fareClass} is fully booked on ${flight.flightNumber}.`);
    }

    const account = accountSnap.exists
      ? accountSnap.data()
      : { userId, userTag, balance: 0, lifetimeMiles: 0, tier: 'classic', memberSince: admin.firestore.Timestamp.now() };

    const tierBonus = getTier(account.tier).earnBonus;
    const milesEarned = calculateEarnedMiles(flight.distanceNm, fareClass, tierBonus);
    const newLifetime = account.lifetimeMiles + milesEarned;
    const newTier = tierForLifetimeMiles(newLifetime).key;

    const pnr = generatePnr();
    const bookedAt = admin.firestore.Timestamp.now();

    const booking = {
      userId,
      userTag,
      flightId,
      flightNumber: flight.flightNumber,
      origin: flight.origin,
      destination: flight.destination,
      fareClass,
      pnr,
      status: 'confirmed',
      milesEarned,
      bookedAt,
      cancelledAt: null,
    };

    tx.update(flightRef, { [`booked.${fareClass}`]: admin.firestore.FieldValue.increment(1) });
    tx.set(bookingRef, booking);
    tx.set(accountRef, {
      ...account,
      userTag,
      balance: account.balance + milesEarned,
      lifetimeMiles: newLifetime,
      tier: newTier,
      lastActivityAt: bookedAt,
    });

    return {
      booking,
      milesEarned,
      tierChanged: newTier !== account.tier,
      previousTier: account.tier,
      newTier,
    };
  });
}

module.exports = { createBooking };
