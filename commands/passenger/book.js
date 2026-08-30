const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { listUpcomingFlights, getScheduledFlightByNumber } = require('../../modules/booking/flights');
const { createBooking } = require('../../modules/booking/createBooking');
const { BookingError } = require('../../modules/booking/errors');
const { getTier } = require('../../modules/lotusmiles/tiers');
const { COLORS, errorEmbed } = require('../../utils/embeds');

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
      const { booking, milesEarned, tierChanged, newTier } = await createBooking({
        userId: interaction.user.id,
        userTag: interaction.user.tag,
        flightId: flight.id,
        fareClass,
      });

      const embed = new EmbedBuilder()
        .setColor(COLORS.brand)
        .setTitle(`✈️ Booking Confirmed — ${booking.flightNumber}`)
        .addFields(
          { name: 'Route', value: `${booking.origin} → ${booking.destination}`, inline: true },
          { name: 'Fare Class', value: fareClass === 'business' ? 'Business' : 'Economy', inline: true },
          { name: 'PNR', value: `\`${booking.pnr}\``, inline: true },
          { name: 'Departure', value: `<t:${flight.departureTime.seconds}:F>`, inline: false },
          { name: 'Lotusmiles Earned', value: `+${milesEarned} miles`, inline: true },
        )
        .setFooter({ text: 'Keep your PNR handy — you\'ll need it to cancel with /cancelbooking' });

      if (flight.eventLink) {
        embed.addFields({ name: 'Event', value: flight.eventLink, inline: false });
      }
      if (flight.details) {
        embed.addFields({ name: 'Details', value: flight.details, inline: false });
      }
      if (tierChanged) {
        embed.addFields({ name: '🎉 Tier Upgrade', value: `You've reached **${getTier(newTier).name}** status!`, inline: false });
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      if (error instanceof BookingError) {
        return interaction.editReply({ embeds: [errorEmbed(error.message)] });
      }
      throw error;
    }
  },
};
