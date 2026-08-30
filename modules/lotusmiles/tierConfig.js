const { db } = require('../../config/firebase');

const CONFIG_REF = db.collection('config').doc('lotusmiles');

// Seeded the first time /tier-list or any miles operation runs and no config
// document exists yet. Same placeholder values as before — edit freely with
// /tier-set once the bot is live.
const DEFAULT_TIERS = [
  { key: 'classic', name: 'Classic', threshold: 0, earnBonus: 1.0, roleId: null },
  { key: 'silver', name: 'Silver', threshold: 15000, earnBonus: 1.25, roleId: null },
  { key: 'gold', name: 'Gold', threshold: 50000, earnBonus: 1.5, roleId: null },
  { key: 'titanium', name: 'Titanium', threshold: 100000, earnBonus: 1.75, roleId: null },
];

// In-memory cache — tier config changes rarely (a staff command), so it's
// cheap to cache and invalidate on write rather than re-fetch on every miles
// calculation. Reset automatically on bot restart.
let cache = null;

async function getTiers() {
  if (cache) return cache;

  const snap = await CONFIG_REF.get();
  if (!snap.exists) {
    await CONFIG_REF.set({ tiers: DEFAULT_TIERS });
    cache = DEFAULT_TIERS;
    return cache;
  }

  const tiers = snap.data().tiers?.length ? snap.data().tiers : DEFAULT_TIERS;
  cache = [...tiers].sort((a, b) => a.threshold - b.threshold);
  return cache;
}

function invalidateCache() {
  cache = null;
}

/** Highest tier whose threshold the given lifetime miles total meets. */
async function tierForLifetimeMiles(lifetimeMiles) {
  const tiers = await getTiers();
  let current = tiers[0];
  for (const tier of tiers) {
    if (lifetimeMiles >= tier.threshold) current = tier;
  }
  return current;
}

async function getTier(key) {
  const tiers = await getTiers();
  return tiers.find(t => t.key === key) || tiers[0];
}

/** Miles still needed to reach the next tier, or null if already at the top tier. */
async function milesToNextTier(lifetimeMiles) {
  const tiers = await getTiers();
  const current = await tierForLifetimeMiles(lifetimeMiles);
  const idx = tiers.findIndex(t => t.key === current.key);
  const next = tiers[idx + 1];
  if (!next) return null;
  return { next, remaining: next.threshold - lifetimeMiles };
}

/**
 * Creates a new tier or updates fields on an existing one (only the fields
 * passed are changed). Re-sorts by threshold after saving so tier ordering
 * always matches the numbers, regardless of what order staff edited them in.
 */
async function upsertTier({ key, name, threshold, earnBonus, roleId }) {
  const tiers = await getTiers();
  const idx = tiers.findIndex(t => t.key === key);

  const updated = idx === -1
    ? { key, name, threshold, earnBonus, roleId: roleId ?? null }
    : {
      ...tiers[idx],
      ...(name !== undefined && { name }),
      ...(threshold !== undefined && { threshold }),
      ...(earnBonus !== undefined && { earnBonus }),
      ...(roleId !== undefined && { roleId }),
    };

  const next = idx === -1 ? [...tiers, updated] : tiers.map(t => (t.key === key ? updated : t));
  next.sort((a, b) => a.threshold - b.threshold);

  await CONFIG_REF.set({ tiers: next });
  invalidateCache();
  return updated;
}

module.exports = { getTiers, tierForLifetimeMiles, getTier, milesToNextTier, upsertTier };
