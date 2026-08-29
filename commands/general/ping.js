const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check the bot is alive and see its latency'),

  async execute(interaction) {
    await interaction.reply({ content: `Pong! WebSocket latency: ${interaction.client.ws.ping}ms` });
  },
};
