const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { createFlight } = require('../../modules/booking/flights');
const { requireRole } = require('../../utils/permissions');
const { COLORS, errorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('flight-create')
    .setDescription('[Staff] Schedule a new bookable flight')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
    .addStringOption(opt => opt.setName('flightnumber').setDescription('e.g. VN201').setRequired(true))
    .addStringOption(opt => opt.setName('origin').setDescription('Origin IATA code, e.g. SGN').setRequired(true))
    .addStringOption(opt => opt.setName('destination').setDescription('Destination IATA code, e.g. HAN').setRequired(true))
    .addStringOption(opt => opt.setName('aircraft').setDescription('e.g. A321neo').setRequired(true))
    .addStringOption(opt => opt.setName('departure').setDescription('Departure, UTC — format YYYY-MM-DD HH:MM').setRequired(true))
    .addIntegerOption(opt => opt.setName('distance').setDescription('Distance in nautical miles').setRequired(true).setMinValue(1))
    .addIntegerOption(opt => opt.setName('capacity-economy').setDescription('Economy seats').setRequired(true).setMinValue(0))
    .addIntegerOption(opt => opt.setName('capacity-business').setDescription('Business seats').setRequired(true).setMinValue(0))
    .addStringOption(opt => opt.setName('eventlink').setDescription('Link to the event (Discord Scheduled Event, etc.) — optional').setRequired(false))
    .addStringOption(opt => opt.setName('details').setDescription('Any other details to show passengers — optional').setRequired(false)),

  async execute(interaction) {
    if (!(await requireRole(interaction, process.env.STAFF_ROLE_ID))) return;
    await interaction.deferReply({ ephemeral: true });

    const flightNumber = interaction.options.getString('flightnumber').toUpperCase();
    const origin = interaction.options.getString('origin').toUpperCase();
    const destination = interaction.options.getString('destination').toUpperCase();
    const aircraft = interaction.options.getString('aircraft');
    const departureRaw = interaction.options.getString('departure');
    const distanceNm = interaction.options.getInteger('distance');
    const capacityEconomy = interaction.options.getInteger('capacity-economy');
    const capacityBusiness = interaction.options.getInteger('capacity-business');
    const eventLink = interaction.options.getString('eventlink');
    const details = interaction.options.getString('details');

    const departureTime = new Date(`${departureRaw.replace(' ', 'T')}:00Z`);
    if (isNaN(departureTime.getTime())) {
      return interaction.editReply({ embeds: [errorEmbed('Couldn\'t parse the departure time. Use the format `YYYY-MM-DD HH:MM` (UTC), e.g. `2026-09-05 14:30`.')] });
    }
    if (departureTime.getTime() <= Date.now()) {
      return interaction.editReply({ embeds: [errorEmbed('Departure time has to be in the future.')] });
    }
    if (eventLink && !/^https?:\/\//i.test(eventLink)) {
      return interaction.editReply({ embeds: [errorEmbed('That doesn\'t look like a link — event links should start with `http://` or `https://`.')] });
    }

    const flight = await createFlight({
      flightNumber, origin, destination, aircraft, departureTime, distanceNm,
      capacityEconomy, capacityBusiness, eventLink, details, createdBy: interaction.user.id,
    });

    const embed = new EmbedBuilder()
      .setColor(COLORS.brand)
      .setTitle(`Flight Scheduled — ${flight.flightNumber}`)
      .addFields(
        { name: 'Route', value: `${origin} → ${destination}`, inline: true },
        { name: 'Aircraft', value: aircraft, inline: true },
        { name: 'Distance', value: `${distanceNm} nm`, inline: true },
        { name: 'Departure', value: `<t:${Math.floor(departureTime.getTime() / 1000)}:F>`, inline: false },
        { name: 'Capacity', value: `Economy: ${capacityEconomy} · Business: ${capacityBusiness}`, inline: false },
      );

    if (eventLink) embed.addFields({ name: 'Event Link', value: eventLink, inline: false });
    if (details) embed.addFields({ name: 'Details', value: details, inline: false });

    await interaction.editReply({ embeds: [embed] });
  },
};
