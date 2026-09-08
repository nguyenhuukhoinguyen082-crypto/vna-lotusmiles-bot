const { Client, GatewayIntentBits, Events } = require('discord.js');
const config = require('./config');
const fb = require('./firebase');
const examEngine = require('./modules/examEngine');
const gradingQueue = require('./modules/gradingQueue');
const phase2Eval = require('./modules/phase2Eval');
const moderation = require('./modules/moderation');
const supervision = require('./modules/supervision');
const admin = require('./modules/admin');

// Initialize Firebase (lazy — log a clear warning if not configured correctly,
// but still allow the Discord client to come online)
try {
  fb.initFirebase();
  console.log('Firebase initialized successfully.');
} catch (e) {
  console.error('Firebase initialization failed:');
  console.error(e.message);
  console.error('Firebase-dependent commands (exams, grading, hosting) will not work until this is fixed.');
}

if (!config.token) {
  console.error('Missing DISCORD_TOKEN in .env. The bot cannot log in. Add your bot token and restart.');
  process.exit(1);
}

// Create client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
});

// Bot ready
client.once(Events.ClientReady, async (c) => {
  console.log(`Logged in as ${c.user.tag}`);

  // Register slash commands
  try {
    const { REST, Routes } = require('discord.js');
    const commands = require('./commands');
    const rest = new REST({ version: '10' }).setToken(config.token);

    // Determine the app ID from the logged-in client
    const appId = c.user.id;

    // Verify the bot is actually in the configured guild before trying guild registration
    const configuredGuild = config.guildId ? c.guilds.cache.get(config.guildId) : null;

    let registered = false;
    if (config.guildId && configuredGuild) {
      try {
        await rest.put(
          Routes.applicationGuildCommands(appId, config.guildId),
          { body: commands }
        );
        console.log(`Registered ${commands.length} slash commands to guild ${config.guildId}`);
        registered = true;
      } catch (gErr) {
        console.warn(`Guild command registration to ${config.guildId} failed (${gErr.code || gErr.message}). Falling back to global registration...`);
      }
    }

    if (!registered) {
      await rest.put(
        Routes.applicationCommands(appId),
        { body: commands }
      );
      console.log(`Registered ${commands.length} commands globally`);
    }
  } catch (e) {
    console.error('Failed to register commands:', e);
  }
});

// Slash command handler
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // === SLASH COMMANDS ===
    if (interaction.isChatInputCommand()) {
      switch (interaction.commandName) {
        case 'take-test':
          return await examEngine.startExam(interaction);

        case 'host-eval':
          return await phase2Eval.postHostingAnnouncement(interaction, {
            department: interaction.options.getString('department'),
            airport: interaction.options.getString('airport'),
            coHosts: interaction.options.getString('co-hosts'),
            time: interaction.options.getString('time'),
          });

        case 'join-eval':
          return await phase2Eval.joinEvaluation(
            interaction,
            interaction.options.getString('server-link')
          );

        case 'grade-phase2':
          return await phase2Eval.startPhase2Grading(interaction);

        case 'request-supervision':
          return await supervision.requestSupervision(interaction);

        case 'set-grading-channel':
          return await admin.setGradingChannel(interaction);

        case 'spawn-exam-panel':
          return await admin.spawnExamPanel(interaction);
      }
    }

    // === STRING SELECT MENUS ===
    if (interaction.isStringSelectMenu()) {
      switch (interaction.customId) {
        case 'exam_select_department':
          return await examEngine.handleDepartmentSelect(interaction);

        case 'exam_mc_answer':
          return await examEngine.handleMCAnswer(interaction);

        case 'phase2_select_department':
          return await phase2Eval.handlePhase2DeptSelect(interaction);

        case 'supervision_select_dept':
          return await supervision.handleSupervisionDeptSelect(interaction);
      }
    }

    // === BUTTONS ===
    if (interaction.isButton()) {
      // Spawned exam panel button
      if (interaction.customId === 'spawned_start_exam') {
        return await examEngine.beginExamFromButton(interaction);
      }

      // Written exam trigger
      if (interaction.customId === 'exam_trigger_written_modal') {
        return await examEngine.handleWrittenTrigger(interaction);
      }

      // Grade exam button
      if (interaction.customId.startsWith('grade_exam_')) {
        const examId = interaction.customId.replace('grade_exam_', '');
        return await gradingQueue.startGrading(interaction, examId);
      }

      // Reject exam button
      if (interaction.customId.startsWith('reject_exam_')) {
        const examId = interaction.customId.replace('reject_exam_', '');
        return await gradingQueue.rejectExam(interaction, examId);
      }
    }

    // === MODALS ===
    if (interaction.isModalSubmit()) {
      // Written exam modal
      if (interaction.customId === 'exam_written_modal' || interaction.customId.startsWith('exam_written_')) {
        return await examEngine.handleWrittenModal(interaction);
      }

      // Grading modal
      if (interaction.customId.startsWith('grading_modal_')) {
        const examId = interaction.customId.replace('grading_modal_', '');
        return await gradingQueue.handleGradingModal(interaction, examId);
      }

      // Phase 2 trainee input modal
      if (interaction.customId.startsWith('phase2_trainee_')) {
        const dept = interaction.customId.replace('phase2_trainee_', '');
        return await phase2Eval.handlePhase2TraineeModal(interaction, dept);
      }

      // Phase 2 grading modals
      if (interaction.customId.startsWith('phase2_grade_fd_')) {
        const parts = interaction.customId.replace('phase2_grade_fd_', '').split('_');
        const evalId = parts[0];
        const traineeId = parts.slice(1).join('_');
        return await phase2Eval.handlePhase2GradeModal(interaction, evalId, traineeId, 'fd');
      }

      if (interaction.customId.startsWith('phase2_grade_cc_')) {
        const parts = interaction.customId.replace('phase2_grade_cc_', '').split('_');
        const evalId = parts[0];
        const traineeId = parts.slice(1).join('_');
        return await phase2Eval.handlePhase2GradeModal(interaction, evalId, traineeId, 'cc');
      }

      if (interaction.customId.startsWith('phase2_grade_gc_')) {
        const parts = interaction.customId.replace('phase2_grade_gc_', '').split('_');
        const evalId = parts[0];
        const traineeId = parts.slice(1).join('_');
        return await phase2Eval.handlePhase2GradeModal(interaction, evalId, traineeId, 'gc');
      }
    }
  } catch (error) {
    console.error('Interaction error:', error);
    const reply = { content: 'An error occurred while processing this interaction.', ephemeral: true };
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply);
      } else {
        await interaction.reply(reply);
      }
    } catch (e) {}
  }
});

// Message handler for channel moderation
client.on(Events.MessageCreate, async (message) => {
  try {
    await moderation.enforcePhase2RequestChannel(message);
  } catch (e) {
    console.error('Message handler error:', e);
  }
});

// Login
client.login(config.token);
