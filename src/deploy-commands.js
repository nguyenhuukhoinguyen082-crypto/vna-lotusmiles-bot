const { REST, Routes } = require('discord.js');
const config = require('./config');
const commands = require('./commands');

const rest = new REST({ version: '10' }).setToken(config.token);

async function deployCommands() {
  try {
    console.log('Deploying slash commands...');

    // Self-resolve the application (bot) ID via the REST API
    const app = await rest.get(Routes.currentApplication());
    const appId = app.id;
    console.log(`Application ID: ${appId}`);

    // Determine which guilds the bot is actually a member of (if any)
    const botGuilds = app.bot && app.bot.guilds ? app.bot.guilds : [];

    if (config.guildId && botGuilds.includes(config.guildId)) {
      // Guild-specific (instant) - only if the bot is actually in that guild
      await rest.put(
        Routes.applicationGuildCommands(appId, config.guildId),
        { body: commands }
      );
      console.log(`Deployed ${commands.length} commands to guild ${config.guildId}`);
    } else {
      // Global (takes up to 1 hour to propagate)
      await rest.put(
        Routes.applicationCommands(appId),
        { body: commands }
      );
      console.log(`Deployed ${commands.length} commands globally`);
    }
  } catch (error) {
    console.error('Failed to deploy commands:', error);
  }
}

deployCommands();
