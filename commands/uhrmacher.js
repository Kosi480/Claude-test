const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

const cooldowns = new Map();

const BAUTEILE = [
  { name: 'Zahnrad', preis: 80, emoji: '⚙️' },
  { name: 'Feder', preis: 150, emoji: '🔩' },
  { name: 'Zeiger', preis: 120, emoji: '🕐' },
  { name: 'Gehaeuse', preis: 200, emoji: '📦' },
  { name: 'Kristall', preis: 500, emoji: '💎' },
  { name: 'Rubin', preis: 800, emoji: '🔴' },
  { name: 'Mondstein', preis: 1500, emoji: '🌙' },
  { name: 'Aetherkern', preis: 3000, emoji: '✨' },
];

const UHREN_REZEPTE = [
  { name: 'Taschenuhr', minLevel: 1, bauteile: { zahnrad: 3, feder: 2, zeiger: 1, gehaeuse: 1 }, wert: 500, xp: 15 },
  { name: 'Wanduhr', minLevel: 2, bauteile: { zahnrad: 5, feder: 3, zeiger: 2, gehaeuse: 2 }, wert: 1200, xp: 25 },
  { name: 'Kuckucksuhr', minLevel: 3, bauteile: { zahnrad: 8, feder: 4, zeiger: 2, gehaeuse: 3 }, wert: 2500, xp: 40 },
  { name: 'Astronomische Uhr', minLevel: 4, bauteile: { zahnrad: 10, feder: 5, zeiger: 4, gehaeuse: 2, kristall: 2 }, wert: 5000, xp: 60 },
  { name: 'Schiffschronometer', minLevel: 5, bauteile: { zahnrad: 12, feder: 6, zeiger: 3, gehaeuse: 3, kristall: 3, rubin: 2 }, wert: 9000, xp: 85 },
  { name: 'Tourbillon', minLevel: 7, bauteile: { zahnrad: 15, feder: 8, zeiger: 4, gehaeuse: 3, kristall: 4, rubin: 4 }, wert: 16000, xp: 120 },
  { name: 'Ewiger Kalender', minLevel: 9, bauteile: { zahnrad: 20, feder: 10, zeiger: 6, gehaeuse: 4, kristall: 5, rubin: 5, mondstein: 3 }, wert: 30000, xp: 180 },
  { name: 'Zeitmaschinen-Chronograph', minLevel: 12, bauteile: { zahnrad: 30, feder: 15, zeiger: 8, gehaeuse: 5, kristall: 8, rubin: 6, mondstein: 5, aetherkern: 3 }, wert: 75000, xp: 350 },
];

const WERKZEUGE = {
  lupe: [
    { name: 'Einfache Lupe', bonus: 0, preis: 0 },
    { name: 'Juwelierslupe', bonus: 5, preis: 3000 },
    { name: 'Mikroskop-Lupe', bonus: 12, preis: 12000 },
    { name: 'Quantenlinse', bonus: 25, preis: 35000 },
  ],
  pinzette: [
    { name: 'Stahlpinzette', bonus: 0, preis: 0 },
    { name: 'Titanpinzette', bonus: 4, preis: 2500 },
    { name: 'Anti-Magnet-Pinzette', bonus: 10, preis: 10000 },
    { name: 'Nano-Greifer', bonus: 22, preis: 30000 },
  ],
  werkbank: [
    { name: 'Holztisch', bonus: 0, preis: 0 },
    { name: 'Uhrmacher-Werkbank', bonus: 5, preis: 4000 },
    { name: 'Präzisions-Atelier', bonus: 12, preis: 14000 },
    { name: 'Meisterwerkstatt', bonus: 25, preis: 40000 },
  ],
  oeler: [
    { name: 'Einfacher Öler', bonus: 0, preis: 0 },
    { name: 'Präzisions-Öler', bonus: 3, preis: 2000 },
    { name: 'Mikro-Öler', bonus: 8, preis: 8000 },
    { name: 'Nano-Schmierer', bonus: 18, preis: 25000 },
  ],
};

const QUALITAETS_STUFEN = [
  { name: 'Mangelhaft', minQ: 0, mult: 0.5 },
  { name: 'Ordentlich', minQ: 20, mult: 1.0 },
  { name: 'Gut', minQ: 40, mult: 1.5 },
  { name: 'Hervorragend', minQ: 60, mult: 2.0 },
  { name: 'Exzellent', minQ: 80, mult: 3.0 },
  { name: 'Meisterwerk', minQ: 95, mult: 5.0 },
];

const KUNDEN = [
  { name: 'Bürger', mult: 1.0 },
  { name: 'Händler', mult: 1.2 },
  { name: 'Navigator', mult: 1.3 },
  { name: 'Adliger', mult: 1.5 },
  { name: 'Sternwarte', mult: 1.4 },
  { name: 'Königshof', mult: 1.8 },
  { name: 'Sammler', mult: 1.6 },
  { name: 'Zeitmagier', mult: 2.0 },
];

const EREIGNISSE = [
  { text: 'Deine Hände sind heute besonders ruhig!', bonusMult: 1.5 },
  { text: 'Die Zahnräder greifen perfekt ineinander!', bonusMult: 1.4 },
  { text: 'Eine Feder bricht — Nacharbeit nötig!', bonusMult: 0.7 },
  { text: 'Du entdeckst eine geniale Mechanik!', bonusMult: 1.6 },
  { text: 'Ölfleck auf dem Zifferblatt!', bonusMult: 0.8 },
  { text: 'Perfekte Präzision bei der Kalibrierung!', bonusMult: 1.3 },
  { text: 'Ein alter Meister inspiriert dich!', bonusMult: 1.7 },
  { text: 'Routinearbeit ohne Zwischenfälle.', bonusMult: 1.0 },
  { text: 'Das Licht ist optimal zum Arbeiten.', bonusMult: 1.2 },
  { text: 'Staub in der Mechanik verursacht Probleme.', bonusMult: 0.75 },
];

const BAUTEIL_SPALTEN = {
  'zahnrad': 'zahnrad', 'feder': 'feder', 'zeiger': 'zeiger',
  'gehaeuse': 'gehaeuse', 'kristall': 'kristall', 'rubin': 'rubin',
  'mondstein': 'mondstein', 'aetherkern': 'aetherkern',
};

function ensureUhrmacherTable() {
  db.db.exec(`CREATE TABLE IF NOT EXISTS uhrmacher (
    user_id TEXT PRIMARY KEY,
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    praezision INTEGER DEFAULT 10,
    uhren_gesamt INTEGER DEFAULT 0,
    meisterwerke INTEGER DEFAULT 0,
    reparaturen INTEGER DEFAULT 0,
    lupe INTEGER DEFAULT 0,
    pinzette INTEGER DEFAULT 0,
    werkbank INTEGER DEFAULT 0,
    oeler INTEGER DEFAULT 0,
    zahnrad INTEGER DEFAULT 5,
    feder INTEGER DEFAULT 3,
    zeiger INTEGER DEFAULT 2,
    gehaeuse INTEGER DEFAULT 2,
    kristall INTEGER DEFAULT 0,
    rubin INTEGER DEFAULT 0,
    mondstein INTEGER DEFAULT 0,
    aetherkern INTEGER DEFAULT 0,
    ruf INTEGER DEFAULT 0,
    last_craft TEXT
  )`);
  db.db.exec(`CREATE TABLE IF NOT EXISTS uhren_vitrine (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    name TEXT,
    qualitaet_name TEXT,
    qualitaet INTEGER,
    wert INTEGER,
    erstellt_am TEXT DEFAULT (datetime('now'))
  )`);
}

function getUhrmacher(userId) {
  ensureUhrmacherTable();
  let u = db.db.prepare('SELECT * FROM uhrmacher WHERE user_id = ?').get(userId);
  if (!u) {
    db.db.prepare('INSERT INTO uhrmacher (user_id) VALUES (?)').run(userId);
    u = db.db.prepare('SELECT * FROM uhrmacher WHERE user_id = ?').get(userId);
  }
  return u;
}

function getXpForLevel(level) {
  return Math.floor(110 * Math.pow(1.5, level - 1));
}

function getWerkzeugBonus(u) {
  return WERKZEUGE.lupe[u.lupe].bonus +
    WERKZEUGE.pinzette[u.pinzette].bonus +
    WERKZEUGE.werkbank[u.werkbank].bonus +
    WERKZEUGE.oeler[u.oeler].bonus;
}

function getQualitaetsStufe(q) {
  let stufe = QUALITAETS_STUFEN[0];
  for (const s of QUALITAETS_STUFEN) {
    if (q >= s.minQ) stufe = s;
  }
  return stufe;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('uhrmacher')
    .setDescription('⏰ Werde Uhrmacher und baue präzise Zeitmesser!')
    .addSubcommand(s => s.setName('status').setDescription('Zeige dein Uhrmacher-Profil'))
    .addSubcommand(s => s.setName('bauteile').setDescription('Kaufe Bauteile')
      .addStringOption(o => o.setName('teil').setDescription('Bauteilname'))
      .addIntegerOption(o => o.setName('menge').setDescription('Menge')))
    .addSubcommand(s => s.setName('rezepte').setDescription('Zeige alle Uhren-Rezepte'))
    .addSubcommand(s => s.setName('bauen').setDescription('Baue eine Uhr')
      .addIntegerOption(o => o.setName('rezept').setDescription('Rezeptnummer (1-8)').setRequired(true)))
    .addSubcommand(s => s.setName('vitrine').setDescription('Zeige deine Uhren-Vitrine'))
    .addSubcommand(s => s.setName('verkaufen').setDescription('Verkaufe deine Uhren'))
    .addSubcommand(s => s.setName('reparieren').setDescription('Repariere eine Uhr für Belohnung'))
    .addSubcommand(s => s.setName('werkzeuge').setDescription('Upgrade deine Werkzeuge')
      .addStringOption(o => o.setName('typ').setDescription('lupe/pinzette/werkbank/oeler').setRequired(true))
      .addIntegerOption(o => o.setName('stufe').setDescription('Stufe (2-4)').setRequired(true)))
    .addSubcommand(s => s.setName('trainieren').setDescription('Trainiere deine Präzision')
      .addStringOption(o => o.setName('skill').setDescription('praezision').setRequired(true)))
    .addSubcommand(s => s.setName('wettbewerb').setDescription('PvP Uhrmacher-Duell')
      .addUserOption(o => o.setName('gegner').setDescription('Dein Gegner').setRequired(true))),

  async execute(interaction) {
    const config = require('../config.json');
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    switch (sub) {
      case 'status': return handleStatus(interaction, userId);
      case 'bauteile': return handleBauteile(interaction, userId);
      case 'rezepte': return handleRezepte(interaction, userId);
      case 'bauen': return handleBauen(interaction, userId);
      case 'vitrine': return handleVitrine(interaction, userId);
      case 'verkaufen': return handleVerkaufen(interaction, userId);
      case 'reparieren': return handleReparieren(interaction, userId);
      case 'werkzeuge': return handleWerkzeuge(interaction, userId);
      case 'trainieren': return handleTrainieren(interaction, userId);
      case 'wettbewerb': return handleWettbewerb(interaction, userId);
    }
  }
};

async function handleStatus(interaction, userId) {
  const u = getUhrmacher(userId);
  const xpNeeded = getXpForLevel(u.level);
  const bonus = getWerkzeugBonus(u);

  const embed = new EmbedBuilder()
    .setTitle('⏰ Uhrmacher-Profil')
    .setColor(0xB8860B)
    .addFields(
      { name: '📊 Level', value: `${u.level} (${u.xp}/${xpNeeded} XP)`, inline: true },
      { name: '🎯 Präzision', value: `${u.praezision + bonus}`, inline: true },
      { name: '⭐ Ruf', value: `${u.ruf}`, inline: true },
      { name: '⏰ Uhren gebaut', value: `${u.uhren_gesamt} (${u.meisterwerke} Meisterwerke)`, inline: true },
      { name: '🔧 Reparaturen', value: `${u.reparaturen}`, inline: true },
      { name: '🔨 Werkzeuge', value: [
        `Lupe: ${WERKZEUGE.lupe[u.lupe].name}`,
        `Pinzette: ${WERKZEUGE.pinzette[u.pinzette].name}`,
        `Werkbank: ${WERKZEUGE.werkbank[u.werkbank].name}`,
        `Öler: ${WERKZEUGE.oeler[u.oeler].name}`,
      ].join('\n') },
      { name: '📦 Bauteile', value: [
        `⚙️ Zahnräder: ${u.zahnrad} | 🔩 Federn: ${u.feder}`,
        `🕐 Zeiger: ${u.zeiger} | 📦 Gehäuse: ${u.gehaeuse}`,
        `💎 Kristalle: ${u.kristall} | 🔴 Rubine: ${u.rubin}`,
        `🌙 Mondsteine: ${u.mondstein} | ✨ Ätherkerne: ${u.aetherkern}`,
      ].join('\n') },
    );
  return interaction.reply({ embeds: [embed] });
}

async function handleBauteile(interaction, userId) {
  const u = getUhrmacher(userId);
  const teil = interaction.options.getString('teil');
  const menge = interaction.options.getInteger('menge') || 1;

  if (!teil) {
    const list = BAUTEILE.map((b, i) =>
      `${b.emoji} **${i + 1}. ${b.name}** — ${b.preis} 🪙/Stk`
    ).join('\n');

    const embed = new EmbedBuilder()
      .setTitle('📦 Bauteile')
      .setColor(0xB8860B)
      .setDescription(list);
    return interaction.reply({ embeds: [embed] });
  }

  const bauteil = BAUTEILE.find(b => b.name.toLowerCase() === teil.toLowerCase());
  if (!bauteil) {
    return interaction.reply({ content: '❌ Unbekanntes Bauteil! Nutze `/uhrmacher bauteile` für eine Liste.', ephemeral: true });
  }

  const kosten = bauteil.preis * menge;
  const balance = db.getBalance(userId);
  if (balance < kosten) {
    return interaction.reply({ content: `❌ Du brauchst ${kosten} 🪙 (hast: ${balance} 🪙).`, ephemeral: true });
  }

  const spalte = BAUTEIL_SPALTEN[bauteil.name.toLowerCase()];
  db.updateBalance(userId, -kosten);
  db.db.prepare(`UPDATE uhrmacher SET ${spalte} = ${spalte} + ? WHERE user_id = ?`).run(menge, userId);

  const embed = new EmbedBuilder()
    .setTitle('📦 Bauteile gekauft!')
    .setColor(0x00AA00)
    .setDescription(`${bauteil.emoji} **${menge}x ${bauteil.name}** für ${kosten} 🪙!`);
  return interaction.reply({ embeds: [embed] });
}

async function handleRezepte(interaction, userId) {
  const u = getUhrmacher(userId);

  const list = UHREN_REZEPTE.map((r, i) => {
    const unlocked = u.level >= r.minLevel;
    const teile = Object.entries(r.bauteile).map(([k, v]) => `${v}x ${k}`).join(', ');
    return `${unlocked ? '✅' : '🔒'} **${i + 1}. ${r.name}** — Lv.${r.minLevel} | ${r.wert} 🪙\n   Bauteile: ${teile}`;
  }).join('\n');

  const embed = new EmbedBuilder()
    .setTitle('📋 Uhren-Rezepte')
    .setColor(0xB8860B)
    .setDescription(list)
    .setFooter({ text: `Dein Level: ${u.level}` });
  return interaction.reply({ embeds: [embed] });
}

async function handleBauen(interaction, userId) {
  const cd = cooldowns.get(`build_${userId}`);
  if (cd && Date.now() - cd < 60000) {
    const rest = Math.ceil((60000 - (Date.now() - cd)) / 1000);
    return interaction.reply({ content: `⏳ Du kannst in ${rest}s wieder bauen.`, ephemeral: true });
  }

  const u = getUhrmacher(userId);
  const rezeptNr = interaction.options.getInteger('rezept');

  if (rezeptNr < 1 || rezeptNr > UHREN_REZEPTE.length) {
    return interaction.reply({ content: `❌ Ungültiges Rezept! Wähle 1-${UHREN_REZEPTE.length}.`, ephemeral: true });
  }

  const rezept = UHREN_REZEPTE[rezeptNr - 1];
  if (u.level < rezept.minLevel) {
    return interaction.reply({ content: `🔒 Du brauchst Level ${rezept.minLevel} für ${rezept.name}!`, ephemeral: true });
  }

  for (const [teil, bedarf] of Object.entries(rezept.bauteile)) {
    if (u[teil] < bedarf) {
      return interaction.reply({ content: `❌ Du brauchst ${bedarf}x ${teil} (hast: ${u[teil]}).`, ephemeral: true });
    }
  }

  cooldowns.set(`build_${userId}`, Date.now());

  for (const [teil, bedarf] of Object.entries(rezept.bauteile)) {
    db.db.prepare(`UPDATE uhrmacher SET ${teil} = ${teil} - ? WHERE user_id = ?`).run(bedarf, userId);
  }

  const ereignis = EREIGNISSE[Math.floor(Math.random() * EREIGNISSE.length)];
  const bonus = getWerkzeugBonus(u);
  const gesamtSkill = u.praezision + bonus + u.level * 3;

  const qualitaet = Math.min(100, Math.floor((30 + gesamtSkill * 0.7) * ereignis.bonusMult));
  const qStufe = getQualitaetsStufe(qualitaet);
  const wert = Math.floor(rezept.wert * qStufe.mult);

  const istMeisterwerk = qualitaet >= 95;

  db.db.prepare('INSERT INTO uhren_vitrine (user_id, name, qualitaet_name, qualitaet, wert) VALUES (?, ?, ?, ?, ?)')
    .run(userId, rezept.name, qStufe.name, qualitaet, wert);

  const xpGewinn = Math.floor(rezept.xp * ereignis.bonusMult);
  db.db.prepare(`UPDATE uhrmacher SET xp = xp + ?, uhren_gesamt = uhren_gesamt + 1,
    meisterwerke = meisterwerke + ?, ruf = ruf + ? WHERE user_id = ?`)
    .run(xpGewinn, istMeisterwerk ? 1 : 0, Math.floor(qualitaet / 15) + 1, userId);

  const updated = getUhrmacher(userId);
  const xpNeeded = getXpForLevel(updated.level);
  let levelUpText = '';
  if (updated.xp >= xpNeeded) {
    db.db.prepare('UPDATE uhrmacher SET level = level + 1, xp = xp - ? WHERE user_id = ?').run(xpNeeded, userId);
    levelUpText = `\n🎉 **LEVEL UP!** Level ${updated.level + 1}!`;
  }

  const embed = new EmbedBuilder()
    .setTitle(`⏰ ${istMeisterwerk ? '⭐ MEISTERWERK! ⭐' : 'Uhr gebaut!'}`)
    .setColor(istMeisterwerk ? 0xFFD700 : 0xB8860B)
    .setDescription([
      `**${rezept.name}**`,
      `Qualität: ${qStufe.name} (${qualitaet}%)`,
      `\n💫 *${ereignis.text}*`,
      `\n💰 Wert: ${wert} 🪙 | 📊 +${xpGewinn} XP`,
      levelUpText,
    ].filter(Boolean).join('\n'));
  return interaction.reply({ embeds: [embed] });
}

async function handleVitrine(interaction, userId) {
  ensureUhrmacherTable();
  const uhren = db.db.prepare('SELECT * FROM uhren_vitrine WHERE user_id = ? ORDER BY wert DESC').all(userId);

  if (uhren.length === 0) {
    return interaction.reply({ content: '📭 Deine Vitrine ist leer! Baue deine erste Uhr.', ephemeral: true });
  }

  const list = uhren.slice(0, 12).map((u, i) =>
    `**${i + 1}.** ${u.name} — ${u.qualitaet_name} (${u.qualitaet}%) | ${u.wert} 🪙`
  ).join('\n');

  const gesamtWert = uhren.reduce((sum, u) => sum + u.wert, 0);

  const embed = new EmbedBuilder()
    .setTitle('🏛️ Uhren-Vitrine')
    .setColor(0xB8860B)
    .setDescription(list)
    .setFooter({ text: `${uhren.length} Uhren | Gesamtwert: ${gesamtWert} 🪙` });
  return interaction.reply({ embeds: [embed] });
}

async function handleVerkaufen(interaction, userId) {
  ensureUhrmacherTable();
  const uhren = db.db.prepare('SELECT * FROM uhren_vitrine WHERE user_id = ?').all(userId);

  if (uhren.length === 0) {
    return interaction.reply({ content: '❌ Du hast keine Uhren zum Verkaufen!', ephemeral: true });
  }

  const kunde = KUNDEN[Math.floor(Math.random() * KUNDEN.length)];
  let gesamtWert = 0;
  const verkauft = [];

  for (const u of uhren) {
    const preis = Math.floor(u.wert * kunde.mult);
    gesamtWert += preis;
    verkauft.push(`${u.name} (${u.qualitaet_name}) — ${preis} 🪙`);
  }

  db.updateBalance(userId, gesamtWert);
  db.db.prepare('DELETE FROM uhren_vitrine WHERE user_id = ?').run(userId);
  db.db.prepare('UPDATE uhrmacher SET ruf = ruf + ? WHERE user_id = ?').run(uhren.length * 2, userId);

  const embed = new EmbedBuilder()
    .setTitle('💰 Uhren verkauft!')
    .setColor(0xFFD700)
    .setDescription([
      `**Käufer:** ${kunde.name} (x${kunde.mult})`,
      '',
      verkauft.slice(0, 10).join('\n'),
      verkauft.length > 10 ? `...und ${verkauft.length - 10} weitere` : '',
      '',
      `**Gesamt: ${gesamtWert} 🪙**`,
    ].filter(Boolean).join('\n'));
  return interaction.reply({ embeds: [embed] });
}

async function handleReparieren(interaction, userId) {
  const cd = cooldowns.get(`repair_${userId}`);
  if (cd && Date.now() - cd < 60000) {
    const rest = Math.ceil((60000 - (Date.now() - cd)) / 1000);
    return interaction.reply({ content: `⏳ Nächste Reparatur in ${rest}s.`, ephemeral: true });
  }

  const u = getUhrmacher(userId);
  cooldowns.set(`repair_${userId}`, Date.now());

  const bonus = getWerkzeugBonus(u);
  const gesamtSkill = u.praezision + bonus;
  const erfolgChance = Math.min(0.9, 0.4 + (gesamtSkill / 150));
  const erfolg = Math.random() < erfolgChance;

  if (!erfolg) {
    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setTitle('🔧 Reparatur gescheitert')
        .setColor(0xCC0000)
        .setDescription('Die Uhr war zu komplex. Trainiere weiter!')
      ]
    });
  }

  const schwierigkeit = Math.min(u.level, 10);
  const belohnung = Math.floor((100 + schwierigkeit * 80) * (1 + u.level * 0.05));
  const xpGewinn = 10 + schwierigkeit * 3;

  db.updateBalance(userId, belohnung);
  db.db.prepare('UPDATE uhrmacher SET xp = xp + ?, reparaturen = reparaturen + 1, ruf = ruf + ? WHERE user_id = ?')
    .run(xpGewinn, Math.ceil(schwierigkeit / 2), userId);

  const embed = new EmbedBuilder()
    .setTitle('🔧 Reparatur abgeschlossen!')
    .setColor(0x00AA00)
    .setDescription(`Du hast eine Uhr erfolgreich repariert!\n💰 ${belohnung} 🪙 | 📊 +${xpGewinn} XP`);
  return interaction.reply({ embeds: [embed] });
}

async function handleWerkzeuge(interaction, userId) {
  const u = getUhrmacher(userId);
  const typ = interaction.options.getString('typ').toLowerCase();
  const stufe = interaction.options.getInteger('stufe');

  if (!WERKZEUGE[typ]) {
    return interaction.reply({ content: '❌ Ungültiger Typ! Wähle: lupe, pinzette, werkbank oder oeler.', ephemeral: true });
  }
  if (stufe < 2 || stufe > WERKZEUGE[typ].length) {
    return interaction.reply({ content: `❌ Ungültige Stufe! Wähle 2-${WERKZEUGE[typ].length}.`, ephemeral: true });
  }

  const idx = stufe - 1;
  if (u[typ] >= idx) {
    return interaction.reply({ content: '❌ Du hast bereits dieses oder ein besseres Werkzeug!', ephemeral: true });
  }
  if (u[typ] < idx - 1) {
    return interaction.reply({ content: '❌ Du musst zuerst die vorherige Stufe kaufen!', ephemeral: true });
  }

  const item = WERKZEUGE[typ][idx];
  const balance = db.getBalance(userId);
  if (balance < item.preis) {
    return interaction.reply({ content: `❌ Du brauchst ${item.preis} 🪙 (hast: ${balance} 🪙).`, ephemeral: true });
  }

  db.updateBalance(userId, -item.preis);
  db.db.prepare(`UPDATE uhrmacher SET ${typ} = ? WHERE user_id = ?`).run(idx, userId);

  const embed = new EmbedBuilder()
    .setTitle('🔨 Werkzeug aufgerüstet!')
    .setColor(0x00AA00)
    .setDescription(`**${item.name}** für ${item.preis} 🪙!\n+${item.bonus} Präzision`);
  return interaction.reply({ embeds: [embed] });
}

async function handleTrainieren(interaction, userId) {
  const skill = interaction.options.getString('skill').toLowerCase();
  if (skill !== 'praezision') {
    return interaction.reply({ content: '❌ Ungültiger Skill! Verfügbar: `praezision`', ephemeral: true });
  }

  const cd = cooldowns.get(`train_${userId}`);
  if (cd && Date.now() - cd < 60000) {
    const rest = Math.ceil((60000 - (Date.now() - cd)) / 1000);
    return interaction.reply({ content: `⏳ Du kannst in ${rest}s wieder trainieren.`, ephemeral: true });
  }

  const u = getUhrmacher(userId);
  const kosten = 300 + (u.level * 70);
  const balance = db.getBalance(userId);
  if (balance < kosten) {
    return interaction.reply({ content: `❌ Training kostet ${kosten} 🪙 (hast: ${balance} 🪙).`, ephemeral: true });
  }

  cooldowns.set(`train_${userId}`, Date.now());
  db.updateBalance(userId, -kosten);

  const gewinn = Math.floor(Math.random() * 3) + 1;
  const xpGewinn = 12 + Math.floor(Math.random() * 10);
  db.db.prepare('UPDATE uhrmacher SET praezision = praezision + ?, xp = xp + ? WHERE user_id = ?')
    .run(gewinn, xpGewinn, userId);

  const embed = new EmbedBuilder()
    .setTitle('🎯 Training abgeschlossen!')
    .setColor(0x3498DB)
    .setDescription(`Präzision +${gewinn}!\n📊 +${xpGewinn} XP | -${kosten} 🪙`);
  return interaction.reply({ embeds: [embed] });
}

async function handleWettbewerb(interaction, userId) {
  const gegner = interaction.options.getUser('gegner');
  if (gegner.id === userId) {
    return interaction.reply({ content: '❌ Du kannst nicht gegen dich selbst antreten!', ephemeral: true });
  }
  if (gegner.bot) {
    return interaction.reply({ content: '❌ Du kannst nicht gegen einen Bot antreten!', ephemeral: true });
  }

  const u1 = getUhrmacher(userId);
  const u2 = getUhrmacher(gegner.id);

  const skill1 = u1.praezision + getWerkzeugBonus(u1) + u1.level * 5;
  const skill2 = u2.praezision + getWerkzeugBonus(u2) + u2.level * 5;

  const score1 = skill1 + u1.uhren_gesamt * 2 + u1.reparaturen + Math.floor(Math.random() * 40);
  const score2 = skill2 + u2.uhren_gesamt * 2 + u2.reparaturen + Math.floor(Math.random() * 40);

  const gewinner = score1 >= score2 ? userId : gegner.id;
  const preis = 350 + Math.floor(Math.random() * 500);

  db.updateBalance(gewinner, preis);
  db.db.prepare('UPDATE uhrmacher SET ruf = ruf + 5, xp = xp + 15 WHERE user_id = ?').run(gewinner);

  const embed = new EmbedBuilder()
    .setTitle('🏆 Uhrmacher-Duell!')
    .setColor(0xFFD700)
    .setDescription([
      `**${interaction.user.username}:** ${score1} Punkte`,
      `**${gegner.username}:** ${score2} Punkte`,
      '',
      `🥇 **${gewinner === userId ? interaction.user.username : gegner.username}** gewinnt ${preis} 🪙 und +5 Ruf!`,
    ].join('\n'));
  return interaction.reply({ embeds: [embed] });
}
