const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

const METALLE = [
  { name: 'Eisen', preis: 30, qualitaet: 1.0, emoji: '⚙️' },
  { name: 'Stahl', preis: 60, qualitaet: 1.3, emoji: '🔩' },
  { name: 'Bronze', preis: 100, qualitaet: 1.7, emoji: '🟤' },
  { name: 'Silber', preis: 160, qualitaet: 2.1, emoji: '🥈' },
  { name: 'Gold', preis: 250, qualitaet: 2.7, emoji: '🥇' },
  { name: 'Mithril', preis: 400, qualitaet: 3.5, emoji: '💎' },
  { name: 'Drachenstahl', preis: 630, qualitaet: 4.5, emoji: '🐉' },
  { name: 'Aethermetall', preis: 1000, qualitaet: 6.0, emoji: '🔮' },
];

const WAFFENARTEN = [
  { name: 'Dolch', basisWert: 110, schwierigkeit: 1, minLevel: 1 },
  { name: 'Kurzschwert', basisWert: 210, schwierigkeit: 2, minLevel: 3 },
  { name: 'Langschwert', basisWert: 330, schwierigkeit: 3, minLevel: 5 },
  { name: 'Streitaxt', basisWert: 480, schwierigkeit: 4, minLevel: 8 },
  { name: 'Kriegshammer', basisWert: 700, schwierigkeit: 5, minLevel: 12 },
  { name: 'Zweihaender', basisWert: 1000, schwierigkeit: 6, minLevel: 16 },
  { name: 'Elfenklinge', basisWert: 1450, schwierigkeit: 7, minLevel: 21 },
  { name: 'Legendaere Aetherklinge', basisWert: 2100, schwierigkeit: 8, minLevel: 28 },
];

const GRIFFE = [
  { name: 'Holzgriff', bonus: 1.0, minLevel: 1 },
  { name: 'Ledergriff', bonus: 1.2, minLevel: 3 },
  { name: 'Bronzegriff', bonus: 1.5, minLevel: 5 },
  { name: 'Stahlgriff', bonus: 1.9, minLevel: 8 },
  { name: 'Silbergriff', bonus: 2.4, minLevel: 12 },
  { name: 'Goldgriff', bonus: 3.0, minLevel: 16 },
  { name: 'Mithrilgriff', bonus: 3.8, minLevel: 21 },
  { name: 'Aethergriff', bonus: 5.0, minLevel: 28 },
];

const QUALITAETEN = [
  { name: 'Stumpf', multi: 0.3, minRoll: 0 },
  { name: 'Grob', multi: 0.6, minRoll: 15 },
  { name: 'Einfach', multi: 0.9, minRoll: 30 },
  { name: 'Scharf', multi: 1.2, minRoll: 45 },
  { name: 'Rasiermesserscharf', multi: 1.6, minRoll: 62 },
  { name: 'Legendaer', multi: 2.1, minRoll: 78 },
  { name: 'Meisterhaft', multi: 3.2, minRoll: 92 },
];

const UPGRADES = {
  esse: { name: 'Schmiedeesse', stufen: [0, 350, 900, 2300, 5800], bonus: [0, 0.1, 0.2, 0.35, 0.5] },
  ambosse: { name: 'Waffenamboss', stufen: [0, 550, 1400, 3500, 8500], bonus: [0, 0.08, 0.18, 0.3, 0.45] },
  schleifstein: { name: 'Schleifstein', stufen: [0, 430, 1100, 2750, 6600], bonus: [0, 0.06, 0.14, 0.25, 0.4] },
  werkstatt: { name: 'Waffenwerkstatt', stufen: [0, 1100, 2800, 6700, 16000], bonus: [0, 0.12, 0.25, 0.4, 0.6] },
};

const WAFFEN_EVENTS = [
  { text: 'Das Metall splittert beim Haemmern!', qualMulti: 0.5, geldMulti: 0.7 },
  { text: 'Die Klinge ist rasiermesserscharf!', qualMulti: 1.5, geldMulti: 1.2 },
  { text: 'Das Metall kuehlt zu schnell ab.', qualMulti: 0.8, geldMulti: 0.9 },
  { text: 'Meisterwerk der Waffenschmiedekunst!', qualMulti: 2.0, geldMulti: 1.5 },
  { text: 'Die Klinge glaenzt in der Glut der Esse.', qualMulti: 1.3, geldMulti: 1.1 },
  { text: 'Eine Verunreinigung schwaechen das Metall.', qualMulti: 0.7, geldMulti: 0.85 },
  { text: 'Die Waffe singt beim Schwingen!', qualMulti: 1.8, geldMulti: 1.4 },
];

const cooldowns = new Map();

function ensureWaffenschmiedTable() {
  db.db.exec(`CREATE TABLE IF NOT EXISTS waffenschmied (
    userId TEXT PRIMARY KEY,
    geld INTEGER DEFAULT 0,
    metall INTEGER DEFAULT 0,
    metallTyp INTEGER DEFAULT 0,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    auftraege INTEGER DEFAULT 0,
    duelle INTEGER DEFAULT 0,
    siege INTEGER DEFAULT 0,
    upg_esse INTEGER DEFAULT 0,
    upg_ambosse INTEGER DEFAULT 0,
    upg_schleifstein INTEGER DEFAULT 0,
    upg_werkstatt INTEGER DEFAULT 0
  )`);
  db.db.exec(`CREATE TABLE IF NOT EXISTS waffenschmied_arsenal (
    userId TEXT PRIMARY KEY,
    waffe0 INTEGER DEFAULT 0,
    waffe1 INTEGER DEFAULT 0,
    waffe2 INTEGER DEFAULT 0,
    waffe3 INTEGER DEFAULT 0,
    waffe4 INTEGER DEFAULT 0,
    waffe5 INTEGER DEFAULT 0,
    waffe6 INTEGER DEFAULT 0,
    waffe7 INTEGER DEFAULT 0
  )`);
}

function getWaffenschmied(uId) {
  let row = db.db.prepare('SELECT * FROM waffenschmied WHERE userId = ?').get(uId);
  if (!row) {
    db.db.prepare('INSERT INTO waffenschmied (userId) VALUES (?)').run(uId);
    row = db.db.prepare('SELECT * FROM waffenschmied WHERE userId = ?').get(uId);
  }
  return row;
}

function getArsenal(uId) {
  let row = db.db.prepare('SELECT * FROM waffenschmied_arsenal WHERE userId = ?').get(uId);
  if (!row) {
    db.db.prepare('INSERT INTO waffenschmied_arsenal (userId) VALUES (?)').run(uId);
    row = db.db.prepare('SELECT * FROM waffenschmied_arsenal WHERE userId = ?').get(uId);
  }
  return row;
}

function xpForLevel(l) { return l * l * 53; }

function checkLevelUp(uId, ws) {
  let lvl = ws.level;
  let ups = 0;
  while (ws.xp >= xpForLevel(lvl)) {
    ws.xp -= xpForLevel(lvl);
    lvl++;
    ups++;
  }
  if (ups > 0) {
    db.db.prepare('UPDATE waffenschmied SET level = ?, xp = ? WHERE userId = ?').run(lvl, ws.xp, uId);
  }
  return { lvl, ups };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('waffenschmied')
    .setDescription('Werde ein Waffenschmied und fertige legendaere Klingen fuer Helden!')
    .addSubcommand(s => s.setName('start').setDescription('Beginne deine Waffenschmied-Karriere'))
    .addSubcommand(s => s.setName('status').setDescription('Zeige deinen Waffenschmied-Status'))
    .addSubcommand(s => s.setName('metalle').setDescription('Liste alle verfuegbaren Metalle'))
    .addSubcommand(s => s.setName('kaufen').setDescription('Kaufe Metall').addIntegerOption(o => o.setName('metall').setDescription('Metall-Typ (1-8)').setRequired(true)).addIntegerOption(o => o.setName('menge').setDescription('Menge').setRequired(true)))
    .addSubcommand(s => s.setName('schmieden').setDescription('Schmiedee eine Waffe').addIntegerOption(o => o.setName('waffe').setDescription('Waffen-Typ (1-8)').setRequired(true)).addIntegerOption(o => o.setName('griff').setDescription('Griff-Typ (1-8)').setRequired(true)))
    .addSubcommand(s => s.setName('training').setDescription('Verbessere deine Faehigkeiten').addStringOption(o => o.setName('art').setDescription('Trainingsart').setRequired(true).addChoices({ name: 'Haemmern', value: 'haemmern' }, { name: 'Schleifen', value: 'schleifen' }, { name: 'Haerten', value: 'haerten' })))
    .addSubcommand(s => s.setName('upgrade').setDescription('Verbessere deine Schmiede').addStringOption(o => o.setName('slot').setDescription('Upgrade-Slot').setRequired(true).addChoices({ name: 'Esse', value: 'esse' }, { name: 'Amboss', value: 'ambosse' }, { name: 'Schleifstein', value: 'schleifstein' }, { name: 'Waffenwerkstatt', value: 'werkstatt' })))
    .addSubcommand(s => s.setName('arsenal').setDescription('Zeige dein Waffenarsenal'))
    .addSubcommand(s => s.setName('auftrag').setDescription('Nimm einen Waffenauftrag an'))
    .addSubcommand(s => s.setName('duell').setDescription('Fordere einen anderen Waffenschmied heraus').addUserOption(o => o.setName('gegner').setDescription('Dein Gegner').setRequired(true))),

  async execute(interaction) {
    const config = require('../config.json');
    ensureWaffenschmiedTable();
    const uId = interaction.user.id;
    const sub = interaction.options.getSubcommand();

    if (sub === 'start') {
      const existing = db.db.prepare('SELECT userId FROM waffenschmied WHERE userId = ?').get(uId);
      if (existing) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x8B0000).setTitle('Waffenschmied').setDescription('Du bist bereits Waffenschmied!')] });
      }
      db.db.prepare('INSERT INTO waffenschmied (userId) VALUES (?)').run(uId);
      db.db.prepare('INSERT INTO waffenschmied_arsenal (userId) VALUES (?)').run(uId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x8B0000).setTitle('Willkommen, Waffenschmied!').setDescription('Du hast deine Waffenschmiede eroeffnet!\nBenutze `/waffenschmied kaufen` um Metall zu kaufen.\nDann `/waffenschmied schmieden` um Waffen herzustellen!')] });
    }

    if (sub === 'metalle') {
      const lines = METALLE.map((m, i) => `${m.emoji} **${i + 1}. ${m.name}** — ${m.preis} Muenzen | Qualitaet: ${m.qualitaet}x`);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x8B0000).setTitle('⚔️ Metallarten').setDescription(lines.join('\n'))] });
    }

    const ws = getWaffenschmied(uId);

    if (sub === 'status') {
      const upgLines = Object.entries(UPGRADES).map(([k, u]) => `${u.name}: Stufe ${ws[`upg_${k}`]}`);
      const embed = new EmbedBuilder()
        .setColor(0x8B0000)
        .setTitle(`⚔️ Waffenschmied — ${interaction.user.username}`)
        .addFields(
          { name: 'Level', value: `${ws.level}`, inline: true },
          { name: 'XP', value: `${ws.xp}/${xpForLevel(ws.level)}`, inline: true },
          { name: 'Muenzen', value: `${ws.geld}`, inline: true },
          { name: 'Metall', value: `${ws.metall}x ${ws.metallTyp > 0 ? METALLE[ws.metallTyp - 1].name : 'Keines'}`, inline: true },
          { name: 'Auftraege', value: `${ws.auftraege}`, inline: true },
          { name: 'Duelle', value: `${ws.duelle} (${ws.siege} Siege)`, inline: true },
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
      if (ws.geld < kosten) return interaction.reply({ content: `Nicht genug Muenzen! Du brauchst ${kosten}, hast aber ${ws.geld}.`, ephemeral: true });
      db.db.prepare('UPDATE waffenschmied SET geld = geld - ?, metall = metall + ?, metallTyp = ? WHERE userId = ?').run(kosten, menge, metallIdx + 1, uId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x8B0000).setTitle('Metall gekauft').setDescription(`Du hast ${menge}x ${metall.emoji} ${metall.name} fuer ${kosten} Muenzen gekauft!`)] });
    }

    if (sub === 'schmieden') {
      const now = Date.now();
      const cd = cooldowns.get(uId) || 0;
      if (now - cd < 30000) {
        const left = Math.ceil((30000 - (now - cd)) / 1000);
        return interaction.reply({ content: `Noch ${left}s Abkuehlung!`, ephemeral: true });
      }
      const waffeIdx = interaction.options.getInteger('waffe') - 1;
      const griffIdx = interaction.options.getInteger('griff') - 1;
      if (waffeIdx < 0 || waffeIdx >= WAFFENARTEN.length) return interaction.reply({ content: 'Ungueltiger Waffen-Typ (1-8)!', ephemeral: true });
      if (griffIdx < 0 || griffIdx >= GRIFFE.length) return interaction.reply({ content: 'Ungueltiger Griff-Typ (1-8)!', ephemeral: true });
      const waffe = WAFFENARTEN[waffeIdx];
      const griff = GRIFFE[griffIdx];
      if (ws.level < waffe.minLevel) return interaction.reply({ content: `Du brauchst Level ${waffe.minLevel} fuer ${waffe.name}!`, ephemeral: true });
      if (ws.level < griff.minLevel) return interaction.reply({ content: `Du brauchst Level ${griff.minLevel} fuer ${griff.name}!`, ephemeral: true });
      if (ws.metall < waffe.schwierigkeit) return interaction.reply({ content: `Du brauchst ${waffe.schwierigkeit} Metall fuer diese Waffe!`, ephemeral: true });
      const metall = ws.metallTyp > 0 ? METALLE[ws.metallTyp - 1] : METALLE[0];
      const upgBonus = (UPGRADES.esse.bonus[ws.upg_esse] || 0) + (UPGRADES.ambosse.bonus[ws.upg_ambosse] || 0) + (UPGRADES.schleifstein.bonus[ws.upg_schleifstein] || 0) + (UPGRADES.werkstatt.bonus[ws.upg_werkstatt] || 0);
      const rollBase = Math.random() * 100;
      const roll = Math.min(99, rollBase + upgBonus * 20);
      const event = WAFFEN_EVENTS[Math.floor(Math.random() * WAFFEN_EVENTS.length)];
      let qual = QUALITAETEN[0];
      for (const q of QUALITAETEN) { if (roll >= q.minRoll) qual = q; }
      const wert = Math.floor(waffe.basisWert * metall.qualitaet * griff.bonus * qual.multi * event.qualMulti * event.geldMulti);
      const xpGain = Math.floor(waffe.schwierigkeit * 20 * metall.qualitaet);
      db.db.prepare('UPDATE waffenschmied SET metall = metall - ?, geld = geld + ?, xp = xp + ? WHERE userId = ?').run(waffe.schwierigkeit, wert, xpGain, uId);
      const updWs = getWaffenschmied(uId);
      const { lvl, ups } = checkLevelUp(uId, updWs);
      const col = `waffe${waffeIdx}`;
      db.db.prepare(`UPDATE waffenschmied_arsenal SET ${col} = ${col} + 1 WHERE userId = ?`).run(uId);
      cooldowns.set(uId, now);
      const embed = new EmbedBuilder()
        .setColor(0x8B0000)
        .setTitle('⚔️ Waffe geschmiedet!')
        .setDescription(`${event.text}`)
        .addFields(
          { name: 'Waffe', value: waffe.name, inline: true },
          { name: 'Metall', value: `${metall.emoji} ${metall.name}`, inline: true },
          { name: 'Griff', value: griff.name, inline: true },
          { name: 'Qualitaet', value: qual.name, inline: true },
          { name: 'Wert', value: `${wert} Muenzen`, inline: true },
          { name: 'XP', value: `+${xpGain}`, inline: true },
        );
      if (ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${lvl}!` });
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'training') {
      const art = interaction.options.getString('art');
      const kosten = 50 + ws.level * 20;
      if (ws.geld < kosten) return interaction.reply({ content: `Training kostet ${kosten} Muenzen!`, ephemeral: true });
      const xpGain = 30 + ws.level * 10;
      db.db.prepare('UPDATE waffenschmied SET geld = geld - ?, xp = xp + ? WHERE userId = ?').run(kosten, xpGain, uId);
      const updWs = getWaffenschmied(uId);
      const { lvl, ups } = checkLevelUp(uId, updWs);
      const embed = new EmbedBuilder().setColor(0x8B0000).setTitle('Training').setDescription(`Du hast ${art === 'haemmern' ? 'Haemmern' : art === 'schleifen' ? 'Schleifen' : 'Haerten'} trainiert!\n+${xpGain} XP | -${kosten} Muenzen`);
      if (ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${lvl}!` });
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'upgrade') {
      const slot = interaction.options.getString('slot');
      const upg = UPGRADES[slot];
      const curStufe = ws[`upg_${slot}`];
      if (curStufe >= upg.stufen.length - 1) return interaction.reply({ content: 'Maximale Stufe erreicht!', ephemeral: true });
      const kosten = upg.stufen[curStufe + 1];
      if (ws.geld < kosten) return interaction.reply({ content: `Upgrade kostet ${kosten} Muenzen!`, ephemeral: true });
      db.db.prepare(`UPDATE waffenschmied SET geld = geld - ?, upg_${slot} = upg_${slot} + 1 WHERE userId = ?`).run(kosten, uId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x8B0000).setTitle('Upgrade').setDescription(`${upg.name} auf Stufe ${curStufe + 1} verbessert!`)] });
    }

    if (sub === 'arsenal') {
      const arsenal = getArsenal(uId);
      const lines = WAFFENARTEN.map((w, i) => `${w.name}: ${arsenal[`waffe${i}`] || 0}x`);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x8B0000).setTitle('⚔️ Waffenarsenal').setDescription(lines.join('\n'))] });
    }

    if (sub === 'auftrag') {
      const now = Date.now();
      const cdKey = `auftrag_${uId}`;
      const cd = cooldowns.get(cdKey) || 0;
      if (now - cd < 60000) {
        const left = Math.ceil((60000 - (now - cd)) / 1000);
        return interaction.reply({ content: `Naechster Auftrag in ${left}s!`, ephemeral: true });
      }
      const waffeIdx = Math.min(Math.max(0, ws.level - 1), WAFFENARTEN.length - 1);
      const waffe = WAFFENARTEN[waffeIdx];
      const menge = 1 + Math.floor(Math.random() * 2);
      const arsenal = getArsenal(uId);
      const vorrat = arsenal[`waffe${waffeIdx}`] || 0;
      if (vorrat < menge) return interaction.reply({ content: `Auftrag: ${menge}x ${waffe.name}. Dir fehlen noch ${menge - vorrat}!`, ephemeral: false });
      const belohnung = Math.floor(waffe.basisWert * menge * 1.3);
      const xpGain = waffe.schwierigkeit * menge * 15;
      db.db.prepare(`UPDATE waffenschmied_arsenal SET waffe${waffeIdx} = waffe${waffeIdx} - ? WHERE userId = ?`).run(menge, uId);
      db.db.prepare('UPDATE waffenschmied SET geld = geld + ?, xp = xp + ?, auftraege = auftraege + 1 WHERE userId = ?').run(belohnung, xpGain, uId);
      const updWs = getWaffenschmied(uId);
      const { lvl, ups } = checkLevelUp(uId, updWs);
      cooldowns.set(cdKey, now);
      const embed = new EmbedBuilder().setColor(0x8B0000).setTitle('📋 Auftrag erfuellt!').setDescription(`${menge}x ${waffe.name} geliefert!\n+${belohnung} Muenzen | +${xpGain} XP`);
      if (ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${lvl}!` });
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'duell') {
      const gegner = interaction.options.getUser('gegner');
      if (gegner.id === uId) return interaction.reply({ content: 'Du kannst nicht gegen dich selbst kaempfen!', ephemeral: true });
      const gWs = db.db.prepare('SELECT * FROM waffenschmied WHERE userId = ?').get(gegner.id);
      if (!gWs) return interaction.reply({ content: 'Dein Gegner ist noch kein Waffenschmied!', ephemeral: true });
      const myScore = ws.level * 10 + Math.random() * 50;
      const gScore = gWs.level * 10 + Math.random() * 50;
      const gewonnen = myScore > gScore;
      const belohnung = gewonnen ? Math.floor(50 + ws.level * 15) : 0;
      const xpGain = gewonnen ? 40 + ws.level * 10 : 10;
      db.db.prepare('UPDATE waffenschmied SET geld = geld + ?, xp = xp + ?, duelle = duelle + 1, siege = siege + ? WHERE userId = ?').run(belohnung, xpGain, gewonnen ? 1 : 0, uId);
      const updWs = getWaffenschmied(uId);
      const { lvl, ups } = checkLevelUp(uId, updWs);
      const embed = new EmbedBuilder()
        .setColor(gewonnen ? 0x00FF00 : 0xFF0000)
        .setTitle(gewonnen ? '⚔️ Duell gewonnen!' : '⚔️ Duell verloren!')
        .setDescription(`${gewonnen ? `Du hast ${gegner.username} besiegt!` : `${gegner.username} hat gewonnen!`}\n${gewonnen ? `+${belohnung} Muenzen | ` : ''}+${xpGain} XP`);
      if (ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${lvl}!` });
      return interaction.reply({ embeds: [embed] });
    }
  },
};
