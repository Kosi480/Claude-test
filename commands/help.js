const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Zeigt alle Befehle an'),
  async execute(interaction) {
    const config = require('../config.json');
    const commands = interaction.client.commands;

    const embed = new EmbedBuilder()
      .setColor('#3498db')
      .setTitle('📖 Alle Befehle')
      .setDescription(
        commands.map(cmd =>
          `\`/${cmd.data.name}\` — ${cmd.data.description}`
        ).join('\n')
      )
      .setFooter({ text: 'Benutze / um Befehle auszuführen' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
