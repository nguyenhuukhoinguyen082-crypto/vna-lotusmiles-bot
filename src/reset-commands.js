const { REST, Routes } = require('discord.js');
const config = require('./config');
const commands = require('./commands');

const rest = new REST({ version: '10' }).setToken(config.token);

async function main() {
  const app = await rest.get(Routes.currentApplication());
  const appId = app.id;
  console.log(`Application ID: ${appId}`);

  // 1) Clear ALL guild command copies across every guild the bot is a member of
  let botGuildIds = [];
  try {
    const guilds = await rest.get(Routes.userGuilds());
    botGuildIds = guilds.map(g => g.id);
    console.log(`Bot is a member of ${botGuildIds.length} guild(s).`);
  } catch (e) {
    console.warn(`Could not fetch bot guild list (${e.code || e.message}).`);
  }

  for (const gid of botGuildIds) {
    try {
      const guildCmds = await rest.get(Routes.applicationGuildCommands(appId, gid));
      if (guildCmds.length === 0) continue;
      console.log(`Clearing ${guildCmds.length} guild command(s) in ${gid}...`);
      for (const cmd of guildCmds) {
        await rest.delete(Routes.applicationGuildCommand(appId, gid, cmd.id));
        console.log(`  deleted guild command: ${cmd.name} (${gid})`);
      }
    } catch (e) {
      console.log(`Could not clear guild ${gid}: ${e.message}`);
    }
  }

  // If a GUILD_ID was configured but not in the fetched list, try it directly too
  if (config.guildId && !botGuildIds.includes(config.guildId)) {
    try {
      const guildCmds = await rest.get(Routes.applicationGuildCommands(appId, config.guildId));
      if (guildCmds.length > 0) {
        console.log(`Clearing ${guildCmds.length} guild command(s) in configured ${config.guildId}...`);
        for (const cmd of guildCmds) {
          await rest.delete(Routes.applicationGuildCommand(appId, config.guildId, cmd.id));
          console.log(`  deleted guild command: ${cmd.name}`);
        }
      }
    } catch (e) {
      console.log(`Could not clear configured guild ${config.guildId}: ${e.message}`);
    }
  }

  // 2) Fetch and delete ALL global commands (removes the old stale set across every server)
  const globalCmds = await rest.get(Routes.applicationCommands(appId));
  console.log(`\nClearing ${globalCmds.length} global command(s)...`);
  for (const cmd of globalCmds) {
    await rest.delete(Routes.applicationCommand(appId, cmd.id));
    console.log(`  deleted global command: ${cmd.name}`);
  }

  // 3) Deploy the current fresh commands
  console.log(`\nDeploying ${commands.length} fresh commands...`);
  const targetGuild = config.guildId && botGuildIds.includes(config.guildId)
    ? config.guildId
    : null;

  if (targetGuild) {
    try {
      await rest.put(Routes.applicationGuildCommands(appId, targetGuild), { body: commands });
      console.log(`Deployed ${commands.length} commands to guild ${targetGuild}`);
    } catch (e) {
      console.warn(`Guild deploy to ${targetGuild} failed (${e.code || e.message}). Deploying globally instead.`);
      await rest.put(Routes.applicationCommands(appId), { body: commands });
      console.log(`Deployed ${commands.length} commands globally`);
    }
  } else {
    await rest.put(Routes.applicationCommands(appId), { body: commands });
    console.log(`Deployed ${commands.length} commands globally`);
  }

  console.log('\nCommand reset complete! All old commands cleared globally and across guilds.');
}

main().catch(console.error);
