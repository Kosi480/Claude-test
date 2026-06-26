const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

const cooldowns = new Map();

function ensureKonditoreiTables() {
  db.db.exec(`CREATE TABLE IF NOT EXISTS konditorei (
    user_id TEXT PRIMARY KEY,
    name TEXT DEFAULT 'Kleine Backstube',
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    ruf INTEGER DEFAULT 0,
    rezepte_gelernt INTEGER DEFAULT 0,
    verkauft INTEGER DEFAULT 0,
    mehl INTEGER DEFAULT 5,
    zucker INTEGER DEFAULT 5,
    butter INTEGER DEFAULT 3,
    eier INTEGER DEFAULT 4,
    sahne INTEGER DEFAULT 2,
    schokolade INTEGER DEFAULT 0,
    vanille INTEGER DEFAULT 0,
    fruechte INTEGER DEFAULT 0,
    upgrade_ofen INTEGER DEFAULT 0,
    upgrade_theke INTEGER DEFAULT 0,
    upgrade_lager INTEGER DEFAULT 0,
    upgrade_deko INTEGER DEFAULT 0,
    last_bake TEXT DEFAULT NULL
  )`);
  db.db.exec(`CREATE TABLE IF NOT EXISTS konditorei_lager (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    rezept TEXT,
    qualitaet INTEGER,
    verkaufspreis INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
  )`);
}

const ZUTATEN = {
  mehl: { name: 'Mehl', emoji: '🌾', preis: 10 },
  zucker: { name: 'Zucker', emoji: '🍬', preis: 12 },
  butter: { name: 'Butter', emoji: '🧈', preis: 15 },
  eier: { name: 'Eier', emoji: '🥚', preis: 8 },
  sahne: { name: 'Sahne', emoji: '🥛', preis: 18 },
  schokolade: { name: 'Schokolade', emoji: '🍫', preis: 25 },
  vanille: { name: 'Vanille', emoji: '🌿', preis: 30 },
  fruechte: { name: 'Früchte', emoji: '🍓', preis: 20 }
};

const REZEPTE = [
  { name: 'Brötchen', emoji: '🥖', zutaten: { mehl: 2, eier: 1 }, basePreis: 30, baseXP: 5, minLevel: 1 },
  { name: 'Butterkuchen', emoji: '🧁', zutaten: { mehl: 2, butter: 2, zucker: 1 }, basePreis: 60, baseXP: 10, minLevel: 1 },
  { name: 'Muffins', emoji: '🧁', zutaten: { mehl: 2, zucker: 2, eier: 2 }, basePreis: 80, baseXP: 15, minLevel: 2 },
  { name: 'Croissant', emoji: '🥐', zutaten: { mehl: 3, butter: 3, eier: 1 }, basePreis: 100, baseXP: 20, minLevel: 3 },
  { name: 'Obstkuchen', emoji: '🥧', zutaten: { mehl: 2, zucker: 2, fruechte: 3, eier: 2 }, basePreis: 140, baseXP: 25, minLevel: 4 },
  { name: 'Schokoladentorte', emoji: '🎂', zutaten: { mehl: 3, schokolade: 3, zucker: 2, eier: 3, sahne: 2 }, basePreis: 220, baseXP: 40, minLevel: 5 },
  { name: 'Crème Brûlée', emoji: '🍮', zutaten: { sahne: 3, zucker: 2, vanille: 2, eier: 3 }, basePreis: 280, baseXP: 50, minLevel: 7 },
  { name: 'Éclairs', emoji: '🥖', zutaten: { mehl: 2, butter: 2, sahne: 3, schokolade: 2, vanille: 1 }, basePreis: 320, baseXP: 55, minLevel: 8 },
  { name: 'Macarons', emoji: '🍪', zutaten: { zucker: 3, eier: 2, vanille: 2, fruechte: 2 }, basePreis: 350, baseXP: 60, minLevel: 10 },
  { name: 'Hochzeitstorte', emoji: '🎂', zutaten: { mehl: 5, zucker: 4, butter: 4, eier: 5, sahne: 3, vanille: 2 }, basePreis: 500, baseXP: 80, minLevel: 12 },
  { name: 'Petit Fours', emoji: '🍰', zutaten: { mehl: 3, butter: 3, schokolade: 3, vanille: 2, fruechte: 2, sahne: 2 }, basePreis: 600, baseXP: 95, minLevel: 14 },
  { name: 'Meisterstück', emoji: '👑', zutaten: { mehl: 5, zucker: 5, butter: 5, eier: 5, sahne: 4, schokolade: 4, vanille: 3, fruechte: 3 }, basePreis: 1000, baseXP: 150, minLevel: 17 }
];

const BACK_EVENTS = [
  { text: 'Der Teig geht perfekt auf!', modifier: 15 },
  { text: 'Die Temperatur stimmt genau — goldbraun!', modifier: 10 },
  { text: 'Ein Hauch zu lange im Ofen...', modifier: -10 },
  { text: 'Die Glasur glänzt wunderschön!', modifier: 20 },
  { text: 'Du hast den Zucker vergessen nachzufüllen...', modifier: -5 },
  { text: 'Ein Stammkunde gibt dir einen Geheimtipp!', modifier: 12 },
  { text: 'Die Butter war etwas zu kalt.', modifier: -8 },
  { text: 'Meisterhaft dekoriert!', modifier: 25 },
  { text: 'Ein kleiner Riss in der Oberfläche...', modifier: -3 },
  { text: 'Das Aroma erfüllt die ganze Backstube!', modifier: 18 }
];

const KUNDEN = [
  { name: 'Nachbarskind', emoji: '👦', tip: [0, 5], pref: null },
  { name: 'Stammkundin Helga', emoji: '👵', tip: [5, 15], pref: 'Butterkuchen' },
  { name: 'Geschäftsmann', emoji: '👔', tip: [10, 30], pref: 'Croissant' },
  { name: 'Hochzeitspaar', emoji: '💑', tip: [20, 50], pref: 'Hochzeitstorte' },
  { name: 'Food-Blogger', emoji: '📱', tip: [5, 25], pref: null, rufBonus: 2 },
  { name: 'Bürgermeister', emoji: '🎩', tip: [15, 40], pref: 'Schokoladentorte' },
  { name: 'Konditor-Kritiker', emoji: '📝', tip: [0, 60], pref: null, rufBonus: 3 },
  { name: 'Touristengruppe', emoji: '🗺️', tip: [10, 35], pref: null, mengenBonus: true }
];

const RANKS = [
  { name: 'Backlehrling', minLevel: 1 },
  { name: 'Bäckergeselle', minLevel: 3 },
  { name: 'Konditor', minLevel: 5 },
  { name: 'Patissier', minLevel: 8 },
  { name: 'Meisterbäcker', minLevel: 12 },
  { name: 'Tortenkünstler', minLevel: 16 },
  { name: 'Backlegende', minLevel: 20 },
  { name: 'Göttlicher Pâtissier', minLevel: 25 }
];

const UPGRADES = {
  ofen: { name: 'Profi-Ofen', field: 'upgrade_ofen', costs: [400, 1000, 2200, 5000, 10000], desc: '+Qualität beim Backen' },
  theke: { name: 'Verkaufstheke', field: 'upgrade_theke', costs: [300, 800, 1800, 4000, 8000], desc: '+Verkaufspreis & Trinkgeld' },
  lager: { name: 'Kühllager', field: 'upgrade_lager', costs: [350, 900, 2000, 4500, 9000], desc: '+Lagerkapazität' },
  deko: { name: 'Dekoration', field: 'upgrade_deko', costs: [500, 1200, 2500, 5500, 11000], desc: '+Ruf & Kundenbonus' }
};

function getRank(level) {
  let rank = RANKS[0];
  for (const r of RANKS) { if (level >= r.minLevel) rank = r; }
  return rank;
}

function xpForLevel(level) { return Math.floor(70 * Math.pow(level, 1.45)); }
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

module.exports = {
  data: new SlashCommandBuilder()
    .setName('konditorei')
    .setDescription('🧁 Eröffne deine eigene Konditorei und backe Meisterwerke!')
    .addSubcommand(s => s.setName('status').setDescription('Zeige deine Konditorei'))
    .addSubcommand(s => s.setName('umbenennen').setDescription('Benenne deine Konditorei um')
      .addStringOption(o => o.setName('name').setDescription('Neuer Name').setRequired(true)))
    .addSubcommand(s => s.setName('einkaufen').setDescription('Kaufe Zutaten ein')
      .addStringOption(o => o.setName('zutat').setDescription('mehl/zucker/butter/eier/sahne/schokolade/vanille/fruechte').setRequired(true))
      .addIntegerOption(o => o.setName('menge').setDescription('Anzahl').setRequired(true)))
    .addSubcommand(s => s.setName('zutaten').setDescription('Zeige deine Zutaten'))
    .addSubcommand(s => s.setName('backen').setDescription('Backe ein Rezept')
      .addIntegerOption(o => o.setName('rezept').setDescription('Rezeptnummer').setRequired(true)))
    .addSubcommand(s => s.setName('lager').setDescription('Zeige dein Gebäcklager'))
    .addSubcommand(s => s.setName('verkaufen').setDescription('Verkaufe Gebäck an Kunden'))
    .addSubcommand(s => s.setName('rezepte').setDescription('Zeige alle Rezepte'))
    .addSubcommand(s => s.setName('upgrade').setDescription('Verbessere deine Konditorei')
      .addStringOption(o => o.setName('item').setDescription('ofen/theke/lager/deko').setRequired(true)))
    .addSubcommand(s => s.setName('wettbewerb').setDescription('Backwettbewerb gegen einen anderen Spieler')
      .addUserOption(o => o.setName('gegner').setDescription('Dein Gegner').setRequired(true))),

  async execute(interaction) {
    ensureKonditoreiTables();
    const config = require('../config.json');
    const userId = interaction.user.id;
    const sub = interaction.options.getSubcommand();

    const now = Date.now();
    const cdKey = `${userId}-${sub}`;
    const cdTime = sub === 'backen' ? 20000 : sub === 'verkaufen' ? 25000 : sub === 'wettbewerb' ? 60000 : 5000;
    if (cooldowns.has(cdKey) && now - cooldowns.get(cdKey) < cdTime) {
      const left = Math.ceil((cdTime - (now - cooldowns.get(cdKey))) / 1000);
      return interaction.reply({ content: `⏳ Cooldown: **${left}s**`, ephemeral: true });
    }
    cooldowns.set(cdKey, now);

    let baker = db.db.prepare('SELECT * FROM konditorei WHERE user_id = ?').get(userId);
    if (!baker && sub !== 'status' && sub !== 'rezepte') {
      db.db.prepare('INSERT INTO konditorei (user_id) VALUES (?)').run(userId);
      baker = db.db.prepare('SELECT * FROM konditorei WHERE user_id = ?').get(userId);
    }

    if (sub === 'status') {
      if (!baker) {
        db.db.prepare('INSERT INTO konditorei (user_id) VALUES (?)').run(userId);
        baker = db.db.prepare('SELECT * FROM konditorei WHERE user_id = ?').get(userId);
      }
      const rank = getRank(baker.level);
      const xpNeeded = xpForLevel(baker.level);
      const bal = (db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId))?.balance || 0;
      const lagerCount = db.db.prepare('SELECT COUNT(*) as c FROM konditorei_lager WHERE user_id = ?').get(userId).c;
      const maxLager = 10 + baker.upgrade_lager * 5;

      const embed = new EmbedBuilder()
        .setTitle(`🧁 ${baker.name}`)
        .setColor('#e91e63')
        .addFields(
          { name: '📊 Rang', value: `${rank.name} (Lv. ${baker.level})`, inline: true },
          { name: '⭐ XP', value: `${baker.xp}/${xpNeeded}`, inline: true },
          { name: '💰 Coins', value: bal.toLocaleString(), inline: true },
          { name: '⭐ Ruf', value: `${baker.ruf}`, inline: true },
          { name: '🍰 Verkauft', value: `${baker.verkauft}`, inline: true },
          { name: '📦 Lager', value: `${lagerCount}/${maxLager}`, inline: true },
          { name: '🔧 Ausstattung', value: `Ofen: Lv.${baker.upgrade_ofen} | Theke: Lv.${baker.upgrade_theke}\nLager: Lv.${baker.upgrade_lager} | Deko: Lv.${baker.upgrade_deko}`, inline: false }
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'umbenennen') {
      const name = interaction.options.getString('name').substring(0, 32);
      db.db.prepare('UPDATE konditorei SET name = ? WHERE user_id = ?').run(name, userId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor('#e91e63').setDescription(`🧁 Deine Konditorei heißt jetzt **${name}**!`)] });
    }

    if (sub === 'zutaten') {
      const lines = Object.entries(ZUTATEN).map(([key, z]) => {
        return `${z.emoji} **${z.name}**: ${baker[key]} | Preis: ${z.preis} Coins`;
      }).join('\n');
      return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🧺 Zutaten').setColor('#e91e63').setDescription(lines)] });
    }

    if (sub === 'einkaufen') {
      const zutat = interaction.options.getString('zutat').toLowerCase();
      const menge = interaction.options.getInteger('menge');
      if (!ZUTATEN[zutat]) {
        return interaction.reply({ content: '❌ Ungültige Zutat! Wähle: ' + Object.keys(ZUTATEN).join(', '), ephemeral: true });
      }
      if (menge < 1 || menge > 50) {
        return interaction.reply({ content: '❌ Menge muss zwischen 1 und 50 sein!', ephemeral: true });
      }
      const cost = ZUTATEN[zutat].preis * menge;
      const bal = (db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId))?.balance || 0;
      if (bal < cost) {
        return interaction.reply({ content: `❌ Zu wenig Coins! Kosten: **${cost}** Coins.`, ephemeral: true });
      }
      db.db.prepare(`UPDATE konditorei SET ${zutat} = ${zutat} + ? WHERE user_id = ?`).run(menge, userId);
      db.db.prepare('UPDATE economy SET balance = balance - ? WHERE user_id = ?').run(cost, userId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor('#e91e63').setDescription(`${ZUTATEN[zutat].emoji} **${menge}x ${ZUTATEN[zutat].name}** eingekauft!\n💰 -${cost} Coins`)] });
    }

    if (sub === 'rezepte') {
      const lines = REZEPTE.map((r, i) => {
        const zutList = Object.entries(r.zutaten).map(([k, v]) => `${v}x ${ZUTATEN[k]?.name || k}`).join(', ');
        return `**${i + 1}.** ${r.emoji} ${r.name} — Ab Lv.${r.minLevel}\n   Zutaten: ${zutList}\n   Wert: ~${r.basePreis} Coins | XP: ${r.baseXP}`;
      }).join('\n\n');
      return interaction.reply({ embeds: [new EmbedBuilder().setTitle('📖 Rezeptbuch').setColor('#e91e63').setDescription(lines)] });
    }

    if (sub === 'backen') {
      const rezeptIdx = interaction.options.getInteger('rezept') - 1;
      if (rezeptIdx < 0 || rezeptIdx >= REZEPTE.length) {
        return interaction.reply({ content: `❌ Ungültiges Rezept! Wähle 1-${REZEPTE.length}.`, ephemeral: true });
      }
      const rezept = REZEPTE[rezeptIdx];
      if (baker.level < rezept.minLevel) {
        return interaction.reply({ content: `❌ Du brauchst Level ${rezept.minLevel} für ${rezept.name}!`, ephemeral: true });
      }

      const maxLager = 10 + baker.upgrade_lager * 5;
      const lagerCount = db.db.prepare('SELECT COUNT(*) as c FROM konditorei_lager WHERE user_id = ?').get(userId).c;
      if (lagerCount >= maxLager) {
        return interaction.reply({ content: `❌ Lager voll! (${lagerCount}/${maxLager}) Verkaufe erst Gebäck.`, ephemeral: true });
      }

      for (const [zutat, menge] of Object.entries(rezept.zutaten)) {
        if ((baker[zutat] || 0) < menge) {
          return interaction.reply({ content: `❌ Nicht genug **${ZUTATEN[zutat]?.name || zutat}**! Brauchst ${menge}, hast ${baker[zutat] || 0}.`, ephemeral: true });
        }
      }

      const updates = Object.entries(rezept.zutaten).map(([k, v]) => `${k} = ${k} - ${v}`).join(', ');
      db.db.prepare(`UPDATE konditorei SET ${updates} WHERE user_id = ?`).run(userId);

      const event = BACK_EVENTS[rand(0, BACK_EVENTS.length - 1)];
      const ofenBonus = baker.upgrade_ofen * 8;
      const qualitaet = Math.max(10, Math.min(100, 50 + rand(-15, 15) + event.modifier + ofenBonus));
      const preisMod = qualitaet / 50;
      const verkaufspreis = Math.floor(rezept.basePreis * preisMod);

      db.db.prepare('INSERT INTO konditorei_lager (user_id, rezept, qualitaet, verkaufspreis) VALUES (?, ?, ?, ?)').run(userId, rezept.name, qualitaet, verkaufspreis);

      let xpGain = Math.floor(rezept.baseXP * (qualitaet / 60));
      let newXp = baker.xp + xpGain;
      let newLevel = baker.level;
      let leveledUp = false;
      while (newXp >= xpForLevel(newLevel)) { newXp -= xpForLevel(newLevel); newLevel++; leveledUp = true; }
      db.db.prepare('UPDATE konditorei SET xp = ?, level = ? WHERE user_id = ?').run(newXp, newLevel, userId);

      const qualLabel = qualitaet >= 90 ? '⭐ Meisterwerk!' : qualitaet >= 70 ? '✨ Sehr gut' : qualitaet >= 50 ? '👍 Gut' : qualitaet >= 30 ? '😐 Okay' : '💩 Verbrannt';

      const embed = new EmbedBuilder()
        .setTitle(`${rezept.emoji} ${rezept.name} gebacken!`)
        .setColor(qualitaet >= 70 ? '#4caf50' : qualitaet >= 40 ? '#ff9800' : '#f44336')
        .setDescription(event.text)
        .addFields(
          { name: '📊 Qualität', value: `${qualitaet}% — ${qualLabel}`, inline: true },
          { name: '💰 Wert', value: `${verkaufspreis} Coins`, inline: true },
          { name: '⭐ XP', value: `+${xpGain}`, inline: true }
        );
      if (leveledUp) embed.addFields({ name: '🎉 Level Up!', value: `Level ${newLevel}! Rang: ${getRank(newLevel).name}` });
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'lager') {
      const items = db.db.prepare('SELECT * FROM konditorei_lager WHERE user_id = ? ORDER BY qualitaet DESC LIMIT 15').all(userId);
      const maxLager = 10 + baker.upgrade_lager * 5;
      const total = db.db.prepare('SELECT COUNT(*) as c FROM konditorei_lager WHERE user_id = ?').get(userId).c;
      if (items.length === 0) {
        return interaction.reply({ content: '📦 Dein Lager ist leer. Backe etwas!', ephemeral: true });
      }
      const lines = items.map(i => {
        const r = REZEPTE.find(rz => rz.name === i.rezept);
        return `**#${i.id}** ${r?.emoji || '🍰'} ${i.rezept} — Q: ${i.qualitaet}% | ${i.verkaufspreis} Coins`;
      }).join('\n');
      return interaction.reply({ embeds: [new EmbedBuilder().setTitle('📦 Gebäcklager').setColor('#e91e63').setDescription(lines).setFooter({ text: `${total}/${maxLager} Plätze belegt` })] });
    }

    if (sub === 'verkaufen') {
      const items = db.db.prepare('SELECT * FROM konditorei_lager WHERE user_id = ? ORDER BY qualitaet DESC LIMIT 5').all(userId);
      if (items.length === 0) {
        return interaction.reply({ content: '📦 Nichts zum Verkaufen! Backe erst etwas.', ephemeral: true });
      }

      const kunde = KUNDEN[rand(0, KUNDEN.length - 1)];
      const thekenBonus = 1 + baker.upgrade_theke * 0.1;
      const dekoBonus = 1 + baker.upgrade_deko * 0.05;
      const item = items[0];

      let preis = Math.floor(item.verkaufspreis * thekenBonus * dekoBonus);
      let tip = rand(kunde.tip[0], kunde.tip[1]);
      let rufGain = 1;

      if (kunde.pref && item.rezept === kunde.pref) {
        preis = Math.floor(preis * 1.3);
        tip = Math.floor(tip * 1.5);
        rufGain += 1;
      }
      if (kunde.rufBonus) rufGain += kunde.rufBonus;
      if (kunde.mengenBonus && items.length >= 3) {
        preis = Math.floor(preis * 1.2);
      }

      const totalEarning = preis + tip;

      db.db.prepare('DELETE FROM konditorei_lager WHERE id = ?').run(item.id);
      db.db.prepare('UPDATE konditorei SET verkauft = verkauft + 1, ruf = ruf + ? WHERE user_id = ?').run(rufGain, userId);
      db.db.prepare('UPDATE economy SET balance = balance + ? WHERE user_id = ?').run(totalEarning, userId);

      const r = REZEPTE.find(rz => rz.name === item.rezept);
      const embed = new EmbedBuilder()
        .setTitle('🛒 Verkauf!')
        .setColor('#4caf50')
        .setDescription(`${kunde.emoji} **${kunde.name}** kauft dein Gebäck!`)
        .addFields(
          { name: '🍰 Produkt', value: `${r?.emoji || '🍰'} ${item.rezept} (Q: ${item.qualitaet}%)`, inline: true },
          { name: '💰 Preis', value: `${preis} Coins`, inline: true },
          { name: '💝 Trinkgeld', value: `${tip} Coins`, inline: true },
          { name: '💵 Gesamt', value: `**${totalEarning}** Coins`, inline: true },
          { name: '⭐ Ruf', value: `+${rufGain}`, inline: true }
        );
      if (kunde.pref && item.rezept === kunde.pref) {
        embed.addFields({ name: '❤️ Lieblingsgericht!', value: `${kunde.name} liebt ${item.rezept}! Bonus!` });
      }
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'upgrade') {
      const item = interaction.options.getString('item').toLowerCase();
      const upg = UPGRADES[item];
      if (!upg) {
        return interaction.reply({ content: '❌ Wähle: `ofen`, `theke`, `lager` oder `deko`', ephemeral: true });
      }
      const currentLv = baker[upg.field];
      if (currentLv >= upg.costs.length) {
        return interaction.reply({ content: `❌ ${upg.name} ist bereits auf Max-Level!`, ephemeral: true });
      }
      const cost = upg.costs[currentLv];
      const bal = (db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId))?.balance || 0;
      if (bal < cost) {
        return interaction.reply({ content: `❌ Zu wenig Coins! Upgrade kostet **${cost.toLocaleString()}** Coins.`, ephemeral: true });
      }
      db.db.prepare(`UPDATE konditorei SET ${upg.field} = ${upg.field} + 1 WHERE user_id = ?`).run(userId);
      db.db.prepare('UPDATE economy SET balance = balance - ? WHERE user_id = ?').run(cost, userId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor('#e91e63').setDescription(`🔧 **${upg.name}** auf Level ${currentLv + 1} verbessert!\n${upg.desc}\n💰 -${cost.toLocaleString()} Coins`)] });
    }

    if (sub === 'wettbewerb') {
      const opponent = interaction.options.getUser('gegner');
      if (opponent.id === userId) return interaction.reply({ content: '❌ Du kannst nicht gegen dich selbst antreten!', ephemeral: true });
      if (opponent.bot) return interaction.reply({ content: '❌ Bots können nicht backen!', ephemeral: true });

      const oppBaker = db.db.prepare('SELECT * FROM konditorei WHERE user_id = ?').get(opponent.id);
      if (!oppBaker) return interaction.reply({ content: '❌ Dein Gegner hat keine Konditorei!', ephemeral: true });

      const myScore = baker.level * 5 + baker.ruf * 2 + baker.upgrade_ofen * 8 + rand(1, 30);
      const oppScore = oppBaker.level * 5 + oppBaker.ruf * 2 + oppBaker.upgrade_ofen * 8 + rand(1, 30);

      const won = myScore > oppScore;
      const coinPrize = Math.floor((baker.level + oppBaker.level) * 20 + rand(50, 150));
      const rufPrize = rand(2, 5);

      if (won) {
        db.db.prepare('UPDATE economy SET balance = balance + ? WHERE user_id = ?').run(coinPrize, userId);
        db.db.prepare('UPDATE konditorei SET ruf = ruf + ? WHERE user_id = ?').run(rufPrize, userId);
      }

      const embed = new EmbedBuilder()
        .setTitle('🏆 Backwettbewerb!')
        .setColor(won ? '#4caf50' : '#f44336')
        .setDescription(`**${baker.name}** vs **${oppBaker.name}**`)
        .addFields(
          { name: baker.name, value: `🎯 Punkte: ${myScore}`, inline: true },
          { name: oppBaker.name, value: `🎯 Punkte: ${oppScore}`, inline: true },
          { name: '🏆 Ergebnis', value: won ? `**${baker.name}** gewinnt!\n💰 +${coinPrize} Coins | ⭐ +${rufPrize} Ruf` : `**${oppBaker.name}** gewinnt!\nÜbe weiter!` }
        );
      return interaction.reply({ embeds: [embed] });
    }
  }
};
