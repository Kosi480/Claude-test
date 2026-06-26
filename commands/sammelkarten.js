const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const PACK_COST = 300;
const PREMIUM_PACK_COST = 1000;
const COOLDOWN = 60 * 1000;
const cooldowns = new Map();

const cards = [
  { id: 1, name: 'Feuerdrache', emoji: '🐉', rarity: 'Legendär', set: 'Monster', value: 2000 },
  { id: 2, name: 'Eisgolem', emoji: '🧊', rarity: 'Episch', set: 'Monster', value: 800 },
  { id: 3, name: 'Schattenwolf', emoji: '🐺', rarity: 'Selten', set: 'Monster', value: 400 },
  { id: 4, name: 'Goblin-Krieger', emoji: '👺', rarity: 'Gewöhnlich', set: 'Monster', value: 100 },
  { id: 5, name: 'Skelett-König', emoji: '💀', rarity: 'Episch', set: 'Monster', value: 900 },
  { id: 6, name: 'Excalibur', emoji: '⚔️', rarity: 'Legendär', set: 'Waffen', value: 1800 },
  { id: 7, name: 'Feuerstab', emoji: '🔥', rarity: 'Episch', set: 'Waffen', value: 750 },
  { id: 8, name: 'Schattendolch', emoji: '🗡️', rarity: 'Selten', set: 'Waffen', value: 350 },
  { id: 9, name: 'Holzschwert', emoji: '🪵', rarity: 'Gewöhnlich', set: 'Waffen', value: 80 },
  { id: 10, name: 'Donnerhammer', emoji: '🔨', rarity: 'Episch', set: 'Waffen', value: 850 },
  { id: 11, name: 'Phönix', emoji: '🦅', rarity: 'Legendär', set: 'Magisch', value: 2200 },
  { id: 12, name: 'Zeitkristall', emoji: '⏳', rarity: 'Episch', set: 'Magisch', value: 900 },
  { id: 13, name: 'Mana-Quelle', emoji: '🔮', rarity: 'Selten', set: 'Magisch', value: 400 },
  { id: 14, name: 'Zauberhut', emoji: '🎩', rarity: 'Gewöhnlich', set: 'Magisch', value: 90 },
  { id: 15, name: 'Unsichtbar-Umhang', emoji: '👻', rarity: 'Episch', set: 'Magisch', value: 800 },
];

const rarityChances = {
  normal: { 'Gewöhnlich': 0.50, 'Selten': 0.30, 'Episch': 0.15, 'Legendär': 0.05 },
  premium: { 'Gewöhnlich': 0.20, 'Selten': 0.35, 'Episch': 0.30, 'Legendär': 0.15 },
};

const rarityColors = { 'Gewöhnlich': '⬜', 'Selten': '🟦', 'Episch': '🟪', 'Legendär': '🟧' };
const sets = ['Monster', 'Waffen', 'Magisch'];
const SET_BONUS = 3000;

function ensureCardTable() {
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS player_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      card_id INTEGER NOT NULL,
      quantity INTEGER DEFAULT 1,
      UNIQUE(user_id, card_id)
    )
  `);
}

function getPlayerCards(userId) {
  return db.db.prepare('SELECT * FROM player_cards WHERE user_id = ?').all(userId);
}

function addCard(userId, cardId) {
  const existing = db.db.prepare('SELECT * FROM player_cards WHERE user_id = ? AND card_id = ?').get(userId, cardId);
  if (existing) {
    db.db.prepare('UPDATE player_cards SET quantity = quantity + 1 WHERE user_id = ? AND card_id = ?').run(userId, cardId);
  } else {
    db.db.prepare('INSERT INTO player_cards (user_id, card_id, quantity) VALUES (?, ?, 1)').run(userId, cardId);
  }
}

function pullCard(type) {
  const chances = rarityChances[type];
  const roll = Math.random();
  let cumulative = 0;
  let rarity = 'Gewöhnlich';

  for (const [r, chance] of Object.entries(chances)) {
    cumulative += chance;
    if (roll < cumulative) { rarity = r; break; }
  }

  const pool = cards.filter(c => c.rarity === rarity);
  return pool[Math.floor(Math.random() * pool.length)];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sammelkarten')
    .setDescription('Sammle Karten, komplettiere Sets und verdiene Boni!')
    .addSubcommand(sub =>
      sub.setName('pack')
        .setDescription('Öffne ein Kartenpack (300$)'))
    .addSubcommand(sub =>
      sub.setName('premium')
        .setDescription('Öffne ein Premium-Pack (1000$, bessere Chancen)'))
    .addSubcommand(sub =>
      sub.setName('sammlung')
        .setDescription('Zeige deine Kartensammlung'))
    .addSubcommand(sub =>
      sub.setName('verkaufen')
        .setDescription('Verkaufe Duplikate')
        .addIntegerOption(opt => opt.setName('karten_id').setDescription('Karten-ID zum Verkaufen').setRequired(true))),
  async execute(interaction) {
    ensureCardTable();
    const userId = interaction.user.id;
    const config = require('../config.json');
    const action = interaction.options.getSubcommand();

    if (action === 'pack' || action === 'premium') {
      const lastPlay = cooldowns.get(userId);
      if (lastPlay && Date.now() - lastPlay < COOLDOWN) {
        const remaining = Math.ceil((COOLDOWN - (Date.now() - lastPlay)) / 1000);
        return interaction.reply(`⏳ Du musst noch **${remaining}s** warten!`);
      }

      const cost = action === 'premium' ? PREMIUM_PACK_COST : PACK_COST;
      if (db.getBalance(userId) < cost) {
        return interaction.reply(`❌ Du brauchst **${config.currencySymbol}${cost}** für ein ${action === 'premium' ? 'Premium-' : ''}Pack!`);
      }

      cooldowns.set(userId, Date.now());
      db.updateBalance(userId, -cost);

      const count = action === 'premium' ? 5 : 3;
      const pulled = [];
      for (let i = 0; i < count; i++) {
        const card = pullCard(action === 'premium' ? 'premium' : 'normal');
        pulled.push(card);
        addCard(userId, card.id);
      }

      const embed = new EmbedBuilder()
        .setColor(pulled.some(c => c.rarity === 'Legendär') ? '#FFD700' : pulled.some(c => c.rarity === 'Episch') ? '#9b59b6' : '#3498db')
        .setTitle(`🎴 ${action === 'premium' ? 'Premium-' : ''}Pack geöffnet!`)
        .setDescription(
          pulled.map(c =>
            `${rarityColors[c.rarity]} ${c.emoji} **${c.name}** — \`${c.rarity}\` (${c.set})`
          ).join('\n') +
          `\n\nKosten: **${config.currencySymbol}${cost}**`
        )
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'sammlung') {
      const playerCards = getPlayerCards(userId);
      const owned = new Set(playerCards.map(pc => pc.card_id));

      let desc = '';
      for (const setName of sets) {
        const setCards = cards.filter(c => c.set === setName);
        const ownedInSet = setCards.filter(c => owned.has(c.id));
        const complete = ownedInSet.length === setCards.length;

        desc += `**${setName}** ${complete ? '✅' : ''} (${ownedInSet.length}/${setCards.length})\n`;
        for (const card of setCards) {
          const pc = playerCards.find(p => p.card_id === card.id);
          if (pc) {
            desc += `  ${rarityColors[card.rarity]} ${card.emoji} **${card.name}** x${pc.quantity}\n`;
          } else {
            desc += `  ❓ ???\n`;
          }
        }
        desc += '\n';
      }

      const completedSets = sets.filter(s => {
        const setCards = cards.filter(c => c.set === s);
        return setCards.every(c => owned.has(c.id));
      });

      desc += `\n📊 **${owned.size}/${cards.length}** Karten gesammelt`;
      if (completedSets.length > 0) {
        desc += `\n✅ **${completedSets.length}** Set(s) komplett`;
      }
      desc += `\n💰 Set-Bonus: **${config.currencySymbol}${SET_BONUS}** pro komplettem Set`;

      const embed = new EmbedBuilder()
        .setColor('#e67e22')
        .setTitle(`🎴 ${interaction.user.username}'s Sammlung`)
        .setDescription(desc)
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'verkaufen') {
      const cardId = interaction.options.getInteger('karten_id');
      const card = cards.find(c => c.id === cardId);
      if (!card) return interaction.reply('❌ Ungültige Karten-ID!');

      const pc = db.db.prepare('SELECT * FROM player_cards WHERE user_id = ? AND card_id = ?').get(userId, cardId);
      if (!pc || pc.quantity < 1) return interaction.reply('❌ Du hast diese Karte nicht!');

      if (pc.quantity <= 1) {
        return interaction.reply('❌ Du kannst dein letztes Exemplar nicht verkaufen! Nur Duplikate.');
      }

      const sellValue = Math.floor(card.value * 0.5);
      db.updateBalance(userId, sellValue);
      db.db.prepare('UPDATE player_cards SET quantity = quantity - 1 WHERE user_id = ? AND card_id = ?').run(userId, cardId);

      const embed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle('🎴 Karte verkauft!')
        .setDescription(
          `${card.emoji} **${card.name}** (\`${card.rarity}\`) verkauft!\n\n` +
          `💰 Erlös: **+${config.currencySymbol}${sellValue}**\n` +
          `Verbleibend: **${pc.quantity - 1}x**`
        )
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }
  },
};
