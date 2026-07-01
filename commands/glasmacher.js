const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

const SANDE = [
  { name: 'Quarzsand', preis: 30, qualitaet: 1.0, emoji: '🏖️' },
  { name: 'Flusssand', preis: 80, qualitaet: 1.3, emoji: '🌊' },
  { name: 'Weisser Sand', preis: 170, qualitaet: 1.65, emoji: '⬜' },
  { name: 'Kristallsand', preis: 380, qualitaet: 2.05, emoji: '💠' },
  { name: 'Elfensand', preis: 880, qualitaet: 2.6, emoji: '✨' },
  { name: 'Mondsand', preis: 2200, qualitaet: 3.3, emoji: '🌙' },
  { name: 'Sternsand', preis: 5600, qualitaet: 4.2, emoji: '⭐' },
  { name: 'Aethersand', preis: 14000, qualitaet: 5.8, emoji: '⚗️' },
];

const GLASWAREN = [
  { name: 'Flasche', basisWert: 45, schwierigkeit: 1, minLevel: 1 },
  { name: 'Trinkglas', basisWert: 100, schwierigkeit: 2, minLevel: 3 },
  { name: 'Schuessel', basisWert: 195, schwierigkeit: 3, minLevel: 6 },
  { name: 'Vase', basisWert: 375, schwierigkeit: 4, minLevel: 10 },
  { name: 'Kelch', basisWert: 700, schwierigkeit: 5, minLevel: 15 },
  { name: 'Glasfenster', basisWert: 1350, schwierigkeit: 6, minLevel: 22 },
  { name: 'Kristallspiegel', basisWert: 2700, schwierigkeit: 7, minLevel: 30 },
  { name: 'Legendaeres Aetherglas', basisWert: 6800, schwierigkeit: 8, minLevel: 40 },
];

const FARBEN = [
  { name: 'Klar', bonus: 1.0, minLevel: 1 },
  { name: 'Bernstein', bonus: 1.2, minLevel: 2 },
  { name: 'Kobaltblau', bonus: 1.45, minLevel: 5 },
  { name: 'Smaragdgruen', bonus: 1.7, minLevel: 9 },
  { name: 'Rubinrot', bonus: 2.0, minLevel: 14 },
  { name: 'Violett', bonus: 2.4, minLevel: 20 },
  { name: 'Opalfarben', bonus: 3.0, minLevel: 28 },
  { name: 'Aetherfarben', bonus: 3.9, minLevel: 38 },
];

const QUALITAETEN = [
  { name: 'Blasig', multi: 0.3, minRoll: 0 },
  { name: 'Trueb', multi: 0.55, minRoll: 15 },
  { name: 'Einfach', multi: 0.8, minRoll: 30 },
  { name: 'Klar', multi: 1.0, minRoll: 50 },
  { name: 'Fein', multi: 1.35, minRoll: 68 },
  { name: 'Exquisit', multi: 1.75, minRoll: 82 },
  { name: 'Meisterhaft', multi: 2.5, minRoll: 93 },
];

const UPGRADES = {
  glasofen: {
    name: 'Glasofen',
    stufen: [0, 500, 1500, 4000, 10000, 25000, 62500, 156000, 364000, 850000],
    bonus: [0, 0.06, 0.12, 0.19, 0.27, 0.36, 0.46, 0.58, 0.72, 0.9],
  },
  blaspfeife: {
    name: 'Blaspfeife',
    stufen: [0, 350, 1050, 2800, 7000, 17500, 43750, 109000, 255000, 595000],
    bonus: [0, 0.05, 0.1, 0.16, 0.23, 0.31, 0.41, 0.53, 0.67, 0.86],
  },
  kuehlkanal: {
    name: 'Kuehlkanal',
    stufen: [0, 280, 840, 2240, 5600, 14000, 35000, 87500, 204000, 476000],
    bonus: [0, 0.04, 0.09, 0.15, 0.22, 0.3, 0.39, 0.5, 0.63, 0.8],
  },
  werkstatt: {
    name: 'Glashhuette',
    stufen: [0, 2100, 6300, 15750, 37000, 86000, 196000, 441000, 992000, 2232000],
    bonus: [0, 0.08, 0.17, 0.27, 0.38, 0.51, 0.66, 0.83, 1.04, 1.3],
  },
};

const GLAS_EVENTS = [
  { text: 'Perfekte Blastemperatur! Das Glas wird kristallklar und makellos.', qualMulti: 1.6, geldMulti: 1.0 },
  { text: 'Zu schnell abgekuehlt - das Stueck ist gesprungen.', qualMulti: 0.65, geldMulti: 1.0 },
  { text: 'Seltenes Farbpigment eingemischt! Wunderschoener Schimmer.', qualMulti: 1.3, geldMulti: 1.55 },
  { text: 'Luftblase im Glas entstanden. Qualitaet beeintraechtigt.', qualMulti: 0.75, geldMulti: 0.8 },
  { text: 'Inspirierter Formgebung! Ein meisterhaftes Stueck entsteht.', qualMulti: 1.9, geldMulti: 1.2 },
  { text: 'Gleichmaessige Wandstaerke. Elegante Proportionen!', qualMulti: 1.2, geldMulti: 1.4 },
  { text: 'Kunsthaendler bietet Aufpreis fuer das seltene Stueck.', qualMulti: 1.0, geldMulti: 1.85 },
];

const cooldowns = new Map();

function ensureGlasTable() {
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS glasmacher (
      user_id TEXT PRIMARY KEY,
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      geld INTEGER DEFAULT 0,
      sand_idx INTEGER DEFAULT 0,
      glaswaren_geblasen INTEGER DEFAULT 0,
      auftraege INTEGER DEFAULT 0,
      duelle_gewonnen INTEGER DEFAULT 0,
      up_glasofen INTEGER DEFAULT 0,
      up_blaspfeife INTEGER DEFAULT 0,
      up_kuehlkanal INTEGER DEFAULT 0,
      up_werkstatt INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS glasmacher_vitrine (
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

function getGlasmacher(uId) {
  let row = db.db.prepare('SELECT * FROM glasmacher WHERE user_id = ?').get(uId);
  if (!row) {
    db.db.prepare('INSERT INTO glasmacher (user_id) VALUES (?)').run(uId);
    db.db.prepare('INSERT INTO glasmacher_vitrine (user_id) VALUES (?)').run(uId);
    row = db.db.prepare('SELECT * FROM glasmacher WHERE user_id = ?').get(uId);
  }
  return row;
}

function getVitrine(uId) {
  let row = db.db.prepare('SELECT * FROM glasmacher_vitrine WHERE user_id = ?').get(uId);
  if (!row) {
    db.db.prepare('INSERT INTO glasmacher_vitrine (user_id) VALUES (?)').run(uId);
    row = db.db.prepare('SELECT * FROM glasmacher_vitrine WHERE user_id = ?').get(uId);
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
    db.db.prepare('UPDATE glasmacher SET level = ?, xp = ? WHERE user_id = ?').run(lvl, xp, uId);
  }
  return { lvl, ups };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('glasmacher')
    .setDescription('Blase edles Glas und erschaffe funkelnde Meisterwerke!')
    .addSubcommand(sub => sub.setName('start').setDescription('Beginne deine Glasmacher-Karriere'))
    .addSubcommand(sub => sub.setName('status').setDescription('Zeige deinen Glasmacher-Status'))
    .addSubcommand(sub => sub.setName('sande').setDescription('Liste alle verfuegbaren Sandarten'))
    .addSubcommand(sub =>
      sub
        .setName('kaufen')
        .setDescription('Kaufe eine neue Sandart')
        .addIntegerOption(o =>
          o.setName('sand').setDescription('Sandart (1-8)').setRequired(true).setMinValue(1).setMaxValue(8)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('blasen')
        .setDescription('Blase ein neues Glaswerk')
        .addIntegerOption(o =>
          o.setName('ware').setDescription('Glaswarentyp (1-8)').setRequired(true).setMinValue(1).setMaxValue(8)
        )
        .addIntegerOption(o =>
          o.setName('farbe').setDescription('Glasfarbe (1-8)').setRequired(true).setMinValue(1).setMaxValue(8)
        )
    )
    .addSubcommand(sub => sub.setName('training').setDescription('Verbessere deine Glasblaeserei'))
    .addSubcommand(sub =>
      sub
        .setName('upgrade')
        .setDescription('Verbessere deine Glasmacher-Ausruestung')
        .addStringOption(o =>
          o
            .setName('slot')
            .setDescription('Ausruestungsslot')
            .setRequired(true)
            .addChoices(
              { name: 'Glasofen', value: 'glasofen' },
              { name: 'Blaspfeife', value: 'blaspfeife' },
              { name: 'Kuehlkanal', value: 'kuehlkanal' },
              { name: 'Glashhuette', value: 'werkstatt' }
            )
        )
    )
    .addSubcommand(sub => sub.setName('vitrine').setDescription('Zeige deine Glaswaren-Vitrine'))
    .addSubcommand(sub =>
      sub
        .setName('auftrag')
        .setDescription('Nimm einen Glaswaren-Lieferauftrag an')
        .addIntegerOption(o =>
          o.setName('ware').setDescription('Glaswarentyp (1-8)').setRequired(true).setMinValue(1).setMaxValue(8)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('duell')
        .setDescription('Fordere einen anderen Glasmacher heraus')
        .addUserOption(o => o.setName('gegner').setDescription('Dein Herausforderer').setRequired(true))
    ),

  async execute(interaction) {
    const config = require('../config.json');
    ensureGlasTable();
    const uId = interaction.user.id;
    const sub = interaction.options.getSubcommand();

    if (sub === 'start') {
      const existing = db.db.prepare('SELECT user_id FROM glasmacher WHERE user_id = ?').get(uId);
      if (existing) {
        return interaction.reply({ content: 'Du bist bereits Glasmacher!', ephemeral: true });
      }
      db.db.prepare('INSERT INTO glasmacher (user_id) VALUES (?)').run(uId);
      db.db.prepare('INSERT INTO glasmacher_vitrine (user_id) VALUES (?)').run(uId);
      const embed = new EmbedBuilder()
        .setColor(0x87CEEB)
        .setTitle('Willkommen in der Glashhuette!')
        .setDescription(
          'Deine Glasmacher-Karriere beginnt!\n\n' +
          '`/glasmacher sande` - Sandarten ansehen\n' +
          '`/glasmacher blasen` - Glas blasen\n' +
          '`/glasmacher status` - Fortschritt anzeigen'
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'status') {
      const gm = getGlasmacher(uId);
      const sand = SANDE[gm.sand_idx];
      const nextXp = xpForLevel(gm.level);
      const embed = new EmbedBuilder()
        .setColor(0x87CEEB)
        .setTitle('Glasmacher-Status von ' + interaction.user.username)
        .addFields(
          { name: 'Level', value: String(gm.level), inline: true },
          { name: 'XP', value: gm.xp + ' / ' + nextXp, inline: true },
          { name: 'Geld', value: gm.geld + ' Taler', inline: true },
          { name: 'Sand', value: sand.emoji + ' ' + sand.name, inline: true },
          { name: 'Geblasen', value: gm.glaswaren_geblasen + 'x', inline: true },
          { name: 'Auftraege', value: String(gm.auftraege), inline: true },
          {
            name: 'Upgrades',
            value:
              'Ofen: Stufe ' + gm.up_glasofen + '\n' +
              'Pfeife: Stufe ' + gm.up_blaspfeife + '\n' +
              'Kanal: Stufe ' + gm.up_kuehlkanal + '\n' +
              'Huette: Stufe ' + gm.up_werkstatt,
          }
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'sande') {
      const gm = getGlasmacher(uId);
      const lines = SANDE.map((s, i) => {
        const owned = gm.sand_idx >= i ? '[OK]' : '';
        return (i + 1) + '. ' + s.emoji + ' **' + s.name + '** - ' + s.preis + ' Taler | Qual. x' + s.qualitaet + ' ' + owned;
      });
      const embed = new EmbedBuilder()
        .setColor(0x87CEEB)
        .setTitle('Verfuegbare Sandarten')
        .setDescription(lines.join('\n'));
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'kaufen') {
      const gm = getGlasmacher(uId);
      const idx = interaction.options.getInteger('sand') - 1;
      const sand = SANDE[idx];
      if (idx <= gm.sand_idx) {
        return interaction.reply({ content: 'Du besitzt bereits ' + sand.name + '!', ephemeral: true });
      }
      if (idx > gm.sand_idx + 1) {
        return interaction.reply({ content: 'Kaufe zuerst ' + SANDE[gm.sand_idx + 1].name + '!', ephemeral: true });
      }
      if (gm.geld < sand.preis) {
        return interaction.reply({ content: 'Nicht genug Taler! Benoetigt: ' + sand.preis + '.', ephemeral: true });
      }
      db.db.prepare('UPDATE glasmacher SET geld = geld - ?, sand_idx = ? WHERE user_id = ?').run(sand.preis, idx, uId);
      return interaction.reply({
        content: 'Du hast ' + sand.emoji + ' **' + sand.name + '** fuer ' + sand.preis + ' Taler gekauft!',
      });
    }

    if (sub === 'blasen') {
      const now = Date.now();
      const cd = cooldowns.get(uId + '_blasen') || 0;
      if (now < cd) {
        const secs = Math.ceil((cd - now) / 1000);
        return interaction.reply({ content: 'Warte noch ' + secs + 's.', ephemeral: true });
      }
      const gm = getGlasmacher(uId);
      const wIdx = interaction.options.getInteger('ware') - 1;
      const fIdx = interaction.options.getInteger('farbe') - 1;
      const ware = GLASWAREN[wIdx];
      const farbe = FARBEN[fIdx];
      if (ware.minLevel > gm.level) {
        return interaction.reply({ content: 'Du brauchst Level ' + ware.minLevel + '!', ephemeral: true });
      }
      if (farbe.minLevel > gm.level) {
        return interaction.reply({ content: 'Du brauchst Level ' + farbe.minLevel + ' fuer ' + farbe.name + '!', ephemeral: true });
      }
      const sand = SANDE[gm.sand_idx];
      const event = GLAS_EVENTS[Math.floor(Math.random() * GLAS_EVENTS.length)];
      const upBonus =
        UPGRADES.glasofen.bonus[gm.up_glasofen] +
        UPGRADES.blaspfeife.bonus[gm.up_blaspfeife] +
        UPGRADES.kuehlkanal.bonus[gm.up_kuehlkanal] +
        UPGRADES.werkstatt.bonus[gm.up_werkstatt];
      const roll = Math.random() * 100;
      let qual = QUALITAETEN[0];
      for (const q of QUALITAETEN) {
        if (roll >= q.minRoll) qual = q;
      }
      const wert = Math.floor(ware.basisWert * sand.qualitaet * farbe.bonus * qual.multi * event.qualMulti * event.geldMulti * (1 + upBonus));
      const xpGain = Math.floor((ware.schwierigkeit * farbe.bonus * 10 + gm.level * 2) * (1 + upBonus * 0.5));
      db.db.prepare('UPDATE glasmacher SET geld = geld + ?, xp = xp + ?, glaswaren_geblasen = glaswaren_geblasen + 1 WHERE user_id = ?').run(wert, xpGain, uId);
      db.db.prepare('UPDATE glasmacher_vitrine SET slot' + wIdx + ' = slot' + wIdx + ' + 1 WHERE user_id = ?').run(uId);
      const upd = getGlasmacher(uId);
      const { lvl, ups } = checkLevelUp(uId, upd);
      cooldowns.set(uId + '_blasen', now + 20000);
      const embed = new EmbedBuilder()
        .setColor(0x87CEEB)
        .setTitle('Glaswerk geblasen!')
        .setDescription(event.text)
        .addFields(
          { name: 'Ware', value: ware.name, inline: true },
          { name: 'Farbe', value: farbe.name, inline: true },
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
      const gm = getGlasmacher(uId);
      const xpGain = Math.floor(10 + gm.level * 4 + Math.random() * 20);
      db.db.prepare('UPDATE glasmacher SET xp = xp + ? WHERE user_id = ?').run(xpGain, uId);
      const upd = getGlasmacher(uId);
      const { lvl, ups } = checkLevelUp(uId, upd);
      cooldowns.set(uId + '_training', now + 30000);
      return interaction.reply({
        content: 'Training abgeschlossen! +' + xpGain + ' XP. Level: ' + lvl + (ups > 0 ? ' Level Up!' : ''),
      });
    }

    if (sub === 'upgrade') {
      const gm = getGlasmacher(uId);
      const slot = interaction.options.getString('slot');
      if (!slot || !UPGRADES[slot]) {
        return interaction.reply({ content: 'Ungueltiger Slot!', ephemeral: true });
      }
      const upKey = 'up_' + slot;
      const currentLevel = gm[upKey];
      const upInfo = UPGRADES[slot];
      if (currentLevel >= upInfo.stufen.length - 1) {
        return interaction.reply({ content: upInfo.name + ' ist auf Maximum!', ephemeral: true });
      }
      const cost = upInfo.stufen[currentLevel + 1];
      if (gm.geld < cost) {
        return interaction.reply({ content: 'Nicht genug Taler! Kosten: ' + cost + '.', ephemeral: true });
      }
      db.db.prepare('UPDATE glasmacher SET geld = geld - ?, ' + upKey + ' = ' + upKey + ' + 1 WHERE user_id = ?').run(cost, uId);
      const newLevel = currentLevel + 1;
      return interaction.reply({
        content: '**' + upInfo.name + '** auf Stufe ' + newLevel + '! Bonus: +' + Math.floor(upInfo.bonus[newLevel] * 100) + '%',
      });
    }

    if (sub === 'vitrine') {
      const vitrine = getVitrine(uId);
      const lines = GLASWAREN.map((w, i) => (i + 1) + '. 🪟 **' + w.name + '**: ' + (vitrine['slot' + i] || 0) + 'x');
      const embed = new EmbedBuilder()
        .setColor(0x87CEEB)
        .setTitle('Deine Glaswaren-Vitrine')
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
      const gm = getGlasmacher(uId);
      const wIdx = interaction.options.getInteger('ware') - 1;
      const ware = GLASWAREN[wIdx];
      const vitrine = getVitrine(uId);
      const menge = 1 + Math.floor(Math.random() * 3);
      const available = vitrine['slot' + wIdx] || 0;
      if (available < menge) {
        return interaction.reply({
          content: 'Nicht genug ' + ware.name + ' in der Vitrine! Benoetigt: ' + menge + ', vorhanden: ' + available + '.',
          ephemeral: true,
        });
      }
      const bonus = 1.3 + Math.random() * 0.5;
      const wert = Math.floor(ware.basisWert * menge * bonus);
      const xpGain = Math.floor(ware.schwierigkeit * menge * 15);
      db.db.prepare('UPDATE glasmacher_vitrine SET slot' + wIdx + ' = slot' + wIdx + ' - ? WHERE user_id = ?').run(menge, uId);
      db.db.prepare('UPDATE glasmacher SET geld = geld + ?, xp = xp + ?, auftraege = auftraege + 1 WHERE user_id = ?').run(wert, xpGain, uId);
      const upd = getGlasmacher(uId);
      const { lvl, ups } = checkLevelUp(uId, upd);
      cooldowns.set(uId + '_auftrag', now + 45000);
      return interaction.reply({
        content: 'Auftrag: ' + menge + 'x ' + ware.name + ' geliefert. +' + wert + ' Taler, +' + xpGain + ' XP. Level: ' + lvl + (ups > 0 ? ' Level Up!' : ''),
      });
    }

    if (sub === 'duell') {
      const gegner = interaction.options.getUser('gegner');
      if (!gegner || gegner.id === uId) {
        return interaction.reply({ content: 'Ungueltiger Gegner!', ephemeral: true });
      }
      const gm = getGlasmacher(uId);
      const gegnerGm = db.db.prepare('SELECT * FROM glasmacher WHERE user_id = ?').get(gegner.id);
      if (!gegnerGm) {
        return interaction.reply({ content: 'Dieser Spieler ist noch kein Glasmacher!', ephemeral: true });
      }
      const myScore = gm.level * 10 + gm.up_glasofen * 5 + gm.up_blaspfeife * 5 + gm.up_kuehlkanal * 5 + gm.up_werkstatt * 5 + Math.random() * 30;
      const gScore = gegnerGm.level * 10 + gegnerGm.up_glasofen * 5 + gegnerGm.up_blaspfeife * 5 + gegnerGm.up_kuehlkanal * 5 + gegnerGm.up_werkstatt * 5 + Math.random() * 30;
      const gewonnen = myScore > gScore;
      const einsatz = Math.min(Math.floor(gm.geld * 0.1), Math.floor(gegnerGm.geld * 0.1), 5000);
      if (gewonnen) {
        db.db.prepare('UPDATE glasmacher SET geld = geld + ?, duelle_gewonnen = duelle_gewonnen + 1 WHERE user_id = ?').run(einsatz, uId);
        db.db.prepare('UPDATE glasmacher SET geld = geld - ? WHERE user_id = ?').run(einsatz, gegner.id);
      } else {
        db.db.prepare('UPDATE glasmacher SET geld = geld - ? WHERE user_id = ?').run(einsatz, uId);
        db.db.prepare('UPDATE glasmacher SET geld = geld + ? WHERE user_id = ?').run(einsatz, gegner.id);
      }
      const embed = new EmbedBuilder()
        .setColor(gewonnen ? 0x00FF00 : 0xFF0000)
        .setTitle('Glasmacher-Duell!')
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
