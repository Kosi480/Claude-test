const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

const cooldowns = new Map();

const GLASARTEN = [
  { name: 'Klarglas', preis: 80, qualitaet: 2, spalte: 'klarglas', emoji: '🔲' },
  { name: 'Farbglas', preis: 200, qualitaet: 4, spalte: 'farbglas', emoji: '🟦' },
  { name: 'Bleiglas', preis: 400, qualitaet: 6, spalte: 'bleiglas', emoji: '⬜' },
  { name: 'Kristallglas', preis: 800, qualitaet: 10, spalte: 'kristallglas', emoji: '💎' },
  { name: 'Opalglas', preis: 1500, qualitaet: 15, spalte: 'opalglas', emoji: '🌈' },
  { name: 'Rubinglas', preis: 3000, qualitaet: 22, spalte: 'rubinglas', emoji: '🔴' },
  { name: 'Mondglas', preis: 6000, qualitaet: 30, spalte: 'mondglas', emoji: '🌙' },
  { name: 'Sternenglas', preis: 15000, qualitaet: 45, spalte: 'sternenglas', emoji: '✨' },
];

const OBJEKT_TYPEN = [
  { name: 'Trinkglas', schwierigkeit: 1, glasBedarf: 2, wertMult: 1.0, minLevel: 1 },
  { name: 'Vase', schwierigkeit: 2, glasBedarf: 3, wertMult: 1.3, minLevel: 1 },
  { name: 'Schale', schwierigkeit: 3, glasBedarf: 3, wertMult: 1.5, minLevel: 2 },
  { name: 'Skulptur', schwierigkeit: 4, glasBedarf: 4, wertMult: 2.0, minLevel: 3 },
  { name: 'Kronleuchter', schwierigkeit: 6, glasBedarf: 6, wertMult: 3.0, minLevel: 5 },
  { name: 'Kirchenfenster', schwierigkeit: 7, glasBedarf: 8, wertMult: 3.5, minLevel: 6 },
  { name: 'Glasorgel', schwierigkeit: 9, glasBedarf: 10, wertMult: 5.0, minLevel: 8 },
  { name: 'Kristallpalast-Modell', schwierigkeit: 12, glasBedarf: 15, wertMult: 8.0, minLevel: 11 },
];

const TECHNIKEN = [
  'Freigeblasen', 'Formgeblasen', 'Gedreht', 'Gezogen',
  'Geschliffen', 'Graviert', 'Emailliert', 'Venezianisch',
];

const UPGRADES = {
  ofen: [
    { name: 'Holzofen', bonus: 0, preis: 0 },
    { name: 'Gasofen', bonus: 5, preis: 4000 },
    { name: 'Elektroofen', bonus: 13, preis: 14000 },
    { name: 'Plasma-Schmelze', bonus: 27, preis: 40000 },
  ],
  pfeife: [
    { name: 'Eisenrohr', bonus: 0, preis: 0 },
    { name: 'Stahlpfeife', bonus: 4, preis: 3000 },
    { name: 'Titanpfeife', bonus: 11, preis: 11000 },
    { name: 'Mythril-Pfeife', bonus: 24, preis: 35000 },
  ],
  werkzeug: [
    { name: 'Zange & Schere', bonus: 0, preis: 0 },
    { name: 'Profi-Set', bonus: 4, preis: 2500 },
    { name: 'Meister-Werkzeuge', bonus: 10, preis: 9000 },
    { name: 'Enchanted Tools', bonus: 22, preis: 30000 },
  ],
  kuehlofen: [
    { name: 'Einfacher Kühler', bonus: 0, preis: 0 },
    { name: 'Kontrollierter Kühler', bonus: 3, preis: 2000 },
    { name: 'Präzisions-Temperer', bonus: 9, preis: 8000 },
    { name: 'Quanten-Kühler', bonus: 20, preis: 26000 },
  ],
};

const KUNDEN = [
  { name: 'Marktstand', mult: 1.0 },
  { name: 'Glasgeschäft', mult: 1.2 },
  { name: 'Innenarchitekt', mult: 1.3 },
  { name: 'Museum', mult: 1.4 },
  { name: 'Adliger', mult: 1.5 },
  { name: 'Kathedrale', mult: 1.6 },
  { name: 'Königspalast', mult: 1.8 },
  { name: 'Kunstauktion', mult: 2.0 },
];

const EREIGNISSE = [
  { text: 'Das Glas formt sich wie Butter in deinen Händen!', bonusMult: 1.5 },
  { text: 'Perfekte Ofentemperatur — ideale Viskosität!', bonusMult: 1.4 },
  { text: 'Ein Luftblaseneinschluss trübt das Ergebnis.', bonusMult: 0.7 },
  { text: 'Das Glas bekommt einen wunderschönen Farbverlauf!', bonusMult: 1.6 },
  { text: 'Zu schnell abgekühlt — feiner Riss!', bonusMult: 0.65 },
  { text: 'Die Flamme tanzt perfekt um das Werkstück!', bonusMult: 1.3 },
  { text: 'Ein alter Meister lobt deine Technik!', bonusMult: 1.7 },
  { text: 'Solide Arbeit ohne Besonderheiten.', bonusMult: 1.0 },
  { text: 'Das Licht bricht spektakulär im Glas!', bonusMult: 1.2 },
  { text: 'Die Hitze ist heute schwer zu kontrollieren.', bonusMult: 0.8 },
];

function ensureGlasbläserTable() {
  db.db.exec(`CREATE TABLE IF NOT EXISTS glasblaeser (
    user_id TEXT PRIMARY KEY,
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    fingerspitzengefuehl INTEGER DEFAULT 10,
    objekte_gesamt INTEGER DEFAULT 0,
    meisterwerke INTEGER DEFAULT 0,
    ofen INTEGER DEFAULT 0,
    pfeife INTEGER DEFAULT 0,
    werkzeug INTEGER DEFAULT 0,
    kuehlofen INTEGER DEFAULT 0,
    klarglas INTEGER DEFAULT 5,
    farbglas INTEGER DEFAULT 0,
    bleiglas INTEGER DEFAULT 0,
    kristallglas INTEGER DEFAULT 0,
    opalglas INTEGER DEFAULT 0,
    rubinglas INTEGER DEFAULT 0,
    mondglas INTEGER DEFAULT 0,
    sternenglas INTEGER DEFAULT 0,
    ruf INTEGER DEFAULT 0,
    last_blow TEXT
  )`);
  db.db.exec(`CREATE TABLE IF NOT EXISTS glas_vitrine (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    name TEXT,
    objekt_typ TEXT,
    glasart TEXT,
    technik TEXT,
    qualitaet INTEGER,
    wert INTEGER,
    erstellt_am TEXT DEFAULT (datetime('now'))
  )`);
}

function getGlasblaeser(userId) {
  ensureGlasbläserTable();
  let g = db.db.prepare('SELECT * FROM glasblaeser WHERE user_id = ?').get(userId);
  if (!g) {
    db.db.prepare('INSERT INTO glasblaeser (user_id) VALUES (?)').run(userId);
    g = db.db.prepare('SELECT * FROM glasblaeser WHERE user_id = ?').get(userId);
  }
  return g;
}

function getXpForLevel(level) {
  return Math.floor(110 * Math.pow(1.5, level - 1));
}

function getUpgradeBonus(g) {
  return UPGRADES.ofen[g.ofen].bonus +
    UPGRADES.pfeife[g.pfeife].bonus +
    UPGRADES.werkzeug[g.werkzeug].bonus +
    UPGRADES.kuehlofen[g.kuehlofen].bonus;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('glasblaeser')
    .setDescription('🔥 Werde Glasbläser und forme Kunstwerke aus Glas!')
    .addSubcommand(s => s.setName('status').setDescription('Zeige dein Glasbläser-Profil'))
    .addSubcommand(s => s.setName('glasarten').setDescription('Kaufe Glasmaterialien')
      .addStringOption(o => o.setName('glas').setDescription('Glasart'))
      .addIntegerOption(o => o.setName('menge').setDescription('Menge')))
    .addSubcommand(s => s.setName('rezepte').setDescription('Zeige alle Glasobjekte'))
    .addSubcommand(s => s.setName('blasen').setDescription('Blase ein Glasobjekt')
      .addIntegerOption(o => o.setName('objekt').setDescription('Objekttyp (1-8)').setRequired(true))
      .addIntegerOption(o => o.setName('glas').setDescription('Glasart (1-8)').setRequired(true)))
    .addSubcommand(s => s.setName('vitrine').setDescription('Zeige deine Glasvitrine'))
    .addSubcommand(s => s.setName('verkaufen').setDescription('Verkaufe deine Glasobjekte'))
    .addSubcommand(s => s.setName('upgrade').setDescription('Verbessere deine Werkstatt')
      .addStringOption(o => o.setName('typ').setDescription('ofen/pfeife/werkzeug/kuehlofen').setRequired(true))
      .addIntegerOption(o => o.setName('stufe').setDescription('Stufe (2-4)').setRequired(true)))
    .addSubcommand(s => s.setName('trainieren').setDescription('Trainiere dein Fingerspitzengefühl')
      .addStringOption(o => o.setName('skill').setDescription('fingerspitzengefuehl').setRequired(true)))
    .addSubcommand(s => s.setName('auftrag').setDescription('Nimm einen Glaskunst-Auftrag an'))
    .addSubcommand(s => s.setName('wettbewerb').setDescription('PvP Glasbläser-Duell')
      .addUserOption(o => o.setName('gegner').setDescription('Dein Gegner').setRequired(true))),

  async execute(interaction) {
    const config = require('../config.json');
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    switch (sub) {
      case 'status': return handleStatus(interaction, userId);
      case 'glasarten': return handleGlasarten(interaction, userId);
      case 'rezepte': return handleRezepte(interaction, userId);
      case 'blasen': return handleBlasen(interaction, userId);
      case 'vitrine': return handleVitrine(interaction, userId);
      case 'verkaufen': return handleVerkaufen(interaction, userId);
      case 'upgrade': return handleUpgrade(interaction, userId);
      case 'trainieren': return handleTrainieren(interaction, userId);
      case 'auftrag': return handleAuftrag(interaction, userId);
      case 'wettbewerb': return handleWettbewerb(interaction, userId);
    }
  }
};

async function handleStatus(interaction, userId) {
  const g = getGlasblaeser(userId);
  const xpNeeded = getXpForLevel(g.level);
  const bonus = getUpgradeBonus(g);

  const embed = new EmbedBuilder()
    .setTitle('🔥 Glasbläser-Profil')
    .setColor(0xFF6347)
    .addFields(
      { name: '📊 Level', value: `${g.level} (${g.xp}/${xpNeeded} XP)`, inline: true },
      { name: '🎯 Fingerspitzengefühl', value: `${g.fingerspitzengefuehl + bonus}`, inline: true },
      { name: '⭐ Ruf', value: `${g.ruf}`, inline: true },
      { name: '🏺 Objekte', value: `${g.objekte_gesamt} (${g.meisterwerke} Meisterwerke)`, inline: true },
      { name: '⚙️ Werkstatt', value: [
        `Ofen: ${UPGRADES.ofen[g.ofen].name}`,
        `Pfeife: ${UPGRADES.pfeife[g.pfeife].name}`,
        `Werkzeug: ${UPGRADES.werkzeug[g.werkzeug].name}`,
        `Kühlofen: ${UPGRADES.kuehlofen[g.kuehlofen].name}`,
      ].join('\n') },
      { name: '🧊 Glasvorrat', value: [
        `🔲 Klar: ${g.klarglas} | 🟦 Farb: ${g.farbglas} | ⬜ Blei: ${g.bleiglas}`,
        `💎 Kristall: ${g.kristallglas} | 🌈 Opal: ${g.opalglas} | 🔴 Rubin: ${g.rubinglas}`,
        `🌙 Mond: ${g.mondglas} | ✨ Sternen: ${g.sternenglas}`,
      ].join('\n') },
    );
  return interaction.reply({ embeds: [embed] });
}

async function handleGlasarten(interaction, userId) {
  const g = getGlasblaeser(userId);
  const glasName = interaction.options.getString('glas');
  const menge = interaction.options.getInteger('menge') || 1;

  if (!glasName) {
    const list = GLASARTEN.map((gl, i) =>
      `${gl.emoji} **${i + 1}. ${gl.name}** — ${gl.preis} 🪙 | Qualität: ${gl.qualitaet}`
    ).join('\n');

    const embed = new EmbedBuilder()
      .setTitle('🧊 Glasarten')
      .setColor(0xFF6347)
      .setDescription(list);
    return interaction.reply({ embeds: [embed] });
  }

  const glas = GLASARTEN.find(gl => gl.name.toLowerCase() === glasName.toLowerCase());
  if (!glas) {
    return interaction.reply({ content: '❌ Unbekannte Glasart!', ephemeral: true });
  }

  const kosten = glas.preis * menge;
  const balance = db.getBalance(userId);
  if (balance < kosten) {
    return interaction.reply({ content: `❌ Du brauchst ${kosten} 🪙 (hast: ${balance} 🪙).`, ephemeral: true });
  }

  db.updateBalance(userId, -kosten);
  db.db.prepare(`UPDATE glasblaeser SET ${glas.spalte} = ${glas.spalte} + ? WHERE user_id = ?`).run(menge, userId);

  const embed = new EmbedBuilder()
    .setTitle('🧊 Glas gekauft!')
    .setColor(0x00AA00)
    .setDescription(`${glas.emoji} **${menge}x ${glas.name}** für ${kosten} 🪙!`);
  return interaction.reply({ embeds: [embed] });
}

async function handleRezepte(interaction, userId) {
  const g = getGlasblaeser(userId);

  const list = OBJEKT_TYPEN.map((o, i) => {
    const unlocked = g.level >= o.minLevel;
    return `${unlocked ? '✅' : '🔒'} **${i + 1}. ${o.name}** — Lv.${o.minLevel} | ${o.glasBedarf} Glas | x${o.wertMult}`;
  }).join('\n');

  const embed = new EmbedBuilder()
    .setTitle('📋 Glasobjekte')
    .setColor(0xFF6347)
    .setDescription(list)
    .setFooter({ text: `Dein Level: ${g.level}` });
  return interaction.reply({ embeds: [embed] });
}

async function handleBlasen(interaction, userId) {
  const cd = cooldowns.get(`blow_${userId}`);
  if (cd && Date.now() - cd < 50000) {
    const rest = Math.ceil((50000 - (Date.now() - cd)) / 1000);
    return interaction.reply({ content: `⏳ Du kannst in ${rest}s wieder blasen.`, ephemeral: true });
  }

  const g = getGlasblaeser(userId);
  const objektNr = interaction.options.getInteger('objekt');
  const glasNr = interaction.options.getInteger('glas');

  if (objektNr < 1 || objektNr > OBJEKT_TYPEN.length) {
    return interaction.reply({ content: `❌ Ungültiges Objekt! Wähle 1-${OBJEKT_TYPEN.length}.`, ephemeral: true });
  }
  if (glasNr < 1 || glasNr > GLASARTEN.length) {
    return interaction.reply({ content: `❌ Ungültige Glasart! Wähle 1-${GLASARTEN.length}.`, ephemeral: true });
  }

  const objekt = OBJEKT_TYPEN[objektNr - 1];
  const glas = GLASARTEN[glasNr - 1];

  if (g.level < objekt.minLevel) {
    return interaction.reply({ content: `🔒 Du brauchst Level ${objekt.minLevel} für ${objekt.name}!`, ephemeral: true });
  }

  if (g[glas.spalte] < objekt.glasBedarf) {
    return interaction.reply({ content: `❌ Du brauchst ${objekt.glasBedarf}x ${glas.name} (hast: ${g[glas.spalte]}).`, ephemeral: true });
  }

  cooldowns.set(`blow_${userId}`, Date.now());

  db.db.prepare(`UPDATE glasblaeser SET ${glas.spalte} = ${glas.spalte} - ? WHERE user_id = ?`).run(objekt.glasBedarf, userId);

  const ereignis = EREIGNISSE[Math.floor(Math.random() * EREIGNISSE.length)];
  const technik = TECHNIKEN[Math.floor(Math.random() * TECHNIKEN.length)];
  const bonus = getUpgradeBonus(g);
  const gesamtSkill = g.fingerspitzengefuehl + bonus + g.level * 3;

  const basisQ = glas.qualitaet * objekt.wertMult;
  const qualitaet = Math.floor(basisQ * (0.6 + gesamtSkill / 80) * ereignis.bonusMult);
  const wert = Math.floor(qualitaet * 40 * objekt.wertMult);

  const istMeisterwerk = qualitaet > 50 && Math.random() < 0.1;
  const endWert = istMeisterwerk ? wert * 3 : wert;
  const objektName = `${technik}e ${glas.name}-${objekt.name}`;

  db.db.prepare('INSERT INTO glas_vitrine (user_id, name, objekt_typ, glasart, technik, qualitaet, wert) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(userId, objektName, objekt.name, glas.name, technik, qualitaet, endWert);

  const xpGewinn = Math.floor((8 + objekt.schwierigkeit * 5) * ereignis.bonusMult);
  db.db.prepare(`UPDATE glasblaeser SET xp = xp + ?, objekte_gesamt = objekte_gesamt + 1,
    meisterwerke = meisterwerke + ?, ruf = ruf + ? WHERE user_id = ?`)
    .run(xpGewinn, istMeisterwerk ? 1 : 0, Math.floor(qualitaet / 10) + 1, userId);

  const updated = getGlasblaeser(userId);
  const xpNeeded = getXpForLevel(updated.level);
  let levelUpText = '';
  if (updated.xp >= xpNeeded) {
    db.db.prepare('UPDATE glasblaeser SET level = level + 1, xp = xp - ? WHERE user_id = ?').run(xpNeeded, userId);
    levelUpText = `\n🎉 **LEVEL UP!** Level ${updated.level + 1}!`;
  }

  const embed = new EmbedBuilder()
    .setTitle(`🔥 ${istMeisterwerk ? '⭐ MEISTERWERK! ⭐' : 'Glasobjekt erschaffen!'}`)
    .setColor(istMeisterwerk ? 0xFFD700 : 0xFF6347)
    .setDescription([
      `**${objektName}**`,
      `${glas.emoji} ${glas.name} | Technik: ${technik}`,
      `\n💫 *${ereignis.text}*`,
      `\n⭐ Qualität: ${qualitaet} | 💰 Wert: ${endWert} 🪙`,
      `📊 +${xpGewinn} XP | Verbraucht: ${objekt.glasBedarf}x ${glas.name}`,
      levelUpText,
    ].filter(Boolean).join('\n'));
  return interaction.reply({ embeds: [embed] });
}

async function handleVitrine(interaction, userId) {
  ensureGlasbläserTable();
  const objekte = db.db.prepare('SELECT * FROM glas_vitrine WHERE user_id = ? ORDER BY wert DESC').all(userId);

  if (objekte.length === 0) {
    return interaction.reply({ content: '📭 Deine Vitrine ist leer! Blase dein erstes Glasobjekt.', ephemeral: true });
  }

  const list = objekte.slice(0, 12).map((o, i) =>
    `**${i + 1}.** ${o.name} — Q:${o.qualitaet} | ${o.wert} 🪙`
  ).join('\n');

  const gesamtWert = objekte.reduce((sum, o) => sum + o.wert, 0);

  const embed = new EmbedBuilder()
    .setTitle('🏛️ Glasvitrine')
    .setColor(0xFF6347)
    .setDescription(list)
    .setFooter({ text: `${objekte.length} Objekte | Gesamtwert: ${gesamtWert} 🪙` });
  return interaction.reply({ embeds: [embed] });
}

async function handleVerkaufen(interaction, userId) {
  ensureGlasbläserTable();
  const objekte = db.db.prepare('SELECT * FROM glas_vitrine WHERE user_id = ?').all(userId);

  if (objekte.length === 0) {
    return interaction.reply({ content: '❌ Du hast keine Glasobjekte zum Verkaufen!', ephemeral: true });
  }

  const kunde = KUNDEN[Math.floor(Math.random() * KUNDEN.length)];
  let gesamtWert = 0;
  const verkauft = [];

  for (const o of objekte) {
    const preis = Math.floor(o.wert * kunde.mult);
    gesamtWert += preis;
    verkauft.push(`${o.name} — ${preis} 🪙`);
  }

  db.updateBalance(userId, gesamtWert);
  db.db.prepare('DELETE FROM glas_vitrine WHERE user_id = ?').run(userId);
  db.db.prepare('UPDATE glasblaeser SET ruf = ruf + ? WHERE user_id = ?').run(objekte.length * 2, userId);

  const embed = new EmbedBuilder()
    .setTitle('💰 Glaskunst verkauft!')
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

async function handleUpgrade(interaction, userId) {
  const g = getGlasblaeser(userId);
  const typ = interaction.options.getString('typ').toLowerCase();
  const stufe = interaction.options.getInteger('stufe');

  if (!UPGRADES[typ]) {
    return interaction.reply({ content: '❌ Ungültiger Typ! Wähle: ofen, pfeife, werkzeug oder kuehlofen.', ephemeral: true });
  }
  if (stufe < 2 || stufe > UPGRADES[typ].length) {
    return interaction.reply({ content: `❌ Ungültige Stufe! Wähle 2-${UPGRADES[typ].length}.`, ephemeral: true });
  }

  const idx = stufe - 1;
  if (g[typ] >= idx) {
    return interaction.reply({ content: '❌ Du hast bereits dieses oder ein besseres Upgrade!', ephemeral: true });
  }
  if (g[typ] < idx - 1) {
    return interaction.reply({ content: '❌ Du musst zuerst die vorherige Stufe kaufen!', ephemeral: true });
  }

  const item = UPGRADES[typ][idx];
  const balance = db.getBalance(userId);
  if (balance < item.preis) {
    return interaction.reply({ content: `❌ Du brauchst ${item.preis} 🪙 (hast: ${balance} 🪙).`, ephemeral: true });
  }

  db.updateBalance(userId, -item.preis);
  db.db.prepare(`UPDATE glasblaeser SET ${typ} = ? WHERE user_id = ?`).run(idx, userId);

  const embed = new EmbedBuilder()
    .setTitle('⬆️ Upgrade gekauft!')
    .setColor(0x00AA00)
    .setDescription(`**${item.name}** für ${item.preis} 🪙!\n+${item.bonus} Fingerspitzengefühl`);
  return interaction.reply({ embeds: [embed] });
}

async function handleTrainieren(interaction, userId) {
  const skill = interaction.options.getString('skill').toLowerCase();
  if (skill !== 'fingerspitzengefuehl') {
    return interaction.reply({ content: '❌ Ungültiger Skill! Verfügbar: `fingerspitzengefuehl`', ephemeral: true });
  }

  const cd = cooldowns.get(`train_${userId}`);
  if (cd && Date.now() - cd < 60000) {
    const rest = Math.ceil((60000 - (Date.now() - cd)) / 1000);
    return interaction.reply({ content: `⏳ Du kannst in ${rest}s wieder trainieren.`, ephemeral: true });
  }

  const g = getGlasblaeser(userId);
  const kosten = 280 + (g.level * 70);
  const balance = db.getBalance(userId);
  if (balance < kosten) {
    return interaction.reply({ content: `❌ Training kostet ${kosten} 🪙 (hast: ${balance} 🪙).`, ephemeral: true });
  }

  cooldowns.set(`train_${userId}`, Date.now());
  db.updateBalance(userId, -kosten);

  const gewinn = Math.floor(Math.random() * 3) + 1;
  const xpGewinn = 13 + Math.floor(Math.random() * 10);
  db.db.prepare('UPDATE glasblaeser SET fingerspitzengefuehl = fingerspitzengefuehl + ?, xp = xp + ? WHERE user_id = ?')
    .run(gewinn, xpGewinn, userId);

  const embed = new EmbedBuilder()
    .setTitle('🎯 Training abgeschlossen!')
    .setColor(0x3498DB)
    .setDescription(`Fingerspitzengefühl +${gewinn}!\n📊 +${xpGewinn} XP | -${kosten} 🪙`);
  return interaction.reply({ embeds: [embed] });
}

async function handleAuftrag(interaction, userId) {
  const g = getGlasblaeser(userId);
  if (g.level < 2) {
    return interaction.reply({ content: '🔒 Aufträge sind ab Level 2 verfügbar!', ephemeral: true });
  }

  const cd = cooldowns.get(`auftrag_${userId}`);
  if (cd && Date.now() - cd < 90000) {
    const rest = Math.ceil((90000 - (Date.now() - cd)) / 1000);
    return interaction.reply({ content: `⏳ Nächster Auftrag in ${rest}s.`, ephemeral: true });
  }

  cooldowns.set(`auftrag_${userId}`, Date.now());

  const kunde = KUNDEN[Math.floor(Math.random() * KUNDEN.length)];
  const schwierigkeit = Math.min(g.level, 10);
  const bonus = getUpgradeBonus(g);
  const gesamtSkill = g.fingerspitzengefuehl + bonus;

  const erfolgChance = Math.min(0.85, 0.35 + (gesamtSkill / 170));
  const erfolg = Math.random() < erfolgChance;

  if (!erfolg) {
    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setTitle('📋 Auftrag gescheitert')
        .setColor(0xCC0000)
        .setDescription(`${kunde.name} war mit deiner Glasarbeit nicht zufrieden.`)
      ]
    });
  }

  const belohnung = Math.floor((220 + schwierigkeit * 140) * kunde.mult);
  const xpGewinn = 16 + schwierigkeit * 4;
  db.updateBalance(userId, belohnung);
  db.db.prepare('UPDATE glasblaeser SET xp = xp + ?, ruf = ruf + ? WHERE user_id = ?')
    .run(xpGewinn, schwierigkeit, userId);

  const embed = new EmbedBuilder()
    .setTitle('📋 Auftrag abgeschlossen!')
    .setColor(0x00AA00)
    .setDescription([
      `**Auftraggeber:** ${kunde.name} (x${kunde.mult})`,
      `**Schwierigkeit:** ${'⭐'.repeat(Math.min(schwierigkeit, 10))}`,
      `\n💰 ${belohnung} 🪙 | 📊 +${xpGewinn} XP | ⭐ +${schwierigkeit} Ruf`,
    ].join('\n'));
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

  const g1 = getGlasblaeser(userId);
  const g2 = getGlasblaeser(gegner.id);

  const skill1 = g1.fingerspitzengefuehl + getUpgradeBonus(g1) + g1.level * 5;
  const skill2 = g2.fingerspitzengefuehl + getUpgradeBonus(g2) + g2.level * 5;

  const score1 = skill1 + g1.objekte_gesamt * 2 + g1.meisterwerke * 10 + Math.floor(Math.random() * 40);
  const score2 = skill2 + g2.objekte_gesamt * 2 + g2.meisterwerke * 10 + Math.floor(Math.random() * 40);

  const gewinner = score1 >= score2 ? userId : gegner.id;
  const preis = 350 + Math.floor(Math.random() * 500);

  db.updateBalance(gewinner, preis);
  db.db.prepare('UPDATE glasblaeser SET ruf = ruf + 5, xp = xp + 15 WHERE user_id = ?').run(gewinner);

  const embed = new EmbedBuilder()
    .setTitle('🏆 Glasbläser-Duell!')
    .setColor(0xFFD700)
    .setDescription([
      `**${interaction.user.username}:** ${score1} Punkte`,
      `**${gegner.username}:** ${score2} Punkte`,
      '',
      `🥇 **${gewinner === userId ? interaction.user.username : gegner.username}** gewinnt ${preis} 🪙 und +5 Ruf!`,
    ].join('\n'));
  return interaction.reply({ embeds: [embed] });
}
