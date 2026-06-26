const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const horses = [
  { name: 'Blitz', emoji: '🐎', color: '🔴', speed: 1.0 },
  { name: 'Donner', emoji: '🏇', color: '🔵', speed: 0.95 },
  { name: 'Schatten', emoji: '🐴', color: '🟢', speed: 1.05 },
  { name: 'Sturm', emoji: '🦄', color: '🟡', speed: 0.9 },
  { name: 'Rakete', emoji: '🐎', color: '🟣', speed: 1.1 },
];

const TRACK_LENGTH = 15;
const COOLDOWN = 45 * 1000;
const cooldowns = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('horserace')
    .setDescription('Wette auf ein Pferd im Rennen! (45s Cooldown)')
    .addStringOption(opt => opt.setName('betrag').setDescription('Einsatz (Zahl oder "alles")').setRequired(true)),
  async execute(interaction) {
    const userId = interaction.user.id;
    const config = require('../config.json');

    const lastPlay = cooldowns.get(userId);
    if (lastPlay && Date.now() - lastPlay < COOLDOWN) {
      const remaining = Math.ceil((COOLDOWN - (Date.now() - lastPlay)) / 1000);
      return interaction.reply(`⏳ Du musst noch **${remaining}s** warten!`);
    }

    const betragStr = interaction.options.getString('betrag');
    let amount;
    if (betragStr === 'all' || betragStr === 'alles') {
      amount = db.getBalance(userId);
    } else {
      amount = parseInt(betragStr);
    }

    if (!amount || amount <= 0) return interaction.reply('❌ Ungültiger Betrag!');
    if (amount > db.getBalance(userId)) return interaction.reply(`❌ Du hast nur **${config.currencySymbol}${db.getBalance(userId)}**!`);

    const rows = [];
    const row1 = new ActionRowBuilder();
    const row2 = new ActionRowBuilder();

    horses.forEach((horse, i) => {
      const btn = new ButtonBuilder()
        .setCustomId(`hr_${i}_${userId}`)
        .setLabel(`${horse.name}`)
        .setStyle(ButtonStyle.Primary)
        .setEmoji(horse.color);
      if (i < 3) row1.addComponents(btn);
      else row2.addComponents(btn);
    });

    rows.push(row1, row2);

    const oddsText = horses.map((h, i) => {
      const odds = (2.5 / h.speed).toFixed(1);
      return `${h.color} ${h.emoji} **${h.name}** — Quote: **${odds}x**`;
    }).join('\n');

    const embed = new EmbedBuilder()
      .setColor('#e67e22')
      .setTitle('🏇 Pferderennen')
      .setDescription(
        `Einsatz: **${config.currencySymbol}${amount.toLocaleString()}**\n\n` +
        `Wähle dein Pferd:\n${oddsText}`
      )
      .setFooter({ text: '15s zum Wählen' })
      .setTimestamp();

    const msg = await interaction.reply({ embeds: [embed], components: rows, fetchReply: true });
    const collector = msg.createMessageComponentCollector({ time: 15000 });

    collector.on('collect', (interaction) => {
      if (interaction.user.id !== userId) {
        return interaction.reply({ content: '❌ Das ist nicht dein Rennen!', flags: 64 });
      }

      collector.stop();
      cooldowns.set(userId, Date.now());

      const chosenIdx = parseInt(interaction.customId.split('_')[1]);
      const chosenHorse = horses[chosenIdx];
      const odds = parseFloat((2.5 / chosenHorse.speed).toFixed(1));

      const positions = horses.map(() => 0);

      const buildTrack = () => {
        return horses.map((h, i) => {
          const pos = positions[i];
          const trail = '▓'.repeat(pos);
          const remaining = '░'.repeat(Math.max(TRACK_LENGTH - pos, 0));
          const marker = i === chosenIdx ? '⭐' : '';
          return `${h.color} \`${trail}${h.emoji}${remaining}\` ${marker}`;
        }).join('\n');
      };

      const raceEmbed = new EmbedBuilder()
        .setColor('#f39c12')
        .setTitle('🏇 Das Rennen beginnt!')
        .setDescription(
          `Dein Pferd: ${chosenHorse.color} **${chosenHorse.name}** (${odds}x)\n\n${buildTrack()}`
        )
        .setTimestamp();

      interaction.update({ embeds: [raceEmbed], components: [] }).then(() => {
        let tick = 0;
        const interval = setInterval(() => {
          tick++;
          let winner = -1;

          for (let i = 0; i < horses.length; i++) {
            const advance = Math.random() * 2.5 * horses[i].speed;
            positions[i] = Math.min(positions[i] + Math.floor(advance + 0.5), TRACK_LENGTH);
            if (positions[i] >= TRACK_LENGTH && winner === -1) {
              winner = i;
            }
          }

          if (winner !== -1 || tick >= 20) {
            clearInterval(interval);

            if (winner === -1) {
              let maxPos = 0;
              for (let i = 0; i < positions.length; i++) {
                if (positions[i] > maxPos) { maxPos = positions[i]; winner = i; }
              }
            }

            const winHorse = horses[winner];
            const won = winner === chosenIdx;

            let resultText, color;
            if (won) {
              const winAmount = Math.floor(amount * odds);
              const profit = winAmount - amount;
              db.updateBalance(userId, profit);
              resultText = `${winHorse.color} **${winHorse.name}** gewinnt!\n\n` +
                `Du hast gewonnen! **+${config.currencySymbol}${profit.toLocaleString()}**`;
              color = '#2ecc71';
            } else {
              db.updateBalance(userId, -amount);
              resultText = `${winHorse.color} **${winHorse.name}** gewinnt!\n\n` +
                `Dein Pferd ${chosenHorse.color} **${chosenHorse.name}** hat verloren.\n` +
                `Verlust: **-${config.currencySymbol}${amount.toLocaleString()}**`;
              color = '#e74c3c';
            }

            const embed = new EmbedBuilder()
              .setColor(color)
              .setTitle('🏇 Rennergebnis')
              .setDescription(`${buildTrack()}\n\n${resultText}`)
              .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
              .setTimestamp();

            msg.edit({ embeds: [embed] });
            return;
          }

          const embed = new EmbedBuilder()
            .setColor('#f39c12')
            .setTitle('🏇 Rennen läuft...')
            .setDescription(
              `Dein Pferd: ${chosenHorse.color} **${chosenHorse.name}** (${odds}x)\n\n${buildTrack()}`
            )
            .setTimestamp();

          msg.edit({ embeds: [embed] }).catch(() => {});
        }, 1800);
      });
    });

    collector.on('end', (_, reason) => {
      if (reason === 'time') msg.edit({ components: [] });
    });
  },
};
