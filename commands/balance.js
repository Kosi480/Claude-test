const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Zeigt dein Guthaben an')
    .addUserOption(opt => opt.setName('user').setDescription('Spieler dessen Guthaben angezeigt werden soll').setRequired(false)),
  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    const user = db.getUser(target.id);
    const config = require('../config.json');

    const embed = new EmbedBuilder()
      .setColor('#2ecc71')
      .setTitle(`💰 Konto von ${target.username}`)
      .addFields(
        { name: '👛 Bargeld', value: `${config.currencySymbol}${user.balance.toLocaleString()}`, inline: true },
        { name: '🏦 Bank', value: `${config.currencySymbol}${user.bank.toLocaleString()}`, inline: true },
        { name: '📊 Gesamt', value: `${config.currencySymbol}${(user.balance + user.bank).toLocaleString()}`, inline: true },
      )
      .setThumbnail(target.displayAvatarURL())
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
