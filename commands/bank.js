const { EmbedBuilder } = require('discord.js');
const db = require('../database');

const BASE_BANK_LIMIT = 10000;
const TRESOR_BONUS = 5000;

module.exports = {
  name: 'bank',
  aliases: ['einzahlen', 'abheben'],
  description: 'Einzahlen oder Abheben: !bank einzahlen/abheben <Betrag>',
  execute(message, args) {
    const userId = message.author.id;
    const config = require('../config.json');

    if (!args.length) {
      const user = db.getUser(userId);
      const bankLimit = getBankLimit(userId);
      const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle('🏦 Bank')
        .addFields(
          { name: '👛 Bargeld', value: `${config.currencySymbol}${user.balance.toLocaleString()}`, inline: true },
          { name: '🏦 Bank', value: `${config.currencySymbol}${user.bank.toLocaleString()} / ${config.currencySymbol}${bankLimit.toLocaleString()}`, inline: true },
        )
        .setDescription(`\`${config.prefix}bank einzahlen <Betrag>\` — Geld einzahlen\n\`${config.prefix}bank abheben <Betrag>\` — Geld abheben\n\`${config.prefix}bank einzahlen all\` — Alles einzahlen`)
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    const action = args[0].toLowerCase();
    const bankLimit = getBankLimit(userId);

    if (action === 'einzahlen' || action === 'deposit') {
      const user = db.getUser(userId);
      let amount;
      if (args[1] === 'all' || args[1] === 'alles') {
        amount = Math.min(user.balance, bankLimit - user.bank);
      } else {
        amount = parseInt(args[1]);
      }

      if (!amount || amount <= 0) return message.reply('❌ Bitte gib einen gültigen Betrag an!');
      if (user.balance < amount) return message.reply(`❌ Du hast nur **${config.currencySymbol}${user.balance}** Bargeld!`);
      if (user.bank + amount > bankLimit) return message.reply(`❌ Bank-Limit erreicht! Max: **${config.currencySymbol}${bankLimit}**. Kaufe einen Tresor für mehr Kapazität!`);

      db.deposit(userId, amount);
      const updated = db.getUser(userId);

      const embed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle('🏦 Eingezahlt!')
        .setDescription(`**${config.currencySymbol}${amount}** wurden eingezahlt.`)
        .addFields(
          { name: '👛 Bargeld', value: `${config.currencySymbol}${updated.balance.toLocaleString()}`, inline: true },
          { name: '🏦 Bank', value: `${config.currencySymbol}${updated.bank.toLocaleString()}`, inline: true },
        )
        .setTimestamp();
      message.reply({ embeds: [embed] });

    } else if (action === 'abheben' || action === 'withdraw') {
      const user = db.getUser(userId);
      let amount;
      if (args[1] === 'all' || args[1] === 'alles') {
        amount = user.bank;
      } else {
        amount = parseInt(args[1]);
      }

      if (!amount || amount <= 0) return message.reply('❌ Bitte gib einen gültigen Betrag an!');
      if (user.bank < amount) return message.reply(`❌ Du hast nur **${config.currencySymbol}${user.bank}** in der Bank!`);

      db.withdraw(userId, amount);
      const updated = db.getUser(userId);

      const embed = new EmbedBuilder()
        .setColor('#e67e22')
        .setTitle('🏦 Abgehoben!')
        .setDescription(`**${config.currencySymbol}${amount}** wurden abgehoben.`)
        .addFields(
          { name: '👛 Bargeld', value: `${config.currencySymbol}${updated.balance.toLocaleString()}`, inline: true },
          { name: '🏦 Bank', value: `${config.currencySymbol}${updated.bank.toLocaleString()}`, inline: true },
        )
        .setTimestamp();
      message.reply({ embeds: [embed] });
    } else {
      message.reply(`❌ Unbekannte Aktion! Nutze \`${config.prefix}bank einzahlen/abheben <Betrag>\``);
    }
  },
};

function getBankLimit(userId) {
  const inv = db.getInventory(userId);
  const tresorCount = inv.find(i => i.item_name === 'Tresor');
  return BASE_BANK_LIMIT + (tresorCount ? tresorCount.quantity * TRESOR_BONUS : 0);
}
