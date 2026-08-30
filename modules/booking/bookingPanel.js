const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder,
} = require('discord.js');
const { listUpcomingFlights, getScheduledFlightByNumber } = require('./flights');
const { createBooking } = require('./createBooking');
const { BookingError } = require('./errors');
const { buildBookingConfirmationEmbed } = require('./bookingConfirmationEmbed');
const { syncTierRole } = require('../lotusmiles/syncTierRole');
const { COLORS, errorEmbed, infoEmbed } = require('../../utils/embeds');

function formatDeparture(timestamp) {
  return new Date(timestamp.seconds * 1000).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  }) + ' UTC';
}

/** The permanent panel message staff post with /booking-panel — just one button. */
function buildPanelMessage() {
  const embed = new EmbedBuilder()
    .setColor(COLORS.brand)
    .setTitle('✈️ Vietnam Airlines PTFS — Flight Booking')
    .setDescription('Click the button below to book a seat on an upcoming flight.');

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('book_start').setLabel('Book a Flight').setEmoji('✈️').setStyle(ButtonStyle.Primary),
  );

  return { embeds: [embed], components: [row] };
}

/** Step 1: show a flight picker (ephemeral, only the clicker sees it). */
async function showFlightPicker(interaction) {
  const flights = await listUpcomingFlights(25);
  if (flights.length === 0) {
    return interaction.reply({
      embeds: [infoEmbed('No upcoming flights', "Check back soon — staff haven't scheduled any bookable flights yet.")],
      ephemeral: true,
    });
  }

  const menu = new StringSelectMenuBuilder()
    .setCustomId('book_selectflight')
    .setPlaceholder('Choose a flight')
    .addOptions(flights.map(f => ({
      label: `${f.flightNumber} — ${f.origin} → ${f.destination}`,
      description: `Departs ${formatDeparture(f.departureTime)}`,
      value: f.flightNumber,
    })));

  await interaction.reply({
    content: 'Pick a flight:',
    components: [new ActionRowBuilder().addComponents(menu)],
    ephemeral: true,
  });
}

/** Step 2: user picked a flight — show fare class buttons for it. */
async function handleFlightSelect(interaction) {
  const flightNumber = interaction.values[0];
  const flight = await getScheduledFlightByNumber(flightNumber);

  if (!flight) {
    return interaction.update({ content: null, embeds: [errorEmbed('That flight is no longer available.')], components: [] });
  }

  const seatsLeft = (fareClass) => flight.capacity[fareClass] - flight.booked[fareClass];

  const embed = new EmbedBuilder()
    .setColor(COLORS.brand)
    .setTitle(`${flight.flightNumber} — ${flight.origin} → ${flight.destination}`)
    .setDescription('Choose your fare class:')
    .addFields(
      { name: 'Economy', value: `${seatsLeft('economy')} seat(s) left`, inline: true },
      { name: 'Business', value: `${seatsLeft('business')} seat(s) left`, inline: true },
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`book_fare_${flightNumber}_economy`).setLabel('Economy').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`book_fare_${flightNumber}_business`).setLabel('Business').setStyle(ButtonStyle.Secondary),
  );

  await interaction.update({ content: null, embeds: [embed], components: [row] });
}

/** Step 3: user picked a fare class — actually create the booking. */
async function confirmBooking(interaction, flightNumber, fareClass) {
  const flight = await getScheduledFlightByNumber(flightNumber);
  if (!flight) {
    return interaction.update({ content: null, embeds: [errorEmbed('That flight is no longer available.')], components: [] });
  }

  try {
    const result = await createBooking({
      userId: interaction.user.id,
      userTag: interaction.user.tag,
      flightId: flight.id,
      fareClass,
    });

    const embed = await buildBookingConfirmationEmbed(result);
    await interaction.update({ content: null, embeds: [embed], components: [] });

    if (result.tierChanged) {
      await syncTierRole(interaction.guild, interaction.user.id, result.previousTier, result.newTier);
    }
  } catch (error) {
    if (error instanceof BookingError) {
      return interaction.update({ content: null, embeds: [errorEmbed(error.message)], components: [] });
    }
    throw error;
  }
}

async function handleBookingButton(interaction) {
  const parts = interaction.customId.split('_');
  if (parts[1] === 'start') return showFlightPicker(interaction);
  if (parts[1] === 'fare') return confirmBooking(interaction, parts[2], parts[3]);
}

async function handleBookingSelect(interaction) {
  if (interaction.customId === 'book_selectflight') return handleFlightSelect(interaction);
}

module.exports = { buildPanelMessage, handleBookingButton, handleBookingSelect };
