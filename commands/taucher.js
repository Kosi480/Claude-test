const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

const cooldowns = new Map();

const TAUCHGEBIETE = [
  { name: 'Küstenriff', tiefe: 10, minLevel: 1, belohnungMult: 1.0, funde: ['Muschel', 'Seestern', 'Korallenstück'] },
  { name: 'Schiffswrack', tiefe: 25, minLevel: 2, belohnungMult: 1.3, funde: ['Alte Münze', 'Kompass', 'Logbuch'] },
  { name: 'Unterwasserhöhle', tiefe: 40, minLevel: 3, belohnungMult: 1.6, funde: ['Kristall', 'Höhlenperle', 'Stalaktit'] },
  { name: 'Korallenwald', tiefe: 55, minLevel: 4, belohnungMult: 1.9, funde: ['Seltene Koralle', 'Seepferdchen-Fossil', 'Perle'] },
  { name: 'Tiefsee-Ebene', tiefe: 80, minLevel: 5, belohnungMult: 2.2, funde: ['Tiefsee-Auge', 'Biolumineszenz-Probe', 'Schwarzer Kristall'] },
  { name: 'Vulkanschlot', tiefe: 120, minLevel: 7, belohnungMult: 2.8, funde: ['Obsidian', 'Magma-Kristall', 'Schwefelgold'] },
  { name: 'Marianengraben', tiefe: 200, minLevel: 9, belohnungMult: 3.5, funde: ['Urzeitfossil', 'Abyssal-Juwel', 'Dunkle Materie'] },
  { name: 'Versunkene Stadt', tiefe: 300, minLevel: 12, belohnungMult: 4.5, funde: ['Atlantis-Artefakt', 'Poseidons Scherbe', 'Ewige Perle'] },
];

const AUSRUESTUNG = {
  maske: [
    { name: 'Einfache Maske', bonus: 0, preis: 0 },
    { name: 'Profi-Maske', bonus: 5, preis: 3000 },
    { name: 'Tiefsee-Helm', bonus: 12, preis: 12000 },
    { name: 'Nano-Visier', bonus: 22, preis: 35000 },
  ],
  anzug: [
    { name: 'Neoprenanzug', bonus: 0, preis: 0 },
    { name: 'Trockenanzug', bonus: 5, preis: 4000 },
    { name: 'Druckanzug', bonus: 12, preis: 15000 },
    { name: 'Exo-Tauchanzug', bonus: 25, preis: 40000 },
  ],
  flossen: [
    { name: 'Schwimmflossen', bonus: 0, preis: 0 },
    { name: 'Jetflossen', bonus: 4, preis: 2500 },
    { name: 'Hydro-Antrieb', bonus: 10, preis: 10000 },
    { name: 'Ionenantrieb', bonus: 20, preis: 30000 },
  ],
  lampe: [
    { name: 'Taschenlampe', bonus: 0, preis: 0 },
    { name: 'Halogen-Lampe', bonus: 3, preis: 2000 },
    { name: 'LED-Scheinwerfer', bonus: 8, preis: 8000 },
    { name: 'Sonar-Scanner', bonus: 18, preis: 25000 },
  ],
};

const SCHAETZE = [
  { name: 'Rostige Dose', seltenheit: 'Gewöhnlich', wert: 50, chance: 0.25 },
  { name: 'Antike Vase', seltenheit: 'Ungewöhnlich', wert: 200, chance: 0.20 },
  { name: 'Goldbarren', seltenheit: 'Selten', wert: 500, chance: 0.18 },
  { name: 'Piratenschatz', seltenheit: 'Selten', wert: 800, chance: 0.12 },
  { name: 'Neptuns Dreizack-Fragment', seltenheit: 'Episch', wert: 1500, chance: 0.10 },
  { name: 'Versteinertes Drachenei', seltenheit: 'Episch', wert: 2500, chance: 0.07 },
  { name: 'Kristallschädel', seltenheit: 'Legendär', wert: 5000, chance: 0.05 },
  { name: 'Herz des Ozeans', seltenheit: 'Legendär', wert: 10000, chance: 0.02 },
  { name: 'Poseidons Krone', seltenheit: 'Mythisch', wert: 25000, chance: 0.01 },
];

const KUNDEN = [
  { name: 'Museum', mult: 1.0 },
  { name: 'Privatsammler', mult: 1.2 },
  { name: 'Universität', mult: 0.9 },
  { name: 'Auktionshaus', mult: 1.4 },
  { name: 'Antiquitätenhändler', mult: 1.1 },
  { name: 'Meeresbiologe', mult: 1.3 },
  { name: 'Juwelier', mult: 1.5 },
  { name: 'Abenteurer', mult: 0.8 },
];

const TAUCHEREIGNISSE = [
  { text: 'Du entdeckst eine versteckte Grotte!', bonusMult: 1.5 },
  { text: 'Ein freundlicher Delfin führt dich zu einem Fund!', bonusMult: 1.4 },
  { text: 'Eine starke Strömung erschwert den Tauchgang.', bonusMult: 0.7 },
  { text: 'Deine Lampe flackert — du musst dich beeilen!', bonusMult: 0.8 },
  { text: 'Perfekte Sichtbedingungen heute!', bonusMult: 1.3 },
  { text: 'Ein Hai kreuzt deinen Weg — du musst ausweichen!', bonusMult: 0.6 },
  { text: 'Du findest ein altes Logbuch mit einer Schatzkarte!', bonusMult: 1.6 },
  { text: 'Die Unterwasserwelt ist atemberaubend schön.', bonusMult: 1.1 },
  { text: 'Ein Unwetter an der Oberfläche sorgt für Unruhe.', bonusMult: 0.75 },
  { text: 'Du entdeckst ein bisher unbekanntes Wrack!', bonusMult: 1.7 },
];

function ensureTaucherTable() {
  db.db.exec(`CREATE TABLE IF NOT EXISTS taucher (
    user_id TEXT PRIMARY KEY,
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    tauchgaenge INTEGER DEFAULT 0,
    tiefster_tauchgang INTEGER DEFAULT 0,
    sauerstoff INTEGER DEFAULT 100,
    maske INTEGER DEFAULT 0,
    anzug INTEGER DEFAULT 0,
    flossen INTEGER DEFAULT 0,
    lampe INTEGER DEFAULT 0,
    muscheln INTEGER DEFAULT 0,
    perlen INTEGER DEFAULT 0,
    kristalle INTEGER DEFAULT 0,
    ruf INTEGER DEFAULT 0,
    last_dive TEXT
  )`);
  db.db.exec(`CREATE TABLE IF NOT EXISTS tauch_funde (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    fund_name TEXT,
    seltenheit TEXT,
    wert INTEGER,
    gebiet TEXT,
    gefunden_am TEXT DEFAULT (datetime('now'))
  )`);
}

function getTaucher(userId) {
  ensureTaucherTable();
  let t = db.db.prepare('SELECT * FROM taucher WHERE user_id = ?').get(userId);
  if (!t) {
    db.db.prepare('INSERT INTO taucher (user_id) VALUES (?)').run(userId);
    t = db.db.prepare('SELECT * FROM taucher WHERE user_id = ?').get(userId);
  }
  return t;
}

function getXpForLevel(level) {
  return Math.floor(100 * Math.pow(1.5, level - 1));
}

function getAusruestungBonus(t) {
  return AUSRUESTUNG.maske[t.maske].bonus +
    AUSRUESTUNG.anzug[t.anzug].bonus +
    AUSRUESTUNG.flossen[t.flossen].bonus +
    AUSRUESTUNG.lampe[t.lampe].bonus;
}

function getMaxTiefe(t) {
  return 10 + (t.level * 15) + getAusruestungBonus(t);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('taucher')
    .setDescription('🤿 Werde ein Tiefseetaucher und finde versunkene Schätze!')
    .addSubcommand(s => s.setName('profil').setDescription('Zeige dein Taucherprofil'))
    .addSubcommand(s => s.setName('gebiete').setDescription('Zeige alle Tauchgebiete'))
    .addSubcommand(s => s.setName('tauchen').setDescription('Tauche in ein Gebiet')
      .addIntegerOption(o => o.setName('gebiet').setDescription('Gebietsnummer (1-8)').setRequired(true)))
    .addSubcommand(s => s.setName('bergen').setDescription('Birg Schätze aus den Tiefen'))
    .addSubcommand(s => s.setName('verkaufen').setDescription('Verkaufe deine Funde'))
    .addSubcommand(s => s.setName('funde').setDescription('Zeige deine gesammelten Funde'))
    .addSubcommand(s => s.setName('ausruestung').setDescription('Kaufe bessere Tauchausrüstung')
      .addStringOption(o => o.setName('typ').setDescription('maske/anzug/flossen/lampe').setRequired(true))
      .addIntegerOption(o => o.setName('stufe').setDescription('Stufe (2-4)').setRequired(true)))
    .addSubcommand(s => s.setName('trainieren').setDescription('Trainiere deine Tauchfähigkeiten'))
    .addSubcommand(s => s.setName('wettbewerb').setDescription('PvP Tauchwettbewerb')
      .addUserOption(o => o.setName('gegner').setDescription('Dein Gegner').setRequired(true))),

  async execute(interaction) {
    const config = require('../config.json');
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    switch (sub) {
      case 'profil': return handleProfil(interaction, userId);
      case 'gebiete': return handleGebiete(interaction, userId);
      case 'tauchen': return handleTauchen(interaction, userId);
      case 'bergen': return handleBergen(interaction, userId);
      case 'verkaufen': return handleVerkaufen(interaction, userId);
      case 'funde': return handleFunde(interaction, userId);
      case 'ausruestung': return handleAusruestung(interaction, userId);
      case 'trainieren': return handleTrainieren(interaction, userId);
      case 'wettbewerb': return handleWettbewerb(interaction, userId);
    }
  }
};

async function handleProfil(interaction, userId) {
  const t = getTaucher(userId);
  const xpNeeded = getXpForLevel(t.level);
  const maxTiefe = getMaxTiefe(t);

  const embed = new EmbedBuilder()
    .setTitle('🤿 Taucherprofil')
    .setColor(0x006994)
    .addFields(
      { name: '📊 Level', value: `${t.level} (${t.xp}/${xpNeeded} XP)`, inline: true },
      { name: '🌊 Tauchgänge', value: `${t.tauchgaenge}`, inline: true },
      { name: '📏 Max. Tiefe', value: `${maxTiefe}m`, inline: true },
      { name: '⬇️ Tiefster Tauchgang', value: `${t.tiefster_tauchgang}m`, inline: true },
      { name: '🫧 Sauerstoff', value: `${t.sauerstoff}%`, inline: true },
      { name: '⭐ Ruf', value: `${t.ruf}`, inline: true },
      { name: '🎭 Ausrüstung', value: [
        `Maske: ${AUSRUESTUNG.maske[t.maske].name}`,
        `Anzug: ${AUSRUESTUNG.anzug[t.anzug].name}`,
        `Flossen: ${AUSRUESTUNG.flossen[t.flossen].name}`,
        `Lampe: ${AUSRUESTUNG.lampe[t.lampe].name}`,
      ].join('\n') },
      { name: '💎 Ressourcen', value: `🐚 ${t.muscheln} Muscheln | 🔮 ${t.perlen} Perlen | 💠 ${t.kristalle} Kristalle`, inline: false },
    );
  return interaction.reply({ embeds: [embed] });
}

async function handleGebiete(interaction, userId) {
  const t = getTaucher(userId);
  const maxTiefe = getMaxTiefe(t);

  const list = TAUCHGEBIETE.map((g, i) => {
    const erreichbar = maxTiefe >= g.tiefe && t.level >= g.minLevel;
    const status = erreichbar ? '✅' : '🔒';
    return `${status} **${i + 1}. ${g.name}** — Tiefe: ${g.tiefe}m | Ab Level ${g.minLevel} | x${g.belohnungMult}`;
  }).join('\n');

  const embed = new EmbedBuilder()
    .setTitle('🌊 Tauchgebiete')
    .setColor(0x006994)
    .setDescription(list)
    .setFooter({ text: `Deine max. Tiefe: ${maxTiefe}m | Level ${t.level}` });
  return interaction.reply({ embeds: [embed] });
}

async function handleTauchen(interaction, userId) {
  const cd = cooldowns.get(`dive_${userId}`);
  if (cd && Date.now() - cd < 30000) {
    const rest = Math.ceil((30000 - (Date.now() - cd)) / 1000);
    return interaction.reply({ content: `⏳ Du musst noch ${rest}s warten bevor du wieder tauchen kannst.`, ephemeral: true });
  }

  const t = getTaucher(userId);
  const gebietNr = interaction.options.getInteger('gebiet');
  if (gebietNr < 1 || gebietNr > TAUCHGEBIETE.length) {
    return interaction.reply({ content: `❌ Ungültiges Gebiet! Wähle 1-${TAUCHGEBIETE.length}.`, ephemeral: true });
  }

  const gebiet = TAUCHGEBIETE[gebietNr - 1];
  const maxTiefe = getMaxTiefe(t);

  if (t.level < gebiet.minLevel || maxTiefe < gebiet.tiefe) {
    return interaction.reply({ content: `🔒 Du brauchst mindestens Level ${gebiet.minLevel} und ${gebiet.tiefe}m Tauchtiefe für ${gebiet.name}!`, ephemeral: true });
  }

  cooldowns.set(`dive_${userId}`, Date.now());

  const ereignis = TAUCHEREIGNISSE[Math.floor(Math.random() * TAUCHEREIGNISSE.length)];
  const basisXp = Math.floor(15 * gebiet.belohnungMult);
  const xpGewinn = Math.floor(basisXp * ereignis.bonusMult);

  let fundText = '';
  const zufallsFund = Math.random();
  let gesammelteRessourcen = { muscheln: 0, perlen: 0, kristalle: 0 };

  if (zufallsFund < 0.4) {
    gesammelteRessourcen.muscheln = Math.floor(Math.random() * 3 * gebiet.belohnungMult) + 1;
    fundText = `🐚 ${gesammelteRessourcen.muscheln} Muscheln gefunden!`;
  } else if (zufallsFund < 0.7) {
    gesammelteRessourcen.perlen = Math.floor(Math.random() * 2 * gebiet.belohnungMult) + 1;
    fundText = `🔮 ${gesammelteRessourcen.perlen} Perlen gefunden!`;
  } else if (zufallsFund < 0.85) {
    gesammelteRessourcen.kristalle = Math.floor(Math.random() * 2) + 1;
    fundText = `💠 ${gesammelteRessourcen.kristalle} Kristalle gefunden!`;
  }

  let schatzText = '';
  const schatzChance = 0.15 + (t.level * 0.02) + (getAusruestungBonus(t) * 0.002);
  if (Math.random() < schatzChance * ereignis.bonusMult) {
    let roll = Math.random();
    let cumChance = 0;
    for (const schatz of SCHAETZE) {
      cumChance += schatz.chance;
      if (roll < cumChance) {
        db.db.prepare('INSERT INTO tauch_funde (user_id, fund_name, seltenheit, wert, gebiet) VALUES (?, ?, ?, ?, ?)')
          .run(userId, schatz.name, schatz.seltenheit, Math.floor(schatz.wert * gebiet.belohnungMult), gebiet.name);
        schatzText = `\n🏆 **SCHATZ GEFUNDEN:** ${schatz.name} (${schatz.seltenheit}) — Wert: ${Math.floor(schatz.wert * gebiet.belohnungMult)} 🪙`;
        break;
      }
    }
  }

  const neuesTiefenRecord = Math.max(t.tiefster_tauchgang, gebiet.tiefe);
  db.db.prepare(`UPDATE taucher SET xp = xp + ?, tauchgaenge = tauchgaenge + 1,
    tiefster_tauchgang = ?, muscheln = muscheln + ?, perlen = perlen + ?, kristalle = kristalle + ?
    WHERE user_id = ?`).run(xpGewinn, neuesTiefenRecord, gesammelteRessourcen.muscheln, gesammelteRessourcen.perlen, gesammelteRessourcen.kristalle, userId);

  const updated = getTaucher(userId);
  const xpNeeded = getXpForLevel(updated.level);
  let levelUpText = '';
  if (updated.xp >= xpNeeded) {
    db.db.prepare('UPDATE taucher SET level = level + 1, xp = xp - ? WHERE user_id = ?').run(xpNeeded, userId);
    levelUpText = `\n🎉 **LEVEL UP!** Du bist jetzt Level ${updated.level + 1}!`;
  }

  const embed = new EmbedBuilder()
    .setTitle(`🤿 Tauchgang: ${gebiet.name}`)
    .setColor(ereignis.bonusMult >= 1.0 ? 0x00AA00 : 0xCC6600)
    .setDescription([
      `📍 Tiefe: ${gebiet.tiefe}m`,
      `\n💫 *${ereignis.text}*`,
      fundText ? `\n${fundText}` : '',
      schatzText,
      `\n📊 +${xpGewinn} XP`,
      levelUpText,
    ].filter(Boolean).join('\n'));
  return interaction.reply({ embeds: [embed] });
}

async function handleBergen(interaction, userId) {
  const t = getTaucher(userId);
  if (t.tauchgaenge < 1) {
    return interaction.reply({ content: '❌ Du musst zuerst tauchen gehen!', ephemeral: true });
  }

  const bergungsChance = 0.3 + (t.level * 0.03);
  if (Math.random() > bergungsChance) {
    return interaction.reply({ content: '🌊 Die Bergung war leider nicht erfolgreich. Versuche es erneut!', ephemeral: true });
  }

  const coins = Math.floor((50 + Math.random() * 100) * (1 + t.level * 0.1));
  db.updateBalance(userId, coins);
  db.db.prepare('UPDATE taucher SET ruf = ruf + 1 WHERE user_id = ?').run(userId);

  const embed = new EmbedBuilder()
    .setTitle('⚓ Bergung erfolgreich!')
    .setColor(0x00AA00)
    .setDescription(`Du hast Unterwassergüter geborgen und ${coins} 🪙 verdient!\n⭐ +1 Ruf`);
  return interaction.reply({ embeds: [embed] });
}

async function handleVerkaufen(interaction, userId) {
  ensureTaucherTable();
  const funde = db.db.prepare('SELECT * FROM tauch_funde WHERE user_id = ?').all(userId);

  if (funde.length === 0) {
    return interaction.reply({ content: '❌ Du hast keine Funde zum Verkaufen!', ephemeral: true });
  }

  const kunde = KUNDEN[Math.floor(Math.random() * KUNDEN.length)];
  let gesamtWert = 0;
  const verkauft = [];

  for (const fund of funde) {
    const preis = Math.floor(fund.wert * kunde.mult);
    gesamtWert += preis;
    verkauft.push(`${fund.fund_name} (${fund.seltenheit}) — ${preis} 🪙`);
  }

  db.updateBalance(userId, gesamtWert);
  db.db.prepare('DELETE FROM tauch_funde WHERE user_id = ?').run(userId);
  db.db.prepare('UPDATE taucher SET ruf = ruf + ? WHERE user_id = ?').run(Math.floor(funde.length * 2), userId);

  const embed = new EmbedBuilder()
    .setTitle('💰 Funde verkauft!')
    .setColor(0xFFD700)
    .setDescription(`**Käufer:** ${kunde.name} (x${kunde.mult})\n\n${verkauft.slice(0, 10).join('\n')}${verkauft.length > 10 ? `\n...und ${verkauft.length - 10} weitere` : ''}\n\n**Gesamt: ${gesamtWert} 🪙**`);
  return interaction.reply({ embeds: [embed] });
}

async function handleFunde(interaction, userId) {
  ensureTaucherTable();
  const funde = db.db.prepare('SELECT * FROM tauch_funde WHERE user_id = ? ORDER BY wert DESC').all(userId);

  if (funde.length === 0) {
    return interaction.reply({ content: '📭 Du hast noch keine Funde. Geh tauchen!', ephemeral: true });
  }

  const list = funde.slice(0, 15).map((f, i) =>
    `**${i + 1}.** ${f.fund_name} — ${f.seltenheit} | ${f.wert} 🪙 | 📍 ${f.gebiet}`
  ).join('\n');

  const embed = new EmbedBuilder()
    .setTitle('🏛️ Deine Funde')
    .setColor(0x006994)
    .setDescription(list)
    .setFooter({ text: `${funde.length} Funde gesamt` });
  return interaction.reply({ embeds: [embed] });
}

async function handleAusruestung(interaction, userId) {
  const t = getTaucher(userId);
  const typ = interaction.options.getString('typ').toLowerCase();
  const stufe = interaction.options.getInteger('stufe');

  if (!AUSRUESTUNG[typ]) {
    return interaction.reply({ content: '❌ Ungültiger Typ! Wähle: maske, anzug, flossen oder lampe.', ephemeral: true });
  }

  if (stufe < 2 || stufe > AUSRUESTUNG[typ].length) {
    return interaction.reply({ content: `❌ Ungültige Stufe! Wähle 2-${AUSRUESTUNG[typ].length}.`, ephemeral: true });
  }

  const idx = stufe - 1;
  if (t[typ] >= idx) {
    return interaction.reply({ content: '❌ Du hast bereits diese oder eine bessere Ausrüstung!', ephemeral: true });
  }

  if (t[typ] < idx - 1) {
    return interaction.reply({ content: '❌ Du musst zuerst die vorherige Stufe kaufen!', ephemeral: true });
  }

  const item = AUSRUESTUNG[typ][idx];
  const balance = db.getBalance(userId);
  if (balance < item.preis) {
    return interaction.reply({ content: `❌ Du brauchst ${item.preis} 🪙 (hast: ${balance} 🪙).`, ephemeral: true });
  }

  db.updateBalance(userId, -item.preis);
  db.db.prepare(`UPDATE taucher SET ${typ} = ? WHERE user_id = ?`).run(idx, userId);

  const embed = new EmbedBuilder()
    .setTitle('🛒 Ausrüstung gekauft!')
    .setColor(0x00AA00)
    .setDescription(`Du hast **${item.name}** für ${item.preis} 🪙 gekauft!\n+${item.bonus} Tauchtiefe-Bonus`);
  return interaction.reply({ embeds: [embed] });
}

async function handleTrainieren(interaction, userId) {
  const cd = cooldowns.get(`train_${userId}`);
  if (cd && Date.now() - cd < 60000) {
    const rest = Math.ceil((60000 - (Date.now() - cd)) / 1000);
    return interaction.reply({ content: `⏳ Du kannst in ${rest}s wieder trainieren.`, ephemeral: true });
  }

  const t = getTaucher(userId);
  const kosten = 200 + (t.level * 50);
  const balance = db.getBalance(userId);
  if (balance < kosten) {
    return interaction.reply({ content: `❌ Training kostet ${kosten} 🪙 (hast: ${balance} 🪙).`, ephemeral: true });
  }

  cooldowns.set(`train_${userId}`, Date.now());
  db.updateBalance(userId, -kosten);

  const xpGewinn = 20 + Math.floor(Math.random() * 15);
  db.db.prepare('UPDATE taucher SET xp = xp + ? WHERE user_id = ?').run(xpGewinn, userId);

  const updated = getTaucher(userId);
  const xpNeeded = getXpForLevel(updated.level);
  let levelUpText = '';
  if (updated.xp >= xpNeeded) {
    db.db.prepare('UPDATE taucher SET level = level + 1, xp = xp - ? WHERE user_id = ?').run(xpNeeded, userId);
    levelUpText = `\n🎉 **LEVEL UP!** Du bist jetzt Level ${updated.level + 1}!`;
  }

  const embed = new EmbedBuilder()
    .setTitle('🏋️ Training abgeschlossen!')
    .setColor(0x3498DB)
    .setDescription(`Du hast deine Tauchfähigkeiten verbessert!\n📊 +${xpGewinn} XP | -${kosten} 🪙${levelUpText}`);
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

  const t1 = getTaucher(userId);
  const t2 = getTaucher(gegner.id);

  const score1 = t1.level * 10 + t1.tauchgaenge * 2 + getAusruestungBonus(t1) + Math.floor(Math.random() * 50);
  const score2 = t2.level * 10 + t2.tauchgaenge * 2 + getAusruestungBonus(t2) + Math.floor(Math.random() * 50);

  const gewinner = score1 >= score2 ? userId : gegner.id;
  const verlierer = gewinner === userId ? gegner.id : userId;
  const preis = 200 + Math.floor(Math.random() * 300);

  db.updateBalance(gewinner, preis);
  db.db.prepare('UPDATE taucher SET ruf = ruf + 5 WHERE user_id = ?').run(gewinner);
  db.db.prepare('UPDATE taucher SET xp = xp + 10 WHERE user_id = ?').run(gewinner);

  const embed = new EmbedBuilder()
    .setTitle('🏆 Tauchwettbewerb!')
    .setColor(0xFFD700)
    .setDescription([
      `**${interaction.user.username}:** ${score1} Punkte`,
      `**${gegner.username}:** ${score2} Punkte`,
      '',
      `🥇 **${gewinner === userId ? interaction.user.username : gegner.username}** gewinnt ${preis} 🪙 und +5 Ruf!`,
    ].join('\n'));
  return interaction.reply({ embeds: [embed] });
}
