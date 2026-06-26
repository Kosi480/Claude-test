const { EmbedBuilder } = require('discord.js');
const db = require('../database');

const animals = [
  { name: 'Hase', value: 20, emoji: '🐇', rarity: 'häufig' },
  { name: 'Fuchs', value: 45, emoji: '🦊', rarity: 'häufig' },
  { name: 'Hirsch', value: 80, emoji: '🦌', rarity: 'ungewöhnlich' },
  { name: 'Wildschwein', value: 100, emoji: '🐗', rarity: 'ungewöhnlich' },
  { name: 'Wolf', value: 150, emoji: '🐺', rarity: 'selten' },
  { name: 'Bär', value: 250, emoji: '🐻', rarity: 'selten' },
  { name: 'Tiger', value: 400, emoji: '🐅', rarity: 'episch' },
  { name: 'Drache', value: 800, emoji: '🐉', rarity: 'legendär' },
];

const weights = [25, 22, 16, 13, 10, 7, 5, 2];

const failMessages = [
  'Du bist über einen Ast gestolpert und die Tiere sind weggerannt!',
  'Dein Magen knurrt so laut, dass alle Tiere fliehen!',
  'Du hast einen ganzen Tag gesucht aber nichts gefunden.',
  'Ein Eichhörnchen hat dir eine Nuss an den Kopf geworfen. Kein Fang heute.',
];

const COOLDOWN = 30 * 1000;
const cooldowns = new Map();

const rarityColors = {
  'häufig': '#95a5a6',
  'ungewöhnlich': '#2ecc71',
  'selten': '#3498db',
  'episch': '#9b59b6',
  'legendär': '#f1c40f',
};

module.exports = {
  name: 'hunt',
  aliases: ['jagen', 'jagd'],
  description: 'Geh auf die Jagd (30s Cooldown)',
  execute(message) {
    const userId = message.author.id;
    const config = require('../config.json');

    const lastHunt = cooldowns.get(userId);
    if (lastHunt && Date.now() - lastHunt < COOLDOWN) {
      const remaining = Math.ceil((COOLDOWN - (Date.now() - lastHunt)) / 1000);
      return message.reply(`⏳ Du musst noch **${remaining}s** warten!`);
    }

    cooldowns.set(userId, Date.now());

    const success = Math.random() < 0.7;

    if (!success) {
      const failMsg = failMessages[Math.floor(Math.random() * failMessages.length)];
      const embed = new EmbedBuilder()
        .setColor('#e74c3c')
        .setTitle('🏹 Jagd')
        .setDescription(failMsg)
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    const roll = Math.random() * weights.reduce((a, b) => a + b, 0);
    let cumulative = 0;
    let caught;
    for (let i = 0; i < animals.length; i++) {
      cumulative += weights[i];
      if (roll < cumulative) {
        caught = animals[i];
        break;
      }
    }

    db.updateBalance(userId, caught.value);

    const embed = new EmbedBuilder()
      .setColor(rarityColors[caught.rarity])
      .setTitle('🏹 Jagd')
      .setDescription(`Du hast ${caught.emoji} **${caught.name}** erlegt!\nWert: **${config.currencySymbol}${caught.value}**`)
      .addFields({ name: 'Seltenheit', value: caught.rarity.charAt(0).toUpperCase() + caught.rarity.slice(1), inline: true })
      .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
      .setTimestamp();

    message.reply({ embeds: [embed] });
  },
};
