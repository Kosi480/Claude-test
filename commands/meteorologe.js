const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

const cooldowns = new Map();

const WETTERSTATIONEN = [
  { name: 'Feldstation', kapazitaet: 3, preis: 0 },
  { name: 'Wetterturm', kapazitaet: 5, preis: 8000 },
  { name: 'Observatorium', kapazitaet: 8, preis: 25000 },
  { name: 'Satellitenzentrale', kapazitaet: 12, preis: 60000 },
];

const INSTRUMENTE = [
  { name: 'Thermometer', preis: 500, genauigkeit: 5 },
  { name: 'Barometer', preis: 800, genauigkeit: 8 },
  { name: 'Anemometer', preis: 1200, genauigkeit: 10 },
  { name: 'Hygrometer', preis: 1500, genauigkeit: 12 },
  { name: 'Regenmesser', preis: 2000, genauigkeit: 15 },
  { name: 'Wetterballon', preis: 5000, genauigkeit: 20 },
  { name: 'Doppler-Radar', preis: 12000, genauigkeit: 30 },
  { name: 'Wettersatellit', preis: 30000, genauigkeit: 45 },
];

const WETTERLAGEN = [
  { name: 'Sonnenschein', icon: '☀️', schwierigkeit: 1, belohnung: 50 },
  { name: 'Bewölkt', icon: '⛅', schwierigkeit: 2, belohnung: 80 },
  { name: 'Regen', icon: '🌧️', schwierigkeit: 3, belohnung: 120 },
  { name: 'Gewitter', icon: '⛈️', schwierigkeit: 4, belohnung: 180 },
  { name: 'Hagel', icon: '🌨️', schwierigkeit: 5, belohnung: 250 },
  { name: 'Schneesturm', icon: '❄️', schwierigkeit: 6, belohnung: 350 },
  { name: 'Tornado', icon: '🌪️', schwierigkeit: 8, belohnung: 500 },
  { name: 'Hurrikan', icon: '🌀', schwierigkeit: 10, belohnung: 800 },
  { name: 'Supervulkan-Asche', icon: '🌋', schwierigkeit: 12, belohnung: 1200 },
  { name: 'Sonnensturm', icon: '💫', schwierigkeit: 15, belohnung: 2000 },
];

const REGIONEN = [
  { name: 'Flachland', minLevel: 1, wetterChancen: [0.3, 0.25, 0.2, 0.1, 0.05, 0.05, 0.03, 0.01, 0.005, 0.005] },
  { name: 'Küste', minLevel: 2, wetterChancen: [0.15, 0.2, 0.25, 0.15, 0.08, 0.05, 0.05, 0.04, 0.02, 0.01] },
  { name: 'Gebirge', minLevel: 3, wetterChancen: [0.1, 0.15, 0.2, 0.15, 0.12, 0.1, 0.08, 0.05, 0.03, 0.02] },
  { name: 'Wüste', minLevel: 5, wetterChancen: [0.35, 0.1, 0.05, 0.1, 0.1, 0.05, 0.1, 0.05, 0.05, 0.05] },
  { name: 'Tropen', minLevel: 7, wetterChancen: [0.1, 0.1, 0.15, 0.15, 0.1, 0.05, 0.1, 0.12, 0.08, 0.05] },
  { name: 'Arktis', minLevel: 9, wetterChancen: [0.05, 0.1, 0.1, 0.1, 0.1, 0.2, 0.1, 0.1, 0.08, 0.07] },
  { name: 'Stratosphäre', minLevel: 12, wetterChancen: [0.05, 0.05, 0.05, 0.05, 0.05, 0.1, 0.15, 0.15, 0.15, 0.2] },
];

const FORSCHUNGEN = [
  { name: 'Wolkenbildung', kosten: 2000, xp: 50, beschreibung: 'Grundlagen der Wolkenentstehung' },
  { name: 'Druckanalyse', kosten: 4000, xp: 80, beschreibung: 'Luftdrucksysteme verstehen' },
  { name: 'Sturmjagd', kosten: 8000, xp: 120, beschreibung: 'Extremwetter vorhersagen' },
  { name: 'Klimamodelle', kosten: 15000, xp: 200, beschreibung: 'Komplexe Wettermodelle erstellen' },
  { name: 'Atmosphärenphysik', kosten: 30000, xp: 350, beschreibung: 'Die Physik der Atmosphäre meistern' },
  { name: 'Quantenmeteorologie', kosten: 60000, xp: 600, beschreibung: 'Wetter mit Quantencomputern vorhersagen' },
];

const AUFTRAGGEBER = [
  { name: 'Landwirt', mult: 1.0 },
  { name: 'Fluggesellschaft', mult: 1.3 },
  { name: 'Stadtverwaltung', mult: 1.1 },
  { name: 'Militär', mult: 1.5 },
  { name: 'Nachrichtensender', mult: 1.2 },
  { name: 'Schifffahrtsunternehmen', mult: 1.4 },
  { name: 'Forschungsinstitut', mult: 0.9 },
  { name: 'Versicherung', mult: 1.6 },
];

const VORHERSAGE_EREIGNISSE = [
  { text: 'Deine Instrumente liefern kristallklare Daten!', bonusMult: 1.5 },
  { text: 'Ein Wetterphänomen überrascht die Region!', bonusMult: 1.3 },
  { text: 'Interferenzen stören deine Messungen.', bonusMult: 0.7 },
  { text: 'Du entdeckst ein seltenes atmosphärisches Muster!', bonusMult: 1.6 },
  { text: 'Kalibrierungsprobleme verzögern die Analyse.', bonusMult: 0.8 },
  { text: 'Perfekte Bedingungen für eine Langzeitprognose!', bonusMult: 1.4 },
  { text: 'Ein Kollege teilt wertvolle Vergleichsdaten.', bonusMult: 1.2 },
  { text: 'Sonnenwinde beeinflussen die Messgeräte.', bonusMult: 0.75 },
  { text: 'Du entdeckst einen neuen Mikroklima-Effekt!', bonusMult: 1.7 },
  { text: 'Routinemessung ohne besondere Vorkommnisse.', bonusMult: 1.0 },
];

function ensureMeteoTable() {
  db.db.exec(`CREATE TABLE IF NOT EXISTS meteorologen (
    user_id TEXT PRIMARY KEY,
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    genauigkeit INTEGER DEFAULT 10,
    vorhersagen INTEGER DEFAULT 0,
    korrekte_vorhersagen INTEGER DEFAULT 0,
    station INTEGER DEFAULT 0,
    instrumente TEXT DEFAULT '[]',
    forschungen TEXT DEFAULT '[]',
    ruf INTEGER DEFAULT 0,
    wetterdaten INTEGER DEFAULT 0,
    stuerme_gejagt INTEGER DEFAULT 0,
    last_forecast TEXT
  )`);
  db.db.exec(`CREATE TABLE IF NOT EXISTS wetter_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    region TEXT,
    wetter TEXT,
    genauigkeit INTEGER,
    belohnung INTEGER,
    erstellt_am TEXT DEFAULT (datetime('now'))
  )`);
}

function getMeteo(userId) {
  ensureMeteoTable();
  let m = db.db.prepare('SELECT * FROM meteorologen WHERE user_id = ?').get(userId);
  if (!m) {
    db.db.prepare('INSERT INTO meteorologen (user_id) VALUES (?)').run(userId);
    m = db.db.prepare('SELECT * FROM meteorologen WHERE user_id = ?').get(userId);
  }
  return m;
}

function getXpForLevel(level) {
  return Math.floor(120 * Math.pow(1.45, level - 1));
}

function getGesamtGenauigkeit(m) {
  const instrumente = JSON.parse(m.instrumente || '[]');
  let bonus = 0;
  for (const idx of instrumente) {
    bonus += INSTRUMENTE[idx].genauigkeit;
  }
  return m.genauigkeit + bonus + (m.level * 3);
}

function waehleWetter(region) {
  const chancen = region.wetterChancen;
  let roll = Math.random();
  let cum = 0;
  for (let i = 0; i < chancen.length; i++) {
    cum += chancen[i];
    if (roll < cum) return WETTERLAGEN[i];
  }
  return WETTERLAGEN[0];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('meteorologe')
    .setDescription('🌦️ Werde Meteorologe und sage das Wetter vorher!')
    .addSubcommand(s => s.setName('status').setDescription('Zeige dein Meteorologen-Profil'))
    .addSubcommand(s => s.setName('regionen').setDescription('Zeige alle Wetterregionen'))
    .addSubcommand(s => s.setName('vorhersage').setDescription('Erstelle eine Wettervorhersage')
      .addIntegerOption(o => o.setName('region').setDescription('Regionsnummer (1-7)').setRequired(true)))
    .addSubcommand(s => s.setName('sturmjagd').setDescription('Jage einen Sturm für Daten und Ruhm')
      .addIntegerOption(o => o.setName('region').setDescription('Regionsnummer (1-7)').setRequired(true)))
    .addSubcommand(s => s.setName('instrumente').setDescription('Zeige und kaufe Messinstrumente')
      .addIntegerOption(o => o.setName('nr').setDescription('Instrument kaufen (1-8)')))
    .addSubcommand(s => s.setName('station').setDescription('Upgrade deine Wetterstation')
      .addIntegerOption(o => o.setName('stufe').setDescription('Stationsstufe (2-4)')))
    .addSubcommand(s => s.setName('forschung').setDescription('Betreibe Wetterforschung')
      .addIntegerOption(o => o.setName('nr').setDescription('Forschungsnummer (1-6)').setRequired(true)))
    .addSubcommand(s => s.setName('bericht').setDescription('Verkaufe einen Wetterbericht'))
    .addSubcommand(s => s.setName('wettbewerb').setDescription('PvP Vorhersage-Duell')
      .addUserOption(o => o.setName('gegner').setDescription('Dein Gegner').setRequired(true))),

  async execute(interaction) {
    const config = require('../config.json');
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    switch (sub) {
      case 'status': return handleStatus(interaction, userId);
      case 'regionen': return handleRegionen(interaction, userId);
      case 'vorhersage': return handleVorhersage(interaction, userId);
      case 'sturmjagd': return handleSturmjagd(interaction, userId);
      case 'instrumente': return handleInstrumente(interaction, userId);
      case 'station': return handleStation(interaction, userId);
      case 'forschung': return handleForschung(interaction, userId);
      case 'bericht': return handleBericht(interaction, userId);
      case 'wettbewerb': return handleWettbewerb(interaction, userId);
    }
  }
};

async function handleStatus(interaction, userId) {
  const m = getMeteo(userId);
  const xpNeeded = getXpForLevel(m.level);
  const genauigkeit = getGesamtGenauigkeit(m);
  const instrumente = JSON.parse(m.instrumente || '[]');
  const forschungen = JSON.parse(m.forschungen || '[]');
  const trefferquote = m.vorhersagen > 0 ? Math.floor((m.korrekte_vorhersagen / m.vorhersagen) * 100) : 0;

  const embed = new EmbedBuilder()
    .setTitle('🌦️ Meteorologen-Profil')
    .setColor(0x5B9BD5)
    .addFields(
      { name: '📊 Level', value: `${m.level} (${m.xp}/${xpNeeded} XP)`, inline: true },
      { name: '🎯 Genauigkeit', value: `${genauigkeit}%`, inline: true },
      { name: '⭐ Ruf', value: `${m.ruf}`, inline: true },
      { name: '📋 Vorhersagen', value: `${m.vorhersagen} (${trefferquote}% korrekt)`, inline: true },
      { name: '🌪️ Stürme gejagt', value: `${m.stuerme_gejagt}`, inline: true },
      { name: '📊 Wetterdaten', value: `${m.wetterdaten}`, inline: true },
      { name: '🏢 Station', value: WETTERSTATIONEN[m.station].name, inline: true },
      { name: '🔬 Instrumente', value: `${instrumente.length}/${WETTERSTATIONEN[m.station].kapazitaet}`, inline: true },
      { name: '📚 Forschungen', value: `${forschungen.length}/${FORSCHUNGEN.length}`, inline: true },
    );
  return interaction.reply({ embeds: [embed] });
}

async function handleRegionen(interaction, userId) {
  const m = getMeteo(userId);

  const list = REGIONEN.map((r, i) => {
    const unlocked = m.level >= r.minLevel;
    const status = unlocked ? '✅' : '🔒';
    return `${status} **${i + 1}. ${r.name}** — Ab Level ${r.minLevel}`;
  }).join('\n');

  const embed = new EmbedBuilder()
    .setTitle('🗺️ Wetterregionen')
    .setColor(0x5B9BD5)
    .setDescription(list)
    .setFooter({ text: `Dein Level: ${m.level}` });
  return interaction.reply({ embeds: [embed] });
}

async function handleVorhersage(interaction, userId) {
  const cd = cooldowns.get(`forecast_${userId}`);
  if (cd && Date.now() - cd < 45000) {
    const rest = Math.ceil((45000 - (Date.now() - cd)) / 1000);
    return interaction.reply({ content: `⏳ Nächste Vorhersage in ${rest}s möglich.`, ephemeral: true });
  }

  const m = getMeteo(userId);
  const regionNr = interaction.options.getInteger('region');
  if (regionNr < 1 || regionNr > REGIONEN.length) {
    return interaction.reply({ content: `❌ Ungültige Region! Wähle 1-${REGIONEN.length}.`, ephemeral: true });
  }

  const region = REGIONEN[regionNr - 1];
  if (m.level < region.minLevel) {
    return interaction.reply({ content: `🔒 Du brauchst Level ${region.minLevel} für ${region.name}!`, ephemeral: true });
  }

  cooldowns.set(`forecast_${userId}`, Date.now());

  const wetter = waehleWetter(region);
  const genauigkeit = getGesamtGenauigkeit(m);
  const ereignis = VORHERSAGE_EREIGNISSE[Math.floor(Math.random() * VORHERSAGE_EREIGNISSE.length)];

  const trefferChance = Math.min(0.9, (genauigkeit / 100) + 0.1);
  const korrekt = Math.random() < trefferChance;

  const basisBelohnung = wetter.belohnung;
  let belohnung = Math.floor(basisBelohnung * ereignis.bonusMult * (korrekt ? 1.5 : 0.5));

  const xpGewinn = Math.floor((10 + wetter.schwierigkeit * 3) * ereignis.bonusMult);

  db.updateBalance(userId, belohnung);
  db.db.prepare(`UPDATE meteorologen SET xp = xp + ?, vorhersagen = vorhersagen + 1,
    korrekte_vorhersagen = korrekte_vorhersagen + ?, wetterdaten = wetterdaten + ?,
    ruf = ruf + ? WHERE user_id = ?`)
    .run(xpGewinn, korrekt ? 1 : 0, wetter.schwierigkeit, korrekt ? 3 : 1, userId);

  db.db.prepare('INSERT INTO wetter_log (user_id, region, wetter, genauigkeit, belohnung) VALUES (?, ?, ?, ?, ?)')
    .run(userId, region.name, wetter.name, korrekt ? 1 : 0, belohnung);

  const updated = getMeteo(userId);
  const xpNeeded = getXpForLevel(updated.level);
  let levelUpText = '';
  if (updated.xp >= xpNeeded) {
    db.db.prepare('UPDATE meteorologen SET level = level + 1, xp = xp - ?, genauigkeit = genauigkeit + 2 WHERE user_id = ?').run(xpNeeded, userId);
    levelUpText = `\n🎉 **LEVEL UP!** Du bist jetzt Level ${updated.level + 1}! (+2 Genauigkeit)`;
  }

  const embed = new EmbedBuilder()
    .setTitle(`${wetter.icon} Vorhersage: ${region.name}`)
    .setColor(korrekt ? 0x00AA00 : 0xCC6600)
    .setDescription([
      `**Wetter:** ${wetter.icon} ${wetter.name} (Schwierigkeit: ${wetter.schwierigkeit})`,
      `**Vorhersage:** ${korrekt ? '✅ Korrekt!' : '❌ Daneben!'}`,
      `\n💫 *${ereignis.text}*`,
      `\n💰 ${belohnung} 🪙 | 📊 +${xpGewinn} XP | 📈 +${wetter.schwierigkeit} Wetterdaten`,
      levelUpText,
    ].filter(Boolean).join('\n'));
  return interaction.reply({ embeds: [embed] });
}

async function handleSturmjagd(interaction, userId) {
  const cd = cooldowns.get(`storm_${userId}`);
  if (cd && Date.now() - cd < 120000) {
    const rest = Math.ceil((120000 - (Date.now() - cd)) / 1000);
    return interaction.reply({ content: `⏳ Du musst ${rest}s warten vor der nächsten Sturmjagd.`, ephemeral: true });
  }

  const m = getMeteo(userId);
  if (m.level < 3) {
    return interaction.reply({ content: '🔒 Sturmjagd erfordert mindestens Level 3!', ephemeral: true });
  }

  const regionNr = interaction.options.getInteger('region');
  if (regionNr < 1 || regionNr > REGIONEN.length) {
    return interaction.reply({ content: `❌ Ungültige Region! Wähle 1-${REGIONEN.length}.`, ephemeral: true });
  }

  const region = REGIONEN[regionNr - 1];
  if (m.level < region.minLevel) {
    return interaction.reply({ content: `🔒 Du brauchst Level ${region.minLevel} für ${region.name}!`, ephemeral: true });
  }

  cooldowns.set(`storm_${userId}`, Date.now());

  const sturmStaerke = Math.floor(Math.random() * 10) + 1;
  const genauigkeit = getGesamtGenauigkeit(m);
  const erfolgChance = Math.min(0.85, (genauigkeit / 150) + 0.15);
  const erfolg = Math.random() < erfolgChance;

  if (!erfolg) {
    const schaden = Math.floor(Math.random() * 200) + 50;
    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setTitle('🌪️ Sturmjagd gescheitert!')
        .setColor(0xCC0000)
        .setDescription(`Der Sturm war zu stark! Du musstest fliehen.\n⚠️ Reparaturkosten: ${schaden} 🪙`)
      ]
    });
  }

  const belohnung = Math.floor((200 + sturmStaerke * 100) * (1 + m.level * 0.1));
  const xpGewinn = 30 + sturmStaerke * 5;
  const daten = sturmStaerke * 3;

  db.updateBalance(userId, belohnung);
  db.db.prepare(`UPDATE meteorologen SET xp = xp + ?, stuerme_gejagt = stuerme_gejagt + 1,
    wetterdaten = wetterdaten + ?, ruf = ruf + ? WHERE user_id = ?`)
    .run(xpGewinn, daten, sturmStaerke, userId);

  const updated = getMeteo(userId);
  const xpNeeded = getXpForLevel(updated.level);
  let levelUpText = '';
  if (updated.xp >= xpNeeded) {
    db.db.prepare('UPDATE meteorologen SET level = level + 1, xp = xp - ?, genauigkeit = genauigkeit + 2 WHERE user_id = ?').run(xpNeeded, userId);
    levelUpText = `\n🎉 **LEVEL UP!** Level ${updated.level + 1}!`;
  }

  const embed = new EmbedBuilder()
    .setTitle('🌪️ Sturmjagd erfolgreich!')
    .setColor(0x00AA00)
    .setDescription([
      `**Region:** ${region.name}`,
      `**Sturmstärke:** ${'⚡'.repeat(Math.min(sturmStaerke, 10))} (${sturmStaerke}/10)`,
      `\n💰 ${belohnung} 🪙 | 📊 +${xpGewinn} XP | 📈 +${daten} Wetterdaten`,
      levelUpText,
    ].filter(Boolean).join('\n'));
  return interaction.reply({ embeds: [embed] });
}

async function handleInstrumente(interaction, userId) {
  const m = getMeteo(userId);
  const nr = interaction.options.getInteger('nr');

  if (!nr) {
    const owned = JSON.parse(m.instrumente || '[]');
    const list = INSTRUMENTE.map((inst, i) => {
      const besitzt = owned.includes(i);
      return `${besitzt ? '✅' : '🔲'} **${i + 1}. ${inst.name}** — ${inst.preis} 🪙 | +${inst.genauigkeit}% Genauigkeit`;
    }).join('\n');

    const embed = new EmbedBuilder()
      .setTitle('🔬 Messinstrumente')
      .setColor(0x5B9BD5)
      .setDescription(list)
      .setFooter({ text: `Plätze: ${owned.length}/${WETTERSTATIONEN[m.station].kapazitaet}` });
    return interaction.reply({ embeds: [embed] });
  }

  if (nr < 1 || nr > INSTRUMENTE.length) {
    return interaction.reply({ content: `❌ Ungültige Nummer! Wähle 1-${INSTRUMENTE.length}.`, ephemeral: true });
  }

  const idx = nr - 1;
  const instrumente = JSON.parse(m.instrumente || '[]');

  if (instrumente.includes(idx)) {
    return interaction.reply({ content: '❌ Du besitzt dieses Instrument bereits!', ephemeral: true });
  }

  const maxKapazitaet = WETTERSTATIONEN[m.station].kapazitaet;
  if (instrumente.length >= maxKapazitaet) {
    return interaction.reply({ content: `❌ Deine Station hat nur Platz für ${maxKapazitaet} Instrumente! Upgrade deine Station.`, ephemeral: true });
  }

  const inst = INSTRUMENTE[idx];
  const balance = db.getBalance(userId);
  if (balance < inst.preis) {
    return interaction.reply({ content: `❌ Du brauchst ${inst.preis} 🪙 (hast: ${balance} 🪙).`, ephemeral: true });
  }

  db.updateBalance(userId, -inst.preis);
  instrumente.push(idx);
  db.db.prepare('UPDATE meteorologen SET instrumente = ? WHERE user_id = ?').run(JSON.stringify(instrumente), userId);

  const embed = new EmbedBuilder()
    .setTitle('🔬 Instrument gekauft!')
    .setColor(0x00AA00)
    .setDescription(`**${inst.name}** für ${inst.preis} 🪙 gekauft!\n+${inst.genauigkeit}% Genauigkeit`);
  return interaction.reply({ embeds: [embed] });
}

async function handleStation(interaction, userId) {
  const m = getMeteo(userId);
  const stufe = interaction.options.getInteger('stufe');

  if (!stufe) {
    const list = WETTERSTATIONEN.map((s, i) => {
      const aktuell = m.station === i ? ' ⬅️' : '';
      return `**${i + 1}. ${s.name}** — ${s.preis} 🪙 | ${s.kapazitaet} Instrument-Plätze${aktuell}`;
    }).join('\n');

    const embed = new EmbedBuilder()
      .setTitle('🏢 Wetterstationen')
      .setColor(0x5B9BD5)
      .setDescription(list);
    return interaction.reply({ embeds: [embed] });
  }

  if (stufe < 2 || stufe > WETTERSTATIONEN.length) {
    return interaction.reply({ content: `❌ Ungültige Stufe! Wähle 2-${WETTERSTATIONEN.length}.`, ephemeral: true });
  }

  const idx = stufe - 1;
  if (m.station >= idx) {
    return interaction.reply({ content: '❌ Du hast bereits diese oder eine bessere Station!', ephemeral: true });
  }
  if (m.station < idx - 1) {
    return interaction.reply({ content: '❌ Du musst zuerst die vorherige Stufe kaufen!', ephemeral: true });
  }

  const station = WETTERSTATIONEN[idx];
  const balance = db.getBalance(userId);
  if (balance < station.preis) {
    return interaction.reply({ content: `❌ Du brauchst ${station.preis} 🪙 (hast: ${balance} 🪙).`, ephemeral: true });
  }

  db.updateBalance(userId, -station.preis);
  db.db.prepare('UPDATE meteorologen SET station = ? WHERE user_id = ?').run(idx, userId);

  const embed = new EmbedBuilder()
    .setTitle('🏢 Station aufgerüstet!')
    .setColor(0x00AA00)
    .setDescription(`**${station.name}** für ${station.preis} 🪙 freigeschaltet!\nNeue Kapazität: ${station.kapazitaet} Instrumente`);
  return interaction.reply({ embeds: [embed] });
}

async function handleForschung(interaction, userId) {
  const m = getMeteo(userId);
  const nr = interaction.options.getInteger('nr');

  if (nr < 1 || nr > FORSCHUNGEN.length) {
    return interaction.reply({ content: `❌ Ungültige Nummer! Wähle 1-${FORSCHUNGEN.length}.`, ephemeral: true });
  }

  const idx = nr - 1;
  const forschungen = JSON.parse(m.forschungen || '[]');

  if (forschungen.includes(idx)) {
    return interaction.reply({ content: '❌ Diese Forschung hast du bereits abgeschlossen!', ephemeral: true });
  }

  if (idx > 0 && !forschungen.includes(idx - 1)) {
    return interaction.reply({ content: '❌ Du musst zuerst die vorherige Forschung abschließen!', ephemeral: true });
  }

  const forschung = FORSCHUNGEN[idx];
  const balance = db.getBalance(userId);
  if (balance < forschung.kosten) {
    return interaction.reply({ content: `❌ Du brauchst ${forschung.kosten} 🪙 (hast: ${balance} 🪙).`, ephemeral: true });
  }

  db.updateBalance(userId, -forschung.kosten);
  forschungen.push(idx);
  db.db.prepare('UPDATE meteorologen SET forschungen = ?, xp = xp + ?, genauigkeit = genauigkeit + 5 WHERE user_id = ?')
    .run(JSON.stringify(forschungen), forschung.xp, userId);

  const updated = getMeteo(userId);
  const xpNeeded = getXpForLevel(updated.level);
  let levelUpText = '';
  if (updated.xp >= xpNeeded) {
    db.db.prepare('UPDATE meteorologen SET level = level + 1, xp = xp - ?, genauigkeit = genauigkeit + 2 WHERE user_id = ?').run(xpNeeded, userId);
    levelUpText = `\n🎉 **LEVEL UP!** Level ${updated.level + 1}!`;
  }

  const embed = new EmbedBuilder()
    .setTitle('📚 Forschung abgeschlossen!')
    .setColor(0x9B59B6)
    .setDescription([
      `**${forschung.name}**`,
      `*${forschung.beschreibung}*`,
      `\n📊 +${forschung.xp} XP | +5% Genauigkeit | -${forschung.kosten} 🪙`,
      levelUpText,
    ].filter(Boolean).join('\n'));
  return interaction.reply({ embeds: [embed] });
}

async function handleBericht(interaction, userId) {
  const m = getMeteo(userId);

  if (m.wetterdaten < 10) {
    return interaction.reply({ content: `❌ Du brauchst mindestens 10 Wetterdaten für einen Bericht! (hast: ${m.wetterdaten})`, ephemeral: true });
  }

  const auftraggeber = AUFTRAGGEBER[Math.floor(Math.random() * AUFTRAGGEBER.length)];
  const datenVerwendet = Math.min(m.wetterdaten, 50);
  const basisPreis = datenVerwendet * 20;
  const preis = Math.floor(basisPreis * auftraggeber.mult * (1 + m.level * 0.05));

  db.updateBalance(userId, preis);
  db.db.prepare('UPDATE meteorologen SET wetterdaten = wetterdaten - ?, ruf = ruf + ? WHERE user_id = ?')
    .run(datenVerwendet, Math.floor(datenVerwendet / 5), userId);

  const embed = new EmbedBuilder()
    .setTitle('📋 Wetterbericht verkauft!')
    .setColor(0xFFD700)
    .setDescription([
      `**Auftraggeber:** ${auftraggeber.name} (x${auftraggeber.mult})`,
      `**Daten verwendet:** ${datenVerwendet}`,
      `\n💰 **${preis} 🪙 verdient!**`,
      `⭐ +${Math.floor(datenVerwendet / 5)} Ruf`,
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

  const m1 = getMeteo(userId);
  const m2 = getMeteo(gegner.id);

  const gen1 = getGesamtGenauigkeit(m1);
  const gen2 = getGesamtGenauigkeit(m2);

  const score1 = gen1 + m1.level * 5 + m1.korrekte_vorhersagen + Math.floor(Math.random() * 40);
  const score2 = gen2 + m2.level * 5 + m2.korrekte_vorhersagen + Math.floor(Math.random() * 40);

  const gewinner = score1 >= score2 ? userId : gegner.id;
  const preis = 300 + Math.floor(Math.random() * 400);

  db.updateBalance(gewinner, preis);
  db.db.prepare('UPDATE meteorologen SET ruf = ruf + 5, xp = xp + 15 WHERE user_id = ?').run(gewinner);

  const embed = new EmbedBuilder()
    .setTitle('🏆 Vorhersage-Duell!')
    .setColor(0xFFD700)
    .setDescription([
      `**${interaction.user.username}:** ${score1} Punkte (${gen1}% Genauigkeit)`,
      `**${gegner.username}:** ${score2} Punkte (${gen2}% Genauigkeit)`,
      '',
      `🥇 **${gewinner === userId ? interaction.user.username : gegner.username}** gewinnt ${preis} 🪙 und +5 Ruf!`,
    ].join('\n'));
  return interaction.reply({ embeds: [embed] });
}
