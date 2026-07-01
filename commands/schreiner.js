const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

const HOELZER = [
  { name: 'Kiefernholz', preis: 25, qualitaet: 1.0, emoji: '🌲' },
  { name: 'Birkenholz', preis: 50, qualitaet: 1.3, emoji: '🌳' },
  { name: 'Eichenholz', preis: 90, qualitaet: 1.6, emoji: '🪵' },
  { name: 'Nussbaumholz', preis: 150, qualitaet: 2.0, emoji: '🌰' },
  { name: 'Mahagoni', preis: 240, qualitaet: 2.6, emoji: '🍂' },
  { name: 'Ebenholz', preis: 380, qualitaet: 3.3, emoji: '🖤' },
  { name: 'Kristallholz', preis: 600, qualitaet: 4.2, emoji: '💎' },
  { name: 'Aetherholz', preis: 950, qualitaet: 5.5, emoji: '🔮' },
];

const MOEBELARTEN = [
  { name: 'Hocker', basisWert: 80, schwierigkeit: 1, minLevel: 1 },
  { name: 'Stuhl', basisWert: 160, schwierigkeit: 2, minLevel: 3 },
  { name: 'Regal', basisWert: 240, schwierigkeit: 3, minLevel: 5 },
  { name: 'Tisch', basisWert: 340, schwierigkeit: 4, minLevel: 8 },
  { name: 'Schrank', basisWert: 500, schwierigkeit: 5, minLevel: 12 },
  { name: 'Bett', basisWert: 720, schwierigkeit: 6, minLevel: 16 },
  { name: 'Kommmode', basisWert: 1000, schwierigkeit: 7, minLevel: 21 },
  { name: 'Legendaeres Meisterstueck', basisWert: 1500, schwierigkeit: 8, minLevel: 28 },
];

const BESCHLAEGE = [
  { name: 'Eisenbeschlag', bonus: 1.0, minLevel: 1 },
  { name: 'Bronzebeschlag', bonus: 1.2, minLevel: 3 },
  { name: 'Kupferbeschlag', bonus: 1.5, minLevel: 5 },
  { name: 'Messingbeschlag', bonus: 1.8, minLevel: 8 },
  { name: 'Silberbeschlag', bonus: 2.2, minLevel: 12 },
  { name: 'Goldbeschlag', bonus: 2.8, minLevel: 16 },
  { name: 'Mithrilbeschlag', bonus: 3.5, minLevel: 21 },
  { name: 'Aetherbeschlag', bonus: 4.5, minLevel: 28 },
];

const QUALITAETEN = [
  { name: 'Schief', multi: 0.3, minRoll: 0 },
  { name: 'Grob', multi: 0.6, minRoll: 15 },
  { name: 'Einfach', multi: 0.9, minRoll: 30 },
  { name: 'Solide', multi: 1.2, minRoll: 45 },
  { name: 'Fein', multi: 1.6, minRoll: 62 },
  { name: 'Exquisit', multi: 2.1, minRoll: 78 },
  { name: 'Meisterhaft', multi: 3.2, minRoll: 92 },
];

const UPGRADES = {
  saege: { name: 'Saege', stufen: [0, 280, 750, 1900, 4800], bonus: [0, 0.1, 0.2, 0.35, 0.5] },
  hobel: { name: 'Hobel', stufen: [0, 480, 1200, 3000, 7200], bonus: [0, 0.08, 0.18, 0.3, 0.45] },
  schleifstein: { name: 'Schleifstein', stufen: [0, 380, 950, 2400, 5800], bonus: [0, 0.06, 0.14, 0.25, 0.4] },
  werkstatt: { name: 'Werkstatt', stufen: [0, 950, 2400, 5800, 14000], bonus: [0, 0.12, 0.25, 0.4, 0.6] },
};

const SCHREINER_EVENTS = [
  { text: 'Das Holz reisst beim Saegen!', qualMulti: 0.5, geldMulti: 0.7 },
  { text: 'Die Verbindungen sitzen wie angegossen!', qualMulti: 1.5, geldMulti: 1.2 },
  { text: 'Ein Ast stoert die Maserung.', qualMulti: 0.8, geldMulti: 0.9 },
  { text: 'Meisterhaftes Handwerk!', qualMulti: 2.0, geldMulti: 1.5 },
  { text: 'Das Holz glaenzt nach dem Schleifen wunderschoen.', qualMulti: 1.3, geldMulti: 1.1 },
  { text: 'Eine Verbindung loest sich und muss neu verleimt werden.', qualMulti: 0.7, geldMulti: 0.85 },
  { text: 'Die Maserung ist unvergleichlich schoen!', qualMulti: 1.8, geldMulti: 1.4 },
];

const cooldowns = new Map();

function ensureSchreinerTable() {
  db.db.exec(`CREATE TABLE IF NOT EXISTS schreiner (
    userId TEXT PRIMARY KEY,
    geld INTEGER DEFAULT 0,
    holz INTEGER DEFAULT 0,
    holzTyp INTEGER DEFAULT 0,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    auftraege INTEGER DEFAULT 0,
    duelle INTEGER DEFAULT 0,
    siege INTEGER DEFAULT 0,
    upg_saege INTEGER DEFAULT 0,
    upg_hobel INTEGER DEFAULT 0,
    upg_schleifstein INTEGER DEFAULT 0,
    upg_werkstatt INTEGER DEFAULT 0
  )`);
  db.db.exec(`CREATE TABLE IF NOT EXISTS schreiner_ausstellung (
    userId TEXT PRIMARY KEY,
    moebel0 INTEGER DEFAULT 0,
    moebel1 INTEGER DEFAULT 0,
    moebel2 INTEGER DEFAULT 0,
    moebel3 INTEGER DEFAULT 0,
    moebel4 INTEGER DEFAULT 0,
    moebel5 INTEGER DEFAULT 0,
    moebel6 INTEGER DEFAULT 0,
    moebel7 INTEGER DEFAULT 0
  )`);
}

function getSchreiner(uId) {
  let row = db.db.prepare('SELECT * FROM schreiner WHERE userId = ?').get(uId);
  if (!row) {
    db.db.prepare('INSERT INTO schreiner (userId) VALUES (?)').run(uId);
    row = db.db.prepare('SELECT * FROM schreiner WHERE userId = ?').get(uId);
  }
  return row;
}

function getAusstellung(uId) {
  let row = db.db.prepare('SELECT * FROM schreiner_ausstellung WHERE userId = ?').get(uId);
  if (!row) {
    db.db.prepare('INSERT INTO schreiner_ausstellung (userId) VALUES (?)').run(uId);
    row = db.db.prepare('SELECT * FROM schreiner_ausstellung WHERE userId = ?').get(uId);
  }
  return row;
}

function xpForLevel(l) { return l * l * 51; }

function checkLevelUp(uId, sc) {
  let lvl = sc.level;
  let ups = 0;
  while (sc.xp >= xpForLevel(lvl)) {
    sc.xp -= xpForLevel(lvl);
    lvl++;
    ups++;
  }
  if (ups > 0) {
    db.db.prepare('UPDATE schreiner SET level = ?, xp = ? WHERE userId = ?').run(lvl, sc.xp, uId);
  }
  return { lvl, ups };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('schreiner')
    .setDescription('Werde ein Schreiner und fertige edle Moebel aus feinstem Holz!')
    .addSubcommand(s => s.setName('start').setDescription('Beginne deine Schreiner-Karriere'))
    .addSubcommand(s => s.setName('status').setDescription('Zeige deinen Schreiner-Status'))
    .addSubcommand(s => s.setName('hoelzer').setDescription('Liste alle verfuegbaren Holzarten'))
    .addSubcommand(s => s.setName('kaufen').setDescription('Kaufe Holz').addIntegerOption(o => o.setName('holz').setDescription('Holz-Typ (1-8)').setRequired(true)).addIntegerOption(o => o.setName('menge').setDescription('Menge').setRequired(true)))
    .addSubcommand(s => s.setName('zimmern').setDescription('Zimmere ein Moebelstuck').addIntegerOption(o => o.setName('moebel').setDescription('Moebel-Typ (1-8)').setRequired(true)).addIntegerOption(o => o.setName('beschlag').setDescription('Beschlag-Typ (1-8)').setRequired(true)))
    .addSubcommand(s => s.setName('training').setDescription('Verbessere deine Faehigkeiten').addStringOption(o => o.setName('art').setDescription('Trainingsart').setRequired(true).addChoices({ name: 'Saegen', value: 'saegen' }, { name: 'Hobeln', value: 'hobeln' }, { name: 'Schleifen', value: 'schleifen' })))
    .addSubcommand(s => s.setName('upgrade').setDescription('Verbessere deine Werkzeuge').addStringOption(o => o.setName('slot').setDescription('Upgrade-Slot').setRequired(true).addChoices({ name: 'Saege', value: 'saege' }, { name: 'Hobel', value: 'hobel' }, { name: 'Schleifstein', value: 'schleifstein' }, { name: 'Werkstatt', value: 'werkstatt' })))
    .addSubcommand(s => s.setName('ausstellung').setDescription('Zeige deine Moebelausstellung'))
    .addSubcommand(s => s.setName('auftrag').setDescription('Nimm einen Moebelauftrag an'))
    .addSubcommand(s => s.setName('duell').setDescription('Fordere einen anderen Schreiner heraus').addUserOption(o => o.setName('gegner').setDescription('Dein Gegner').setRequired(true))),

  async execute(interaction) {
    const config = require('../config.json');
    ensureSchreinerTable();
    const uId = interaction.user.id;
    const sub = interaction.options.getSubcommand();

    if (sub === 'start') {
      const existing = db.db.prepare('SELECT userId FROM schreiner WHERE userId = ?').get(uId);
      if (existing) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x8B4513).setTitle('Schreiner').setDescription('Du bist bereits Schreiner!')] });
      }
      db.db.prepare('INSERT INTO schreiner (userId) VALUES (?)').run(uId);
      db.db.prepare('INSERT INTO schreiner_ausstellung (userId) VALUES (?)').run(uId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x8B4513).setTitle('Willkommen, Schreiner!').setDescription('Du hast deine Schreinerwerkstatt eroeffnet!\nBenutze `/schreiner kaufen` um Holz zu kaufen.\nDann `/schreiner zimmern` um Moebel herzustellen!')] });
    }

    if (sub === 'hoelzer') {
      const lines = HOELZER.map((h, i) => `${h.emoji} **${i + 1}. ${h.name}** — ${h.preis} Muenzen | Qualitaet: ${h.qualitaet}x`);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x8B4513).setTitle('🪵 Holzarten').setDescription(lines.join('\n'))] });
    }

    const sc = getSchreiner(uId);

    if (sub === 'status') {
      const upgLines = Object.entries(UPGRADES).map(([k, u]) => `${u.name}: Stufe ${sc[`upg_${k}`]}`);
      const embed = new EmbedBuilder()
        .setColor(0x8B4513)
        .setTitle(`🪑 Schreiner — ${interaction.user.username}`)
        .addFields(
          { name: 'Level', value: `${sc.level}`, inline: true },
          { name: 'XP', value: `${sc.xp}/${xpForLevel(sc.level)}`, inline: true },
          { name: 'Muenzen', value: `${sc.geld}`, inline: true },
          { name: 'Holz', value: `${sc.holz}x ${sc.holzTyp > 0 ? HOELZER[sc.holzTyp - 1].name : 'Keines'}`, inline: true },
          { name: 'Auftraege', value: `${sc.auftraege}`, inline: true },
          { name: 'Duelle', value: `${sc.duelle} (${sc.siege} Siege)`, inline: true },
          { name: 'Upgrades', value: upgLines.join('\n'), inline: false },
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'kaufen') {
      const holzIdx = interaction.options.getInteger('holz') - 1;
      const menge = interaction.options.getInteger('menge');
      if (holzIdx < 0 || holzIdx >= HOELZER.length) return interaction.reply({ content: 'Ungueltiger Holz-Typ (1-8)!', ephemeral: true });
      if (menge < 1 || menge > 100) return interaction.reply({ content: 'Menge muss zwischen 1 und 100 liegen!', ephemeral: true });
      const holz = HOELZER[holzIdx];
      const kosten = holz.preis * menge;
      if (sc.geld < kosten) return interaction.reply({ content: `Nicht genug Muenzen! Du brauchst ${kosten}, hast aber ${sc.geld}.`, ephemeral: true });
      db.db.prepare('UPDATE schreiner SET geld = geld - ?, holz = holz + ?, holzTyp = ? WHERE userId = ?').run(kosten, menge, holzIdx + 1, uId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x8B4513).setTitle('Holz gekauft').setDescription(`Du hast ${menge}x ${holz.emoji} ${holz.name} fuer ${kosten} Muenzen gekauft!`)] });
    }

    if (sub === 'zimmern') {
      const now = Date.now();
      const cd = cooldowns.get(uId) || 0;
      if (now - cd < 30000) {
        const left = Math.ceil((30000 - (now - cd)) / 1000);
        return interaction.reply({ content: `Noch ${left}s Abkuehlung!`, ephemeral: true });
      }
      const moebelIdx = interaction.options.getInteger('moebel') - 1;
      const beschlagIdx = interaction.options.getInteger('beschlag') - 1;
      if (moebelIdx < 0 || moebelIdx >= MOEBELARTEN.length) return interaction.reply({ content: 'Ungueltiger Moebel-Typ (1-8)!', ephemeral: true });
      if (beschlagIdx < 0 || beschlagIdx >= BESCHLAEGE.length) return interaction.reply({ content: 'Ungueltiger Beschlag-Typ (1-8)!', ephemeral: true });
      const moebel = MOEBELARTEN[moebelIdx];
      const beschlag = BESCHLAEGE[beschlagIdx];
      if (sc.level < moebel.minLevel) return interaction.reply({ content: `Du brauchst Level ${moebel.minLevel} fuer ${moebel.name}!`, ephemeral: true });
      if (sc.level < beschlag.minLevel) return interaction.reply({ content: `Du brauchst Level ${beschlag.minLevel} fuer ${beschlag.name}!`, ephemeral: true });
      if (sc.holz < moebel.schwierigkeit) return interaction.reply({ content: `Du brauchst ${moebel.schwierigkeit} Holz fuer dieses Moebelstuck!`, ephemeral: true });
      const holz = sc.holzTyp > 0 ? HOELZER[sc.holzTyp - 1] : HOELZER[0];
      const upgBonus = (UPGRADES.saege.bonus[sc.upg_saege] || 0) + (UPGRADES.hobel.bonus[sc.upg_hobel] || 0) + (UPGRADES.schleifstein.bonus[sc.upg_schleifstein] || 0) + (UPGRADES.werkstatt.bonus[sc.upg_werkstatt] || 0);
      const rollBase = Math.random() * 100;
      const roll = Math.min(99, rollBase + upgBonus * 20);
      const event = SCHREINER_EVENTS[Math.floor(Math.random() * SCHREINER_EVENTS.length)];
      let qual = QUALITAETEN[0];
      for (const q of QUALITAETEN) { if (roll >= q.minRoll) qual = q; }
      const wert = Math.floor(moebel.basisWert * holz.qualitaet * beschlag.bonus * qual.multi * event.qualMulti * event.geldMulti);
      const xpGain = Math.floor(moebel.schwierigkeit * 20 * holz.qualitaet);
      db.db.prepare('UPDATE schreiner SET holz = holz - ?, geld = geld + ?, xp = xp + ? WHERE userId = ?').run(moebel.schwierigkeit, wert, xpGain, uId);
      const updSc = getSchreiner(uId);
      const { lvl, ups } = checkLevelUp(uId, updSc);
      const col = `moebel${moebelIdx}`;
      db.db.prepare(`UPDATE schreiner_ausstellung SET ${col} = ${col} + 1 WHERE userId = ?`).run(uId);
      cooldowns.set(uId, now);
      const embed = new EmbedBuilder()
        .setColor(0x8B4513)
        .setTitle('🪑 Moebelstuck gefertigt!')
        .setDescription(`${event.text}`)
        .addFields(
          { name: 'Moebel', value: moebel.name, inline: true },
          { name: 'Holz', value: `${holz.emoji} ${holz.name}`, inline: true },
          { name: 'Beschlag', value: beschlag.name, inline: true },
          { name: 'Qualitaet', value: qual.name, inline: true },
          { name: 'Wert', value: `${wert} Muenzen`, inline: true },
          { name: 'XP', value: `+${xpGain}`, inline: true },
        );
      if (ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${lvl}!` });
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'training') {
      const art = interaction.options.getString('art');
      const kosten = 50 + sc.level * 20;
      if (sc.geld < kosten) return interaction.reply({ content: `Training kostet ${kosten} Muenzen!`, ephemeral: true });
      const xpGain = 30 + sc.level * 10;
      db.db.prepare('UPDATE schreiner SET geld = geld - ?, xp = xp + ? WHERE userId = ?').run(kosten, xpGain, uId);
      const updSc = getSchreiner(uId);
      const { lvl, ups } = checkLevelUp(uId, updSc);
      const embed = new EmbedBuilder().setColor(0x8B4513).setTitle('Training').setDescription(`Du hast ${art === 'saegen' ? 'Saegen' : art === 'hobeln' ? 'Hobeln' : 'Schleifen'} trainiert!\n+${xpGain} XP | -${kosten} Muenzen`);
      if (ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${lvl}!` });
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'upgrade') {
      const slot = interaction.options.getString('slot');
      const upg = UPGRADES[slot];
      const curStufe = sc[`upg_${slot}`];
      if (curStufe >= upg.stufen.length - 1) return interaction.reply({ content: 'Maximale Stufe erreicht!', ephemeral: true });
      const kosten = upg.stufen[curStufe + 1];
      if (sc.geld < kosten) return interaction.reply({ content: `Upgrade kostet ${kosten} Muenzen!`, ephemeral: true });
      db.db.prepare(`UPDATE schreiner SET geld = geld - ?, upg_${slot} = upg_${slot} + 1 WHERE userId = ?`).run(kosten, uId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x8B4513).setTitle('Upgrade').setDescription(`${upg.name} auf Stufe ${curStufe + 1} verbessert!`)] });
    }

    if (sub === 'ausstellung') {
      const ausst = getAusstellung(uId);
      const lines = MOEBELARTEN.map((m, i) => `${m.name}: ${ausst[`moebel${i}`] || 0}x`);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x8B4513).setTitle('🪑 Moebelausstellung').setDescription(lines.join('\n'))] });
    }

    if (sub === 'auftrag') {
      const now = Date.now();
      const cdKey = `auftrag_${uId}`;
      const cd = cooldowns.get(cdKey) || 0;
      if (now - cd < 60000) {
        const left = Math.ceil((60000 - (now - cd)) / 1000);
        return interaction.reply({ content: `Naechster Auftrag in ${left}s!`, ephemeral: true });
      }
      const moebelIdx = Math.min(Math.max(0, sc.level - 1), MOEBELARTEN.length - 1);
      const moebel = MOEBELARTEN[moebelIdx];
      const menge = 1 + Math.floor(Math.random() * 2);
      const ausst = getAusstellung(uId);
      const vorrat = ausst[`moebel${moebelIdx}`] || 0;
      if (vorrat < menge) return interaction.reply({ content: `Auftrag: ${menge}x ${moebel.name}. Dir fehlen noch ${menge - vorrat}!`, ephemeral: false });
      const belohnung = Math.floor(moebel.basisWert * menge * 1.3);
      const xpGain = moebel.schwierigkeit * menge * 15;
      db.db.prepare(`UPDATE schreiner_ausstellung SET moebel${moebelIdx} = moebel${moebelIdx} - ? WHERE userId = ?`).run(menge, uId);
      db.db.prepare('UPDATE schreiner SET geld = geld + ?, xp = xp + ?, auftraege = auftraege + 1 WHERE userId = ?').run(belohnung, xpGain, uId);
      const updSc = getSchreiner(uId);
      const { lvl, ups } = checkLevelUp(uId, updSc);
      cooldowns.set(cdKey, now);
      const embed = new EmbedBuilder().setColor(0x8B4513).setTitle('📋 Auftrag erfuellt!').setDescription(`${menge}x ${moebel.name} geliefert!\n+${belohnung} Muenzen | +${xpGain} XP`);
      if (ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${lvl}!` });
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'duell') {
      const gegner = interaction.options.getUser('gegner');
      if (gegner.id === uId) return interaction.reply({ content: 'Du kannst nicht gegen dich selbst kaempfen!', ephemeral: true });
      const gSc = db.db.prepare('SELECT * FROM schreiner WHERE userId = ?').get(gegner.id);
      if (!gSc) return interaction.reply({ content: 'Dein Gegner ist noch kein Schreiner!', ephemeral: true });
      const myScore = sc.level * 10 + Math.random() * 50;
      const gScore = gSc.level * 10 + Math.random() * 50;
      const gewonnen = myScore > gScore;
      const belohnung = gewonnen ? Math.floor(50 + sc.level * 15) : 0;
      const xpGain = gewonnen ? 40 + sc.level * 10 : 10;
      db.db.prepare('UPDATE schreiner SET geld = geld + ?, xp = xp + ?, duelle = duelle + 1, siege = siege + ? WHERE userId = ?').run(belohnung, xpGain, gewonnen ? 1 : 0, uId);
      const updSc = getSchreiner(uId);
      const { lvl, ups } = checkLevelUp(uId, updSc);
      const embed = new EmbedBuilder()
        .setColor(gewonnen ? 0x00FF00 : 0xFF0000)
        .setTitle(gewonnen ? '⚔️ Duell gewonnen!' : '⚔️ Duell verloren!')
        .setDescription(`${gewonnen ? `Du hast ${gegner.username} besiegt!` : `${gegner.username} hat gewonnen!`}\n${gewonnen ? `+${belohnung} Muenzen | ` : ''}+${xpGain} XP`);
      if (ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${lvl}!` });
      return interaction.reply({ embeds: [embed] });
    }
  },
};
