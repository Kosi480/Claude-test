const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

const cooldowns = new Map();

function ensureGartenTables() {
  db.db.exec(`CREATE TABLE IF NOT EXISTS gaerten (
    user_id TEXT PRIMARY KEY,
    name TEXT DEFAULT 'Kleiner Garten',
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    ruf INTEGER DEFAULT 0,
    pflanzen_total INTEGER DEFAULT 0,
    ernten_total INTEGER DEFAULT 0,
    samen INTEGER DEFAULT 3,
    duenger INTEGER DEFAULT 2,
    wasser INTEGER DEFAULT 10,
    seltene_erde INTEGER DEFAULT 0,
    botanik INTEGER DEFAULT 1,
    pflege INTEGER DEFAULT 1,
    zucht INTEGER DEFAULT 1,
    ernte_skill INTEGER DEFAULT 1,
    upgrade_beete INTEGER DEFAULT 0,
    upgrade_gewaechshaus INTEGER DEFAULT 0,
    upgrade_bewaesserung INTEGER DEFAULT 0,
    upgrade_kompost INTEGER DEFAULT 0
  )`);
  db.db.exec(`CREATE TABLE IF NOT EXISTS garten_pflanzen (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    art TEXT,
    name TEXT,
    wachstum INTEGER DEFAULT 0,
    gesundheit INTEGER DEFAULT 100,
    qualitaet INTEGER DEFAULT 50,
    seltenheit TEXT,
    gepflanzt_at TEXT DEFAULT (datetime('now')),
    reif INTEGER DEFAULT 0
  )`);
}

const PFLANZEN_ARTEN = [
  { name: 'Gänseblümchen', emoji: '🌼', wachszeit: 2, ernteWert: [20, 50], seltenheit: 'Gewöhnlich', xp: 5 },
  { name: 'Sonnenblume', emoji: '🌻', wachszeit: 3, ernteWert: [40, 80], seltenheit: 'Gewöhnlich', xp: 8 },
  { name: 'Tulpe', emoji: '🌷', wachszeit: 3, ernteWert: [50, 100], seltenheit: 'Gewöhnlich', xp: 10 },
  { name: 'Rose', emoji: '🌹', wachszeit: 4, ernteWert: [70, 140], seltenheit: 'Ungewöhnlich', xp: 15 },
  { name: 'Orchidee', emoji: '🪻', wachszeit: 5, ernteWert: [100, 200], seltenheit: 'Ungewöhnlich', xp: 22 },
  { name: 'Lavendel', emoji: '💜', wachszeit: 4, ernteWert: [80, 160], seltenheit: 'Ungewöhnlich', xp: 18 },
  { name: 'Bonsai', emoji: '🌳', wachszeit: 7, ernteWert: [180, 350], seltenheit: 'Selten', xp: 35 },
  { name: 'Kirschblüte', emoji: '🌸', wachszeit: 6, ernteWert: [150, 300], seltenheit: 'Selten', xp: 30 },
  { name: 'Lotusblume', emoji: '🪷', wachszeit: 8, ernteWert: [250, 500], seltenheit: 'Episch', xp: 50 },
  { name: 'Mondblume', emoji: '🌙', wachszeit: 9, ernteWert: [350, 700], seltenheit: 'Episch', xp: 70 },
  { name: 'Kristallrose', emoji: '💎', wachszeit: 10, ernteWert: [500, 1000], seltenheit: 'Legendär', xp: 100 },
  { name: 'Weltenbaum-Setzling', emoji: '✨', wachszeit: 12, ernteWert: [800, 1600], seltenheit: 'Mythisch', xp: 150 }
];

const SAMEN_QUELLEN = [
  { name: 'Wiese', emoji: '🌾', range: [0, 3], cost: 50, minLevel: 1 },
  { name: 'Blumenmarkt', emoji: '🏪', range: [2, 5], cost: 150, minLevel: 3 },
  { name: 'Botanischer Garten', emoji: '🏛️', range: [4, 7], cost: 400, minLevel: 6 },
  { name: 'Exotische Gärtnerei', emoji: '🌴', range: [6, 9], cost: 800, minLevel: 10 },
  { name: 'Mystischer Hain', emoji: '🌌', range: [8, 11], cost: 2000, minLevel: 15 }
];

const PFLEGE_EVENTS = [
  { text: 'Die Sonne scheint perfekt auf deine Pflanzen!', modifier: 15 },
  { text: 'Ein sanfter Regen erfrischt den Garten.', modifier: 10 },
  { text: 'Schnecken knabbern an den Blättern...', modifier: -8 },
  { text: 'Der Kompost wirkt Wunder!', modifier: 18 },
  { text: 'Ein Schmetterling bestäubt deine Blumen!', modifier: 12 },
  { text: 'Blattläuse befallen eine Pflanze!', modifier: -12 },
  { text: 'Du entdeckst einen seltenen Pilz im Beet!', modifier: 8, bonus: true },
  { text: 'Die Pflanzen blühen in voller Pracht!', modifier: 20 },
  { text: 'Ein Sturm beschädigt einige Blüten.', modifier: -10 },
  { text: 'Dein Nachbar bewundert deinen Garten!', modifier: 5, ruf: true }
];

const KUNDEN = [
  { name: 'Blumenliebhaberin', emoji: '👩', tip: [5, 20], pref: 'Rose' },
  { name: 'Hochzeitsflorist', emoji: '💒', tip: [15, 45], pref: 'Orchidee' },
  { name: 'Botanik-Professor', emoji: '🎓', tip: [10, 35], pref: 'Bonsai', rufBonus: 2 },
  { name: 'Spa-Besitzerin', emoji: '🧖', tip: [10, 30], pref: 'Lavendel' },
  { name: 'Tee-Meister', emoji: '🍵', tip: [20, 50], pref: 'Lotusblume' },
  { name: 'Kunstgalerie', emoji: '🖼️', tip: [15, 40], pref: 'Kirschblüte' },
  { name: 'Parfümerie', emoji: '💐', tip: [25, 60], pref: null, rufBonus: 3 },
  { name: 'Gartenmagazin', emoji: '📰', tip: [10, 55], pref: null, rufBonus: 4 }
];

const RANKS = [
  { name: 'Gartenanfänger', minLevel: 1 },
  { name: 'Hobbygärtner', minLevel: 3 },
  { name: 'Gärtner', minLevel: 5 },
  { name: 'Botaniker', minLevel: 8 },
  { name: 'Meistergärtner', minLevel: 12 },
  { name: 'Pflanzenzüchter', minLevel: 16 },
  { name: 'Gartenlegende', minLevel: 20 },
  { name: 'Hüter des Weltenbaums', minLevel: 25 }
];

const UPGRADES = {
  beete: { name: 'Blumenbeete', field: 'upgrade_beete', costs: [300, 800, 1800, 4000, 8000], desc: '+Beet-Kapazität' },
  gewaechshaus: { name: 'Gewächshaus', field: 'upgrade_gewaechshaus', costs: [500, 1200, 2600, 5500, 11000], desc: '+Wachstum & Qualität' },
  bewaesserung: { name: 'Bewässerung', field: 'upgrade_bewaesserung', costs: [350, 900, 2000, 4500, 9000], desc: '+Automatische Bewässerung' },
  kompost: { name: 'Kompostanlage', field: 'upgrade_kompost', costs: [400, 1000, 2200, 5000, 10000], desc: '+Dünger-Effizienz' }
};

function getRank(level) {
  let rank = RANKS[0];
  for (const r of RANKS) { if (level >= r.minLevel) rank = r; }
  return rank;
}

function xpForLevel(level) { return Math.floor(70 * Math.pow(level, 1.45)); }
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

const RARITY_COLORS = {
  'Gewöhnlich': '#9e9e9e', 'Ungewöhnlich': '#4caf50', 'Selten': '#2196f3',
  'Episch': '#9c27b0', 'Legendär': '#ff9800', 'Mythisch': '#e91e63'
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('garten')
    .setDescription('🌱 Pflege deinen eigenen botanischen Garten!')
    .addSubcommand(s => s.setName('status').setDescription('Zeige deinen Garten'))
    .addSubcommand(s => s.setName('umbenennen').setDescription('Benenne deinen Garten um')
      .addStringOption(o => o.setName('name').setDescription('Neuer Name').setRequired(true)))
    .addSubcommand(s => s.setName('samen').setDescription('Kaufe Samen von einer Quelle')
      .addIntegerOption(o => o.setName('quelle').setDescription('Quelle (1-5)').setRequired(true)))
    .addSubcommand(s => s.setName('pflanzen').setDescription('Pflanze einen Setzling ein'))
    .addSubcommand(s => s.setName('giessen').setDescription('Gieße und pflege deine Pflanzen'))
    .addSubcommand(s => s.setName('beete').setDescription('Zeige deine Pflanzen'))
    .addSubcommand(s => s.setName('ernten').setDescription('Ernte reife Pflanzen'))
    .addSubcommand(s => s.setName('verkaufen').setDescription('Verkaufe geerntete Pflanzen'))
    .addSubcommand(s => s.setName('trainieren').setDescription('Trainiere eine Fähigkeit')
      .addStringOption(o => o.setName('skill').setDescription('botanik/pflege/zucht/ernte_skill').setRequired(true)))
    .addSubcommand(s => s.setName('upgrade').setDescription('Verbessere deinen Garten')
      .addStringOption(o => o.setName('item').setDescription('beete/gewaechshaus/bewaesserung/kompost').setRequired(true)))
    .addSubcommand(s => s.setName('wettbewerb').setDescription('Gartenwettbewerb')
      .addUserOption(o => o.setName('gegner').setDescription('Dein Gegner').setRequired(true))),

  async execute(interaction) {
    ensureGartenTables();
    const config = require('../config.json');
    const userId = interaction.user.id;
    const sub = interaction.options.getSubcommand();

    const now = Date.now();
    const cdKey = `${userId}-garten-${sub}`;
    const cdTime = sub === 'giessen' ? 20000 : sub === 'samen' ? 15000 : sub === 'wettbewerb' ? 60000 : 5000;
    if (cooldowns.has(cdKey) && now - cooldowns.get(cdKey) < cdTime) {
      const left = Math.ceil((cdTime - (now - cooldowns.get(cdKey))) / 1000);
      return interaction.reply({ content: `⏳ Cooldown: **${left}s**`, ephemeral: true });
    }
    cooldowns.set(cdKey, now);

    let garten = db.db.prepare('SELECT * FROM gaerten WHERE user_id = ?').get(userId);
    if (!garten && sub !== 'status') {
      db.db.prepare('INSERT INTO gaerten (user_id) VALUES (?)').run(userId);
      garten = db.db.prepare('SELECT * FROM gaerten WHERE user_id = ?').get(userId);
    }

    if (sub === 'status') {
      if (!garten) {
        db.db.prepare('INSERT INTO gaerten (user_id) VALUES (?)').run(userId);
        garten = db.db.prepare('SELECT * FROM gaerten WHERE user_id = ?').get(userId);
      }
      const rank = getRank(garten.level);
      const xpNeeded = xpForLevel(garten.level);
      const bal = (db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId))?.balance || 0;
      const pflanzenCount = db.db.prepare('SELECT COUNT(*) as c FROM garten_pflanzen WHERE user_id = ?').get(userId).c;
      const maxBeete = 5 + garten.upgrade_beete * 3;

      const embed = new EmbedBuilder()
        .setTitle(`🌱 ${garten.name}`)
        .setColor('#4caf50')
        .addFields(
          { name: '📊 Rang', value: `${rank.name} (Lv. ${garten.level})`, inline: true },
          { name: '⭐ XP', value: `${garten.xp}/${xpNeeded}`, inline: true },
          { name: '💰 Coins', value: bal.toLocaleString(), inline: true },
          { name: '🌱 Pflanzen', value: `${pflanzenCount}/${maxBeete}`, inline: true },
          { name: '⭐ Ruf', value: `${garten.ruf}`, inline: true },
          { name: '🌾 Ernten', value: `${garten.ernten_total}`, inline: true },
          { name: '🧪 Ressourcen', value: `Samen: ${garten.samen} | Dünger: ${garten.duenger}\nWasser: ${garten.wasser} | Seltene Erde: ${garten.seltene_erde}`, inline: false },
          { name: '💪 Skills', value: `Botanik: ${garten.botanik} | Pflege: ${garten.pflege}\nZucht: ${garten.zucht} | Ernte: ${garten.ernte_skill}`, inline: false },
          { name: '🔧 Upgrades', value: `Beete: Lv.${garten.upgrade_beete} | Gewächshaus: Lv.${garten.upgrade_gewaechshaus}\nBewässerung: Lv.${garten.upgrade_bewaesserung} | Kompost: Lv.${garten.upgrade_kompost}`, inline: false }
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'umbenennen') {
      const name = interaction.options.getString('name').substring(0, 32);
      db.db.prepare('UPDATE gaerten SET name = ? WHERE user_id = ?').run(name, userId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor('#4caf50').setDescription(`🌱 Dein Garten heißt jetzt **${name}**!`)] });
    }

    if (sub === 'samen') {
      const quelleIdx = interaction.options.getInteger('quelle') - 1;
      if (quelleIdx < 0 || quelleIdx >= SAMEN_QUELLEN.length) {
        return interaction.reply({ content: `❌ Ungültige Quelle! Wähle 1-${SAMEN_QUELLEN.length}.`, ephemeral: true });
      }
      const quelle = SAMEN_QUELLEN[quelleIdx];
      if (garten.level < quelle.minLevel) {
        return interaction.reply({ content: `❌ Du brauchst Level ${quelle.minLevel} für ${quelle.name}!`, ephemeral: true });
      }
      const bal = (db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId))?.balance || 0;
      if (bal < quelle.cost) {
        return interaction.reply({ content: `❌ Samen kosten **${quelle.cost}** Coins!`, ephemeral: true });
      }

      db.db.prepare('UPDATE economy SET balance = balance - ? WHERE user_id = ?').run(quelle.cost, userId);

      const artIdx = rand(quelle.range[0], quelle.range[1]);
      const art = PFLANZEN_ARTEN[artIdx];
      const samenGain = rand(1, 3);

      db.db.prepare('UPDATE gaerten SET samen = samen + ? WHERE user_id = ?').run(samenGain, userId);

      const embed = new EmbedBuilder()
        .setTitle(`${quelle.emoji} Samen gekauft!`)
        .setColor(RARITY_COLORS[art.seltenheit] || '#4caf50')
        .setDescription(`Du besuchst **${quelle.name}** und findest Samen!`)
        .addFields(
          { name: '🌱 Gefunden', value: `${art.emoji} **${art.name}** Samen (x${samenGain})`, inline: true },
          { name: '⭐ Seltenheit', value: art.seltenheit, inline: true },
          { name: '💰 Kosten', value: `${quelle.cost} Coins`, inline: true }
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'pflanzen') {
      if (garten.samen <= 0) {
        return interaction.reply({ content: '❌ Du hast keine Samen! Kaufe welche.', ephemeral: true });
      }
      const maxBeete = 5 + garten.upgrade_beete * 3;
      const current = db.db.prepare('SELECT COUNT(*) as c FROM garten_pflanzen WHERE user_id = ?').get(userId).c;
      if (current >= maxBeete) {
        return interaction.reply({ content: `❌ Alle Beete belegt! (${current}/${maxBeete})`, ephemeral: true });
      }

      const zuchtBonus = garten.zucht;
      const artIdx = Math.min(PFLANZEN_ARTEN.length - 1, rand(0, Math.min(3 + garten.level, PFLANZEN_ARTEN.length - 1)));
      const art = PFLANZEN_ARTEN[artIdx];
      const qualitaet = Math.min(100, 40 + rand(-10, 10) + zuchtBonus * 3 + garten.upgrade_gewaechshaus * 5);

      db.db.prepare('INSERT INTO garten_pflanzen (user_id, art, name, qualitaet, seltenheit) VALUES (?, ?, ?, ?, ?)').run(userId, art.name, art.name, qualitaet, art.seltenheit);
      db.db.prepare('UPDATE gaerten SET samen = samen - 1, pflanzen_total = pflanzen_total + 1 WHERE user_id = ?').run(userId);

      const embed = new EmbedBuilder()
        .setTitle('🌱 Pflanze gesetzt!')
        .setColor(RARITY_COLORS[art.seltenheit] || '#4caf50')
        .setDescription(`${art.emoji} **${art.name}** wurde eingepflanzt!`)
        .addFields(
          { name: '📊 Qualität', value: `${qualitaet}%`, inline: true },
          { name: '⭐ Seltenheit', value: art.seltenheit, inline: true },
          { name: '⏱️ Wachszeit', value: `${art.wachszeit} Gieß-Zyklen`, inline: true }
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'giessen') {
      const pflanzen = db.db.prepare('SELECT * FROM garten_pflanzen WHERE user_id = ? AND reif = 0').all(userId);
      if (pflanzen.length === 0) {
        return interaction.reply({ content: '🌱 Keine wachsenden Pflanzen! Pflanze etwas.', ephemeral: true });
      }
      if (garten.wasser <= 0) {
        return interaction.reply({ content: '❌ Kein Wasser! Wasser regeneriert sich automatisch.', ephemeral: true });
      }

      const event = PFLEGE_EVENTS[rand(0, PFLEGE_EVENTS.length - 1)];
      const bewaesserungBonus = garten.upgrade_bewaesserung * 2;
      const pflegeBonus = garten.pflege * 2;
      const kompostBonus = garten.upgrade_kompost * 3;

      let grewUp = 0;
      let totalGrowth = 0;
      for (const p of pflanzen) {
        const art = PFLANZEN_ARTEN.find(a => a.name === p.art);
        if (!art) continue;
        const growth = 1 + Math.floor((bewaesserungBonus + pflegeBonus + kompostBonus + event.modifier) / 10);
        const newGrowth = Math.min(art.wachszeit, p.wachstum + growth);
        const reif = newGrowth >= art.wachszeit ? 1 : 0;
        const healthChange = event.modifier > 0 ? rand(0, 5) : rand(-5, 0);
        const newHealth = Math.max(10, Math.min(100, p.gesundheit + healthChange));

        db.db.prepare('UPDATE garten_pflanzen SET wachstum = ?, reif = ?, gesundheit = ? WHERE id = ?').run(newGrowth, reif, newHealth, p.id);
        totalGrowth += growth;
        if (reif) grewUp++;
      }

      const wasserUsed = Math.min(garten.wasser, pflanzen.length);
      const wasserRegen = garten.upgrade_bewaesserung;
      db.db.prepare('UPDATE gaerten SET wasser = wasser - ? + ? WHERE user_id = ?').run(wasserUsed, wasserRegen, userId);

      let rufGain = 0;
      if (event.ruf) rufGain = rand(1, 3);
      if (rufGain > 0) db.db.prepare('UPDATE gaerten SET ruf = ruf + ? WHERE user_id = ?').run(rufGain, userId);

      const xpGain = Math.floor(5 + pflanzen.length * 2);
      let newXp = garten.xp + xpGain;
      let newLevel = garten.level;
      let leveledUp = false;
      while (newXp >= xpForLevel(newLevel)) { newXp -= xpForLevel(newLevel); newLevel++; leveledUp = true; }
      db.db.prepare('UPDATE gaerten SET xp = ?, level = ? WHERE user_id = ?').run(newXp, newLevel, userId);

      const embed = new EmbedBuilder()
        .setTitle('💧 Garten gegossen!')
        .setColor('#4caf50')
        .setDescription(event.text)
        .addFields(
          { name: '🌱 Pflanzen', value: `${pflanzen.length} gegossen`, inline: true },
          { name: '📈 Wachstum', value: `+${totalGrowth}`, inline: true },
          { name: '💧 Wasser', value: `-${wasserUsed}`, inline: true },
          { name: '⭐ XP', value: `+${xpGain}`, inline: true }
        );
      if (grewUp > 0) embed.addFields({ name: '🌺 Reif!', value: `${grewUp} Pflanze(n) sind erntereif!` });
      if (rufGain > 0) embed.addFields({ name: '⭐ Ruf', value: `+${rufGain}` });
      if (event.bonus) embed.addFields({ name: '🍄 Bonus', value: 'Seltener Fund im Beet!' });
      if (leveledUp) embed.addFields({ name: '🎉 Level Up!', value: `Level ${newLevel}! Rang: ${getRank(newLevel).name}` });
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'beete') {
      const pflanzen = db.db.prepare('SELECT * FROM garten_pflanzen WHERE user_id = ? ORDER BY reif DESC, qualitaet DESC LIMIT 15').all(userId);
      const maxBeete = 5 + garten.upgrade_beete * 3;
      if (pflanzen.length === 0) {
        return interaction.reply({ content: '🌱 Keine Pflanzen. Pflanze etwas!', ephemeral: true });
      }
      const total = db.db.prepare('SELECT COUNT(*) as c FROM garten_pflanzen WHERE user_id = ?').get(userId).c;
      const lines = pflanzen.map(p => {
        const art = PFLANZEN_ARTEN.find(a => a.name === p.art);
        const status = p.reif ? '🌺 REIF' : `📈 ${p.wachstum}/${art?.wachszeit || '?'}`;
        return `**#${p.id}** ${art?.emoji || '🌱'} ${p.name} — Q: ${p.qualitaet}% | HP: ${p.gesundheit}% | ${status}`;
      }).join('\n');
      return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🌱 Deine Beete').setColor('#4caf50').setDescription(lines).setFooter({ text: `${total}/${maxBeete} Beete belegt` })] });
    }

    if (sub === 'ernten') {
      const reife = db.db.prepare('SELECT * FROM garten_pflanzen WHERE user_id = ? AND reif = 1').all(userId);
      if (reife.length === 0) {
        return interaction.reply({ content: '🌱 Keine reifen Pflanzen! Gieße deine Pflanzen.', ephemeral: true });
      }

      let totalCoins = 0;
      let totalXp = 0;
      const ernteListe = [];

      for (const p of reife) {
        const art = PFLANZEN_ARTEN.find(a => a.name === p.art);
        if (!art) continue;

        const ernteBonus = 1 + garten.ernte_skill * 0.08;
        const qualMod = p.qualitaet / 50;
        const healthMod = p.gesundheit / 100;
        const coins = Math.floor(rand(art.ernteWert[0], art.ernteWert[1]) * ernteBonus * qualMod * healthMod);
        const xp = Math.floor(art.xp * qualMod);

        totalCoins += coins;
        totalXp += xp;
        ernteListe.push(`${art.emoji} ${p.name} — ${coins} Coins`);
        db.db.prepare('DELETE FROM garten_pflanzen WHERE id = ?').run(p.id);
      }

      db.db.prepare('UPDATE economy SET balance = balance + ? WHERE user_id = ?').run(totalCoins, userId);
      db.db.prepare('UPDATE gaerten SET ernten_total = ernten_total + ? WHERE user_id = ?').run(reife.length, userId);

      let newXp = garten.xp + totalXp;
      let newLevel = garten.level;
      let leveledUp = false;
      while (newXp >= xpForLevel(newLevel)) { newXp -= xpForLevel(newLevel); newLevel++; leveledUp = true; }
      db.db.prepare('UPDATE gaerten SET xp = ?, level = ? WHERE user_id = ?').run(newXp, newLevel, userId);

      const embed = new EmbedBuilder()
        .setTitle('🌾 Ernte!')
        .setColor('#4caf50')
        .setDescription(ernteListe.join('\n'))
        .addFields(
          { name: '💰 Gesamt', value: `**${totalCoins.toLocaleString()}** Coins`, inline: true },
          { name: '⭐ XP', value: `+${totalXp}`, inline: true },
          { name: '🌿 Geerntet', value: `${reife.length} Pflanze(n)`, inline: true }
        );
      if (leveledUp) embed.addFields({ name: '🎉 Level Up!', value: `Level ${newLevel}! Rang: ${getRank(newLevel).name}` });
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'verkaufen') {
      const reife = db.db.prepare('SELECT * FROM garten_pflanzen WHERE user_id = ? AND reif = 1 LIMIT 1').get(userId);
      if (!reife) {
        return interaction.reply({ content: '🌱 Keine reifen Pflanzen zum Verkaufen!', ephemeral: true });
      }

      const art = PFLANZEN_ARTEN.find(a => a.name === reife.art);
      const kunde = KUNDEN[rand(0, KUNDEN.length - 1)];
      const ernteBonus = 1 + garten.ernte_skill * 0.08;
      let preis = Math.floor(rand(art?.ernteWert[0] || 30, art?.ernteWert[1] || 80) * ernteBonus * (reife.qualitaet / 50));
      let tip = rand(kunde.tip[0], kunde.tip[1]);
      let rufGain = 1;

      if (kunde.pref && reife.art === kunde.pref) {
        preis = Math.floor(preis * 1.3);
        tip = Math.floor(tip * 1.5);
        rufGain += 1;
      }
      if (kunde.rufBonus) rufGain += kunde.rufBonus;

      const totalEarning = preis + tip;
      db.db.prepare('DELETE FROM garten_pflanzen WHERE id = ?').run(reife.id);
      db.db.prepare('UPDATE gaerten SET ruf = ruf + ?, ernten_total = ernten_total + 1 WHERE user_id = ?').run(rufGain, userId);
      db.db.prepare('UPDATE economy SET balance = balance + ? WHERE user_id = ?').run(totalEarning, userId);

      const embed = new EmbedBuilder()
        .setTitle('🛒 Pflanze verkauft!')
        .setColor('#4caf50')
        .setDescription(`${kunde.emoji} **${kunde.name}** kauft deine Pflanze!`)
        .addFields(
          { name: '🌱 Pflanze', value: `${art?.emoji || '🌱'} ${reife.name} (Q: ${reife.qualitaet}%)`, inline: true },
          { name: '💰 Preis', value: `${preis} Coins`, inline: true },
          { name: '💝 Trinkgeld', value: `${tip} Coins`, inline: true },
          { name: '💵 Gesamt', value: `**${totalEarning}** Coins`, inline: true },
          { name: '⭐ Ruf', value: `+${rufGain}`, inline: true }
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'trainieren') {
      const skill = interaction.options.getString('skill').toLowerCase();
      const validSkills = { botanik: 'botanik', pflege: 'pflege', zucht: 'zucht', ernte_skill: 'ernte_skill' };
      if (!validSkills[skill]) {
        return interaction.reply({ content: '❌ Wähle: `botanik`, `pflege`, `zucht` oder `ernte_skill`', ephemeral: true });
      }
      const field = validSkills[skill];
      const currentVal = garten[field];
      const cost = currentVal * 70 + 100;
      const bal = (db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId))?.balance || 0;
      if (bal < cost) {
        return interaction.reply({ content: `❌ Training kostet **${cost}** Coins!`, ephemeral: true });
      }
      const gain = rand(1, 2);
      db.db.prepare(`UPDATE gaerten SET ${field} = ${field} + ? WHERE user_id = ?`).run(gain, userId);
      db.db.prepare('UPDATE economy SET balance = balance - ? WHERE user_id = ?').run(cost, userId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor('#4caf50').setDescription(`🏋️ **${skill}** trainiert! +${gain} (jetzt ${currentVal + gain})\n💰 -${cost} Coins`)] });
    }

    if (sub === 'upgrade') {
      const item = interaction.options.getString('item').toLowerCase();
      const upg = UPGRADES[item];
      if (!upg) {
        return interaction.reply({ content: '❌ Wähle: `beete`, `gewaechshaus`, `bewaesserung` oder `kompost`', ephemeral: true });
      }
      const currentLv = garten[upg.field];
      if (currentLv >= upg.costs.length) {
        return interaction.reply({ content: `❌ ${upg.name} ist bereits auf Max-Level!`, ephemeral: true });
      }
      const cost = upg.costs[currentLv];
      const bal = (db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId))?.balance || 0;
      if (bal < cost) {
        return interaction.reply({ content: `❌ Upgrade kostet **${cost.toLocaleString()}** Coins!`, ephemeral: true });
      }
      db.db.prepare(`UPDATE gaerten SET ${upg.field} = ${upg.field} + 1 WHERE user_id = ?`).run(userId);
      db.db.prepare('UPDATE economy SET balance = balance - ? WHERE user_id = ?').run(cost, userId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor('#4caf50').setDescription(`🔧 **${upg.name}** auf Level ${currentLv + 1} verbessert!\n${upg.desc}\n💰 -${cost.toLocaleString()} Coins`)] });
    }

    if (sub === 'wettbewerb') {
      const opponent = interaction.options.getUser('gegner');
      if (opponent.id === userId) return interaction.reply({ content: '❌ Du kannst nicht gegen dich selbst gärtnern!', ephemeral: true });
      if (opponent.bot) return interaction.reply({ content: '❌ Bots haben keinen grünen Daumen!', ephemeral: true });

      const oppGarten = db.db.prepare('SELECT * FROM gaerten WHERE user_id = ?').get(opponent.id);
      if (!oppGarten) return interaction.reply({ content: '❌ Dein Gegner hat keinen Garten!', ephemeral: true });

      const myScore = garten.level * 5 + garten.botanik * 3 + garten.pflege * 3 + garten.ruf * 2 + rand(1, 25);
      const oppScore = oppGarten.level * 5 + oppGarten.botanik * 3 + oppGarten.pflege * 3 + oppGarten.ruf * 2 + rand(1, 25);

      const won = myScore > oppScore;
      const coinPrize = Math.floor((garten.level + oppGarten.level) * 20 + rand(50, 180));
      const rufPrize = rand(2, 4);

      if (won) {
        db.db.prepare('UPDATE economy SET balance = balance + ? WHERE user_id = ?').run(coinPrize, userId);
        db.db.prepare('UPDATE gaerten SET ruf = ruf + ? WHERE user_id = ?').run(rufPrize, userId);
      }

      const embed = new EmbedBuilder()
        .setTitle('🌺 Gartenwettbewerb!')
        .setColor(won ? '#4caf50' : '#f44336')
        .setDescription(`**${garten.name}** vs **${oppGarten.name}**`)
        .addFields(
          { name: garten.name, value: `🌱 Punkte: ${myScore}`, inline: true },
          { name: oppGarten.name, value: `🌱 Punkte: ${oppScore}`, inline: true },
          { name: '🏆 Ergebnis', value: won ? `**${garten.name}** gewinnt!\n💰 +${coinPrize} Coins | ⭐ +${rufPrize} Ruf` : `**${oppGarten.name}** gewinnt!\nPflege deinen Garten mehr!` }
        );
      return interaction.reply({ embeds: [embed] });
    }
  }
};
