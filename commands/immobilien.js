const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const properties = [
  { id: 'garage', name: 'Garage', emoji: '🏚️', cost: 3000, rent: 30, upgradeCost: 1500, upgradeRent: 15, maxTenants: 1 },
  { id: 'wohnung', name: 'Wohnung', emoji: '🏠', cost: 10000, rent: 100, upgradeCost: 5000, upgradeRent: 50, maxTenants: 2 },
  { id: 'haus', name: 'Haus', emoji: '🏡', cost: 30000, rent: 280, upgradeCost: 15000, upgradeRent: 130, maxTenants: 3 },
  { id: 'villa', name: 'Villa', emoji: '🏰', cost: 80000, rent: 700, upgradeCost: 40000, upgradeRent: 300, maxTenants: 5 },
  { id: 'wolkenkratzer', name: 'Wolkenkratzer', emoji: '🏙️', cost: 250000, rent: 2200, upgradeCost: 100000, upgradeRent: 900, maxTenants: 10 },
];

const RENT_INTERVAL = 2 * 60 * 60 * 1000;

function ensurePropertyTable() {
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS properties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      property_id TEXT NOT NULL,
      level INTEGER DEFAULT 1,
      tenants INTEGER DEFAULT 0,
      last_rent TEXT,
      total_earned INTEGER DEFAULT 0,
      UNIQUE(user_id, property_id)
    )
  `);
}

function getUserProperties(userId) {
  return db.db.prepare('SELECT * FROM properties WHERE user_id = ?').all(userId);
}

function getRent(propId, level, tenants) {
  const prop = properties.find(p => p.id === propId);
  const baseRent = prop.rent + (level - 1) * prop.upgradeRent;
  const occupancy = Math.min(tenants, prop.maxTenants) / prop.maxTenants;
  return Math.floor(baseRent * (0.5 + occupancy * 0.5));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('immobilien')
    .setDescription('Kaufe und vermiete Immobilien für passives Einkommen!')
    .addSubcommand(sub =>
      sub.setName('markt')
        .setDescription('Zeige verfügbare Immobilien'))
    .addSubcommand(sub =>
      sub.setName('kaufen')
        .setDescription('Kaufe eine Immobilie')
        .addStringOption(opt =>
          opt.setName('immobilie')
            .setDescription('Welche Immobilie?')
            .setRequired(true)
            .addChoices(
              { name: '🏚️ Garage (3.000$)', value: 'garage' },
              { name: '🏠 Wohnung (10.000$)', value: 'wohnung' },
              { name: '🏡 Haus (30.000$)', value: 'haus' },
              { name: '🏰 Villa (80.000$)', value: 'villa' },
              { name: '🏙️ Wolkenkratzer (250.000$)', value: 'wolkenkratzer' },
            )))
    .addSubcommand(sub =>
      sub.setName('portfolio')
        .setDescription('Zeige deine Immobilien'))
    .addSubcommand(sub =>
      sub.setName('miete')
        .setDescription('Sammle Mieteinnahmen'))
    .addSubcommand(sub =>
      sub.setName('renovieren')
        .setDescription('Renoviere eine Immobilie (Level Up)')
        .addStringOption(opt =>
          opt.setName('immobilie')
            .setDescription('Welche renovieren?')
            .setRequired(true)
            .addChoices(
              ...properties.map(p => ({ name: `${p.emoji} ${p.name}`, value: p.id }))
            )))
    .addSubcommand(sub =>
      sub.setName('vermieten')
        .setDescription('Suche neue Mieter')
        .addStringOption(opt =>
          opt.setName('immobilie')
            .setDescription('Für welche Immobilie?')
            .setRequired(true)
            .addChoices(
              ...properties.map(p => ({ name: `${p.emoji} ${p.name}`, value: p.id }))
            )))
    .addSubcommand(sub =>
      sub.setName('verkaufen')
        .setDescription('Verkaufe eine Immobilie')
        .addStringOption(opt =>
          opt.setName('immobilie')
            .setDescription('Welche verkaufen?')
            .setRequired(true)
            .addChoices(
              ...properties.map(p => ({ name: `${p.emoji} ${p.name}`, value: p.id }))
            ))),
  async execute(interaction) {
    ensurePropertyTable();
    const userId = interaction.user.id;
    const config = require('../config.json');
    const action = interaction.options.getSubcommand();

    if (action === 'markt') {
      const owned = getUserProperties(userId);
      const ownedIds = new Set(owned.map(p => p.property_id));

      const lines = properties.map(p => {
        const isOwned = ownedIds.has(p.id);
        return `${p.emoji} **${p.name}** ${isOwned ? '✅' : ''}\n` +
          `  💰 Preis: **${config.currencySymbol}${p.cost.toLocaleString()}**\n` +
          `  🏠 Miete: **${config.currencySymbol}${p.rent}/2h** (max ${p.maxTenants} Mieter)\n` +
          `  🔧 Renovierung: **${config.currencySymbol}${p.upgradeCost.toLocaleString()}** (+${config.currencySymbol}${p.upgradeRent}/2h)`;
      });

      const embed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle('🏘️ Immobilienmarkt')
        .setDescription(lines.join('\n\n'))
        .setFooter({ text: 'Mieteinnahmen alle 2 Stunden einsammelbar' })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'kaufen') {
      const propId = interaction.options.getString('immobilie');
      const prop = properties.find(p => p.id === propId);

      const existing = db.db.prepare('SELECT * FROM properties WHERE user_id = ? AND property_id = ?').get(userId, propId);
      if (existing) return interaction.reply(`❌ Du besitzt bereits ein **${prop.emoji} ${prop.name}**!`);

      if (db.getBalance(userId) < prop.cost) {
        return interaction.reply(`❌ Du brauchst **${config.currencySymbol}${prop.cost.toLocaleString()}**!`);
      }

      db.updateBalance(userId, -prop.cost);
      db.db.prepare('INSERT INTO properties (user_id, property_id, last_rent) VALUES (?, ?, ?)')
        .run(userId, propId, new Date().toISOString());

      const embed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle(`${prop.emoji} ${prop.name} gekauft!`)
        .setDescription(
          `Du hast ein **${prop.name}** gekauft!\n\n` +
          `🏠 Miete: **${config.currencySymbol}${prop.rent}/2h**\n` +
          `👥 Max Mieter: **${prop.maxTenants}**\n` +
          `Nutze \`/immobilien vermieten\` um Mieter zu finden!`
        )
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'portfolio') {
      const owned = getUserProperties(userId);
      if (owned.length === 0) return interaction.reply('❌ Du besitzt keine Immobilien! Nutze `/immobilien markt`.');

      let totalRent = 0;
      let totalValue = 0;

      const lines = owned.map(op => {
        const prop = properties.find(p => p.id === op.property_id);
        const rent = getRent(op.property_id, op.level, op.tenants);
        totalRent += rent;
        totalValue += prop.cost + (op.level - 1) * prop.upgradeCost;

        const lastRent = op.last_rent ? new Date(op.last_rent) : null;
        const elapsed = lastRent ? Date.now() - lastRent.getTime() : 0;
        const periods = Math.min(Math.floor(elapsed / RENT_INTERVAL), 12);
        const pending = periods * rent;

        return `${prop.emoji} **${prop.name}** (Lv.${op.level})\n` +
          `  👥 Mieter: **${op.tenants}/${prop.maxTenants}**\n` +
          `  💰 Miete: **${config.currencySymbol}${rent}/2h**\n` +
          `  📦 Ausstehend: **${config.currencySymbol}${pending.toLocaleString()}** (${periods}x)\n` +
          `  📊 Gesamt verdient: **${config.currencySymbol}${op.total_earned.toLocaleString()}**`;
      });

      const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle(`🏘️ ${interaction.user.username}'s Portfolio`)
        .setDescription(
          lines.join('\n\n') +
          `\n\n📊 Gesamtmiete: **${config.currencySymbol}${totalRent}/2h**\n` +
          `🏦 Portfoliowert: **${config.currencySymbol}${totalValue.toLocaleString()}**`
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'miete') {
      const owned = getUserProperties(userId);
      if (owned.length === 0) return interaction.reply('❌ Du besitzt keine Immobilien!');

      let totalCollected = 0;
      const collections = [];

      for (const op of owned) {
        const prop = properties.find(p => p.id === op.property_id);
        const rent = getRent(op.property_id, op.level, op.tenants);
        const lastRent = op.last_rent ? new Date(op.last_rent) : new Date(0);
        const elapsed = Date.now() - lastRent.getTime();
        const periods = Math.min(Math.floor(elapsed / RENT_INTERVAL), 12);

        if (periods > 0 && op.tenants > 0) {
          const earned = periods * rent;
          totalCollected += earned;
          collections.push(`${prop.emoji} **${prop.name}**: +**${config.currencySymbol}${earned.toLocaleString()}** (${periods}x)`);
          db.db.prepare('UPDATE properties SET last_rent = ?, total_earned = total_earned + ? WHERE user_id = ? AND property_id = ?')
            .run(new Date().toISOString(), earned, userId, op.property_id);
        }
      }

      if (totalCollected === 0) {
        return interaction.reply('❌ Noch keine Mieteinnahmen! Komm in 2 Stunden wieder oder finde Mieter.');
      }

      db.updateBalance(userId, totalCollected);

      const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('💰 Miete eingesammelt!')
        .setDescription(
          collections.join('\n') +
          `\n\n💰 Gesamt: **+${config.currencySymbol}${totalCollected.toLocaleString()}**`
        )
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'renovieren') {
      const propId = interaction.options.getString('immobilie');
      const prop = properties.find(p => p.id === propId);

      const existing = db.db.prepare('SELECT * FROM properties WHERE user_id = ? AND property_id = ?').get(userId, propId);
      if (!existing) return interaction.reply(`❌ Du besitzt kein **${prop.emoji} ${prop.name}**!`);
      if (existing.level >= 10) return interaction.reply('❌ Maximales Level (10) erreicht!');

      const cost = prop.upgradeCost * existing.level;
      if (db.getBalance(userId) < cost) {
        return interaction.reply(`❌ Renovierung kostet **${config.currencySymbol}${cost.toLocaleString()}**!`);
      }

      db.updateBalance(userId, -cost);
      db.db.prepare('UPDATE properties SET level = level + 1 WHERE user_id = ? AND property_id = ?')
        .run(userId, propId);

      const newRent = getRent(propId, existing.level + 1, existing.tenants);

      const embed = new EmbedBuilder()
        .setColor('#9b59b6')
        .setTitle(`🔧 ${prop.emoji} ${prop.name} renoviert!`)
        .setDescription(
          `Level **${existing.level}** → **${existing.level + 1}**\n` +
          `💰 Neue Miete: **${config.currencySymbol}${newRent}/2h**\n` +
          `Kosten: **${config.currencySymbol}${cost.toLocaleString()}**`
        )
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'vermieten') {
      const propId = interaction.options.getString('immobilie');
      const prop = properties.find(p => p.id === propId);

      const existing = db.db.prepare('SELECT * FROM properties WHERE user_id = ? AND property_id = ?').get(userId, propId);
      if (!existing) return interaction.reply(`❌ Du besitzt kein **${prop.emoji} ${prop.name}**!`);

      if (existing.tenants >= prop.maxTenants) {
        return interaction.reply(`❌ **${prop.emoji} ${prop.name}** ist voll belegt (${existing.tenants}/${prop.maxTenants})!`);
      }

      const adCost = Math.floor(prop.cost * 0.05);
      if (db.getBalance(userId) < adCost) {
        return interaction.reply(`❌ Mietersuche kostet **${config.currencySymbol}${adCost.toLocaleString()}** (Anzeige)!`);
      }

      db.updateBalance(userId, -adCost);

      const success = Math.random() < (0.7 + existing.level * 0.03);
      const newTenants = success ? Math.min(existing.tenants + 1 + Math.floor(Math.random() * 2), prop.maxTenants) : existing.tenants;

      if (success) {
        const gained = newTenants - existing.tenants;
        db.db.prepare('UPDATE properties SET tenants = ? WHERE user_id = ? AND property_id = ?')
          .run(newTenants, userId, propId);

        const newRent = getRent(propId, existing.level, newTenants);

        const embed = new EmbedBuilder()
          .setColor('#2ecc71')
          .setTitle(`👥 ${gained} neue Mieter gefunden!`)
          .setDescription(
            `${prop.emoji} **${prop.name}**: **${newTenants}/${prop.maxTenants}** Mieter\n` +
            `💰 Neue Miete: **${config.currencySymbol}${newRent}/2h**\n` +
            `📢 Anzeigekosten: **${config.currencySymbol}${adCost.toLocaleString()}**`
          )
          .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      } else {
        const embed = new EmbedBuilder()
          .setColor('#e74c3c')
          .setTitle('😕 Keine Mieter gefunden')
          .setDescription(
            `Niemand hat sich gemeldet.\n` +
            `📢 Anzeigekosten: **-${config.currencySymbol}${adCost.toLocaleString()}**\n` +
            `💡 Tipp: Höheres Level erhöht die Chance!`
          )
          .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }
    }

    if (action === 'verkaufen') {
      const propId = interaction.options.getString('immobilie');
      const prop = properties.find(p => p.id === propId);

      const existing = db.db.prepare('SELECT * FROM properties WHERE user_id = ? AND property_id = ?').get(userId, propId);
      if (!existing) return interaction.reply(`❌ Du besitzt kein **${prop.emoji} ${prop.name}**!`);

      const sellPrice = Math.floor(prop.cost * 0.6) + Math.floor(prop.upgradeCost * (existing.level - 1) * 0.4);
      db.updateBalance(userId, sellPrice);
      db.db.prepare('DELETE FROM properties WHERE user_id = ? AND property_id = ?').run(userId, propId);

      const embed = new EmbedBuilder()
        .setColor('#e67e22')
        .setTitle(`💸 ${prop.emoji} ${prop.name} verkauft!`)
        .setDescription(`Erlös: **+${config.currencySymbol}${sellPrice.toLocaleString()}**`)
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }
  },
};
