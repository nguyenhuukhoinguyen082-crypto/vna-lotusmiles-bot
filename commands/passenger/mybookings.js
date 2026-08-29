const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { listConfirmedBookings } = require('../../modules/booking/listBookings');
const { COLORS, infoEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mybookings')
    .setDescription('List your confirmed flight bookings'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const bookings = await listConfirmedBookings(interaction.user.id);
    if (bookings.length === 0) {
      return interaction.editReply({ embeds: [infoEmbed('No bookings yet', 'Book a flight with `/book`.')] });
    }

    const embed = new EmbedBuilder()
      .setColor(COLORS.brand)
      .setTitle('Your Bookings')
      .setDescription(
        bookings.map(b =>
          `**${b.flightNumber}** (${b.origin} → ${b.destination}) — ${b.fareClass === 'business' ? 'Business' : 'Economy'} — PNR \`${b.pnr}\``,
        ).join('\n'),
      );

    await interaction.editReply({ embeds: [embed] });
  },
};
