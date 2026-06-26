const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pay')
    .setDescription('Überweise Geld an einen anderen Spieler')
    .addUserOption(opt => opt.setName('user').setDescription('Der Empfänger').setRequired(true))
    .addStringOption(opt => opt.setName('betrag').setDescription('Einsatz').setRequired(true)),
  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const config = require('../config.json');

    if (!target) return await interaction.reply('❌ Du musst jemanden erwähnen! `/pay @user <Betrag>`');
    if (target.id === interaction.user.id) return await interaction.reply('❌ Du kannst dir nicht selbst Geld senden!');
    if (target.bot) return await interaction.reply('❌ Du kannst keinem Bot Geld senden!');

    const amountStr = interaction.options.getString('betrag');
    if (!amountStr) return await interaction.reply('❌ Bitte gib einen Betrag an! `/pay @user <Betrag>`');

    let amount;
    if (amountStr === 'all' || amountStr === 'alles') {
      amount = db.getBalance(interaction.user.id);
    } else {
      amount = parseInt(amountStr);
    }

    if (!amount || amount <= 0) return await interaction.reply('❌ Bitte gib einen gültigen Betrag an!');

    const balance = db.getBalance(interaction.user.id);
    if (balance < amount) return await interaction.reply(`❌ Du hast nur **${config.currencySymbol}${balance}**!`);

    db.updateBalance(interaction.user.id, -amount);
    db.updateBalance(target.id, amount);

    const embed = new EmbedBuilder()
      .setColor('#2ecc71')
      .setTitle('💸 Überweisung')
      .setDescription(`**${interaction.user.username}** hat **${config.currencySymbol}${amount.toLocaleString()}** an **${target.username}** überwiesen!`)
      .addFields(
        { name: 'Dein Guthaben', value: `${config.currencySymbol}${db.getBalance(interaction.user.id).toLocaleString()}`, inline: true },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
