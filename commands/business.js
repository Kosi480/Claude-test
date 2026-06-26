const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const businesses = [
  { id: 'kiosk', name: 'Kiosk', emoji: '🏪', cost: 2000, income: 50, upgradeCost: 1000, upgradeIncome: 25 },
  { id: 'cafe', name: 'Café', emoji: '☕', cost: 5000, income: 120, upgradeCost: 2500, upgradeIncome: 60 },
  { id: 'restaurant', name: 'Restaurant', emoji: '🍽️', cost: 15000, income: 350, upgradeCost: 7500, upgradeIncome: 150 },
  { id: 'hotel', name: 'Hotel', emoji: '🏨', cost: 40000, income: 900, upgradeCost: 20000, upgradeIncome: 400 },
  { id: 'firma', name: 'Tech-Firma', emoji: '🏢', cost: 100000, income: 2500, upgradeCost: 50000, upgradeIncome: 1000 },
];

const COLLECT_COOLDOWN = 60 * 60 * 1000;

function ensureBusinessTable() {
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS businesses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      business_id TEXT NOT NULL,
      level INTEGER DEFAULT 1,
      last_collected TEXT,
      UNIQUE(user_id, business_id)
    )
  `);
}

function getUserBusinesses(userId) {
  return db.db.prepare('SELECT * FROM businesses WHERE user_id = ?').all(userId);
}

function getIncome(businessId, level) {
  const biz = businesses.find(b => b.id === businessId);
  return biz.income + (level - 1) * biz.upgradeIncome;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('business')
    .setDescription('Kaufe und verwalte Unternehmen für passives Einkommen!')
    .addSubcommand(sub =>
      sub.setName('liste')
        .setDescription('Zeige verfügbare Unternehmen'))
    .addSubcommand(sub =>
      sub.setName('kaufen')
        .setDescription('Kaufe ein Unternehmen')
        .addStringOption(opt =>
          opt.setName('unternehmen')
            .setDescription('Welches Unternehmen?')
            .setRequired(true)
            .addChoices(
              { name: '🏪 Kiosk (2.000$)', value: 'kiosk' },
              { name: '☕ Café (5.000$)', value: 'cafe' },
              { name: '🍽️ Restaurant (15.000$)', value: 'restaurant' },
              { name: '🏨 Hotel (40.000$)', value: 'hotel' },
              { name: '🏢 Tech-Firma (100.000$)', value: 'firma' },
            )))
    .addSubcommand(sub =>
      sub.setName('info')
        .setDescription('Zeige deine Unternehmen'))
    .addSubcommand(sub =>
      sub.setName('einsammeln')
        .setDescription('Sammle Einkommen von allen Unternehmen'))
    .addSubcommand(sub =>
      sub.setName('upgrade')
        .setDescription('Upgrade ein Unternehmen')
        .addStringOption(opt =>
          opt.setName('unternehmen')
            .setDescription('Welches upgraden?')
            .setRequired(true)
            .addChoices(
              { name: '🏪 Kiosk', value: 'kiosk' },
              { name: '☕ Café', value: 'cafe' },
              { name: '🍽️ Restaurant', value: 'restaurant' },
              { name: '🏨 Hotel', value: 'hotel' },
              { name: '🏢 Tech-Firma', value: 'firma' },
            )))
    .addSubcommand(sub =>
      sub.setName('verkaufen')
        .setDescription('Verkaufe ein Unternehmen')
        .addStringOption(opt =>
          opt.setName('unternehmen')
            .setDescription('Welches verkaufen?')
            .setRequired(true)
            .addChoices(
              { name: '🏪 Kiosk', value: 'kiosk' },
              { name: '☕ Café', value: 'cafe' },
              { name: '🍽️ Restaurant', value: 'restaurant' },
              { name: '🏨 Hotel', value: 'hotel' },
              { name: '🏢 Tech-Firma', value: 'firma' },
            ))),
  async execute(interaction) {
    ensureBusinessTable();
    const userId = interaction.user.id;
    const config = require('../config.json');
    const action = interaction.options.getSubcommand();

    if (action === 'liste') {
      const owned = getUserBusinesses(userId);
      const ownedIds = new Set(owned.map(b => b.business_id));

      const embed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle('🏢 Unternehmen')
        .setDescription(
          businesses.map(b => {
            const isOwned = ownedIds.has(b.id);
            return `${b.emoji} **${b.name}** ${isOwned ? '✅' : ''}\n` +
              `   Preis: **${config.currencySymbol}${b.cost.toLocaleString()}**\n` +
              `   Einkommen: **${config.currencySymbol}${b.income}/h**\n` +
              `   Upgrade: **${config.currencySymbol}${b.upgradeCost.toLocaleString()}** (+${config.currencySymbol}${b.upgradeIncome}/h)`;
          }).join('\n\n')
        )
        .setFooter({ text: 'Einkommen alle 60 Minuten einsammelbar' })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'kaufen') {
      const bizId = interaction.options.getString('unternehmen');
      const biz = businesses.find(b => b.id === bizId);

      const existing = db.db.prepare('SELECT * FROM businesses WHERE user_id = ? AND business_id = ?').get(userId, bizId);
      if (existing) return interaction.reply(`❌ Du besitzt bereits ein **${biz.emoji} ${biz.name}**!`);

      if (db.getBalance(userId) < biz.cost) {
        return interaction.reply(`❌ Du brauchst **${config.currencySymbol}${biz.cost.toLocaleString()}** für ein ${biz.emoji} ${biz.name}!`);
      }

      db.updateBalance(userId, -biz.cost);
      db.db.prepare('INSERT INTO businesses (user_id, business_id, last_collected) VALUES (?, ?, ?)').run(userId, bizId, new Date().toISOString());

      const embed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle(`${biz.emoji} Unternehmen gekauft!`)
        .setDescription(
          `Du hast ein **${biz.name}** gekauft!\n\n` +
          `💰 Einkommen: **${config.currencySymbol}${biz.income}/h**\n` +
          `Nutze \`/business einsammeln\` um Einkommen abzuholen.`
        )
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'info') {
      const owned = getUserBusinesses(userId);
      if (owned.length === 0) return interaction.reply('❌ Du besitzt keine Unternehmen! Nutze `/business liste`.');

      let totalIncome = 0;
      const lines = owned.map(ob => {
        const biz = businesses.find(b => b.id === ob.business_id);
        const income = getIncome(ob.business_id, ob.level);
        totalIncome += income;
        const lastCollected = ob.last_collected ? new Date(ob.last_collected) : null;
        const elapsed = lastCollected ? Date.now() - lastCollected.getTime() : 0;
        const hours = Math.floor(elapsed / COLLECT_COOLDOWN);
        const pending = Math.min(hours, 24) * income;

        return `${biz.emoji} **${biz.name}** (Lv.${ob.level})\n` +
          `   Einkommen: **${config.currencySymbol}${income}/h**\n` +
          `   Ausstehend: **${config.currencySymbol}${pending.toLocaleString()}** (${Math.min(hours, 24)}h)`;
      });

      const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle(`🏢 ${interaction.user.username}'s Unternehmen`)
        .setDescription(
          lines.join('\n\n') +
          `\n\n📊 Gesamt-Einkommen: **${config.currencySymbol}${totalIncome}/h**`
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'einsammeln') {
      const owned = getUserBusinesses(userId);
      if (owned.length === 0) return interaction.reply('❌ Du besitzt keine Unternehmen!');

      let totalCollected = 0;
      const collections = [];

      for (const ob of owned) {
        const biz = businesses.find(b => b.id === ob.business_id);
        const income = getIncome(ob.business_id, ob.level);
        const lastCollected = ob.last_collected ? new Date(ob.last_collected) : new Date(0);
        const elapsed = Date.now() - lastCollected.getTime();
        const hours = Math.min(Math.floor(elapsed / COLLECT_COOLDOWN), 24);

        if (hours > 0) {
          const earned = hours * income;
          totalCollected += earned;
          collections.push(`${biz.emoji} **${biz.name}**: +**${config.currencySymbol}${earned.toLocaleString()}** (${hours}h)`);
          db.db.prepare('UPDATE businesses SET last_collected = ? WHERE user_id = ? AND business_id = ?').run(new Date().toISOString(), userId, ob.business_id);
        }
      }

      if (totalCollected === 0) {
        return interaction.reply('❌ Noch kein Einkommen verfügbar! Komm in einer Stunde wieder.');
      }

      db.updateBalance(userId, totalCollected);

      const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('💰 Einkommen eingesammelt!')
        .setDescription(
          collections.join('\n') +
          `\n\n💰 Gesamt: **+${config.currencySymbol}${totalCollected.toLocaleString()}**`
        )
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'upgrade') {
      const bizId = interaction.options.getString('unternehmen');
      const biz = businesses.find(b => b.id === bizId);

      const existing = db.db.prepare('SELECT * FROM businesses WHERE user_id = ? AND business_id = ?').get(userId, bizId);
      if (!existing) return interaction.reply(`❌ Du besitzt kein **${biz.emoji} ${biz.name}**!`);

      if (existing.level >= 10) return interaction.reply('❌ Maximales Level (10) erreicht!');

      const cost = biz.upgradeCost * existing.level;
      if (db.getBalance(userId) < cost) {
        return interaction.reply(`❌ Upgrade kostet **${config.currencySymbol}${cost.toLocaleString()}**!`);
      }

      db.updateBalance(userId, -cost);
      db.db.prepare('UPDATE businesses SET level = level + 1 WHERE user_id = ? AND business_id = ?').run(userId, bizId);

      const newIncome = getIncome(bizId, existing.level + 1);

      const embed = new EmbedBuilder()
        .setColor('#9b59b6')
        .setTitle(`⬆️ ${biz.emoji} ${biz.name} Upgrade!`)
        .setDescription(
          `Level **${existing.level}** → **${existing.level + 1}**\n` +
          `Einkommen: **${config.currencySymbol}${newIncome}/h**\n` +
          `Kosten: **${config.currencySymbol}${cost.toLocaleString()}**`
        )
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'verkaufen') {
      const bizId = interaction.options.getString('unternehmen');
      const biz = businesses.find(b => b.id === bizId);

      const existing = db.db.prepare('SELECT * FROM businesses WHERE user_id = ? AND business_id = ?').get(userId, bizId);
      if (!existing) return interaction.reply(`❌ Du besitzt kein **${biz.emoji} ${biz.name}**!`);

      const sellPrice = Math.floor(biz.cost * 0.5) + Math.floor(biz.upgradeCost * (existing.level - 1) * 0.3);
      db.updateBalance(userId, sellPrice);
      db.db.prepare('DELETE FROM businesses WHERE user_id = ? AND business_id = ?').run(userId, bizId);

      const embed = new EmbedBuilder()
        .setColor('#e67e22')
        .setTitle(`💸 ${biz.emoji} ${biz.name} verkauft!`)
        .setDescription(`Erlös: **+${config.currencySymbol}${sellPrice.toLocaleString()}**`)
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }
  },
};
