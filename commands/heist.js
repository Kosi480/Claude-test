const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
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
  name: 'heist',
  aliases: ['überfall', 'raub'],
  description: 'Starte einen Gruppen-Überfall (!heist <Ort> — Orte: tankstelle/juwelier/bank/casino/zentralbank)',
  execute(message, args) {
    const userId = message.author.id;
    const config = require('../config.json');

    if (activeHeists.has(message.channel.id)) {
      const heist = activeHeists.get(message.channel.id);
      if (!heist.started && !heist.players.has(userId)) {
        const balance = db.getBalance(userId);
        if (balance < MIN_BET) {
          return message.reply(`❌ Du brauchst mindestens **${config.currencySymbol}${MIN_BET}** zum Mitmachen!`);
        }
        heist.players.set(userId, message.author.username);
        return message.reply(`🔫 **${message.author.username}** schließt sich dem Überfall an! (${heist.players.size} Räuber)`);
      }
      return message.reply('❌ Es läuft bereits ein Heist in diesem Channel!');
    }

    if (!args[0]) {
      const locList = locations.map(l =>
        `${l.emoji} **${l.name}** — Beute: ~${config.currencySymbol}${l.baseReward.toLocaleString()} | Schwierigkeit: ${Math.round((1 - l.difficulty) * 100)}%`
      ).join('\n');

      const embed = new EmbedBuilder()
        .setColor('#e74c3c')
        .setTitle('🏴‍☠️ Heist — Verfügbare Orte')
        .setDescription(locList + `\n\nStarte mit: \`${config.prefix}heist <Ort>\`\nMehr Spieler = höhere Erfolgschance!`)
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    const locName = args[0].toLowerCase();
    const location = locations.find(l => l.name.toLowerCase() === locName);
    if (!location) {
      return message.reply(`❌ Unbekannter Ort! Verfügbar: ${locations.map(l => l.name.toLowerCase()).join(', ')}`);
    }

    const balance = db.getBalance(userId);
    if (balance < MIN_BET) {
      return message.reply(`❌ Du brauchst mindestens **${config.currencySymbol}${MIN_BET}**!`);
    }

    const heist = {
      location,
      players: new Map([[userId, message.author.username]]),
      started: false,
    };
    activeHeists.set(message.channel.id, heist);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`heist_join_${message.channel.id}`).setLabel('Mitmachen').setStyle(ButtonStyle.Primary).setEmoji('🔫'),
      new ButtonBuilder().setCustomId(`heist_go_${message.channel.id}`).setLabel('LOS!').setStyle(ButtonStyle.Danger).setEmoji('🏴‍☠️'),
    );

    const embed = new EmbedBuilder()
      .setColor('#e74c3c')
      .setTitle(`🏴‍☠️ Heist — ${location.emoji} ${location.name}`)
      .setDescription(
        `**${message.author.username}** plant einen Überfall auf **${location.name}**!\n\n` +
        `Beute: ~**${config.currencySymbol}${location.baseReward.toLocaleString()}**\n` +
        `Einsatz: **${config.currencySymbol}${MIN_BET}** pro Person\n` +
        `Räuber: **1**\n\n` +
        `Tritt bei oder starte den Überfall!`
      )
      .setFooter({ text: '45 Sekunden zum Beitreten' })
      .setTimestamp();

    message.reply({ embeds: [embed], components: [row] }).then(msg => {
      const collector = msg.createMessageComponentCollector({ time: 45000 });

      collector.on('collect', (interaction) => {
        const heist = activeHeists.get(message.channel.id);
        if (!heist) return;

        if (interaction.customId === `heist_join_${message.channel.id}`) {
          if (heist.players.has(interaction.user.id)) {
            return interaction.reply({ content: '❌ Du bist schon dabei!', flags: 64 });
          }
          const bal = db.getBalance(interaction.user.id);
          if (bal < MIN_BET) {
            return interaction.reply({ content: `❌ Du brauchst ${config.currencySymbol}${MIN_BET}!`, flags: 64 });
          }
          heist.players.set(interaction.user.id, interaction.user.username);

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
          interaction.update({ embeds: [embed], components: [row] });

        } else if (interaction.customId === `heist_go_${message.channel.id}`) {
          if (interaction.user.id !== userId) {
            return interaction.reply({ content: '❌ Nur der Anführer kann starten!', flags: 64 });
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

            activeHeists.delete(message.channel.id);
            interaction.update({ embeds: [embed], components: [] });
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

            activeHeists.delete(message.channel.id);
            interaction.update({ embeds: [embed], components: [] });
          }
        }
      });

      collector.on('end', (_, reason) => {
        if (reason !== 'started') {
          activeHeists.delete(message.channel.id);
          msg.edit({ components: [] });
        }
      });
    });
  },
};
