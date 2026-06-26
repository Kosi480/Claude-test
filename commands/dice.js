const { EmbedBuilder } = require('discord.js');
const db = require('../database');

module.exports = {
  name: 'dice',
  aliases: ['würfel', 'roll'],
  description: 'Würfle gegen den Bot (!dice <Betrag>)',
  execute(message, args) {
    const userId = message.author.id;
    const config = require('../config.json');

    if (!args[0]) return message.reply(`❌ Nutzung: \`${config.prefix}dice <Betrag>\``);

    let amount;
    if (args[0] === 'all' || args[0] === 'alles') {
      amount = db.getBalance(userId);
    } else {
      amount = parseInt(args[0]);
    }

    if (!amount || amount <= 0) return message.reply('❌ Ungültiger Betrag!');
    if (amount > db.getBalance(userId)) return message.reply(`❌ Du hast nur **${config.currencySymbol}${db.getBalance(userId)}**!`);

    const playerDice1 = Math.floor(Math.random() * 6) + 1;
    const playerDice2 = Math.floor(Math.random() * 6) + 1;
    const botDice1 = Math.floor(Math.random() * 6) + 1;
    const botDice2 = Math.floor(Math.random() * 6) + 1;

    const playerTotal = playerDice1 + playerDice2;
    const botTotal = botDice1 + botDice2;

    const diceEmojis = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

    let resultText, color, winAmount;

    if (playerTotal > botTotal) {
      winAmount = playerDice1 === playerDice2 ? amount * 2 : amount;
      db.updateBalance(userId, winAmount);
      resultText = playerDice1 === playerDice2
        ? `PASCH! Doppelter Gewinn! **+${config.currencySymbol}${winAmount}**`
        : `Du gewinnst! **+${config.currencySymbol}${winAmount}**`;
      color = '#2ecc71';
    } else if (playerTotal < botTotal) {
      winAmount = -amount;
      db.updateBalance(userId, -amount);
      resultText = `Du verlierst! **-${config.currencySymbol}${amount}**`;
      color = '#e74c3c';
    } else {
      winAmount = 0;
      resultText = 'Unentschieden! Einsatz zurück.';
      color = '#f39c12';
    }

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle('🎲 Würfelspiel')
      .addFields(
        { name: `${message.author.username}`, value: `${diceEmojis[playerDice1]} ${diceEmojis[playerDice2]} = **${playerTotal}**`, inline: true },
        { name: 'Bot', value: `${diceEmojis[botDice1]} ${diceEmojis[botDice2]} = **${botTotal}**`, inline: true },
      )
      .setDescription(resultText)
      .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
      .setTimestamp();

    message.reply({ embeds: [embed] });
  },
};
