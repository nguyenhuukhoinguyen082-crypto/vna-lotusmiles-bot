function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { generateId, capitalize, sleep };
