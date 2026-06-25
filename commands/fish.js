const { EmbedBuilder } = require('discord.js');
const db = require('../database');

const catches = [
  { name: 'Alte Socke', value: 1, emoji: '🧦', rarity: 'häufig' },
  { name: 'Kleiner Fisch', value: 15, emoji: '🐟', rarity: 'häufig' },
  { name: 'Forelle', value: 30, emoji: '🐠', rarity: 'häufig' },
  { name: 'Lachs', value: 50, emoji: '🐡', rarity: 'ungewöhnlich' },
  { name: 'Tintenfisch', value: 80, emoji: '🦑', rarity: 'ungewöhnlich' },
  { name: 'Schildkröte', value: 120, emoji: '🐢', rarity: 'selten' },
  { name: 'Hai', value: 200, emoji: '🦈', rarity: 'selten' },
  { name: 'Wal', value: 350, emoji: '🐋', rarity: 'episch' },
  { name: 'Goldener Fisch', value: 500, emoji: '✨', rarity: 'episch' },
  { name: 'Neptuns Dreizack', value: 1000, emoji: '🔱', rarity: 'legendär' },
];

const weights = [20, 20, 15, 12, 10, 8, 6, 4, 3, 2];

const COOLDOWN = 20 * 1000;
const cooldowns = new Map();

const rarityColors = {
  'häufig': '#95a5a6',
  'ungewöhnlich': '#2ecc71',
  'selten': '#3498db',
  'episch': '#9b59b6',
  'legendär': '#f1c40f',
};

module.exports = {
  name: 'fish',
  aliases: ['fischen', 'angeln'],
  description: 'Geh angeln (benötigt Angel)',
  execute(message) {
    const userId = message.author.id;
    const config = require('../config.json');

    if (!db.hasItem(userId, 'Angel')) {
      return message.reply(`❌ Du brauchst eine **Angel**! Kaufe eine im \`${config.prefix}shop\``);
    }

    const lastFish = cooldowns.get(userId);
    if (lastFish && Date.now() - lastFish < COOLDOWN) {
      const remaining = Math.ceil((COOLDOWN - (Date.now() - lastFish)) / 1000);
      return message.reply(`⏳ Du musst noch **${remaining}s** warten!`);
    }

    cooldowns.set(userId, Date.now());

    const roll = Math.random() * weights.reduce((a, b) => a + b, 0);
    let cumulative = 0;
    let caught;
    for (let i = 0; i < catches.length; i++) {
      cumulative += weights[i];
      if (roll < cumulative) {
        caught = catches[i];
        break;
      }
    }

    db.updateBalance(userId, caught.value);

    const embed = new EmbedBuilder()
      .setColor(rarityColors[caught.rarity])
      .setTitle('🎣 Angeln')
      .setDescription(`Du hast ${caught.emoji} **${caught.name}** gefangen!\nWert: **${config.currencySymbol}${caught.value}**`)
      .addFields({ name: 'Seltenheit', value: caught.rarity.charAt(0).toUpperCase() + caught.rarity.slice(1), inline: true })
      .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
      .setTimestamp();

    message.reply({ embeds: [embed] });
  },
};
