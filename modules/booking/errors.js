/** Thrown for expected, user-facing problems (flight full, already booked, etc.) —
 * command files catch this specifically and reply with `.message` instead of
 * logging it as an unexpected error. */
class BookingError extends Error {}

module.exports = { BookingError };
