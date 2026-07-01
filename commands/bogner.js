const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

const HOELZER = [
  { name: 'Eschenholz', preis: 35, qualitaet: 1.0, emoji: '🌲' },
  { name: 'Eibenholz', preis: 70, qualitaet: 1.4, emoji: '🌳' },
  { name: 'Bambusrohr', preis: 110, qualitaet: 1.7, emoji: '🎋' },
  { name: 'Elfenholz', preis: 180, qualitaet: 2.2, emoji: '✨' },
  { name: 'Drachenknochen', preis: 280, qualitaet: 2.9, emoji: '🐉' },
  { name: 'Mondholz', preis: 440, qualitaet: 3.7, emoji: '🌙' },
  { name: 'Kristallholz', preis: 700, qualitaet: 4.7, emoji: '💎' },
  { name: 'Aetherholz', preis: 1100, qualitaet: 6.0, emoji: '🔮' },
];

const BOGENARTEN = [
  { name: 'Kurzbuegen', basisWert: 100, schwierigkeit: 1, minLevel: 1 },
  { name: 'Langbuegen', basisWert: 200, schwierigkeit: 2, minLevel: 3 },
  { name: 'Reflexbuegen', basisWert: 310, schwierigkeit: 3, minLevel: 5 },
  { name: 'Kompositbuegen', basisWert: 450, schwierigkeit: 4, minLevel: 8 },
  { name: 'Jagdbuegen', basisWert: 640, schwierigkeit: 5, minLevel: 12 },
  { name: 'Elfenbuegen', basisWert: 920, schwierigkeit: 6, minLevel: 16 },
  { name: 'Mondbuegen', basisWert: 1300, schwierigkeit: 7, minLevel: 21 },
  { name: 'Legendaerer Aetherbogen', basisWert: 1900, schwierigkeit: 8, minLevel: 28 },
];

const SEHNEN = [
  { name: 'Hanfsehne', bonus: 1.0, minLevel: 1 },
  { name: 'Ledersehne', bonus: 1.2, minLevel: 3 },
  { name: 'Tierdarm-Sehne', bonus: 1.5, minLevel: 5 },
  { name: 'Stahlsehne', bonus: 1.9, minLevel: 8 },
  { name: 'Silbersehne', bonus: 2.4, minLevel: 12 },
  { name: 'Goldsehne', bonus: 3.0, minLevel: 16 },
  { name: 'Mithrilsehne', bonus: 3.8, minLevel: 21 },
  { name: 'Aethersehne', bonus: 5.0, minLevel: 28 },
];

const QUALITAETEN = [
  { name: 'Wackelig', multi: 0.3, minRoll: 0 },
  { name: 'Schwach', multi: 0.6, minRoll: 15 },
  { name: 'Einfach', multi: 0.9, minRoll: 30 },
  { name: 'Stabil', multi: 1.2, minRoll: 45 },
  { name: 'Kraftvoll', multi: 1.6, minRoll: 62 },
  { name: 'Praezise', multi: 2.1, minRoll: 78 },
  { name: 'Meisterhaft', multi: 3.2, minRoll: 92 },
];

const UPGRADES = {
  hobelbank: { name: 'Hobelbank', stufen: [0, 300, 800, 2000, 5000], bonus: [0, 0.1, 0.2, 0.35, 0.5] },
  spannvorrichtung: { name: 'Spannvorrichtung', stufen: [0, 500, 1250, 3100, 7500], bonus: [0, 0.08, 0.18, 0.3, 0.45] },
  schnitzmesser: { name: 'Schnitzmesser', stufen: [0, 400, 1000, 2500, 6000], bonus: [0, 0.06, 0.14, 0.25, 0.4] },
  werkstatt: { name: 'Werkstatt', stufen: [0, 1000, 2500, 6000, 15000], bonus: [0, 0.12, 0.25, 0.4, 0.6] },
};

const BOGNER_EVENTS = [
  { text: 'Das Holz bricht beim Biegen!', qualMulti: 0.5, geldMulti: 0.7 },
  { text: 'Der Bogen hat die perfekte Spannung!', qualMulti: 1.5, geldMulti: 1.2 },
  { text: 'Die Sehne reisst beim Aufziehen.', qualMulti: 0.8, geldMulti: 0.9 },
  { text: 'Meisterhafter Bogenbau!', qualMulti: 2.0, geldMulti: 1.5 },
  { text: 'Das Holz hat eine wunderschoene Maserung.', qualMulti: 1.3, geldMulti: 1.1 },
  { text: 'Ein Ast bricht und schwacht den Bogen.', qualMulti: 0.7, geldMulti: 0.85 },
  { text: 'Der Bogen ist ein wahres Kunstwerk!', qualMulti: 1.8, geldMulti: 1.4 },
];

const cooldowns = new Map();

function ensureBognerTable() {
  db.db.exec(`CREATE TABLE IF NOT EXISTS bogner (
    userId TEXT PRIMARY KEY,
    geld INTEGER DEFAULT 0,
    holz INTEGER DEFAULT 0,
    holzTyp INTEGER DEFAULT 0,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    auftraege INTEGER DEFAULT 0,
    duelle INTEGER DEFAULT 0,
    siege INTEGER DEFAULT 0,
    upg_hobelbank INTEGER DEFAULT 0,
    upg_spannvorrichtung INTEGER DEFAULT 0,
    upg_schnitzmesser INTEGER DEFAULT 0,
    upg_werkstatt INTEGER DEFAULT 0
  )`);
  db.db.exec(`CREATE TABLE IF NOT EXISTS bogner_arsenal (
    userId TEXT PRIMARY KEY,
    bogen0 INTEGER DEFAULT 0,
    bogen1 INTEGER DEFAULT 0,
    bogen2 INTEGER DEFAULT 0,
    bogen3 INTEGER DEFAULT 0,
    bogen4 INTEGER DEFAULT 0,
    bogen5 INTEGER DEFAULT 0,
    bogen6 INTEGER DEFAULT 0,
    bogen7 INTEGER DEFAULT 0
  )`);
}

function getBogner(uId) {
  let row = db.db.prepare('SELECT * FROM bogner WHERE userId = ?').get(uId);
  if (!row) {
    db.db.prepare('INSERT INTO bogner (userId) VALUES (?)').run(uId);
    row = db.db.prepare('SELECT * FROM bogner WHERE userId = ?').get(uId);
  }
  return row;
}

function getArsenal(uId) {
  let row = db.db.prepare('SELECT * FROM bogner_arsenal WHERE userId = ?').get(uId);
  if (!row) {
    db.db.prepare('INSERT INTO bogner_arsenal (userId) VALUES (?)').run(uId);
    row = db.db.prepare('SELECT * FROM bogner_arsenal WHERE userId = ?').get(uId);
  }
  return row;
}

function xpForLevel(l) { return l * l * 52; }

function checkLevelUp(uId, bo) {
  let lvl = bo.level;
  let ups = 0;
  while (bo.xp >= xpForLevel(lvl)) {
    bo.xp -= xpForLevel(lvl);
    lvl++;
    ups++;
  }
  if (ups > 0) {
    db.db.prepare('UPDATE bogner SET level = ?, xp = ? WHERE userId = ?').run(lvl, bo.xp, uId);
  }
  return { lvl, ups };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bogner')
    .setDescription('Werde ein Bogner und fertige maechtigen Bogen fuer Helden und Jaeger!')
    .addSubcommand(s => s.setName('start').setDescription('Beginne deine Bogner-Karriere'))
    .addSubcommand(s => s.setName('status').setDescription('Zeige deinen Bogner-Status'))
    .addSubcommand(s => s.setName('hoelzer').setDescription('Liste alle verfuegbaren Bogenbauhoelzer'))
    .addSubcommand(s => s.setName('kaufen').setDescription('Kaufe Holz').addIntegerOption(o => o.setName('holz').setDescription('Holz-Typ (1-8)').setRequired(true)).addIntegerOption(o => o.setName('menge').setDescription('Menge').setRequired(true)))
    .addSubcommand(s => s.setName('spannen').setDescription('Baue einen Bogen').addIntegerOption(o => o.setName('bogen').setDescription('Bogen-Typ (1-8)').setRequired(true)).addIntegerOption(o => o.setName('sehne').setDescription('Sehnen-Typ (1-8)').setRequired(true)))
    .addSubcommand(s => s.setName('training').setDescription('Verbessere deine Faehigkeiten').addStringOption(o => o.setName('art').setDescription('Trainingsart').setRequired(true).addChoices({ name: 'Biegen', value: 'biegen' }, { name: 'Schnitzen', value: 'schnitzen' }, { name: 'Spannen', value: 'spannen' })))
    .addSubcommand(s => s.setName('upgrade').setDescription('Verbessere deine Werkzeuge').addStringOption(o => o.setName('slot').setDescription('Upgrade-Slot').setRequired(true).addChoices({ name: 'Hobelbank', value: 'hobelbank' }, { name: 'Spannvorrichtung', value: 'spannvorrichtung' }, { name: 'Schnitzmesser', value: 'schnitzmesser' }, { name: 'Werkstatt', value: 'werkstatt' })))
    .addSubcommand(s => s.setName('arsenal').setDescription('Zeige dein Bogenarsenal'))
    .addSubcommand(s => s.setName('auftrag').setDescription('Nimm einen Auftrag an'))
    .addSubcommand(s => s.setName('duell').setDescription('Fordere einen anderen Bogner heraus').addUserOption(o => o.setName('gegner').setDescription('Dein Gegner').setRequired(true))),

  async execute(interaction) {
    const config = require('../config.json');
    ensureBognerTable();
    const uId = interaction.user.id;
    const sub = interaction.options.getSubcommand();

    if (sub === 'start') {
      const existing = db.db.prepare('SELECT userId FROM bogner WHERE userId = ?').get(uId);
      if (existing) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x228B22).setTitle('Bogner').setDescription('Du bist bereits Bogner!')] });
      }
      db.db.prepare('INSERT INTO bogner (userId) VALUES (?)').run(uId);
      db.db.prepare('INSERT INTO bogner_arsenal (userId) VALUES (?)').run(uId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x228B22).setTitle('Willkommen, Bogner!').setDescription('Du hast deine Bognerwerkstatt eroeffnet!\nBenutze `/bogner kaufen` um Holz zu kaufen.\nDann `/bogner spannen` um Bogen herzustellen!')] });
    }

    if (sub === 'hoelzer') {
      const lines = HOELZER.map((h, i) => `${h.emoji} **${i + 1}. ${h.name}** — ${h.preis} Muenzen | Qualitaet: ${h.qualitaet}x`);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x228B22).setTitle('🏹 Bogenbauhoelzer').setDescription(lines.join('\n'))] });
    }

    const bo = getBogner(uId);

    if (sub === 'status') {
      const upgLines = Object.entries(UPGRADES).map(([k, u]) => `${u.name}: Stufe ${bo[`upg_${k}`]}`);
      const embed = new EmbedBuilder()
        .setColor(0x228B22)
        .setTitle(`🏹 Bogner — ${interaction.user.username}`)
        .addFields(
          { name: 'Level', value: `${bo.level}`, inline: true },
          { name: 'XP', value: `${bo.xp}/${xpForLevel(bo.level)}`, inline: true },
          { name: 'Muenzen', value: `${bo.geld}`, inline: true },
          { name: 'Holz', value: `${bo.holz}x ${bo.holzTyp > 0 ? HOELZER[bo.holzTyp - 1].name : 'Keines'}`, inline: true },
          { name: 'Auftraege', value: `${bo.auftraege}`, inline: true },
          { name: 'Duelle', value: `${bo.duelle} (${bo.siege} Siege)`, inline: true },
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
      if (bo.geld < kosten) return interaction.reply({ content: `Nicht genug Muenzen! Du brauchst ${kosten}, hast aber ${bo.geld}.`, ephemeral: true });
      db.db.prepare('UPDATE bogner SET geld = geld - ?, holz = holz + ?, holzTyp = ? WHERE userId = ?').run(kosten, menge, holzIdx + 1, uId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x228B22).setTitle('Holz gekauft').setDescription(`Du hast ${menge}x ${holz.emoji} ${holz.name} fuer ${kosten} Muenzen gekauft!`)] });
    }

    if (sub === 'spannen') {
      const now = Date.now();
      const cd = cooldowns.get(uId) || 0;
      if (now - cd < 30000) {
        const left = Math.ceil((30000 - (now - cd)) / 1000);
        return interaction.reply({ content: `Noch ${left}s Abkuehlung!`, ephemeral: true });
      }
      const bogenIdx = interaction.options.getInteger('bogen') - 1;
      const sehneIdx = interaction.options.getInteger('sehne') - 1;
      if (bogenIdx < 0 || bogenIdx >= BOGENARTEN.length) return interaction.reply({ content: 'Ungueltiger Bogen-Typ (1-8)!', ephemeral: true });
      if (sehneIdx < 0 || sehneIdx >= SEHNEN.length) return interaction.reply({ content: 'Ungueltiger Sehnen-Typ (1-8)!', ephemeral: true });
      const bogenart = BOGENARTEN[bogenIdx];
      const sehne = SEHNEN[sehneIdx];
      if (bo.level < bogenart.minLevel) return interaction.reply({ content: `Du brauchst Level ${bogenart.minLevel} fuer ${bogenart.name}!`, ephemeral: true });
      if (bo.level < sehne.minLevel) return interaction.reply({ content: `Du brauchst Level ${sehne.minLevel} fuer ${sehne.name}!`, ephemeral: true });
      if (bo.holz < bogenart.schwierigkeit) return interaction.reply({ content: `Du brauchst ${bogenart.schwierigkeit} Holz fuer diesen Bogen!`, ephemeral: true });
      const holz = bo.holzTyp > 0 ? HOELZER[bo.holzTyp - 1] : HOELZER[0];
      const upgBonus = (UPGRADES.hobelbank.bonus[bo.upg_hobelbank] || 0) + (UPGRADES.spannvorrichtung.bonus[bo.upg_spannvorrichtung] || 0) + (UPGRADES.schnitzmesser.bonus[bo.upg_schnitzmesser] || 0) + (UPGRADES.werkstatt.bonus[bo.upg_werkstatt] || 0);
      const rollBase = Math.random() * 100;
      const roll = Math.min(99, rollBase + upgBonus * 20);
      const event = BOGNER_EVENTS[Math.floor(Math.random() * BOGNER_EVENTS.length)];
      let qual = QUALITAETEN[0];
      for (const q of QUALITAETEN) { if (roll >= q.minRoll) qual = q; }
      const wert = Math.floor(bogenart.basisWert * holz.qualitaet * sehne.bonus * qual.multi * event.qualMulti * event.geldMulti);
      const xpGain = Math.floor(bogenart.schwierigkeit * 20 * holz.qualitaet);
      db.db.prepare('UPDATE bogner SET holz = holz - ?, geld = geld + ?, xp = xp + ? WHERE userId = ?').run(bogenart.schwierigkeit, wert, xpGain, uId);
      const updBo = getBogner(uId);
      const { lvl, ups } = checkLevelUp(uId, updBo);
      const col = `bogen${bogenIdx}`;
      db.db.prepare(`UPDATE bogner_arsenal SET ${col} = ${col} + 1 WHERE userId = ?`).run(uId);
      cooldowns.set(uId, now);
      const embed = new EmbedBuilder()
        .setColor(0x228B22)
        .setTitle('🏹 Bogen gefertigt!')
        .setDescription(`${event.text}`)
        .addFields(
          { name: 'Bogen', value: bogenart.name, inline: true },
          { name: 'Holz', value: `${holz.emoji} ${holz.name}`, inline: true },
          { name: 'Sehne', value: sehne.name, inline: true },
          { name: 'Qualitaet', value: qual.name, inline: true },
          { name: 'Wert', value: `${wert} Muenzen`, inline: true },
          { name: 'XP', value: `+${xpGain}`, inline: true },
        );
      if (ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${lvl}!` });
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'training') {
      const art = interaction.options.getString('art');
      const kosten = 50 + bo.level * 20;
      if (bo.geld < kosten) return interaction.reply({ content: `Training kostet ${kosten} Muenzen!`, ephemeral: true });
      const xpGain = 30 + bo.level * 10;
      db.db.prepare('UPDATE bogner SET geld = geld - ?, xp = xp + ? WHERE userId = ?').run(kosten, xpGain, uId);
      const updBo = getBogner(uId);
      const { lvl, ups } = checkLevelUp(uId, updBo);
      const embed = new EmbedBuilder().setColor(0x228B22).setTitle('Training').setDescription(`Du hast ${art === 'biegen' ? 'Biegen' : art === 'schnitzen' ? 'Schnitzen' : 'Spannen'} trainiert!\n+${xpGain} XP | -${kosten} Muenzen`);
      if (ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${lvl}!` });
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'upgrade') {
      const slot = interaction.options.getString('slot');
      const upg = UPGRADES[slot];
      const curStufe = bo[`upg_${slot}`];
      if (curStufe >= upg.stufen.length - 1) return interaction.reply({ content: 'Maximale Stufe erreicht!', ephemeral: true });
      const kosten = upg.stufen[curStufe + 1];
      if (bo.geld < kosten) return interaction.reply({ content: `Upgrade kostet ${kosten} Muenzen!`, ephemeral: true });
      db.db.prepare(`UPDATE bogner SET geld = geld - ?, upg_${slot} = upg_${slot} + 1 WHERE userId = ?`).run(kosten, uId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x228B22).setTitle('Upgrade').setDescription(`${upg.name} auf Stufe ${curStufe + 1} verbessert!`)] });
    }

    if (sub === 'arsenal') {
      const arsenal = getArsenal(uId);
      const lines = BOGENARTEN.map((b, i) => `${b.name}: ${arsenal[`bogen${i}`] || 0}x`);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x228B22).setTitle('🏹 Bogenarsenal').setDescription(lines.join('\n'))] });
    }

    if (sub === 'auftrag') {
      const now = Date.now();
      const cdKey = `auftrag_${uId}`;
      const cd = cooldowns.get(cdKey) || 0;
      if (now - cd < 60000) {
        const left = Math.ceil((60000 - (now - cd)) / 1000);
        return interaction.reply({ content: `Naechster Auftrag in ${left}s!`, ephemeral: true });
      }
      const bogenIdx = Math.min(Math.max(0, bo.level - 1), BOGENARTEN.length - 1);
      const bogenart = BOGENARTEN[bogenIdx];
      const menge = 1 + Math.floor(Math.random() * 2);
      const arsenal = getArsenal(uId);
      const vorrat = arsenal[`bogen${bogenIdx}`] || 0;
      if (vorrat < menge) return interaction.reply({ content: `Auftrag: ${menge}x ${bogenart.name}. Dir fehlen noch ${menge - vorrat}!`, ephemeral: false });
      const belohnung = Math.floor(bogenart.basisWert * menge * 1.3);
      const xpGain = bogenart.schwierigkeit * menge * 15;
      db.db.prepare(`UPDATE bogner_arsenal SET bogen${bogenIdx} = bogen${bogenIdx} - ? WHERE userId = ?`).run(menge, uId);
      db.db.prepare('UPDATE bogner SET geld = geld + ?, xp = xp + ?, auftraege = auftraege + 1 WHERE userId = ?').run(belohnung, xpGain, uId);
      const updBo = getBogner(uId);
      const { lvl, ups } = checkLevelUp(uId, updBo);
      cooldowns.set(cdKey, now);
      const embed = new EmbedBuilder().setColor(0x228B22).setTitle('📋 Auftrag erfuellt!').setDescription(`${menge}x ${bogenart.name} geliefert!\n+${belohnung} Muenzen | +${xpGain} XP`);
      if (ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${lvl}!` });
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'duell') {
      const gegner = interaction.options.getUser('gegner');
      if (gegner.id === uId) return interaction.reply({ content: 'Du kannst nicht gegen dich selbst kaempfen!', ephemeral: true });
      const gBo = db.db.prepare('SELECT * FROM bogner WHERE userId = ?').get(gegner.id);
      if (!gBo) return interaction.reply({ content: 'Dein Gegner ist noch kein Bogner!', ephemeral: true });
      const myScore = bo.level * 10 + Math.random() * 50;
      const gScore = gBo.level * 10 + Math.random() * 50;
      const gewonnen = myScore > gScore;
      const belohnung = gewonnen ? Math.floor(50 + bo.level * 15) : 0;
      const xpGain = gewonnen ? 40 + bo.level * 10 : 10;
      db.db.prepare('UPDATE bogner SET geld = geld + ?, xp = xp + ?, duelle = duelle + 1, siege = siege + ? WHERE userId = ?').run(belohnung, xpGain, gewonnen ? 1 : 0, uId);
      const updBo = getBogner(uId);
      const { lvl, ups } = checkLevelUp(uId, updBo);
      const embed = new EmbedBuilder()
        .setColor(gewonnen ? 0x00FF00 : 0xFF0000)
        .setTitle(gewonnen ? '⚔️ Duell gewonnen!' : '⚔️ Duell verloren!')
        .setDescription(`${gewonnen ? `Du hast ${gegner.username} besiegt!` : `${gegner.username} hat gewonnen!`}\n${gewonnen ? `+${belohnung} Muenzen | ` : ''}+${xpGain} XP`);
      if (ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${lvl}!` });
      return interaction.reply({ embeds: [embed] });
    }
  },
};
