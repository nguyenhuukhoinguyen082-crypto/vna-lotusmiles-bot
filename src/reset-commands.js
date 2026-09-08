const { REST, Routes } = require('discord.js');
const config = require('./config');
const commands = require('./commands');

const rest = new REST({ version: '10' }).setToken(config.token);

async function main() {
  const app = await rest.get(Routes.currentApplication());
  const appId = app.id;
  console.log(`Application ID: ${appId}`);

  const guildId = config.guildId;
  const purgeGuild = guildId ? guildId : null;

  // 1) Fetch and delete ALL guild commands (in configured guild, if any)
  if (purgeGuild) {
    try {
      const guildCmds = await rest.get(Routes.applicationGuildCommands(appId, purgeGuild));
      console.log(`Clearing ${guildCmds.length} guild command(s) in ${purgeGuild}...`);
      for (const cmd of guildCmds) {
        await rest.delete(Routes.applicationGuildCommand(appId, purgeGuild, cmd.id));
        console.log(`  deleted guild command: ${cmd.name}`);
      }
    } catch (e) {
      console.log(`No/error guild commands in ${purgeGuild}: ${e.message}`);
    }
  }

  // 2) Fetch and delete ALL global commands (removes the old stale set)
  const globalCmds = await rest.get(Routes.applicationCommands(appId));
  console.log(`Clearing ${globalCmds.length} global command(s)...`);
  for (const cmd of globalCmds) {
    await rest.delete(Routes.applicationCommand(appId, cmd.id));
    console.log(`  deleted global command: ${cmd.name}`);
  }

  // 3) Deploy the current 7 commands
  console.log(`\nDeploying ${commands.length} fresh commands...`);
  const useGuild = purgeGuild;
  if (useGuild) {
    try {
      await rest.put(Routes.applicationGuildCommands(appId, useGuild), { body: commands });
      console.log(`Deployed ${commands.length} commands to guild ${useGuild}`);
    } catch (e) {
      console.warn(`Guild deploy to ${useGuild} failed (${e.code || e.message}). Deploying globally instead.`);
      await rest.put(Routes.applicationCommands(appId), { body: commands });
      console.log(`Deployed ${commands.length} commands globally`);
    }
  } else {
    await rest.put(Routes.applicationCommands(appId), { body: commands });
    console.log(`Deployed ${commands.length} commands globally`);
  }

  console.log('\nCommand reset complete!');
}

main().catch(console.error);
