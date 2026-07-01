const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

const KRAEUTER = [
  { name: 'Kamille', preis: 8, qualitaet: 1.0, emoji: '🌼' },
  { name: 'Pfefferminze', preis: 18, qualitaet: 1.3, emoji: '🌿' },
  { name: 'Baldrian', preis: 35, qualitaet: 1.7, emoji: '🌱' },
  { name: 'Eisenkraut', preis: 65, qualitaet: 2.1, emoji: '🍀' },
  { name: 'Drachenwurz', preis: 130, qualitaet: 2.7, emoji: '🌺' },
  { name: 'Elfenblume', preis: 250, qualitaet: 3.5, emoji: '✨' },
  { name: 'Mondkraut', preis: 480, qualitaet: 4.5, emoji: '🌙' },
  { name: 'Aetherkraut', preis: 900, qualitaet: 6.0, emoji: '🌟' },
];

const PRAEPARATE = [
  { name: 'Hustensaft', basisWert: 50, schwierigkeit: 1, minLevel: 1 },
  { name: 'Wundsalbe', basisWert: 110, schwierigkeit: 2, minLevel: 3 },
  { name: 'Fiebertrank', basisWert: 190, schwierigkeit: 3, minLevel: 5 },
  { name: 'Staerkungselixier', basisWert: 300, schwierigkeit: 4, minLevel: 8 },
  { name: 'Heilpotion', basisWert: 460, schwierigkeit: 5, minLevel: 12 },
  { name: 'Antidot', basisWert: 700, schwierigkeit: 6, minLevel: 16 },
  { name: 'Lebenseliexier', basisWert: 1050, schwierigkeit: 7, minLevel: 21 },
  { name: 'Legendaeres Aethertrank', basisWert: 1600, schwierigkeit: 8, minLevel: 28 },
];

const METHODEN = [
  { name: 'Aufguss', bonus: 1.0, minLevel: 1 },
  { name: 'Destillation', bonus: 1.25, minLevel: 3 },
  { name: 'Mazeration', bonus: 1.55, minLevel: 5 },
  { name: 'Fermentation', bonus: 1.9, minLevel: 8 },
  { name: 'Sublimation', bonus: 2.35, minLevel: 12 },
  { name: 'Kristallisation', bonus: 2.9, minLevel: 16 },
  { name: 'Elfenbrauen', bonus: 3.7, minLevel: 21 },
  { name: 'Aetherextraktion', bonus: 5.2, minLevel: 28 },
];

const QUALITAETEN = [
  { name: 'Verdorben', multi: 0.3, minRoll: 0 },
  { name: 'Schwach', multi: 0.55, minRoll: 13 },
  { name: 'Gewoehlich', multi: 0.8, minRoll: 28 },
  { name: 'Wirksam', multi: 1.05, minRoll: 48 },
  { name: 'Potent', multi: 1.45, minRoll: 64 },
  { name: 'Hochrein', multi: 2.0, minRoll: 80 },
  { name: 'Meisterhaft', multi: 2.9, minRoll: 92 },
];

const UPGRADES = {
  mörser: { name: 'Mörser & Stössel', stufen: [0, 1, 2, 3, 4], bonus: [0, 0.06, 0.13, 0.21, 0.30] },
  destillierkolben: { name: 'Destillierkolben', stufen: [0, 1, 2, 3, 4], bonus: [0, 0.05, 0.12, 0.20, 0.29] },
  kraeutergarten: { name: 'Kraeutergarten', stufen: [0, 1, 2, 3, 4], bonus: [0, 0.05, 0.11, 0.19, 0.28] },
  werkstatt: { name: 'Werkstatt', stufen: [0, 1, 2, 3, 4], bonus: [0, 0.08, 0.16, 0.25, 0.36] },
};

const APOTHEKER_EVENTS = [
  { text: '✨ Die Zutaten reagieren magisch — ein Wundertrank entsteht!', qualMulti: 1.9, geldMulti: 1.0 },
  { text: '💰 Ein Ritter braucht dringend Heilung und zahlt das Doppelte!', qualMulti: 1.0, geldMulti: 2.2 },
  { text: '🌿 Die Kraeuter waren besonders frisch geerntet!', qualMulti: 1.7, geldMulti: 1.2 },
  { text: '💥 Der Destillierkolben explodierte fast — leicht verdünnt.', qualMulti: 0.55, geldMulti: 1.0 },
  { text: '👑 Der Stadtarzt empfiehlt deine Tränke an alle Bürger!', qualMulti: 1.4, geldMulti: 1.8 },
  { text: '🍄 Ein Kraut war leicht giftig — du musstest ihn verdünnen.', qualMulti: 0.65, geldMulti: 0.9 },
  { text: '🌟 Deine Rezeptur wurde von einem Alchemisten gelobt!', qualMulti: 1.5, geldMulti: 1.6 },
];

const cooldowns = new Map();

function ensureApothekerTable() {
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS apotheker (
      userId TEXT PRIMARY KEY,
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      geld INTEGER DEFAULT 0,
      kraut TEXT DEFAULT 'Kamille',
      krautMenge INTEGER DEFAULT 0,
      methode TEXT DEFAULT 'Aufguss',
      moerser INTEGER DEFAULT 0,
      destillierkolben INTEGER DEFAULT 0,
      kraeutergarten INTEGER DEFAULT 0,
      werkstatt INTEGER DEFAULT 0,
      traenkeGebraut INTEGER DEFAULT 0,
      auftraege INTEGER DEFAULT 0,
      duelle INTEGER DEFAULT 0,
      duelleGewonnen INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS apotheker_regal (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT,
      praeparat TEXT,
      qualitaet TEXT,
      wert INTEGER,
      hergestelltAm TEXT
    );
  `);
}

function getApotheker(uId) {
  let row = db.db.prepare('SELECT * FROM apotheker WHERE userId = ?').get(uId);
  if (!row) {
    db.db.prepare('INSERT INTO apotheker (userId) VALUES (?)').run(uId);
    row = db.db.prepare('SELECT * FROM apotheker WHERE userId = ?').get(uId);
  }
  return row;
}

function xpForLevel(l) { return l * l * 50; }

function checkLevelUp(uId, obj) {
  let lvl = obj.level;
  let ups = 0;
  while (obj.xp >= xpForLevel(lvl)) {
    obj.xp -= xpForLevel(lvl);
    lvl++;
    ups++;
  }
  if (ups > 0) {
    db.db.prepare('UPDATE apotheker SET level = ?, xp = ? WHERE userId = ?').run(lvl, obj.xp, uId);
  }
  return { lvl, ups };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('apotheker')
    .setDescription('Arbeite als Apotheker und braue Heiltraenke und Elixiere')
    .addSubcommand(s => s.setName('start').setDescription('Beginne deine Apotheker-Karriere'))
    .addSubcommand(s => s.setName('status').setDescription('Zeige deinen Apotheker-Status'))
    .addSubcommand(s => s.setName('kraeuter').setDescription('Liste alle Kraeuter auf'))
    .addSubcommand(s => s.setName('kaufen').setDescription('Kaufe Kraeuter')
      .addStringOption(o => o.setName('kraut').setDescription('Welches Kraut?').setRequired(true))
      .addIntegerOption(o => o.setName('menge').setDescription('Wie viel?').setRequired(true).setMinValue(1)))
    .addSubcommand(s => s.setName('brauen').setDescription('Braue ein Praeparat')
      .addStringOption(o => o.setName('praeparat').setDescription('Was herstellen?').setRequired(true))
      .addStringOption(o => o.setName('methode').setDescription('Welche Methode?').setRequired(true)))
    .addSubcommand(s => s.setName('training').setDescription('Trainiere deine Apothekerkenntnisse'))
    .addSubcommand(s => s.setName('upgrade').setDescription('Verbessere deine Ausruestung')
      .addStringOption(o => o.setName('slot').setDescription('Was upgraden?').setRequired(true)
        .addChoices(
          { name: 'Mörser & Stössel', value: 'moerser' },
          { name: 'Destillierkolben', value: 'destillierkolben' },
          { name: 'Kraeutergarten', value: 'kraeutergarten' },
          { name: 'Werkstatt', value: 'werkstatt' }
        )))
    .addSubcommand(s => s.setName('regal').setDescription('Zeige dein Apothekenregal'))
    .addSubcommand(s => s.setName('auftrag').setDescription('Bearbeite einen Heilauftrag'))
    .addSubcommand(s => s.setName('duell').setDescription('Fordere einen anderen Apotheker heraus')
      .addUserOption(o => o.setName('gegner').setDescription('Wen herausfordern?').setRequired(true))),

  async execute(interaction) {
    const config = require('../config.json');
    ensureApothekerTable();
    const uId = interaction.user.id;
    const sub = interaction.options.getSubcommand();

    if (sub === 'start') {
      const existing = db.db.prepare('SELECT userId FROM apotheker WHERE userId = ?').get(uId);
      if (existing) {
        return interaction.reply({ content: '⚗️ Du bist bereits Apotheker!', ephemeral: true });
      }
      db.db.prepare('INSERT INTO apotheker (userId) VALUES (?)').run(uId);
      const embed = new EmbedBuilder()
        .setColor(0x228B22)
        .setTitle('⚗️ Willkommen in der Apotheke!')
        .setDescription('Deine Karriere als Apotheker beginnt.\nSammle Kraeuter, braue Heiltraenke und hilf der Stadtbevölkerung!')
        .addFields(
          { name: 'Startkraut', value: 'Kamille', inline: true },
          { name: 'Methode', value: 'Aufguss', inline: true }
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'status') {
      const a = getApotheker(uId);
      const xpNeeded = xpForLevel(a.level);
      const upBonus = UPGRADES.mörser.bonus[a.moerser] + UPGRADES.destillierkolben.bonus[a.destillierkolben] +
        UPGRADES.kraeutergarten.bonus[a.kraeutergarten] + UPGRADES.werkstatt.bonus[a.werkstatt];
      const embed = new EmbedBuilder()
        .setColor(0x228B22)
        .setTitle(`⚗️ Apotheker-Status von ${interaction.user.username}`)
        .addFields(
          { name: 'Level', value: `${a.level}`, inline: true },
          { name: 'XP', value: `${a.xp}/${xpNeeded}`, inline: true },
          { name: 'Geld', value: `${a.geld} Taler`, inline: true },
          { name: 'Kraut', value: `${a.kraut} (${a.krautMenge} Einh.)`, inline: true },
          { name: 'Methode', value: a.methode, inline: true },
          { name: 'Upgrade-Bonus', value: `+${(upBonus * 100).toFixed(0)}%`, inline: true },
          { name: 'Traenke gebraut', value: `${a.traenkeGebraut}`, inline: true },
          { name: 'Auftraege', value: `${a.auftraege}`, inline: true },
          { name: 'Duelle', value: `${a.duelleGewonnen}/${a.duelle}`, inline: true }
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'kraeuter') {
      const embed = new EmbedBuilder()
        .setColor(0x228B22)
        .setTitle('🌿 Verfuegbare Kraeuter')
        .setDescription(KRAEUTER.map(k =>
          `${k.emoji} **${k.name}** — ${k.preis} Taler | Qualität x${k.qualitaet}`
        ).join('\n'));
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'kaufen') {
      const a = getApotheker(uId);
      const krautName = interaction.options.getString('kraut');
      const menge = interaction.options.getInteger('menge');
      const kraut = KRAEUTER.find(k => k.name.toLowerCase() === krautName.toLowerCase());
      if (!kraut) return interaction.reply({ content: '❌ Unbekanntes Kraut!', ephemeral: true });
      const kosten = kraut.preis * menge;
      if (a.geld < kosten) return interaction.reply({ content: `❌ Nicht genug Taler! Benötigt: ${kosten}`, ephemeral: true });
      db.db.prepare('UPDATE apotheker SET geld = geld - ?, kraut = ?, krautMenge = krautMenge + ? WHERE userId = ?')
        .run(kosten, kraut.name, menge, uId);
      return interaction.reply({ content: `✅ ${menge}x ${kraut.emoji} ${kraut.name} für ${kosten} Taler gekauft.` });
    }

    if (sub === 'brauen') {
      const now = Date.now();
      const cd = cooldowns.get(uId + '_brauen') || 0;
      if (now - cd < 30000) {
        const left = ((30000 - (now - cd)) / 1000).toFixed(1);
        return interaction.reply({ content: `⏳ Noch ${left}s warten!`, ephemeral: true });
      }
      const a = getApotheker(uId);
      if (a.krautMenge < 2) return interaction.reply({ content: '❌ Nicht genug Kraeuter! (mind. 2)', ephemeral: true });

      const praeparatName = interaction.options.getString('praeparat');
      const methodeName = interaction.options.getString('methode');
      const praeparat = PRAEPARATE.find(p => p.name.toLowerCase() === praeparatName.toLowerCase());
      const methode = METHODEN.find(m => m.name.toLowerCase() === methodeName.toLowerCase());
      if (!praeparat) return interaction.reply({ content: '❌ Unbekanntes Praeparat!', ephemeral: true });
      if (!methode) return interaction.reply({ content: '❌ Unbekannte Methode!', ephemeral: true });
      if (a.level < praeparat.minLevel) return interaction.reply({ content: `❌ Level ${praeparat.minLevel} benötigt!`, ephemeral: true });
      if (a.level < methode.minLevel) return interaction.reply({ content: `❌ Level ${methode.minLevel} für diese Methode benötigt!`, ephemeral: true });

      const kraut = KRAEUTER.find(k => k.name === a.kraut) || KRAEUTER[0];
      const upBonus = 1 + UPGRADES.mörser.bonus[a.moerser] + UPGRADES.destillierkolben.bonus[a.destillierkolben] +
        UPGRADES.kraeutergarten.bonus[a.kraeutergarten] + UPGRADES.werkstatt.bonus[a.werkstatt];
      const roll = Math.random() * 100 * kraut.qualitaet * methode.bonus * upBonus;
      const qual = [...QUALITAETEN].reverse().find(q => roll >= q.minRoll) || QUALITAETEN[0];

      const event = Math.random() < 0.25 ? APOTHEKER_EVENTS[Math.floor(Math.random() * APOTHEKER_EVENTS.length)] : null;
      const eqm = event ? event.qualMulti : 1.0;
      const egm = event ? event.geldMulti : 1.0;

      const wert = Math.floor(praeparat.basisWert * qual.multi * kraut.qualitaet * methode.bonus * upBonus * eqm * egm);
      const xpGain = Math.floor((praeparat.schwierigkeit * 17 + wert / 10) * (event ? 1.1 : 1));

      cooldowns.set(uId + '_brauen', now);
      db.db.prepare('UPDATE apotheker SET geld = geld + ?, xp = xp + ?, krautMenge = krautMenge - 2, traenkeGebraut = traenkeGebraut + 1, methode = ? WHERE userId = ?')
        .run(wert, xpGain, methode.name, uId);
      db.db.prepare('INSERT INTO apotheker_regal (userId, praeparat, qualitaet, wert, hergestelltAm) VALUES (?, ?, ?, ?, ?)')
        .run(uId, praeparat.name, qual.name, wert, new Date().toISOString());

      const a2 = getApotheker(uId);
      const { lvl, ups } = checkLevelUp(uId, { level: a2.level, xp: a2.xp });

      const embed = new EmbedBuilder()
        .setColor(0x228B22)
        .setTitle('⚗️ Praeparat gebraut!')
        .setDescription(event ? event.text : '🌿 Du hast erfolgreich gebraut!')
        .addFields(
          { name: 'Praeparat', value: praeparat.name, inline: true },
          { name: 'Qualität', value: qual.name, inline: true },
          { name: 'Methode', value: methode.name, inline: true },
          { name: 'Wert', value: `${wert} Taler`, inline: true },
          { name: 'XP', value: `+${xpGain}`, inline: true },
          { name: 'Level', value: ups > 0 ? `⬆️ ${lvl} (+${ups})` : `${lvl}`, inline: true }
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'training') {
      const now = Date.now();
      const cd = cooldowns.get(uId + '_training') || 0;
      if (now - cd < 60000) {
        const left = ((60000 - (now - cd)) / 1000).toFixed(0);
        return interaction.reply({ content: `⏳ Noch ${left}s bis zum nächsten Training!`, ephemeral: true });
      }
      cooldowns.set(uId + '_training', now);
      const a = getApotheker(uId);
      const xpGain = Math.floor((8 + a.level * 3) * (1 + Math.random()));
      const geldGain = Math.floor(a.level * 4 * Math.random());
      db.db.prepare('UPDATE apotheker SET xp = xp + ?, geld = geld + ? WHERE userId = ?').run(xpGain, geldGain, uId);
      const a2 = getApotheker(uId);
      const { lvl, ups } = checkLevelUp(uId, { level: a2.level, xp: a2.xp });
      return interaction.reply({
        content: `🏋️ Training abgeschlossen! +${xpGain} XP, +${geldGain} Taler${ups > 0 ? ` | ⬆️ Level ${lvl}!` : ''}`,
      });
    }

    if (sub === 'upgrade') {
      const a = getApotheker(uId);
      const slot = interaction.options.getString('slot');
      const upg = UPGRADES[slot];
      const current = a[slot];
      if (current >= 4) return interaction.reply({ content: '❌ Bereits auf maximaler Stufe!', ephemeral: true });
      const kosten = [0, 200, 500, 1100, 2400][current + 1];
      if (a.geld < kosten) return interaction.reply({ content: `❌ Benötigt ${kosten} Taler!`, ephemeral: true });
      db.db.prepare(`UPDATE apotheker SET geld = geld - ?, ${slot} = ${slot} + 1 WHERE userId = ?`).run(kosten, uId);
      return interaction.reply({
        content: `✅ **${upg.name}** auf Stufe ${current + 1} verbessert! (+${(upg.bonus[current + 1] * 100).toFixed(0)}% Bonus)`,
      });
    }

    if (sub === 'regal') {
      const rows = db.db.prepare('SELECT * FROM apotheker_regal WHERE userId = ? ORDER BY id DESC LIMIT 8').all(uId);
      if (!rows.length) return interaction.reply({ content: '🧪 Dein Regal ist noch leer.', ephemeral: true });
      const embed = new EmbedBuilder()
        .setColor(0x228B22)
        .setTitle('🧪 Dein Apothekenregal')
        .setDescription(rows.map(r => `**${r.praeparat}** (${r.qualitaet}) — ${r.wert} Taler`).join('\n'));
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'auftrag') {
      const now = Date.now();
      const cd = cooldowns.get(uId + '_auftrag') || 0;
      if (now - cd < 120000) {
        const left = ((120000 - (now - cd)) / 1000).toFixed(0);
        return interaction.reply({ content: `⏳ Nächster Auftrag in ${left}s!`, ephemeral: true });
      }
      cooldowns.set(uId + '_auftrag', now);
      const a = getApotheker(uId);
      const praeparat = PRAEPARATE[Math.min(Math.floor(Math.random() * 3) + Math.floor(a.level / 5), PRAEPARATE.length - 1)];
      const belohnung = Math.floor(praeparat.basisWert * (1.55 + Math.random()));
      const xpBonus = Math.floor(praeparat.schwierigkeit * 24);
      db.db.prepare('UPDATE apotheker SET geld = geld + ?, xp = xp + ?, auftraege = auftraege + 1 WHERE userId = ?')
        .run(belohnung, xpBonus, uId);
      const a2 = getApotheker(uId);
      const { lvl, ups } = checkLevelUp(uId, { level: a2.level, xp: a2.xp });
      return interaction.reply({
        content: `📋 Heilauftrag erfüllt: **${praeparat.name}** — +${belohnung} Taler, +${xpBonus} XP${ups > 0 ? ` | ⬆️ Level ${lvl}!` : ''}`,
      });
    }

    if (sub === 'duell') {
      const gegner = interaction.options.getUser('gegner');
      if (gegner.id === uId) return interaction.reply({ content: '❌ Du kannst nicht gegen dich selbst kämpfen!', ephemeral: true });
      const a = getApotheker(uId);
      const opp = db.db.prepare('SELECT * FROM apotheker WHERE userId = ?').get(gegner.id);
      if (!opp) return interaction.reply({ content: '❌ Dein Gegner ist kein Apotheker!', ephemeral: true });

      const myScore = a.level * 11 + a.traenkeGebraut * 2 + Math.random() * 40;
      const oppScore = opp.level * 11 + opp.traenkeGebraut * 2 + Math.random() * 40;
      const won = myScore > oppScore;
      const reward = Math.floor(55 + a.level * 16);

      db.db.prepare('UPDATE apotheker SET duelle = duelle + 1, duelleGewonnen = duelleGewonnen + ?, geld = geld + ?, xp = xp + ? WHERE userId = ?')
        .run(won ? 1 : 0, won ? reward : 0, won ? 32 : 11, uId);
      db.db.prepare('UPDATE apotheker SET duelle = duelle + 1 WHERE userId = ?').run(gegner.id);

      const a2 = getApotheker(uId);
      const { lvl, ups } = checkLevelUp(uId, { level: a2.level, xp: a2.xp });

      const embed = new EmbedBuilder()
        .setColor(won ? 0x00FF00 : 0xFF0000)
        .setTitle(won ? '⚗️ Duell gewonnen!' : '⚗️ Duell verloren!')
        .setDescription(won
          ? `Deine Tränke waren staerker als die von ${gegner.username}!\n+${reward} Taler, +32 XP${ups > 0 ? ` | ⬆️ Level ${lvl}!` : ''}`
          : `${gegner.username} hatte die wirksameren Elixiere. Uebe weiter!\n+11 XP Trostpreis`);
      return interaction.reply({ embeds: [embed] });
    }
  },
};
