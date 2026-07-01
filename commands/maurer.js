const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

const STEINE = [
  { name: 'Sandstein', preis: 20, qualitaet: 1.0, emoji: '🟡' },
  { name: 'Kalkstein', preis: 40, qualitaet: 1.3, emoji: '⬜' },
  { name: 'Granit', preis: 75, qualitaet: 1.6, emoji: '🪨' },
  { name: 'Marmor', preis: 130, qualitaet: 2.1, emoji: '⬛' },
  { name: 'Obsidian', preis: 210, qualitaet: 2.7, emoji: '🖤' },
  { name: 'Mondstein', preis: 330, qualitaet: 3.4, emoji: '🌙' },
  { name: 'Kristallstein', preis: 520, qualitaet: 4.3, emoji: '💎' },
  { name: 'Aetherstein', preis: 850, qualitaet: 5.5, emoji: '🔮' },
];

const BAUWERKE = [
  { name: 'Mauer', basisWert: 90, schwierigkeit: 1, minLevel: 1 },
  { name: 'Brunnen', basisWert: 170, schwierigkeit: 2, minLevel: 3 },
  { name: 'Bogen', basisWert: 260, schwierigkeit: 3, minLevel: 5 },
  { name: 'Turm', basisWert: 370, schwierigkeit: 4, minLevel: 8 },
  { name: 'Bruecke', basisWert: 530, schwierigkeit: 5, minLevel: 12 },
  { name: 'Gewölbe', basisWert: 760, schwierigkeit: 6, minLevel: 16 },
  { name: 'Kathedrale', basisWert: 1100, schwierigkeit: 7, minLevel: 21 },
  { name: 'Legendaere Aetherfestung', basisWert: 1600, schwierigkeit: 8, minLevel: 28 },
];

const MOERTEL = [
  { name: 'Lehmmoertel', bonus: 1.0, minLevel: 1 },
  { name: 'Kalkmoertel', bonus: 1.2, minLevel: 3 },
  { name: 'Zementmoertel', bonus: 1.5, minLevel: 5 },
  { name: 'Gipsmoertel', bonus: 1.8, minLevel: 8 },
  { name: 'Silbermoertel', bonus: 2.3, minLevel: 12 },
  { name: 'Goldmoertel', bonus: 2.9, minLevel: 16 },
  { name: 'Mithrilmoertel', bonus: 3.6, minLevel: 21 },
  { name: 'Aethermoertel', bonus: 4.8, minLevel: 28 },
];

const QUALITAETEN = [
  { name: 'Baufaellig', multi: 0.3, minRoll: 0 },
  { name: 'Grob', multi: 0.6, minRoll: 15 },
  { name: 'Einfach', multi: 0.9, minRoll: 30 },
  { name: 'Solide', multi: 1.2, minRoll: 45 },
  { name: 'Stabil', multi: 1.6, minRoll: 62 },
  { name: 'Prachtvoll', multi: 2.1, minRoll: 78 },
  { name: 'Meisterhaft', multi: 3.2, minRoll: 92 },
];

const UPGRADES = {
  kelle: { name: 'Kelle', stufen: [0, 260, 700, 1800, 4500], bonus: [0, 0.1, 0.2, 0.35, 0.5] },
  richtscheit: { name: 'Richtscheit', stufen: [0, 460, 1150, 2900, 7000], bonus: [0, 0.08, 0.18, 0.3, 0.45] },
  mischmaschine: { name: 'Mischmaschine', stufen: [0, 360, 900, 2300, 5500], bonus: [0, 0.06, 0.14, 0.25, 0.4] },
  werkstatt: { name: 'Werkstatt', stufen: [0, 900, 2300, 5500, 13500], bonus: [0, 0.12, 0.25, 0.4, 0.6] },
};

const MAURER_EVENTS = [
  { text: 'Ein Stein bricht beim Setzen!', qualMulti: 0.5, geldMulti: 0.7 },
  { text: 'Die Fugen sitzen perfekt!', qualMulti: 1.5, geldMulti: 1.2 },
  { text: 'Der Moertel trocknet zu schnell.', qualMulti: 0.8, geldMulti: 0.9 },
  { text: 'Meisterhaftes Mauerwerk!', qualMulti: 2.0, geldMulti: 1.5 },
  { text: 'Die Steine passen wie angegossen.', qualMulti: 1.3, geldMulti: 1.1 },
  { text: 'Ein Riss im Fundament muss ausgeglichen werden.', qualMulti: 0.7, geldMulti: 0.85 },
  { text: 'Das Bauwerk strahlt majestaetiische Pracht aus!', qualMulti: 1.8, geldMulti: 1.4 },
];

const cooldowns = new Map();

function ensureMaurerTable() {
  db.db.exec(`CREATE TABLE IF NOT EXISTS maurer (
    userId TEXT PRIMARY KEY,
    geld INTEGER DEFAULT 0,
    steine INTEGER DEFAULT 0,
    steinTyp INTEGER DEFAULT 0,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    auftraege INTEGER DEFAULT 0,
    duelle INTEGER DEFAULT 0,
    siege INTEGER DEFAULT 0,
    upg_kelle INTEGER DEFAULT 0,
    upg_richtscheit INTEGER DEFAULT 0,
    upg_mischmaschine INTEGER DEFAULT 0,
    upg_werkstatt INTEGER DEFAULT 0
  )`);
  db.db.exec(`CREATE TABLE IF NOT EXISTS maurer_bauhof (
    userId TEXT PRIMARY KEY,
    bau0 INTEGER DEFAULT 0,
    bau1 INTEGER DEFAULT 0,
    bau2 INTEGER DEFAULT 0,
    bau3 INTEGER DEFAULT 0,
    bau4 INTEGER DEFAULT 0,
    bau5 INTEGER DEFAULT 0,
    bau6 INTEGER DEFAULT 0,
    bau7 INTEGER DEFAULT 0
  )`);
}

function getMaurer(uId) {
  let row = db.db.prepare('SELECT * FROM maurer WHERE userId = ?').get(uId);
  if (!row) {
    db.db.prepare('INSERT INTO maurer (userId) VALUES (?)').run(uId);
    row = db.db.prepare('SELECT * FROM maurer WHERE userId = ?').get(uId);
  }
  return row;
}

function getBauhof(uId) {
  let row = db.db.prepare('SELECT * FROM maurer_bauhof WHERE userId = ?').get(uId);
  if (!row) {
    db.db.prepare('INSERT INTO maurer_bauhof (userId) VALUES (?)').run(uId);
    row = db.db.prepare('SELECT * FROM maurer_bauhof WHERE userId = ?').get(uId);
  }
  return row;
}

function xpForLevel(l) { return l * l * 53; }

function checkLevelUp(uId, ma) {
  let lvl = ma.level;
  let ups = 0;
  while (ma.xp >= xpForLevel(lvl)) {
    ma.xp -= xpForLevel(lvl);
    lvl++;
    ups++;
  }
  if (ups > 0) {
    db.db.prepare('UPDATE maurer SET level = ?, xp = ? WHERE userId = ?').run(lvl, ma.xp, uId);
  }
  return { lvl, ups };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('maurer')
    .setDescription('Werde ein Maurer und errichte beeindruckende Steinbauwerke!')
    .addSubcommand(s => s.setName('start').setDescription('Beginne deine Maurer-Karriere'))
    .addSubcommand(s => s.setName('status').setDescription('Zeige deinen Maurer-Status'))
    .addSubcommand(s => s.setName('steine').setDescription('Liste alle verfuegbaren Steinarten'))
    .addSubcommand(s => s.setName('kaufen').setDescription('Kaufe Steine').addIntegerOption(o => o.setName('stein').setDescription('Stein-Typ (1-8)').setRequired(true)).addIntegerOption(o => o.setName('menge').setDescription('Menge').setRequired(true)))
    .addSubcommand(s => s.setName('mauern').setDescription('Errichte ein Bauwerk').addIntegerOption(o => o.setName('bauwerk').setDescription('Bauwerk-Typ (1-8)').setRequired(true)).addIntegerOption(o => o.setName('moertel').setDescription('Moertel-Typ (1-8)').setRequired(true)))
    .addSubcommand(s => s.setName('training').setDescription('Verbessere deine Faehigkeiten').addStringOption(o => o.setName('art').setDescription('Trainingsart').setRequired(true).addChoices({ name: 'Setzen', value: 'setzen' }, { name: 'Fugen', value: 'fugen' }, { name: 'Mischen', value: 'mischen' })))
    .addSubcommand(s => s.setName('upgrade').setDescription('Verbessere dein Werkzeug').addStringOption(o => o.setName('slot').setDescription('Upgrade-Slot').setRequired(true).addChoices({ name: 'Kelle', value: 'kelle' }, { name: 'Richtscheit', value: 'richtscheit' }, { name: 'Mischmaschine', value: 'mischmaschine' }, { name: 'Werkstatt', value: 'werkstatt' })))
    .addSubcommand(s => s.setName('bauhof').setDescription('Zeige deinen Bauhof'))
    .addSubcommand(s => s.setName('auftrag').setDescription('Nimm einen Bauauftrag an'))
    .addSubcommand(s => s.setName('duell').setDescription('Fordere einen anderen Maurer heraus').addUserOption(o => o.setName('gegner').setDescription('Dein Gegner').setRequired(true))),

  async execute(interaction) {
    const config = require('../config.json');
    ensureMaurerTable();
    const uId = interaction.user.id;
    const sub = interaction.options.getSubcommand();

    if (sub === 'start') {
      const existing = db.db.prepare('SELECT userId FROM maurer WHERE userId = ?').get(uId);
      if (existing) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x808080).setTitle('Maurer').setDescription('Du bist bereits Maurer!')] });
      }
      db.db.prepare('INSERT INTO maurer (userId) VALUES (?)').run(uId);
      db.db.prepare('INSERT INTO maurer_bauhof (userId) VALUES (?)').run(uId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x808080).setTitle('Willkommen, Maurer!').setDescription('Du hast deinen Maurer-Betrieb eroeffnet!\nBenutze `/maurer kaufen` um Steine zu kaufen.\nDann `/maurer mauern` um Bauwerke zu errichten!')] });
    }

    if (sub === 'steine') {
      const lines = STEINE.map((s, i) => `${s.emoji} **${i + 1}. ${s.name}** — ${s.preis} Muenzen | Qualitaet: ${s.qualitaet}x`);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x808080).setTitle('🪨 Steinarten').setDescription(lines.join('\n'))] });
    }

    const ma = getMaurer(uId);

    if (sub === 'status') {
      const upgLines = Object.entries(UPGRADES).map(([k, u]) => `${u.name}: Stufe ${ma[`upg_${k}`]}`);
      const embed = new EmbedBuilder()
        .setColor(0x808080)
        .setTitle(`🧱 Maurer — ${interaction.user.username}`)
        .addFields(
          { name: 'Level', value: `${ma.level}`, inline: true },
          { name: 'XP', value: `${ma.xp}/${xpForLevel(ma.level)}`, inline: true },
          { name: 'Muenzen', value: `${ma.geld}`, inline: true },
          { name: 'Steine', value: `${ma.steine}x ${ma.steinTyp > 0 ? STEINE[ma.steinTyp - 1].name : 'Keine'}`, inline: true },
          { name: 'Auftraege', value: `${ma.auftraege}`, inline: true },
          { name: 'Duelle', value: `${ma.duelle} (${ma.siege} Siege)`, inline: true },
          { name: 'Upgrades', value: upgLines.join('\n'), inline: false },
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'kaufen') {
      const steinIdx = interaction.options.getInteger('stein') - 1;
      const menge = interaction.options.getInteger('menge');
      if (steinIdx < 0 || steinIdx >= STEINE.length) return interaction.reply({ content: 'Ungueltiger Stein-Typ (1-8)!', ephemeral: true });
      if (menge < 1 || menge > 100) return interaction.reply({ content: 'Menge muss zwischen 1 und 100 liegen!', ephemeral: true });
      const stein = STEINE[steinIdx];
      const kosten = stein.preis * menge;
      if (ma.geld < kosten) return interaction.reply({ content: `Nicht genug Muenzen! Du brauchst ${kosten}, hast aber ${ma.geld}.`, ephemeral: true });
      db.db.prepare('UPDATE maurer SET geld = geld - ?, steine = steine + ?, steinTyp = ? WHERE userId = ?').run(kosten, menge, steinIdx + 1, uId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x808080).setTitle('Steine gekauft').setDescription(`Du hast ${menge}x ${stein.emoji} ${stein.name} fuer ${kosten} Muenzen gekauft!`)] });
    }

    if (sub === 'mauern') {
      const now = Date.now();
      const cd = cooldowns.get(uId) || 0;
      if (now - cd < 30000) {
        const left = Math.ceil((30000 - (now - cd)) / 1000);
        return interaction.reply({ content: `Noch ${left}s Abkuehlung!`, ephemeral: true });
      }
      const bauIdx = interaction.options.getInteger('bauwerk') - 1;
      const moertelIdx = interaction.options.getInteger('moertel') - 1;
      if (bauIdx < 0 || bauIdx >= BAUWERKE.length) return interaction.reply({ content: 'Ungueltiger Bauwerk-Typ (1-8)!', ephemeral: true });
      if (moertelIdx < 0 || moertelIdx >= MOERTEL.length) return interaction.reply({ content: 'Ungueltiger Moertel-Typ (1-8)!', ephemeral: true });
      const bau = BAUWERKE[bauIdx];
      const moertel = MOERTEL[moertelIdx];
      if (ma.level < bau.minLevel) return interaction.reply({ content: `Du brauchst Level ${bau.minLevel} fuer ${bau.name}!`, ephemeral: true });
      if (ma.level < moertel.minLevel) return interaction.reply({ content: `Du brauchst Level ${moertel.minLevel} fuer ${moertel.name}!`, ephemeral: true });
      if (ma.steine < bau.schwierigkeit) return interaction.reply({ content: `Du brauchst ${bau.schwierigkeit} Steine fuer dieses Bauwerk!`, ephemeral: true });
      const stein = ma.steinTyp > 0 ? STEINE[ma.steinTyp - 1] : STEINE[0];
      const upgBonus = (UPGRADES.kelle.bonus[ma.upg_kelle] || 0) + (UPGRADES.richtscheit.bonus[ma.upg_richtscheit] || 0) + (UPGRADES.mischmaschine.bonus[ma.upg_mischmaschine] || 0) + (UPGRADES.werkstatt.bonus[ma.upg_werkstatt] || 0);
      const rollBase = Math.random() * 100;
      const roll = Math.min(99, rollBase + upgBonus * 20);
      const event = MAURER_EVENTS[Math.floor(Math.random() * MAURER_EVENTS.length)];
      let qual = QUALITAETEN[0];
      for (const q of QUALITAETEN) { if (roll >= q.minRoll) qual = q; }
      const wert = Math.floor(bau.basisWert * stein.qualitaet * moertel.bonus * qual.multi * event.qualMulti * event.geldMulti);
      const xpGain = Math.floor(bau.schwierigkeit * 20 * stein.qualitaet);
      db.db.prepare('UPDATE maurer SET steine = steine - ?, geld = geld + ?, xp = xp + ? WHERE userId = ?').run(bau.schwierigkeit, wert, xpGain, uId);
      const updMa = getMaurer(uId);
      const { lvl, ups } = checkLevelUp(uId, updMa);
      const col = `bau${bauIdx}`;
      db.db.prepare(`UPDATE maurer_bauhof SET ${col} = ${col} + 1 WHERE userId = ?`).run(uId);
      cooldowns.set(uId, now);
      const embed = new EmbedBuilder()
        .setColor(0x808080)
        .setTitle('🧱 Bauwerk errichtet!')
        .setDescription(`${event.text}`)
        .addFields(
          { name: 'Bauwerk', value: bau.name, inline: true },
          { name: 'Stein', value: `${stein.emoji} ${stein.name}`, inline: true },
          { name: 'Moertel', value: moertel.name, inline: true },
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
      db.db.prepare('UPDATE maurer SET geld = geld - ?, xp = xp + ? WHERE userId = ?').run(kosten, xpGain, uId);
      const updMa = getMaurer(uId);
      const { lvl, ups } = checkLevelUp(uId, updMa);
      const embed = new EmbedBuilder().setColor(0x808080).setTitle('Training').setDescription(`Du hast ${art === 'setzen' ? 'Setzen' : art === 'fugen' ? 'Fugen' : 'Mischen'} trainiert!\n+${xpGain} XP | -${kosten} Muenzen`);
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
      db.db.prepare(`UPDATE maurer SET geld = geld - ?, upg_${slot} = upg_${slot} + 1 WHERE userId = ?`).run(kosten, uId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x808080).setTitle('Upgrade').setDescription(`${upg.name} auf Stufe ${curStufe + 1} verbessert!`)] });
    }

    if (sub === 'bauhof') {
      const bauhof = getBauhof(uId);
      const lines = BAUWERKE.map((b, i) => `${b.name}: ${bauhof[`bau${i}`] || 0}x`);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x808080).setTitle('🧱 Bauhof').setDescription(lines.join('\n'))] });
    }

    if (sub === 'auftrag') {
      const now = Date.now();
      const cdKey = `auftrag_${uId}`;
      const cd = cooldowns.get(cdKey) || 0;
      if (now - cd < 60000) {
        const left = Math.ceil((60000 - (now - cd)) / 1000);
        return interaction.reply({ content: `Naechster Auftrag in ${left}s!`, ephemeral: true });
      }
      const bauIdx = Math.min(Math.max(0, ma.level - 1), BAUWERKE.length - 1);
      const bau = BAUWERKE[bauIdx];
      const menge = 1 + Math.floor(Math.random() * 2);
      const bauhof = getBauhof(uId);
      const vorrat = bauhof[`bau${bauIdx}`] || 0;
      if (vorrat < menge) return interaction.reply({ content: `Auftrag: ${menge}x ${bau.name}. Dir fehlen noch ${menge - vorrat}!`, ephemeral: false });
      const belohnung = Math.floor(bau.basisWert * menge * 1.3);
      const xpGain = bau.schwierigkeit * menge * 15;
      db.db.prepare(`UPDATE maurer_bauhof SET bau${bauIdx} = bau${bauIdx} - ? WHERE userId = ?`).run(menge, uId);
      db.db.prepare('UPDATE maurer SET geld = geld + ?, xp = xp + ?, auftraege = auftraege + 1 WHERE userId = ?').run(belohnung, xpGain, uId);
      const updMa = getMaurer(uId);
      const { lvl, ups } = checkLevelUp(uId, updMa);
      cooldowns.set(cdKey, now);
      const embed = new EmbedBuilder().setColor(0x808080).setTitle('📋 Auftrag erfuellt!').setDescription(`${menge}x ${bau.name} fertiggestellt!\n+${belohnung} Muenzen | +${xpGain} XP`);
      if (ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${lvl}!` });
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'duell') {
      const gegner = interaction.options.getUser('gegner');
      if (gegner.id === uId) return interaction.reply({ content: 'Du kannst nicht gegen dich selbst kaempfen!', ephemeral: true });
      const gMa = db.db.prepare('SELECT * FROM maurer WHERE userId = ?').get(gegner.id);
      if (!gMa) return interaction.reply({ content: 'Dein Gegner ist noch kein Maurer!', ephemeral: true });
      const myScore = ma.level * 10 + Math.random() * 50;
      const gScore = gMa.level * 10 + Math.random() * 50;
      const gewonnen = myScore > gScore;
      const belohnung = gewonnen ? Math.floor(50 + ma.level * 15) : 0;
      const xpGain = gewonnen ? 40 + ma.level * 10 : 10;
      db.db.prepare('UPDATE maurer SET geld = geld + ?, xp = xp + ?, duelle = duelle + 1, siege = siege + ? WHERE userId = ?').run(belohnung, xpGain, gewonnen ? 1 : 0, uId);
      const updMa = getMaurer(uId);
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
