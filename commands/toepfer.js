const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

const TONE = [
  { name: 'Rotton', preis: 20, qualitaet: 1.0, emoji: '🟤' },
  { name: 'Steinzeugton', preis: 60, qualitaet: 1.3, emoji: '⬜' },
  { name: 'Porzellanmasse', preis: 140, qualitaet: 1.65, emoji: '🤍' },
  { name: 'Feinsteinzeug', preis: 320, qualitaet: 2.05, emoji: '💠' },
  { name: 'Elfenton', preis: 750, qualitaet: 2.6, emoji: '✨' },
  { name: 'Mondton', preis: 1900, qualitaet: 3.3, emoji: '🌙' },
  { name: 'Kristallkeramik', preis: 5000, qualitaet: 4.2, emoji: '💎' },
  { name: 'Aetherporzellan', preis: 12500, qualitaet: 5.8, emoji: '⚗️' },
];

const GEFAESSE = [
  { name: 'Tontopf', basisWert: 40, schwierigkeit: 1, minLevel: 1 },
  { name: 'Krug', basisWert: 90, schwierigkeit: 2, minLevel: 3 },
  { name: 'Schale', basisWert: 180, schwierigkeit: 3, minLevel: 6 },
  { name: 'Vase', basisWert: 350, schwierigkeit: 4, minLevel: 10 },
  { name: 'Amphore', basisWert: 650, schwierigkeit: 5, minLevel: 15 },
  { name: 'Teekanne', basisWert: 1250, schwierigkeit: 6, minLevel: 22 },
  { name: 'Porzellanskulptur', basisWert: 2500, schwierigkeit: 7, minLevel: 30 },
  { name: 'Legendaeres Meisterwerk', basisWert: 6500, schwierigkeit: 8, minLevel: 40 },
];

const GLASUREN = [
  { name: 'Unglasiert', bonus: 1.0, minLevel: 1 },
  { name: 'Salzglasur', bonus: 1.2, minLevel: 2 },
  { name: 'Bleiglasur', bonus: 1.45, minLevel: 5 },
  { name: 'Seladonglasur', bonus: 1.7, minLevel: 9 },
  { name: 'Kupferglasur', bonus: 2.0, minLevel: 14 },
  { name: 'Goldglasur', bonus: 2.4, minLevel: 20 },
  { name: 'Elfenglasur', bonus: 3.0, minLevel: 28 },
  { name: 'Aetherglasur', bonus: 3.9, minLevel: 38 },
];

const QUALITAETEN = [
  { name: 'Rissig', multi: 0.3, minRoll: 0 },
  { name: 'Uneben', multi: 0.55, minRoll: 15 },
  { name: 'Einfach', multi: 0.8, minRoll: 30 },
  { name: 'Gleichmaessig', multi: 1.0, minRoll: 50 },
  { name: 'Fein', multi: 1.35, minRoll: 68 },
  { name: 'Exquisit', multi: 1.75, minRoll: 82 },
  { name: 'Meisterhaft', multi: 2.5, minRoll: 93 },
];

const UPGRADES = {
  drehscheibe: {
    name: 'Toepferscheibe',
    stufen: [0, 420, 1260, 3360, 8400, 21000, 52500, 131250, 306000, 714000],
    bonus: [0, 0.05, 0.1, 0.16, 0.23, 0.31, 0.41, 0.53, 0.67, 0.86],
  },
  brennofen: {
    name: 'Brennofen',
    stufen: [0, 600, 1800, 4800, 12000, 30000, 75000, 187000, 437000, 1020000],
    bonus: [0, 0.07, 0.14, 0.22, 0.31, 0.41, 0.52, 0.65, 0.8, 1.0],
  },
  modellierset: {
    name: 'Modellierwerkzeug',
    stufen: [0, 320, 960, 2560, 6400, 16000, 40000, 100000, 233000, 545000],
    bonus: [0, 0.04, 0.09, 0.15, 0.22, 0.3, 0.39, 0.5, 0.63, 0.8],
  },
  werkstatt: {
    name: 'Toepferwerkstatt',
    stufen: [0, 1900, 5700, 14000, 34000, 79000, 180000, 405000, 910000, 2050000],
    bonus: [0, 0.08, 0.17, 0.27, 0.38, 0.51, 0.66, 0.83, 1.04, 1.3],
  },
};

const TOEPFER_EVENTS = [
  { text: 'Perfekte Zentrierung! Das Gefaess wird symmetrisch und edel.', qualMulti: 1.6, geldMulti: 1.0 },
  { text: 'Der Ton ist zu nass. Das Stueck kollabiert beim Drehen.', qualMulti: 0.65, geldMulti: 1.0 },
  { text: 'Einzigartiges Muster beim Brand entstanden! Seltenheitswert gestiegen.', qualMulti: 1.3, geldMulti: 1.55 },
  { text: 'Der Brennofen hatte die falsche Temperatur. Kleine Risse entstanden.', qualMulti: 0.75, geldMulti: 0.8 },
  { text: 'Inspirierter Moment! Ein wahres Meisterwerk der Toepferkunst.', qualMulti: 1.9, geldMulti: 1.2 },
  { text: 'Glasur laeuft gleichmaessig. Wunderschoene Oberflaechenstruktur!', qualMulti: 1.2, geldMulti: 1.4 },
  { text: 'Sammler zahlt Aufpreis fuer das besondere Stueck.', qualMulti: 1.0, geldMulti: 1.85 },
];

const cooldowns = new Map();

function ensureToepferTable() {
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS toepfer (
      user_id TEXT PRIMARY KEY,
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      geld INTEGER DEFAULT 0,
      ton_idx INTEGER DEFAULT 0,
      gefaesse_getopfert INTEGER DEFAULT 0,
      auftraege INTEGER DEFAULT 0,
      duelle_gewonnen INTEGER DEFAULT 0,
      up_drehscheibe INTEGER DEFAULT 0,
      up_brennofen INTEGER DEFAULT 0,
      up_modellierset INTEGER DEFAULT 0,
      up_werkstatt INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS toepfer_regal (
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

function getToepfer(uId) {
  let row = db.db.prepare('SELECT * FROM toepfer WHERE user_id = ?').get(uId);
  if (!row) {
    db.db.prepare('INSERT INTO toepfer (user_id) VALUES (?)').run(uId);
    db.db.prepare('INSERT INTO toepfer_regal (user_id) VALUES (?)').run(uId);
    row = db.db.prepare('SELECT * FROM toepfer WHERE user_id = ?').get(uId);
  }
  return row;
}

function getRegal(uId) {
  let row = db.db.prepare('SELECT * FROM toepfer_regal WHERE user_id = ?').get(uId);
  if (!row) {
    db.db.prepare('INSERT INTO toepfer_regal (user_id) VALUES (?)').run(uId);
    row = db.db.prepare('SELECT * FROM toepfer_regal WHERE user_id = ?').get(uId);
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
    db.db.prepare('UPDATE toepfer SET level = ?, xp = ? WHERE user_id = ?').run(lvl, xp, uId);
  }
  return { lvl, ups };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('toepfer')
    .setDescription('Forme edle Keramik und meistere die Kunst des Toepferns!')
    .addSubcommand(sub => sub.setName('start').setDescription('Beginne deine Toepfer-Karriere'))
    .addSubcommand(sub => sub.setName('status').setDescription('Zeige deinen Toepfer-Status'))
    .addSubcommand(sub => sub.setName('tone').setDescription('Liste alle verfuegbaren Tonarten'))
    .addSubcommand(sub =>
      sub
        .setName('kaufen')
        .setDescription('Kaufe eine neue Tonart')
        .addIntegerOption(o =>
          o.setName('ton').setDescription('Tonart (1-8)').setRequired(true).setMinValue(1).setMaxValue(8)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('formen')
        .setDescription('Forme ein neues Gefaess')
        .addIntegerOption(o =>
          o.setName('gefaess').setDescription('Gefaesstyp (1-8)').setRequired(true).setMinValue(1).setMaxValue(8)
        )
        .addIntegerOption(o =>
          o.setName('glasur').setDescription('Glasurtyp (1-8)').setRequired(true).setMinValue(1).setMaxValue(8)
        )
    )
    .addSubcommand(sub => sub.setName('training').setDescription('Verbessere deine Toepferkunst'))
    .addSubcommand(sub =>
      sub
        .setName('upgrade')
        .setDescription('Verbessere deine Toepfer-Ausruestung')
        .addStringOption(o =>
          o
            .setName('slot')
            .setDescription('Ausruestungsslot')
            .setRequired(true)
            .addChoices(
              { name: 'Toepferscheibe', value: 'drehscheibe' },
              { name: 'Brennofen', value: 'brennofen' },
              { name: 'Modellierwerkzeug', value: 'modellierset' },
              { name: 'Toepferwerkstatt', value: 'werkstatt' }
            )
        )
    )
    .addSubcommand(sub => sub.setName('regal').setDescription('Zeige dein Keramik-Regal'))
    .addSubcommand(sub =>
      sub
        .setName('auftrag')
        .setDescription('Nimm einen Keramik-Lieferauftrag an')
        .addIntegerOption(o =>
          o.setName('gefaess').setDescription('Gefaesstyp (1-8)').setRequired(true).setMinValue(1).setMaxValue(8)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('duell')
        .setDescription('Fordere einen anderen Toepfer heraus')
        .addUserOption(o => o.setName('gegner').setDescription('Dein Herausforderer').setRequired(true))
    ),

  async execute(interaction) {
    const config = require('../config.json');
    ensureToepferTable();
    const uId = interaction.user.id;
    const sub = interaction.options.getSubcommand();

    if (sub === 'start') {
      const existing = db.db.prepare('SELECT user_id FROM toepfer WHERE user_id = ?').get(uId);
      if (existing) {
        return interaction.reply({ content: 'Du bist bereits Toepfer!', ephemeral: true });
      }
      db.db.prepare('INSERT INTO toepfer (user_id) VALUES (?)').run(uId);
      db.db.prepare('INSERT INTO toepfer_regal (user_id) VALUES (?)').run(uId);
      const embed = new EmbedBuilder()
        .setColor(0xA0522D)
        .setTitle('Willkommen in der Toepferwerkstatt!')
        .setDescription(
          'Deine Toepfer-Karriere beginnt!\n\n' +
          '`/toepfer tone` - Tonarten ansehen\n' +
          '`/toepfer formen` - Gefaess formen\n' +
          '`/toepfer status` - Fortschritt anzeigen'
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'status') {
      const tp = getToepfer(uId);
      const ton = TONE[tp.ton_idx];
      const nextXp = xpForLevel(tp.level);
      const embed = new EmbedBuilder()
        .setColor(0xA0522D)
        .setTitle('Toepfer-Status von ' + interaction.user.username)
        .addFields(
          { name: 'Level', value: String(tp.level), inline: true },
          { name: 'XP', value: tp.xp + ' / ' + nextXp, inline: true },
          { name: 'Geld', value: tp.geld + ' Taler', inline: true },
          { name: 'Ton', value: ton.emoji + ' ' + ton.name, inline: true },
          { name: 'Getopfert', value: tp.gefaesse_getopfert + 'x', inline: true },
          { name: 'Auftraege', value: String(tp.auftraege), inline: true },
          {
            name: 'Upgrades',
            value:
              'Scheibe: Stufe ' + tp.up_drehscheibe + '\n' +
              'Ofen: Stufe ' + tp.up_brennofen + '\n' +
              'Werkzeug: Stufe ' + tp.up_modellierset + '\n' +
              'Werkstatt: Stufe ' + tp.up_werkstatt,
          }
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'tone') {
      const tp = getToepfer(uId);
      const lines = TONE.map((t, i) => {
        const owned = tp.ton_idx >= i ? '[OK]' : '';
        return (i + 1) + '. ' + t.emoji + ' **' + t.name + '** - ' + t.preis + ' Taler | Qual. x' + t.qualitaet + ' ' + owned;
      });
      const embed = new EmbedBuilder()
        .setColor(0xA0522D)
        .setTitle('Verfuegbare Tonarten')
        .setDescription(lines.join('\n'));
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'kaufen') {
      const tp = getToepfer(uId);
      const idx = interaction.options.getInteger('ton') - 1;
      const ton = TONE[idx];
      if (idx <= tp.ton_idx) {
        return interaction.reply({ content: 'Du besitzt bereits ' + ton.name + '!', ephemeral: true });
      }
      if (idx > tp.ton_idx + 1) {
        return interaction.reply({ content: 'Kaufe zuerst ' + TONE[tp.ton_idx + 1].name + '!', ephemeral: true });
      }
      if (tp.geld < ton.preis) {
        return interaction.reply({ content: 'Nicht genug Taler! Benoetigt: ' + ton.preis + '.', ephemeral: true });
      }
      db.db.prepare('UPDATE toepfer SET geld = geld - ?, ton_idx = ? WHERE user_id = ?').run(ton.preis, idx, uId);
      return interaction.reply({
        content: 'Du hast ' + ton.emoji + ' **' + ton.name + '** fuer ' + ton.preis + ' Taler gekauft!',
      });
    }

    if (sub === 'formen') {
      const now = Date.now();
      const cd = cooldowns.get(uId + '_formen') || 0;
      if (now < cd) {
        const secs = Math.ceil((cd - now) / 1000);
        return interaction.reply({ content: 'Warte noch ' + secs + 's.', ephemeral: true });
      }
      const tp = getToepfer(uId);
      const gIdx = interaction.options.getInteger('gefaess') - 1;
      const glIdx = interaction.options.getInteger('glasur') - 1;
      const gefaess = GEFAESSE[gIdx];
      const glasur = GLASUREN[glIdx];
      if (gefaess.minLevel > tp.level) {
        return interaction.reply({ content: 'Du brauchst Level ' + gefaess.minLevel + '!', ephemeral: true });
      }
      if (glasur.minLevel > tp.level) {
        return interaction.reply({ content: 'Du brauchst Level ' + glasur.minLevel + ' fuer ' + glasur.name + '!', ephemeral: true });
      }
      const ton = TONE[tp.ton_idx];
      const event = TOEPFER_EVENTS[Math.floor(Math.random() * TOEPFER_EVENTS.length)];
      const upBonus =
        UPGRADES.drehscheibe.bonus[tp.up_drehscheibe] +
        UPGRADES.brennofen.bonus[tp.up_brennofen] +
        UPGRADES.modellierset.bonus[tp.up_modellierset] +
        UPGRADES.werkstatt.bonus[tp.up_werkstatt];
      const roll = Math.random() * 100;
      let qual = QUALITAETEN[0];
      for (const q of QUALITAETEN) {
        if (roll >= q.minRoll) qual = q;
      }
      const wert = Math.floor(gefaess.basisWert * ton.qualitaet * glasur.bonus * qual.multi * event.qualMulti * event.geldMulti * (1 + upBonus));
      const xpGain = Math.floor((gefaess.schwierigkeit * glasur.bonus * 10 + tp.level * 2) * (1 + upBonus * 0.5));
      db.db.prepare('UPDATE toepfer SET geld = geld + ?, xp = xp + ?, gefaesse_getopfert = gefaesse_getopfert + 1 WHERE user_id = ?').run(wert, xpGain, uId);
      db.db.prepare('UPDATE toepfer_regal SET slot' + gIdx + ' = slot' + gIdx + ' + 1 WHERE user_id = ?').run(uId);
      const upd = getToepfer(uId);
      const { lvl, ups } = checkLevelUp(uId, upd);
      cooldowns.set(uId + '_formen', now + 20000);
      const embed = new EmbedBuilder()
        .setColor(0xA0522D)
        .setTitle('Gefaess geformt!')
        .setDescription(event.text)
        .addFields(
          { name: 'Gefaess', value: gefaess.name, inline: true },
          { name: 'Glasur', value: glasur.name, inline: true },
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
      const tp = getToepfer(uId);
      const xpGain = Math.floor(10 + tp.level * 4 + Math.random() * 20);
      db.db.prepare('UPDATE toepfer SET xp = xp + ? WHERE user_id = ?').run(xpGain, uId);
      const upd = getToepfer(uId);
      const { lvl, ups } = checkLevelUp(uId, upd);
      cooldowns.set(uId + '_training', now + 30000);
      return interaction.reply({
        content: 'Training abgeschlossen! +' + xpGain + ' XP. Level: ' + lvl + (ups > 0 ? ' Level Up!' : ''),
      });
    }

    if (sub === 'upgrade') {
      const tp = getToepfer(uId);
      const slot = interaction.options.getString('slot');
      if (!slot || !UPGRADES[slot]) {
        return interaction.reply({ content: 'Ungueltiger Slot!', ephemeral: true });
      }
      const upKey = 'up_' + slot;
      const currentLevel = tp[upKey];
      const upInfo = UPGRADES[slot];
      if (currentLevel >= upInfo.stufen.length - 1) {
        return interaction.reply({ content: upInfo.name + ' ist auf Maximum!', ephemeral: true });
      }
      const cost = upInfo.stufen[currentLevel + 1];
      if (tp.geld < cost) {
        return interaction.reply({ content: 'Nicht genug Taler! Kosten: ' + cost + '.', ephemeral: true });
      }
      db.db.prepare('UPDATE toepfer SET geld = geld - ?, ' + upKey + ' = ' + upKey + ' + 1 WHERE user_id = ?').run(cost, uId);
      const newLevel = currentLevel + 1;
      return interaction.reply({
        content: '**' + upInfo.name + '** auf Stufe ' + newLevel + '! Bonus: +' + Math.floor(upInfo.bonus[newLevel] * 100) + '%',
      });
    }

    if (sub === 'regal') {
      const regal = getRegal(uId);
      const lines = GEFAESSE.map((g, i) => (i + 1) + '. 🏺 **' + g.name + '**: ' + (regal['slot' + i] || 0) + 'x');
      const embed = new EmbedBuilder()
        .setColor(0xA0522D)
        .setTitle('Dein Keramik-Regal')
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
      const tp = getToepfer(uId);
      const gIdx = interaction.options.getInteger('gefaess') - 1;
      const gefaess = GEFAESSE[gIdx];
      const regal = getRegal(uId);
      const menge = 1 + Math.floor(Math.random() * 3);
      const available = regal['slot' + gIdx] || 0;
      if (available < menge) {
        return interaction.reply({
          content: 'Nicht genug ' + gefaess.name + ' im Regal! Benoetigt: ' + menge + ', vorhanden: ' + available + '.',
          ephemeral: true,
        });
      }
      const bonus = 1.3 + Math.random() * 0.5;
      const wert = Math.floor(gefaess.basisWert * menge * bonus);
      const xpGain = Math.floor(gefaess.schwierigkeit * menge * 15);
      db.db.prepare('UPDATE toepfer_regal SET slot' + gIdx + ' = slot' + gIdx + ' - ? WHERE user_id = ?').run(menge, uId);
      db.db.prepare('UPDATE toepfer SET geld = geld + ?, xp = xp + ?, auftraege = auftraege + 1 WHERE user_id = ?').run(wert, xpGain, uId);
      const upd = getToepfer(uId);
      const { lvl, ups } = checkLevelUp(uId, upd);
      cooldowns.set(uId + '_auftrag', now + 45000);
      return interaction.reply({
        content: 'Auftrag: ' + menge + 'x ' + gefaess.name + ' geliefert. +' + wert + ' Taler, +' + xpGain + ' XP. Level: ' + lvl + (ups > 0 ? ' Level Up!' : ''),
      });
    }

    if (sub === 'duell') {
      const gegner = interaction.options.getUser('gegner');
      if (!gegner || gegner.id === uId) {
        return interaction.reply({ content: 'Ungueltiger Gegner!', ephemeral: true });
      }
      const tp = getToepfer(uId);
      const gegnerTp = db.db.prepare('SELECT * FROM toepfer WHERE user_id = ?').get(gegner.id);
      if (!gegnerTp) {
        return interaction.reply({ content: 'Dieser Spieler ist noch kein Toepfer!', ephemeral: true });
      }
      const myScore = tp.level * 10 + tp.up_drehscheibe * 5 + tp.up_brennofen * 5 + tp.up_modellierset * 5 + tp.up_werkstatt * 5 + Math.random() * 30;
      const gScore = gegnerTp.level * 10 + gegnerTp.up_drehscheibe * 5 + gegnerTp.up_brennofen * 5 + gegnerTp.up_modellierset * 5 + gegnerTp.up_werkstatt * 5 + Math.random() * 30;
      const gewonnen = myScore > gScore;
      const einsatz = Math.min(Math.floor(tp.geld * 0.1), Math.floor(gegnerTp.geld * 0.1), 5000);
      if (gewonnen) {
        db.db.prepare('UPDATE toepfer SET geld = geld + ?, duelle_gewonnen = duelle_gewonnen + 1 WHERE user_id = ?').run(einsatz, uId);
        db.db.prepare('UPDATE toepfer SET geld = geld - ? WHERE user_id = ?').run(einsatz, gegner.id);
      } else {
        db.db.prepare('UPDATE toepfer SET geld = geld - ? WHERE user_id = ?').run(einsatz, uId);
        db.db.prepare('UPDATE toepfer SET geld = geld + ? WHERE user_id = ?').run(einsatz, gegner.id);
      }
      const embed = new EmbedBuilder()
        .setColor(gewonnen ? 0x00FF00 : 0xFF0000)
        .setTitle('Toepfer-Duell!')
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
