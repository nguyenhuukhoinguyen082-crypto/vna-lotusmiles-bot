const config = require('../config');

const EMOJI = {
  logo: '<:klmacademy_logo:1543831346856853554>',
  check: '<:check:1541027836024856618>',
  cross: '<:cross:1541027881344442478>',
};

function phase1PassResult(trainee, scores, total, graderName) {
  const details = scores.map((s, i) => {
    const max = i < 6 ? 2 : 3;
    return `- Question ${i + 1}: ${s}/${max}`;
  }).join('\n');

  return `## ${EMOJI.logo} Phase 1 Examination Results
> **Hallo ${trainee}!** After careful review of the test, we want to announce that you've ||**Passed ${EMOJI.check} **|| the test, with a total score of ||**${total}/${config.exam.totalPoints}**||. 
### Detailed Results:
${details}


Congratulations! Please proceed to the next phase, which is phase 2 by requesting one at <#${config.channels.phase2Request}> and take a look at <#${config.channels.phase2Instructions}>!
*Signed, ${graderName}*
-# KLM Academy - Make your dream come true at KLM Flight Academy ${EMOJI.logo}`;
}

function phase1FailResult(trainee, scores, total, graderName, triesLeft) {
  const details = scores.map((s, i) => {
    const max = i < 6 ? 2 : 3;
    return `- Question ${i + 1}: ${s}/${max}`;
  }).join('\n');

  return `## ${EMOJI.logo} Phase 1 Examination Results
> **Hallo ${trainee}!** After careful review of the test, we want to announce that you've ||**Failed ${EMOJI.cross} **|| the test, with a total score of ||**${total}/${config.exam.totalPoints}**||. 
### Detailed Results:
${details}


Don't be demotivated, every failure is a time you can look back yourself, we believe that you can improve more. Please proceed back to phase 1 and redo the test again. You now have ${triesLeft} ${triesLeft === 1 ? 'try' : 'tries'} left on your test. We hope you can pass the next test and get to the next stage. 
*Signed, ${graderName}*
-# KLM Academy - Make your dream come true at KLM Flight Academy ${EMOJI.logo}`;
}

function phase2HostFormat(department, airport, hostName, coHosts, time) {
  const pingDept = department === 'Flight Deck' ? '<@&1500499568331198604>'
    : department === 'Cabin Crew' ? '<@&1500499568331198604>'
    : '<@&1500499568331198604>';

  return `## ${EMOJI.logo} Phase 2 Evaluation Hosting
> KLM Academy has scheduled an evaluation flight for ${pingDept}! Please make sure to react with ${EMOJI.check} if you are attending this evaluation. Here are some details about the evaluation:


**Route/ Airport:** ${airport}
**Host:** ${hostName}
**Co-Host/Trainers:** ${coHosts}
**Time:** ${time}


More details about this evaluation can be founded in <#${config.channels.phase2Instructions}> and in the evaluation! Good luck!
-# KLM Academy - Make your dream come true at KLM Flight Academy ${EMOJI.logo}`;
}

function phase2JoinFormat(department, serverLink) {
  const pingDept = '<@&1500499568331198604>';

  return `## ${EMOJI.logo} Phase 2 Evaluation Joining
> KLM Academy has started an evaluation flight for ${pingDept}! Please make sure to join via the server link below to attend this training. The link will close in 10 minutes!


**VC:** <https://discord.com/channels/1500498258664095805/${config.channels.stageFlightVc}>
**Server link:** ${serverLink}


More details about this evaluation can be founded in <#${config.channels.phase2Instructions}> and in the evaluation! Good luck!
-# KLM Academy - Make your dream come true at KLM Flight Academy ${EMOJI.logo}`;
}

function phase2PassResult(trainee, scores, total, maxPoints, detailedResults, graderName) {
  return `## ${EMOJI.logo} Phase 2 Evaluation Results
> Hallo! **${trainee}**, I've recorded your performance inside this evaluation, and I wanted to announce that you've ||**Passed ${EMOJI.check} **|| your evaluation, with the total score is ||**${total}/${maxPoints}!**||
### Detailed Results
${detailedResults}


Congratulations on your evaluation! You are now going to the last phase which is phase 3, coming closer from being a KLM Official Staff Team! You can head to <#${config.channels.phase3Requests}> to be supervised on one of the flights that you requested. 
*Signed, ${graderName}*
-# KLM Academy - Make your dream come true at KLM Flight Academy ${EMOJI.logo}`;
}

function phase2FailResult(trainee, scores, total, maxPoints, detailedResults, graderName) {
  return `## ${EMOJI.logo} Phase 2 Evaluation Results
> Hallo! **${trainee}**, I've recorded your performance inside this evaluation, and I wanted to announce that you've ||**Failed ${EMOJI.cross} **|| your evaluation, with the total score is ||**${total}/${maxPoints}!**||
### Detailed Results
${detailedResults}


Don't be demotivated, every failure is a time you can look back yourself, we believe that you can improve more. Please proceed back and redo the evaluation again. We hope you can pass the next evaluation and get to the next stage. 
*Signed, ${graderName}*
-# KLM Academy - Make your dream come true at KLM Flight Academy ${EMOJI.logo}`;
}

function flightDeckDetailed(results) {
  return `* FLIGHT DECK
* Pushback: ${results.pushback}/5 Taxi: ${results.taxi}/5 Takeoff: ${results.takeoff}/10 Climb: ${results.climb}/5 Cruising: ${results.cruising}/5 Descent: ${results.descent}/5 Landing: ${results.landing}/20 Taxi to gate: ${results.taxiToGate}/5 Total: ${results.total}/60`;
}

function cabinCrewDetailed(results) {
  return `* CABIN CREW
* Check-in: ${results.checkin}/10 Boarding: ${results.boarding}/10 Pre-flight Service: ${results.preFlight}/5 Safety Demonstration: ${results.safetyDemo}/4 Takeoff: ${results.takeoff}/3 In-flight Service: ${results.inflightService}/10 Descent & Landing: ${results.descentLanding}/3 Situation: ${results.situation}/10 Total: ${results.total}/55`;
}

function groundCrewDetailed(results) {
  return `* GROUND CREW
* Cone placement: ${results.conePlacement}/6 Aircraft Setup: ${results.aircraftSetup}/30 Pushback: ${results.pushback}/10 Marshalling: ${results.marshalling}/4 Total: ${results.total}/50`;
}

module.exports = {
  EMOJI,
  phase1PassResult,
  phase1FailResult,
  phase2HostFormat,
  phase2JoinFormat,
  phase2PassResult,
  phase2FailResult,
  flightDeckDetailed,
  cabinCrewDetailed,
  groundCrewDetailed,
};
