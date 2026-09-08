function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Fisher-Yates shuffle (returns a NEW shuffled copy, does not mutate input)
function shuffle(array) {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

module.exports = { generateId, capitalize, sleep, shuffle };
