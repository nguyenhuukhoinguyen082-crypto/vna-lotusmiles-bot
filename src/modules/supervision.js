const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const config = require('../config');
const fb = require('../firebase');

async function requestSupervision(interaction) {
  const userId = interaction.user.id;

  // Check for existing request
  const existing = await fb.getSupervisionRequest(userId);
  if (existing && existing.status === 'pending') {
    return interaction.reply({
      content: 'You already have a pending supervision request. Please wait for it to be processed.',
      ephemeral: true,
    });
  }

  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('supervision_select_dept')
      .setPlaceholder('Select your department...')
      .addOptions([
        { label: 'Flight Deck', value: 'Flight Deck', emoji: '🛫' },
        { label: 'Cabin Crew', value: 'Cabin Crew', emoji: '✈️' },
        { label: 'Ground Crew', value: 'Ground Crew', emoji: '🏗️' },
      ])
  );

  await interaction.reply({
    content: '**Phase 3 Supervision Request**\n\nSelect your department for live flight supervision:',
    components: [row],
    ephemeral: true,
  });
}

async function handleSupervisionDeptSelect(interaction) {
  const department = interaction.values[0];
  const userId = interaction.user.id;

  const requestData = {
    userId,
    department,
    status: 'pending',
    requestedAt: Date.now(),
  };

  await fb.saveSupervisionRequest(userId, requestData);

  // Post to phase-3-requests channel
  const channel = await interaction.client.channels.fetch(config.channels.phase3Requests).catch(() => null);
  if (channel) {
    await channel.send({
      content: `## Phase 3 Supervision Request\n**Trainee:** <@${userId}>\n**Department:** ${department}\n**Status:** Pending\n\nAn instructor will claim this supervision request soon.`,
    });
  }

  await interaction.update({
    content: `Your **${department}** supervision request has been submitted! Check <#${config.channels.phase3Requests}> for updates.`,
    components: [],
  });
}

module.exports = { requestSupervision, handleSupervisionDeptSelect };
