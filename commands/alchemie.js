const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const COOLDOWN = 2 * 60 * 1000;
const cooldowns = new Map();

const baseElements = [
  { id: 'feuer', name: 'Feuer', emoji: '🔥', tier: 0 },
  { id: 'wasser', name: 'Wasser', emoji: '💧', tier: 0 },
  { id: 'erde', name: 'Erde', emoji: '🌍', tier: 0 },
  { id: 'luft', name: 'Luft', emoji: '💨', tier: 0 },
];

const combinations = [
  { a: 'feuer', b: 'wasser', result: 'dampf', name: 'Dampf', emoji: '♨️', tier: 1, reward: 200 },
  { a: 'feuer', b: 'erde', result: 'lava', name: 'Lava', emoji: '🌋', tier: 1, reward: 200 },
  { a: 'wasser', b: 'erde', result: 'schlamm', name: 'Schlamm', emoji: '🟤', tier: 1, reward: 200 },
  { a: 'feuer', b: 'luft', result: 'blitz', name: 'Blitz', emoji: '⚡', tier: 1, reward: 200 },
  { a: 'wasser', b: 'luft', result: 'regen', name: 'Regen', emoji: '🌧️', tier: 1, reward: 200 },
  { a: 'erde', b: 'luft', result: 'staub', name: 'Staub', emoji: '🌫️', tier: 1, reward: 200 },
  { a: 'dampf', b: 'erde', result: 'geysir', name: 'Geysir', emoji: '⛲', tier: 2, reward: 500 },
  { a: 'lava', b: 'wasser', result: 'obsidian', name: 'Obsidian', emoji: '🖤', tier: 2, reward: 500 },
  { a: 'blitz', b: 'schlamm', result: 'leben', name: 'Leben', emoji: '🌱', tier: 2, reward: 500 },
  { a: 'regen', b: 'erde', result: 'pflanze', name: 'Pflanze', emoji: '🌿', tier: 2, reward: 500 },
  { a: 'staub', b: 'feuer', result: 'explosion', name: 'Explosion', emoji: '💥', tier: 2, reward: 500 },
  { a: 'dampf', b: 'blitz', result: 'energie', name: 'Energie', emoji: '⚡', tier: 2, reward: 500 },
  { a: 'leben', b: 'pflanze', result: 'wald', name: 'Wald', emoji: '🌲', tier: 3, reward: 1000 },
  { a: 'obsidian', b: 'blitz', result: 'kristall', name: 'Kristall', emoji: '💎', tier: 3, reward: 1000 },
  { a: 'energie', b: 'leben', result: 'magie', name: 'Magie', emoji: '✨', tier: 3, reward: 1000 },
  { a: 'explosion', b: 'obsidian', result: 'meteorit', name: 'Meteorit', emoji: '☄️', tier: 3, reward: 1000 },
  { a: 'geysir', b: 'regen', result: 'ozean', name: 'Ozean', emoji: '🌊', tier: 3, reward: 1000 },
  { a: 'magie', b: 'kristall', result: 'philosophenstein', name: 'Stein der Weisen', emoji: '🏆', tier: 4, reward: 5000 },
  { a: 'meteorit', b: 'ozean', result: 'welt', name: 'Neue Welt', emoji: '🌎', tier: 4, reward: 5000 },
  { a: 'wald', b: 'magie', result: 'elfenreich', name: 'Elfenreich', emoji: '🧝', tier: 4, reward: 5000 },
];

const allElements = [
  ...baseElements,
  ...combinations.map(c => ({ id: c.result, name: c.name, emoji: c.emoji, tier: c.tier })),
];

function ensureAlchemyTable() {
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS alchemy (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      element_id TEXT NOT NULL,
      discovered_at TEXT NOT NULL,
      UNIQUE(user_id, element_id)
    )
  `);
}

function getDiscovered(userId) {
  return db.db.prepare('SELECT element_id FROM alchemy WHERE user_id = ?').all(userId).map(r => r.element_id);
}

function initPlayer(userId) {
  for (const el of baseElements) {
    db.db.prepare('INSERT OR IGNORE INTO alchemy (user_id, element_id, discovered_at) VALUES (?, ?, ?)')
      .run(userId, el.id, new Date().toISOString());
  }
}

function findCombination(a, b) {
  return combinations.find(c =>
    (c.a === a && c.b === b) || (c.a === b && c.b === a)
  );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('alchemie')
    .setDescription('Kombiniere Elemente und entdecke neue!')
    .addSubcommand(sub =>
      sub.setName('mischen')
        .setDescription('Mische zwei Elemente')
        .addStringOption(opt =>
          opt.setName('element1')
            .setDescription('Erstes Element')
            .setRequired(true))
        .addStringOption(opt =>
          opt.setName('element2')
            .setDescription('Zweites Element')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('labor')
        .setDescription('Zeige dein Alchemie-Labor'))
    .addSubcommand(sub =>
      sub.setName('hinweis')
        .setDescription('Kaufe einen Hinweis für eine Kombination (500$)')),
  async execute(interaction) {
    ensureAlchemyTable();
    const userId = interaction.user.id;
    const config = require('../config.json');
    const action = interaction.options.getSubcommand();

    initPlayer(userId);

    if (action === 'mischen') {
      const lastPlay = cooldowns.get(userId);
      if (lastPlay && Date.now() - lastPlay < COOLDOWN) {
        const remaining = Math.ceil((COOLDOWN - (Date.now() - lastPlay)) / 1000);
        return interaction.reply(`⏳ Du musst noch **${remaining}s** warten!`);
      }

      const el1Name = interaction.options.getString('element1').toLowerCase();
      const el2Name = interaction.options.getString('element2').toLowerCase();

      const discovered = getDiscovered(userId);

      const el1 = allElements.find(e => e.name.toLowerCase() === el1Name || e.id === el1Name);
      const el2 = allElements.find(e => e.name.toLowerCase() === el2Name || e.id === el2Name);

      if (!el1) return interaction.reply(`❌ Element **${el1Name}** nicht gefunden!`);
      if (!el2) return interaction.reply(`❌ Element **${el2Name}** nicht gefunden!`);

      if (!discovered.includes(el1.id)) return interaction.reply(`❌ Du hast **${el1.emoji} ${el1.name}** noch nicht entdeckt!`);
      if (!discovered.includes(el2.id)) return interaction.reply(`❌ Du hast **${el2.emoji} ${el2.name}** noch nicht entdeckt!`);

      cooldowns.set(userId, Date.now());

      const combo = findCombination(el1.id, el2.id);

      if (!combo) {
        const embed = new EmbedBuilder()
          .setColor('#95a5a6')
          .setTitle('⚗️ Keine Reaktion...')
          .setDescription(
            `${el1.emoji} **${el1.name}** + ${el2.emoji} **${el2.name}**\n\n` +
            `💨 Die Elemente reagieren nicht miteinander.\n` +
            `Versuche eine andere Kombination!`
          )
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      const alreadyDiscovered = discovered.includes(combo.result);

      if (!alreadyDiscovered) {
        db.db.prepare('INSERT OR IGNORE INTO alchemy (user_id, element_id, discovered_at) VALUES (?, ?, ?)')
          .run(userId, combo.result, new Date().toISOString());
        db.updateBalance(userId, combo.reward);
      }

      const tierStars = '⭐'.repeat(combo.tier);
      const newDiscovered = getDiscovered(userId);

      const embed = new EmbedBuilder()
        .setColor(alreadyDiscovered ? '#3498db' : combo.tier >= 3 ? '#FFD700' : '#2ecc71')
        .setTitle(alreadyDiscovered ? '⚗️ Bekannte Reaktion' : `⚗️ Neues Element entdeckt! ${tierStars}`)
        .setDescription(
          `${el1.emoji} **${el1.name}** + ${el2.emoji} **${el2.name}**\n\n` +
          `➡️ ${combo.emoji} **${combo.name}**! (Tier ${combo.tier})\n\n` +
          (alreadyDiscovered
            ? `Du kennst dieses Element bereits.`
            : `🎉 **Neue Entdeckung!**\n💰 Belohnung: **+${config.currencySymbol}${combo.reward.toLocaleString()}**`) +
          `\n\n📊 Entdeckt: **${newDiscovered.length}/${allElements.length}** Elemente`
        )
        .setFooter({ text: alreadyDiscovered ? '' : `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'labor') {
      const discovered = getDiscovered(userId);
      const discoveredSet = new Set(discovered);

      const tierGroups = [0, 1, 2, 3, 4].map(tier => {
        const tierElements = allElements.filter(e => e.tier === tier);
        const tierName = tier === 0 ? '🌱 Basis' : tier === 1 ? '⭐ Tier 1' : tier === 2 ? '⭐⭐ Tier 2' : tier === 3 ? '⭐⭐⭐ Tier 3' : '👑 Tier 4';
        const els = tierElements.map(e =>
          discoveredSet.has(e.id) ? `${e.emoji} ${e.name}` : '❓ ???'
        );
        return `**${tierName}** (${tierElements.filter(e => discoveredSet.has(e.id)).length}/${tierElements.length})\n${els.join(' | ')}`;
      });

      const completion = Math.floor((discovered.length / allElements.length) * 100);
      const bar = '█'.repeat(Math.floor(completion / 10)) + '░'.repeat(10 - Math.floor(completion / 10));

      const embed = new EmbedBuilder()
        .setColor('#9b59b6')
        .setTitle(`⚗️ ${interaction.user.username}'s Alchemie-Labor`)
        .setDescription(
          `\`${bar}\` **${completion}%** (${discovered.length}/${allElements.length})\n\n` +
          tierGroups.join('\n\n') +
          (discovered.length === allElements.length ? '\n\n🏆 **ALLES ENTDECKT! Du bist ein Meister-Alchemist!**' : '')
        )
        .setFooter({ text: 'Nutze /alchemie mischen um Elemente zu kombinieren' })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'hinweis') {
      const hintCost = 500;
      if (db.getBalance(userId) < hintCost) {
        return interaction.reply(`❌ Ein Hinweis kostet **${config.currencySymbol}${hintCost}**!`);
      }

      const discovered = getDiscovered(userId);
      const discoveredSet = new Set(discovered);

      const undiscovered = combinations.filter(c =>
        !discoveredSet.has(c.result) && discoveredSet.has(c.a) && discoveredSet.has(c.b)
      );

      if (undiscovered.length === 0) {
        const anyUndiscovered = combinations.filter(c => !discoveredSet.has(c.result));
        if (anyUndiscovered.length === 0) {
          return interaction.reply('🏆 Du hast schon alles entdeckt!');
        }
        return interaction.reply('❌ Du brauchst erst mehr Elemente! Versuche bestehende zu kombinieren.');
      }

      db.updateBalance(userId, -hintCost);

      const hint = undiscovered[Math.floor(Math.random() * undiscovered.length)];
      const el1 = allElements.find(e => e.id === hint.a);
      const el2 = allElements.find(e => e.id === hint.b);

      const embed = new EmbedBuilder()
        .setColor('#e67e22')
        .setTitle('💡 Alchemie-Hinweis')
        .setDescription(
          `Versuche **${el1.emoji} ${el1.name}** mit **${el2.emoji} ${el2.name}** zu mischen!\n\n` +
          `Das Ergebnis hat Tier **${hint.tier}** ${'⭐'.repeat(hint.tier)}`
        )
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()} | -${config.currencySymbol}${hintCost}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }
  },
};
