const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

const WACHSE = [
  { name: 'Paraffinwachs', preis: 20, qualitaet: 1.0, emoji: '🕯️' },
  { name: 'Bienenwachs', preis: 60, qualitaet: 1.3, emoji: '🐝' },
  { name: 'Soywachs', preis: 130, qualitaet: 1.6, emoji: '🌱' },
  { name: 'Kokoswachs', preis: 280, qualitaet: 2.0, emoji: '🥥' },
  { name: 'Palmwachs', preis: 600, qualitaet: 2.5, emoji: '🌴' },
  { name: 'Elfenwachs', preis: 1500, qualitaet: 3.2, emoji: '✨' },
  { name: 'Mondwachs', preis: 4000, qualitaet: 4.2, emoji: '🌙' },
  { name: 'Aetherwachs', preis: 10000, qualitaet: 5.8, emoji: '⚗️' },
];

const KERZEN = [
  { name: 'Stumpenkerze', basisWert: 40, schwierigkeit: 1, minLevel: 1 },
  { name: 'Stabkerze', basisWert: 90, schwierigkeit: 2, minLevel: 3 },
  { name: 'Teelicht', basisWert: 160, schwierigkeit: 3, minLevel: 6 },
  { name: 'Votivkerze', basisWert: 300, schwierigkeit: 4, minLevel: 10 },
  { name: 'Duftkerze', basisWert: 580, schwierigkeit: 5, minLevel: 15 },
  { name: 'Spiralkerze', basisWert: 1100, schwierigkeit: 6, minLevel: 22 },
  { name: 'Skulpturkerze', basisWert: 2200, schwierigkeit: 7, minLevel: 30 },
  { name: 'Legendaere Flammenkerze', basisWert: 5500, schwierigkeit: 8, minLevel: 40 },
];

const DUFTE = [
  { name: 'Unparfuemiert', bonus: 1.0, minLevel: 1 },
  { name: 'Lavendel', bonus: 1.2, minLevel: 2 },
  { name: 'Vanille', bonus: 1.4, minLevel: 5 },
  { name: 'Zimt', bonus: 1.65, minLevel: 9 },
  { name: 'Rose', bonus: 1.95, minLevel: 14 },
  { name: 'Sandelholz', bonus: 2.3, minLevel: 20 },
  { name: 'Elfenblumen', bonus: 2.9, minLevel: 28 },
  { name: 'Aetherduft', bonus: 3.8, minLevel: 38 },
];

const QUALITAETEN = [
  { name: 'Kleckrig', multi: 0.3, minRoll: 0 },
  { name: 'Uneben', multi: 0.55, minRoll: 15 },
  { name: 'Einfach', multi: 0.8, minRoll: 30 },
  { name: 'Gleichmaessig', multi: 1.0, minRoll: 50 },
  { name: 'Schoen', multi: 1.35, minRoll: 68 },
  { name: 'Exquisit', multi: 1.75, minRoll: 82 },
  { name: 'Meisterhaft', multi: 2.5, minRoll: 93 },
];

const UPGRADES = {
  schmelzkessel: {
    name: 'Schmelzkessel',
    stufen: [0, 400, 1200, 3000, 8000, 20000, 50000, 120000, 280000, 650000],
    bonus: [0, 0.05, 0.1, 0.16, 0.23, 0.31, 0.41, 0.53, 0.67, 0.86],
  },
  giessform: {
    name: 'Giessform',
    stufen: [0, 350, 1000, 2600, 7000, 17000, 42000, 105000, 240000, 560000],
    bonus: [0, 0.06, 0.12, 0.19, 0.27, 0.36, 0.46, 0.58, 0.72, 0.9],
  },
  dochtzange: {
    name: 'Dochtzange',
    stufen: [0, 280, 850, 2200, 5800, 14000, 35000, 88000, 200000, 470000],
    bonus: [0, 0.04, 0.09, 0.15, 0.22, 0.3, 0.39, 0.5, 0.63, 0.8],
  },
  werkstatt: {
    name: 'Kerzenwerkstatt',
    stufen: [0, 1800, 5500, 13000, 32000, 75000, 170000, 380000, 850000, 1900000],
    bonus: [0, 0.08, 0.17, 0.27, 0.38, 0.51, 0.66, 0.83, 1.04, 1.3],
  },
};

const KERZEN_EVENTS = [
  { text: 'Perfekte Gusstemperatur! Die Kerze gelingt ausgezeichnet.', qualMulti: 1.6, geldMulti: 1.0 },
  { text: 'Der Docht ist zu kurz. Die Qualitaet leidet.', qualMulti: 0.7, geldMulti: 1.0 },
  { text: 'Seltene Duftstoffe gefunden! Exklusiver Duft.', qualMulti: 1.3, geldMulti: 1.5 },
  { text: 'Das Wachs ist verunreinigt. Teile mussten verworfen werden.', qualMulti: 0.8, geldMulti: 0.7 },
  { text: 'Inspirierter Moment! Ein wahres Meisterwerk entsteht.', qualMulti: 1.9, geldMulti: 1.2 },
  { text: 'Die Form loest sich perfekt. Glatte Oberflaeche!', qualMulti: 1.2, geldMulti: 1.4 },
  { text: 'Unerwartet starker Duft begeistert die Kunden.', qualMulti: 1.0, geldMulti: 1.8 },
];

const cooldowns = new Map();

function ensureKerzenTable() {
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS kerzenmacher (
      user_id TEXT PRIMARY KEY,
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      geld INTEGER DEFAULT 0,
      wachs_idx INTEGER DEFAULT 0,
      kerzen_hergestellt INTEGER DEFAULT 0,
      auftraege INTEGER DEFAULT 0,
      duelle_gewonnen INTEGER DEFAULT 0,
      up_schmelzkessel INTEGER DEFAULT 0,
      up_giessform INTEGER DEFAULT 0,
      up_dochtzange INTEGER DEFAULT 0,
      up_werkstatt INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS kerzenmacher_lager (
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

function getKerzenmacher(uId) {
  let row = db.db.prepare('SELECT * FROM kerzenmacher WHERE user_id = ?').get(uId);
  if (!row) {
    db.db.prepare('INSERT INTO kerzenmacher (user_id) VALUES (?)').run(uId);
    db.db.prepare('INSERT INTO kerzenmacher_lager (user_id) VALUES (?)').run(uId);
    row = db.db.prepare('SELECT * FROM kerzenmacher WHERE user_id = ?').get(uId);
  }
  return row;
}

function getLager(uId) {
  let row = db.db.prepare('SELECT * FROM kerzenmacher_lager WHERE user_id = ?').get(uId);
  if (!row) {
    db.db.prepare('INSERT INTO kerzenmacher_lager (user_id) VALUES (?)').run(uId);
    row = db.db.prepare('SELECT * FROM kerzenmacher_lager WHERE user_id = ?').get(uId);
  }
  return row;
}

function xpForLevel(l) {
  return l * l * 52;
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
    db.db.prepare('UPDATE kerzenmacher SET level = ?, xp = ? WHERE user_id = ?').run(lvl, xp, uId);
  }
  return { lvl, ups };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kerzenmacher')
    .setDescription('Stelle kunstvolle Kerzen her und erhelle die Welt!')
    .addSubcommand(sub => sub.setName('start').setDescription('Beginne deine Kerzenmacher-Karriere'))
    .addSubcommand(sub => sub.setName('status').setDescription('Zeige deinen Kerzenmacher-Status'))
    .addSubcommand(sub => sub.setName('wachse').setDescription('Liste alle verfuegbaren Wachsarten'))
    .addSubcommand(sub =>
      sub
        .setName('kaufen')
        .setDescription('Kaufe ein neues Wachs')
        .addIntegerOption(o =>
          o.setName('wachs').setDescription('Wachsart (1-8)').setRequired(true).setMinValue(1).setMaxValue(8)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('giessen')
        .setDescription('Giesse eine neue Kerze')
        .addIntegerOption(o =>
          o.setName('kerze').setDescription('Kerzentyp (1-8)').setRequired(true).setMinValue(1).setMaxValue(8)
        )
        .addIntegerOption(o =>
          o.setName('duft').setDescription('Duftstoff (1-8)').setRequired(true).setMinValue(1).setMaxValue(8)
        )
    )
    .addSubcommand(sub => sub.setName('training').setDescription('Verbessere deine Kerzen-Kenntnisse'))
    .addSubcommand(sub =>
      sub
        .setName('upgrade')
        .setDescription('Verbessere deine Ausruestung')
        .addStringOption(o =>
          o
            .setName('slot')
            .setDescription('Ausruestungsslot')
            .setRequired(true)
            .addChoices(
              { name: 'Schmelzkessel', value: 'schmelzkessel' },
              { name: 'Giessform', value: 'giessform' },
              { name: 'Dochtzange', value: 'dochtzange' },
              { name: 'Kerzenwerkstatt', value: 'werkstatt' }
            )
        )
    )
    .addSubcommand(sub => sub.setName('lager').setDescription('Zeige dein Kerzen-Lager'))
    .addSubcommand(sub =>
      sub
        .setName('auftrag')
        .setDescription('Nimm einen Kerzen-Lieferauftrag an')
        .addIntegerOption(o =>
          o.setName('kerze').setDescription('Kerzentyp (1-8)').setRequired(true).setMinValue(1).setMaxValue(8)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('duell')
        .setDescription('Fordere einen anderen Kerzenmacher heraus')
        .addUserOption(o => o.setName('gegner').setDescription('Dein Herausforderer').setRequired(true))
    ),

  async execute(interaction) {
    const config = require('../config.json');
    ensureKerzenTable();
    const uId = interaction.user.id;
    const sub = interaction.options.getSubcommand();

    if (sub === 'start') {
      const existing = db.db.prepare('SELECT user_id FROM kerzenmacher WHERE user_id = ?').get(uId);
      if (existing) {
        return interaction.reply({ content: 'Du bist bereits Kerzenmacher!', ephemeral: true });
      }
      db.db.prepare('INSERT INTO kerzenmacher (user_id) VALUES (?)').run(uId);
      db.db.prepare('INSERT INTO kerzenmacher_lager (user_id) VALUES (?)').run(uId);
      const embed = new EmbedBuilder()
        .setColor(0xFFA500)
        .setTitle('Willkommen in der Kerzenwerkstatt!')
        .setDescription(
          'Deine Kerzenmacher-Karriere beginnt!\n\n' +
          '`/kerzenmacher wachse` - Wachsarten ansehen\n' +
          '`/kerzenmacher giessen` - Kerze giessen\n' +
          '`/kerzenmacher status` - Fortschritt anzeigen'
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'status') {
      const km = getKerzenmacher(uId);
      const wachs = WACHSE[km.wachs_idx];
      const nextXp = xpForLevel(km.level);
      const embed = new EmbedBuilder()
        .setColor(0xFFA500)
        .setTitle('Kerzenmacher-Status von ' + interaction.user.username)
        .addFields(
          { name: 'Level', value: String(km.level), inline: true },
          { name: 'XP', value: km.xp + ' / ' + nextXp, inline: true },
          { name: 'Geld', value: km.geld + ' Taler', inline: true },
          { name: 'Wachs', value: wachs.emoji + ' ' + wachs.name, inline: true },
          { name: 'Kerzen', value: km.kerzen_hergestellt + 'x', inline: true },
          { name: 'Auftraege', value: String(km.auftraege), inline: true },
          {
            name: 'Upgrades',
            value:
              'Schmelzkessel: Stufe ' + km.up_schmelzkessel + '\n' +
              'Giessform: Stufe ' + km.up_giessform + '\n' +
              'Dochtzange: Stufe ' + km.up_dochtzange + '\n' +
              'Werkstatt: Stufe ' + km.up_werkstatt,
          }
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'wachse') {
      const km = getKerzenmacher(uId);
      const lines = WACHSE.map((w, i) => {
        const owned = km.wachs_idx >= i ? '[OK]' : '';
        return (i + 1) + '. ' + w.emoji + ' **' + w.name + '** - ' + w.preis + ' Taler | Qual. x' + w.qualitaet + ' ' + owned;
      });
      const embed = new EmbedBuilder()
        .setColor(0xFFA500)
        .setTitle('Verfuegbare Wachsarten')
        .setDescription(lines.join('\n'));
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'kaufen') {
      const km = getKerzenmacher(uId);
      const idx = interaction.options.getInteger('wachs') - 1;
      const wachs = WACHSE[idx];
      if (idx <= km.wachs_idx) {
        return interaction.reply({ content: 'Du besitzt bereits ' + wachs.name + '!', ephemeral: true });
      }
      if (idx > km.wachs_idx + 1) {
        return interaction.reply({
          content: 'Du musst zuerst ' + WACHSE[km.wachs_idx + 1].name + ' kaufen!',
          ephemeral: true,
        });
      }
      if (km.geld < wachs.preis) {
        return interaction.reply({
          content: 'Nicht genug Taler! Benoetigt: ' + wachs.preis + ', vorhanden: ' + km.geld + '.',
          ephemeral: true,
        });
      }
      db.db.prepare('UPDATE kerzenmacher SET geld = geld - ?, wachs_idx = ? WHERE user_id = ?').run(wachs.preis, idx, uId);
      return interaction.reply({
        content: 'Du hast ' + wachs.emoji + ' **' + wachs.name + '** fuer ' + wachs.preis + ' Taler gekauft!',
      });
    }

    if (sub === 'giessen') {
      const now = Date.now();
      const cd = cooldowns.get(uId + '_giessen') || 0;
      if (now < cd) {
        const secs = Math.ceil((cd - now) / 1000);
        return interaction.reply({ content: 'Warte noch ' + secs + 's.', ephemeral: true });
      }
      const km = getKerzenmacher(uId);
      const kIdx = interaction.options.getInteger('kerze') - 1;
      const dIdx = interaction.options.getInteger('duft') - 1;
      const kerze = KERZEN[kIdx];
      const duft = DUFTE[dIdx];
      if (kerze.minLevel > km.level) {
        return interaction.reply({ content: 'Du brauchst Level ' + kerze.minLevel + '!', ephemeral: true });
      }
      if (duft.minLevel > km.level) {
        return interaction.reply({ content: 'Du brauchst Level ' + duft.minLevel + ' fuer ' + duft.name + '!', ephemeral: true });
      }
      const wachs = WACHSE[km.wachs_idx];
      const event = KERZEN_EVENTS[Math.floor(Math.random() * KERZEN_EVENTS.length)];
      const upBonus =
        UPGRADES.schmelzkessel.bonus[km.up_schmelzkessel] +
        UPGRADES.giessform.bonus[km.up_giessform] +
        UPGRADES.dochtzange.bonus[km.up_dochtzange] +
        UPGRADES.werkstatt.bonus[km.up_werkstatt];
      const roll = Math.random() * 100;
      let qual = QUALITAETEN[0];
      for (const q of QUALITAETEN) {
        if (roll >= q.minRoll) qual = q;
      }
      const wert = Math.floor(kerze.basisWert * wachs.qualitaet * duft.bonus * qual.multi * event.qualMulti * event.geldMulti * (1 + upBonus));
      const xpGain = Math.floor((kerze.schwierigkeit * duft.bonus * 10 + km.level * 2) * (1 + upBonus * 0.5));
      db.db.prepare('UPDATE kerzenmacher SET geld = geld + ?, xp = xp + ?, kerzen_hergestellt = kerzen_hergestellt + 1 WHERE user_id = ?').run(wert, xpGain, uId);
      db.db.prepare('UPDATE kerzenmacher_lager SET slot' + kIdx + ' = slot' + kIdx + ' + 1 WHERE user_id = ?').run(uId);
      const updatedKm = getKerzenmacher(uId);
      const { lvl, ups } = checkLevelUp(uId, updatedKm);
      cooldowns.set(uId + '_giessen', now + 20000);
      const embed = new EmbedBuilder()
        .setColor(0xFFA500)
        .setTitle('Kerze gegossen!')
        .setDescription(event.text)
        .addFields(
          { name: 'Kerze', value: kerze.name, inline: true },
          { name: 'Duft', value: duft.name, inline: true },
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
      const km = getKerzenmacher(uId);
      const xpGain = Math.floor(10 + km.level * 4 + Math.random() * 20);
      db.db.prepare('UPDATE kerzenmacher SET xp = xp + ? WHERE user_id = ?').run(xpGain, uId);
      const updatedKm = getKerzenmacher(uId);
      const { lvl, ups } = checkLevelUp(uId, updatedKm);
      cooldowns.set(uId + '_training', now + 30000);
      return interaction.reply({
        content: 'Training abgeschlossen! +' + xpGain + ' XP. Level: ' + lvl + (ups > 0 ? ' Level Up!' : ''),
      });
    }

    if (sub === 'upgrade') {
      const km = getKerzenmacher(uId);
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
      db.db.prepare('UPDATE kerzenmacher SET geld = geld - ?, ' + upKey + ' = ' + upKey + ' + 1 WHERE user_id = ?').run(cost, uId);
      const newLevel = currentLevel + 1;
      return interaction.reply({
        content: '**' + upInfo.name + '** auf Stufe ' + newLevel + '! Bonus: +' + Math.floor(upInfo.bonus[newLevel] * 100) + '%',
      });
    }

    if (sub === 'lager') {
      const lager = getLager(uId);
      const lines = KERZEN.map((k, i) => (i + 1) + '. 🕯️ **' + k.name + '**: ' + (lager['slot' + i] || 0) + 'x');
      const embed = new EmbedBuilder()
        .setColor(0xFFA500)
        .setTitle('Dein Kerzen-Lager')
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
      const km = getKerzenmacher(uId);
      const kIdx = interaction.options.getInteger('kerze') - 1;
      const kerze = KERZEN[kIdx];
      const lager = getLager(uId);
      const menge = 1 + Math.floor(Math.random() * 3);
      const available = lager['slot' + kIdx] || 0;
      if (available < menge) {
        return interaction.reply({
          content: 'Nicht genug ' + kerze.name + ' im Lager! Benoetigt: ' + menge + ', vorhanden: ' + available + '.',
          ephemeral: true,
        });
      }
      const bonus = 1.3 + Math.random() * 0.5;
      const wert = Math.floor(kerze.basisWert * menge * bonus);
      const xpGain = Math.floor(kerze.schwierigkeit * menge * 15);
      db.db.prepare('UPDATE kerzenmacher_lager SET slot' + kIdx + ' = slot' + kIdx + ' - ? WHERE user_id = ?').run(menge, uId);
      db.db.prepare('UPDATE kerzenmacher SET geld = geld + ?, xp = xp + ?, auftraege = auftraege + 1 WHERE user_id = ?').run(wert, xpGain, uId);
      const updatedKm = getKerzenmacher(uId);
      const { lvl, ups } = checkLevelUp(uId, updatedKm);
      cooldowns.set(uId + '_auftrag', now + 45000);
      return interaction.reply({
        content: 'Auftrag: ' + menge + 'x ' + kerze.name + ' geliefert. +' + wert + ' Taler, +' + xpGain + ' XP. Level: ' + lvl + (ups > 0 ? ' Level Up!' : ''),
      });
    }

    if (sub === 'duell') {
      const gegner = interaction.options.getUser('gegner');
      if (!gegner || gegner.id === uId) {
        return interaction.reply({ content: 'Ungueltiger Gegner!', ephemeral: true });
      }
      const km = getKerzenmacher(uId);
      const gegnerKm = db.db.prepare('SELECT * FROM kerzenmacher WHERE user_id = ?').get(gegner.id);
      if (!gegnerKm) {
        return interaction.reply({ content: 'Dieser Spieler ist noch kein Kerzenmacher!', ephemeral: true });
      }
      const myScore = km.level * 10 + km.up_schmelzkessel * 5 + km.up_giessform * 5 + km.up_dochtzange * 5 + km.up_werkstatt * 5 + Math.random() * 30;
      const gScore = gegnerKm.level * 10 + gegnerKm.up_schmelzkessel * 5 + gegnerKm.up_giessform * 5 + gegnerKm.up_dochtzange * 5 + gegnerKm.up_werkstatt * 5 + Math.random() * 30;
      const gewonnen = myScore > gScore;
      const einsatz = Math.min(Math.floor(km.geld * 0.1), Math.floor(gegnerKm.geld * 0.1), 5000);
      if (gewonnen) {
        db.db.prepare('UPDATE kerzenmacher SET geld = geld + ?, duelle_gewonnen = duelle_gewonnen + 1 WHERE user_id = ?').run(einsatz, uId);
        db.db.prepare('UPDATE kerzenmacher SET geld = geld - ? WHERE user_id = ?').run(einsatz, gegner.id);
      } else {
        db.db.prepare('UPDATE kerzenmacher SET geld = geld - ? WHERE user_id = ?').run(einsatz, uId);
        db.db.prepare('UPDATE kerzenmacher SET geld = geld + ? WHERE user_id = ?').run(einsatz, gegner.id);
      }
      const embed = new EmbedBuilder()
        .setColor(gewonnen ? 0x00FF00 : 0xFF0000)
        .setTitle('Kerzenmacher-Duell!')
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
