const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getTiers, upsertTier } = require('../../modules/lotusmiles/tierConfig');
const { requireRole } = require('../../utils/permissions');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tier-set')
    .setDescription('[Staff] Create or update a Lotusmiles tier')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(opt => opt
      .setName('key')
      .setDescription('Tier ID — lowercase letters/numbers only, e.g. gold. Existing key = edit, new key = create.')
      .setRequired(true))
    .addStringOption(opt => opt.setName('name').setDescription('Display name shown to members, e.g. "Gold"').setRequired(false))
    .addIntegerOption(opt => opt.setName('threshold').setDescription('Lifetime miles required to reach this tier').setRequired(false).setMinValue(0))
    .addIntegerOption(opt => opt.setName('bonuspercent').setDescription('Extra % miles earned at this tier, e.g. 25 for +25%').setRequired(false).setMinValue(0).setMaxValue(1000))
    .addRoleOption(opt => opt.setName('role').setDescription('Discord role to auto-assign at this tier').setRequired(false)),

  async execute(interaction) {
    if (!(await requireRole(interaction, process.env.STAFF_ROLE_ID))) return;
    await interaction.deferReply({ ephemeral: true });

    const rawKey = interaction.options.getString('key');
    const key = rawKey.toLowerCase().trim();
    if (!/^[a-z0-9]+$/.test(key)) {
      return interaction.editReply({ embeds: [errorEmbed('Tier key must be lowercase letters/numbers only, no spaces or symbols — e.g. `gold`, `vip1`.')] });
    }

    const name = interaction.options.getString('name');
    const threshold = interaction.options.getInteger('threshold');
    const bonusPercent = interaction.options.getInteger('bonuspercent');
    const role = interaction.options.getRole('role');
    const earnBonus = bonusPercent === null ? undefined : 1 + bonusPercent / 100;

    const tiers = await getTiers();
    const isNew = !tiers.some(t => t.key === key);

    if (isNew && (name === null || threshold === null || bonusPercent === null)) {
      return interaction.editReply({
        embeds: [errorEmbed(`"${key}" doesn't exist yet — creating a new tier needs \`name\`, \`threshold\`, and \`bonuspercent\` all provided.`)],
      });
    }

    const updated = await upsertTier({
      key,
      ...(name !== null && { name }),
      ...(threshold !== null && { threshold }),
      ...(earnBonus !== undefined && { earnBonus }),
      ...(role !== null && { roleId: role.id }),
    });

    await interaction.editReply({
      embeds: [successEmbed(
        `${isNew ? 'Created' : 'Updated'} tier **${updated.name}** (\`${updated.key}\`) — ${updated.threshold.toLocaleString()} lifetime miles, ` +
        `+${Math.round((updated.earnBonus - 1) * 100)}% earn bonus${updated.roleId ? `, role <@&${updated.roleId}>` : ', no linked role'}.\n\n` +
        `Note: this doesn't retroactively re-tier existing members — their tier (and role) updates the next time their miles change (a booking, cancellation, or \`/miles-adjust\`).`,
      )],
    });
  },
};
