const { EmbedBuilder } = require('discord.js');
const db = require('../database');

module.exports = {
  name: 'pay',
  aliases: ['give', 'überweisen', 'geben'],
  description: 'Überweise Geld an einen anderen Spieler',
  execute(message, args) {
    const target = message.mentions.users.first();
    const config = require('../config.json');

    if (!target) return message.reply('❌ Du musst jemanden erwähnen! `!pay @user <Betrag>`');
    if (target.id === message.author.id) return message.reply('❌ Du kannst dir nicht selbst Geld senden!');
    if (target.bot) return message.reply('❌ Du kannst keinem Bot Geld senden!');

    const amountStr = args.find(a => !a.startsWith('<@'));
    if (!amountStr) return message.reply('❌ Bitte gib einen Betrag an! `!pay @user <Betrag>`');

    let amount;
    if (amountStr === 'all' || amountStr === 'alles') {
      amount = db.getBalance(message.author.id);
    } else {
      amount = parseInt(amountStr);
    }

    if (!amount || amount <= 0) return message.reply('❌ Bitte gib einen gültigen Betrag an!');

    const balance = db.getBalance(message.author.id);
    if (balance < amount) return message.reply(`❌ Du hast nur **${config.currencySymbol}${balance}**!`);

    db.updateBalance(message.author.id, -amount);
    db.updateBalance(target.id, amount);

    const embed = new EmbedBuilder()
      .setColor('#2ecc71')
      .setTitle('💸 Überweisung')
      .setDescription(`**${message.author.username}** hat **${config.currencySymbol}${amount.toLocaleString()}** an **${target.username}** überwiesen!`)
      .addFields(
        { name: 'Dein Guthaben', value: `${config.currencySymbol}${db.getBalance(message.author.id).toLocaleString()}`, inline: true },
      )
      .setTimestamp();

    message.reply({ embeds: [embed] });
  },
};
