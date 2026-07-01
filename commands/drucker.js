const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

const TINTEN = [
  { name: 'Russschwarz', preis: 20, qualitaet: 1.0, emoji: '⬛' },
  { name: 'Tintenblau', preis: 40, qualitaet: 1.3, emoji: '🔵' },
  { name: 'Purpurtinte', preis: 70, qualitaet: 1.6, emoji: '🟣' },
  { name: 'Goldtinte', preis: 120, qualitaet: 2.0, emoji: '🟡' },
  { name: 'Elfentinte', preis: 190, qualitaet: 2.6, emoji: '✨' },
  { name: 'Mondtinte', preis: 300, qualitaet: 3.3, emoji: '🌙' },
  { name: 'Kristalltinte', preis: 480, qualitaet: 4.2, emoji: '💎' },
  { name: 'Aethertinte', preis: 780, qualitaet: 5.5, emoji: '🔮' },
];

const DRUCKWERKE = [
  { name: 'Flugblatt', basisWert: 60, schwierigkeit: 1, minLevel: 1 },
  { name: 'Zeitung', basisWert: 130, schwierigkeit: 2, minLevel: 3 },
  { name: 'Pamphlet', basisWert: 200, schwierigkeit: 3, minLevel: 5 },
  { name: 'Buch', basisWert: 300, schwierigkeit: 4, minLevel: 8 },
  { name: 'Illustriertes Buch', basisWert: 450, schwierigkeit: 5, minLevel: 12 },
  { name: 'Prachtband', basisWert: 660, schwierigkeit: 6, minLevel: 16 },
  { name: 'Enzyklopaedie', basisWert: 960, schwierigkeit: 7, minLevel: 21 },
  { name: 'Legendaeres Aetherwerk', basisWert: 1400, schwierigkeit: 8, minLevel: 28 },
];

const SCHRIFTARTEN = [
  { name: 'Standardschrift', bonus: 1.0, minLevel: 1 },
  { name: 'Antiqua', bonus: 1.2, minLevel: 3 },
  { name: 'Kursivschrift', bonus: 1.5, minLevel: 5 },
  { name: 'Gotisch', bonus: 1.8, minLevel: 8 },
  { name: 'Elfenschrift', bonus: 2.3, minLevel: 12 },
  { name: 'Mondschrift', bonus: 2.9, minLevel: 16 },
  { name: 'Runenschrift', bonus: 3.7, minLevel: 21 },
  { name: 'Aetherschrift', bonus: 4.8, minLevel: 28 },
];

const QUALITAETEN = [
  { name: 'Verschmiert', multi: 0.3, minRoll: 0 },
  { name: 'Verblasst', multi: 0.6, minRoll: 15 },
  { name: 'Lesbar', multi: 0.9, minRoll: 30 },
  { name: 'Klar', multi: 1.2, minRoll: 45 },
  { name: 'Scharf', multi: 1.6, minRoll: 62 },
  { name: 'Exquisit', multi: 2.1, minRoll: 78 },
  { name: 'Meisterhaft', multi: 3.2, minRoll: 92 },
];

const UPGRADES = {
  druckpresse: { name: 'Druckpresse', stufen: [0, 250, 650, 1700, 4200], bonus: [0, 0.1, 0.2, 0.35, 0.5] },
  setzkasten: { name: 'Setzkasten', stufen: [0, 430, 1100, 2750, 6600], bonus: [0, 0.08, 0.18, 0.3, 0.45] },
  walze: { name: 'Druckwalze', stufen: [0, 340, 870, 2200, 5300], bonus: [0, 0.06, 0.14, 0.25, 0.4] },
  werkstatt: { name: 'Werkstatt', stufen: [0, 870, 2200, 5200, 12800], bonus: [0, 0.12, 0.25, 0.4, 0.6] },
};

const DRUCKER_EVENTS = [
  { text: 'Die Druckplatte verschmiert!', qualMulti: 0.5, geldMulti: 0.7 },
  { text: 'Der Druck ist gestochen scharf!', qualMulti: 1.5, geldMulti: 1.2 },
  { text: 'Eine Type bricht und muss ersetzt werden.', qualMulti: 0.8, geldMulti: 0.9 },
  { text: 'Perfekte Druckqualitaet!', qualMulti: 2.0, geldMulti: 1.5 },
  { text: 'Die Tinte trocknet gleichmaessig.', qualMulti: 1.3, geldMulti: 1.1 },
  { text: 'Zu viel Tinte macht den Druck unlesbar.', qualMulti: 0.7, geldMulti: 0.85 },
  { text: 'Jede Seite ist ein Meisterwerk!', qualMulti: 1.8, geldMulti: 1.4 },
];

const cooldowns = new Map();

function ensureDruckerTable() {
  db.db.exec(`CREATE TABLE IF NOT EXISTS drucker (
    userId TEXT PRIMARY KEY,
    geld INTEGER DEFAULT 0,
    tinte INTEGER DEFAULT 0,
    tinteTyp INTEGER DEFAULT 0,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    auftraege INTEGER DEFAULT 0,
    duelle INTEGER DEFAULT 0,
    siege INTEGER DEFAULT 0,
    upg_druckpresse INTEGER DEFAULT 0,
    upg_setzkasten INTEGER DEFAULT 0,
    upg_walze INTEGER DEFAULT 0,
    upg_werkstatt INTEGER DEFAULT 0
  )`);
  db.db.exec(`CREATE TABLE IF NOT EXISTS drucker_lager (
    userId TEXT PRIMARY KEY,
    werk0 INTEGER DEFAULT 0,
    werk1 INTEGER DEFAULT 0,
    werk2 INTEGER DEFAULT 0,
    werk3 INTEGER DEFAULT 0,
    werk4 INTEGER DEFAULT 0,
    werk5 INTEGER DEFAULT 0,
    werk6 INTEGER DEFAULT 0,
    werk7 INTEGER DEFAULT 0
  )`);
}

function getDrucker(uId) {
  let row = db.db.prepare('SELECT * FROM drucker WHERE userId = ?').get(uId);
  if (!row) {
    db.db.prepare('INSERT INTO drucker (userId) VALUES (?)').run(uId);
    row = db.db.prepare('SELECT * FROM drucker WHERE userId = ?').get(uId);
  }
  return row;
}

function getLager(uId) {
  let row = db.db.prepare('SELECT * FROM drucker_lager WHERE userId = ?').get(uId);
  if (!row) {
    db.db.prepare('INSERT INTO drucker_lager (userId) VALUES (?)').run(uId);
    row = db.db.prepare('SELECT * FROM drucker_lager WHERE userId = ?').get(uId);
  }
  return row;
}

function xpForLevel(l) { return l * l * 51; }

function checkLevelUp(uId, dr) {
  let lvl = dr.level;
  let ups = 0;
  while (dr.xp >= xpForLevel(lvl)) {
    dr.xp -= xpForLevel(lvl);
    lvl++;
    ups++;
  }
  if (ups > 0) {
    db.db.prepare('UPDATE drucker SET level = ?, xp = ? WHERE userId = ?').run(lvl, dr.xp, uId);
  }
  return { lvl, ups };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('drucker')
    .setDescription('Werde ein Drucker und verbreite Wissen mit deiner Druckpresse!')
    .addSubcommand(s => s.setName('start').setDescription('Beginne deine Drucker-Karriere'))
    .addSubcommand(s => s.setName('status').setDescription('Zeige deinen Drucker-Status'))
    .addSubcommand(s => s.setName('tinten').setDescription('Liste alle verfuegbaren Tintenarten'))
    .addSubcommand(s => s.setName('kaufen').setDescription('Kaufe Tinte').addIntegerOption(o => o.setName('tinte').setDescription('Tinten-Typ (1-8)').setRequired(true)).addIntegerOption(o => o.setName('menge').setDescription('Menge').setRequired(true)))
    .addSubcommand(s => s.setName('drucken').setDescription('Drucke ein Werk').addIntegerOption(o => o.setName('werk').setDescription('Druckwerk-Typ (1-8)').setRequired(true)).addIntegerOption(o => o.setName('schrift').setDescription('Schriftart (1-8)').setRequired(true)))
    .addSubcommand(s => s.setName('training').setDescription('Verbessere deine Faehigkeiten').addStringOption(o => o.setName('art').setDescription('Trainingsart').setRequired(true).addChoices({ name: 'Setzen', value: 'setzen' }, { name: 'Drucken', value: 'drucken' }, { name: 'Binden', value: 'binden' })))
    .addSubcommand(s => s.setName('upgrade').setDescription('Verbessere deine Druckerei').addStringOption(o => o.setName('slot').setDescription('Upgrade-Slot').setRequired(true).addChoices({ name: 'Druckpresse', value: 'druckpresse' }, { name: 'Setzkasten', value: 'setzkasten' }, { name: 'Druckwalze', value: 'walze' }, { name: 'Werkstatt', value: 'werkstatt' })))
    .addSubcommand(s => s.setName('lager').setDescription('Zeige dein Druckwerklager'))
    .addSubcommand(s => s.setName('auftrag').setDescription('Nimm einen Druckauftrag an'))
    .addSubcommand(s => s.setName('duell').setDescription('Fordere einen anderen Drucker heraus').addUserOption(o => o.setName('gegner').setDescription('Dein Gegner').setRequired(true))),

  async execute(interaction) {
    const config = require('../config.json');
    ensureDruckerTable();
    const uId = interaction.user.id;
    const sub = interaction.options.getSubcommand();

    if (sub === 'start') {
      const existing = db.db.prepare('SELECT userId FROM drucker WHERE userId = ?').get(uId);
      if (existing) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x2F4F4F).setTitle('Drucker').setDescription('Du bist bereits Drucker!')] });
      }
      db.db.prepare('INSERT INTO drucker (userId) VALUES (?)').run(uId);
      db.db.prepare('INSERT INTO drucker_lager (userId) VALUES (?)').run(uId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x2F4F4F).setTitle('Willkommen, Drucker!').setDescription('Du hast deine Druckerei eroeffnet!\nBenutze `/drucker kaufen` um Tinte zu kaufen.\nDann `/drucker drucken` um Werke herzustellen!')] });
    }

    if (sub === 'tinten') {
      const lines = TINTEN.map((t, i) => `${t.emoji} **${i + 1}. ${t.name}** — ${t.preis} Muenzen | Qualitaet: ${t.qualitaet}x`);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x2F4F4F).setTitle('🖨️ Tintenarten').setDescription(lines.join('\n'))] });
    }

    const dr = getDrucker(uId);

    if (sub === 'status') {
      const upgLines = Object.entries(UPGRADES).map(([k, u]) => `${u.name}: Stufe ${dr[`upg_${k}`]}`);
      const embed = new EmbedBuilder()
        .setColor(0x2F4F4F)
        .setTitle(`🖨️ Drucker — ${interaction.user.username}`)
        .addFields(
          { name: 'Level', value: `${dr.level}`, inline: true },
          { name: 'XP', value: `${dr.xp}/${xpForLevel(dr.level)}`, inline: true },
          { name: 'Muenzen', value: `${dr.geld}`, inline: true },
          { name: 'Tinte', value: `${dr.tinte}x ${dr.tinteTyp > 0 ? TINTEN[dr.tinteTyp - 1].name : 'Keine'}`, inline: true },
          { name: 'Auftraege', value: `${dr.auftraege}`, inline: true },
          { name: 'Duelle', value: `${dr.duelle} (${dr.siege} Siege)`, inline: true },
          { name: 'Upgrades', value: upgLines.join('\n'), inline: false },
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'kaufen') {
      const tinteIdx = interaction.options.getInteger('tinte') - 1;
      const menge = interaction.options.getInteger('menge');
      if (tinteIdx < 0 || tinteIdx >= TINTEN.length) return interaction.reply({ content: 'Ungueltiger Tinten-Typ (1-8)!', ephemeral: true });
      if (menge < 1 || menge > 100) return interaction.reply({ content: 'Menge muss zwischen 1 und 100 liegen!', ephemeral: true });
      const tinte = TINTEN[tinteIdx];
      const kosten = tinte.preis * menge;
      if (dr.geld < kosten) return interaction.reply({ content: `Nicht genug Muenzen! Du brauchst ${kosten}, hast aber ${dr.geld}.`, ephemeral: true });
      db.db.prepare('UPDATE drucker SET geld = geld - ?, tinte = tinte + ?, tinteTyp = ? WHERE userId = ?').run(kosten, menge, tinteIdx + 1, uId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x2F4F4F).setTitle('Tinte gekauft').setDescription(`Du hast ${menge}x ${tinte.emoji} ${tinte.name} fuer ${kosten} Muenzen gekauft!`)] });
    }

    if (sub === 'drucken') {
      const now = Date.now();
      const cd = cooldowns.get(uId) || 0;
      if (now - cd < 30000) {
        const left = Math.ceil((30000 - (now - cd)) / 1000);
        return interaction.reply({ content: `Noch ${left}s Abkuehlung!`, ephemeral: true });
      }
      const werkIdx = interaction.options.getInteger('werk') - 1;
      const schriftIdx = interaction.options.getInteger('schrift') - 1;
      if (werkIdx < 0 || werkIdx >= DRUCKWERKE.length) return interaction.reply({ content: 'Ungueltiger Druckwerk-Typ (1-8)!', ephemeral: true });
      if (schriftIdx < 0 || schriftIdx >= SCHRIFTARTEN.length) return interaction.reply({ content: 'Ungueltige Schriftart (1-8)!', ephemeral: true });
      const werk = DRUCKWERKE[werkIdx];
      const schrift = SCHRIFTARTEN[schriftIdx];
      if (dr.level < werk.minLevel) return interaction.reply({ content: `Du brauchst Level ${werk.minLevel} fuer ${werk.name}!`, ephemeral: true });
      if (dr.level < schrift.minLevel) return interaction.reply({ content: `Du brauchst Level ${schrift.minLevel} fuer ${schrift.name}!`, ephemeral: true });
      if (dr.tinte < werk.schwierigkeit) return interaction.reply({ content: `Du brauchst ${werk.schwierigkeit} Tinte fuer dieses Druckwerk!`, ephemeral: true });
      const tinte = dr.tinteTyp > 0 ? TINTEN[dr.tinteTyp - 1] : TINTEN[0];
      const upgBonus = (UPGRADES.druckpresse.bonus[dr.upg_druckpresse] || 0) + (UPGRADES.setzkasten.bonus[dr.upg_setzkasten] || 0) + (UPGRADES.walze.bonus[dr.upg_walze] || 0) + (UPGRADES.werkstatt.bonus[dr.upg_werkstatt] || 0);
      const rollBase = Math.random() * 100;
      const roll = Math.min(99, rollBase + upgBonus * 20);
      const event = DRUCKER_EVENTS[Math.floor(Math.random() * DRUCKER_EVENTS.length)];
      let qual = QUALITAETEN[0];
      for (const q of QUALITAETEN) { if (roll >= q.minRoll) qual = q; }
      const wert = Math.floor(werk.basisWert * tinte.qualitaet * schrift.bonus * qual.multi * event.qualMulti * event.geldMulti);
      const xpGain = Math.floor(werk.schwierigkeit * 20 * tinte.qualitaet);
      db.db.prepare('UPDATE drucker SET tinte = tinte - ?, geld = geld + ?, xp = xp + ? WHERE userId = ?').run(werk.schwierigkeit, wert, xpGain, uId);
      const updDr = getDrucker(uId);
      const { lvl, ups } = checkLevelUp(uId, updDr);
      const col = `werk${werkIdx}`;
      db.db.prepare(`UPDATE drucker_lager SET ${col} = ${col} + 1 WHERE userId = ?`).run(uId);
      cooldowns.set(uId, now);
      const embed = new EmbedBuilder()
        .setColor(0x2F4F4F)
        .setTitle('🖨️ Werk gedruckt!')
        .setDescription(`${event.text}`)
        .addFields(
          { name: 'Druckwerk', value: werk.name, inline: true },
          { name: 'Tinte', value: `${tinte.emoji} ${tinte.name}`, inline: true },
          { name: 'Schrift', value: schrift.name, inline: true },
          { name: 'Qualitaet', value: qual.name, inline: true },
          { name: 'Wert', value: `${wert} Muenzen`, inline: true },
          { name: 'XP', value: `+${xpGain}`, inline: true },
        );
      if (ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${lvl}!` });
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'training') {
      const art = interaction.options.getString('art');
      const kosten = 50 + dr.level * 20;
      if (dr.geld < kosten) return interaction.reply({ content: `Training kostet ${kosten} Muenzen!`, ephemeral: true });
      const xpGain = 30 + dr.level * 10;
      db.db.prepare('UPDATE drucker SET geld = geld - ?, xp = xp + ? WHERE userId = ?').run(kosten, xpGain, uId);
      const updDr = getDrucker(uId);
      const { lvl, ups } = checkLevelUp(uId, updDr);
      const embed = new EmbedBuilder().setColor(0x2F4F4F).setTitle('Training').setDescription(`Du hast ${art === 'setzen' ? 'Setzen' : art === 'drucken' ? 'Drucken' : 'Binden'} trainiert!\n+${xpGain} XP | -${kosten} Muenzen`);
      if (ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${lvl}!` });
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'upgrade') {
      const slot = interaction.options.getString('slot');
      const upg = UPGRADES[slot];
      const curStufe = dr[`upg_${slot}`];
      if (curStufe >= upg.stufen.length - 1) return interaction.reply({ content: 'Maximale Stufe erreicht!', ephemeral: true });
      const kosten = upg.stufen[curStufe + 1];
      if (dr.geld < kosten) return interaction.reply({ content: `Upgrade kostet ${kosten} Muenzen!`, ephemeral: true });
      db.db.prepare(`UPDATE drucker SET geld = geld - ?, upg_${slot} = upg_${slot} + 1 WHERE userId = ?`).run(kosten, uId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x2F4F4F).setTitle('Upgrade').setDescription(`${upg.name} auf Stufe ${curStufe + 1} verbessert!`)] });
    }

    if (sub === 'lager') {
      const lager = getLager(uId);
      const lines = DRUCKWERKE.map((w, i) => `${w.name}: ${lager[`werk${i}`] || 0}x`);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x2F4F4F).setTitle('🖨️ Druckwerklager').setDescription(lines.join('\n'))] });
    }

    if (sub === 'auftrag') {
      const now = Date.now();
      const cdKey = `auftrag_${uId}`;
      const cd = cooldowns.get(cdKey) || 0;
      if (now - cd < 60000) {
        const left = Math.ceil((60000 - (now - cd)) / 1000);
        return interaction.reply({ content: `Naechster Auftrag in ${left}s!`, ephemeral: true });
      }
      const werkIdx = Math.min(Math.max(0, dr.level - 1), DRUCKWERKE.length - 1);
      const werk = DRUCKWERKE[werkIdx];
      const menge = 1 + Math.floor(Math.random() * 2);
      const lager = getLager(uId);
      const vorrat = lager[`werk${werkIdx}`] || 0;
      if (vorrat < menge) return interaction.reply({ content: `Auftrag: ${menge}x ${werk.name}. Dir fehlen noch ${menge - vorrat}!`, ephemeral: false });
      const belohnung = Math.floor(werk.basisWert * menge * 1.3);
      const xpGain = werk.schwierigkeit * menge * 15;
      db.db.prepare(`UPDATE drucker_lager SET werk${werkIdx} = werk${werkIdx} - ? WHERE userId = ?`).run(menge, uId);
      db.db.prepare('UPDATE drucker SET geld = geld + ?, xp = xp + ?, auftraege = auftraege + 1 WHERE userId = ?').run(belohnung, xpGain, uId);
      const updDr = getDrucker(uId);
      const { lvl, ups } = checkLevelUp(uId, updDr);
      cooldowns.set(cdKey, now);
      const embed = new EmbedBuilder().setColor(0x2F4F4F).setTitle('📋 Auftrag erfuellt!').setDescription(`${menge}x ${werk.name} geliefert!\n+${belohnung} Muenzen | +${xpGain} XP`);
      if (ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${lvl}!` });
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'duell') {
      const gegner = interaction.options.getUser('gegner');
      if (gegner.id === uId) return interaction.reply({ content: 'Du kannst nicht gegen dich selbst kaempfen!', ephemeral: true });
      const gDr = db.db.prepare('SELECT * FROM drucker WHERE userId = ?').get(gegner.id);
      if (!gDr) return interaction.reply({ content: 'Dein Gegner ist noch kein Drucker!', ephemeral: true });
      const myScore = dr.level * 10 + Math.random() * 50;
      const gScore = gDr.level * 10 + Math.random() * 50;
      const gewonnen = myScore > gScore;
      const belohnung = gewonnen ? Math.floor(50 + dr.level * 15) : 0;
      const xpGain = gewonnen ? 40 + dr.level * 10 : 10;
      db.db.prepare('UPDATE drucker SET geld = geld + ?, xp = xp + ?, duelle = duelle + 1, siege = siege + ? WHERE userId = ?').run(belohnung, xpGain, gewonnen ? 1 : 0, uId);
      const updDr = getDrucker(uId);
      const { lvl, ups } = checkLevelUp(uId, updDr);
      const embed = new EmbedBuilder()
        .setColor(gewonnen ? 0x00FF00 : 0xFF0000)
        .setTitle(gewonnen ? '⚔️ Duell gewonnen!' : '⚔️ Duell verloren!')
        .setDescription(`${gewonnen ? `Du hast ${gegner.username} besiegt!` : `${gegner.username} hat gewonnen!`}\n${gewonnen ? `+${belohnung} Muenzen | ` : ''}+${xpGain} XP`);
      if (ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${lvl}!` });
      return interaction.reply({ embeds: [embed] });
    }
  },
};
