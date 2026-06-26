const { EmbedBuilder } = require('discord.js');
const db = require('../database');

const crimes = [
  { success: 'Du hast eine Bank ausgeraubt', fail: 'Die Polizei hat dich bei einem Banküberfall erwischt', min: 200, max: 800, fine: 300 },
  { success: 'Du hast einen Juwelier bestohlen', fail: 'Der Alarm ging los beim Juwelier', min: 150, max: 600, fine: 250 },
  { success: 'Du hast Hackersoftware verkauft', fail: 'Die Cyber-Polizei hat dich aufgespürt', min: 100, max: 500, fine: 200 },
  { success: 'Du hast gefälschte Gemälde verkauft', fail: 'Ein Kunstexperte hat deine Fälschung entlarvt', min: 180, max: 700, fine: 280 },
  { success: 'Du hast einen Casino-Tresor geknackt', fail: 'Die Casino-Security hat dich geschnappt', min: 250, max: 900, fine: 350 },
  { success: 'Du hast Schmuggelware über die Grenze gebracht', fail: 'Der Zoll hat deine Schmuggelware gefunden', min: 300, max: 1000, fine: 400 },
];

const COOLDOWN = 120 * 1000;
const cooldowns = new Map();

module.exports = {
  name: 'crime',
  aliases: ['verbrechen', 'heist'],
  description: 'Begehe ein Verbrechen — hohes Risiko, hohe Belohnung (2min Cooldown)',
  execute(message) {
    const userId = message.author.id;
    const config = require('../config.json');

    const lastCrime = cooldowns.get(userId);
    if (lastCrime && Date.now() - lastCrime < COOLDOWN) {
      const remaining = Math.ceil((COOLDOWN - (Date.now() - lastCrime)) / 1000);
      return message.reply(`⏳ Du musst noch **${remaining}s** warten, bevor du wieder ein Verbrechen begehen kannst!`);
    }

    cooldowns.set(userId, Date.now());

    const crime = crimes[Math.floor(Math.random() * crimes.length)];
    const success = Math.random() < 0.45;
    try { require('./quest').trackProgress(userId, 'crime'); } catch (_) {}

    if (success) {
      const earned = Math.floor(Math.random() * (crime.max - crime.min + 1)) + crime.min;
      db.updateBalance(userId, earned);

      const embed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle('🦹 Verbrechen — Erfolg!')
        .setDescription(`${crime.success} und **${config.currencySymbol}${earned}** erbeutet!`)
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();

      message.reply({ embeds: [embed] });
    } else {
      const balance = db.getBalance(userId);
      const actualFine = Math.min(crime.fine, balance);
      db.updateBalance(userId, -actualFine);

      const embed = new EmbedBuilder()
        .setColor('#e74c3c')
        .setTitle('🚔 Verbrechen — Erwischt!')
        .setDescription(`${crime.fail}! Strafe: **${config.currencySymbol}${actualFine}**`)
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();

      message.reply({ embeds: [embed] });
    }
  },
};
