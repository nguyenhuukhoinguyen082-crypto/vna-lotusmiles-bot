/**
 * Reply-and-return-false if the member doesn't have the given role.
 * Usage in a command's execute():
 *   if (!(await requireRole(interaction, process.env.STAFF_ROLE_ID))) return;
 */
async function requireRole(interaction, roleId, message = 'You need the staff role to use this.') {
  if (!roleId || !interaction.member.roles.cache.has(roleId)) {
    await interaction.reply({ content: message, ephemeral: true });
    return false;
  }
  return true;
}

module.exports = { requireRole };
