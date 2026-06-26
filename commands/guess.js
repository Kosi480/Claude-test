const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const REWARD = 300;
const COOLDOWN = 40 * 1000;
const cooldowns = new Map();
const activeGames = new Set();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('guess')
    .setDescription('Rate eine Zahl zwischen 1-100 (40s Cooldown, 5 Versuche)'),
  async execute(interaction) {
    const userId = interaction.user.id;
    const config = require('../config.json');

    if (activeGames.has(userId)) return interaction.reply('❌ Du hast bereits ein aktives Spiel!');

    const lastGame = cooldowns.get(userId);
    if (lastGame && Date.now() - lastGame < COOLDOWN) {
      const remaining = Math.ceil((COOLDOWN - (Date.now() - lastGame)) / 1000);
      return interaction.reply(`⏳ Du musst noch **${remaining}s** warten!`);
    }

    const secretNumber = Math.floor(Math.random() * 100) + 1;
    let attempts = 5;

    activeGames.add(userId);
    cooldowns.set(userId, Date.now());

    const embed = new EmbedBuilder()
      .setColor('#9b59b6')
      .setTitle('🔢 Zahlenraten')
      .setDescription(
        `Ich denke an eine Zahl zwischen **1** und **100**!\n\n` +
        `Du hast **${attempts} Versuche**.\n` +
        `Belohnung: **${config.currencySymbol}${REWARD}**\n\n` +
        `Schreibe eine Zahl in den Chat!`
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    const filter = m => m.author.id === userId && !isNaN(parseInt(m.content));
    const collector = interaction.channel.createMessageCollector({ filter, time: 30000, max: 5 });

    collector.on('collect', (msg) => {
      const guess = parseInt(msg.content);
      attempts--;

      if (guess === secretNumber) {
        collector.stop('won');
        activeGames.delete(userId);

        const bonusReward = REWARD + (attempts * 50);
        db.updateBalance(userId, bonusReward);

        const embed = new EmbedBuilder()
          .setColor('#2ecc71')
          .setTitle('🎉 Richtig!')
          .setDescription(
            `**${secretNumber}** war die Zahl!\n` +
            `Versuche übrig: **${attempts}** (+${attempts * 50} Bonus)\n` +
            `Gewinn: **${config.currencySymbol}${bonusReward}**`
          )
          .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
          .setTimestamp();

        msg.reply({ embeds: [embed] });
        return;
      }

      const hint = guess < secretNumber ? '⬆️ **Höher!**' : '⬇️ **Tiefer!**';

      if (attempts <= 0) {
        collector.stop('lost');
        return;
      }

      msg.reply(`${hint} (${attempts} Versuche übrig)`);
    });

    collector.on('end', (_, reason) => {
      activeGames.delete(userId);
      if (reason === 'time' || reason === 'lost') {
        const embed = new EmbedBuilder()
          .setColor('#e74c3c')
          .setTitle('🔢 Verloren!')
          .setDescription(`Die Zahl war **${secretNumber}**!`)
          .setTimestamp();

        interaction.channel.send({ embeds: [embed] });
      }
    });
  },
};
