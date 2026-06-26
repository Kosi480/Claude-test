const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('Wirf eine Münze und wette Geld')
    .addStringOption(opt => opt.setName('betrag').setDescription('Einsatz (Zahl oder "alles")').setRequired(true))
    .addStringOption(opt => opt.setName('seite').setDescription('Kopf oder Zahl').setRequired(false)),
  async execute(interaction) {
    const userId = interaction.user.id;
    const config = require('../config.json');

    const betragStr = interaction.options.getString('betrag');
    let amount;
    if (betragStr === 'all' || betragStr === 'alles') {
      amount = db.getBalance(userId);
    } else {
      amount = parseInt(betragStr);
    }

    if (!amount || amount <= 0) return interaction.reply('❌ Bitte gib einen gültigen Betrag an!');
    if (amount > db.getBalance(userId)) return interaction.reply(`❌ Du hast nur **${config.currencySymbol}${db.getBalance(userId)}**!`);

    const choice = (interaction.options.getString('seite') || 'kopf').toLowerCase();
    if (!['kopf', 'zahl', 'heads', 'tails'].includes(choice)) {
      return interaction.reply('❌ Wähle **kopf** oder **zahl**!');
    }

    try { require('./quest').trackProgress(userId, 'gamble'); } catch (_) {}
    const isHeads = Math.random() < 0.5;
    const result = isHeads ? 'kopf' : 'zahl';
    const userChoseHeads = ['kopf', 'heads'].includes(choice);
    const won = (isHeads && userChoseHeads) || (!isHeads && !userChoseHeads);

    if (won) {
      db.updateBalance(userId, amount);
      try { require('./achievements').incrementStat(userId, 'gamble_wins'); } catch (_) {}
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

    await interaction.reply({ embeds: [embed] });
  },
};
