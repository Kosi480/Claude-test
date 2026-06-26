const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

const cooldowns = new Map();

function ensureKurierTables() {
  db.db.exec(`CREATE TABLE IF NOT EXISTS kuriere (
    user_id TEXT PRIMARY KEY,
    name TEXT DEFAULT 'Kurier',
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    ruf INTEGER DEFAULT 0,
    lieferungen INTEGER DEFAULT 0,
    km_gesamt INTEGER DEFAULT 0,
    trinkgeld_total INTEGER DEFAULT 0,
    fitness INTEGER DEFAULT 1,
    orientierung INTEGER DEFAULT 1,
    charisma INTEGER DEFAULT 1,
    geschwindigkeit INTEGER DEFAULT 1,
    fahrzeug TEXT DEFAULT 'Fahrrad',
    fahrzeug_zustand INTEGER DEFAULT 100,
    upgrade_tasche INTEGER DEFAULT 0,
    upgrade_navi INTEGER DEFAULT 0,
    upgrade_thermobox INTEGER DEFAULT 0,
    upgrade_werkzeug INTEGER DEFAULT 0
  )`);
  db.db.exec(`CREATE TABLE IF NOT EXISTS kurier_auftraege (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    kunde TEXT,
    paket TEXT,
    distanz INTEGER,
    belohnung INTEGER,
    zeitlimit INTEGER,
    express INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )`);
}

const FAHRZEUGE = [
  { name: 'Fahrrad', emoji: '🚲', speed: 1.0, kapazitaet: 1, cost: 0, minLevel: 1 },
  { name: 'E-Bike', emoji: '🔋', speed: 1.3, kapazitaet: 2, cost: 800, minLevel: 3 },
  { name: 'Roller', emoji: '🛵', speed: 1.6, kapazitaet: 2, cost: 2000, minLevel: 5 },
  { name: 'Motorrad', emoji: '🏍️', speed: 2.0, kapazitaet: 2, cost: 4500, minLevel: 8 },
  { name: 'Lieferwagen', emoji: '🚐', speed: 1.8, kapazitaet: 5, cost: 8000, minLevel: 11 },
  { name: 'Transporter', emoji: '🚛', speed: 1.7, kapazitaet: 8, cost: 15000, minLevel: 14 },
  { name: 'Drohne', emoji: '🤖', speed: 2.5, kapazitaet: 1, cost: 25000, minLevel: 17 },
  { name: 'Helikopter', emoji: '🚁', speed: 3.0, kapazitaet: 4, cost: 50000, minLevel: 20 }
];

const PAKETE = [
  { name: 'Brief', emoji: '✉️', wert: [20, 50], gewicht: 1, fragil: false },
  { name: 'Kleines Paket', emoji: '📦', wert: [40, 90], gewicht: 1, fragil: false },
  { name: 'Lebensmittel', emoji: '🥡', wert: [60, 130], gewicht: 2, fragil: false, zeitkritisch: true },
  { name: 'Blumenstrauß', emoji: '💐', wert: [50, 120], gewicht: 1, fragil: true },
  { name: 'Elektronik', emoji: '📱', wert: [100, 220], gewicht: 2, fragil: true },
  { name: 'Möbelstück', emoji: '🪑', wert: [150, 300], gewicht: 4, fragil: true },
  { name: 'Medikamente', emoji: '💊', wert: [120, 250], gewicht: 1, fragil: false, zeitkritisch: true },
  { name: 'Kunstwerk', emoji: '🖼️', wert: [200, 400], gewicht: 3, fragil: true },
  { name: 'Tiertransport', emoji: '🐾', wert: [180, 350], gewicht: 3, fragil: false, speziell: true },
  { name: 'Geheimpaket', emoji: '🔒', wert: [300, 600], gewicht: 2, fragil: false }
];

const ROUTEN = [
  { name: 'Nachbarschaft', emoji: '🏘️', distanz: [1, 5], minLevel: 1 },
  { name: 'Innenstadt', emoji: '🏙️', distanz: [5, 15], minLevel: 2 },
  { name: 'Vorstadt', emoji: '🏡', distanz: [10, 25], minLevel: 4 },
  { name: 'Industriegebiet', emoji: '🏭', distanz: [15, 35], minLevel: 6 },
  { name: 'Nachbarstadt', emoji: '🌆', distanz: [25, 50], minLevel: 9 },
  { name: 'Bergdorf', emoji: '⛰️', distanz: [30, 60], minLevel: 12 },
  { name: 'Hafenviertel', emoji: '⚓', distanz: [20, 45], minLevel: 8 },
  { name: 'Flughafen-Express', emoji: '✈️', distanz: [40, 80], minLevel: 15 }
];

const LIEFER_EVENTS = [
  { text: 'Freie Straße — du kommst schnell voran!', modifier: 1.3, zeitBonus: true },
  { text: 'Stau auf der Hauptstraße...', modifier: 0.8 },
  { text: 'Ein freundlicher Kunde gibt extra Trinkgeld!', modifier: 1.1, tipBonus: 2.0 },
  { text: 'Baustelle blockiert den Weg — Umleitung!', modifier: 0.7 },
  { text: 'Du findest eine Abkürzung durch den Park!', modifier: 1.4 },
  { text: 'Regen macht die Straßen rutschig.', modifier: 0.85 },
  { text: 'Ein Hund jagt dich drei Blocks weit!', modifier: 0.9 },
  { text: 'Perfektes Wetter für eine Lieferung!', modifier: 1.2 },
  { text: 'Du triffst einen anderen Kurier — Wettrennen!', modifier: 1.25 },
  { text: 'Ampelpanne — alle Ampeln sind grün!', modifier: 1.35 }
];

const KUNDEN_TYPEN = [
  { name: 'Oma Gertrude', emoji: '👵', tip: [5, 25], freundlich: true },
  { name: 'Geschäftsmann', emoji: '👔', tip: [10, 40], ungeduldig: true },
  { name: 'Studentin', emoji: '👩‍🎓', tip: [0, 15], freundlich: true },
  { name: 'Arztpraxis', emoji: '🏥', tip: [15, 50], ungeduldig: true },
  { name: 'Restaurant', emoji: '🍽️', tip: [10, 35], mengenKunde: true },
  { name: 'Firma', emoji: '🏢', tip: [20, 60], mengenKunde: true },
  { name: 'Influencer', emoji: '📱', tip: [5, 30], rufBonus: 2 },
  { name: 'Bürgermeister', emoji: '🎩', tip: [25, 70], rufBonus: 3 }
];

const RANKS = [
  { name: 'Laufbursche', minLevel: 1 },
  { name: 'Fahrradkurier', minLevel: 3 },
  { name: 'Stadtkurier', minLevel: 5 },
  { name: 'Express-Bote', minLevel: 8 },
  { name: 'Profi-Kurier', minLevel: 12 },
  { name: 'Logistik-Experte', minLevel: 16 },
  { name: 'Lieferlegende', minLevel: 20 },
  { name: 'Kurier-König', minLevel: 25 }
];

const UPGRADES = {
  tasche: { name: 'Kuriertasche', field: 'upgrade_tasche', costs: [300, 800, 1800, 4000, 8000], desc: '+Paketschutz bei fragilen Sendungen' },
  navi: { name: 'GPS-Navigation', field: 'upgrade_navi', costs: [400, 1000, 2200, 5000, 10000], desc: '+Orientierung & schnellere Routen' },
  thermobox: { name: 'Thermobox', field: 'upgrade_thermobox', costs: [350, 900, 2000, 4500, 9000], desc: '+Bonus bei Lebensmittel-Lieferungen' },
  werkzeug: { name: 'Reparatur-Kit', field: 'upgrade_werkzeug', costs: [250, 700, 1500, 3500, 7000], desc: '+Fahrzeug-Haltbarkeit' }
};

function getRank(level) {
  let rank = RANKS[0];
  for (const r of RANKS) { if (level >= r.minLevel) rank = r; }
  return rank;
}

function xpForLevel(level) { return Math.floor(70 * Math.pow(level, 1.45)); }
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kurier')
    .setDescription('📦 Werde Kurier und liefere Pakete durch die Stadt!')
    .addSubcommand(s => s.setName('status').setDescription('Zeige dein Kurier-Profil'))
    .addSubcommand(s => s.setName('name').setDescription('Ändere deinen Kurier-Namen')
      .addStringOption(o => o.setName('name').setDescription('Neuer Name').setRequired(true)))
    .addSubcommand(s => s.setName('auftrag').setDescription('Nimm einen Lieferauftrag an')
      .addIntegerOption(o => o.setName('route').setDescription('Routennummer (1-8)').setRequired(true)))
    .addSubcommand(s => s.setName('liefern').setDescription('Liefere den aktiven Auftrag aus'))
    .addSubcommand(s => s.setName('auftraege').setDescription('Zeige deine aktiven Aufträge'))
    .addSubcommand(s => s.setName('fahrzeug').setDescription('Kaufe ein neues Fahrzeug')
      .addIntegerOption(o => o.setName('nr').setDescription('Fahrzeugnummer (1-8)').setRequired(true)))
    .addSubcommand(s => s.setName('reparieren').setDescription('Repariere dein Fahrzeug'))
    .addSubcommand(s => s.setName('routen').setDescription('Zeige alle verfügbaren Routen'))
    .addSubcommand(s => s.setName('trainieren').setDescription('Trainiere eine Fähigkeit')
      .addStringOption(o => o.setName('skill').setDescription('fitness/orientierung/charisma/geschwindigkeit').setRequired(true)))
    .addSubcommand(s => s.setName('upgrade').setDescription('Verbessere deine Ausrüstung')
      .addStringOption(o => o.setName('item').setDescription('tasche/navi/thermobox/werkzeug').setRequired(true)))
    .addSubcommand(s => s.setName('wettrennen').setDescription('Kurier-Wettrennen gegen einen anderen Spieler')
      .addUserOption(o => o.setName('gegner').setDescription('Dein Gegner').setRequired(true))),

  async execute(interaction) {
    ensureKurierTables();
    const config = require('../config.json');
    const userId = interaction.user.id;
    const sub = interaction.options.getSubcommand();

    const now = Date.now();
    const cdKey = `${userId}-${sub}`;
    const cdTime = sub === 'liefern' ? 20000 : sub === 'auftrag' ? 10000 : sub === 'wettrennen' ? 60000 : 5000;
    if (cooldowns.has(cdKey) && now - cooldowns.get(cdKey) < cdTime) {
      const left = Math.ceil((cdTime - (now - cooldowns.get(cdKey))) / 1000);
      return interaction.reply({ content: `⏳ Cooldown: **${left}s**`, ephemeral: true });
    }
    cooldowns.set(cdKey, now);

    let kurier = db.db.prepare('SELECT * FROM kuriere WHERE user_id = ?').get(userId);
    if (!kurier && sub !== 'status' && sub !== 'routen') {
      db.db.prepare('INSERT INTO kuriere (user_id) VALUES (?)').run(userId);
      kurier = db.db.prepare('SELECT * FROM kuriere WHERE user_id = ?').get(userId);
    }

    if (sub === 'status') {
      if (!kurier) {
        db.db.prepare('INSERT INTO kuriere (user_id) VALUES (?)').run(userId);
        kurier = db.db.prepare('SELECT * FROM kuriere WHERE user_id = ?').get(userId);
      }
      const rank = getRank(kurier.level);
      const xpNeeded = xpForLevel(kurier.level);
      const bal = (db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId))?.balance || 0;
      const activeOrders = db.db.prepare('SELECT COUNT(*) as c FROM kurier_auftraege WHERE user_id = ?').get(userId).c;
      const fz = FAHRZEUGE.find(f => f.name === kurier.fahrzeug) || FAHRZEUGE[0];

      const embed = new EmbedBuilder()
        .setTitle(`📦 Kurier ${kurier.name}`)
        .setColor('#ff5722')
        .addFields(
          { name: '📊 Rang', value: `${rank.name} (Lv. ${kurier.level})`, inline: true },
          { name: '⭐ XP', value: `${kurier.xp}/${xpNeeded}`, inline: true },
          { name: '💰 Coins', value: bal.toLocaleString(), inline: true },
          { name: '📬 Lieferungen', value: `${kurier.lieferungen}`, inline: true },
          { name: '🛤️ Kilometer', value: `${kurier.km_gesamt} km`, inline: true },
          { name: '⭐ Ruf', value: `${kurier.ruf}`, inline: true },
          { name: '🚗 Fahrzeug', value: `${fz.emoji} ${kurier.fahrzeug} (${kurier.fahrzeug_zustand}%)`, inline: true },
          { name: '📋 Aufträge', value: `${activeOrders} aktiv`, inline: true },
          { name: '💝 Trinkgeld', value: `${kurier.trinkgeld_total} total`, inline: true },
          { name: '💪 Skills', value: `Fitness: ${kurier.fitness} | Orient.: ${kurier.orientierung}\nCharisma: ${kurier.charisma} | Speed: ${kurier.geschwindigkeit}`, inline: false },
          { name: '🔧 Ausrüstung', value: `Tasche: Lv.${kurier.upgrade_tasche} | Navi: Lv.${kurier.upgrade_navi}\nThermo: Lv.${kurier.upgrade_thermobox} | Werkzeug: Lv.${kurier.upgrade_werkzeug}`, inline: false }
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'name') {
      const name = interaction.options.getString('name').substring(0, 25);
      db.db.prepare('UPDATE kuriere SET name = ? WHERE user_id = ?').run(name, userId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor('#ff5722').setDescription(`📦 Du heißt jetzt **${name}**!`)] });
    }

    if (sub === 'routen') {
      const lines = ROUTEN.map((r, i) => `**${i + 1}.** ${r.emoji} ${r.name} — ${r.distanz[0]}-${r.distanz[1]} km | Ab Lv.${r.minLevel}`).join('\n');
      const fzLines = FAHRZEUGE.map((f, i) => `**${i + 1}.** ${f.emoji} ${f.name} — Speed: x${f.speed} | Kap: ${f.kapazitaet} | ${f.cost > 0 ? f.cost + ' Coins' : 'Starter'} | Ab Lv.${f.minLevel}`).join('\n');
      return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🗺️ Routen & Fahrzeuge').setColor('#ff5722').setDescription(`**Routen:**\n${lines}\n\n**Fahrzeuge:**\n${fzLines}`)] });
    }

    if (sub === 'auftrag') {
      const routeIdx = interaction.options.getInteger('route') - 1;
      if (routeIdx < 0 || routeIdx >= ROUTEN.length) {
        return interaction.reply({ content: `❌ Ungültige Route! Wähle 1-${ROUTEN.length}.`, ephemeral: true });
      }
      const route = ROUTEN[routeIdx];
      if (kurier.level < route.minLevel) {
        return interaction.reply({ content: `❌ Du brauchst Level ${route.minLevel} für ${route.name}!`, ephemeral: true });
      }

      const maxOrders = 3 + kurier.upgrade_tasche;
      const activeOrders = db.db.prepare('SELECT COUNT(*) as c FROM kurier_auftraege WHERE user_id = ?').get(userId).c;
      if (activeOrders >= maxOrders) {
        return interaction.reply({ content: `❌ Auftragsliste voll! (${activeOrders}/${maxOrders}) Liefere erst aus.`, ephemeral: true });
      }

      const paket = PAKETE[rand(0, PAKETE.length - 1)];
      const distanz = rand(route.distanz[0], route.distanz[1]);
      const express = Math.random() < 0.25;
      const belohnung = Math.floor(paket.wert[0] + (paket.wert[1] - paket.wert[0]) * (distanz / route.distanz[1]) * (express ? 1.5 : 1));

      db.db.prepare('INSERT INTO kurier_auftraege (user_id, kunde, paket, distanz, belohnung, zeitlimit, express) VALUES (?, ?, ?, ?, ?, ?, ?)').run(userId, KUNDEN_TYPEN[rand(0, KUNDEN_TYPEN.length - 1)].name, paket.name, distanz, belohnung, express ? 1 : 0, express ? 1 : 0);

      const embed = new EmbedBuilder()
        .setTitle(`📋 Neuer Auftrag!`)
        .setColor(express ? '#f44336' : '#ff5722')
        .setDescription(`${route.emoji} Route: **${route.name}**`)
        .addFields(
          { name: '📦 Paket', value: `${paket.emoji} ${paket.name}`, inline: true },
          { name: '🛤️ Distanz', value: `${distanz} km`, inline: true },
          { name: '💰 Belohnung', value: `${belohnung} Coins`, inline: true }
        );
      if (express) embed.addFields({ name: '⚡ EXPRESS', value: 'Eilzustellung — Bonus!' });
      if (paket.fragil) embed.addFields({ name: '⚠️ Fragil', value: 'Vorsicht beim Transport!' });
      embed.setFooter({ text: 'Nutze /kurier liefern um auszuliefern!' });
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'auftraege') {
      const orders = db.db.prepare('SELECT * FROM kurier_auftraege WHERE user_id = ? ORDER BY id DESC LIMIT 10').all(userId);
      if (orders.length === 0) {
        return interaction.reply({ content: '📋 Keine aktiven Aufträge. Nimm einen an!', ephemeral: true });
      }
      const lines = orders.map(o => {
        const p = PAKETE.find(pk => pk.name === o.paket);
        return `**#${o.id}** ${p?.emoji || '📦'} ${o.paket} → ${o.kunde} | ${o.distanz}km | ${o.belohnung} Coins${o.express ? ' ⚡' : ''}`;
      }).join('\n');
      return interaction.reply({ embeds: [new EmbedBuilder().setTitle('📋 Aktive Aufträge').setColor('#ff5722').setDescription(lines)] });
    }

    if (sub === 'liefern') {
      const order = db.db.prepare('SELECT * FROM kurier_auftraege WHERE user_id = ? ORDER BY id ASC LIMIT 1').get(userId);
      if (!order) {
        return interaction.reply({ content: '❌ Keine Aufträge! Nimm erst einen an.', ephemeral: true });
      }

      if (kurier.fahrzeug_zustand <= 0) {
        return interaction.reply({ content: '❌ Dein Fahrzeug ist kaputt! Repariere es erst.', ephemeral: true });
      }

      const event = LIEFER_EVENTS[rand(0, LIEFER_EVENTS.length - 1)];
      const fz = FAHRZEUGE.find(f => f.name === kurier.fahrzeug) || FAHRZEUGE[0];
      const paket = PAKETE.find(p => p.name === order.paket);
      const kunde = KUNDEN_TYPEN.find(k => k.name === order.kunde) || KUNDEN_TYPEN[0];

      const naviBonus = 1 + kurier.upgrade_navi * 0.1 + kurier.orientierung * 0.05;
      const speedBonus = fz.speed * (1 + kurier.geschwindigkeit * 0.05);
      const deliveryScore = rand(1, 20) + Math.floor(speedBonus * 3 + naviBonus * 2) + (event.modifier > 1 ? 3 : event.modifier < 1 ? -2 : 0);

      let belohnung = order.belohnung;
      let tip = rand(kunde.tip[0], kunde.tip[1]);
      let rufGain = 1;
      let beschaedigt = false;

      if (paket?.fragil && rand(1, 20) > 10 + kurier.upgrade_tasche * 2 + kurier.fitness) {
        beschaedigt = true;
        belohnung = Math.floor(belohnung * 0.5);
        tip = 0;
        rufGain = 0;
      }

      if (paket?.zeitkritisch && kurier.upgrade_thermobox > 0) {
        belohnung = Math.floor(belohnung * (1 + kurier.upgrade_thermobox * 0.1));
      }

      if (event.tipBonus) tip = Math.floor(tip * event.tipBonus);
      belohnung = Math.floor(belohnung * event.modifier);
      tip = Math.floor(tip * (1 + kurier.charisma * 0.08));

      if (kunde.rufBonus) rufGain += kunde.rufBonus;

      const totalEarning = belohnung + tip;
      const zustandVerlust = rand(3, 8) - kurier.upgrade_werkzeug;

      db.db.prepare('DELETE FROM kurier_auftraege WHERE id = ?').run(order.id);
      db.db.prepare('UPDATE kuriere SET lieferungen = lieferungen + 1, km_gesamt = km_gesamt + ?, ruf = ruf + ?, trinkgeld_total = trinkgeld_total + ?, fahrzeug_zustand = MAX(0, fahrzeug_zustand - ?) WHERE user_id = ?').run(order.distanz, rufGain, tip, Math.max(1, zustandVerlust), userId);
      db.db.prepare('UPDATE economy SET balance = balance + ? WHERE user_id = ?').run(totalEarning, userId);

      const xpGain = Math.floor(10 + order.distanz * 0.5 + (order.express ? 10 : 0));
      let newXp = kurier.xp + xpGain;
      let newLevel = kurier.level;
      let leveledUp = false;
      while (newXp >= xpForLevel(newLevel)) { newXp -= xpForLevel(newLevel); newLevel++; leveledUp = true; }
      db.db.prepare('UPDATE kuriere SET xp = ?, level = ? WHERE user_id = ?').run(newXp, newLevel, userId);

      const embed = new EmbedBuilder()
        .setTitle(`${fz.emoji} Lieferung abgeschlossen!`)
        .setColor(beschaedigt ? '#f44336' : '#4caf50')
        .setDescription(`${event.text}\n\n${paket?.emoji || '📦'} **${order.paket}** an **${order.kunde}** geliefert!`)
        .addFields(
          { name: '🛤️ Distanz', value: `${order.distanz} km`, inline: true },
          { name: '💰 Belohnung', value: `${belohnung} Coins`, inline: true },
          { name: '💝 Trinkgeld', value: `${tip} Coins`, inline: true },
          { name: '💵 Gesamt', value: `**${totalEarning}** Coins`, inline: true },
          { name: '⭐ XP', value: `+${xpGain}`, inline: true },
          { name: '⭐ Ruf', value: `+${rufGain}`, inline: true }
        );
      if (beschaedigt) embed.addFields({ name: '💥 Beschädigt!', value: 'Das fragile Paket wurde beschädigt! Halbe Belohnung.' });
      if (order.express) embed.addFields({ name: '⚡ Express', value: 'Express-Bonus!' });
      if (leveledUp) embed.addFields({ name: '🎉 Level Up!', value: `Level ${newLevel}! Rang: ${getRank(newLevel).name}` });
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'fahrzeug') {
      const fzIdx = interaction.options.getInteger('nr') - 1;
      if (fzIdx < 0 || fzIdx >= FAHRZEUGE.length) {
        return interaction.reply({ content: `❌ Wähle ein Fahrzeug 1-${FAHRZEUGE.length}!`, ephemeral: true });
      }
      const fz = FAHRZEUGE[fzIdx];
      if (kurier.level < fz.minLevel) {
        return interaction.reply({ content: `❌ Du brauchst Level ${fz.minLevel} für ${fz.name}!`, ephemeral: true });
      }
      if (kurier.fahrzeug === fz.name) {
        return interaction.reply({ content: `❌ Du fährst bereits ${fz.name}!`, ephemeral: true });
      }
      if (fz.cost > 0) {
        const bal = (db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId))?.balance || 0;
        if (bal < fz.cost) {
          return interaction.reply({ content: `❌ ${fz.name} kostet **${fz.cost.toLocaleString()}** Coins!`, ephemeral: true });
        }
        db.db.prepare('UPDATE economy SET balance = balance - ? WHERE user_id = ?').run(fz.cost, userId);
      }
      db.db.prepare('UPDATE kuriere SET fahrzeug = ?, fahrzeug_zustand = 100 WHERE user_id = ?').run(fz.name, userId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor('#ff5722').setDescription(`${fz.emoji} Neues Fahrzeug: **${fz.name}**!\nSpeed: x${fz.speed} | Kapazität: ${fz.kapazitaet}${fz.cost > 0 ? `\n💰 -${fz.cost.toLocaleString()} Coins` : ''}`)] });
    }

    if (sub === 'reparieren') {
      if (kurier.fahrzeug_zustand >= 100) {
        return interaction.reply({ content: '✅ Dein Fahrzeug ist in Top-Zustand!', ephemeral: true });
      }
      const damage = 100 - kurier.fahrzeug_zustand;
      const cost = damage * 5;
      const bal = (db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId))?.balance || 0;
      if (bal < cost) {
        return interaction.reply({ content: `❌ Reparatur kostet **${cost}** Coins!`, ephemeral: true });
      }
      db.db.prepare('UPDATE kuriere SET fahrzeug_zustand = 100 WHERE user_id = ?').run(userId);
      db.db.prepare('UPDATE economy SET balance = balance - ? WHERE user_id = ?').run(cost, userId);
      const fz = FAHRZEUGE.find(f => f.name === kurier.fahrzeug) || FAHRZEUGE[0];
      return interaction.reply({ embeds: [new EmbedBuilder().setColor('#4caf50').setDescription(`🔧 ${fz.emoji} **${kurier.fahrzeug}** repariert! (100%)\n💰 -${cost} Coins`)] });
    }

    if (sub === 'trainieren') {
      const skill = interaction.options.getString('skill').toLowerCase();
      const validSkills = { fitness: 'fitness', orientierung: 'orientierung', charisma: 'charisma', geschwindigkeit: 'geschwindigkeit' };
      if (!validSkills[skill]) {
        return interaction.reply({ content: '❌ Wähle: `fitness`, `orientierung`, `charisma` oder `geschwindigkeit`', ephemeral: true });
      }
      const field = validSkills[skill];
      const currentVal = kurier[field];
      const cost = currentVal * 70 + 100;
      const bal = (db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId))?.balance || 0;
      if (bal < cost) {
        return interaction.reply({ content: `❌ Training kostet **${cost}** Coins!`, ephemeral: true });
      }
      const gain = rand(1, 2);
      db.db.prepare(`UPDATE kuriere SET ${field} = ${field} + ? WHERE user_id = ?`).run(gain, userId);
      db.db.prepare('UPDATE economy SET balance = balance - ? WHERE user_id = ?').run(cost, userId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor('#ff5722').setDescription(`🏋️ **${skill.charAt(0).toUpperCase() + skill.slice(1)}** trainiert! +${gain} (jetzt ${currentVal + gain})\n💰 -${cost} Coins`)] });
    }

    if (sub === 'upgrade') {
      const item = interaction.options.getString('item').toLowerCase();
      const upg = UPGRADES[item];
      if (!upg) {
        return interaction.reply({ content: '❌ Wähle: `tasche`, `navi`, `thermobox` oder `werkzeug`', ephemeral: true });
      }
      const currentLv = kurier[upg.field];
      if (currentLv >= upg.costs.length) {
        return interaction.reply({ content: `❌ ${upg.name} ist bereits auf Max-Level!`, ephemeral: true });
      }
      const cost = upg.costs[currentLv];
      const bal = (db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId))?.balance || 0;
      if (bal < cost) {
        return interaction.reply({ content: `❌ Upgrade kostet **${cost.toLocaleString()}** Coins!`, ephemeral: true });
      }
      db.db.prepare(`UPDATE kuriere SET ${upg.field} = ${upg.field} + 1 WHERE user_id = ?`).run(userId);
      db.db.prepare('UPDATE economy SET balance = balance - ? WHERE user_id = ?').run(cost, userId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor('#ff5722').setDescription(`🔧 **${upg.name}** auf Level ${currentLv + 1} verbessert!\n${upg.desc}\n💰 -${cost.toLocaleString()} Coins`)] });
    }

    if (sub === 'wettrennen') {
      const opponent = interaction.options.getUser('gegner');
      if (opponent.id === userId) return interaction.reply({ content: '❌ Du kannst nicht gegen dich selbst fahren!', ephemeral: true });
      if (opponent.bot) return interaction.reply({ content: '❌ Bots liefern nicht!', ephemeral: true });

      const oppKurier = db.db.prepare('SELECT * FROM kuriere WHERE user_id = ?').get(opponent.id);
      if (!oppKurier) return interaction.reply({ content: '❌ Dein Gegner ist kein Kurier!', ephemeral: true });

      const myFz = FAHRZEUGE.find(f => f.name === kurier.fahrzeug) || FAHRZEUGE[0];
      const oppFz = FAHRZEUGE.find(f => f.name === oppKurier.fahrzeug) || FAHRZEUGE[0];

      const myScore = Math.floor(myFz.speed * 10 + kurier.geschwindigkeit * 3 + kurier.fitness * 2 + kurier.level * 4 + rand(1, 25));
      const oppScore = Math.floor(oppFz.speed * 10 + oppKurier.geschwindigkeit * 3 + oppKurier.fitness * 2 + oppKurier.level * 4 + rand(1, 25));

      const won = myScore > oppScore;
      const coinPrize = Math.floor((kurier.level + oppKurier.level) * 20 + rand(50, 180));

      if (won) {
        db.db.prepare('UPDATE economy SET balance = balance + ? WHERE user_id = ?').run(coinPrize, userId);
        db.db.prepare('UPDATE kuriere SET ruf = ruf + 2 WHERE user_id = ?').run(userId);
      }

      const embed = new EmbedBuilder()
        .setTitle('🏁 Kurier-Wettrennen!')
        .setColor(won ? '#4caf50' : '#f44336')
        .setDescription(`${myFz.emoji} **${kurier.name}** vs ${oppFz.emoji} **${oppKurier.name}**`)
        .addFields(
          { name: kurier.name, value: `🏎️ Speed: ${myScore}`, inline: true },
          { name: oppKurier.name, value: `🏎️ Speed: ${oppScore}`, inline: true },
          { name: '🏆 Ergebnis', value: won ? `**${kurier.name}** gewinnt!\n💰 +${coinPrize} Coins | ⭐ +2 Ruf` : `**${oppKurier.name}** gewinnt!\nSchneller nächstes Mal!` }
        );
      return interaction.reply({ embeds: [embed] });
    }
  }
};
