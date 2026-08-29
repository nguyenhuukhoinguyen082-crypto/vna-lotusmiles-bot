const { handleMemberLeave } = require('../modules/exitSurvey/handleMemberLeave');

module.exports = {
  name: 'guildMemberRemove',
  async execute(member, client) {
    try {
      await handleMemberLeave(member, client);
    } catch (error) {
      console.error(`[guildMemberRemove] Exit survey handling failed for ${member.id}:`, error);
    }
  },
};
