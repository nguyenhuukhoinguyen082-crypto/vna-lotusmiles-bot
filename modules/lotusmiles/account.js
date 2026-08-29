const { db, admin } = require('../../config/firebase');
const { tierForLifetimeMiles } = require('./tiers');

const COLLECTION = 'lotusmilesAccounts';

function defaultAccount(userId, userTag) {
  return {
    userId,
    userTag,
    balance: 0,
    lifetimeMiles: 0,
    tier: 'classic',
    memberSince: admin.firestore.Timestamp.now(),
    lastActivityAt: admin.firestore.Timestamp.now(),
  };
}

/** Get-or-create pattern — reads the account, creating it with defaults on first read. */
async function getOrCreateAccount(userId, userTag) {
  const ref = db.collection(COLLECTION).doc(userId);
  const snap = await ref.get();
  if (snap.exists) return snap.data();

  const fresh = defaultAccount(userId, userTag);
  await ref.set(fresh);
  return fresh;
}

/**
 * Apply a miles delta (positive = award, negative = clawback/deduction) inside
 * a Firestore transaction so two near-simultaneous changes (e.g. a booking and
 * a staff adjustment landing at the same moment) can't clobber each other.
 * Balance and lifetime miles are both clamped at 0 and never go negative.
 * Returns the account state after the change, plus whether the tier changed.
 */
async function adjustMiles(userId, userTag, delta) {
  const ref = db.collection(COLLECTION).doc(userId);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists ? snap.data() : defaultAccount(userId, userTag);

    const newBalance = Math.max(0, current.balance + delta);
    const newLifetime = Math.max(0, current.lifetimeMiles + delta);
    const previousTier = current.tier;
    const newTier = tierForLifetimeMiles(newLifetime).key;

    const updated = {
      ...current,
      userTag, // keep the display tag fresh
      balance: newBalance,
      lifetimeMiles: newLifetime,
      tier: newTier,
      lastActivityAt: admin.firestore.Timestamp.now(),
    };

    tx.set(ref, updated);

    return { account: updated, tierChanged: newTier !== previousTier, previousTier };
  });
}

module.exports = { getOrCreateAccount, adjustMiles };
