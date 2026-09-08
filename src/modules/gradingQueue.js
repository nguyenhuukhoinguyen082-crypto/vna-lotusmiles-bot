const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const config = require('../config');
const fb = require('../firebase');
const formats = require('../utils/formats');

// Track which exams are being graded to prevent double-grading
const gradingInProgress = new Map();

async function startGrading(interaction, examId) {
  const examData = await fb.getSubmittedExam(examId);
  if (!examData) {
    return interaction.reply({ content: 'Exam not found or already graded.', ephemeral: true });
  }

  if (gradingInProgress.has(examId)) {
    return interaction.reply({ content: 'This exam is currently being graded by another instructor.', ephemeral: true });
  }

  gradingInProgress.set(examId, { graderId: interaction.user.id });

  // Create grading modal with 4 written question score inputs
  const modal = new ModalBuilder()
    .setCustomId(`grading_modal_${examId}`)
    .setTitle(`Grade Written Answers - ${examData.department}`);

  for (let i = 0; i < examData.writtenAnswers.length; i++) {
    const wq = examData.writtenAnswers[i];
    const input = new TextInputBuilder()
      .setCustomId(`score_q${wq.questionId}`)
      .setLabel(`Q${wq.questionId} (0-${wq.points})`)
      .setStyle(TextInputStyle.Short)
      .setPlaceholder(`0-${wq.points}`)
      .setRequired(true)
      .setMinLength(1)
      .setMaxLength(2);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
  }

  await interaction.showModal(modal);
}

async function handleGradingModal(interaction, examId) {
  const examData = await fb.getSubmittedExam(examId);
  if (!examData) {
    return interaction.reply({ content: 'Exam not found.', ephemeral: true });
  }

  // Parse scores
  const writtenScores = [];
  for (const wq of examData.writtenAnswers) {
    const val = parseInt(interaction.fields.getTextInputValue(`score_q${wq.questionId}`), 10);
    if (isNaN(val) || val < 0 || val > wq.points) {
      return interaction.reply({
        content: `Invalid score for Q${wq.questionId}. Must be 0-${wq.points}.`,
        ephemeral: true,
      });
    }
    writtenScores.push({ questionId: wq.questionId, score: val, max: wq.points });
  }

  const writtenTotal = writtenScores.reduce((a, b) => a + b.score, 0);
  const totalScore = examData.mcqTotal + writtenTotal;
  const passed = totalScore >= config.exam.passThreshold;

  // Build all scores array (MCQ questions + written)
  const allScores = [
    ...examData.mcqAnswers,
    ...writtenScores.map(s => s.score),
  ];

  // Update Firebase
  const grader = await interaction.client.users.fetch(interaction.user.id).catch(() => null);
  const graderName = grader ? grader.displayName : interaction.user.username;

  const resultData = {
    userId: examData.userId,
    department: examData.department,
    mcqAnswers: examData.mcqAnswers,
    mcqTotal: examData.mcqTotal,
    writtenScores,
    writtenTotal,
    totalScore,
    passed,
    gradedBy: interaction.user.id,
    graderName,
    gradedAt: Date.now(),
    triesUsed: ((await fb.getResult(examData.userId))?.triesUsed || 0) + 1,
  };

  await fb.saveResult(examData.userId, resultData);
  await fb.removeSubmittedExam(examId);

  // Generate result message
  let resultMsg;
  const trainee = await interaction.client.users.fetch(examData.userId).catch(() => null);
  const traineeTag = trainee ? `<@${examData.userId}>` : examData.userId;
  const triesLeft = config.exam.maxTries - resultData.triesUsed;

  if (passed) {
    resultMsg = formats.phase1PassResult(traineeTag, allScores, totalScore, graderName);
  } else {
    resultMsg = formats.phase1FailResult(traineeTag, allScores, totalScore, graderName, triesLeft);
  }

  // Post results to phase-1-results channel
  const resultsChannel = await interaction.client.channels.fetch(config.channels.phase1Results).catch(() => null);
  if (resultsChannel) {
    await resultsChannel.send(resultMsg);
  }

  // Handle role changes
  if (passed) {
    await handlePassRoleChanges(interaction.client, examData.userId, interaction.guild);
  }

  // Confirm to instructor
  gradingInProgress.delete(examId);
  await interaction.reply({
    content: `Exam graded successfully!\n**Trainee:** <@${examData.userId}>\n**Score:** ${totalScore}/24\n**Result:** ${passed ? '✅ PASSED' : '❌ FAILED'}`,
    ephemeral: true,
  });
}

async function handlePassRoleChanges(client, userId, guild) {
  try {
    const member = await guild.members.fetch(userId);

    // Add Phase 2 role
    if (!member.roles.cache.has(config.roles.phase2)) {
      await member.roles.add(config.roles.phase2);
    }

    // Remove Stage 1 role
    if (member.roles.cache.has(config.roles.stage1)) {
      await member.roles.remove(config.roles.stage1);
    }
  } catch (e) {
    console.error('Failed to manage roles on pass:', e.message);
  }
}

async function rejectExam(interaction, examId) {
  const examData = await fb.getSubmittedExam(examId);
  if (!examData) {
    return interaction.reply({ content: 'Exam not found or already processed.', ephemeral: true });
  }

  await fb.removeSubmittedExam(examId);
  gradingInProgress.delete(examId);

  await interaction.reply({
    content: `Exam submission from <@${examData.userId}> has been rejected and removed.`,
    ephemeral: true,
  });
}

module.exports = {
  startGrading,
  handleGradingModal,
  rejectExam,
};
