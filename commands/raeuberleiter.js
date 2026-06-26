const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database');

const TRACK_LENGTH = 30;
const BET_AMOUNT = 200;
const COOLDOWN = 3 * 60 * 1000;
const cooldowns = new Map();

const events = [
  { emoji: '🍄', text: 'findet einen Pilz und rutscht aus!', effect: -3 },
  { emoji: '⚡', text: 'wird vom Blitz getroffen!', effect: -5 },
  { emoji: '🌟', text: 'findet einen Stern und springt vorwärts!', effect: 4 },
  { emoji: '🎁', text: 'findet ein Geschenk!', effect: 3 },
  { emoji: '🕳️', text: 'fällt in ein Loch!', effect: -4 },
  { emoji: '🚀', text: 'findet eine Rakete!', effect: 6 },
  { emoji: '🐌', text: 'tritt auf eine Schnecke und wird langsam...', effect: -2 },
  { emoji: '💨', text: 'bekommt Rückenwind!', effect: 3 },
];

module.exports = {
  name: 'raeuberleiter',
  aliases: ['rennenspiel', 'race', 'wettrennen'],
  description: `Wettrennen gegen andere Spieler! (!raeuberleiter, ${BET_AMOUNT}$ Einsatz, 3min CD)`,
  execute(message) {
    const userId = message.author.id;
    const config = require('../config.json');

    const lastPlay = cooldowns.get(userId);
    if (lastPlay && Date.now() - lastPlay < COOLDOWN) {
      const remaining = Math.ceil((COOLDOWN - (Date.now() - lastPlay)) / 1000);
      return message.reply(`⏳ Du musst noch **${remaining}s** warten!`);
    }

    if (db.getBalance(userId) < BET_AMOUNT) {
      return message.reply(`❌ Du brauchst mindestens **${config.currencySymbol}${BET_AMOUNT}** zum Mitspielen!`);
    }

    const players = new Map();
    players.set(userId, { name: message.author.username, position: 0, emoji: '🔴' });

    const playerEmojis = ['🔴', '🔵', '🟢', '🟡'];

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`race_join_${userId}`)
        .setLabel(`Mitmachen (${config.currencySymbol}${BET_AMOUNT})`)
        .setStyle(ButtonStyle.Success)
        .setEmoji('🏁'),
      new ButtonBuilder()
        .setCustomId(`race_start_${userId}`)
        .setLabel('Rennen starten!')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🚀')
    );

    const embed = new EmbedBuilder()
      .setColor('#3498db')
      .setTitle('🏁 Wettrennen!')
      .setDescription(
        `**${message.author.username}** startet ein Wettrennen!\n\n` +
        `Einsatz: **${config.currencySymbol}${BET_AMOUNT}** pro Spieler\n` +
        `Spieler: **1/4**\n\n` +
        `Klicke "Mitmachen" um teilzunehmen!`
      )
      .setFooter({ text: '30s zum Beitreten | Min. 2 Spieler' })
      .setTimestamp();

    message.reply({ embeds: [embed], components: [row] }).then(msg => {
      const collector = msg.createMessageComponentCollector({ time: 30000 });

      collector.on('collect', (interaction) => {
        if (interaction.customId === `race_join_${userId}`) {
          if (players.has(interaction.user.id)) {
            return interaction.reply({ content: '❌ Du bist schon dabei!', flags: 64 });
          }
          if (players.size >= 4) {
            return interaction.reply({ content: '❌ Rennen ist voll (max 4)!', flags: 64 });
          }
          if (db.getBalance(interaction.user.id) < BET_AMOUNT) {
            return interaction.reply({ content: `❌ Du brauchst ${config.currencySymbol}${BET_AMOUNT}!`, flags: 64 });
          }

          players.set(interaction.user.id, {
            name: interaction.user.username,
            position: 0,
            emoji: playerEmojis[players.size],
          });

          const embed = new EmbedBuilder()
            .setColor('#3498db')
            .setTitle('🏁 Wettrennen!')
            .setDescription(
              `Einsatz: **${config.currencySymbol}${BET_AMOUNT}** pro Spieler\n` +
              `Spieler: **${players.size}/4**\n\n` +
              [...players.values()].map(p => `${p.emoji} ${p.name}`).join('\n')
            )
            .setFooter({ text: '30s zum Beitreten | Min. 2 Spieler' })
            .setTimestamp();

          interaction.update({ embeds: [embed], components: [row] });
          return;
        }

        if (interaction.customId === `race_start_${userId}`) {
          if (interaction.user.id !== userId) {
            return interaction.reply({ content: '❌ Nur der Ersteller kann starten!', flags: 64 });
          }
          if (players.size < 2) {
            return interaction.reply({ content: '❌ Mindestens 2 Spieler benötigt!', flags: 64 });
          }

          collector.stop('started');

          for (const [pid] of players) {
            db.updateBalance(pid, -BET_AMOUNT);
            cooldowns.set(pid, Date.now());
          }

          const pot = BET_AMOUNT * players.size;

          const buildTrack = () => {
            return [...players.values()].map(p => {
              const pos = Math.min(p.position, TRACK_LENGTH);
              const before = '░'.repeat(pos);
              const after = '░'.repeat(Math.max(TRACK_LENGTH - pos, 0));
              return `${p.emoji} \`${before}${p.emoji}${after}\` **${pos}/${TRACK_LENGTH}**`;
            }).join('\n');
          };

          const raceEmbed = new EmbedBuilder()
            .setColor('#f39c12')
            .setTitle('🏁 Rennen läuft!')
            .setDescription(`Preisgeld: **${config.currencySymbol}${pot}**\n\n${buildTrack()}`)
            .setTimestamp();

          interaction.update({ embeds: [raceEmbed], components: [] }).then(() => {
            let round = 0;
            const log = [];

            const interval = setInterval(() => {
              round++;
              let winner = null;

              for (const [pid, player] of players) {
                const roll = Math.floor(Math.random() * 6) + 1;
                player.position += roll;

                if (Math.random() < 0.2) {
                  const event = events[Math.floor(Math.random() * events.length)];
                  player.position = Math.max(0, player.position + event.effect);
                  log.push(`${event.emoji} **${player.name}** ${event.text} (${event.effect > 0 ? '+' : ''}${event.effect})`);
                }

                if (player.position >= TRACK_LENGTH && !winner) {
                  winner = { id: pid, ...player };
                }
              }

              if (winner || round >= 15) {
                clearInterval(interval);

                if (!winner) {
                  let maxPos = -1;
                  for (const [pid, player] of players) {
                    if (player.position > maxPos) {
                      maxPos = player.position;
                      winner = { id: pid, ...player };
                    }
                  }
                }

                db.updateBalance(winner.id, pot);

                const embed = new EmbedBuilder()
                  .setColor('#FFD700')
                  .setTitle(`🏆 ${winner.name} gewinnt!`)
                  .setDescription(
                    `${buildTrack()}\n\n` +
                    (log.length > 0 ? `**Events:**\n${log.slice(-5).join('\n')}\n\n` : '') +
                    `**${winner.emoji} ${winner.name}** gewinnt **${config.currencySymbol}${pot}**!`
                  )
                  .setTimestamp();

                msg.edit({ embeds: [embed] });
                return;
              }

              const embed = new EmbedBuilder()
                .setColor('#f39c12')
                .setTitle(`🏁 Runde ${round}`)
                .setDescription(
                  `Preisgeld: **${config.currencySymbol}${pot}**\n\n${buildTrack()}` +
                  (log.length > 0 ? `\n\n${log.slice(-3).join('\n')}` : '')
                )
                .setTimestamp();

              msg.edit({ embeds: [embed] }).catch(() => {});
            }, 2000);
          });
        }
      });

      collector.on('end', (_, reason) => {
        if (reason === 'time') msg.edit({ components: [] });
      });
    });
  },
};
