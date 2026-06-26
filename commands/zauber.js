const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const spells = [
  { id: 'goldregen', name: 'Goldregen', emoji: '🌧️', manaCost: 20, cooldown: 30 * 60 * 1000, effect: 'Erhalte 500-2000$ sofort', tier: 1, learnCost: 500 },
  { id: 'glueckszauber', name: 'Glückszauber', emoji: '🍀', manaCost: 15, cooldown: 20 * 60 * 1000, effect: '+30% Glück für 10 Minuten', tier: 1, learnCost: 800 },
  { id: 'schutzschild', name: 'Schutzschild', emoji: '🛡️', manaCost: 25, cooldown: 60 * 60 * 1000, effect: 'Schützt vor dem nächsten Diebstahl', tier: 2, learnCost: 2000 },
  { id: 'goldverdopplung', name: 'Goldverdopplung', emoji: '✨', manaCost: 40, cooldown: 2 * 60 * 60 * 1000, effect: 'Verdoppelt den nächsten Verdienst', tier: 2, learnCost: 5000 },
  { id: 'zeitreise', name: 'Zeitreise', emoji: '⏳', manaCost: 50, cooldown: 3 * 60 * 60 * 1000, effect: 'Setzt alle Cooldowns zurück', tier: 3, learnCost: 10000 },
  { id: 'transmutation', name: 'Transmutation', emoji: '⚗️', manaCost: 35, cooldown: 45 * 60 * 1000, effect: 'Verwandelt ein Item in Gold', tier: 2, learnCost: 3000 },
  { id: 'heilung', name: 'Heilung', emoji: '💚', manaCost: 10, cooldown: 15 * 60 * 1000, effect: 'Heilt dich vollständig', tier: 1, learnCost: 600 },
  { id: 'feuerball', name: 'Feuerball', emoji: '🔥', manaCost: 30, cooldown: 40 * 60 * 1000, effect: '+50% Kampfschaden für 1 Kampf', tier: 2, learnCost: 4000 },
  { id: 'teleport', name: 'Teleport', emoji: '🌀', manaCost: 45, cooldown: 90 * 60 * 1000, effect: 'Teleportiere zu einem zufälligen Schatz', tier: 3, learnCost: 8000 },
  { id: 'arkanexplosion', name: 'Arkan-Explosion', emoji: '💥', manaCost: 60, cooldown: 4 * 60 * 60 * 1000, effect: 'Erhalte 3000-8000$ sofort', tier: 3, learnCost: 15000 },
];

const MAX_MANA = 100;
const MANA_REGEN = 10;
const MANA_REGEN_INTERVAL = 30 * 60 * 1000;

function ensureSpellTable() {
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS player_spells (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      spell_id TEXT NOT NULL,
      last_cast TEXT,
      times_cast INTEGER DEFAULT 0,
      UNIQUE(user_id, spell_id)
    )
  `);
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS player_mana (
      user_id TEXT PRIMARY KEY,
      mana INTEGER DEFAULT 100,
      last_regen TEXT,
      spells_learned INTEGER DEFAULT 0
    )
  `);
}

function getManaProfile(userId) {
  let profile = db.db.prepare('SELECT * FROM player_mana WHERE user_id = ?').get(userId);
  if (!profile) {
    db.db.prepare('INSERT INTO player_mana (user_id, mana, last_regen) VALUES (?, ?, ?)').run(userId, MAX_MANA, new Date().toISOString());
    profile = db.db.prepare('SELECT * FROM player_mana WHERE user_id = ?').get(userId);
  }

  const lastRegen = new Date(profile.last_regen);
  const elapsed = Date.now() - lastRegen.getTime();
  const regenTicks = Math.floor(elapsed / MANA_REGEN_INTERVAL);
  if (regenTicks > 0 && profile.mana < MAX_MANA) {
    const newMana = Math.min(MAX_MANA, profile.mana + regenTicks * MANA_REGEN);
    db.db.prepare('UPDATE player_mana SET mana = ?, last_regen = ? WHERE user_id = ?')
      .run(newMana, new Date().toISOString(), userId);
    profile.mana = newMana;
  }

  return profile;
}

function getLearnedSpells(userId) {
  return db.db.prepare('SELECT * FROM player_spells WHERE user_id = ?').all(userId);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('zauber')
    .setDescription('Lerne und wirke mächtige Zauber!')
    .addSubcommand(sub =>
      sub.setName('buch')
        .setDescription('Zeige das Zauberbuch'))
    .addSubcommand(sub =>
      sub.setName('lernen')
        .setDescription('Lerne einen neuen Zauber')
        .addStringOption(opt =>
          opt.setName('zauber')
            .setDescription('Welchen Zauber lernen?')
            .setRequired(true)
            .addChoices(
              ...spells.map(s => ({ name: `${s.emoji} ${s.name} (${s.learnCost}$)`, value: s.id }))
            )))
    .addSubcommand(sub =>
      sub.setName('wirken')
        .setDescription('Wirke einen Zauber')
        .addStringOption(opt =>
          opt.setName('zauber')
            .setDescription('Welchen Zauber wirken?')
            .setRequired(true)
            .addChoices(
              ...spells.map(s => ({ name: `${s.emoji} ${s.name}`, value: s.id }))
            )))
    .addSubcommand(sub =>
      sub.setName('status')
        .setDescription('Zeige deinen Mana-Status')),
  async execute(interaction) {
    ensureSpellTable();
    const userId = interaction.user.id;
    const config = require('../config.json');
    const action = interaction.options.getSubcommand();

    if (action === 'buch') {
      const profile = getManaProfile(userId);
      const learned = getLearnedSpells(userId);
      const learnedIds = new Set(learned.map(l => l.spell_id));

      const tierGroups = [1, 2, 3].map(tier => {
        const tierSpells = spells.filter(s => s.tier === tier);
        const tierName = tier === 1 ? '⬜ Anfänger' : tier === 2 ? '🟦 Fortgeschritten' : '🟪 Meister';
        const lines = tierSpells.map(s => {
          const isLearned = learnedIds.has(s.id);
          return `${s.emoji} **${s.name}** ${isLearned ? '✅' : `(${config.currencySymbol}${s.learnCost.toLocaleString()})`}\n` +
            `  💧 ${s.manaCost} Mana | *${s.effect}*`;
        });
        return `**${tierName}:**\n${lines.join('\n')}`;
      });

      const manaBar = '🔵'.repeat(Math.floor(profile.mana / 10)) + '⚫'.repeat(10 - Math.floor(profile.mana / 10));

      const embed = new EmbedBuilder()
        .setColor('#9b59b6')
        .setTitle('📖 Zauberbuch')
        .setDescription(
          `💧 Mana: ${manaBar} **${profile.mana}/${MAX_MANA}**\n\n` +
          tierGroups.join('\n\n')
        )
        .setFooter({ text: `${learned.length}/${spells.length} Zauber gelernt | Mana regeneriert alle 30min` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'lernen') {
      const spellId = interaction.options.getString('zauber');
      const spell = spells.find(s => s.id === spellId);

      const existing = db.db.prepare('SELECT * FROM player_spells WHERE user_id = ? AND spell_id = ?').get(userId, spellId);
      if (existing) return interaction.reply(`❌ Du kannst **${spell.emoji} ${spell.name}** bereits!`);

      if (db.getBalance(userId) < spell.learnCost) {
        return interaction.reply(`❌ Du brauchst **${config.currencySymbol}${spell.learnCost.toLocaleString()}** zum Lernen!`);
      }

      db.updateBalance(userId, -spell.learnCost);
      db.db.prepare('INSERT INTO player_spells (user_id, spell_id) VALUES (?, ?)').run(userId, spellId);
      db.db.prepare('UPDATE player_mana SET spells_learned = spells_learned + 1 WHERE user_id = ?').run(userId);

      const embed = new EmbedBuilder()
        .setColor('#9b59b6')
        .setTitle(`${spell.emoji} ${spell.name} gelernt!`)
        .setDescription(
          `Du hast **${spell.name}** gemeistert!\n\n` +
          `💧 Mana-Kosten: **${spell.manaCost}**\n` +
          `✨ Effekt: *${spell.effect}*\n\n` +
          `Nutze \`/zauber wirken\` zum Zaubern!`
        )
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'wirken') {
      const spellId = interaction.options.getString('zauber');
      const spell = spells.find(s => s.id === spellId);

      const learned = db.db.prepare('SELECT * FROM player_spells WHERE user_id = ? AND spell_id = ?').get(userId, spellId);
      if (!learned) return interaction.reply(`❌ Du hast **${spell.emoji} ${spell.name}** noch nicht gelernt!`);

      if (learned.last_cast) {
        const elapsed = Date.now() - new Date(learned.last_cast).getTime();
        if (elapsed < spell.cooldown) {
          const remaining = Math.ceil((spell.cooldown - elapsed) / 60000);
          return interaction.reply(`⏳ **${spell.emoji} ${spell.name}** ist noch **${remaining}min** auf Cooldown!`);
        }
      }

      const profile = getManaProfile(userId);
      if (profile.mana < spell.manaCost) {
        return interaction.reply(`❌ Nicht genug Mana! (**${profile.mana}/${spell.manaCost}** benötigt)`);
      }

      db.db.prepare('UPDATE player_mana SET mana = mana - ? WHERE user_id = ?').run(spell.manaCost, userId);
      db.db.prepare('UPDATE player_spells SET last_cast = ?, times_cast = times_cast + 1 WHERE user_id = ? AND spell_id = ?')
        .run(new Date().toISOString(), userId, spellId);

      let resultText = '';
      let resultColor = '#9b59b6';

      if (spellId === 'goldregen') {
        const amount = 500 + Math.floor(Math.random() * 1501);
        db.updateBalance(userId, amount);
        resultText = `🌧️ Gold regnet vom Himmel!\n💰 **+${config.currencySymbol}${amount.toLocaleString()}**`;
        resultColor = '#FFD700';
      } else if (spellId === 'arkanexplosion') {
        const amount = 3000 + Math.floor(Math.random() * 5001);
        db.updateBalance(userId, amount);
        resultText = `💥 Arkane Energie explodiert!\n💰 **+${config.currencySymbol}${amount.toLocaleString()}**`;
        resultColor = '#FFD700';
      } else if (spellId === 'teleport') {
        const treasures = [500, 800, 1200, 2000, 3500];
        const amount = treasures[Math.floor(Math.random() * treasures.length)];
        db.updateBalance(userId, amount);
        resultText = `🌀 Du teleportierst zu einem verborgenen Schatz!\n💰 **+${config.currencySymbol}${amount.toLocaleString()}**`;
        resultColor = '#2ecc71';
      } else if (spellId === 'transmutation') {
        const inventory = db.getInventory(userId);
        if (inventory.length === 0) {
          resultText = `⚗️ Du hast keine Items zum Umwandeln!\n💧 Mana zurückerstattet.`;
          db.db.prepare('UPDATE player_mana SET mana = mana + ? WHERE user_id = ?').run(spell.manaCost, userId);
        } else {
          const item = inventory[Math.floor(Math.random() * inventory.length)];
          const shopItem = db.getShopItem(item.item_name);
          const goldValue = shopItem ? Math.floor(shopItem.price * 0.8) : 200 + Math.floor(Math.random() * 500);
          db.removeFromInventory(userId, item.item_name, 1);
          db.updateBalance(userId, goldValue);
          resultText = `⚗️ **${item.item_name}** → **${config.currencySymbol}${goldValue.toLocaleString()}** Gold!`;
          resultColor = '#e67e22';
        }
      } else {
        resultText = `${spell.emoji} **${spell.name}** gewirkt!\n✨ *${spell.effect}*`;
      }

      const newProfile = getManaProfile(userId);

      const embed = new EmbedBuilder()
        .setColor(resultColor)
        .setTitle(`${spell.emoji} ${spell.name}!`)
        .setDescription(
          `${resultText}\n\n` +
          `💧 Mana: **${newProfile.mana}/${MAX_MANA}** (-${spell.manaCost})\n` +
          `🔮 Gewirkt: **${learned.times_cast + 1}x** insgesamt`
        )
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'status') {
      const profile = getManaProfile(userId);
      const learned = getLearnedSpells(userId);

      const manaBar = '🔵'.repeat(Math.floor(profile.mana / 10)) + '⚫'.repeat(10 - Math.floor(profile.mana / 10));
      const nextRegen = new Date(new Date(profile.last_regen).getTime() + MANA_REGEN_INTERVAL);
      const regenIn = Math.max(0, Math.ceil((nextRegen.getTime() - Date.now()) / 60000));

      const spellLines = learned.map(l => {
        const spell = spells.find(s => s.id === l.spell_id);
        if (!spell) return null;
        const onCooldown = l.last_cast && (Date.now() - new Date(l.last_cast).getTime() < spell.cooldown);
        const cdRemaining = onCooldown ? Math.ceil((spell.cooldown - (Date.now() - new Date(l.last_cast).getTime())) / 60000) : 0;
        return `${spell.emoji} **${spell.name}** ${onCooldown ? `⏳ ${cdRemaining}min` : '✅ Bereit'} (${l.times_cast}x gewirkt)`;
      }).filter(Boolean);

      const embed = new EmbedBuilder()
        .setColor('#9b59b6')
        .setTitle(`🔮 ${interaction.user.username}'s Magie`)
        .setDescription(
          `${manaBar}\n💧 Mana: **${profile.mana}/${MAX_MANA}**\n` +
          `⏰ Nächste Regeneration: **${regenIn > 0 ? `${regenIn}min` : 'Jetzt'}** (+${MANA_REGEN})\n\n` +
          `📖 **Gelernte Zauber (${learned.length}/${spells.length}):**\n` +
          (spellLines.length > 0 ? spellLines.join('\n') : '*Noch keine Zauber gelernt!*')
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }
  },
};
