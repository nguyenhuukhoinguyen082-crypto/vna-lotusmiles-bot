const { EmbedBuilder } = require('discord.js');
const { db, admin } = require('../../config/firebase');
const { COLORS } = require('../../utils/embeds');
const { logToChannel } = require('../../utils/logger');

const COLLECTION = 'exitSurveys';

function buildOutreachEmbed() {
  return new EmbedBuilder()
    .setColor(COLORS.brand)
    .setDescription(
      'Greetings! Sorry to see you leave Vietnam Airlines PTFS. If possible, can you provide us the reason ' +
      'why you left the server and also, what should we improve on our server to make it better?\n\n' +
      'Thank you for your time!\n' +
      '*Vietnam Airlines Support Team*',
    );
}

/**
 * Called from events/guildMemberRemove.js. Writes the survey record first
 * (so we have it even if the DM attempt fails), then attempts the DM. A
 * failed DM (blocked, no mutual server, etc.) is logged to
 * EXIT_SURVEY_LOG_CHANNEL_ID rather than thrown — a member leaving should
 * never produce an unhandled error.
 */
async function handleMemberLeave(member, client) {
  const ref = db.collection(COLLECTION).doc();
  const leftAt = admin.firestore.Timestamp.now();

  const record = {
    userId: member.id,
    userTag: member.user.tag,
    guildId: member.guild.id,
    leftAt,
    dmSent: false,
    dmFailed: false,
    response: null,
    respondedAt: null,
    forwardedMessageId: null,
    status: 'pending',
  };

  await ref.set(record);

  try {
    await member.send({ embeds: [buildOutreachEmbed()] });
    await ref.update({ dmSent: true });
  } catch (error) {
    await ref.update({ dmSent: false, dmFailed: true, status: 'dm_failed' });
    await logToChannel(
      client,
      process.env.EXIT_SURVEY_LOG_CHANNEL_ID,
      `Failed to send DM to ${member.user.tag} (DMs blocked)`,
    );
  }
}

module.exports = { handleMemberLeave };
