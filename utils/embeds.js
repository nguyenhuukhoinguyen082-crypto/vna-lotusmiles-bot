const { EmbedBuilder } = require('discord.js');

// Vietnam Airlines PTFS brand colors
const COLORS = {
  brand: 0x006885,   // teal — primary brand color, used for tickets/boarding passes/flight info
  gold: 0xdd9e1f,     // gold — Lotusmiles / loyalty-related embeds
  success: 0x2ecc71,
  error: 0xe74c3c,
  info: 0x3498db,
  warning: 0xf1c40f,
};

function successEmbed(description) {
  return new EmbedBuilder().setColor(COLORS.success).setDescription(`✅ ${description}`);
}

function errorEmbed(description) {
  return new EmbedBuilder().setColor(COLORS.error).setDescription(`❌ ${description}`);
}

function infoEmbed(title, description) {
  return new EmbedBuilder().setColor(COLORS.info).setTitle(title).setDescription(description);
}

module.exports = { COLORS, successEmbed, errorEmbed, infoEmbed };
