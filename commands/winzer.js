const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

const cooldowns = new Map();

const REBSORTEN = [
  { name: 'Riesling', preis: 200, qualitaet: 2, reifeMonate: 1, emoji: '🍇' },
  { name: 'Spätburgunder', preis: 400, qualitaet: 4, reifeMonate: 2, emoji: '🍇' },
  { name: 'Chardonnay', preis: 600, qualitaet: 6, reifeMonate: 2, emoji: '🍈' },
  { name: 'Merlot', preis: 1000, qualitaet: 8, reifeMonate: 3, emoji: '🫐' },
  { name: 'Cabernet Sauvignon', preis: 1800, qualitaet: 12, reifeMonate: 3, emoji: '🍇' },
  { name: 'Pinot Noir', preis: 3000, qualitaet: 16, reifeMonate: 4, emoji: '🫐' },
  { name: 'Tempranillo', preis: 5000, qualitaet: 22, reifeMonate: 4, emoji: '🍇' },
  { name: 'Nebbiolo', preis: 8000, qualitaet: 28, reifeMonate: 5, emoji: '🫐' },
  { name: 'Sangiovese', preis: 12000, qualitaet: 35, reifeMonate: 5, emoji: '🍇' },
  { name: 'Goldene Göttertraube', preis: 25000, qualitaet: 50, reifeMonate: 6, emoji: '✨' },
];

const WEINTYPEN = [
  { name: 'Tafelwein', minQualitaet: 0, wertMult: 1.0 },
  { name: 'Qualitätswein', minQualitaet: 15, wertMult: 1.5 },
  { name: 'Kabinett', minQualitaet: 25, wertMult: 2.0 },
  { name: 'Spätlese', minQualitaet: 40, wertMult: 3.0 },
  { name: 'Auslese', minQualitaet: 60, wertMult: 4.5 },
  { name: 'Beerenauslese', minQualitaet: 80, wertMult: 7.0 },
  { name: 'Trockenbeerenauslese', minQualitaet: 100, wertMult: 12.0 },
];

const UPGRADES = {
  presse: [
    { name: 'Holzpresse', bonus: 0, preis: 0 },
    { name: 'Steinpresse', bonus: 5, preis: 4000 },
    { name: 'Hydraulikpresse', bonus: 12, preis: 15000 },
    { name: 'Meisterpresse', bonus: 25, preis: 40000 },
  ],
  fass: [
    { name: 'Eichenfass', bonus: 0, preis: 0 },
    { name: 'Barrique-Fass', bonus: 5, preis: 5000 },
    { name: 'Grand-Cru-Fass', bonus: 12, preis: 18000 },
    { name: 'Dracheneiche-Fass', bonus: 25, preis: 45000 },
  ],
  keller: [
    { name: 'Erdkeller', bonus: 0, preis: 0 },
    { name: 'Gewölbekeller', bonus: 4, preis: 3500 },
    { name: 'Klimakeller', bonus: 10, preis: 12000 },
    { name: 'Kristallkeller', bonus: 22, preis: 35000 },
  ],
  weinberg: [
    { name: 'Kleiner Hang', bonus: 0, preis: 0 },
    { name: 'Sonnenhügel', bonus: 5, preis: 6000 },
    { name: 'Premiumlage', bonus: 14, preis: 20000 },
    { name: 'Grand-Cru-Lage', bonus: 28, preis: 50000 },
  ],
};

const KUNDEN = [
  { name: 'Dorfgasthof', mult: 1.0 },
  { name: 'Stadtrestaurant', mult: 1.2 },
  { name: 'Weinhändler', mult: 1.3 },
  { name: 'Sternekoch', mult: 1.5 },
  { name: 'Adeliger', mult: 1.6 },
  { name: 'Königshof', mult: 1.8 },
  { name: 'Weinauktion', mult: 2.0 },
  { name: 'Sammler', mult: 1.4 },
];

const JAHRGANGSEREIGNISSE = [
  { text: 'Perfekter Sonnenschein das ganze Jahr!', bonusMult: 1.6 },
  { text: 'Ideale Bedingungen für die Traubenreife!', bonusMult: 1.4 },
  { text: 'Ein leichter Frost schadet einigen Reben.', bonusMult: 0.7 },
  { text: 'Regenreicher Herbst — schwierige Ernte.', bonusMult: 0.8 },
  { text: 'Warmer Sommer verleiht den Trauben Tiefe!', bonusMult: 1.3 },
  { text: 'Schädlingsbefall bedroht den Weinberg!', bonusMult: 0.6 },
  { text: 'Ein legendärer Jahrgang zeichnet sich ab!', bonusMult: 1.8 },
  { text: 'Normaler Jahrgang ohne Besonderheiten.', bonusMult: 1.0 },
  { text: 'Hagel beschädigt einen Teil der Ernte.', bonusMult: 0.75 },
  { text: 'Die Trauben entwickeln einzigartige Aromen!', bonusMult: 1.5 },
];

function ensureWinzerTable() {
  db.db.exec(`CREATE TABLE IF NOT EXISTS winzer (
    user_id TEXT PRIMARY KEY,
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    weinwissen INTEGER DEFAULT 10,
    weine_gesamt INTEGER DEFAULT 0,
    spitzenweine INTEGER DEFAULT 0,
    presse INTEGER DEFAULT 0,
    fass INTEGER DEFAULT 0,
    keller INTEGER DEFAULT 0,
    weinberg INTEGER DEFAULT 0,
    trauben_riesling INTEGER DEFAULT 3,
    trauben_spaetburgunder INTEGER DEFAULT 0,
    trauben_chardonnay INTEGER DEFAULT 0,
    trauben_merlot INTEGER DEFAULT 0,
    trauben_cabernet INTEGER DEFAULT 0,
    trauben_pinot INTEGER DEFAULT 0,
    trauben_tempranillo INTEGER DEFAULT 0,
    trauben_nebbiolo INTEGER DEFAULT 0,
    trauben_sangiovese INTEGER DEFAULT 0,
    trauben_goettertraube INTEGER DEFAULT 0,
    ruf INTEGER DEFAULT 0,
    last_harvest TEXT
  )`);
  db.db.exec(`CREATE TABLE IF NOT EXISTS weinkeller (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    name TEXT,
    rebsorte TEXT,
    weintyp TEXT,
    jahrgang INTEGER,
    qualitaet INTEGER,
    wert INTEGER,
    erstellt_am TEXT DEFAULT (datetime('now'))
  )`);
}

const TRAUBEN_SPALTEN = {
  'riesling': 'trauben_riesling',
  'spätburgunder': 'trauben_spaetburgunder',
  'chardonnay': 'trauben_chardonnay',
  'merlot': 'trauben_merlot',
  'cabernet sauvignon': 'trauben_cabernet',
  'pinot noir': 'trauben_pinot',
  'tempranillo': 'trauben_tempranillo',
  'nebbiolo': 'trauben_nebbiolo',
  'sangiovese': 'trauben_sangiovese',
  'goldene göttertraube': 'trauben_goettertraube',
};

function getWinzer(userId) {
  ensureWinzerTable();
  let w = db.db.prepare('SELECT * FROM winzer WHERE user_id = ?').get(userId);
  if (!w) {
    db.db.prepare('INSERT INTO winzer (user_id) VALUES (?)').run(userId);
    w = db.db.prepare('SELECT * FROM winzer WHERE user_id = ?').get(userId);
  }
  return w;
}

function getXpForLevel(level) {
  return Math.floor(120 * Math.pow(1.45, level - 1));
}

function getUpgradeBonus(w) {
  return UPGRADES.presse[w.presse].bonus +
    UPGRADES.fass[w.fass].bonus +
    UPGRADES.keller[w.keller].bonus +
    UPGRADES.weinberg[w.weinberg].bonus;
}

function bestimmeWeintyp(qualitaet) {
  let typ = WEINTYPEN[0];
  for (const wt of WEINTYPEN) {
    if (qualitaet >= wt.minQualitaet) typ = wt;
  }
  return typ;
}

function getTraubenSpalte(rebsorte) {
  return TRAUBEN_SPALTEN[rebsorte.toLowerCase()] || null;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('winzer')
    .setDescription('🍷 Werde Winzer und produziere edle Weine!')
    .addSubcommand(s => s.setName('status').setDescription('Zeige dein Winzer-Profil'))
    .addSubcommand(s => s.setName('rebsorten').setDescription('Zeige alle Rebsorten'))
    .addSubcommand(s => s.setName('pflanzen').setDescription('Kaufe und pflanze Rebsorten')
      .addIntegerOption(o => o.setName('sorte').setDescription('Rebsorte (1-10)').setRequired(true))
      .addIntegerOption(o => o.setName('menge').setDescription('Menge').setRequired(true)))
    .addSubcommand(s => s.setName('keltern').setDescription('Keltere Wein aus Trauben')
      .addIntegerOption(o => o.setName('sorte').setDescription('Rebsorte (1-10)').setRequired(true)))
    .addSubcommand(s => s.setName('weinkeller').setDescription('Zeige deinen Weinkeller'))
    .addSubcommand(s => s.setName('verkaufen').setDescription('Verkaufe deine Weine'))
    .addSubcommand(s => s.setName('upgrade').setDescription('Verbessere dein Weingut')
      .addStringOption(o => o.setName('typ').setDescription('presse/fass/keller/weinberg').setRequired(true))
      .addIntegerOption(o => o.setName('stufe').setDescription('Stufe (2-4)').setRequired(true)))
    .addSubcommand(s => s.setName('ernten').setDescription('Ernte Trauben von deinem Weinberg'))
    .addSubcommand(s => s.setName('verkosten').setDescription('Weinverkostung für XP und Ruf'))
    .addSubcommand(s => s.setName('wettbewerb').setDescription('PvP Weinwettbewerb')
      .addUserOption(o => o.setName('gegner').setDescription('Dein Gegner').setRequired(true))),

  async execute(interaction) {
    const config = require('../config.json');
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    switch (sub) {
      case 'status': return handleStatus(interaction, userId);
      case 'rebsorten': return handleRebsorten(interaction, userId);
      case 'pflanzen': return handlePflanzen(interaction, userId);
      case 'keltern': return handleKeltern(interaction, userId);
      case 'weinkeller': return handleWeinkeller(interaction, userId);
      case 'verkaufen': return handleVerkaufen(interaction, userId);
      case 'upgrade': return handleUpgrade(interaction, userId);
      case 'ernten': return handleErnten(interaction, userId);
      case 'verkosten': return handleVerkosten(interaction, userId);
      case 'wettbewerb': return handleWettbewerb(interaction, userId);
    }
  }
};

async function handleStatus(interaction, userId) {
  const w = getWinzer(userId);
  const xpNeeded = getXpForLevel(w.level);
  const bonus = getUpgradeBonus(w);

  const embed = new EmbedBuilder()
    .setTitle('🍷 Winzer-Profil')
    .setColor(0x722F37)
    .addFields(
      { name: '📊 Level', value: `${w.level} (${w.xp}/${xpNeeded} XP)`, inline: true },
      { name: '🍷 Weinwissen', value: `${w.weinwissen + bonus}`, inline: true },
      { name: '⭐ Ruf', value: `${w.ruf}`, inline: true },
      { name: '🏺 Weine', value: `${w.weine_gesamt} (${w.spitzenweine} Spitzenweine)`, inline: true },
      { name: '⚙️ Ausstattung', value: [
        `Presse: ${UPGRADES.presse[w.presse].name}`,
        `Fass: ${UPGRADES.fass[w.fass].name}`,
        `Keller: ${UPGRADES.keller[w.keller].name}`,
        `Weinberg: ${UPGRADES.weinberg[w.weinberg].name}`,
      ].join('\n') },
      { name: '🍇 Trauben', value: [
        `Riesling: ${w.trauben_riesling} | Spätburgunder: ${w.trauben_spaetburgunder}`,
        `Chardonnay: ${w.trauben_chardonnay} | Merlot: ${w.trauben_merlot}`,
        `Cabernet: ${w.trauben_cabernet} | Pinot Noir: ${w.trauben_pinot}`,
        `Tempranillo: ${w.trauben_tempranillo} | Nebbiolo: ${w.trauben_nebbiolo}`,
        `Sangiovese: ${w.trauben_sangiovese} | Göttertraube: ${w.trauben_goettertraube}`,
      ].join('\n') },
    );
  return interaction.reply({ embeds: [embed] });
}

async function handleRebsorten(interaction, userId) {
  const w = getWinzer(userId);
  const list = REBSORTEN.map((r, i) => {
    const unlocked = w.level >= Math.ceil((i + 1) / 2);
    return `${unlocked ? r.emoji : '🔒'} **${i + 1}. ${r.name}** — ${r.preis} 🪙 | Qualität: ${r.qualitaet} | Ab Lv.${Math.ceil((i + 1) / 2)}`;
  }).join('\n');

  const embed = new EmbedBuilder()
    .setTitle('🍇 Rebsorten')
    .setColor(0x722F37)
    .setDescription(list);
  return interaction.reply({ embeds: [embed] });
}

async function handlePflanzen(interaction, userId) {
  const w = getWinzer(userId);
  const sorteNr = interaction.options.getInteger('sorte');
  const menge = interaction.options.getInteger('menge');

  if (sorteNr < 1 || sorteNr > REBSORTEN.length) {
    return interaction.reply({ content: `❌ Ungültige Sorte! Wähle 1-${REBSORTEN.length}.`, ephemeral: true });
  }
  if (menge < 1 || menge > 50) {
    return interaction.reply({ content: '❌ Menge muss zwischen 1 und 50 liegen!', ephemeral: true });
  }

  const rebsorte = REBSORTEN[sorteNr - 1];
  const minLevel = Math.ceil(sorteNr / 2);
  if (w.level < minLevel) {
    return interaction.reply({ content: `🔒 Du brauchst Level ${minLevel} für ${rebsorte.name}!`, ephemeral: true });
  }

  const kosten = rebsorte.preis * menge;
  const balance = db.getBalance(userId);
  if (balance < kosten) {
    return interaction.reply({ content: `❌ Du brauchst ${kosten} 🪙 (hast: ${balance} 🪙).`, ephemeral: true });
  }

  const spalte = getTraubenSpalte(rebsorte.name);
  db.updateBalance(userId, -kosten);
  db.db.prepare(`UPDATE winzer SET ${spalte} = ${spalte} + ? WHERE user_id = ?`).run(menge, userId);

  const embed = new EmbedBuilder()
    .setTitle('🌱 Reben gepflanzt!')
    .setColor(0x00AA00)
    .setDescription(`${rebsorte.emoji} **${menge}x ${rebsorte.name}** für ${kosten} 🪙 gepflanzt!`);
  return interaction.reply({ embeds: [embed] });
}

async function handleKeltern(interaction, userId) {
  const cd = cooldowns.get(`keltern_${userId}`);
  if (cd && Date.now() - cd < 45000) {
    const rest = Math.ceil((45000 - (Date.now() - cd)) / 1000);
    return interaction.reply({ content: `⏳ Du kannst in ${rest}s wieder keltern.`, ephemeral: true });
  }

  const w = getWinzer(userId);
  const sorteNr = interaction.options.getInteger('sorte');

  if (sorteNr < 1 || sorteNr > REBSORTEN.length) {
    return interaction.reply({ content: `❌ Ungültige Sorte! Wähle 1-${REBSORTEN.length}.`, ephemeral: true });
  }

  const rebsorte = REBSORTEN[sorteNr - 1];
  const spalte = getTraubenSpalte(rebsorte.name);
  const traubenBedarf = 3;

  if (w[spalte] < traubenBedarf) {
    return interaction.reply({ content: `❌ Du brauchst ${traubenBedarf}x ${rebsorte.name} (hast: ${w[spalte]}).`, ephemeral: true });
  }

  cooldowns.set(`keltern_${userId}`, Date.now());
  db.db.prepare(`UPDATE winzer SET ${spalte} = ${spalte} - ? WHERE user_id = ?`).run(traubenBedarf, userId);

  const ereignis = JAHRGANGSEREIGNISSE[Math.floor(Math.random() * JAHRGANGSEREIGNISSE.length)];
  const bonus = getUpgradeBonus(w);
  const gesamtSkill = w.weinwissen + bonus + w.level * 3;

  const basisQualitaet = rebsorte.qualitaet * 3;
  const qualitaet = Math.floor(basisQualitaet * (0.6 + (gesamtSkill / 100)) * ereignis.bonusMult);
  const weintyp = bestimmeWeintyp(qualitaet);
  const wert = Math.floor(qualitaet * 30 * weintyp.wertMult);

  const istSpitzenwein = qualitaet > 60 && Math.random() < 0.12;
  const endWert = istSpitzenwein ? wert * 3 : wert;
  const jahrgang = 2020 + Math.floor(Math.random() * 6);
  const weinName = `${rebsorte.name} ${weintyp.name} ${jahrgang}`;

  db.db.prepare('INSERT INTO weinkeller (user_id, name, rebsorte, weintyp, jahrgang, qualitaet, wert) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(userId, weinName, rebsorte.name, weintyp.name, jahrgang, qualitaet, endWert);

  const xpGewinn = Math.floor((12 + rebsorte.qualitaet * 2) * ereignis.bonusMult);
  db.db.prepare(`UPDATE winzer SET xp = xp + ?, weine_gesamt = weine_gesamt + 1,
    spitzenweine = spitzenweine + ?, ruf = ruf + ? WHERE user_id = ?`)
    .run(xpGewinn, istSpitzenwein ? 1 : 0, Math.floor(qualitaet / 10), userId);

  const updated = getWinzer(userId);
  const xpNeeded = getXpForLevel(updated.level);
  let levelUpText = '';
  if (updated.xp >= xpNeeded) {
    db.db.prepare('UPDATE winzer SET level = level + 1, xp = xp - ? WHERE user_id = ?').run(xpNeeded, userId);
    levelUpText = `\n🎉 **LEVEL UP!** Du bist jetzt Level ${updated.level + 1}!`;
  }

  const embed = new EmbedBuilder()
    .setTitle(`🍷 ${istSpitzenwein ? '⭐ SPITZENWEIN! ⭐' : 'Wein gekeltert!'}`)
    .setColor(istSpitzenwein ? 0xFFD700 : 0x722F37)
    .setDescription([
      `**${weinName}**`,
      `${rebsorte.emoji} ${rebsorte.name} → ${weintyp.name}`,
      `\n💫 *${ereignis.text}*`,
      `\n⭐ Qualität: ${qualitaet} | 💰 Wert: ${endWert} 🪙`,
      `📊 +${xpGewinn} XP | Verbraucht: ${traubenBedarf}x ${rebsorte.name}`,
      levelUpText,
    ].filter(Boolean).join('\n'));
  return interaction.reply({ embeds: [embed] });
}

async function handleWeinkeller(interaction, userId) {
  ensureWinzerTable();
  const weine = db.db.prepare('SELECT * FROM weinkeller WHERE user_id = ? ORDER BY wert DESC').all(userId);

  if (weine.length === 0) {
    return interaction.reply({ content: '📭 Dein Weinkeller ist leer! Keltere deinen ersten Wein.', ephemeral: true });
  }

  const list = weine.slice(0, 12).map((w, i) =>
    `**${i + 1}.** ${w.name} — Q:${w.qualitaet} | ${w.wert} 🪙`
  ).join('\n');

  const gesamtWert = weine.reduce((sum, w) => sum + w.wert, 0);

  const embed = new EmbedBuilder()
    .setTitle('🏺 Dein Weinkeller')
    .setColor(0x722F37)
    .setDescription(list)
    .setFooter({ text: `${weine.length} Weine | Gesamtwert: ${gesamtWert} 🪙` });
  return interaction.reply({ embeds: [embed] });
}

async function handleVerkaufen(interaction, userId) {
  ensureWinzerTable();
  const weine = db.db.prepare('SELECT * FROM weinkeller WHERE user_id = ?').all(userId);

  if (weine.length === 0) {
    return interaction.reply({ content: '❌ Du hast keine Weine zum Verkaufen!', ephemeral: true });
  }

  const kunde = KUNDEN[Math.floor(Math.random() * KUNDEN.length)];
  let gesamtWert = 0;
  const verkauft = [];

  for (const w of weine) {
    const preis = Math.floor(w.wert * kunde.mult);
    gesamtWert += preis;
    verkauft.push(`${w.name} — ${preis} 🪙`);
  }

  db.updateBalance(userId, gesamtWert);
  db.db.prepare('DELETE FROM weinkeller WHERE user_id = ?').run(userId);
  db.db.prepare('UPDATE winzer SET ruf = ruf + ? WHERE user_id = ?').run(weine.length * 2, userId);

  const embed = new EmbedBuilder()
    .setTitle('💰 Weine verkauft!')
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
  const w = getWinzer(userId);
  const typ = interaction.options.getString('typ').toLowerCase();
  const stufe = interaction.options.getInteger('stufe');

  if (!UPGRADES[typ]) {
    return interaction.reply({ content: '❌ Ungültiger Typ! Wähle: presse, fass, keller oder weinberg.', ephemeral: true });
  }
  if (stufe < 2 || stufe > UPGRADES[typ].length) {
    return interaction.reply({ content: `❌ Ungültige Stufe! Wähle 2-${UPGRADES[typ].length}.`, ephemeral: true });
  }

  const idx = stufe - 1;
  if (w[typ] >= idx) {
    return interaction.reply({ content: '❌ Du hast bereits dieses oder ein besseres Upgrade!', ephemeral: true });
  }
  if (w[typ] < idx - 1) {
    return interaction.reply({ content: '❌ Du musst zuerst die vorherige Stufe kaufen!', ephemeral: true });
  }

  const item = UPGRADES[typ][idx];
  const balance = db.getBalance(userId);
  if (balance < item.preis) {
    return interaction.reply({ content: `❌ Du brauchst ${item.preis} 🪙 (hast: ${balance} 🪙).`, ephemeral: true });
  }

  db.updateBalance(userId, -item.preis);
  db.db.prepare(`UPDATE winzer SET ${typ} = ? WHERE user_id = ?`).run(idx, userId);

  const embed = new EmbedBuilder()
    .setTitle('⬆️ Upgrade gekauft!')
    .setColor(0x00AA00)
    .setDescription(`**${item.name}** für ${item.preis} 🪙!\n+${item.bonus} Weinwissen-Bonus`);
  return interaction.reply({ embeds: [embed] });
}

async function handleErnten(interaction, userId) {
  const cd = cooldowns.get(`ernten_${userId}`);
  if (cd && Date.now() - cd < 60000) {
    const rest = Math.ceil((60000 - (Date.now() - cd)) / 1000);
    return interaction.reply({ content: `⏳ Du kannst in ${rest}s wieder ernten.`, ephemeral: true });
  }

  const w = getWinzer(userId);
  cooldowns.set(`ernten_${userId}`, Date.now());

  const weinbergBonus = UPGRADES.weinberg[w.weinberg].bonus;
  const maxSorte = Math.min(REBSORTEN.length, Math.ceil(w.level / 2) + 1);
  const sorteIdx = Math.floor(Math.random() * maxSorte);
  const rebsorte = REBSORTEN[sorteIdx];

  const menge = Math.floor((1 + Math.random() * 3) * (1 + weinbergBonus / 20));
  const spalte = getTraubenSpalte(rebsorte.name);
  db.db.prepare(`UPDATE winzer SET ${spalte} = ${spalte} + ?, xp = xp + 5 WHERE user_id = ?`).run(menge, userId);

  const embed = new EmbedBuilder()
    .setTitle('🌿 Ernte!')
    .setColor(0x228B22)
    .setDescription(`${rebsorte.emoji} **${menge}x ${rebsorte.name}** geerntet!\n📊 +5 XP`);
  return interaction.reply({ embeds: [embed] });
}

async function handleVerkosten(interaction, userId) {
  const cd = cooldowns.get(`verkosten_${userId}`);
  if (cd && Date.now() - cd < 90000) {
    const rest = Math.ceil((90000 - (Date.now() - cd)) / 1000);
    return interaction.reply({ content: `⏳ Nächste Verkostung in ${rest}s.`, ephemeral: true });
  }

  const w = getWinzer(userId);
  const kosten = 500 + (w.level * 100);
  const balance = db.getBalance(userId);
  if (balance < kosten) {
    return interaction.reply({ content: `❌ Verkostung kostet ${kosten} 🪙 (hast: ${balance} 🪙).`, ephemeral: true });
  }

  cooldowns.set(`verkosten_${userId}`, Date.now());
  db.updateBalance(userId, -kosten);

  const wissenGewinn = Math.floor(Math.random() * 3) + 1;
  const xpGewinn = 15 + Math.floor(Math.random() * 15);
  db.db.prepare('UPDATE winzer SET weinwissen = weinwissen + ?, xp = xp + ?, ruf = ruf + 2 WHERE user_id = ?')
    .run(wissenGewinn, xpGewinn, userId);

  const updated = getWinzer(userId);
  const xpNeeded = getXpForLevel(updated.level);
  let levelUpText = '';
  if (updated.xp >= xpNeeded) {
    db.db.prepare('UPDATE winzer SET level = level + 1, xp = xp - ? WHERE user_id = ?').run(xpNeeded, userId);
    levelUpText = `\n🎉 **LEVEL UP!** Level ${updated.level + 1}!`;
  }

  const embed = new EmbedBuilder()
    .setTitle('🥂 Weinverkostung!')
    .setColor(0x9B59B6)
    .setDescription(`Du vertiefst dein Weinwissen!\n🍷 +${wissenGewinn} Weinwissen | 📊 +${xpGewinn} XP | ⭐ +2 Ruf | -${kosten} 🪙${levelUpText}`);
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

  const w1 = getWinzer(userId);
  const w2 = getWinzer(gegner.id);

  const skill1 = w1.weinwissen + getUpgradeBonus(w1) + w1.level * 5;
  const skill2 = w2.weinwissen + getUpgradeBonus(w2) + w2.level * 5;

  const score1 = skill1 + w1.weine_gesamt * 2 + Math.floor(Math.random() * 40);
  const score2 = skill2 + w2.weine_gesamt * 2 + Math.floor(Math.random() * 40);

  const gewinner = score1 >= score2 ? userId : gegner.id;
  const preis = 400 + Math.floor(Math.random() * 600);

  db.updateBalance(gewinner, preis);
  db.db.prepare('UPDATE winzer SET ruf = ruf + 5, xp = xp + 15 WHERE user_id = ?').run(gewinner);

  const embed = new EmbedBuilder()
    .setTitle('🏆 Weinwettbewerb!')
    .setColor(0xFFD700)
    .setDescription([
      `**${interaction.user.username}:** ${score1} Punkte`,
      `**${gegner.username}:** ${score2} Punkte`,
      '',
      `🥇 **${gewinner === userId ? interaction.user.username : gegner.username}** gewinnt ${preis} 🪙 und +5 Ruf!`,
    ].join('\n'));
  return interaction.reply({ embeds: [embed] });
}
