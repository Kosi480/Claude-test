const { EmbedBuilder } = require('discord.js');
const db = require('../database');

const segments = [
  { label: 'JACKPOT', multiplier: 10, emoji: '💎', color: '#FFD700', weight: 1 },
  { label: '5x', multiplier: 5, emoji: '🌟', color: '#9b59b6', weight: 2 },
  { label: '3x', multiplier: 3, emoji: '✨', color: '#2ecc71', weight: 5 },
  { label: '2x', multiplier: 2, emoji: '🔥', color: '#e67e22', weight: 8 },
  { label: '1.5x', multiplier: 1.5, emoji: '⚡', color: '#3498db', weight: 12 },
  { label: '1x', multiplier: 1, emoji: '🔄', color: '#95a5a6', weight: 15 },
  { label: '0.5x', multiplier: 0.5, emoji: '📉', color: '#e74c3c', weight: 18 },
  { label: 'PLEITE', multiplier: 0, emoji: '💀', color: '#2c3e50', weight: 10 },
  { label: '0.25x', multiplier: 0.25, emoji: '😢', color: '#c0392b', weight: 14 },
  { label: '1.2x', multiplier: 1.2, emoji: '👍', color: '#27ae60', weight: 15 },
];

const COOLDOWN = 60 * 1000;
const cooldowns = new Map();

module.exports = {
  name: 'wheel',
  aliases: ['glücksrad', 'rad', 'spin'],
  description: 'Drehe das Glücksrad! (!wheel <Betrag>, 60s CD)',
  execute(message, args) {
    const userId = message.author.id;
    const config = require('../config.json');

    if (!args[0]) return message.reply(`❌ Nutzung: \`${config.prefix}wheel <Betrag>\``);

    const lastSpin = cooldowns.get(userId);
    if (lastSpin && Date.now() - lastSpin < COOLDOWN) {
      const remaining = Math.ceil((COOLDOWN - (Date.now() - lastSpin)) / 1000);
      return message.reply(`⏳ Du musst noch **${remaining}s** warten!`);
    }

    let amount;
    if (args[0] === 'all' || args[0] === 'alles') {
      amount = db.getBalance(userId);
    } else {
      amount = parseInt(args[0]);
    }

    if (!amount || amount <= 0) return message.reply('❌ Ungültiger Betrag!');
    if (amount > db.getBalance(userId)) return message.reply(`❌ Du hast nur **${config.currencySymbol}${db.getBalance(userId)}**!`);

    cooldowns.set(userId, Date.now());

    const totalWeight = segments.reduce((sum, s) => sum + s.weight, 0);
    const roll = Math.random() * totalWeight;
    let cumulative = 0;
    let result;
    for (const seg of segments) {
      cumulative += seg.weight;
      if (roll < cumulative) {
        result = seg;
        break;
      }
    }

    const winAmount = Math.floor(amount * result.multiplier);
    const profit = winAmount - amount;
    db.updateBalance(userId, profit);

    const wheelDisplay = segments.map(s =>
      s === result ? `▶ **${s.emoji} ${s.label}** ◀` : `  ${s.emoji} ${s.label}`
    ).join('\n');

    const embed = new EmbedBuilder()
      .setColor(result.color)
      .setTitle('🎡 Glücksrad')
      .setDescription(
        `${wheelDisplay}\n\n` +
        `Ergebnis: ${result.emoji} **${result.label}**\n` +
        (profit >= 0
          ? `Gewinn: **+${config.currencySymbol}${profit.toLocaleString()}**`
          : `Verlust: **${config.currencySymbol}${profit.toLocaleString()}**`)
      )
      .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
      .setTimestamp();

    message.reply({ embeds: [embed] });
  },
};
