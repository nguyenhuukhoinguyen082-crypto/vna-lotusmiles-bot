const { db, admin } = require('../../config/firebase');

const COLLECTION = 'flights';

/**
 * Creates a flight doc. Event creation is manual — staff paste in whatever
 * event link they've already set up (a Discord Scheduled Event they made
 * themselves, an external link, etc.) plus any freeform details, and both
 * get stored on the flight for reference/display. Nothing here touches the
 * Discord API.
 */
async function createFlight({
  flightNumber, origin, destination, aircraft, departureTime, distanceNm,
  capacityEconomy, capacityBusiness, eventLink, details, createdBy,
}) {
  const ref = db.collection(COLLECTION).doc();

  const flight = {
    flightNumber,
    origin,
    destination,
    aircraft,
    departureTime: admin.firestore.Timestamp.fromDate(departureTime),
    distanceNm,
    capacity: { economy: capacityEconomy, business: capacityBusiness },
    booked: { economy: 0, business: 0 },
    status: 'scheduled',
    eventLink: eventLink || null,
    details: details || null,
    createdBy,
    createdAt: admin.firestore.Timestamp.now(),
  };

  await ref.set(flight);
  return { id: ref.id, ...flight };
}

/** Upcoming, still-bookable flights, soonest first. */
async function listUpcomingFlights(limit = 25) {
  const snapshot = await db.collection(COLLECTION)
    .where('status', '==', 'scheduled')
    .where('departureTime', '>=', admin.firestore.Timestamp.now())
    .orderBy('departureTime', 'asc')
    .limit(limit)
    .get();
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Case-insensitive exact match on flight number, among upcoming scheduled flights. */
async function getScheduledFlightByNumber(flightNumber) {
  const snapshot = await db.collection(COLLECTION)
    .where('status', '==', 'scheduled')
    .where('flightNumber', '==', flightNumber.toUpperCase())
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
}

async function getFlightById(flightId) {
  const doc = await db.collection(COLLECTION).doc(flightId).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

/** Cancels the flight doc. Does NOT touch bookings — see cancelBooking/bulk cancel in the staff command. If staff created their own Discord Scheduled Event for this flight, they'll need to cancel/delete it themselves — this bot no longer manages Scheduled Events. */
async function cancelFlight(flightId) {
  const ref = db.collection(COLLECTION).doc(flightId);
  const snap = await ref.get();
  if (!snap.exists) return null;

  await ref.update({ status: 'cancelled' });
  return { id: flightId, ...snap.data(), status: 'cancelled' };
}

module.exports = {
  createFlight,
  listUpcomingFlights,
  getScheduledFlightByNumber,
  getFlightById,
  cancelFlight,
};
