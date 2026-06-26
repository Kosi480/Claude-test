const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const COOLDOWN = 30 * 1000;
const cooldowns = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reaction')
    .setDescription('Reaktions-Spiel — Klicke so schnell wie möglich! (30s CD)'),
  async execute(interaction) {
    const userId = interaction.user.id;
    const config = require('../config.json');

    const lastPlay = cooldowns.get(userId);
    if (lastPlay && Date.now() - lastPlay < COOLDOWN) {
      const remaining = Math.ceil((COOLDOWN - (Date.now() - lastPlay)) / 1000);
      return interaction.reply(`⏳ Du musst noch **${remaining}s** warten!`);
    }

    cooldowns.set(userId, Date.now());

    const embed = new EmbedBuilder()
      .setColor('#e74c3c')
      .setTitle('⏱️ Reaktions-Test')
      .setDescription('Warte auf das Signal...\n\n**NOCH NICHT KLICKEN!**')
      .setTimestamp();

    const msg = await interaction.reply({ embeds: [embed], fetchReply: true });
    const delay = Math.floor(Math.random() * 4000) + 1500;

    setTimeout(() => {
      const startTime = Date.now();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`react_now_${userId}`)
          .setLabel('JETZT!')
          .setStyle(ButtonStyle.Success)
          .setEmoji('⚡')
      );

      const goEmbed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle('⚡ JETZT KLICKEN!')
        .setDescription('Klicke so schnell wie möglich!')
        .setTimestamp();

      msg.edit({ embeds: [goEmbed], components: [row] }).then(() => {
        const collector = msg.createMessageComponentCollector({ time: 5000 });

        collector.on('collect', (btnInteraction) => {
          if (btnInteraction.user.id !== userId) {
            return btnInteraction.reply({ content: '❌ Das ist nicht dein Spiel!', flags: 64 });
          }

          collector.stop();
          const reactionTime = Date.now() - startTime;

          let reward, tier, color;
          if (reactionTime < 300) {
            reward = 500; tier = 'BLITZSCHNELL'; color = '#FFD700';
          } else if (reactionTime < 500) {
            reward = 300; tier = 'Sehr schnell'; color = '#2ecc71';
          } else if (reactionTime < 1000) {
            reward = 150; tier = 'Schnell'; color = '#3498db';
          } else if (reactionTime < 2000) {
            reward = 75; tier = 'OK'; color = '#f39c12';
          } else {
            reward = 25; tier = 'Langsam'; color = '#e74c3c';
          }

          db.updateBalance(userId, reward);

          const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle(`⏱️ ${tier}!`)
            .setDescription(
              `Reaktionszeit: **${reactionTime}ms**\n` +
              `Belohnung: **${config.currencySymbol}${reward}**`
            )
            .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
            .setTimestamp();

          btnInteraction.update({ embeds: [embed], components: [] });
        });

        collector.on('end', (collected) => {
          if (collected.size === 0) {
            const embed = new EmbedBuilder()
              .setColor('#95a5a6')
              .setTitle('⏱️ Zu langsam!')
              .setDescription('Du hast nicht rechtzeitig geklickt!')
              .setTimestamp();
            msg.edit({ embeds: [embed], components: [] });
          }
        });
      });
    }, delay);
  },
};
