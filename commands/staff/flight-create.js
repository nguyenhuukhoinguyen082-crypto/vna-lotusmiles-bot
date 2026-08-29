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
    .addIntegerOption(opt => opt.setName('capacity-business').setDescription('Business seats').setRequired(true).setMinValue(0)),

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

    const departureTime = new Date(`${departureRaw.replace(' ', 'T')}:00Z`);
    if (isNaN(departureTime.getTime())) {
      return interaction.editReply({ embeds: [errorEmbed('Couldn\'t parse the departure time. Use the format `YYYY-MM-DD HH:MM` (UTC), e.g. `2026-09-05 14:30`.')] });
    }
    if (departureTime.getTime() <= Date.now()) {
      return interaction.editReply({ embeds: [errorEmbed('Departure time has to be in the future.')] });
    }

    const flight = await createFlight(interaction.guild, {
      flightNumber, origin, destination, aircraft, departureTime, distanceNm,
      capacityEconomy, capacityBusiness, createdBy: interaction.user.id,
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

    if (!flight.scheduledEventId) {
      embed.addFields({ name: '⚠️ Note', value: 'Flight saved, but the Discord Scheduled Event couldn\'t be created (check the bot has Manage Events).', inline: false });
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
