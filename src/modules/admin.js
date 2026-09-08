const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');
const config = require('../config');
const fb = require('../firebase');

// Admin is determined solely by the ADMIN_USER_ID env value.
function isAdmin(userId) {
  if (!config.adminUserId) return false;
  return config.adminUserId === userId;
}

function hasAdminPermission(interaction) {
  return isAdmin(interaction.user.id);
}

async function setGradingChannel(interaction) {
  const channel = interaction.options.getChannel('channel');

  if (!hasAdminPermission(interaction)) {
    return interaction.reply({
      content: 'You are not authorized to use this command. Only the configured admin can use it.',
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
  if (!hasAdminPermission(interaction)) {
    return interaction.reply({
      content: 'You are not authorized to use this command. Only the configured admin can use it.',
      ephemeral: true,
    });
  }

  const embed = new EmbedBuilder()
    .setColor('#003D9C')
    .setTitle('Phase 1: Self-Study + Test')
    .setDescription(
      '-# Developed by vietnamtrainingpilot\n\n' +
      '👋 Greetings all Trainees. Welcome to KLM Academy, to get a step closer to KLM Staff Team, you will go through a list of training.\n\n' +
      'What you are looking here is **Phase 1.** As stated above the title, you are granted access to the ' +
      '**training materials** that contains the majority of the studying information. You should read all of it ' +
      'and memorize to use in the test and in your evaluation. Don\'t worry about asking questions, it is good to ask ' +
      'questions on things that you do not understand. You can contact any Instructors for help!\n\n' +
      'For the test, there will be **10 questions** (6 multiple choice questions + 4 written questions) about the ' +
      'knowledge you\'ve studied from the handbook and some questions in there also have situations so from that knowledge ' +
      'you will have to solve problems. More information can be viewed when you see the test. You should score at least ' +
      '**80%** on the test to be able to pass the stage. All tests are taken on Google Forms, and results will be at ' +
      `<#${config.channels.phase1Results}>.\n\n` +
      `After passing, you will be moved on to <@&${config.roles.phase2}> to complete your second phase.\n\n` +
      'Since you all have access to the materials, you are required to **NOT** leak of any these materials outside this ' +
      'academy and if you violate that, you are blacklisted from being a staff member at KLM.'
    )
    .addFields(
      {
        name: '📚 Materials',
        value: '> Select the materials you want to learn. Only open one that is your department. \n' +
          '- [**Flight Deck Studying Guide**](https://canva.link/vi7qxzv7e9zpf2f)\n' +
          '- [**Cabin Crew Studying Guide**](https://canva.link/xsgj8ujvem4hk0k)\n' +
          '- [**Ground Crew Studying Guide**](https://canva.link/c99yggkr8nuv354)\n\n' +
          'Good luck',
      }
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
    content: 'Here is your Phase 1 Exam panel! Trainees can learn the materials and start the test by clicking the button below.',
    embeds: [embed],
    components: [buttonRow],
  });
}

module.exports = {
  isAdmin,
  hasAdminPermission,
  setGradingChannel,
  spawnExamPanel,
};
