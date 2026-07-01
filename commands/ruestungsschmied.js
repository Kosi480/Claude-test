const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

const METALLE = [
  { name: 'Leder', preis: 20, qualitaet: 1.0, emoji: '🟤' },
  { name: 'Kettengeflecht', preis: 45, qualitaet: 1.3, emoji: '🔗' },
  { name: 'Bronze', preis: 80, qualitaet: 1.6, emoji: '🟠' },
  { name: 'Eisen', preis: 130, qualitaet: 2.0, emoji: '⚙️' },
  { name: 'Stahl', preis: 210, qualitaet: 2.6, emoji: '🔩' },
  { name: 'Mithril', preis: 340, qualitaet: 3.3, emoji: '💎' },
  { name: 'Drachenschuppen', preis: 540, qualitaet: 4.3, emoji: '🐉' },
  { name: 'Aethermetall', preis: 870, qualitaet: 5.5, emoji: '🔮' },
];

const RUESTUNGSTEILE = [
  { name: 'Lederwams', basisWert: 90, schwierigkeit: 1, minLevel: 1 },
  { name: 'Kettenhemd', basisWert: 180, schwierigkeit: 2, minLevel: 3 },
  { name: 'Brustpanzer', basisWert: 290, schwierigkeit: 3, minLevel: 5 },
  { name: 'Vollplatte', basisWert: 430, schwierigkeit: 4, minLevel: 8 },
  { name: 'Ritterruestung', basisWert: 630, schwierigkeit: 5, minLevel: 12 },
  { name: 'Konigsruestung', basisWert: 920, schwierigkeit: 6, minLevel: 16 },
  { name: 'Elfenruestung', basisWert: 1350, schwierigkeit: 7, minLevel: 21 },
  { name: 'Legendaere Aetherplattenruestung', basisWert: 2000, schwierigkeit: 8, minLevel: 28 },
];

const VERZIERUNGEN = [
  { name: 'Schlicht', bonus: 1.0, minLevel: 1 },
  { name: 'Eingraviert', bonus: 1.2, minLevel: 3 },
  { name: 'Verziert', bonus: 1.5, minLevel: 5 },
  { name: 'Emailliert', bonus: 1.9, minLevel: 8 },
  { name: 'Vergoldet', bonus: 2.4, minLevel: 12 },
  { name: 'Besetzt', bonus: 3.0, minLevel: 16 },
  { name: 'Magisch verstärkt', bonus: 3.8, minLevel: 21 },
  { name: 'Aetherisch geweiht', bonus: 5.0, minLevel: 28 },
];

const QUALITAETEN = [
  { name: 'Rostig', multi: 0.3, minRoll: 0 },
  { name: 'Grob', multi: 0.6, minRoll: 15 },
  { name: 'Einfach', multi: 0.9, minRoll: 30 },
  { name: 'Solide', multi: 1.2, minRoll: 45 },
  { name: 'Gehärtet', multi: 1.6, minRoll: 62 },
  { name: 'Prächtig', multi: 2.1, minRoll: 78 },
  { name: 'Meisterhaft', multi: 3.2, minRoll: 92 },
];

const UPGRADES = {
  schmiedeesse: { name: 'Ruestungsesse', stufen: [0, 320, 850, 2150, 5400], bonus: [0, 0.1, 0.2, 0.35, 0.5] },
  haerteanlage: { name: 'Haerteanlage', stufen: [0, 540, 1350, 3400, 8200], bonus: [0, 0.08, 0.18, 0.3, 0.45] },
  polierrad: { name: 'Polierrad', stufen: [0, 420, 1050, 2650, 6300], bonus: [0, 0.06, 0.14, 0.25, 0.4] },
  werkstatt: { name: 'Ruestungswerkstatt', stufen: [0, 1050, 2650, 6400, 15500], bonus: [0, 0.12, 0.25, 0.4, 0.6] },
};

const RUESTUNGS_EVENTS = [
  { text: 'Das Metall springt beim Haemmern!', qualMulti: 0.5, geldMulti: 0.7 },
  { text: 'Die Platten sitzen wie angegossen!', qualMulti: 1.5, geldMulti: 1.2 },
  { text: 'Das Haerten nimmt zu lange — das Metall sproede.', qualMulti: 0.8, geldMulti: 0.9 },
  { text: 'Perfekte Ruestung — kein Angriff kann diese durchdringen!', qualMulti: 2.0, geldMulti: 1.5 },
  { text: 'Die Verbindungen sitzen absolut dicht.', qualMulti: 1.3, geldMulti: 1.1 },
  { text: 'Ein Scharnier loest sich und muss repariert werden.', qualMulti: 0.7, geldMulti: 0.85 },
  { text: 'Die Ruestung glaenzt im Licht der Werkstatt!', qualMulti: 1.8, geldMulti: 1.4 },
];

const cooldowns = new Map();

function ensureRuestungsschmiedTable() {
  db.db.exec(`CREATE TABLE IF NOT EXISTS ruestungsschmied (
    userId TEXT PRIMARY KEY,
    geld INTEGER DEFAULT 0,
    metall INTEGER DEFAULT 0,
    metallTyp INTEGER DEFAULT 0,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    auftraege INTEGER DEFAULT 0,
    duelle INTEGER DEFAULT 0,
    siege INTEGER DEFAULT 0,
    upg_schmiedeesse INTEGER DEFAULT 0,
    upg_haerteanlage INTEGER DEFAULT 0,
    upg_polierrad INTEGER DEFAULT 0,
    upg_werkstatt INTEGER DEFAULT 0
  )`);
  db.db.exec(`CREATE TABLE IF NOT EXISTS ruestungsschmied_lager (
    userId TEXT PRIMARY KEY,
    ruestung0 INTEGER DEFAULT 0,
    ruestung1 INTEGER DEFAULT 0,
    ruestung2 INTEGER DEFAULT 0,
    ruestung3 INTEGER DEFAULT 0,
    ruestung4 INTEGER DEFAULT 0,
    ruestung5 INTEGER DEFAULT 0,
    ruestung6 INTEGER DEFAULT 0,
    ruestung7 INTEGER DEFAULT 0
  )`);
}

function getRuestungsschmied(uId) {
  let row = db.db.prepare('SELECT * FROM ruestungsschmied WHERE userId = ?').get(uId);
  if (!row) {
    db.db.prepare('INSERT INTO ruestungsschmied (userId) VALUES (?)').run(uId);
    row = db.db.prepare('SELECT * FROM ruestungsschmied WHERE userId = ?').get(uId);
  }
  return row;
}

function getLager(uId) {
  let row = db.db.prepare('SELECT * FROM ruestungsschmied_lager WHERE userId = ?').get(uId);
  if (!row) {
    db.db.prepare('INSERT INTO ruestungsschmied_lager (userId) VALUES (?)').run(uId);
    row = db.db.prepare('SELECT * FROM ruestungsschmied_lager WHERE userId = ?').get(uId);
  }
  return row;
}

function xpForLevel(l) { return l * l * 52; }

function checkLevelUp(uId, rs) {
  let lvl = rs.level;
  let ups = 0;
  while (rs.xp >= xpForLevel(lvl)) {
    rs.xp -= xpForLevel(lvl);
    lvl++;
    ups++;
  }
  if (ups > 0) {
    db.db.prepare('UPDATE ruestungsschmied SET level = ?, xp = ? WHERE userId = ?').run(lvl, rs.xp, uId);
  }
  return { lvl, ups };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ruestungsschmied')
    .setDescription('Werde ein Ruestungsschmied und fertige maechtigen Schutz fuer Helden!')
    .addSubcommand(s => s.setName('start').setDescription('Beginne deine Ruestungsschmied-Karriere'))
    .addSubcommand(s => s.setName('status').setDescription('Zeige deinen Ruestungsschmied-Status'))
    .addSubcommand(s => s.setName('materialien').setDescription('Liste alle verfuegbaren Materialien'))
    .addSubcommand(s => s.setName('kaufen').setDescription('Kaufe Material').addIntegerOption(o => o.setName('material').setDescription('Material-Typ (1-8)').setRequired(true)).addIntegerOption(o => o.setName('menge').setDescription('Menge').setRequired(true)))
    .addSubcommand(s => s.setName('schmieden').setDescription('Schmiedee ein Ruestungsteil').addIntegerOption(o => o.setName('ruestung').setDescription('Ruestungs-Typ (1-8)').setRequired(true)).addIntegerOption(o => o.setName('verzierung').setDescription('Verzierungs-Typ (1-8)').setRequired(true)))
    .addSubcommand(s => s.setName('training').setDescription('Verbessere deine Faehigkeiten').addStringOption(o => o.setName('art').setDescription('Trainingsart').setRequired(true).addChoices({ name: 'Haemmern', value: 'haemmern' }, { name: 'Haerten', value: 'haerten' }, { name: 'Polieren', value: 'polieren' })))
    .addSubcommand(s => s.setName('upgrade').setDescription('Verbessere deine Schmiede').addStringOption(o => o.setName('slot').setDescription('Upgrade-Slot').setRequired(true).addChoices({ name: 'Ruestungsesse', value: 'schmiedeesse' }, { name: 'Haerteanlage', value: 'haerteanlage' }, { name: 'Polierrad', value: 'polierrad' }, { name: 'Ruestungswerkstatt', value: 'werkstatt' })))
    .addSubcommand(s => s.setName('lager').setDescription('Zeige dein Ruestungslager'))
    .addSubcommand(s => s.setName('auftrag').setDescription('Nimm einen Ruestungsauftrag an'))
    .addSubcommand(s => s.setName('duell').setDescription('Fordere einen anderen Ruestungsschmied heraus').addUserOption(o => o.setName('gegner').setDescription('Dein Gegner').setRequired(true))),

  async execute(interaction) {
    const config = require('../config.json');
    ensureRuestungsschmiedTable();
    const uId = interaction.user.id;
    const sub = interaction.options.getSubcommand();

    if (sub === 'start') {
      const existing = db.db.prepare('SELECT userId FROM ruestungsschmied WHERE userId = ?').get(uId);
      if (existing) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x4169E1).setTitle('Ruestungsschmied').setDescription('Du bist bereits Ruestungsschmied!')] });
      }
      db.db.prepare('INSERT INTO ruestungsschmied (userId) VALUES (?)').run(uId);
      db.db.prepare('INSERT INTO ruestungsschmied_lager (userId) VALUES (?)').run(uId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x4169E1).setTitle('Willkommen, Ruestungsschmied!').setDescription('Du hast deine Ruestungsschmiede eroeffnet!\nBenutze `/ruestungsschmied kaufen` um Material zu kaufen.\nDann `/ruestungsschmied schmieden` um Ruestungen herzustellen!')] });
    }

    if (sub === 'materialien') {
      const lines = METALLE.map((m, i) => `${m.emoji} **${i + 1}. ${m.name}** — ${m.preis} Muenzen | Qualitaet: ${m.qualitaet}x`);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x4169E1).setTitle('🛡️ Materialien').setDescription(lines.join('\n'))] });
    }

    const rs = getRuestungsschmied(uId);

    if (sub === 'status') {
      const upgLines = Object.entries(UPGRADES).map(([k, u]) => `${u.name}: Stufe ${rs[`upg_${k}`]}`);
      const embed = new EmbedBuilder()
        .setColor(0x4169E1)
        .setTitle(`🛡️ Ruestungsschmied — ${interaction.user.username}`)
        .addFields(
          { name: 'Level', value: `${rs.level}`, inline: true },
          { name: 'XP', value: `${rs.xp}/${xpForLevel(rs.level)}`, inline: true },
          { name: 'Muenzen', value: `${rs.geld}`, inline: true },
          { name: 'Material', value: `${rs.metall}x ${rs.metallTyp > 0 ? METALLE[rs.metallTyp - 1].name : 'Keines'}`, inline: true },
          { name: 'Auftraege', value: `${rs.auftraege}`, inline: true },
          { name: 'Duelle', value: `${rs.duelle} (${rs.siege} Siege)`, inline: true },
          { name: 'Upgrades', value: upgLines.join('\n'), inline: false },
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'kaufen') {
      const metallIdx = interaction.options.getInteger('material') - 1;
      const menge = interaction.options.getInteger('menge');
      if (metallIdx < 0 || metallIdx >= METALLE.length) return interaction.reply({ content: 'Ungueltiger Material-Typ (1-8)!', ephemeral: true });
      if (menge < 1 || menge > 100) return interaction.reply({ content: 'Menge muss zwischen 1 und 100 liegen!', ephemeral: true });
      const metall = METALLE[metallIdx];
      const kosten = metall.preis * menge;
      if (rs.geld < kosten) return interaction.reply({ content: `Nicht genug Muenzen! Du brauchst ${kosten}, hast aber ${rs.geld}.`, ephemeral: true });
      db.db.prepare('UPDATE ruestungsschmied SET geld = geld - ?, metall = metall + ?, metallTyp = ? WHERE userId = ?').run(kosten, menge, metallIdx + 1, uId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x4169E1).setTitle('Material gekauft').setDescription(`Du hast ${menge}x ${metall.emoji} ${metall.name} fuer ${kosten} Muenzen gekauft!`)] });
    }

    if (sub === 'schmieden') {
      const now = Date.now();
      const cd = cooldowns.get(uId) || 0;
      if (now - cd < 30000) {
        const left = Math.ceil((30000 - (now - cd)) / 1000);
        return interaction.reply({ content: `Noch ${left}s Abkuehlung!`, ephemeral: true });
      }
      const ruestungIdx = interaction.options.getInteger('ruestung') - 1;
      const verzierungIdx = interaction.options.getInteger('verzierung') - 1;
      if (ruestungIdx < 0 || ruestungIdx >= RUESTUNGSTEILE.length) return interaction.reply({ content: 'Ungueltiger Ruestungs-Typ (1-8)!', ephemeral: true });
      if (verzierungIdx < 0 || verzierungIdx >= VERZIERUNGEN.length) return interaction.reply({ content: 'Ungueltiger Verzierungs-Typ (1-8)!', ephemeral: true });
      const ruestung = RUESTUNGSTEILE[ruestungIdx];
      const verzierung = VERZIERUNGEN[verzierungIdx];
      if (rs.level < ruestung.minLevel) return interaction.reply({ content: `Du brauchst Level ${ruestung.minLevel} fuer ${ruestung.name}!`, ephemeral: true });
      if (rs.level < verzierung.minLevel) return interaction.reply({ content: `Du brauchst Level ${verzierung.minLevel} fuer ${verzierung.name}!`, ephemeral: true });
      if (rs.metall < ruestung.schwierigkeit) return interaction.reply({ content: `Du brauchst ${ruestung.schwierigkeit} Material fuer diese Ruestung!`, ephemeral: true });
      const metall = rs.metallTyp > 0 ? METALLE[rs.metallTyp - 1] : METALLE[0];
      const upgBonus = (UPGRADES.schmiedeesse.bonus[rs.upg_schmiedeesse] || 0) + (UPGRADES.haerteanlage.bonus[rs.upg_haerteanlage] || 0) + (UPGRADES.polierrad.bonus[rs.upg_polierrad] || 0) + (UPGRADES.werkstatt.bonus[rs.upg_werkstatt] || 0);
      const rollBase = Math.random() * 100;
      const roll = Math.min(99, rollBase + upgBonus * 20);
      const event = RUESTUNGS_EVENTS[Math.floor(Math.random() * RUESTUNGS_EVENTS.length)];
      let qual = QUALITAETEN[0];
      for (const q of QUALITAETEN) { if (roll >= q.minRoll) qual = q; }
      const wert = Math.floor(ruestung.basisWert * metall.qualitaet * verzierung.bonus * qual.multi * event.qualMulti * event.geldMulti);
      const xpGain = Math.floor(ruestung.schwierigkeit * 20 * metall.qualitaet);
      db.db.prepare('UPDATE ruestungsschmied SET metall = metall - ?, geld = geld + ?, xp = xp + ? WHERE userId = ?').run(ruestung.schwierigkeit, wert, xpGain, uId);
      const updRs = getRuestungsschmied(uId);
      const { lvl, ups } = checkLevelUp(uId, updRs);
      const col = `ruestung${ruestungIdx}`;
      db.db.prepare(`UPDATE ruestungsschmied_lager SET ${col} = ${col} + 1 WHERE userId = ?`).run(uId);
      cooldowns.set(uId, now);
      const embed = new EmbedBuilder()
        .setColor(0x4169E1)
        .setTitle('🛡️ Ruestung geschmiedet!')
        .setDescription(`${event.text}`)
        .addFields(
          { name: 'Ruestung', value: ruestung.name, inline: true },
          { name: 'Material', value: `${metall.emoji} ${metall.name}`, inline: true },
          { name: 'Verzierung', value: verzierung.name, inline: true },
          { name: 'Qualitaet', value: qual.name, inline: true },
          { name: 'Wert', value: `${wert} Muenzen`, inline: true },
          { name: 'XP', value: `+${xpGain}`, inline: true },
        );
      if (ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${lvl}!` });
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'training') {
      const art = interaction.options.getString('art');
      const kosten = 50 + rs.level * 20;
      if (rs.geld < kosten) return interaction.reply({ content: `Training kostet ${kosten} Muenzen!`, ephemeral: true });
      const xpGain = 30 + rs.level * 10;
      db.db.prepare('UPDATE ruestungsschmied SET geld = geld - ?, xp = xp + ? WHERE userId = ?').run(kosten, xpGain, uId);
      const updRs = getRuestungsschmied(uId);
      const { lvl, ups } = checkLevelUp(uId, updRs);
      const embed = new EmbedBuilder().setColor(0x4169E1).setTitle('Training').setDescription(`Du hast ${art === 'haemmern' ? 'Haemmern' : art === 'haerten' ? 'Haerten' : 'Polieren'} trainiert!\n+${xpGain} XP | -${kosten} Muenzen`);
      if (ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${lvl}!` });
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'upgrade') {
      const slot = interaction.options.getString('slot');
      const upg = UPGRADES[slot];
      const curStufe = rs[`upg_${slot}`];
      if (curStufe >= upg.stufen.length - 1) return interaction.reply({ content: 'Maximale Stufe erreicht!', ephemeral: true });
      const kosten = upg.stufen[curStufe + 1];
      if (rs.geld < kosten) return interaction.reply({ content: `Upgrade kostet ${kosten} Muenzen!`, ephemeral: true });
      db.db.prepare(`UPDATE ruestungsschmied SET geld = geld - ?, upg_${slot} = upg_${slot} + 1 WHERE userId = ?`).run(kosten, uId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x4169E1).setTitle('Upgrade').setDescription(`${upg.name} auf Stufe ${curStufe + 1} verbessert!`)] });
    }

    if (sub === 'lager') {
      const lager = getLager(uId);
      const lines = RUESTUNGSTEILE.map((r, i) => `${r.name}: ${lager[`ruestung${i}`] || 0}x`);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x4169E1).setTitle('🛡️ Ruestungslager').setDescription(lines.join('\n'))] });
    }

    if (sub === 'auftrag') {
      const now = Date.now();
      const cdKey = `auftrag_${uId}`;
      const cd = cooldowns.get(cdKey) || 0;
      if (now - cd < 60000) {
        const left = Math.ceil((60000 - (now - cd)) / 1000);
        return interaction.reply({ content: `Naechster Auftrag in ${left}s!`, ephemeral: true });
      }
      const ruestungIdx = Math.min(Math.max(0, rs.level - 1), RUESTUNGSTEILE.length - 1);
      const ruestung = RUESTUNGSTEILE[ruestungIdx];
      const menge = 1 + Math.floor(Math.random() * 2);
      const lager = getLager(uId);
      const vorrat = lager[`ruestung${ruestungIdx}`] || 0;
      if (vorrat < menge) return interaction.reply({ content: `Auftrag: ${menge}x ${ruestung.name}. Dir fehlen noch ${menge - vorrat}!`, ephemeral: false });
      const belohnung = Math.floor(ruestung.basisWert * menge * 1.3);
      const xpGain = ruestung.schwierigkeit * menge * 15;
      db.db.prepare(`UPDATE ruestungsschmied_lager SET ruestung${ruestungIdx} = ruestung${ruestungIdx} - ? WHERE userId = ?`).run(menge, uId);
      db.db.prepare('UPDATE ruestungsschmied SET geld = geld + ?, xp = xp + ?, auftraege = auftraege + 1 WHERE userId = ?').run(belohnung, xpGain, uId);
      const updRs = getRuestungsschmied(uId);
      const { lvl, ups } = checkLevelUp(uId, updRs);
      cooldowns.set(cdKey, now);
      const embed = new EmbedBuilder().setColor(0x4169E1).setTitle('📋 Auftrag erfuellt!').setDescription(`${menge}x ${ruestung.name} geliefert!\n+${belohnung} Muenzen | +${xpGain} XP`);
      if (ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${lvl}!` });
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'duell') {
      const gegner = interaction.options.getUser('gegner');
      if (gegner.id === uId) return interaction.reply({ content: 'Du kannst nicht gegen dich selbst kaempfen!', ephemeral: true });
      const gRs = db.db.prepare('SELECT * FROM ruestungsschmied WHERE userId = ?').get(gegner.id);
      if (!gRs) return interaction.reply({ content: 'Dein Gegner ist noch kein Ruestungsschmied!', ephemeral: true });
      const myScore = rs.level * 10 + Math.random() * 50;
      const gScore = gRs.level * 10 + Math.random() * 50;
      const gewonnen = myScore > gScore;
      const belohnung = gewonnen ? Math.floor(50 + rs.level * 15) : 0;
      const xpGain = gewonnen ? 40 + rs.level * 10 : 10;
      db.db.prepare('UPDATE ruestungsschmied SET geld = geld + ?, xp = xp + ?, duelle = duelle + 1, siege = siege + ? WHERE userId = ?').run(belohnung, xpGain, gewonnen ? 1 : 0, uId);
      const updRs = getRuestungsschmied(uId);
      const { lvl, ups } = checkLevelUp(uId, updRs);
      const embed = new EmbedBuilder()
        .setColor(gewonnen ? 0x00FF00 : 0xFF0000)
        .setTitle(gewonnen ? '⚔️ Duell gewonnen!' : '⚔️ Duell verloren!')
        .setDescription(`${gewonnen ? `Du hast ${gegner.username} besiegt!` : `${gegner.username} hat gewonnen!`}\n${gewonnen ? `+${belohnung} Muenzen | ` : ''}+${xpGain} XP`);
      if (ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${lvl}!` });
      return interaction.reply({ embeds: [embed] });
    }
  },
};
