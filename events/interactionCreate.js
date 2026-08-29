module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    // Slash commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(`Error executing /${interaction.commandName}:`, error);
        const payload = { content: 'Something went wrong running that command.', ephemeral: true };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(payload);
        } else {
          await interaction.reply(payload);
        }
      }
      return;
    }

    // Autocomplete (flight number lookups on /book, /cancelbooking, /flight-cancel)
    if (interaction.isAutocomplete()) {
      const command = client.commands.get(interaction.commandName);
      if (!command?.autocomplete) return;
      try {
        await command.autocomplete(interaction);
      } catch (error) {
        console.error(`Error in autocomplete for /${interaction.commandName}:`, error);
      }
      return;
    }

    // Buttons — route by customId prefix (e.g. "ticket_claim" -> "ticket")
    if (interaction.isButton()) {
      const [prefix] = interaction.customId.split('_');
      // No button-driven flows yet — booking/Lotusmiles/exit-survey are all
      // slash-command or DM driven. Add routing here as button flows are added.
      return;
    }

    // Modals
    if (interaction.isModalSubmit()) {
      return;
    }

    // Select menus
    if (interaction.isStringSelectMenu()) {
      return;
    }
  },
};
