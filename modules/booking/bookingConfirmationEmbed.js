const { EmbedBuilder } = require('discord.js');
const { getTier } = require('../lotusmiles/tierConfig');
const { COLORS } = require('../../utils/embeds');

/** Shared by /book and the booking-panel button flow so both stay in sync. */
async function buildBookingConfirmationEmbed({ booking, flight, milesEarned, tierChanged, newTier }) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.brand)
    .setTitle(`✈️ Booking Confirmed — ${booking.flightNumber}`)
    .addFields(
      { name: 'Route', value: `${booking.origin} → ${booking.destination}`, inline: true },
      { name: 'Fare Class', value: booking.fareClass === 'business' ? 'Business' : 'Economy', inline: true },
      { name: 'PNR', value: `\`${booking.pnr}\``, inline: true },
      { name: 'Departure', value: `<t:${flight.departureTime.seconds}:F>`, inline: false },
      { name: 'Lotusmiles Earned', value: `+${milesEarned} miles`, inline: true },
    )
    .setFooter({ text: 'Keep your PNR handy — you\'ll need it to cancel with /cancelbooking' });

  if (flight.eventLink) embed.addFields({ name: 'Event', value: flight.eventLink, inline: false });
  if (flight.details) embed.addFields({ name: 'Details', value: flight.details, inline: false });

  if (tierChanged) {
    const tier = await getTier(newTier);
    embed.addFields({ name: '🎉 Tier Upgrade', value: `You've reached **${tier.name}** status!`, inline: false });
  }

  return embed;
}

module.exports = { buildBookingConfirmationEmbed };
