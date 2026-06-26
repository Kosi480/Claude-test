const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const showcaseSlots = [
  { id: 'waffe', name: 'Waffe', emoji: '⚔️', maxLevel: 5 },
  { id: 'ruestung', name: 'Rüstung', emoji: '🛡️', maxLevel: 5 },
  { id: 'schmuck', name: 'Schmuck', emoji: '💎', maxLevel: 5 },
  { id: 'haustier', name: 'Haustier', emoji: '🐾', maxLevel: 5 },
  { id: 'trophaee', name: 'Trophäe', emoji: '🏆', maxLevel: 5 },
];

const galleryItems = [
  { name: 'Goldbarren', slot: 'schmuck', tier: 1, emoji: '🪙', bonus: '+2% Arbeitseinnahmen' },
  { name: 'Diamant-Ring', slot: 'schmuck', tier: 2, emoji: '💎', bonus: '+5% Arbeitseinnahmen' },
  { name: 'Diamant-Krone', slot: 'schmuck', tier: 4, emoji: '👑', bonus: '+10% Arbeitseinnahmen' },
  { name: 'Schattendolch', slot: 'waffe', tier: 2, emoji: '🗡️', bonus: '+3 ATK' },
  { name: 'Magisches Schwert', slot: 'waffe', tier: 3, emoji: '⚔️', bonus: '+8 ATK' },
  { name: 'Drachenschuppe', slot: 'ruestung', tier: 2, emoji: '🪬', bonus: '+3 DEF' },
  { name: 'Drachenrüstung', slot: 'ruestung', tier: 4, emoji: '🛡️', bonus: '+10 DEF' },
  { name: 'Schutzschild', slot: 'ruestung', tier: 1, emoji: '🛡️', bonus: '+1 DEF' },
  { name: 'Glücksbringer', slot: 'schmuck', tier: 1, emoji: '🍀', bonus: '+5% Glück' },
  { name: 'Glücksamulett', slot: 'schmuck', tier: 3, emoji: '🍀', bonus: '+15% Glück' },
  { name: 'Angel', slot: 'waffe', tier: 1, emoji: '🎣', bonus: '+10% Fisch-Wert' },
  { name: 'Profi-Angel', slot: 'waffe', tier: 3, emoji: '🎣', bonus: '+25% Fisch-Wert' },
];

const tierNames = ['', '⬜ Gewöhnlich', '🟦 Selten', '🟪 Episch', '🟧 Legendär', '🌟 Mythisch'];

function ensureGalleryTable() {
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS gallery (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      slot_id TEXT NOT NULL,
      item_name TEXT NOT NULL,
      tier INTEGER DEFAULT 1,
      displayed_at TEXT NOT NULL,
      UNIQUE(user_id, slot_id)
    )
  `);
}

function getUserGallery(userId) {
  return db.db.prepare('SELECT * FROM gallery WHERE user_id = ?').all(userId);
}

function getGalleryScore(userId) {
  const gallery = getUserGallery(userId);
  return gallery.reduce((sum, g) => sum + g.tier * 10, 0);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('galerie')
    .setDescription('Stelle deine besten Items in deiner Galerie aus!')
    .addSubcommand(sub =>
      sub.setName('anzeigen')
        .setDescription('Zeige deine Galerie')
        .addUserOption(opt =>
          opt.setName('spieler')
            .setDescription('Galerie eines anderen Spielers')))
    .addSubcommand(sub =>
      sub.setName('ausstellen')
        .setDescription('Stelle ein Item aus')
        .addStringOption(opt =>
          opt.setName('slot')
            .setDescription('In welchen Slot?')
            .setRequired(true)
            .addChoices(
              { name: '⚔️ Waffe', value: 'waffe' },
              { name: '🛡️ Rüstung', value: 'ruestung' },
              { name: '💎 Schmuck', value: 'schmuck' },
              { name: '🐾 Haustier', value: 'haustier' },
              { name: '🏆 Trophäe', value: 'trophaee' },
            ))
        .addStringOption(opt =>
          opt.setName('item')
            .setDescription('Welches Item ausstellen?')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('entfernen')
        .setDescription('Entferne ein Item aus der Galerie')
        .addStringOption(opt =>
          opt.setName('slot')
            .setDescription('Aus welchem Slot?')
            .setRequired(true)
            .addChoices(
              { name: '⚔️ Waffe', value: 'waffe' },
              { name: '🛡️ Rüstung', value: 'ruestung' },
              { name: '💎 Schmuck', value: 'schmuck' },
              { name: '🐾 Haustier', value: 'haustier' },
              { name: '🏆 Trophäe', value: 'trophaee' },
            )))
    .addSubcommand(sub =>
      sub.setName('rangliste')
        .setDescription('Zeige die besten Galerien')),
  async execute(interaction) {
    ensureGalleryTable();
    const userId = interaction.user.id;
    const config = require('../config.json');
    const action = interaction.options.getSubcommand();

    if (action === 'anzeigen') {
      const targetUser = interaction.options.getUser('spieler') || interaction.user;
      const gallery = getUserGallery(targetUser.id);
      const score = getGalleryScore(targetUser.id);

      const slotLines = showcaseSlots.map(slot => {
        const displayed = gallery.find(g => g.slot_id === slot.id);
        if (displayed) {
          const itemInfo = galleryItems.find(gi => gi.name === displayed.item_name);
          const tierLabel = tierNames[displayed.tier] || tierNames[1];
          return `${slot.emoji} **${slot.name}:** ${displayed.item_name} ${tierLabel}\n` +
            (itemInfo ? `   *${itemInfo.bonus}*` : '');
        }
        return `${slot.emoji} **${slot.name}:** *leer*`;
      });

      const filledSlots = gallery.length;
      const completionBar = showcaseSlots.map((_, i) => i < filledSlots ? '🟩' : '⬛').join('');

      const embed = new EmbedBuilder()
        .setColor(score >= 100 ? '#FFD700' : score >= 50 ? '#9b59b6' : '#3498db')
        .setTitle(`🖼️ ${targetUser.username}'s Galerie`)
        .setDescription(
          `${completionBar} **${filledSlots}/${showcaseSlots.length}** Slots\n` +
          `⭐ Galerie-Score: **${score} Punkte**\n\n` +
          slotLines.join('\n\n') +
          `\n\n${filledSlots === showcaseSlots.length ? '🌟 **Galerie komplett!** +10% Bonus auf alle Einnahmen' : '💡 Fülle alle Slots für einen Bonus!'}`
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'ausstellen') {
      const slotId = interaction.options.getString('slot');
      const itemName = interaction.options.getString('item');
      const slot = showcaseSlots.find(s => s.id === slotId);

      const inventory = db.getInventory(userId);
      const owned = inventory.find(i => i.item_name.toLowerCase() === itemName.toLowerCase());
      if (!owned) {
        return interaction.reply(`❌ Du besitzt kein **${itemName}**!`);
      }

      const itemInfo = galleryItems.find(gi => gi.name.toLowerCase() === owned.item_name.toLowerCase() && gi.slot === slotId);
      const tier = itemInfo ? itemInfo.tier : 1;

      const existing = db.db.prepare('SELECT * FROM gallery WHERE user_id = ? AND slot_id = ?').get(userId, slotId);

      if (existing) {
        db.db.prepare('UPDATE gallery SET item_name = ?, tier = ?, displayed_at = ? WHERE user_id = ? AND slot_id = ?')
          .run(owned.item_name, tier, new Date().toISOString(), userId, slotId);
      } else {
        db.db.prepare('INSERT INTO gallery (user_id, slot_id, item_name, tier, displayed_at) VALUES (?, ?, ?, ?, ?)')
          .run(userId, slotId, owned.item_name, tier, new Date().toISOString());
      }

      const score = getGalleryScore(userId);

      const embed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle(`🖼️ Item ausgestellt!`)
        .setDescription(
          `${slot.emoji} **${slot.name}**: ${owned.item_name}\n` +
          `${tierNames[tier]}\n` +
          (itemInfo ? `✨ Bonus: *${itemInfo.bonus}*\n` : '') +
          `\n⭐ Galerie-Score: **${score} Punkte**`
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'entfernen') {
      const slotId = interaction.options.getString('slot');
      const slot = showcaseSlots.find(s => s.id === slotId);

      const existing = db.db.prepare('SELECT * FROM gallery WHERE user_id = ? AND slot_id = ?').get(userId, slotId);
      if (!existing) {
        return interaction.reply(`❌ Slot **${slot.emoji} ${slot.name}** ist leer!`);
      }

      db.db.prepare('DELETE FROM gallery WHERE user_id = ? AND slot_id = ?').run(userId, slotId);

      const embed = new EmbedBuilder()
        .setColor('#e74c3c')
        .setTitle('🖼️ Item entfernt')
        .setDescription(
          `**${existing.item_name}** aus **${slot.emoji} ${slot.name}** entfernt.\n` +
          `⭐ Galerie-Score: **${getGalleryScore(userId)} Punkte**`
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'rangliste') {
      const allGalleries = db.db.prepare(`
        SELECT user_id, SUM(tier * 10) as score, COUNT(*) as slots
        FROM gallery
        GROUP BY user_id
        ORDER BY score DESC
        LIMIT 10
      `).all();

      if (allGalleries.length === 0) {
        return interaction.reply('📭 Noch niemand hat eine Galerie!');
      }

      const lines = allGalleries.map((g, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**${i + 1}.**`;
        return `${medal} <@${g.user_id}> — ⭐ **${g.score}** Punkte (${g.slots}/${showcaseSlots.length} Slots)`;
      });

      const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('🖼️ Galerie-Rangliste')
        .setDescription(lines.join('\n'))
        .setFooter({ text: 'Stelle seltene Items aus für mehr Punkte!' })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }
  },
};
