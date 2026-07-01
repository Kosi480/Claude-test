const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

const WEIDEN = [
  { name: 'Weidenrute', preis: 20, qualitaet: 1.0, emoji: '🌿' },
  { name: 'Bambus', preis: 55, qualitaet: 1.3, emoji: '🎋' },
  { name: 'Rohrgeflecht', preis: 130, qualitaet: 1.65, emoji: '🎍' },
  { name: 'Binsengras', preis: 290, qualitaet: 2.05, emoji: '🌾' },
  { name: 'Silberweide', preis: 680, qualitaet: 2.6, emoji: '🌱' },
  { name: 'Elfenreben', preis: 1750, qualitaet: 3.3, emoji: '✨' },
  { name: 'Mondgras', preis: 4500, qualitaet: 4.2, emoji: '🌙' },
  { name: 'Aetherfaser', preis: 11500, qualitaet: 5.8, emoji: '⚗️' },
];

const KOERBE = [
  { name: 'Einkaufskorb', basisWert: 35, schwierigkeit: 1, minLevel: 1 },
  { name: 'Picknickkorb', basisWert: 80, schwierigkeit: 2, minLevel: 3 },
  { name: 'Waeschekorb', basisWert: 160, schwierigkeit: 3, minLevel: 6 },
  { name: 'Brotkorb', basisWert: 310, schwierigkeit: 4, minLevel: 10 },
  { name: 'Dekorationskorb', basisWert: 580, schwierigkeit: 5, minLevel: 15 },
  { name: 'Obstkorb', basisWert: 1100, schwierigkeit: 6, minLevel: 22 },
  { name: 'Elfenkorb', basisWert: 2200, schwierigkeit: 7, minLevel: 30 },
  { name: 'Legendaerer Aetherkorb', basisWert: 5800, schwierigkeit: 8, minLevel: 40 },
];

const MUSTER = [
  { name: 'Einfachgeflecht', bonus: 1.0, minLevel: 1 },
  { name: 'Kreuzgeflecht', bonus: 1.2, minLevel: 2 },
  { name: 'Spiralgeflecht', bonus: 1.45, minLevel: 5 },
  { name: 'Zopfmuster', bonus: 1.7, minLevel: 9 },
  { name: 'Diagonalgeflecht', bonus: 2.0, minLevel: 14 },
  { name: 'Sterngeflecht', bonus: 2.4, minLevel: 20 },
  { name: 'Elfengeflecht', bonus: 3.0, minLevel: 28 },
  { name: 'Aethergeflecht', bonus: 3.9, minLevel: 38 },
];

const QUALITAETEN = [
  { name: 'Ausgefranst', multi: 0.3, minRoll: 0 },
  { name: 'Locker', multi: 0.55, minRoll: 15 },
  { name: 'Einfach', multi: 0.8, minRoll: 30 },
  { name: 'Stabil', multi: 1.0, minRoll: 50 },
  { name: 'Fein', multi: 1.35, minRoll: 68 },
  { name: 'Exquisit', multi: 1.75, minRoll: 82 },
  { name: 'Meisterhaft', multi: 2.5, minRoll: 93 },
];

const UPGRADES = {
  flechtbank: {
    name: 'Flechtbank',
    stufen: [0, 380, 1140, 3040, 7600, 19000, 47500, 119000, 278000, 647000],
    bonus: [0, 0.05, 0.1, 0.16, 0.23, 0.31, 0.41, 0.53, 0.67, 0.86],
  },
  ahle: {
    name: 'Flechtahle',
    stufen: [0, 300, 900, 2400, 6000, 15000, 37500, 94000, 219000, 510000],
    bonus: [0, 0.04, 0.09, 0.15, 0.22, 0.3, 0.39, 0.5, 0.63, 0.8],
  },
  daempfer: {
    name: 'Rutendaempfer',
    stufen: [0, 450, 1350, 3600, 9000, 22500, 56250, 141000, 329000, 766000],
    bonus: [0, 0.06, 0.12, 0.19, 0.27, 0.36, 0.46, 0.58, 0.72, 0.9],
  },
  werkstatt: {
    name: 'Korbwerkstatt',
    stufen: [0, 1800, 5400, 13500, 32000, 74000, 168000, 378000, 851000, 1915000],
    bonus: [0, 0.08, 0.17, 0.27, 0.38, 0.51, 0.66, 0.83, 1.04, 1.3],
  },
};

const KORB_EVENTS = [
  { text: 'Perfekte Flechtspannung! Der Korb wird straff und stabil.', qualMulti: 1.6, geldMulti: 1.0 },
  { text: 'Die Rute bricht. Muehsame Reparatur erforderlich.', qualMulti: 0.65, geldMulti: 1.0 },
  { text: 'Seltenes Farbpigment entdeckt! Exklusiver Look.', qualMulti: 1.3, geldMulti: 1.55 },
  { text: 'Die Weide war zu trocken. Das Geflecht lockert sich.', qualMulti: 0.75, geldMulti: 0.8 },
  { text: 'Inspiriertes Muster! Ein aussergewoehnliches Meisterwerk.', qualMulti: 1.9, geldMulti: 1.2 },
  { text: 'Gleichmaessige Flechtdichte. Hervorragende Stabilitaet!', qualMulti: 1.2, geldMulti: 1.4 },
  { text: 'Haendler zahlt Aufpreis fuer das kunstvolle Stueck.', qualMulti: 1.0, geldMulti: 1.85 },
];

const cooldowns = new Map();

function ensureKorbTable() {
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS korbmacher (
      user_id TEXT PRIMARY KEY,
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      geld INTEGER DEFAULT 0,
      weide_idx INTEGER DEFAULT 0,
      koerbe_geflochten INTEGER DEFAULT 0,
      auftraege INTEGER DEFAULT 0,
      duelle_gewonnen INTEGER DEFAULT 0,
      up_flechtbank INTEGER DEFAULT 0,
      up_ahle INTEGER DEFAULT 0,
      up_daempfer INTEGER DEFAULT 0,
      up_werkstatt INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS korbmacher_lager (
      user_id TEXT PRIMARY KEY,
      slot0 INTEGER DEFAULT 0,
      slot1 INTEGER DEFAULT 0,
      slot2 INTEGER DEFAULT 0,
      slot3 INTEGER DEFAULT 0,
      slot4 INTEGER DEFAULT 0,
      slot5 INTEGER DEFAULT 0,
      slot6 INTEGER DEFAULT 0,
      slot7 INTEGER DEFAULT 0
    );
  `);
}

function getKorbmacher(uId) {
  let row = db.db.prepare('SELECT * FROM korbmacher WHERE user_id = ?').get(uId);
  if (!row) {
    db.db.prepare('INSERT INTO korbmacher (user_id) VALUES (?)').run(uId);
    db.db.prepare('INSERT INTO korbmacher_lager (user_id) VALUES (?)').run(uId);
    row = db.db.prepare('SELECT * FROM korbmacher WHERE user_id = ?').get(uId);
  }
  return row;
}

function getLager(uId) {
  let row = db.db.prepare('SELECT * FROM korbmacher_lager WHERE user_id = ?').get(uId);
  if (!row) {
    db.db.prepare('INSERT INTO korbmacher_lager (user_id) VALUES (?)').run(uId);
    row = db.db.prepare('SELECT * FROM korbmacher_lager WHERE user_id = ?').get(uId);
  }
  return row;
}

function xpForLevel(l) {
  return l * l * 50;
}

function checkLevelUp(uId, obj) {
  let lvl = obj.level;
  let xp = obj.xp;
  let ups = 0;
  while (xp >= xpForLevel(lvl)) {
    xp -= xpForLevel(lvl);
    lvl++;
    ups++;
  }
  if (ups > 0) {
    db.db.prepare('UPDATE korbmacher SET level = ?, xp = ? WHERE user_id = ?').run(lvl, xp, uId);
  }
  return { lvl, ups };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('korbmacher')
    .setDescription('Flechte kunstvolle Koerbe aus den feinsten Materialien!')
    .addSubcommand(sub => sub.setName('start').setDescription('Beginne deine Korbmacher-Karriere'))
    .addSubcommand(sub => sub.setName('status').setDescription('Zeige deinen Korbmacher-Status'))
    .addSubcommand(sub => sub.setName('weiden').setDescription('Liste alle verfuegbaren Flechtruten'))
    .addSubcommand(sub =>
      sub
        .setName('kaufen')
        .setDescription('Kaufe eine neue Flechtrutenart')
        .addIntegerOption(o =>
          o.setName('weide').setDescription('Flechtrutenart (1-8)').setRequired(true).setMinValue(1).setMaxValue(8)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('flechten')
        .setDescription('Flechte einen neuen Korb')
        .addIntegerOption(o =>
          o.setName('korb').setDescription('Korbtyp (1-8)').setRequired(true).setMinValue(1).setMaxValue(8)
        )
        .addIntegerOption(o =>
          o.setName('muster').setDescription('Flechtmuster (1-8)').setRequired(true).setMinValue(1).setMaxValue(8)
        )
    )
    .addSubcommand(sub => sub.setName('training').setDescription('Verbessere deine Flechtkunst'))
    .addSubcommand(sub =>
      sub
        .setName('upgrade')
        .setDescription('Verbessere deine Flechtwerkzeuge')
        .addStringOption(o =>
          o
            .setName('slot')
            .setDescription('Ausruestungsslot')
            .setRequired(true)
            .addChoices(
              { name: 'Flechtbank', value: 'flechtbank' },
              { name: 'Flechtahle', value: 'ahle' },
              { name: 'Rutendaempfer', value: 'daempfer' },
              { name: 'Korbwerkstatt', value: 'werkstatt' }
            )
        )
    )
    .addSubcommand(sub => sub.setName('lager').setDescription('Zeige dein Korb-Lager'))
    .addSubcommand(sub =>
      sub
        .setName('auftrag')
        .setDescription('Nimm einen Korb-Lieferauftrag an')
        .addIntegerOption(o =>
          o.setName('korb').setDescription('Korbtyp (1-8)').setRequired(true).setMinValue(1).setMaxValue(8)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('duell')
        .setDescription('Fordere einen anderen Korbmacher heraus')
        .addUserOption(o => o.setName('gegner').setDescription('Dein Herausforderer').setRequired(true))
    ),

  async execute(interaction) {
    const config = require('../config.json');
    ensureKorbTable();
    const uId = interaction.user.id;
    const sub = interaction.options.getSubcommand();

    if (sub === 'start') {
      const existing = db.db.prepare('SELECT user_id FROM korbmacher WHERE user_id = ?').get(uId);
      if (existing) {
        return interaction.reply({ content: 'Du bist bereits Korbmacher!', ephemeral: true });
      }
      db.db.prepare('INSERT INTO korbmacher (user_id) VALUES (?)').run(uId);
      db.db.prepare('INSERT INTO korbmacher_lager (user_id) VALUES (?)').run(uId);
      const embed = new EmbedBuilder()
        .setColor(0x8FBC8F)
        .setTitle('Willkommen in der Korbmacherei!')
        .setDescription(
          'Deine Korbmacher-Karriere beginnt!\n\n' +
          '`/korbmacher weiden` - Flechtruten ansehen\n' +
          '`/korbmacher flechten` - Korb flechten\n' +
          '`/korbmacher status` - Fortschritt anzeigen'
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'status') {
      const km = getKorbmacher(uId);
      const weide = WEIDEN[km.weide_idx];
      const nextXp = xpForLevel(km.level);
      const embed = new EmbedBuilder()
        .setColor(0x8FBC8F)
        .setTitle('Korbmacher-Status von ' + interaction.user.username)
        .addFields(
          { name: 'Level', value: String(km.level), inline: true },
          { name: 'XP', value: km.xp + ' / ' + nextXp, inline: true },
          { name: 'Geld', value: km.geld + ' Taler', inline: true },
          { name: 'Flechtmaterial', value: weide.emoji + ' ' + weide.name, inline: true },
          { name: 'Koerbe', value: km.koerbe_geflochten + 'x', inline: true },
          { name: 'Auftraege', value: String(km.auftraege), inline: true },
          {
            name: 'Upgrades',
            value:
              'Flechtbank: Stufe ' + km.up_flechtbank + '\n' +
              'Ahle: Stufe ' + km.up_ahle + '\n' +
              'Daempfer: Stufe ' + km.up_daempfer + '\n' +
              'Werkstatt: Stufe ' + km.up_werkstatt,
          }
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'weiden') {
      const km = getKorbmacher(uId);
      const lines = WEIDEN.map((w, i) => {
        const owned = km.weide_idx >= i ? '[OK]' : '';
        return (i + 1) + '. ' + w.emoji + ' **' + w.name + '** - ' + w.preis + ' Taler | Qual. x' + w.qualitaet + ' ' + owned;
      });
      const embed = new EmbedBuilder()
        .setColor(0x8FBC8F)
        .setTitle('Verfuegbare Flechtruten')
        .setDescription(lines.join('\n'));
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'kaufen') {
      const km = getKorbmacher(uId);
      const idx = interaction.options.getInteger('weide') - 1;
      const weide = WEIDEN[idx];
      if (idx <= km.weide_idx) {
        return interaction.reply({ content: 'Du besitzt bereits ' + weide.name + '!', ephemeral: true });
      }
      if (idx > km.weide_idx + 1) {
        return interaction.reply({ content: 'Kaufe zuerst ' + WEIDEN[km.weide_idx + 1].name + '!', ephemeral: true });
      }
      if (km.geld < weide.preis) {
        return interaction.reply({ content: 'Nicht genug Taler! Benoetigt: ' + weide.preis + '.', ephemeral: true });
      }
      db.db.prepare('UPDATE korbmacher SET geld = geld - ?, weide_idx = ? WHERE user_id = ?').run(weide.preis, idx, uId);
      return interaction.reply({
        content: 'Du hast ' + weide.emoji + ' **' + weide.name + '** fuer ' + weide.preis + ' Taler gekauft!',
      });
    }

    if (sub === 'flechten') {
      const now = Date.now();
      const cd = cooldowns.get(uId + '_flechten') || 0;
      if (now < cd) {
        const secs = Math.ceil((cd - now) / 1000);
        return interaction.reply({ content: 'Warte noch ' + secs + 's.', ephemeral: true });
      }
      const km = getKorbmacher(uId);
      const kIdx = interaction.options.getInteger('korb') - 1;
      const mIdx = interaction.options.getInteger('muster') - 1;
      const korb = KOERBE[kIdx];
      const muster = MUSTER[mIdx];
      if (korb.minLevel > km.level) {
        return interaction.reply({ content: 'Du brauchst Level ' + korb.minLevel + '!', ephemeral: true });
      }
      if (muster.minLevel > km.level) {
        return interaction.reply({ content: 'Du brauchst Level ' + muster.minLevel + ' fuer ' + muster.name + '!', ephemeral: true });
      }
      const weide = WEIDEN[km.weide_idx];
      const event = KORB_EVENTS[Math.floor(Math.random() * KORB_EVENTS.length)];
      const upBonus =
        UPGRADES.flechtbank.bonus[km.up_flechtbank] +
        UPGRADES.ahle.bonus[km.up_ahle] +
        UPGRADES.daempfer.bonus[km.up_daempfer] +
        UPGRADES.werkstatt.bonus[km.up_werkstatt];
      const roll = Math.random() * 100;
      let qual = QUALITAETEN[0];
      for (const q of QUALITAETEN) {
        if (roll >= q.minRoll) qual = q;
      }
      const wert = Math.floor(korb.basisWert * weide.qualitaet * muster.bonus * qual.multi * event.qualMulti * event.geldMulti * (1 + upBonus));
      const xpGain = Math.floor((korb.schwierigkeit * muster.bonus * 10 + km.level * 2) * (1 + upBonus * 0.5));
      db.db.prepare('UPDATE korbmacher SET geld = geld + ?, xp = xp + ?, koerbe_geflochten = koerbe_geflochten + 1 WHERE user_id = ?').run(wert, xpGain, uId);
      db.db.prepare('UPDATE korbmacher_lager SET slot' + kIdx + ' = slot' + kIdx + ' + 1 WHERE user_id = ?').run(uId);
      const upd = getKorbmacher(uId);
      const { lvl, ups } = checkLevelUp(uId, upd);
      cooldowns.set(uId + '_flechten', now + 20000);
      const embed = new EmbedBuilder()
        .setColor(0x8FBC8F)
        .setTitle('Korb geflochten!')
        .setDescription(event.text)
        .addFields(
          { name: 'Korb', value: korb.name, inline: true },
          { name: 'Muster', value: muster.name, inline: true },
          { name: 'Qualitaet', value: qual.name, inline: true },
          { name: 'Erloes', value: wert + ' Taler', inline: true },
          { name: 'XP', value: '+' + xpGain, inline: true },
          { name: 'Level', value: lvl + (ups > 0 ? ' (Level Up!)' : ''), inline: true }
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'training') {
      const now = Date.now();
      const cd = cooldowns.get(uId + '_training') || 0;
      if (now < cd) {
        const secs = Math.ceil((cd - now) / 1000);
        return interaction.reply({ content: 'Warte noch ' + secs + 's.', ephemeral: true });
      }
      const km = getKorbmacher(uId);
      const xpGain = Math.floor(10 + km.level * 4 + Math.random() * 20);
      db.db.prepare('UPDATE korbmacher SET xp = xp + ? WHERE user_id = ?').run(xpGain, uId);
      const upd = getKorbmacher(uId);
      const { lvl, ups } = checkLevelUp(uId, upd);
      cooldowns.set(uId + '_training', now + 30000);
      return interaction.reply({
        content: 'Training abgeschlossen! +' + xpGain + ' XP. Level: ' + lvl + (ups > 0 ? ' Level Up!' : ''),
      });
    }

    if (sub === 'upgrade') {
      const km = getKorbmacher(uId);
      const slot = interaction.options.getString('slot');
      if (!slot || !UPGRADES[slot]) {
        return interaction.reply({ content: 'Ungueltiger Slot!', ephemeral: true });
      }
      const upKey = 'up_' + slot;
      const currentLevel = km[upKey];
      const upInfo = UPGRADES[slot];
      if (currentLevel >= upInfo.stufen.length - 1) {
        return interaction.reply({ content: upInfo.name + ' ist auf Maximum!', ephemeral: true });
      }
      const cost = upInfo.stufen[currentLevel + 1];
      if (km.geld < cost) {
        return interaction.reply({ content: 'Nicht genug Taler! Kosten: ' + cost + '.', ephemeral: true });
      }
      db.db.prepare('UPDATE korbmacher SET geld = geld - ?, ' + upKey + ' = ' + upKey + ' + 1 WHERE user_id = ?').run(cost, uId);
      const newLevel = currentLevel + 1;
      return interaction.reply({
        content: '**' + upInfo.name + '** auf Stufe ' + newLevel + '! Bonus: +' + Math.floor(upInfo.bonus[newLevel] * 100) + '%',
      });
    }

    if (sub === 'lager') {
      const lager = getLager(uId);
      const lines = KOERBE.map((k, i) => (i + 1) + '. 🧺 **' + k.name + '**: ' + (lager['slot' + i] || 0) + 'x');
      const embed = new EmbedBuilder()
        .setColor(0x8FBC8F)
        .setTitle('Dein Korb-Lager')
        .setDescription(lines.join('\n'));
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'auftrag') {
      const now = Date.now();
      const cd = cooldowns.get(uId + '_auftrag') || 0;
      if (now < cd) {
        const secs = Math.ceil((cd - now) / 1000);
        return interaction.reply({ content: 'Warte noch ' + secs + 's.', ephemeral: true });
      }
      const km = getKorbmacher(uId);
      const kIdx = interaction.options.getInteger('korb') - 1;
      const korb = KOERBE[kIdx];
      const lager = getLager(uId);
      const menge = 1 + Math.floor(Math.random() * 3);
      const available = lager['slot' + kIdx] || 0;
      if (available < menge) {
        return interaction.reply({
          content: 'Nicht genug ' + korb.name + ' im Lager! Benoetigt: ' + menge + ', vorhanden: ' + available + '.',
          ephemeral: true,
        });
      }
      const bonus = 1.3 + Math.random() * 0.5;
      const wert = Math.floor(korb.basisWert * menge * bonus);
      const xpGain = Math.floor(korb.schwierigkeit * menge * 15);
      db.db.prepare('UPDATE korbmacher_lager SET slot' + kIdx + ' = slot' + kIdx + ' - ? WHERE user_id = ?').run(menge, uId);
      db.db.prepare('UPDATE korbmacher SET geld = geld + ?, xp = xp + ?, auftraege = auftraege + 1 WHERE user_id = ?').run(wert, xpGain, uId);
      const upd = getKorbmacher(uId);
      const { lvl, ups } = checkLevelUp(uId, upd);
      cooldowns.set(uId + '_auftrag', now + 45000);
      return interaction.reply({
        content: 'Auftrag: ' + menge + 'x ' + korb.name + ' geliefert. +' + wert + ' Taler, +' + xpGain + ' XP. Level: ' + lvl + (ups > 0 ? ' Level Up!' : ''),
      });
    }

    if (sub === 'duell') {
      const gegner = interaction.options.getUser('gegner');
      if (!gegner || gegner.id === uId) {
        return interaction.reply({ content: 'Ungueltiger Gegner!', ephemeral: true });
      }
      const km = getKorbmacher(uId);
      const gegnerKm = db.db.prepare('SELECT * FROM korbmacher WHERE user_id = ?').get(gegner.id);
      if (!gegnerKm) {
        return interaction.reply({ content: 'Dieser Spieler ist noch kein Korbmacher!', ephemeral: true });
      }
      const myScore = km.level * 10 + km.up_flechtbank * 5 + km.up_ahle * 5 + km.up_daempfer * 5 + km.up_werkstatt * 5 + Math.random() * 30;
      const gScore = gegnerKm.level * 10 + gegnerKm.up_flechtbank * 5 + gegnerKm.up_ahle * 5 + gegnerKm.up_daempfer * 5 + gegnerKm.up_werkstatt * 5 + Math.random() * 30;
      const gewonnen = myScore > gScore;
      const einsatz = Math.min(Math.floor(km.geld * 0.1), Math.floor(gegnerKm.geld * 0.1), 5000);
      if (gewonnen) {
        db.db.prepare('UPDATE korbmacher SET geld = geld + ?, duelle_gewonnen = duelle_gewonnen + 1 WHERE user_id = ?').run(einsatz, uId);
        db.db.prepare('UPDATE korbmacher SET geld = geld - ? WHERE user_id = ?').run(einsatz, gegner.id);
      } else {
        db.db.prepare('UPDATE korbmacher SET geld = geld - ? WHERE user_id = ?').run(einsatz, uId);
        db.db.prepare('UPDATE korbmacher SET geld = geld + ? WHERE user_id = ?').run(einsatz, gegner.id);
      }
      const embed = new EmbedBuilder()
        .setColor(gewonnen ? 0x00FF00 : 0xFF0000)
        .setTitle('Korbmacher-Duell!')
        .setDescription(
          gewonnen
            ? '**' + interaction.user.username + '** gewinnt! +' + einsatz + ' Taler'
            : '**' + interaction.user.username + '** verliert. -' + einsatz + ' Taler'
        )
        .addFields(
          { name: interaction.user.username, value: 'Score: ' + Math.floor(myScore), inline: true },
          { name: gegner.username, value: 'Score: ' + Math.floor(gScore), inline: true }
        );
      return interaction.reply({ embeds: [embed] });
    }
  },
};
