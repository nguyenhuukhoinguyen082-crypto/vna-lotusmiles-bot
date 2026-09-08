const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
} = require('discord.js');
const config = require('../config');
const fb = require('../firebase');
const formats = require('../utils/formats');
const { generateId } = require('../utils/helpers');

// Active hosting sessions
const activeHostings = new Map();

async function postHostingAnnouncement(interaction, options) {
  const { department, airport, coHosts, time } = options;

  const msg = formats.phase2HostFormat(
    department,
    airport,
    interaction.user.displayName || interaction.user.username,
    coHosts || 'None',
    time
  );

  const hostingChannel = await interaction.client.channels.fetch(config.channels.phase2Hosting).catch(() => null);
  if (!hostingChannel) {
    return interaction.reply({ content: 'Hosting channel not found.', ephemeral: true });
  }

  const sent = await hostingChannel.send(msg);
  await sent.react('✅');

  // Store session
  const sessionId = generateId();
  await fb.saveHostingSession(sessionId, {
    messageId: sent.id,
    department,
    airport,
    hostId: interaction.user.id,
    hostName: interaction.user.displayName || interaction.user.username,
    coHosts: coHosts || '',
    time,
    createdAt: Date.now(),
  });

  activeHostings.set(sessionId, { messageId: sent.id });

  await interaction.reply({
    content: `Hosting announcement posted in <#${config.channels.phase2Hosting}>! Message ID: \`${sent.id}\``,
    ephemeral: true,
  });
}

async function joinEvaluation(interaction, serverLink) {
  const joinMsg = formats.phase2JoinFormat('Phase 2', serverLink);

  const hostingChannel = await interaction.client.channels.fetch(config.channels.phase2Hosting).catch(() => null);
  if (!hostingChannel) {
    return interaction.reply({ content: 'Hosting channel not found.', ephemeral: true });
  }

  const sent = await hostingChannel.send(joinMsg);

  await interaction.reply({
    content: `Join message posted! The link will be auto-deleted in 10 minutes.`,
    ephemeral: true,
  });

  // Auto-delete after 10 minutes
  setTimeout(async () => {
    try {
      await sent.delete();
    } catch (e) {
      console.error('Failed to delete join message:', e.message);
    }
  }, 10 * 60 * 1000);
}

async function startPhase2Grading(interaction) {
  const departmentRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('phase2_select_department')
      .setPlaceholder('Select department for evaluation...')
      .addOptions([
        { label: 'Flight Deck', value: 'flightDeck', emoji: '🛫' },
        { label: 'Cabin Crew', value: 'cabinCrew', emoji: '✈️' },
        { label: 'Ground Crew', value: 'groundCrew', emoji: '🏗️' },
      ])
  );

  await interaction.reply({
    content: '**Phase 2 Evaluation Grading**\n\nSelect the department to begin grading:',
    components: [departmentRow],
    ephemeral: true,
  });
}

async function handlePhase2DeptSelect(interaction) {
  const dept = interaction.values[0];

  // Ask for trainee
  await interaction.update({
    content: `**${getDeptName(dept)}** selected.\n\nNow, please enter the trainee's user ID or mention them in the next step.`,
    components: [],
  });

  const modal = new ModalBuilder()
    .setCustomId(`phase2_trainee_${dept}`)
    .setTitle('Phase 2 - Trainee Info');

  const traineeInput = new TextInputBuilder()
    .setCustomId('trainee_id')
    .setLabel('Trainee User ID or Mention')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('e.g. 123456789 or @username')
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(traineeInput));
  await interaction.showModal(modal);
}

async function handlePhase2TraineeModal(interaction, dept) {
  const traineeRaw = interaction.fields.getTextInputValue('trainee_id');
  const traineeId = traineeRaw.replace(/[<@!>]/g, '');

  const evalId = generateId();

  if (dept === 'flightDeck') {
    await showFlightDeckGrading(interaction, evalId, traineeId);
  } else if (dept === 'cabinCrew') {
    await showCabinCrewGrading(interaction, evalId, traineeId);
  } else if (dept === 'groundCrew') {
    await showGroundCrewGrading(interaction, evalId, traineeId);
  }
}

async function showFlightDeckGrading(interaction, evalId, traineeId) {
  const modal = new ModalBuilder()
    .setCustomId(`phase2_grade_fd_${evalId}_${traineeId}`)
    .setTitle('Flight Deck Evaluation');

  const fields = [
    { id: 'pushback', label: 'Pushback (0-5)', max: 5 },
    { id: 'taxi', label: 'Taxi (0-5)', max: 5 },
    { id: 'takeoff', label: 'Takeoff (0-10)', max: 10 },
    { id: 'climb', label: 'Climb (0-5)', max: 5 },
    { id: 'cruising', label: 'Cruising (0-5)', max: 5 },
    { id: 'descent', label: 'Descent (0-5)', max: 5 },
    { id: 'landing', label: 'Landing (0-20)', max: 20 },
    { id: 'taxiToGate', label: 'Taxi to Gate (0-5)', max: 5 },
  ];

  for (const f of fields) {
    const input = new TextInputBuilder()
      .setCustomId(f.id)
      .setLabel(f.label)
      .setStyle(TextInputStyle.Short)
      .setPlaceholder(`0-${f.max}`)
      .setRequired(true)
      .setMinLength(1)
      .setMaxLength(2);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
  }

  await interaction.showModal(modal);
}

async function showCabinCrewGrading(interaction, evalId, traineeId) {
  const modal = new ModalBuilder()
    .setCustomId(`phase2_grade_cc_${evalId}_${traineeId}`)
    .setTitle('Cabin Crew Evaluation');

  const fields = [
    { id: 'checkin', label: 'Check-in (0-10)', max: 10 },
    { id: 'boarding', label: 'Boarding (0-10)', max: 10 },
    { id: 'preFlight', label: 'Pre-flight Service (0-5)', max: 5 },
    { id: 'safetyDemo', label: 'Safety Demo (0-4)', max: 4 },
    { id: 'takeoff', label: 'Takeoff PA (0-3)', max: 3 },
    { id: 'inflightService', label: 'In-flight Service (0-10)', max: 10 },
    { id: 'descentLanding', label: 'Descent & Landing (0-3)', max: 3 },
    { id: 'situation', label: 'Situation (0-10)', max: 10 },
  ];

  for (const f of fields) {
    const input = new TextInputBuilder()
      .setCustomId(f.id)
      .setLabel(f.label)
      .setStyle(TextInputStyle.Short)
      .setPlaceholder(`0-${f.max}`)
      .setRequired(true)
      .setMinLength(1)
      .setMaxLength(2);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
  }

  await interaction.showModal(modal);
}

async function showGroundCrewGrading(interaction, evalId, traineeId) {
  const modal = new ModalBuilder()
    .setCustomId(`phase2_grade_gc_${evalId}_${traineeId}`)
    .setTitle('Ground Crew Evaluation');

  const fields = [
    { id: 'conePlacement', label: 'Cone Placement (0-6)', max: 6 },
    { id: 'aircraftSetup', label: 'Aircraft Setup (0-30)', max: 30 },
    { id: 'pushback', label: 'Pushback (0-10)', max: 10 },
    { id: 'marshalling', label: 'Marshalling (0-4)', max: 4 },
  ];

  for (const f of fields) {
    const input = new TextInputBuilder()
      .setCustomId(f.id)
      .setLabel(f.label)
      .setStyle(TextInputStyle.Short)
      .setPlaceholder(`0-${f.max}`)
      .setRequired(true)
      .setMinLength(1)
      .setMaxLength(2);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
  }

  await interaction.showModal(modal);
}

async function handlePhase2GradeModal(interaction, evalId, traineeId, dept) {
  const parseScore = (fieldId, max) => {
    const val = parseInt(interaction.fields.getTextInputValue(fieldId), 10);
    if (isNaN(val) || val < 0 || val > max) throw new Error(`Invalid score for ${fieldId}`);
    return val;
  };

  let results, total, maxPoints, detailedFn;

  try {
    if (dept === 'fd') {
      const pushback = parseScore('pushback', 5);
      const taxi = parseScore('taxi', 5);
      const takeoff = parseScore('takeoff', 10);
      const climb = parseScore('climb', 5);
      const cruising = parseScore('cruising', 5);
      const descent = parseScore('descent', 5);
      const landing = parseScore('landing', 20);
      const taxiToGate = parseScore('taxiToGate', 5);
      total = pushback + taxi + takeoff + climb + cruising + descent + landing + taxiToGate;
      maxPoints = config.phase2.maxPoints.flightDeck;
      results = { pushback, taxi, takeoff, climb, cruising, descent, landing, taxiToGate, total };
      detailedFn = formats.flightDeckDetailed;
    } else if (dept === 'cc') {
      const checkin = parseScore('checkin', 10);
      const boarding = parseScore('boarding', 10);
      const preFlight = parseScore('preFlight', 5);
      const safetyDemo = parseScore('safetyDemo', 4);
      const takeoff = parseScore('takeoff', 3);
      const inflightService = parseScore('inflightService', 10);
      const descentLanding = parseScore('descentLanding', 3);
      const situation = parseScore('situation', 10);
      total = checkin + boarding + preFlight + safetyDemo + takeoff + inflightService + descentLanding + situation;
      maxPoints = config.phase2.maxPoints.cabinCrew;
      results = { checkin, boarding, preFlight, safetyDemo, takeoff, inflightService, descentLanding, situation, total };
      detailedFn = formats.cabinCrewDetailed;
    } else if (dept === 'gc') {
      const conePlacement = parseScore('conePlacement', 6);
      const aircraftSetup = parseScore('aircraftSetup', 30);
      const pushback = parseScore('pushback', 10);
      const marshalling = parseScore('marshalling', 4);
      total = conePlacement + aircraftSetup + pushback + marshalling;
      maxPoints = config.phase2.maxPoints.groundCrew;
      results = { conePlacement, aircraftSetup, pushback, marshalling, total };
      detailedFn = formats.groundCrewDetailed;
    }
  } catch (e) {
    return interaction.reply({ content: `Error: ${e.message}. Please try again.`, ephemeral: true });
  }

  const deptName = dept === 'fd' ? 'Flight Deck' : dept === 'cc' ? 'Cabin Crew' : 'Ground Crew';
  const passRate = config.phase2.passRates[deptName === 'Flight Deck' ? 'flightDeck' : deptName === 'Cabin Crew' ? 'cabinCrew' : 'groundCrew'];
  const passed = total >= passRate;

  const grader = interaction.user;
  const graderName = grader.displayName || grader.username;
  const trainee = await interaction.client.users.fetch(traineeId).catch(() => null);
  const traineeTag = trainee ? `<@${traineeId}>` : traineeId;

  // Save to Firebase
  await fb.savePhase2Eval(evalId, {
    traineeId,
    department: deptName,
    results,
    total,
    maxPoints,
    passed,
    gradedBy: interaction.user.id,
    graderName,
    gradedAt: Date.now(),
  });

  // Generate result message
  const detailedResults = detailedFn(results);
  let resultMsg;
  if (passed) {
    resultMsg = formats.phase2PassResult(traineeTag, results, total, maxPoints, detailedResults, graderName);
  } else {
    resultMsg = formats.phase2FailResult(traineeTag, results, total, maxPoints, detailedResults, graderName);
  }

  // Post to phase-1-results channel
  const resultsChannel = await interaction.client.channels.fetch(config.channels.phase1Results).catch(() => null);
  if (resultsChannel) {
    await resultsChannel.send(resultMsg);
  }

  // If passed, handle role changes
  if (passed) {
    try {
      const guild = interaction.guild;
      if (guild) {
        const member = await guild.members.fetch(traineeId);
        if (member.roles.cache.has(config.roles.phase2)) {
          await member.roles.remove(config.roles.phase2);
        }
      }
    } catch (e) {
      console.error('Failed to remove Phase 2 role:', e.message);
    }
  }

  await interaction.reply({
    content: `Phase 2 evaluation graded!\n**Trainee:** <@${traineeId}>\n**Score:** ${total}/${maxPoints}\n**Result:** ${passed ? '✅ PASSED' : '❌ FAILED'}`,
    ephemeral: true,
  });
}

function getDeptName(key) {
  const map = { flightDeck: 'Flight Deck', cabinCrew: 'Cabin Crew', groundCrew: 'Ground Crew' };
  return map[key] || key;
}

module.exports = {
  postHostingAnnouncement,
  joinEvaluation,
  startPhase2Grading,
  handlePhase2DeptSelect,
  handlePhase2TraineeModal,
  handlePhase2GradeModal,
  showFlightDeckGrading,
  showCabinCrewGrading,
  showGroundCrewGrading,
  activeHostings,
};
