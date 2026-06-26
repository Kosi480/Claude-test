const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dice')
    .setDescription('Würfle gegen den Bot')
    .addStringOption(opt => opt.setName('betrag').setDescription('Einsatz (Zahl oder "alles")').setRequired(true)),
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

    if (!amount || amount <= 0) return interaction.reply('❌ Ungültiger Betrag!');
    if (amount > db.getBalance(userId)) return interaction.reply(`❌ Du hast nur **${config.currencySymbol}${db.getBalance(userId)}**!`);

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
        { name: `${interaction.user.username}`, value: `${diceEmojis[playerDice1]} ${diceEmojis[playerDice2]} = **${playerTotal}**`, inline: true },
        { name: 'Bot', value: `${diceEmojis[botDice1]} ${diceEmojis[botDice2]} = **${botTotal}**`, inline: true },
      )
      .setDescription(resultText)
      .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
