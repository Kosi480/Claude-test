const { EmbedBuilder } = require('discord.js');
const db = require('../database');

module.exports = {
  name: 'coinflip',
  aliases: ['cf', 'münze', 'flip'],
  description: 'Wirf eine Münze und wette Geld',
  execute(message, args) {
    const userId = message.author.id;
    const config = require('../config.json');

    if (!args[0]) return message.reply(`❌ Nutzung: \`${config.prefix}coinflip <Betrag> [kopf/zahl]\``);

    let amount;
    if (args[0] === 'all' || args[0] === 'alles') {
      amount = db.getBalance(userId);
    } else {
      amount = parseInt(args[0]);
    }

    if (!amount || amount <= 0) return message.reply('❌ Bitte gib einen gültigen Betrag an!');
    if (amount > db.getBalance(userId)) return message.reply(`❌ Du hast nur **${config.currencySymbol}${db.getBalance(userId)}**!`);

    const choice = (args[1] || 'kopf').toLowerCase();
    if (!['kopf', 'zahl', 'heads', 'tails'].includes(choice)) {
      return message.reply('❌ Wähle **kopf** oder **zahl**!');
    }

    const isHeads = Math.random() < 0.5;
    const result = isHeads ? 'kopf' : 'zahl';
    const userChoseHeads = ['kopf', 'heads'].includes(choice);
    const won = (isHeads && userChoseHeads) || (!isHeads && !userChoseHeads);

    if (won) {
      db.updateBalance(userId, amount);
    } else {
      db.updateBalance(userId, -amount);
    }

    const embed = new EmbedBuilder()
      .setColor(won ? '#2ecc71' : '#e74c3c')
      .setTitle(`🪙 Münzwurf — ${result.charAt(0).toUpperCase() + result.slice(1)}!`)
      .setDescription(won
        ? `Du hast gewonnen! **+${config.currencySymbol}${amount}**`
        : `Du hast verloren! **-${config.currencySymbol}${amount}**`)
      .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
      .setTimestamp();

    message.reply({ embeds: [embed] });
  },
};
