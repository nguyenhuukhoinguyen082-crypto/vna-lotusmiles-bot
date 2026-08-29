require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

function walk(dir) {
  let files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files = files.concat(walk(full));
    else if (entry.name.endsWith('.js')) files.push(full);
  }
  return files;
}

const commands = [];
const commandsDir = path.join(__dirname, 'commands');

for (const file of walk(commandsDir)) {
  const command = require(file);
  if (command?.data) {
    commands.push(command.data.toJSON());
  } else {
    console.warn(`[deploy-commands] Skipping ${file} — no "data" export found.`);
  }
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`Deploying ${commands.length} command(s)...`);

    // Guild-scoped: instant, only visible in DISCORD_GUILD_ID. Use while developing.
    const data = await rest.put(
      Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID),
      { body: commands },
    );

    // Global: swap to this once commands are stable. Takes up to ~1hr to propagate everywhere.
    // const data = await rest.put(
    //   Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
    //   { body: commands },
    // );

    console.log(`Successfully deployed ${data.length} command(s).`);
  } catch (error) {
    console.error('Failed to deploy commands:', error);
  }
})();
