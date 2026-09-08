const { REST, Routes } = require('discord.js');
const config = require('./config');
const commands = require('./commands');

const rest = new REST({ version: '10' }).setToken(config.token);

async function deployCommands() {
  try {
    console.log('Deploying slash commands...');

    if (config.guildId) {
      // Guild-specific (instant)
      await rest.put(
        Routes.applicationGuildCommands('YOUR_APP_ID', config.guildId),
        { body: commands }
      );
      console.log(`Deployed ${commands.length} commands to guild ${config.guildId}`);
    } else {
      // Global (takes up to 1 hour)
      await rest.put(
        Routes.applicationCommands('YOUR_APP_ID'),
        { body: commands }
      );
      console.log(`Deployed ${commands.length} commands globally`);
    }
  } catch (error) {
    console.error('Failed to deploy commands:', error);
  }
}

deployCommands();
