const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const activeHeists = new Map();

const locations = [
  { name: 'Tankstelle', baseReward: 500, difficulty: 0.7, emoji: '⛽' },
  { name: 'Juwelier', baseReward: 1500, difficulty: 0.5, emoji: '💎' },
  { name: 'Bank', baseReward: 3000, difficulty: 0.35, emoji: '🏦' },
  { name: 'Casino-Tresor', baseReward: 5000, difficulty: 0.25, emoji: '🎰' },
  { name: 'Zentralbank', baseReward: 10000, difficulty: 0.15, emoji: '🏛️' },
];

const MIN_BET = 200;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('heist')
    .setDescription('Starte einen Gruppen-Ueberfall')
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('Zeige alle verfuegbaren Orte'))
    .addSubcommand(sub =>
      sub.setName('start')
        .setDescription('Starte einen Ueberfall an einem Ort')
        .addStringOption(opt =>
          opt.setName('ort')
            .setDescription('Name des Orts (z.B. Tankstelle, Juwelier, Bank)')
            .setRequired(true))),
  async execute(interaction) {
    const userId = interaction.user.id;
    const config = require('../config.json');
    const action = interaction.options.getSubcommand();

    if (action === 'list') {
      const locList = locations.map(l =>
        `${l.emoji} **${l.name}** — Beute: ~${config.currencySymbol}${l.baseReward.toLocaleString()} | Schwierigkeit: ${Math.round((1 - l.difficulty) * 100)}%`
      ).join('\n');

      const embed = new EmbedBuilder()
        .setColor('#e74c3c')
        .setTitle('🏴‍☠️ Heist — Verfügbare Orte')
        .setDescription(locList + `\n\nStarte mit: \`/heist start\`\nMehr Spieler = höhere Erfolgschance!`)
        .setTimestamp();
      return await interaction.reply({ embeds: [embed] });
    }

    // start subcommand
    if (activeHeists.has(interaction.channel.id)) {
      return await interaction.reply('❌ Es läuft bereits ein Heist in diesem Channel!');
    }

    const locName = interaction.options.getString('ort').toLowerCase();
    const location = locations.find(l => l.name.toLowerCase() === locName);
    if (!location) {
      return await interaction.reply(`❌ Unbekannter Ort! Verfügbar: ${locations.map(l => l.name.toLowerCase()).join(', ')}`);
    }

    const balance = db.getBalance(userId);
    if (balance < MIN_BET) {
      return await interaction.reply(`❌ Du brauchst mindestens **${config.currencySymbol}${MIN_BET}**!`);
    }

    const heist = {
      location,
      players: new Map([[userId, interaction.user.username]]),
      started: false,
    };
    activeHeists.set(interaction.channel.id, heist);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`heist_join_${interaction.channel.id}`).setLabel('Mitmachen').setStyle(ButtonStyle.Primary).setEmoji('🔫'),
      new ButtonBuilder().setCustomId(`heist_go_${interaction.channel.id}`).setLabel('LOS!').setStyle(ButtonStyle.Danger).setEmoji('🏴‍☠️'),
    );

    const embed = new EmbedBuilder()
      .setColor('#e74c3c')
      .setTitle(`🏴‍☠️ Heist — ${location.emoji} ${location.name}`)
      .setDescription(
        `**${interaction.user.username}** plant einen Überfall auf **${location.name}**!\n\n` +
        `Beute: ~**${config.currencySymbol}${location.baseReward.toLocaleString()}**\n` +
        `Einsatz: **${config.currencySymbol}${MIN_BET}** pro Person\n` +
        `Räuber: **1**\n\n` +
        `Tritt bei oder starte den Überfall!`
      )
      .setFooter({ text: '45 Sekunden zum Beitreten' })
      .setTimestamp();

    const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
    const collector = msg.createMessageComponentCollector({ time: 45000 });

    collector.on('collect', (btnInteraction) => {
      const heist = activeHeists.get(interaction.channel.id);
      if (!heist) return;

      if (btnInteraction.customId === `heist_join_${interaction.channel.id}`) {
        if (heist.players.has(btnInteraction.user.id)) {
          return btnInteraction.reply({ content: '❌ Du bist schon dabei!', flags: 64 });
        }
        const bal = db.getBalance(btnInteraction.user.id);
        if (bal < MIN_BET) {
          return btnInteraction.reply({ content: `❌ Du brauchst ${config.currencySymbol}${MIN_BET}!`, flags: 64 });
        }
        heist.players.set(btnInteraction.user.id, btnInteraction.user.username);

        const embed = new EmbedBuilder()
          .setColor('#e74c3c')
          .setTitle(`🏴‍☠️ Heist — ${location.emoji} ${location.name}`)
          .setDescription(
            `Beute: ~**${config.currencySymbol}${location.baseReward.toLocaleString()}**\n` +
            `Einsatz: **${config.currencySymbol}${MIN_BET}** pro Person\n` +
            `Räuber: **${heist.players.size}**\n\n` +
            [...heist.players.values()].map(n => `🔫 ${n}`).join('\n')
          )
          .setTimestamp();
        btnInteraction.update({ embeds: [embed], components: [row] });

      } else if (btnInteraction.customId === `heist_go_${interaction.channel.id}`) {
        if (btnInteraction.user.id !== userId) {
          return btnInteraction.reply({ content: '❌ Nur der Anführer kann starten!', flags: 64 });
        }

        collector.stop('started');
        heist.started = true;

        const playerCount = heist.players.size;
        const bonusChance = Math.min(0.3, (playerCount - 1) * 0.1);
        const successChance = Math.min(0.9, location.difficulty + bonusChance);
        const success = Math.random() < successChance;

        const playerIds = [...heist.players.keys()];
        const results = [];

        if (success) {
          const totalReward = Math.floor(location.baseReward * (1 + (playerCount - 1) * 0.3));
          const share = Math.floor(totalReward / playerCount);

          for (const pid of playerIds) {
            db.updateBalance(pid, share - MIN_BET);
            results.push(`✅ **${heist.players.get(pid)}** — +${config.currencySymbol}${(share - MIN_BET).toLocaleString()}`);
          }

          const embed = new EmbedBuilder()
            .setColor('#2ecc71')
            .setTitle(`🏴‍☠️ Heist ERFOLGREICH — ${location.emoji} ${location.name}`)
            .setDescription(
              `Der Überfall war ein Erfolg!\n` +
              `Gesamtbeute: **${config.currencySymbol}${totalReward.toLocaleString()}**\n\n` +
              results.join('\n')
            )
            .setTimestamp();

          activeHeists.delete(interaction.channel.id);
          btnInteraction.update({ embeds: [embed], components: [] });
        } else {
          for (const pid of playerIds) {
            db.updateBalance(pid, -MIN_BET);
            results.push(`❌ **${heist.players.get(pid)}** — -${config.currencySymbol}${MIN_BET}`);
          }

          const embed = new EmbedBuilder()
            .setColor('#e74c3c')
            .setTitle(`🏴‍☠️ Heist GESCHEITERT — ${location.emoji} ${location.name}`)
            .setDescription(
              `Der Überfall ist schiefgegangen! Alle verlieren ihren Einsatz.\n\n` +
              results.join('\n')
            )
            .setTimestamp();

          activeHeists.delete(interaction.channel.id);
          btnInteraction.update({ embeds: [embed], components: [] });
        }
      }
    });

    collector.on('end', (_, reason) => {
      if (reason !== 'started') {
        activeHeists.delete(interaction.channel.id);
        msg.edit({ components: [] });
      }
    });
  },
};
