const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'help',
  aliases: ['hilfe', 'commands', 'befehle'],
  description: 'Zeigt alle Befehle an',
  execute(message) {
    const config = require('../config.json');
    const commands = message.client.commands;

    const embed = new EmbedBuilder()
      .setColor('#3498db')
      .setTitle('📖 Alle Befehle')
      .setDescription(
        commands.map(cmd =>
          `\`${config.prefix}${cmd.name}\` — ${cmd.description}`
        ).join('\n')
      )
      .setFooter({ text: `Prefix: ${config.prefix}` })
      .setTimestamp();

    message.reply({ embeds: [embed] });
  },
};
