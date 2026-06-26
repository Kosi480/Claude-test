const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const BASE_BANK_LIMIT = 10000;
const TRESOR_BONUS = 5000;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bank')
    .setDescription('Verwalte dein Bankkonto')
    .addSubcommand(sub =>
      sub.setName('info')
        .setDescription('Zeige deinen Kontostand und Bankstatus'))
    .addSubcommand(sub =>
      sub.setName('einzahlen')
        .setDescription('Geld in die Bank einzahlen')
        .addStringOption(opt =>
          opt.setName('betrag')
            .setDescription('Betrag zum Einzahlen (Zahl oder "all")')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('abheben')
        .setDescription('Geld von der Bank abheben')
        .addStringOption(opt =>
          opt.setName('betrag')
            .setDescription('Betrag zum Abheben (Zahl oder "all")')
            .setRequired(true))),
  async execute(interaction) {
    const userId = interaction.user.id;
    const config = require('../config.json');
    const sub = interaction.options.getSubcommand();

    if (sub === 'info') {
      const user = db.getUser(userId);
      const bankLimit = getBankLimit(userId);
      const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle('🏦 Bank')
        .addFields(
          { name: '👛 Bargeld', value: `${config.currencySymbol}${user.balance.toLocaleString()}`, inline: true },
          { name: '🏦 Bank', value: `${config.currencySymbol}${user.bank.toLocaleString()} / ${config.currencySymbol}${bankLimit.toLocaleString()}`, inline: true },
        )
        .setDescription(`\`/bank einzahlen\` — Geld einzahlen\n\`/bank abheben\` — Geld abheben`)
        .setTimestamp();
      return await interaction.reply({ embeds: [embed] });
    }

    const bankLimit = getBankLimit(userId);

    if (sub === 'einzahlen') {
      const user = db.getUser(userId);
      const betragStr = interaction.options.getString('betrag');
      let amount;
      if (betragStr === 'all' || betragStr === 'alles') {
        amount = Math.min(user.balance, bankLimit - user.bank);
      } else {
        amount = parseInt(betragStr);
      }

      if (!amount || amount <= 0) return await interaction.reply('❌ Bitte gib einen gültigen Betrag an!');
      if (user.balance < amount) return await interaction.reply(`❌ Du hast nur **${config.currencySymbol}${user.balance}** Bargeld!`);
      if (user.bank + amount > bankLimit) return await interaction.reply(`❌ Bank-Limit erreicht! Max: **${config.currencySymbol}${bankLimit}**. Kaufe einen Tresor für mehr Kapazität!`);

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
      await interaction.reply({ embeds: [embed] });

    } else if (sub === 'abheben') {
      const user = db.getUser(userId);
      const betragStr = interaction.options.getString('betrag');
      let amount;
      if (betragStr === 'all' || betragStr === 'alles') {
        amount = user.bank;
      } else {
        amount = parseInt(betragStr);
      }

      if (!amount || amount <= 0) return await interaction.reply('❌ Bitte gib einen gültigen Betrag an!');
      if (user.bank < amount) return await interaction.reply(`❌ Du hast nur **${config.currencySymbol}${user.bank}** in der Bank!`);

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
      await interaction.reply({ embeds: [embed] });
    }
  },
};

function getBankLimit(userId) {
  const inv = db.getInventory(userId);
  const tresorCount = inv.find(i => i.item_name === 'Tresor');
  return BASE_BANK_LIMIT + (tresorCount ? tresorCount.quantity * TRESOR_BONUS : 0);
}
