const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database');

const activeGames = new Map();

module.exports = {
  name: 'russianroulette',
  aliases: ['rr', 'russisch'],
  description: 'Spiele Russisches Roulette mit bis zu 6 Spielern (!rr <Betrag>)',
  execute(message, args) {
    const userId = message.author.id;
    const config = require('../config.json');

    if (activeGames.has(message.channel.id)) {
      const game = activeGames.get(message.channel.id);
      if (!game.started && !game.players.has(userId)) {
        const balance = db.getBalance(userId);
        if (balance < game.bet) {
          return message.reply(`❌ Du brauchst **${config.currencySymbol}${game.bet}** zum Mitspielen!`);
        }
        game.players.set(userId, message.author.username);
        return message.reply(`🔫 **${message.author.username}** tritt bei! (${game.players.size}/6 Spieler)`);
      }
      return message.reply('❌ Es läuft bereits ein Spiel in diesem Channel!');
    }

    if (!args[0]) return message.reply(`❌ Nutzung: \`${config.prefix}rr <Betrag>\` — Andere treten mit \`${config.prefix}rr\` bei`);

    const bet = parseInt(args[0]);
    if (!bet || bet <= 0) return message.reply('❌ Ungültiger Betrag!');
    if (bet > db.getBalance(userId)) return message.reply(`❌ Du hast nur **${config.currencySymbol}${db.getBalance(userId)}**!`);

    const game = {
      bet,
      players: new Map([[userId, message.author.username]]),
      started: false,
    };
    activeGames.set(message.channel.id, game);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`rr_join_${message.channel.id}`).setLabel('Beitreten').setStyle(ButtonStyle.Primary).setEmoji('🔫'),
      new ButtonBuilder().setCustomId(`rr_start_${message.channel.id}`).setLabel('Starten (2+ Spieler)').setStyle(ButtonStyle.Success).setEmoji('💀'),
    );

    const embed = new EmbedBuilder()
      .setColor('#e74c3c')
      .setTitle('🔫 Russisches Roulette')
      .setDescription(
        `**${message.author.username}** startet eine Runde!\n\n` +
        `Einsatz: **${config.currencySymbol}${bet}** pro Spieler\n` +
        `Spieler: **1/6**\n\n` +
        `Tritt bei oder starte das Spiel!`
      )
      .setFooter({ text: '60 Sekunden zum Beitreten' })
      .setTimestamp();

    message.reply({ embeds: [embed], components: [row] }).then(msg => {
      const collector = msg.createMessageComponentCollector({ time: 60000 });

      collector.on('collect', (interaction) => {
        const game = activeGames.get(message.channel.id);
        if (!game) return;

        if (interaction.customId === `rr_join_${message.channel.id}`) {
          if (game.players.has(interaction.user.id)) {
            return interaction.reply({ content: '❌ Du bist schon dabei!', flags: 64 });
          }
          if (game.players.size >= 6) {
            return interaction.reply({ content: '❌ Spiel ist voll (6/6)!', flags: 64 });
          }
          const balance = db.getBalance(interaction.user.id);
          if (balance < game.bet) {
            return interaction.reply({ content: `❌ Du brauchst ${config.currencySymbol}${game.bet}!`, flags: 64 });
          }
          game.players.set(interaction.user.id, interaction.user.username);

          const embed = new EmbedBuilder()
            .setColor('#e74c3c')
            .setTitle('🔫 Russisches Roulette')
            .setDescription(
              `Einsatz: **${config.currencySymbol}${game.bet}** pro Spieler\n` +
              `Spieler: **${game.players.size}/6**\n\n` +
              [...game.players.values()].map(n => `🔹 ${n}`).join('\n')
            )
            .setTimestamp();
          interaction.update({ embeds: [embed], components: [row] });

        } else if (interaction.customId === `rr_start_${message.channel.id}`) {
          if (interaction.user.id !== userId) {
            return interaction.reply({ content: '❌ Nur der Ersteller kann starten!', flags: 64 });
          }
          if (game.players.size < 2) {
            return interaction.reply({ content: '❌ Mindestens 2 Spieler nötig!', flags: 64 });
          }

          collector.stop('started');
          game.started = true;

          const playerIds = [...game.players.keys()];
          for (const pid of playerIds) {
            if (db.getBalance(pid) < game.bet) {
              activeGames.delete(message.channel.id);
              return interaction.update({ content: '❌ Ein Spieler hat nicht mehr genug Geld!', embeds: [], components: [] });
            }
          }

          const loserIdx = Math.floor(Math.random() * playerIds.length);
          const loserId = playerIds[loserIdx];
          const loserName = game.players.get(loserId);

          const totalPot = game.bet * playerIds.length;
          const winShare = Math.floor(totalPot / (playerIds.length - 1));

          for (const pid of playerIds) {
            if (pid === loserId) {
              db.updateBalance(pid, -game.bet);
            } else {
              db.updateBalance(pid, winShare - game.bet);
            }
          }

          const chambers = playerIds.map((pid, i) => {
            if (i < loserIdx) return `🔹 ${game.players.get(pid)} — *klick* ... überlebt!`;
            if (i === loserIdx) return `💀 **${game.players.get(pid)}** — 💥 BANG!`;
            return `⬜ ${game.players.get(pid)}`;
          });

          const embed = new EmbedBuilder()
            .setColor('#e74c3c')
            .setTitle('🔫 Russisches Roulette — Ergebnis')
            .setDescription(
              chambers.join('\n') +
              `\n\n💀 **${loserName}** hat verloren und **${config.currencySymbol}${game.bet}** bezahlt!\n` +
              `Die anderen teilen sich den Pot (**${config.currencySymbol}${winShare}** je Spieler).`
            )
            .setTimestamp();

          activeGames.delete(message.channel.id);
          interaction.update({ embeds: [embed], components: [] });
        }
      });

      collector.on('end', (_, reason) => {
        if (reason !== 'started') {
          activeGames.delete(message.channel.id);
          msg.edit({ components: [] });
        }
      });
    });
  },
};
