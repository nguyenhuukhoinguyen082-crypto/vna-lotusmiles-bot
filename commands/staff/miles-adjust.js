const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { adjustMiles } = require('../../modules/lotusmiles/account');
const { getTier } = require('../../modules/lotusmiles/tierConfig');
const { syncTierRole } = require('../../modules/lotusmiles/syncTierRole');
const { requireRole } = require('../../utils/permissions');
const { successEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('miles-adjust')
    .setDescription('[Staff] Manually add or remove Lotusmiles for a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption(opt => opt.setName('user').setDescription('Member to adjust').setRequired(true))
    .addIntegerOption(opt => opt.setName('amount').setDescription('Miles to add (use a negative number to remove)').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason for the adjustment').setRequired(true)),

  async execute(interaction) {
    if (!(await requireRole(interaction, process.env.STAFF_ROLE_ID))) return;
    await interaction.deferReply({ ephemeral: true });

    const target = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    const reason = interaction.options.getString('reason');

    const { account, tierChanged, previousTier, newTier } = await adjustMiles(target.id, target.tag, amount);

    let message = `${amount >= 0 ? 'Added' : 'Removed'} ${Math.abs(amount)} miles ${amount >= 0 ? 'to' : 'from'} ${target.tag}'s Lotusmiles account (reason: ${reason}). New balance: ${account.balance.toLocaleString()}.`;
    if (tierChanged) {
      const [prev, next] = await Promise.all([getTier(previousTier), getTier(newTier)]);
      message += ` Tier changed: ${prev.name} → ${next.name}.`;
      await syncTierRole(interaction.guild, target.id, previousTier, newTier);
    }

    await interaction.editReply({ embeds: [successEmbed(message)] });
  },
};
