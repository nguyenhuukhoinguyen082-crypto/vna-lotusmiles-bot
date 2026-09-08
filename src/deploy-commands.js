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

    // Fetch the list of guilds the bot is actually a member of
    let botGuildIds = [];
    try {
      const guilds = await rest.get(Routes.userGuilds());
      botGuildIds = guilds.map(g => g.id);
      console.log(`Bot is a member of ${botGuildIds.length} guild(s):`);
      guilds.forEach(g => console.log(`  - ${g.name} (${g.id})`));
    } catch (e) {
      console.warn(`Could not fetch bot guild list (${e.code || e.message}). Will attempt configured GUILD_ID directly.`);
    }

    const targetGuild = config.guildId;
    const botInGuild = targetGuild ? botGuildIds.includes(targetGuild) : false;

    if (targetGuild && botInGuild) {
      // Guild-specific (instant)
      await rest.put(
        Routes.applicationGuildCommands(appId, targetGuild),
        { body: commands }
      );
      console.log(`Deployed ${commands.length} commands to guild ${targetGuild}`);
    } else {
      if (targetGuild && botGuildIds.length > 0 && !botInGuild) {
        console.warn(
          `GUILD_ID ${targetGuild} is not in the bot's guild list (${botGuildIds.join(', ') || 'none'}). ` +
          `Commands will deploy globally instead. To fix, set GUILD_ID to a server the bot is in.`
        );
      }
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
