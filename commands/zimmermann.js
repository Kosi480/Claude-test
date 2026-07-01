const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

const BAUHOELZER = [
  { name: 'Kiefer', preis: 15, qualitaet: 1.0, emoji: '🌲' },
  { name: 'Fichte', preis: 30, qualitaet: 1.2, emoji: '🎄' },
  { name: 'Laerche', preis: 55, qualitaet: 1.5, emoji: '🍂' },
  { name: 'Eiche', preis: 90, qualitaet: 1.9, emoji: '🌳' },
  { name: 'Teak', preis: 145, qualitaet: 2.5, emoji: '🌴' },
  { name: 'Elfenholz', preis: 230, qualitaet: 3.2, emoji: '✨' },
  { name: 'Mondholz', preis: 370, qualitaet: 4.1, emoji: '🌙' },
  { name: 'Aetherholz', preis: 600, qualitaet: 5.5, emoji: '🔮' },
];

const BAUWERKTEILE = [
  { name: 'Balken', basisWert: 50, schwierigkeit: 1, minLevel: 1 },
  { name: 'Dachstuhl', basisWert: 100, schwierigkeit: 2, minLevel: 3 },
  { name: 'Fachwerk', basisWert: 170, schwierigkeit: 3, minLevel: 5 },
  { name: 'Holzbruecke', basisWert: 260, schwierigkeit: 4, minLevel: 8 },
  { name: 'Wasserrad', basisWert: 390, schwierigkeit: 5, minLevel: 12 },
  { name: 'Windmuehle', basisWert: 580, schwierigkeit: 6, minLevel: 16 },
  { name: 'Holzturm', basisWert: 860, schwierigkeit: 7, minLevel: 21 },
  { name: 'Legendaeres Aethergebaeude', basisWert: 1280, schwierigkeit: 8, minLevel: 28 },
];

const VERBINDUNGEN = [
  { name: 'Eisennagel', bonus: 1.0, minLevel: 1 },
  { name: 'Holzduebel', bonus: 1.2, minLevel: 3 },
  { name: 'Stahlschraube', bonus: 1.5, minLevel: 5 },
  { name: 'Schwalbenschwanz', bonus: 1.9, minLevel: 8 },
  { name: 'Silberklammer', bonus: 2.4, minLevel: 12 },
  { name: 'Goldklammer', bonus: 3.0, minLevel: 16 },
  { name: 'Mithrilverbund', bonus: 3.8, minLevel: 21 },
  { name: 'Aetherverankerung', bonus: 5.0, minLevel: 28 },
];

const QUALITAETEN = [
  { name: 'Wackelig', multi: 0.3, minRoll: 0 },
  { name: 'Grob', multi: 0.6, minRoll: 15 },
  { name: 'Einfach', multi: 0.9, minRoll: 30 },
  { name: 'Solide', multi: 1.2, minRoll: 45 },
  { name: 'Stabil', multi: 1.6, minRoll: 62 },
  { name: 'Prachtvoll', multi: 2.1, minRoll: 78 },
  { name: 'Meisterhaft', multi: 3.2, minRoll: 92 },
];

const UPGRADES = {
  saege: { name: 'Zimmermannssaege', stufen: [0, 200, 530, 1350, 3400], bonus: [0, 0.1, 0.2, 0.35, 0.5] },
  richtwaage: { name: 'Richtwaage', stufen: [0, 360, 900, 2300, 5500], bonus: [0, 0.08, 0.18, 0.3, 0.45] },
  bohrwinde: { name: 'Bohrwinde', stufen: [0, 280, 720, 1800, 4400], bonus: [0, 0.06, 0.14, 0.25, 0.4] },
  werkstatt: { name: 'Zimmerei', stufen: [0, 720, 1800, 4400, 10800], bonus: [0, 0.12, 0.25, 0.4, 0.6] },
};

const ZIMMER_EVENTS = [
  { text: 'Der Balken ist verzogen!', qualMulti: 0.5, geldMulti: 0.7 },
  { text: 'Alle Verbindungen sitzen makellos!', qualMulti: 1.5, geldMulti: 1.2 },
  { text: 'Ein Nagel splittert das Holz.', qualMulti: 0.8, geldMulti: 0.9 },
  { text: 'Meisterhaftes Zimmerwerk!', qualMulti: 2.0, geldMulti: 1.5 },
  { text: 'Das Holz duftet wunderbar frisch.', qualMulti: 1.3, geldMulti: 1.1 },
  { text: 'Ein Riss im Holz erfordert Nacharbeit.', qualMulti: 0.7, geldMulti: 0.85 },
  { text: 'Das Bauwerk steht wie ein Fels!', qualMulti: 1.8, geldMulti: 1.4 },
];

const cooldowns = new Map();

function ensureZimmermannTable() {
  db.db.exec(`CREATE TABLE IF NOT EXISTS zimmermann (
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
    upg_richtwaage INTEGER DEFAULT 0,
    upg_bohrwinde INTEGER DEFAULT 0,
    upg_werkstatt INTEGER DEFAULT 0
  )`);
  db.db.exec(`CREATE TABLE IF NOT EXISTS zimmermann_depot (
    userId TEXT PRIMARY KEY,
    teil0 INTEGER DEFAULT 0,
    teil1 INTEGER DEFAULT 0,
    teil2 INTEGER DEFAULT 0,
    teil3 INTEGER DEFAULT 0,
    teil4 INTEGER DEFAULT 0,
    teil5 INTEGER DEFAULT 0,
    teil6 INTEGER DEFAULT 0,
    teil7 INTEGER DEFAULT 0
  )`);
}

function getZimmermann(uId) {
  let row = db.db.prepare('SELECT * FROM zimmermann WHERE userId = ?').get(uId);
  if (!row) {
    db.db.prepare('INSERT INTO zimmermann (userId) VALUES (?)').run(uId);
    row = db.db.prepare('SELECT * FROM zimmermann WHERE userId = ?').get(uId);
  }
  return row;
}

function getDepot(uId) {
  let row = db.db.prepare('SELECT * FROM zimmermann_depot WHERE userId = ?').get(uId);
  if (!row) {
    db.db.prepare('INSERT INTO zimmermann_depot (userId) VALUES (?)').run(uId);
    row = db.db.prepare('SELECT * FROM zimmermann_depot WHERE userId = ?').get(uId);
  }
  return row;
}

function xpForLevel(l) { return l * l * 50; }

function checkLevelUp(uId, zm) {
  let lvl = zm.level;
  let ups = 0;
  while (zm.xp >= xpForLevel(lvl)) {
    zm.xp -= xpForLevel(lvl);
    lvl++;
    ups++;
  }
  if (ups > 0) {
    db.db.prepare('UPDATE zimmermann SET level = ?, xp = ? WHERE userId = ?').run(lvl, zm.xp, uId);
  }
  return { lvl, ups };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('zimmermann')
    .setDescription('Werde ein Zimmermann und errichte maechtigen Holzbauwerken!')
    .addSubcommand(s => s.setName('start').setDescription('Beginne deine Zimmermann-Karriere'))
    .addSubcommand(s => s.setName('status').setDescription('Zeige deinen Zimmermann-Status'))
    .addSubcommand(s => s.setName('holzsorten').setDescription('Liste alle verfuegbaren Bauholzarten'))
    .addSubcommand(s => s.setName('kaufen').setDescription('Kaufe Bauholz').addIntegerOption(o => o.setName('holz').setDescription('Holz-Typ (1-8)').setRequired(true)).addIntegerOption(o => o.setName('menge').setDescription('Menge').setRequired(true)))
    .addSubcommand(s => s.setName('zimmern').setDescription('Zimmere ein Bauwerkteil').addIntegerOption(o => o.setName('teil').setDescription('Bauteil-Typ (1-8)').setRequired(true)).addIntegerOption(o => o.setName('verbindung').setDescription('Verbindungs-Typ (1-8)').setRequired(true)))
    .addSubcommand(s => s.setName('training').setDescription('Verbessere deine Faehigkeiten').addStringOption(o => o.setName('art').setDescription('Trainingsart').setRequired(true).addChoices({ name: 'Saegen', value: 'saegen' }, { name: 'Stemmen', value: 'stemmen' }, { name: 'Richten', value: 'richten' })))
    .addSubcommand(s => s.setName('upgrade').setDescription('Verbessere deine Zimmerei').addStringOption(o => o.setName('slot').setDescription('Upgrade-Slot').setRequired(true).addChoices({ name: 'Saege', value: 'saege' }, { name: 'Richtwaage', value: 'richtwaage' }, { name: 'Bohrwinde', value: 'bohrwinde' }, { name: 'Zimmerei', value: 'werkstatt' })))
    .addSubcommand(s => s.setName('depot').setDescription('Zeige dein Baudepot'))
    .addSubcommand(s => s.setName('auftrag').setDescription('Nimm einen Bauauftrag an'))
    .addSubcommand(s => s.setName('duell').setDescription('Fordere einen anderen Zimmermann heraus').addUserOption(o => o.setName('gegner').setDescription('Dein Gegner').setRequired(true))),

  async execute(interaction) {
    const config = require('../config.json');
    ensureZimmermannTable();
    const uId = interaction.user.id;
    const sub = interaction.options.getSubcommand();

    if (sub === 'start') {
      const existing = db.db.prepare('SELECT userId FROM zimmermann WHERE userId = ?').get(uId);
      if (existing) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xDEB887).setTitle('Zimmermann').setDescription('Du bist bereits Zimmermann!')] });
      }
      db.db.prepare('INSERT INTO zimmermann (userId) VALUES (?)').run(uId);
      db.db.prepare('INSERT INTO zimmermann_depot (userId) VALUES (?)').run(uId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xDEB887).setTitle('Willkommen, Zimmermann!').setDescription('Du hast deine Zimmerei eroeffnet!\nBenutze `/zimmermann kaufen` um Bauholz zu kaufen.\nDann `/zimmermann zimmern` um Bauteile herzustellen!')] });
    }

    if (sub === 'holzsorten') {
      const lines = BAUHOELZER.map((h, i) => `${h.emoji} **${i + 1}. ${h.name}** — ${h.preis} Muenzen | Qualitaet: ${h.qualitaet}x`);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xDEB887).setTitle('🪵 Bauholzarten').setDescription(lines.join('\n'))] });
    }

    const zm = getZimmermann(uId);

    if (sub === 'status') {
      const upgLines = Object.entries(UPGRADES).map(([k, u]) => `${u.name}: Stufe ${zm[`upg_${k}`]}`);
      const embed = new EmbedBuilder()
        .setColor(0xDEB887)
        .setTitle(`🪵 Zimmermann — ${interaction.user.username}`)
        .addFields(
          { name: 'Level', value: `${zm.level}`, inline: true },
          { name: 'XP', value: `${zm.xp}/${xpForLevel(zm.level)}`, inline: true },
          { name: 'Muenzen', value: `${zm.geld}`, inline: true },
          { name: 'Holz', value: `${zm.holz}x ${zm.holzTyp > 0 ? BAUHOELZER[zm.holzTyp - 1].name : 'Keines'}`, inline: true },
          { name: 'Auftraege', value: `${zm.auftraege}`, inline: true },
          { name: 'Duelle', value: `${zm.duelle} (${zm.siege} Siege)`, inline: true },
          { name: 'Upgrades', value: upgLines.join('\n'), inline: false },
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'kaufen') {
      const holzIdx = interaction.options.getInteger('holz') - 1;
      const menge = interaction.options.getInteger('menge');
      if (holzIdx < 0 || holzIdx >= BAUHOELZER.length) return interaction.reply({ content: 'Ungueltiger Holz-Typ (1-8)!', ephemeral: true });
      if (menge < 1 || menge > 100) return interaction.reply({ content: 'Menge muss zwischen 1 und 100 liegen!', ephemeral: true });
      const holz = BAUHOELZER[holzIdx];
      const kosten = holz.preis * menge;
      if (zm.geld < kosten) return interaction.reply({ content: `Nicht genug Muenzen! Du brauchst ${kosten}, hast aber ${zm.geld}.`, ephemeral: true });
      db.db.prepare('UPDATE zimmermann SET geld = geld - ?, holz = holz + ?, holzTyp = ? WHERE userId = ?').run(kosten, menge, holzIdx + 1, uId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xDEB887).setTitle('Holz gekauft').setDescription(`Du hast ${menge}x ${holz.emoji} ${holz.name} fuer ${kosten} Muenzen gekauft!`)] });
    }

    if (sub === 'zimmern') {
      const now = Date.now();
      const cd = cooldowns.get(uId) || 0;
      if (now - cd < 30000) {
        const left = Math.ceil((30000 - (now - cd)) / 1000);
        return interaction.reply({ content: `Noch ${left}s Abkuehlung!`, ephemeral: true });
      }
      const teilIdx = interaction.options.getInteger('teil') - 1;
      const verbindungIdx = interaction.options.getInteger('verbindung') - 1;
      if (teilIdx < 0 || teilIdx >= BAUWERKTEILE.length) return interaction.reply({ content: 'Ungueltiger Bauteil-Typ (1-8)!', ephemeral: true });
      if (verbindungIdx < 0 || verbindungIdx >= VERBINDUNGEN.length) return interaction.reply({ content: 'Ungueltiger Verbindungs-Typ (1-8)!', ephemeral: true });
      const teil = BAUWERKTEILE[teilIdx];
      const verbindung = VERBINDUNGEN[verbindungIdx];
      if (zm.level < teil.minLevel) return interaction.reply({ content: `Du brauchst Level ${teil.minLevel} fuer ${teil.name}!`, ephemeral: true });
      if (zm.level < verbindung.minLevel) return interaction.reply({ content: `Du brauchst Level ${verbindung.minLevel} fuer ${verbindung.name}!`, ephemeral: true });
      if (zm.holz < teil.schwierigkeit) return interaction.reply({ content: `Du brauchst ${teil.schwierigkeit} Holz fuer dieses Bauteil!`, ephemeral: true });
      const holz = zm.holzTyp > 0 ? BAUHOELZER[zm.holzTyp - 1] : BAUHOELZER[0];
      const upgBonus = (UPGRADES.saege.bonus[zm.upg_saege] || 0) + (UPGRADES.richtwaage.bonus[zm.upg_richtwaage] || 0) + (UPGRADES.bohrwinde.bonus[zm.upg_bohrwinde] || 0) + (UPGRADES.werkstatt.bonus[zm.upg_werkstatt] || 0);
      const rollBase = Math.random() * 100;
      const roll = Math.min(99, rollBase + upgBonus * 20);
      const event = ZIMMER_EVENTS[Math.floor(Math.random() * ZIMMER_EVENTS.length)];
      let qual = QUALITAETEN[0];
      for (const q of QUALITAETEN) { if (roll >= q.minRoll) qual = q; }
      const wert = Math.floor(teil.basisWert * holz.qualitaet * verbindung.bonus * qual.multi * event.qualMulti * event.geldMulti);
      const xpGain = Math.floor(teil.schwierigkeit * 20 * holz.qualitaet);
      db.db.prepare('UPDATE zimmermann SET holz = holz - ?, geld = geld + ?, xp = xp + ? WHERE userId = ?').run(teil.schwierigkeit, wert, xpGain, uId);
      const updZm = getZimmermann(uId);
      const { lvl, ups } = checkLevelUp(uId, updZm);
      const col = `teil${teilIdx}`;
      db.db.prepare(`UPDATE zimmermann_depot SET ${col} = ${col} + 1 WHERE userId = ?`).run(uId);
      cooldowns.set(uId, now);
      const embed = new EmbedBuilder()
        .setColor(0xDEB887)
        .setTitle('🪵 Bauteil gezimmert!')
        .setDescription(`${event.text}`)
        .addFields(
          { name: 'Bauteil', value: teil.name, inline: true },
          { name: 'Holz', value: `${holz.emoji} ${holz.name}`, inline: true },
          { name: 'Verbindung', value: verbindung.name, inline: true },
          { name: 'Qualitaet', value: qual.name, inline: true },
          { name: 'Wert', value: `${wert} Muenzen`, inline: true },
          { name: 'XP', value: `+${xpGain}`, inline: true },
        );
      if (ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${lvl}!` });
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'training') {
      const art = interaction.options.getString('art');
      const kosten = 50 + zm.level * 20;
      if (zm.geld < kosten) return interaction.reply({ content: `Training kostet ${kosten} Muenzen!`, ephemeral: true });
      const xpGain = 30 + zm.level * 10;
      db.db.prepare('UPDATE zimmermann SET geld = geld - ?, xp = xp + ? WHERE userId = ?').run(kosten, xpGain, uId);
      const updZm = getZimmermann(uId);
      const { lvl, ups } = checkLevelUp(uId, updZm);
      const embed = new EmbedBuilder().setColor(0xDEB887).setTitle('Training').setDescription(`Du hast ${art === 'saegen' ? 'Saegen' : art === 'stemmen' ? 'Stemmen' : 'Richten'} trainiert!\n+${xpGain} XP | -${kosten} Muenzen`);
      if (ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${lvl}!` });
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'upgrade') {
      const slot = interaction.options.getString('slot');
      const upg = UPGRADES[slot];
      const curStufe = zm[`upg_${slot}`];
      if (curStufe >= upg.stufen.length - 1) return interaction.reply({ content: 'Maximale Stufe erreicht!', ephemeral: true });
      const kosten = upg.stufen[curStufe + 1];
      if (zm.geld < kosten) return interaction.reply({ content: `Upgrade kostet ${kosten} Muenzen!`, ephemeral: true });
      db.db.prepare(`UPDATE zimmermann SET geld = geld - ?, upg_${slot} = upg_${slot} + 1 WHERE userId = ?`).run(kosten, uId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xDEB887).setTitle('Upgrade').setDescription(`${upg.name} auf Stufe ${curStufe + 1} verbessert!`)] });
    }

    if (sub === 'depot') {
      const depot = getDepot(uId);
      const lines = BAUWERKTEILE.map((t, i) => `${t.name}: ${depot[`teil${i}`] || 0}x`);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xDEB887).setTitle('🪵 Baudepot').setDescription(lines.join('\n'))] });
    }

    if (sub === 'auftrag') {
      const now = Date.now();
      const cdKey = `auftrag_${uId}`;
      const cd = cooldowns.get(cdKey) || 0;
      if (now - cd < 60000) {
        const left = Math.ceil((60000 - (now - cd)) / 1000);
        return interaction.reply({ content: `Naechster Auftrag in ${left}s!`, ephemeral: true });
      }
      const teilIdx = Math.min(Math.max(0, zm.level - 1), BAUWERKTEILE.length - 1);
      const teil = BAUWERKTEILE[teilIdx];
      const menge = 1 + Math.floor(Math.random() * 2);
      const depot = getDepot(uId);
      const vorrat = depot[`teil${teilIdx}`] || 0;
      if (vorrat < menge) return interaction.reply({ content: `Auftrag: ${menge}x ${teil.name}. Dir fehlen noch ${menge - vorrat}!`, ephemeral: false });
      const belohnung = Math.floor(teil.basisWert * menge * 1.3);
      const xpGain = teil.schwierigkeit * menge * 15;
      db.db.prepare(`UPDATE zimmermann_depot SET teil${teilIdx} = teil${teilIdx} - ? WHERE userId = ?`).run(menge, uId);
      db.db.prepare('UPDATE zimmermann SET geld = geld + ?, xp = xp + ?, auftraege = auftraege + 1 WHERE userId = ?').run(belohnung, xpGain, uId);
      const updZm = getZimmermann(uId);
      const { lvl, ups } = checkLevelUp(uId, updZm);
      cooldowns.set(cdKey, now);
      const embed = new EmbedBuilder().setColor(0xDEB887).setTitle('📋 Auftrag erfuellt!').setDescription(`${menge}x ${teil.name} fertiggestellt!\n+${belohnung} Muenzen | +${xpGain} XP`);
      if (ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${lvl}!` });
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'duell') {
      const gegner = interaction.options.getUser('gegner');
      if (gegner.id === uId) return interaction.reply({ content: 'Du kannst nicht gegen dich selbst kaempfen!', ephemeral: true });
      const gZm = db.db.prepare('SELECT * FROM zimmermann WHERE userId = ?').get(gegner.id);
      if (!gZm) return interaction.reply({ content: 'Dein Gegner ist noch kein Zimmermann!', ephemeral: true });
      const myScore = zm.level * 10 + Math.random() * 50;
      const gScore = gZm.level * 10 + Math.random() * 50;
      const gewonnen = myScore > gScore;
      const belohnung = gewonnen ? Math.floor(50 + zm.level * 15) : 0;
      const xpGain = gewonnen ? 40 + zm.level * 10 : 10;
      db.db.prepare('UPDATE zimmermann SET geld = geld + ?, xp = xp + ?, duelle = duelle + 1, siege = siege + ? WHERE userId = ?').run(belohnung, xpGain, gewonnen ? 1 : 0, uId);
      const updZm = getZimmermann(uId);
      const { lvl, ups } = checkLevelUp(uId, updZm);
      const embed = new EmbedBuilder()
        .setColor(gewonnen ? 0x00FF00 : 0xFF0000)
        .setTitle(gewonnen ? '⚔️ Duell gewonnen!' : '⚔️ Duell verloren!')
        .setDescription(`${gewonnen ? `Du hast ${gegner.username} besiegt!` : `${gegner.username} hat gewonnen!`}\n${gewonnen ? `+${belohnung} Muenzen | ` : ''}+${xpGain} XP`);
      if (ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${lvl}!` });
      return interaction.reply({ embeds: [embed] });
    }
  },
};
