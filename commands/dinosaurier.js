const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

const cooldowns = new Map();

function ensureDinoTables() {
  db.db.exec(`CREATE TABLE IF NOT EXISTS dino_parks (
    user_id TEXT PRIMARY KEY,
    name TEXT DEFAULT 'Dino-Park',
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    ruf INTEGER DEFAULT 0,
    besucher_total INTEGER DEFAULT 0,
    dna_fragmente INTEGER DEFAULT 0,
    forschung INTEGER DEFAULT 1,
    sicherheit INTEGER DEFAULT 1,
    pflege INTEGER DEFAULT 1,
    genetik INTEGER DEFAULT 1,
    upgrade_zaun INTEGER DEFAULT 0,
    upgrade_labor INTEGER DEFAULT 0,
    upgrade_eingang INTEGER DEFAULT 0,
    upgrade_futterstation INTEGER DEFAULT 0,
    ticketpreis INTEGER DEFAULT 50,
    last_expedition TEXT DEFAULT NULL
  )`);
  db.db.exec(`CREATE TABLE IF NOT EXISTS park_dinos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    art TEXT,
    name TEXT,
    staerke INTEGER,
    gesundheit INTEGER DEFAULT 100,
    zufriedenheit INTEGER DEFAULT 80,
    seltenheit TEXT,
    attraktion INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )`);
}

const DINO_ARTEN = [
  { name: 'Compsognathus', emoji: '🦎', staerke: [5, 15], seltenheit: 'Gewöhnlich', attraktion: 5, futter: 5 },
  { name: 'Velociraptor', emoji: '🦖', staerke: [15, 30], seltenheit: 'Gewöhnlich', attraktion: 12, futter: 10 },
  { name: 'Triceratops', emoji: '🦏', staerke: [25, 45], seltenheit: 'Gewöhnlich', attraktion: 18, futter: 15 },
  { name: 'Stegosaurus', emoji: '🐊', staerke: [30, 50], seltenheit: 'Ungewöhnlich', attraktion: 22, futter: 18 },
  { name: 'Parasaurolophus', emoji: '🦕', staerke: [35, 55], seltenheit: 'Ungewöhnlich', attraktion: 25, futter: 20 },
  { name: 'Ankylosaurus', emoji: '🐢', staerke: [40, 65], seltenheit: 'Selten', attraktion: 30, futter: 22 },
  { name: 'Pteranodon', emoji: '🦅', staerke: [45, 70], seltenheit: 'Selten', attraktion: 35, futter: 18 },
  { name: 'Spinosaurus', emoji: '🐉', staerke: [55, 85], seltenheit: 'Episch', attraktion: 45, futter: 30 },
  { name: 'Brachiosaurus', emoji: '🦕', staerke: [65, 100], seltenheit: 'Episch', attraktion: 55, futter: 35 },
  { name: 'T-Rex', emoji: '🦖', staerke: [80, 120], seltenheit: 'Legendär', attraktion: 70, futter: 40 },
  { name: 'Mosasaurus', emoji: '🐋', staerke: [90, 140], seltenheit: 'Legendär', attraktion: 80, futter: 45 },
  { name: 'Indominus Rex', emoji: '👑', staerke: [120, 180], seltenheit: 'Mythisch', attraktion: 100, futter: 60 }
];

const EXPEDITIONEN = [
  { name: 'Lokaler Steinbruch', emoji: '⛏️', minLevel: 1, dinoRange: [0, 3], cost: 100 },
  { name: 'Wüsten-Ausgrabung', emoji: '🏜️', minLevel: 2, dinoRange: [1, 4], cost: 250 },
  { name: 'Montana Badlands', emoji: '🏔️', minLevel: 4, dinoRange: [2, 5], cost: 500 },
  { name: 'Patagonien', emoji: '🌎', minLevel: 6, dinoRange: [3, 6], cost: 800 },
  { name: 'Sahara-Expedition', emoji: '🐪', minLevel: 8, dinoRange: [4, 7], cost: 1200 },
  { name: 'Antarktis-Bohrung', emoji: '🧊', minLevel: 10, dinoRange: [5, 8], cost: 2000 },
  { name: 'Tiefsee-Bergung', emoji: '🌊', minLevel: 13, dinoRange: [7, 10], cost: 3500 },
  { name: 'Geheimes Labor', emoji: '🧬', minLevel: 16, dinoRange: [9, 11], cost: 6000 }
];

const EXPEDITION_EVENTS = [
  { text: 'Perfekt erhaltene Fossilien entdeckt!', modifier: 3, dna: true },
  { text: 'Ein Sandsturm verzögert die Grabung...', modifier: -2 },
  { text: 'Das Team findet eine vollständige Skelettstruktur!', modifier: 5 },
  { text: 'Grundwasser überflutet die Grabungsstelle.', modifier: -3 },
  { text: 'Seltene DNA-Proben im Bernstein gefunden!', modifier: 4, dna: true },
  { text: 'Die Ausrüstung fällt kurzzeitig aus.', modifier: -1 },
  { text: 'Ein erfahrener Paläontologe unterstützt dich!', modifier: 6 },
  { text: 'Raubgräber stören die Ausgrabung!', modifier: -4 },
  { text: 'Unberührte Gesteinsschicht freigelegt!', modifier: 3 },
  { text: 'Die Fossilien sind besser erhalten als erwartet!', modifier: 4 }
];

const PARK_EVENTS = [
  { text: 'Die Besucher sind begeistert vom neuen Dino!', bonus: 1.3 },
  { text: 'Ein Kind hat seinen Ballon verloren — rührende Szene.', bonus: 1.1 },
  { text: 'Ein Zaun hat ein Loch — Panik bei den Besuchern!', bonus: 0.7 },
  { text: 'Schulklassen-Ausflug bringt viele Besucher!', bonus: 1.4 },
  { text: 'Regenwetter hält einige Besucher fern.', bonus: 0.8 },
  { text: 'Ein Fernsehteam berichtet über deinen Park!', bonus: 1.5, ruf: 3 },
  { text: 'Die Fütterungsshow ist ein voller Erfolg!', bonus: 1.3 },
  { text: 'Ein Dino hat Bauchweh — Besucher sind besorgt.', bonus: 0.9 }
];

const RANKS = [
  { name: 'Park-Praktikant', minLevel: 1 },
  { name: 'Junior-Ranger', minLevel: 3 },
  { name: 'Park-Ranger', minLevel: 5 },
  { name: 'Paläontologe', minLevel: 8 },
  { name: 'Park-Direktor', minLevel: 12 },
  { name: 'Dino-Experte', minLevel: 16 },
  { name: 'Genetik-Meister', minLevel: 20 },
  { name: 'Jurassic-Legende', minLevel: 25 }
];

const UPGRADES = {
  zaun: { name: 'Sicherheitszaun', field: 'upgrade_zaun', costs: [500, 1200, 2800, 6000, 12000], desc: '+Sicherheit, weniger Ausbrüche' },
  labor: { name: 'Genetik-Labor', field: 'upgrade_labor', costs: [600, 1500, 3200, 7000, 14000], desc: '+DNA-Qualität bei Expeditionen' },
  eingang: { name: 'Haupteingang', field: 'upgrade_eingang', costs: [400, 1000, 2200, 5000, 10000], desc: '+Besucher & Ticketpreis' },
  futterstation: { name: 'Futterstation', field: 'upgrade_futterstation', costs: [350, 900, 2000, 4500, 9000], desc: '+Dino-Zufriedenheit & Gesundheit' }
};

function getRank(level) {
  let rank = RANKS[0];
  for (const r of RANKS) { if (level >= r.minLevel) rank = r; }
  return rank;
}

function xpForLevel(level) { return Math.floor(85 * Math.pow(level, 1.5)); }
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

const RARITY_COLORS = {
  'Gewöhnlich': '#9e9e9e', 'Ungewöhnlich': '#4caf50', 'Selten': '#2196f3',
  'Episch': '#9c27b0', 'Legendär': '#ff9800', 'Mythisch': '#e91e63'
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dinosaurier')
    .setDescription('🦕 Baue deinen eigenen Dinosaurier-Park!')
    .addSubcommand(s => s.setName('status').setDescription('Zeige deinen Dino-Park'))
    .addSubcommand(s => s.setName('umbenennen').setDescription('Benenne deinen Park um')
      .addStringOption(o => o.setName('name').setDescription('Neuer Name').setRequired(true)))
    .addSubcommand(s => s.setName('expedition').setDescription('Starte eine Fossilien-Expedition')
      .addIntegerOption(o => o.setName('ort').setDescription('Expeditionsnummer (1-8)').setRequired(true)))
    .addSubcommand(s => s.setName('dinos').setDescription('Zeige deine Dinosaurier'))
    .addSubcommand(s => s.setName('benennen').setDescription('Gib einem Dino einen Namen')
      .addIntegerOption(o => o.setName('id').setDescription('Dino-ID').setRequired(true))
      .addStringOption(o => o.setName('name').setDescription('Neuer Name').setRequired(true)))
    .addSubcommand(s => s.setName('oeffnen').setDescription('Öffne den Park für Besucher'))
    .addSubcommand(s => s.setName('ticketpreis').setDescription('Setze den Ticketpreis')
      .addIntegerOption(o => o.setName('preis').setDescription('Preis in Coins').setRequired(true)))
    .addSubcommand(s => s.setName('upgrade').setDescription('Verbessere deinen Park')
      .addStringOption(o => o.setName('item').setDescription('zaun/labor/eingang/futterstation').setRequired(true)))
    .addSubcommand(s => s.setName('freilassen').setDescription('Lasse einen Dino frei')
      .addIntegerOption(o => o.setName('id').setDescription('Dino-ID').setRequired(true)))
    .addSubcommand(s => s.setName('duell').setDescription('Dino-Kampf gegen einen anderen Park')
      .addUserOption(o => o.setName('gegner').setDescription('Dein Gegner').setRequired(true))),

  async execute(interaction) {
    ensureDinoTables();
    const config = require('../config.json');
    const userId = interaction.user.id;
    const sub = interaction.options.getSubcommand();

    const now = Date.now();
    const cdKey = `${userId}-${sub}`;
    const cdTime = sub === 'expedition' ? 30000 : sub === 'oeffnen' ? 45000 : sub === 'duell' ? 60000 : 5000;
    if (cooldowns.has(cdKey) && now - cooldowns.get(cdKey) < cdTime) {
      const left = Math.ceil((cdTime - (now - cooldowns.get(cdKey))) / 1000);
      return interaction.reply({ content: `⏳ Cooldown: **${left}s**`, ephemeral: true });
    }
    cooldowns.set(cdKey, now);

    let park = db.db.prepare('SELECT * FROM dino_parks WHERE user_id = ?').get(userId);
    if (!park && sub !== 'status') {
      db.db.prepare('INSERT INTO dino_parks (user_id) VALUES (?)').run(userId);
      park = db.db.prepare('SELECT * FROM dino_parks WHERE user_id = ?').get(userId);
    }

    if (sub === 'status') {
      if (!park) {
        db.db.prepare('INSERT INTO dino_parks (user_id) VALUES (?)').run(userId);
        park = db.db.prepare('SELECT * FROM dino_parks WHERE user_id = ?').get(userId);
      }
      const rank = getRank(park.level);
      const xpNeeded = xpForLevel(park.level);
      const bal = (db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId))?.balance || 0;
      const dinoCount = db.db.prepare('SELECT COUNT(*) as c FROM park_dinos WHERE user_id = ?').get(userId).c;
      const totalAttraktion = db.db.prepare('SELECT COALESCE(SUM(attraktion), 0) as s FROM park_dinos WHERE user_id = ?').get(userId).s;

      const embed = new EmbedBuilder()
        .setTitle(`🦕 ${park.name}`)
        .setColor('#795548')
        .addFields(
          { name: '📊 Rang', value: `${rank.name} (Lv. ${park.level})`, inline: true },
          { name: '⭐ XP', value: `${park.xp}/${xpNeeded}`, inline: true },
          { name: '💰 Coins', value: bal.toLocaleString(), inline: true },
          { name: '🧬 DNA', value: `${park.dna_fragmente}`, inline: true },
          { name: '🦖 Dinos', value: `${dinoCount}`, inline: true },
          { name: '🎪 Attraktion', value: `${totalAttraktion}`, inline: true },
          { name: '⭐ Ruf', value: `${park.ruf}`, inline: true },
          { name: '🎫 Ticket', value: `${park.ticketpreis} Coins`, inline: true },
          { name: '👥 Besucher', value: `${park.besucher_total}`, inline: true },
          { name: '🔬 Skills', value: `Forschung: ${park.forschung} | Sicherheit: ${park.sicherheit}\nPflege: ${park.pflege} | Genetik: ${park.genetik}`, inline: false },
          { name: '🔧 Upgrades', value: `Zaun: Lv.${park.upgrade_zaun} | Labor: Lv.${park.upgrade_labor}\nEingang: Lv.${park.upgrade_eingang} | Futter: Lv.${park.upgrade_futterstation}`, inline: false }
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'umbenennen') {
      const name = interaction.options.getString('name').substring(0, 32);
      db.db.prepare('UPDATE dino_parks SET name = ? WHERE user_id = ?').run(name, userId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor('#795548').setDescription(`🦕 Dein Park heißt jetzt **${name}**!`)] });
    }

    if (sub === 'expedition') {
      const ortIdx = interaction.options.getInteger('ort') - 1;
      if (ortIdx < 0 || ortIdx >= EXPEDITIONEN.length) {
        return interaction.reply({ content: `❌ Ungültige Expedition! Wähle 1-${EXPEDITIONEN.length}.`, ephemeral: true });
      }
      const exp = EXPEDITIONEN[ortIdx];
      if (park.level < exp.minLevel) {
        return interaction.reply({ content: `❌ Du brauchst Level ${exp.minLevel} für ${exp.name}!`, ephemeral: true });
      }
      const bal = (db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId))?.balance || 0;
      if (bal < exp.cost) {
        return interaction.reply({ content: `❌ Expedition kostet **${exp.cost}** Coins!`, ephemeral: true });
      }

      db.db.prepare('UPDATE economy SET balance = balance - ? WHERE user_id = ?').run(exp.cost, userId);

      const event = EXPEDITION_EVENTS[rand(0, EXPEDITION_EVENTS.length - 1)];
      const rollBase = rand(1, 20) + park.forschung + park.upgrade_labor * 2 + event.modifier;
      const success = rollBase >= 10;

      let dnaGain = 0;
      if (event.dna) dnaGain = rand(3, 8);

      if (!success) {
        db.db.prepare('UPDATE dino_parks SET dna_fragmente = dna_fragmente + ? WHERE user_id = ?').run(dnaGain, userId);
        const embed = new EmbedBuilder()
          .setTitle(`${exp.emoji} Expedition: ${exp.name}`)
          .setColor('#f44336')
          .setDescription(`${event.text}\n\n❌ Keine brauchbaren Fossilien gefunden.`)
          .addFields({ name: '💰 Kosten', value: `${exp.cost} Coins` });
        if (dnaGain > 0) embed.addFields({ name: '🧬 DNA', value: `+${dnaGain} Fragmente` });
        return interaction.reply({ embeds: [embed] });
      }

      const dinoIdx = rand(exp.dinoRange[0], exp.dinoRange[1]);
      const dinoArt = DINO_ARTEN[dinoIdx];
      const staerke = rand(dinoArt.staerke[0], dinoArt.staerke[1]) + Math.floor(park.genetik * 1.5);
      const attraktion = dinoArt.attraktion + rand(-3, 5);

      db.db.prepare('INSERT INTO park_dinos (user_id, art, name, staerke, attraktion, seltenheit) VALUES (?, ?, ?, ?, ?, ?)').run(userId, dinoArt.name, dinoArt.name, staerke, attraktion, dinoArt.seltenheit);
      db.db.prepare('UPDATE dino_parks SET dna_fragmente = dna_fragmente + ? WHERE user_id = ?').run(dnaGain, userId);

      let xpGain = Math.floor(15 + staerke * 0.5);
      let newXp = park.xp + xpGain;
      let newLevel = park.level;
      let leveledUp = false;
      while (newXp >= xpForLevel(newLevel)) { newXp -= xpForLevel(newLevel); newLevel++; leveledUp = true; }
      db.db.prepare('UPDATE dino_parks SET xp = ?, level = ? WHERE user_id = ?').run(newXp, newLevel, userId);

      const embed = new EmbedBuilder()
        .setTitle(`${exp.emoji} Expedition: ${exp.name}`)
        .setColor(RARITY_COLORS[dinoArt.seltenheit] || '#795548')
        .setDescription(`${event.text}\n\n🎉 Dinosaurier entdeckt und geklont!`)
        .addFields(
          { name: '🦖 Dinosaurier', value: `${dinoArt.emoji} **${dinoArt.name}**`, inline: true },
          { name: '💪 Stärke', value: `${staerke}`, inline: true },
          { name: '⭐ Seltenheit', value: dinoArt.seltenheit, inline: true },
          { name: '🎪 Attraktion', value: `+${attraktion}`, inline: true },
          { name: '⭐ XP', value: `+${xpGain}`, inline: true },
          { name: '💰 Kosten', value: `${exp.cost} Coins`, inline: true }
        );
      if (dnaGain > 0) embed.addFields({ name: '🧬 DNA', value: `+${dnaGain} Fragmente` });
      if (leveledUp) embed.addFields({ name: '🎉 Level Up!', value: `Level ${newLevel}! Rang: ${getRank(newLevel).name}` });
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'dinos') {
      const dinos = db.db.prepare('SELECT * FROM park_dinos WHERE user_id = ? ORDER BY staerke DESC LIMIT 15').all(userId);
      if (dinos.length === 0) {
        return interaction.reply({ content: '🦕 Noch keine Dinos! Starte eine Expedition.', ephemeral: true });
      }
      const total = db.db.prepare('SELECT COUNT(*) as c FROM park_dinos WHERE user_id = ?').get(userId).c;
      const lines = dinos.map(d => {
        const art = DINO_ARTEN.find(a => a.name === d.art);
        return `**#${d.id}** ${art?.emoji || '🦖'} ${d.name} — Stärke: ${d.staerke} | HP: ${d.gesundheit}% | ${d.seltenheit}`;
      }).join('\n');
      return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🦖 Deine Dinosaurier').setColor('#795548').setDescription(lines).setFooter({ text: `${total} Dinos insgesamt` })] });
    }

    if (sub === 'benennen') {
      const dinoId = interaction.options.getInteger('id');
      const name = interaction.options.getString('name').substring(0, 25);
      const dino = db.db.prepare('SELECT * FROM park_dinos WHERE id = ? AND user_id = ?').get(dinoId, userId);
      if (!dino) return interaction.reply({ content: '❌ Dino nicht gefunden!', ephemeral: true });
      db.db.prepare('UPDATE park_dinos SET name = ? WHERE id = ?').run(name, dinoId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor('#795548').setDescription(`🦖 Dein Dino heißt jetzt **${name}**!`)] });
    }

    if (sub === 'oeffnen') {
      const dinos = db.db.prepare('SELECT * FROM park_dinos WHERE user_id = ?').all(userId);
      if (dinos.length === 0) {
        return interaction.reply({ content: '❌ Du brauchst mindestens einen Dino!', ephemeral: true });
      }

      const totalAttraktion = dinos.reduce((s, d) => s + d.attraktion, 0);
      const avgZufriedenheit = dinos.reduce((s, d) => s + d.zufriedenheit, 0) / dinos.length;
      const eingangBonus = 1 + park.upgrade_eingang * 0.15;
      const rufMod = 1 + park.ruf * 0.01;

      const event = PARK_EVENTS[rand(0, PARK_EVENTS.length - 1)];
      const baseBesucher = Math.floor((totalAttraktion * 0.8 + park.ruf * 2) * eingangBonus * rufMod * event.bonus);
      const besucher = Math.max(5, baseBesucher + rand(-10, 15));

      const demandFactor = Math.max(0.3, 1 - (park.ticketpreis - 50) * 0.003);
      const einnahmen = Math.floor(besucher * park.ticketpreis * demandFactor * (avgZufriedenheit / 80));

      let rufGain = Math.floor(besucher / 20) + (event.ruf || 0);
      const sicherheitsRoll = rand(1, 20) + park.sicherheit + park.upgrade_zaun * 3;
      let ausbruch = sicherheitsRoll < 8;
      if (ausbruch) {
        rufGain = Math.max(0, rufGain - 3);
      }

      const xpGain = Math.floor(besucher * 0.3 + 10);
      let newXp = park.xp + xpGain;
      let newLevel = park.level;
      let leveledUp = false;
      while (newXp >= xpForLevel(newLevel)) { newXp -= xpForLevel(newLevel); newLevel++; leveledUp = true; }

      db.db.prepare('UPDATE dino_parks SET xp = ?, level = ?, besucher_total = besucher_total + ?, ruf = ruf + ? WHERE user_id = ?').run(newXp, newLevel, besucher, rufGain, userId);
      db.db.prepare('UPDATE economy SET balance = balance + ? WHERE user_id = ?').run(einnahmen, userId);

      const embed = new EmbedBuilder()
        .setTitle(`🎪 Park geöffnet!`)
        .setColor(event.bonus >= 1 ? '#4caf50' : '#ff9800')
        .setDescription(event.text)
        .addFields(
          { name: '👥 Besucher', value: `${besucher}`, inline: true },
          { name: '🎫 Ticketpreis', value: `${park.ticketpreis} Coins`, inline: true },
          { name: '💰 Einnahmen', value: `**${einnahmen.toLocaleString()}** Coins`, inline: true },
          { name: '⭐ Ruf', value: `+${rufGain}`, inline: true },
          { name: '⭐ XP', value: `+${xpGain}`, inline: true }
        );
      if (ausbruch) embed.addFields({ name: '⚠️ Ausbruch!', value: 'Ein Dino ist kurz ausgebrochen! Verbessere deine Zäune!' });
      if (leveledUp) embed.addFields({ name: '🎉 Level Up!', value: `Level ${newLevel}! Rang: ${getRank(newLevel).name}` });
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'ticketpreis') {
      const preis = interaction.options.getInteger('preis');
      if (preis < 10 || preis > 500) {
        return interaction.reply({ content: '❌ Ticketpreis muss zwischen 10 und 500 Coins liegen!', ephemeral: true });
      }
      db.db.prepare('UPDATE dino_parks SET ticketpreis = ? WHERE user_id = ?').run(preis, userId);
      const demand = Math.max(30, Math.floor(100 - (preis - 50) * 0.3));
      return interaction.reply({ embeds: [new EmbedBuilder().setColor('#795548').setDescription(`🎫 Ticketpreis auf **${preis} Coins** gesetzt!\n📊 Geschätzte Nachfrage: ${demand}%`)] });
    }

    if (sub === 'upgrade') {
      const item = interaction.options.getString('item').toLowerCase();
      const upg = UPGRADES[item];
      if (!upg) {
        return interaction.reply({ content: '❌ Wähle: `zaun`, `labor`, `eingang` oder `futterstation`', ephemeral: true });
      }
      const currentLv = park[upg.field];
      if (currentLv >= upg.costs.length) {
        return interaction.reply({ content: `❌ ${upg.name} ist bereits auf Max-Level!`, ephemeral: true });
      }
      const cost = upg.costs[currentLv];
      const bal = (db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId))?.balance || 0;
      if (bal < cost) {
        return interaction.reply({ content: `❌ Zu wenig Coins! Upgrade kostet **${cost.toLocaleString()}** Coins.`, ephemeral: true });
      }
      db.db.prepare(`UPDATE dino_parks SET ${upg.field} = ${upg.field} + 1 WHERE user_id = ?`).run(userId);
      db.db.prepare('UPDATE economy SET balance = balance - ? WHERE user_id = ?').run(cost, userId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor('#795548').setDescription(`🔧 **${upg.name}** auf Level ${currentLv + 1} verbessert!\n${upg.desc}\n💰 -${cost.toLocaleString()} Coins`)] });
    }

    if (sub === 'freilassen') {
      const dinoId = interaction.options.getInteger('id');
      const dino = db.db.prepare('SELECT * FROM park_dinos WHERE id = ? AND user_id = ?').get(dinoId, userId);
      if (!dino) return interaction.reply({ content: '❌ Dino nicht gefunden!', ephemeral: true });
      const art = DINO_ARTEN.find(a => a.name === dino.art);
      const dnaGain = Math.floor(dino.staerke / 5) + rand(1, 5);
      db.db.prepare('DELETE FROM park_dinos WHERE id = ?').run(dinoId);
      db.db.prepare('UPDATE dino_parks SET dna_fragmente = dna_fragmente + ? WHERE user_id = ?').run(dnaGain, userId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor('#ff9800').setDescription(`${art?.emoji || '🦖'} **${dino.name}** wurde freigelassen.\n🧬 +${dnaGain} DNA-Fragmente erhalten.`)] });
    }

    if (sub === 'duell') {
      const opponent = interaction.options.getUser('gegner');
      if (opponent.id === userId) return interaction.reply({ content: '❌ Du kannst nicht gegen dich selbst kämpfen!', ephemeral: true });
      if (opponent.bot) return interaction.reply({ content: '❌ Bots haben keine Dinos!', ephemeral: true });

      const oppPark = db.db.prepare('SELECT * FROM dino_parks WHERE user_id = ?').get(opponent.id);
      if (!oppPark) return interaction.reply({ content: '❌ Dein Gegner hat keinen Dino-Park!', ephemeral: true });

      const myBest = db.db.prepare('SELECT * FROM park_dinos WHERE user_id = ? ORDER BY staerke DESC LIMIT 1').get(userId);
      const oppBest = db.db.prepare('SELECT * FROM park_dinos WHERE user_id = ? ORDER BY staerke DESC LIMIT 1').get(opponent.id);

      if (!myBest) return interaction.reply({ content: '❌ Du hast keine Dinos!', ephemeral: true });
      if (!oppBest) return interaction.reply({ content: '❌ Dein Gegner hat keine Dinos!', ephemeral: true });

      const myPower = myBest.staerke + park.level * 3 + rand(1, 20);
      const oppPower = oppBest.staerke + oppPark.level * 3 + rand(1, 20);
      const won = myPower > oppPower;
      const coinPrize = Math.floor((park.level + oppPark.level) * 25 + rand(50, 200));

      if (won) {
        db.db.prepare('UPDATE economy SET balance = balance + ? WHERE user_id = ?').run(coinPrize, userId);
        db.db.prepare('UPDATE dino_parks SET ruf = ruf + 2 WHERE user_id = ?').run(userId);
      }

      const myArt = DINO_ARTEN.find(a => a.name === myBest.art);
      const oppArt = DINO_ARTEN.find(a => a.name === oppBest.art);

      const embed = new EmbedBuilder()
        .setTitle('⚔️ Dino-Kampf!')
        .setColor(won ? '#4caf50' : '#f44336')
        .setDescription(`${myArt?.emoji || '🦖'} **${myBest.name}** vs ${oppArt?.emoji || '🦖'} **${oppBest.name}**`)
        .addFields(
          { name: park.name, value: `💪 Kampfkraft: ${myPower}`, inline: true },
          { name: oppPark.name, value: `💪 Kampfkraft: ${oppPower}`, inline: true },
          { name: '🏆 Ergebnis', value: won ? `**${park.name}** gewinnt!\n💰 +${coinPrize} Coins | ⭐ +2 Ruf` : `**${oppPark.name}** gewinnt!\nTrainiere deine Dinos!` }
        );
      return interaction.reply({ embeds: [embed] });
    }
  }
};
