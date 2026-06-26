const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

const cooldowns = new Map();

const LANDSCHAFTEN = [
  { name: 'Wiesen & Felder', minLevel: 1, schwierigkeit: 1, belohnung: 80, emoji: '🌾' },
  { name: 'Flussdelta', minLevel: 1, schwierigkeit: 2, belohnung: 120, emoji: '🏞️' },
  { name: 'Hügelland', minLevel: 2, schwierigkeit: 3, belohnung: 180, emoji: '⛰️' },
  { name: 'Küstenlinie', minLevel: 3, schwierigkeit: 4, belohnung: 250, emoji: '🏖️' },
  { name: 'Dschungel', minLevel: 4, schwierigkeit: 5, belohnung: 350, emoji: '🌴' },
  { name: 'Gebirge', minLevel: 5, schwierigkeit: 7, belohnung: 500, emoji: '🏔️' },
  { name: 'Wüste', minLevel: 7, schwierigkeit: 8, belohnung: 650, emoji: '🏜️' },
  { name: 'Vulkangebiet', minLevel: 8, schwierigkeit: 9, belohnung: 800, emoji: '🌋' },
  { name: 'Arktis', minLevel: 10, schwierigkeit: 10, belohnung: 1000, emoji: '❄️' },
  { name: 'Schwebende Inseln', minLevel: 12, schwierigkeit: 12, belohnung: 1500, emoji: '🏝️' },
];

const KARTENTYPEN = [
  { name: 'Skizze', qualitaetMult: 1.0, wertMult: 1.0 },
  { name: 'Regionalkarte', qualitaetMult: 1.3, wertMult: 1.5 },
  { name: 'Detailkarte', qualitaetMult: 1.6, wertMult: 2.0 },
  { name: 'Seekarte', qualitaetMult: 1.8, wertMult: 2.5 },
  { name: 'Schatzkarte', qualitaetMult: 2.0, wertMult: 3.5 },
  { name: 'Meisterwerk-Atlas', qualitaetMult: 2.5, wertMult: 5.0 },
];

const WERKZEUGE = {
  kompass: [
    { name: 'Einfacher Kompass', bonus: 0, preis: 0 },
    { name: 'Messingkompass', bonus: 5, preis: 3000 },
    { name: 'Gyrokompass', bonus: 12, preis: 12000 },
    { name: 'Sternenkompass', bonus: 24, preis: 35000 },
  ],
  fernrohr: [
    { name: 'Einfaches Fernrohr', bonus: 0, preis: 0 },
    { name: 'Messing-Teleskop', bonus: 4, preis: 2500 },
    { name: 'Kristall-Fernrohr', bonus: 10, preis: 10000 },
    { name: 'Dimensionslinse', bonus: 22, preis: 32000 },
  ],
  zeichengeraet: [
    { name: 'Kohlestifte', bonus: 0, preis: 0 },
    { name: 'Tuscheset', bonus: 3, preis: 2000 },
    { name: 'Präzisionszirkel', bonus: 9, preis: 8000 },
    { name: 'Magische Feder', bonus: 20, preis: 28000 },
  ],
  pergament: [
    { name: 'Grobes Papier', bonus: 0, preis: 0 },
    { name: 'Feines Pergament', bonus: 4, preis: 3500 },
    { name: 'Elfenbein-Velin', bonus: 11, preis: 11000 },
    { name: 'Sternenleder', bonus: 23, preis: 38000 },
  ],
};

const ENTDECKUNGEN = [
  { name: 'Alte Ruine', seltenheit: 'Gewöhnlich', xp: 10, wert: 100 },
  { name: 'Versteckter Pfad', seltenheit: 'Gewöhnlich', xp: 15, wert: 150 },
  { name: 'Heilige Quelle', seltenheit: 'Ungewöhnlich', xp: 25, wert: 300 },
  { name: 'Vergessener Tempel', seltenheit: 'Ungewöhnlich', xp: 35, wert: 500 },
  { name: 'Drachenhort', seltenheit: 'Selten', xp: 50, wert: 800 },
  { name: 'Elfenstadt', seltenheit: 'Selten', xp: 60, wert: 1200 },
  { name: 'Dimensionsriss', seltenheit: 'Episch', xp: 80, wert: 2000 },
  { name: 'Weltenwurzel', seltenheit: 'Episch', xp: 100, wert: 3000 },
  { name: 'Götterportal', seltenheit: 'Legendär', xp: 150, wert: 5000 },
  { name: 'Ort der Schöpfung', seltenheit: 'Mythisch', xp: 250, wert: 10000 },
];

const AUFTRAGGEBER = [
  { name: 'Dorfvorsteher', mult: 1.0 },
  { name: 'Händlergilde', mult: 1.2 },
  { name: 'Königliche Armee', mult: 1.4 },
  { name: 'Abenteurergilde', mult: 1.3 },
  { name: 'Magierakademie', mult: 1.5 },
  { name: 'Seefahrergilde', mult: 1.3 },
  { name: 'Königshaus', mult: 1.8 },
  { name: 'Geheimbund', mult: 2.0 },
];

const EXPEDITIONS_EREIGNISSE = [
  { text: 'Das Wetter ist ideal für Vermessungen!', bonusMult: 1.5 },
  { text: 'Du findest alte Wegmarkierungen!', bonusMult: 1.3 },
  { text: 'Dichter Nebel behindert die Sicht.', bonusMult: 0.7 },
  { text: 'Ein Einheimischer zeigt dir geheime Pfade!', bonusMult: 1.6 },
  { text: 'Dein Kompass spinnt — Magnetstörung!', bonusMult: 0.75 },
  { text: 'Die Landschaft ist atemberaubend!', bonusMult: 1.2 },
  { text: 'Du entdeckst eine bisher unbekannte Formation!', bonusMult: 1.7 },
  { text: 'Regenschauer verwischt deine Notizen.', bonusMult: 0.8 },
  { text: 'Perfekte Sicht bis zum Horizont!', bonusMult: 1.4 },
  { text: 'Routine-Expedition ohne Besonderheiten.', bonusMult: 1.0 },
];

function ensureKartographTable() {
  db.db.exec(`CREATE TABLE IF NOT EXISTS kartographen (
    user_id TEXT PRIMARY KEY,
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    praezision INTEGER DEFAULT 10,
    karten_gesamt INTEGER DEFAULT 0,
    meisterkarten INTEGER DEFAULT 0,
    entdeckungen INTEGER DEFAULT 0,
    expeditionen INTEGER DEFAULT 0,
    kompass INTEGER DEFAULT 0,
    fernrohr INTEGER DEFAULT 0,
    zeichengeraet INTEGER DEFAULT 0,
    pergament INTEGER DEFAULT 0,
    ruf INTEGER DEFAULT 0,
    kartendaten INTEGER DEFAULT 0,
    last_expedition TEXT
  )`);
  db.db.exec(`CREATE TABLE IF NOT EXISTS karten_sammlung (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    name TEXT,
    kartentyp TEXT,
    landschaft TEXT,
    qualitaet INTEGER,
    wert INTEGER,
    erstellt_am TEXT DEFAULT (datetime('now'))
  )`);
}

function getKartograph(userId) {
  ensureKartographTable();
  let k = db.db.prepare('SELECT * FROM kartographen WHERE user_id = ?').get(userId);
  if (!k) {
    db.db.prepare('INSERT INTO kartographen (user_id) VALUES (?)').run(userId);
    k = db.db.prepare('SELECT * FROM kartographen WHERE user_id = ?').get(userId);
  }
  return k;
}

function getXpForLevel(level) {
  return Math.floor(100 * Math.pow(1.5, level - 1));
}

function getWerkzeugBonus(k) {
  return WERKZEUGE.kompass[k.kompass].bonus +
    WERKZEUGE.fernrohr[k.fernrohr].bonus +
    WERKZEUGE.zeichengeraet[k.zeichengeraet].bonus +
    WERKZEUGE.pergament[k.pergament].bonus;
}

function bestimmeKartentyp(qualitaet) {
  if (qualitaet >= 100) return KARTENTYPEN[5];
  if (qualitaet >= 70) return KARTENTYPEN[4];
  if (qualitaet >= 50) return KARTENTYPEN[3];
  if (qualitaet >= 30) return KARTENTYPEN[2];
  if (qualitaet >= 15) return KARTENTYPEN[1];
  return KARTENTYPEN[0];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kartograph')
    .setDescription('🗺️ Werde Kartograph und kartiere unbekannte Länder!')
    .addSubcommand(s => s.setName('profil').setDescription('Zeige dein Kartographen-Profil'))
    .addSubcommand(s => s.setName('orte').setDescription('Zeige alle Landschaften'))
    .addSubcommand(s => s.setName('expedition').setDescription('Starte eine Kartierungs-Expedition')
      .addIntegerOption(o => o.setName('ort').setDescription('Landschaft (1-10)').setRequired(true)))
    .addSubcommand(s => s.setName('zeichnen').setDescription('Zeichne eine Karte aus deinen Daten'))
    .addSubcommand(s => s.setName('sammlung').setDescription('Zeige deine Kartensammlung'))
    .addSubcommand(s => s.setName('verkaufen').setDescription('Verkaufe deine Karten'))
    .addSubcommand(s => s.setName('werkzeuge').setDescription('Upgrade deine Kartographie-Werkzeuge')
      .addStringOption(o => o.setName('typ').setDescription('kompass/fernrohr/zeichengeraet/pergament').setRequired(true))
      .addIntegerOption(o => o.setName('stufe').setDescription('Stufe (2-4)').setRequired(true)))
    .addSubcommand(s => s.setName('trainieren').setDescription('Verbessere deine Kartographie-Fähigkeiten')
      .addStringOption(o => o.setName('skill').setDescription('praezision').setRequired(true)))
    .addSubcommand(s => s.setName('auftrag').setDescription('Nimm einen Kartographie-Auftrag an'))
    .addSubcommand(s => s.setName('wettbewerb').setDescription('PvP Kartographie-Duell')
      .addUserOption(o => o.setName('gegner').setDescription('Dein Gegner').setRequired(true))),

  async execute(interaction) {
    const config = require('../config.json');
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    switch (sub) {
      case 'profil': return handleProfil(interaction, userId);
      case 'orte': return handleOrte(interaction, userId);
      case 'expedition': return handleExpedition(interaction, userId);
      case 'zeichnen': return handleZeichnen(interaction, userId);
      case 'sammlung': return handleSammlung(interaction, userId);
      case 'verkaufen': return handleVerkaufen(interaction, userId);
      case 'werkzeuge': return handleWerkzeuge(interaction, userId);
      case 'trainieren': return handleTrainieren(interaction, userId);
      case 'auftrag': return handleAuftrag(interaction, userId);
      case 'wettbewerb': return handleWettbewerb(interaction, userId);
    }
  }
};

async function handleProfil(interaction, userId) {
  const k = getKartograph(userId);
  const xpNeeded = getXpForLevel(k.level);
  const bonus = getWerkzeugBonus(k);

  const embed = new EmbedBuilder()
    .setTitle('🗺️ Kartographen-Profil')
    .setColor(0xD4A574)
    .addFields(
      { name: '📊 Level', value: `${k.level} (${k.xp}/${xpNeeded} XP)`, inline: true },
      { name: '🎯 Präzision', value: `${k.praezision + bonus}`, inline: true },
      { name: '⭐ Ruf', value: `${k.ruf}`, inline: true },
      { name: '🗺️ Karten', value: `${k.karten_gesamt} (${k.meisterkarten} Meisterkarten)`, inline: true },
      { name: '🔭 Expeditionen', value: `${k.expeditionen}`, inline: true },
      { name: '💡 Entdeckungen', value: `${k.entdeckungen}`, inline: true },
      { name: '📊 Kartendaten', value: `${k.kartendaten}`, inline: true },
      { name: '🧭 Werkzeuge', value: [
        `Kompass: ${WERKZEUGE.kompass[k.kompass].name}`,
        `Fernrohr: ${WERKZEUGE.fernrohr[k.fernrohr].name}`,
        `Zeichengerät: ${WERKZEUGE.zeichengeraet[k.zeichengeraet].name}`,
        `Pergament: ${WERKZEUGE.pergament[k.pergament].name}`,
      ].join('\n') },
    );
  return interaction.reply({ embeds: [embed] });
}

async function handleOrte(interaction, userId) {
  const k = getKartograph(userId);

  const list = LANDSCHAFTEN.map((l, i) => {
    const unlocked = k.level >= l.minLevel;
    return `${unlocked ? l.emoji : '🔒'} **${i + 1}. ${l.name}** — Schwierigkeit: ${l.schwierigkeit} | ${l.belohnung} 🪙 | Ab Lv.${l.minLevel}`;
  }).join('\n');

  const embed = new EmbedBuilder()
    .setTitle('🌍 Landschaften')
    .setColor(0xD4A574)
    .setDescription(list)
    .setFooter({ text: `Dein Level: ${k.level}` });
  return interaction.reply({ embeds: [embed] });
}

async function handleExpedition(interaction, userId) {
  const cd = cooldowns.get(`exp_${userId}`);
  if (cd && Date.now() - cd < 40000) {
    const rest = Math.ceil((40000 - (Date.now() - cd)) / 1000);
    return interaction.reply({ content: `⏳ Nächste Expedition in ${rest}s.`, ephemeral: true });
  }

  const k = getKartograph(userId);
  const ortNr = interaction.options.getInteger('ort');

  if (ortNr < 1 || ortNr > LANDSCHAFTEN.length) {
    return interaction.reply({ content: `❌ Ungültiger Ort! Wähle 1-${LANDSCHAFTEN.length}.`, ephemeral: true });
  }

  const landschaft = LANDSCHAFTEN[ortNr - 1];
  if (k.level < landschaft.minLevel) {
    return interaction.reply({ content: `🔒 Du brauchst Level ${landschaft.minLevel} für ${landschaft.name}!`, ephemeral: true });
  }

  cooldowns.set(`exp_${userId}`, Date.now());

  const ereignis = EXPEDITIONS_EREIGNISSE[Math.floor(Math.random() * EXPEDITIONS_EREIGNISSE.length)];
  const bonus = getWerkzeugBonus(k);
  const gesamtSkill = k.praezision + bonus + k.level * 2;

  const basisDaten = landschaft.schwierigkeit * 3;
  const datenGewinn = Math.floor(basisDaten * ereignis.bonusMult);
  const xpGewinn = Math.floor((8 + landschaft.schwierigkeit * 3) * ereignis.bonusMult);
  const coins = Math.floor(landschaft.belohnung * ereignis.bonusMult * (0.8 + gesamtSkill / 200));

  let entdeckungText = '';
  const entdeckungChance = 0.15 + (k.level * 0.02) + (bonus * 0.001);
  if (Math.random() < entdeckungChance * ereignis.bonusMult) {
    let roll = Math.random();
    let cum = 0;
    const gewichte = [0.25, 0.20, 0.18, 0.12, 0.08, 0.07, 0.05, 0.03, 0.015, 0.005];
    for (let i = 0; i < ENTDECKUNGEN.length; i++) {
      cum += gewichte[i];
      if (roll < cum) {
        const ent = ENTDECKUNGEN[i];
        entdeckungText = `\n💡 **ENTDECKUNG:** ${ent.name} (${ent.seltenheit}) — +${ent.xp} XP, +${ent.wert} 🪙`;
        db.updateBalance(userId, ent.wert);
        db.db.prepare('UPDATE kartographen SET xp = xp + ?, entdeckungen = entdeckungen + 1 WHERE user_id = ?')
          .run(ent.xp, userId);
        break;
      }
    }
  }

  db.updateBalance(userId, coins);
  db.db.prepare(`UPDATE kartographen SET xp = xp + ?, expeditionen = expeditionen + 1,
    kartendaten = kartendaten + ?, ruf = ruf + ? WHERE user_id = ?`)
    .run(xpGewinn, datenGewinn, Math.floor(landschaft.schwierigkeit / 2) + 1, userId);

  const updated = getKartograph(userId);
  const xpNeeded = getXpForLevel(updated.level);
  let levelUpText = '';
  if (updated.xp >= xpNeeded) {
    db.db.prepare('UPDATE kartographen SET level = level + 1, xp = xp - ?, praezision = praezision + 2 WHERE user_id = ?').run(xpNeeded, userId);
    levelUpText = `\n🎉 **LEVEL UP!** Level ${updated.level + 1}! (+2 Präzision)`;
  }

  const embed = new EmbedBuilder()
    .setTitle(`${landschaft.emoji} Expedition: ${landschaft.name}`)
    .setColor(ereignis.bonusMult >= 1.0 ? 0x00AA00 : 0xCC6600)
    .setDescription([
      `💫 *${ereignis.text}*`,
      `\n📊 +${datenGewinn} Kartendaten | +${xpGewinn} XP | +${coins} 🪙`,
      entdeckungText,
      levelUpText,
    ].filter(Boolean).join('\n'));
  return interaction.reply({ embeds: [embed] });
}

async function handleZeichnen(interaction, userId) {
  const k = getKartograph(userId);

  if (k.kartendaten < 5) {
    return interaction.reply({ content: `❌ Du brauchst mindestens 5 Kartendaten (hast: ${k.kartendaten}). Geh auf Expeditionen!`, ephemeral: true });
  }

  const cd = cooldowns.get(`draw_${userId}`);
  if (cd && Date.now() - cd < 60000) {
    const rest = Math.ceil((60000 - (Date.now() - cd)) / 1000);
    return interaction.reply({ content: `⏳ Du kannst in ${rest}s wieder zeichnen.`, ephemeral: true });
  }

  cooldowns.set(`draw_${userId}`, Date.now());

  const datenVerwendet = Math.min(k.kartendaten, 30);
  const bonus = getWerkzeugBonus(k);
  const gesamtSkill = k.praezision + bonus + k.level * 3;

  const ereignis = EXPEDITIONS_EREIGNISSE[Math.floor(Math.random() * EXPEDITIONS_EREIGNISSE.length)];
  const qualitaet = Math.floor(datenVerwendet * (0.5 + gesamtSkill / 80) * ereignis.bonusMult);
  const kartentyp = bestimmeKartentyp(qualitaet);
  const wert = Math.floor(qualitaet * 25 * kartentyp.wertMult);

  const istMeisterkarte = qualitaet > 70 && Math.random() < 0.1;
  const endWert = istMeisterkarte ? wert * 3 : wert;

  const landschaft = LANDSCHAFTEN[Math.floor(Math.random() * Math.min(LANDSCHAFTEN.length, k.level + 2))];
  const kartenName = `${kartentyp.name}: ${landschaft.name}`;

  db.db.prepare('INSERT INTO karten_sammlung (user_id, name, kartentyp, landschaft, qualitaet, wert) VALUES (?, ?, ?, ?, ?, ?)')
    .run(userId, kartenName, kartentyp.name, landschaft.name, qualitaet, endWert);

  db.db.prepare(`UPDATE kartographen SET kartendaten = kartendaten - ?, karten_gesamt = karten_gesamt + 1,
    meisterkarten = meisterkarten + ?, xp = xp + ? WHERE user_id = ?`)
    .run(datenVerwendet, istMeisterkarte ? 1 : 0, Math.floor(qualitaet / 3), userId);

  const updated = getKartograph(userId);
  const xpNeeded = getXpForLevel(updated.level);
  let levelUpText = '';
  if (updated.xp >= xpNeeded) {
    db.db.prepare('UPDATE kartographen SET level = level + 1, xp = xp - ?, praezision = praezision + 2 WHERE user_id = ?').run(xpNeeded, userId);
    levelUpText = `\n🎉 **LEVEL UP!** Level ${updated.level + 1}!`;
  }

  const embed = new EmbedBuilder()
    .setTitle(`🗺️ ${istMeisterkarte ? '⭐ MEISTERKARTE! ⭐' : 'Karte gezeichnet!'}`)
    .setColor(istMeisterkarte ? 0xFFD700 : 0xD4A574)
    .setDescription([
      `**${kartenName}**`,
      `Typ: ${kartentyp.name} | ${landschaft.emoji} ${landschaft.name}`,
      `\n💫 *${ereignis.text}*`,
      `\n⭐ Qualität: ${qualitaet} | 💰 Wert: ${endWert} 🪙`,
      `📊 Daten verwendet: ${datenVerwendet}`,
      levelUpText,
    ].filter(Boolean).join('\n'));
  return interaction.reply({ embeds: [embed] });
}

async function handleSammlung(interaction, userId) {
  ensureKartographTable();
  const karten = db.db.prepare('SELECT * FROM karten_sammlung WHERE user_id = ? ORDER BY wert DESC').all(userId);

  if (karten.length === 0) {
    return interaction.reply({ content: '📭 Deine Sammlung ist leer! Zeichne deine erste Karte.', ephemeral: true });
  }

  const list = karten.slice(0, 12).map((k, i) =>
    `**${i + 1}.** ${k.name} — Q:${k.qualitaet} | ${k.wert} 🪙`
  ).join('\n');

  const gesamtWert = karten.reduce((sum, k) => sum + k.wert, 0);

  const embed = new EmbedBuilder()
    .setTitle('📚 Kartensammlung')
    .setColor(0xD4A574)
    .setDescription(list)
    .setFooter({ text: `${karten.length} Karten | Gesamtwert: ${gesamtWert} 🪙` });
  return interaction.reply({ embeds: [embed] });
}

async function handleVerkaufen(interaction, userId) {
  ensureKartographTable();
  const karten = db.db.prepare('SELECT * FROM karten_sammlung WHERE user_id = ?').all(userId);

  if (karten.length === 0) {
    return interaction.reply({ content: '❌ Du hast keine Karten zum Verkaufen!', ephemeral: true });
  }

  const auftraggeber = AUFTRAGGEBER[Math.floor(Math.random() * AUFTRAGGEBER.length)];
  let gesamtWert = 0;
  const verkauft = [];

  for (const k of karten) {
    const preis = Math.floor(k.wert * auftraggeber.mult);
    gesamtWert += preis;
    verkauft.push(`${k.name} — ${preis} 🪙`);
  }

  db.updateBalance(userId, gesamtWert);
  db.db.prepare('DELETE FROM karten_sammlung WHERE user_id = ?').run(userId);
  db.db.prepare('UPDATE kartographen SET ruf = ruf + ? WHERE user_id = ?').run(karten.length * 2, userId);

  const embed = new EmbedBuilder()
    .setTitle('💰 Karten verkauft!')
    .setColor(0xFFD700)
    .setDescription([
      `**Käufer:** ${auftraggeber.name} (x${auftraggeber.mult})`,
      '',
      verkauft.slice(0, 10).join('\n'),
      verkauft.length > 10 ? `...und ${verkauft.length - 10} weitere` : '',
      '',
      `**Gesamt: ${gesamtWert} 🪙**`,
    ].filter(Boolean).join('\n'));
  return interaction.reply({ embeds: [embed] });
}

async function handleWerkzeuge(interaction, userId) {
  const k = getKartograph(userId);
  const typ = interaction.options.getString('typ').toLowerCase();
  const stufe = interaction.options.getInteger('stufe');

  if (!WERKZEUGE[typ]) {
    return interaction.reply({ content: '❌ Ungültiger Typ! Wähle: kompass, fernrohr, zeichengeraet oder pergament.', ephemeral: true });
  }
  if (stufe < 2 || stufe > WERKZEUGE[typ].length) {
    return interaction.reply({ content: `❌ Ungültige Stufe! Wähle 2-${WERKZEUGE[typ].length}.`, ephemeral: true });
  }

  const idx = stufe - 1;
  if (k[typ] >= idx) {
    return interaction.reply({ content: '❌ Du hast bereits dieses oder ein besseres Werkzeug!', ephemeral: true });
  }
  if (k[typ] < idx - 1) {
    return interaction.reply({ content: '❌ Du musst zuerst die vorherige Stufe kaufen!', ephemeral: true });
  }

  const item = WERKZEUGE[typ][idx];
  const balance = db.getBalance(userId);
  if (balance < item.preis) {
    return interaction.reply({ content: `❌ Du brauchst ${item.preis} 🪙 (hast: ${balance} 🪙).`, ephemeral: true });
  }

  db.updateBalance(userId, -item.preis);
  db.db.prepare(`UPDATE kartographen SET ${typ} = ? WHERE user_id = ?`).run(idx, userId);

  const embed = new EmbedBuilder()
    .setTitle('🧭 Werkzeug aufgerüstet!')
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

  const k = getKartograph(userId);
  const kosten = 250 + (k.level * 60);
  const balance = db.getBalance(userId);
  if (balance < kosten) {
    return interaction.reply({ content: `❌ Training kostet ${kosten} 🪙 (hast: ${balance} 🪙).`, ephemeral: true });
  }

  cooldowns.set(`train_${userId}`, Date.now());
  db.updateBalance(userId, -kosten);

  const gewinn = Math.floor(Math.random() * 3) + 1;
  const xpGewinn = 12 + Math.floor(Math.random() * 10);
  db.db.prepare('UPDATE kartographen SET praezision = praezision + ?, xp = xp + ? WHERE user_id = ?')
    .run(gewinn, xpGewinn, userId);

  const embed = new EmbedBuilder()
    .setTitle('📐 Training abgeschlossen!')
    .setColor(0x3498DB)
    .setDescription(`Präzision +${gewinn}!\n📊 +${xpGewinn} XP | -${kosten} 🪙`);
  return interaction.reply({ embeds: [embed] });
}

async function handleAuftrag(interaction, userId) {
  const k = getKartograph(userId);
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
  const bonus = getWerkzeugBonus(k);
  const gesamtSkill = k.praezision + bonus;

  const erfolgChance = Math.min(0.85, 0.35 + (gesamtSkill / 180));
  const erfolg = Math.random() < erfolgChance;

  if (!erfolg) {
    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setTitle('📋 Auftrag gescheitert')
        .setColor(0xCC0000)
        .setDescription(`${auftraggeber.name} war mit deiner Karte nicht zufrieden.\nVerbessere deine Präzision!`)
      ]
    });
  }

  const belohnung = Math.floor((250 + schwierigkeit * 120) * auftraggeber.mult);
  const xpGewinn = 15 + schwierigkeit * 4;
  db.updateBalance(userId, belohnung);
  db.db.prepare('UPDATE kartographen SET xp = xp + ?, ruf = ruf + ? WHERE user_id = ?')
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

  const k1 = getKartograph(userId);
  const k2 = getKartograph(gegner.id);

  const skill1 = k1.praezision + getWerkzeugBonus(k1) + k1.level * 5;
  const skill2 = k2.praezision + getWerkzeugBonus(k2) + k2.level * 5;

  const score1 = skill1 + k1.karten_gesamt * 2 + k1.entdeckungen * 3 + Math.floor(Math.random() * 40);
  const score2 = skill2 + k2.karten_gesamt * 2 + k2.entdeckungen * 3 + Math.floor(Math.random() * 40);

  const gewinner = score1 >= score2 ? userId : gegner.id;
  const preis = 350 + Math.floor(Math.random() * 450);

  db.updateBalance(gewinner, preis);
  db.db.prepare('UPDATE kartographen SET ruf = ruf + 5, xp = xp + 15 WHERE user_id = ?').run(gewinner);

  const embed = new EmbedBuilder()
    .setTitle('🏆 Kartographie-Duell!')
    .setColor(0xFFD700)
    .setDescription([
      `**${interaction.user.username}:** ${score1} Punkte`,
      `**${gegner.username}:** ${score2} Punkte`,
      '',
      `🥇 **${gewinner === userId ? interaction.user.username : gegner.username}** gewinnt ${preis} 🪙 und +5 Ruf!`,
    ].join('\n'));
  return interaction.reply({ embeds: [embed] });
}
