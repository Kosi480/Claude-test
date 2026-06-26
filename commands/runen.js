const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const GATHER_COOLDOWN = 10 * 60 * 1000;
const cooldowns = new Map();

const runeFragments = [
  { id: 'feuer_frag', name: 'Feuerfragment', emoji: '🔴', element: 'Feuer', weight: 25 },
  { id: 'eis_frag', name: 'Eisfragment', emoji: '🔵', element: 'Eis', weight: 25 },
  { id: 'blitz_frag', name: 'Blitzfragment', emoji: '🟡', element: 'Blitz', weight: 20 },
  { id: 'erde_frag', name: 'Erdfragment', emoji: '🟤', element: 'Erde', weight: 20 },
  { id: 'licht_frag', name: 'Lichtfragment', emoji: '⚪', element: 'Licht', weight: 10 },
  { id: 'dunkel_frag', name: 'Dunkelfragment', emoji: '🟣', element: 'Dunkel', weight: 10 },
];

const runes = [
  { id: 'feuer_rune', name: 'Feuerrune', emoji: '🔥', element: 'Feuer', tier: 1, fragments: 3, bonus: 'atk', value: 2, desc: '+2 ATK' },
  { id: 'eis_rune', name: 'Eisrune', emoji: '❄️', element: 'Eis', tier: 1, fragments: 3, bonus: 'def', value: 2, desc: '+2 DEF' },
  { id: 'blitz_rune', name: 'Blitzrune', emoji: '⚡', element: 'Blitz', tier: 1, fragments: 3, bonus: 'spd', value: 2, desc: '+2 SPD' },
  { id: 'erde_rune', name: 'Erdrune', emoji: '🌍', element: 'Erde', tier: 1, fragments: 3, bonus: 'hp', value: 5, desc: '+5 HP' },
  { id: 'licht_rune', name: 'Lichtrune', emoji: '✨', element: 'Licht', tier: 2, fragments: 5, bonus: 'luck', value: 3, desc: '+3 Glück' },
  { id: 'dunkel_rune', name: 'Dunkelrune', emoji: '🌑', element: 'Dunkel', tier: 2, fragments: 5, bonus: 'crit', value: 5, desc: '+5% Krit' },
  { id: 'sturm_rune', name: 'Sturmrune', emoji: '🌪️', element: 'Sturm', tier: 2, fragments: 0, combo: ['blitz_frag', 'eis_frag'], comboQty: [3, 2], bonus: 'atk_spd', value: 3, desc: '+3 ATK & SPD' },
  { id: 'lava_rune', name: 'Lavarune', emoji: '🌋', element: 'Lava', tier: 2, fragments: 0, combo: ['feuer_frag', 'erde_frag'], comboQty: [3, 2], bonus: 'atk_def', value: 3, desc: '+3 ATK & DEF' },
  { id: 'heilig_rune', name: 'Heilige Rune', emoji: '👼', element: 'Heilig', tier: 3, fragments: 0, combo: ['licht_frag', 'dunkel_frag'], comboQty: [4, 4], bonus: 'all', value: 2, desc: '+2 Alle Stats' },
  { id: 'chaos_rune', name: 'Chaosrune', emoji: '🌀', element: 'Chaos', tier: 3, fragments: 0, combo: ['feuer_frag', 'eis_frag', 'blitz_frag', 'erde_frag'], comboQty: [2, 2, 2, 2], bonus: 'money', value: 10, desc: '+10% Geld' },
];

const MAX_RUNE_SLOTS = 4;

function ensureRuneTable() {
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS rune_fragments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      fragment_id TEXT NOT NULL,
      quantity INTEGER DEFAULT 0,
      UNIQUE(user_id, fragment_id)
    )
  `);
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS equipped_runes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      rune_id TEXT NOT NULL,
      slot INTEGER NOT NULL,
      equipped_at TEXT NOT NULL,
      UNIQUE(user_id, slot)
    )
  `);
}

function getFragments(userId) {
  return db.db.prepare('SELECT * FROM rune_fragments WHERE user_id = ?').all(userId);
}

function getFragmentCount(userId, fragId) {
  const row = db.db.prepare('SELECT quantity FROM rune_fragments WHERE user_id = ? AND fragment_id = ?').get(userId, fragId);
  return row ? row.quantity : 0;
}

function addFragment(userId, fragId, qty = 1) {
  const existing = db.db.prepare('SELECT * FROM rune_fragments WHERE user_id = ? AND fragment_id = ?').get(userId, fragId);
  if (existing) {
    db.db.prepare('UPDATE rune_fragments SET quantity = quantity + ? WHERE user_id = ? AND fragment_id = ?').run(qty, userId, fragId);
  } else {
    db.db.prepare('INSERT INTO rune_fragments (user_id, fragment_id, quantity) VALUES (?, ?, ?)').run(userId, fragId, qty);
  }
}

function removeFragment(userId, fragId, qty) {
  db.db.prepare('UPDATE rune_fragments SET quantity = quantity - ? WHERE user_id = ? AND fragment_id = ?').run(qty, userId, fragId);
  db.db.prepare('DELETE FROM rune_fragments WHERE user_id = ? AND quantity <= 0').run(userId);
}

function getEquippedRunes(userId) {
  return db.db.prepare('SELECT * FROM equipped_runes WHERE user_id = ? ORDER BY slot').all(userId);
}

function rollFragment() {
  const totalWeight = runeFragments.reduce((s, f) => s + f.weight, 0);
  const roll = Math.random() * totalWeight;
  let cumulative = 0;
  for (const frag of runeFragments) {
    cumulative += frag.weight;
    if (roll < cumulative) return frag;
  }
  return runeFragments[0];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('runen')
    .setDescription('Runen-System — Sammle, Schmiede und Rüste aus!')
    .addSubcommand(sub =>
      sub.setName('sammeln')
        .setDescription('Sammle Runenfragmente (10min CD)'))
    .addSubcommand(sub =>
      sub.setName('inventar')
        .setDescription('Zeige deine Fragmente und Runen'))
    .addSubcommand(sub =>
      sub.setName('schmieden')
        .setDescription('Schmiede eine Rune aus Fragmenten')
        .addStringOption(opt =>
          opt.setName('rune')
            .setDescription('Welche Rune schmieden?')
            .setRequired(true)
            .addChoices(...runes.map(r => ({ name: `${r.emoji} ${r.name} (${r.desc})`, value: r.id })))))
    .addSubcommand(sub =>
      sub.setName('ausruesten')
        .setDescription('Rüste eine Rune in einen Slot')
        .addStringOption(opt =>
          opt.setName('rune')
            .setDescription('Welche Rune?')
            .setRequired(true)
            .addChoices(...runes.map(r => ({ name: `${r.emoji} ${r.name}`, value: r.id }))))
        .addIntegerOption(opt =>
          opt.setName('slot')
            .setDescription('Slot 1-4')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(4)))
    .addSubcommand(sub =>
      sub.setName('entfernen')
        .setDescription('Entferne eine Rune aus einem Slot')
        .addIntegerOption(opt =>
          opt.setName('slot')
            .setDescription('Slot 1-4')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(4)))
    .addSubcommand(sub =>
      sub.setName('rezepte')
        .setDescription('Zeige alle Runen-Rezepte')),
  async execute(interaction) {
    ensureRuneTable();
    const userId = interaction.user.id;
    const config = require('../config.json');
    const action = interaction.options.getSubcommand();

    if (action === 'sammeln') {
      const lastGather = cooldowns.get(userId);
      if (lastGather && Date.now() - lastGather < GATHER_COOLDOWN) {
        const remaining = Math.ceil((GATHER_COOLDOWN - (Date.now() - lastGather)) / 1000);
        return interaction.reply(`⏳ Nächstes Sammeln in **${Math.ceil(remaining / 60)}min**!`);
      }

      cooldowns.set(userId, Date.now());

      const count = 1 + Math.floor(Math.random() * 3);
      const found = [];
      for (let i = 0; i < count; i++) {
        const frag = rollFragment();
        addFragment(userId, frag.id, 1);
        found.push(frag);
      }

      const bonusMoney = 50 + Math.floor(Math.random() * 150);
      db.updateBalance(userId, bonusMoney);

      const foundText = found.map(f => `${f.emoji} ${f.name}`).join(', ');

      const embed = new EmbedBuilder()
        .setColor('#9b59b6')
        .setTitle('💎 Runenfragmente gesammelt!')
        .setDescription(
          `Du durchsuchst alte Ruinen...\n\n` +
          `📦 Gefunden: ${foundText}\n` +
          `💰 Nebenbei: **+${config.currencySymbol}${bonusMoney}**\n\n` +
          `Nutze \`/runen inventar\` um deine Fragmente zu sehen.`
        )
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'inventar') {
      const fragments = getFragments(userId);
      const equipped = getEquippedRunes(userId);

      const fragText = runeFragments.map(f => {
        const count = getFragmentCount(userId, f.id);
        return `${f.emoji} ${f.name}: **${count}**`;
      }).join('\n');

      const slotText = [];
      for (let s = 1; s <= MAX_RUNE_SLOTS; s++) {
        const eq = equipped.find(e => e.slot === s);
        if (eq) {
          const rune = runes.find(r => r.id === eq.rune_id);
          slotText.push(`Slot ${s}: ${rune.emoji} **${rune.name}** (${rune.desc})`);
        } else {
          slotText.push(`Slot ${s}: _Leer_`);
        }
      }

      const totalBonuses = {};
      for (const eq of equipped) {
        const rune = runes.find(r => r.id === eq.rune_id);
        if (rune) {
          totalBonuses[rune.bonus] = (totalBonuses[rune.bonus] || 0) + rune.value;
        }
      }

      const bonusText = Object.entries(totalBonuses).map(([key, val]) => {
        const names = { atk: '⚔️ ATK', def: '🛡️ DEF', spd: '💨 SPD', hp: '❤️ HP', luck: '🍀 Glück', crit: '💥 Krit', atk_spd: '⚔️💨 ATK&SPD', atk_def: '⚔️🛡️ ATK&DEF', all: '✨ Alle', money: '💰 Geld' };
        return `${names[key] || key}: **+${val}${key === 'crit' || key === 'money' ? '%' : ''}**`;
      }).join(' | ');

      const embed = new EmbedBuilder()
        .setColor('#e67e22')
        .setTitle(`💎 ${interaction.user.username}'s Runen`)
        .setDescription(
          `**Fragmente:**\n${fragText}\n\n` +
          `**Ausgerüstete Runen:**\n${slotText.join('\n')}` +
          (bonusText ? `\n\n**Gesamt-Boni:** ${bonusText}` : '')
        )
        .setFooter({ text: 'Nutze /runen schmieden und /runen ausruesten' })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'schmieden') {
      const runeId = interaction.options.getString('rune');
      const rune = runes.find(r => r.id === runeId);

      if (rune.combo) {
        for (let i = 0; i < rune.combo.length; i++) {
          const needed = rune.comboQty[i];
          const have = getFragmentCount(userId, rune.combo[i]);
          if (have < needed) {
            const frag = runeFragments.find(f => f.id === rune.combo[i]);
            return interaction.reply(`❌ Du brauchst **${needed}x ${frag.emoji} ${frag.name}** (Hast: ${have})`);
          }
        }

        for (let i = 0; i < rune.combo.length; i++) {
          removeFragment(userId, rune.combo[i], rune.comboQty[i]);
        }
      } else {
        const fragType = runeFragments.find(f => f.element === rune.element);
        const have = getFragmentCount(userId, fragType.id);
        if (have < rune.fragments) {
          return interaction.reply(`❌ Du brauchst **${rune.fragments}x ${fragType.emoji} ${fragType.name}** (Hast: ${have})`);
        }
        removeFragment(userId, fragType.id, rune.fragments);
      }

      db.addToInventory(userId, rune.name, 1);

      const tierStars = '⭐'.repeat(rune.tier);

      const embed = new EmbedBuilder()
        .setColor(rune.tier >= 3 ? '#FFD700' : rune.tier >= 2 ? '#9b59b6' : '#3498db')
        .setTitle(`🔨 ${rune.emoji} ${rune.name} geschmiedet! ${tierStars}`)
        .setDescription(
          `Du hast eine **${rune.name}** geschmiedet!\n\n` +
          `📊 Bonus: **${rune.desc}**\n` +
          `🏷️ Tier: **${rune.tier}**\n\n` +
          `Rüste sie mit \`/runen ausruesten\` aus!`
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'ausruesten') {
      const runeId = interaction.options.getString('rune');
      const slot = interaction.options.getInteger('slot');
      const rune = runes.find(r => r.id === runeId);

      if (!db.hasItem(userId, rune.name)) {
        return interaction.reply(`❌ Du hast keine **${rune.emoji} ${rune.name}**! Schmiede eine zuerst.`);
      }

      const existing = db.db.prepare('SELECT * FROM equipped_runes WHERE user_id = ? AND slot = ?').get(userId, slot);
      if (existing) {
        const oldRune = runes.find(r => r.id === existing.rune_id);
        db.addToInventory(userId, oldRune.name, 1);
        db.db.prepare('DELETE FROM equipped_runes WHERE user_id = ? AND slot = ?').run(userId, slot);
      }

      db.removeFromInventory(userId, rune.name, 1);
      db.db.prepare('INSERT INTO equipped_runes (user_id, rune_id, slot, equipped_at) VALUES (?, ?, ?, ?)')
        .run(userId, rune.id, slot, new Date().toISOString());

      const embed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle(`${rune.emoji} Rune ausgerüstet!`)
        .setDescription(
          `**${rune.name}** in Slot **${slot}** eingesetzt!\n\n` +
          `📊 Bonus: **${rune.desc}**` +
          (existing ? `\n🔄 Vorherige Rune zurück ins Inventar.` : '')
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'entfernen') {
      const slot = interaction.options.getInteger('slot');
      const existing = db.db.prepare('SELECT * FROM equipped_runes WHERE user_id = ? AND slot = ?').get(userId, slot);

      if (!existing) return interaction.reply(`❌ Slot **${slot}** ist leer!`);

      const rune = runes.find(r => r.id === existing.rune_id);
      db.addToInventory(userId, rune.name, 1);
      db.db.prepare('DELETE FROM equipped_runes WHERE user_id = ? AND slot = ?').run(userId, slot);

      const embed = new EmbedBuilder()
        .setColor('#e74c3c')
        .setTitle(`${rune.emoji} Rune entfernt!`)
        .setDescription(`**${rune.name}** aus Slot **${slot}** entfernt und ins Inventar gelegt.`)
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'rezepte') {
      const recipes = runes.map(r => {
        const tierStars = '⭐'.repeat(r.tier);
        let cost;
        if (r.combo) {
          cost = r.combo.map((fId, i) => {
            const frag = runeFragments.find(f => f.id === fId);
            return `${r.comboQty[i]}x ${frag.emoji}`;
          }).join(' + ');
        } else {
          const frag = runeFragments.find(f => f.element === r.element);
          cost = `${r.fragments}x ${frag.emoji} ${frag.name}`;
        }
        return `${r.emoji} **${r.name}** ${tierStars}\n  Kosten: ${cost}\n  Bonus: ${r.desc}`;
      });

      const embed = new EmbedBuilder()
        .setColor('#9b59b6')
        .setTitle('📜 Runen-Rezepte')
        .setDescription(recipes.join('\n\n'))
        .setFooter({ text: 'Sammle Fragmente mit /runen sammeln' })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }
  },
};
