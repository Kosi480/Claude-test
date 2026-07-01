const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

const MILCHEN = [
  { name: 'Kuhmilch', preis: 25, qualitaet: 1.0, emoji: '🐄' },
  { name: 'Ziegenmilch', preis: 65, qualitaet: 1.3, emoji: '🐐' },
  { name: 'Schafsmilch', preis: 150, qualitaet: 1.65, emoji: '🐑' },
  { name: 'Bueffelimilch', preis: 340, qualitaet: 2.05, emoji: '🦬' },
  { name: 'Elfenmilch', preis: 800, qualitaet: 2.6, emoji: '✨' },
  { name: 'Einhormmilch', preis: 2000, qualitaet: 3.3, emoji: '🦄' },
  { name: 'Mondmilch', preis: 5200, qualitaet: 4.2, emoji: '🌙' },
  { name: 'Aethermilch', preis: 13000, qualitaet: 5.8, emoji: '⚗️' },
];

const KAESESORTEN = [
  { name: 'Frischkaese', basisWert: 45, schwierigkeit: 1, minLevel: 1 },
  { name: 'Weichkaese', basisWert: 100, schwierigkeit: 2, minLevel: 3 },
  { name: 'Halbfester Schnittkaese', basisWert: 200, schwierigkeit: 3, minLevel: 6 },
  { name: 'Hartkaese', basisWert: 380, schwierigkeit: 4, minLevel: 10 },
  { name: 'Blauschimmelkaese', basisWert: 720, schwierigkeit: 5, minLevel: 15 },
  { name: 'Alpenbergkaese', basisWert: 1400, schwierigkeit: 6, minLevel: 22 },
  { name: 'Elfenkaese', basisWert: 2800, schwierigkeit: 7, minLevel: 30 },
  { name: 'Legendaerer Mondkaese', basisWert: 7200, schwierigkeit: 8, minLevel: 40 },
];

const KULTUREN = [
  { name: 'Standardkultur', bonus: 1.0, minLevel: 1 },
  { name: 'Mesophile Kultur', bonus: 1.2, minLevel: 2 },
  { name: 'Thermophile Kultur', bonus: 1.45, minLevel: 5 },
  { name: 'Schimmelkultur', bonus: 1.7, minLevel: 9 },
  { name: 'Alpinkultur', bonus: 2.0, minLevel: 14 },
  { name: 'Elfenkultur', bonus: 2.4, minLevel: 20 },
  { name: 'Mondkultur', bonus: 3.0, minLevel: 28 },
  { name: 'Aetherkultur', bonus: 3.9, minLevel: 38 },
];

const QUALITAETEN = [
  { name: 'Sauer', multi: 0.3, minRoll: 0 },
  { name: 'Blass', multi: 0.55, minRoll: 15 },
  { name: 'Einfach', multi: 0.8, minRoll: 30 },
  { name: 'Cremig', multi: 1.0, minRoll: 50 },
  { name: 'Wuerzig', multi: 1.35, minRoll: 68 },
  { name: 'Exquisit', multi: 1.75, minRoll: 82 },
  { name: 'Meisterhaft', multi: 2.5, minRoll: 93 },
];

const UPGRADES = {
  kaesekessel: {
    name: 'Kaesekessel',
    stufen: [0, 400, 1200, 3200, 8000, 20000, 50000, 125000, 292000, 680000],
    bonus: [0, 0.05, 0.1, 0.16, 0.23, 0.31, 0.41, 0.53, 0.67, 0.86],
  },
  reifekeller: {
    name: 'Reifekeller',
    stufen: [0, 700, 2100, 5600, 14000, 35000, 87500, 218000, 510000, 1190000],
    bonus: [0, 0.07, 0.14, 0.22, 0.31, 0.41, 0.52, 0.65, 0.8, 1.0],
  },
  presse: {
    name: 'Kaesepresse',
    stufen: [0, 350, 1050, 2800, 7000, 17500, 43750, 109000, 255000, 595000],
    bonus: [0, 0.04, 0.09, 0.15, 0.22, 0.3, 0.39, 0.5, 0.63, 0.8],
  },
  werkstatt: {
    name: 'Kaeserei',
    stufen: [0, 2000, 6000, 15000, 36000, 83000, 190000, 425000, 955000, 2150000],
    bonus: [0, 0.08, 0.17, 0.27, 0.38, 0.51, 0.66, 0.83, 1.04, 1.3],
  },
};

const KAESE_EVENTS = [
  { text: 'Perfekte Reifung! Der Kaese entwickelt ein ausgezeichnetes Aroma.', qualMulti: 1.6, geldMulti: 1.0 },
  { text: 'Schlechte Kultur - der Kaese ist zu sauer.', qualMulti: 0.65, geldMulti: 1.0 },
  { text: 'Seltene Kraeutermischung zugegeben! Besonderer Geschmack.', qualMulti: 1.3, geldMulti: 1.55 },
  { text: 'Unerwuenschter Schimmel befallen. Kaeseverluste leider unvermeidbar.', qualMulti: 0.75, geldMulti: 0.8 },
  { text: 'Ideale Kellertemperatur! Ein Meisterwerk der Kaeserei.', qualMulti: 1.9, geldMulti: 1.2 },
  { text: 'Gleichmaessige Pressung! Hervorragende Textur und Konsistenz.', qualMulti: 1.2, geldMulti: 1.4 },
  { text: 'Gastronom zahlt Premium fuer das exklusive Stueck.', qualMulti: 1.0, geldMulti: 1.85 },
];

const cooldowns = new Map();

function ensureKaeseTable() {
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS kaesemacher (
      user_id TEXT PRIMARY KEY,
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      geld INTEGER DEFAULT 0,
      milch_idx INTEGER DEFAULT 0,
      kaese_hergestellt INTEGER DEFAULT 0,
      auftraege INTEGER DEFAULT 0,
      duelle_gewonnen INTEGER DEFAULT 0,
      up_kaesekessel INTEGER DEFAULT 0,
      up_reifekeller INTEGER DEFAULT 0,
      up_presse INTEGER DEFAULT 0,
      up_werkstatt INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS kaesemacher_keller (
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

function getKaesemacher(uId) {
  let row = db.db.prepare('SELECT * FROM kaesemacher WHERE user_id = ?').get(uId);
  if (!row) {
    db.db.prepare('INSERT INTO kaesemacher (user_id) VALUES (?)').run(uId);
    db.db.prepare('INSERT INTO kaesemacher_keller (user_id) VALUES (?)').run(uId);
    row = db.db.prepare('SELECT * FROM kaesemacher WHERE user_id = ?').get(uId);
  }
  return row;
}

function getKeller(uId) {
  let row = db.db.prepare('SELECT * FROM kaesemacher_keller WHERE user_id = ?').get(uId);
  if (!row) {
    db.db.prepare('INSERT INTO kaesemacher_keller (user_id) VALUES (?)').run(uId);
    row = db.db.prepare('SELECT * FROM kaesemacher_keller WHERE user_id = ?').get(uId);
  }
  return row;
}

function xpForLevel(l) {
  return l * l * 51;
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
    db.db.prepare('UPDATE kaesemacher SET level = ?, xp = ? WHERE user_id = ?').run(lvl, xp, uId);
  }
  return { lvl, ups };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kaesemacher')
    .setDescription('Werde ein Meister der Kaeserei und reifte edle Kaesesorten!')
    .addSubcommand(sub => sub.setName('start').setDescription('Beginne deine Kaesemacher-Karriere'))
    .addSubcommand(sub => sub.setName('status').setDescription('Zeige deinen Kaesemacher-Status'))
    .addSubcommand(sub => sub.setName('milchen').setDescription('Liste alle verfuegbaren Milcharten'))
    .addSubcommand(sub =>
      sub
        .setName('kaufen')
        .setDescription('Kaufe eine neue Milchart')
        .addIntegerOption(o =>
          o.setName('milch').setDescription('Milchart (1-8)').setRequired(true).setMinValue(1).setMaxValue(8)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('kaesen')
        .setDescription('Stelle einen neuen Kaese her')
        .addIntegerOption(o =>
          o.setName('sorte').setDescription('Kaesesorte (1-8)').setRequired(true).setMinValue(1).setMaxValue(8)
        )
        .addIntegerOption(o =>
          o.setName('kultur').setDescription('Reifungskultur (1-8)').setRequired(true).setMinValue(1).setMaxValue(8)
        )
    )
    .addSubcommand(sub => sub.setName('training').setDescription('Verbessere deine Kaeserei-Kenntnisse'))
    .addSubcommand(sub =>
      sub
        .setName('upgrade')
        .setDescription('Verbessere deine Kaeserei-Ausruestung')
        .addStringOption(o =>
          o
            .setName('slot')
            .setDescription('Ausruestungsslot')
            .setRequired(true)
            .addChoices(
              { name: 'Kaesekessel', value: 'kaesekessel' },
              { name: 'Reifekeller', value: 'reifekeller' },
              { name: 'Kaesepresse', value: 'presse' },
              { name: 'Kaeserei', value: 'werkstatt' }
            )
        )
    )
    .addSubcommand(sub => sub.setName('keller').setDescription('Zeige deinen Kaesekeller'))
    .addSubcommand(sub =>
      sub
        .setName('auftrag')
        .setDescription('Nimm einen Kaese-Lieferauftrag an')
        .addIntegerOption(o =>
          o.setName('sorte').setDescription('Kaesesorte (1-8)').setRequired(true).setMinValue(1).setMaxValue(8)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('duell')
        .setDescription('Fordere einen anderen Kaesemacher heraus')
        .addUserOption(o => o.setName('gegner').setDescription('Dein Herausforderer').setRequired(true))
    ),

  async execute(interaction) {
    const config = require('../config.json');
    ensureKaeseTable();
    const uId = interaction.user.id;
    const sub = interaction.options.getSubcommand();

    if (sub === 'start') {
      const existing = db.db.prepare('SELECT user_id FROM kaesemacher WHERE user_id = ?').get(uId);
      if (existing) {
        return interaction.reply({ content: 'Du bist bereits Kaesemacher!', ephemeral: true });
      }
      db.db.prepare('INSERT INTO kaesemacher (user_id) VALUES (?)').run(uId);
      db.db.prepare('INSERT INTO kaesemacher_keller (user_id) VALUES (?)').run(uId);
      const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('Willkommen in der Kaeserei!')
        .setDescription(
          'Deine Kaesemacher-Karriere beginnt!\n\n' +
          '`/kaesemacher milchen` - Milcharten ansehen\n' +
          '`/kaesemacher kaesen` - Kaese herstellen\n' +
          '`/kaesemacher status` - Fortschritt anzeigen'
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'status') {
      const km = getKaesemacher(uId);
      const milch = MILCHEN[km.milch_idx];
      const nextXp = xpForLevel(km.level);
      const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('Kaesemacher-Status von ' + interaction.user.username)
        .addFields(
          { name: 'Level', value: String(km.level), inline: true },
          { name: 'XP', value: km.xp + ' / ' + nextXp, inline: true },
          { name: 'Geld', value: km.geld + ' Taler', inline: true },
          { name: 'Milch', value: milch.emoji + ' ' + milch.name, inline: true },
          { name: 'Kaese', value: km.kaese_hergestellt + 'x', inline: true },
          { name: 'Auftraege', value: String(km.auftraege), inline: true },
          {
            name: 'Upgrades',
            value:
              'Kessel: Stufe ' + km.up_kaesekessel + '\n' +
              'Keller: Stufe ' + km.up_reifekeller + '\n' +
              'Presse: Stufe ' + km.up_presse + '\n' +
              'Kaeserei: Stufe ' + km.up_werkstatt,
          }
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'milchen') {
      const km = getKaesemacher(uId);
      const lines = MILCHEN.map((m, i) => {
        const owned = km.milch_idx >= i ? '[OK]' : '';
        return (i + 1) + '. ' + m.emoji + ' **' + m.name + '** - ' + m.preis + ' Taler | Qual. x' + m.qualitaet + ' ' + owned;
      });
      const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('Verfuegbare Milcharten')
        .setDescription(lines.join('\n'));
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'kaufen') {
      const km = getKaesemacher(uId);
      const idx = interaction.options.getInteger('milch') - 1;
      const milch = MILCHEN[idx];
      if (idx <= km.milch_idx) {
        return interaction.reply({ content: 'Du besitzt bereits ' + milch.name + '!', ephemeral: true });
      }
      if (idx > km.milch_idx + 1) {
        return interaction.reply({ content: 'Kaufe zuerst ' + MILCHEN[km.milch_idx + 1].name + '!', ephemeral: true });
      }
      if (km.geld < milch.preis) {
        return interaction.reply({ content: 'Nicht genug Taler! Benoetigt: ' + milch.preis + '.', ephemeral: true });
      }
      db.db.prepare('UPDATE kaesemacher SET geld = geld - ?, milch_idx = ? WHERE user_id = ?').run(milch.preis, idx, uId);
      return interaction.reply({
        content: 'Du hast ' + milch.emoji + ' **' + milch.name + '** fuer ' + milch.preis + ' Taler gekauft!',
      });
    }

    if (sub === 'kaesen') {
      const now = Date.now();
      const cd = cooldowns.get(uId + '_kaesen') || 0;
      if (now < cd) {
        const secs = Math.ceil((cd - now) / 1000);
        return interaction.reply({ content: 'Warte noch ' + secs + 's.', ephemeral: true });
      }
      const km = getKaesemacher(uId);
      const sIdx = interaction.options.getInteger('sorte') - 1;
      const kIdx = interaction.options.getInteger('kultur') - 1;
      const sorte = KAESESORTEN[sIdx];
      const kultur = KULTUREN[kIdx];
      if (sorte.minLevel > km.level) {
        return interaction.reply({ content: 'Du brauchst Level ' + sorte.minLevel + '!', ephemeral: true });
      }
      if (kultur.minLevel > km.level) {
        return interaction.reply({ content: 'Du brauchst Level ' + kultur.minLevel + ' fuer ' + kultur.name + '!', ephemeral: true });
      }
      const milch = MILCHEN[km.milch_idx];
      const event = KAESE_EVENTS[Math.floor(Math.random() * KAESE_EVENTS.length)];
      const upBonus =
        UPGRADES.kaesekessel.bonus[km.up_kaesekessel] +
        UPGRADES.reifekeller.bonus[km.up_reifekeller] +
        UPGRADES.presse.bonus[km.up_presse] +
        UPGRADES.werkstatt.bonus[km.up_werkstatt];
      const roll = Math.random() * 100;
      let qual = QUALITAETEN[0];
      for (const q of QUALITAETEN) {
        if (roll >= q.minRoll) qual = q;
      }
      const wert = Math.floor(sorte.basisWert * milch.qualitaet * kultur.bonus * qual.multi * event.qualMulti * event.geldMulti * (1 + upBonus));
      const xpGain = Math.floor((sorte.schwierigkeit * kultur.bonus * 10 + km.level * 2) * (1 + upBonus * 0.5));
      db.db.prepare('UPDATE kaesemacher SET geld = geld + ?, xp = xp + ?, kaese_hergestellt = kaese_hergestellt + 1 WHERE user_id = ?').run(wert, xpGain, uId);
      db.db.prepare('UPDATE kaesemacher_keller SET slot' + sIdx + ' = slot' + sIdx + ' + 1 WHERE user_id = ?').run(uId);
      const upd = getKaesemacher(uId);
      const { lvl, ups } = checkLevelUp(uId, upd);
      cooldowns.set(uId + '_kaesen', now + 20000);
      const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('Kaese hergestellt!')
        .setDescription(event.text)
        .addFields(
          { name: 'Sorte', value: sorte.name, inline: true },
          { name: 'Kultur', value: kultur.name, inline: true },
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
      const km = getKaesemacher(uId);
      const xpGain = Math.floor(10 + km.level * 4 + Math.random() * 20);
      db.db.prepare('UPDATE kaesemacher SET xp = xp + ? WHERE user_id = ?').run(xpGain, uId);
      const upd = getKaesemacher(uId);
      const { lvl, ups } = checkLevelUp(uId, upd);
      cooldowns.set(uId + '_training', now + 30000);
      return interaction.reply({
        content: 'Training abgeschlossen! +' + xpGain + ' XP. Level: ' + lvl + (ups > 0 ? ' Level Up!' : ''),
      });
    }

    if (sub === 'upgrade') {
      const km = getKaesemacher(uId);
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
      db.db.prepare('UPDATE kaesemacher SET geld = geld - ?, ' + upKey + ' = ' + upKey + ' + 1 WHERE user_id = ?').run(cost, uId);
      const newLevel = currentLevel + 1;
      return interaction.reply({
        content: '**' + upInfo.name + '** auf Stufe ' + newLevel + '! Bonus: +' + Math.floor(upInfo.bonus[newLevel] * 100) + '%',
      });
    }

    if (sub === 'keller') {
      const keller = getKeller(uId);
      const lines = KAESESORTEN.map((k, i) => (i + 1) + '. 🧀 **' + k.name + '**: ' + (keller['slot' + i] || 0) + 'x');
      const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('Dein Kaesekeller')
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
      const km = getKaesemacher(uId);
      const sIdx = interaction.options.getInteger('sorte') - 1;
      const sorte = KAESESORTEN[sIdx];
      const keller = getKeller(uId);
      const menge = 1 + Math.floor(Math.random() * 3);
      const available = keller['slot' + sIdx] || 0;
      if (available < menge) {
        return interaction.reply({
          content: 'Nicht genug ' + sorte.name + ' im Keller! Benoetigt: ' + menge + ', vorhanden: ' + available + '.',
          ephemeral: true,
        });
      }
      const bonus = 1.3 + Math.random() * 0.5;
      const wert = Math.floor(sorte.basisWert * menge * bonus);
      const xpGain = Math.floor(sorte.schwierigkeit * menge * 15);
      db.db.prepare('UPDATE kaesemacher_keller SET slot' + sIdx + ' = slot' + sIdx + ' - ? WHERE user_id = ?').run(menge, uId);
      db.db.prepare('UPDATE kaesemacher SET geld = geld + ?, xp = xp + ?, auftraege = auftraege + 1 WHERE user_id = ?').run(wert, xpGain, uId);
      const upd = getKaesemacher(uId);
      const { lvl, ups } = checkLevelUp(uId, upd);
      cooldowns.set(uId + '_auftrag', now + 45000);
      return interaction.reply({
        content: 'Auftrag: ' + menge + 'x ' + sorte.name + ' geliefert. +' + wert + ' Taler, +' + xpGain + ' XP. Level: ' + lvl + (ups > 0 ? ' Level Up!' : ''),
      });
    }

    if (sub === 'duell') {
      const gegner = interaction.options.getUser('gegner');
      if (!gegner || gegner.id === uId) {
        return interaction.reply({ content: 'Ungueltiger Gegner!', ephemeral: true });
      }
      const km = getKaesemacher(uId);
      const gegnerKm = db.db.prepare('SELECT * FROM kaesemacher WHERE user_id = ?').get(gegner.id);
      if (!gegnerKm) {
        return interaction.reply({ content: 'Dieser Spieler ist noch kein Kaesemacher!', ephemeral: true });
      }
      const myScore = km.level * 10 + km.up_kaesekessel * 5 + km.up_reifekeller * 5 + km.up_presse * 5 + km.up_werkstatt * 5 + Math.random() * 30;
      const gScore = gegnerKm.level * 10 + gegnerKm.up_kaesekessel * 5 + gegnerKm.up_reifekeller * 5 + gegnerKm.up_presse * 5 + gegnerKm.up_werkstatt * 5 + Math.random() * 30;
      const gewonnen = myScore > gScore;
      const einsatz = Math.min(Math.floor(km.geld * 0.1), Math.floor(gegnerKm.geld * 0.1), 5000);
      if (gewonnen) {
        db.db.prepare('UPDATE kaesemacher SET geld = geld + ?, duelle_gewonnen = duelle_gewonnen + 1 WHERE user_id = ?').run(einsatz, uId);
        db.db.prepare('UPDATE kaesemacher SET geld = geld - ? WHERE user_id = ?').run(einsatz, gegner.id);
      } else {
        db.db.prepare('UPDATE kaesemacher SET geld = geld - ? WHERE user_id = ?').run(einsatz, uId);
        db.db.prepare('UPDATE kaesemacher SET geld = geld + ? WHERE user_id = ?').run(einsatz, gegner.id);
      }
      const embed = new EmbedBuilder()
        .setColor(gewonnen ? 0x00FF00 : 0xFF0000)
        .setTitle('Kaesemacher-Duell!')
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
