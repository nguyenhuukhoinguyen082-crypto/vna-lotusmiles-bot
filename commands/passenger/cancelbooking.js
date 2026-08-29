const { SlashCommandBuilder } = require('discord.js');
const { cancelBooking } = require('../../modules/booking/cancelBooking');
const { BookingError } = require('../../modules/booking/errors');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cancelbooking')
    .setDescription('Cancel one of your bookings')
    .addStringOption(opt => opt
      .setName('pnr')
      .setDescription('The PNR from your booking confirmation')
      .setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const pnr = interaction.options.getString('pnr');
    try {
      const cancelled = await cancelBooking({ userId: interaction.user.id, pnr });
      await interaction.editReply({
        embeds: [successEmbed(`Booking \`${cancelled.pnr}\` on ${cancelled.flightNumber} cancelled. The miles it earned have been removed from your Lotusmiles balance.`)],
      });
    } catch (error) {
      if (error instanceof BookingError) {
        return interaction.editReply({ embeds: [errorEmbed(error.message)] });
      }
      throw error;
    }
  },
};
