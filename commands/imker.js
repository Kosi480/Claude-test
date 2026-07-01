const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

const VOELKER = [
  { name: 'Honigbiene', preis: 30, qualitaet: 1.0, emoji: '🐝' },
  { name: 'Wildbiene', preis: 80, qualitaet: 1.3, emoji: '🌿' },
  { name: 'Hummelbiene', preis: 180, qualitaet: 1.6, emoji: '🌸' },
  { name: 'Steinbiene', preis: 400, qualitaet: 2.0, emoji: '🪨' },
  { name: 'Goldbiene', preis: 900, qualitaet: 2.5, emoji: '✨' },
  { name: 'Mondscheinbiene', preis: 2000, qualitaet: 3.2, emoji: '🌙' },
  { name: 'Kristallbiene', preis: 5000, qualitaet: 4.0, emoji: '💎' },
  { name: 'Aetherbiene', preis: 12000, qualitaet: 5.5, emoji: '⚗️' },
];

const FANG_ORTE = [
  { name: 'Dorfwiese', basisWert: 40, minLevel: 1 },
  { name: 'Bluehender Garten', basisWert: 80, minLevel: 2 },
  { name: 'Waldufer', basisWert: 140, minLevel: 4 },
  { name: 'Heidefeld', basisWert: 220, minLevel: 6 },
  { name: 'Bergwiese', basisWert: 350, minLevel: 9 },
  { name: 'Elfenblumenhain', basisWert: 600, minLevel: 14 },
  { name: 'Mondlichtlichtung', basisWert: 1000, minLevel: 20 },
  { name: 'Aetherbluetenwald', basisWert: 2000, minLevel: 30 },
];

const SAISONEN = [
  { name: 'Fruehling', bonus: 1.4, beschreibung: 'Die Bienen sind aktiv und sammeln eifrig Nektar!' },
  { name: 'Sommer', bonus: 1.6, beschreibung: 'Hochsaison fuer Imker - ideale Bedingungen!' },
  { name: 'Herbst', bonus: 0.9, beschreibung: 'Die Bienen bereiten sich auf den Winter vor.' },
  { name: 'Winter', bonus: 0.5, beschreibung: 'Ruhezeit - wenig Aktivitaet in den Stoecken.' },
];

const QUALITAETEN = [
  { name: 'Gaerig', multi: 0.3, minRoll: 0 },
  { name: 'Trueb', multi: 0.55, minRoll: 15 },
  { name: 'Einfach', multi: 0.8, minRoll: 30 },
  { name: 'Gut', multi: 1.0, minRoll: 50 },
  { name: 'Fein', multi: 1.35, minRoll: 68 },
  { name: 'Exquisit', multi: 1.75, minRoll: 82 },
  { name: 'Meisterhaft', multi: 2.5, minRoll: 93 },
];

const UPGRADES = {
  bienenstock: {
    name: 'Bienenstock',
    stufen: [0, 500, 1500, 4000, 10000, 25000, 60000, 150000, 350000, 800000],
    bonus: [0, 0.05, 0.1, 0.16, 0.23, 0.31, 0.4, 0.52, 0.66, 0.85],
  },
  schleuder: {
    name: 'Honigschleuder',
    stufen: [0, 400, 1200, 3200, 8000, 20000, 48000, 120000, 280000, 650000],
    bonus: [0, 0.06, 0.13, 0.2, 0.28, 0.37, 0.47, 0.59, 0.73, 0.92],
  },
  sieb: {
    name: 'Filtriersieb',
    stufen: [0, 300, 900, 2400, 6000, 15000, 36000, 90000, 210000, 500000],
    bonus: [0, 0.04, 0.09, 0.15, 0.22, 0.3, 0.39, 0.5, 0.63, 0.8],
  },
  werkstatt: {
    name: 'Imkerei',
    stufen: [0, 2000, 6000, 15000, 35000, 80000, 180000, 400000, 900000, 2000000],
    bonus: [0, 0.08, 0.17, 0.27, 0.38, 0.51, 0.66, 0.83, 1.04, 1.3],
  },
};

const cooldowns = new Map();

function ensureImkerTable() {
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS imker (
      user_id TEXT PRIMARY KEY,
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      geld INTEGER DEFAULT 0,
      voelker_idx INTEGER DEFAULT 0,
      honig_geerntet INTEGER DEFAULT 0,
      auftraege INTEGER DEFAULT 0,
      duelle_gewonnen INTEGER DEFAULT 0,
      up_bienenstock INTEGER DEFAULT 0,
      up_schleuder INTEGER DEFAULT 0,
      up_sieb INTEGER DEFAULT 0,
      up_werkstatt INTEGER DEFAULT 0
    );
  `);
}

function getImker(uId) {
  let row = db.db.prepare('SELECT * FROM imker WHERE user_id = ?').get(uId);
  if (!row) {
    db.db.prepare('INSERT INTO imker (user_id) VALUES (?)').run(uId);
    row = db.db.prepare('SELECT * FROM imker WHERE user_id = ?').get(uId);
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
    db.db.prepare('UPDATE imker SET level = ?, xp = ? WHERE user_id = ?').run(lvl, xp, uId);
  }
  return { lvl, ups };
}

function getCurrentSaison() {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return SAISONEN[0];
  if (month >= 5 && month <= 7) return SAISONEN[1];
  if (month >= 8 && month <= 10) return SAISONEN[2];
  return SAISONEN[3];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('imker')
    .setDescription('Werde ein erfahrener Imker und zuechte Bienen!')
    .addSubcommand(sub => sub.setName('start').setDescription('Beginne deine Imker-Karriere'))
    .addSubcommand(sub => sub.setName('status').setDescription('Zeige deinen Imker-Status'))
    .addSubcommand(sub => sub.setName('voelker').setDescription('Liste alle verfuegbaren Bienenvoelker'))
    .addSubcommand(sub => sub.setName('saison').setDescription('Zeige die aktuelle Bienensaison'))
    .addSubcommand(sub =>
      sub
        .setName('fangen')
        .setDescription('Fange Bienen an einem Ort')
        .addIntegerOption(o =>
          o.setName('ort').setDescription('Fangort (1-8)').setRequired(true).setMinValue(1).setMaxValue(8)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('kaufen')
        .setDescription('Kaufe ein neues Bienenvolk')
        .addIntegerOption(o =>
          o.setName('volk').setDescription('Volk (1-8)').setRequired(true).setMinValue(1).setMaxValue(8)
        )
    )
    .addSubcommand(sub => sub.setName('training').setDescription('Verbessere deine Imkerfaehigkeiten'))
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
              { name: 'Bienenstock', value: 'bienenstock' },
              { name: 'Honigschleuder', value: 'schleuder' },
              { name: 'Filtriersieb', value: 'sieb' },
              { name: 'Imkerei', value: 'werkstatt' }
            )
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('auftrag')
        .setDescription('Nimm einen Lieferauftrag an')
        .addIntegerOption(o =>
          o.setName('nr').setDescription('Auftragsnummer (1-8)').setRequired(true).setMinValue(1).setMaxValue(8)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('duell')
        .setDescription('Fordere einen anderen Imker heraus')
        .addUserOption(o => o.setName('gegner').setDescription('Dein Herausforderer').setRequired(true))
    ),

  async execute(interaction) {
    const config = require('../config.json');
    ensureImkerTable();
    const uId = interaction.user.id;
    const sub = interaction.options.getSubcommand();

    if (sub === 'start') {
      const existing = db.db.prepare('SELECT user_id FROM imker WHERE user_id = ?').get(uId);
      if (existing) {
        return interaction.reply({ content: 'Du bist bereits Imker!', ephemeral: true });
      }
      db.db.prepare('INSERT INTO imker (user_id) VALUES (?)').run(uId);
      const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('Willkommen in der Imkerei!')
        .setDescription(
          'Du hast deine Imker-Karriere begonnen!\n\n' +
          '`/imker voelker` - Bienenvoelker ansehen\n' +
          '`/imker fangen` - Bienen fangen\n' +
          '`/imker saison` - Aktuelle Saison pruefen\n' +
          '`/imker status` - Fortschritt anzeigen'
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'status') {
      const im = getImker(uId);
      const volk = VOELKER[im.voelker_idx];
      const nextXp = xpForLevel(im.level);
      const saison = getCurrentSaison();
      const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('Imker-Status von ' + interaction.user.username)
        .addFields(
          { name: 'Level', value: String(im.level), inline: true },
          { name: 'XP', value: im.xp + ' / ' + nextXp, inline: true },
          { name: 'Geld', value: im.geld + ' Taler', inline: true },
          { name: 'Bienenvolk', value: volk.emoji + ' ' + volk.name, inline: true },
          { name: 'Saison', value: saison.name, inline: true },
          { name: 'Honig geerntet', value: im.honig_geerntet + 'x', inline: true },
          {
            name: 'Upgrades',
            value:
              'Bienenstock: Stufe ' + im.up_bienenstock + '\n' +
              'Schleuder: Stufe ' + im.up_schleuder + '\n' +
              'Sieb: Stufe ' + im.up_sieb + '\n' +
              'Imkerei: Stufe ' + im.up_werkstatt,
          }
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'voelker') {
      const im = getImker(uId);
      const lines = VOELKER.map((v, i) => {
        const owned = im.voelker_idx >= i ? '[OK]' : '';
        return (i + 1) + '. ' + v.emoji + ' **' + v.name + '** - ' + v.preis + ' Taler | Qual. x' + v.qualitaet + ' ' + owned;
      });
      const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('Verfuegbare Bienenvoelker')
        .setDescription(lines.join('\n'));
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'saison') {
      const saison = getCurrentSaison();
      const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('Aktuelle Bienensaison: ' + saison.name)
        .setDescription(saison.beschreibung)
        .addFields(
          { name: 'Saison-Bonus', value: 'x' + saison.bonus, inline: true },
          { name: 'Fruehling', value: 'x1.4', inline: true },
          { name: 'Sommer', value: 'x1.6', inline: true },
          { name: 'Herbst', value: 'x0.9', inline: true },
          { name: 'Winter', value: 'x0.5', inline: true }
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'fangen') {
      const now = Date.now();
      const cd = cooldowns.get(uId + '_fangen') || 0;
      if (now < cd) {
        const secs = Math.ceil((cd - now) / 1000);
        return interaction.reply({ content: 'Warte noch ' + secs + 's.', ephemeral: true });
      }
      const im = getImker(uId);
      const ortNr = interaction.options.getInteger('ort');
      if (!ortNr || ortNr < 1 || ortNr > FANG_ORTE.length) {
        return interaction.reply({ content: 'Ungueltiger Ort! Waehle 1-' + FANG_ORTE.length + '.', ephemeral: true });
      }
      const ort = FANG_ORTE[ortNr - 1];
      if (ort.minLevel > im.level) {
        return interaction.reply({
          content: 'Du brauchst Level ' + ort.minLevel + ' fuer ' + ort.name + '!',
          ephemeral: true,
        });
      }
      const saison = getCurrentSaison();
      const upBonus =
        UPGRADES.bienenstock.bonus[im.up_bienenstock] +
        UPGRADES.sieb.bonus[im.up_sieb] +
        UPGRADES.werkstatt.bonus[im.up_werkstatt];
      const roll = Math.random() * 100;
      let qual = QUALITAETEN[0];
      for (const q of QUALITAETEN) {
        if (roll >= q.minRoll) qual = q;
      }
      const wert = Math.floor(ort.basisWert * qual.multi * saison.bonus * (1 + upBonus));
      const xpGain = Math.floor((ortNr * 8 + im.level * 2) * (1 + upBonus * 0.5));
      db.db
        .prepare('UPDATE imker SET geld = geld + ?, xp = xp + ?, honig_geerntet = honig_geerntet + 1 WHERE user_id = ?')
        .run(wert, xpGain, uId);
      const updatedIm = getImker(uId);
      const { lvl, ups } = checkLevelUp(uId, updatedIm);
      cooldowns.set(uId + '_fangen', now + 20000);
      const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('Bienen gefangen!')
        .addFields(
          { name: 'Ort', value: ort.name, inline: true },
          { name: 'Qualitaet', value: qual.name, inline: true },
          { name: 'Erloes', value: wert + ' Taler', inline: true },
          { name: 'XP', value: '+' + xpGain, inline: true },
          { name: 'Level', value: lvl + (ups > 0 ? ' (Level Up!)' : ''), inline: true }
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'kaufen') {
      const im = getImker(uId);
      const idx = (interaction.options.getInteger('volk') || 1) - 1;
      const volk = VOELKER[Math.min(idx, VOELKER.length - 1)];
      if (idx <= im.voelker_idx) {
        return interaction.reply({ content: 'Du besitzt bereits ' + volk.name + '!', ephemeral: true });
      }
      if (idx > im.voelker_idx + 1) {
        return interaction.reply({
          content: 'Du musst zuerst ' + VOELKER[im.voelker_idx + 1].name + ' kaufen!',
          ephemeral: true,
        });
      }
      if (im.geld < volk.preis) {
        return interaction.reply({
          content: 'Nicht genug Taler! Benoetigt: ' + volk.preis + ', vorhanden: ' + im.geld + '.',
          ephemeral: true,
        });
      }
      db.db
        .prepare('UPDATE imker SET geld = geld - ?, voelker_idx = ? WHERE user_id = ?')
        .run(volk.preis, idx, uId);
      return interaction.reply({
        content: 'Du hast ' + volk.emoji + ' **' + volk.name + '** fuer ' + volk.preis + ' Taler gekauft!',
      });
    }

    if (sub === 'training') {
      const now = Date.now();
      const cd = cooldowns.get(uId + '_training') || 0;
      if (now < cd) {
        const secs = Math.ceil((cd - now) / 1000);
        return interaction.reply({ content: 'Warte noch ' + secs + 's.', ephemeral: true });
      }
      const im = getImker(uId);
      const xpGain = Math.floor(10 + im.level * 4 + Math.random() * 20);
      db.db.prepare('UPDATE imker SET xp = xp + ? WHERE user_id = ?').run(xpGain, uId);
      const updatedIm = getImker(uId);
      const { lvl, ups } = checkLevelUp(uId, updatedIm);
      cooldowns.set(uId + '_training', now + 30000);
      return interaction.reply({
        content: 'Training abgeschlossen! +' + xpGain + ' XP. Level: ' + lvl + (ups > 0 ? ' Level Up!' : ''),
      });
    }

    if (sub === 'upgrade') {
      const im = getImker(uId);
      const slot = interaction.options.getString('slot');
      if (!slot || !UPGRADES[slot]) {
        return interaction.reply({ content: 'Ungueltiger Upgrade-Slot!', ephemeral: true });
      }
      const upKey = 'up_' + slot;
      const currentLevel = im[upKey];
      const upInfo = UPGRADES[slot];
      if (currentLevel >= upInfo.stufen.length - 1) {
        return interaction.reply({ content: upInfo.name + ' ist bereits auf Maximum!', ephemeral: true });
      }
      const cost = upInfo.stufen[currentLevel + 1];
      if (im.geld < cost) {
        return interaction.reply({
          content: 'Nicht genug Taler! Kosten: ' + cost + ', du hast: ' + im.geld + '.',
          ephemeral: true,
        });
      }
      db.db
        .prepare('UPDATE imker SET geld = geld - ?, ' + upKey + ' = ' + upKey + ' + 1 WHERE user_id = ?')
        .run(cost, uId);
      const newLevel = currentLevel + 1;
      return interaction.reply({
        content: '**' + upInfo.name + '** auf Stufe ' + newLevel + ' verbessert! Bonus: +' + Math.floor(upInfo.bonus[newLevel] * 100) + '%',
      });
    }

    if (sub === 'auftrag') {
      const now = Date.now();
      const cd = cooldowns.get(uId + '_auftrag') || 0;
      if (now < cd) {
        const secs = Math.ceil((cd - now) / 1000);
        return interaction.reply({ content: 'Warte noch ' + secs + 's.', ephemeral: true });
      }
      const im = getImker(uId);
      const nr = interaction.options.getInteger('nr') || 1;
      const saison = getCurrentSaison();
      const bonus = 1.2 + Math.random() * 0.6;
      const wert = Math.floor(nr * 80 * bonus * saison.bonus);
      const xpGain = Math.floor(nr * 12);
      db.db
        .prepare('UPDATE imker SET geld = geld + ?, xp = xp + ?, auftraege = auftraege + 1 WHERE user_id = ?')
        .run(wert, xpGain, uId);
      const updatedIm = getImker(uId);
      const { lvl, ups } = checkLevelUp(uId, updatedIm);
      cooldowns.set(uId + '_auftrag', now + 45000);
      return interaction.reply({
        content: 'Auftrag ' + nr + ' erfuellt! +' + wert + ' Taler, +' + xpGain + ' XP. Level: ' + lvl + (ups > 0 ? ' Level Up!' : ''),
      });
    }

    if (sub === 'duell') {
      const gegner = interaction.options.getUser('gegner');
      if (!gegner || gegner.id === uId) {
        return interaction.reply({ content: 'Ungueltiger Gegner!', ephemeral: true });
      }
      const im = getImker(uId);
      const gegnerIm = db.db.prepare('SELECT * FROM imker WHERE user_id = ?').get(gegner.id);
      if (!gegnerIm) {
        return interaction.reply({ content: 'Dieser Spieler ist noch kein Imker!', ephemeral: true });
      }
      const myScore = im.level * 10 + im.up_bienenstock * 5 + im.up_schleuder * 5 + im.up_sieb * 5 + im.up_werkstatt * 5 + Math.random() * 30;
      const gScore = gegnerIm.level * 10 + gegnerIm.up_bienenstock * 5 + gegnerIm.up_schleuder * 5 + gegnerIm.up_sieb * 5 + gegnerIm.up_werkstatt * 5 + Math.random() * 30;
      const gewonnen = myScore > gScore;
      const einsatz = Math.min(Math.floor(im.geld * 0.1), Math.floor(gegnerIm.geld * 0.1), 5000);
      if (gewonnen) {
        db.db.prepare('UPDATE imker SET geld = geld + ?, duelle_gewonnen = duelle_gewonnen + 1 WHERE user_id = ?').run(einsatz, uId);
        db.db.prepare('UPDATE imker SET geld = geld - ? WHERE user_id = ?').run(einsatz, gegner.id);
      } else {
        db.db.prepare('UPDATE imker SET geld = geld - ? WHERE user_id = ?').run(einsatz, uId);
        db.db.prepare('UPDATE imker SET geld = geld + ? WHERE user_id = ?').run(einsatz, gegner.id);
      }
      const embed = new EmbedBuilder()
        .setColor(gewonnen ? 0x00FF00 : 0xFF0000)
        .setTitle('Imker-Duell!')
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
