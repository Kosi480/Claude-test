const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

const METALLE = [
  { name: 'Kupfer', preis: 12, qualitaet: 1.0, emoji: '🟫' },
  { name: 'Silber', preis: 28, qualitaet: 1.4, emoji: '⬜' },
  { name: 'Gold', preis: 60, qualitaet: 1.9, emoji: '🟡' },
  { name: 'Platin', preis: 120, qualitaet: 2.4, emoji: '💿' },
  { name: 'Mithril', preis: 220, qualitaet: 3.0, emoji: '🔵' },
  { name: 'Elfengold', preis: 420, qualitaet: 3.8, emoji: '✨' },
  { name: 'Mondsilber', preis: 800, qualitaet: 4.8, emoji: '🌙' },
  { name: 'Aethermetall', preis: 1500, qualitaet: 6.5, emoji: '🌟' },
];

const SCHMUCK = [
  { name: 'Einfacher Ring', basisWert: 65, schwierigkeit: 1, minLevel: 1 },
  { name: 'Armband', basisWert: 130, schwierigkeit: 2, minLevel: 3 },
  { name: 'Halskette', basisWert: 220, schwierigkeit: 3, minLevel: 5 },
  { name: 'Brosche', basisWert: 340, schwierigkeit: 4, minLevel: 8 },
  { name: 'Diadem', basisWert: 520, schwierigkeit: 5, minLevel: 12 },
  { name: 'Krone', basisWert: 800, schwierigkeit: 6, minLevel: 16 },
  { name: 'Zepter', basisWert: 1200, schwierigkeit: 7, minLevel: 21 },
  { name: 'Legendaeres Aetherjuwel', basisWert: 1850, schwierigkeit: 8, minLevel: 28 },
];

const TECHNIKEN = [
  { name: 'Haemmern', bonus: 1.0, minLevel: 1 },
  { name: 'Filigranarbeit', bonus: 1.25, minLevel: 3 },
  { name: 'Granulation', bonus: 1.55, minLevel: 5 },
  { name: 'Emaillieren', bonus: 1.9, minLevel: 8 },
  { name: 'Niellieren', bonus: 2.35, minLevel: 12 },
  { name: 'Vergolden', bonus: 2.9, minLevel: 16 },
  { name: 'Elfenschliff', bonus: 3.7, minLevel: 21 },
  { name: 'Aetherformung', bonus: 5.2, minLevel: 28 },
];

const QUALITAETEN = [
  { name: 'Verbeult', multi: 0.3, minRoll: 0 },
  { name: 'Grob', multi: 0.55, minRoll: 14 },
  { name: 'Ordentlich', multi: 0.8, minRoll: 30 },
  { name: 'Fein', multi: 1.05, minRoll: 48 },
  { name: 'Edel', multi: 1.45, minRoll: 64 },
  { name: 'Prachtvoll', multi: 2.0, minRoll: 80 },
  { name: 'Meisterhaft', multi: 2.9, minRoll: 92 },
];

const UPGRADES = {
  amboss: { name: 'Amboss', stufen: [0, 1, 2, 3, 4], bonus: [0, 0.06, 0.13, 0.21, 0.31] },
  schmelztiegel: { name: 'Schmelztiegel', stufen: [0, 1, 2, 3, 4], bonus: [0, 0.05, 0.12, 0.20, 0.30] },
  graviernadel: { name: 'Graviernadel', stufen: [0, 1, 2, 3, 4], bonus: [0, 0.05, 0.11, 0.19, 0.28] },
  werkstatt: { name: 'Werkstatt', stufen: [0, 1, 2, 3, 4], bonus: [0, 0.08, 0.17, 0.26, 0.37] },
};

const GOLDSCHMIED_EVENTS = [
  { text: '✨ Das Metall leuchtet in einer anderen Farbe — ein magisches Stueck!', qualMulti: 1.9, geldMulti: 1.0 },
  { text: '💰 Ein reicher Kaufmann bietet das Dreifache des Preises!', qualMulti: 1.0, geldMulti: 2.2 },
  { text: '🔥 Der Schmelztiegel gluehte perfekt — makelloses Ergebnis!', qualMulti: 1.7, geldMulti: 1.2 },
  { text: '🔨 Der Hammer glitt ab — ein Kratzer im Stueck.', qualMulti: 0.55, geldMulti: 1.0 },
  { text: '👑 Ein Adeliger sah deine Arbeit und bestellte eine Kopie!', qualMulti: 1.4, geldMulti: 1.9 },
  { text: '💎 Ein Edelstein fiel heraus — du musst ihn neu einsetzen.', qualMulti: 0.65, geldMulti: 0.85 },
  { text: '🌟 Deine Filigranarbeit ist das Gespraech der Stadt!', qualMulti: 1.5, geldMulti: 1.6 },
];

const cooldowns = new Map();

function ensureGoldschmiedTable() {
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS goldschmied (
      userId TEXT PRIMARY KEY,
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      geld INTEGER DEFAULT 0,
      metall TEXT DEFAULT 'Kupfer',
      metallMenge INTEGER DEFAULT 0,
      technik TEXT DEFAULT 'Haemmern',
      amboss INTEGER DEFAULT 0,
      schmelztiegel INTEGER DEFAULT 0,
      graviernadel INTEGER DEFAULT 0,
      werkstatt INTEGER DEFAULT 0,
      stueckeGefertigt INTEGER DEFAULT 0,
      auftraege INTEGER DEFAULT 0,
      duelle INTEGER DEFAULT 0,
      duelleGewonnen INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS goldschmied_vitrine (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT,
      produkt TEXT,
      qualitaet TEXT,
      wert INTEGER,
      hergestelltAm TEXT
    );
  `);
}

function getGoldschmied(uId) {
  let row = db.db.prepare('SELECT * FROM goldschmied WHERE userId = ?').get(uId);
  if (!row) {
    db.db.prepare('INSERT INTO goldschmied (userId) VALUES (?)').run(uId);
    row = db.db.prepare('SELECT * FROM goldschmied WHERE userId = ?').get(uId);
  }
  return row;
}

function xpForLevel(l) { return l * l * 52; }

function checkLevelUp(uId, obj) {
  let lvl = obj.level;
  let ups = 0;
  while (obj.xp >= xpForLevel(lvl)) {
    obj.xp -= xpForLevel(lvl);
    lvl++;
    ups++;
  }
  if (ups > 0) {
    db.db.prepare('UPDATE goldschmied SET level = ?, xp = ? WHERE userId = ?').run(lvl, obj.xp, uId);
  }
  return { lvl, ups };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('goldschmied')
    .setDescription('Arbeite als Goldschmied und fertige edlen Schmuck')
    .addSubcommand(s => s.setName('start').setDescription('Beginne deine Goldschmied-Karriere'))
    .addSubcommand(s => s.setName('status').setDescription('Zeige deinen Goldschmied-Status'))
    .addSubcommand(s => s.setName('metalle').setDescription('Liste alle verfuegbaren Metalle auf'))
    .addSubcommand(s => s.setName('kaufen').setDescription('Kaufe Metall')
      .addStringOption(o => o.setName('metall').setDescription('Welches Metall?').setRequired(true))
      .addIntegerOption(o => o.setName('menge').setDescription('Wie viel?').setRequired(true).setMinValue(1)))
    .addSubcommand(s => s.setName('fertigen').setDescription('Fertige ein Schmuckstueck')
      .addStringOption(o => o.setName('produkt').setDescription('Was herstellen?').setRequired(true))
      .addStringOption(o => o.setName('technik').setDescription('Welche Technik?').setRequired(true)))
    .addSubcommand(s => s.setName('training').setDescription('Trainiere deine Goldschmiedekunst'))
    .addSubcommand(s => s.setName('upgrade').setDescription('Verbessere deine Werkzeuge')
      .addStringOption(o => o.setName('slot').setDescription('Was upgraden?').setRequired(true)
        .addChoices(
          { name: 'Amboss', value: 'amboss' },
          { name: 'Schmelztiegel', value: 'schmelztiegel' },
          { name: 'Graviernadel', value: 'graviernadel' },
          { name: 'Werkstatt', value: 'werkstatt' }
        )))
    .addSubcommand(s => s.setName('vitrine').setDescription('Zeige deine Schmuckvitrine'))
    .addSubcommand(s => s.setName('auftrag').setDescription('Nimm einen Schmuckauftrag an'))
    .addSubcommand(s => s.setName('duell').setDescription('Fordere einen anderen Goldschmied heraus')
      .addUserOption(o => o.setName('gegner').setDescription('Wen herausfordern?').setRequired(true))),

  async execute(interaction) {
    const config = require('../config.json');
    ensureGoldschmiedTable();
    const uId = interaction.user.id;
    const sub = interaction.options.getSubcommand();

    if (sub === 'start') {
      const existing = db.db.prepare('SELECT userId FROM goldschmied WHERE userId = ?').get(uId);
      if (existing) {
        return interaction.reply({ content: '💍 Du bist bereits Goldschmied!', ephemeral: true });
      }
      db.db.prepare('INSERT INTO goldschmied (userId) VALUES (?)').run(uId);
      const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('💍 Willkommen in der Goldschmiede!')
        .setDescription('Deine Laufbahn als Goldschmied beginnt.\nHaemmern, Formen, Veredeln — erschaffe Schmuck fuer die Ewigkeit!')
        .addFields(
          { name: 'Startmetall', value: 'Kupfer', inline: true },
          { name: 'Technik', value: 'Haemmern', inline: true }
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'status') {
      const g = getGoldschmied(uId);
      const xpNeeded = xpForLevel(g.level);
      const upBonus = UPGRADES.amboss.bonus[g.amboss] + UPGRADES.schmelztiegel.bonus[g.schmelztiegel] +
        UPGRADES.graviernadel.bonus[g.graviernadel] + UPGRADES.werkstatt.bonus[g.werkstatt];
      const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle(`💍 Goldschmied-Status von ${interaction.user.username}`)
        .addFields(
          { name: 'Level', value: `${g.level}`, inline: true },
          { name: 'XP', value: `${g.xp}/${xpNeeded}`, inline: true },
          { name: 'Geld', value: `${g.geld} Taler`, inline: true },
          { name: 'Metall', value: `${g.metall} (${g.metallMenge} Einh.)`, inline: true },
          { name: 'Technik', value: g.technik, inline: true },
          { name: 'Upgrade-Bonus', value: `+${(upBonus * 100).toFixed(0)}%`, inline: true },
          { name: 'Stuecke gefertigt', value: `${g.stueckeGefertigt}`, inline: true },
          { name: 'Auftraege', value: `${g.auftraege}`, inline: true },
          { name: 'Duelle', value: `${g.duelleGewonnen}/${g.duelle}`, inline: true }
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'metalle') {
      const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('⚒️ Verfuegbare Metalle')
        .setDescription(METALLE.map(m =>
          `${m.emoji} **${m.name}** — ${m.preis} Taler | Qualität x${m.qualitaet}`
        ).join('\n'));
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'kaufen') {
      const g = getGoldschmied(uId);
      const metallName = interaction.options.getString('metall');
      const menge = interaction.options.getInteger('menge');
      const metall = METALLE.find(m => m.name.toLowerCase() === metallName.toLowerCase());
      if (!metall) return interaction.reply({ content: '❌ Unbekanntes Metall!', ephemeral: true });
      const kosten = metall.preis * menge;
      if (g.geld < kosten) return interaction.reply({ content: `❌ Nicht genug Taler! Benötigt: ${kosten}`, ephemeral: true });
      db.db.prepare('UPDATE goldschmied SET geld = geld - ?, metall = ?, metallMenge = metallMenge + ? WHERE userId = ?')
        .run(kosten, metall.name, menge, uId);
      return interaction.reply({ content: `✅ ${menge}x ${metall.emoji} ${metall.name} für ${kosten} Taler gekauft.` });
    }

    if (sub === 'fertigen') {
      const now = Date.now();
      const cd = cooldowns.get(uId + '_fertigen') || 0;
      if (now - cd < 30000) {
        const left = ((30000 - (now - cd)) / 1000).toFixed(1);
        return interaction.reply({ content: `⏳ Noch ${left}s warten!`, ephemeral: true });
      }
      const g = getGoldschmied(uId);
      if (g.metallMenge < 2) return interaction.reply({ content: '❌ Nicht genug Metall! (mind. 2)', ephemeral: true });

      const produktName = interaction.options.getString('produkt');
      const technikName = interaction.options.getString('technik');
      const produkt = SCHMUCK.find(p => p.name.toLowerCase() === produktName.toLowerCase());
      const technik = TECHNIKEN.find(t => t.name.toLowerCase() === technikName.toLowerCase());
      if (!produkt) return interaction.reply({ content: '❌ Unbekanntes Schmuckstueck!', ephemeral: true });
      if (!technik) return interaction.reply({ content: '❌ Unbekannte Technik!', ephemeral: true });
      if (g.level < produkt.minLevel) return interaction.reply({ content: `❌ Level ${produkt.minLevel} benötigt!`, ephemeral: true });
      if (g.level < technik.minLevel) return interaction.reply({ content: `❌ Level ${technik.minLevel} für diese Technik benötigt!`, ephemeral: true });

      const metall = METALLE.find(m => m.name === g.metall) || METALLE[0];
      const upBonus = 1 + UPGRADES.amboss.bonus[g.amboss] + UPGRADES.schmelztiegel.bonus[g.schmelztiegel] +
        UPGRADES.graviernadel.bonus[g.graviernadel] + UPGRADES.werkstatt.bonus[g.werkstatt];
      const roll = Math.random() * 100 * metall.qualitaet * technik.bonus * upBonus;
      const qual = [...QUALITAETEN].reverse().find(q => roll >= q.minRoll) || QUALITAETEN[0];

      const event = Math.random() < 0.25 ? GOLDSCHMIED_EVENTS[Math.floor(Math.random() * GOLDSCHMIED_EVENTS.length)] : null;
      const eqm = event ? event.qualMulti : 1.0;
      const egm = event ? event.geldMulti : 1.0;

      const wert = Math.floor(produkt.basisWert * qual.multi * metall.qualitaet * technik.bonus * upBonus * eqm * egm);
      const xpGain = Math.floor((produkt.schwierigkeit * 20 + wert / 11) * (event ? 1.1 : 1));

      cooldowns.set(uId + '_fertigen', now);
      db.db.prepare('UPDATE goldschmied SET geld = geld + ?, xp = xp + ?, metallMenge = metallMenge - 2, stueckeGefertigt = stueckeGefertigt + 1, technik = ? WHERE userId = ?')
        .run(wert, xpGain, technik.name, uId);
      db.db.prepare('INSERT INTO goldschmied_vitrine (userId, produkt, qualitaet, wert, hergestelltAm) VALUES (?, ?, ?, ?, ?)')
        .run(uId, produkt.name, qual.name, wert, new Date().toISOString());

      const g2 = getGoldschmied(uId);
      const { lvl, ups } = checkLevelUp(uId, { level: g2.level, xp: g2.xp });

      const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('💍 Schmuckstueck gefertigt!')
        .setDescription(event ? event.text : '⚒️ Du hast meisterhaft gearbeitet!')
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
      const g = getGoldschmied(uId);
      const xpGain = Math.floor((9 + g.level * 3) * (1 + Math.random()));
      const geldGain = Math.floor(g.level * 5 * Math.random());
      db.db.prepare('UPDATE goldschmied SET xp = xp + ?, geld = geld + ? WHERE userId = ?').run(xpGain, geldGain, uId);
      const g2 = getGoldschmied(uId);
      const { lvl, ups } = checkLevelUp(uId, { level: g2.level, xp: g2.xp });
      return interaction.reply({
        content: `🏋️ Training abgeschlossen! +${xpGain} XP, +${geldGain} Taler${ups > 0 ? ` | ⬆️ Level ${lvl}!` : ''}`,
      });
    }

    if (sub === 'upgrade') {
      const g = getGoldschmied(uId);
      const slot = interaction.options.getString('slot');
      const upg = UPGRADES[slot];
      const current = g[slot];
      if (current >= 4) return interaction.reply({ content: '❌ Bereits auf maximaler Stufe!', ephemeral: true });
      const kosten = [0, 250, 600, 1300, 2800][current + 1];
      if (g.geld < kosten) return interaction.reply({ content: `❌ Benötigt ${kosten} Taler!`, ephemeral: true });
      db.db.prepare(`UPDATE goldschmied SET geld = geld - ?, ${slot} = ${slot} + 1 WHERE userId = ?`).run(kosten, uId);
      return interaction.reply({
        content: `✅ **${upg.name}** auf Stufe ${current + 1} verbessert! (+${(upg.bonus[current + 1] * 100).toFixed(0)}% Bonus)`,
      });
    }

    if (sub === 'vitrine') {
      const rows = db.db.prepare('SELECT * FROM goldschmied_vitrine WHERE userId = ? ORDER BY id DESC LIMIT 8').all(uId);
      if (!rows.length) return interaction.reply({ content: '💍 Deine Vitrine ist noch leer.', ephemeral: true });
      const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('💍 Deine Schmuckvitrine')
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
      const g = getGoldschmied(uId);
      const produkt = SCHMUCK[Math.min(Math.floor(Math.random() * 3) + Math.floor(g.level / 5), SCHMUCK.length - 1)];
      const belohnung = Math.floor(produkt.basisWert * (1.6 + Math.random()));
      const xpBonus = Math.floor(produkt.schwierigkeit * 28);
      db.db.prepare('UPDATE goldschmied SET geld = geld + ?, xp = xp + ?, auftraege = auftraege + 1 WHERE userId = ?')
        .run(belohnung, xpBonus, uId);
      const g2 = getGoldschmied(uId);
      const { lvl, ups } = checkLevelUp(uId, { level: g2.level, xp: g2.xp });
      return interaction.reply({
        content: `📋 Auftrag erfüllt: **${produkt.name}** — +${belohnung} Taler, +${xpBonus} XP${ups > 0 ? ` | ⬆️ Level ${lvl}!` : ''}`,
      });
    }

    if (sub === 'duell') {
      const gegner = interaction.options.getUser('gegner');
      if (gegner.id === uId) return interaction.reply({ content: '❌ Du kannst nicht gegen dich selbst kämpfen!', ephemeral: true });
      const g = getGoldschmied(uId);
      const opp = db.db.prepare('SELECT * FROM goldschmied WHERE userId = ?').get(gegner.id);
      if (!opp) return interaction.reply({ content: '❌ Dein Gegner ist kein Goldschmied!', ephemeral: true });

      const myScore = g.level * 12 + g.stueckeGefertigt * 2 + Math.random() * 40;
      const oppScore = opp.level * 12 + opp.stueckeGefertigt * 2 + Math.random() * 40;
      const won = myScore > oppScore;
      const reward = Math.floor(60 + g.level * 18);

      db.db.prepare('UPDATE goldschmied SET duelle = duelle + 1, duelleGewonnen = duelleGewonnen + ?, geld = geld + ?, xp = xp + ? WHERE userId = ?')
        .run(won ? 1 : 0, won ? reward : 0, won ? 35 : 12, uId);
      db.db.prepare('UPDATE goldschmied SET duelle = duelle + 1 WHERE userId = ?').run(gegner.id);

      const g2 = getGoldschmied(uId);
      const { lvl, ups } = checkLevelUp(uId, { level: g2.level, xp: g2.xp });

      const embed = new EmbedBuilder()
        .setColor(won ? 0x00FF00 : 0xFF0000)
        .setTitle(won ? '💍 Duell gewonnen!' : '💍 Duell verloren!')
        .setDescription(won
          ? `Du hast ${gegner.username} im Goldschmiededuell besiegt!\n+${reward} Taler, +35 XP${ups > 0 ? ` | ⬆️ Level ${lvl}!` : ''}`
          : `${gegner.username} hat dich überlistet. Uebe weiter!\n+12 XP Trostpreis`);
      return interaction.reply({ embeds: [embed] });
    }
  },
};
