// Business class earns more base miles per nautical mile flown than economy —
// a common industry pattern. Adjust freely.
const FARE_CLASS_MULTIPLIER = {
  economy: 1,
  business: 1.5,
};

/**
 * distanceNm: flight distance in nautical miles (set by staff on /flight-create)
 * fareClass: "economy" | "business"
 * tierEarnBonus: the booking user's current Lotusmiles tier bonus multiplier
 *                (e.g. 1.25 for Silver) — read from tiers.js via their account
 */
function calculateEarnedMiles(distanceNm, fareClass, tierEarnBonus) {
  const fareMultiplier = FARE_CLASS_MULTIPLIER[fareClass] ?? 1;
  return Math.round(distanceNm * fareMultiplier * tierEarnBonus);
}

module.exports = { calculateEarnedMiles, FARE_CLASS_MULTIPLIER };
