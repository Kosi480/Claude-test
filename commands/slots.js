const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
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
  data: new SlashCommandBuilder()
    .setName('slots')
    .setDescription('Spiele am Spielautomaten')
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

    if (!amount || amount <= 0) return interaction.reply('❌ Bitte gib einen gültigen Betrag an!');
    if (amount > db.getBalance(userId)) return interaction.reply(`❌ Du hast nur **${config.currencySymbol}${db.getBalance(userId)}**!`);

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

    await interaction.reply({ embeds: [embed] });
  },
};
