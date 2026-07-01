const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

const HOELZER = [
  { name: 'Fichtenholz', preis: 30, qualitaet: 1.0, emoji: '🌲' },
  { name: 'Eichenholz', preis: 80, qualitaet: 1.3, emoji: '🌳' },
  { name: 'Eschenholz', preis: 170, qualitaet: 1.65, emoji: '🍃' },
  { name: 'Buchenholz', preis: 370, qualitaet: 2.05, emoji: '🌿' },
  { name: 'Elfenholz', preis: 860, qualitaet: 2.6, emoji: '✨' },
  { name: 'Mondholz', preis: 2150, qualitaet: 3.3, emoji: '🌙' },
  { name: 'Kristallholz', preis: 5400, qualitaet: 4.2, emoji: '💎' },
  { name: 'Aetherholz', preis: 13500, qualitaet: 5.8, emoji: '⚗️' },
];

const FAHRZEUGE = [
  { name: 'Schubkarre', basisWert: 50, schwierigkeit: 1, minLevel: 1 },
  { name: 'Handwagen', basisWert: 110, schwierigkeit: 2, minLevel: 3 },
  { name: 'Bauernwagen', basisWert: 210, schwierigkeit: 3, minLevel: 6 },
  { name: 'Postkutsche', basisWert: 400, schwierigkeit: 4, minLevel: 10 },
  { name: 'Reisekutsche', basisWert: 750, schwierigkeit: 5, minLevel: 15 },
  { name: 'Prachtkutsche', basisWert: 1450, schwierigkeit: 6, minLevel: 22 },
  { name: 'Elfenkutsche', basisWert: 2900, schwierigkeit: 7, minLevel: 30 },
  { name: 'Legendaere Aetherkutsche', basisWert: 7200, schwierigkeit: 8, minLevel: 40 },
];

const BESCHLAEGE = [
  { name: 'Eisenbeschlag', bonus: 1.0, minLevel: 1 },
  { name: 'Stahlbeschlag', bonus: 1.2, minLevel: 2 },
  { name: 'Bronzebeschlag', bonus: 1.45, minLevel: 5 },
  { name: 'Silberbeschlag', bonus: 1.7, minLevel: 9 },
  { name: 'Goldbeschlag', bonus: 2.0, minLevel: 14 },
  { name: 'Mithrildeschlag', bonus: 2.4, minLevel: 20 },
  { name: 'Elfenbeschlag', bonus: 3.0, minLevel: 28 },
  { name: 'Aetherbeschlag', bonus: 3.9, minLevel: 38 },
];

const QUALITAETEN = [
  { name: 'Wackelig', multi: 0.3, minRoll: 0 },
  { name: 'Grob', multi: 0.55, minRoll: 15 },
  { name: 'Einfach', multi: 0.8, minRoll: 30 },
  { name: 'Stabil', multi: 1.0, minRoll: 50 },
  { name: 'Robust', multi: 1.35, minRoll: 68 },
  { name: 'Exquisit', multi: 1.75, minRoll: 82 },
  { name: 'Meisterhaft', multi: 2.5, minRoll: 93 },
];

const UPGRADES = {
  hobelbank: {
    name: 'Hobelbank',
    stufen: [0, 450, 1350, 3600, 9000, 22500, 56250, 140000, 327000, 762000],
    bonus: [0, 0.05, 0.1, 0.16, 0.23, 0.31, 0.41, 0.53, 0.67, 0.86],
  },
  rade: {
    name: 'Radform',
    stufen: [0, 620, 1860, 4960, 12400, 31000, 77500, 194000, 452000, 1053000],
    bonus: [0, 0.07, 0.14, 0.22, 0.31, 0.41, 0.52, 0.65, 0.8, 1.0],
  },
  schmiede: {
    name: 'Schmiede',
    stufen: [0, 380, 1140, 3040, 7600, 19000, 47500, 119000, 278000, 647000],
    bonus: [0, 0.04, 0.09, 0.15, 0.22, 0.3, 0.39, 0.5, 0.63, 0.8],
  },
  werkstatt: {
    name: 'Stellmacherei',
    stufen: [0, 2000, 6000, 15000, 36000, 84000, 189000, 425000, 957000, 2155000],
    bonus: [0, 0.08, 0.17, 0.27, 0.38, 0.51, 0.66, 0.83, 1.04, 1.3],
  },
};

const STELL_EVENTS = [
  { text: 'Perfekte Speichenpassung! Das Rad laeuft butterweich.', qualMulti: 1.6, geldMulti: 1.0 },
  { text: 'Das Holz hatte einen Ast. Die Achse ist nicht gerade.', qualMulti: 0.65, geldMulti: 1.0 },
  { text: 'Seltenes Hartholz verarbeitet! Aussergewoehnliche Haerte.', qualMulti: 1.3, geldMulti: 1.55 },
  { text: 'Zapfenverbindung nicht dicht. Knarrt beim Fahren.', qualMulti: 0.75, geldMulti: 0.8 },
  { text: 'Meisterhafte Verarbeitung! Ein Fahrzeug fuer die Ewigkeit.', qualMulti: 1.9, geldMulti: 1.2 },
  { text: 'Gleichmaessige Bereifung. Ruhiger Lauf garantiert!', qualMulti: 1.2, geldMulti: 1.4 },
  { text: 'Adeliger zahlt Aufpreis fuer die Sonderanfertigung.', qualMulti: 1.0, geldMulti: 1.85 },
];

const cooldowns = new Map();

function ensureStellTable() {
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS stellmacher (
      user_id TEXT PRIMARY KEY,
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      geld INTEGER DEFAULT 0,
      holz_idx INTEGER DEFAULT 0,
      fahrzeuge_gebaut INTEGER DEFAULT 0,
      auftraege INTEGER DEFAULT 0,
      duelle_gewonnen INTEGER DEFAULT 0,
      up_hobelbank INTEGER DEFAULT 0,
      up_rade INTEGER DEFAULT 0,
      up_schmiede INTEGER DEFAULT 0,
      up_werkstatt INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS stellmacher_hof (
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

function getStellmacher(uId) {
  let row = db.db.prepare('SELECT * FROM stellmacher WHERE user_id = ?').get(uId);
  if (!row) {
    db.db.prepare('INSERT INTO stellmacher (user_id) VALUES (?)').run(uId);
    db.db.prepare('INSERT INTO stellmacher_hof (user_id) VALUES (?)').run(uId);
    row = db.db.prepare('SELECT * FROM stellmacher WHERE user_id = ?').get(uId);
  }
  return row;
}

function getHof(uId) {
  let row = db.db.prepare('SELECT * FROM stellmacher_hof WHERE user_id = ?').get(uId);
  if (!row) {
    db.db.prepare('INSERT INTO stellmacher_hof (user_id) VALUES (?)').run(uId);
    row = db.db.prepare('SELECT * FROM stellmacher_hof WHERE user_id = ?').get(uId);
  }
  return row;
}

function xpForLevel(l) {
  return l * l * 53;
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
    db.db.prepare('UPDATE stellmacher SET level = ?, xp = ? WHERE user_id = ?').run(lvl, xp, uId);
  }
  return { lvl, ups };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stellmacher')
    .setDescription('Baue Wagen und Kutschen als meisterhafter Stellmacher!')
    .addSubcommand(sub => sub.setName('start').setDescription('Beginne deine Stellmacher-Karriere'))
    .addSubcommand(sub => sub.setName('status').setDescription('Zeige deinen Stellmacher-Status'))
    .addSubcommand(sub => sub.setName('hoelzer').setDescription('Liste alle verfuegbaren Holzarten'))
    .addSubcommand(sub =>
      sub
        .setName('kaufen')
        .setDescription('Kaufe eine neue Holzart')
        .addIntegerOption(o =>
          o.setName('holz').setDescription('Holzart (1-8)').setRequired(true).setMinValue(1).setMaxValue(8)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('bauen')
        .setDescription('Baue ein neues Fahrzeug')
        .addIntegerOption(o =>
          o.setName('fahrzeug').setDescription('Fahrzeugtyp (1-8)').setRequired(true).setMinValue(1).setMaxValue(8)
        )
        .addIntegerOption(o =>
          o.setName('beschlag').setDescription('Beschlagtyp (1-8)').setRequired(true).setMinValue(1).setMaxValue(8)
        )
    )
    .addSubcommand(sub => sub.setName('training').setDescription('Verbessere deine Stellmacherkunst'))
    .addSubcommand(sub =>
      sub
        .setName('upgrade')
        .setDescription('Verbessere deine Stellmacher-Ausruestung')
        .addStringOption(o =>
          o
            .setName('slot')
            .setDescription('Ausruestungsslot')
            .setRequired(true)
            .addChoices(
              { name: 'Hobelbank', value: 'hobelbank' },
              { name: 'Radform', value: 'rade' },
              { name: 'Schmiede', value: 'schmiede' },
              { name: 'Stellmacherei', value: 'werkstatt' }
            )
        )
    )
    .addSubcommand(sub => sub.setName('hof').setDescription('Zeige deinen Fahrzeughof'))
    .addSubcommand(sub =>
      sub
        .setName('auftrag')
        .setDescription('Nimm einen Fahrzeug-Lieferauftrag an')
        .addIntegerOption(o =>
          o.setName('fahrzeug').setDescription('Fahrzeugtyp (1-8)').setRequired(true).setMinValue(1).setMaxValue(8)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('duell')
        .setDescription('Fordere einen anderen Stellmacher heraus')
        .addUserOption(o => o.setName('gegner').setDescription('Dein Herausforderer').setRequired(true))
    ),

  async execute(interaction) {
    const config = require('../config.json');
    ensureStellTable();
    const uId = interaction.user.id;
    const sub = interaction.options.getSubcommand();

    if (sub === 'start') {
      const existing = db.db.prepare('SELECT user_id FROM stellmacher WHERE user_id = ?').get(uId);
      if (existing) {
        return interaction.reply({ content: 'Du bist bereits Stellmacher!', ephemeral: true });
      }
      db.db.prepare('INSERT INTO stellmacher (user_id) VALUES (?)').run(uId);
      db.db.prepare('INSERT INTO stellmacher_hof (user_id) VALUES (?)').run(uId);
      const embed = new EmbedBuilder()
        .setColor(0x8B4513)
        .setTitle('Willkommen in der Stellmacherei!')
        .setDescription(
          'Deine Stellmacher-Karriere beginnt!\n\n' +
          '`/stellmacher hoelzer` - Holzarten ansehen\n' +
          '`/stellmacher bauen` - Fahrzeug bauen\n' +
          '`/stellmacher status` - Fortschritt anzeigen'
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'status') {
      const sm = getStellmacher(uId);
      const holz = HOELZER[sm.holz_idx];
      const nextXp = xpForLevel(sm.level);
      const embed = new EmbedBuilder()
        .setColor(0x8B4513)
        .setTitle('Stellmacher-Status von ' + interaction.user.username)
        .addFields(
          { name: 'Level', value: String(sm.level), inline: true },
          { name: 'XP', value: sm.xp + ' / ' + nextXp, inline: true },
          { name: 'Geld', value: sm.geld + ' Taler', inline: true },
          { name: 'Holz', value: holz.emoji + ' ' + holz.name, inline: true },
          { name: 'Gebaut', value: sm.fahrzeuge_gebaut + 'x', inline: true },
          { name: 'Auftraege', value: String(sm.auftraege), inline: true },
          {
            name: 'Upgrades',
            value:
              'Hobelbank: Stufe ' + sm.up_hobelbank + '\n' +
              'Radform: Stufe ' + sm.up_rade + '\n' +
              'Schmiede: Stufe ' + sm.up_schmiede + '\n' +
              'Werkstatt: Stufe ' + sm.up_werkstatt,
          }
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'hoelzer') {
      const sm = getStellmacher(uId);
      const lines = HOELZER.map((h, i) => {
        const owned = sm.holz_idx >= i ? '[OK]' : '';
        return (i + 1) + '. ' + h.emoji + ' **' + h.name + '** - ' + h.preis + ' Taler | Qual. x' + h.qualitaet + ' ' + owned;
      });
      const embed = new EmbedBuilder()
        .setColor(0x8B4513)
        .setTitle('Verfuegbare Holzarten')
        .setDescription(lines.join('\n'));
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'kaufen') {
      const sm = getStellmacher(uId);
      const idx = interaction.options.getInteger('holz') - 1;
      const holz = HOELZER[idx];
      if (idx <= sm.holz_idx) {
        return interaction.reply({ content: 'Du besitzt bereits ' + holz.name + '!', ephemeral: true });
      }
      if (idx > sm.holz_idx + 1) {
        return interaction.reply({ content: 'Kaufe zuerst ' + HOELZER[sm.holz_idx + 1].name + '!', ephemeral: true });
      }
      if (sm.geld < holz.preis) {
        return interaction.reply({ content: 'Nicht genug Taler! Benoetigt: ' + holz.preis + '.', ephemeral: true });
      }
      db.db.prepare('UPDATE stellmacher SET geld = geld - ?, holz_idx = ? WHERE user_id = ?').run(holz.preis, idx, uId);
      return interaction.reply({
        content: 'Du hast ' + holz.emoji + ' **' + holz.name + '** fuer ' + holz.preis + ' Taler gekauft!',
      });
    }

    if (sub === 'bauen') {
      const now = Date.now();
      const cd = cooldowns.get(uId + '_bauen') || 0;
      if (now < cd) {
        const secs = Math.ceil((cd - now) / 1000);
        return interaction.reply({ content: 'Warte noch ' + secs + 's.', ephemeral: true });
      }
      const sm = getStellmacher(uId);
      const fIdx = interaction.options.getInteger('fahrzeug') - 1;
      const bIdx = interaction.options.getInteger('beschlag') - 1;
      const fahrzeug = FAHRZEUGE[fIdx];
      const beschlag = BESCHLAEGE[bIdx];
      if (fahrzeug.minLevel > sm.level) {
        return interaction.reply({ content: 'Du brauchst Level ' + fahrzeug.minLevel + '!', ephemeral: true });
      }
      if (beschlag.minLevel > sm.level) {
        return interaction.reply({ content: 'Du brauchst Level ' + beschlag.minLevel + ' fuer ' + beschlag.name + '!', ephemeral: true });
      }
      const holz = HOELZER[sm.holz_idx];
      const event = STELL_EVENTS[Math.floor(Math.random() * STELL_EVENTS.length)];
      const upBonus =
        UPGRADES.hobelbank.bonus[sm.up_hobelbank] +
        UPGRADES.rade.bonus[sm.up_rade] +
        UPGRADES.schmiede.bonus[sm.up_schmiede] +
        UPGRADES.werkstatt.bonus[sm.up_werkstatt];
      const roll = Math.random() * 100;
      let qual = QUALITAETEN[0];
      for (const q of QUALITAETEN) {
        if (roll >= q.minRoll) qual = q;
      }
      const wert = Math.floor(fahrzeug.basisWert * holz.qualitaet * beschlag.bonus * qual.multi * event.qualMulti * event.geldMulti * (1 + upBonus));
      const xpGain = Math.floor((fahrzeug.schwierigkeit * beschlag.bonus * 10 + sm.level * 2) * (1 + upBonus * 0.5));
      db.db.prepare('UPDATE stellmacher SET geld = geld + ?, xp = xp + ?, fahrzeuge_gebaut = fahrzeuge_gebaut + 1 WHERE user_id = ?').run(wert, xpGain, uId);
      db.db.prepare('UPDATE stellmacher_hof SET slot' + fIdx + ' = slot' + fIdx + ' + 1 WHERE user_id = ?').run(uId);
      const upd = getStellmacher(uId);
      const { lvl, ups } = checkLevelUp(uId, upd);
      cooldowns.set(uId + '_bauen', now + 20000);
      const embed = new EmbedBuilder()
        .setColor(0x8B4513)
        .setTitle('Fahrzeug gebaut!')
        .setDescription(event.text)
        .addFields(
          { name: 'Fahrzeug', value: fahrzeug.name, inline: true },
          { name: 'Beschlag', value: beschlag.name, inline: true },
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
      const sm = getStellmacher(uId);
      const xpGain = Math.floor(10 + sm.level * 4 + Math.random() * 20);
      db.db.prepare('UPDATE stellmacher SET xp = xp + ? WHERE user_id = ?').run(xpGain, uId);
      const upd = getStellmacher(uId);
      const { lvl, ups } = checkLevelUp(uId, upd);
      cooldowns.set(uId + '_training', now + 30000);
      return interaction.reply({
        content: 'Training abgeschlossen! +' + xpGain + ' XP. Level: ' + lvl + (ups > 0 ? ' Level Up!' : ''),
      });
    }

    if (sub === 'upgrade') {
      const sm = getStellmacher(uId);
      const slot = interaction.options.getString('slot');
      if (!slot || !UPGRADES[slot]) {
        return interaction.reply({ content: 'Ungueltiger Slot!', ephemeral: true });
      }
      const upKey = 'up_' + slot;
      const currentLevel = sm[upKey];
      const upInfo = UPGRADES[slot];
      if (currentLevel >= upInfo.stufen.length - 1) {
        return interaction.reply({ content: upInfo.name + ' ist auf Maximum!', ephemeral: true });
      }
      const cost = upInfo.stufen[currentLevel + 1];
      if (sm.geld < cost) {
        return interaction.reply({ content: 'Nicht genug Taler! Kosten: ' + cost + '.', ephemeral: true });
      }
      db.db.prepare('UPDATE stellmacher SET geld = geld - ?, ' + upKey + ' = ' + upKey + ' + 1 WHERE user_id = ?').run(cost, uId);
      const newLevel = currentLevel + 1;
      return interaction.reply({
        content: '**' + upInfo.name + '** auf Stufe ' + newLevel + '! Bonus: +' + Math.floor(upInfo.bonus[newLevel] * 100) + '%',
      });
    }

    if (sub === 'hof') {
      const hof = getHof(uId);
      const lines = FAHRZEUGE.map((f, i) => (i + 1) + '. 🛒 **' + f.name + '**: ' + (hof['slot' + i] || 0) + 'x');
      const embed = new EmbedBuilder()
        .setColor(0x8B4513)
        .setTitle('Dein Fahrzeughof')
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
      const sm = getStellmacher(uId);
      const fIdx = interaction.options.getInteger('fahrzeug') - 1;
      const fahrzeug = FAHRZEUGE[fIdx];
      const hof = getHof(uId);
      const menge = 1 + Math.floor(Math.random() * 2);
      const available = hof['slot' + fIdx] || 0;
      if (available < menge) {
        return interaction.reply({
          content: 'Nicht genug ' + fahrzeug.name + ' im Hof! Benoetigt: ' + menge + ', vorhanden: ' + available + '.',
          ephemeral: true,
        });
      }
      const bonus = 1.3 + Math.random() * 0.5;
      const wert = Math.floor(fahrzeug.basisWert * menge * bonus);
      const xpGain = Math.floor(fahrzeug.schwierigkeit * menge * 15);
      db.db.prepare('UPDATE stellmacher_hof SET slot' + fIdx + ' = slot' + fIdx + ' - ? WHERE user_id = ?').run(menge, uId);
      db.db.prepare('UPDATE stellmacher SET geld = geld + ?, xp = xp + ?, auftraege = auftraege + 1 WHERE user_id = ?').run(wert, xpGain, uId);
      const upd = getStellmacher(uId);
      const { lvl, ups } = checkLevelUp(uId, upd);
      cooldowns.set(uId + '_auftrag', now + 45000);
      return interaction.reply({
        content: 'Auftrag: ' + menge + 'x ' + fahrzeug.name + ' geliefert. +' + wert + ' Taler, +' + xpGain + ' XP. Level: ' + lvl + (ups > 0 ? ' Level Up!' : ''),
      });
    }

    if (sub === 'duell') {
      const gegner = interaction.options.getUser('gegner');
      if (!gegner || gegner.id === uId) {
        return interaction.reply({ content: 'Ungueltiger Gegner!', ephemeral: true });
      }
      const sm = getStellmacher(uId);
      const gegnerSm = db.db.prepare('SELECT * FROM stellmacher WHERE user_id = ?').get(gegner.id);
      if (!gegnerSm) {
        return interaction.reply({ content: 'Dieser Spieler ist noch kein Stellmacher!', ephemeral: true });
      }
      const myScore = sm.level * 10 + sm.up_hobelbank * 5 + sm.up_rade * 5 + sm.up_schmiede * 5 + sm.up_werkstatt * 5 + Math.random() * 30;
      const gScore = gegnerSm.level * 10 + gegnerSm.up_hobelbank * 5 + gegnerSm.up_rade * 5 + gegnerSm.up_schmiede * 5 + gegnerSm.up_werkstatt * 5 + Math.random() * 30;
      const gewonnen = myScore > gScore;
      const einsatz = Math.min(Math.floor(sm.geld * 0.1), Math.floor(gegnerSm.geld * 0.1), 5000);
      if (gewonnen) {
        db.db.prepare('UPDATE stellmacher SET geld = geld + ?, duelle_gewonnen = duelle_gewonnen + 1 WHERE user_id = ?').run(einsatz, uId);
        db.db.prepare('UPDATE stellmacher SET geld = geld - ? WHERE user_id = ?').run(einsatz, gegner.id);
      } else {
        db.db.prepare('UPDATE stellmacher SET geld = geld - ? WHERE user_id = ?').run(einsatz, uId);
        db.db.prepare('UPDATE stellmacher SET geld = geld + ? WHERE user_id = ?').run(einsatz, gegner.id);
      }
      const embed = new EmbedBuilder()
        .setColor(gewonnen ? 0x00FF00 : 0xFF0000)
        .setTitle('Stellmacher-Duell!')
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
