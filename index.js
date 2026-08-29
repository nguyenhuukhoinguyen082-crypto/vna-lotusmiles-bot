require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const loadCommands = require('./utils/commandHandler');
const loadEvents = require('./utils/eventHandler');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,          // slash commands, scheduled events
    GatewayIntentBits.GuildMembers,    // required for guildMemberRemove (exit survey trigger)
    GatewayIntentBits.DirectMessages,  // required to receive the ex-member's DM reply
    GatewayIntentBits.MessageContent,  // required to read the text of that DM reply
  ],
  // DM channels aren't always cached — partials let events fire for them anyway
  partials: [Partials.Channel, Partials.Message],
});

client.commands = new Collection();

loadCommands(client);
loadEvents(client);

client.login(process.env.DISCORD_TOKEN);
