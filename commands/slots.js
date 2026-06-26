const { EmbedBuilder } = require('discord.js');
const db = require('../database');

const symbols = ['🍒', '🍋', '🍊', '🍇', '💎', '7️⃣', '🔔'];
const multipliers = {
  '💎': 10,
  '7️⃣': 7,
  '🔔': 5,
  '🍇': 3,
  '🍊': 2.5,
  '🍋': 2,
  '🍒': 1.5,
};

module.exports = {
  name: 'slots',
  aliases: ['slot', 'automat', 'spielautomat'],
  description: 'Spiele am Spielautomaten',
  execute(message, args) {
    const userId = message.author.id;
    const config = require('../config.json');

    if (!args[0]) return message.reply(`❌ Nutzung: \`${config.prefix}slots <Betrag>\``);

    let amount;
    if (args[0] === 'all' || args[0] === 'alles') {
      amount = db.getBalance(userId);
    } else {
      amount = parseInt(args[0]);
    }

    if (!amount || amount <= 0) return message.reply('❌ Bitte gib einen gültigen Betrag an!');
    if (amount > db.getBalance(userId)) return message.reply(`❌ Du hast nur **${config.currencySymbol}${db.getBalance(userId)}**!`);

    try { require('./quest').trackProgress(userId, 'gamble'); } catch (_) {}
    const s1 = symbols[Math.floor(Math.random() * symbols.length)];
    const s2 = symbols[Math.floor(Math.random() * symbols.length)];
    const s3 = symbols[Math.floor(Math.random() * symbols.length)];

    let winAmount = 0;
    let resultText;

    if (s1 === s2 && s2 === s3) {
      const mult = multipliers[s1];
      winAmount = Math.floor(amount * mult);
      resultText = `JACKPOT! Alle drei gleich! **+${config.currencySymbol}${winAmount}**`;
    } else if (s1 === s2 || s2 === s3 || s1 === s3) {
      winAmount = Math.floor(amount * 0.5);
      resultText = `Zwei gleiche! **+${config.currencySymbol}${winAmount}**`;
    } else {
      winAmount = -amount;
      resultText = `Kein Gewinn! **-${config.currencySymbol}${amount}**`;
    }

    db.updateBalance(userId, winAmount);

    const embed = new EmbedBuilder()
      .setColor(winAmount > 0 ? '#2ecc71' : '#e74c3c')
      .setTitle('🎰 Spielautomat')
      .setDescription(`> ${s1} | ${s2} | ${s3}\n\n${resultText}`)
      .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
      .setTimestamp();

    message.reply({ embeds: [embed] });
  },
};
