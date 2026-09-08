const cabinCrew = require('./cabinCrew');
const groundCrew = require('./groundCrew');
const flightDeck = require('./flightDeck');

const exams = {
  'Cabin Crew': cabinCrew,
  'Ground Crew': groundCrew,
  'Flight Deck': flightDeck,
};

function getExam(department) {
  return exams[department] || null;
}

function getDepartments() {
  return Object.keys(exams);
}

module.exports = { getExam, getDepartments, exams };
