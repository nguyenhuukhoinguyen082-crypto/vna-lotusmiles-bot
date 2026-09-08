const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits,
} = require('discord.js');
const config = require('../config');
const fb = require('../firebase');

const ADMIN_ROLE_IDS = [
  config.roles.stage1,
  config.roles.phase2,
];

function hasAdminPermission(member) {
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  // Instructors hold Phase 2 role; foundation/admin roles typically have Manage Guild
  if (member.permissions.has(PermissionFlagsBits.ManageGuild)) return true;
  return false;
}

async function setGradingChannel(interaction) {
  const channel = interaction.options.getChannel('channel');

  if (!hasAdminPermission(interaction.member)) {
    return interaction.reply({
      content: 'You do not have permission to use this command. Administrator or server manager permission is required.',
      ephemeral: true,
    });
  }

  if (channel.type !== 0) { // 0 = GUILD_TEXT
    return interaction.reply({
      content: 'Please select a text channel.',
      ephemeral: true,
    });
  }

  await fb.setGradingChannelId(channel.id);

  await interaction.reply({
    content: `Grading channel set to <#${channel.id}> (ID: \`${channel.id}\`).\n\nAll new Phase 1 test submissions will now be routed here. This setting is stored in Firebase and will persist across restarts.`,
    ephemeral: true,
  });
}

async function spawnExamPanel(interaction) {
  if (!hasAdminPermission(interaction.member)) {
    return interaction.reply({
      content: 'You do not have permission to use this command. Administrator or server manager permission is required.',
      ephemeral: true,
    });
  }

  const embed = new EmbedBuilder()
    .setColor('#003D9C')
    .setTitle('KLM Academy Phase 1 Examination')
    .setDescription(
      'Welcome to the **KLM Academy Phase 1 Examination**! 🎓\n\n' +
      'This examination tests your knowledge for your chosen department. ' +
      'It consists of **6 Multiple Choice Questions** and **4 Written Questions**. ' +
      'The test will be delivered to you via **Direct Message**.'
    )
    .addFields(
      { name: '📝 Format', value: 'Section 1: MCQ (12 points)\nSection 2: Written (12 points)\n**Total: 24 points**', inline: true },
      { name: '✅ Pass Mark', value: `**${config.exam.passThreshold}/24** (75%)`, inline: true },
      { name: '🔄 Attempts', value: 'You have limited attempts. Answer carefully!', inline: true },
    )
    .setFooter({ text: 'KLM Academy - Make your dream come true at KLM Flight Academy' })
    .setThumbnail('https://cdn.discordapp.com/emojis/1543831346856853554.png');

  const buttonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('spawned_start_exam')
      .setLabel('Start Phase 1 Exam')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('✏️')
  );

  await interaction.reply({
    content: 'Here is your Phase 1 Exam panel! Mark students who want to take the test by clicking the button below.',
    embeds: [embed],
    components: [buttonRow],
  });
}

module.exports = {
  hasAdminPermission,
  setGradingChannel,
  spawnExamPanel,
};
