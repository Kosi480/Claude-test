const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

const HOELZER = [
  { name: 'Fichtenholz', preis: 20, qualitaet: 1.0, emoji: '🌲' },
  { name: 'Eichenholz', preis: 45, qualitaet: 1.3, emoji: '🌳' },
  { name: 'Kastanienholz', preis: 80, qualitaet: 1.6, emoji: '🌰' },
  { name: 'Kirschholz', preis: 130, qualitaet: 2.0, emoji: '🍒' },
  { name: 'Elfenholz', preis: 200, qualitaet: 2.5, emoji: '✨' },
  { name: 'Mondholz', preis: 320, qualitaet: 3.2, emoji: '🌙' },
  { name: 'Kristallholz', preis: 500, qualitaet: 4.0, emoji: '💎' },
  { name: 'Aetherholz', preis: 800, qualitaet: 5.0, emoji: '🔮' },
];

const FAESSER = [
  { name: 'Kleines Fass', basisWert: 60, schwierigkeit: 1, minLevel: 1 },
  { name: 'Weinfass', basisWert: 120, schwierigkeit: 2, minLevel: 3 },
  { name: 'Bierfass', basisWert: 180, schwierigkeit: 3, minLevel: 5 },
  { name: 'Rumfass', basisWert: 260, schwierigkeit: 4, minLevel: 8 },
  { name: 'Whiskyfass', basisWert: 380, schwierigkeit: 5, minLevel: 12 },
  { name: 'Zaubertrank-Fass', basisWert: 560, schwierigkeit: 6, minLevel: 16 },
  { name: 'Mondwein-Fass', basisWert: 800, schwierigkeit: 7, minLevel: 21 },
  { name: 'Legendaeres Aetherfass', basisWert: 1200, schwierigkeit: 8, minLevel: 28 },
];

const REIFEN = [
  { name: 'Eisenreifen', bonus: 1.0, minLevel: 1 },
  { name: 'Stahlreifen', bonus: 1.2, minLevel: 3 },
  { name: 'Bronzereifen', bonus: 1.4, minLevel: 5 },
  { name: 'Kupferreifen', bonus: 1.6, minLevel: 8 },
  { name: 'Silberreifen', bonus: 2.0, minLevel: 12 },
  { name: 'Goldreifen', bonus: 2.5, minLevel: 16 },
  { name: 'Mithrilreifen', bonus: 3.2, minLevel: 21 },
  { name: 'Aetherstahl-Reifen', bonus: 4.0, minLevel: 28 },
];

const QUALITAETEN = [
  { name: 'Leck', multi: 0.3, minRoll: 0 },
  { name: 'Wackelig', multi: 0.6, minRoll: 15 },
  { name: 'Einfach', multi: 0.9, minRoll: 30 },
  { name: 'Dicht', multi: 1.2, minRoll: 45 },
  { name: 'Robust', multi: 1.5, minRoll: 62 },
  { name: 'Exquisit', multi: 2.0, minRoll: 78 },
  { name: 'Meisterhaft', multi: 3.0, minRoll: 92 },
];

const UPGRADES = {
  hobelmesser: { name: 'Hobelmesser', stufen: [0, 300, 800, 2000, 5000], bonus: [0, 0.1, 0.2, 0.35, 0.5] },
  fassbock: { name: 'Fassbock', stufen: [0, 500, 1200, 3000, 7000], bonus: [0, 0.08, 0.18, 0.3, 0.45] },
  reifenzange: { name: 'Reifenzange', stufen: [0, 400, 1000, 2500, 6000], bonus: [0, 0.06, 0.14, 0.25, 0.4] },
  werkstatt: { name: 'Werkstatt', stufen: [0, 1000, 2500, 6000, 15000], bonus: [0, 0.12, 0.25, 0.4, 0.6] },
};

const FASS_EVENTS = [
  { text: 'Das Holz splittet beim Biegen!', qualMulti: 0.5, geldMulti: 0.7 },
  { text: 'Die Reifen sitzen perfekt!', qualMulti: 1.5, geldMulti: 1.2 },
  { text: 'Ein Knoten im Holz stoert die Form.', qualMulti: 0.8, geldMulti: 0.9 },
  { text: 'Meisterhaftes Fuegen der Dauben!', qualMulti: 2.0, geldMulti: 1.5 },
  { text: 'Das Fass ist besonders dicht geworden.', qualMulti: 1.3, geldMulti: 1.1 },
  { text: 'Ein Reifen springt beim Aufziehen.', qualMulti: 0.6, geldMulti: 0.8 },
  { text: 'Das Holz duftet wunderbar aromatisch!', qualMulti: 1.8, geldMulti: 1.4 },
];

const cooldowns = new Map();

function ensureFassbinderTable() {
  db.db.exec(`CREATE TABLE IF NOT EXISTS fassbinder (
    userId TEXT PRIMARY KEY,
    geld INTEGER DEFAULT 0,
    holz INTEGER DEFAULT 0,
    holzTyp INTEGER DEFAULT 0,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    auftraege INTEGER DEFAULT 0,
    duelle INTEGER DEFAULT 0,
    siege INTEGER DEFAULT 0,
    upg_hobelmesser INTEGER DEFAULT 0,
    upg_fassbock INTEGER DEFAULT 0,
    upg_reifenzange INTEGER DEFAULT 0,
    upg_werkstatt INTEGER DEFAULT 0
  )`);
  db.db.exec(`CREATE TABLE IF NOT EXISTS fassbinder_lager (
    userId TEXT PRIMARY KEY,
    fass0 INTEGER DEFAULT 0,
    fass1 INTEGER DEFAULT 0,
    fass2 INTEGER DEFAULT 0,
    fass3 INTEGER DEFAULT 0,
    fass4 INTEGER DEFAULT 0,
    fass5 INTEGER DEFAULT 0,
    fass6 INTEGER DEFAULT 0,
    fass7 INTEGER DEFAULT 0
  )`);
}

function getFassbinder(uId) {
  let row = db.db.prepare('SELECT * FROM fassbinder WHERE userId = ?').get(uId);
  if (!row) {
    db.db.prepare('INSERT INTO fassbinder (userId) VALUES (?)').run(uId);
    row = db.db.prepare('SELECT * FROM fassbinder WHERE userId = ?').get(uId);
  }
  return row;
}

function getLager(uId) {
  let row = db.db.prepare('SELECT * FROM fassbinder_lager WHERE userId = ?').get(uId);
  if (!row) {
    db.db.prepare('INSERT INTO fassbinder_lager (userId) VALUES (?)').run(uId);
    row = db.db.prepare('SELECT * FROM fassbinder_lager WHERE userId = ?').get(uId);
  }
  return row;
}

function xpForLevel(l) { return l * l * 52; }

function checkLevelUp(uId, fb) {
  let lvl = fb.level;
  let ups = 0;
  while (fb.xp >= xpForLevel(lvl)) {
    fb.xp -= xpForLevel(lvl);
    lvl++;
    ups++;
  }
  if (ups > 0) {
    db.db.prepare('UPDATE fassbinder SET level = ?, xp = ? WHERE userId = ?').run(lvl, fb.xp, uId);
  }
  return { lvl, ups };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fassbinder')
    .setDescription('Werde ein Fassbinder und stelle Faesser aller Art her!')
    .addSubcommand(s => s.setName('start').setDescription('Beginne deine Fassbinder-Karriere'))
    .addSubcommand(s => s.setName('status').setDescription('Zeige deinen Fassbinder-Status'))
    .addSubcommand(s => s.setName('hoelzer').setDescription('Liste alle verfuegbaren Holzarten'))
    .addSubcommand(s => s.setName('kaufen').setDescription('Kaufe Holz').addIntegerOption(o => o.setName('holz').setDescription('Holz-Typ (1-8)').setRequired(true)).addIntegerOption(o => o.setName('menge').setDescription('Menge').setRequired(true)))
    .addSubcommand(s => s.setName('binden').setDescription('Binde ein Fass').addIntegerOption(o => o.setName('fass').setDescription('Fass-Typ (1-8)').setRequired(true)).addIntegerOption(o => o.setName('reifen').setDescription('Reifen-Typ (1-8)').setRequired(true)))
    .addSubcommand(s => s.setName('training').setDescription('Verbessere deine Faehigkeiten').addStringOption(o => o.setName('art').setDescription('Trainingsart').setRequired(true).addChoices({ name: 'Hobeln', value: 'hobeln' }, { name: 'Biegen', value: 'biegen' }, { name: 'Spannen', value: 'spannen' })))
    .addSubcommand(s => s.setName('upgrade').setDescription('Verbessere deine Werkzeuge').addStringOption(o => o.setName('slot').setDescription('Upgrade-Slot').setRequired(true).addChoices({ name: 'Hobelmesser', value: 'hobelmesser' }, { name: 'Fassbock', value: 'fassbock' }, { name: 'Reifenzange', value: 'reifenzange' }, { name: 'Werkstatt', value: 'werkstatt' })))
    .addSubcommand(s => s.setName('lager').setDescription('Zeige dein Fasslager'))
    .addSubcommand(s => s.setName('auftrag').setDescription('Nimm einen Auftrag an'))
    .addSubcommand(s => s.setName('duell').setDescription('Fordere einen anderen Fassbinder heraus').addUserOption(o => o.setName('gegner').setDescription('Dein Gegner').setRequired(true))),

  async execute(interaction) {
    const config = require('../config.json');
    ensureFassbinderTable();
    const uId = interaction.user.id;
    const sub = interaction.options.getSubcommand();

    if (sub === 'start') {
      const existing = db.db.prepare('SELECT userId FROM fassbinder WHERE userId = ?').get(uId);
      if (existing) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x8B4513).setTitle('Fassbinder').setDescription('Du bist bereits Fassbinder!')] });
      }
      db.db.prepare('INSERT INTO fassbinder (userId) VALUES (?)').run(uId);
      db.db.prepare('INSERT INTO fassbinder_lager (userId) VALUES (?)').run(uId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x8B4513).setTitle('Willkommen, Fassbinder!').setDescription('Du hast deine Fassbinder-Werkstatt eroeffnet!\nBenutze `/fassbinder kaufen` um Holz zu kaufen.\nDann `/fassbinder binden` um Faesser herzustellen!')] });
    }

    if (sub === 'hoelzer') {
      const lines = HOELZER.map((h, i) => `${h.emoji} **${i + 1}. ${h.name}** — ${h.preis} Muenzen | Qualitaet: ${h.qualitaet}x`);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x8B4513).setTitle('🪵 Holzarten').setDescription(lines.join('\n'))] });
    }

    const fb = getFassbinder(uId);

    if (sub === 'status') {
      const upgLines = Object.entries(UPGRADES).map(([k, u]) => `${u.name}: Stufe ${fb[`upg_${k}`]}`);
      const embed = new EmbedBuilder()
        .setColor(0x8B4513)
        .setTitle(`🪣 Fassbinder — ${interaction.user.username}`)
        .addFields(
          { name: 'Level', value: `${fb.level}`, inline: true },
          { name: 'XP', value: `${fb.xp}/${xpForLevel(fb.level)}`, inline: true },
          { name: 'Muenzen', value: `${fb.geld}`, inline: true },
          { name: 'Holz', value: `${fb.holz}x ${fb.holzTyp > 0 ? HOELZER[fb.holzTyp - 1].name : 'Keines'}`, inline: true },
          { name: 'Auftraege', value: `${fb.auftraege}`, inline: true },
          { name: 'Duelle', value: `${fb.duelle} (${fb.siege} Siege)`, inline: true },
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
      if (fb.geld < kosten) return interaction.reply({ content: `Nicht genug Muenzen! Du brauchst ${kosten}, hast aber ${fb.geld}.`, ephemeral: true });
      db.db.prepare('UPDATE fassbinder SET geld = geld - ?, holz = holz + ?, holzTyp = ? WHERE userId = ?').run(kosten, menge, holzIdx + 1, uId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x8B4513).setTitle('Holz gekauft').setDescription(`Du hast ${menge}x ${holz.emoji} ${holz.name} fuer ${kosten} Muenzen gekauft!`)] });
    }

    if (sub === 'binden') {
      const now = Date.now();
      const cd = cooldowns.get(uId) || 0;
      if (now - cd < 30000) {
        const left = Math.ceil((30000 - (now - cd)) / 1000);
        return interaction.reply({ content: `Noch ${left}s Abkuehlung!`, ephemeral: true });
      }
      const fassIdx = interaction.options.getInteger('fass') - 1;
      const reifenIdx = interaction.options.getInteger('reifen') - 1;
      if (fassIdx < 0 || fassIdx >= FAESSER.length) return interaction.reply({ content: 'Ungueltiger Fass-Typ (1-8)!', ephemeral: true });
      if (reifenIdx < 0 || reifenIdx >= REIFEN.length) return interaction.reply({ content: 'Ungueltiger Reifen-Typ (1-8)!', ephemeral: true });
      const fass = FAESSER[fassIdx];
      const reifen = REIFEN[reifenIdx];
      if (fb.level < fass.minLevel) return interaction.reply({ content: `Du brauchst Level ${fass.minLevel} fuer ${fass.name}!`, ephemeral: true });
      if (fb.level < reifen.minLevel) return interaction.reply({ content: `Du brauchst Level ${reifen.minLevel} fuer ${reifen.name}!`, ephemeral: true });
      if (fb.holz < fass.schwierigkeit) return interaction.reply({ content: `Du brauchst ${fass.schwierigkeit} Holz fuer dieses Fass!`, ephemeral: true });
      const holz = fb.holzTyp > 0 ? HOELZER[fb.holzTyp - 1] : HOELZER[0];
      const upgBonus = (UPGRADES.hobelmesser.bonus[fb.upg_hobelmesser] || 0) + (UPGRADES.fassbock.bonus[fb.upg_fassbock] || 0) + (UPGRADES.reifenzange.bonus[fb.upg_reifenzange] || 0) + (UPGRADES.werkstatt.bonus[fb.upg_werkstatt] || 0);
      const rollBase = Math.random() * 100;
      const roll = Math.min(99, rollBase + upgBonus * 20);
      const event = FASS_EVENTS[Math.floor(Math.random() * FASS_EVENTS.length)];
      let qual = QUALITAETEN[0];
      for (const q of QUALITAETEN) { if (roll >= q.minRoll) qual = q; }
      const wert = Math.floor(fass.basisWert * holz.qualitaet * reifen.bonus * qual.multi * event.qualMulti * event.geldMulti);
      const xpGain = Math.floor(fass.schwierigkeit * 20 * holz.qualitaet);
      db.db.prepare('UPDATE fassbinder SET holz = holz - ?, geld = geld + ?, xp = xp + ? WHERE userId = ?').run(fass.schwierigkeit, wert, xpGain, uId);
      const updFb = getFassbinder(uId);
      const { lvl, ups } = checkLevelUp(uId, updFb);
      const lager = getLager(uId);
      const col = `fass${fassIdx}`;
      db.db.prepare(`UPDATE fassbinder_lager SET ${col} = ${col} + 1 WHERE userId = ?`).run(uId);
      cooldowns.set(uId, now);
      const embed = new EmbedBuilder()
        .setColor(0x8B4513)
        .setTitle('🪣 Fass gebunden!')
        .setDescription(`${event.text}`)
        .addFields(
          { name: 'Fass', value: fass.name, inline: true },
          { name: 'Material', value: `${holz.emoji} ${holz.name}`, inline: true },
          { name: 'Reifen', value: reifen.name, inline: true },
          { name: 'Qualitaet', value: qual.name, inline: true },
          { name: 'Wert', value: `${wert} Muenzen`, inline: true },
          { name: 'XP', value: `+${xpGain}`, inline: true },
        );
      if (ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${lvl}!` });
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'training') {
      const art = interaction.options.getString('art');
      const kosten = 50 + fb.level * 20;
      if (fb.geld < kosten) return interaction.reply({ content: `Training kostet ${kosten} Muenzen!`, ephemeral: true });
      const xpGain = 30 + fb.level * 10;
      db.db.prepare('UPDATE fassbinder SET geld = geld - ?, xp = xp + ? WHERE userId = ?').run(kosten, xpGain, uId);
      const updFb = getFassbinder(uId);
      const { lvl, ups } = checkLevelUp(uId, updFb);
      const embed = new EmbedBuilder().setColor(0x8B4513).setTitle('Training').setDescription(`Du hast ${art === 'hobeln' ? 'Hobeln' : art === 'biegen' ? 'Biegen' : 'Spannen'} trainiert!\n+${xpGain} XP | -${kosten} Muenzen`);
      if (ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${lvl}!` });
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'upgrade') {
      const slot = interaction.options.getString('slot');
      const upg = UPGRADES[slot];
      const curStufe = fb[`upg_${slot}`];
      if (curStufe >= upg.stufen.length - 1) return interaction.reply({ content: 'Maximale Stufe erreicht!', ephemeral: true });
      const kosten = upg.stufen[curStufe + 1];
      if (fb.geld < kosten) return interaction.reply({ content: `Upgrade kostet ${kosten} Muenzen!`, ephemeral: true });
      db.db.prepare(`UPDATE fassbinder SET geld = geld - ?, upg_${slot} = upg_${slot} + 1 WHERE userId = ?`).run(kosten, uId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x8B4513).setTitle('Upgrade').setDescription(`${upg.name} auf Stufe ${curStufe + 1} verbessert!`)] });
    }

    if (sub === 'lager') {
      const lager = getLager(uId);
      const lines = FAESSER.map((f, i) => `${f.name}: ${lager[`fass${i}`] || 0}x`);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x8B4513).setTitle('🪣 Fasslager').setDescription(lines.join('\n'))] });
    }

    if (sub === 'auftrag') {
      const now = Date.now();
      const cdKey = `auftrag_${uId}`;
      const cd = cooldowns.get(cdKey) || 0;
      if (now - cd < 60000) {
        const left = Math.ceil((60000 - (now - cd)) / 1000);
        return interaction.reply({ content: `Naechster Auftrag in ${left}s!`, ephemeral: true });
      }
      const fassIdx = Math.min(Math.floor(Math.random() * FAESSER.length), fb.level - 1 < FAESSER.length ? Math.max(0, fb.level - 1) : FAESSER.length - 1);
      const fass = FAESSER[fassIdx];
      const menge = 1 + Math.floor(Math.random() * 2);
      const lager = getLager(uId);
      const vorrat = lager[`fass${fassIdx}`] || 0;
      if (vorrat < menge) return interaction.reply({ content: `Auftrag: ${menge}x ${fass.name}. Dir fehlen noch ${menge - vorrat}!`, ephemeral: false });
      const belohnung = Math.floor(fass.basisWert * menge * 1.3);
      const xpGain = fass.schwierigkeit * menge * 15;
      db.db.prepare(`UPDATE fassbinder_lager SET fass${fassIdx} = fass${fassIdx} - ? WHERE userId = ?`).run(menge, uId);
      db.db.prepare('UPDATE fassbinder SET geld = geld + ?, xp = xp + ?, auftraege = auftraege + 1 WHERE userId = ?').run(belohnung, xpGain, uId);
      const updFb = getFassbinder(uId);
      const { lvl, ups } = checkLevelUp(uId, updFb);
      cooldowns.set(cdKey, now);
      const embed = new EmbedBuilder().setColor(0x8B4513).setTitle('📋 Auftrag erfuellt!').setDescription(`${menge}x ${fass.name} geliefert!\n+${belohnung} Muenzen | +${xpGain} XP`);
      if (ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${lvl}!` });
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'duell') {
      const gegner = interaction.options.getUser('gegner');
      if (gegner.id === uId) return interaction.reply({ content: 'Du kannst nicht gegen dich selbst kaempfen!', ephemeral: true });
      const gFb = db.db.prepare('SELECT * FROM fassbinder WHERE userId = ?').get(gegner.id);
      if (!gFb) return interaction.reply({ content: 'Dein Gegner ist noch kein Fassbinder!', ephemeral: true });
      const myScore = fb.level * 10 + Math.random() * 50;
      const gScore = gFb.level * 10 + Math.random() * 50;
      const gewonnen = myScore > gScore;
      const belohnung = gewonnen ? Math.floor(50 + fb.level * 15) : 0;
      const xpGain = gewonnen ? 40 + fb.level * 10 : 10;
      db.db.prepare('UPDATE fassbinder SET geld = geld + ?, xp = xp + ?, duelle = duelle + 1, siege = siege + ? WHERE userId = ?').run(belohnung, xpGain, gewonnen ? 1 : 0, uId);
      const updFb = getFassbinder(uId);
      const { lvl, ups } = checkLevelUp(uId, updFb);
      const embed = new EmbedBuilder()
        .setColor(gewonnen ? 0x00FF00 : 0xFF0000)
        .setTitle(gewonnen ? '⚔️ Duell gewonnen!' : '⚔️ Duell verloren!')
        .setDescription(`${gewonnen ? `Du hast ${gegner.username} besiegt!` : `${gegner.username} hat gewonnen!`}\n${gewonnen ? `+${belohnung} Muenzen | ` : ''}+${xpGain} XP`);
      if (ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${lvl}!` });
      return interaction.reply({ embeds: [embed] });
    }
  },
};
