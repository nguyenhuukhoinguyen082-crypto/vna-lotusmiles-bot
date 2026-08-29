/**
 * Lotusmiles membership tiers.
 *
 * NOTE: these names/thresholds/bonuses are a reasonable design placeholder
 * (patterned after common airline loyalty structures — higher tiers earn a
 * bonus % on top of base miles), not pulled from an official Vietnam
 * Airlines Lotusmiles rate card. Edit the numbers below freely to match
 * whatever your community's Lotusmiles handbook/page specifies.
 *
 * `threshold` is lifetime miles required to reach that tier.
 * `earnBonus` is a multiplier applied on top of the base miles earned
 * (e.g. 1.25 = +25% miles on every booking while at that tier).
 */
const TIERS = [
  { key: 'classic', name: 'Classic', threshold: 0, earnBonus: 1.0 },
  { key: 'silver', name: 'Silver', threshold: 15000, earnBonus: 1.25 },
  { key: 'gold', name: 'Gold', threshold: 50000, earnBonus: 1.5 },
  { key: 'titanium', name: 'Titanium', threshold: 100000, earnBonus: 1.75 },
];

/** Returns the highest tier whose threshold the given lifetime miles total meets. */
function tierForLifetimeMiles(lifetimeMiles) {
  let current = TIERS[0];
  for (const tier of TIERS) {
    if (lifetimeMiles >= tier.threshold) current = tier;
  }
  return current;
}

function getTier(key) {
  return TIERS.find(t => t.key === key) || TIERS[0];
}

/** Miles still needed to reach the next tier, or null if already at the top tier. */
function milesToNextTier(lifetimeMiles) {
  const current = tierForLifetimeMiles(lifetimeMiles);
  const currentIndex = TIERS.findIndex(t => t.key === current.key);
  const next = TIERS[currentIndex + 1];
  if (!next) return null;
  return { next, remaining: next.threshold - lifetimeMiles };
}

module.exports = { TIERS, tierForLifetimeMiles, getTier, milesToNextTier };
