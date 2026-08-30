const { handleBookingButton, handleBookingSelect } = require('../modules/booking/bookingPanel');

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

    // Autocomplete (flight number lookups on /book, /flight-cancel)
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

    // Buttons — route by customId prefix (e.g. "book_start" -> "book")
    if (interaction.isButton()) {
      const [prefix] = interaction.customId.split('_');
      if (prefix === 'book') {
        try {
          await handleBookingButton(interaction);
        } catch (error) {
          console.error('Error in booking button flow:', error);
          const payload = { content: 'Something went wrong with that booking step.', embeds: [], components: [] };
          if (interaction.replied || interaction.deferred) await interaction.editReply(payload).catch(() => {});
          else await interaction.reply({ ...payload, ephemeral: true }).catch(() => {});
        }
      }
      return;
    }

    // Select menus — same "book" prefix convention
    if (interaction.isStringSelectMenu()) {
      const [prefix] = interaction.customId.split('_');
      if (prefix === 'book') {
        try {
          await handleBookingSelect(interaction);
        } catch (error) {
          console.error('Error in booking select flow:', error);
          const payload = { content: 'Something went wrong with that booking step.', embeds: [], components: [] };
          if (interaction.replied || interaction.deferred) await interaction.editReply(payload).catch(() => {});
          else await interaction.reply({ ...payload, ephemeral: true }).catch(() => {});
        }
      }
      return;
    }

    // Modals
    if (interaction.isModalSubmit()) {
      return;
    }
  },
};
