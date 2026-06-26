const { EmbedBuilder } = require('discord.js');
const db = require('../database');

const jobs = [
  { text: 'Du hast als Programmierer gearbeitet', min: 50, max: 200 },
  { text: 'Du hast Pizzas ausgeliefert', min: 30, max: 120 },
  { text: 'Du hast im Supermarkt gearbeitet', min: 40, max: 150 },
  { text: 'Du hast als Gärtner gearbeitet', min: 35, max: 130 },
  { text: 'Du hast als Koch gearbeitet', min: 45, max: 170 },
  { text: 'Du hast als Mechaniker gearbeitet', min: 55, max: 180 },
  { text: 'Du hast als DJ aufgelegt', min: 60, max: 250 },
  { text: 'Du hast als Babysitter gearbeitet', min: 25, max: 100 },
  { text: 'Du hast Zeitungen ausgetragen', min: 20, max: 80 },
  { text: 'Du hast als Streamer Geld verdient', min: 70, max: 300 },
];

const COOLDOWN = 30 * 1000;

module.exports = {
  name: 'work',
  aliases: ['arbeiten', 'arbeit'],
  description: 'Arbeite um Geld zu verdienen (30s Cooldown)',
  execute(message) {
    const userId = message.author.id;
    const user = db.getUser(userId);
    const config = require('../config.json');

    if (user.last_work) {
      const lastWork = new Date(user.last_work);
      const diff = Date.now() - lastWork.getTime();
      if (diff < COOLDOWN) {
        const remaining = Math.ceil((COOLDOWN - diff) / 1000);
        return message.reply(`⏳ Du musst noch **${remaining}s** warten, bevor du wieder arbeiten kannst!`);
      }
    }

    const job = jobs[Math.floor(Math.random() * jobs.length)];
    let earned = Math.floor(Math.random() * (job.max - job.min + 1)) + job.min;

    if (db.hasItem(userId, 'Glücksbringer')) {
      earned = Math.floor(earned * 1.1);
    }
    if (db.hasItem(userId, 'Laptop')) {
      earned = Math.floor(earned * 1.05);
    }

    const prestige = user.prestige || 0;
    if (prestige > 0) {
      earned = Math.floor(earned * (1 + prestige * 0.05));
    }

    db.updateBalance(userId, earned);
    db.setLastWork(userId);

    try { require('./quest').trackProgress(userId, 'work'); } catch (_) {}
    try { require('./achievements').incrementStat(userId, 'work'); } catch (_) {}

    const embed = new EmbedBuilder()
      .setColor('#3498db')
      .setTitle('💼 Arbeit')
      .setDescription(`${job.text} und **${config.currencySymbol}${earned}** verdient!`)
      .setFooter({ text: `Neues Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
      .setTimestamp();

    message.reply({ embeds: [embed] });
  },
};
