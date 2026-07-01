const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

const ERZE = [
  { name: 'Kupfererz', preis: 22, qualitaet: 1.0, emoji: '🟠' },
  { name: 'Bronzeerz', preis: 45, qualitaet: 1.3, emoji: '🟤' },
  { name: 'Zinnerz', preis: 75, qualitaet: 1.6, emoji: '⬜' },
  { name: 'Eisenerz', preis: 120, qualitaet: 2.0, emoji: '⚙️' },
  { name: 'Silbererz', preis: 190, qualitaet: 2.6, emoji: '🥈' },
  { name: 'Golderz', preis: 300, qualitaet: 3.3, emoji: '🥇' },
  { name: 'Mithrilit', preis: 480, qualitaet: 4.2, emoji: '💎' },
  { name: 'Aethererz', preis: 770, qualitaet: 5.5, emoji: '🔮' },
];

const KESSEL_TYPEN = [
  { name: 'Suppentopf', basisWert: 80, schwierigkeit: 1, minLevel: 1 },
  { name: 'Braukessel', basisWert: 160, schwierigkeit: 2, minLevel: 3 },
  { name: 'Destillierkessel', basisWert: 260, schwierigkeit: 3, minLevel: 5 },
  { name: 'Dampfkessel', basisWert: 380, schwierigkeit: 4, minLevel: 8 },
  { name: 'Hochdruckkessel', basisWert: 560, schwierigkeit: 5, minLevel: 12 },
  { name: 'Alchemie-Kessel', basisWert: 820, schwierigkeit: 6, minLevel: 16 },
  { name: 'Mondkessel', basisWert: 1200, schwierigkeit: 7, minLevel: 21 },
  { name: 'Legendaerer Aetherkessel', basisWert: 1800, schwierigkeit: 8, minLevel: 28 },
];

const VERSCHLUESSE = [
  { name: 'Einfachverschluss', bonus: 1.0, minLevel: 1 },
  { name: 'Schraubverschluss', bonus: 1.2, minLevel: 3 },
  { name: 'Druckverschluss', bonus: 1.5, minLevel: 5 },
  { name: 'Doppeldichter', bonus: 1.9, minLevel: 8 },
  { name: 'Silberverschluss', bonus: 2.4, minLevel: 12 },
  { name: 'Goldverschluss', bonus: 3.0, minLevel: 16 },
  { name: 'Mithrilschloss', bonus: 3.8, minLevel: 21 },
  { name: 'Aetherdichter', bonus: 5.0, minLevel: 28 },
];

const QUALITAETEN = [
  { name: 'Undicht', multi: 0.3, minRoll: 0 },
  { name: 'Rissig', multi: 0.6, minRoll: 15 },
  { name: 'Einfach', multi: 0.9, minRoll: 30 },
  { name: 'Dicht', multi: 1.2, minRoll: 45 },
  { name: 'Solide', multi: 1.6, minRoll: 62 },
  { name: 'Robust', multi: 2.1, minRoll: 78 },
  { name: 'Meisterhaft', multi: 3.2, minRoll: 92 },
];

const UPGRADES = {
  hammer: { name: 'Kesselschmiedehammer', stufen: [0, 290, 780, 2000, 5000], bonus: [0, 0.1, 0.2, 0.35, 0.5] },
  schmelzofen: { name: 'Schmelzofen', stufen: [0, 500, 1250, 3100, 7500], bonus: [0, 0.08, 0.18, 0.3, 0.45] },
  druckpruefgeraet: { name: 'Druckpruefgeraet', stufen: [0, 390, 980, 2450, 5900], bonus: [0, 0.06, 0.14, 0.25, 0.4] },
  werkstatt: { name: 'Werkstatt', stufen: [0, 980, 2500, 6000, 14500], bonus: [0, 0.12, 0.25, 0.4, 0.6] },
};

const KESSEL_EVENTS = [
  { text: 'Der Kessel beult sich beim Schmieden!', qualMulti: 0.5, geldMulti: 0.7 },
  { text: 'Die Naehte halten bombenfest!', qualMulti: 1.5, geldMulti: 1.2 },
  { text: 'Der Verschluss klemmt und muss nachgearbeitet werden.', qualMulti: 0.8, geldMulti: 0.9 },
  { text: 'Perfekter Druckkessel!', qualMulti: 2.0, geldMulti: 1.5 },
  { text: 'Das Metall klingt beim Abklopfen wie eine Glocke.', qualMulti: 1.3, geldMulti: 1.1 },
  { text: 'Eine Schweissnaht laesst nach und muss wiederholt werden.', qualMulti: 0.7, geldMulti: 0.85 },
  { text: 'Der Kessel glaenzt im Licht der Esse!', qualMulti: 1.8, geldMulti: 1.4 },
];

const cooldowns = new Map();

function ensureKesselschmiedTable() {
  db.db.exec(`CREATE TABLE IF NOT EXISTS kesselschmied (
    userId TEXT PRIMARY KEY,
    geld INTEGER DEFAULT 0,
    erz INTEGER DEFAULT 0,
    erzTyp INTEGER DEFAULT 0,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    auftraege INTEGER DEFAULT 0,
    duelle INTEGER DEFAULT 0,
    siege INTEGER DEFAULT 0,
    upg_hammer INTEGER DEFAULT 0,
    upg_schmelzofen INTEGER DEFAULT 0,
    upg_druckpruefgeraet INTEGER DEFAULT 0,
    upg_werkstatt INTEGER DEFAULT 0
  )`);
  db.db.exec(`CREATE TABLE IF NOT EXISTS kesselschmied_lager (
    userId TEXT PRIMARY KEY,
    kessel0 INTEGER DEFAULT 0,
    kessel1 INTEGER DEFAULT 0,
    kessel2 INTEGER DEFAULT 0,
    kessel3 INTEGER DEFAULT 0,
    kessel4 INTEGER DEFAULT 0,
    kessel5 INTEGER DEFAULT 0,
    kessel6 INTEGER DEFAULT 0,
    kessel7 INTEGER DEFAULT 0
  )`);
}

function getKesselschmied(uId) {
  let row = db.db.prepare('SELECT * FROM kesselschmied WHERE userId = ?').get(uId);
  if (!row) {
    db.db.prepare('INSERT INTO kesselschmied (userId) VALUES (?)').run(uId);
    row = db.db.prepare('SELECT * FROM kesselschmied WHERE userId = ?').get(uId);
  }
  return row;
}

function getLager(uId) {
  let row = db.db.prepare('SELECT * FROM kesselschmied_lager WHERE userId = ?').get(uId);
  if (!row) {
    db.db.prepare('INSERT INTO kesselschmied_lager (userId) VALUES (?)').run(uId);
    row = db.db.prepare('SELECT * FROM kesselschmied_lager WHERE userId = ?').get(uId);
  }
  return row;
}

function xpForLevel(l) { return l * l * 52; }

function checkLevelUp(uId, ks) {
  let lvl = ks.level;
  let ups = 0;
  while (ks.xp >= xpForLevel(lvl)) {
    ks.xp -= xpForLevel(lvl);
    lvl++;
    ups++;
  }
  if (ups > 0) {
    db.db.prepare('UPDATE kesselschmied SET level = ?, xp = ? WHERE userId = ?').run(lvl, ks.xp, uId);
  }
  return { lvl, ups };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kesselschmied')
    .setDescription('Werde ein Kesselschmied und fertige maechtigen Kessel aus Erz!')
    .addSubcommand(s => s.setName('start').setDescription('Beginne deine Kesselschmied-Karriere'))
    .addSubcommand(s => s.setName('status').setDescription('Zeige deinen Kesselschmied-Status'))
    .addSubcommand(s => s.setName('erze').setDescription('Liste alle verfuegbaren Erzarten'))
    .addSubcommand(s => s.setName('kaufen').setDescription('Kaufe Erz').addIntegerOption(o => o.setName('erz').setDescription('Erz-Typ (1-8)').setRequired(true)).addIntegerOption(o => o.setName('menge').setDescription('Menge').setRequired(true)))
    .addSubcommand(s => s.setName('schmieden').setDescription('Schmiedein einen Kessel').addIntegerOption(o => o.setName('kessel').setDescription('Kessel-Typ (1-8)').setRequired(true)).addIntegerOption(o => o.setName('verschluss').setDescription('Verschluss-Typ (1-8)').setRequired(true)))
    .addSubcommand(s => s.setName('training').setDescription('Verbessere deine Faehigkeiten').addStringOption(o => o.setName('art').setDescription('Trainingsart').setRequired(true).addChoices({ name: 'Haemmern', value: 'haemmern' }, { name: 'Schweissen', value: 'schweissen' }, { name: 'Prufen', value: 'prufen' })))
    .addSubcommand(s => s.setName('upgrade').setDescription('Verbessere deine Esse').addStringOption(o => o.setName('slot').setDescription('Upgrade-Slot').setRequired(true).addChoices({ name: 'Hammer', value: 'hammer' }, { name: 'Schmelzofen', value: 'schmelzofen' }, { name: 'Druckpruefgeraet', value: 'druckpruefgeraet' }, { name: 'Werkstatt', value: 'werkstatt' })))
    .addSubcommand(s => s.setName('lager').setDescription('Zeige dein Kessellager'))
    .addSubcommand(s => s.setName('auftrag').setDescription('Nimm einen Kesselauftrag an'))
    .addSubcommand(s => s.setName('duell').setDescription('Fordere einen anderen Kesselschmied heraus').addUserOption(o => o.setName('gegner').setDescription('Dein Gegner').setRequired(true))),

  async execute(interaction) {
    const config = require('../config.json');
    ensureKesselschmiedTable();
    const uId = interaction.user.id;
    const sub = interaction.options.getSubcommand();

    if (sub === 'start') {
      const existing = db.db.prepare('SELECT userId FROM kesselschmied WHERE userId = ?').get(uId);
      if (existing) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xB87333).setTitle('Kesselschmied').setDescription('Du bist bereits Kesselschmied!')] });
      }
      db.db.prepare('INSERT INTO kesselschmied (userId) VALUES (?)').run(uId);
      db.db.prepare('INSERT INTO kesselschmied_lager (userId) VALUES (?)').run(uId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xB87333).setTitle('Willkommen, Kesselschmied!').setDescription('Du hast deine Kesselschmiede eroeffnet!\nBenutze `/kesselschmied kaufen` um Erz zu kaufen.\nDann `/kesselschmied schmieden` um Kessel herzustellen!')] });
    }

    if (sub === 'erze') {
      const lines = ERZE.map((e, i) => `${e.emoji} **${i + 1}. ${e.name}** — ${e.preis} Muenzen | Qualitaet: ${e.qualitaet}x`);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xB87333).setTitle('🪣 Erzarten').setDescription(lines.join('\n'))] });
    }

    const ks = getKesselschmied(uId);

    if (sub === 'status') {
      const upgLines = Object.entries(UPGRADES).map(([k, u]) => `${u.name}: Stufe ${ks[`upg_${k}`]}`);
      const embed = new EmbedBuilder()
        .setColor(0xB87333)
        .setTitle(`🪣 Kesselschmied — ${interaction.user.username}`)
        .addFields(
          { name: 'Level', value: `${ks.level}`, inline: true },
          { name: 'XP', value: `${ks.xp}/${xpForLevel(ks.level)}`, inline: true },
          { name: 'Muenzen', value: `${ks.geld}`, inline: true },
          { name: 'Erz', value: `${ks.erz}x ${ks.erzTyp > 0 ? ERZE[ks.erzTyp - 1].name : 'Keines'}`, inline: true },
          { name: 'Auftraege', value: `${ks.auftraege}`, inline: true },
          { name: 'Duelle', value: `${ks.duelle} (${ks.siege} Siege)`, inline: true },
          { name: 'Upgrades', value: upgLines.join('\n'), inline: false },
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'kaufen') {
      const erzIdx = interaction.options.getInteger('erz') - 1;
      const menge = interaction.options.getInteger('menge');
      if (erzIdx < 0 || erzIdx >= ERZE.length) return interaction.reply({ content: 'Ungueltiger Erz-Typ (1-8)!', ephemeral: true });
      if (menge < 1 || menge > 100) return interaction.reply({ content: 'Menge muss zwischen 1 und 100 liegen!', ephemeral: true });
      const erz = ERZE[erzIdx];
      const kosten = erz.preis * menge;
      if (ks.geld < kosten) return interaction.reply({ content: `Nicht genug Muenzen! Du brauchst ${kosten}, hast aber ${ks.geld}.`, ephemeral: true });
      db.db.prepare('UPDATE kesselschmied SET geld = geld - ?, erz = erz + ?, erzTyp = ? WHERE userId = ?').run(kosten, menge, erzIdx + 1, uId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xB87333).setTitle('Erz gekauft').setDescription(`Du hast ${menge}x ${erz.emoji} ${erz.name} fuer ${kosten} Muenzen gekauft!`)] });
    }

    if (sub === 'schmieden') {
      const now = Date.now();
      const cd = cooldowns.get(uId) || 0;
      if (now - cd < 30000) {
        const left = Math.ceil((30000 - (now - cd)) / 1000);
        return interaction.reply({ content: `Noch ${left}s Abkuehlung!`, ephemeral: true });
      }
      const kesselIdx = interaction.options.getInteger('kessel') - 1;
      const verschlussIdx = interaction.options.getInteger('verschluss') - 1;
      if (kesselIdx < 0 || kesselIdx >= KESSEL_TYPEN.length) return interaction.reply({ content: 'Ungueltiger Kessel-Typ (1-8)!', ephemeral: true });
      if (verschlussIdx < 0 || verschlussIdx >= VERSCHLUESSE.length) return interaction.reply({ content: 'Ungueltiger Verschluss-Typ (1-8)!', ephemeral: true });
      const kessel = KESSEL_TYPEN[kesselIdx];
      const verschluss = VERSCHLUESSE[verschlussIdx];
      if (ks.level < kessel.minLevel) return interaction.reply({ content: `Du brauchst Level ${kessel.minLevel} fuer ${kessel.name}!`, ephemeral: true });
      if (ks.level < verschluss.minLevel) return interaction.reply({ content: `Du brauchst Level ${verschluss.minLevel} fuer ${verschluss.name}!`, ephemeral: true });
      if (ks.erz < kessel.schwierigkeit) return interaction.reply({ content: `Du brauchst ${kessel.schwierigkeit} Erz fuer diesen Kessel!`, ephemeral: true });
      const erz = ks.erzTyp > 0 ? ERZE[ks.erzTyp - 1] : ERZE[0];
      const upgBonus = (UPGRADES.hammer.bonus[ks.upg_hammer] || 0) + (UPGRADES.schmelzofen.bonus[ks.upg_schmelzofen] || 0) + (UPGRADES.druckpruefgeraet.bonus[ks.upg_druckpruefgeraet] || 0) + (UPGRADES.werkstatt.bonus[ks.upg_werkstatt] || 0);
      const rollBase = Math.random() * 100;
      const roll = Math.min(99, rollBase + upgBonus * 20);
      const event = KESSEL_EVENTS[Math.floor(Math.random() * KESSEL_EVENTS.length)];
      let qual = QUALITAETEN[0];
      for (const q of QUALITAETEN) { if (roll >= q.minRoll) qual = q; }
      const wert = Math.floor(kessel.basisWert * erz.qualitaet * verschluss.bonus * qual.multi * event.qualMulti * event.geldMulti);
      const xpGain = Math.floor(kessel.schwierigkeit * 20 * erz.qualitaet);
      db.db.prepare('UPDATE kesselschmied SET erz = erz - ?, geld = geld + ?, xp = xp + ? WHERE userId = ?').run(kessel.schwierigkeit, wert, xpGain, uId);
      const updKs = getKesselschmied(uId);
      const { lvl, ups } = checkLevelUp(uId, updKs);
      const col = `kessel${kesselIdx}`;
      db.db.prepare(`UPDATE kesselschmied_lager SET ${col} = ${col} + 1 WHERE userId = ?`).run(uId);
      cooldowns.set(uId, now);
      const embed = new EmbedBuilder()
        .setColor(0xB87333)
        .setTitle('🪣 Kessel geschmiedet!')
        .setDescription(`${event.text}`)
        .addFields(
          { name: 'Kessel', value: kessel.name, inline: true },
          { name: 'Erz', value: `${erz.emoji} ${erz.name}`, inline: true },
          { name: 'Verschluss', value: verschluss.name, inline: true },
          { name: 'Qualitaet', value: qual.name, inline: true },
          { name: 'Wert', value: `${wert} Muenzen`, inline: true },
          { name: 'XP', value: `+${xpGain}`, inline: true },
        );
      if (ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${lvl}!` });
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'training') {
      const art = interaction.options.getString('art');
      const kosten = 50 + ks.level * 20;
      if (ks.geld < kosten) return interaction.reply({ content: `Training kostet ${kosten} Muenzen!`, ephemeral: true });
      const xpGain = 30 + ks.level * 10;
      db.db.prepare('UPDATE kesselschmied SET geld = geld - ?, xp = xp + ? WHERE userId = ?').run(kosten, xpGain, uId);
      const updKs = getKesselschmied(uId);
      const { lvl, ups } = checkLevelUp(uId, updKs);
      const embed = new EmbedBuilder().setColor(0xB87333).setTitle('Training').setDescription(`Du hast ${art === 'haemmern' ? 'Haemmern' : art === 'schweissen' ? 'Schweissen' : 'Pruefen'} trainiert!\n+${xpGain} XP | -${kosten} Muenzen`);
      if (ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${lvl}!` });
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'upgrade') {
      const slot = interaction.options.getString('slot');
      const upg = UPGRADES[slot];
      const curStufe = ks[`upg_${slot}`];
      if (curStufe >= upg.stufen.length - 1) return interaction.reply({ content: 'Maximale Stufe erreicht!', ephemeral: true });
      const kosten = upg.stufen[curStufe + 1];
      if (ks.geld < kosten) return interaction.reply({ content: `Upgrade kostet ${kosten} Muenzen!`, ephemeral: true });
      db.db.prepare(`UPDATE kesselschmied SET geld = geld - ?, upg_${slot} = upg_${slot} + 1 WHERE userId = ?`).run(kosten, uId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xB87333).setTitle('Upgrade').setDescription(`${upg.name} auf Stufe ${curStufe + 1} verbessert!`)] });
    }

    if (sub === 'lager') {
      const lager = getLager(uId);
      const lines = KESSEL_TYPEN.map((k, i) => `${k.name}: ${lager[`kessel${i}`] || 0}x`);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xB87333).setTitle('🪣 Kessellager').setDescription(lines.join('\n'))] });
    }

    if (sub === 'auftrag') {
      const now = Date.now();
      const cdKey = `auftrag_${uId}`;
      const cd = cooldowns.get(cdKey) || 0;
      if (now - cd < 60000) {
        const left = Math.ceil((60000 - (now - cd)) / 1000);
        return interaction.reply({ content: `Naechster Auftrag in ${left}s!`, ephemeral: true });
      }
      const kesselIdx = Math.min(Math.max(0, ks.level - 1), KESSEL_TYPEN.length - 1);
      const kessel = KESSEL_TYPEN[kesselIdx];
      const menge = 1 + Math.floor(Math.random() * 2);
      const lager = getLager(uId);
      const vorrat = lager[`kessel${kesselIdx}`] || 0;
      if (vorrat < menge) return interaction.reply({ content: `Auftrag: ${menge}x ${kessel.name}. Dir fehlen noch ${menge - vorrat}!`, ephemeral: false });
      const belohnung = Math.floor(kessel.basisWert * menge * 1.3);
      const xpGain = kessel.schwierigkeit * menge * 15;
      db.db.prepare(`UPDATE kesselschmied_lager SET kessel${kesselIdx} = kessel${kesselIdx} - ? WHERE userId = ?`).run(menge, uId);
      db.db.prepare('UPDATE kesselschmied SET geld = geld + ?, xp = xp + ?, auftraege = auftraege + 1 WHERE userId = ?').run(belohnung, xpGain, uId);
      const updKs = getKesselschmied(uId);
      const { lvl, ups } = checkLevelUp(uId, updKs);
      cooldowns.set(cdKey, now);
      const embed = new EmbedBuilder().setColor(0xB87333).setTitle('📋 Auftrag erfuellt!').setDescription(`${menge}x ${kessel.name} geliefert!\n+${belohnung} Muenzen | +${xpGain} XP`);
      if (ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${lvl}!` });
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'duell') {
      const gegner = interaction.options.getUser('gegner');
      if (gegner.id === uId) return interaction.reply({ content: 'Du kannst nicht gegen dich selbst kaempfen!', ephemeral: true });
      const gKs = db.db.prepare('SELECT * FROM kesselschmied WHERE userId = ?').get(gegner.id);
      if (!gKs) return interaction.reply({ content: 'Dein Gegner ist noch kein Kesselschmied!', ephemeral: true });
      const myScore = ks.level * 10 + Math.random() * 50;
      const gScore = gKs.level * 10 + Math.random() * 50;
      const gewonnen = myScore > gScore;
      const belohnung = gewonnen ? Math.floor(50 + ks.level * 15) : 0;
      const xpGain = gewonnen ? 40 + ks.level * 10 : 10;
      db.db.prepare('UPDATE kesselschmied SET geld = geld + ?, xp = xp + ?, duelle = duelle + 1, siege = siege + ? WHERE userId = ?').run(belohnung, xpGain, gewonnen ? 1 : 0, uId);
      const updKs = getKesselschmied(uId);
      const { lvl, ups } = checkLevelUp(uId, updKs);
      const embed = new EmbedBuilder()
        .setColor(gewonnen ? 0x00FF00 : 0xFF0000)
        .setTitle(gewonnen ? '⚔️ Duell gewonnen!' : '⚔️ Duell verloren!')
        .setDescription(`${gewonnen ? `Du hast ${gegner.username} besiegt!` : `${gegner.username} hat gewonnen!`}\n${gewonnen ? `+${belohnung} Muenzen | ` : ''}+${xpGain} XP`);
      if (ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${lvl}!` });
      return interaction.reply({ embeds: [embed] });
    }
  },
};
