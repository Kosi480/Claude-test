const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

const GETREIDE = [
  { name: 'Roggen', preis: 15, qualitaet: 1.0, emoji: '🌾' },
  { name: 'Weizen', preis: 30, qualitaet: 1.3, emoji: '🌿' },
  { name: 'Gerste', preis: 50, qualitaet: 1.6, emoji: '🌱' },
  { name: 'Hafer', preis: 80, qualitaet: 2.0, emoji: '🌻' },
  { name: 'Dinkel', preis: 130, qualitaet: 2.5, emoji: '✨' },
  { name: 'Mondkorn', preis: 200, qualitaet: 3.2, emoji: '🌙' },
  { name: 'Kristallkorn', preis: 320, qualitaet: 4.2, emoji: '💎' },
  { name: 'Aetherkorn', preis: 500, qualitaet: 5.5, emoji: '🔮' },
];

const MEHLSORTEN = [
  { name: 'Schrotmehl', basisWert: 50, schwierigkeit: 1, minLevel: 1 },
  { name: 'Vollkornmehl', basisWert: 100, schwierigkeit: 2, minLevel: 3 },
  { name: 'Weizenmehl', basisWert: 160, schwierigkeit: 3, minLevel: 5 },
  { name: 'Feinmehl', basisWert: 240, schwierigkeit: 4, minLevel: 8 },
  { name: 'Backmehl', basisWert: 350, schwierigkeit: 5, minLevel: 12 },
  { name: 'Zaubermehl', basisWert: 520, schwierigkeit: 6, minLevel: 16 },
  { name: 'Mondmehl', basisWert: 770, schwierigkeit: 7, minLevel: 21 },
  { name: 'Legendaeres Aethermehl', basisWert: 1150, schwierigkeit: 8, minLevel: 28 },
];

const MAHLMETHODEN = [
  { name: 'Grob mahlen', bonus: 1.0, minLevel: 1 },
  { name: 'Standard mahlen', bonus: 1.2, minLevel: 3 },
  { name: 'Fein mahlen', bonus: 1.5, minLevel: 5 },
  { name: 'Extra fein mahlen', bonus: 1.8, minLevel: 8 },
  { name: 'Praezisionsmahlung', bonus: 2.2, minLevel: 12 },
  { name: 'Meistermahlung', bonus: 2.8, minLevel: 16 },
  { name: 'Mondmahlung', bonus: 3.6, minLevel: 21 },
  { name: 'Aethermahlung', bonus: 4.5, minLevel: 28 },
];

const QUALITAETEN = [
  { name: 'Sandig', multi: 0.3, minRoll: 0 },
  { name: 'Grob', multi: 0.6, minRoll: 15 },
  { name: 'Einfach', multi: 0.9, minRoll: 30 },
  { name: 'Fein', multi: 1.2, minRoll: 45 },
  { name: 'Rein', multi: 1.6, minRoll: 62 },
  { name: 'Exquisit', multi: 2.1, minRoll: 78 },
  { name: 'Meisterhaft', multi: 3.2, minRoll: 92 },
];

const UPGRADES = {
  muehlstein: { name: 'Muehlstein', stufen: [0, 200, 550, 1400, 3500], bonus: [0, 0.1, 0.2, 0.35, 0.5] },
  sieb: { name: 'Sieb', stufen: [0, 350, 900, 2300, 5600], bonus: [0, 0.08, 0.18, 0.3, 0.45] },
  windfluegel: { name: 'Windfluegelanlage', stufen: [0, 280, 720, 1800, 4500], bonus: [0, 0.06, 0.14, 0.25, 0.4] },
  werkstatt: { name: 'Werkstatt', stufen: [0, 800, 2000, 4800, 12000], bonus: [0, 0.12, 0.25, 0.4, 0.6] },
};

const MULLER_EVENTS = [
  { text: 'Der Muehlstein springt!', qualMulti: 0.5, geldMulti: 0.7 },
  { text: 'Das Korn mahlt sich wie von Geisterhand!', qualMulti: 1.5, geldMulti: 1.2 },
  { text: 'Zu viel Hitze schadet dem Mehl.', qualMulti: 0.8, geldMulti: 0.9 },
  { text: 'Perfekte Mahlung - wunderschoen feines Mehl!', qualMulti: 2.0, geldMulti: 1.5 },
  { text: 'Der Wind dreht sich guenstig.', qualMulti: 1.3, geldMulti: 1.1 },
  { text: 'Ein Stein bricht und muss repariert werden.', qualMulti: 0.7, geldMulti: 0.85 },
  { text: 'Das Mehl siebt sich wunderbar rein!', qualMulti: 1.8, geldMulti: 1.4 },
];

const cooldowns = new Map();

function ensureMullerTable() {
  db.db.exec(`CREATE TABLE IF NOT EXISTS muller (
    userId TEXT PRIMARY KEY,
    geld INTEGER DEFAULT 0,
    getreide INTEGER DEFAULT 0,
    getreideTyp INTEGER DEFAULT 0,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    auftraege INTEGER DEFAULT 0,
    duelle INTEGER DEFAULT 0,
    siege INTEGER DEFAULT 0,
    upg_muehlstein INTEGER DEFAULT 0,
    upg_sieb INTEGER DEFAULT 0,
    upg_windfluegel INTEGER DEFAULT 0,
    upg_werkstatt INTEGER DEFAULT 0
  )`);
  db.db.exec(`CREATE TABLE IF NOT EXISTS muller_speicher (
    userId TEXT PRIMARY KEY,
    mehl0 INTEGER DEFAULT 0,
    mehl1 INTEGER DEFAULT 0,
    mehl2 INTEGER DEFAULT 0,
    mehl3 INTEGER DEFAULT 0,
    mehl4 INTEGER DEFAULT 0,
    mehl5 INTEGER DEFAULT 0,
    mehl6 INTEGER DEFAULT 0,
    mehl7 INTEGER DEFAULT 0
  )`);
}

function getMuller(uId) {
  let row = db.db.prepare('SELECT * FROM muller WHERE userId = ?').get(uId);
  if (!row) {
    db.db.prepare('INSERT INTO muller (userId) VALUES (?)').run(uId);
    row = db.db.prepare('SELECT * FROM muller WHERE userId = ?').get(uId);
  }
  return row;
}

function getSpeicher(uId) {
  let row = db.db.prepare('SELECT * FROM muller_speicher WHERE userId = ?').get(uId);
  if (!row) {
    db.db.prepare('INSERT INTO muller_speicher (userId) VALUES (?)').run(uId);
    row = db.db.prepare('SELECT * FROM muller_speicher WHERE userId = ?').get(uId);
  }
  return row;
}

function xpForLevel(l) { return l * l * 50; }

function checkLevelUp(uId, mu) {
  let lvl = mu.level;
  let ups = 0;
  while (mu.xp >= xpForLevel(lvl)) {
    mu.xp -= xpForLevel(lvl);
    lvl++;
    ups++;
  }
  if (ups > 0) {
    db.db.prepare('UPDATE muller SET level = ?, xp = ? WHERE userId = ?').run(lvl, mu.xp, uId);
  }
  return { lvl, ups };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('muller')
    .setDescription('Werde ein Mueller und mahle feinstes Mehl in deiner Windmuehle!')
    .addSubcommand(s => s.setName('start').setDescription('Beginne deine Mueller-Karriere'))
    .addSubcommand(s => s.setName('status').setDescription('Zeige deinen Mueller-Status'))
    .addSubcommand(s => s.setName('getreidearten').setDescription('Liste alle verfuegbaren Getreidearten'))
    .addSubcommand(s => s.setName('kaufen').setDescription('Kaufe Getreide').addIntegerOption(o => o.setName('getreide').setDescription('Getreide-Typ (1-8)').setRequired(true)).addIntegerOption(o => o.setName('menge').setDescription('Menge').setRequired(true)))
    .addSubcommand(s => s.setName('mahlen').setDescription('Mahle Getreide zu Mehl').addIntegerOption(o => o.setName('mehl').setDescription('Mehlsorte (1-8)').setRequired(true)).addIntegerOption(o => o.setName('methode').setDescription('Mahlmethode (1-8)').setRequired(true)))
    .addSubcommand(s => s.setName('training').setDescription('Verbessere deine Faehigkeiten').addStringOption(o => o.setName('art').setDescription('Trainingsart').setRequired(true).addChoices({ name: 'Mahlen', value: 'mahlen' }, { name: 'Sieben', value: 'sieben' }, { name: 'Sortieren', value: 'sortieren' })))
    .addSubcommand(s => s.setName('upgrade').setDescription('Verbessere deine Muehle').addStringOption(o => o.setName('slot').setDescription('Upgrade-Slot').setRequired(true).addChoices({ name: 'Muehlstein', value: 'muehlstein' }, { name: 'Sieb', value: 'sieb' }, { name: 'Windfluegel', value: 'windfluegel' }, { name: 'Werkstatt', value: 'werkstatt' })))
    .addSubcommand(s => s.setName('speicher').setDescription('Zeige deinen Mehlspeicher'))
    .addSubcommand(s => s.setName('auftrag').setDescription('Nimm einen Mehlauftrag an'))
    .addSubcommand(s => s.setName('duell').setDescription('Fordere einen anderen Mueller heraus').addUserOption(o => o.setName('gegner').setDescription('Dein Gegner').setRequired(true))),

  async execute(interaction) {
    const config = require('../config.json');
    ensureMullerTable();
    const uId = interaction.user.id;
    const sub = interaction.options.getSubcommand();

    if (sub === 'start') {
      const existing = db.db.prepare('SELECT userId FROM muller WHERE userId = ?').get(uId);
      if (existing) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xF5DEB3).setTitle('Mueller').setDescription('Du bist bereits Mueller!')] });
      }
      db.db.prepare('INSERT INTO muller (userId) VALUES (?)').run(uId);
      db.db.prepare('INSERT INTO muller_speicher (userId) VALUES (?)').run(uId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xF5DEB3).setTitle('Willkommen, Mueller!').setDescription('Du hast deine Windmuehle eroeffnet!\nBenutze `/muller kaufen` um Getreide zu kaufen.\nDann `/muller mahlen` um feinstes Mehl herzustellen!')] });
    }

    if (sub === 'getreidearten') {
      const lines = GETREIDE.map((g, i) => `${g.emoji} **${i + 1}. ${g.name}** — ${g.preis} Muenzen | Qualitaet: ${g.qualitaet}x`);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xF5DEB3).setTitle('🌾 Getreidearten').setDescription(lines.join('\n'))] });
    }

    const mu = getMuller(uId);

    if (sub === 'status') {
      const upgLines = Object.entries(UPGRADES).map(([k, u]) => `${u.name}: Stufe ${mu[`upg_${k}`]}`);
      const embed = new EmbedBuilder()
        .setColor(0xF5DEB3)
        .setTitle(`⚙️ Mueller — ${interaction.user.username}`)
        .addFields(
          { name: 'Level', value: `${mu.level}`, inline: true },
          { name: 'XP', value: `${mu.xp}/${xpForLevel(mu.level)}`, inline: true },
          { name: 'Muenzen', value: `${mu.geld}`, inline: true },
          { name: 'Getreide', value: `${mu.getreide}x ${mu.getreideTyp > 0 ? GETREIDE[mu.getreideTyp - 1].name : 'Keines'}`, inline: true },
          { name: 'Auftraege', value: `${mu.auftraege}`, inline: true },
          { name: 'Duelle', value: `${mu.duelle} (${mu.siege} Siege)`, inline: true },
          { name: 'Upgrades', value: upgLines.join('\n'), inline: false },
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'kaufen') {
      const getreideIdx = interaction.options.getInteger('getreide') - 1;
      const menge = interaction.options.getInteger('menge');
      if (getreideIdx < 0 || getreideIdx >= GETREIDE.length) return interaction.reply({ content: 'Ungueltiger Getreide-Typ (1-8)!', ephemeral: true });
      if (menge < 1 || menge > 100) return interaction.reply({ content: 'Menge muss zwischen 1 und 100 liegen!', ephemeral: true });
      const getreide = GETREIDE[getreideIdx];
      const kosten = getreide.preis * menge;
      if (mu.geld < kosten) return interaction.reply({ content: `Nicht genug Muenzen! Du brauchst ${kosten}, hast aber ${mu.geld}.`, ephemeral: true });
      db.db.prepare('UPDATE muller SET geld = geld - ?, getreide = getreide + ?, getreideTyp = ? WHERE userId = ?').run(kosten, menge, getreideIdx + 1, uId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xF5DEB3).setTitle('Getreide gekauft').setDescription(`Du hast ${menge}x ${getreide.emoji} ${getreide.name} fuer ${kosten} Muenzen gekauft!`)] });
    }

    if (sub === 'mahlen') {
      const now = Date.now();
      const cd = cooldowns.get(uId) || 0;
      if (now - cd < 30000) {
        const left = Math.ceil((30000 - (now - cd)) / 1000);
        return interaction.reply({ content: `Noch ${left}s Abkuehlung!`, ephemeral: true });
      }
      const mehlIdx = interaction.options.getInteger('mehl') - 1;
      const methodeIdx = interaction.options.getInteger('methode') - 1;
      if (mehlIdx < 0 || mehlIdx >= MEHLSORTEN.length) return interaction.reply({ content: 'Ungueltige Mehlsorte (1-8)!', ephemeral: true });
      if (methodeIdx < 0 || methodeIdx >= MAHLMETHODEN.length) return interaction.reply({ content: 'Ungueltige Mahlmethode (1-8)!', ephemeral: true });
      const mehl = MEHLSORTEN[mehlIdx];
      const methode = MAHLMETHODEN[methodeIdx];
      if (mu.level < mehl.minLevel) return interaction.reply({ content: `Du brauchst Level ${mehl.minLevel} fuer ${mehl.name}!`, ephemeral: true });
      if (mu.level < methode.minLevel) return interaction.reply({ content: `Du brauchst Level ${methode.minLevel} fuer ${methode.name}!`, ephemeral: true });
      if (mu.getreide < mehl.schwierigkeit) return interaction.reply({ content: `Du brauchst ${mehl.schwierigkeit} Getreide fuer diese Mehlsorte!`, ephemeral: true });
      const getreide = mu.getreideTyp > 0 ? GETREIDE[mu.getreideTyp - 1] : GETREIDE[0];
      const upgBonus = (UPGRADES.muehlstein.bonus[mu.upg_muehlstein] || 0) + (UPGRADES.sieb.bonus[mu.upg_sieb] || 0) + (UPGRADES.windfluegel.bonus[mu.upg_windfluegel] || 0) + (UPGRADES.werkstatt.bonus[mu.upg_werkstatt] || 0);
      const rollBase = Math.random() * 100;
      const roll = Math.min(99, rollBase + upgBonus * 20);
      const event = MULLER_EVENTS[Math.floor(Math.random() * MULLER_EVENTS.length)];
      let qual = QUALITAETEN[0];
      for (const q of QUALITAETEN) { if (roll >= q.minRoll) qual = q; }
      const wert = Math.floor(mehl.basisWert * getreide.qualitaet * methode.bonus * qual.multi * event.qualMulti * event.geldMulti);
      const xpGain = Math.floor(mehl.schwierigkeit * 20 * getreide.qualitaet);
      db.db.prepare('UPDATE muller SET getreide = getreide - ?, geld = geld + ?, xp = xp + ? WHERE userId = ?').run(mehl.schwierigkeit, wert, xpGain, uId);
      const updMu = getMuller(uId);
      const { lvl, ups } = checkLevelUp(uId, updMu);
      const col = `mehl${mehlIdx}`;
      db.db.prepare(`UPDATE muller_speicher SET ${col} = ${col} + 1 WHERE userId = ?`).run(uId);
      cooldowns.set(uId, now);
      const embed = new EmbedBuilder()
        .setColor(0xF5DEB3)
        .setTitle('⚙️ Mehl gemahlen!')
        .setDescription(`${event.text}`)
        .addFields(
          { name: 'Mehlsorte', value: mehl.name, inline: true },
          { name: 'Getreide', value: `${getreide.emoji} ${getreide.name}`, inline: true },
          { name: 'Methode', value: methode.name, inline: true },
          { name: 'Qualitaet', value: qual.name, inline: true },
          { name: 'Wert', value: `${wert} Muenzen`, inline: true },
          { name: 'XP', value: `+${xpGain}`, inline: true },
        );
      if (ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${lvl}!` });
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'training') {
      const art = interaction.options.getString('art');
      const kosten = 50 + mu.level * 20;
      if (mu.geld < kosten) return interaction.reply({ content: `Training kostet ${kosten} Muenzen!`, ephemeral: true });
      const xpGain = 30 + mu.level * 10;
      db.db.prepare('UPDATE muller SET geld = geld - ?, xp = xp + ? WHERE userId = ?').run(kosten, xpGain, uId);
      const updMu = getMuller(uId);
      const { lvl, ups } = checkLevelUp(uId, updMu);
      const embed = new EmbedBuilder().setColor(0xF5DEB3).setTitle('Training').setDescription(`Du hast ${art === 'mahlen' ? 'Mahlen' : art === 'sieben' ? 'Sieben' : 'Sortieren'} trainiert!\n+${xpGain} XP | -${kosten} Muenzen`);
      if (ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${lvl}!` });
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'upgrade') {
      const slot = interaction.options.getString('slot');
      const upg = UPGRADES[slot];
      const curStufe = mu[`upg_${slot}`];
      if (curStufe >= upg.stufen.length - 1) return interaction.reply({ content: 'Maximale Stufe erreicht!', ephemeral: true });
      const kosten = upg.stufen[curStufe + 1];
      if (mu.geld < kosten) return interaction.reply({ content: `Upgrade kostet ${kosten} Muenzen!`, ephemeral: true });
      db.db.prepare(`UPDATE muller SET geld = geld - ?, upg_${slot} = upg_${slot} + 1 WHERE userId = ?`).run(kosten, uId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xF5DEB3).setTitle('Upgrade').setDescription(`${upg.name} auf Stufe ${curStufe + 1} verbessert!`)] });
    }

    if (sub === 'speicher') {
      const speicher = getSpeicher(uId);
      const lines = MEHLSORTEN.map((m, i) => `${m.name}: ${speicher[`mehl${i}`] || 0}x`);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xF5DEB3).setTitle('🌾 Mehlspeicher').setDescription(lines.join('\n'))] });
    }

    if (sub === 'auftrag') {
      const now = Date.now();
      const cdKey = `auftrag_${uId}`;
      const cd = cooldowns.get(cdKey) || 0;
      if (now - cd < 60000) {
        const left = Math.ceil((60000 - (now - cd)) / 1000);
        return interaction.reply({ content: `Naechster Auftrag in ${left}s!`, ephemeral: true });
      }
      const mehlIdx = Math.min(Math.max(0, mu.level - 1), MEHLSORTEN.length - 1);
      const mehl = MEHLSORTEN[mehlIdx];
      const menge = 1 + Math.floor(Math.random() * 2);
      const speicher = getSpeicher(uId);
      const vorrat = speicher[`mehl${mehlIdx}`] || 0;
      if (vorrat < menge) return interaction.reply({ content: `Auftrag: ${menge}x ${mehl.name}. Dir fehlen noch ${menge - vorrat}!`, ephemeral: false });
      const belohnung = Math.floor(mehl.basisWert * menge * 1.3);
      const xpGain = mehl.schwierigkeit * menge * 15;
      db.db.prepare(`UPDATE muller_speicher SET mehl${mehlIdx} = mehl${mehlIdx} - ? WHERE userId = ?`).run(menge, uId);
      db.db.prepare('UPDATE muller SET geld = geld + ?, xp = xp + ?, auftraege = auftraege + 1 WHERE userId = ?').run(belohnung, xpGain, uId);
      const updMu = getMuller(uId);
      const { lvl, ups } = checkLevelUp(uId, updMu);
      cooldowns.set(cdKey, now);
      const embed = new EmbedBuilder().setColor(0xF5DEB3).setTitle('📋 Auftrag erfuellt!').setDescription(`${menge}x ${mehl.name} geliefert!\n+${belohnung} Muenzen | +${xpGain} XP`);
      if (ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${lvl}!` });
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'duell') {
      const gegner = interaction.options.getUser('gegner');
      if (gegner.id === uId) return interaction.reply({ content: 'Du kannst nicht gegen dich selbst kaempfen!', ephemeral: true });
      const gMu = db.db.prepare('SELECT * FROM muller WHERE userId = ?').get(gegner.id);
      if (!gMu) return interaction.reply({ content: 'Dein Gegner ist noch kein Mueller!', ephemeral: true });
      const myScore = mu.level * 10 + Math.random() * 50;
      const gScore = gMu.level * 10 + Math.random() * 50;
      const gewonnen = myScore > gScore;
      const belohnung = gewonnen ? Math.floor(50 + mu.level * 15) : 0;
      const xpGain = gewonnen ? 40 + mu.level * 10 : 10;
      db.db.prepare('UPDATE muller SET geld = geld + ?, xp = xp + ?, duelle = duelle + 1, siege = siege + ? WHERE userId = ?').run(belohnung, xpGain, gewonnen ? 1 : 0, uId);
      const updMu = getMuller(uId);
      const { lvl, ups } = checkLevelUp(uId, updMu);
      const embed = new EmbedBuilder()
        .setColor(gewonnen ? 0x00FF00 : 0xFF0000)
        .setTitle(gewonnen ? '⚔️ Duell gewonnen!' : '⚔️ Duell verloren!')
        .setDescription(`${gewonnen ? `Du hast ${gegner.username} besiegt!` : `${gegner.username} hat gewonnen!`}\n${gewonnen ? `+${belohnung} Muenzen | ` : ''}+${xpGain} XP`);
      if (ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${lvl}!` });
      return interaction.reply({ embeds: [embed] });
    }
  },
};
