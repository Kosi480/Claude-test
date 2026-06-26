const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const COOLDOWN = 7 * 24 * 60 * 60 * 1000;
const WEEKLY_AMOUNT = 2500;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('weekly')
    .setDescription('Hole dir deine woechentliche Belohnung'),
  async execute(interaction) {
    const userId = interaction.user.id;
    const user = db.getUser(userId);
    const config = require('../config.json');

    if (user.last_weekly) {
      const lastWeekly = new Date(user.last_weekly);
      const diff = Date.now() - lastWeekly.getTime();
      if (diff < COOLDOWN) {
        const days = Math.floor((COOLDOWN - diff) / (1000 * 60 * 60 * 24));
        const hours = Math.floor(((COOLDOWN - diff) % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        return interaction.reply(`⏳ Du kannst deine wöchentliche Belohnung in **${days}d ${hours}h** wieder abholen!`);
      }
    }

    db.updateBalance(userId, WEEKLY_AMOUNT);
    db.setLastWeekly(userId);

    const embed = new EmbedBuilder()
      .setColor('#9b59b6')
      .setTitle('📅 Wöchentliche Belohnung')
      .setDescription(`Du hast **${config.currencySymbol}${WEEKLY_AMOUNT.toLocaleString()}** erhalten!`)
      .setFooter({ text: `Neues Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
