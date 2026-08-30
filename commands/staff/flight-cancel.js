const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { listUpcomingFlights, getScheduledFlightByNumber, cancelFlight } = require('../../modules/booking/flights');
const { bulkCancelBookingsForFlight } = require('../../modules/booking/bulkCancelBookingsForFlight');
const { syncTierRole } = require('../../modules/lotusmiles/syncTierRole');
const { requireRole } = require('../../utils/permissions');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('flight-cancel')
    .setDescription('[Staff] Cancel a scheduled flight and refund all its bookings')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
    .addStringOption(opt => opt
      .setName('flightnumber')
      .setDescription('Flight number to cancel')
      .setRequired(true)
      .setAutocomplete(true)),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused().toUpperCase();
    const flights = await listUpcomingFlights(25);
    const matches = flights
      .filter(f => f.flightNumber.startsWith(focused))
      .slice(0, 25)
      .map(f => ({ name: `${f.flightNumber} — ${f.origin} → ${f.destination}`, value: f.flightNumber }));
    await interaction.respond(matches);
  },

  async execute(interaction) {
    if (!(await requireRole(interaction, process.env.STAFF_ROLE_ID))) return;
    await interaction.deferReply({ ephemeral: true });

    const flightNumber = interaction.options.getString('flightnumber').toUpperCase();
    const flight = await getScheduledFlightByNumber(flightNumber);
    if (!flight) {
      return interaction.editReply({ embeds: [errorEmbed(`No scheduled flight found for **${flightNumber}**.`)] });
    }

    const refunded = await bulkCancelBookingsForFlight(flight.id);
    await cancelFlight(flight.id);

    for (const booking of refunded) {
      if (booking.tierChanged) {
        await syncTierRole(interaction.guild, booking.userId, booking.previousTier, booking.newTier);
      }
    }

    let message = `${flightNumber} cancelled. ${refunded.length} booking(s) refunded and their Lotusmiles miles clawed back.`;
    if (flight.eventLink) {
      message += ` Don't forget to cancel/delete the event yourself: ${flight.eventLink}`;
    }

    await interaction.editReply({ embeds: [successEmbed(message)] });
  },
};
