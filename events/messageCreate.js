const { ChannelType } = require('discord.js');
const { handleDmResponse } = require('../modules/exitSurvey/handleDmResponse');

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot) return;
    if (message.channel.type !== ChannelType.DM) return;

    try {
      await handleDmResponse(message, client);
    } catch (error) {
      console.error(`[messageCreate] Exit survey DM handling failed for ${message.author.id}:`, error);
    }
  },
};
