/**
 * Post a plain-text log line to a Discord channel by ID. Safe to call even if
 * the channel ID isn't configured yet or the bot can't reach the channel —
 * failures are swallowed (after a console warning) so a logging problem never
 * takes down the feature that triggered the log.
 */
async function logToChannel(client, channelId, message) {
  if (!channelId) {
    console.warn(`[logger] No channel ID configured — dropped log: ${message}`);
    return;
  }
  try {
    const channel = await client.channels.fetch(channelId);
    await channel.send({ content: message });
  } catch (error) {
    console.warn(`[logger] Failed to post log to channel ${channelId}:`, error.message);
  }
}

module.exports = { logToChannel };
