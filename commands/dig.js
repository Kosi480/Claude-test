const { EmbedBuilder } = require('discord.js');
const db = require('../database');

const findings = [
  { name: 'Dreck', value: 0, emoji: '💩', rarity: 'häufig' },
  { name: 'Stein', value: 5, emoji: '🪨', rarity: 'häufig' },
  { name: 'Alte Münze', value: 25, emoji: '🪙', rarity: 'häufig' },
  { name: 'Knochen', value: 40, emoji: '🦴', rarity: 'ungewöhnlich' },
  { name: 'Silbernugget', value: 75, emoji: '⚪', rarity: 'ungewöhnlich' },
  { name: 'Amethyst', value: 150, emoji: '💜', rarity: 'selten' },
  { name: 'Goldnugget', value: 250, emoji: '🟡', rarity: 'selten' },
  { name: 'Rubin', value: 400, emoji: '❤️', rarity: 'episch' },
  { name: 'Smaragd', value: 600, emoji: '💚', rarity: 'episch' },
  { name: 'Antike Schatztruhe', value: 1500, emoji: '💰', rarity: 'legendär' },
];

const weights = [18, 18, 15, 12, 10, 8, 7, 5, 4, 3];

const COOLDOWN = 25 * 1000;
const cooldowns = new Map();

const rarityColors = {
  'häufig': '#95a5a6',
  'ungewöhnlich': '#2ecc71',
  'selten': '#3498db',
  'episch': '#9b59b6',
  'legendär': '#f1c40f',
};

module.exports = {
  name: 'dig',
  aliases: ['graben', 'buddeln', 'schaufeln'],
  description: 'Grabe nach Schätzen (benötigt Schaufel)',
  execute(message) {
    const userId = message.author.id;
    const config = require('../config.json');

    if (!db.hasItem(userId, 'Schaufel')) {
      return message.reply(`❌ Du brauchst eine **Schaufel**! Kaufe eine im \`${config.prefix}shop\``);
    }

    const lastDig = cooldowns.get(userId);
    if (lastDig && Date.now() - lastDig < COOLDOWN) {
      const remaining = Math.ceil((COOLDOWN - (Date.now() - lastDig)) / 1000);
      return message.reply(`⏳ Du musst noch **${remaining}s** warten!`);
    }

    cooldowns.set(userId, Date.now());

    const roll = Math.random() * weights.reduce((a, b) => a + b, 0);
    let cumulative = 0;
    let found;
    for (let i = 0; i < findings.length; i++) {
      cumulative += weights[i];
      if (roll < cumulative) {
        found = findings[i];
        break;
      }
    }

    if (found.value > 0) {
      db.updateBalance(userId, found.value);
    }
    try { require('./quest').trackProgress(userId, 'dig'); } catch (_) {}

    const embed = new EmbedBuilder()
      .setColor(rarityColors[found.rarity])
      .setTitle('⛏️ Graben')
      .setDescription(found.value > 0
        ? `Du hast ${found.emoji} **${found.name}** gefunden!\nWert: **${config.currencySymbol}${found.value}**`
        : `Du hast ${found.emoji} **${found.name}** gefunden... das ist wertlos!`)
      .addFields({ name: 'Seltenheit', value: found.rarity.charAt(0).toUpperCase() + found.rarity.slice(1), inline: true })
      .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
      .setTimestamp();

    message.reply({ embeds: [embed] });
  },
};
