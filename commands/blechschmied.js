const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

const METALLE = [
  { name: 'Zinn', preis: 25, qualitaet: 1.0, emoji: '⬜' },
  { name: 'Kupfer', preis: 50, qualitaet: 1.3, emoji: '🟠' },
  { name: 'Messing', preis: 85, qualitaet: 1.6, emoji: '🟡' },
  { name: 'Eisen', preis: 140, qualitaet: 2.0, emoji: '⚙️' },
  { name: 'Stahl', preis: 220, qualitaet: 2.6, emoji: '🔩' },
  { name: 'Silber', preis: 350, qualitaet: 3.3, emoji: '🥈' },
  { name: 'Mithril', preis: 560, qualitaet: 4.2, emoji: '💎' },
  { name: 'Aethermetall', preis: 900, qualitaet: 5.5, emoji: '🔮' },
];

const WAREN = [
  { name: 'Eimer', basisWert: 70, schwierigkeit: 1, minLevel: 1 },
  { name: 'Bratpfanne', basisWert: 150, schwierigkeit: 2, minLevel: 3 },
  { name: 'Laterne', basisWert: 230, schwierigkeit: 3, minLevel: 5 },
  { name: 'Wasserkanne', basisWert: 340, schwierigkeit: 4, minLevel: 8 },
  { name: 'Rustungsplatte', basisWert: 500, schwierigkeit: 5, minLevel: 12 },
  { name: 'Dampfkessel', basisWert: 730, schwierigkeit: 6, minLevel: 16 },
  { name: 'Himmelsmechanik', basisWert: 1050, schwierigkeit: 7, minLevel: 21 },
  { name: 'Legendaeres Aethergeraet', basisWert: 1550, schwierigkeit: 8, minLevel: 28 },
];

const VERFAHREN = [
  { name: 'Haemmern', bonus: 1.0, minLevel: 1 },
  { name: 'Treiben', bonus: 1.2, minLevel: 3 },
  { name: 'Loeten', bonus: 1.5, minLevel: 5 },
  { name: 'Nieten', bonus: 1.8, minLevel: 8 },
  { name: 'Schweissen', bonus: 2.3, minLevel: 12 },
  { name: 'Giessiessen', bonus: 2.9, minLevel: 16 },
  { name: 'Elfenverfahren', bonus: 3.7, minLevel: 21 },
  { name: 'Aetherformung', bonus: 4.8, minLevel: 28 },
];

const QUALITAETEN = [
  { name: 'Verbeult', multi: 0.3, minRoll: 0 },
  { name: 'Grob', multi: 0.6, minRoll: 15 },
  { name: 'Einfach', multi: 0.9, minRoll: 30 },
  { name: 'Glatt', multi: 1.2, minRoll: 45 },
  { name: 'Praezise', multi: 1.6, minRoll: 62 },
  { name: 'Exquisit', multi: 2.1, minRoll: 78 },
  { name: 'Meisterhaft', multi: 3.2, minRoll: 92 },
];

const UPGRADES = {
  hammer: { name: 'Schmiedehammer', stufen: [0, 270, 720, 1850, 4600], bonus: [0, 0.1, 0.2, 0.35, 0.5] },
  ambosse: { name: 'Ambosse', stufen: [0, 470, 1200, 3000, 7200], bonus: [0, 0.08, 0.18, 0.3, 0.45] },
  loetkolben: { name: 'Loetkolben', stufen: [0, 370, 940, 2350, 5700], bonus: [0, 0.06, 0.14, 0.25, 0.4] },
  werkstatt: { name: 'Werkstatt', stufen: [0, 940, 2400, 5700, 14000], bonus: [0, 0.12, 0.25, 0.4, 0.6] },
};

const BLECH_EVENTS = [
  { text: 'Das Blech reisst beim Formen!', qualMulti: 0.5, geldMulti: 0.7 },
  { text: 'Die Naht haelt bombenfest!', qualMulti: 1.5, geldMulti: 1.2 },
  { text: 'Der Hammer rutscht und verbeult das Stueck.', qualMulti: 0.8, geldMulti: 0.9 },
  { text: 'Meisterhafte Blecharbeit!', qualMulti: 2.0, geldMulti: 1.5 },
  { text: 'Das Metall glaenzt nach dem Polieren.', qualMulti: 1.3, geldMulti: 1.1 },
  { text: 'Eine Loetstelle haelt nicht und muss wiederholt werden.', qualMulti: 0.7, geldMulti: 0.85 },
  { text: 'Das Stueck ist ein wahres Prachtexemplar!', qualMulti: 1.8, geldMulti: 1.4 },
];

const cooldowns = new Map();

function ensureBlechschmiedTable() {
  db.db.exec(`CREATE TABLE IF NOT EXISTS blechschmied (
    userId TEXT PRIMARY KEY,
    geld INTEGER DEFAULT 0,
    metall INTEGER DEFAULT 0,
    metallTyp INTEGER DEFAULT 0,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    auftraege INTEGER DEFAULT 0,
    duelle INTEGER DEFAULT 0,
    siege INTEGER DEFAULT 0,
    upg_hammer INTEGER DEFAULT 0,
    upg_ambosse INTEGER DEFAULT 0,
    upg_loetkolben INTEGER DEFAULT 0,
    upg_werkstatt INTEGER DEFAULT 0
  )`);
  db.db.exec(`CREATE TABLE IF NOT EXISTS blechschmied_lager (
    userId TEXT PRIMARY KEY,
    ware0 INTEGER DEFAULT 0,
    ware1 INTEGER DEFAULT 0,
    ware2 INTEGER DEFAULT 0,
    ware3 INTEGER DEFAULT 0,
    ware4 INTEGER DEFAULT 0,
    ware5 INTEGER DEFAULT 0,
    ware6 INTEGER DEFAULT 0,
    ware7 INTEGER DEFAULT 0
  )`);
}

function getBlechschmied(uId) {
  let row = db.db.prepare('SELECT * FROM blechschmied WHERE userId = ?').get(uId);
  if (!row) {
    db.db.prepare('INSERT INTO blechschmied (userId) VALUES (?)').run(uId);
    row = db.db.prepare('SELECT * FROM blechschmied WHERE userId = ?').get(uId);
  }
  return row;
}

function getLager(uId) {
  let row = db.db.prepare('SELECT * FROM blechschmied_lager WHERE userId = ?').get(uId);
  if (!row) {
    db.db.prepare('INSERT INTO blechschmied_lager (userId) VALUES (?)').run(uId);
    row = db.db.prepare('SELECT * FROM blechschmied_lager WHERE userId = ?').get(uId);
  }
  return row;
}

function xpForLevel(l) { return l * l * 53; }

function checkLevelUp(uId, bl) {
  let lvl = bl.level;
  let ups = 0;
  while (bl.xp >= xpForLevel(lvl)) {
    bl.xp -= xpForLevel(lvl);
    lvl++;
    ups++;
  }
  if (ups > 0) {
    db.db.prepare('UPDATE blechschmied SET level = ?, xp = ? WHERE userId = ?').run(lvl, bl.xp, uId);
  }
  return { lvl, ups };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('blechschmied')
    .setDescription('Werde ein Blechschmied und forme Metall zu nuetzlichen Waren!')
    .addSubcommand(s => s.setName('start').setDescription('Beginne deine Blechschmied-Karriere'))
    .addSubcommand(s => s.setName('status').setDescription('Zeige deinen Blechschmied-Status'))
    .addSubcommand(s => s.setName('metalle').setDescription('Liste alle verfuegbaren Metalle'))
    .addSubcommand(s => s.setName('kaufen').setDescription('Kaufe Metall').addIntegerOption(o => o.setName('metall').setDescription('Metall-Typ (1-8)').setRequired(true)).addIntegerOption(o => o.setName('menge').setDescription('Menge').setRequired(true)))
    .addSubcommand(s => s.setName('formen').setDescription('Forme eine Metallware').addIntegerOption(o => o.setName('ware').setDescription('Waren-Typ (1-8)').setRequired(true)).addIntegerOption(o => o.setName('verfahren').setDescription('Verfahren (1-8)').setRequired(true)))
    .addSubcommand(s => s.setName('training').setDescription('Verbessere deine Faehigkeiten').addStringOption(o => o.setName('art').setDescription('Trainingsart').setRequired(true).addChoices({ name: 'Haemmern', value: 'haemmern' }, { name: 'Loeten', value: 'loeten' }, { name: 'Polieren', value: 'polieren' })))
    .addSubcommand(s => s.setName('upgrade').setDescription('Verbessere deine Werkzeuge').addStringOption(o => o.setName('slot').setDescription('Upgrade-Slot').setRequired(true).addChoices({ name: 'Hammer', value: 'hammer' }, { name: 'Ambosse', value: 'ambosse' }, { name: 'Loetkolben', value: 'loetkolben' }, { name: 'Werkstatt', value: 'werkstatt' })))
    .addSubcommand(s => s.setName('lager').setDescription('Zeige dein Warenlager'))
    .addSubcommand(s => s.setName('auftrag').setDescription('Nimm einen Auftrag an'))
    .addSubcommand(s => s.setName('duell').setDescription('Fordere einen anderen Blechschmied heraus').addUserOption(o => o.setName('gegner').setDescription('Dein Gegner').setRequired(true))),

  async execute(interaction) {
    const config = require('../config.json');
    ensureBlechschmiedTable();
    const uId = interaction.user.id;
    const sub = interaction.options.getSubcommand();

    if (sub === 'start') {
      const existing = db.db.prepare('SELECT userId FROM blechschmied WHERE userId = ?').get(uId);
      if (existing) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x708090).setTitle('Blechschmied').setDescription('Du bist bereits Blechschmied!')] });
      }
      db.db.prepare('INSERT INTO blechschmied (userId) VALUES (?)').run(uId);
      db.db.prepare('INSERT INTO blechschmied_lager (userId) VALUES (?)').run(uId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x708090).setTitle('Willkommen, Blechschmied!').setDescription('Du hast deine Blechschmiedwerkstatt eroeffnet!\nBenutze `/blechschmied kaufen` um Metall zu kaufen.\nDann `/blechschmied formen` um Metallwaren herzustellen!')] });
    }

    if (sub === 'metalle') {
      const lines = METALLE.map((m, i) => `${m.emoji} **${i + 1}. ${m.name}** — ${m.preis} Muenzen | Qualitaet: ${m.qualitaet}x`);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x708090).setTitle('🔧 Metallarten').setDescription(lines.join('\n'))] });
    }

    const bl = getBlechschmied(uId);

    if (sub === 'status') {
      const upgLines = Object.entries(UPGRADES).map(([k, u]) => `${u.name}: Stufe ${bl[`upg_${k}`]}`);
      const embed = new EmbedBuilder()
        .setColor(0x708090)
        .setTitle(`🔧 Blechschmied — ${interaction.user.username}`)
        .addFields(
          { name: 'Level', value: `${bl.level}`, inline: true },
          { name: 'XP', value: `${bl.xp}/${xpForLevel(bl.level)}`, inline: true },
          { name: 'Muenzen', value: `${bl.geld}`, inline: true },
          { name: 'Metall', value: `${bl.metall}x ${bl.metallTyp > 0 ? METALLE[bl.metallTyp - 1].name : 'Keines'}`, inline: true },
          { name: 'Auftraege', value: `${bl.auftraege}`, inline: true },
          { name: 'Duelle', value: `${bl.duelle} (${bl.siege} Siege)`, inline: true },
          { name: 'Upgrades', value: upgLines.join('\n'), inline: false },
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'kaufen') {
      const metallIdx = interaction.options.getInteger('metall') - 1;
      const menge = interaction.options.getInteger('menge');
      if (metallIdx < 0 || metallIdx >= METALLE.length) return interaction.reply({ content: 'Ungueltiger Metall-Typ (1-8)!', ephemeral: true });
      if (menge < 1 || menge > 100) return interaction.reply({ content: 'Menge muss zwischen 1 und 100 liegen!', ephemeral: true });
      const metall = METALLE[metallIdx];
      const kosten = metall.preis * menge;
      if (bl.geld < kosten) return interaction.reply({ content: `Nicht genug Muenzen! Du brauchst ${kosten}, hast aber ${bl.geld}.`, ephemeral: true });
      db.db.prepare('UPDATE blechschmied SET geld = geld - ?, metall = metall + ?, metallTyp = ? WHERE userId = ?').run(kosten, menge, metallIdx + 1, uId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x708090).setTitle('Metall gekauft').setDescription(`Du hast ${menge}x ${metall.emoji} ${metall.name} fuer ${kosten} Muenzen gekauft!`)] });
    }

    if (sub === 'formen') {
      const now = Date.now();
      const cd = cooldowns.get(uId) || 0;
      if (now - cd < 30000) {
        const left = Math.ceil((30000 - (now - cd)) / 1000);
        return interaction.reply({ content: `Noch ${left}s Abkuehlung!`, ephemeral: true });
      }
      const wareIdx = interaction.options.getInteger('ware') - 1;
      const verfahrenIdx = interaction.options.getInteger('verfahren') - 1;
      if (wareIdx < 0 || wareIdx >= WAREN.length) return interaction.reply({ content: 'Ungueltiger Waren-Typ (1-8)!', ephemeral: true });
      if (verfahrenIdx < 0 || verfahrenIdx >= VERFAHREN.length) return interaction.reply({ content: 'Ungueltiges Verfahren (1-8)!', ephemeral: true });
      const ware = WAREN[wareIdx];
      const verfahren = VERFAHREN[verfahrenIdx];
      if (bl.level < ware.minLevel) return interaction.reply({ content: `Du brauchst Level ${ware.minLevel} fuer ${ware.name}!`, ephemeral: true });
      if (bl.level < verfahren.minLevel) return interaction.reply({ content: `Du brauchst Level ${verfahren.minLevel} fuer ${verfahren.name}!`, ephemeral: true });
      if (bl.metall < ware.schwierigkeit) return interaction.reply({ content: `Du brauchst ${ware.schwierigkeit} Metall fuer diese Ware!`, ephemeral: true });
      const metall = bl.metallTyp > 0 ? METALLE[bl.metallTyp - 1] : METALLE[0];
      const upgBonus = (UPGRADES.hammer.bonus[bl.upg_hammer] || 0) + (UPGRADES.ambosse.bonus[bl.upg_ambosse] || 0) + (UPGRADES.loetkolben.bonus[bl.upg_loetkolben] || 0) + (UPGRADES.werkstatt.bonus[bl.upg_werkstatt] || 0);
      const rollBase = Math.random() * 100;
      const roll = Math.min(99, rollBase + upgBonus * 20);
      const event = BLECH_EVENTS[Math.floor(Math.random() * BLECH_EVENTS.length)];
      let qual = QUALITAETEN[0];
      for (const q of QUALITAETEN) { if (roll >= q.minRoll) qual = q; }
      const wert = Math.floor(ware.basisWert * metall.qualitaet * verfahren.bonus * qual.multi * event.qualMulti * event.geldMulti);
      const xpGain = Math.floor(ware.schwierigkeit * 20 * metall.qualitaet);
      db.db.prepare('UPDATE blechschmied SET metall = metall - ?, geld = geld + ?, xp = xp + ? WHERE userId = ?').run(ware.schwierigkeit, wert, xpGain, uId);
      const updBl = getBlechschmied(uId);
      const { lvl, ups } = checkLevelUp(uId, updBl);
      const col = `ware${wareIdx}`;
      db.db.prepare(`UPDATE blechschmied_lager SET ${col} = ${col} + 1 WHERE userId = ?`).run(uId);
      cooldowns.set(uId, now);
      const embed = new EmbedBuilder()
        .setColor(0x708090)
        .setTitle('🔧 Ware geformt!')
        .setDescription(`${event.text}`)
        .addFields(
          { name: 'Ware', value: ware.name, inline: true },
          { name: 'Metall', value: `${metall.emoji} ${metall.name}`, inline: true },
          { name: 'Verfahren', value: verfahren.name, inline: true },
          { name: 'Qualitaet', value: qual.name, inline: true },
          { name: 'Wert', value: `${wert} Muenzen`, inline: true },
          { name: 'XP', value: `+${xpGain}`, inline: true },
        );
      if (ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${lvl}!` });
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'training') {
      const art = interaction.options.getString('art');
      const kosten = 50 + bl.level * 20;
      if (bl.geld < kosten) return interaction.reply({ content: `Training kostet ${kosten} Muenzen!`, ephemeral: true });
      const xpGain = 30 + bl.level * 10;
      db.db.prepare('UPDATE blechschmied SET geld = geld - ?, xp = xp + ? WHERE userId = ?').run(kosten, xpGain, uId);
      const updBl = getBlechschmied(uId);
      const { lvl, ups } = checkLevelUp(uId, updBl);
      const embed = new EmbedBuilder().setColor(0x708090).setTitle('Training').setDescription(`Du hast ${art === 'haemmern' ? 'Haemmern' : art === 'loeten' ? 'Loeten' : 'Polieren'} trainiert!\n+${xpGain} XP | -${kosten} Muenzen`);
      if (ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${lvl}!` });
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'upgrade') {
      const slot = interaction.options.getString('slot');
      const upg = UPGRADES[slot];
      const curStufe = bl[`upg_${slot}`];
      if (curStufe >= upg.stufen.length - 1) return interaction.reply({ content: 'Maximale Stufe erreicht!', ephemeral: true });
      const kosten = upg.stufen[curStufe + 1];
      if (bl.geld < kosten) return interaction.reply({ content: `Upgrade kostet ${kosten} Muenzen!`, ephemeral: true });
      db.db.prepare(`UPDATE blechschmied SET geld = geld - ?, upg_${slot} = upg_${slot} + 1 WHERE userId = ?`).run(kosten, uId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x708090).setTitle('Upgrade').setDescription(`${upg.name} auf Stufe ${curStufe + 1} verbessert!`)] });
    }

    if (sub === 'lager') {
      const lager = getLager(uId);
      const lines = WAREN.map((w, i) => `${w.name}: ${lager[`ware${i}`] || 0}x`);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x708090).setTitle('🔧 Warenlager').setDescription(lines.join('\n'))] });
    }

    if (sub === 'auftrag') {
      const now = Date.now();
      const cdKey = `auftrag_${uId}`;
      const cd = cooldowns.get(cdKey) || 0;
      if (now - cd < 60000) {
        const left = Math.ceil((60000 - (now - cd)) / 1000);
        return interaction.reply({ content: `Naechster Auftrag in ${left}s!`, ephemeral: true });
      }
      const wareIdx = Math.min(Math.max(0, bl.level - 1), WAREN.length - 1);
      const ware = WAREN[wareIdx];
      const menge = 1 + Math.floor(Math.random() * 2);
      const lager = getLager(uId);
      const vorrat = lager[`ware${wareIdx}`] || 0;
      if (vorrat < menge) return interaction.reply({ content: `Auftrag: ${menge}x ${ware.name}. Dir fehlen noch ${menge - vorrat}!`, ephemeral: false });
      const belohnung = Math.floor(ware.basisWert * menge * 1.3);
      const xpGain = ware.schwierigkeit * menge * 15;
      db.db.prepare(`UPDATE blechschmied_lager SET ware${wareIdx} = ware${wareIdx} - ? WHERE userId = ?`).run(menge, uId);
      db.db.prepare('UPDATE blechschmied SET geld = geld + ?, xp = xp + ?, auftraege = auftraege + 1 WHERE userId = ?').run(belohnung, xpGain, uId);
      const updBl = getBlechschmied(uId);
      const { lvl, ups } = checkLevelUp(uId, updBl);
      cooldowns.set(cdKey, now);
      const embed = new EmbedBuilder().setColor(0x708090).setTitle('📋 Auftrag erfuellt!').setDescription(`${menge}x ${ware.name} geliefert!\n+${belohnung} Muenzen | +${xpGain} XP`);
      if (ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${lvl}!` });
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'duell') {
      const gegner = interaction.options.getUser('gegner');
      if (gegner.id === uId) return interaction.reply({ content: 'Du kannst nicht gegen dich selbst kaempfen!', ephemeral: true });
      const gBl = db.db.prepare('SELECT * FROM blechschmied WHERE userId = ?').get(gegner.id);
      if (!gBl) return interaction.reply({ content: 'Dein Gegner ist noch kein Blechschmied!', ephemeral: true });
      const myScore = bl.level * 10 + Math.random() * 50;
      const gScore = gBl.level * 10 + Math.random() * 50;
      const gewonnen = myScore > gScore;
      const belohnung = gewonnen ? Math.floor(50 + bl.level * 15) : 0;
      const xpGain = gewonnen ? 40 + bl.level * 10 : 10;
      db.db.prepare('UPDATE blechschmied SET geld = geld + ?, xp = xp + ?, duelle = duelle + 1, siege = siege + ? WHERE userId = ?').run(belohnung, xpGain, gewonnen ? 1 : 0, uId);
      const updBl = getBlechschmied(uId);
      const { lvl, ups } = checkLevelUp(uId, updBl);
      const embed = new EmbedBuilder()
        .setColor(gewonnen ? 0x00FF00 : 0xFF0000)
        .setTitle(gewonnen ? '⚔️ Duell gewonnen!' : '⚔️ Duell verloren!')
        .setDescription(`${gewonnen ? `Du hast ${gegner.username} besiegt!` : `${gegner.username} hat gewonnen!`}\n${gewonnen ? `+${belohnung} Muenzen | ` : ''}+${xpGain} XP`);
      if (ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${lvl}!` });
      return interaction.reply({ embeds: [embed] });
    }
  },
};
