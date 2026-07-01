const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

const FARBEN = [
  { name: 'Erdfarbe', preis: 15, qualitaet: 1.0, emoji: '🟫' },
  { name: 'Mineralfarbe', preis: 35, qualitaet: 1.3, emoji: '🔵' },
  { name: 'Oelfarbe', preis: 65, qualitaet: 1.7, emoji: '🎨' },
  { name: 'Tempera', preis: 110, qualitaet: 2.1, emoji: '🖌️' },
  { name: 'Aquarellfarbe', preis: 180, qualitaet: 2.7, emoji: '💧' },
  { name: 'Elfenfarbe', preis: 290, qualitaet: 3.5, emoji: '✨' },
  { name: 'Mondfarbe', preis: 470, qualitaet: 4.5, emoji: '🌙' },
  { name: 'Aetherfarbe', preis: 770, qualitaet: 6.0, emoji: '🔮' },
];

const GEMAELDE = [
  { name: 'Skizze', basisWert: 60, schwierigkeit: 1, minLevel: 1 },
  { name: 'Landschaftsbild', basisWert: 130, schwierigkeit: 2, minLevel: 3 },
  { name: 'Portrait', basisWert: 220, schwierigkeit: 3, minLevel: 5 },
  { name: 'Stillleben', basisWert: 340, schwierigkeit: 4, minLevel: 8 },
  { name: 'Historiengemaedle', basisWert: 510, schwierigkeit: 5, minLevel: 12 },
  { name: 'Altarbild', basisWert: 760, schwierigkeit: 6, minLevel: 16 },
  { name: 'Meisterwerk', basisWert: 1120, schwierigkeit: 7, minLevel: 21 },
  { name: 'Legendaeres Aethergemaedle', basisWert: 1700, schwierigkeit: 8, minLevel: 28 },
];

const STILE = [
  { name: 'Realistisch', bonus: 1.0, minLevel: 1 },
  { name: 'Impressionistisch', bonus: 1.2, minLevel: 3 },
  { name: 'Expressionistisch', bonus: 1.5, minLevel: 5 },
  { name: 'Abstrakt', bonus: 1.9, minLevel: 8 },
  { name: 'Surrealistisch', bonus: 2.4, minLevel: 12 },
  { name: 'Elfenstil', bonus: 3.0, minLevel: 16 },
  { name: 'Mondstil', bonus: 3.8, minLevel: 21 },
  { name: 'Aetherstil', bonus: 5.0, minLevel: 28 },
];

const QUALITAETEN = [
  { name: 'Geklixt', multi: 0.3, minRoll: 0 },
  { name: 'Grob', multi: 0.6, minRoll: 15 },
  { name: 'Einfach', multi: 0.9, minRoll: 30 },
  { name: 'Ansprechend', multi: 1.2, minRoll: 45 },
  { name: 'Ausducksstark', multi: 1.6, minRoll: 62 },
  { name: 'Exquisit', multi: 2.1, minRoll: 78 },
  { name: 'Meisterhaft', multi: 3.2, minRoll: 92 },
];

const UPGRADES = {
  pinsel: { name: 'Pinselset', stufen: [0, 180, 480, 1200, 3000], bonus: [0, 0.1, 0.2, 0.35, 0.5] },
  staffelei: { name: 'Staffelei', stufen: [0, 330, 840, 2100, 5100], bonus: [0, 0.08, 0.18, 0.3, 0.45] },
  palette: { name: 'Mischpalette', stufen: [0, 260, 660, 1650, 4000], bonus: [0, 0.06, 0.14, 0.25, 0.4] },
  werkstatt: { name: 'Kunstatelier', stufen: [0, 660, 1650, 4000, 9800], bonus: [0, 0.12, 0.25, 0.4, 0.6] },
};

const MALER_EVENTS = [
  { text: 'Die Farbe laeuft!', qualMulti: 0.5, geldMulti: 0.7 },
  { text: 'Ein wahrhafter Geniestreich!', qualMulti: 1.5, geldMulti: 1.2 },
  { text: 'Der Pinsel verliert Haare.', qualMulti: 0.8, geldMulti: 0.9 },
  { text: 'Das Gemaedle ist von ueberwaeltigender Schoenheit!', qualMulti: 2.0, geldMulti: 1.5 },
  { text: 'Die Farben harmonieren wunderschoen.', qualMulti: 1.3, geldMulti: 1.1 },
  { text: 'Das Licht trifft falsch — das Motiv wird neu gemalt.', qualMulti: 0.7, geldMulti: 0.85 },
  { text: 'Das Meisterwerk verewigt einen Moment fuer die Ewigkeit!', qualMulti: 1.8, geldMulti: 1.4 },
];

const cooldowns = new Map();

function ensureMalerTable() {
  db.db.exec(`CREATE TABLE IF NOT EXISTS maler (
    userId TEXT PRIMARY KEY,
    geld INTEGER DEFAULT 0,
    farbe INTEGER DEFAULT 0,
    farbeTyp INTEGER DEFAULT 0,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    auftraege INTEGER DEFAULT 0,
    duelle INTEGER DEFAULT 0,
    siege INTEGER DEFAULT 0,
    upg_pinsel INTEGER DEFAULT 0,
    upg_staffelei INTEGER DEFAULT 0,
    upg_palette INTEGER DEFAULT 0,
    upg_werkstatt INTEGER DEFAULT 0
  )`);
  db.db.exec(`CREATE TABLE IF NOT EXISTS maler_galerie (
    userId TEXT PRIMARY KEY,
    bild0 INTEGER DEFAULT 0,
    bild1 INTEGER DEFAULT 0,
    bild2 INTEGER DEFAULT 0,
    bild3 INTEGER DEFAULT 0,
    bild4 INTEGER DEFAULT 0,
    bild5 INTEGER DEFAULT 0,
    bild6 INTEGER DEFAULT 0,
    bild7 INTEGER DEFAULT 0
  )`);
}

function getMaler(uId) {
  let row = db.db.prepare('SELECT * FROM maler WHERE userId = ?').get(uId);
  if (!row) {
    db.db.prepare('INSERT INTO maler (userId) VALUES (?)').run(uId);
    row = db.db.prepare('SELECT * FROM maler WHERE userId = ?').get(uId);
  }
  return row;
}

function getGalerie(uId) {
  let row = db.db.prepare('SELECT * FROM maler_galerie WHERE userId = ?').get(uId);
  if (!row) {
    db.db.prepare('INSERT INTO maler_galerie (userId) VALUES (?)').run(uId);
    row = db.db.prepare('SELECT * FROM maler_galerie WHERE userId = ?').get(uId);
  }
  return row;
}

function xpForLevel(l) { return l * l * 51; }

function checkLevelUp(uId, ma) {
  let lvl = ma.level;
  let ups = 0;
  while (ma.xp >= xpForLevel(lvl)) {
    ma.xp -= xpForLevel(lvl);
    lvl++;
    ups++;
  }
  if (ups > 0) {
    db.db.prepare('UPDATE maler SET level = ?, xp = ? WHERE userId = ?').run(lvl, ma.xp, uId);
  }
  return { lvl, ups };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('maler')
    .setDescription('Werde ein Maler und schaffe unvergaengliche Kunstwerke!')
    .addSubcommand(s => s.setName('start').setDescription('Beginne deine Maler-Karriere'))
    .addSubcommand(s => s.setName('status').setDescription('Zeige deinen Maler-Status'))
    .addSubcommand(s => s.setName('farben').setDescription('Liste alle verfuegbaren Farben'))
    .addSubcommand(s => s.setName('kaufen').setDescription('Kaufe Farben').addIntegerOption(o => o.setName('farbe').setDescription('Farb-Typ (1-8)').setRequired(true)).addIntegerOption(o => o.setName('menge').setDescription('Menge').setRequired(true)))
    .addSubcommand(s => s.setName('malen').setDescription('Male ein Gemaedle').addIntegerOption(o => o.setName('gemaedle').setDescription('Gemaedle-Typ (1-8)').setRequired(true)).addIntegerOption(o => o.setName('stil').setDescription('Malstil (1-8)').setRequired(true)))
    .addSubcommand(s => s.setName('training').setDescription('Verbessere deine Faehigkeiten').addStringOption(o => o.setName('art').setDescription('Trainingsart').setRequired(true).addChoices({ name: 'Skizzieren', value: 'skizzieren' }, { name: 'Mischen', value: 'mischen' }, { name: 'Lasieren', value: 'lasieren' })))
    .addSubcommand(s => s.setName('upgrade').setDescription('Verbessere dein Atelier').addStringOption(o => o.setName('slot').setDescription('Upgrade-Slot').setRequired(true).addChoices({ name: 'Pinselset', value: 'pinsel' }, { name: 'Staffelei', value: 'staffelei' }, { name: 'Mischpalette', value: 'palette' }, { name: 'Kunstatelier', value: 'werkstatt' })))
    .addSubcommand(s => s.setName('galerie').setDescription('Zeige deine Galerie'))
    .addSubcommand(s => s.setName('auftrag').setDescription('Nimm einen Auftrag an'))
    .addSubcommand(s => s.setName('duell').setDescription('Fordere einen anderen Maler heraus').addUserOption(o => o.setName('gegner').setDescription('Dein Gegner').setRequired(true))),

  async execute(interaction) {
    const config = require('../config.json');
    ensureMalerTable();
    const uId = interaction.user.id;
    const sub = interaction.options.getSubcommand();

    if (sub === 'start') {
      const existing = db.db.prepare('SELECT userId FROM maler WHERE userId = ?').get(uId);
      if (existing) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFF69B4).setTitle('Maler').setDescription('Du bist bereits Maler!')] });
      }
      db.db.prepare('INSERT INTO maler (userId) VALUES (?)').run(uId);
      db.db.prepare('INSERT INTO maler_galerie (userId) VALUES (?)').run(uId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFF69B4).setTitle('Willkommen, Maler!').setDescription('Du hast dein Kunstatelier eroeffnet!\nBenutze `/maler kaufen` um Farben zu kaufen.\nDann `/maler malen` um Gemaedle zu erschaffen!')] });
    }

    if (sub === 'farben') {
      const lines = FARBEN.map((f, i) => `${f.emoji} **${i + 1}. ${f.name}** — ${f.preis} Muenzen | Qualitaet: ${f.qualitaet}x`);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFF69B4).setTitle('🎨 Farbenpalette').setDescription(lines.join('\n'))] });
    }

    const ma = getMaler(uId);

    if (sub === 'status') {
      const upgLines = Object.entries(UPGRADES).map(([k, u]) => `${u.name}: Stufe ${ma[`upg_${k}`]}`);
      const embed = new EmbedBuilder()
        .setColor(0xFF69B4)
        .setTitle(`🎨 Maler — ${interaction.user.username}`)
        .addFields(
          { name: 'Level', value: `${ma.level}`, inline: true },
          { name: 'XP', value: `${ma.xp}/${xpForLevel(ma.level)}`, inline: true },
          { name: 'Muenzen', value: `${ma.geld}`, inline: true },
          { name: 'Farbe', value: `${ma.farbe}x ${ma.farbeTyp > 0 ? FARBEN[ma.farbeTyp - 1].name : 'Keine'}`, inline: true },
          { name: 'Auftraege', value: `${ma.auftraege}`, inline: true },
          { name: 'Duelle', value: `${ma.duelle} (${ma.siege} Siege)`, inline: true },
          { name: 'Upgrades', value: upgLines.join('\n'), inline: false },
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'kaufen') {
      const farbeIdx = interaction.options.getInteger('farbe') - 1;
      const menge = interaction.options.getInteger('menge');
      if (farbeIdx < 0 || farbeIdx >= FARBEN.length) return interaction.reply({ content: 'Ungueltiger Farb-Typ (1-8)!', ephemeral: true });
      if (menge < 1 || menge > 100) return interaction.reply({ content: 'Menge muss zwischen 1 und 100 liegen!', ephemeral: true });
      const farbe = FARBEN[farbeIdx];
      const kosten = farbe.preis * menge;
      if (ma.geld < kosten) return interaction.reply({ content: `Nicht genug Muenzen! Du brauchst ${kosten}, hast aber ${ma.geld}.`, ephemeral: true });
      db.db.prepare('UPDATE maler SET geld = geld - ?, farbe = farbe + ?, farbeTyp = ? WHERE userId = ?').run(kosten, menge, farbeIdx + 1, uId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFF69B4).setTitle('Farben gekauft').setDescription(`Du hast ${menge}x ${farbe.emoji} ${farbe.name} fuer ${kosten} Muenzen gekauft!`)] });
    }

    if (sub === 'malen') {
      const now = Date.now();
      const cd = cooldowns.get(uId) || 0;
      if (now - cd < 30000) {
        const left = Math.ceil((30000 - (now - cd)) / 1000);
        return interaction.reply({ content: `Noch ${left}s Abkuehlung!`, ephemeral: true });
      }
      const bildIdx = interaction.options.getInteger('gemaedle') - 1;
      const stilIdx = interaction.options.getInteger('stil') - 1;
      if (bildIdx < 0 || bildIdx >= GEMAELDE.length) return interaction.reply({ content: 'Ungueltiger Gemaedle-Typ (1-8)!', ephemeral: true });
      if (stilIdx < 0 || stilIdx >= STILE.length) return interaction.reply({ content: 'Ungueltiger Malstil (1-8)!', ephemeral: true });
      const bild = GEMAELDE[bildIdx];
      const stil = STILE[stilIdx];
      if (ma.level < bild.minLevel) return interaction.reply({ content: `Du brauchst Level ${bild.minLevel} fuer ${bild.name}!`, ephemeral: true });
      if (ma.level < stil.minLevel) return interaction.reply({ content: `Du brauchst Level ${stil.minLevel} fuer ${stil.name}!`, ephemeral: true });
      if (ma.farbe < bild.schwierigkeit) return interaction.reply({ content: `Du brauchst ${bild.schwierigkeit} Farbe fuer dieses Gemaedle!`, ephemeral: true });
      const farbe = ma.farbeTyp > 0 ? FARBEN[ma.farbeTyp - 1] : FARBEN[0];
      const upgBonus = (UPGRADES.pinsel.bonus[ma.upg_pinsel] || 0) + (UPGRADES.staffelei.bonus[ma.upg_staffelei] || 0) + (UPGRADES.palette.bonus[ma.upg_palette] || 0) + (UPGRADES.werkstatt.bonus[ma.upg_werkstatt] || 0);
      const rollBase = Math.random() * 100;
      const roll = Math.min(99, rollBase + upgBonus * 20);
      const event = MALER_EVENTS[Math.floor(Math.random() * MALER_EVENTS.length)];
      let qual = QUALITAETEN[0];
      for (const q of QUALITAETEN) { if (roll >= q.minRoll) qual = q; }
      const wert = Math.floor(bild.basisWert * farbe.qualitaet * stil.bonus * qual.multi * event.qualMulti * event.geldMulti);
      const xpGain = Math.floor(bild.schwierigkeit * 20 * farbe.qualitaet);
      db.db.prepare('UPDATE maler SET farbe = farbe - ?, geld = geld + ?, xp = xp + ? WHERE userId = ?').run(bild.schwierigkeit, wert, xpGain, uId);
      const updMa = getMaler(uId);
      const { lvl, ups } = checkLevelUp(uId, updMa);
      const col = `bild${bildIdx}`;
      db.db.prepare(`UPDATE maler_galerie SET ${col} = ${col} + 1 WHERE userId = ?`).run(uId);
      cooldowns.set(uId, now);
      const embed = new EmbedBuilder()
        .setColor(0xFF69B4)
        .setTitle('🎨 Gemaedle fertig!')
        .setDescription(`${event.text}`)
        .addFields(
          { name: 'Gemaedle', value: bild.name, inline: true },
          { name: 'Farbe', value: `${farbe.emoji} ${farbe.name}`, inline: true },
          { name: 'Stil', value: stil.name, inline: true },
          { name: 'Qualitaet', value: qual.name, inline: true },
          { name: 'Wert', value: `${wert} Muenzen`, inline: true },
          { name: 'XP', value: `+${xpGain}`, inline: true },
        );
      if (ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${lvl}!` });
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'training') {
      const art = interaction.options.getString('art');
      const kosten = 50 + ma.level * 20;
      if (ma.geld < kosten) return interaction.reply({ content: `Training kostet ${kosten} Muenzen!`, ephemeral: true });
      const xpGain = 30 + ma.level * 10;
      db.db.prepare('UPDATE maler SET geld = geld - ?, xp = xp + ? WHERE userId = ?').run(kosten, xpGain, uId);
      const updMa = getMaler(uId);
      const { lvl, ups } = checkLevelUp(uId, updMa);
      const embed = new EmbedBuilder().setColor(0xFF69B4).setTitle('Training').setDescription(`Du hast ${art === 'skizzieren' ? 'Skizzieren' : art === 'mischen' ? 'Mischen' : 'Lasieren'} trainiert!\n+${xpGain} XP | -${kosten} Muenzen`);
      if (ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${lvl}!` });
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'upgrade') {
      const slot = interaction.options.getString('slot');
      const upg = UPGRADES[slot];
      const curStufe = ma[`upg_${slot}`];
      if (curStufe >= upg.stufen.length - 1) return interaction.reply({ content: 'Maximale Stufe erreicht!', ephemeral: true });
      const kosten = upg.stufen[curStufe + 1];
      if (ma.geld < kosten) return interaction.reply({ content: `Upgrade kostet ${kosten} Muenzen!`, ephemeral: true });
      db.db.prepare(`UPDATE maler SET geld = geld - ?, upg_${slot} = upg_${slot} + 1 WHERE userId = ?`).run(kosten, uId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFF69B4).setTitle('Upgrade').setDescription(`${upg.name} auf Stufe ${curStufe + 1} verbessert!`)] });
    }

    if (sub === 'galerie') {
      const galerie = getGalerie(uId);
      const lines = GEMAELDE.map((g, i) => `${g.name}: ${galerie[`bild${i}`] || 0}x`);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFF69B4).setTitle('🎨 Galerie').setDescription(lines.join('\n'))] });
    }

    if (sub === 'auftrag') {
      const now = Date.now();
      const cdKey = `auftrag_${uId}`;
      const cd = cooldowns.get(cdKey) || 0;
      if (now - cd < 60000) {
        const left = Math.ceil((60000 - (now - cd)) / 1000);
        return interaction.reply({ content: `Naechster Auftrag in ${left}s!`, ephemeral: true });
      }
      const bildIdx = Math.min(Math.max(0, ma.level - 1), GEMAELDE.length - 1);
      const bild = GEMAELDE[bildIdx];
      const menge = 1 + Math.floor(Math.random() * 2);
      const galerie = getGalerie(uId);
      const vorrat = galerie[`bild${bildIdx}`] || 0;
      if (vorrat < menge) return interaction.reply({ content: `Auftrag: ${menge}x ${bild.name}. Dir fehlen noch ${menge - vorrat}!`, ephemeral: false });
      const belohnung = Math.floor(bild.basisWert * menge * 1.3);
      const xpGain = bild.schwierigkeit * menge * 15;
      db.db.prepare(`UPDATE maler_galerie SET bild${bildIdx} = bild${bildIdx} - ? WHERE userId = ?`).run(menge, uId);
      db.db.prepare('UPDATE maler SET geld = geld + ?, xp = xp + ?, auftraege = auftraege + 1 WHERE userId = ?').run(belohnung, xpGain, uId);
      const updMa = getMaler(uId);
      const { lvl, ups } = checkLevelUp(uId, updMa);
      cooldowns.set(cdKey, now);
      const embed = new EmbedBuilder().setColor(0xFF69B4).setTitle('📋 Auftrag erfuellt!').setDescription(`${menge}x ${bild.name} geliefert!\n+${belohnung} Muenzen | +${xpGain} XP`);
      if (ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${lvl}!` });
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'duell') {
      const gegner = interaction.options.getUser('gegner');
      if (gegner.id === uId) return interaction.reply({ content: 'Du kannst nicht gegen dich selbst kaempfen!', ephemeral: true });
      const gMa = db.db.prepare('SELECT * FROM maler WHERE userId = ?').get(gegner.id);
      if (!gMa) return interaction.reply({ content: 'Dein Gegner ist noch kein Maler!', ephemeral: true });
      const myScore = ma.level * 10 + Math.random() * 50;
      const gScore = gMa.level * 10 + Math.random() * 50;
      const gewonnen = myScore > gScore;
      const belohnung = gewonnen ? Math.floor(50 + ma.level * 15) : 0;
      const xpGain = gewonnen ? 40 + ma.level * 10 : 10;
      db.db.prepare('UPDATE maler SET geld = geld + ?, xp = xp + ?, duelle = duelle + 1, siege = siege + ? WHERE userId = ?').run(belohnung, xpGain, gewonnen ? 1 : 0, uId);
      const updMa = getMaler(uId);
      const { lvl, ups } = checkLevelUp(uId, updMa);
      const embed = new EmbedBuilder()
        .setColor(gewonnen ? 0x00FF00 : 0xFF0000)
        .setTitle(gewonnen ? '⚔️ Duell gewonnen!' : '⚔️ Duell verloren!')
        .setDescription(`${gewonnen ? `Du hast ${gegner.username} besiegt!` : `${gegner.username} hat gewonnen!`}\n${gewonnen ? `+${belohnung} Muenzen | ` : ''}+${xpGain} XP`);
      if (ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${lvl}!` });
      return interaction.reply({ embeds: [embed] });
    }
  },
};
