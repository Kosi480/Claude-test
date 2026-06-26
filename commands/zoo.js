const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const COOLDOWN = 2 * 60 * 1000;
const cooldowns = new Map();

function ensureZooTables() {
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS zoos (
      user_id TEXT PRIMARY KEY,
      zoo_name TEXT DEFAULT 'Mein Zoo',
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      ticket_price INTEGER DEFAULT 10,
      reputation INTEGER DEFAULT 50,
      total_visitors INTEGER DEFAULT 0,
      total_earnings INTEGER DEFAULT 0,
      enclosures INTEGER DEFAULT 3,
      max_enclosures INTEGER DEFAULT 3,
      food_budget INTEGER DEFAULT 100,
      last_collect TEXT DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS zoo_animals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      species TEXT,
      name TEXT DEFAULT '',
      happiness INTEGER DEFAULT 80,
      health INTEGER DEFAULT 100,
      rarity INTEGER DEFAULT 1,
      attraction INTEGER DEFAULT 10,
      acquired TEXT DEFAULT ''
    );
  `);
}

const animalSpecies = [
  { name: 'Erdmännchen', emoji: '🦫', rarity: 1, attraction: 8, cost: 500, food: 5 },
  { name: 'Pinguin', emoji: '🐧', rarity: 1, attraction: 12, cost: 800, food: 8 },
  { name: 'Flamingo', emoji: '🦩', rarity: 1, attraction: 10, cost: 600, food: 6 },
  { name: 'Schildkröte', emoji: '🐢', rarity: 1, attraction: 7, cost: 400, food: 3 },
  { name: 'Papagei', emoji: '🦜', rarity: 2, attraction: 15, cost: 1200, food: 7 },
  { name: 'Roter Panda', emoji: '🐼', rarity: 2, attraction: 20, cost: 2000, food: 10 },
  { name: 'Wolf', emoji: '🐺', rarity: 2, attraction: 18, cost: 1800, food: 12 },
  { name: 'Krokodil', emoji: '🐊', rarity: 2, attraction: 22, cost: 2500, food: 15 },
  { name: 'Gorilla', emoji: '🦍', rarity: 3, attraction: 30, cost: 5000, food: 20 },
  { name: 'Löwe', emoji: '🦁', rarity: 3, attraction: 35, cost: 6000, food: 25 },
  { name: 'Elefant', emoji: '🐘', rarity: 3, attraction: 40, cost: 8000, food: 30 },
  { name: 'Tiger', emoji: '🐅', rarity: 4, attraction: 45, cost: 12000, food: 28 },
  { name: 'Eisbär', emoji: '🐻‍❄️', rarity: 4, attraction: 50, cost: 15000, food: 35 },
  { name: 'Delphin', emoji: '🐬', rarity: 4, attraction: 55, cost: 20000, food: 30 },
  { name: 'Drache', emoji: '🐉', rarity: 5, attraction: 80, cost: 50000, food: 50 },
  { name: 'Phönix', emoji: '🔥', rarity: 5, attraction: 90, cost: 75000, food: 40 },
  { name: 'Einhorn', emoji: '🦄', rarity: 5, attraction: 100, cost: 100000, food: 35 },
];

const zooEvents = [
  { name: 'Schulausflug', emoji: '🏫', visitorBonus: 2.0, text: 'Eine Schulklasse besucht den Zoo!' },
  { name: 'Regentag', emoji: '🌧️', visitorBonus: 0.5, text: 'Regen verschreckt die Besucher...' },
  { name: 'Tierbaby geboren!', emoji: '🍼', visitorBonus: 3.0, text: 'Ein Tierbaby zieht Massen an!' },
  { name: 'Prominenten-Besuch', emoji: '⭐', visitorBonus: 2.5, text: 'Ein Promi besucht deinen Zoo!' },
  { name: 'Futter-Skandal', emoji: '📰', visitorBonus: 0.3, text: 'Negative Presse über das Futter!' },
  { name: 'Zoo-Festival', emoji: '🎪', visitorBonus: 2.8, text: 'Das jährliche Zoo-Festival!' },
  { name: 'Tierausbruch!', emoji: '🚨', visitorBonus: 0.2, text: 'Ein Tier ist ausgebrochen! Panik!' },
  { name: 'Sonniger Feiertag', emoji: '☀️', visitorBonus: 2.2, text: 'Perfektes Wetter am Feiertag!' },
];

const rarityStars = ['⭐', '⭐⭐', '⭐⭐⭐', '🌟🌟🌟🌟', '💎💎💎💎💎'];

function getZoo(userId) {
  ensureZooTables();
  let zoo = db.db.prepare('SELECT * FROM zoos WHERE user_id = ?').get(userId);
  if (!zoo) {
    db.db.prepare('INSERT INTO zoos (user_id) VALUES (?)').run(userId);
    zoo = db.db.prepare('SELECT * FROM zoos WHERE user_id = ?').get(userId);
  }
  return zoo;
}

function getAnimals(userId) {
  return db.db.prepare('SELECT * FROM zoo_animals WHERE user_id = ?').all(userId);
}

function getTotalAttraction(userId) {
  const animals = getAnimals(userId);
  return animals.reduce((s, a) => s + Math.floor(a.attraction * (a.happiness / 100) * (a.health / 100)), 0);
}

function addZooXP(userId, xp) {
  const zoo = getZoo(userId);
  const newXP = zoo.xp + xp;
  const needed = zoo.level * 200;
  if (newXP >= needed) {
    db.db.prepare('UPDATE zoos SET xp = ?, level = level + 1, max_enclosures = max_enclosures + 1, enclosures = enclosures + 1 WHERE user_id = ?')
      .run(newXP - needed, userId);
    return true;
  }
  db.db.prepare('UPDATE zoos SET xp = ? WHERE user_id = ?').run(newXP, userId);
  return false;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('zoo')
    .setDescription('Verwalte deinen eigenen Zoo mit Tieren, Besuchern und Events!')
    .addSubcommand(sub => sub.setName('status').setDescription('Zeige deinen Zoo-Status'))
    .addSubcommand(sub => sub.setName('tiere').setDescription('Zeige deine Tiere'))
    .addSubcommand(sub => sub.setName('kaufen').setDescription('Kaufe ein neues Tier')
      .addIntegerOption(opt => opt.setName('nummer').setDescription('Tier-Nummer (1-17)').setRequired(true).setMinValue(1).setMaxValue(17)))
    .addSubcommand(sub => sub.setName('benennen').setDescription('Gib einem Tier einen Namen')
      .addIntegerOption(opt => opt.setName('id').setDescription('Tier-ID').setRequired(true))
      .addStringOption(opt => opt.setName('name').setDescription('Neuer Name').setRequired(true)))
    .addSubcommand(sub => sub.setName('fuettern').setDescription('Füttere und pflege alle Tiere'))
    .addSubcommand(sub => sub.setName('besucher').setDescription('Öffne den Zoo und sammle Einnahmen'))
    .addSubcommand(sub => sub.setName('ticketpreis').setDescription('Setze den Ticketpreis')
      .addIntegerOption(opt => opt.setName('preis').setDescription('Neuer Ticketpreis').setRequired(true).setMinValue(5).setMaxValue(500)))
    .addSubcommand(sub => sub.setName('markt').setDescription('Zeige verfügbare Tiere zum Kauf')),

  async execute(interaction) {
    const userId = interaction.user.id;
    const config = require('../config.json');
    const sub = interaction.options.getSubcommand();
    ensureZooTables();

    if (sub === 'status') {
      const zoo = getZoo(userId);
      const animals = getAnimals(userId);
      const totalAttr = getTotalAttraction(userId);
      const xpNeeded = zoo.level * 200;

      const embed = new EmbedBuilder()
        .setColor('#27ae60')
        .setTitle(`🦁 ${zoo.zoo_name}`)
        .setDescription(
          `**Direktor:** ${interaction.user.username}\n` +
          `**Level:** ${zoo.level} (${zoo.xp}/${xpNeeded} XP)\n` +
          `⭐ Reputation: **${zoo.reputation}/100**\n\n` +
          `🏠 Gehege: **${animals.length}/${zoo.max_enclosures}**\n` +
          `🐾 Tiere: **${animals.length}**\n` +
          `🎯 Attraktivität: **${totalAttr}**\n` +
          `🎟️ Ticketpreis: **${config.currencySymbol}${zoo.ticket_price}**\n` +
          `🍖 Futterbudget: **${config.currencySymbol}${zoo.food_budget}**\n\n` +
          `📊 **Statistiken:**\n` +
          `👥 Gesamtbesucher: **${zoo.total_visitors.toLocaleString()}**\n` +
          `💰 Gesamteinnahmen: **${config.currencySymbol}${zoo.total_earnings.toLocaleString()}**`
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'tiere') {
      const animals = getAnimals(userId);
      if (animals.length === 0) return interaction.reply('🐾 Du hast noch keine Tiere! Kaufe welche mit `/zoo kaufen`.');

      const lines = animals.map(a => {
        const species = animalSpecies.find(s => s.name === a.species);
        const emoji = species ? species.emoji : '🐾';
        const happyBar = a.happiness >= 80 ? '😊' : a.happiness >= 50 ? '😐' : '😢';
        const healthBar = a.health >= 80 ? '💚' : a.health >= 50 ? '💛' : '❤️';
        return `**#${a.id}** ${emoji} **${a.name || a.species}** ${rarityStars[a.rarity - 1]}\n` +
          `   ${happyBar} ${a.happiness}% | ${healthBar} ${a.health}% | 🎯 ${a.attraction}`;
      });

      const embed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle('🐾 Deine Tiere')
        .setDescription(lines.join('\n\n'))
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'markt') {
      const zoo = getZoo(userId);
      const lines = animalSpecies.map((a, i) => {
        const locked = a.rarity > zoo.level;
        return `**${i + 1}.** ${a.emoji} **${a.name}** ${rarityStars[a.rarity - 1]}\n` +
          `   🎯 ${a.attraction} | 🍖 ${a.food}/Tag | 💰 ${config.currencySymbol}${a.cost.toLocaleString()}` +
          (locked ? ' 🔒' : '');
      });

      const embed = new EmbedBuilder()
        .setColor('#f39c12')
        .setTitle('🏪 Tiermarkt')
        .setDescription(lines.join('\n') + `\n\n*Kaufe mit \`/zoo kaufen nummer:<Nr>\`*\n🔒 = Level zu niedrig`)
        .setFooter({ text: `Zoo Level: ${zoo.level} | Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'kaufen') {
      const zoo = getZoo(userId);
      const animals = getAnimals(userId);
      const num = interaction.options.getInteger('nummer') - 1;
      const species = animalSpecies[num];

      if (!species) return interaction.reply('❌ Ungültige Nummer!');
      if (species.rarity > zoo.level) return interaction.reply(`🔒 Du brauchst **Zoo Level ${species.rarity}** für ${species.emoji} ${species.name}!`);
      if (animals.length >= zoo.max_enclosures) return interaction.reply(`🏠 Alle Gehege belegt! (**${animals.length}/${zoo.max_enclosures}**) Level up für mehr!`);
      if (db.getBalance(userId) < species.cost) return interaction.reply(`❌ Du brauchst **${config.currencySymbol}${species.cost.toLocaleString()}**!`);

      db.updateBalance(userId, -species.cost);
      db.db.prepare('INSERT INTO zoo_animals (user_id, species, rarity, attraction, acquired) VALUES (?, ?, ?, ?, ?)')
        .run(userId, species.name, species.rarity, species.attraction, new Date().toISOString());

      const embed = new EmbedBuilder()
        .setColor('#27ae60')
        .setTitle(`${species.emoji} Neues Tier!`)
        .setDescription(
          `**${species.name}** ist deinem Zoo beigetreten!\n\n` +
          `${rarityStars[species.rarity - 1]}\n` +
          `🎯 Attraktivität: **${species.attraction}**\n` +
          `🍖 Futterbedarf: **${species.food}/Tag**\n\n` +
          `*Benenne es mit \`/zoo benennen\`!*`
        )
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'benennen') {
      const id = interaction.options.getInteger('id');
      const name = interaction.options.getString('name').slice(0, 20);
      const animal = db.db.prepare('SELECT * FROM zoo_animals WHERE id = ? AND user_id = ?').get(id, userId);
      if (!animal) return interaction.reply('❌ Tier nicht gefunden!');

      db.db.prepare('UPDATE zoo_animals SET name = ? WHERE id = ?').run(name, id);
      const species = animalSpecies.find(s => s.name === animal.species);
      return interaction.reply(`${species ? species.emoji : '🐾'} **${animal.species}** heißt jetzt **"${name}"**!`);
    }

    if (sub === 'ticketpreis') {
      const price = interaction.options.getInteger('preis');
      db.db.prepare('UPDATE zoos SET ticket_price = ? WHERE user_id = ?').run(price, userId);
      getZoo(userId);
      return interaction.reply(`🎟️ Ticketpreis auf **${config.currencySymbol}${price}** gesetzt! Höhere Preise = weniger Besucher, aber mehr pro Ticket.`);
    }

    if (sub === 'fuettern') {
      const zoo = getZoo(userId);
      const animals = getAnimals(userId);
      if (animals.length === 0) return interaction.reply('🐾 Keine Tiere zum Füttern!');

      let totalFoodCost = 0;
      for (const a of animals) {
        const species = animalSpecies.find(s => s.name === a.species);
        totalFoodCost += species ? species.food * 10 : 50;
      }

      if (db.getBalance(userId) < totalFoodCost) {
        return interaction.reply(`❌ Füttern kostet **${config.currencySymbol}${totalFoodCost.toLocaleString()}**!`);
      }

      db.updateBalance(userId, -totalFoodCost);

      let healed = 0;
      let happied = 0;
      for (const a of animals) {
        const newHealth = Math.min(100, a.health + 15);
        const newHappy = Math.min(100, a.happiness + 20);
        if (newHealth > a.health) healed++;
        if (newHappy > a.happiness) happied++;
        db.db.prepare('UPDATE zoo_animals SET health = ?, happiness = ? WHERE id = ?').run(newHealth, newHappy, a.id);
      }

      const embed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle('🍖 Alle Tiere gefüttert und gepflegt!')
        .setDescription(
          `🐾 **${animals.length}** Tiere versorgt\n` +
          `💚 **${healed}** Tiere geheilt\n` +
          `😊 **${happied}** Tiere glücklicher\n\n` +
          `💰 Kosten: **${config.currencySymbol}${totalFoodCost.toLocaleString()}**`
        )
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'besucher') {
      const lastPlay = cooldowns.get(userId);
      if (lastPlay && Date.now() - lastPlay < COOLDOWN) {
        const remaining = Math.ceil((COOLDOWN - (Date.now() - lastPlay)) / 1000);
        return interaction.reply(`⏳ Nächste Besucherrunde in **${remaining}s**!`);
      }

      const zoo = getZoo(userId);
      const animals = getAnimals(userId);
      if (animals.length === 0) return interaction.reply('🐾 Du brauchst Tiere, um Besucher anzulocken!');

      cooldowns.set(userId, Date.now());

      const totalAttr = getTotalAttraction(userId);
      const event = zooEvents[Math.floor(Math.random() * zooEvents.length)];

      const priceFactor = Math.max(0.2, 1 - (zoo.ticket_price - 20) / 200);
      const baseVisitors = Math.floor((totalAttr * 0.8 + zoo.reputation * 0.5) * priceFactor);
      const visitors = Math.max(1, Math.floor(baseVisitors * event.visitorBonus));
      const earnings = visitors * zoo.ticket_price;

      db.updateBalance(userId, earnings);
      db.db.prepare('UPDATE zoos SET total_visitors = total_visitors + ?, total_earnings = total_earnings + ? WHERE user_id = ?')
        .run(visitors, earnings, userId);

      const repChange = event.visitorBonus >= 1.5 ? Math.floor(Math.random() * 5) + 1 : event.visitorBonus < 0.5 ? -(Math.floor(Math.random() * 5) + 1) : 0;
      if (repChange !== 0) {
        const newRep = Math.max(0, Math.min(100, zoo.reputation + repChange));
        db.db.prepare('UPDATE zoos SET reputation = ? WHERE user_id = ?').run(newRep, userId);
      }

      for (const a of animals) {
        const happyDrop = Math.floor(Math.random() * 8) + 2;
        const healthDrop = Math.floor(Math.random() * 5) + 1;
        db.db.prepare('UPDATE zoo_animals SET happiness = MAX(0, happiness - ?), health = MAX(0, health - ?) WHERE id = ?')
          .run(happyDrop, healthDrop, a.id);
      }

      const leveled = addZooXP(userId, 15 + Math.floor(visitors / 10));
      const updatedZoo = getZoo(userId);

      const embed = new EmbedBuilder()
        .setColor(event.visitorBonus >= 1.5 ? '#27ae60' : event.visitorBonus < 0.5 ? '#e74c3c' : '#3498db')
        .setTitle(`🦁 ${zoo.zoo_name} — Besuchertag!`)
        .setDescription(
          `**${event.emoji} ${event.name}**\n${event.text}\n\n` +
          `👥 Besucher: **${visitors.toLocaleString()}** (x${event.visitorBonus})\n` +
          `🎟️ Ticketpreis: **${config.currencySymbol}${zoo.ticket_price}**\n` +
          `💰 Einnahmen: **+${config.currencySymbol}${earnings.toLocaleString()}**\n\n` +
          `🎯 Attraktivität: **${totalAttr}**\n` +
          `⭐ Reputation: **${updatedZoo.reputation}/100** ${repChange > 0 ? `(+${repChange})` : repChange < 0 ? `(${repChange})` : ''}\n\n` +
          (leveled ? `🎉 **ZOO LEVEL UP → ${updatedZoo.level}!** Neues Gehege freigeschaltet!\n\n` : '') +
          `⚠️ Tiere werden müde — vergiss nicht zu füttern!`
        )
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()} | Level ${updatedZoo.level}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }
  },
};
