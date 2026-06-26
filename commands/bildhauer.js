const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

const cooldowns = new Map();

const MATERIALIEN = [
  { name: 'Ton', preis: 100, qualitaet: 1, emoji: '🟤' },
  { name: 'Sandstein', preis: 300, qualitaet: 2, emoji: '🟡' },
  { name: 'Kalkstein', preis: 600, qualitaet: 3, emoji: '⬜' },
  { name: 'Granit', preis: 1200, qualitaet: 5, emoji: '⬛' },
  { name: 'Marmor', preis: 2500, qualitaet: 8, emoji: '🤍' },
  { name: 'Jade', preis: 5000, qualitaet: 12, emoji: '💚' },
  { name: 'Obsidian', preis: 10000, qualitaet: 18, emoji: '🖤' },
  { name: 'Sternenmetall', preis: 25000, qualitaet: 30, emoji: '💎' },
];

const SKULPTUR_TYPEN = [
  { name: 'Büste', schwierigkeit: 1, zeitMult: 1.0, wertMult: 1.0 },
  { name: 'Reliefplatte', schwierigkeit: 2, zeitMult: 1.2, wertMult: 1.3 },
  { name: 'Tierfigur', schwierigkeit: 3, zeitMult: 1.4, wertMult: 1.5 },
  { name: 'Abstrakte Form', schwierigkeit: 4, zeitMult: 1.3, wertMult: 1.7 },
  { name: 'Vollstatue', schwierigkeit: 5, zeitMult: 1.8, wertMult: 2.0 },
  { name: 'Brunnen', schwierigkeit: 6, zeitMult: 2.0, wertMult: 2.5 },
  { name: 'Monumentalwerk', schwierigkeit: 8, zeitMult: 2.5, wertMult: 3.5 },
  { name: 'Meisterstück', schwierigkeit: 10, zeitMult: 3.0, wertMult: 5.0 },
];

const WERKZEUGE = {
  meissel: [
    { name: 'Einfacher Meißel', bonus: 0, preis: 0 },
    { name: 'Stahlmeißel', bonus: 5, preis: 3000 },
    { name: 'Diamantmeißel', bonus: 12, preis: 12000 },
    { name: 'Lasermeißel', bonus: 22, preis: 35000 },
  ],
  hammer: [
    { name: 'Holzhammer', bonus: 0, preis: 0 },
    { name: 'Kupferhammer', bonus: 4, preis: 2500 },
    { name: 'Titanenhammer', bonus: 10, preis: 10000 },
    { name: 'Gravitationshammer', bonus: 20, preis: 30000 },
  ],
  schleifer: [
    { name: 'Sandpapier', bonus: 0, preis: 0 },
    { name: 'Schleifstein', bonus: 3, preis: 2000 },
    { name: 'Poliermaschine', bonus: 8, preis: 8000 },
    { name: 'Nanopolierer', bonus: 18, preis: 25000 },
  ],
  atelier: [
    { name: 'Hinterhof-Werkstatt', bonus: 0, preis: 0 },
    { name: 'Stadtateliér', bonus: 5, preis: 5000 },
    { name: 'Kunstatelier', bonus: 12, preis: 15000 },
    { name: 'Meistergalerie', bonus: 25, preis: 45000 },
  ],
};

const STILE = [
  'Klassisch', 'Barock', 'Modern', 'Expressionistisch',
  'Minimalistisch', 'Surrealistisch', 'Gotisch', 'Impressionistisch',
];

const KUNDEN = [
  { name: 'Stadtpark', mult: 1.0 },
  { name: 'Privatsammler', mult: 1.3 },
  { name: 'Museum', mult: 1.2 },
  { name: 'Adliger', mult: 1.5 },
  { name: 'Kirche', mult: 1.1 },
  { name: 'Kunstgalerie', mult: 1.4 },
  { name: 'Königspalast', mult: 1.8 },
  { name: 'Auktionshaus', mult: 1.6 },
];

const EREIGNISSE = [
  { text: 'Deine Hände sind heute besonders geschickt!', bonusMult: 1.5 },
  { text: 'Das Material hat eine perfekte Maserung!', bonusMult: 1.4 },
  { text: 'Ein Riss durchzieht das Material!', bonusMult: 0.6 },
  { text: 'Du findest eine einzigartige Ader im Stein!', bonusMult: 1.6 },
  { text: 'Das Werkzeug rutscht ab — kleine Delle!', bonusMult: 0.8 },
  { text: 'Die Inspiration fließt wie ein Strom!', bonusMult: 1.3 },
  { text: 'Ein berühmter Künstler gibt dir Tipps!', bonusMult: 1.7 },
  { text: 'Routine-Arbeit ohne besondere Vorkommnisse.', bonusMult: 1.0 },
  { text: 'Das Licht im Atelier ist heute perfekt.', bonusMult: 1.2 },
  { text: 'Staub verschleiert deine Sicht.', bonusMult: 0.75 },
];

function ensureBildhauerTable() {
  db.db.exec(`CREATE TABLE IF NOT EXISTS bildhauer (
    user_id TEXT PRIMARY KEY,
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    kunstfertigkeit INTEGER DEFAULT 10,
    skulpturen_gesamt INTEGER DEFAULT 0,
    meisterwerke INTEGER DEFAULT 0,
    meissel INTEGER DEFAULT 0,
    hammer INTEGER DEFAULT 0,
    schleifer INTEGER DEFAULT 0,
    atelier INTEGER DEFAULT 0,
    ton INTEGER DEFAULT 5,
    sandstein INTEGER DEFAULT 0,
    kalkstein INTEGER DEFAULT 0,
    granit INTEGER DEFAULT 0,
    marmor INTEGER DEFAULT 0,
    jade INTEGER DEFAULT 0,
    obsidian INTEGER DEFAULT 0,
    sternenmetall INTEGER DEFAULT 0,
    ruf INTEGER DEFAULT 0,
    last_sculpt TEXT
  )`);
  db.db.exec(`CREATE TABLE IF NOT EXISTS skulpturen (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    name TEXT,
    typ TEXT,
    material TEXT,
    stil TEXT,
    qualitaet INTEGER,
    wert INTEGER,
    erstellt_am TEXT DEFAULT (datetime('now'))
  )`);
}

function getBildhauer(userId) {
  ensureBildhauerTable();
  let b = db.db.prepare('SELECT * FROM bildhauer WHERE user_id = ?').get(userId);
  if (!b) {
    db.db.prepare('INSERT INTO bildhauer (user_id) VALUES (?)').run(userId);
    b = db.db.prepare('SELECT * FROM bildhauer WHERE user_id = ?').get(userId);
  }
  return b;
}

function getXpForLevel(level) {
  return Math.floor(110 * Math.pow(1.5, level - 1));
}

function getWerkzeugBonus(b) {
  return WERKZEUGE.meissel[b.meissel].bonus +
    WERKZEUGE.hammer[b.hammer].bonus +
    WERKZEUGE.schleifer[b.schleifer].bonus +
    WERKZEUGE.atelier[b.atelier].bonus;
}

function getMaterialSpalte(name) {
  return name.toLowerCase().replace('ä', 'ae').replace('ö', 'oe').replace('ü', 'ue');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bildhauer')
    .setDescription('🗿 Werde Bildhauer und erschaffe Skulpturen!')
    .addSubcommand(s => s.setName('status').setDescription('Zeige dein Bildhauer-Profil'))
    .addSubcommand(s => s.setName('materialien').setDescription('Zeige und kaufe Materialien')
      .addStringOption(o => o.setName('material').setDescription('Material zum Kaufen'))
      .addIntegerOption(o => o.setName('menge').setDescription('Menge')))
    .addSubcommand(s => s.setName('meisseln').setDescription('Erschaffe eine Skulptur')
      .addIntegerOption(o => o.setName('typ').setDescription('Skulpturtyp (1-8)').setRequired(true))
      .addIntegerOption(o => o.setName('material').setDescription('Material (1-8)').setRequired(true)))
    .addSubcommand(s => s.setName('galerie').setDescription('Zeige deine Skulpturen'))
    .addSubcommand(s => s.setName('verkaufen').setDescription('Verkaufe deine Skulpturen'))
    .addSubcommand(s => s.setName('werkzeuge').setDescription('Upgrade deine Werkzeuge')
      .addStringOption(o => o.setName('typ').setDescription('meissel/hammer/schleifer/atelier'))
      .addIntegerOption(o => o.setName('stufe').setDescription('Stufe (2-4)')))
    .addSubcommand(s => s.setName('trainieren').setDescription('Trainiere deine Kunstfertigkeit')
      .addStringOption(o => o.setName('skill').setDescription('kunstfertigkeit').setRequired(true)))
    .addSubcommand(s => s.setName('auftrag').setDescription('Nimm einen Auftragsarbeit an'))
    .addSubcommand(s => s.setName('wettbewerb').setDescription('PvP Bildhauer-Wettbewerb')
      .addUserOption(o => o.setName('gegner').setDescription('Dein Gegner').setRequired(true))),

  async execute(interaction) {
    const config = require('../config.json');
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    switch (sub) {
      case 'status': return handleStatus(interaction, userId);
      case 'materialien': return handleMaterialien(interaction, userId);
      case 'meisseln': return handleMeisseln(interaction, userId);
      case 'galerie': return handleGalerie(interaction, userId);
      case 'verkaufen': return handleVerkaufen(interaction, userId);
      case 'werkzeuge': return handleWerkzeuge(interaction, userId);
      case 'trainieren': return handleTrainieren(interaction, userId);
      case 'auftrag': return handleAuftrag(interaction, userId);
      case 'wettbewerb': return handleWettbewerb(interaction, userId);
    }
  }
};

async function handleStatus(interaction, userId) {
  const b = getBildhauer(userId);
  const xpNeeded = getXpForLevel(b.level);
  const werkzeugBonus = getWerkzeugBonus(b);

  const embed = new EmbedBuilder()
    .setTitle('🗿 Bildhauer-Profil')
    .setColor(0x8B7355)
    .addFields(
      { name: '📊 Level', value: `${b.level} (${b.xp}/${xpNeeded} XP)`, inline: true },
      { name: '🎨 Kunstfertigkeit', value: `${b.kunstfertigkeit + werkzeugBonus}`, inline: true },
      { name: '⭐ Ruf', value: `${b.ruf}`, inline: true },
      { name: '🗿 Skulpturen', value: `${b.skulpturen_gesamt} (${b.meisterwerke} Meisterwerke)`, inline: true },
      { name: '🔨 Werkzeuge', value: [
        `Meißel: ${WERKZEUGE.meissel[b.meissel].name}`,
        `Hammer: ${WERKZEUGE.hammer[b.hammer].name}`,
        `Schleifer: ${WERKZEUGE.schleifer[b.schleifer].name}`,
        `Atelier: ${WERKZEUGE.atelier[b.atelier].name}`,
      ].join('\n') },
      { name: '📦 Materialien', value: [
        `${MATERIALIEN[0].emoji} Ton: ${b.ton} | ${MATERIALIEN[1].emoji} Sandstein: ${b.sandstein}`,
        `${MATERIALIEN[2].emoji} Kalkstein: ${b.kalkstein} | ${MATERIALIEN[3].emoji} Granit: ${b.granit}`,
        `${MATERIALIEN[4].emoji} Marmor: ${b.marmor} | ${MATERIALIEN[5].emoji} Jade: ${b.jade}`,
        `${MATERIALIEN[6].emoji} Obsidian: ${b.obsidian} | ${MATERIALIEN[7].emoji} Sternenmetall: ${b.sternenmetall}`,
      ].join('\n') },
    );
  return interaction.reply({ embeds: [embed] });
}

async function handleMaterialien(interaction, userId) {
  const b = getBildhauer(userId);
  const materialName = interaction.options.getString('material');
  const menge = interaction.options.getInteger('menge') || 1;

  if (!materialName) {
    const list = MATERIALIEN.map((m, i) =>
      `${m.emoji} **${i + 1}. ${m.name}** — ${m.preis} 🪙/Stk | Qualität: ${m.qualitaet}`
    ).join('\n');

    const embed = new EmbedBuilder()
      .setTitle('📦 Materialien')
      .setColor(0x8B7355)
      .setDescription(list);
    return interaction.reply({ embeds: [embed] });
  }

  const matIdx = MATERIALIEN.findIndex(m => m.name.toLowerCase() === materialName.toLowerCase());
  if (matIdx === -1) {
    return interaction.reply({ content: '❌ Unbekanntes Material! Nutze `/bildhauer materialien` für eine Liste.', ephemeral: true });
  }

  const mat = MATERIALIEN[matIdx];
  const kosten = mat.preis * menge;
  const balance = db.getBalance(userId);
  if (balance < kosten) {
    return interaction.reply({ content: `❌ Du brauchst ${kosten} 🪙 (hast: ${balance} 🪙).`, ephemeral: true });
  }

  const spalte = getMaterialSpalte(mat.name);
  db.updateBalance(userId, -kosten);
  db.db.prepare(`UPDATE bildhauer SET ${spalte} = ${spalte} + ? WHERE user_id = ?`).run(menge, userId);

  const embed = new EmbedBuilder()
    .setTitle('📦 Material gekauft!')
    .setColor(0x00AA00)
    .setDescription(`${mat.emoji} **${menge}x ${mat.name}** für ${kosten} 🪙 gekauft!`);
  return interaction.reply({ embeds: [embed] });
}

async function handleMeisseln(interaction, userId) {
  const cd = cooldowns.get(`sculpt_${userId}`);
  if (cd && Date.now() - cd < 60000) {
    const rest = Math.ceil((60000 - (Date.now() - cd)) / 1000);
    return interaction.reply({ content: `⏳ Du kannst in ${rest}s wieder meißeln.`, ephemeral: true });
  }

  const b = getBildhauer(userId);
  const typNr = interaction.options.getInteger('typ');
  const matNr = interaction.options.getInteger('material');

  if (typNr < 1 || typNr > SKULPTUR_TYPEN.length) {
    return interaction.reply({ content: `❌ Ungültiger Typ! Wähle 1-${SKULPTUR_TYPEN.length}.`, ephemeral: true });
  }
  if (matNr < 1 || matNr > MATERIALIEN.length) {
    return interaction.reply({ content: `❌ Ungültiges Material! Wähle 1-${MATERIALIEN.length}.`, ephemeral: true });
  }

  const typ = SKULPTUR_TYPEN[typNr - 1];
  const mat = MATERIALIEN[matNr - 1];

  const minLevel = Math.ceil(typ.schwierigkeit / 2);
  if (b.level < minLevel) {
    return interaction.reply({ content: `🔒 Du brauchst Level ${minLevel} für ${typ.name}!`, ephemeral: true });
  }

  const spalte = getMaterialSpalte(mat.name);
  const materialBedarf = Math.ceil(typ.zeitMult * 2);
  if (b[spalte] < materialBedarf) {
    return interaction.reply({ content: `❌ Du brauchst ${materialBedarf}x ${mat.name} (hast: ${b[spalte]}).`, ephemeral: true });
  }

  cooldowns.set(`sculpt_${userId}`, Date.now());

  db.db.prepare(`UPDATE bildhauer SET ${spalte} = ${spalte} - ? WHERE user_id = ?`).run(materialBedarf, userId);

  const ereignis = EREIGNISSE[Math.floor(Math.random() * EREIGNISSE.length)];
  const stil = STILE[Math.floor(Math.random() * STILE.length)];
  const werkzeugBonus = getWerkzeugBonus(b);
  const gesamtSkill = b.kunstfertigkeit + werkzeugBonus + b.level * 2;

  const basisQualitaet = mat.qualitaet * typ.wertMult;
  const qualitaet = Math.floor(basisQualitaet * (0.7 + (gesamtSkill / 100)) * ereignis.bonusMult);
  const wert = Math.floor(qualitaet * 50 * typ.wertMult);

  const istMeisterwerk = qualitaet > 50 && Math.random() < 0.1;
  const endWert = istMeisterwerk ? wert * 3 : wert;

  db.db.prepare('INSERT INTO skulpturen (user_id, name, typ, material, stil, qualitaet, wert) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(userId, `${stil}e ${typ.name}`, typ.name, mat.name, stil, qualitaet, endWert);

  const xpGewinn = Math.floor((10 + typ.schwierigkeit * 5) * ereignis.bonusMult);
  db.db.prepare(`UPDATE bildhauer SET xp = xp + ?, skulpturen_gesamt = skulpturen_gesamt + 1,
    meisterwerke = meisterwerke + ?, ruf = ruf + ? WHERE user_id = ?`)
    .run(xpGewinn, istMeisterwerk ? 1 : 0, Math.floor(qualitaet / 10), userId);

  const updated = getBildhauer(userId);
  const xpNeeded = getXpForLevel(updated.level);
  let levelUpText = '';
  if (updated.xp >= xpNeeded) {
    db.db.prepare('UPDATE bildhauer SET level = level + 1, xp = xp - ? WHERE user_id = ?').run(xpNeeded, userId);
    levelUpText = `\n🎉 **LEVEL UP!** Du bist jetzt Level ${updated.level + 1}!`;
  }

  const embed = new EmbedBuilder()
    .setTitle(`🗿 ${istMeisterwerk ? '⭐ MEISTERWERK! ⭐' : 'Skulptur erschaffen!'}`)
    .setColor(istMeisterwerk ? 0xFFD700 : 0x8B7355)
    .setDescription([
      `**${stil}e ${typ.name}**`,
      `${mat.emoji} Material: ${mat.name} | Stil: ${stil}`,
      `\n💫 *${ereignis.text}*`,
      `\n⭐ Qualität: ${qualitaet} | 💰 Wert: ${endWert} 🪙`,
      `📊 +${xpGewinn} XP | Verbraucht: ${materialBedarf}x ${mat.name}`,
      levelUpText,
    ].filter(Boolean).join('\n'));
  return interaction.reply({ embeds: [embed] });
}

async function handleGalerie(interaction, userId) {
  ensureBildhauerTable();
  const skulpturen = db.db.prepare('SELECT * FROM skulpturen WHERE user_id = ? ORDER BY wert DESC').all(userId);

  if (skulpturen.length === 0) {
    return interaction.reply({ content: '📭 Deine Galerie ist leer! Meißle deine erste Skulptur.', ephemeral: true });
  }

  const list = skulpturen.slice(0, 12).map((s, i) =>
    `**${i + 1}.** ${s.name} — ${s.material} | Q:${s.qualitaet} | ${s.wert} 🪙`
  ).join('\n');

  const gesamtWert = skulpturen.reduce((sum, s) => sum + s.wert, 0);

  const embed = new EmbedBuilder()
    .setTitle('🏛️ Deine Galerie')
    .setColor(0x8B7355)
    .setDescription(list)
    .setFooter({ text: `${skulpturen.length} Skulpturen | Gesamtwert: ${gesamtWert} 🪙` });
  return interaction.reply({ embeds: [embed] });
}

async function handleVerkaufen(interaction, userId) {
  ensureBildhauerTable();
  const skulpturen = db.db.prepare('SELECT * FROM skulpturen WHERE user_id = ?').all(userId);

  if (skulpturen.length === 0) {
    return interaction.reply({ content: '❌ Du hast keine Skulpturen zum Verkaufen!', ephemeral: true });
  }

  const kunde = KUNDEN[Math.floor(Math.random() * KUNDEN.length)];
  let gesamtWert = 0;
  const verkauft = [];

  for (const s of skulpturen) {
    const preis = Math.floor(s.wert * kunde.mult);
    gesamtWert += preis;
    verkauft.push(`${s.name} — ${preis} 🪙`);
  }

  db.updateBalance(userId, gesamtWert);
  db.db.prepare('DELETE FROM skulpturen WHERE user_id = ?').run(userId);
  db.db.prepare('UPDATE bildhauer SET ruf = ruf + ? WHERE user_id = ?').run(skulpturen.length * 2, userId);

  const embed = new EmbedBuilder()
    .setTitle('💰 Skulpturen verkauft!')
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

async function handleWerkzeuge(interaction, userId) {
  const b = getBildhauer(userId);
  const typ = interaction.options.getString('typ');
  const stufe = interaction.options.getInteger('stufe');

  if (!typ || !stufe) {
    const list = Object.entries(WERKZEUGE).map(([key, items]) => {
      const current = b[key];
      return `**${key}:** ${items.map((item, i) =>
        `${i === current ? '▶️' : '⬜'} ${item.name} (+${item.bonus})`
      ).join(' → ')}`;
    }).join('\n\n');

    const embed = new EmbedBuilder()
      .setTitle('🔨 Werkzeuge')
      .setColor(0x8B7355)
      .setDescription(list);
    return interaction.reply({ embeds: [embed] });
  }

  const typLower = typ.toLowerCase();
  if (!WERKZEUGE[typLower]) {
    return interaction.reply({ content: '❌ Ungültiger Typ! Wähle: meissel, hammer, schleifer oder atelier.', ephemeral: true });
  }

  if (stufe < 2 || stufe > WERKZEUGE[typLower].length) {
    return interaction.reply({ content: `❌ Ungültige Stufe! Wähle 2-${WERKZEUGE[typLower].length}.`, ephemeral: true });
  }

  const idx = stufe - 1;
  if (b[typLower] >= idx) {
    return interaction.reply({ content: '❌ Du hast bereits dieses oder ein besseres Werkzeug!', ephemeral: true });
  }
  if (b[typLower] < idx - 1) {
    return interaction.reply({ content: '❌ Du musst zuerst die vorherige Stufe kaufen!', ephemeral: true });
  }

  const item = WERKZEUGE[typLower][idx];
  const balance = db.getBalance(userId);
  if (balance < item.preis) {
    return interaction.reply({ content: `❌ Du brauchst ${item.preis} 🪙 (hast: ${balance} 🪙).`, ephemeral: true });
  }

  db.updateBalance(userId, -item.preis);
  db.db.prepare(`UPDATE bildhauer SET ${typLower} = ? WHERE user_id = ?`).run(idx, userId);

  const embed = new EmbedBuilder()
    .setTitle('🔨 Werkzeug aufgerüstet!')
    .setColor(0x00AA00)
    .setDescription(`**${item.name}** für ${item.preis} 🪙 gekauft!\n+${item.bonus} Kunstfertigkeit`);
  return interaction.reply({ embeds: [embed] });
}

async function handleTrainieren(interaction, userId) {
  const skill = interaction.options.getString('skill').toLowerCase();
  if (skill !== 'kunstfertigkeit') {
    return interaction.reply({ content: '❌ Ungültiger Skill! Verfügbar: `kunstfertigkeit`', ephemeral: true });
  }

  const cd = cooldowns.get(`train_${userId}`);
  if (cd && Date.now() - cd < 60000) {
    const rest = Math.ceil((60000 - (Date.now() - cd)) / 1000);
    return interaction.reply({ content: `⏳ Du kannst in ${rest}s wieder trainieren.`, ephemeral: true });
  }

  const b = getBildhauer(userId);
  const kosten = 300 + (b.level * 80);
  const balance = db.getBalance(userId);
  if (balance < kosten) {
    return interaction.reply({ content: `❌ Training kostet ${kosten} 🪙 (hast: ${balance} 🪙).`, ephemeral: true });
  }

  cooldowns.set(`train_${userId}`, Date.now());
  db.updateBalance(userId, -kosten);

  const gewinn = Math.floor(Math.random() * 3) + 1;
  const xpGewinn = 15 + Math.floor(Math.random() * 10);
  db.db.prepare('UPDATE bildhauer SET kunstfertigkeit = kunstfertigkeit + ?, xp = xp + ? WHERE user_id = ?')
    .run(gewinn, xpGewinn, userId);

  const updated = getBildhauer(userId);
  const xpNeeded = getXpForLevel(updated.level);
  let levelUpText = '';
  if (updated.xp >= xpNeeded) {
    db.db.prepare('UPDATE bildhauer SET level = level + 1, xp = xp - ? WHERE user_id = ?').run(xpNeeded, userId);
    levelUpText = `\n🎉 **LEVEL UP!** Level ${updated.level + 1}!`;
  }

  const embed = new EmbedBuilder()
    .setTitle('🎨 Training abgeschlossen!')
    .setColor(0x3498DB)
    .setDescription(`Kunstfertigkeit +${gewinn}!\n📊 +${xpGewinn} XP | -${kosten} 🪙${levelUpText}`);
  return interaction.reply({ embeds: [embed] });
}

async function handleAuftrag(interaction, userId) {
  const b = getBildhauer(userId);
  if (b.level < 2) {
    return interaction.reply({ content: '🔒 Aufträge sind ab Level 2 verfügbar!', ephemeral: true });
  }

  const cd = cooldowns.get(`auftrag_${userId}`);
  if (cd && Date.now() - cd < 90000) {
    const rest = Math.ceil((90000 - (Date.now() - cd)) / 1000);
    return interaction.reply({ content: `⏳ Nächster Auftrag in ${rest}s verfügbar.`, ephemeral: true });
  }

  cooldowns.set(`auftrag_${userId}`, Date.now());

  const kunde = KUNDEN[Math.floor(Math.random() * KUNDEN.length)];
  const schwierigkeit = Math.min(b.level, 8);
  const werkzeugBonus = getWerkzeugBonus(b);
  const gesamtSkill = b.kunstfertigkeit + werkzeugBonus;

  const erfolgChance = Math.min(0.85, 0.4 + (gesamtSkill / 200));
  const erfolg = Math.random() < erfolgChance;

  if (!erfolg) {
    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setTitle('📋 Auftrag gescheitert')
        .setColor(0xCC0000)
        .setDescription(`${kunde.name} war mit deiner Arbeit nicht zufrieden.\nTrainiere weiter!`)
      ]
    });
  }

  const belohnung = Math.floor((200 + schwierigkeit * 150) * kunde.mult);
  const xpGewinn = 20 + schwierigkeit * 5;
  db.updateBalance(userId, belohnung);
  db.db.prepare('UPDATE bildhauer SET xp = xp + ?, ruf = ruf + ? WHERE user_id = ?')
    .run(xpGewinn, schwierigkeit, userId);

  const embed = new EmbedBuilder()
    .setTitle('📋 Auftrag abgeschlossen!')
    .setColor(0x00AA00)
    .setDescription([
      `**Auftraggeber:** ${kunde.name}`,
      `**Schwierigkeit:** ${'⭐'.repeat(schwierigkeit)}`,
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

  const b1 = getBildhauer(userId);
  const b2 = getBildhauer(gegner.id);

  const skill1 = b1.kunstfertigkeit + getWerkzeugBonus(b1);
  const skill2 = b2.kunstfertigkeit + getWerkzeugBonus(b2);

  const score1 = skill1 + b1.level * 5 + b1.skulpturen_gesamt * 2 + Math.floor(Math.random() * 40);
  const score2 = skill2 + b2.level * 5 + b2.skulpturen_gesamt * 2 + Math.floor(Math.random() * 40);

  const gewinner = score1 >= score2 ? userId : gegner.id;
  const preis = 300 + Math.floor(Math.random() * 500);

  db.updateBalance(gewinner, preis);
  db.db.prepare('UPDATE bildhauer SET ruf = ruf + 5, xp = xp + 15 WHERE user_id = ?').run(gewinner);

  const embed = new EmbedBuilder()
    .setTitle('🏆 Bildhauer-Wettbewerb!')
    .setColor(0xFFD700)
    .setDescription([
      `**${interaction.user.username}:** ${score1} Punkte`,
      `**${gegner.username}:** ${score2} Punkte`,
      '',
      `🥇 **${gewinner === userId ? interaction.user.username : gegner.username}** gewinnt ${preis} 🪙 und +5 Ruf!`,
    ].join('\n'));
  return interaction.reply({ embeds: [embed] });
}
