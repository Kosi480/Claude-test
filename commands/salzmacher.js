const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

const SOLE_QUELLEN = [
  { name: 'Felssole', preis: 18, qualitaet: 1.0, emoji: '🪨' },
  { name: 'Meeressole', preis: 35, qualitaet: 1.3, emoji: '🌊' },
  { name: 'Bergsole', preis: 60, qualitaet: 1.6, emoji: '⛰️' },
  { name: 'Tiefsolesole', preis: 100, qualitaet: 2.0, emoji: '🕳️' },
  { name: 'Kristallsole', preis: 160, qualitaet: 2.6, emoji: '💎' },
  { name: 'Mondsole', preis: 250, qualitaet: 3.3, emoji: '🌙' },
  { name: 'Elfensole', preis: 400, qualitaet: 4.2, emoji: '✨' },
  { name: 'Aethersole', preis: 650, qualitaet: 5.5, emoji: '🔮' },
];

const SALZSORTEN = [
  { name: 'Steinsalz', basisWert: 55, schwierigkeit: 1, minLevel: 1 },
  { name: 'Meersalz', basisWert: 110, schwierigkeit: 2, minLevel: 3 },
  { name: 'Kochsalz', basisWert: 175, schwierigkeit: 3, minLevel: 5 },
  { name: 'Flockensalz', basisWert: 260, schwierigkeit: 4, minLevel: 8 },
  { name: 'Rauchtinktur-Salz', basisWert: 380, schwierigkeit: 5, minLevel: 12 },
  { name: 'Kraeuter-Salz', basisWert: 560, schwierigkeit: 6, minLevel: 16 },
  { name: 'Mondsalz', basisWert: 820, schwierigkeit: 7, minLevel: 21 },
  { name: 'Legendaeres Aethersalz', basisWert: 1200, schwierigkeit: 8, minLevel: 28 },
];

const SIEDEMETHODEN = [
  { name: 'Offenes Feuer', bonus: 1.0, minLevel: 1 },
  { name: 'Geschlossener Kessel', bonus: 1.2, minLevel: 3 },
  { name: 'Sonnentrocknung', bonus: 1.5, minLevel: 5 },
  { name: 'Vakuumverdampfung', bonus: 1.8, minLevel: 8 },
  { name: 'Kristallisation', bonus: 2.3, minLevel: 12 },
  { name: 'Mondlichtreaktion', bonus: 2.9, minLevel: 16 },
  { name: 'Elfenfeuer', bonus: 3.7, minLevel: 21 },
  { name: 'Aetherschmelze', bonus: 4.8, minLevel: 28 },
];

const QUALITAETEN = [
  { name: 'Verunreinigt', multi: 0.3, minRoll: 0 },
  { name: 'Grob', multi: 0.6, minRoll: 15 },
  { name: 'Einfach', multi: 0.9, minRoll: 30 },
  { name: 'Rein', multi: 1.2, minRoll: 45 },
  { name: 'Fein', multi: 1.6, minRoll: 62 },
  { name: 'Kristallklar', multi: 2.1, minRoll: 78 },
  { name: 'Meisterhaft', multi: 3.2, minRoll: 92 },
];

const UPGRADES = {
  siedehaus: { name: 'Siedehaus', stufen: [0, 220, 600, 1500, 3800], bonus: [0, 0.1, 0.2, 0.35, 0.5] },
  salzpfanne: { name: 'Salzpfanne', stufen: [0, 400, 1000, 2500, 6000], bonus: [0, 0.08, 0.18, 0.3, 0.45] },
  filteranlage: { name: 'Filteranlage', stufen: [0, 310, 800, 2000, 4800], bonus: [0, 0.06, 0.14, 0.25, 0.4] },
  werkstatt: { name: 'Werkstatt', stufen: [0, 820, 2100, 5000, 12500], bonus: [0, 0.12, 0.25, 0.4, 0.6] },
};

const SALZ_EVENTS = [
  { text: 'Die Sole zersetzt sich!', qualMulti: 0.5, geldMulti: 0.7 },
  { text: 'Perfekte Kristallbildung!', qualMulti: 1.5, geldMulti: 1.2 },
  { text: 'Zu viel Hitze brutzelt das Salz an.', qualMulti: 0.8, geldMulti: 0.9 },
  { text: 'Wunderschoene Salzflocken entstehen!', qualMulti: 2.0, geldMulti: 1.5 },
  { text: 'Die Siedung laeuft besonders gleichmaessig.', qualMulti: 1.3, geldMulti: 1.1 },
  { text: 'Eine Verunreinigung muss herausgefiltert werden.', qualMulti: 0.7, geldMulti: 0.85 },
  { text: 'Das Salz glaenzt wie Diamanten!', qualMulti: 1.8, geldMulti: 1.4 },
];

const cooldowns = new Map();

function ensureSalzmacherTable() {
  db.db.exec(`CREATE TABLE IF NOT EXISTS salzmacher (
    userId TEXT PRIMARY KEY,
    geld INTEGER DEFAULT 0,
    sole INTEGER DEFAULT 0,
    soleTyp INTEGER DEFAULT 0,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    auftraege INTEGER DEFAULT 0,
    duelle INTEGER DEFAULT 0,
    siege INTEGER DEFAULT 0,
    upg_siedehaus INTEGER DEFAULT 0,
    upg_salzpfanne INTEGER DEFAULT 0,
    upg_filteranlage INTEGER DEFAULT 0,
    upg_werkstatt INTEGER DEFAULT 0
  )`);
  db.db.exec(`CREATE TABLE IF NOT EXISTS salzmacher_lager (
    userId TEXT PRIMARY KEY,
    salz0 INTEGER DEFAULT 0,
    salz1 INTEGER DEFAULT 0,
    salz2 INTEGER DEFAULT 0,
    salz3 INTEGER DEFAULT 0,
    salz4 INTEGER DEFAULT 0,
    salz5 INTEGER DEFAULT 0,
    salz6 INTEGER DEFAULT 0,
    salz7 INTEGER DEFAULT 0
  )`);
}

function getSalzmacher(uId) {
  let row = db.db.prepare('SELECT * FROM salzmacher WHERE userId = ?').get(uId);
  if (!row) {
    db.db.prepare('INSERT INTO salzmacher (userId) VALUES (?)').run(uId);
    row = db.db.prepare('SELECT * FROM salzmacher WHERE userId = ?').get(uId);
  }
  return row;
}

function getLager(uId) {
  let row = db.db.prepare('SELECT * FROM salzmacher_lager WHERE userId = ?').get(uId);
  if (!row) {
    db.db.prepare('INSERT INTO salzmacher_lager (userId) VALUES (?)').run(uId);
    row = db.db.prepare('SELECT * FROM salzmacher_lager WHERE userId = ?').get(uId);
  }
  return row;
}

function xpForLevel(l) { return l * l * 50; }

function checkLevelUp(uId, sa) {
  let lvl = sa.level;
  let ups = 0;
  while (sa.xp >= xpForLevel(lvl)) {
    sa.xp -= xpForLevel(lvl);
    lvl++;
    ups++;
  }
  if (ups > 0) {
    db.db.prepare('UPDATE salzmacher SET level = ?, xp = ? WHERE userId = ?').run(lvl, sa.xp, uId);
  }
  return { lvl, ups };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('salzmacher')
    .setDescription('Werde ein Salzmacher und siede kostbares Salz fuer alle Welt!')
    .addSubcommand(s => s.setName('start').setDescription('Beginne deine Salzmacher-Karriere'))
    .addSubcommand(s => s.setName('status').setDescription('Zeige deinen Salzmacher-Status'))
    .addSubcommand(s => s.setName('quellen').setDescription('Liste alle verfuegbaren Solequellen'))
    .addSubcommand(s => s.setName('kaufen').setDescription('Kaufe Sole').addIntegerOption(o => o.setName('sole').setDescription('Solen-Typ (1-8)').setRequired(true)).addIntegerOption(o => o.setName('menge').setDescription('Menge').setRequired(true)))
    .addSubcommand(s => s.setName('sieden').setDescription('Siede Salz aus der Sole').addIntegerOption(o => o.setName('salz').setDescription('Salzsorte (1-8)').setRequired(true)).addIntegerOption(o => o.setName('methode').setDescription('Siedemethode (1-8)').setRequired(true)))
    .addSubcommand(s => s.setName('training').setDescription('Verbessere deine Faehigkeiten').addStringOption(o => o.setName('art').setDescription('Trainingsart').setRequired(true).addChoices({ name: 'Sieden', value: 'sieden' }, { name: 'Filtern', value: 'filtern' }, { name: 'Kristallisieren', value: 'kristallisieren' })))
    .addSubcommand(s => s.setName('upgrade').setDescription('Verbessere dein Salzwerk').addStringOption(o => o.setName('slot').setDescription('Upgrade-Slot').setRequired(true).addChoices({ name: 'Siedehaus', value: 'siedehaus' }, { name: 'Salzpfanne', value: 'salzpfanne' }, { name: 'Filteranlage', value: 'filteranlage' }, { name: 'Werkstatt', value: 'werkstatt' })))
    .addSubcommand(s => s.setName('lager').setDescription('Zeige dein Salzlager'))
    .addSubcommand(s => s.setName('auftrag').setDescription('Nimm einen Salzauftrag an'))
    .addSubcommand(s => s.setName('duell').setDescription('Fordere einen anderen Salzmacher heraus').addUserOption(o => o.setName('gegner').setDescription('Dein Gegner').setRequired(true))),

  async execute(interaction) {
    const config = require('../config.json');
    ensureSalzmacherTable();
    const uId = interaction.user.id;
    const sub = interaction.options.getSubcommand();

    if (sub === 'start') {
      const existing = db.db.prepare('SELECT userId FROM salzmacher WHERE userId = ?').get(uId);
      if (existing) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xF0F8FF).setTitle('Salzmacher').setDescription('Du bist bereits Salzmacher!')] });
      }
      db.db.prepare('INSERT INTO salzmacher (userId) VALUES (?)').run(uId);
      db.db.prepare('INSERT INTO salzmacher_lager (userId) VALUES (?)').run(uId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xF0F8FF).setTitle('Willkommen, Salzmacher!').setDescription('Du hast dein Salzwerk eroeffnet!\nBenutze `/salzmacher kaufen` um Sole zu kaufen.\nDann `/salzmacher sieden` um Salz herzustellen!')] });
    }

    if (sub === 'quellen') {
      const lines = SOLE_QUELLEN.map((s, i) => `${s.emoji} **${i + 1}. ${s.name}** — ${s.preis} Muenzen | Qualitaet: ${s.qualitaet}x`);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xF0F8FF).setTitle('🧂 Solequellen').setDescription(lines.join('\n'))] });
    }

    const sa = getSalzmacher(uId);

    if (sub === 'status') {
      const upgLines = Object.entries(UPGRADES).map(([k, u]) => `${u.name}: Stufe ${sa[`upg_${k}`]}`);
      const embed = new EmbedBuilder()
        .setColor(0xF0F8FF)
        .setTitle(`🧂 Salzmacher — ${interaction.user.username}`)
        .addFields(
          { name: 'Level', value: `${sa.level}`, inline: true },
          { name: 'XP', value: `${sa.xp}/${xpForLevel(sa.level)}`, inline: true },
          { name: 'Muenzen', value: `${sa.geld}`, inline: true },
          { name: 'Sole', value: `${sa.sole}x ${sa.soleTyp > 0 ? SOLE_QUELLEN[sa.soleTyp - 1].name : 'Keine'}`, inline: true },
          { name: 'Auftraege', value: `${sa.auftraege}`, inline: true },
          { name: 'Duelle', value: `${sa.duelle} (${sa.siege} Siege)`, inline: true },
          { name: 'Upgrades', value: upgLines.join('\n'), inline: false },
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'kaufen') {
      const soleIdx = interaction.options.getInteger('sole') - 1;
      const menge = interaction.options.getInteger('menge');
      if (soleIdx < 0 || soleIdx >= SOLE_QUELLEN.length) return interaction.reply({ content: 'Ungueltiger Solen-Typ (1-8)!', ephemeral: true });
      if (menge < 1 || menge > 100) return interaction.reply({ content: 'Menge muss zwischen 1 und 100 liegen!', ephemeral: true });
      const sole = SOLE_QUELLEN[soleIdx];
      const kosten = sole.preis * menge;
      if (sa.geld < kosten) return interaction.reply({ content: `Nicht genug Muenzen! Du brauchst ${kosten}, hast aber ${sa.geld}.`, ephemeral: true });
      db.db.prepare('UPDATE salzmacher SET geld = geld - ?, sole = sole + ?, soleTyp = ? WHERE userId = ?').run(kosten, menge, soleIdx + 1, uId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xF0F8FF).setTitle('Sole gekauft').setDescription(`Du hast ${menge}x ${sole.emoji} ${sole.name} fuer ${kosten} Muenzen gekauft!`)] });
    }

    if (sub === 'sieden') {
      const now = Date.now();
      const cd = cooldowns.get(uId) || 0;
      if (now - cd < 30000) {
        const left = Math.ceil((30000 - (now - cd)) / 1000);
        return interaction.reply({ content: `Noch ${left}s Abkuehlung!`, ephemeral: true });
      }
      const salzIdx = interaction.options.getInteger('salz') - 1;
      const methodeIdx = interaction.options.getInteger('methode') - 1;
      if (salzIdx < 0 || salzIdx >= SALZSORTEN.length) return interaction.reply({ content: 'Ungueltige Salzsorte (1-8)!', ephemeral: true });
      if (methodeIdx < 0 || methodeIdx >= SIEDEMETHODEN.length) return interaction.reply({ content: 'Ungueltige Siedemethode (1-8)!', ephemeral: true });
      const salzsorte = SALZSORTEN[salzIdx];
      const methode = SIEDEMETHODEN[methodeIdx];
      if (sa.level < salzsorte.minLevel) return interaction.reply({ content: `Du brauchst Level ${salzsorte.minLevel} fuer ${salzsorte.name}!`, ephemeral: true });
      if (sa.level < methode.minLevel) return interaction.reply({ content: `Du brauchst Level ${methode.minLevel} fuer ${methode.name}!`, ephemeral: true });
      if (sa.sole < salzsorte.schwierigkeit) return interaction.reply({ content: `Du brauchst ${salzsorte.schwierigkeit} Sole fuer diese Salzsorte!`, ephemeral: true });
      const sole = sa.soleTyp > 0 ? SOLE_QUELLEN[sa.soleTyp - 1] : SOLE_QUELLEN[0];
      const upgBonus = (UPGRADES.siedehaus.bonus[sa.upg_siedehaus] || 0) + (UPGRADES.salzpfanne.bonus[sa.upg_salzpfanne] || 0) + (UPGRADES.filteranlage.bonus[sa.upg_filteranlage] || 0) + (UPGRADES.werkstatt.bonus[sa.upg_werkstatt] || 0);
      const rollBase = Math.random() * 100;
      const roll = Math.min(99, rollBase + upgBonus * 20);
      const event = SALZ_EVENTS[Math.floor(Math.random() * SALZ_EVENTS.length)];
      let qual = QUALITAETEN[0];
      for (const q of QUALITAETEN) { if (roll >= q.minRoll) qual = q; }
      const wert = Math.floor(salzsorte.basisWert * sole.qualitaet * methode.bonus * qual.multi * event.qualMulti * event.geldMulti);
      const xpGain = Math.floor(salzsorte.schwierigkeit * 20 * sole.qualitaet);
      db.db.prepare('UPDATE salzmacher SET sole = sole - ?, geld = geld + ?, xp = xp + ? WHERE userId = ?').run(salzsorte.schwierigkeit, wert, xpGain, uId);
      const updSa = getSalzmacher(uId);
      const { lvl, ups } = checkLevelUp(uId, updSa);
      const col = `salz${salzIdx}`;
      db.db.prepare(`UPDATE salzmacher_lager SET ${col} = ${col} + 1 WHERE userId = ?`).run(uId);
      cooldowns.set(uId, now);
      const embed = new EmbedBuilder()
        .setColor(0xF0F8FF)
        .setTitle('🧂 Salz gesiedet!')
        .setDescription(`${event.text}`)
        .addFields(
          { name: 'Salzsorte', value: salzsorte.name, inline: true },
          { name: 'Sole', value: `${sole.emoji} ${sole.name}`, inline: true },
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
      const kosten = 50 + sa.level * 20;
      if (sa.geld < kosten) return interaction.reply({ content: `Training kostet ${kosten} Muenzen!`, ephemeral: true });
      const xpGain = 30 + sa.level * 10;
      db.db.prepare('UPDATE salzmacher SET geld = geld - ?, xp = xp + ? WHERE userId = ?').run(kosten, xpGain, uId);
      const updSa = getSalzmacher(uId);
      const { lvl, ups } = checkLevelUp(uId, updSa);
      const embed = new EmbedBuilder().setColor(0xF0F8FF).setTitle('Training').setDescription(`Du hast ${art === 'sieden' ? 'Sieden' : art === 'filtern' ? 'Filtern' : 'Kristallisieren'} trainiert!\n+${xpGain} XP | -${kosten} Muenzen`);
      if (ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${lvl}!` });
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'upgrade') {
      const slot = interaction.options.getString('slot');
      const upg = UPGRADES[slot];
      const curStufe = sa[`upg_${slot}`];
      if (curStufe >= upg.stufen.length - 1) return interaction.reply({ content: 'Maximale Stufe erreicht!', ephemeral: true });
      const kosten = upg.stufen[curStufe + 1];
      if (sa.geld < kosten) return interaction.reply({ content: `Upgrade kostet ${kosten} Muenzen!`, ephemeral: true });
      db.db.prepare(`UPDATE salzmacher SET geld = geld - ?, upg_${slot} = upg_${slot} + 1 WHERE userId = ?`).run(kosten, uId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xF0F8FF).setTitle('Upgrade').setDescription(`${upg.name} auf Stufe ${curStufe + 1} verbessert!`)] });
    }

    if (sub === 'lager') {
      const lager = getLager(uId);
      const lines = SALZSORTEN.map((s, i) => `${s.name}: ${lager[`salz${i}`] || 0}x`);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xF0F8FF).setTitle('🧂 Salzlager').setDescription(lines.join('\n'))] });
    }

    if (sub === 'auftrag') {
      const now = Date.now();
      const cdKey = `auftrag_${uId}`;
      const cd = cooldowns.get(cdKey) || 0;
      if (now - cd < 60000) {
        const left = Math.ceil((60000 - (now - cd)) / 1000);
        return interaction.reply({ content: `Naechster Auftrag in ${left}s!`, ephemeral: true });
      }
      const salzIdx = Math.min(Math.max(0, sa.level - 1), SALZSORTEN.length - 1);
      const salzsorte = SALZSORTEN[salzIdx];
      const menge = 1 + Math.floor(Math.random() * 2);
      const lager = getLager(uId);
      const vorrat = lager[`salz${salzIdx}`] || 0;
      if (vorrat < menge) return interaction.reply({ content: `Auftrag: ${menge}x ${salzsorte.name}. Dir fehlen noch ${menge - vorrat}!`, ephemeral: false });
      const belohnung = Math.floor(salzsorte.basisWert * menge * 1.3);
      const xpGain = salzsorte.schwierigkeit * menge * 15;
      db.db.prepare(`UPDATE salzmacher_lager SET salz${salzIdx} = salz${salzIdx} - ? WHERE userId = ?`).run(menge, uId);
      db.db.prepare('UPDATE salzmacher SET geld = geld + ?, xp = xp + ?, auftraege = auftraege + 1 WHERE userId = ?').run(belohnung, xpGain, uId);
      const updSa = getSalzmacher(uId);
      const { lvl, ups } = checkLevelUp(uId, updSa);
      cooldowns.set(cdKey, now);
      const embed = new EmbedBuilder().setColor(0xF0F8FF).setTitle('📋 Auftrag erfuellt!').setDescription(`${menge}x ${salzsorte.name} geliefert!\n+${belohnung} Muenzen | +${xpGain} XP`);
      if (ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${lvl}!` });
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'duell') {
      const gegner = interaction.options.getUser('gegner');
      if (gegner.id === uId) return interaction.reply({ content: 'Du kannst nicht gegen dich selbst kaempfen!', ephemeral: true });
      const gSa = db.db.prepare('SELECT * FROM salzmacher WHERE userId = ?').get(gegner.id);
      if (!gSa) return interaction.reply({ content: 'Dein Gegner ist noch kein Salzmacher!', ephemeral: true });
      const myScore = sa.level * 10 + Math.random() * 50;
      const gScore = gSa.level * 10 + Math.random() * 50;
      const gewonnen = myScore > gScore;
      const belohnung = gewonnen ? Math.floor(50 + sa.level * 15) : 0;
      const xpGain = gewonnen ? 40 + sa.level * 10 : 10;
      db.db.prepare('UPDATE salzmacher SET geld = geld + ?, xp = xp + ?, duelle = duelle + 1, siege = siege + ? WHERE userId = ?').run(belohnung, xpGain, gewonnen ? 1 : 0, uId);
      const updSa = getSalzmacher(uId);
      const { lvl, ups } = checkLevelUp(uId, updSa);
      const embed = new EmbedBuilder()
        .setColor(gewonnen ? 0x00FF00 : 0xFF0000)
        .setTitle(gewonnen ? '⚔️ Duell gewonnen!' : '⚔️ Duell verloren!')
        .setDescription(`${gewonnen ? `Du hast ${gegner.username} besiegt!` : `${gegner.username} hat gewonnen!`}\n${gewonnen ? `+${belohnung} Muenzen | ` : ''}+${xpGain} XP`);
      if (ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${lvl}!` });
      return interaction.reply({ embeds: [embed] });
    }
  },
};
