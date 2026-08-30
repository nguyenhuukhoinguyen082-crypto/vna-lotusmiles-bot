const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getTiers } = require('../../modules/lotusmiles/tierConfig');
const { COLORS } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tier-list')
    .setDescription('View the Lotusmiles tier ladder'),

  async execute(interaction) {
    await interaction.deferReply();

    const tiers = await getTiers();

    const embed = new EmbedBuilder()
      .setColor(COLORS.gold)
      .setTitle('🪷 Lotusmiles Tiers')
      .setDescription(
        tiers.map(t =>
          `**${t.name}** (\`${t.key}\`) — ${t.threshold.toLocaleString()}+ lifetime miles · ` +
          `+${Math.round((t.earnBonus - 1) * 100)}% earn bonus` +
          (t.roleId ? ` · <@&${t.roleId}>` : ''),
        ).join('\n'),
      );

    await interaction.editReply({ embeds: [embed] });
  },
};
