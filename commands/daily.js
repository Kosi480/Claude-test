const { EmbedBuilder } = require('discord.js');
const db = require('../database');

const COOLDOWN = 24 * 60 * 60 * 1000;
const DAILY_AMOUNT = 500;

module.exports = {
  name: 'daily',
  aliases: ['täglich'],
  description: 'Hole dir deine tägliche Belohnung',
  execute(message) {
    const userId = message.author.id;
    const user = db.getUser(userId);
    const config = require('../config.json');

    if (user.last_daily) {
      const lastDaily = new Date(user.last_daily);
      const diff = Date.now() - lastDaily.getTime();
      if (diff < COOLDOWN) {
        const hours = Math.floor((COOLDOWN - diff) / (1000 * 60 * 60));
        const minutes = Math.floor(((COOLDOWN - diff) % (1000 * 60 * 60)) / (1000 * 60));
        return message.reply(`⏳ Du kannst deine tägliche Belohnung in **${hours}h ${minutes}m** wieder abholen!`);
      }
    }

    db.updateBalance(userId, DAILY_AMOUNT);
    db.setLastDaily(userId);

    const embed = new EmbedBuilder()
      .setColor('#2ecc71')
      .setTitle('📅 Tägliche Belohnung')
      .setDescription(`Du hast **${config.currencySymbol}${DAILY_AMOUNT}** erhalten!`)
      .setFooter({ text: `Neues Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
      .setTimestamp();

    message.reply({ embeds: [embed] });
  },
};
