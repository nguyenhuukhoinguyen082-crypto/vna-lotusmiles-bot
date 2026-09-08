const config = require('../config');

// Template pattern for #phase-2-request channel
// Required format:
// Username: (Ping/Text)
// Training For: (Department)
// Phase Number: Phase 2

const TEMPLATE_REGEX = /^Username:\s*.+\nTraining For:\s*.+\nPhase Number:\s*Phase 2\s*$/i;

function isPhase2RequestValid(message) {
  return TEMPLATE_REGEX.test(message.content.trim());
}

async function enforcePhase2RequestChannel(message) {
  if (message.channel.id !== config.channels.phase2Request) return;
  if (message.author.bot) return;

  if (!isPhase2RequestValid(message)) {
    try {
      await message.delete();

      // Send the warning only to the offender via DM so it's not visible in the channel.
      await message.author.send({
        content: `Your message in <#${message.channel.id}> was deleted because it does not follow the required format:\n\n\`\`\`\nUsername: (Ping/Text)\nTraining For: (Department)\nPhase Number: Phase 2\n\`\`\`\nPlease post again using this exact format.`,
      }).catch(() => {
        // If DMs are closed, no other action needed — the message is still deleted.
      });
    } catch (e) {
      console.error('Failed to enforce phase-2-request format:', e.message);
    }
  }
}

module.exports = { enforcePhase2RequestChannel };
