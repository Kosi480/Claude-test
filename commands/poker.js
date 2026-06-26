const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const COOLDOWN = 45 * 1000;
const cooldowns = new Map();

const suits = ['♠️', '♥️', '♦️', '♣️'];
const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

function createDeck() {
  const deck = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ rank, suit, value: ranks.indexOf(rank) });
    }
  }
  return deck.sort(() => Math.random() - 0.5);
}

function evaluateHand(hand) {
  const values = hand.map(c => c.value).sort((a, b) => a - b);
  const suitSet = new Set(hand.map(c => c.suit));
  const isFlush = suitSet.size === 1;

  const isStraight = values.every((v, i) => i === 0 || v === values[i - 1] + 1) ||
    (values[0] === 0 && values[1] === 1 && values[2] === 2 && values[3] === 3 && values[4] === 12);

  const counts = {};
  for (const v of values) counts[v] = (counts[v] || 0) + 1;
  const countValues = Object.values(counts).sort((a, b) => b - a);

  if (isFlush && isStraight && values[4] === 12 && values[3] === 11) return { name: 'Royal Flush', emoji: '👑', multiplier: 100 };
  if (isFlush && isStraight) return { name: 'Straight Flush', emoji: '🌟', multiplier: 50 };
  if (countValues[0] === 4) return { name: 'Vierling', emoji: '💎', multiplier: 25 };
  if (countValues[0] === 3 && countValues[1] === 2) return { name: 'Full House', emoji: '🏠', multiplier: 9 };
  if (isFlush) return { name: 'Flush', emoji: '🎴', multiplier: 6 };
  if (isStraight) return { name: 'Straße', emoji: '📏', multiplier: 4 };
  if (countValues[0] === 3) return { name: 'Drilling', emoji: '🎲', multiplier: 3 };
  if (countValues[0] === 2 && countValues[1] === 2) return { name: 'Zwei Paare', emoji: '✌️', multiplier: 2 };
  if (countValues[0] === 2) {
    const pairValue = parseInt(Object.keys(counts).find(k => counts[k] === 2));
    if (pairValue >= 9) return { name: 'Hohes Paar', emoji: '👆', multiplier: 1 };
    return { name: 'Niedriges Paar', emoji: '👇', multiplier: 0 };
  }
  return { name: 'Nichts', emoji: '❌', multiplier: 0 };
}

function cardToString(card) {
  return `\`${card.rank}${card.suit}\``;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('poker')
    .setDescription('Video-Poker — tausche Karten für die beste Hand! (45s CD)')
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
    if (amount > db.getBalance(userId)) return interaction.reply(`❌ Du hast nur **${config.currencySymbol}${db.getBalance(userId).toLocaleString()}**!`);

    cooldowns.set(userId, Date.now());

    const deck = createDeck();
    const hand = deck.splice(0, 5);
    const held = [false, false, false, false, false];
    let phase = 'hold';

    const buildHandDisplay = () => {
      return hand.map((c, i) => {
        const card = cardToString(c);
        return held[i] ? `${card} 🔒` : card;
      }).join('  ');
    };

    const buildHoldButtons = () => {
      const rows = [];
      const row1 = new ActionRowBuilder();
      for (let i = 0; i < 5; i++) {
        row1.addComponents(
          new ButtonBuilder()
            .setCustomId(`pk_hold_${i}_${userId}`)
            .setLabel(held[i] ? `${i + 1} 🔒` : `${i + 1}`)
            .setStyle(held[i] ? ButtonStyle.Success : ButtonStyle.Secondary)
        );
      }
      rows.push(row1);

      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`pk_draw_${userId}`)
          .setLabel('🃏 Karten tauschen!')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`pk_keepall_${userId}`)
          .setLabel('✅ Alle behalten')
          .setStyle(ButtonStyle.Success),
      );
      rows.push(row2);
      return rows;
    };

    const currentEval = evaluateHand(hand);

    const embed = new EmbedBuilder()
      .setColor('#1a6b2a')
      .setTitle('🃏 Video-Poker')
      .setDescription(
        `Einsatz: **${config.currencySymbol}${amount.toLocaleString()}**\n\n` +
        `Deine Hand:\n${buildHandDisplay()}\n\n` +
        `Aktuelle Hand: **${currentEval.emoji} ${currentEval.name}**${currentEval.multiplier > 0 ? ` (${currentEval.multiplier}x)` : ''}\n\n` +
        `Wähle Karten zum **Halten** (🔒), dann tausche den Rest!\n\n` +
        `**Auszahlungen:**\n` +
        `👑 Royal Flush: 100x | 🌟 Straight Flush: 50x\n` +
        `💎 Vierling: 25x | 🏠 Full House: 9x | 🎴 Flush: 6x\n` +
        `📏 Straße: 4x | 🎲 Drilling: 3x | ✌️ Zwei Paare: 2x\n` +
        `👆 Hohes Paar (J+): 1x`
      )
      .setFooter({ text: '30s Zeit' })
      .setTimestamp();

    const msg = await interaction.reply({ embeds: [embed], components: buildHoldButtons(), fetchReply: true });
    const collector = msg.createMessageComponentCollector({ time: 30000 });

    collector.on('collect', (btnInteraction) => {
      if (btnInteraction.user.id !== userId) {
        return btnInteraction.reply({ content: '❌ Das ist nicht dein Spiel!', flags: 64 });
      }

      const parts = btnInteraction.customId.split('_');

      if (parts[1] === 'hold') {
        const idx = parseInt(parts[2]);
        held[idx] = !held[idx];

        const eval2 = evaluateHand(hand);
        const embed = new EmbedBuilder()
          .setColor('#1a6b2a')
          .setTitle('🃏 Video-Poker')
          .setDescription(
            `Einsatz: **${config.currencySymbol}${amount.toLocaleString()}**\n\n` +
            `Deine Hand:\n${buildHandDisplay()}\n\n` +
            `Aktuelle Hand: **${eval2.emoji} ${eval2.name}**${eval2.multiplier > 0 ? ` (${eval2.multiplier}x)` : ''}\n\n` +
            `Wähle Karten zum **Halten** (🔒), dann tausche!`
          )
          .setFooter({ text: '30s Zeit' })
          .setTimestamp();

        collector.resetTimer({ time: 30000 });
        btnInteraction.update({ embeds: [embed], components: buildHoldButtons() });
        return;
      }

      if (parts[1] === 'keepall') {
        for (let i = 0; i < 5; i++) held[i] = true;
      }

      collector.stop('drawn');

      for (let i = 0; i < 5; i++) {
        if (!held[i]) {
          hand[i] = deck.pop();
        }
      }

      const result = evaluateHand(hand);
      const winAmount = Math.floor(amount * result.multiplier);
      const profit = winAmount - amount;

      if (profit !== 0) db.updateBalance(userId, profit);

      const color = profit > 0 ? '#FFD700' : profit === 0 ? '#f39c12' : '#e74c3c';
      const title = profit > 0 ? `🃏 ${result.emoji} ${result.name}!` : profit === 0 ? '🃏 Einsatz zurück' : '🃏 Verloren!';

      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(
          `Deine Hand:\n${hand.map(c => cardToString(c)).join('  ')}\n\n` +
          `Hand: **${result.emoji} ${result.name}**${result.multiplier > 0 ? ` (${result.multiplier}x)` : ''}\n\n` +
          (profit > 0 ? `Gewinn: **+${config.currencySymbol}${profit.toLocaleString()}**` :
           profit === 0 ? `Einsatz zurück.` :
           `Verlust: **-${config.currencySymbol}${amount.toLocaleString()}**`)
        )
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();

      btnInteraction.update({ embeds: [embed], components: [] });
    });

    collector.on('end', (_, reason) => {
      if (reason === 'time') {
        const result = evaluateHand(hand);
        const winAmount = Math.floor(amount * result.multiplier);
        const profit = winAmount - amount;
        if (profit !== 0) db.updateBalance(userId, profit);

        const embed = new EmbedBuilder()
          .setColor('#f39c12')
          .setTitle('⏰ Zeit abgelaufen — Karten behalten')
          .setDescription(
            `Hand: ${hand.map(c => cardToString(c)).join('  ')}\n\n` +
            `**${result.emoji} ${result.name}**\n` +
            (profit > 0 ? `Gewinn: **+${config.currencySymbol}${profit.toLocaleString()}**` :
             profit === 0 ? 'Einsatz zurück.' :
             `Verlust: **-${config.currencySymbol}${amount.toLocaleString()}**`)
          )
          .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
          .setTimestamp();
        msg.edit({ embeds: [embed], components: [] });
      }
    });
  },
};
