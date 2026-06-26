const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

const cooldowns = new Map();

function ensureSchmiedTables() {
  db.db.exec(`CREATE TABLE IF NOT EXISTS schmieden (
    user_id TEXT PRIMARY KEY,
    name TEXT DEFAULT 'Kleine Schmiede',
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    ruf INTEGER DEFAULT 0,
    geschmiedet INTEGER DEFAULT 0,
    erz INTEGER DEFAULT 5,
    kohle INTEGER DEFAULT 5,
    stahl INTEGER DEFAULT 0,
    mithril INTEGER DEFAULT 0,
    drachenstahl INTEGER DEFAULT 0,
    edelsteine INTEGER DEFAULT 0,
    kraft INTEGER DEFAULT 1,
    praezision INTEGER DEFAULT 1,
    wissen INTEGER DEFAULT 1,
    ausdauer INTEGER DEFAULT 1,
    upgrade_amboss INTEGER DEFAULT 0,
    upgrade_esse INTEGER DEFAULT 0,
    upgrade_werkzeug INTEGER DEFAULT 0,
    upgrade_haertebecken INTEGER DEFAULT 0
  )`);
  db.db.exec(`CREATE TABLE IF NOT EXISTS schmied_inventar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    typ TEXT,
    name TEXT,
    qualitaet INTEGER,
    staerke INTEGER,
    material TEXT,
    seltenheit TEXT,
    verkaufspreis INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
  )`);
}

const MATERIALIEN = {
  erz: { name: 'Eisenerz', emoji: '�ite', preis: 12 },
  kohle: { name: 'Kohle', emoji: '�ite', preis: 8 },
  stahl: { name: 'Stahl', emoji: '⬜', preis: 30 },
  mithril: { name: 'Mithril', emoji: '💎', preis: 80 },
  drachenstahl: { name: 'Drachenstahl', emoji: '🔥', preis: 200 },
  edelsteine: { name: 'Edelsteine', emoji: '💠', preis: 50 }
};

const REZEPTE = [
  { name: 'Eisendolch', emoji: '🗡️', typ: 'Waffe', mat: { erz: 3, kohle: 2 }, baseStaerke: [10, 25], basePreis: 60, xp: 10, minLevel: 1 },
  { name: 'Eisenschild', emoji: '🛡️', typ: 'Rüstung', mat: { erz: 4, kohle: 3 }, baseStaerke: [15, 30], basePreis: 90, xp: 15, minLevel: 1 },
  { name: 'Stahlschwert', emoji: '⚔️', typ: 'Waffe', mat: { stahl: 3, kohle: 3 }, baseStaerke: [25, 50], basePreis: 150, xp: 25, minLevel: 3 },
  { name: 'Stahlrüstung', emoji: '🛡️', typ: 'Rüstung', mat: { stahl: 5, kohle: 4 }, baseStaerke: [30, 55], basePreis: 200, xp: 30, minLevel: 4 },
  { name: 'Streitaxt', emoji: '🪓', typ: 'Waffe', mat: { stahl: 4, erz: 3, kohle: 3 }, baseStaerke: [35, 65], basePreis: 250, xp: 35, minLevel: 5 },
  { name: 'Kriegshammer', emoji: '🔨', typ: 'Waffe', mat: { stahl: 5, erz: 4, kohle: 4 }, baseStaerke: [40, 75], basePreis: 320, xp: 45, minLevel: 7 },
  { name: 'Mithril-Klinge', emoji: '✨', typ: 'Waffe', mat: { mithril: 4, stahl: 3, kohle: 3 }, baseStaerke: [55, 95], basePreis: 500, xp: 65, minLevel: 9 },
  { name: 'Mithril-Plattenrüstung', emoji: '🛡️', typ: 'Rüstung', mat: { mithril: 6, stahl: 4, kohle: 4 }, baseStaerke: [60, 100], basePreis: 600, xp: 75, minLevel: 11 },
  { name: 'Drachenstahl-Schwert', emoji: '🐉', typ: 'Waffe', mat: { drachenstahl: 4, mithril: 2, kohle: 5 }, baseStaerke: [80, 140], basePreis: 1000, xp: 110, minLevel: 14 },
  { name: 'Juwelen-Krone', emoji: '👑', typ: 'Schmuck', mat: { mithril: 3, edelsteine: 5 }, baseStaerke: [50, 90], basePreis: 800, xp: 90, minLevel: 12 },
  { name: 'Legendäres Schwert', emoji: '⚡', typ: 'Waffe', mat: { drachenstahl: 6, mithril: 4, edelsteine: 3, kohle: 5 }, baseStaerke: [120, 200], basePreis: 2000, xp: 180, minLevel: 17 },
  { name: 'Göttliche Rüstung', emoji: '🌟', typ: 'Rüstung', mat: { drachenstahl: 8, mithril: 5, edelsteine: 4, kohle: 6 }, baseStaerke: [150, 250], basePreis: 3000, xp: 250, minLevel: 20 }
];

const SCHMIEDE_EVENTS = [
  { text: 'Der Stahl glüht perfekt — meisterhafter Schlag!', modifier: 20 },
  { text: 'Die Esse brennt mit optimaler Hitze!', modifier: 15 },
  { text: 'Ein Funke springt — kleine Delle im Werkstück.', modifier: -10 },
  { text: 'Das Metall biegt sich genau wie gewünscht!', modifier: 18 },
  { text: 'Der Amboss vibriert — perfekte Resonanz!', modifier: 25 },
  { text: 'Etwas zu viel Hitze — das Material wird spröde.', modifier: -15 },
  { text: 'Du findest den perfekten Rhythmus beim Hämmern!', modifier: 12 },
  { text: 'Das Härtebecken zischt — perfekte Härtung!', modifier: 22 },
  { text: 'Ein alter Schmiedemeister gibt dir einen Tipp!', modifier: 16 },
  { text: 'Der Blasebalg klemmt kurz...', modifier: -8 }
];

const KUNDEN = [
  { name: 'Dorfbewohner', emoji: '👤', tip: [0, 15], pref: 'Eisendolch' },
  { name: 'Ritter', emoji: '⚔️', tip: [15, 40], pref: 'Stahlschwert' },
  { name: 'Söldner', emoji: '💂', tip: [10, 35], pref: 'Streitaxt' },
  { name: 'Adliger', emoji: '🤴', tip: [20, 60], pref: 'Juwelen-Krone' },
  { name: 'Wache', emoji: '🛡️', tip: [10, 30], pref: 'Stahlrüstung' },
  { name: 'Abenteurer', emoji: '🗺️', tip: [15, 45], pref: null },
  { name: 'König', emoji: '👑', tip: [30, 80], pref: 'Legendäres Schwert', rufBonus: 3 },
  { name: 'Drachenjäger', emoji: '🐉', tip: [25, 70], pref: 'Drachenstahl-Schwert', rufBonus: 2 }
];

const RANKS = [
  { name: 'Schmied-Lehrling', minLevel: 1 },
  { name: 'Geselle', minLevel: 3 },
  { name: 'Schmied', minLevel: 5 },
  { name: 'Waffenschmied', minLevel: 8 },
  { name: 'Meisterschmied', minLevel: 12 },
  { name: 'Runenmeister', minLevel: 16 },
  { name: 'Legendärer Schmied', minLevel: 20 },
  { name: 'Göttlicher Schmied', minLevel: 25 }
];

const UPGRADES = {
  amboss: { name: 'Meister-Amboss', field: 'upgrade_amboss', costs: [400, 1000, 2200, 5000, 10000], desc: '+Qualität beim Schmieden' },
  esse: { name: 'Drachenfeuresse', field: 'upgrade_esse', costs: [500, 1200, 2600, 5500, 11000], desc: '+Materialeffizienz' },
  werkzeug: { name: 'Schmiedewerkzeug', field: 'upgrade_werkzeug', costs: [350, 900, 2000, 4500, 9000], desc: '+XP & Stärke-Bonus' },
  haertebecken: { name: 'Härtebecken', field: 'upgrade_haertebecken', costs: [450, 1100, 2400, 5200, 10500], desc: '+Haltbarkeit & Wert' }
};

function getRank(level) {
  let rank = RANKS[0];
  for (const r of RANKS) { if (level >= r.minLevel) rank = r; }
  return rank;
}

function xpForLevel(level) { return Math.floor(80 * Math.pow(level, 1.5)); }
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function getSeltenheit(qualitaet) {
  if (qualitaet >= 95) return 'Legendär';
  if (qualitaet >= 85) return 'Episch';
  if (qualitaet >= 70) return 'Selten';
  if (qualitaet >= 50) return 'Ungewöhnlich';
  return 'Gewöhnlich';
}

const RARITY_COLORS = {
  'Gewöhnlich': '#9e9e9e', 'Ungewöhnlich': '#4caf50', 'Selten': '#2196f3',
  'Episch': '#9c27b0', 'Legendär': '#ff9800'
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('schmied')
    .setDescription('⚒️ Werde Schmied und schmiede legendäre Waffen und Rüstungen!')
    .addSubcommand(s => s.setName('status').setDescription('Zeige deine Schmiede'))
    .addSubcommand(s => s.setName('umbenennen').setDescription('Benenne deine Schmiede um')
      .addStringOption(o => o.setName('name').setDescription('Neuer Name').setRequired(true)))
    .addSubcommand(s => s.setName('einkaufen').setDescription('Kaufe Materialien')
      .addStringOption(o => o.setName('material').setDescription('erz/kohle/stahl/mithril/drachenstahl/edelsteine').setRequired(true))
      .addIntegerOption(o => o.setName('menge').setDescription('Anzahl').setRequired(true)))
    .addSubcommand(s => s.setName('materialien').setDescription('Zeige deine Materialien'))
    .addSubcommand(s => s.setName('schmieden').setDescription('Schmiede einen Gegenstand')
      .addIntegerOption(o => o.setName('rezept').setDescription('Rezeptnummer (1-12)').setRequired(true)))
    .addSubcommand(s => s.setName('inventar').setDescription('Zeige dein Inventar'))
    .addSubcommand(s => s.setName('verkaufen').setDescription('Verkaufe einen Gegenstand'))
    .addSubcommand(s => s.setName('rezepte').setDescription('Zeige alle Schmiedeanleitungen'))
    .addSubcommand(s => s.setName('trainieren').setDescription('Trainiere eine Fähigkeit')
      .addStringOption(o => o.setName('skill').setDescription('kraft/praezision/wissen/ausdauer').setRequired(true)))
    .addSubcommand(s => s.setName('upgrade').setDescription('Verbessere deine Schmiede')
      .addStringOption(o => o.setName('item').setDescription('amboss/esse/werkzeug/haertebecken').setRequired(true)))
    .addSubcommand(s => s.setName('duell').setDescription('Schmiedewettbewerb')
      .addUserOption(o => o.setName('gegner').setDescription('Dein Gegner').setRequired(true))),

  async execute(interaction) {
    ensureSchmiedTables();
    const config = require('../config.json');
    const userId = interaction.user.id;
    const sub = interaction.options.getSubcommand();

    const now = Date.now();
    const cdKey = `${userId}-${sub}`;
    const cdTime = sub === 'schmieden' ? 25000 : sub === 'verkaufen' ? 15000 : sub === 'duell' ? 60000 : 5000;
    if (cooldowns.has(cdKey) && now - cooldowns.get(cdKey) < cdTime) {
      const left = Math.ceil((cdTime - (now - cooldowns.get(cdKey))) / 1000);
      return interaction.reply({ content: `⏳ Cooldown: **${left}s**`, ephemeral: true });
    }
    cooldowns.set(cdKey, now);

    let schmied = db.db.prepare('SELECT * FROM schmieden WHERE user_id = ?').get(userId);
    if (!schmied && sub !== 'status' && sub !== 'rezepte') {
      db.db.prepare('INSERT INTO schmieden (user_id) VALUES (?)').run(userId);
      schmied = db.db.prepare('SELECT * FROM schmieden WHERE user_id = ?').get(userId);
    }

    if (sub === 'status') {
      if (!schmied) {
        db.db.prepare('INSERT INTO schmieden (user_id) VALUES (?)').run(userId);
        schmied = db.db.prepare('SELECT * FROM schmieden WHERE user_id = ?').get(userId);
      }
      const rank = getRank(schmied.level);
      const xpNeeded = xpForLevel(schmied.level);
      const bal = (db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId))?.balance || 0;
      const invCount = db.db.prepare('SELECT COUNT(*) as c FROM schmied_inventar WHERE user_id = ?').get(userId).c;

      const embed = new EmbedBuilder()
        .setTitle(`⚒️ ${schmied.name}`)
        .setColor('#ff6f00')
        .addFields(
          { name: '📊 Rang', value: `${rank.name} (Lv. ${schmied.level})`, inline: true },
          { name: '⭐ XP', value: `${schmied.xp}/${xpNeeded}`, inline: true },
          { name: '💰 Coins', value: bal.toLocaleString(), inline: true },
          { name: '⚒️ Geschmiedet', value: `${schmied.geschmiedet}`, inline: true },
          { name: '⭐ Ruf', value: `${schmied.ruf}`, inline: true },
          { name: '📦 Inventar', value: `${invCount} Stück`, inline: true },
          { name: '💪 Skills', value: `Kraft: ${schmied.kraft} | Präzision: ${schmied.praezision}\nWissen: ${schmied.wissen} | Ausdauer: ${schmied.ausdauer}`, inline: false },
          { name: '🔧 Ausstattung', value: `Amboss: Lv.${schmied.upgrade_amboss} | Esse: Lv.${schmied.upgrade_esse}\nWerkzeug: Lv.${schmied.upgrade_werkzeug} | Becken: Lv.${schmied.upgrade_haertebecken}`, inline: false }
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'umbenennen') {
      const name = interaction.options.getString('name').substring(0, 32);
      db.db.prepare('UPDATE schmieden SET name = ? WHERE user_id = ?').run(name, userId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor('#ff6f00').setDescription(`⚒️ Deine Schmiede heißt jetzt **${name}**!`)] });
    }

    if (sub === 'materialien') {
      const lines = Object.entries(MATERIALIEN).map(([key, m]) => {
        return `${m.emoji} **${m.name}**: ${schmied[key]} | Preis: ${m.preis} Coins`;
      }).join('\n');
      return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🧱 Materialien').setColor('#ff6f00').setDescription(lines)] });
    }

    if (sub === 'einkaufen') {
      const material = interaction.options.getString('material').toLowerCase();
      const menge = interaction.options.getInteger('menge');
      if (!MATERIALIEN[material]) {
        return interaction.reply({ content: '❌ Ungültiges Material! Wähle: ' + Object.keys(MATERIALIEN).join(', '), ephemeral: true });
      }
      if (menge < 1 || menge > 50) {
        return interaction.reply({ content: '❌ Menge muss zwischen 1 und 50 sein!', ephemeral: true });
      }
      const cost = MATERIALIEN[material].preis * menge;
      const bal = (db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId))?.balance || 0;
      if (bal < cost) {
        return interaction.reply({ content: `❌ Zu wenig Coins! Kosten: **${cost}** Coins.`, ephemeral: true });
      }
      db.db.prepare(`UPDATE schmieden SET ${material} = ${material} + ? WHERE user_id = ?`).run(menge, userId);
      db.db.prepare('UPDATE economy SET balance = balance - ? WHERE user_id = ?').run(cost, userId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor('#ff6f00').setDescription(`${MATERIALIEN[material].emoji} **${menge}x ${MATERIALIEN[material].name}** gekauft!\n💰 -${cost} Coins`)] });
    }

    if (sub === 'rezepte') {
      const lines = REZEPTE.map((r, i) => {
        const matList = Object.entries(r.mat).map(([k, v]) => `${v}x ${MATERIALIEN[k]?.name || k}`).join(', ');
        return `**${i + 1}.** ${r.emoji} ${r.name} (${r.typ}) — Ab Lv.${r.minLevel}\n   Material: ${matList}\n   Stärke: ${r.baseStaerke[0]}-${r.baseStaerke[1]} | Wert: ~${r.basePreis} | XP: ${r.xp}`;
      }).join('\n\n');
      return interaction.reply({ embeds: [new EmbedBuilder().setTitle('📖 Schmiedeanleitungen').setColor('#ff6f00').setDescription(lines)] });
    }

    if (sub === 'schmieden') {
      const rezeptIdx = interaction.options.getInteger('rezept') - 1;
      if (rezeptIdx < 0 || rezeptIdx >= REZEPTE.length) {
        return interaction.reply({ content: `❌ Ungültiges Rezept! Wähle 1-${REZEPTE.length}.`, ephemeral: true });
      }
      const rezept = REZEPTE[rezeptIdx];
      if (schmied.level < rezept.minLevel) {
        return interaction.reply({ content: `❌ Du brauchst Level ${rezept.minLevel} für ${rezept.name}!`, ephemeral: true });
      }

      for (const [mat, menge] of Object.entries(rezept.mat)) {
        if ((schmied[mat] || 0) < menge) {
          return interaction.reply({ content: `❌ Nicht genug **${MATERIALIEN[mat]?.name || mat}**! Brauchst ${menge}, hast ${schmied[mat] || 0}.`, ephemeral: true });
        }
      }

      const updates = Object.entries(rezept.mat).map(([k, v]) => `${k} = ${k} - ${v}`).join(', ');
      db.db.prepare(`UPDATE schmieden SET ${updates}, geschmiedet = geschmiedet + 1 WHERE user_id = ?`).run(userId);

      const event = SCHMIEDE_EVENTS[rand(0, SCHMIEDE_EVENTS.length - 1)];
      const ambossBonus = schmied.upgrade_amboss * 6;
      const praezBonus = schmied.praezision * 3;
      const qualitaet = Math.max(10, Math.min(100, 50 + rand(-15, 15) + event.modifier + ambossBonus + praezBonus));
      const seltenheit = getSeltenheit(qualitaet);

      const werkzeugBonus = 1 + schmied.upgrade_werkzeug * 0.1;
      const kraftBonus = schmied.kraft * 2;
      const staerke = Math.floor(rand(rezept.baseStaerke[0], rezept.baseStaerke[1]) * (qualitaet / 50) + kraftBonus);

      const haerteBonus = 1 + schmied.upgrade_haertebecken * 0.12;
      const verkaufspreis = Math.floor(rezept.basePreis * (qualitaet / 50) * haerteBonus);

      const materialName = Object.keys(rezept.mat)[0];
      db.db.prepare('INSERT INTO schmied_inventar (user_id, typ, name, qualitaet, staerke, material, seltenheit, verkaufspreis) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(userId, rezept.typ, rezept.name, qualitaet, staerke, materialName, seltenheit, verkaufspreis);

      const xpGain = Math.floor(rezept.xp * werkzeugBonus * (qualitaet / 60));
      let newXp = schmied.xp + xpGain;
      let newLevel = schmied.level;
      let leveledUp = false;
      while (newXp >= xpForLevel(newLevel)) { newXp -= xpForLevel(newLevel); newLevel++; leveledUp = true; }
      db.db.prepare('UPDATE schmieden SET xp = ?, level = ? WHERE user_id = ?').run(newXp, newLevel, userId);

      const qualLabel = qualitaet >= 95 ? '⭐ Meisterwerk!' : qualitaet >= 85 ? '✨ Hervorragend' : qualitaet >= 70 ? '👍 Gut' : qualitaet >= 50 ? '😐 Durchschnitt' : '💩 Schrott';

      const embed = new EmbedBuilder()
        .setTitle(`${rezept.emoji} ${rezept.name} geschmiedet!`)
        .setColor(RARITY_COLORS[seltenheit] || '#ff6f00')
        .setDescription(event.text)
        .addFields(
          { name: '📊 Qualität', value: `${qualitaet}% — ${qualLabel}`, inline: true },
          { name: '💪 Stärke', value: `${staerke}`, inline: true },
          { name: '⭐ Seltenheit', value: seltenheit, inline: true },
          { name: '💰 Wert', value: `${verkaufspreis} Coins`, inline: true },
          { name: '⭐ XP', value: `+${xpGain}`, inline: true },
          { name: '🗡️ Typ', value: rezept.typ, inline: true }
        );
      if (leveledUp) embed.addFields({ name: '🎉 Level Up!', value: `Level ${newLevel}! Rang: ${getRank(newLevel).name}` });
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'inventar') {
      const items = db.db.prepare('SELECT * FROM schmied_inventar WHERE user_id = ? ORDER BY staerke DESC LIMIT 15').all(userId);
      if (items.length === 0) {
        return interaction.reply({ content: '📦 Inventar leer. Schmiede etwas!', ephemeral: true });
      }
      const total = db.db.prepare('SELECT COUNT(*) as c FROM schmied_inventar WHERE user_id = ?').get(userId).c;
      const lines = items.map(i => {
        const r = REZEPTE.find(rz => rz.name === i.name);
        return `**#${i.id}** ${r?.emoji || '⚔️'} ${i.name} — Q: ${i.qualitaet}% | Stk: ${i.staerke} | ${i.seltenheit} | ${i.verkaufspreis} Coins`;
      }).join('\n');
      return interaction.reply({ embeds: [new EmbedBuilder().setTitle('📦 Schmied-Inventar').setColor('#ff6f00').setDescription(lines).setFooter({ text: `${total} Gegenstände` })] });
    }

    if (sub === 'verkaufen') {
      const item = db.db.prepare('SELECT * FROM schmied_inventar WHERE user_id = ? ORDER BY verkaufspreis DESC LIMIT 1').get(userId);
      if (!item) {
        return interaction.reply({ content: '📦 Nichts zum Verkaufen!', ephemeral: true });
      }

      const kunde = KUNDEN[rand(0, KUNDEN.length - 1)];
      let preis = item.verkaufspreis;
      let tip = rand(kunde.tip[0], kunde.tip[1]);
      let rufGain = 1;

      if (kunde.pref && item.name === kunde.pref) {
        preis = Math.floor(preis * 1.3);
        tip = Math.floor(tip * 1.5);
        rufGain += 1;
      }
      if (kunde.rufBonus) rufGain += kunde.rufBonus;

      const totalEarning = preis + tip;
      db.db.prepare('DELETE FROM schmied_inventar WHERE id = ?').run(item.id);
      db.db.prepare('UPDATE schmieden SET ruf = ruf + ? WHERE user_id = ?').run(rufGain, userId);
      db.db.prepare('UPDATE economy SET balance = balance + ? WHERE user_id = ?').run(totalEarning, userId);

      const r = REZEPTE.find(rz => rz.name === item.name);
      const embed = new EmbedBuilder()
        .setTitle('🛒 Verkauf!')
        .setColor('#4caf50')
        .setDescription(`${kunde.emoji} **${kunde.name}** kauft deine Schmiedearbeit!`)
        .addFields(
          { name: '⚔️ Gegenstand', value: `${r?.emoji || '⚔️'} ${item.name} (Q: ${item.qualitaet}%)`, inline: true },
          { name: '💰 Preis', value: `${preis} Coins`, inline: true },
          { name: '💝 Trinkgeld', value: `${tip} Coins`, inline: true },
          { name: '💵 Gesamt', value: `**${totalEarning}** Coins`, inline: true },
          { name: '⭐ Ruf', value: `+${rufGain}`, inline: true }
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'trainieren') {
      const skill = interaction.options.getString('skill').toLowerCase();
      const validSkills = { kraft: 'kraft', praezision: 'praezision', wissen: 'wissen', ausdauer: 'ausdauer' };
      if (!validSkills[skill]) {
        return interaction.reply({ content: '❌ Wähle: `kraft`, `praezision`, `wissen` oder `ausdauer`', ephemeral: true });
      }
      const field = validSkills[skill];
      const currentVal = schmied[field];
      const cost = currentVal * 80 + 100;
      const bal = (db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId))?.balance || 0;
      if (bal < cost) {
        return interaction.reply({ content: `❌ Training kostet **${cost}** Coins!`, ephemeral: true });
      }
      const gain = rand(1, 2);
      db.db.prepare(`UPDATE schmieden SET ${field} = ${field} + ? WHERE user_id = ?`).run(gain, userId);
      db.db.prepare('UPDATE economy SET balance = balance - ? WHERE user_id = ?').run(cost, userId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor('#ff6f00').setDescription(`🏋️ **${skill.charAt(0).toUpperCase() + skill.slice(1)}** trainiert! +${gain} (jetzt ${currentVal + gain})\n💰 -${cost} Coins`)] });
    }

    if (sub === 'upgrade') {
      const item = interaction.options.getString('item').toLowerCase();
      const upg = UPGRADES[item];
      if (!upg) {
        return interaction.reply({ content: '❌ Wähle: `amboss`, `esse`, `werkzeug` oder `haertebecken`', ephemeral: true });
      }
      const currentLv = schmied[upg.field];
      if (currentLv >= upg.costs.length) {
        return interaction.reply({ content: `❌ ${upg.name} ist bereits auf Max-Level!`, ephemeral: true });
      }
      const cost = upg.costs[currentLv];
      const bal = (db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId))?.balance || 0;
      if (bal < cost) {
        return interaction.reply({ content: `❌ Upgrade kostet **${cost.toLocaleString()}** Coins!`, ephemeral: true });
      }
      db.db.prepare(`UPDATE schmieden SET ${upg.field} = ${upg.field} + 1 WHERE user_id = ?`).run(userId);
      db.db.prepare('UPDATE economy SET balance = balance - ? WHERE user_id = ?').run(cost, userId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor('#ff6f00').setDescription(`🔧 **${upg.name}** auf Level ${currentLv + 1} verbessert!\n${upg.desc}\n💰 -${cost.toLocaleString()} Coins`)] });
    }

    if (sub === 'duell') {
      const opponent = interaction.options.getUser('gegner');
      if (opponent.id === userId) return interaction.reply({ content: '❌ Du kannst nicht gegen dich selbst schmieden!', ephemeral: true });
      if (opponent.bot) return interaction.reply({ content: '❌ Bots können nicht schmieden!', ephemeral: true });

      const oppSchmied = db.db.prepare('SELECT * FROM schmieden WHERE user_id = ?').get(opponent.id);
      if (!oppSchmied) return interaction.reply({ content: '❌ Dein Gegner hat keine Schmiede!', ephemeral: true });

      const myScore = schmied.level * 5 + schmied.kraft * 3 + schmied.praezision * 3 + schmied.ruf * 2 + rand(1, 25);
      const oppScore = oppSchmied.level * 5 + oppSchmied.kraft * 3 + oppSchmied.praezision * 3 + oppSchmied.ruf * 2 + rand(1, 25);

      const won = myScore > oppScore;
      const coinPrize = Math.floor((schmied.level + oppSchmied.level) * 22 + rand(60, 200));
      const rufPrize = rand(2, 5);

      if (won) {
        db.db.prepare('UPDATE economy SET balance = balance + ? WHERE user_id = ?').run(coinPrize, userId);
        db.db.prepare('UPDATE schmieden SET ruf = ruf + ? WHERE user_id = ?').run(rufPrize, userId);
      }

      const embed = new EmbedBuilder()
        .setTitle('⚒️ Schmiedewettbewerb!')
        .setColor(won ? '#4caf50' : '#f44336')
        .setDescription(`**${schmied.name}** vs **${oppSchmied.name}**`)
        .addFields(
          { name: schmied.name, value: `🔥 Punkte: ${myScore}`, inline: true },
          { name: oppSchmied.name, value: `🔥 Punkte: ${oppScore}`, inline: true },
          { name: '🏆 Ergebnis', value: won ? `**${schmied.name}** gewinnt!\n💰 +${coinPrize} Coins | ⭐ +${rufPrize} Ruf` : `**${oppSchmied.name}** gewinnt!\nÜbe weiter!` }
        );
      return interaction.reply({ embeds: [embed] });
    }
  }
};
