const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

const METALLE = [
  { name: 'Roheisen', preis: 10, qualitaet: 1.0, emoji: '🔩' },
  { name: 'Schmiedeeisen', preis: 22, qualitaet: 1.35, emoji: '⚙️' },
  { name: 'Stahl', preis: 45, qualitaet: 1.75, emoji: '🔧' },
  { name: 'Damaszener Stahl', preis: 90, qualitaet: 2.2, emoji: '⚔️' },
  { name: 'Mithrilstahl', preis: 170, qualitaet: 2.8, emoji: '🔵' },
  { name: 'Elfenstahl', preis: 330, qualitaet: 3.6, emoji: '✨' },
  { name: 'Mondstahl', preis: 640, qualitaet: 4.6, emoji: '🌙' },
  { name: 'Aethermetall', preis: 1200, qualitaet: 6.2, emoji: '🌟' },
];

const PRODUKTE = [
  { name: 'Einfaches Hufeisen', basisWert: 45, schwierigkeit: 1, minLevel: 1 },
  { name: 'Beschlag', basisWert: 100, schwierigkeit: 2, minLevel: 3 },
  { name: 'Rennhufeisen', basisWert: 180, schwierigkeit: 3, minLevel: 5 },
  { name: 'Kriegshufeisen', basisWert: 280, schwierigkeit: 4, minLevel: 8 },
  { name: 'Gepanzerter Huf', basisWert: 430, schwierigkeit: 5, minLevel: 12 },
  { name: 'Ritterhufeisen', basisWert: 660, schwierigkeit: 6, minLevel: 16 },
  { name: 'Koenigliches Hufeisen', basisWert: 990, schwierigkeit: 7, minLevel: 21 },
  { name: 'Legendaeres Aetherhufeisen', basisWert: 1500, schwierigkeit: 8, minLevel: 28 },
];

const TECHNIKEN = [
  { name: 'Kaltschmieden', bonus: 1.0, minLevel: 1 },
  { name: 'Warmschmieden', bonus: 1.25, minLevel: 3 },
  { name: 'Haertung', bonus: 1.55, minLevel: 5 },
  { name: 'Anlassen', bonus: 1.9, minLevel: 8 },
  { name: 'Damaszenierung', bonus: 2.35, minLevel: 12 },
  { name: 'Runenhaemmern', bonus: 2.9, minLevel: 16 },
  { name: 'Elfenschmiedekunst', bonus: 3.7, minLevel: 21 },
  { name: 'Aetherformung', bonus: 5.2, minLevel: 28 },
];

const QUALITAETEN = [
  { name: 'Verbogen', multi: 0.3, minRoll: 0 },
  { name: 'Grob', multi: 0.55, minRoll: 14 },
  { name: 'Solide', multi: 0.8, minRoll: 29 },
  { name: 'Gut', multi: 1.05, minRoll: 48 },
  { name: 'Praezise', multi: 1.45, minRoll: 64 },
  { name: 'Meisterlich', multi: 2.0, minRoll: 80 },
  { name: 'Meisterhaft', multi: 2.9, minRoll: 92 },
];

const UPGRADES = {
  amboss: { name: 'Amboss', stufen: [0, 1, 2, 3, 4], bonus: [0, 0.06, 0.13, 0.21, 0.31] },
  esse: { name: 'Esse', stufen: [0, 1, 2, 3, 4], bonus: [0, 0.05, 0.12, 0.20, 0.29] },
  hammer: { name: 'Schmiedehammer', stufen: [0, 1, 2, 3, 4], bonus: [0, 0.05, 0.11, 0.19, 0.28] },
  werkstatt: { name: 'Werkstatt', stufen: [0, 1, 2, 3, 4], bonus: [0, 0.08, 0.16, 0.25, 0.36] },
};

const HUFSCHMIED_EVENTS = [
  { text: '🔥 Das Eisen gluehte perfekt — ein makelloses Hufeisen entstand!', qualMulti: 1.9, geldMulti: 1.0 },
  { text: '🐴 Der Stallmeister des Koenigs bestellt eine ganze Ladung!', qualMulti: 1.0, geldMulti: 2.3 },
  { text: '⚒️ Dein Hammer traf jeden Schlag mit perfekter Kraft!', qualMulti: 1.7, geldMulti: 1.2 },
  { text: '💨 Die Esse wurde zu kuehl — das Metall haertete falsch.', qualMulti: 0.55, geldMulti: 1.0 },
  { text: '🏆 Ein Turnierpferd braucht deine besten Hufeisen!', qualMulti: 1.5, geldMulti: 1.9 },
  { text: '🔨 Der Amboss sprang — ein kleiner Riss im Hufeisen.', qualMulti: 0.65, geldMulti: 0.9 },
  { text: '🌟 Deine Schmiedekunst wird in der ganzen Stadt gelobt!', qualMulti: 1.4, geldMulti: 1.7 },
];

const cooldowns = new Map();

function ensureHufschmiedTable() {
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS hufschmied (
      userId TEXT PRIMARY KEY,
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      geld INTEGER DEFAULT 0,
      metall TEXT DEFAULT 'Roheisen',
      metallMenge INTEGER DEFAULT 0,
      technik TEXT DEFAULT 'Kaltschmieden',
      amboss INTEGER DEFAULT 0,
      esse INTEGER DEFAULT 0,
      hammer INTEGER DEFAULT 0,
      werkstatt INTEGER DEFAULT 0,
      hufeisGeschmiedet INTEGER DEFAULT 0,
      auftraege INTEGER DEFAULT 0,
      duelle INTEGER DEFAULT 0,
      duelleGewonnen INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS hufschmied_lager (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT,
      produkt TEXT,
      qualitaet TEXT,
      wert INTEGER,
      hergestelltAm TEXT
    );
  `);
}

function getHufschmied(uId) {
  let row = db.db.prepare('SELECT * FROM hufschmied WHERE userId = ?').get(uId);
  if (!row) {
    db.db.prepare('INSERT INTO hufschmied (userId) VALUES (?)').run(uId);
    row = db.db.prepare('SELECT * FROM hufschmied WHERE userId = ?').get(uId);
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
    db.db.prepare('UPDATE hufschmied SET level = ?, xp = ? WHERE userId = ?').run(lvl, obj.xp, uId);
  }
  return { lvl, ups };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hufschmied')
    .setDescription('Arbeite als Hufschmied und schmiede Hufeisen fuer edle Rosse')
    .addSubcommand(s => s.setName('start').setDescription('Beginne deine Hufschmied-Karriere'))
    .addSubcommand(s => s.setName('status').setDescription('Zeige deinen Hufschmied-Status'))
    .addSubcommand(s => s.setName('metalle').setDescription('Liste alle Metalle auf'))
    .addSubcommand(s => s.setName('kaufen').setDescription('Kaufe Metall')
      .addStringOption(o => o.setName('metall').setDescription('Welches Metall?').setRequired(true))
      .addIntegerOption(o => o.setName('menge').setDescription('Wie viel?').setRequired(true).setMinValue(1)))
    .addSubcommand(s => s.setName('schmieden').setDescription('Schmiede ein Hufeisen')
      .addStringOption(o => o.setName('produkt').setDescription('Was schmieden?').setRequired(true))
      .addStringOption(o => o.setName('technik').setDescription('Welche Technik?').setRequired(true)))
    .addSubcommand(s => s.setName('training').setDescription('Trainiere deine Schmiedekunst'))
    .addSubcommand(s => s.setName('upgrade').setDescription('Verbessere deine Ausruestung')
      .addStringOption(o => o.setName('slot').setDescription('Was upgraden?').setRequired(true)
        .addChoices(
          { name: 'Amboss', value: 'amboss' },
          { name: 'Esse', value: 'esse' },
          { name: 'Schmiedehammer', value: 'hammer' },
          { name: 'Werkstatt', value: 'werkstatt' }
        )))
    .addSubcommand(s => s.setName('lager').setDescription('Zeige dein Hufeisenlager'))
    .addSubcommand(s => s.setName('auftrag').setDescription('Nimm einen Schmiedauftrag an'))
    .addSubcommand(s => s.setName('duell').setDescription('Fordere einen anderen Hufschmied heraus')
      .addUserOption(o => o.setName('gegner').setDescription('Wen herausfordern?').setRequired(true))),

  async execute(interaction) {
    const config = require('../config.json');
    ensureHufschmiedTable();
    const uId = interaction.user.id;
    const sub = interaction.options.getSubcommand();

    if (sub === 'start') {
      const existing = db.db.prepare('SELECT userId FROM hufschmied WHERE userId = ?').get(uId);
      if (existing) {
        return interaction.reply({ content: '🐴 Du bist bereits Hufschmied!', ephemeral: true });
      }
      db.db.prepare('INSERT INTO hufschmied (userId) VALUES (?)').run(uId);
      const embed = new EmbedBuilder()
        .setColor(0x8B4513)
        .setTitle('🐴 Willkommen in der Hufschmiede!')
        .setDescription('Deine Karriere als Hufschmied beginnt.\nHaemmere Eisen fuer die edelsten Rosse des Koenigreichs!')
        .addFields(
          { name: 'Startmetall', value: 'Roheisen', inline: true },
          { name: 'Technik', value: 'Kaltschmieden', inline: true }
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'status') {
      const h = getHufschmied(uId);
      const xpNeeded = xpForLevel(h.level);
      const upBonus = UPGRADES.amboss.bonus[h.amboss] + UPGRADES.esse.bonus[h.esse] +
        UPGRADES.hammer.bonus[h.hammer] + UPGRADES.werkstatt.bonus[h.werkstatt];
      const embed = new EmbedBuilder()
        .setColor(0x8B4513)
        .setTitle(`🐴 Hufschmied-Status von ${interaction.user.username}`)
        .addFields(
          { name: 'Level', value: `${h.level}`, inline: true },
          { name: 'XP', value: `${h.xp}/${xpNeeded}`, inline: true },
          { name: 'Geld', value: `${h.geld} Taler`, inline: true },
          { name: 'Metall', value: `${h.metall} (${h.metallMenge} Einh.)`, inline: true },
          { name: 'Technik', value: h.technik, inline: true },
          { name: 'Upgrade-Bonus', value: `+${(upBonus * 100).toFixed(0)}%`, inline: true },
          { name: 'Hufeisen geschmiedet', value: `${h.hufeisGeschmiedet}`, inline: true },
          { name: 'Auftraege', value: `${h.auftraege}`, inline: true },
          { name: 'Duelle', value: `${h.duelleGewonnen}/${h.duelle}`, inline: true }
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'metalle') {
      const embed = new EmbedBuilder()
        .setColor(0x8B4513)
        .setTitle('⚒️ Verfuegbare Metalle')
        .setDescription(METALLE.map(m =>
          `${m.emoji} **${m.name}** — ${m.preis} Taler | Qualität x${m.qualitaet}`
        ).join('\n'));
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'kaufen') {
      const h = getHufschmied(uId);
      const metallName = interaction.options.getString('metall');
      const menge = interaction.options.getInteger('menge');
      const metall = METALLE.find(m => m.name.toLowerCase() === metallName.toLowerCase());
      if (!metall) return interaction.reply({ content: '❌ Unbekanntes Metall!', ephemeral: true });
      const kosten = metall.preis * menge;
      if (h.geld < kosten) return interaction.reply({ content: `❌ Nicht genug Taler! Benötigt: ${kosten}`, ephemeral: true });
      db.db.prepare('UPDATE hufschmied SET geld = geld - ?, metall = ?, metallMenge = metallMenge + ? WHERE userId = ?')
        .run(kosten, metall.name, menge, uId);
      return interaction.reply({ content: `✅ ${menge}x ${metall.emoji} ${metall.name} für ${kosten} Taler gekauft.` });
    }

    if (sub === 'schmieden') {
      const now = Date.now();
      const cd = cooldowns.get(uId + '_schmieden') || 0;
      if (now - cd < 30000) {
        const left = ((30000 - (now - cd)) / 1000).toFixed(1);
        return interaction.reply({ content: `⏳ Noch ${left}s warten!`, ephemeral: true });
      }
      const h = getHufschmied(uId);
      if (h.metallMenge < 2) return interaction.reply({ content: '❌ Nicht genug Metall! (mind. 2)', ephemeral: true });

      const produktName = interaction.options.getString('produkt');
      const technikName = interaction.options.getString('technik');
      const produkt = PRODUKTE.find(p => p.name.toLowerCase() === produktName.toLowerCase());
      const technik = TECHNIKEN.find(t => t.name.toLowerCase() === technikName.toLowerCase());
      if (!produkt) return interaction.reply({ content: '❌ Unbekanntes Produkt!', ephemeral: true });
      if (!technik) return interaction.reply({ content: '❌ Unbekannte Technik!', ephemeral: true });
      if (h.level < produkt.minLevel) return interaction.reply({ content: `❌ Level ${produkt.minLevel} benötigt!`, ephemeral: true });
      if (h.level < technik.minLevel) return interaction.reply({ content: `❌ Level ${technik.minLevel} für diese Technik benötigt!`, ephemeral: true });

      const metall = METALLE.find(m => m.name === h.metall) || METALLE[0];
      const upBonus = 1 + UPGRADES.amboss.bonus[h.amboss] + UPGRADES.esse.bonus[h.esse] +
        UPGRADES.hammer.bonus[h.hammer] + UPGRADES.werkstatt.bonus[h.werkstatt];
      const roll = Math.random() * 100 * metall.qualitaet * technik.bonus * upBonus;
      const qual = [...QUALITAETEN].reverse().find(q => roll >= q.minRoll) || QUALITAETEN[0];

      const event = Math.random() < 0.25 ? HUFSCHMIED_EVENTS[Math.floor(Math.random() * HUFSCHMIED_EVENTS.length)] : null;
      const eqm = event ? event.qualMulti : 1.0;
      const egm = event ? event.geldMulti : 1.0;

      const wert = Math.floor(produkt.basisWert * qual.multi * metall.qualitaet * technik.bonus * upBonus * eqm * egm);
      const xpGain = Math.floor((produkt.schwierigkeit * 19 + wert / 11) * (event ? 1.1 : 1));

      cooldowns.set(uId + '_schmieden', now);
      db.db.prepare('UPDATE hufschmied SET geld = geld + ?, xp = xp + ?, metallMenge = metallMenge - 2, hufeisGeschmiedet = hufeisGeschmiedet + 1, technik = ? WHERE userId = ?')
        .run(wert, xpGain, technik.name, uId);
      db.db.prepare('INSERT INTO hufschmied_lager (userId, produkt, qualitaet, wert, hergestelltAm) VALUES (?, ?, ?, ?, ?)')
        .run(uId, produkt.name, qual.name, wert, new Date().toISOString());

      const h2 = getHufschmied(uId);
      const { lvl, ups } = checkLevelUp(uId, { level: h2.level, xp: h2.xp });

      const embed = new EmbedBuilder()
        .setColor(0x8B4513)
        .setTitle('⚒️ Hufeisen geschmiedet!')
        .setDescription(event ? event.text : '🔥 Du hast erfolgreich geschmiedet!')
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
      const h = getHufschmied(uId);
      const xpGain = Math.floor((8 + h.level * 3) * (1 + Math.random()));
      const geldGain = Math.floor(h.level * 5 * Math.random());
      db.db.prepare('UPDATE hufschmied SET xp = xp + ?, geld = geld + ? WHERE userId = ?').run(xpGain, geldGain, uId);
      const h2 = getHufschmied(uId);
      const { lvl, ups } = checkLevelUp(uId, { level: h2.level, xp: h2.xp });
      return interaction.reply({
        content: `🏋️ Training abgeschlossen! +${xpGain} XP, +${geldGain} Taler${ups > 0 ? ` | ⬆️ Level ${lvl}!` : ''}`,
      });
    }

    if (sub === 'upgrade') {
      const h = getHufschmied(uId);
      const slot = interaction.options.getString('slot');
      const upg = UPGRADES[slot];
      const current = h[slot];
      if (current >= 4) return interaction.reply({ content: '❌ Bereits auf maximaler Stufe!', ephemeral: true });
      const kosten = [0, 200, 500, 1100, 2500][current + 1];
      if (h.geld < kosten) return interaction.reply({ content: `❌ Benötigt ${kosten} Taler!`, ephemeral: true });
      db.db.prepare(`UPDATE hufschmied SET geld = geld - ?, ${slot} = ${slot} + 1 WHERE userId = ?`).run(kosten, uId);
      return interaction.reply({
        content: `✅ **${upg.name}** auf Stufe ${current + 1} verbessert! (+${(upg.bonus[current + 1] * 100).toFixed(0)}% Bonus)`,
      });
    }

    if (sub === 'lager') {
      const rows = db.db.prepare('SELECT * FROM hufschmied_lager WHERE userId = ? ORDER BY id DESC LIMIT 8').all(uId);
      if (!rows.length) return interaction.reply({ content: '🏚️ Dein Lager ist noch leer.', ephemeral: true });
      const embed = new EmbedBuilder()
        .setColor(0x8B4513)
        .setTitle('🏚️ Dein Hufeisenlager')
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
      const h = getHufschmied(uId);
      const produkt = PRODUKTE[Math.min(Math.floor(Math.random() * 3) + Math.floor(h.level / 5), PRODUKTE.length - 1)];
      const belohnung = Math.floor(produkt.basisWert * (1.55 + Math.random()));
      const xpBonus = Math.floor(produkt.schwierigkeit * 26);
      db.db.prepare('UPDATE hufschmied SET geld = geld + ?, xp = xp + ?, auftraege = auftraege + 1 WHERE userId = ?')
        .run(belohnung, xpBonus, uId);
      const h2 = getHufschmied(uId);
      const { lvl, ups } = checkLevelUp(uId, { level: h2.level, xp: h2.xp });
      return interaction.reply({
        content: `📋 Auftrag erfüllt: **${produkt.name}** — +${belohnung} Taler, +${xpBonus} XP${ups > 0 ? ` | ⬆️ Level ${lvl}!` : ''}`,
      });
    }

    if (sub === 'duell') {
      const gegner = interaction.options.getUser('gegner');
      if (gegner.id === uId) return interaction.reply({ content: '❌ Du kannst nicht gegen dich selbst kämpfen!', ephemeral: true });
      const h = getHufschmied(uId);
      const opp = db.db.prepare('SELECT * FROM hufschmied WHERE userId = ?').get(gegner.id);
      if (!opp) return interaction.reply({ content: '❌ Dein Gegner ist kein Hufschmied!', ephemeral: true });

      const myScore = h.level * 11 + h.hufeisGeschmiedet * 2 + Math.random() * 40;
      const oppScore = opp.level * 11 + opp.hufeisGeschmiedet * 2 + Math.random() * 40;
      const won = myScore > oppScore;
      const reward = Math.floor(55 + h.level * 16);

      db.db.prepare('UPDATE hufschmied SET duelle = duelle + 1, duelleGewonnen = duelleGewonnen + ?, geld = geld + ?, xp = xp + ? WHERE userId = ?')
        .run(won ? 1 : 0, won ? reward : 0, won ? 33 : 11, uId);
      db.db.prepare('UPDATE hufschmied SET duelle = duelle + 1 WHERE userId = ?').run(gegner.id);

      const h2 = getHufschmied(uId);
      const { lvl, ups } = checkLevelUp(uId, { level: h2.level, xp: h2.xp });

      const embed = new EmbedBuilder()
        .setColor(won ? 0x00FF00 : 0xFF0000)
        .setTitle(won ? '⚒️ Duell gewonnen!' : '⚒️ Duell verloren!')
        .setDescription(won
          ? `Deine Hufeisen waren besser als die von ${gegner.username}!\n+${reward} Taler, +33 XP${ups > 0 ? ` | ⬆️ Level ${lvl}!` : ''}`
          : `${gegner.username} hat dich überlistet. Uebe weiter!\n+11 XP Trostpreis`);
      return interaction.reply({ embeds: [embed] });
    }
  },
};
