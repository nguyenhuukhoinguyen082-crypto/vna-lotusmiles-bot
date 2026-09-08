const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const config = require('../config');
const fb = require('../firebase');
const { getExam } = require('../exams');
const { generateId } = require('../utils/helpers');

// Active exam sessions keyed by userId
const activeSessions = new Map();

// Entry point when user clicks the spawned "Start Phase 1 Exam" button
async function beginExamFromButton(interaction) {
  return startExam(interaction);
}

// Entry point for both /take-test and the spawned panel button
async function startExam(interaction) {
  const userId = interaction.user.id;
  const guild = interaction.guild;

  // Check if already in an exam
  if (activeSessions.has(userId)) {
    return interaction.reply({ content: 'You already have an active exam. Please complete it first.', ephemeral: true });
  }

  // Check Firebase for existing submission
  const existing = await fb.getExamProgress(userId);
  if (existing && existing.submitted) {
    return interaction.reply({ content: 'You have already submitted an exam. Please wait for your results.', ephemeral: true });
  }

  // Check tries
  const result = await fb.getResult(userId);
  const triesUsed = result ? (result.triesUsed || 0) : 0;
  if (triesUsed >= config.exam.maxTries) {
    return interaction.reply({ content: 'You have used all your tries. You cannot take the test again.', ephemeral: true });
  }

  // Ask for department selection
  const deptRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('exam_select_department')
      .setPlaceholder('Select your department...')
      .addOptions([
        { label: 'Cabin Crew', value: 'Cabin Crew', emoji: '✈️' },
        { label: 'Ground Crew', value: 'Ground Crew', emoji: '🏗️' },
        { label: 'Flight Deck', value: 'Flight Deck', emoji: '🛫' },
      ])
  );

  await interaction.reply({
    content: '**Welcome to the KLM Academy Phase 1 Examination!**\n\nPlease select your department below to begin. You will receive questions via DM.',
    components: [deptRow],
    ephemeral: true,
  });
}

async function handleDepartmentSelect(interaction) {
  const userId = interaction.user.id;
  const department = interaction.values[0];

  await interaction.update({ content: `Starting **${department}** exam... Check your DMs!`, components: [] });

  const member = interaction.member;
  const guild = interaction.guild;

  // Grant Stage 1 role
  try {
    if (!member.roles.cache.has(config.roles.stage1)) {
      await member.roles.add(config.roles.stage1);
    }
  } catch (e) {
    console.error('Failed to add Stage 1 role:', e.message);
  }

  // Open DM
  const dm = await interaction.user.createDM().catch(() => null);
  if (!dm) {
    return interaction.followUp({ content: 'Could not open DMs. Please enable DMs from server members and try again.', ephemeral: true });
  }

  const exam = getExam(department);
  if (!exam) {
    return dm.send('Error: Exam data not found for your department.');
  }

  // Initialize session
  const examId = generateId();
  const session = {
    examId,
    userId,
    department,
    currentQuestion: 0,
    mcqAnswers: [],
    writtenAnswers: [],
    phase: 'mcq',
    startedAt: Date.now(),
  };
  activeSessions.set(userId, session);

  // Save progress to Firebase
  await fb.saveExamProgress(userId, {
    examId,
    department,
    startedAt: Date.now(),
    submitted: false,
    mcqAnswers: [],
    writtenAnswers: [],
  });

  // Send intro
  await dm.send({
    content: `## Welcome to the KLM Academy Phase 1 Examination\n**Department:** ${department}\n\nYou will now answer **6 Multiple Choice Questions** followed by **4 Written Questions**.\n\nAnswer each question carefully. You may select multiple correct answers where applicable.\n\n*The exam will begin shortly...*`,
  });

  // Start MCQ
  await sendMCQuestion(dm, session, exam);
}

async function sendMCQuestion(channel, session, exam) {
  const qIndex = session.currentQuestion;
  if (qIndex >= exam.mcq.length) {
    // Move to written phase
    session.phase = 'written';
    session.currentQuestion = 0;
    await fb.updateExamProgress(session.userId, { phase: 'written' });
    await channel.send('**Section 1 Complete!** Now moving to Section 2: Written Questions.\nYou will receive a modal for each written question.');
    await sendWrittenQuestion(channel, session, exam);
    return;
  }

  const q = exam.mcq[qIndex];
  const options = q.options.map((opt, i) => ({
    label: opt.length > 100 ? opt.slice(0, 97) + '...' : opt,
    value: String(i),
    description: `Option ${i + 1}`,
  }));

  const selectRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('exam_mc_answer')
      .setPlaceholder(`Question ${qIndex + 1}/6 - Select your answer(s)...`)
      .setMinValues(1)
      .setMaxValues(q.correct.length > 1 ? q.correct.length : 1)
      .addOptions(options)
  );

  await channel.send({
    content: `### Question ${qIndex + 1} of 6 (${q.points} points)\n\n${q.question}`,
    components: [selectRow],
  });
}

async function handleMCAnswer(interaction) {
  const userId = interaction.user.id;
  const session = activeSessions.get(userId);
  if (!session) {
    return interaction.reply({ content: 'No active exam session found.', ephemeral: true });
  }

  const exam = getExam(session.department);
  const selected = interaction.values.map(Number);
  const q = exam.mcq[session.currentQuestion];

  // Check if answer is correct
  const correctSet = new Set(q.correct);
  const selectedSet = new Set(selected);
  const isCorrect = correctSet.size === selectedSet.size && [...correctSet].every(v => selectedSet.has(v));

  const score = isCorrect ? q.points : 0;
  session.mcqAnswers.push(score);

  await interaction.update({
    content: `### Question ${session.currentQuestion + 1} of 6 - **Answered** ${isCorrect ? '✅' : '❌'}\n\n${q.question}`,
    components: [],
  });

  session.currentQuestion++;
  await fb.updateExamProgress(session.userId, {
    mcqAnswers: session.mcqAnswers,
    currentQuestion: session.currentQuestion,
  });

  // Send next question after brief delay
  setTimeout(async () => {
    await sendMCQuestion(interaction.channel, session, exam);
  }, 1000);
}

async function sendWrittenQuestion(channel, session, exam) {
  const qIndex = session.currentQuestion;
  if (qIndex >= exam.writtenQuestions.length) {
    // Exam complete
    await finishExam(channel, session, exam);
    return;
  }

  const q = exam.writtenQuestions[qIndex];

  const modal = new ModalBuilder()
    .setCustomId('exam_written_modal')
    .setTitle(`Written Question ${q.id}`);

  const answerInput = new TextInputBuilder()
    .setCustomId('written_answer')
    .setLabel(`Q${q.id}: ${q.question.slice(0, 100)}`)
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Type your detailed answer here...')
    .setRequired(true)
    .setMinLength(10)
    .setMaxLength(2000);

  const actionRow = new ActionRowBuilder().addComponents(answerInput);
  modal.addComponents(actionRow);

  await channel.send({
    content: `### Written Question ${q.id} of 10 (${q.points} points)\n\n${q.question}\n\n*A modal will appear for you to type your answer.*`,
  });

  // Show the modal
  try {
    // We need to use a button to trigger the modal since we can't show modals from DM messages directly
    const triggerRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('exam_trigger_written_modal')
        .setLabel('Open Answer Form')
        .setStyle(ButtonStyle.Primary)
    );

    const msg = await channel.send({
      content: 'Click the button below to open the answer form:',
      components: [triggerRow],
    });

    session.pendingWrittenMsgId = msg.id;
  } catch (e) {
    console.error('Failed to send written trigger:', e);
  }
}

async function handleWrittenTrigger(interaction) {
  const userId = interaction.user.id;
  const session = activeSessions.get(userId);
  if (!session || session.phase !== 'written') {
    return interaction.reply({ content: 'No active written question.', ephemeral: true });
  }

  const exam = getExam(session.department);
  const q = exam.writtenQuestions[session.currentQuestion];

  const modal = new ModalBuilder()
    .setCustomId(`exam_written_${session.currentQuestion}`)
    .setTitle(`Written Question ${q.id}`);

  const answerInput = new TextInputBuilder()
    .setCustomId('written_answer')
    .setLabel(`Q${q.id}: ${q.question.slice(0, 80)}`)
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Type your detailed answer here...')
    .setRequired(true)
    .setMinLength(10)
    .setMaxLength(2000);

  modal.addComponents(new ActionRowBuilder().addComponents(answerInput));
  await interaction.showModal(modal);
}

async function handleWrittenModal(interaction) {
  const userId = interaction.user.id;
  const session = activeSessions.get(userId);
  if (!session || session.phase !== 'written') {
    return interaction.reply({ content: 'No active exam session.', ephemeral: true });
  }

  const answer = interaction.fields.getTextInputValue('written_answer');
  const exam = getExam(session.department);
  const q = exam.writtenQuestions[session.currentQuestion];

  session.writtenAnswers.push({
    questionId: q.id,
    question: q.question,
    answer,
    points: q.points,
  });

  await interaction.reply({
    content: `**Written Question ${q.id}** - Answer submitted ✅\n*${answer.slice(0, 100)}${answer.length > 100 ? '...' : ''}*`,
    ephemeral: true,
  });

  session.currentQuestion++;
  await fb.updateExamProgress(session.userId, {
    writtenAnswers: session.writtenAnswers,
    currentQuestion: session.currentQuestion,
  });

  // Next written question or finish
  setTimeout(async () => {
    await sendWrittenQuestion(interaction.channel, session, exam);
  }, 1000);
}

async function finishExam(channel, session, exam) {
  const totalMCQ = session.mcqAnswers.reduce((a, b) => a + b, 0);

  const examData = {
    examId: session.examId,
    userId: session.userId,
    department: session.department,
    mcqAnswers: session.mcqAnswers,
    mcqTotal: totalMCQ,
    writtenAnswers: session.writtenAnswers,
    submittedAt: Date.now(),
  };

  // Save to Firebase
  await fb.updateExamProgress(session.userId, { submitted: true });
  await fb.submitExam(session.examId, examData);

  // Post to instructor queue - use dynamically configured channel from Firebase, fallback to env
  let queueChannelId = await fb.getGradingChannelId();
  if (!queueChannelId) queueChannelId = config.channels.instructorQueue;

  let queueChannel = null;
  if (queueChannelId) {
    queueChannel = await channel.client.channels.fetch(queueChannelId).catch(() => null);
  }

  if (queueChannel) {
    const trainee = await channel.client.users.fetch(session.userId).catch(() => null);
    const traineeTag = trainee ? trainee.tag : session.userId;

    const writtenSection = session.writtenAnswers.map((w, i) => {
      return `\n**Q${w.questionId}:** ${w.question}\n> ${w.answer}`;
    }).join('\n');

    const pendingRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`grade_exam_${session.examId}`)
        .setLabel('Grade Written Answers')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`reject_exam_${session.examId}`)
        .setLabel('Reject')
        .setStyle(ButtonStyle.Danger)
    );

    await queueChannel.send({
      content: `## New Exam Submission\n**Trainee:** <@${session.userId}> (${traineeTag})\n**Department:** ${session.department}\n**MCQ Score:** ${totalMCQ}/12\n**Exam ID:** \`${session.examId}\`\n\n### Written Answers:${writtenSection}`,
      components: [pendingRow],
    });
  }

  // Clean up
  activeSessions.delete(session.userId);

  await channel.send({
    content: `## Exam Complete! 🎉\n\nYour MCQ score: **${totalMCQ}/12**\nYour written answers have been submitted for instructor review.\n\nYou will receive your results in <#${config.channels.phase1Results}> once an instructor has graded your written answers.\n\n*Good luck!*`,
  });
}

async function cancelExam(userId) {
  activeSessions.delete(userId);
  await fb.clearExamProgress(userId);
}

module.exports = {
  startExam,
  beginExamFromButton,
  handleDepartmentSelect,
  handleMCAnswer,
  handleWrittenTrigger,
  handleWrittenModal,
  cancelExam,
  activeSessions,
};
