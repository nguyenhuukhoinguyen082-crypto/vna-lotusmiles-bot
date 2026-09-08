require('dotenv').config();

module.exports = {
  token: process.env.DISCORD_TOKEN,
  guildId: process.env.GUILD_ID,

  roles: {
    stage1: process.env.ROLE_STAGE_1,
    phase2: process.env.ROLE_PHASE_2,
  },

  channels: {
    phase1Results: process.env.CHANNEL_PHASE_1_RESULTS,
    phase2Hosting: process.env.CHANNEL_PHASE_2_HOSTING,
    phase2Request: process.env.CHANNEL_PHASE_2_REQUEST,
    phase2Instructions: process.env.CHANNEL_PHASE_2_INSTRUCTIONS,
    phase3Requests: process.env.CHANNEL_PHASE_3_REQUESTS,
    instructorQueue: process.env.CHANNEL_INSTRUCTOR_QUEUE,
    stageFlightVc: process.env.STAGE_FLIGHT_VC,
  },

  firebase: {
    credentialsJson: process.env.FIREBASE_CREDENTIALS_JSON,
    databaseUrl: process.env.FIREBASE_DATABASE_URL,
  },

  exam: {
    maxTries: 2,
    mcqPoints: 12,
    writtenPoints: 12,
    totalPoints: 24,
    passThreshold: 18,
  },

  phase2: {
    passRates: {
      flightDeck: 48,
      cabinCrew: 44,
      groundCrew: 40,
    },
    maxPoints: {
      flightDeck: 60,
      cabinCrew: 55,
      groundCrew: 50,
    },
  },
};
