const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { buildPanelMessage } = require('../../modules/booking/bookingPanel');
const { requireRole } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('booking-panel')
    .setDescription('[Staff] Post a "Book a Flight" button panel in this channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents),

  async execute(interaction) {
    if (!(await requireRole(interaction, process.env.STAFF_ROLE_ID))) return;

    await interaction.channel.send(buildPanelMessage());
    await interaction.reply({ content: 'Booking panel posted.', ephemeral: true });
  },
};
