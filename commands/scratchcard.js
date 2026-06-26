const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const symbols = [
  { emoji: '💎', name: 'Diamant', multiplier: 10 },
  { emoji: '🌟', name: 'Stern', multiplier: 5 },
  { emoji: '🍀', name: 'Kleeblatt', multiplier: 3 },
  { emoji: '🔥', name: 'Feuer', multiplier: 2 },
  { emoji: '⚡', name: 'Blitz', multiplier: 1.5 },
  { emoji: '🎵', name: 'Musik', multiplier: 1 },
];

const COOLDOWN = 45 * 1000;
const cooldowns = new Map();

function generateCard() {
  const card = [];
  for (let i = 0; i < 9; i++) {
    const weights = [1, 3, 8, 15, 25, 48];
    const total = weights.reduce((a, b) => a + b, 0);
    const roll = Math.random() * total;
    let cum = 0;
    for (let j = 0; j < symbols.length; j++) {
      cum += weights[j];
      if (roll < cum) {
        card.push(symbols[j]);
        break;
      }
    }
  }
  return card;
}

function countMatches(card) {
  const counts = {};
  for (const s of card) {
    counts[s.emoji] = (counts[s.emoji] || 0) + 1;
  }
  let bestMatch = null;
  let bestCount = 0;
  for (const [emoji, count] of Object.entries(counts)) {
    if (count >= 3 && count > bestCount) {
      bestCount = count;
      bestMatch = symbols.find(s => s.emoji === emoji);
    }
  }
  return { symbol: bestMatch, count: bestCount };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('scratchcard')
    .setDescription('Kaufe ein Rubbellos und kratze es frei! (45s Cooldown)')
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
    if (amount < 50) return interaction.reply('❌ Mindestens **$50** für ein Rubbellos!');
    if (amount > db.getBalance(userId)) return interaction.reply(`❌ Du hast nur **${config.currencySymbol}${db.getBalance(userId)}**!`);

    cooldowns.set(userId, Date.now());

    const card = generateCard();
    const revealed = Array(9).fill(false);

    const buildGrid = () => {
      let grid = '';
      for (let i = 0; i < 9; i++) {
        grid += revealed[i] ? card[i].emoji : '⬜';
        if ((i + 1) % 3 === 0) grid += '\n';
        else grid += ' ';
      }
      return grid;
    };

    const buildButtons = (disabled = false) => {
      const rows = [];
      for (let r = 0; r < 3; r++) {
        const row = new ActionRowBuilder();
        for (let c = 0; c < 3; c++) {
          const idx = r * 3 + c;
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`sc_${idx}_${userId}`)
              .setLabel(revealed[idx] ? card[idx].emoji : `${idx + 1}`)
              .setStyle(revealed[idx] ? ButtonStyle.Secondary : ButtonStyle.Primary)
              .setDisabled(disabled || revealed[idx])
          );
        }
        rows.push(row);
      }
      const revealRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`sc_all_${userId}`)
          .setLabel('Alles aufdecken')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🎉')
          .setDisabled(disabled)
      );
      rows.push(revealRow);
      return rows;
    };

    const embed = new EmbedBuilder()
      .setColor('#9b59b6')
      .setTitle('🎫 Rubbellos')
      .setDescription(
        `Einsatz: **${config.currencySymbol}${amount.toLocaleString()}**\n\n` +
        `${buildGrid()}\n` +
        `Kratze die Felder frei! 3+ gleiche Symbole = Gewinn!`
      )
      .setFooter({ text: '30s zum Rubbeln' })
      .setTimestamp();

    const msg = await interaction.reply({ embeds: [embed], components: buildButtons(), fetchReply: true });
    const collector = msg.createMessageComponentCollector({ time: 30000 });

    collector.on('collect', (interaction) => {
      if (interaction.user.id !== userId) {
        return interaction.reply({ content: '❌ Das ist nicht dein Rubbellos!', flags: 64 });
      }

      if (interaction.customId === `sc_all_${userId}`) {
        revealed.fill(true);
      } else {
        const idx = parseInt(interaction.customId.split('_')[1]);
        revealed[idx] = true;
      }

      const allRevealed = revealed.every(r => r);

      if (allRevealed) {
        collector.stop('revealed');
        const match = countMatches(card);

        let resultText, color, profit;
        if (match.symbol) {
          const winMultiplier = match.count === 3 ? match.symbol.multiplier : match.count === 4 ? match.symbol.multiplier * 2 : match.symbol.multiplier * 5;
          const winAmount = Math.floor(amount * winMultiplier);
          profit = winAmount - amount;
          db.updateBalance(userId, profit);
          resultText = `${match.count}x ${match.symbol.emoji} **${match.symbol.name}** — **${winMultiplier}x**!\nGewinn: **+${config.currencySymbol}${profit.toLocaleString()}**`;
          color = '#2ecc71';
        } else {
          profit = -amount;
          db.updateBalance(userId, -amount);
          resultText = `Keine 3 gleichen Symbole...\nVerlust: **${config.currencySymbol}${amount.toLocaleString()}**`;
          color = '#e74c3c';
        }

        const resultEmbed = new EmbedBuilder()
          .setColor(color)
          .setTitle('🎫 Rubbellos — Ergebnis')
          .setDescription(`${buildGrid()}\n${resultText}`)
          .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
          .setTimestamp();

        return interaction.update({ embeds: [resultEmbed], components: [] });
      }

      const updateEmbed = new EmbedBuilder()
        .setColor('#9b59b6')
        .setTitle('🎫 Rubbellos')
        .setDescription(
          `Einsatz: **${config.currencySymbol}${amount.toLocaleString()}**\n\n` +
          `${buildGrid()}\n` +
          `Kratze weiter! 3+ gleiche = Gewinn!`
        )
        .setFooter({ text: '30s zum Rubbeln' })
        .setTimestamp();

      interaction.update({ embeds: [updateEmbed], components: buildButtons() });
    });

    collector.on('end', (_, reason) => {
      if (reason === 'time') {
        revealed.fill(true);
        const match = countMatches(card);

        let resultText, profit;
        if (match.symbol) {
          const winMultiplier = match.count === 3 ? match.symbol.multiplier : match.count === 4 ? match.symbol.multiplier * 2 : match.symbol.multiplier * 5;
          const winAmount = Math.floor(amount * winMultiplier);
          profit = winAmount - amount;
          db.updateBalance(userId, profit);
          resultText = `${match.count}x ${match.symbol.emoji} **${match.symbol.name}** — **${winMultiplier}x**!\nGewinn: **+${config.currencySymbol}${profit.toLocaleString()}**`;
        } else {
          db.updateBalance(userId, -amount);
          resultText = `Keine 3 gleichen Symbole...\nVerlust: **${config.currencySymbol}${amount.toLocaleString()}**`;
        }

        const embed = new EmbedBuilder()
          .setColor(match.symbol ? '#2ecc71' : '#e74c3c')
          .setTitle('🎫 Rubbellos — Zeit abgelaufen')
          .setDescription(`${buildGrid()}\n${resultText}`)
          .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
          .setTimestamp();

        msg.edit({ embeds: [embed], components: [] });
      }
    });
  },
};
