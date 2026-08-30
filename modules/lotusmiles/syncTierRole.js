const { getTier } = require('./tierConfig');

/**
 * Best-effort: removes the Discord role tied to the member's previous tier
 * (if one was configured) and adds the role tied to their new tier (if one
 * was configured). Never throws — a role-sync hiccup (missing permissions,
 * member left, role deleted) should never break the miles/booking flow that
 * triggered it. Call this after any operation that reports tierChanged.
 */
async function syncTierRole(guild, userId, previousTierKey, newTierKey) {
  if (!guild || !previousTierKey || !newTierKey || previousTierKey === newTierKey) return;

  try {
    const member = await guild.members.fetch(userId);
    const [previousTier, newTier] = await Promise.all([getTier(previousTierKey), getTier(newTierKey)]);

    if (previousTier?.roleId && previousTier.roleId !== newTier?.roleId) {
      await member.roles.remove(previousTier.roleId).catch(() => {});
    }
    if (newTier?.roleId) {
      await member.roles.add(newTier.roleId).catch(() => {});
    }
  } catch (error) {
    console.warn(`[lotusmiles] Couldn't sync tier role for ${userId}:`, error.message);
  }
}

module.exports = { syncTierRole };
