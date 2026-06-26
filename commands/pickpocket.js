const { EmbedBuilder } = require('discord.js');
const db = require('../database');

const COOLDOWN = 90 * 1000;
const cooldowns = new Map();

const successMessages = [
  'Du hast geschickt in die Tasche gegriffen',
  'Deine flinken Finger waren erfolgreich',
  'Du hast unbemerkt zugeschlagen',
  'Wie ein Schatten hast du zugeschlagen',
];

const failMessages = [
  'Dein Opfer hat deine Hand bemerkt!',
  'Ein Passant hat dich beobachtet und Alarm geschlagen!',
  'Du bist über deine eigenen Füße gestolpert!',
  'Dein Opfer hatte die Tasche zugenäht!',
];

module.exports = {
  name: 'pickpocket',
  aliases: ['taschendieb', 'klauen2'],
  description: 'Beklaue einen Spieler heimlich (90s Cooldown, subtiler als !steal)',
  execute(message, args) {
    const target = message.mentions.users.first();
    const config = require('../config.json');
    const userId = message.author.id;

    if (!target) return message.reply('❌ Erwähne einen Spieler! `!pickpocket @user`');
    if (target.id === userId) return message.reply('❌ Du kannst dich nicht selbst beklauen!');
    if (target.bot) return message.reply('❌ Bots haben keine Taschen!');

    const lastPP = cooldowns.get(userId);
    if (lastPP && Date.now() - lastPP < COOLDOWN) {
      const remaining = Math.ceil((COOLDOWN - (Date.now() - lastPP)) / 1000);
      return message.reply(`⏳ Du musst noch **${remaining}s** warten!`);
    }

    const targetUser = db.getUser(target.id);
    if (targetUser.balance < 5) {
      return message.reply(`❌ **${target.username}** hat nicht genug Bargeld!`);
    }

    cooldowns.set(userId, Date.now());

    if (db.hasItem(target.id, 'Schutzschild')) {
      db.removeFromInventory(target.id, 'Schutzschild');
      const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle('🛡️ Geschützt!')
        .setDescription(`**${target.username}** hatte ein Schutzschild! Dein Taschendiebstahl wurde abgewehrt.`)
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    const successChance = 0.5;
    const success = Math.random() < successChance;

    if (success) {
      const maxSteal = Math.floor(targetUser.balance * 0.15);
      const stolen = Math.max(1, Math.floor(Math.random() * maxSteal) + 1);

      db.updateBalance(target.id, -stolen);
      db.updateBalance(userId, stolen);

      const msg = successMessages[Math.floor(Math.random() * successMessages.length)];

      let bountyText = '';
      try {
        const bountyCmd = require('./bounty');
        const bounty = bountyCmd.claimBounty(target.id, userId);
        if (bounty) {
          bountyText = `\n\n🎯 **KOPFGELD KASSIERT!** Du hast das Kopfgeld von **${config.currencySymbol}${bounty.amount}** eingelöst!`;
        }
      } catch (_) {}

      const embed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle('🤏 Taschendiebstahl — Erfolg!')
        .setDescription(`${msg} und **${config.currencySymbol}${stolen}** von **${target.username}** gestohlen!${bountyText}`)
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();

      message.reply({ embeds: [embed] });
    } else {
      const fine = Math.floor(Math.random() * 50) + 25;
      const actualFine = Math.min(fine, db.getBalance(userId));
      db.updateBalance(userId, -actualFine);

      const msg = failMessages[Math.floor(Math.random() * failMessages.length)];

      const embed = new EmbedBuilder()
        .setColor('#e74c3c')
        .setTitle('🤏 Taschendiebstahl — Erwischt!')
        .setDescription(`${msg} Strafe: **${config.currencySymbol}${actualFine}**`)
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();

      message.reply({ embeds: [embed] });
    }
  },
};
