const { EmbedBuilder } = require('discord.js');
const db = require('../database');

module.exports = {
  name: 'leaderboard',
  aliases: ['lb', 'top', 'rangliste'],
  description: 'Zeigt die reichsten Spieler',
  execute(message) {
    const topUsers = db.getTopUsers(10);
    const config = require('../config.json');

    if (!topUsers.length) {
      return message.reply('📊 Noch keine Spieler in der Rangliste!');
    }

    const medals = ['🥇', '🥈', '🥉'];
    const lines = topUsers.map((u, i) => {
      const medal = medals[i] || `**${i + 1}.**`;
      return `${medal} <@${u.user_id}> — ${config.currencySymbol}${u.total.toLocaleString()}`;
    });

    const embed = new EmbedBuilder()
      .setColor('#f1c40f')
      .setTitle('🏆 Rangliste — Reichste Spieler')
      .setDescription(lines.join('\n'))
      .setTimestamp();

    message.reply({ embeds: [embed] });
  },
};
