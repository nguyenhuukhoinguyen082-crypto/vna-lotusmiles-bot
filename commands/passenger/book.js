const { SlashCommandBuilder } = require('discord.js');
const { listUpcomingFlights, getScheduledFlightByNumber } = require('../../modules/booking/flights');
const { createBooking } = require('../../modules/booking/createBooking');
const { BookingError } = require('../../modules/booking/errors');
const { buildBookingConfirmationEmbed } = require('../../modules/booking/bookingConfirmationEmbed');
const { syncTierRole } = require('../../modules/lotusmiles/syncTierRole');
const { errorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('book')
    .setDescription('Book a seat on a scheduled Vietnam Airlines PTFS flight')
    .addStringOption(opt => opt
      .setName('flight')
      .setDescription('Flight number')
      .setRequired(true)
      .setAutocomplete(true))
    .addStringOption(opt => opt
      .setName('fareclass')
      .setDescription('Fare class')
      .setRequired(true)
      .addChoices(
        { name: 'Economy', value: 'economy' },
        { name: 'Business', value: 'business' },
      )),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused().toUpperCase();
    const flights = await listUpcomingFlights(25);
    const matches = flights
      .filter(f => f.flightNumber.startsWith(focused))
      .slice(0, 25)
      .map(f => ({
        name: `${f.flightNumber} — ${f.origin} → ${f.destination}`,
        value: f.flightNumber,
      }));
    await interaction.respond(matches);
  },

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const flightNumber = interaction.options.getString('flight').toUpperCase();
    const fareClass = interaction.options.getString('fareclass');

    const flight = await getScheduledFlightByNumber(flightNumber);
    if (!flight) {
      return interaction.editReply({ embeds: [errorEmbed(`No scheduled flight found for **${flightNumber}**. Use \`/flight-list\` (staff) or start typing to see options.`)] });
    }

    try {
      const result = await createBooking({
        userId: interaction.user.id,
        userTag: interaction.user.tag,
        flightId: flight.id,
        fareClass,
      });

      const embed = await buildBookingConfirmationEmbed(result);
      await interaction.editReply({ embeds: [embed] });

      if (result.tierChanged) {
        await syncTierRole(interaction.guild, interaction.user.id, result.previousTier, result.newTier);
      }
    } catch (error) {
      if (error instanceof BookingError) {
        return interaction.editReply({ embeds: [errorEmbed(error.message)] });
      }
      throw error;
    }
  },
};
