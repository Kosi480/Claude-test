const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const COOLDOWN = 60 * 1000;
const cooldowns = new Map();

const rareItems = [
  { name: 'Verbotener Trank', emoji: '🧪', basePrice: 500, effect: '+20% Steal-Chance für 1h', rarity: 'Selten' },
  { name: 'Dunkler Umhang', emoji: '🧥', basePrice: 1500, effect: '-50% Verlust bei Diebstahl', rarity: 'Selten' },
  { name: 'Gefälschter Ausweis', emoji: '🪪', basePrice: 800, effect: 'Cooldown-Reset (1x)', rarity: 'Ungewöhnlich' },
  { name: 'Goldene Krone', emoji: '👑', basePrice: 5000, effect: 'Prestige-Symbol', rarity: 'Episch' },
  { name: 'Mysteriöse Kiste', emoji: '📦', basePrice: 2000, effect: 'Zufälliger Inhalt', rarity: 'Selten' },
  { name: 'Diamant-Schwert', emoji: '🗡️', basePrice: 3500, effect: '+8 ATK im Kampf', rarity: 'Episch' },
  { name: 'Phönix-Feder', emoji: '🪶', basePrice: 4000, effect: 'Wiederbelebung im Dungeon (1x)', rarity: 'Legendär' },
  { name: 'Zeitkristall', emoji: '⏳', basePrice: 6000, effect: 'Halbiert alle Cooldowns (1x)', rarity: 'Legendär' },
  { name: 'Diebes-Handschuhe', emoji: '🧤', basePrice: 1200, effect: '+15% auf Steal/Pickpocket', rarity: 'Ungewöhnlich' },
  { name: 'Glücks-Amulett', emoji: '🔮', basePrice: 2500, effect: '+10% Gewinnchance Casino', rarity: 'Selten' },
  { name: 'Unsichtbarkeits-Ring', emoji: '💍', basePrice: 7000, effect: 'Immun gegen Steal (1x)', rarity: 'Legendär' },
  { name: 'Alchemisten-Set', emoji: '⚗️', basePrice: 1800, effect: '+25% Craft-Ertrag', rarity: 'Selten' },
];

const rarityColors = {
  'Ungewöhnlich': '🟢',
  'Selten': '🔵',
  'Episch': '🟣',
  'Legendär': '🟠',
};

function getDailyOffers() {
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const shuffled = [...rareItems].sort((a, b) => {
    const hashA = (seed * 31 + a.name.charCodeAt(0)) % 1000;
    const hashB = (seed * 31 + b.name.charCodeAt(0)) % 1000;
    return hashA - hashB;
  });

  return shuffled.slice(0, 4).map(item => {
    const priceVariance = 0.7 + ((seed * item.name.charCodeAt(1)) % 60) / 100;
    const price = Math.floor(item.basePrice * priceVariance);
    const stock = 1 + ((seed + item.name.charCodeAt(0)) % 3);
    return { ...item, price, stock, sold: 0 };
  });
}

let cachedDay = null;
let cachedOffers = null;
const soldToday = new Map();

function getOffers() {
  const today = new Date().toDateString();
  if (cachedDay !== today) {
    cachedDay = today;
    cachedOffers = getDailyOffers();
    soldToday.clear();
  }

  return cachedOffers.map((item, i) => ({
    ...item,
    sold: soldToday.get(i) || 0,
  }));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('blackmarket')
    .setDescription('Schwarzmarkt — seltene Items zu wechselnden Preisen!')
    .addSubcommand(sub =>
      sub.setName('angebote')
        .setDescription('Zeige heutige Schwarzmarkt-Angebote'))
    .addSubcommand(sub =>
      sub.setName('kaufen')
        .setDescription('Kaufe ein Item vom Schwarzmarkt')
        .addIntegerOption(opt => opt.setName('nummer').setDescription('Item-Nummer (1-4)').setRequired(true))),
  async execute(interaction) {
    const userId = interaction.user.id;
    const config = require('../config.json');
    const action = interaction.options.getSubcommand();
    const offers = getOffers();

    if (action === 'angebote') {
      const embed = new EmbedBuilder()
        .setColor('#2c2c34')
        .setTitle('🏴 Schwarzmarkt')
        .setDescription(
          `*Psst... schau dir diese Angebote an...*\n` +
          `*Angebote wechseln täglich um Mitternacht!*\n\n` +
          offers.map((item, i) => {
            const available = item.stock - item.sold;
            const stockText = available > 0 ? `${available}x verfügbar` : '❌ Ausverkauft';
            return `**${i + 1}.** ${rarityColors[item.rarity]} ${item.emoji} **${item.name}**\n` +
              `   Preis: **${config.currencySymbol}${item.price.toLocaleString()}** | ${stockText}\n` +
              `   *${item.effect}* — \`${item.rarity}\``;
          }).join('\n\n') +
          `\n\n*Nutze \`/blackmarket kaufen <nummer>\` zum Kaufen!*`
        )
        .setFooter({ text: 'Preise und Angebot ändern sich täglich!' })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'kaufen') {
      const lastPlay = cooldowns.get(userId);
      if (lastPlay && Date.now() - lastPlay < COOLDOWN) {
        const remaining = Math.ceil((COOLDOWN - (Date.now() - lastPlay)) / 1000);
        return interaction.reply(`⏳ Du musst noch **${remaining}s** warten!`);
      }

      const num = interaction.options.getInteger('nummer');
      if (num < 1 || num > 4) return interaction.reply('❌ Ungültige Nummer! Wähle 1-4.');

      const idx = num - 1;
      const item = offers[idx];
      const available = item.stock - item.sold;

      if (available <= 0) return interaction.reply(`❌ **${item.emoji} ${item.name}** ist ausverkauft!`);
      if (db.getBalance(userId) < item.price) {
        return interaction.reply(`❌ Du brauchst **${config.currencySymbol}${item.price.toLocaleString()}**!`);
      }

      cooldowns.set(userId, Date.now());
      db.updateBalance(userId, -item.price);
      soldToday.set(idx, (soldToday.get(idx) || 0) + 1);

      if (item.name === 'Mysteriöse Kiste') {
        const rewards = [
          { text: '💰 **500$** gefunden!', action: () => db.updateBalance(userId, 500) },
          { text: '💰 **2000$** gefunden!', action: () => db.updateBalance(userId, 2000) },
          { text: '💎 **Diamant-Ring** gefunden!', action: () => db.addToInventory(userId, 'Diamant-Ring') },
          { text: '🧪 **3x Heiltrank** gefunden!', action: () => db.addToInventory(userId, 'Heiltrank', 3) },
          { text: '💀 Die Kiste war leer... Pech!', action: () => {} },
          { text: '🪙 **Goldbarren** gefunden!', action: () => db.addToInventory(userId, 'Goldbarren') },
        ];
        const reward = rewards[Math.floor(Math.random() * rewards.length)];
        reward.action();

        const embed = new EmbedBuilder()
          .setColor('#FFD700')
          .setTitle('📦 Mysteriöse Kiste geöffnet!')
          .setDescription(`Du öffnest die Kiste...\n\n${reward.text}`)
          .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      db.addToInventory(userId, item.name);

      const embed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle('🏴 Schwarzmarkt-Kauf')
        .setDescription(
          `${rarityColors[item.rarity]} ${item.emoji} **${item.name}** gekauft!\n\n` +
          `Preis: **${config.currencySymbol}${item.price.toLocaleString()}**\n` +
          `Effekt: *${item.effect}*\n` +
          `Seltenheit: \`${item.rarity}\``
        )
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }
  },
};
