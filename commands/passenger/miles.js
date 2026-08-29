const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getOrCreateAccount } = require('../../modules/lotusmiles/account');
const { getTier, milesToNextTier } = require('../../modules/lotusmiles/tiers');
const { COLORS } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('miles')
    .setDescription('Check your Lotusmiles balance and tier'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const account = await getOrCreateAccount(interaction.user.id, interaction.user.tag);
    const tier = getTier(account.tier);
    const progress = milesToNextTier(account.lifetimeMiles);

    const embed = new EmbedBuilder()
      .setColor(COLORS.gold)
      .setTitle('🪷 Lotusmiles Account')
      .addFields(
        { name: 'Balance', value: `${account.balance.toLocaleString()} miles`, inline: true },
        { name: 'Lifetime Miles', value: `${account.lifetimeMiles.toLocaleString()}`, inline: true },
        { name: 'Tier', value: `${tier.name} (+${Math.round((tier.earnBonus - 1) * 100)}% earn bonus)`, inline: true },
      );

    embed.addFields({
      name: 'Next Tier',
      value: progress
        ? `${progress.remaining.toLocaleString()} miles to **${progress.next.name}**`
        : "You're at the top tier — Titanium! 🎉",
      inline: false,
    });

    await interaction.editReply({ embeds: [embed] });
  },
};
