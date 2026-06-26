const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const COOLDOWN = 3 * 60 * 1000;
const cooldowns = new Map();

const rods = [
  { id: 'holz', name: 'Holzangel', emoji: '🪵', price: 0, bonus: 0, rarityBoost: 0 },
  { id: 'bambus', name: 'Bambusangel', emoji: '🎋', price: 500, bonus: 1, rarityBoost: 0.05 },
  { id: 'stahl', name: 'Stahlangel', emoji: '⚙️', price: 2000, bonus: 2, rarityBoost: 0.1 },
  { id: 'gold', name: 'Goldangel', emoji: '🥇', price: 8000, bonus: 3, rarityBoost: 0.15 },
  { id: 'diamant', name: 'Diamantangel', emoji: '💎', price: 25000, bonus: 5, rarityBoost: 0.25 },
  { id: 'mythisch', name: 'Mythische Angel', emoji: '🌟', price: 75000, bonus: 8, rarityBoost: 0.35 },
];

const spots = [
  { id: 'teich', name: 'Dorfteich', emoji: '🏞️', minLevel: 0, fishPool: 'common' },
  { id: 'fluss', name: 'Bergfluss', emoji: '🏔️', minLevel: 3, fishPool: 'uncommon' },
  { id: 'see', name: 'Tiefer See', emoji: '🌊', minLevel: 8, fishPool: 'rare' },
  { id: 'ozean', name: 'Offener Ozean', emoji: '🌅', minLevel: 15, fishPool: 'epic' },
  { id: 'abgrund', name: 'Tiefsee-Abgrund', emoji: '🌑', minLevel: 25, fishPool: 'legendary' },
];

const fishList = [
  { id: 'karpfen', name: 'Karpfen', emoji: '🐟', rarity: 'common', basePrice: 20, xp: 5 },
  { id: 'forelle', name: 'Forelle', emoji: '🐟', rarity: 'common', basePrice: 30, xp: 8 },
  { id: 'barsch', name: 'Barsch', emoji: '🐟', rarity: 'common', basePrice: 25, xp: 6 },
  { id: 'hering', name: 'Hering', emoji: '🐟', rarity: 'common', basePrice: 15, xp: 4 },
  { id: 'lachs', name: 'Lachs', emoji: '🐠', rarity: 'uncommon', basePrice: 60, xp: 15 },
  { id: 'zander', name: 'Zander', emoji: '🐠', rarity: 'uncommon', basePrice: 75, xp: 18 },
  { id: 'aal', name: 'Aal', emoji: '🐍', rarity: 'uncommon', basePrice: 80, xp: 20 },
  { id: 'thunfisch', name: 'Thunfisch', emoji: '🐠', rarity: 'uncommon', basePrice: 100, xp: 22 },
  { id: 'schwertfisch', name: 'Schwertfisch', emoji: '🗡️', rarity: 'rare', basePrice: 200, xp: 40 },
  { id: 'kugelfisch', name: 'Kugelfisch', emoji: '🐡', rarity: 'rare', basePrice: 250, xp: 45 },
  { id: 'oktopus', name: 'Oktopus', emoji: '🐙', rarity: 'rare', basePrice: 300, xp: 50 },
  { id: 'hai', name: 'Hai', emoji: '🦈', rarity: 'epic', basePrice: 500, xp: 80 },
  { id: 'rochen', name: 'Mantarochen', emoji: '🦑', rarity: 'epic', basePrice: 600, xp: 90 },
  { id: 'wal', name: 'Beluga-Wal', emoji: '🐋', rarity: 'epic', basePrice: 800, xp: 100 },
  { id: 'seedrache', name: 'Seedrache', emoji: '🐉', rarity: 'legendary', basePrice: 2000, xp: 200 },
  { id: 'goldkoi', name: 'Goldener Koi', emoji: '✨', rarity: 'legendary', basePrice: 3000, xp: 250 },
  { id: 'leviathan', name: 'Leviathan-Junge', emoji: '🌊', rarity: 'legendary', basePrice: 5000, xp: 500 },
  { id: 'stiefel', name: 'Alter Stiefel', emoji: '👢', rarity: 'junk', basePrice: 1, xp: 1 },
  { id: 'dose', name: 'Rostige Dose', emoji: '🥫', rarity: 'junk', basePrice: 2, xp: 1 },
  { id: 'schatztruhe', name: 'Schatztruhe', emoji: '🗝️', rarity: 'treasure', basePrice: 0, xp: 30 },
];

const rarityWeights = {
  common: { junk: 10, common: 55, uncommon: 25, rare: 8, epic: 1.5, legendary: 0.2, treasure: 0.3 },
  uncommon: { junk: 5, common: 30, uncommon: 40, rare: 18, epic: 5, legendary: 1, treasure: 1 },
  rare: { junk: 3, common: 15, uncommon: 30, rare: 32, epic: 14, legendary: 4, treasure: 2 },
  epic: { junk: 1, common: 5, uncommon: 15, rare: 30, epic: 32, legendary: 12, treasure: 5 },
  legendary: { junk: 0, common: 2, uncommon: 8, rare: 20, epic: 35, legendary: 25, treasure: 10 },
};

const rarityColors = {
  junk: '⬜', common: '🟩', uncommon: '🟦', rare: '🟪', epic: '🟧', legendary: '🟨', treasure: '🗝️',
};
const rarityNames = {
  junk: 'Müll', common: 'Gewöhnlich', uncommon: 'Ungewöhnlich', rare: 'Selten', epic: 'Episch', legendary: 'Legendär', treasure: 'Schatz',
};

function ensureFishingTable() {
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS fishing (
      user_id TEXT PRIMARY KEY,
      rod_id TEXT DEFAULT 'holz',
      fishing_level INTEGER DEFAULT 1,
      fishing_xp INTEGER DEFAULT 0,
      total_caught INTEGER DEFAULT 0,
      total_earned INTEGER DEFAULT 0,
      biggest_catch TEXT,
      biggest_value INTEGER DEFAULT 0
    )
  `);
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS fish_collection (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      fish_id TEXT NOT NULL,
      count INTEGER DEFAULT 0,
      biggest_size REAL DEFAULT 0,
      first_caught TEXT,
      UNIQUE(user_id, fish_id)
    )
  `);
}

function getFisher(userId) {
  let fisher = db.db.prepare('SELECT * FROM fishing WHERE user_id = ?').get(userId);
  if (!fisher) {
    db.db.prepare('INSERT INTO fishing (user_id) VALUES (?)').run(userId);
    fisher = db.db.prepare('SELECT * FROM fishing WHERE user_id = ?').get(userId);
  }
  return fisher;
}

function getXpForLevel(level) {
  return Math.floor(60 * Math.pow(level, 1.3));
}

function catchFish(poolType, rarityBoost) {
  const weights = { ...rarityWeights[poolType] };
  for (const key in weights) {
    if (key !== 'junk' && key !== 'common') {
      weights[key] += rarityBoost * 10;
    }
  }

  const total = Object.values(weights).reduce((s, w) => s + w, 0);
  const roll = Math.random() * total;
  let cumulative = 0;
  let chosenRarity = 'common';
  for (const [rarity, weight] of Object.entries(weights)) {
    cumulative += weight;
    if (roll < cumulative) { chosenRarity = rarity; break; }
  }

  const pool = fishList.filter(f => f.rarity === chosenRarity);
  if (pool.length === 0) return fishList[0];
  return pool[Math.floor(Math.random() * pool.length)];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('angeln')
    .setDescription('Angel-System — Fange Fische, sammle und verkaufe!')
    .addSubcommand(sub =>
      sub.setName('werfen')
        .setDescription('Wirf die Angel aus!')
        .addStringOption(opt =>
          opt.setName('ort')
            .setDescription('Wo angeln?')
            .addChoices(...spots.map(s => ({ name: `${s.emoji} ${s.name}`, value: s.id })))))
    .addSubcommand(sub =>
      sub.setName('sammlung')
        .setDescription('Zeige deine Fisch-Sammlung'))
    .addSubcommand(sub =>
      sub.setName('verkaufen')
        .setDescription('Verkaufe deinen letzten Fang'))
    .addSubcommand(sub =>
      sub.setName('angel')
        .setDescription('Zeige und kaufe Angelruten')
        .addStringOption(opt =>
          opt.setName('kaufen')
            .setDescription('Welche Angel kaufen?')
            .addChoices(...rods.filter(r => r.price > 0).map(r => ({ name: `${r.emoji} ${r.name} (${r.price}$)`, value: r.id })))))
    .addSubcommand(sub =>
      sub.setName('profil')
        .setDescription('Zeige dein Angler-Profil')),
  async execute(interaction) {
    ensureFishingTable();
    const userId = interaction.user.id;
    const config = require('../config.json');
    const action = interaction.options.getSubcommand();

    if (action === 'werfen') {
      const lastFish = cooldowns.get(userId);
      if (lastFish && Date.now() - lastFish < COOLDOWN) {
        const remaining = Math.ceil((COOLDOWN - (Date.now() - lastFish)) / 1000);
        return interaction.reply(`⏳ Die Fische brauchen eine Pause! Noch **${remaining}s**`);
      }

      const fisher = getFisher(userId);
      const rod = rods.find(r => r.id === fisher.rod_id) || rods[0];

      const spotId = interaction.options.getString('ort') || 'teich';
      const spot = spots.find(s => s.id === spotId);

      if (fisher.fishing_level < spot.minLevel) {
        return interaction.reply(`❌ **${spot.name}** braucht Angel-Level **${spot.minLevel}**! (Du: ${fisher.fishing_level})`);
      }

      cooldowns.set(userId, Date.now());

      const fish = catchFish(spot.fishPool, rod.rarityBoost);
      const size = +(0.5 + Math.random() * 2 + rod.bonus * 0.1).toFixed(1);
      const sizeMultiplier = size > 1.5 ? 1.5 : size > 1.0 ? 1.2 : 1.0;
      const price = Math.floor(fish.basePrice * sizeMultiplier * (1 + fisher.fishing_level * 0.03));
      const xpGain = fish.xp + rod.bonus;

      let treasureReward = 0;
      if (fish.rarity === 'treasure') {
        treasureReward = 500 + Math.floor(Math.random() * 2000) + fisher.fishing_level * 50;
        db.updateBalance(userId, treasureReward);
      }

      const existing = db.db.prepare('SELECT * FROM fish_collection WHERE user_id = ? AND fish_id = ?').get(userId, fish.id);
      const isNew = !existing;
      if (existing) {
        db.db.prepare('UPDATE fish_collection SET count = count + 1, biggest_size = MAX(biggest_size, ?) WHERE user_id = ? AND fish_id = ?')
          .run(size, userId, fish.id);
      } else {
        db.db.prepare('INSERT INTO fish_collection (user_id, fish_id, count, biggest_size, first_caught) VALUES (?, ?, 1, ?, ?)')
          .run(userId, fish.id, size, new Date().toISOString());
      }

      db.db.prepare('UPDATE fishing SET fishing_xp = fishing_xp + ?, total_caught = total_caught + 1 WHERE user_id = ?')
        .run(xpGain, userId);

      if (price > fisher.biggest_value) {
        db.db.prepare('UPDATE fishing SET biggest_catch = ?, biggest_value = ? WHERE user_id = ?')
          .run(fish.name, price, userId);
      }

      const updatedFisher = getFisher(userId);
      let levelUp = '';
      const xpNeeded = getXpForLevel(updatedFisher.fishing_level);
      if (updatedFisher.fishing_xp >= xpNeeded) {
        db.db.prepare('UPDATE fishing SET fishing_level = fishing_level + 1, fishing_xp = fishing_xp - ? WHERE user_id = ?')
          .run(xpNeeded, userId);
        const newFisher = getFisher(userId);
        levelUp = `\n\n🎉 **LEVEL UP!** Angel-Level **${newFisher.fishing_level}**!`;
        const newSpot = spots.find(s => s.minLevel === newFisher.fishing_level);
        if (newSpot) levelUp += `\n🔓 **${newSpot.emoji} ${newSpot.name}** freigeschaltet!`;
      }

      const sizeText = size >= 2.0 ? '🏆 RIESIG!' : size >= 1.5 ? '📏 Groß!' : size >= 1.0 ? '📏 Normal' : '📏 Klein';
      const rarityEmoji = rarityColors[fish.rarity];

      const embed = new EmbedBuilder()
        .setColor(fish.rarity === 'legendary' ? '#FFD700' : fish.rarity === 'epic' ? '#e67e22' : fish.rarity === 'rare' ? '#9b59b6' : '#3498db')
        .setTitle(`${rod.emoji} ${isNew ? '🆕 ' : ''}${fish.emoji} ${fish.name} gefangen!`)
        .setDescription(
          `${spot.emoji} **${spot.name}**\n\n` +
          `${rarityEmoji} Seltenheit: **${rarityNames[fish.rarity]}**\n` +
          `${sizeText} Größe: **${size}kg**\n` +
          (fish.rarity === 'treasure'
            ? `🗝️ **Schatztruhe geöffnet! +${config.currencySymbol}${treasureReward.toLocaleString()}!**\n`
            : `💰 Wert: **${config.currencySymbol}${price.toLocaleString()}**\n`) +
          `✨ XP: **+${xpGain}**` +
          (isNew ? '\n\n🆕 **Neue Art entdeckt!**' : '') +
          levelUp +
          `\n\nVerkaufe mit \`/angeln verkaufen\``
        )
        .setFooter({ text: `Gefangen: ${updatedFisher.total_caught + 1} Fische | ${rod.name}` })
        .setTimestamp();

      db.db.prepare('UPDATE fishing SET total_earned = total_earned WHERE user_id = ?').run(userId);

      const lastCatchData = { fishId: fish.id, name: fish.name, emoji: fish.emoji, price, rarity: fish.rarity, size };
      cooldowns.set(`${userId}_lastcatch`, lastCatchData);

      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'verkaufen') {
      const lastCatch = cooldowns.get(`${userId}_lastcatch`);
      if (!lastCatch) return interaction.reply('❌ Du hast keinen Fisch zum Verkaufen! Angel zuerst mit `/angeln werfen`.');

      if (lastCatch.rarity === 'treasure') return interaction.reply('❌ Schatztruhen werden automatisch geöffnet!');
      if (lastCatch.rarity === 'junk') {
        cooldowns.delete(`${userId}_lastcatch`);
        return interaction.reply(`🗑️ ${lastCatch.emoji} ${lastCatch.name} weggeworfen. Kein Wert.`);
      }

      db.updateBalance(userId, lastCatch.price);
      db.db.prepare('UPDATE fishing SET total_earned = total_earned + ? WHERE user_id = ?').run(lastCatch.price, userId);
      cooldowns.delete(`${userId}_lastcatch`);

      const embed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle(`💰 ${lastCatch.emoji} ${lastCatch.name} verkauft!`)
        .setDescription(
          `Größe: **${lastCatch.size}kg**\n` +
          `💰 Erlös: **+${config.currencySymbol}${lastCatch.price.toLocaleString()}**`
        )
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'sammlung') {
      const collection = db.db.prepare('SELECT * FROM fish_collection WHERE user_id = ? ORDER BY fish_id').all(userId);
      const collectedIds = new Set(collection.map(c => c.fish_id));

      const realFish = fishList.filter(f => f.rarity !== 'junk' && f.rarity !== 'treasure');
      const display = realFish.map(f => {
        if (collectedIds.has(f.id)) {
          const data = collection.find(c => c.fish_id === f.id);
          return `${rarityColors[f.rarity]} ${f.emoji} **${f.name}** — ${data.count}x (Rekord: ${data.biggest_size}kg)`;
        }
        return `${rarityColors[f.rarity]} ❓ ???`;
      });

      const completion = Math.floor((collectedIds.size / realFish.length) * 100);
      const bar = '█'.repeat(Math.floor(completion / 10)) + '░'.repeat(10 - Math.floor(completion / 10));

      const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle(`🐟 ${interaction.user.username}'s Fisch-Sammlung`)
        .setDescription(
          `\`${bar}\` **${completion}%** (${collection.filter(c => !['stiefel','dose','schatztruhe'].includes(c.fish_id)).length}/${realFish.length})\n\n` +
          display.join('\n') +
          (completion === 100 ? '\n\n🏆 **KOMPLETT! Meister-Angler!**' : '')
        )
        .setFooter({ text: '🟩 Gewöhnlich | 🟦 Ungewöhnlich | 🟪 Selten | 🟧 Episch | 🟨 Legendär' })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'angel') {
      const fisher = getFisher(userId);
      const buyId = interaction.options.getString('kaufen');

      if (buyId) {
        const rod = rods.find(r => r.id === buyId);
        const currentRodIdx = rods.findIndex(r => r.id === fisher.rod_id);
        const newRodIdx = rods.findIndex(r => r.id === buyId);

        if (newRodIdx <= currentRodIdx) return interaction.reply(`❌ Du hast bereits eine gleich gute oder bessere Angel!`);
        if (db.getBalance(userId) < rod.price) {
          return interaction.reply(`❌ Die **${rod.name}** kostet **${config.currencySymbol}${rod.price.toLocaleString()}**!`);
        }

        db.updateBalance(userId, -rod.price);
        db.db.prepare('UPDATE fishing SET rod_id = ? WHERE user_id = ?').run(rod.id, userId);

        const embed = new EmbedBuilder()
          .setColor('#FFD700')
          .setTitle(`${rod.emoji} ${rod.name} gekauft!`)
          .setDescription(
            `Du hast die **${rod.name}** erworben!\n\n` +
            `📊 Größen-Bonus: **+${rod.bonus}**\n` +
            `🎯 Seltenheits-Boost: **+${(rod.rarityBoost * 100).toFixed(0)}%**`
          )
          .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      const currentRod = rods.find(r => r.id === fisher.rod_id) || rods[0];
      const rodList = rods.map(r => {
        const owned = rods.indexOf(r) <= rods.indexOf(currentRod);
        return `${r.emoji} **${r.name}** ${owned ? '✅' : `— ${config.currencySymbol}${r.price.toLocaleString()}`}\n` +
          `  Bonus: +${r.bonus} Größe | +${(r.rarityBoost * 100).toFixed(0)}% Seltenheit`;
      });

      const embed = new EmbedBuilder()
        .setColor('#e67e22')
        .setTitle('🎣 Angel-Shop')
        .setDescription(
          `Aktuelle Angel: ${currentRod.emoji} **${currentRod.name}**\n\n` +
          rodList.join('\n\n')
        )
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'profil') {
      const fisher = getFisher(userId);
      const rod = rods.find(r => r.id === fisher.rod_id) || rods[0];
      const xpNeeded = getXpForLevel(fisher.fishing_level);
      const bar = '█'.repeat(Math.floor((fisher.fishing_xp / xpNeeded) * 10)) +
                  '░'.repeat(10 - Math.floor((fisher.fishing_xp / xpNeeded) * 10));

      const collection = db.db.prepare('SELECT COUNT(*) as cnt FROM fish_collection WHERE user_id = ?').get(userId);
      const realFish = fishList.filter(f => f.rarity !== 'junk' && f.rarity !== 'treasure');
      const unlockedSpots = spots.filter(s => fisher.fishing_level >= s.minLevel);

      const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle(`🎣 ${interaction.user.username}'s Angler-Profil`)
        .setDescription(
          `📊 Level: **${fisher.fishing_level}**\n` +
          `✨ XP: \`${bar}\` ${fisher.fishing_xp}/${xpNeeded}\n` +
          `🎣 Angel: ${rod.emoji} **${rod.name}**\n\n` +
          `🐟 Gefangen: **${fisher.total_caught}**\n` +
          `💰 Verdient: **${config.currencySymbol}${fisher.total_earned.toLocaleString()}**\n` +
          `🏆 Rekord: **${fisher.biggest_catch || 'Keiner'}** (${config.currencySymbol}${fisher.biggest_value.toLocaleString()})\n` +
          `📖 Sammlung: **${collection.cnt}/${realFish.length}** Arten\n\n` +
          `🗺️ Orte: ${unlockedSpots.map(s => `${s.emoji}`).join(' ')} (${unlockedSpots.length}/${spots.length})`
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }
  },
};
