const { REST, Routes } = require('discord.js');
const config = require('./config');

const rest = new REST({ version: '10' }).setToken(config.token);

async function main() {
  const app = await rest.get(Routes.currentApplication());
  const appId = app.id;
  console.log(`Application ID: ${appId}`);

  // List global commands
  const global = await rest.get(Routes.applicationCommands(appId));
  console.log(`\n=== Global commands (${global.length}) ===`);
  global.forEach(c => console.log(`  - ${c.name} (id=${c.id})`));

  // List guild commands if GUILD_ID set
  const guildId = config.guildId;
  if (guildId) {
    try {
      const guildCmds = await rest.get(Routes.applicationGuildCommands(appId, guildId));
      console.log(`\n=== Guild commands in ${guildId} (${guildCmds.length}) ===`);
      guildCmds.forEach(c => console.log(`  - ${c.name} (id=${c.id})`));
    } catch (e) {
      console.log(`\nCould not fetch guild commands for ${guildId}: ${e.message}`);
    }
  } else {
    console.log('\nGUILD_ID not set in config/.env.');
  }
}

main().catch(console.error);
