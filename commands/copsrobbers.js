const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const scenarios = [
  { scene: 'Die Polizei jagt dich durch die Gassen!', options: [
    { label: 'Über Zaun klettern', emoji: '🧗', successChance: 0.6, reward: 300, fail: 150 },
    { label: 'Im Müll verstecken', emoji: '🗑️', successChance: 0.7, reward: 200, fail: 100 },
    { label: 'Auto klauen & fliehen', emoji: '🚗', successChance: 0.35, reward: 600, fail: 300 },
  ]},
  { scene: 'Du brichst in ein Museum ein!', options: [
    { label: 'Laser umgehen', emoji: '🔴', successChance: 0.5, reward: 450, fail: 200 },
    { label: 'Wache bestechen', emoji: '💰', successChance: 0.55, reward: 350, fail: 180 },
    { label: 'Durch die Decke', emoji: '🕳️', successChance: 0.4, reward: 550, fail: 250 },
  ]},
  { scene: 'Ein Undercover-Cop hat dich erkannt!', options: [
    { label: 'Verkleidung', emoji: '🥸', successChance: 0.65, reward: 250, fail: 120 },
    { label: 'Weglaufen', emoji: '🏃', successChance: 0.5, reward: 350, fail: 170 },
    { label: 'Ablenkung werfen', emoji: '💣', successChance: 0.45, reward: 500, fail: 220 },
  ]},
  { scene: 'Du planst einen Juwelenraub!', options: [
    { label: 'Nachts einbrechen', emoji: '🌙', successChance: 0.55, reward: 400, fail: 200 },
    { label: 'Am hellichten Tag', emoji: '☀️', successChance: 0.3, reward: 700, fail: 350 },
    { label: 'Tunnel graben', emoji: '⛏️', successChance: 0.6, reward: 320, fail: 150 },
  ]},
];

const COOLDOWN = 3 * 60 * 1000;
const cooldowns = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('copsrobbers')
    .setDescription('Räuber vs Polizei — Wähle deine Fluchtroute! (3min CD)'),
  async execute(interaction) {
    const userId = interaction.user.id;
    const config = require('../config.json');

    const lastPlay = cooldowns.get(userId);
    if (lastPlay && Date.now() - lastPlay < COOLDOWN) {
      const remaining = Math.ceil((COOLDOWN - (Date.now() - lastPlay)) / 1000);
      return interaction.reply(`⏳ Du musst noch **${remaining}s** warten!`);
    }

    cooldowns.set(userId, Date.now());

    const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];

    const row = new ActionRowBuilder().addComponents(
      ...scenario.options.map((opt, i) =>
        new ButtonBuilder()
          .setCustomId(`cr_${i}_${userId}`)
          .setLabel(opt.label)
          .setStyle(ButtonStyle.Primary)
          .setEmoji(opt.emoji)
      )
    );

    const embed = new EmbedBuilder()
      .setColor('#e74c3c')
      .setTitle('🚔 Räuber vs Polizei')
      .setDescription(`**${scenario.scene}**\n\nWas tust du?`)
      .setFooter({ text: '15 Sekunden Zeit!' })
      .setTimestamp();

    const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
    const collector = msg.createMessageComponentCollector({ time: 15000 });

    collector.on('collect', (btnInteraction) => {
      if (btnInteraction.user.id !== userId) {
        return btnInteraction.reply({ content: '❌ Das ist nicht dein Spiel!', flags: 64 });
      }

      collector.stop();
      const idx = parseInt(btnInteraction.customId.split('_')[1]);
      const option = scenario.options[idx];
      const success = Math.random() < option.successChance;

      if (success) {
        db.updateBalance(userId, option.reward);
        const embed = new EmbedBuilder()
          .setColor('#2ecc71')
          .setTitle('🏃 Entkommen!')
          .setDescription(
            `${option.emoji} **${option.label}** — Erfolg!\n\n` +
            `Du bist entkommen und hast **${config.currencySymbol}${option.reward}** erbeutet!`
          )
          .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
          .setTimestamp();
        btnInteraction.update({ embeds: [embed], components: [] });
      } else {
        const actualFine = Math.min(option.fail, db.getBalance(userId));
        db.updateBalance(userId, -actualFine);
        const embed = new EmbedBuilder()
          .setColor('#e74c3c')
          .setTitle('🚔 Geschnappt!')
          .setDescription(
            `${option.emoji} **${option.label}** — Fehlgeschlagen!\n\n` +
            `Die Polizei hat dich erwischt! Strafe: **${config.currencySymbol}${actualFine}**`
          )
          .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
          .setTimestamp();
        btnInteraction.update({ embeds: [embed], components: [] });
      }
    });

    collector.on('end', (_, reason) => {
      if (reason === 'time') msg.edit({ components: [] });
    });
  },
};
