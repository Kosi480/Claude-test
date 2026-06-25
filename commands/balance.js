const { EmbedBuilder } = require('discord.js');
const db = require('../database');

module.exports = {
  name: 'balance',
  aliases: ['bal', 'geld', 'konto'],
  description: 'Zeigt dein Guthaben an',
  execute(message) {
    const target = message.mentions.users.first() || message.author;
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

    message.reply({ embeds: [embed] });
  },
};
