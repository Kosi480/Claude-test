const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

const cooldowns = new Map();

const INSTRUMENTE_TYPEN = [
  { name: 'Klavier', preis: 500, klang: 3, spalte: 'klavier', emoji: '🎹' },
  { name: 'Violine', preis: 800, klang: 5, spalte: 'violine', emoji: '🎻' },
  { name: 'Flöte', preis: 400, klang: 3, spalte: 'floete', emoji: '🪈' },
  { name: 'Cello', preis: 1000, klang: 6, spalte: 'cello', emoji: '🎻' },
  { name: 'Trompete', preis: 700, klang: 4, spalte: 'trompete', emoji: '🎺' },
  { name: 'Harfe', preis: 2000, klang: 8, spalte: 'harfe', emoji: '🪕' },
  { name: 'Orgel', preis: 5000, klang: 12, spalte: 'orgel', emoji: '⛪' },
  { name: 'Äolsharfe', preis: 15000, klang: 20, spalte: 'aeolsharfe', emoji: '✨' },
];

const GATTUNGEN = [
  { name: 'Lied', minLevel: 1, schwierigkeit: 1, instrumente: 1, wert: 200, xp: 10 },
  { name: 'Sonate', minLevel: 2, schwierigkeit: 2, instrumente: 1, wert: 500, xp: 18 },
  { name: 'Quartett', minLevel: 3, schwierigkeit: 3, instrumente: 4, wert: 1200, xp: 30 },
  { name: 'Konzert', minLevel: 4, schwierigkeit: 5, instrumente: 3, wert: 2500, xp: 50 },
  { name: 'Ouvertüre', minLevel: 5, schwierigkeit: 6, instrumente: 5, wert: 4000, xp: 70 },
  { name: 'Sinfonie', minLevel: 7, schwierigkeit: 8, instrumente: 6, wert: 8000, xp: 110 },
  { name: 'Oper', minLevel: 9, schwierigkeit: 10, instrumente: 7, wert: 15000, xp: 170 },
  { name: 'Magnum Opus', minLevel: 12, schwierigkeit: 14, instrumente: 8, wert: 35000, xp: 300 },
];

const TONARTEN = [
  'C-Dur', 'D-Moll', 'G-Dur', 'A-Moll', 'F-Dur',
  'E-Moll', 'B-Dur', 'Fis-Moll', 'Es-Dur', 'Cis-Moll',
];

const STIMMUNGEN = [
  'Fröhlich', 'Melancholisch', 'Episch', 'Romantisch',
  'Dramatisch', 'Mysteriös', 'Triumphierend', 'Zärtlich',
];

const UPGRADES = {
  studio: [
    { name: 'Dachkammer', bonus: 0, preis: 0 },
    { name: 'Musikzimmer', bonus: 5, preis: 4000 },
    { name: 'Konzertsaal', bonus: 13, preis: 16000 },
    { name: 'Philharmonie', bonus: 28, preis: 45000 },
  ],
  notenpult: [
    { name: 'Holzpult', bonus: 0, preis: 0 },
    { name: 'Messing-Pult', bonus: 4, preis: 3000 },
    { name: 'Dirigentenpult', bonus: 11, preis: 11000 },
    { name: 'Meisterpult', bonus: 24, preis: 34000 },
  ],
  tinte: [
    { name: 'Billige Tinte', bonus: 0, preis: 0 },
    { name: 'Feine Tinte', bonus: 3, preis: 2000 },
    { name: 'Gold-Tinte', bonus: 9, preis: 8000 },
    { name: 'Sternen-Tinte', bonus: 20, preis: 28000 },
  ],
  bibliothek: [
    { name: 'Notenblätter', bonus: 0, preis: 0 },
    { name: 'Notenbibliothek', bonus: 4, preis: 3500 },
    { name: 'Musikarchiv', bonus: 11, preis: 12000 },
    { name: 'Universalbibliothek', bonus: 23, preis: 36000 },
  ],
};

const AUFTRAGGEBER = [
  { name: 'Dorfkirche', mult: 1.0 },
  { name: 'Stadttheater', mult: 1.2 },
  { name: 'Opernhaus', mult: 1.4 },
  { name: 'Adelsfamilie', mult: 1.3 },
  { name: 'Königshof', mult: 1.7 },
  { name: 'Musikakademie', mult: 1.5 },
  { name: 'Konservatorium', mult: 1.6 },
  { name: 'Göttlicher Chor', mult: 2.0 },
];

const EREIGNISSE = [
  { text: 'Die Melodien fließen aus dir heraus!', bonusMult: 1.5 },
  { text: 'Eine göttliche Inspiration ergreift dich!', bonusMult: 1.7 },
  { text: 'Schreibblockade — du kämpfst mit den Noten.', bonusMult: 0.7 },
  { text: 'Die Harmonie klingt himmlisch!', bonusMult: 1.4 },
  { text: 'Ein falscher Ton ruiniert den Fluss.', bonusMult: 0.8 },
  { text: 'Das Thema entwickelt sich wunderbar!', bonusMult: 1.3 },
  { text: 'Du hörst die Musik der Sphären!', bonusMult: 1.6 },
  { text: 'Solide Kompositionsarbeit.', bonusMult: 1.0 },
  { text: 'Der Kontrapunkt sitzt perfekt!', bonusMult: 1.2 },
  { text: 'Lärm von draußen stört die Konzentration.', bonusMult: 0.75 },
];

function ensureKomponistTable() {
  db.db.exec(`CREATE TABLE IF NOT EXISTS komponisten (
    user_id TEXT PRIMARY KEY,
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    musikalitaet INTEGER DEFAULT 10,
    werke_gesamt INTEGER DEFAULT 0,
    meisterwerke INTEGER DEFAULT 0,
    studio INTEGER DEFAULT 0,
    notenpult INTEGER DEFAULT 0,
    tinte INTEGER DEFAULT 0,
    bibliothek INTEGER DEFAULT 0,
    klavier INTEGER DEFAULT 1,
    violine INTEGER DEFAULT 0,
    floete INTEGER DEFAULT 0,
    cello INTEGER DEFAULT 0,
    trompete INTEGER DEFAULT 0,
    harfe INTEGER DEFAULT 0,
    orgel INTEGER DEFAULT 0,
    aeolsharfe INTEGER DEFAULT 0,
    ruf INTEGER DEFAULT 0,
    last_compose TEXT
  )`);
  db.db.exec(`CREATE TABLE IF NOT EXISTS kompositionen (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    name TEXT,
    gattung TEXT,
    tonart TEXT,
    stimmung TEXT,
    qualitaet INTEGER,
    wert INTEGER,
    erstellt_am TEXT DEFAULT (datetime('now'))
  )`);
}

function getKomponist(userId) {
  ensureKomponistTable();
  let k = db.db.prepare('SELECT * FROM komponisten WHERE user_id = ?').get(userId);
  if (!k) {
    db.db.prepare('INSERT INTO komponisten (user_id) VALUES (?)').run(userId);
    k = db.db.prepare('SELECT * FROM komponisten WHERE user_id = ?').get(userId);
  }
  return k;
}

function getXpForLevel(level) {
  return Math.floor(120 * Math.pow(1.45, level - 1));
}

function getUpgradeBonus(k) {
  return UPGRADES.studio[k.studio].bonus +
    UPGRADES.notenpult[k.notenpult].bonus +
    UPGRADES.tinte[k.tinte].bonus +
    UPGRADES.bibliothek[k.bibliothek].bonus;
}

function countInstrumente(k) {
  let count = 0;
  for (const inst of INSTRUMENTE_TYPEN) {
    if (k[inst.spalte] > 0) count++;
  }
  return count;
}

function getInstrumenteKlang(k) {
  let klang = 0;
  for (const inst of INSTRUMENTE_TYPEN) {
    if (k[inst.spalte] > 0) klang += inst.klang;
  }
  return klang;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('komponist')
    .setDescription('🎵 Werde Komponist und erschaffe unsterbliche Musik!')
    .addSubcommand(s => s.setName('profil').setDescription('Zeige dein Komponisten-Profil'))
    .addSubcommand(s => s.setName('instrumente').setDescription('Kaufe Instrumente')
      .addIntegerOption(o => o.setName('nr').setDescription('Instrument (1-8)')))
    .addSubcommand(s => s.setName('gattungen').setDescription('Zeige alle Musikgattungen'))
    .addSubcommand(s => s.setName('komponieren').setDescription('Komponiere ein Musikstück')
      .addIntegerOption(o => o.setName('gattung').setDescription('Gattung (1-8)').setRequired(true)))
    .addSubcommand(s => s.setName('werke').setDescription('Zeige deine Kompositionen'))
    .addSubcommand(s => s.setName('auffuehren').setDescription('Führe deine Werke auf und verdiene'))
    .addSubcommand(s => s.setName('upgrade').setDescription('Verbessere deine Ausstattung')
      .addStringOption(o => o.setName('typ').setDescription('studio/notenpult/tinte/bibliothek').setRequired(true))
      .addIntegerOption(o => o.setName('stufe').setDescription('Stufe (2-4)').setRequired(true)))
    .addSubcommand(s => s.setName('trainieren').setDescription('Trainiere deine Musikalität')
      .addStringOption(o => o.setName('skill').setDescription('musikalitaet').setRequired(true)))
    .addSubcommand(s => s.setName('auftrag').setDescription('Nimm eine Auftragskomposition an'))
    .addSubcommand(s => s.setName('wettbewerb').setDescription('PvP Kompositions-Duell')
      .addUserOption(o => o.setName('gegner').setDescription('Dein Gegner').setRequired(true))),

  async execute(interaction) {
    const config = require('../config.json');
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    switch (sub) {
      case 'profil': return handleProfil(interaction, userId);
      case 'instrumente': return handleInstrumente(interaction, userId);
      case 'gattungen': return handleGattungen(interaction, userId);
      case 'komponieren': return handleKomponieren(interaction, userId);
      case 'werke': return handleWerke(interaction, userId);
      case 'auffuehren': return handleAuffuehren(interaction, userId);
      case 'upgrade': return handleUpgrade(interaction, userId);
      case 'trainieren': return handleTrainieren(interaction, userId);
      case 'auftrag': return handleAuftrag(interaction, userId);
      case 'wettbewerb': return handleWettbewerb(interaction, userId);
    }
  }
};

async function handleProfil(interaction, userId) {
  const k = getKomponist(userId);
  const xpNeeded = getXpForLevel(k.level);
  const bonus = getUpgradeBonus(k);
  const instCount = countInstrumente(k);
  const klang = getInstrumenteKlang(k);

  const ownedInst = INSTRUMENTE_TYPEN.filter(i => k[i.spalte] > 0).map(i => `${i.emoji} ${i.name}`).join(', ') || 'Keine';

  const embed = new EmbedBuilder()
    .setTitle('🎵 Komponisten-Profil')
    .setColor(0x8B0000)
    .addFields(
      { name: '📊 Level', value: `${k.level} (${k.xp}/${xpNeeded} XP)`, inline: true },
      { name: '🎼 Musikalität', value: `${k.musikalitaet + bonus}`, inline: true },
      { name: '⭐ Ruf', value: `${k.ruf}`, inline: true },
      { name: '📝 Werke', value: `${k.werke_gesamt} (${k.meisterwerke} Meisterwerke)`, inline: true },
      { name: '🎵 Klang', value: `${klang}`, inline: true },
      { name: '🎹 Instrumente', value: `${instCount}/8`, inline: true },
      { name: '🎼 Besitzt', value: ownedInst },
      { name: '🏗️ Ausstattung', value: [
        `Studio: ${UPGRADES.studio[k.studio].name}`,
        `Pult: ${UPGRADES.notenpult[k.notenpult].name}`,
        `Tinte: ${UPGRADES.tinte[k.tinte].name}`,
        `Bibliothek: ${UPGRADES.bibliothek[k.bibliothek].name}`,
      ].join('\n') },
    );
  return interaction.reply({ embeds: [embed] });
}

async function handleInstrumente(interaction, userId) {
  const k = getKomponist(userId);
  const nr = interaction.options.getInteger('nr');

  if (!nr) {
    const list = INSTRUMENTE_TYPEN.map((inst, i) => {
      const owned = k[inst.spalte] > 0;
      return `${owned ? '✅' : '🔲'} **${i + 1}.** ${inst.emoji} ${inst.name} — ${inst.preis} 🪙 | Klang: ${inst.klang}`;
    }).join('\n');

    const embed = new EmbedBuilder()
      .setTitle('🎹 Instrumente')
      .setColor(0x8B0000)
      .setDescription(list);
    return interaction.reply({ embeds: [embed] });
  }

  if (nr < 1 || nr > INSTRUMENTE_TYPEN.length) {
    return interaction.reply({ content: `❌ Ungültige Nummer! Wähle 1-${INSTRUMENTE_TYPEN.length}.`, ephemeral: true });
  }

  const inst = INSTRUMENTE_TYPEN[nr - 1];
  if (k[inst.spalte] > 0) {
    return interaction.reply({ content: '❌ Du besitzt dieses Instrument bereits!', ephemeral: true });
  }

  const balance = db.getBalance(userId);
  if (balance < inst.preis) {
    return interaction.reply({ content: `❌ Du brauchst ${inst.preis} 🪙 (hast: ${balance} 🪙).`, ephemeral: true });
  }

  db.updateBalance(userId, -inst.preis);
  db.db.prepare(`UPDATE komponisten SET ${inst.spalte} = 1 WHERE user_id = ?`).run(userId);

  const embed = new EmbedBuilder()
    .setTitle('🎹 Instrument gekauft!')
    .setColor(0x00AA00)
    .setDescription(`${inst.emoji} **${inst.name}** für ${inst.preis} 🪙!\n+${inst.klang} Klang`);
  return interaction.reply({ embeds: [embed] });
}

async function handleGattungen(interaction, userId) {
  const k = getKomponist(userId);

  const list = GATTUNGEN.map((g, i) => {
    const unlocked = k.level >= g.minLevel;
    return `${unlocked ? '✅' : '🔒'} **${i + 1}. ${g.name}** — Lv.${g.minLevel} | ${g.instrumente} Instr. | ${g.wert} 🪙`;
  }).join('\n');

  const embed = new EmbedBuilder()
    .setTitle('📜 Musikgattungen')
    .setColor(0x8B0000)
    .setDescription(list)
    .setFooter({ text: `Dein Level: ${k.level}` });
  return interaction.reply({ embeds: [embed] });
}

async function handleKomponieren(interaction, userId) {
  const cd = cooldowns.get(`compose_${userId}`);
  if (cd && Date.now() - cd < 55000) {
    const rest = Math.ceil((55000 - (Date.now() - cd)) / 1000);
    return interaction.reply({ content: `⏳ Du kannst in ${rest}s wieder komponieren.`, ephemeral: true });
  }

  const k = getKomponist(userId);
  const gattungNr = interaction.options.getInteger('gattung');

  if (gattungNr < 1 || gattungNr > GATTUNGEN.length) {
    return interaction.reply({ content: `❌ Ungültige Gattung! Wähle 1-${GATTUNGEN.length}.`, ephemeral: true });
  }

  const gattung = GATTUNGEN[gattungNr - 1];
  if (k.level < gattung.minLevel) {
    return interaction.reply({ content: `🔒 Du brauchst Level ${gattung.minLevel} für ${gattung.name}!`, ephemeral: true });
  }

  const instCount = countInstrumente(k);
  if (instCount < gattung.instrumente) {
    return interaction.reply({ content: `❌ Du brauchst mindestens ${gattung.instrumente} Instrumente (hast: ${instCount}).`, ephemeral: true });
  }

  cooldowns.set(`compose_${userId}`, Date.now());

  const ereignis = EREIGNISSE[Math.floor(Math.random() * EREIGNISSE.length)];
  const tonart = TONARTEN[Math.floor(Math.random() * TONARTEN.length)];
  const stimmung = STIMMUNGEN[Math.floor(Math.random() * STIMMUNGEN.length)];
  const bonus = getUpgradeBonus(k);
  const klang = getInstrumenteKlang(k);
  const gesamtSkill = k.musikalitaet + bonus + klang + k.level * 3;

  const qualitaet = Math.floor((15 + gesamtSkill * 0.6) * ereignis.bonusMult);
  const wert = Math.floor(gattung.wert * (0.5 + qualitaet / 50));

  const istMeisterwerk = qualitaet > 70 && Math.random() < 0.1;
  const endWert = istMeisterwerk ? wert * 3 : wert;
  const werkName = `${stimmung}e ${gattung.name} in ${tonart}`;

  db.db.prepare('INSERT INTO kompositionen (user_id, name, gattung, tonart, stimmung, qualitaet, wert) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(userId, werkName, gattung.name, tonart, stimmung, qualitaet, endWert);

  const xpGewinn = Math.floor(gattung.xp * ereignis.bonusMult);
  db.db.prepare(`UPDATE komponisten SET xp = xp + ?, werke_gesamt = werke_gesamt + 1,
    meisterwerke = meisterwerke + ?, ruf = ruf + ? WHERE user_id = ?`)
    .run(xpGewinn, istMeisterwerk ? 1 : 0, Math.floor(qualitaet / 10) + 1, userId);

  const updated = getKomponist(userId);
  const xpNeeded = getXpForLevel(updated.level);
  let levelUpText = '';
  if (updated.xp >= xpNeeded) {
    db.db.prepare('UPDATE komponisten SET level = level + 1, xp = xp - ? WHERE user_id = ?').run(xpNeeded, userId);
    levelUpText = `\n🎉 **LEVEL UP!** Level ${updated.level + 1}!`;
  }

  const embed = new EmbedBuilder()
    .setTitle(`🎵 ${istMeisterwerk ? '⭐ MEISTERWERK! ⭐' : 'Komposition vollendet!'}`)
    .setColor(istMeisterwerk ? 0xFFD700 : 0x8B0000)
    .setDescription([
      `**${werkName}**`,
      `Gattung: ${gattung.name} | Stimmung: ${stimmung}`,
      `\n💫 *${ereignis.text}*`,
      `\n⭐ Qualität: ${qualitaet} | 💰 Wert: ${endWert} 🪙 | 📊 +${xpGewinn} XP`,
      levelUpText,
    ].filter(Boolean).join('\n'));
  return interaction.reply({ embeds: [embed] });
}

async function handleWerke(interaction, userId) {
  ensureKomponistTable();
  const werke = db.db.prepare('SELECT * FROM kompositionen WHERE user_id = ? ORDER BY wert DESC').all(userId);

  if (werke.length === 0) {
    return interaction.reply({ content: '📭 Du hast noch keine Kompositionen. Fang an zu komponieren!', ephemeral: true });
  }

  const list = werke.slice(0, 12).map((w, i) =>
    `**${i + 1}.** ${w.name} — Q:${w.qualitaet} | ${w.wert} 🪙`
  ).join('\n');

  const gesamtWert = werke.reduce((sum, w) => sum + w.wert, 0);

  const embed = new EmbedBuilder()
    .setTitle('📚 Deine Kompositionen')
    .setColor(0x8B0000)
    .setDescription(list)
    .setFooter({ text: `${werke.length} Werke | Gesamtwert: ${gesamtWert} 🪙` });
  return interaction.reply({ embeds: [embed] });
}

async function handleAuffuehren(interaction, userId) {
  ensureKomponistTable();
  const werke = db.db.prepare('SELECT * FROM kompositionen WHERE user_id = ?').all(userId);

  if (werke.length === 0) {
    return interaction.reply({ content: '❌ Du hast keine Werke zum Aufführen!', ephemeral: true });
  }

  const auftraggeber = AUFTRAGGEBER[Math.floor(Math.random() * AUFTRAGGEBER.length)];
  let gesamtWert = 0;
  const aufgefuehrt = [];

  for (const w of werke) {
    const preis = Math.floor(w.wert * auftraggeber.mult);
    gesamtWert += preis;
    aufgefuehrt.push(`${w.name} — ${preis} 🪙`);
  }

  db.updateBalance(userId, gesamtWert);
  db.db.prepare('DELETE FROM kompositionen WHERE user_id = ?').run(userId);
  db.db.prepare('UPDATE komponisten SET ruf = ruf + ? WHERE user_id = ?').run(werke.length * 3, userId);

  const embed = new EmbedBuilder()
    .setTitle('🎶 Konzert aufgeführt!')
    .setColor(0xFFD700)
    .setDescription([
      `**Veranstalter:** ${auftraggeber.name} (x${auftraggeber.mult})`,
      '',
      aufgefuehrt.slice(0, 10).join('\n'),
      aufgefuehrt.length > 10 ? `...und ${aufgefuehrt.length - 10} weitere` : '',
      '',
      `**Gesamt: ${gesamtWert} 🪙**`,
    ].filter(Boolean).join('\n'));
  return interaction.reply({ embeds: [embed] });
}

async function handleUpgrade(interaction, userId) {
  const k = getKomponist(userId);
  const typ = interaction.options.getString('typ').toLowerCase();
  const stufe = interaction.options.getInteger('stufe');

  if (!UPGRADES[typ]) {
    return interaction.reply({ content: '❌ Ungültiger Typ! Wähle: studio, notenpult, tinte oder bibliothek.', ephemeral: true });
  }
  if (stufe < 2 || stufe > UPGRADES[typ].length) {
    return interaction.reply({ content: `❌ Ungültige Stufe! Wähle 2-${UPGRADES[typ].length}.`, ephemeral: true });
  }

  const idx = stufe - 1;
  if (k[typ] >= idx) {
    return interaction.reply({ content: '❌ Du hast bereits dieses oder ein besseres Upgrade!', ephemeral: true });
  }
  if (k[typ] < idx - 1) {
    return interaction.reply({ content: '❌ Du musst zuerst die vorherige Stufe kaufen!', ephemeral: true });
  }

  const item = UPGRADES[typ][idx];
  const balance = db.getBalance(userId);
  if (balance < item.preis) {
    return interaction.reply({ content: `❌ Du brauchst ${item.preis} 🪙 (hast: ${balance} 🪙).`, ephemeral: true });
  }

  db.updateBalance(userId, -item.preis);
  db.db.prepare(`UPDATE komponisten SET ${typ} = ? WHERE user_id = ?`).run(idx, userId);

  const embed = new EmbedBuilder()
    .setTitle('⬆️ Upgrade gekauft!')
    .setColor(0x00AA00)
    .setDescription(`**${item.name}** für ${item.preis} 🪙!\n+${item.bonus} Musikalität`);
  return interaction.reply({ embeds: [embed] });
}

async function handleTrainieren(interaction, userId) {
  const skill = interaction.options.getString('skill').toLowerCase();
  if (skill !== 'musikalitaet') {
    return interaction.reply({ content: '❌ Ungültiger Skill! Verfügbar: `musikalitaet`', ephemeral: true });
  }

  const cd = cooldowns.get(`train_${userId}`);
  if (cd && Date.now() - cd < 60000) {
    const rest = Math.ceil((60000 - (Date.now() - cd)) / 1000);
    return interaction.reply({ content: `⏳ Du kannst in ${rest}s wieder trainieren.`, ephemeral: true });
  }

  const k = getKomponist(userId);
  const kosten = 300 + (k.level * 75);
  const balance = db.getBalance(userId);
  if (balance < kosten) {
    return interaction.reply({ content: `❌ Training kostet ${kosten} 🪙 (hast: ${balance} 🪙).`, ephemeral: true });
  }

  cooldowns.set(`train_${userId}`, Date.now());
  db.updateBalance(userId, -kosten);

  const gewinn = Math.floor(Math.random() * 3) + 1;
  const xpGewinn = 14 + Math.floor(Math.random() * 12);
  db.db.prepare('UPDATE komponisten SET musikalitaet = musikalitaet + ?, xp = xp + ? WHERE user_id = ?')
    .run(gewinn, xpGewinn, userId);

  const embed = new EmbedBuilder()
    .setTitle('🎼 Training abgeschlossen!')
    .setColor(0x3498DB)
    .setDescription(`Musikalität +${gewinn}!\n📊 +${xpGewinn} XP | -${kosten} 🪙`);
  return interaction.reply({ embeds: [embed] });
}

async function handleAuftrag(interaction, userId) {
  const k = getKomponist(userId);
  if (k.level < 2) {
    return interaction.reply({ content: '🔒 Aufträge sind ab Level 2 verfügbar!', ephemeral: true });
  }

  const cd = cooldowns.get(`auftrag_${userId}`);
  if (cd && Date.now() - cd < 90000) {
    const rest = Math.ceil((90000 - (Date.now() - cd)) / 1000);
    return interaction.reply({ content: `⏳ Nächster Auftrag in ${rest}s.`, ephemeral: true });
  }

  cooldowns.set(`auftrag_${userId}`, Date.now());

  const auftraggeber = AUFTRAGGEBER[Math.floor(Math.random() * AUFTRAGGEBER.length)];
  const schwierigkeit = Math.min(k.level, 10);
  const bonus = getUpgradeBonus(k);
  const gesamtSkill = k.musikalitaet + bonus + getInstrumenteKlang(k);

  const erfolgChance = Math.min(0.85, 0.3 + (gesamtSkill / 160));
  const erfolg = Math.random() < erfolgChance;

  if (!erfolg) {
    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setTitle('📋 Auftrag gescheitert')
        .setColor(0xCC0000)
        .setDescription(`${auftraggeber.name} war mit deiner Komposition nicht zufrieden.`)
      ]
    });
  }

  const belohnung = Math.floor((280 + schwierigkeit * 150) * auftraggeber.mult);
  const xpGewinn = 18 + schwierigkeit * 5;
  db.updateBalance(userId, belohnung);
  db.db.prepare('UPDATE komponisten SET xp = xp + ?, ruf = ruf + ? WHERE user_id = ?')
    .run(xpGewinn, schwierigkeit, userId);

  const embed = new EmbedBuilder()
    .setTitle('📋 Auftrag abgeschlossen!')
    .setColor(0x00AA00)
    .setDescription([
      `**Auftraggeber:** ${auftraggeber.name} (x${auftraggeber.mult})`,
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

  const k1 = getKomponist(userId);
  const k2 = getKomponist(gegner.id);

  const skill1 = k1.musikalitaet + getUpgradeBonus(k1) + getInstrumenteKlang(k1) + k1.level * 5;
  const skill2 = k2.musikalitaet + getUpgradeBonus(k2) + getInstrumenteKlang(k2) + k2.level * 5;

  const score1 = skill1 + k1.werke_gesamt * 2 + k1.meisterwerke * 10 + Math.floor(Math.random() * 40);
  const score2 = skill2 + k2.werke_gesamt * 2 + k2.meisterwerke * 10 + Math.floor(Math.random() * 40);

  const gewinner = score1 >= score2 ? userId : gegner.id;
  const preis = 400 + Math.floor(Math.random() * 500);

  db.updateBalance(gewinner, preis);
  db.db.prepare('UPDATE komponisten SET ruf = ruf + 5, xp = xp + 15 WHERE user_id = ?').run(gewinner);

  const embed = new EmbedBuilder()
    .setTitle('🏆 Kompositions-Duell!')
    .setColor(0xFFD700)
    .setDescription([
      `**${interaction.user.username}:** ${score1} Punkte`,
      `**${gegner.username}:** ${score2} Punkte`,
      '',
      `🥇 **${gewinner === userId ? interaction.user.username : gegner.username}** gewinnt ${preis} 🪙 und +5 Ruf!`,
    ].join('\n'));
  return interaction.reply({ embeds: [embed] });
}
