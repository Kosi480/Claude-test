const { EmbedBuilder } = require('discord.js');
const db = require('../database');

const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

module.exports = {
  name: 'roulette',
  aliases: ['rlt'],
  description: 'Spiele Roulette (!roulette <Betrag> <rot/schwarz/gerade/ungerade/Zahl>)',
  execute(message, args) {
    const userId = message.author.id;
    const config = require('../config.json');

    if (args.length < 2) {
      return message.reply(`❌ Nutzung: \`${config.prefix}roulette <Betrag> <rot/schwarz/gerade/ungerade/0-36>\``);
    }

    let amount;
    if (args[0] === 'all' || args[0] === 'alles') {
      amount = db.getBalance(userId);
    } else {
      amount = parseInt(args[0]);
    }

    if (!amount || amount <= 0) return message.reply('❌ Ungültiger Betrag!');
    if (amount > db.getBalance(userId)) return message.reply(`❌ Du hast nur **${config.currencySymbol}${db.getBalance(userId)}**!`);

    const bet = args[1].toLowerCase();
    const result = Math.floor(Math.random() * 37);
    const isRed = redNumbers.includes(result);
    const isBlack = result !== 0 && !isRed;
    const isEven = result !== 0 && result % 2 === 0;
    const isOdd = result !== 0 && result % 2 !== 0;

    let color, colorEmoji;
    if (result === 0) { color = 'grün'; colorEmoji = '🟢'; }
    else if (isRed) { color = 'rot'; colorEmoji = '🔴'; }
    else { color = 'schwarz'; colorEmoji = '⚫'; }

    let won = false;
    let multiplier = 0;
    let betDisplay = '';

    const betNum = parseInt(bet);
    if (!isNaN(betNum) && betNum >= 0 && betNum <= 36) {
      won = result === betNum;
      multiplier = 35;
      betDisplay = `Zahl ${betNum}`;
    } else if (['rot', 'red', 'r'].includes(bet)) {
      won = isRed;
      multiplier = 1;
      betDisplay = '🔴 Rot';
    } else if (['schwarz', 'black', 's'].includes(bet)) {
      won = isBlack;
      multiplier = 1;
      betDisplay = '⚫ Schwarz';
    } else if (['gerade', 'even', 'g'].includes(bet)) {
      won = isEven;
      multiplier = 1;
      betDisplay = 'Gerade';
    } else if (['ungerade', 'odd', 'u'].includes(bet)) {
      won = isOdd;
      multiplier = 1;
      betDisplay = 'Ungerade';
    } else {
      return message.reply('❌ Ungültige Wette! Optionen: `rot`, `schwarz`, `gerade`, `ungerade`, oder `0-36`');
    }

    const winAmount = won ? amount * multiplier : -amount;
    db.updateBalance(userId, winAmount);

    const embed = new EmbedBuilder()
      .setColor(won ? '#2ecc71' : '#e74c3c')
      .setTitle('🎡 Roulette')
      .setDescription(
        `Die Kugel landet auf... ${colorEmoji} **${result}** (${color})!\n\n` +
        `Deine Wette: **${betDisplay}**\n` +
        (won
          ? `Du gewinnst! **+${config.currencySymbol}${(amount * multiplier).toLocaleString()}**`
          : `Du verlierst! **-${config.currencySymbol}${amount.toLocaleString()}**`)
      )
      .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
      .setTimestamp();

    message.reply({ embeds: [embed] });
  },
};
