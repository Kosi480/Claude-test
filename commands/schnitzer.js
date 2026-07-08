const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

const HOELZER = [
  { name: 'Lindenholz', preis: 9, qualitaet: 1.0, emoji: '🌿' },
  { name: 'Buchenholz', preis: 20, qualitaet: 1.3, emoji: '🌳' },
  { name: 'Kirschholz', preis: 38, qualitaet: 1.7, emoji: '🍒' },
  { name: 'Nussbaumholz', preis: 72, qualitaet: 2.1, emoji: '🟫' },
  { name: 'Ebenholz', preis: 140, qualitaet: 2.7, emoji: '🖤' },
  { name: 'Elfenholz', preis: 270, qualitaet: 3.5, emoji: '✨' },
  { name: 'Mondholz', preis: 520, qualitaet: 4.5, emoji: '🌙' },
  { name: 'Aetherholz', preis: 980, qualitaet: 6.0, emoji: '🌟' },
];

const SCHNITZWERKE = [
  { name: 'Holzloeffel', basisWert: 42, schwierigkeit: 1, minLevel: 1 },
  { name: 'Tierstatuette', basisWert: 95, schwierigkeit: 2, minLevel: 3 },
  { name: 'Holzmaske', basisWert: 170, schwierigkeit: 3, minLevel: 5 },
  { name: 'Relieftafel', basisWert: 270, schwierigkeit: 4, minLevel: 8 },
  { name: 'Heiligenfigur', basisWert: 420, schwierigkeit: 5, minLevel: 12 },
  { name: 'Wappenschild', basisWert: 640, schwierigkeit: 6, minLevel: 16 },
  { name: 'Altarfigur', basisWert: 960, schwierigkeit: 7, minLevel: 21 },
  { name: 'Legendaeres Aetherwerk', basisWert: 1480, schwierigkeit: 8, minLevel: 28 },
];

const TECHNIKEN = [
  { name: 'Kerbschnitt', bonus: 1.0, minLevel: 1 },
  { name: 'Flachschnitt', bonus: 1.25, minLevel: 3 },
  { name: 'Rundschnitt', bonus: 1.55, minLevel: 5 },
  { name: 'Reliefschnitt', bonus: 1.9, minLevel: 8 },
  { name: 'Durchbruchschnitt', bonus: 2.35, minLevel: 12 },
  { name: 'Filigranschnitt', bonus: 2.9, minLevel: 16 },
  { name: 'Elfenschnitt', bonus: 3.7, minLevel: 21 },
  { name: 'Aetherformung', bonus: 5.0, minLevel: 28 },
];

const QUALITAETEN = [
  { name: 'Zersplittert', multi: 0.3, minRoll: 0 },
  { name: 'Grob', multi: 0.55, minRoll: 13 },
  { name: 'Ordentlich', multi: 0.8, minRoll: 28 },
  { name: 'Fein', multi: 1.05, minRoll: 47 },
  { name: 'Detailreich', multi: 1.45, minRoll: 63 },
  { name: 'Kunstvoll', multi: 2.0, minRoll: 80 },
  { name: 'Meisterhaft', multi: 2.85, minRoll: 92 },
];

const UPGRADES = {
  schnitzmesser: { name: 'Schnitzmesser', stufen: [0, 1, 2, 3, 4], bonus: [0, 0.06, 0.13, 0.21, 0.31] },
  stechbeitel: { name: 'Stechbeitel', stufen: [0, 1, 2, 3, 4], bonus: [0, 0.05, 0.12, 0.20, 0.29] },
  schleifstein: { name: 'Schleifstein', stufen: [0, 1, 2, 3, 4], bonus: [0, 0.05, 0.11, 0.18, 0.27] },
  werkstatt: { name: 'Werkstatt', stufen: [0, 1, 2, 3, 4], bonus: [0, 0.08, 0.16, 0.25, 0.35] },
};

const SCHNITZER_EVENTS = [
  { text: '✨ Das Holz schien von selbst Form anzunehmen — ein Wunderwerk!', qualMulti: 1.9, geldMulti: 1.0 },
  { text: '💰 Ein Kunsthaendler zahlt das Dreifache fuer dein Stueck!', qualMulti: 1.0, geldMulti: 2.3 },
  { text: '🪵 Die Maserung des Holzes war aussergewoehnlich schoen!', qualMulti: 1.7, geldMulti: 1.2 },
  { text: '🔪 Das Messer glitt ab — ein Span zu viel entfernt.', qualMulti: 0.55, geldMulti: 1.0 },
  { text: '⛪ Die Kirche bestellt eine grosse Heiligenfigur!', qualMulti: 1.5, geldMulti: 1.9 },
  { text: '💧 Feuchtigkeit liess das Holz leicht quellen — Risse entstanden.', qualMulti: 0.65, geldMulti: 0.9 },
  { text: '🌟 Dein Schnitzwerk haengt jetzt im Rathaus der Stadt!', qualMulti: 1.4, geldMulti: 1.7 },
];

const cooldowns = new Map();

function ensureSchnitzerTable() {
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS schnitzer (
      userId TEXT PRIMARY KEY,
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      geld INTEGER DEFAULT 0,
      holz TEXT DEFAULT 'Lindenholz',
      holzMenge INTEGER DEFAULT 0,
      technik TEXT DEFAULT 'Kerbschnitt',
      schnitzmesser INTEGER DEFAULT 0,
      stechbeitel INTEGER DEFAULT 0,
      schleifstein INTEGER DEFAULT 0,
      werkstatt INTEGER DEFAULT 0,
      werkeGeschnitzt INTEGER DEFAULT 0,
      auftraege INTEGER DEFAULT 0,
      duelle INTEGER DEFAULT 0,
      duelleGewonnen INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS schnitzer_ausstellung (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT,
      werk TEXT,
      qualitaet TEXT,
      wert INTEGER,
      geschnitztAm TEXT
    );
  `);
}

function getSchnitzer(uId) {
  let row = db.db.prepare('SELECT * FROM schnitzer WHERE userId = ?').get(uId);
  if (!row) {
    db.db.prepare('INSERT INTO schnitzer (userId) VALUES (?)').run(uId);
    row = db.db.prepare('SELECT * FROM schnitzer WHERE userId = ?').get(uId);
  }
  return row;
}

function xpForLevel(l) { return l * l * 51; }

function checkLevelUp(uId, obj) {
  let lvl = obj.level;
  let ups = 0;
  while (obj.xp >= xpForLevel(lvl)) {
    obj.xp -= xpForLevel(lvl);
    lvl++;
    ups++;
  }
  if (ups > 0) {
    db.db.prepare('UPDATE schnitzer SET level = ?, xp = ? WHERE userId = ?').run(lvl, obj.xp, uId);
  }
  return { lvl, ups };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('schnitzer')
    .setDescription('Arbeite als Holzschnitzer und erschaffe kunstvolle Schnitzwerke')
    .addSubcommand(s => s.setName('start').setDescription('Beginne deine Schnitzer-Karriere'))
    .addSubcommand(s => s.setName('status').setDescription('Zeige deinen Schnitzer-Status'))
    .addSubcommand(s => s.setName('hoelzer').setDescription('Liste alle Holzarten auf'))
    .addSubcommand(s => s.setName('kaufen').setDescription('Kaufe Holz')
      .addStringOption(o => o.setName('holz').setDescription('Welches Holz?').setRequired(true))
      .addIntegerOption(o => o.setName('menge').setDescription('Wie viel?').setRequired(true).setMinValue(1)))
    .addSubcommand(s => s.setName('schnitzen').setDescription('Schnitze ein Werk')
      .addStringOption(o => o.setName('werk').setDescription('Was schnitzen?').setRequired(true))
      .addStringOption(o => o.setName('technik').setDescription('Welche Technik?').setRequired(true)))
    .addSubcommand(s => s.setName('training').setDescription('Trainiere deine Schnitzkunst'))
    .addSubcommand(s => s.setName('upgrade').setDescription('Verbessere deine Werkzeuge')
      .addStringOption(o => o.setName('slot').setDescription('Was upgraden?').setRequired(true)
        .addChoices(
          { name: 'Schnitzmesser', value: 'schnitzmesser' },
          { name: 'Stechbeitel', value: 'stechbeitel' },
          { name: 'Schleifstein', value: 'schleifstein' },
          { name: 'Werkstatt', value: 'werkstatt' }
        )))
    .addSubcommand(s => s.setName('ausstellung').setDescription('Zeige deine Schnitzausstellung'))
    .addSubcommand(s => s.setName('auftrag').setDescription('Nimm einen Schnitzauftrag an'))
    .addSubcommand(s => s.setName('duell').setDescription('Fordere einen anderen Schnitzer heraus')
      .addUserOption(o => o.setName('gegner').setDescription('Wen herausfordern?').setRequired(true))),

  async execute(interaction) {
    const config = require('../config.json');
    ensureSchnitzerTable();
    const uId = interaction.user.id;
    const sub = interaction.options.getSubcommand();

    if (sub === 'start') {
      const existing = db.db.prepare('SELECT userId FROM schnitzer WHERE userId = ?').get(uId);
      if (existing) {
        return interaction.reply({ content: '🪵 Du bist bereits Holzschnitzer!', ephemeral: true });
      }
      db.db.prepare('INSERT INTO schnitzer (userId) VALUES (?)').run(uId);
      const embed = new EmbedBuilder()
        .setColor(0xA0522D)
        .setTitle('🪵 Willkommen in der Schnitzwerkstatt!')
        .setDescription('Deine Karriere als Holzschnitzer beginnt.\nSchnitze, forme, vollende — erschaffe Werke die in Ewigkeit bestehen!')
        .addFields(
          { name: 'Startholz', value: 'Lindenholz', inline: true },
          { name: 'Technik', value: 'Kerbschnitt', inline: true }
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'status') {
      const s = getSchnitzer(uId);
      const xpNeeded = xpForLevel(s.level);
      const upBonus = UPGRADES.schnitzmesser.bonus[s.schnitzmesser] + UPGRADES.stechbeitel.bonus[s.stechbeitel] +
        UPGRADES.schleifstein.bonus[s.schleifstein] + UPGRADES.werkstatt.bonus[s.werkstatt];
      const embed = new EmbedBuilder()
        .setColor(0xA0522D)
        .setTitle(`🪵 Schnitzer-Status von ${interaction.user.username}`)
        .addFields(
          { name: 'Level', value: `${s.level}`, inline: true },
          { name: 'XP', value: `${s.xp}/${xpNeeded}`, inline: true },
          { name: 'Geld', value: `${s.geld} Taler`, inline: true },
          { name: 'Holz', value: `${s.holz} (${s.holzMenge} Einh.)`, inline: true },
          { name: 'Technik', value: s.technik, inline: true },
          { name: 'Upgrade-Bonus', value: `+${(upBonus * 100).toFixed(0)}%`, inline: true },
          { name: 'Werke geschnitzt', value: `${s.werkeGeschnitzt}`, inline: true },
          { name: 'Auftraege', value: `${s.auftraege}`, inline: true },
          { name: 'Duelle', value: `${s.duelleGewonnen}/${s.duelle}`, inline: true }
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'hoelzer') {
      const embed = new EmbedBuilder()
        .setColor(0xA0522D)
        .setTitle('🪵 Verfuegbare Holzarten')
        .setDescription(HOELZER.map(h =>
          `${h.emoji} **${h.name}** — ${h.preis} Taler | Qualität x${h.qualitaet}`
        ).join('\n'));
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'kaufen') {
      const s = getSchnitzer(uId);
      const holzName = interaction.options.getString('holz');
      const menge = interaction.options.getInteger('menge');
      const holz = HOELZER.find(h => h.name.toLowerCase() === holzName.toLowerCase());
      if (!holz) return interaction.reply({ content: '❌ Unbekannte Holzart!', ephemeral: true });
      const kosten = holz.preis * menge;
      if (s.geld < kosten) return interaction.reply({ content: `❌ Nicht genug Taler! Benötigt: ${kosten}`, ephemeral: true });
      db.db.prepare('UPDATE schnitzer SET geld = geld - ?, holz = ?, holzMenge = holzMenge + ? WHERE userId = ?')
        .run(kosten, holz.name, menge, uId);
      return interaction.reply({ content: `✅ ${menge}x ${holz.emoji} ${holz.name} für ${kosten} Taler gekauft.` });
    }

    if (sub === 'schnitzen') {
      const now = Date.now();
      const cd = cooldowns.get(uId + '_schnitzen') || 0;
      if (now - cd < 30000) {
        const left = ((30000 - (now - cd)) / 1000).toFixed(1);
        return interaction.reply({ content: `⏳ Noch ${left}s warten!`, ephemeral: true });
      }
      const s = getSchnitzer(uId);
      if (s.holzMenge < 2) return interaction.reply({ content: '❌ Nicht genug Holz! (mind. 2)', ephemeral: true });

      const werkName = interaction.options.getString('werk');
      const technikName = interaction.options.getString('technik');
      const werk = SCHNITZWERKE.find(w => w.name.toLowerCase() === werkName.toLowerCase());
      const technik = TECHNIKEN.find(t => t.name.toLowerCase() === technikName.toLowerCase());
      if (!werk) return interaction.reply({ content: '❌ Unbekanntes Schnitzwerk!', ephemeral: true });
      if (!technik) return interaction.reply({ content: '❌ Unbekannte Technik!', ephemeral: true });
      if (s.level < werk.minLevel) return interaction.reply({ content: `❌ Level ${werk.minLevel} benötigt!`, ephemeral: true });
      if (s.level < technik.minLevel) return interaction.reply({ content: `❌ Level ${technik.minLevel} für diese Technik benötigt!`, ephemeral: true });

      const holz = HOELZER.find(h => h.name === s.holz) || HOELZER[0];
      const upBonus = 1 + UPGRADES.schnitzmesser.bonus[s.schnitzmesser] + UPGRADES.stechbeitel.bonus[s.stechbeitel] +
        UPGRADES.schleifstein.bonus[s.schleifstein] + UPGRADES.werkstatt.bonus[s.werkstatt];
      const roll = Math.random() * 100 * holz.qualitaet * technik.bonus * upBonus;
      const qual = [...QUALITAETEN].reverse().find(q => roll >= q.minRoll) || QUALITAETEN[0];

      const event = Math.random() < 0.25 ? SCHNITZER_EVENTS[Math.floor(Math.random() * SCHNITZER_EVENTS.length)] : null;
      const eqm = event ? event.qualMulti : 1.0;
      const egm = event ? event.geldMulti : 1.0;

      const wert = Math.floor(werk.basisWert * qual.multi * holz.qualitaet * technik.bonus * upBonus * eqm * egm);
      const xpGain = Math.floor((werk.schwierigkeit * 18 + wert / 11) * (event ? 1.1 : 1));

      cooldowns.set(uId + '_schnitzen', now);
      db.db.prepare('UPDATE schnitzer SET geld = geld + ?, xp = xp + ?, holzMenge = holzMenge - 2, werkeGeschnitzt = werkeGeschnitzt + 1, technik = ? WHERE userId = ?')
        .run(wert, xpGain, technik.name, uId);
      db.db.prepare('INSERT INTO schnitzer_ausstellung (userId, werk, qualitaet, wert, geschnitztAm) VALUES (?, ?, ?, ?, ?)')
        .run(uId, werk.name, qual.name, wert, new Date().toISOString());

      const s2 = getSchnitzer(uId);
      const { lvl, ups } = checkLevelUp(uId, { level: s2.level, xp: s2.xp });

      const embed = new EmbedBuilder()
        .setColor(0xA0522D)
        .setTitle('🪵 Werk geschnitzt!')
        .setDescription(event ? event.text : '🔪 Du hast erfolgreich geschnitzt!')
        .addFields(
          { name: 'Werk', value: werk.name, inline: true },
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
      const s = getSchnitzer(uId);
      const xpGain = Math.floor((8 + s.level * 3) * (1 + Math.random()));
      const geldGain = Math.floor(s.level * 4 * Math.random());
      db.db.prepare('UPDATE schnitzer SET xp = xp + ?, geld = geld + ? WHERE userId = ?').run(xpGain, geldGain, uId);
      const s2 = getSchnitzer(uId);
      const { lvl, ups } = checkLevelUp(uId, { level: s2.level, xp: s2.xp });
      return interaction.reply({
        content: `🏋️ Training abgeschlossen! +${xpGain} XP, +${geldGain} Taler${ups > 0 ? ` | ⬆️ Level ${lvl}!` : ''}`,
      });
    }

    if (sub === 'upgrade') {
      const s = getSchnitzer(uId);
      const slot = interaction.options.getString('slot');
      const upg = UPGRADES[slot];
      const current = s[slot];
      if (current >= 4) return interaction.reply({ content: '❌ Bereits auf maximaler Stufe!', ephemeral: true });
      const kosten = [0, 190, 480, 1050, 2300][current + 1];
      if (s.geld < kosten) return interaction.reply({ content: `❌ Benötigt ${kosten} Taler!`, ephemeral: true });
      db.db.prepare(`UPDATE schnitzer SET geld = geld - ?, ${slot} = ${slot} + 1 WHERE userId = ?`).run(kosten, uId);
      return interaction.reply({
        content: `✅ **${upg.name}** auf Stufe ${current + 1} verbessert! (+${(upg.bonus[current + 1] * 100).toFixed(0)}% Bonus)`,
      });
    }

    if (sub === 'ausstellung') {
      const rows = db.db.prepare('SELECT * FROM schnitzer_ausstellung WHERE userId = ? ORDER BY id DESC LIMIT 8').all(uId);
      if (!rows.length) return interaction.reply({ content: '🏛️ Deine Ausstellung ist noch leer.', ephemeral: true });
      const embed = new EmbedBuilder()
        .setColor(0xA0522D)
        .setTitle('🏛️ Deine Schnitzausstellung')
        .setDescription(rows.map(r => `**${r.werk}** (${r.qualitaet}) — ${r.wert} Taler`).join('\n'));
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
      const s = getSchnitzer(uId);
      const werk = SCHNITZWERKE[Math.min(Math.floor(Math.random() * 3) + Math.floor(s.level / 5), SCHNITZWERKE.length - 1)];
      const belohnung = Math.floor(werk.basisWert * (1.55 + Math.random()));
      const xpBonus = Math.floor(werk.schwierigkeit * 24);
      db.db.prepare('UPDATE schnitzer SET geld = geld + ?, xp = xp + ?, auftraege = auftraege + 1 WHERE userId = ?')
        .run(belohnung, xpBonus, uId);
      const s2 = getSchnitzer(uId);
      const { lvl, ups } = checkLevelUp(uId, { level: s2.level, xp: s2.xp });
      return interaction.reply({
        content: `📋 Auftrag erfüllt: **${werk.name}** — +${belohnung} Taler, +${xpBonus} XP${ups > 0 ? ` | ⬆️ Level ${lvl}!` : ''}`,
      });
    }

    if (sub === 'duell') {
      const gegner = interaction.options.getUser('gegner');
      if (gegner.id === uId) return interaction.reply({ content: '❌ Du kannst nicht gegen dich selbst kämpfen!', ephemeral: true });
      const s = getSchnitzer(uId);
      const opp = db.db.prepare('SELECT * FROM schnitzer WHERE userId = ?').get(gegner.id);
      if (!opp) return interaction.reply({ content: '❌ Dein Gegner ist kein Schnitzer!', ephemeral: true });

      const myScore = s.level * 11 + s.werkeGeschnitzt * 2 + Math.random() * 40;
      const oppScore = opp.level * 11 + opp.werkeGeschnitzt * 2 + Math.random() * 40;
      const won = myScore > oppScore;
      const reward = Math.floor(50 + s.level * 15);

      db.db.prepare('UPDATE schnitzer SET duelle = duelle + 1, duelleGewonnen = duelleGewonnen + ?, geld = geld + ?, xp = xp + ? WHERE userId = ?')
        .run(won ? 1 : 0, won ? reward : 0, won ? 30 : 11, uId);
      db.db.prepare('UPDATE schnitzer SET duelle = duelle + 1 WHERE userId = ?').run(gegner.id);

      const s2 = getSchnitzer(uId);
      const { lvl, ups } = checkLevelUp(uId, { level: s2.level, xp: s2.xp });

      const embed = new EmbedBuilder()
        .setColor(won ? 0x00FF00 : 0xFF0000)
        .setTitle(won ? '🪵 Duell gewonnen!' : '🪵 Duell verloren!')
        .setDescription(won
          ? `Deine Schnitzkunst uebertraf die von ${gegner.username}!\n+${reward} Taler, +30 XP${ups > 0 ? ` | ⬆️ Level ${lvl}!` : ''}`
          : `${gegner.username} hat dich überlistet. Uebe weiter!\n+11 XP Trostpreis`);
      return interaction.reply({ embeds: [embed] });
    }
  },
};
