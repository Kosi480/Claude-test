const { EmbedBuilder } = require('discord.js');
const db = require('../database');

const responses = [
  { text: 'Ein freundlicher Fremder gibt dir etwas Kleingeld', min: 5, max: 50, chance: 0.6 },
  { text: 'Ein reicher Geschäftsmann hat Mitleid mit dir', min: 30, max: 150, chance: 0.2 },
  { text: 'Eine alte Dame gibt dir ihren letzten Schein', min: 50, max: 200, chance: 0.1 },
  { text: 'Ein Kind gibt dir sein Taschengeld', min: 1, max: 20, chance: 0.1 },
];

const failMessages = [
  'Niemand hat dir etwas gegeben. Versuch es später nochmal!',
  'Die Leute gehen an dir vorbei, ohne dich zu beachten.',
  'Jemand hat dir gesagt, du sollst arbeiten gehen!',
  'Ein Hund hat dein Schild gefressen.',
  'Es fängt an zu regnen und alle rennen weg.',
];

const COOLDOWN = 45 * 1000;
const cooldowns = new Map();

module.exports = {
  name: 'beg',
  aliases: ['betteln', 'bettel'],
  description: 'Bettle auf der Straße um Geld (45s Cooldown)',
  execute(message) {
    const userId = message.author.id;
    const config = require('../config.json');

    const lastBeg = cooldowns.get(userId);
    if (lastBeg && Date.now() - lastBeg < COOLDOWN) {
      const remaining = Math.ceil((COOLDOWN - (Date.now() - lastBeg)) / 1000);
      return message.reply(`⏳ Du musst noch **${remaining}s** warten!`);
    }

    cooldowns.set(userId, Date.now());
    try { require('./quest').trackProgress(userId, 'beg'); } catch (_) {}

    const success = Math.random() < 0.65;

    if (success) {
      const roll = Math.random();
      let cumulative = 0;
      let response;
      for (const r of responses) {
        cumulative += r.chance;
        if (roll < cumulative) {
          response = r;
          break;
        }
      }

      const earned = Math.floor(Math.random() * (response.max - response.min + 1)) + response.min;
      db.updateBalance(userId, earned);

      const embed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle('🙏 Betteln')
        .setDescription(`${response.text} — **${config.currencySymbol}${earned}**!`)
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();

      message.reply({ embeds: [embed] });
    } else {
      const failMsg = failMessages[Math.floor(Math.random() * failMessages.length)];

      const embed = new EmbedBuilder()
        .setColor('#e74c3c')
        .setTitle('🙏 Betteln')
        .setDescription(failMsg)
        .setTimestamp();

      message.reply({ embeds: [embed] });
    }
  },
};
