const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const config = require('../config');
const fb = require('../firebase');
const { getExam } = require('../exams');
const { generateId, shuffle } = require('../utils/helpers');

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

  // Check Firebase for existing progress and prior graded results
  const existing = await fb.getExamProgress(userId);
  const result = await fb.getResult(userId);
  const triesUsed = result ? (result.triesUsed || 0) : 0;

  if (result) {
    // Already graded:
    if (result.passed) {
      return interaction.reply({ content: 'You have already passed the Phase 1 exam. You cannot retake it.', ephemeral: true });
    }
    if (triesUsed >= config.exam.maxTries) {
      return interaction.reply({ content: 'You have used all your tries. You cannot take the test again.', ephemeral: true });
    }
    // Failed but still has tries left → allow a retry. Clear the old
    // submitted/leftover progress so the submitted flag doesn't block us.
    if (existing && existing.submitted) {
      await fb.clearExamProgress(userId);
    }
  } else if (existing && existing.submitted) {
    // No result yet but a submission exists → still awaiting grading.
    return interaction.reply({ content: 'You have already submitted an exam. Please wait for your results.', ephemeral: true });
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
    mcqShuffles: [], // per-question order mapping (display index -> original index)
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
    await channel.send('**Section 1 Complete!** Now moving to Section 2: Written Questions.\nYou will answer each written question by replying directly in this chat.');
    await sendWrittenQuestion(channel, session, exam);
    return;
  }

  const q = exam.mcq[qIndex];

  // Shuffle the answer order for this question (Fisher-Yates).
  // We store the mapping (display position -> original index) so grading maps selections back.
  let shuffleOrder = session.mcqShuffles[qIndex];
  if (!shuffleOrder) {
    shuffleOrder = shuffle(q.options.map((_, i) => i));
    session.mcqShuffles[qIndex] = shuffleOrder;
  }

  // Build options in the shuffled display order
  const options = shuffleOrder.map((origIdx, displayIdx) => ({
    label: q.options[origIdx].length > 100 ? q.options[origIdx].slice(0, 97) + '...' : q.options[origIdx],
    value: String(displayIdx), // value is the DISPLAY position
    description: `Option ${displayIdx + 1}`,
  }));

  // All MCQs can have multiple answers selected - the candidate should
  // figure out which ones are correct (1 or more).
  const maxSelect = q.options.length;

  const selectRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('exam_mc_answer')
      .setPlaceholder(`Question ${qIndex + 1}/6 - Select your answer(s)...`)
      .setMinValues(1)
      .setMaxValues(maxSelect)
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
  // Selections come back as DISPLAY positions. Map them back to original indices
  // using the stored shuffle order for the current question.
  const shuffleOrder = session.mcqShuffles[session.currentQuestion] || [];
  const selected = interaction.values.map(Number).map(displayIdx => shuffleOrder[displayIdx]);
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
  session.awaitingAnswer = true;

  await channel.send({
    content: `### Written Question ${q.id} of 10 (${q.points} points)\n\n${q.question}\n\n**Reply to this chat with your answer.** Your next message in this DM will be recorded as your answer.`,
  });
}

// Records a trainee's typed DM message as the answer to the current written question.
// Returns true if the message was consumed as an exam answer, otherwise false.
async function handleDMMessage(message) {
  if (message.author.bot) return false;

  // Only process direct messages
  if (!message.guildId) {
    const userId = message.author.id;
    const session = activeSessions.get(userId);
    if (!session || session.phase !== 'written') return false;
    if (!session.awaitingAnswer) return false;

    const exam = getExam(session.department);
    const q = exam.writtenQuestions[session.currentQuestion];
    if (!q) return false;

    const answer = message.content.trim();

    // Enforce minimum answer length
    if (answer.length < 10) {
      await message.channel.send({
        content: `⚠️ Your answer is too short (${answer.length} characters). Please type at least **10 characters** for your answer to **Written Question ${q.id}**.`,
      });
      return true;
    }

    session.writtenAnswers.push({
      questionId: q.id,
      question: q.question,
      answer,
      points: q.points,
    });
    session.awaitingAnswer = false;

    await message.channel.send({
      content: `✅ **Written Question ${q.id}** — answer recorded!\n\n> ${answer.length > 200 ? answer.slice(0, 200) + '...' : answer}`,
    });

    session.currentQuestion++;
    await fb.updateExamProgress(session.userId, {
      writtenAnswers: session.writtenAnswers,
      currentQuestion: session.currentQuestion,
    });

    // Next written question or finish
    setTimeout(async () => {
      await sendWrittenQuestion(message.channel, session, exam);
    }, 1000);

    return true;
  }

  return false;
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
  handleDMMessage,
  cancelExam,
  activeSessions,
};
