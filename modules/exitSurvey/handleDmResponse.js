const { EmbedBuilder } = require('discord.js');
const { db, admin } = require('../../config/firebase');
const { COLORS } = require('../../utils/embeds');

const COLLECTION = 'exitSurveys';
const MAX_FIELD_LENGTH = 1024; // Discord embed field value limit

/**
 * Called from events/messageCreate.js for every DM the bot receives. Looks up
 * whether this user has a pending exit survey; if not, this is just a normal
 * DM and is ignored (returns false). If so, records the response, thanks
 * them, and forwards the feedback to EXIT_FEEDBACK_CHANNEL_ID.
 *
 * Returns true if this message was consumed as a survey response.
 */
async function handleDmResponse(message, client) {
  const pending = await db.collection(COLLECTION)
    .where('userId', '==', message.author.id)
    .where('status', '==', 'pending')
    .orderBy('leftAt', 'desc')
    .limit(1)
    .get();

  if (pending.empty) return false;

  const surveyDoc = pending.docs[0];
  const survey = surveyDoc.data();
  const respondedAt = admin.firestore.Timestamp.now();
  const feedbackText = message.content?.trim() || '*(no text — attachment or empty message)*';

  await surveyDoc.ref.update({
    response: feedbackText,
    respondedAt,
    status: 'responded',
  });

  await message.reply(
    'Thank you for these amazing feedback. We will work on based on your suggestions. Thanks!',
  );

  const feedbackChannelId = process.env.EXIT_FEEDBACK_CHANNEL_ID;
  if (feedbackChannelId) {
    try {
      const channel = await client.channels.fetch(feedbackChannelId);
      const embed = new EmbedBuilder()
        .setColor(COLORS.brand)
        .setTitle('Exit Survey Response')
        .addFields(
          { name: 'User', value: `${survey.userTag} (\`${survey.userId}\`)`, inline: false },
          { name: 'Left at', value: `<t:${survey.leftAt.seconds}:F>`, inline: false },
          { name: 'Feedback', value: feedbackText.slice(0, MAX_FIELD_LENGTH), inline: false },
        )
        .setTimestamp(respondedAt.toDate());

      const sent = await channel.send({ embeds: [embed] });
      await surveyDoc.ref.update({ forwardedMessageId: sent.id });
    } catch (error) {
      console.warn('[exitSurvey] Failed to forward feedback to EXIT_FEEDBACK_CHANNEL_ID:', error.message);
    }
  } else {
    console.warn('[exitSurvey] EXIT_FEEDBACK_CHANNEL_ID is not set — feedback recorded in Firestore only.');
  }

  return true;
}

module.exports = { handleDmResponse };
