const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const COOLDOWN = 2 * 60 * 1000;
const cooldowns = new Map();

function ensureRestaurantTables() {
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS restaurants (
      user_id TEXT PRIMARY KEY,
      name TEXT DEFAULT 'Mein Restaurant',
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      stars INTEGER DEFAULT 0,
      seats INTEGER DEFAULT 10,
      kitchen_level INTEGER DEFAULT 1,
      decor_level INTEGER DEFAULT 1,
      hygiene INTEGER DEFAULT 80,
      reputation INTEGER DEFAULT 50,
      chefs INTEGER DEFAULT 1,
      max_chefs INTEGER DEFAULT 2,
      total_served INTEGER DEFAULT 0,
      total_revenue INTEGER DEFAULT 0,
      menu_slots INTEGER DEFAULT 3
    );
    CREATE TABLE IF NOT EXISTS restaurant_menu (
      user_id TEXT,
      dish TEXT,
      price INTEGER DEFAULT 0,
      PRIMARY KEY (user_id, dish)
    );
  `);
}

const dishes = [
  { name: 'Pommes', emoji: '🍟', cost: 10, basePrice: 30, quality: 5, minKitchen: 1 },
  { name: 'Burger', emoji: '🍔', cost: 20, basePrice: 55, quality: 10, minKitchen: 1 },
  { name: 'Pizza', emoji: '🍕', cost: 25, basePrice: 65, quality: 12, minKitchen: 1 },
  { name: 'Pasta', emoji: '🍝', cost: 20, basePrice: 60, quality: 11, minKitchen: 1 },
  { name: 'Sushi', emoji: '🍣', cost: 40, basePrice: 120, quality: 20, minKitchen: 2 },
  { name: 'Steak', emoji: '🥩', cost: 50, basePrice: 150, quality: 25, minKitchen: 2 },
  { name: 'Lachs', emoji: '🐟', cost: 45, basePrice: 130, quality: 22, minKitchen: 2 },
  { name: 'Ramen', emoji: '🍜', cost: 30, basePrice: 90, quality: 18, minKitchen: 2 },
  { name: 'Hummer', emoji: '🦞', cost: 80, basePrice: 250, quality: 35, minKitchen: 3 },
  { name: 'Wagyu-Steak', emoji: '🥩', cost: 120, basePrice: 400, quality: 45, minKitchen: 3 },
  { name: 'Trüffel-Risotto', emoji: '🍚', cost: 90, basePrice: 300, quality: 40, minKitchen: 3 },
  { name: 'Goldblatt-Dessert', emoji: '🍰', cost: 150, basePrice: 500, quality: 50, minKitchen: 4 },
  { name: 'Kaiserin-Menü', emoji: '👑', cost: 200, basePrice: 700, quality: 60, minKitchen: 4 },
  { name: 'Sterneküche Tasting', emoji: '⭐', cost: 300, basePrice: 1000, quality: 75, minKitchen: 5 },
];

const customerTypes = [
  { name: 'Stammgast', emoji: '😊', tipChance: 0.3, tipMult: 0.1, patience: 'hoch' },
  { name: 'Tourist', emoji: '📸', tipChance: 0.5, tipMult: 0.2, patience: 'mittel' },
  { name: 'Geschäftsessen', emoji: '💼', tipChance: 0.4, tipMult: 0.15, patience: 'niedrig' },
  { name: 'Date-Paar', emoji: '💑', tipChance: 0.6, tipMult: 0.25, patience: 'hoch' },
  { name: 'Kritiker', emoji: '📝', tipChance: 0.1, tipMult: 0.05, patience: 'niedrig' },
  { name: 'Promi', emoji: '🌟', tipChance: 0.7, tipMult: 0.3, patience: 'mittel' },
  { name: 'Großfamilie', emoji: '👨‍👩‍👧‍👦', tipChance: 0.2, tipMult: 0.1, patience: 'hoch' },
];

const serviceEvents = [
  { name: 'Perfekter Service', emoji: '✨', effect: 'rep', amount: 5, text: 'Alles lief perfekt!' },
  { name: 'Küchenbrand', emoji: '🔥', effect: 'rep', amount: -8, text: 'Brand in der Küche!' },
  { name: 'Prominenten-Posting', emoji: '📱', effect: 'rep', amount: 10, text: 'Ein Promi postet über euch!' },
  { name: 'Lebensmittelkontrolle', emoji: '🔬', effect: 'hygiene_check', amount: 0, text: 'Überraschende Kontrolle!' },
  { name: 'Lieferengpass', emoji: '📦', effect: 'cost', amount: 1.5, text: 'Zutaten wurden teurer!' },
  { name: 'Koch-Wettbewerb', emoji: '🏆', effect: 'bonus', amount: 500, text: 'Ihr gewinnt einen Koch-Wettbewerb!' },
  { name: 'Negative Bewertung', emoji: '⭐', effect: 'rep', amount: -5, text: 'Eine 1-Stern-Bewertung online!' },
  { name: 'Food-Blogger', emoji: '📸', effect: 'rep', amount: 8, text: 'Ein Food-Blogger schwärmt!' },
];

function getRestaurant(userId) {
  ensureRestaurantTables();
  let r = db.db.prepare('SELECT * FROM restaurants WHERE user_id = ?').get(userId);
  if (!r) {
    db.db.prepare('INSERT INTO restaurants (user_id) VALUES (?)').run(userId);
    r = db.db.prepare('SELECT * FROM restaurants WHERE user_id = ?').get(userId);
  }
  return r;
}

function getMenu(userId) {
  return db.db.prepare('SELECT * FROM restaurant_menu WHERE user_id = ?').all(userId);
}

function addRestXP(userId, xp) {
  const r = getRestaurant(userId);
  const newXP = r.xp + xp;
  const needed = r.level * 170;
  if (newXP >= needed) {
    db.db.prepare('UPDATE restaurants SET xp = ?, level = level + 1, menu_slots = menu_slots + 1, max_chefs = max_chefs + 1 WHERE user_id = ?')
      .run(newXP - needed, userId);
    return true;
  }
  db.db.prepare('UPDATE restaurants SET xp = ? WHERE user_id = ?').run(newXP, userId);
  return false;
}

function getMenuQuality(userId) {
  const menu = getMenu(userId);
  if (menu.length === 0) return 0;
  return menu.reduce((s, m) => {
    const d = dishes.find(x => x.name === m.dish);
    return s + (d ? d.quality : 0);
  }, 0);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('restaurant')
    .setDescription('Manage dein eigenes Restaurant!')
    .addSubcommand(sub => sub.setName('status').setDescription('Zeige deinen Restaurant-Status'))
    .addSubcommand(sub => sub.setName('umbenennen').setDescription('Benenne dein Restaurant um')
      .addStringOption(opt => opt.setName('name').setDescription('Neuer Name').setRequired(true)))
    .addSubcommand(sub => sub.setName('karte').setDescription('Zeige die Speisekarte'))
    .addSubcommand(sub => sub.setName('hinzufuegen').setDescription('Füge ein Gericht zur Karte hinzu')
      .addIntegerOption(opt => opt.setName('gericht').setDescription('Gericht-Nr 1-14').setRequired(true).setMinValue(1).setMaxValue(14))
      .addIntegerOption(opt => opt.setName('preis').setDescription('Verkaufspreis').setRequired(true).setMinValue(10).setMaxValue(5000)))
    .addSubcommand(sub => sub.setName('entfernen').setDescription('Entferne ein Gericht von der Karte')
      .addStringOption(opt => opt.setName('gericht').setDescription('Gerichtname').setRequired(true)))
    .addSubcommand(sub => sub.setName('oeffnen').setDescription('Öffne das Restaurant und bediene Gäste'))
    .addSubcommand(sub => sub.setName('upgrade').setDescription('Upgrade dein Restaurant'))
    .addSubcommand(sub => sub.setName('gerichte').setDescription('Zeige alle verfügbaren Gerichte')),

  async execute(interaction) {
    const userId = interaction.user.id;
    const config = require('../config.json');
    const sub = interaction.options.getSubcommand();
    ensureRestaurantTables();

    if (sub === 'umbenennen') {
      getRestaurant(userId);
      const name = interaction.options.getString('name').slice(0, 25);
      db.db.prepare('UPDATE restaurants SET name = ? WHERE user_id = ?').run(name, userId);
      return interaction.reply(`🍽️ Restaurant umbenannt zu **${name}**!`);
    }

    if (sub === 'status') {
      const r = getRestaurant(userId);
      const menu = getMenu(userId);
      const xpNeeded = r.level * 170;
      const quality = getMenuQuality(userId);
      const starRating = r.stars >= 3 ? '⭐⭐⭐' : r.stars >= 2 ? '⭐⭐' : r.stars >= 1 ? '⭐' : '☆';

      const embed = new EmbedBuilder()
        .setColor('#e67e22')
        .setTitle(`🍽️ ${r.name}`)
        .setDescription(
          `**Besitzer:** ${interaction.user.username}\n` +
          `**Level:** ${r.level} (${r.xp}/${xpNeeded} XP)\n` +
          `**Sterne:** ${starRating} (${r.stars}/3)\n\n` +
          `🪑 Sitzplätze: **${r.seats}**\n` +
          `👨‍🍳 Köche: **${r.chefs}/${r.max_chefs}**\n` +
          `🔪 Küche: **Stufe ${r.kitchen_level}**\n` +
          `🎨 Dekor: **Stufe ${r.decor_level}**\n` +
          `🧹 Hygiene: **${r.hygiene}%**\n` +
          `⭐ Reputation: **${r.reputation}/100**\n` +
          `📋 Speisekarte: **${menu.length}/${r.menu_slots}** Gerichte\n` +
          `🎯 Menüqualität: **${quality}**\n\n` +
          `📊 Gäste bedient: **${r.total_served.toLocaleString()}**\n` +
          `💰 Umsatz: **${config.currencySymbol}${r.total_revenue.toLocaleString()}**`
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'gerichte') {
      const r = getRestaurant(userId);
      const lines = dishes.map((d, i) => {
        const locked = d.minKitchen > r.kitchen_level;
        return `**${i + 1}.** ${d.emoji} **${d.name}** — Kosten: ${config.currencySymbol}${d.cost} | Empf. Preis: ${config.currencySymbol}${d.basePrice} | ⭐ ${d.quality}${locked ? ' 🔒 Küche Lv.' + d.minKitchen : ''}`;
      });

      const embed = new EmbedBuilder()
        .setColor('#f39c12')
        .setTitle('📋 Verfügbare Gerichte')
        .setDescription(lines.join('\n') + `\n\n*Hinzufügen: \`/restaurant hinzufuegen\`*`)
        .setFooter({ text: `Küche: Stufe ${r.kitchen_level}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'karte') {
      const menu = getMenu(userId);
      if (menu.length === 0) return interaction.reply('📋 Speisekarte ist leer! Füge Gerichte hinzu.');

      const lines = menu.map(m => {
        const d = dishes.find(x => x.name === m.dish);
        const profit = m.price - (d ? d.cost : 0);
        return `${d ? d.emoji : '🍽️'} **${m.dish}** — ${config.currencySymbol}${m.price} (Gewinn: ${config.currencySymbol}${profit})`;
      });

      const embed = new EmbedBuilder()
        .setColor('#27ae60')
        .setTitle('📋 Speisekarte')
        .setDescription(lines.join('\n'))
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'hinzufuegen') {
      const r = getRestaurant(userId);
      const menu = getMenu(userId);
      const dishIdx = interaction.options.getInteger('gericht') - 1;
      const price = interaction.options.getInteger('preis');
      const dish = dishes[dishIdx];

      if (!dish) return interaction.reply('❌ Ungültiges Gericht!');
      if (dish.minKitchen > r.kitchen_level) return interaction.reply(`🔒 Du brauchst **Küche Stufe ${dish.minKitchen}**!`);
      if (menu.length >= r.menu_slots) return interaction.reply(`❌ Karte voll! (**${menu.length}/${r.menu_slots}**) Level up für mehr Plätze.`);
      if (menu.some(m => m.dish === dish.name)) return interaction.reply('❌ Dieses Gericht ist schon auf der Karte!');

      db.db.prepare('INSERT INTO restaurant_menu (user_id, dish, price) VALUES (?, ?, ?)').run(userId, dish.name, price);

      return interaction.reply(`${dish.emoji} **${dish.name}** zur Karte hinzugefügt! Preis: **${config.currencySymbol}${price}** (Kosten: ${config.currencySymbol}${dish.cost})`);
    }

    if (sub === 'entfernen') {
      const name = interaction.options.getString('gericht');
      const menu = getMenu(userId);
      const found = menu.find(m => m.dish.toLowerCase() === name.toLowerCase());
      if (!found) return interaction.reply('❌ Gericht nicht auf der Karte!');

      db.db.prepare('DELETE FROM restaurant_menu WHERE user_id = ? AND dish = ?').run(userId, found.dish);
      return interaction.reply(`🗑️ **${found.dish}** von der Karte entfernt.`);
    }

    if (sub === 'oeffnen') {
      const lastPlay = cooldowns.get(userId);
      if (lastPlay && Date.now() - lastPlay < COOLDOWN) {
        const remaining = Math.ceil((COOLDOWN - (Date.now() - lastPlay)) / 1000);
        return interaction.reply(`⏳ Nächste Schicht in **${remaining}s**!`);
      }

      const r = getRestaurant(userId);
      const menu = getMenu(userId);
      if (menu.length === 0) return interaction.reply('❌ Speisekarte ist leer! Füge zuerst Gerichte hinzu.');

      cooldowns.set(userId, Date.now());

      const quality = getMenuQuality(userId);
      const attractiveness = (quality + r.reputation + r.decor_level * 10) / 3;
      const customerCount = Math.max(1, Math.floor(Math.min(r.seats, attractiveness / 3 * r.chefs)));

      const event = serviceEvents[Math.floor(Math.random() * serviceEvents.length)];
      const customer = customerTypes[Math.floor(Math.random() * customerTypes.length)];

      let totalRevenue = 0;
      let totalCost = 0;
      let tips = 0;

      for (let i = 0; i < customerCount; i++) {
        const orderedDish = menu[Math.floor(Math.random() * menu.length)];
        const d = dishes.find(x => x.name === orderedDish.dish);
        totalRevenue += orderedDish.price;
        totalCost += d ? d.cost : 0;

        if (Math.random() < customer.tipChance) {
          tips += Math.floor(orderedDish.price * customer.tipMult);
        }
      }

      let eventText = `${event.emoji} **${event.name}:** ${event.text}`;
      let bonusMoney = 0;

      switch (event.effect) {
        case 'rep': {
          const newRep = Math.max(0, Math.min(100, r.reputation + event.amount));
          db.db.prepare('UPDATE restaurants SET reputation = ? WHERE user_id = ?').run(newRep, userId);
          eventText += ` (${event.amount > 0 ? '+' : ''}${event.amount} Rep)`;
          break;
        }
        case 'hygiene_check':
          if (r.hygiene >= 70) {
            eventText += ' ✅ Bestanden!';
            db.db.prepare('UPDATE restaurants SET reputation = MIN(100, reputation + 5) WHERE user_id = ?').run(userId);
          } else {
            eventText += ' ❌ Durchgefallen! -10 Rep';
            db.db.prepare('UPDATE restaurants SET reputation = MAX(0, reputation - 10) WHERE user_id = ?').run(userId);
          }
          break;
        case 'cost':
          totalCost = Math.floor(totalCost * event.amount);
          eventText += ' (+50% Kosten)';
          break;
        case 'bonus':
          bonusMoney = event.amount;
          eventText += ` (+${config.currencySymbol}${event.amount})`;
          break;
      }

      const profit = totalRevenue + tips + bonusMoney - totalCost;
      if (profit > 0) db.updateBalance(userId, profit);

      db.db.prepare('UPDATE restaurants SET total_served = total_served + ?, total_revenue = total_revenue + ?, hygiene = MAX(0, hygiene - 2) WHERE user_id = ?')
        .run(customerCount, Math.max(0, profit), userId);

      const newStars = r.reputation >= 90 ? 3 : r.reputation >= 70 ? 2 : r.reputation >= 50 ? 1 : 0;
      db.db.prepare('UPDATE restaurants SET stars = ? WHERE user_id = ?').run(newStars, userId);

      const xpGain = 15 + customerCount * 2;
      const leveled = addRestXP(userId, xpGain);
      const updated = getRestaurant(userId);

      const embed = new EmbedBuilder()
        .setColor(profit > 0 ? '#27ae60' : '#e74c3c')
        .setTitle(`🍽️ ${r.name} — Schicht beendet!`)
        .setDescription(
          `${customer.emoji} **${customer.name}** und andere Gäste\n` +
          `👥 Bedient: **${customerCount}** Gäste\n\n` +
          `💰 Umsatz: **${config.currencySymbol}${totalRevenue.toLocaleString()}**\n` +
          `📦 Kosten: **-${config.currencySymbol}${totalCost.toLocaleString()}**\n` +
          `💝 Trinkgeld: **+${config.currencySymbol}${tips.toLocaleString()}**\n` +
          (bonusMoney > 0 ? `🏆 Bonus: **+${config.currencySymbol}${bonusMoney.toLocaleString()}**\n` : '') +
          `📊 **Gewinn: ${profit >= 0 ? '+' : ''}${config.currencySymbol}${profit.toLocaleString()}**\n\n` +
          `${eventText}\n\n` +
          `⭐ +${xpGain} XP` +
          (leveled ? ` 🎉 **LEVEL UP → ${updated.level}!** Neuer Menüplatz & Koch-Slot!` : '')
        )
        .setFooter({ text: `Rep: ${updated.reputation}/100 | Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'upgrade') {
      const r = getRestaurant(userId);
      const upgrades = [
        { name: '🔪 Küche upgraden', cost: 2000 + r.kitchen_level * 3000, field: 'kitchen_level', max: 5, current: r.kitchen_level },
        { name: '🎨 Dekor verbessern', cost: 1000 + r.decor_level * 2000, field: 'decor_level', max: 5, current: r.decor_level },
        { name: '🪑 +5 Sitzplätze', cost: 500 + r.seats * 50, field: 'seats', max: 100, current: r.seats, increment: 5 },
        { name: '👨‍🍳 Koch einstellen', cost: 1500 + r.chefs * 2000, field: 'chefs', max: r.max_chefs, current: r.chefs },
        { name: '🧹 Hygiene auffrischen', cost: 300, field: 'hygiene', max: 100, current: r.hygiene, increment: 20 },
      ];

      const lines = upgrades.map((u, i) => {
        if (u.current >= u.max) return `**${i + 1}.** ${u.name} — **MAX**`;
        return `**${i + 1}.** ${u.name} — **${config.currencySymbol}${u.cost.toLocaleString()}** (${u.current}${u.max ? `/${u.max}` : ''})`;
      });

      const embed = new EmbedBuilder()
        .setColor('#f39c12')
        .setTitle('🔧 Restaurant-Upgrades')
        .setDescription(lines.join('\n'))
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();

      const buttons = upgrades.filter(u => u.current < u.max).slice(0, 5).map(u =>
        new ButtonBuilder().setCustomId(`rest_up_${u.field}_${userId}`).setLabel(u.name).setStyle(ButtonStyle.Primary)
          .setDisabled(db.getBalance(userId) < u.cost)
      );

      const rows = buttons.length > 0 ? [new ActionRowBuilder().addComponents(buttons)] : [];
      const msg = await interaction.reply({ embeds: [embed], components: rows, fetchReply: true });

      if (buttons.length === 0) return;

      const coll = msg.createMessageComponentCollector({ time: 30000 });
      coll.on('collect', (btn) => {
        if (btn.user.id !== userId) return btn.reply({ content: '❌ Nicht dein Restaurant!', flags: 64 });
        coll.stop();

        const field = btn.customId.split('_').slice(2, -1).join('_');
        const upgrade = upgrades.find(u => u.field === field);
        if (!upgrade || upgrade.current >= upgrade.max) return btn.update({ content: '❌ Bereits auf Maximum!', embeds: [], components: [] });
        if (db.getBalance(userId) < upgrade.cost) return btn.update({ content: '❌ Nicht genug Geld!', embeds: [], components: [] });

        db.updateBalance(userId, -upgrade.cost);
        const inc = upgrade.increment || 1;
        db.db.prepare(`UPDATE restaurants SET ${field} = MIN(${field} + ${inc}, ${upgrade.max}) WHERE user_id = ?`).run(userId);

        btn.update({ content: `✅ **${upgrade.name}** erfolgreich! (${config.currencySymbol}${upgrade.cost.toLocaleString()})`, embeds: [], components: [] });
      });
    }
  },
};
