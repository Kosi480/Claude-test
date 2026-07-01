const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

const GARNE = [
  { name: 'Baumwollgarn', preis: 25, qualitaet: 1.0, emoji: '🧵' },
  { name: 'Leinengarn', preis: 70, qualitaet: 1.3, emoji: '🌾' },
  { name: 'Wollgarn', preis: 160, qualitaet: 1.6, emoji: '🐑' },
  { name: 'Seidengarn', preis: 380, qualitaet: 2.0, emoji: '🦋' },
  { name: 'Goldgarn', preis: 850, qualitaet: 2.6, emoji: '✨' },
  { name: 'Elfengarn', preis: 2200, qualitaet: 3.3, emoji: '🧝' },
  { name: 'Mondseide', preis: 5500, qualitaet: 4.2, emoji: '🌙' },
  { name: 'Aetherfaden', preis: 13000, qualitaet: 5.8, emoji: '⚗️' },
];

const STOFFE = [
  { name: 'Leinwand', basisWert: 45, schwierigkeit: 1, minLevel: 1 },
  { name: 'Kattun', basisWert: 100, schwierigkeit: 2, minLevel: 3 },
  { name: 'Tweed', basisWert: 200, schwierigkeit: 3, minLevel: 6 },
  { name: 'Damast', basisWert: 380, schwierigkeit: 4, minLevel: 10 },
  { name: 'Brokat', basisWert: 720, schwierigkeit: 5, minLevel: 15 },
  { name: 'Goldbrokat', basisWert: 1400, schwierigkeit: 6, minLevel: 22 },
  { name: 'Elfenstoff', basisWert: 2800, schwierigkeit: 7, minLevel: 30 },
  { name: 'Legendaerer Aetherstoff', basisWert: 7000, schwierigkeit: 8, minLevel: 40 },
];

const MUSTER = [
  { name: 'Schlicht', bonus: 1.0, minLevel: 1 },
  { name: 'Gestreift', bonus: 1.2, minLevel: 2 },
  { name: 'Kariert', bonus: 1.45, minLevel: 5 },
  { name: 'Blumenmuster', bonus: 1.7, minLevel: 9 },
  { name: 'Damastmuster', bonus: 2.0, minLevel: 14 },
  { name: 'Arabeske', bonus: 2.4, minLevel: 20 },
  { name: 'Elfenmuster', bonus: 3.0, minLevel: 28 },
  { name: 'Aethermuster', bonus: 3.9, minLevel: 38 },
];

const QUALITAETEN = [
  { name: 'Verfilzt', multi: 0.3, minRoll: 0 },
  { name: 'Rau', multi: 0.55, minRoll: 15 },
  { name: 'Einfach', multi: 0.8, minRoll: 30 },
  { name: 'Gleichmaessig', multi: 1.0, minRoll: 50 },
  { name: 'Fein', multi: 1.35, minRoll: 68 },
  { name: 'Exquisit', multi: 1.75, minRoll: 82 },
  { name: 'Meisterhaft', multi: 2.5, minRoll: 93 },
];

const UPGRADES = {
  webstuhl: {
    name: 'Webstuhl',
    stufen: [0, 450, 1350, 3600, 9000, 22000, 55000, 135000, 315000, 730000],
    bonus: [0, 0.05, 0.1, 0.16, 0.23, 0.31, 0.41, 0.53, 0.67, 0.86],
  },
  spindel: {
    name: 'Spindel',
    stufen: [0, 380, 1100, 3000, 7500, 18500, 46000, 115000, 265000, 620000],
    bonus: [0, 0.06, 0.12, 0.19, 0.27, 0.36, 0.46, 0.58, 0.72, 0.9],
  },
  schiffchen: {
    name: 'Weberschiffchen',
    stufen: [0, 300, 900, 2400, 6200, 15500, 38000, 95000, 220000, 510000],
    bonus: [0, 0.04, 0.09, 0.15, 0.22, 0.3, 0.39, 0.5, 0.63, 0.8],
  },
  werkstatt: {
    name: 'Weberei',
    stufen: [0, 1900, 5800, 14000, 33000, 77000, 175000, 390000, 875000, 1950000],
    bonus: [0, 0.08, 0.17, 0.27, 0.38, 0.51, 0.66, 0.83, 1.04, 1.3],
  },
};

const WEBE_EVENTS = [
  { text: 'Perfekte Fadenspannung! Das Gewebe wird makellos.', qualMulti: 1.6, geldMulti: 1.0 },
  { text: 'Ein Faden reisst. Muehsame Reparatur noetig.', qualMulti: 0.7, geldMulti: 1.0 },
  { text: 'Seltene Farben! Besondere Optik begeistert Kaeufer.', qualMulti: 1.3, geldMulti: 1.5 },
  { text: 'Der Webstuhl klemmt. Zeitverlust und Qualitaetseinbussen.', qualMulti: 0.8, geldMulti: 0.7 },
  { text: 'Inspiriertes Webmuster! Ein Meisterwerk entsteht.', qualMulti: 1.9, geldMulti: 1.2 },
  { text: 'Gleichmaessige Schussdichte. Hervorragende Stabilitaet!', qualMulti: 1.2, geldMulti: 1.4 },
  { text: 'Der Haendler zahlt einen Aufpreis fuer das Muster.', qualMulti: 1.0, geldMulti: 1.8 },
];

const cooldowns = new Map();

function ensureWeberTable() {
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS weber (
      user_id TEXT PRIMARY KEY,
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      geld INTEGER DEFAULT 0,
      garn_idx INTEGER DEFAULT 0,
      stoffe_gewebt INTEGER DEFAULT 0,
      auftraege INTEGER DEFAULT 0,
      duelle_gewonnen INTEGER DEFAULT 0,
      up_webstuhl INTEGER DEFAULT 0,
      up_spindel INTEGER DEFAULT 0,
      up_schiffchen INTEGER DEFAULT 0,
      up_werkstatt INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS weber_lager (
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

function getWeber(uId) {
  let row = db.db.prepare('SELECT * FROM weber WHERE user_id = ?').get(uId);
  if (!row) {
    db.db.prepare('INSERT INTO weber (user_id) VALUES (?)').run(uId);
    db.db.prepare('INSERT INTO weber_lager (user_id) VALUES (?)').run(uId);
    row = db.db.prepare('SELECT * FROM weber WHERE user_id = ?').get(uId);
  }
  return row;
}

function getLager(uId) {
  let row = db.db.prepare('SELECT * FROM weber_lager WHERE user_id = ?').get(uId);
  if (!row) {
    db.db.prepare('INSERT INTO weber_lager (user_id) VALUES (?)').run(uId);
    row = db.db.prepare('SELECT * FROM weber_lager WHERE user_id = ?').get(uId);
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
    db.db.prepare('UPDATE weber SET level = ?, xp = ? WHERE user_id = ?').run(lvl, xp, uId);
  }
  return { lvl, ups };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('weber')
    .setDescription('Werde ein Meisterweber und webe edle Stoffe!')
    .addSubcommand(sub => sub.setName('start').setDescription('Beginne deine Weber-Karriere'))
    .addSubcommand(sub => sub.setName('status').setDescription('Zeige deinen Weber-Status'))
    .addSubcommand(sub => sub.setName('garne').setDescription('Liste alle verfuegbaren Garnarten'))
    .addSubcommand(sub =>
      sub
        .setName('kaufen')
        .setDescription('Kaufe ein neues Garn')
        .addIntegerOption(o =>
          o.setName('garn').setDescription('Garnart (1-8)').setRequired(true).setMinValue(1).setMaxValue(8)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('weben')
        .setDescription('Webe einen neuen Stoff')
        .addIntegerOption(o =>
          o.setName('stoff').setDescription('Stofftyp (1-8)').setRequired(true).setMinValue(1).setMaxValue(8)
        )
        .addIntegerOption(o =>
          o.setName('muster').setDescription('Webmuster (1-8)').setRequired(true).setMinValue(1).setMaxValue(8)
        )
    )
    .addSubcommand(sub => sub.setName('training').setDescription('Verbessere deine Weber-Kuenste'))
    .addSubcommand(sub =>
      sub
        .setName('upgrade')
        .setDescription('Verbessere deine Weber-Ausruestung')
        .addStringOption(o =>
          o
            .setName('slot')
            .setDescription('Ausruestungsslot')
            .setRequired(true)
            .addChoices(
              { name: 'Webstuhl', value: 'webstuhl' },
              { name: 'Spindel', value: 'spindel' },
              { name: 'Weberschiffchen', value: 'schiffchen' },
              { name: 'Weberei', value: 'werkstatt' }
            )
        )
    )
    .addSubcommand(sub => sub.setName('lager').setDescription('Zeige dein Stofflager'))
    .addSubcommand(sub =>
      sub
        .setName('auftrag')
        .setDescription('Nimm einen Stoff-Lieferauftrag an')
        .addIntegerOption(o =>
          o.setName('stoff').setDescription('Stofftyp (1-8)').setRequired(true).setMinValue(1).setMaxValue(8)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('duell')
        .setDescription('Fordere einen anderen Weber heraus')
        .addUserOption(o => o.setName('gegner').setDescription('Dein Herausforderer').setRequired(true))
    ),

  async execute(interaction) {
    const config = require('../config.json');
    ensureWeberTable();
    const uId = interaction.user.id;
    const sub = interaction.options.getSubcommand();

    if (sub === 'start') {
      const existing = db.db.prepare('SELECT user_id FROM weber WHERE user_id = ?').get(uId);
      if (existing) {
        return interaction.reply({ content: 'Du bist bereits Weber!', ephemeral: true });
      }
      db.db.prepare('INSERT INTO weber (user_id) VALUES (?)').run(uId);
      db.db.prepare('INSERT INTO weber_lager (user_id) VALUES (?)').run(uId);
      const embed = new EmbedBuilder()
        .setColor(0x8B4513)
        .setTitle('Willkommen in der Weberei!')
        .setDescription(
          'Deine Weber-Karriere beginnt!\n\n' +
          '`/weber garne` - Garnarten ansehen\n' +
          '`/weber weben` - Stoff weben\n' +
          '`/weber status` - Fortschritt anzeigen'
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'status') {
      const wb = getWeber(uId);
      const garn = GARNE[wb.garn_idx];
      const nextXp = xpForLevel(wb.level);
      const embed = new EmbedBuilder()
        .setColor(0x8B4513)
        .setTitle('Weber-Status von ' + interaction.user.username)
        .addFields(
          { name: 'Level', value: String(wb.level), inline: true },
          { name: 'XP', value: wb.xp + ' / ' + nextXp, inline: true },
          { name: 'Geld', value: wb.geld + ' Taler', inline: true },
          { name: 'Garn', value: garn.emoji + ' ' + garn.name, inline: true },
          { name: 'Stoffe gewebt', value: wb.stoffe_gewebt + 'x', inline: true },
          { name: 'Auftraege', value: String(wb.auftraege), inline: true },
          {
            name: 'Upgrades',
            value:
              'Webstuhl: Stufe ' + wb.up_webstuhl + '\n' +
              'Spindel: Stufe ' + wb.up_spindel + '\n' +
              'Schiffchen: Stufe ' + wb.up_schiffchen + '\n' +
              'Weberei: Stufe ' + wb.up_werkstatt,
          }
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'garne') {
      const wb = getWeber(uId);
      const lines = GARNE.map((g, i) => {
        const owned = wb.garn_idx >= i ? '[OK]' : '';
        return (i + 1) + '. ' + g.emoji + ' **' + g.name + '** - ' + g.preis + ' Taler | Qual. x' + g.qualitaet + ' ' + owned;
      });
      const embed = new EmbedBuilder()
        .setColor(0x8B4513)
        .setTitle('Verfuegbare Garnarten')
        .setDescription(lines.join('\n'));
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'kaufen') {
      const wb = getWeber(uId);
      const idx = interaction.options.getInteger('garn') - 1;
      const garn = GARNE[idx];
      if (idx <= wb.garn_idx) {
        return interaction.reply({ content: 'Du besitzt bereits ' + garn.name + '!', ephemeral: true });
      }
      if (idx > wb.garn_idx + 1) {
        return interaction.reply({ content: 'Kaufe zuerst ' + GARNE[wb.garn_idx + 1].name + '!', ephemeral: true });
      }
      if (wb.geld < garn.preis) {
        return interaction.reply({ content: 'Nicht genug Taler! Benoetigt: ' + garn.preis + '.', ephemeral: true });
      }
      db.db.prepare('UPDATE weber SET geld = geld - ?, garn_idx = ? WHERE user_id = ?').run(garn.preis, idx, uId);
      return interaction.reply({
        content: 'Du hast ' + garn.emoji + ' **' + garn.name + '** fuer ' + garn.preis + ' Taler gekauft!',
      });
    }

    if (sub === 'weben') {
      const now = Date.now();
      const cd = cooldowns.get(uId + '_weben') || 0;
      if (now < cd) {
        const secs = Math.ceil((cd - now) / 1000);
        return interaction.reply({ content: 'Warte noch ' + secs + 's.', ephemeral: true });
      }
      const wb = getWeber(uId);
      const sIdx = interaction.options.getInteger('stoff') - 1;
      const mIdx = interaction.options.getInteger('muster') - 1;
      const stoff = STOFFE[sIdx];
      const muster = MUSTER[mIdx];
      if (stoff.minLevel > wb.level) {
        return interaction.reply({ content: 'Du brauchst Level ' + stoff.minLevel + '!', ephemeral: true });
      }
      if (muster.minLevel > wb.level) {
        return interaction.reply({ content: 'Du brauchst Level ' + muster.minLevel + ' fuer ' + muster.name + '!', ephemeral: true });
      }
      const garn = GARNE[wb.garn_idx];
      const event = WEBE_EVENTS[Math.floor(Math.random() * WEBE_EVENTS.length)];
      const upBonus =
        UPGRADES.webstuhl.bonus[wb.up_webstuhl] +
        UPGRADES.spindel.bonus[wb.up_spindel] +
        UPGRADES.schiffchen.bonus[wb.up_schiffchen] +
        UPGRADES.werkstatt.bonus[wb.up_werkstatt];
      const roll = Math.random() * 100;
      let qual = QUALITAETEN[0];
      for (const q of QUALITAETEN) {
        if (roll >= q.minRoll) qual = q;
      }
      const wert = Math.floor(stoff.basisWert * garn.qualitaet * muster.bonus * qual.multi * event.qualMulti * event.geldMulti * (1 + upBonus));
      const xpGain = Math.floor((stoff.schwierigkeit * muster.bonus * 10 + wb.level * 2) * (1 + upBonus * 0.5));
      db.db.prepare('UPDATE weber SET geld = geld + ?, xp = xp + ?, stoffe_gewebt = stoffe_gewebt + 1 WHERE user_id = ?').run(wert, xpGain, uId);
      db.db.prepare('UPDATE weber_lager SET slot' + sIdx + ' = slot' + sIdx + ' + 1 WHERE user_id = ?').run(uId);
      const updatedWb = getWeber(uId);
      const { lvl, ups } = checkLevelUp(uId, updatedWb);
      cooldowns.set(uId + '_weben', now + 20000);
      const embed = new EmbedBuilder()
        .setColor(0x8B4513)
        .setTitle('Stoff gewebt!')
        .setDescription(event.text)
        .addFields(
          { name: 'Stoff', value: stoff.name, inline: true },
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
      const wb = getWeber(uId);
      const xpGain = Math.floor(10 + wb.level * 4 + Math.random() * 20);
      db.db.prepare('UPDATE weber SET xp = xp + ? WHERE user_id = ?').run(xpGain, uId);
      const updatedWb = getWeber(uId);
      const { lvl, ups } = checkLevelUp(uId, updatedWb);
      cooldowns.set(uId + '_training', now + 30000);
      return interaction.reply({
        content: 'Training abgeschlossen! +' + xpGain + ' XP. Level: ' + lvl + (ups > 0 ? ' Level Up!' : ''),
      });
    }

    if (sub === 'upgrade') {
      const wb = getWeber(uId);
      const slot = interaction.options.getString('slot');
      if (!slot || !UPGRADES[slot]) {
        return interaction.reply({ content: 'Ungueltiger Slot!', ephemeral: true });
      }
      const upKey = 'up_' + slot;
      const currentLevel = wb[upKey];
      const upInfo = UPGRADES[slot];
      if (currentLevel >= upInfo.stufen.length - 1) {
        return interaction.reply({ content: upInfo.name + ' ist auf Maximum!', ephemeral: true });
      }
      const cost = upInfo.stufen[currentLevel + 1];
      if (wb.geld < cost) {
        return interaction.reply({ content: 'Nicht genug Taler! Kosten: ' + cost + '.', ephemeral: true });
      }
      db.db.prepare('UPDATE weber SET geld = geld - ?, ' + upKey + ' = ' + upKey + ' + 1 WHERE user_id = ?').run(cost, uId);
      const newLevel = currentLevel + 1;
      return interaction.reply({
        content: '**' + upInfo.name + '** auf Stufe ' + newLevel + '! Bonus: +' + Math.floor(upInfo.bonus[newLevel] * 100) + '%',
      });
    }

    if (sub === 'lager') {
      const lager = getLager(uId);
      const lines = STOFFE.map((s, i) => (i + 1) + '. 🧶 **' + s.name + '**: ' + (lager['slot' + i] || 0) + 'x');
      const embed = new EmbedBuilder()
        .setColor(0x8B4513)
        .setTitle('Dein Stofflager')
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
      const wb = getWeber(uId);
      const sIdx = interaction.options.getInteger('stoff') - 1;
      const stoff = STOFFE[sIdx];
      const lager = getLager(uId);
      const menge = 1 + Math.floor(Math.random() * 3);
      const available = lager['slot' + sIdx] || 0;
      if (available < menge) {
        return interaction.reply({
          content: 'Nicht genug ' + stoff.name + ' im Lager! Benoetigt: ' + menge + ', vorhanden: ' + available + '.',
          ephemeral: true,
        });
      }
      const bonus = 1.3 + Math.random() * 0.5;
      const wert = Math.floor(stoff.basisWert * menge * bonus);
      const xpGain = Math.floor(stoff.schwierigkeit * menge * 15);
      db.db.prepare('UPDATE weber_lager SET slot' + sIdx + ' = slot' + sIdx + ' - ? WHERE user_id = ?').run(menge, uId);
      db.db.prepare('UPDATE weber SET geld = geld + ?, xp = xp + ?, auftraege = auftraege + 1 WHERE user_id = ?').run(wert, xpGain, uId);
      const updatedWb = getWeber(uId);
      const { lvl, ups } = checkLevelUp(uId, updatedWb);
      cooldowns.set(uId + '_auftrag', now + 45000);
      return interaction.reply({
        content: 'Auftrag: ' + menge + 'x ' + stoff.name + ' geliefert. +' + wert + ' Taler, +' + xpGain + ' XP. Level: ' + lvl + (ups > 0 ? ' Level Up!' : ''),
      });
    }

    if (sub === 'duell') {
      const gegner = interaction.options.getUser('gegner');
      if (!gegner || gegner.id === uId) {
        return interaction.reply({ content: 'Ungueltiger Gegner!', ephemeral: true });
      }
      const wb = getWeber(uId);
      const gegnerWb = db.db.prepare('SELECT * FROM weber WHERE user_id = ?').get(gegner.id);
      if (!gegnerWb) {
        return interaction.reply({ content: 'Dieser Spieler ist noch kein Weber!', ephemeral: true });
      }
      const myScore = wb.level * 10 + wb.up_webstuhl * 5 + wb.up_spindel * 5 + wb.up_schiffchen * 5 + wb.up_werkstatt * 5 + Math.random() * 30;
      const gScore = gegnerWb.level * 10 + gegnerWb.up_webstuhl * 5 + gegnerWb.up_spindel * 5 + gegnerWb.up_schiffchen * 5 + gegnerWb.up_werkstatt * 5 + Math.random() * 30;
      const gewonnen = myScore > gScore;
      const einsatz = Math.min(Math.floor(wb.geld * 0.1), Math.floor(gegnerWb.geld * 0.1), 5000);
      if (gewonnen) {
        db.db.prepare('UPDATE weber SET geld = geld + ?, duelle_gewonnen = duelle_gewonnen + 1 WHERE user_id = ?').run(einsatz, uId);
        db.db.prepare('UPDATE weber SET geld = geld - ? WHERE user_id = ?').run(einsatz, gegner.id);
      } else {
        db.db.prepare('UPDATE weber SET geld = geld - ? WHERE user_id = ?').run(einsatz, uId);
        db.db.prepare('UPDATE weber SET geld = geld + ? WHERE user_id = ?').run(einsatz, gegner.id);
      }
      const embed = new EmbedBuilder()
        .setColor(gewonnen ? 0x00FF00 : 0xFF0000)
        .setTitle('Weber-Duell!')
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
