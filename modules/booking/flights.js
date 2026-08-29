const { db, admin } = require('../../config/firebase');

const COLLECTION = 'flights';
const TWO_HOURS_MS = 2 * 60 * 60 * 1000; // placeholder flight duration for the Scheduled Event end time

/**
 * Creates a flight doc and — best-effort — a matching Discord Scheduled Event.
 * If the Scheduled Event creation fails (e.g. bot missing "Manage Events"),
 * the flight is still saved; the event ID is just left null.
 */
async function createFlight(guild, {
  flightNumber, origin, destination, aircraft, departureTime, distanceNm,
  capacityEconomy, capacityBusiness, createdBy,
}) {
  const ref = db.collection(COLLECTION).doc();

  let scheduledEventId = null;
  try {
    const event = await guild.scheduledEvents.create({
      name: `${flightNumber} — ${origin} → ${destination}`,
      scheduledStartTime: departureTime,
      scheduledEndTime: new Date(departureTime.getTime() + TWO_HOURS_MS),
      privacyLevel: 2, // GuildOnly
      entityType: 3,   // External
      entityMetadata: { location: `${origin} → ${destination}` },
      description: `${aircraft} · ${distanceNm} nm — book with /book flight:${flightNumber}`,
    });
    scheduledEventId = event.id;
  } catch (error) {
    console.warn(`[flights] Couldn't create a Scheduled Event for ${flightNumber}:`, error.message);
  }

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
    scheduledEventId,
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

/** Cancels the flight doc and its Discord Scheduled Event (best-effort). Does NOT touch bookings — see cancelBooking/bulk cancel in the staff command. */
async function cancelFlight(guild, flightId) {
  const ref = db.collection(COLLECTION).doc(flightId);
  const snap = await ref.get();
  if (!snap.exists) return null;

  const flight = snap.data();
  if (flight.scheduledEventId) {
    try {
      const event = await guild.scheduledEvents.fetch(flight.scheduledEventId);
      await event.delete();
    } catch (error) {
      console.warn(`[flights] Couldn't delete Scheduled Event ${flight.scheduledEventId}:`, error.message);
    }
  }

  await ref.update({ status: 'cancelled' });
  return { id: flightId, ...flight, status: 'cancelled' };
}

module.exports = {
  createFlight,
  listUpcomingFlights,
  getScheduledFlightByNumber,
  getFlightById,
  cancelFlight,
};
