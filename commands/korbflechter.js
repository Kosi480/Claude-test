const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

const MATERIALIEN = [
  { name: 'Binsen', preis: 6, qualitaet: 1.0, emoji: '🌾' },
  { name: 'Weidenruten', preis: 14, qualitaet: 1.3, emoji: '🌿' },
  { name: 'Bambus', preis: 28, qualitaet: 1.7, emoji: '🎋' },
  { name: 'Haselnussruten', preis: 55, qualitaet: 2.1, emoji: '🌱' },
  { name: 'Rattangeflecht', preis: 110, qualitaet: 2.7, emoji: '🪢' },
  { name: 'Elfenranken', preis: 220, qualitaet: 3.5, emoji: '✨' },
  { name: 'Mondgras', preis: 430, qualitaet: 4.5, emoji: '🌙' },
  { name: 'Aetherfasern', preis: 820, qualitaet: 6.0, emoji: '🌟' },
];

const PRODUKTE = [
  { name: 'Kleiner Korb', basisWert: 40, schwierigkeit: 1, minLevel: 1 },
  { name: 'Einkaufskorb', basisWert: 90, schwierigkeit: 2, minLevel: 3 },
  { name: 'Waeschekorb', basisWert: 160, schwierigkeit: 3, minLevel: 5 },
  { name: 'Fischkorb', basisWert: 250, schwierigkeit: 4, minLevel: 8 },
  { name: 'Reisekorb', basisWert: 380, schwierigkeit: 5, minLevel: 12 },
  { name: 'Schmuckkoerbchen', basisWert: 580, schwierigkeit: 6, minLevel: 16 },
  { name: 'Prachtstuhl', basisWert: 880, schwierigkeit: 7, minLevel: 21 },
  { name: 'Legendaerer Aetherkorb', basisWert: 1350, schwierigkeit: 8, minLevel: 28 },
];

const TECHNIKEN = [
  { name: 'Einfachgeflecht', bonus: 1.0, minLevel: 1 },
  { name: 'Spiralgeflecht', bonus: 1.25, minLevel: 3 },
  { name: 'Twillgeflecht', bonus: 1.55, minLevel: 5 },
  { name: 'Hexagonalgeflecht', bonus: 1.9, minLevel: 8 },
  { name: 'Doppelwandgeflecht', bonus: 2.35, minLevel: 12 },
  { name: 'Reliefgeflecht', bonus: 2.9, minLevel: 16 },
  { name: 'Elfenwebkunst', bonus: 3.7, minLevel: 21 },
  { name: 'Aetherflecht', bonus: 5.0, minLevel: 28 },
];

const QUALITAETEN = [
  { name: 'Aufgedroeselt', multi: 0.3, minRoll: 0 },
  { name: 'Grob', multi: 0.55, minRoll: 13 },
  { name: 'Solide', multi: 0.8, minRoll: 28 },
  { name: 'Gleichmaessig', multi: 1.05, minRoll: 47 },
  { name: 'Fein', multi: 1.45, minRoll: 63 },
  { name: 'Kunstvoll', multi: 2.0, minRoll: 80 },
  { name: 'Meisterhaft', multi: 2.85, minRoll: 92 },
];

const UPGRADES = {
  flechtnadel: { name: 'Flechtnadel', stufen: [0, 1, 2, 3, 4], bonus: [0, 0.06, 0.13, 0.20, 0.30] },
  spannrahmen: { name: 'Spannrahmen', stufen: [0, 1, 2, 3, 4], bonus: [0, 0.05, 0.12, 0.19, 0.28] },
  trockenkammer: { name: 'Trockenkammer', stufen: [0, 1, 2, 3, 4], bonus: [0, 0.05, 0.11, 0.18, 0.27] },
  werkstatt: { name: 'Werkstatt', stufen: [0, 1, 2, 3, 4], bonus: [0, 0.08, 0.16, 0.25, 0.35] },
};

const KORBFLECHTER_EVENTS = [
  { text: '✨ Die Fasern fuegen sich wie von selbst zusammen — ein Wunderkorb!', qualMulti: 1.85, geldMulti: 1.0 },
  { text: '💰 Eine wohlhabende Dame bestellt gleich ein Dutzend!', qualMulti: 1.0, geldMulti: 2.2 },
  { text: '🌿 Die Ruten waren besonders geschmeidig und leicht zu flechten!', qualMulti: 1.65, geldMulti: 1.2 },
  { text: '💨 Eine Rute brach — du musstest das Muster neu beginnen.', qualMulti: 0.55, geldMulti: 1.0 },
  { text: '🛒 Der Marktmeister will deine Koerbe als Standgeflecht nutzen!', qualMulti: 1.4, geldMulti: 1.85 },
  { text: '🌧️ Feuchtigkeit weichte die Fasern auf — etwas locker geworden.', qualMulti: 0.65, geldMulti: 0.9 },
  { text: '🌟 Dein Flechtmuster wird von Haendlern aus fernen Landen bewundert!', qualMulti: 1.45, geldMulti: 1.65 },
];

const cooldowns = new Map();

function ensureKorbflechterTable() {
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS korbflechter (
      userId TEXT PRIMARY KEY,
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      geld INTEGER DEFAULT 0,
      material TEXT DEFAULT 'Binsen',
      materialMenge INTEGER DEFAULT 0,
      technik TEXT DEFAULT 'Einfachgeflecht',
      flechtnadel INTEGER DEFAULT 0,
      spannrahmen INTEGER DEFAULT 0,
      trockenkammer INTEGER DEFAULT 0,
      werkstatt INTEGER DEFAULT 0,
      koerbeGeflochten INTEGER DEFAULT 0,
      auftraege INTEGER DEFAULT 0,
      duelle INTEGER DEFAULT 0,
      duelleGewonnen INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS korbflechter_markt (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT,
      produkt TEXT,
      qualitaet TEXT,
      wert INTEGER,
      hergestelltAm TEXT
    );
  `);
}

function getKorbflechter(uId) {
  let row = db.db.prepare('SELECT * FROM korbflechter WHERE userId = ?').get(uId);
  if (!row) {
    db.db.prepare('INSERT INTO korbflechter (userId) VALUES (?)').run(uId);
    row = db.db.prepare('SELECT * FROM korbflechter WHERE userId = ?').get(uId);
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
    db.db.prepare('UPDATE korbflechter SET level = ?, xp = ? WHERE userId = ?').run(lvl, obj.xp, uId);
  }
  return { lvl, ups };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('korbflechter')
    .setDescription('Arbeite als Korbflechter und flechte Koerbe aus Weiden und Binsen')
    .addSubcommand(s => s.setName('start').setDescription('Beginne deine Korbflechter-Karriere'))
    .addSubcommand(s => s.setName('status').setDescription('Zeige deinen Korbflechter-Status'))
    .addSubcommand(s => s.setName('materialien').setDescription('Liste alle Flechtmaterialien auf'))
    .addSubcommand(s => s.setName('kaufen').setDescription('Kaufe Flechtmaterial')
      .addStringOption(o => o.setName('material').setDescription('Welches Material?').setRequired(true))
      .addIntegerOption(o => o.setName('menge').setDescription('Wie viel?').setRequired(true).setMinValue(1)))
    .addSubcommand(s => s.setName('flechten').setDescription('Flechte einen Korb')
      .addStringOption(o => o.setName('produkt').setDescription('Was flechten?').setRequired(true))
      .addStringOption(o => o.setName('technik').setDescription('Welche Technik?').setRequired(true)))
    .addSubcommand(s => s.setName('training').setDescription('Trainiere deine Flechtkunst'))
    .addSubcommand(s => s.setName('upgrade').setDescription('Verbessere deine Ausruestung')
      .addStringOption(o => o.setName('slot').setDescription('Was upgraden?').setRequired(true)
        .addChoices(
          { name: 'Flechtnadel', value: 'flechtnadel' },
          { name: 'Spannrahmen', value: 'spannrahmen' },
          { name: 'Trockenkammer', value: 'trockenkammer' },
          { name: 'Werkstatt', value: 'werkstatt' }
        )))
    .addSubcommand(s => s.setName('markt').setDescription('Zeige deine Marktware'))
    .addSubcommand(s => s.setName('auftrag').setDescription('Nimm einen Flechtauftrag an'))
    .addSubcommand(s => s.setName('duell').setDescription('Fordere einen anderen Korbflechter heraus')
      .addUserOption(o => o.setName('gegner').setDescription('Wen herausfordern?').setRequired(true))),

  async execute(interaction) {
    const config = require('../config.json');
    ensureKorbflechterTable();
    const uId = interaction.user.id;
    const sub = interaction.options.getSubcommand();

    if (sub === 'start') {
      const existing = db.db.prepare('SELECT userId FROM korbflechter WHERE userId = ?').get(uId);
      if (existing) {
        return interaction.reply({ content: '🧺 Du bist bereits Korbflechter!', ephemeral: true });
      }
      db.db.prepare('INSERT INTO korbflechter (userId) VALUES (?)').run(uId);
      const embed = new EmbedBuilder()
        .setColor(0xD2691E)
        .setTitle('🧺 Willkommen in der Flechterei!')
        .setDescription('Deine Karriere als Korbflechter beginnt.\nFlechte, winde, forme — erschaffe Koerbe die Generationen ueberdauern!')
        .addFields(
          { name: 'Startmaterial', value: 'Binsen', inline: true },
          { name: 'Technik', value: 'Einfachgeflecht', inline: true }
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'status') {
      const k = getKorbflechter(uId);
      const xpNeeded = xpForLevel(k.level);
      const upBonus = UPGRADES.flechtnadel.bonus[k.flechtnadel] + UPGRADES.spannrahmen.bonus[k.spannrahmen] +
        UPGRADES.trockenkammer.bonus[k.trockenkammer] + UPGRADES.werkstatt.bonus[k.werkstatt];
      const embed = new EmbedBuilder()
        .setColor(0xD2691E)
        .setTitle(`🧺 Korbflechter-Status von ${interaction.user.username}`)
        .addFields(
          { name: 'Level', value: `${k.level}`, inline: true },
          { name: 'XP', value: `${k.xp}/${xpNeeded}`, inline: true },
          { name: 'Geld', value: `${k.geld} Taler`, inline: true },
          { name: 'Material', value: `${k.material} (${k.materialMenge} Einh.)`, inline: true },
          { name: 'Technik', value: k.technik, inline: true },
          { name: 'Upgrade-Bonus', value: `+${(upBonus * 100).toFixed(0)}%`, inline: true },
          { name: 'Koerbe geflochten', value: `${k.koerbeGeflochten}`, inline: true },
          { name: 'Auftraege', value: `${k.auftraege}`, inline: true },
          { name: 'Duelle', value: `${k.duelleGewonnen}/${k.duelle}`, inline: true }
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'materialien') {
      const embed = new EmbedBuilder()
        .setColor(0xD2691E)
        .setTitle('🌾 Verfuegbare Flechtmaterialien')
        .setDescription(MATERIALIEN.map(m =>
          `${m.emoji} **${m.name}** — ${m.preis} Taler | Qualität x${m.qualitaet}`
        ).join('\n'));
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'kaufen') {
      const k = getKorbflechter(uId);
      const matName = interaction.options.getString('material');
      const menge = interaction.options.getInteger('menge');
      const mat = MATERIALIEN.find(m => m.name.toLowerCase() === matName.toLowerCase());
      if (!mat) return interaction.reply({ content: '❌ Unbekanntes Material!', ephemeral: true });
      const kosten = mat.preis * menge;
      if (k.geld < kosten) return interaction.reply({ content: `❌ Nicht genug Taler! Benötigt: ${kosten}`, ephemeral: true });
      db.db.prepare('UPDATE korbflechter SET geld = geld - ?, material = ?, materialMenge = materialMenge + ? WHERE userId = ?')
        .run(kosten, mat.name, menge, uId);
      return interaction.reply({ content: `✅ ${menge}x ${mat.emoji} ${mat.name} für ${kosten} Taler gekauft.` });
    }

    if (sub === 'flechten') {
      const now = Date.now();
      const cd = cooldowns.get(uId + '_flechten') || 0;
      if (now - cd < 30000) {
        const left = ((30000 - (now - cd)) / 1000).toFixed(1);
        return interaction.reply({ content: `⏳ Noch ${left}s warten!`, ephemeral: true });
      }
      const k = getKorbflechter(uId);
      if (k.materialMenge < 2) return interaction.reply({ content: '❌ Nicht genug Material! (mind. 2)', ephemeral: true });

      const produktName = interaction.options.getString('produkt');
      const technikName = interaction.options.getString('technik');
      const produkt = PRODUKTE.find(p => p.name.toLowerCase() === produktName.toLowerCase());
      const technik = TECHNIKEN.find(t => t.name.toLowerCase() === technikName.toLowerCase());
      if (!produkt) return interaction.reply({ content: '❌ Unbekanntes Produkt!', ephemeral: true });
      if (!technik) return interaction.reply({ content: '❌ Unbekannte Technik!', ephemeral: true });
      if (k.level < produkt.minLevel) return interaction.reply({ content: `❌ Level ${produkt.minLevel} benötigt!`, ephemeral: true });
      if (k.level < technik.minLevel) return interaction.reply({ content: `❌ Level ${technik.minLevel} für diese Technik benötigt!`, ephemeral: true });

      const mat = MATERIALIEN.find(m => m.name === k.material) || MATERIALIEN[0];
      const upBonus = 1 + UPGRADES.flechtnadel.bonus[k.flechtnadel] + UPGRADES.spannrahmen.bonus[k.spannrahmen] +
        UPGRADES.trockenkammer.bonus[k.trockenkammer] + UPGRADES.werkstatt.bonus[k.werkstatt];
      const roll = Math.random() * 100 * mat.qualitaet * technik.bonus * upBonus;
      const qual = [...QUALITAETEN].reverse().find(q => roll >= q.minRoll) || QUALITAETEN[0];

      const event = Math.random() < 0.25 ? KORBFLECHTER_EVENTS[Math.floor(Math.random() * KORBFLECHTER_EVENTS.length)] : null;
      const eqm = event ? event.qualMulti : 1.0;
      const egm = event ? event.geldMulti : 1.0;

      const wert = Math.floor(produkt.basisWert * qual.multi * mat.qualitaet * technik.bonus * upBonus * eqm * egm);
      const xpGain = Math.floor((produkt.schwierigkeit * 16 + wert / 10) * (event ? 1.1 : 1));

      cooldowns.set(uId + '_flechten', now);
      db.db.prepare('UPDATE korbflechter SET geld = geld + ?, xp = xp + ?, materialMenge = materialMenge - 2, koerbeGeflochten = koerbeGeflochten + 1, technik = ? WHERE userId = ?')
        .run(wert, xpGain, technik.name, uId);
      db.db.prepare('INSERT INTO korbflechter_markt (userId, produkt, qualitaet, wert, hergestelltAm) VALUES (?, ?, ?, ?, ?)')
        .run(uId, produkt.name, qual.name, wert, new Date().toISOString());

      const k2 = getKorbflechter(uId);
      const { lvl, ups } = checkLevelUp(uId, { level: k2.level, xp: k2.xp });

      const embed = new EmbedBuilder()
        .setColor(0xD2691E)
        .setTitle('🧺 Korb geflochten!')
        .setDescription(event ? event.text : '🌾 Du hast erfolgreich geflochten!')
        .addFields(
          { name: 'Produkt', value: produkt.name, inline: true },
          { name: 'Qualität', value: qual.name, inline: true },
          { name: 'Technik', value: technik.name, inline: true },
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
      const k = getKorbflechter(uId);
      const xpGain = Math.floor((7 + k.level * 3) * (1 + Math.random()));
      const geldGain = Math.floor(k.level * 4 * Math.random());
      db.db.prepare('UPDATE korbflechter SET xp = xp + ?, geld = geld + ? WHERE userId = ?').run(xpGain, geldGain, uId);
      const k2 = getKorbflechter(uId);
      const { lvl, ups } = checkLevelUp(uId, { level: k2.level, xp: k2.xp });
      return interaction.reply({
        content: `🏋️ Training abgeschlossen! +${xpGain} XP, +${geldGain} Taler${ups > 0 ? ` | ⬆️ Level ${lvl}!` : ''}`,
      });
    }

    if (sub === 'upgrade') {
      const k = getKorbflechter(uId);
      const slot = interaction.options.getString('slot');
      const upg = UPGRADES[slot];
      const current = k[slot];
      if (current >= 4) return interaction.reply({ content: '❌ Bereits auf maximaler Stufe!', ephemeral: true });
      const kosten = [0, 180, 450, 1000, 2200][current + 1];
      if (k.geld < kosten) return interaction.reply({ content: `❌ Benötigt ${kosten} Taler!`, ephemeral: true });
      db.db.prepare(`UPDATE korbflechter SET geld = geld - ?, ${slot} = ${slot} + 1 WHERE userId = ?`).run(kosten, uId);
      return interaction.reply({
        content: `✅ **${upg.name}** auf Stufe ${current + 1} verbessert! (+${(upg.bonus[current + 1] * 100).toFixed(0)}% Bonus)`,
      });
    }

    if (sub === 'markt') {
      const rows = db.db.prepare('SELECT * FROM korbflechter_markt WHERE userId = ? ORDER BY id DESC LIMIT 8').all(uId);
      if (!rows.length) return interaction.reply({ content: '🧺 Dein Marktstand ist noch leer.', ephemeral: true });
      const embed = new EmbedBuilder()
        .setColor(0xD2691E)
        .setTitle('🧺 Dein Marktstand')
        .setDescription(rows.map(r => `**${r.produkt}** (${r.qualitaet}) — ${r.wert} Taler`).join('\n'));
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
      const k = getKorbflechter(uId);
      const produkt = PRODUKTE[Math.min(Math.floor(Math.random() * 3) + Math.floor(k.level / 5), PRODUKTE.length - 1)];
      const belohnung = Math.floor(produkt.basisWert * (1.5 + Math.random()));
      const xpBonus = Math.floor(produkt.schwierigkeit * 22);
      db.db.prepare('UPDATE korbflechter SET geld = geld + ?, xp = xp + ?, auftraege = auftraege + 1 WHERE userId = ?')
        .run(belohnung, xpBonus, uId);
      const k2 = getKorbflechter(uId);
      const { lvl, ups } = checkLevelUp(uId, { level: k2.level, xp: k2.xp });
      return interaction.reply({
        content: `📋 Auftrag erfüllt: **${produkt.name}** — +${belohnung} Taler, +${xpBonus} XP${ups > 0 ? ` | ⬆️ Level ${lvl}!` : ''}`,
      });
    }

    if (sub === 'duell') {
      const gegner = interaction.options.getUser('gegner');
      if (gegner.id === uId) return interaction.reply({ content: '❌ Du kannst nicht gegen dich selbst kämpfen!', ephemeral: true });
      const k = getKorbflechter(uId);
      const opp = db.db.prepare('SELECT * FROM korbflechter WHERE userId = ?').get(gegner.id);
      if (!opp) return interaction.reply({ content: '❌ Dein Gegner ist kein Korbflechter!', ephemeral: true });

      const myScore = k.level * 10 + k.koerbeGeflochten * 2 + Math.random() * 40;
      const oppScore = opp.level * 10 + opp.koerbeGeflochten * 2 + Math.random() * 40;
      const won = myScore > oppScore;
      const reward = Math.floor(45 + k.level * 14);

      db.db.prepare('UPDATE korbflechter SET duelle = duelle + 1, duelleGewonnen = duelleGewonnen + ?, geld = geld + ?, xp = xp + ? WHERE userId = ?')
        .run(won ? 1 : 0, won ? reward : 0, won ? 28 : 10, uId);
      db.db.prepare('UPDATE korbflechter SET duelle = duelle + 1 WHERE userId = ?').run(gegner.id);

      const k2 = getKorbflechter(uId);
      const { lvl, ups } = checkLevelUp(uId, { level: k2.level, xp: k2.xp });

      const embed = new EmbedBuilder()
        .setColor(won ? 0x00FF00 : 0xFF0000)
        .setTitle(won ? '🧺 Duell gewonnen!' : '🧺 Duell verloren!')
        .setDescription(won
          ? `Deine Flechtkunst uebertraf die von ${gegner.username}!\n+${reward} Taler, +28 XP${ups > 0 ? ` | ⬆️ Level ${lvl}!` : ''}`
          : `${gegner.username} hat dich überlistet. Uebe weiter!\n+10 XP Trostpreis`);
      return interaction.reply({ embeds: [embed] });
    }
  },
};
