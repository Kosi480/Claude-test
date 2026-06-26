const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const COOLDOWN = 2 * 60 * 1000;
const cooldowns = new Map();

function ensureSurvivalTables() {
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS survivors (
      user_id TEXT PRIMARY KEY,
      day INTEGER DEFAULT 1,
      hunger INTEGER DEFAULT 80,
      thirst INTEGER DEFAULT 80,
      health INTEGER DEFAULT 100,
      warmth INTEGER DEFAULT 70,
      shelter_level INTEGER DEFAULT 0,
      tool_level INTEGER DEFAULT 0,
      weapon_level INTEGER DEFAULT 0,
      fire INTEGER DEFAULT 0,
      days_survived INTEGER DEFAULT 0,
      best_streak INTEGER DEFAULT 0,
      animals_hunted INTEGER DEFAULT 0,
      items_crafted INTEGER DEFAULT 0,
      biome INTEGER DEFAULT 0,
      alive INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS survival_inventory (
      user_id TEXT,
      item TEXT,
      amount INTEGER DEFAULT 0,
      PRIMARY KEY (user_id, item)
    );
  `);
}

const biomes = [
  { name: 'Wald', emoji: '🌲', huntBonus: 1.0, gatherBonus: 1.2, danger: 1, waterAccess: true },
  { name: 'Wüste', emoji: '🏜️', huntBonus: 0.6, gatherBonus: 0.4, danger: 2, waterAccess: false },
  { name: 'Berge', emoji: '⛰️', huntBonus: 0.8, gatherBonus: 0.7, danger: 3, waterAccess: true },
  { name: 'Sumpf', emoji: '🌿', huntBonus: 0.9, gatherBonus: 1.0, danger: 2, waterAccess: true },
  { name: 'Tundra', emoji: '❄️', huntBonus: 0.7, gatherBonus: 0.3, danger: 4, waterAccess: false },
  { name: 'Dschungel', emoji: '🌴', huntBonus: 1.3, gatherBonus: 1.5, danger: 3, waterAccess: true },
];

const gatherItems = [
  { name: 'Holz', emoji: '🪵', type: 'material', weight: 30 },
  { name: 'Stein', emoji: '🪨', type: 'material', weight: 25 },
  { name: 'Beeren', emoji: '🫐', type: 'food', hunger: 15, weight: 20 },
  { name: 'Pilze', emoji: '🍄', type: 'food', hunger: 10, weight: 15 },
  { name: 'Kräuter', emoji: '🌿', type: 'medicine', heal: 20, weight: 10 },
  { name: 'Lehm', emoji: '🟤', type: 'material', weight: 10 },
  { name: 'Fasern', emoji: '🧵', type: 'material', weight: 15 },
  { name: 'Feuerstein', emoji: '🔥', type: 'material', weight: 5 },
];

const huntAnimals = [
  { name: 'Kaninchen', emoji: '🐇', difficulty: 10, meat: 1, fur: 1, xpReward: 100 },
  { name: 'Reh', emoji: '🦌', difficulty: 25, meat: 3, fur: 2, xpReward: 300 },
  { name: 'Wildschwein', emoji: '🐗', difficulty: 40, meat: 4, fur: 2, xpReward: 500 },
  { name: 'Wolf', emoji: '🐺', difficulty: 55, meat: 2, fur: 3, xpReward: 700 },
  { name: 'Bär', emoji: '🐻', difficulty: 75, meat: 6, fur: 5, xpReward: 1200 },
  { name: 'Elch', emoji: '🫎', difficulty: 60, meat: 8, fur: 4, xpReward: 1000 },
];

const craftRecipes = [
  { name: 'Lagerfeuer', emoji: '🔥', materials: { 'Holz': 3, 'Feuerstein': 1 }, effect: 'fire', desc: 'Wärme und Kochen' },
  { name: 'Steinaxt', emoji: '🪓', materials: { 'Holz': 2, 'Stein': 3 }, effect: 'tool', desc: 'Besseres Sammeln' },
  { name: 'Speer', emoji: '🗡️', materials: { 'Holz': 3, 'Stein': 2, 'Fasern': 1 }, effect: 'weapon', desc: 'Besseres Jagen' },
  { name: 'Unterschlupf', emoji: '⛺', materials: { 'Holz': 5, 'Fasern': 3 }, effect: 'shelter', desc: 'Schutz vor Wetter' },
  { name: 'Wasserbehälter', emoji: '🫗', materials: { 'Lehm': 3, 'Feuerstein': 1 }, effect: 'water_storage', desc: 'Wasser speichern' },
  { name: 'Verband', emoji: '🩹', materials: { 'Kräuter': 2, 'Fasern': 1 }, effect: 'heal', desc: 'Wunden heilen' },
  { name: 'Pelzmantel', emoji: '🧥', materials: { 'Fell': 4, 'Fasern': 2 }, effect: 'warmth', desc: 'Kälteschutz' },
  { name: 'Blockhaus', emoji: '🏠', materials: { 'Holz': 15, 'Stein': 8, 'Lehm': 5 }, effect: 'shelter2', desc: 'Starker Schutz' },
];

const dailyEvents = [
  { name: 'Sturm', emoji: '🌪️', effect: 'warmth', amount: -20, text: 'Ein Sturm tobt! Deine Wärme sinkt.' },
  { name: 'Sonniger Tag', emoji: '☀️', effect: 'warmth', amount: 15, text: 'Sonnenschein wärmt dich auf.' },
  { name: 'Wasserfund', emoji: '💧', effect: 'thirst', amount: 25, text: 'Du findest eine Quelle!' },
  { name: 'Beerenstrauch', emoji: '🫐', effect: 'hunger', amount: 15, text: 'Essbare Beeren entdeckt!' },
  { name: 'Raubtier', emoji: '🐺', effect: 'health', amount: -20, text: 'Ein Raubtier greift an!' },
  { name: 'Verletzung', emoji: '🤕', effect: 'health', amount: -15, text: 'Du verletzt dich beim Klettern.' },
  { name: 'Schatztruhe', emoji: '💰', effect: 'money', amount: 500, text: 'Eine vergrabene Truhe gefunden!' },
  { name: 'Reisender', emoji: '🧳', effect: 'trade', amount: 0, text: 'Ein wandernder Händler gibt dir Vorräte.' },
];

function getSurvivor(userId) {
  ensureSurvivalTables();
  let s = db.db.prepare('SELECT * FROM survivors WHERE user_id = ?').get(userId);
  if (!s) {
    db.db.prepare('INSERT INTO survivors (user_id) VALUES (?)').run(userId);
    s = db.db.prepare('SELECT * FROM survivors WHERE user_id = ?').get(userId);
  }
  return s;
}

function getInv(userId) {
  return db.db.prepare('SELECT * FROM survival_inventory WHERE user_id = ? AND amount > 0').all(userId);
}

function addItem(userId, item, amount) {
  db.db.prepare(`INSERT INTO survival_inventory (user_id, item, amount) VALUES (?, ?, ?)
    ON CONFLICT(user_id, item) DO UPDATE SET amount = amount + ?`).run(userId, item, amount, amount);
}

function hasItems(userId, required) {
  for (const [item, amt] of Object.entries(required)) {
    const row = db.db.prepare('SELECT amount FROM survival_inventory WHERE user_id = ? AND item = ?').get(userId, item);
    if (!row || row.amount < amt) return false;
  }
  return true;
}

function consumeItems(userId, required) {
  for (const [item, amt] of Object.entries(required)) {
    db.db.prepare('UPDATE survival_inventory SET amount = amount - ? WHERE user_id = ? AND item = ?').run(amt, userId, item);
  }
}

function statusBar(value, max = 100) {
  const filled = Math.round(value / max * 10);
  return '█'.repeat(Math.max(0, filled)) + '░'.repeat(Math.max(0, 10 - filled)) + ` ${value}%`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('survival')
    .setDescription('Überlebe in der Wildnis!')
    .addSubcommand(sub => sub.setName('status').setDescription('Dein Überlebensstatus'))
    .addSubcommand(sub => sub.setName('sammeln').setDescription('Sammle Ressourcen in der Umgebung'))
    .addSubcommand(sub => sub.setName('jagen').setDescription('Jage ein Tier')
      .addIntegerOption(opt => opt.setName('tier').setDescription('Tier-Nr 1-6').setRequired(true).setMinValue(1).setMaxValue(6)))
    .addSubcommand(sub => sub.setName('craften').setDescription('Stelle einen Gegenstand her')
      .addIntegerOption(opt => opt.setName('rezept').setDescription('Rezept-Nr 1-8').setRequired(true).setMinValue(1).setMaxValue(8)))
    .addSubcommand(sub => sub.setName('essen').setDescription('Iss gesammeltes Essen'))
    .addSubcommand(sub => sub.setName('trinken').setDescription('Trinke Wasser'))
    .addSubcommand(sub => sub.setName('biom').setDescription('Reise in ein anderes Biom')
      .addIntegerOption(opt => opt.setName('nummer').setDescription('Biom 1-6').setRequired(true).setMinValue(1).setMaxValue(6)))
    .addSubcommand(sub => sub.setName('rezepte').setDescription('Zeige Craft-Rezepte'))
    .addSubcommand(sub => sub.setName('aufgeben').setDescription('Aufgeben und Belohnung kassieren')),

  async execute(interaction) {
    const userId = interaction.user.id;
    const config = require('../config.json');
    const sub = interaction.options.getSubcommand();
    ensureSurvivalTables();

    const survivor = getSurvivor(userId);

    if (!survivor.alive && sub !== 'status') {
      db.db.prepare('UPDATE survivors SET alive = 1, hunger = 80, thirst = 80, health = 100, warmth = 70, day = 1, shelter_level = 0, tool_level = 0, weapon_level = 0, fire = 0 WHERE user_id = ?').run(userId);
      db.db.prepare('DELETE FROM survival_inventory WHERE user_id = ?').run(userId);
      return interaction.reply('🔄 Neuer Survival-Run gestartet! Alles zurückgesetzt.');
    }

    if (sub === 'status') {
      const biome = biomes[survivor.biome];
      const embed = new EmbedBuilder()
        .setColor(survivor.health > 50 ? '#27ae60' : survivor.health > 20 ? '#f39c12' : '#e74c3c')
        .setTitle(`🏕️ Survival — Tag ${survivor.day}`)
        .setDescription(
          `**Biom:** ${biome.emoji} ${biome.name}\n\n` +
          `❤️ Gesundheit: ${statusBar(survivor.health)}\n` +
          `🍖 Hunger: ${statusBar(survivor.hunger)}\n` +
          `💧 Durst: ${statusBar(survivor.thirst)}\n` +
          `🔥 Wärme: ${statusBar(survivor.warmth)}\n\n` +
          `⛺ Unterschlupf: **Stufe ${survivor.shelter_level}**\n` +
          `🪓 Werkzeug: **Stufe ${survivor.tool_level}**\n` +
          `🗡️ Waffe: **Stufe ${survivor.weapon_level}**\n` +
          `🔥 Feuer: **${survivor.fire ? 'Ja' : 'Nein'}**\n\n` +
          `📊 **Rekorde:**\n` +
          `📅 Tage überlebt: **${survivor.days_survived}**\n` +
          `🏆 Bester Run: **${survivor.best_streak} Tage**\n` +
          `🦌 Tiere gejagt: **${survivor.animals_hunted}**\n` +
          `🔧 Items gecraftet: **${survivor.items_crafted}**\n\n` +
          (survivor.alive ? '' : '💀 **Du bist gestorben!** Starte einen neuen Run mit einem beliebigen Befehl.')
        )
        .setTimestamp();

      const inv = getInv(userId);
      if (inv.length > 0) {
        embed.addFields({ name: '🎒 Inventar', value: inv.map(i => `${i.item}: **${i.amount}**`).join(' | ') });
      }

      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'sammeln') {
      const lastPlay = cooldowns.get(`${userId}_gather`);
      if (lastPlay && Date.now() - lastPlay < COOLDOWN) {
        const remaining = Math.ceil((COOLDOWN - (Date.now() - lastPlay)) / 1000);
        return interaction.reply(`⏳ Nächstes Sammeln in **${remaining}s**!`);
      }
      cooldowns.set(`${userId}_gather`, Date.now());

      const biome = biomes[survivor.biome];
      const toolBonus = survivor.tool_level * 0.3;
      const numItems = Math.floor((2 + Math.random() * 3) * biome.gatherBonus * (1 + toolBonus));

      const gathered = [];
      for (let i = 0; i < numItems; i++) {
        const item = gatherItems[Math.floor(Math.random() * gatherItems.length)];
        addItem(userId, item.name, 1);
        const existing = gathered.find(g => g.name === item.name);
        if (existing) existing.count++;
        else gathered.push({ ...item, count: 1 });
      }

      const hungerDrop = 5 + Math.floor(Math.random() * 5);
      const thirstDrop = 5 + Math.floor(Math.random() * 5);
      db.db.prepare('UPDATE survivors SET hunger = MAX(0, hunger - ?), thirst = MAX(0, thirst - ?), day = day + 1, days_survived = days_survived + 1 WHERE user_id = ?')
        .run(hungerDrop, thirstDrop, userId);

      const event = Math.random() < 0.35 ? dailyEvents[Math.floor(Math.random() * dailyEvents.length)] : null;
      let eventText = '';
      if (event) {
        if (event.effect === 'money') {
          db.updateBalance(userId, event.amount);
          eventText = `\n\n${event.emoji} **${event.name}:** ${event.text} +${config.currencySymbol}${event.amount}`;
        } else if (event.effect === 'trade') {
          addItem(userId, 'Fleisch', 2);
          addItem(userId, 'Kräuter', 1);
          eventText = `\n\n${event.emoji} **${event.name}:** ${event.text}`;
        } else {
          const field = event.effect;
          db.db.prepare(`UPDATE survivors SET ${field} = MAX(0, MIN(100, ${field} + ?)) WHERE user_id = ?`).run(event.amount, userId);
          eventText = `\n\n${event.emoji} **${event.name}:** ${event.text} (${event.amount > 0 ? '+' : ''}${event.amount})`;
        }
      }

      const updated = getSurvivor(userId);
      const bestStreak = Math.max(updated.best_streak, updated.day - 1);
      db.db.prepare('UPDATE survivors SET best_streak = ? WHERE user_id = ?').run(bestStreak, userId);

      if (updated.hunger <= 0 || updated.thirst <= 0 || updated.health <= 0) {
        db.db.prepare('UPDATE survivors SET alive = 0 WHERE user_id = ?').run(userId);
        const reward = updated.day * 50;
        db.updateBalance(userId, reward);

        const embed = new EmbedBuilder()
          .setColor('#e74c3c')
          .setTitle('💀 Du bist gestorben!')
          .setDescription(
            `Du hast **${updated.day - 1} Tage** überlebt.\n` +
            `💰 Belohnung: **${config.currencySymbol}${reward.toLocaleString()}**\n\n` +
            `*Starte einen neuen Run mit einem beliebigen Befehl.*`
          )
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      const embed = new EmbedBuilder()
        .setColor('#27ae60')
        .setTitle(`🌲 Tag ${updated.day} — Gesammelt!`)
        .setDescription(
          gathered.map(g => `${g.emoji} ${g.name} x${g.count}`).join('\n') +
          `\n\n🍖 -${hungerDrop} Hunger | 💧 -${thirstDrop} Durst` +
          eventText
        )
        .setFooter({ text: `❤️ ${updated.health} | 🍖 ${updated.hunger} | 💧 ${updated.thirst} | 🔥 ${updated.warmth}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'jagen') {
      const lastPlay = cooldowns.get(`${userId}_hunt`);
      if (lastPlay && Date.now() - lastPlay < COOLDOWN) {
        const remaining = Math.ceil((COOLDOWN - (Date.now() - lastPlay)) / 1000);
        return interaction.reply(`⏳ Nächste Jagd in **${remaining}s**!`);
      }

      const animalIdx = interaction.options.getInteger('tier') - 1;
      const animal = huntAnimals[animalIdx];
      const biome = biomes[survivor.biome];

      cooldowns.set(`${userId}_hunt`, Date.now());

      const weaponBonus = survivor.weapon_level * 10;
      const roll = Math.floor(Math.random() * 50) + 1 + weaponBonus;
      const threshold = Math.floor(animal.difficulty / biome.huntBonus);
      const success = roll >= threshold;

      const hungerDrop = 8;
      const thirstDrop = 6;
      db.db.prepare('UPDATE survivors SET hunger = MAX(0, hunger - ?), thirst = MAX(0, thirst - ?), day = day + 1, days_survived = days_survived + 1 WHERE user_id = ?')
        .run(hungerDrop, thirstDrop, userId);

      if (success) {
        addItem(userId, 'Fleisch', animal.meat);
        addItem(userId, 'Fell', animal.fur);
        db.db.prepare('UPDATE survivors SET animals_hunted = animals_hunted + 1 WHERE user_id = ?').run(userId);
        db.updateBalance(userId, animal.xpReward);

        const embed = new EmbedBuilder()
          .setColor('#27ae60')
          .setTitle(`${animal.emoji} Jagd erfolgreich!`)
          .setDescription(
            `Du hast ein **${animal.name}** erlegt!\n\n` +
            `🎲 ${roll} ≥ ${threshold} ✅\n\n` +
            `🥩 +${animal.meat} Fleisch | 🧶 +${animal.fur} Fell\n` +
            `💰 +${config.currencySymbol}${animal.xpReward.toLocaleString()}`
          )
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      } else {
        const dmg = Math.floor(animal.difficulty / 5);
        db.db.prepare('UPDATE survivors SET health = MAX(0, health - ?) WHERE user_id = ?').run(dmg, userId);

        const embed = new EmbedBuilder()
          .setColor('#e74c3c')
          .setTitle(`${animal.emoji} Jagd gescheitert!`)
          .setDescription(
            `Das **${animal.name}** ist entkommen!\n\n` +
            `🎲 ${roll} < ${threshold} ❌\n` +
            `❤️ -${dmg} Gesundheit`
          )
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }
    }

    if (sub === 'essen') {
      const inv = getInv(userId);
      const meat = inv.find(i => i.item === 'Fleisch');
      const berries = inv.find(i => i.item === 'Beeren');
      const mushrooms = inv.find(i => i.item === 'Pilze');

      let fed = 0;
      if (meat && meat.amount > 0) {
        const amount = Math.min(meat.amount, 3);
        const restore = survivor.fire ? amount * 25 : amount * 15;
        consumeItems(userId, { 'Fleisch': amount });
        fed += restore;
      }
      if (berries && berries.amount > 0) {
        const amount = Math.min(berries.amount, 5);
        consumeItems(userId, { 'Beeren': amount });
        fed += amount * 10;
      }
      if (mushrooms && mushrooms.amount > 0) {
        const amount = Math.min(mushrooms.amount, 3);
        consumeItems(userId, { 'Pilze': amount });
        fed += amount * 8;
      }

      if (fed === 0) return interaction.reply('❌ Du hast nichts Essbares! Sammle Beeren oder jage Tiere.');

      db.db.prepare('UPDATE survivors SET hunger = MIN(100, hunger + ?) WHERE user_id = ?').run(fed, userId);
      const updated = getSurvivor(userId);

      return interaction.reply(`🍖 Gegessen! Hunger +${fed} → **${updated.hunger}%**${survivor.fire ? ' (Feuer-Bonus!)' : ''}`);
    }

    if (sub === 'trinken') {
      const biome = biomes[survivor.biome];
      if (!biome.waterAccess) {
        const container = getInv(userId).find(i => i.item === 'Wasserbehälter');
        if (!container) return interaction.reply(`❌ Kein Wasser in der ${biome.emoji} ${biome.name}! Crafte einen Wasserbehälter oder reise in ein anderes Biom.`);
      }

      const restore = 30 + (survivor.shelter_level * 5);
      db.db.prepare('UPDATE survivors SET thirst = MIN(100, thirst + ?) WHERE user_id = ?').run(restore, userId);
      const updated = getSurvivor(userId);

      return interaction.reply(`💧 Getrunken! Durst +${restore} → **${updated.thirst}%**`);
    }

    if (sub === 'craften') {
      const recipeIdx = interaction.options.getInteger('rezept') - 1;
      const recipe = craftRecipes[recipeIdx];
      if (!recipe) return interaction.reply('❌ Ungültiges Rezept!');

      if (!hasItems(userId, recipe.materials)) {
        const needed = Object.entries(recipe.materials).map(([m, a]) => `${a}x ${m}`).join(', ');
        return interaction.reply(`❌ Nicht genug Material! Benötigt: ${needed}`);
      }

      consumeItems(userId, recipe.materials);

      switch (recipe.effect) {
        case 'fire':
          db.db.prepare('UPDATE survivors SET fire = 1 WHERE user_id = ?').run(userId);
          break;
        case 'tool':
          db.db.prepare('UPDATE survivors SET tool_level = MIN(tool_level + 1, 5) WHERE user_id = ?').run(userId);
          break;
        case 'weapon':
          db.db.prepare('UPDATE survivors SET weapon_level = MIN(weapon_level + 1, 5) WHERE user_id = ?').run(userId);
          break;
        case 'shelter':
          db.db.prepare('UPDATE survivors SET shelter_level = MAX(shelter_level, 1) WHERE user_id = ?').run(userId);
          break;
        case 'shelter2':
          db.db.prepare('UPDATE survivors SET shelter_level = MAX(shelter_level, 2) WHERE user_id = ?').run(userId);
          break;
        case 'heal':
          db.db.prepare('UPDATE survivors SET health = MIN(100, health + 30) WHERE user_id = ?').run(userId);
          break;
        case 'warmth':
          db.db.prepare('UPDATE survivors SET warmth = MIN(100, warmth + 25) WHERE user_id = ?').run(userId);
          break;
        case 'water_storage':
          addItem(userId, 'Wasserbehälter', 1);
          break;
      }

      db.db.prepare('UPDATE survivors SET items_crafted = items_crafted + 1 WHERE user_id = ?').run(userId);

      return interaction.reply(`${recipe.emoji} **${recipe.name}** hergestellt! ${recipe.desc}`);
    }

    if (sub === 'rezepte') {
      const lines = craftRecipes.map((r, i) => {
        const mats = Object.entries(r.materials).map(([m, a]) => `${a}x ${m}`).join(', ');
        return `**${i + 1}.** ${r.emoji} **${r.name}** — ${r.desc}\n   ${mats}`;
      });

      const embed = new EmbedBuilder()
        .setColor('#8e44ad')
        .setTitle('📋 Craft-Rezepte')
        .setDescription(lines.join('\n\n'))
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'biom') {
      const biomeIdx = interaction.options.getInteger('nummer') - 1;
      const newBiome = biomes[biomeIdx];

      db.db.prepare('UPDATE survivors SET biome = ? WHERE user_id = ?').run(biomeIdx, userId);

      const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle(`${newBiome.emoji} Biom gewechselt!`)
        .setDescription(
          `Du reist in: **${newBiome.name}**\n\n` +
          `🦌 Jagdbonus: **x${newBiome.huntBonus}**\n` +
          `🌿 Sammelbonus: **x${newBiome.gatherBonus}**\n` +
          `⚠️ Gefahr: **${newBiome.danger}/5**\n` +
          `💧 Wasser: **${newBiome.waterAccess ? 'Ja' : 'Nein'}**`
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'aufgeben') {
      const reward = survivor.day * 50 + survivor.animals_hunted * 30;
      db.updateBalance(userId, reward);
      db.db.prepare('UPDATE survivors SET alive = 0 WHERE user_id = ?').run(userId);

      const embed = new EmbedBuilder()
        .setColor('#f39c12')
        .setTitle('🏳️ Aufgegeben!')
        .setDescription(
          `Du hast **${survivor.day} Tage** überlebt.\n` +
          `🦌 Tiere gejagt: **${survivor.animals_hunted}**\n` +
          `🔧 Items gecraftet: **${survivor.items_crafted}**\n\n` +
          `💰 Belohnung: **${config.currencySymbol}${reward.toLocaleString()}**`
        )
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }
  },
};
