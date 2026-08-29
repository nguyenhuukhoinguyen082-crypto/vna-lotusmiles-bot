const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { listUpcomingFlights } = require('../../modules/booking/flights');
const { requireRole } = require('../../utils/permissions');
const { COLORS, infoEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('flight-list')
    .setDescription('[Staff] List upcoming scheduled flights'),

  async execute(interaction) {
    if (!(await requireRole(interaction, process.env.STAFF_ROLE_ID))) return;
    await interaction.deferReply({ ephemeral: true });

    const flights = await listUpcomingFlights();
    if (flights.length === 0) {
      return interaction.editReply({ embeds: [infoEmbed('No upcoming flights', 'Schedule one with `/flight-create`.')] });
    }

    const embed = new EmbedBuilder()
      .setColor(COLORS.brand)
      .setTitle('Upcoming Flights')
      .setDescription(
        flights.map(f =>
          `**${f.flightNumber}** ${f.origin} → ${f.destination} — <t:${f.departureTime.seconds}:f>\n` +
          `　Economy ${f.booked.economy}/${f.capacity.economy} · Business ${f.booked.business}/${f.capacity.business}`,
        ).join('\n\n'),
      );

    await interaction.editReply({ embeds: [embed] });
  },
};
