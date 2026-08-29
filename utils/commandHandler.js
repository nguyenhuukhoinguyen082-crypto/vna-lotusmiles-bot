const fs = require('fs');
const path = require('path');

function walk(dir) {
  let files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files = files.concat(walk(full));
    else if (entry.name.endsWith('.js')) files.push(full);
  }
  return files;
}

module.exports = function loadCommands(client) {
  const commandsDir = path.join(__dirname, '..', 'commands');
  if (!fs.existsSync(commandsDir)) return;

  let loaded = 0;
  for (const file of walk(commandsDir)) {
    const command = require(file);
    if (command?.data && command?.execute) {
      client.commands.set(command.data.name, command);
      loaded++;
    } else {
      console.warn(`[commandHandler] Skipping ${file} — missing "data" or "execute" export.`);
    }
  }
  console.log(`[commandHandler] Loaded ${loaded} command(s).`);
};
