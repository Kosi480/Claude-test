const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');

const commands = [];
const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  if (command.data) {
    commands.push(command.data.toJSON());
  }
}

const rest = new REST().setToken(config.token);

(async () => {
  try {
    console.log(`Registriere ${commands.length} Slash-Commands...`);
    await rest.put(
      Routes.applicationCommands(config.clientId),
      { body: commands },
    );
    console.log('Slash-Commands erfolgreich registriert!');
  } catch (error) {
    console.error('Fehler beim Registrieren:', error);
  }
})();
