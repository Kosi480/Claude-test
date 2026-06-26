const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const COOLDOWN = 5 * 60 * 1000;
const cooldowns = new Map();

const events = [
  {
    category: '⚽ Sport',
    scenarios: [
      { q: 'Wer gewinnt das Fußballspiel?', options: ['🔴 Rot', '🔵 Blau', '🤝 Unentschieden'], odds: [2.1, 2.3, 3.5] },
      { q: 'Wie viele Tore fallen?', options: ['0-1 Tore', '2-3 Tore', '4+ Tore'], odds: [2.5, 1.8, 3.0] },
      { q: 'Wer gewinnt das Boxmatch?', options: ['🥊 Kämpfer A', '🥊 Kämpfer B', 'KO in R1'], odds: [1.9, 2.0, 5.0] },
    ],
  },
  {
    category: '🎲 Zufall',
    scenarios: [
      { q: 'Welche Farbe kommt beim Rad?', options: ['🔴 Rot', '⚫ Schwarz', '🟢 Grün'], odds: [1.8, 1.8, 8.0] },
      { q: 'Münzwurf: 10x werfen — Mehrheit?', options: ['Kopf (6+)', 'Zahl (6+)', 'Genau 5/5'], odds: [1.9, 1.9, 6.0] },
      { q: 'Welcher Würfel gewinnt?', options: ['🎲 Rot (W20)', '🎲 Blau (W12)', '🎲 Gold (W6)'], odds: [1.5, 2.5, 5.0] },
    ],
  },
  {
    category: '🏇 Rennen',
    scenarios: [
      { q: 'Welches Pferd gewinnt?', options: ['🐴 Blitz', '🐴 Donner', '🐴 Schatten'], odds: [2.0, 2.2, 3.0] },
      { q: 'Welcher Hund kommt zuerst?', options: ['🐕 Rex', '🐕 Bello', '🐕 Luna'], odds: [2.5, 1.8, 2.8] },
      { q: 'Welches Boot gewinnt?', options: ['⛵ Sturm', '⛵ Welle', '⛵ Wind'], odds: [2.2, 2.0, 2.5] },
    ],
  },
  {
    category: '🎭 Show',
    scenarios: [
      { q: 'Welcher Kandidat gewinnt die Show?', options: ['⭐ Anna', '⭐ Max', '⭐ Lena'], odds: [2.3, 2.0, 2.8] },
      { q: 'Welches Lied wird #1?', options: ['🎵 Pop-Hit', '🎵 Rock-Song', '🎵 Rap-Track'], odds: [1.9, 2.5, 3.0] },
      { q: 'Wer gewinnt das Kochduell?', options: ['👨‍🍳 Koch A', '👩‍🍳 Koch B', '🧑‍🍳 Koch C'], odds: [2.0, 2.2, 2.8] },
    ],
  },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tippspiel')
    .setDescription('Tippe auf simulierte Events und gewinne! (5min CD)')
    .addIntegerOption(opt =>
      opt.setName('einsatz')
        .setDescription('Dein Einsatz')
        .setRequired(true)
        .setMinValue(50)
        .setMaxValue(25000)),
  async execute(interaction) {
    const userId = interaction.user.id;
    const config = require('../config.json');

    const lastPlay = cooldowns.get(userId);
    if (lastPlay && Date.now() - lastPlay < COOLDOWN) {
      const remaining = Math.ceil((COOLDOWN - (Date.now() - lastPlay)) / 1000);
      return interaction.reply(`⏳ Du musst noch **${remaining}s** warten!`);
    }

    const bet = interaction.options.getInteger('einsatz');
    if (db.getBalance(userId) < bet) {
      return interaction.reply(`❌ Du brauchst **${config.currencySymbol}${bet.toLocaleString()}**!`);
    }

    cooldowns.set(userId, Date.now());
    db.updateBalance(userId, -bet);

    const category = events[Math.floor(Math.random() * events.length)];
    const scenario = category.scenarios[Math.floor(Math.random() * category.scenarios.length)];
    let answered = false;

    const buildEmbed = () => {
      return new EmbedBuilder()
        .setColor('#9b59b6')
        .setTitle(`${category.category} — Tippspiel`)
        .setDescription(
          `**${scenario.q}**\n\n` +
          `💰 Einsatz: **${config.currencySymbol}${bet.toLocaleString()}**\n\n` +
          scenario.options.map((opt, i) =>
            `${opt} — Quote: **x${scenario.odds[i]}** (Gewinn: ${config.currencySymbol}${Math.floor(bet * scenario.odds[i]).toLocaleString()})`
          ).join('\n') +
          `\n\n⏰ *15 Sekunden zum Tippen!*`
        )
        .setTimestamp();
    };

    const buildButtons = () => {
      return [new ActionRowBuilder().addComponents(
        ...scenario.options.map((opt, i) =>
          new ButtonBuilder()
            .setCustomId(`tipp_${i}_${userId}`)
            .setLabel(opt)
            .setStyle(i === 0 ? ButtonStyle.Danger : i === 1 ? ButtonStyle.Primary : ButtonStyle.Success)
        )
      )];
    };

    const msg = await interaction.reply({ embeds: [buildEmbed()], components: buildButtons(), fetchReply: true });
    const collector = msg.createMessageComponentCollector({ time: 15000 });

    collector.on('collect', async (btnInteraction) => {
      if (btnInteraction.user.id !== userId) {
        return btnInteraction.reply({ content: '❌ Das ist nicht dein Tippspiel!', flags: 64 });
      }
      if (answered) return;

      answered = true;
      collector.stop('answered');

      const chosen = parseInt(btnInteraction.customId.split('_')[1]);

      const weights = scenario.odds.map(o => 1 / o);
      const totalWeight = weights.reduce((a, b) => a + b, 0);
      const normalized = weights.map(w => w / totalWeight);

      const roll = Math.random();
      let cumulative = 0;
      let winner = 0;
      for (let i = 0; i < normalized.length; i++) {
        cumulative += normalized[i];
        if (roll < cumulative) { winner = i; break; }
      }

      const suspenseEmojis = ['🥁', '🥁', '🥁', '📣'];
      let suspenseText = '';
      for (const e of suspenseEmojis) {
        suspenseText += e + ' ';
      }

      const won = chosen === winner;
      const winnings = won ? Math.floor(bet * scenario.odds[chosen]) : 0;
      if (won) db.updateBalance(userId, winnings);

      const resultLines = scenario.options.map((opt, i) => {
        if (i === winner && i === chosen) return `✅ ${opt} ← DEIN TIPP & GEWINNER! 🎉`;
        if (i === winner) return `🏆 ${opt} ← GEWINNER`;
        if (i === chosen) return `❌ ${opt} ← Dein Tipp`;
        return `   ${opt}`;
      });

      const embed = new EmbedBuilder()
        .setColor(won ? '#FFD700' : '#e74c3c')
        .setTitle(won ? `${category.category} — Richtig getippt! 🎉` : `${category.category} — Falsch getippt!`)
        .setDescription(
          `**${scenario.q}**\n\n` +
          `${suspenseText}\n\n` +
          resultLines.join('\n') +
          `\n\n` +
          (won
            ? `🏆 Gewinn: **+${config.currencySymbol}${winnings.toLocaleString()}** (x${scenario.odds[chosen]})`
            : `💸 Verloren: **-${config.currencySymbol}${bet.toLocaleString()}**`) +
          `\n\nRichtige Quote war: **x${scenario.odds[winner]}**`
        )
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();
      btnInteraction.update({ embeds: [embed], components: [] });
    });

    collector.on('end', (_, reason) => {
      if (reason === 'time' && !answered) {
        answered = true;
        db.updateBalance(userId, bet);
        const embed = new EmbedBuilder()
          .setColor('#f39c12')
          .setTitle('⏰ Zeit abgelaufen!')
          .setDescription('Du hast nicht rechtzeitig getippt. Einsatz zurückgegeben.')
          .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
          .setTimestamp();
        msg.edit({ embeds: [embed], components: [] });
      }
    });
  },
};
