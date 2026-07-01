const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

const SANDE = [
  { name: 'Quarzsand', preis: 10, qualitaet: 1.0, emoji: '🏜️' },
  { name: 'Flusssand', preis: 22, qualitaet: 1.3, emoji: '🌊' },
  { name: 'Weisser Sand', preis: 40, qualitaet: 1.7, emoji: '⬜' },
  { name: 'Mineralsand', preis: 75, qualitaet: 2.1, emoji: '💎' },
  { name: 'Kristallsand', preis: 140, qualitaet: 2.7, emoji: '🔮' },
  { name: 'Elfensand', preis: 260, qualitaet: 3.5, emoji: '✨' },
  { name: 'Mondsand', preis: 500, qualitaet: 4.5, emoji: '🌙' },
  { name: 'Aethersand', preis: 950, qualitaet: 6.0, emoji: '🌟' },
];

const PRODUKTE = [
  { name: 'Fensterscheibe', basisWert: 55, schwierigkeit: 1, minLevel: 1 },
  { name: 'Trinkglas', basisWert: 120, schwierigkeit: 2, minLevel: 3 },
  { name: 'Spiegel', basisWert: 200, schwierigkeit: 3, minLevel: 5 },
  { name: 'Butzenscheibe', basisWert: 310, schwierigkeit: 4, minLevel: 8 },
  { name: 'Bleiverglasung', basisWert: 480, schwierigkeit: 5, minLevel: 12 },
  { name: 'Kirchenfenster', basisWert: 720, schwierigkeit: 6, minLevel: 16 },
  { name: 'Kristallvase', basisWert: 1080, schwierigkeit: 7, minLevel: 21 },
  { name: 'Legendaeres Aetherglas', basisWert: 1650, schwierigkeit: 8, minLevel: 28 },
];

const TECHNIKEN = [
  { name: 'Mundblasen', bonus: 1.0, minLevel: 1 },
  { name: 'Zylinderblasen', bonus: 1.2, minLevel: 3 },
  { name: 'Tafelglas', bonus: 1.5, minLevel: 5 },
  { name: 'Spiegelschliff', bonus: 1.9, minLevel: 8 },
  { name: 'Bleifassung', bonus: 2.4, minLevel: 12 },
  { name: 'Kristallschliff', bonus: 3.0, minLevel: 16 },
  { name: 'Elfentechnik', bonus: 3.8, minLevel: 21 },
  { name: 'Aetherformung', bonus: 5.0, minLevel: 28 },
];

const QUALITAETEN = [
  { name: 'Gesprungen', multi: 0.3, minRoll: 0 },
  { name: 'Trueb', multi: 0.55, minRoll: 15 },
  { name: 'Klar', multi: 0.8, minRoll: 30 },
  { name: 'Durchsichtig', multi: 1.0, minRoll: 50 },
  { name: 'Kristallklar', multi: 1.4, minRoll: 65 },
  { name: 'Makellos', multi: 1.9, minRoll: 80 },
  { name: 'Meisterhaft', multi: 2.8, minRoll: 92 },
];

const UPGRADES = {
  blasrohr: { name: 'Blasrohr', stufen: [0, 1, 2, 3, 4], bonus: [0, 0.05, 0.12, 0.20, 0.30] },
  schmelzofen: { name: 'Schmelzofen', stufen: [0, 1, 2, 3, 4], bonus: [0, 0.06, 0.14, 0.22, 0.32] },
  schneidrad: { name: 'Schneidrad', stufen: [0, 1, 2, 3, 4], bonus: [0, 0.05, 0.11, 0.19, 0.28] },
  werkstatt: { name: 'Werkstatt', stufen: [0, 1, 2, 3, 4], bonus: [0, 0.08, 0.16, 0.25, 0.35] },
};

const GLASER_EVENTS = [
  { text: '✨ Das Glas schimmert in allen Farben des Regenbogens!', qualMulti: 1.8, geldMulti: 1.0 },
  { text: '💰 Ein Adeliger bestellt eine Extrakopie für doppelten Preis!', qualMulti: 1.0, geldMulti: 2.0 },
  { text: '🔥 Der Schmelzofen brennt besonders heiss — perfektes Glas!', qualMulti: 1.6, geldMulti: 1.2 },
  { text: '💨 Ein falscher Atemstoss — kleiner Riss im Glas.', qualMulti: 0.6, geldMulti: 1.0 },
  { text: '🌟 Ein Lichtstrahl bricht sich im Glas wie ein Stern!', qualMulti: 1.5, geldMulti: 1.5 },
  { text: '🧊 Das Glas kuehlte zu schnell ab — leichte Spannungsrisse.', qualMulti: 0.7, geldMulti: 0.9 },
  { text: '🎨 Dein Meisterwerk zieht Bewunderer aus der ganzen Stadt!', qualMulti: 1.3, geldMulti: 1.8 },
];

const cooldowns = new Map();

function ensureGlaserTable() {
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS glaser (
      userId TEXT PRIMARY KEY,
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      geld INTEGER DEFAULT 0,
      sand TEXT DEFAULT 'Quarzsand',
      sandMenge INTEGER DEFAULT 0,
      technik TEXT DEFAULT 'Mundblasen',
      blasrohr INTEGER DEFAULT 0,
      schmelzofen INTEGER DEFAULT 0,
      schneidrad INTEGER DEFAULT 0,
      werkstatt INTEGER DEFAULT 0,
      glasProduced INTEGER DEFAULT 0,
      auftraege INTEGER DEFAULT 0,
      duelle INTEGER DEFAULT 0,
      duelleGewonnen INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS glaser_ausstellung (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT,
      produkt TEXT,
      qualitaet TEXT,
      wert INTEGER,
      hergestelltAm TEXT
    );
  `);
}

function getGlaser(uId) {
  let row = db.db.prepare('SELECT * FROM glaser WHERE userId = ?').get(uId);
  if (!row) {
    db.db.prepare('INSERT INTO glaser (userId) VALUES (?)').run(uId);
    row = db.db.prepare('SELECT * FROM glaser WHERE userId = ?').get(uId);
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
    db.db.prepare('UPDATE glaser SET level = ?, xp = ? WHERE userId = ?').run(lvl, obj.xp, uId);
  }
  return { lvl, ups };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('glaser')
    .setDescription('Arbeite als Glaser und stelle edles Glas her')
    .addSubcommand(s => s.setName('start').setDescription('Beginne deine Glaserkarriere'))
    .addSubcommand(s => s.setName('status').setDescription('Zeige dein Glaserstatus'))
    .addSubcommand(s => s.setName('sande').setDescription('Liste alle Sandarten auf'))
    .addSubcommand(s => s.setName('kaufen').setDescription('Kaufe Sand')
      .addStringOption(o => o.setName('sand').setDescription('Welchen Sand?').setRequired(true))
      .addIntegerOption(o => o.setName('menge').setDescription('Wie viel?').setRequired(true).setMinValue(1)))
    .addSubcommand(s => s.setName('blasen').setDescription('Blase ein Glasprodukt')
      .addStringOption(o => o.setName('produkt').setDescription('Was herstellen?').setRequired(true))
      .addStringOption(o => o.setName('technik').setDescription('Welche Technik?').setRequired(true)))
    .addSubcommand(s => s.setName('training').setDescription('Trainiere deine Glasfertigkeiten'))
    .addSubcommand(s => s.setName('upgrade').setDescription('Verbessere deine Ausruestung')
      .addStringOption(o => o.setName('slot').setDescription('Was upgraden?').setRequired(true)
        .addChoices(
          { name: 'Blasrohr', value: 'blasrohr' },
          { name: 'Schmelzofen', value: 'schmelzofen' },
          { name: 'Schneidrad', value: 'schneidrad' },
          { name: 'Werkstatt', value: 'werkstatt' }
        )))
    .addSubcommand(s => s.setName('ausstellung').setDescription('Zeige deine Glasausstellung'))
    .addSubcommand(s => s.setName('auftrag').setDescription('Nimm einen Glasauftrag an'))
    .addSubcommand(s => s.setName('duell').setDescription('Fordere einen anderen Glaser heraus')
      .addUserOption(o => o.setName('gegner').setDescription('Wen herausfordern?').setRequired(true))),

  async execute(interaction) {
    const config = require('../config.json');
    ensureGlaserTable();
    const uId = interaction.user.id;
    const sub = interaction.options.getSubcommand();

    if (sub === 'start') {
      const existing = db.db.prepare('SELECT userId FROM glaser WHERE userId = ?').get(uId);
      if (existing) {
        return interaction.reply({ content: '⚗️ Du bist bereits Glaser!', ephemeral: true });
      }
      db.db.prepare('INSERT INTO glaser (userId) VALUES (?)').run(uId);
      const embed = new EmbedBuilder()
        .setColor(0x87CEEB)
        .setTitle('⚗️ Willkommen in der Glashuette!')
        .setDescription('Du hast deine Karriere als Glaser begonnen.\nBlasen, Formen, Schleifen — die Kunst des Glases wartet auf dich!')
        .addFields(
          { name: 'Startmaterial', value: 'Quarzsand', inline: true },
          { name: 'Technik', value: 'Mundblasen', inline: true }
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'status') {
      const g = getGlaser(uId);
      const xpNeeded = xpForLevel(g.level);
      const upBonus = (UPGRADES.blasrohr.bonus[g.blasrohr] + UPGRADES.schmelzofen.bonus[g.schmelzofen] +
        UPGRADES.schneidrad.bonus[g.schneidrad] + UPGRADES.werkstatt.bonus[g.werkstatt]);
      const embed = new EmbedBuilder()
        .setColor(0x87CEEB)
        .setTitle(`⚗️ Glaser-Status von ${interaction.user.username}`)
        .addFields(
          { name: 'Level', value: `${g.level}`, inline: true },
          { name: 'XP', value: `${g.xp}/${xpNeeded}`, inline: true },
          { name: 'Geld', value: `${g.geld} Taler`, inline: true },
          { name: 'Sand', value: `${g.sand} (${g.sandMenge} Einh.)`, inline: true },
          { name: 'Technik', value: g.technik, inline: true },
          { name: 'Upgrade-Bonus', value: `+${(upBonus * 100).toFixed(0)}%`, inline: true },
          { name: 'Glas hergestellt', value: `${g.glasProduced}`, inline: true },
          { name: 'Auftraege', value: `${g.auftraege}`, inline: true },
          { name: 'Duelle', value: `${g.duelleGewonnen}/${g.duelle}`, inline: true }
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'sande') {
      const embed = new EmbedBuilder()
        .setColor(0x87CEEB)
        .setTitle('⚗️ Verfuegbare Sandarten')
        .setDescription(SANDE.map(s =>
          `${s.emoji} **${s.name}** — ${s.preis} Taler | Qualität x${s.qualitaet}`
        ).join('\n'));
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'kaufen') {
      const g = getGlaser(uId);
      const sandName = interaction.options.getString('sand');
      const menge = interaction.options.getInteger('menge');
      const sand = SANDE.find(s => s.name.toLowerCase() === sandName.toLowerCase());
      if (!sand) return interaction.reply({ content: '❌ Unbekannte Sandart!', ephemeral: true });
      const kosten = sand.preis * menge;
      if (g.geld < kosten) return interaction.reply({ content: `❌ Nicht genug Taler! Benötigt: ${kosten}`, ephemeral: true });
      db.db.prepare('UPDATE glaser SET geld = geld - ?, sand = ?, sandMenge = sandMenge + ? WHERE userId = ?')
        .run(kosten, sand.name, menge, uId);
      return interaction.reply({ content: `✅ Du kauftest ${menge}x ${sand.emoji} ${sand.name} für ${kosten} Taler.` });
    }

    if (sub === 'blasen') {
      const now = Date.now();
      const cd = cooldowns.get(uId + '_blasen') || 0;
      if (now - cd < 30000) {
        const left = ((30000 - (now - cd)) / 1000).toFixed(1);
        return interaction.reply({ content: `⏳ Noch ${left}s warten!`, ephemeral: true });
      }
      const g = getGlaser(uId);
      if (g.sandMenge < 2) return interaction.reply({ content: '❌ Nicht genug Sand! (mind. 2)', ephemeral: true });

      const produktName = interaction.options.getString('produkt');
      const technikName = interaction.options.getString('technik');
      const produkt = PRODUKTE.find(p => p.name.toLowerCase() === produktName.toLowerCase());
      const technik = TECHNIKEN.find(t => t.name.toLowerCase() === technikName.toLowerCase());
      if (!produkt) return interaction.reply({ content: '❌ Unbekanntes Produkt!', ephemeral: true });
      if (!technik) return interaction.reply({ content: '❌ Unbekannte Technik!', ephemeral: true });
      if (g.level < produkt.minLevel) return interaction.reply({ content: `❌ Level ${produkt.minLevel} benötigt!`, ephemeral: true });
      if (g.level < technik.minLevel) return interaction.reply({ content: `❌ Level ${technik.minLevel} für diese Technik benötigt!`, ephemeral: true });

      const sand = SANDE.find(s => s.name === g.sand) || SANDE[0];
      const upBonus = 1 + UPGRADES.blasrohr.bonus[g.blasrohr] + UPGRADES.schmelzofen.bonus[g.schmelzofen] +
        UPGRADES.schneidrad.bonus[g.schneidrad] + UPGRADES.werkstatt.bonus[g.werkstatt];
      const roll = Math.random() * 100 * sand.qualitaet * technik.bonus * upBonus;
      const qual = [...QUALITAETEN].reverse().find(q => roll >= q.minRoll) || QUALITAETEN[0];

      const event = Math.random() < 0.25 ? GLASER_EVENTS[Math.floor(Math.random() * GLASER_EVENTS.length)] : null;
      const eqm = event ? event.qualMulti : 1.0;
      const egm = event ? event.geldMulti : 1.0;

      const wert = Math.floor(produkt.basisWert * qual.multi * sand.qualitaet * technik.bonus * upBonus * eqm * egm);
      const xpGain = Math.floor((produkt.schwierigkeit * 18 + wert / 12) * (event ? 1.1 : 1));

      cooldowns.set(uId + '_blasen', now);
      db.db.prepare('UPDATE glaser SET geld = geld + ?, xp = xp + ?, sandMenge = sandMenge - 2, glasProduced = glasProduced + 1, technik = ? WHERE userId = ?')
        .run(wert, xpGain, technik.name, uId);
      db.db.prepare('INSERT INTO glaser_ausstellung (userId, produkt, qualitaet, wert, hergestelltAm) VALUES (?, ?, ?, ?, ?)')
        .run(uId, produkt.name, qual.name, wert, new Date().toISOString());

      const g2 = getGlaser(uId);
      const { lvl, ups } = checkLevelUp(uId, { level: g2.level, xp: g2.xp });

      const embed = new EmbedBuilder()
        .setColor(0x87CEEB)
        .setTitle('⚗️ Glas geblasen!')
        .setDescription(event ? event.text : '🔥 Du hast erfolgreich geblasen!')
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
      const g = getGlaser(uId);
      const xpGain = Math.floor((8 + g.level * 3) * (1 + Math.random()));
      const geldGain = Math.floor(g.level * 4 * Math.random());
      db.db.prepare('UPDATE glaser SET xp = xp + ?, geld = geld + ? WHERE userId = ?').run(xpGain, geldGain, uId);
      const g2 = getGlaser(uId);
      const { lvl, ups } = checkLevelUp(uId, { level: g2.level, xp: g2.xp });
      return interaction.reply({
        content: `🏋️ Training abgeschlossen! +${xpGain} XP, +${geldGain} Taler${ups > 0 ? ` | ⬆️ Level ${lvl}!` : ''}`,
      });
    }

    if (sub === 'upgrade') {
      const g = getGlaser(uId);
      const slot = interaction.options.getString('slot');
      const upg = UPGRADES[slot];
      const current = g[slot];
      if (current >= 4) return interaction.reply({ content: '❌ Bereits auf maximaler Stufe!', ephemeral: true });
      const kosten = [0, 200, 500, 1100, 2500][current + 1];
      if (g.geld < kosten) return interaction.reply({ content: `❌ Benötigt ${kosten} Taler!`, ephemeral: true });
      db.db.prepare(`UPDATE glaser SET geld = geld - ?, ${slot} = ${slot} + 1 WHERE userId = ?`).run(kosten, uId);
      return interaction.reply({
        content: `✅ **${upg.name}** auf Stufe ${current + 1} verbessert! (+${(upg.bonus[current + 1] * 100).toFixed(0)}% Bonus)`,
      });
    }

    if (sub === 'ausstellung') {
      const rows = db.db.prepare('SELECT * FROM glaser_ausstellung WHERE userId = ? ORDER BY id DESC LIMIT 8').all(uId);
      if (!rows.length) return interaction.reply({ content: '🏛️ Deine Ausstellung ist leer.', ephemeral: true });
      const embed = new EmbedBuilder()
        .setColor(0x87CEEB)
        .setTitle('🏛️ Deine Glasausstellung')
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
      const g = getGlaser(uId);
      const produkt = PRODUKTE[Math.min(Math.floor(Math.random() * 3) + Math.floor(g.level / 5), PRODUKTE.length - 1)];
      const belohnung = Math.floor(produkt.basisWert * (1.5 + Math.random()));
      const xpBonus = Math.floor(produkt.schwierigkeit * 25);
      db.db.prepare('UPDATE glaser SET geld = geld + ?, xp = xp + ?, auftraege = auftraege + 1 WHERE userId = ?')
        .run(belohnung, xpBonus, uId);
      const g2 = getGlaser(uId);
      const { lvl, ups } = checkLevelUp(uId, { level: g2.level, xp: g2.xp });
      return interaction.reply({
        content: `📋 Auftrag erfüllt: **${produkt.name}** — +${belohnung} Taler, +${xpBonus} XP${ups > 0 ? ` | ⬆️ Level ${lvl}!` : ''}`,
      });
    }

    if (sub === 'duell') {
      const gegner = interaction.options.getUser('gegner');
      if (gegner.id === uId) return interaction.reply({ content: '❌ Du kannst nicht gegen dich selbst kämpfen!', ephemeral: true });
      const g = getGlaser(uId);
      const opp = db.db.prepare('SELECT * FROM glaser WHERE userId = ?').get(gegner.id);
      if (!opp) return interaction.reply({ content: '❌ Dein Gegner ist kein Glaser!', ephemeral: true });

      const myScore = g.level * 10 + g.glasProduced * 2 + Math.random() * 40;
      const oppScore = opp.level * 10 + opp.glasProduced * 2 + Math.random() * 40;
      const won = myScore > oppScore;
      const reward = Math.floor(50 + g.level * 15);

      db.db.prepare('UPDATE glaser SET duelle = duelle + 1, duelleGewonnen = duelleGewonnen + ?, geld = geld + ?, xp = xp + ? WHERE userId = ?')
        .run(won ? 1 : 0, won ? reward : 0, won ? 30 : 10, uId);
      db.db.prepare('UPDATE glaser SET duelle = duelle + 1 WHERE userId = ?').run(gegner.id);

      const g2 = getGlaser(uId);
      const { lvl, ups } = checkLevelUp(uId, { level: g2.level, xp: g2.xp });

      const embed = new EmbedBuilder()
        .setColor(won ? 0x00FF00 : 0xFF0000)
        .setTitle(won ? '⚗️ Duell gewonnen!' : '⚗️ Duell verloren!')
        .setDescription(won
          ? `Du hast ${gegner.username} im Glaserduell besiegt!\n+${reward} Taler, +30 XP${ups > 0 ? ` | ⬆️ Level ${lvl}!` : ''}`
          : `${gegner.username} hat dich überlistet. Übe weiter!\n+10 XP Trostpreis`);
      return interaction.reply({ embeds: [embed] });
    }
  },
};
