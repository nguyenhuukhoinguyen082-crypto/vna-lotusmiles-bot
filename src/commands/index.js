const { SlashCommandBuilder } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('take-test')
    .setDescription('Start the Phase 1 examination')
    .toJSON(),

  new SlashCommandBuilder()
    .setName('host-eval')
    .setDescription('Post a Phase 2 evaluation hosting announcement')
    .addStringOption(opt =>
      opt.setName('department').setDescription('Department').setRequired(true)
        .addChoices(
          { name: 'Flight Deck', value: 'Flight Deck' },
          { name: 'Cabin Crew', value: 'Cabin Crew' },
          { name: 'Ground Crew', value: 'Ground Crew' },
        ))
    .addStringOption(opt => opt.setName('airport').setDescription('Route/Airport').setRequired(true))
    .addStringOption(opt => opt.setName('time').setDescription('Evaluation time').setRequired(true))
    .addStringOption(opt => opt.setName('co-hosts').setDescription('Co-Hosts/Trainers'))
    .toJSON(),

  new SlashCommandBuilder()
    .setName('join-eval')
    .setDescription('Post a Phase 2 join message with a private server link')
    .addStringOption(opt => opt.setName('server-link').setDescription('Private server link').setRequired(true))
    .toJSON(),

  new SlashCommandBuilder()
    .setName('grade-phase2')
    .setDescription('Start Phase 2 evaluation grading')
    .toJSON(),

  new SlashCommandBuilder()
    .setName('request-supervision')
    .setDescription('Request a Phase 3 live flight supervision')
    .toJSON(),

  new SlashCommandBuilder()
    .setName('set-grading-channel')
    .setDescription('[Admin] Set the channel where exam submissions are posted')
    .addChannelOption(opt =>
      opt.setName('channel')
        .setDescription('The channel to route test submissions to')
        .setRequired(true))
    .toJSON(),

  new SlashCommandBuilder()
    .setName('spawn-exam-panel')
    .setDescription('[Admin] Spawn a persistent "Start Phase 1 Exam" panel in this channel')
    .toJSON(),
];

module.exports = commands;
