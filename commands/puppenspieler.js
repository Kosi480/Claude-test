const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

const cooldowns = new Map();

const PUPPEN_TYPEN = [
  { name: 'Handpuppe', preis: 200, qualitaet: 2, emoji: '🧤' },
  { name: 'Stabpuppe', preis: 400, qualitaet: 4, emoji: '🪄' },
  { name: 'Marionette', preis: 800, qualitaet: 7, emoji: '🎭' },
  { name: 'Schattenpuppe', preis: 1500, qualitaet: 10, emoji: '👤' },
  { name: 'Bauchrednerpuppe', preis: 3000, qualitaet: 15, emoji: '🗣️' },
  { name: 'Mechanische Puppe', preis: 6000, qualitaet: 20, emoji: '⚙️' },
  { name: 'Zauberpuppe', preis: 12000, qualitaet: 28, emoji: '✨' },
  { name: 'Lebende Marionette', preis: 25000, qualitaet: 40, emoji: '💫' },
];

const STUECKE = [
  { name: 'Kasperle-Show', minLevel: 1, puppen: 1, schwierigkeit: 1, belohnung: 150, xp: 10 },
  { name: 'Rotkäppchen', minLevel: 2, puppen: 2, schwierigkeit: 2, belohnung: 300, xp: 18 },
  { name: 'Hänsel und Gretel', minLevel: 3, puppen: 3, schwierigkeit: 3, belohnung: 550, xp: 28 },
  { name: 'Der gestiefelte Kater', minLevel: 4, puppen: 3, schwierigkeit: 4, belohnung: 900, xp: 40 },
  { name: 'Faust (Puppenspiel)', minLevel: 5, puppen: 4, schwierigkeit: 6, belohnung: 1500, xp: 60 },
  { name: 'Die Zauberflöte', minLevel: 7, puppen: 5, schwierigkeit: 7, belohnung: 2500, xp: 85 },
  { name: 'Shakespeares Sturm', minLevel: 9, puppen: 6, schwierigkeit: 9, belohnung: 4000, xp: 120 },
  { name: 'Das Große Welttheater', minLevel: 12, puppen: 8, schwierigkeit: 12, belohnung: 8000, xp: 200 },
];

const MATERIALIEN = [
  { name: 'Holz', preis: 50, spalte: 'holz' },
  { name: 'Stoff', preis: 80, spalte: 'stoff' },
  { name: 'Farbe', preis: 60, spalte: 'farbe' },
  { name: 'Faden', preis: 100, spalte: 'faden' },
  { name: 'Edelstein', preis: 500, spalte: 'edelstein' },
  { name: 'Magiefaden', preis: 1500, spalte: 'magiefaden' },
];

const UPGRADES = {
  buehne: [
    { name: 'Pappkarton-Bühne', bonus: 0, preis: 0 },
    { name: 'Holzbühne', bonus: 5, preis: 4000 },
    { name: 'Profibühne', bonus: 13, preis: 15000 },
    { name: 'Zaubertheater', bonus: 28, preis: 45000 },
  ],
  beleuchtung: [
    { name: 'Kerzen', bonus: 0, preis: 0 },
    { name: 'Öllampen', bonus: 4, preis: 3000 },
    { name: 'Scheinwerfer', bonus: 10, preis: 10000 },
    { name: 'Magisches Licht', bonus: 22, preis: 32000 },
  ],
  werkstatt: [
    { name: 'Küchentisch', bonus: 0, preis: 0 },
    { name: 'Bastelraum', bonus: 4, preis: 2500 },
    { name: 'Schnitzwerkstatt', bonus: 10, preis: 9000 },
    { name: 'Meisteratelier', bonus: 22, preis: 28000 },
  ],
  requisiten: [
    { name: 'Keine', bonus: 0, preis: 0 },
    { name: 'Einfache Kulissen', bonus: 3, preis: 2000 },
    { name: 'Professionelle Sets', bonus: 9, preis: 8000 },
    { name: 'Magische Bühnenbilder', bonus: 20, preis: 25000 },
  ],
};

const PUBLIKUM = [
  { name: 'Kindergarten', mult: 0.8, zuschauer: 15 },
  { name: 'Dorfplatz', mult: 1.0, zuschauer: 30 },
  { name: 'Stadttheater', mult: 1.3, zuschauer: 80 },
  { name: 'Jahrmarkt', mult: 1.2, zuschauer: 120 },
  { name: 'Adelshof', mult: 1.5, zuschauer: 40 },
  { name: 'Königspalast', mult: 1.8, zuschauer: 50 },
  { name: 'Festival', mult: 1.4, zuschauer: 200 },
  { name: 'Zaubererakademie', mult: 2.0, zuschauer: 60 },
];

const EREIGNISSE = [
  { text: 'Das Publikum ist begeistert — Zugabe!', bonusMult: 1.5 },
  { text: 'Deine Puppen bewegen sich wie von selbst!', bonusMult: 1.4 },
  { text: 'Ein Faden reißt mitten in der Vorstellung!', bonusMult: 0.7 },
  { text: 'Ein Kind weint — Stimmung kippt kurz.', bonusMult: 0.8 },
  { text: 'Standing Ovations am Ende!', bonusMult: 1.6 },
  { text: 'Die Beleuchtung setzt perfekte Akzente!', bonusMult: 1.3 },
  { text: 'Ein berühmter Kritiker ist anwesend!', bonusMult: 1.7 },
  { text: 'Solide Vorstellung ohne Höhepunkte.', bonusMult: 1.0 },
  { text: 'Die neue Puppe stiehlt die Show!', bonusMult: 1.2 },
  { text: 'Technische Probleme mit der Bühne.', bonusMult: 0.75 },
];

function ensurePuppenTable() {
  db.db.exec(`CREATE TABLE IF NOT EXISTS puppenspieler (
    user_id TEXT PRIMARY KEY,
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    geschick INTEGER DEFAULT 10,
    auffuehrungen INTEGER DEFAULT 0,
    meisterauffuehrungen INTEGER DEFAULT 0,
    buehne INTEGER DEFAULT 0,
    beleuchtung INTEGER DEFAULT 0,
    werkstatt INTEGER DEFAULT 0,
    requisiten INTEGER DEFAULT 0,
    holz INTEGER DEFAULT 5,
    stoff INTEGER DEFAULT 5,
    farbe INTEGER DEFAULT 5,
    faden INTEGER DEFAULT 3,
    edelstein INTEGER DEFAULT 0,
    magiefaden INTEGER DEFAULT 0,
    puppen_anzahl INTEGER DEFAULT 1,
    ruf INTEGER DEFAULT 0,
    last_show TEXT
  )`);
  db.db.exec(`CREATE TABLE IF NOT EXISTS puppen_sammlung (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    name TEXT,
    typ TEXT,
    qualitaet INTEGER,
    erstellt_am TEXT DEFAULT (datetime('now'))
  )`);
}

function getPuppenspieler(userId) {
  ensurePuppenTable();
  let p = db.db.prepare('SELECT * FROM puppenspieler WHERE user_id = ?').get(userId);
  if (!p) {
    db.db.prepare('INSERT INTO puppenspieler (user_id) VALUES (?)').run(userId);
    p = db.db.prepare('SELECT * FROM puppenspieler WHERE user_id = ?').get(userId);
    db.db.prepare('INSERT INTO puppen_sammlung (user_id, name, typ, qualitaet) VALUES (?, ?, ?, ?)')
      .run(userId, 'Kasperle', 'Handpuppe', 5);
  }
  return p;
}

function getXpForLevel(level) {
  return Math.floor(100 * Math.pow(1.5, level - 1));
}

function getUpgradeBonus(p) {
  return UPGRADES.buehne[p.buehne].bonus +
    UPGRADES.beleuchtung[p.beleuchtung].bonus +
    UPGRADES.werkstatt[p.werkstatt].bonus +
    UPGRADES.requisiten[p.requisiten].bonus;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('puppenspieler')
    .setDescription('🎭 Werde Puppenspieler und führe Marionetten-Theater auf!')
    .addSubcommand(s => s.setName('status').setDescription('Zeige dein Puppenspieler-Profil'))
    .addSubcommand(s => s.setName('puppen').setDescription('Zeige deine Puppen'))
    .addSubcommand(s => s.setName('basteln').setDescription('Bastle eine neue Puppe')
      .addIntegerOption(o => o.setName('typ').setDescription('Puppentyp (1-8)').setRequired(true))
      .addStringOption(o => o.setName('name').setDescription('Name der Puppe').setRequired(true)))
    .addSubcommand(s => s.setName('materialien').setDescription('Kaufe Bastelmaterialien')
      .addStringOption(o => o.setName('material').setDescription('Materialname'))
      .addIntegerOption(o => o.setName('menge').setDescription('Menge')))
    .addSubcommand(s => s.setName('stuecke').setDescription('Zeige alle Theaterstücke'))
    .addSubcommand(s => s.setName('auffuehren').setDescription('Führe ein Stück auf')
      .addIntegerOption(o => o.setName('stueck').setDescription('Stücknummer (1-8)').setRequired(true)))
    .addSubcommand(s => s.setName('upgrade').setDescription('Verbessere dein Theater')
      .addStringOption(o => o.setName('typ').setDescription('buehne/beleuchtung/werkstatt/requisiten').setRequired(true))
      .addIntegerOption(o => o.setName('stufe').setDescription('Stufe (2-4)').setRequired(true)))
    .addSubcommand(s => s.setName('trainieren').setDescription('Trainiere dein Geschick')
      .addStringOption(o => o.setName('skill').setDescription('geschick').setRequired(true)))
    .addSubcommand(s => s.setName('wettbewerb').setDescription('PvP Puppentheater-Duell')
      .addUserOption(o => o.setName('gegner').setDescription('Dein Gegner').setRequired(true))),

  async execute(interaction) {
    const config = require('../config.json');
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    switch (sub) {
      case 'status': return handleStatus(interaction, userId);
      case 'puppen': return handlePuppen(interaction, userId);
      case 'basteln': return handleBasteln(interaction, userId);
      case 'materialien': return handleMaterialien(interaction, userId);
      case 'stuecke': return handleStuecke(interaction, userId);
      case 'auffuehren': return handleAuffuehren(interaction, userId);
      case 'upgrade': return handleUpgrade(interaction, userId);
      case 'trainieren': return handleTrainieren(interaction, userId);
      case 'wettbewerb': return handleWettbewerb(interaction, userId);
    }
  }
};

async function handleStatus(interaction, userId) {
  const p = getPuppenspieler(userId);
  const xpNeeded = getXpForLevel(p.level);
  const bonus = getUpgradeBonus(p);
  const puppen = db.db.prepare('SELECT COUNT(*) as c FROM puppen_sammlung WHERE user_id = ?').get(userId);

  const embed = new EmbedBuilder()
    .setTitle('🎭 Puppenspieler-Profil')
    .setColor(0x9B30FF)
    .addFields(
      { name: '📊 Level', value: `${p.level} (${p.xp}/${xpNeeded} XP)`, inline: true },
      { name: '🎯 Geschick', value: `${p.geschick + bonus}`, inline: true },
      { name: '⭐ Ruf', value: `${p.ruf}`, inline: true },
      { name: '🎭 Aufführungen', value: `${p.auffuehrungen} (${p.meisterauffuehrungen} Meister)`, inline: true },
      { name: '🧸 Puppen', value: `${puppen.c}`, inline: true },
      { name: '🏗️ Theater', value: [
        `Bühne: ${UPGRADES.buehne[p.buehne].name}`,
        `Licht: ${UPGRADES.beleuchtung[p.beleuchtung].name}`,
        `Werkstatt: ${UPGRADES.werkstatt[p.werkstatt].name}`,
        `Requisiten: ${UPGRADES.requisiten[p.requisiten].name}`,
      ].join('\n') },
      { name: '📦 Materialien', value: [
        `🪵 Holz: ${p.holz} | 🧵 Stoff: ${p.stoff} | 🎨 Farbe: ${p.farbe}`,
        `🧶 Faden: ${p.faden} | 💎 Edelstein: ${p.edelstein} | ✨ Magiefaden: ${p.magiefaden}`,
      ].join('\n') },
    );
  return interaction.reply({ embeds: [embed] });
}

async function handlePuppen(interaction, userId) {
  getPuppenspieler(userId);
  const puppen = db.db.prepare('SELECT * FROM puppen_sammlung WHERE user_id = ? ORDER BY qualitaet DESC').all(userId);

  if (puppen.length === 0) {
    return interaction.reply({ content: '📭 Du hast keine Puppen! Bastle deine erste.', ephemeral: true });
  }

  const list = puppen.slice(0, 15).map((p, i) =>
    `**${i + 1}.** ${p.name} — ${p.typ} | Q:${p.qualitaet}`
  ).join('\n');

  const embed = new EmbedBuilder()
    .setTitle('🧸 Deine Puppen')
    .setColor(0x9B30FF)
    .setDescription(list)
    .setFooter({ text: `${puppen.length} Puppen` });
  return interaction.reply({ embeds: [embed] });
}

async function handleBasteln(interaction, userId) {
  const cd = cooldowns.get(`craft_${userId}`);
  if (cd && Date.now() - cd < 45000) {
    const rest = Math.ceil((45000 - (Date.now() - cd)) / 1000);
    return interaction.reply({ content: `⏳ Du kannst in ${rest}s wieder basteln.`, ephemeral: true });
  }

  const p = getPuppenspieler(userId);
  const typNr = interaction.options.getInteger('typ');
  const name = interaction.options.getString('name');

  if (typNr < 1 || typNr > PUPPEN_TYPEN.length) {
    return interaction.reply({ content: `❌ Ungültiger Typ! Wähle 1-${PUPPEN_TYPEN.length}.`, ephemeral: true });
  }

  const puppenTyp = PUPPEN_TYPEN[typNr - 1];
  const minLevel = Math.ceil(typNr / 2);
  if (p.level < minLevel) {
    return interaction.reply({ content: `🔒 Du brauchst Level ${minLevel} für ${puppenTyp.name}!`, ephemeral: true });
  }

  const holzBedarf = typNr + 1;
  const stoffBedarf = typNr;
  const farbeBedarf = typNr;
  const fadenBedarf = Math.ceil(typNr / 2);

  if (p.holz < holzBedarf || p.stoff < stoffBedarf || p.farbe < farbeBedarf || p.faden < fadenBedarf) {
    return interaction.reply({ content: `❌ Du brauchst: ${holzBedarf} Holz, ${stoffBedarf} Stoff, ${farbeBedarf} Farbe, ${fadenBedarf} Faden.`, ephemeral: true });
  }

  cooldowns.set(`craft_${userId}`, Date.now());

  db.db.prepare('UPDATE puppenspieler SET holz = holz - ?, stoff = stoff - ?, farbe = farbe - ?, faden = faden - ? WHERE user_id = ?')
    .run(holzBedarf, stoffBedarf, farbeBedarf, fadenBedarf, userId);

  const ereignis = EREIGNISSE[Math.floor(Math.random() * EREIGNISSE.length)];
  const bonus = getUpgradeBonus(p);
  const gesamtSkill = p.geschick + bonus + p.level * 2;
  const qualitaet = Math.floor(puppenTyp.qualitaet * (0.7 + gesamtSkill / 80) * ereignis.bonusMult);

  db.db.prepare('INSERT INTO puppen_sammlung (user_id, name, typ, qualitaet) VALUES (?, ?, ?, ?)')
    .run(userId, name, puppenTyp.name, qualitaet);

  const xpGewinn = Math.floor((8 + typNr * 5) * ereignis.bonusMult);
  db.db.prepare('UPDATE puppenspieler SET xp = xp + ?, puppen_anzahl = puppen_anzahl + 1 WHERE user_id = ?')
    .run(xpGewinn, userId);

  const updated = getPuppenspieler(userId);
  const xpNeeded = getXpForLevel(updated.level);
  let levelUpText = '';
  if (updated.xp >= xpNeeded) {
    db.db.prepare('UPDATE puppenspieler SET level = level + 1, xp = xp - ? WHERE user_id = ?').run(xpNeeded, userId);
    levelUpText = `\n🎉 **LEVEL UP!** Level ${updated.level + 1}!`;
  }

  const embed = new EmbedBuilder()
    .setTitle(`${puppenTyp.emoji} Puppe gebastelt!`)
    .setColor(0x9B30FF)
    .setDescription([
      `**${name}** (${puppenTyp.name})`,
      `⭐ Qualität: ${qualitaet}`,
      `\n💫 *${ereignis.text}*`,
      `📊 +${xpGewinn} XP`,
      levelUpText,
    ].filter(Boolean).join('\n'));
  return interaction.reply({ embeds: [embed] });
}

async function handleMaterialien(interaction, userId) {
  const p = getPuppenspieler(userId);
  const matName = interaction.options.getString('material');
  const menge = interaction.options.getInteger('menge') || 1;

  if (!matName) {
    const list = MATERIALIEN.map((m, i) =>
      `**${i + 1}. ${m.name}** — ${m.preis} 🪙/Stk`
    ).join('\n');

    const embed = new EmbedBuilder()
      .setTitle('📦 Materialien')
      .setColor(0x9B30FF)
      .setDescription(list);
    return interaction.reply({ embeds: [embed] });
  }

  const mat = MATERIALIEN.find(m => m.name.toLowerCase() === matName.toLowerCase());
  if (!mat) {
    return interaction.reply({ content: '❌ Unbekanntes Material!', ephemeral: true });
  }

  const kosten = mat.preis * menge;
  const balance = db.getBalance(userId);
  if (balance < kosten) {
    return interaction.reply({ content: `❌ Du brauchst ${kosten} 🪙 (hast: ${balance} 🪙).`, ephemeral: true });
  }

  db.updateBalance(userId, -kosten);
  db.db.prepare(`UPDATE puppenspieler SET ${mat.spalte} = ${mat.spalte} + ? WHERE user_id = ?`).run(menge, userId);

  const embed = new EmbedBuilder()
    .setTitle('📦 Material gekauft!')
    .setColor(0x00AA00)
    .setDescription(`**${menge}x ${mat.name}** für ${kosten} 🪙!`);
  return interaction.reply({ embeds: [embed] });
}

async function handleStuecke(interaction, userId) {
  const p = getPuppenspieler(userId);

  const list = STUECKE.map((s, i) => {
    const unlocked = p.level >= s.minLevel;
    return `${unlocked ? '✅' : '🔒'} **${i + 1}. ${s.name}** — Lv.${s.minLevel} | ${s.puppen} Puppen | ${s.belohnung} 🪙`;
  }).join('\n');

  const embed = new EmbedBuilder()
    .setTitle('📜 Theaterstücke')
    .setColor(0x9B30FF)
    .setDescription(list)
    .setFooter({ text: `Dein Level: ${p.level}` });
  return interaction.reply({ embeds: [embed] });
}

async function handleAuffuehren(interaction, userId) {
  const cd = cooldowns.get(`show_${userId}`);
  if (cd && Date.now() - cd < 60000) {
    const rest = Math.ceil((60000 - (Date.now() - cd)) / 1000);
    return interaction.reply({ content: `⏳ Nächste Aufführung in ${rest}s.`, ephemeral: true });
  }

  const p = getPuppenspieler(userId);
  const stueckNr = interaction.options.getInteger('stueck');

  if (stueckNr < 1 || stueckNr > STUECKE.length) {
    return interaction.reply({ content: `❌ Ungültiges Stück! Wähle 1-${STUECKE.length}.`, ephemeral: true });
  }

  const stueck = STUECKE[stueckNr - 1];
  if (p.level < stueck.minLevel) {
    return interaction.reply({ content: `🔒 Du brauchst Level ${stueck.minLevel} für ${stueck.name}!`, ephemeral: true });
  }

  const puppen = db.db.prepare('SELECT * FROM puppen_sammlung WHERE user_id = ?').all(userId);
  if (puppen.length < stueck.puppen) {
    return interaction.reply({ content: `❌ Du brauchst mindestens ${stueck.puppen} Puppen (hast: ${puppen.length}).`, ephemeral: true });
  }

  cooldowns.set(`show_${userId}`, Date.now());

  const ereignis = EREIGNISSE[Math.floor(Math.random() * EREIGNISSE.length)];
  const publikum = PUBLIKUM[Math.floor(Math.random() * PUBLIKUM.length)];
  const bonus = getUpgradeBonus(p);
  const gesamtSkill = p.geschick + bonus + p.level * 3;

  const puppenQualitaet = puppen.reduce((sum, pp) => sum + pp.qualitaet, 0) / puppen.length;
  const performance = Math.floor((gesamtSkill + puppenQualitaet) * ereignis.bonusMult);

  const belohnung = Math.floor(stueck.belohnung * publikum.mult * (0.6 + performance / 100));
  const xpGewinn = Math.floor(stueck.xp * ereignis.bonusMult);
  const istMeister = performance > 80 && Math.random() < 0.1;

  db.updateBalance(userId, belohnung);
  db.db.prepare(`UPDATE puppenspieler SET xp = xp + ?, auffuehrungen = auffuehrungen + 1,
    meisterauffuehrungen = meisterauffuehrungen + ?, ruf = ruf + ? WHERE user_id = ?`)
    .run(xpGewinn, istMeister ? 1 : 0, Math.floor(stueck.schwierigkeit / 2) + 1, userId);

  const updated = getPuppenspieler(userId);
  const xpNeeded = getXpForLevel(updated.level);
  let levelUpText = '';
  if (updated.xp >= xpNeeded) {
    db.db.prepare('UPDATE puppenspieler SET level = level + 1, xp = xp - ? WHERE user_id = ?').run(xpNeeded, userId);
    levelUpText = `\n🎉 **LEVEL UP!** Level ${updated.level + 1}!`;
  }

  const embed = new EmbedBuilder()
    .setTitle(`🎭 ${istMeister ? '⭐ MEISTERAUFFÜHRUNG! ⭐' : stueck.name}`)
    .setColor(istMeister ? 0xFFD700 : 0x9B30FF)
    .setDescription([
      `**${stueck.name}** vor ${publikum.zuschauer} Zuschauern`,
      `📍 ${publikum.name} (x${publikum.mult})`,
      `\n💫 *${ereignis.text}*`,
      `\n🎯 Performance: ${performance} | 💰 ${belohnung} 🪙 | 📊 +${xpGewinn} XP`,
      levelUpText,
    ].filter(Boolean).join('\n'));
  return interaction.reply({ embeds: [embed] });
}

async function handleUpgrade(interaction, userId) {
  const p = getPuppenspieler(userId);
  const typ = interaction.options.getString('typ').toLowerCase();
  const stufe = interaction.options.getInteger('stufe');

  if (!UPGRADES[typ]) {
    return interaction.reply({ content: '❌ Ungültiger Typ! Wähle: buehne, beleuchtung, werkstatt oder requisiten.', ephemeral: true });
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
  db.db.prepare(`UPDATE puppenspieler SET ${typ} = ? WHERE user_id = ?`).run(idx, userId);

  const embed = new EmbedBuilder()
    .setTitle('⬆️ Upgrade gekauft!')
    .setColor(0x00AA00)
    .setDescription(`**${item.name}** für ${item.preis} 🪙!\n+${item.bonus} Geschick`);
  return interaction.reply({ embeds: [embed] });
}

async function handleTrainieren(interaction, userId) {
  const skill = interaction.options.getString('skill').toLowerCase();
  if (skill !== 'geschick') {
    return interaction.reply({ content: '❌ Ungültiger Skill! Verfügbar: `geschick`', ephemeral: true });
  }

  const cd = cooldowns.get(`train_${userId}`);
  if (cd && Date.now() - cd < 60000) {
    const rest = Math.ceil((60000 - (Date.now() - cd)) / 1000);
    return interaction.reply({ content: `⏳ Du kannst in ${rest}s wieder trainieren.`, ephemeral: true });
  }

  const p = getPuppenspieler(userId);
  const kosten = 250 + (p.level * 65);
  const balance = db.getBalance(userId);
  if (balance < kosten) {
    return interaction.reply({ content: `❌ Training kostet ${kosten} 🪙 (hast: ${balance} 🪙).`, ephemeral: true });
  }

  cooldowns.set(`train_${userId}`, Date.now());
  db.updateBalance(userId, -kosten);

  const gewinn = Math.floor(Math.random() * 3) + 1;
  const xpGewinn = 12 + Math.floor(Math.random() * 10);
  db.db.prepare('UPDATE puppenspieler SET geschick = geschick + ?, xp = xp + ? WHERE user_id = ?')
    .run(gewinn, xpGewinn, userId);

  const embed = new EmbedBuilder()
    .setTitle('🎯 Training abgeschlossen!')
    .setColor(0x3498DB)
    .setDescription(`Geschick +${gewinn}!\n📊 +${xpGewinn} XP | -${kosten} 🪙`);
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

  const p1 = getPuppenspieler(userId);
  const p2 = getPuppenspieler(gegner.id);

  const skill1 = p1.geschick + getUpgradeBonus(p1) + p1.level * 5;
  const skill2 = p2.geschick + getUpgradeBonus(p2) + p2.level * 5;

  const score1 = skill1 + p1.auffuehrungen * 2 + p1.puppen_anzahl * 3 + Math.floor(Math.random() * 40);
  const score2 = skill2 + p2.auffuehrungen * 2 + p2.puppen_anzahl * 3 + Math.floor(Math.random() * 40);

  const gewinner = score1 >= score2 ? userId : gegner.id;
  const preis = 350 + Math.floor(Math.random() * 450);

  db.updateBalance(gewinner, preis);
  db.db.prepare('UPDATE puppenspieler SET ruf = ruf + 5, xp = xp + 15 WHERE user_id = ?').run(gewinner);

  const embed = new EmbedBuilder()
    .setTitle('🏆 Puppentheater-Duell!')
    .setColor(0xFFD700)
    .setDescription([
      `**${interaction.user.username}:** ${score1} Punkte`,
      `**${gegner.username}:** ${score2} Punkte`,
      '',
      `🥇 **${gewinner === userId ? interaction.user.username : gegner.username}** gewinnt ${preis} 🪙 und +5 Ruf!`,
    ].join('\n'));
  return interaction.reply({ embeds: [embed] });
}
