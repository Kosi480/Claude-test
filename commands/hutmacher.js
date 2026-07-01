const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

const FILZE = [
  { name: 'Wollfilz', preis: 25, qualitaet: 1.0, emoji: '🐑' },
  { name: 'Baumwollstoff', preis: 65, qualitaet: 1.3, emoji: '🌿' },
  { name: 'Leinenfilz', preis: 150, qualitaet: 1.65, emoji: '🌾' },
  { name: 'Seidenfilz', preis: 340, qualitaet: 2.05, emoji: '🦋' },
  { name: 'Elfenfilz', preis: 800, qualitaet: 2.6, emoji: '✨' },
  { name: 'Mondstoff', preis: 2000, qualitaet: 3.3, emoji: '🌙' },
  { name: 'Sternengewebe', preis: 5200, qualitaet: 4.2, emoji: '⭐' },
  { name: 'Aethergewebe', preis: 13000, qualitaet: 5.8, emoji: '⚗️' },
];

const HUETE = [
  { name: 'Schlafmuetze', basisWert: 40, schwierigkeit: 1, minLevel: 1 },
  { name: 'Schiebmuetze', basisWert: 90, schwierigkeit: 2, minLevel: 3 },
  { name: 'Zylinder', basisWert: 185, schwierigkeit: 3, minLevel: 6 },
  { name: 'Federhut', basisWert: 360, schwierigkeit: 4, minLevel: 10 },
  { name: 'Tricorne', basisWert: 680, schwierigkeit: 5, minLevel: 15 },
  { name: 'Kronenhelm', basisWert: 1300, schwierigkeit: 6, minLevel: 22 },
  { name: 'Elfenkrone', basisWert: 2600, schwierigkeit: 7, minLevel: 30 },
  { name: 'Legendaere Aetherkrone', basisWert: 6600, schwierigkeit: 8, minLevel: 40 },
];

const VERZIERUNGEN = [
  { name: 'Unverziert', bonus: 1.0, minLevel: 1 },
  { name: 'Schleife', bonus: 1.2, minLevel: 2 },
  { name: 'Feder', bonus: 1.45, minLevel: 5 },
  { name: 'Perlenband', bonus: 1.7, minLevel: 9 },
  { name: 'Goldstickerei', bonus: 2.0, minLevel: 14 },
  { name: 'Edelstein', bonus: 2.4, minLevel: 20 },
  { name: 'Elfenzauber', bonus: 3.0, minLevel: 28 },
  { name: 'Aetherkristall', bonus: 3.9, minLevel: 38 },
];

const QUALITAETEN = [
  { name: 'Schief', multi: 0.3, minRoll: 0 },
  { name: 'Grob', multi: 0.55, minRoll: 15 },
  { name: 'Einfach', multi: 0.8, minRoll: 30 },
  { name: 'Ordentlich', multi: 1.0, minRoll: 50 },
  { name: 'Elegant', multi: 1.35, minRoll: 68 },
  { name: 'Exquisit', multi: 1.75, minRoll: 82 },
  { name: 'Meisterhaft', multi: 2.5, minRoll: 93 },
];

const UPGRADES = {
  hutform: {
    name: 'Hutform',
    stufen: [0, 400, 1200, 3200, 8000, 20000, 50000, 125000, 292000, 680000],
    bonus: [0, 0.05, 0.1, 0.16, 0.23, 0.31, 0.41, 0.53, 0.67, 0.86],
  },
  naehmaschine: {
    name: 'Naehmaschine',
    stufen: [0, 600, 1800, 4800, 12000, 30000, 75000, 188000, 438000, 1020000],
    bonus: [0, 0.07, 0.14, 0.22, 0.31, 0.41, 0.52, 0.65, 0.8, 1.0],
  },
  dampfpresse: {
    name: 'Dampfpresse',
    stufen: [0, 350, 1050, 2800, 7000, 17500, 43750, 109000, 255000, 595000],
    bonus: [0, 0.04, 0.09, 0.15, 0.22, 0.3, 0.39, 0.5, 0.63, 0.8],
  },
  werkstatt: {
    name: 'Hutmacherwerkstatt',
    stufen: [0, 1900, 5700, 14250, 34000, 79000, 178000, 400000, 900000, 2025000],
    bonus: [0, 0.08, 0.17, 0.27, 0.38, 0.51, 0.66, 0.83, 1.04, 1.3],
  },
};

const HUT_EVENTS = [
  { text: 'Perfekte Passform! Der Hut sitzt wie angegossen.', qualMulti: 1.6, geldMulti: 1.0 },
  { text: 'Der Filz verzieht sich beim Daempfen. Schiefe Krempe.', qualMulti: 0.65, geldMulti: 1.0 },
  { text: 'Seltene Federn gefunden! Besondere Eleganz.', qualMulti: 1.3, geldMulti: 1.55 },
  { text: 'Naht ist aufgegangen. Muehsame Reparatur noetig.', qualMulti: 0.75, geldMulti: 0.8 },
  { text: 'Meisterhafte Formgebung! Ein wahres Kunstwerk.', qualMulti: 1.9, geldMulti: 1.2 },
  { name: 'Gleichmaessige Krempe. Tadelloser Sitz!', qualMulti: 1.2, geldMulti: 1.4 },
  { text: 'Adeliger zahlt Aufpreis fuer den exklusiven Hut.', qualMulti: 1.0, geldMulti: 1.85 },
];

const cooldowns = new Map();

function ensureHutTable() {
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS hutmacher (
      user_id TEXT PRIMARY KEY,
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      geld INTEGER DEFAULT 0,
      filz_idx INTEGER DEFAULT 0,
      huete_gefertigt INTEGER DEFAULT 0,
      auftraege INTEGER DEFAULT 0,
      duelle_gewonnen INTEGER DEFAULT 0,
      up_hutform INTEGER DEFAULT 0,
      up_naehmaschine INTEGER DEFAULT 0,
      up_dampfpresse INTEGER DEFAULT 0,
      up_werkstatt INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS hutmacher_lager (
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

function getHutmacher(uId) {
  let row = db.db.prepare('SELECT * FROM hutmacher WHERE user_id = ?').get(uId);
  if (!row) {
    db.db.prepare('INSERT INTO hutmacher (user_id) VALUES (?)').run(uId);
    db.db.prepare('INSERT INTO hutmacher_lager (user_id) VALUES (?)').run(uId);
    row = db.db.prepare('SELECT * FROM hutmacher WHERE user_id = ?').get(uId);
  }
  return row;
}

function getLager(uId) {
  let row = db.db.prepare('SELECT * FROM hutmacher_lager WHERE user_id = ?').get(uId);
  if (!row) {
    db.db.prepare('INSERT INTO hutmacher_lager (user_id) VALUES (?)').run(uId);
    row = db.db.prepare('SELECT * FROM hutmacher_lager WHERE user_id = ?').get(uId);
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
    db.db.prepare('UPDATE hutmacher SET level = ?, xp = ? WHERE user_id = ?').run(lvl, xp, uId);
  }
  return { lvl, ups };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hutmacher')
    .setDescription('Fertige elegante Huete und Kopfbedeckungen aller Art!')
    .addSubcommand(sub => sub.setName('start').setDescription('Beginne deine Hutmacher-Karriere'))
    .addSubcommand(sub => sub.setName('status').setDescription('Zeige deinen Hutmacher-Status'))
    .addSubcommand(sub => sub.setName('filze').setDescription('Liste alle verfuegbaren Filzarten'))
    .addSubcommand(sub =>
      sub
        .setName('kaufen')
        .setDescription('Kaufe eine neue Filzart')
        .addIntegerOption(o =>
          o.setName('filz').setDescription('Filzart (1-8)').setRequired(true).setMinValue(1).setMaxValue(8)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('fertigen')
        .setDescription('Fertige einen neuen Hut')
        .addIntegerOption(o =>
          o.setName('hut').setDescription('Huttyp (1-8)').setRequired(true).setMinValue(1).setMaxValue(8)
        )
        .addIntegerOption(o =>
          o.setName('verzierung').setDescription('Verzierung (1-8)').setRequired(true).setMinValue(1).setMaxValue(8)
        )
    )
    .addSubcommand(sub => sub.setName('training').setDescription('Verbessere deine Hutmacherkunst'))
    .addSubcommand(sub =>
      sub
        .setName('upgrade')
        .setDescription('Verbessere deine Hutmacher-Ausruestung')
        .addStringOption(o =>
          o
            .setName('slot')
            .setDescription('Ausruestungsslot')
            .setRequired(true)
            .addChoices(
              { name: 'Hutform', value: 'hutform' },
              { name: 'Naehmaschine', value: 'naehmaschine' },
              { name: 'Dampfpresse', value: 'dampfpresse' },
              { name: 'Hutmacherwerkstatt', value: 'werkstatt' }
            )
        )
    )
    .addSubcommand(sub => sub.setName('lager').setDescription('Zeige dein Hut-Lager'))
    .addSubcommand(sub =>
      sub
        .setName('auftrag')
        .setDescription('Nimm einen Hut-Lieferauftrag an')
        .addIntegerOption(o =>
          o.setName('hut').setDescription('Huttyp (1-8)').setRequired(true).setMinValue(1).setMaxValue(8)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('duell')
        .setDescription('Fordere einen anderen Hutmacher heraus')
        .addUserOption(o => o.setName('gegner').setDescription('Dein Herausforderer').setRequired(true))
    ),

  async execute(interaction) {
    const config = require('../config.json');
    ensureHutTable();
    const uId = interaction.user.id;
    const sub = interaction.options.getSubcommand();

    if (sub === 'start') {
      const existing = db.db.prepare('SELECT user_id FROM hutmacher WHERE user_id = ?').get(uId);
      if (existing) {
        return interaction.reply({ content: 'Du bist bereits Hutmacher!', ephemeral: true });
      }
      db.db.prepare('INSERT INTO hutmacher (user_id) VALUES (?)').run(uId);
      db.db.prepare('INSERT INTO hutmacher_lager (user_id) VALUES (?)').run(uId);
      const embed = new EmbedBuilder()
        .setColor(0x4B0082)
        .setTitle('Willkommen in der Hutmacherwerkstatt!')
        .setDescription(
          'Deine Hutmacher-Karriere beginnt!\n\n' +
          '`/hutmacher filze` - Filzarten ansehen\n' +
          '`/hutmacher fertigen` - Hut fertigen\n' +
          '`/hutmacher status` - Fortschritt anzeigen'
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'status') {
      const hm = getHutmacher(uId);
      const filz = FILZE[hm.filz_idx];
      const nextXp = xpForLevel(hm.level);
      const embed = new EmbedBuilder()
        .setColor(0x4B0082)
        .setTitle('Hutmacher-Status von ' + interaction.user.username)
        .addFields(
          { name: 'Level', value: String(hm.level), inline: true },
          { name: 'XP', value: hm.xp + ' / ' + nextXp, inline: true },
          { name: 'Geld', value: hm.geld + ' Taler', inline: true },
          { name: 'Material', value: filz.emoji + ' ' + filz.name, inline: true },
          { name: 'Huete', value: hm.huete_gefertigt + 'x', inline: true },
          { name: 'Auftraege', value: String(hm.auftraege), inline: true },
          {
            name: 'Upgrades',
            value:
              'Hutform: Stufe ' + hm.up_hutform + '\n' +
              'Naehm.: Stufe ' + hm.up_naehmaschine + '\n' +
              'Presse: Stufe ' + hm.up_dampfpresse + '\n' +
              'Werkst.: Stufe ' + hm.up_werkstatt,
          }
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'filze') {
      const hm = getHutmacher(uId);
      const lines = FILZE.map((f, i) => {
        const owned = hm.filz_idx >= i ? '[OK]' : '';
        return (i + 1) + '. ' + f.emoji + ' **' + f.name + '** - ' + f.preis + ' Taler | Qual. x' + f.qualitaet + ' ' + owned;
      });
      const embed = new EmbedBuilder()
        .setColor(0x4B0082)
        .setTitle('Verfuegbare Filzarten')
        .setDescription(lines.join('\n'));
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'kaufen') {
      const hm = getHutmacher(uId);
      const idx = interaction.options.getInteger('filz') - 1;
      const filz = FILZE[idx];
      if (idx <= hm.filz_idx) {
        return interaction.reply({ content: 'Du besitzt bereits ' + filz.name + '!', ephemeral: true });
      }
      if (idx > hm.filz_idx + 1) {
        return interaction.reply({ content: 'Kaufe zuerst ' + FILZE[hm.filz_idx + 1].name + '!', ephemeral: true });
      }
      if (hm.geld < filz.preis) {
        return interaction.reply({ content: 'Nicht genug Taler! Benoetigt: ' + filz.preis + '.', ephemeral: true });
      }
      db.db.prepare('UPDATE hutmacher SET geld = geld - ?, filz_idx = ? WHERE user_id = ?').run(filz.preis, idx, uId);
      return interaction.reply({
        content: 'Du hast ' + filz.emoji + ' **' + filz.name + '** fuer ' + filz.preis + ' Taler gekauft!',
      });
    }

    if (sub === 'fertigen') {
      const now = Date.now();
      const cd = cooldowns.get(uId + '_fertigen') || 0;
      if (now < cd) {
        const secs = Math.ceil((cd - now) / 1000);
        return interaction.reply({ content: 'Warte noch ' + secs + 's.', ephemeral: true });
      }
      const hm = getHutmacher(uId);
      const hIdx = interaction.options.getInteger('hut') - 1;
      const vIdx = interaction.options.getInteger('verzierung') - 1;
      const hut = HUETE[hIdx];
      const verzierung = VERZIERUNGEN[vIdx];
      if (hut.minLevel > hm.level) {
        return interaction.reply({ content: 'Du brauchst Level ' + hut.minLevel + '!', ephemeral: true });
      }
      if (verzierung.minLevel > hm.level) {
        return interaction.reply({ content: 'Du brauchst Level ' + verzierung.minLevel + ' fuer ' + verzierung.name + '!', ephemeral: true });
      }
      const filz = FILZE[hm.filz_idx];
      const event = HUT_EVENTS[Math.floor(Math.random() * HUT_EVENTS.length)];
      const upBonus =
        UPGRADES.hutform.bonus[hm.up_hutform] +
        UPGRADES.naehmaschine.bonus[hm.up_naehmaschine] +
        UPGRADES.dampfpresse.bonus[hm.up_dampfpresse] +
        UPGRADES.werkstatt.bonus[hm.up_werkstatt];
      const roll = Math.random() * 100;
      let qual = QUALITAETEN[0];
      for (const q of QUALITAETEN) {
        if (roll >= q.minRoll) qual = q;
      }
      const qualMulti = event.qualMulti || 1.0;
      const geldMulti = event.geldMulti || 1.0;
      const wert = Math.floor(hut.basisWert * filz.qualitaet * verzierung.bonus * qual.multi * qualMulti * geldMulti * (1 + upBonus));
      const xpGain = Math.floor((hut.schwierigkeit * verzierung.bonus * 10 + hm.level * 2) * (1 + upBonus * 0.5));
      db.db.prepare('UPDATE hutmacher SET geld = geld + ?, xp = xp + ?, huete_gefertigt = huete_gefertigt + 1 WHERE user_id = ?').run(wert, xpGain, uId);
      db.db.prepare('UPDATE hutmacher_lager SET slot' + hIdx + ' = slot' + hIdx + ' + 1 WHERE user_id = ?').run(uId);
      const upd = getHutmacher(uId);
      const { lvl, ups } = checkLevelUp(uId, upd);
      cooldowns.set(uId + '_fertigen', now + 20000);
      const embed = new EmbedBuilder()
        .setColor(0x4B0082)
        .setTitle('Hut gefertigt!')
        .setDescription(event.text || 'Der Hut ist fertig!')
        .addFields(
          { name: 'Hut', value: hut.name, inline: true },
          { name: 'Verzierung', value: verzierung.name, inline: true },
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
      const hm = getHutmacher(uId);
      const xpGain = Math.floor(10 + hm.level * 4 + Math.random() * 20);
      db.db.prepare('UPDATE hutmacher SET xp = xp + ? WHERE user_id = ?').run(xpGain, uId);
      const upd = getHutmacher(uId);
      const { lvl, ups } = checkLevelUp(uId, upd);
      cooldowns.set(uId + '_training', now + 30000);
      return interaction.reply({
        content: 'Training abgeschlossen! +' + xpGain + ' XP. Level: ' + lvl + (ups > 0 ? ' Level Up!' : ''),
      });
    }

    if (sub === 'upgrade') {
      const hm = getHutmacher(uId);
      const slot = interaction.options.getString('slot');
      if (!slot || !UPGRADES[slot]) {
        return interaction.reply({ content: 'Ungueltiger Slot!', ephemeral: true });
      }
      const upKey = 'up_' + slot;
      const currentLevel = hm[upKey];
      const upInfo = UPGRADES[slot];
      if (currentLevel >= upInfo.stufen.length - 1) {
        return interaction.reply({ content: upInfo.name + ' ist auf Maximum!', ephemeral: true });
      }
      const cost = upInfo.stufen[currentLevel + 1];
      if (hm.geld < cost) {
        return interaction.reply({ content: 'Nicht genug Taler! Kosten: ' + cost + '.', ephemeral: true });
      }
      db.db.prepare('UPDATE hutmacher SET geld = geld - ?, ' + upKey + ' = ' + upKey + ' + 1 WHERE user_id = ?').run(cost, uId);
      const newLevel = currentLevel + 1;
      return interaction.reply({
        content: '**' + upInfo.name + '** auf Stufe ' + newLevel + '! Bonus: +' + Math.floor(upInfo.bonus[newLevel] * 100) + '%',
      });
    }

    if (sub === 'lager') {
      const lager = getLager(uId);
      const lines = HUETE.map((h, i) => (i + 1) + '. 🎩 **' + h.name + '**: ' + (lager['slot' + i] || 0) + 'x');
      const embed = new EmbedBuilder()
        .setColor(0x4B0082)
        .setTitle('Dein Hut-Lager')
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
      const hm = getHutmacher(uId);
      const hIdx = interaction.options.getInteger('hut') - 1;
      const hut = HUETE[hIdx];
      const lager = getLager(uId);
      const menge = 1 + Math.floor(Math.random() * 3);
      const available = lager['slot' + hIdx] || 0;
      if (available < menge) {
        return interaction.reply({
          content: 'Nicht genug ' + hut.name + ' im Lager! Benoetigt: ' + menge + ', vorhanden: ' + available + '.',
          ephemeral: true,
        });
      }
      const bonus = 1.3 + Math.random() * 0.5;
      const wert = Math.floor(hut.basisWert * menge * bonus);
      const xpGain = Math.floor(hut.schwierigkeit * menge * 15);
      db.db.prepare('UPDATE hutmacher_lager SET slot' + hIdx + ' = slot' + hIdx + ' - ? WHERE user_id = ?').run(menge, uId);
      db.db.prepare('UPDATE hutmacher SET geld = geld + ?, xp = xp + ?, auftraege = auftraege + 1 WHERE user_id = ?').run(wert, xpGain, uId);
      const upd = getHutmacher(uId);
      const { lvl, ups } = checkLevelUp(uId, upd);
      cooldowns.set(uId + '_auftrag', now + 45000);
      return interaction.reply({
        content: 'Auftrag: ' + menge + 'x ' + hut.name + ' geliefert. +' + wert + ' Taler, +' + xpGain + ' XP. Level: ' + lvl + (ups > 0 ? ' Level Up!' : ''),
      });
    }

    if (sub === 'duell') {
      const gegner = interaction.options.getUser('gegner');
      if (!gegner || gegner.id === uId) {
        return interaction.reply({ content: 'Ungueltiger Gegner!', ephemeral: true });
      }
      const hm = getHutmacher(uId);
      const gegnerHm = db.db.prepare('SELECT * FROM hutmacher WHERE user_id = ?').get(gegner.id);
      if (!gegnerHm) {
        return interaction.reply({ content: 'Dieser Spieler ist noch kein Hutmacher!', ephemeral: true });
      }
      const myScore = hm.level * 10 + hm.up_hutform * 5 + hm.up_naehmaschine * 5 + hm.up_dampfpresse * 5 + hm.up_werkstatt * 5 + Math.random() * 30;
      const gScore = gegnerHm.level * 10 + gegnerHm.up_hutform * 5 + gegnerHm.up_naehmaschine * 5 + gegnerHm.up_dampfpresse * 5 + gegnerHm.up_werkstatt * 5 + Math.random() * 30;
      const gewonnen = myScore > gScore;
      const einsatz = Math.min(Math.floor(hm.geld * 0.1), Math.floor(gegnerHm.geld * 0.1), 5000);
      if (gewonnen) {
        db.db.prepare('UPDATE hutmacher SET geld = geld + ?, duelle_gewonnen = duelle_gewonnen + 1 WHERE user_id = ?').run(einsatz, uId);
        db.db.prepare('UPDATE hutmacher SET geld = geld - ? WHERE user_id = ?').run(einsatz, gegner.id);
      } else {
        db.db.prepare('UPDATE hutmacher SET geld = geld - ? WHERE user_id = ?').run(einsatz, uId);
        db.db.prepare('UPDATE hutmacher SET geld = geld + ? WHERE user_id = ?').run(einsatz, gegner.id);
      }
      const embed = new EmbedBuilder()
        .setColor(gewonnen ? 0x00FF00 : 0xFF0000)
        .setTitle('Hutmacher-Duell!')
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
