const fs = require('fs');
const path = require('path');

module.exports = function loadEvents(client) {
  const eventsDir = path.join(__dirname, '..', 'events');
  if (!fs.existsSync(eventsDir)) return;

  let loaded = 0;
  for (const file of fs.readdirSync(eventsDir)) {
    if (!file.endsWith('.js')) continue;
    const event = require(path.join(eventsDir, file));
    if (!event?.name || !event?.execute) {
      console.warn(`[eventHandler] Skipping ${file} — missing "name" or "execute" export.`);
      continue;
    }
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }
    loaded++;
  }
  console.log(`[eventHandler] Loaded ${loaded} event(s).`);
};
