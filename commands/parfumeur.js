const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

const cooldowns = new Map();

const ESSENZEN = [
  { name: 'Lavendel', preis: 100, note: 'Herz', intensitaet: 2, emoji: '💜' },
  { name: 'Rose', preis: 250, note: 'Herz', intensitaet: 4, emoji: '🌹' },
  { name: 'Zitrone', preis: 80, note: 'Kopf', intensitaet: 2, emoji: '🍋' },
  { name: 'Vanille', preis: 300, note: 'Basis', intensitaet: 5, emoji: '🟡' },
  { name: 'Sandelholz', preis: 500, note: 'Basis', intensitaet: 6, emoji: '🪵' },
  { name: 'Jasmin', preis: 600, note: 'Herz', intensitaet: 7, emoji: '🤍' },
  { name: 'Bergamotte', preis: 400, note: 'Kopf', intensitaet: 5, emoji: '🍊' },
  { name: 'Moschus', preis: 800, note: 'Basis', intensitaet: 8, emoji: '🟤' },
  { name: 'Oud', preis: 1500, note: 'Basis', intensitaet: 12, emoji: '🖤' },
  { name: 'Iris', preis: 1200, note: 'Herz', intensitaet: 10, emoji: '💙' },
  { name: 'Amber', preis: 2000, note: 'Basis', intensitaet: 14, emoji: '🔶' },
  { name: 'Sternenblüte', preis: 5000, note: 'Kopf', intensitaet: 20, emoji: '✨' },
];

const PARFUM_KATEGORIEN = [
  { name: 'Eau Légère', minQ: 0, wertMult: 1.0 },
  { name: 'Eau de Cologne', minQ: 15, wertMult: 1.5 },
  { name: 'Eau de Toilette', minQ: 30, wertMult: 2.0 },
  { name: 'Eau de Parfum', minQ: 50, wertMult: 3.0 },
  { name: 'Parfum', minQ: 70, wertMult: 4.5 },
  { name: 'Extrait de Parfum', minQ: 90, wertMult: 7.0 },
  { name: 'Absolue', minQ: 120, wertMult: 12.0 },
];

const REZEPTE = [
  { name: 'Frühlingsbrise', minLevel: 1, essenzen: { lavendel: 2, zitrone: 2 }, wert: 400, xp: 12 },
  { name: 'Rosentraum', minLevel: 2, essenzen: { rose: 3, vanille: 1 }, wert: 1000, xp: 20 },
  { name: 'Orientnacht', minLevel: 3, essenzen: { sandelholz: 2, vanille: 2, bergamotte: 1 }, wert: 2200, xp: 35 },
  { name: 'Jardin Secret', minLevel: 4, essenzen: { jasmin: 3, rose: 2, zitrone: 1 }, wert: 3800, xp: 50 },
  { name: 'Midnight Oud', minLevel: 5, essenzen: { oud: 2, moschus: 2, sandelholz: 1 }, wert: 6000, xp: 70 },
  { name: 'Iris Royale', minLevel: 7, essenzen: { iris: 3, jasmin: 2, amber: 1 }, wert: 10000, xp: 100 },
  { name: 'Ambrosia', minLevel: 9, essenzen: { amber: 3, oud: 2, iris: 2, rose: 1 }, wert: 18000, xp: 150 },
  { name: 'Essenz der Sterne', minLevel: 12, essenzen: { sternenblüte: 3, amber: 2, oud: 2, iris: 2 }, wert: 45000, xp: 300 },
];

const UPGRADES = {
  destille: [
    { name: 'Kupfer-Destille', bonus: 0, preis: 0 },
    { name: 'Silber-Destille', bonus: 5, preis: 4000 },
    { name: 'Gold-Destille', bonus: 13, preis: 15000 },
    { name: 'Kristall-Destille', bonus: 26, preis: 42000 },
  ],
  labor: [
    { name: 'Küchentisch', bonus: 0, preis: 0 },
    { name: 'Duftlabor', bonus: 5, preis: 3500 },
    { name: 'Parfümerie', bonus: 12, preis: 13000 },
    { name: 'Meister-Atelier', bonus: 25, preis: 38000 },
  ],
  flakons: [
    { name: 'Glasflasche', bonus: 0, preis: 0 },
    { name: 'Kristallflakon', bonus: 4, preis: 2500 },
    { name: 'Silberflakon', bonus: 10, preis: 9000 },
    { name: 'Diamantflakon', bonus: 22, preis: 30000 },
  ],
  nase: [
    { name: 'Anfänger-Nase', bonus: 0, preis: 0 },
    { name: 'Geschulte Nase', bonus: 4, preis: 3000 },
    { name: 'Experten-Nase', bonus: 10, preis: 10000 },
    { name: 'Meister-Nase', bonus: 22, preis: 32000 },
  ],
};

const KUNDEN = [
  { name: 'Marktstand', mult: 1.0 },
  { name: 'Boutique', mult: 1.2 },
  { name: 'Parfümerie', mult: 1.3 },
  { name: 'Adelsdame', mult: 1.5 },
  { name: 'Modeschöpfer', mult: 1.4 },
  { name: 'Königin', mult: 1.8 },
  { name: 'Auktionshaus', mult: 1.6 },
  { name: 'Duft-Sammler', mult: 2.0 },
];

const EREIGNISSE = [
  { text: 'Die Essenzen harmonieren perfekt!', bonusMult: 1.5 },
  { text: 'Ein Hauch von Inspiration durchströmt dich!', bonusMult: 1.4 },
  { text: 'Die Destillation überhitzt — leichter Qualitätsverlust.', bonusMult: 0.7 },
  { text: 'Du entdeckst eine einzigartige Duftnote!', bonusMult: 1.7 },
  { text: 'Die Mischung riecht etwas unausgewogen.', bonusMult: 0.8 },
  { text: 'Perfekte Temperatur für die Extraktion!', bonusMult: 1.3 },
  { text: 'Ein Meister-Parfümeur teilt einen Geheimtipp!', bonusMult: 1.6 },
  { text: 'Routine-Kreation ohne Überraschungen.', bonusMult: 1.0 },
  { text: 'Die Blüten sind heute besonders aromatisch!', bonusMult: 1.2 },
  { text: 'Feuchtigkeit beeinträchtigt die Reifung.', bonusMult: 0.75 },
];

function ensureParfumeurTable() {
  db.db.exec(`CREATE TABLE IF NOT EXISTS parfumeure (
    user_id TEXT PRIMARY KEY,
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    duftkenntnis INTEGER DEFAULT 10,
    parfums_gesamt INTEGER DEFAULT 0,
    meisterduft INTEGER DEFAULT 0,
    destille INTEGER DEFAULT 0,
    labor INTEGER DEFAULT 0,
    flakons INTEGER DEFAULT 0,
    nase INTEGER DEFAULT 0,
    lavendel INTEGER DEFAULT 3,
    rose INTEGER DEFAULT 0,
    zitrone INTEGER DEFAULT 3,
    vanille INTEGER DEFAULT 0,
    sandelholz INTEGER DEFAULT 0,
    jasmin INTEGER DEFAULT 0,
    bergamotte INTEGER DEFAULT 0,
    moschus INTEGER DEFAULT 0,
    oud INTEGER DEFAULT 0,
    iris INTEGER DEFAULT 0,
    amber INTEGER DEFAULT 0,
    sternenbluete INTEGER DEFAULT 0,
    ruf INTEGER DEFAULT 0,
    last_create TEXT
  )`);
  db.db.exec(`CREATE TABLE IF NOT EXISTS parfum_kollektion (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    name TEXT,
    kategorie TEXT,
    qualitaet INTEGER,
    wert INTEGER,
    erstellt_am TEXT DEFAULT (datetime('now'))
  )`);
}

const ESSENZ_SPALTEN = {
  'lavendel': 'lavendel', 'rose': 'rose', 'zitrone': 'zitrone',
  'vanille': 'vanille', 'sandelholz': 'sandelholz', 'jasmin': 'jasmin',
  'bergamotte': 'bergamotte', 'moschus': 'moschus', 'oud': 'oud',
  'iris': 'iris', 'amber': 'amber', 'sternenblüte': 'sternenbluete',
};

function getParfumeur(userId) {
  ensureParfumeurTable();
  let p = db.db.prepare('SELECT * FROM parfumeure WHERE user_id = ?').get(userId);
  if (!p) {
    db.db.prepare('INSERT INTO parfumeure (user_id) VALUES (?)').run(userId);
    p = db.db.prepare('SELECT * FROM parfumeure WHERE user_id = ?').get(userId);
  }
  return p;
}

function getXpForLevel(level) {
  return Math.floor(115 * Math.pow(1.45, level - 1));
}

function getUpgradeBonus(p) {
  return UPGRADES.destille[p.destille].bonus +
    UPGRADES.labor[p.labor].bonus +
    UPGRADES.flakons[p.flakons].bonus +
    UPGRADES.nase[p.nase].bonus;
}

function bestimmeKategorie(qualitaet) {
  let kat = PARFUM_KATEGORIEN[0];
  for (const k of PARFUM_KATEGORIEN) {
    if (qualitaet >= k.minQ) kat = k;
  }
  return kat;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('parfumeur')
    .setDescription('🌸 Werde Parfümeur und kreiere edle Düfte!')
    .addSubcommand(s => s.setName('status').setDescription('Zeige dein Parfümeur-Profil'))
    .addSubcommand(s => s.setName('essenzen').setDescription('Kaufe Duftessenzen')
      .addStringOption(o => o.setName('essenz').setDescription('Essenzname'))
      .addIntegerOption(o => o.setName('menge').setDescription('Menge')))
    .addSubcommand(s => s.setName('rezepte').setDescription('Zeige alle Parfum-Rezepte'))
    .addSubcommand(s => s.setName('kreieren').setDescription('Kreiere ein Parfum')
      .addIntegerOption(o => o.setName('rezept').setDescription('Rezeptnummer (1-8)').setRequired(true)))
    .addSubcommand(s => s.setName('kollektion').setDescription('Zeige deine Parfum-Kollektion'))
    .addSubcommand(s => s.setName('verkaufen').setDescription('Verkaufe deine Parfums'))
    .addSubcommand(s => s.setName('upgrade').setDescription('Verbessere deine Ausstattung')
      .addStringOption(o => o.setName('typ').setDescription('destille/labor/flakons/nase').setRequired(true))
      .addIntegerOption(o => o.setName('stufe').setDescription('Stufe (2-4)').setRequired(true)))
    .addSubcommand(s => s.setName('trainieren').setDescription('Trainiere deine Duftkenntnis')
      .addStringOption(o => o.setName('skill').setDescription('duftkenntnis').setRequired(true)))
    .addSubcommand(s => s.setName('auftrag').setDescription('Nimm einen Duft-Auftrag an'))
    .addSubcommand(s => s.setName('wettbewerb').setDescription('PvP Parfum-Wettbewerb')
      .addUserOption(o => o.setName('gegner').setDescription('Dein Gegner').setRequired(true))),

  async execute(interaction) {
    const config = require('../config.json');
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    switch (sub) {
      case 'status': return handleStatus(interaction, userId);
      case 'essenzen': return handleEssenzen(interaction, userId);
      case 'rezepte': return handleRezepte(interaction, userId);
      case 'kreieren': return handleKreieren(interaction, userId);
      case 'kollektion': return handleKollektion(interaction, userId);
      case 'verkaufen': return handleVerkaufen(interaction, userId);
      case 'upgrade': return handleUpgrade(interaction, userId);
      case 'trainieren': return handleTrainieren(interaction, userId);
      case 'auftrag': return handleAuftrag(interaction, userId);
      case 'wettbewerb': return handleWettbewerb(interaction, userId);
    }
  }
};

async function handleStatus(interaction, userId) {
  const p = getParfumeur(userId);
  const xpNeeded = getXpForLevel(p.level);
  const bonus = getUpgradeBonus(p);

  const embed = new EmbedBuilder()
    .setTitle('🌸 Parfümeur-Profil')
    .setColor(0xE8A2C0)
    .addFields(
      { name: '📊 Level', value: `${p.level} (${p.xp}/${xpNeeded} XP)`, inline: true },
      { name: '👃 Duftkenntnis', value: `${p.duftkenntnis + bonus}`, inline: true },
      { name: '⭐ Ruf', value: `${p.ruf}`, inline: true },
      { name: '🌸 Parfums', value: `${p.parfums_gesamt} (${p.meisterduft} Meisterdüfte)`, inline: true },
      { name: '⚗️ Ausstattung', value: [
        `Destille: ${UPGRADES.destille[p.destille].name}`,
        `Labor: ${UPGRADES.labor[p.labor].name}`,
        `Flakons: ${UPGRADES.flakons[p.flakons].name}`,
        `Nase: ${UPGRADES.nase[p.nase].name}`,
      ].join('\n') },
      { name: '🧪 Essenzen', value: [
        `💜 Lavendel: ${p.lavendel} | 🌹 Rose: ${p.rose} | 🍋 Zitrone: ${p.zitrone}`,
        `🟡 Vanille: ${p.vanille} | 🪵 Sandelholz: ${p.sandelholz} | 🤍 Jasmin: ${p.jasmin}`,
        `🍊 Bergamotte: ${p.bergamotte} | 🟤 Moschus: ${p.moschus} | 🖤 Oud: ${p.oud}`,
        `💙 Iris: ${p.iris} | 🔶 Amber: ${p.amber} | ✨ Sternenblüte: ${p.sternenbluete}`,
      ].join('\n') },
    );
  return interaction.reply({ embeds: [embed] });
}

async function handleEssenzen(interaction, userId) {
  const p = getParfumeur(userId);
  const essenzName = interaction.options.getString('essenz');
  const menge = interaction.options.getInteger('menge') || 1;

  if (!essenzName) {
    const list = ESSENZEN.map((e, i) =>
      `${e.emoji} **${i + 1}. ${e.name}** — ${e.preis} 🪙 | ${e.note}-Note | Intensität: ${e.intensitaet}`
    ).join('\n');

    const embed = new EmbedBuilder()
      .setTitle('🧪 Essenzen')
      .setColor(0xE8A2C0)
      .setDescription(list);
    return interaction.reply({ embeds: [embed] });
  }

  const essenz = ESSENZEN.find(e => e.name.toLowerCase() === essenzName.toLowerCase());
  if (!essenz) {
    return interaction.reply({ content: '❌ Unbekannte Essenz! Nutze `/parfumeur essenzen` für eine Liste.', ephemeral: true });
  }

  const kosten = essenz.preis * menge;
  const balance = db.getBalance(userId);
  if (balance < kosten) {
    return interaction.reply({ content: `❌ Du brauchst ${kosten} 🪙 (hast: ${balance} 🪙).`, ephemeral: true });
  }

  const spalte = ESSENZ_SPALTEN[essenz.name.toLowerCase()];
  db.updateBalance(userId, -kosten);
  db.db.prepare(`UPDATE parfumeure SET ${spalte} = ${spalte} + ? WHERE user_id = ?`).run(menge, userId);

  const embed = new EmbedBuilder()
    .setTitle('🧪 Essenzen gekauft!')
    .setColor(0x00AA00)
    .setDescription(`${essenz.emoji} **${menge}x ${essenz.name}** für ${kosten} 🪙!`);
  return interaction.reply({ embeds: [embed] });
}

async function handleRezepte(interaction, userId) {
  const p = getParfumeur(userId);

  const list = REZEPTE.map((r, i) => {
    const unlocked = p.level >= r.minLevel;
    const teile = Object.entries(r.essenzen).map(([k, v]) => `${v}x ${k}`).join(', ');
    return `${unlocked ? '✅' : '🔒'} **${i + 1}. ${r.name}** — Lv.${r.minLevel} | ${r.wert} 🪙\n   Essenzen: ${teile}`;
  }).join('\n');

  const embed = new EmbedBuilder()
    .setTitle('📋 Parfum-Rezepte')
    .setColor(0xE8A2C0)
    .setDescription(list)
    .setFooter({ text: `Dein Level: ${p.level}` });
  return interaction.reply({ embeds: [embed] });
}

async function handleKreieren(interaction, userId) {
  const cd = cooldowns.get(`create_${userId}`);
  if (cd && Date.now() - cd < 50000) {
    const rest = Math.ceil((50000 - (Date.now() - cd)) / 1000);
    return interaction.reply({ content: `⏳ Du kannst in ${rest}s wieder kreieren.`, ephemeral: true });
  }

  const p = getParfumeur(userId);
  const rezeptNr = interaction.options.getInteger('rezept');

  if (rezeptNr < 1 || rezeptNr > REZEPTE.length) {
    return interaction.reply({ content: `❌ Ungültiges Rezept! Wähle 1-${REZEPTE.length}.`, ephemeral: true });
  }

  const rezept = REZEPTE[rezeptNr - 1];
  if (p.level < rezept.minLevel) {
    return interaction.reply({ content: `🔒 Du brauchst Level ${rezept.minLevel} für ${rezept.name}!`, ephemeral: true });
  }

  for (const [essenz, bedarf] of Object.entries(rezept.essenzen)) {
    const spalte = ESSENZ_SPALTEN[essenz];
    if (p[spalte] < bedarf) {
      return interaction.reply({ content: `❌ Du brauchst ${bedarf}x ${essenz} (hast: ${p[spalte]}).`, ephemeral: true });
    }
  }

  cooldowns.set(`create_${userId}`, Date.now());

  for (const [essenz, bedarf] of Object.entries(rezept.essenzen)) {
    const spalte = ESSENZ_SPALTEN[essenz];
    db.db.prepare(`UPDATE parfumeure SET ${spalte} = ${spalte} - ? WHERE user_id = ?`).run(bedarf, userId);
  }

  const ereignis = EREIGNISSE[Math.floor(Math.random() * EREIGNISSE.length)];
  const bonus = getUpgradeBonus(p);
  const gesamtSkill = p.duftkenntnis + bonus + p.level * 3;

  const qualitaet = Math.floor((20 + gesamtSkill * 0.8) * ereignis.bonusMult);
  const kategorie = bestimmeKategorie(qualitaet);
  const wert = Math.floor(rezept.wert * kategorie.wertMult);

  const istMeisterduft = qualitaet >= 100 && Math.random() < 0.12;
  const endWert = istMeisterduft ? wert * 3 : wert;

  db.db.prepare('INSERT INTO parfum_kollektion (user_id, name, kategorie, qualitaet, wert) VALUES (?, ?, ?, ?, ?)')
    .run(userId, rezept.name, kategorie.name, qualitaet, endWert);

  const xpGewinn = Math.floor(rezept.xp * ereignis.bonusMult);
  db.db.prepare(`UPDATE parfumeure SET xp = xp + ?, parfums_gesamt = parfums_gesamt + 1,
    meisterduft = meisterduft + ?, ruf = ruf + ? WHERE user_id = ?`)
    .run(xpGewinn, istMeisterduft ? 1 : 0, Math.floor(qualitaet / 12) + 1, userId);

  const updated = getParfumeur(userId);
  const xpNeeded = getXpForLevel(updated.level);
  let levelUpText = '';
  if (updated.xp >= xpNeeded) {
    db.db.prepare('UPDATE parfumeure SET level = level + 1, xp = xp - ? WHERE user_id = ?').run(xpNeeded, userId);
    levelUpText = `\n🎉 **LEVEL UP!** Level ${updated.level + 1}!`;
  }

  const embed = new EmbedBuilder()
    .setTitle(`🌸 ${istMeisterduft ? '⭐ MEISTERDUFT! ⭐' : 'Parfum kreiert!'}`)
    .setColor(istMeisterduft ? 0xFFD700 : 0xE8A2C0)
    .setDescription([
      `**${rezept.name}**`,
      `Kategorie: ${kategorie.name} | Qualität: ${qualitaet}`,
      `\n💫 *${ereignis.text}*`,
      `\n💰 Wert: ${endWert} 🪙 | 📊 +${xpGewinn} XP`,
      levelUpText,
    ].filter(Boolean).join('\n'));
  return interaction.reply({ embeds: [embed] });
}

async function handleKollektion(interaction, userId) {
  ensureParfumeurTable();
  const parfums = db.db.prepare('SELECT * FROM parfum_kollektion WHERE user_id = ? ORDER BY wert DESC').all(userId);

  if (parfums.length === 0) {
    return interaction.reply({ content: '📭 Deine Kollektion ist leer! Kreiere dein erstes Parfum.', ephemeral: true });
  }

  const list = parfums.slice(0, 12).map((p, i) =>
    `**${i + 1}.** ${p.name} — ${p.kategorie} (Q:${p.qualitaet}) | ${p.wert} 🪙`
  ).join('\n');

  const gesamtWert = parfums.reduce((sum, p) => sum + p.wert, 0);

  const embed = new EmbedBuilder()
    .setTitle('🏛️ Parfum-Kollektion')
    .setColor(0xE8A2C0)
    .setDescription(list)
    .setFooter({ text: `${parfums.length} Parfums | Gesamtwert: ${gesamtWert} 🪙` });
  return interaction.reply({ embeds: [embed] });
}

async function handleVerkaufen(interaction, userId) {
  ensureParfumeurTable();
  const parfums = db.db.prepare('SELECT * FROM parfum_kollektion WHERE user_id = ?').all(userId);

  if (parfums.length === 0) {
    return interaction.reply({ content: '❌ Du hast keine Parfums zum Verkaufen!', ephemeral: true });
  }

  const kunde = KUNDEN[Math.floor(Math.random() * KUNDEN.length)];
  let gesamtWert = 0;
  const verkauft = [];

  for (const p of parfums) {
    const preis = Math.floor(p.wert * kunde.mult);
    gesamtWert += preis;
    verkauft.push(`${p.name} (${p.kategorie}) — ${preis} 🪙`);
  }

  db.updateBalance(userId, gesamtWert);
  db.db.prepare('DELETE FROM parfum_kollektion WHERE user_id = ?').run(userId);
  db.db.prepare('UPDATE parfumeure SET ruf = ruf + ? WHERE user_id = ?').run(parfums.length * 2, userId);

  const embed = new EmbedBuilder()
    .setTitle('💰 Parfums verkauft!')
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
  const p = getParfumeur(userId);
  const typ = interaction.options.getString('typ').toLowerCase();
  const stufe = interaction.options.getInteger('stufe');

  if (!UPGRADES[typ]) {
    return interaction.reply({ content: '❌ Ungültiger Typ! Wähle: destille, labor, flakons oder nase.', ephemeral: true });
  }
  if (stufe < 2 || stufe > UPGRADES[typ].length) {
    return interaction.reply({ content: `❌ Ungültige Stufe! Wähle 2-${UPGRADES[typ].length}.`, ephemeral: true });
  }

  const idx = stufe - 1;
  if (p[typ] >= idx) {
    return interaction.reply({ content: '❌ Du hast bereits dieses oder ein besseres Upgrade!', ephemeral: true });
  }
  if (p[typ] < idx - 1) {
    return interaction.reply({ content: '❌ Du musst zuerst die vorherige Stufe kaufen!', ephemeral: true });
  }

  const item = UPGRADES[typ][idx];
  const balance = db.getBalance(userId);
  if (balance < item.preis) {
    return interaction.reply({ content: `❌ Du brauchst ${item.preis} 🪙 (hast: ${balance} 🪙).`, ephemeral: true });
  }

  db.updateBalance(userId, -item.preis);
  db.db.prepare(`UPDATE parfumeure SET ${typ} = ? WHERE user_id = ?`).run(idx, userId);

  const embed = new EmbedBuilder()
    .setTitle('⬆️ Upgrade gekauft!')
    .setColor(0x00AA00)
    .setDescription(`**${item.name}** für ${item.preis} 🪙!\n+${item.bonus} Duftkenntnis`);
  return interaction.reply({ embeds: [embed] });
}

async function handleTrainieren(interaction, userId) {
  const skill = interaction.options.getString('skill').toLowerCase();
  if (skill !== 'duftkenntnis') {
    return interaction.reply({ content: '❌ Ungültiger Skill! Verfügbar: `duftkenntnis`', ephemeral: true });
  }

  const cd = cooldowns.get(`train_${userId}`);
  if (cd && Date.now() - cd < 60000) {
    const rest = Math.ceil((60000 - (Date.now() - cd)) / 1000);
    return interaction.reply({ content: `⏳ Du kannst in ${rest}s wieder trainieren.`, ephemeral: true });
  }

  const p = getParfumeur(userId);
  const kosten = 300 + (p.level * 75);
  const balance = db.getBalance(userId);
  if (balance < kosten) {
    return interaction.reply({ content: `❌ Training kostet ${kosten} 🪙 (hast: ${balance} 🪙).`, ephemeral: true });
  }

  cooldowns.set(`train_${userId}`, Date.now());
  db.updateBalance(userId, -kosten);

  const gewinn = Math.floor(Math.random() * 3) + 1;
  const xpGewinn = 14 + Math.floor(Math.random() * 12);
  db.db.prepare('UPDATE parfumeure SET duftkenntnis = duftkenntnis + ?, xp = xp + ? WHERE user_id = ?')
    .run(gewinn, xpGewinn, userId);

  const embed = new EmbedBuilder()
    .setTitle('👃 Training abgeschlossen!')
    .setColor(0x3498DB)
    .setDescription(`Duftkenntnis +${gewinn}!\n📊 +${xpGewinn} XP | -${kosten} 🪙`);
  return interaction.reply({ embeds: [embed] });
}

async function handleAuftrag(interaction, userId) {
  const p = getParfumeur(userId);
  if (p.level < 2) {
    return interaction.reply({ content: '🔒 Aufträge sind ab Level 2 verfügbar!', ephemeral: true });
  }

  const cd = cooldowns.get(`auftrag_${userId}`);
  if (cd && Date.now() - cd < 90000) {
    const rest = Math.ceil((90000 - (Date.now() - cd)) / 1000);
    return interaction.reply({ content: `⏳ Nächster Auftrag in ${rest}s.`, ephemeral: true });
  }

  cooldowns.set(`auftrag_${userId}`, Date.now());

  const kunde = KUNDEN[Math.floor(Math.random() * KUNDEN.length)];
  const schwierigkeit = Math.min(p.level, 10);
  const bonus = getUpgradeBonus(p);
  const gesamtSkill = p.duftkenntnis + bonus;

  const erfolgChance = Math.min(0.85, 0.35 + (gesamtSkill / 170));
  const erfolg = Math.random() < erfolgChance;

  if (!erfolg) {
    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setTitle('📋 Auftrag gescheitert')
        .setColor(0xCC0000)
        .setDescription(`${kunde.name} war mit deinem Duft nicht zufrieden.\nVerbessere deine Duftkenntnis!`)
      ]
    });
  }

  const belohnung = Math.floor((250 + schwierigkeit * 130) * kunde.mult);
  const xpGewinn = 18 + schwierigkeit * 4;
  db.updateBalance(userId, belohnung);
  db.db.prepare('UPDATE parfumeure SET xp = xp + ?, ruf = ruf + ? WHERE user_id = ?')
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

  const p1 = getParfumeur(userId);
  const p2 = getParfumeur(gegner.id);

  const skill1 = p1.duftkenntnis + getUpgradeBonus(p1) + p1.level * 5;
  const skill2 = p2.duftkenntnis + getUpgradeBonus(p2) + p2.level * 5;

  const score1 = skill1 + p1.parfums_gesamt * 2 + p1.meisterduft * 10 + Math.floor(Math.random() * 40);
  const score2 = skill2 + p2.parfums_gesamt * 2 + p2.meisterduft * 10 + Math.floor(Math.random() * 40);

  const gewinner = score1 >= score2 ? userId : gegner.id;
  const preis = 400 + Math.floor(Math.random() * 500);

  db.updateBalance(gewinner, preis);
  db.db.prepare('UPDATE parfumeure SET ruf = ruf + 5, xp = xp + 15 WHERE user_id = ?').run(gewinner);

  const embed = new EmbedBuilder()
    .setTitle('🏆 Parfum-Wettbewerb!')
    .setColor(0xFFD700)
    .setDescription([
      `**${interaction.user.username}:** ${score1} Punkte`,
      `**${gegner.username}:** ${score2} Punkte`,
      '',
      `🥇 **${gewinner === userId ? interaction.user.username : gegner.username}** gewinnt ${preis} 🪙 und +5 Ruf!`,
    ].join('\n'));
  return interaction.reply({ embeds: [embed] });
}
