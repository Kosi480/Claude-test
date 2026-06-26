const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

const cooldowns = new Map();

function ensureImkerTables() {
  db.db.exec(`CREATE TABLE IF NOT EXISTS imkereien (
    user_id TEXT PRIMARY KEY,
    name TEXT DEFAULT 'Kleine Imkerei',
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    ruf INTEGER DEFAULT 0,
    honig_verkauft INTEGER DEFAULT 0,
    wachs INTEGER DEFAULT 0,
    pollen INTEGER DEFAULT 0,
    gelee_royale INTEGER DEFAULT 0,
    wissen INTEGER DEFAULT 1,
    pflege INTEGER DEFAULT 1,
    zucht INTEGER DEFAULT 1,
    ernte INTEGER DEFAULT 1,
    upgrade_schleuder INTEGER DEFAULT 0,
    upgrade_rauchgeraet INTEGER DEFAULT 0,
    upgrade_lager INTEGER DEFAULT 0,
    upgrade_laden INTEGER DEFAULT 0,
    saison TEXT DEFAULT 'Frühling'
  )`);
  db.db.exec(`CREATE TABLE IF NOT EXISTS bienenvoelker (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    art TEXT,
    name TEXT,
    staerke INTEGER,
    gesundheit INTEGER DEFAULT 100,
    honig_produktion INTEGER DEFAULT 5,
    honig_lager INTEGER DEFAULT 0,
    seltenheit TEXT,
    temperament TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`);
}

const BIENEN_ARTEN = [
  { name: 'Waldbiene', emoji: '🐝', staerke: [5, 15], produktion: [3, 6], seltenheit: 'Gewöhnlich', temperament: 'Friedlich' },
  { name: 'Wiesenbiene', emoji: '🌻', staerke: [8, 20], produktion: [4, 8], seltenheit: 'Gewöhnlich', temperament: 'Friedlich' },
  { name: 'Buckfast-Biene', emoji: '🐝', staerke: [12, 28], produktion: [6, 12], seltenheit: 'Gewöhnlich', temperament: 'Sanft' },
  { name: 'Carnica', emoji: '🏔️', staerke: [18, 35], produktion: [8, 15], seltenheit: 'Ungewöhnlich', temperament: 'Sanft' },
  { name: 'Italienische Biene', emoji: '🇮🇹', staerke: [22, 42], produktion: [10, 18], seltenheit: 'Ungewöhnlich', temperament: 'Aktiv' },
  { name: 'Kaukasische Biene', emoji: '⛰️', staerke: [28, 50], produktion: [12, 22], seltenheit: 'Selten', temperament: 'Ruhig' },
  { name: 'Dunkle Biene', emoji: '🖤', staerke: [35, 60], produktion: [15, 25], seltenheit: 'Selten', temperament: 'Wehrhaft' },
  { name: 'Russische Biene', emoji: '❄️', staerke: [40, 72], produktion: [18, 30], seltenheit: 'Episch', temperament: 'Robust' },
  { name: 'Afrikanische Biene', emoji: '🌍', staerke: [50, 85], produktion: [22, 35], seltenheit: 'Episch', temperament: 'Aggressiv' },
  { name: 'Königliche Goldbiene', emoji: '👑', staerke: [65, 100], produktion: [28, 45], seltenheit: 'Legendär', temperament: 'Majestätisch' },
  { name: 'Kristallbiene', emoji: '💎', staerke: [80, 130], produktion: [35, 55], seltenheit: 'Legendär', temperament: 'Mystisch' },
  { name: 'Himmelsbiene', emoji: '✨', staerke: [100, 160], produktion: [45, 70], seltenheit: 'Mythisch', temperament: 'Göttlich' }
];

const HONIG_SORTEN = [
  { name: 'Blütenhonig', emoji: '🍯', wert: 30, minLevel: 1 },
  { name: 'Waldhonig', emoji: '🌲', wert: 50, minLevel: 2 },
  { name: 'Akazienhonig', emoji: '🌳', wert: 70, minLevel: 3 },
  { name: 'Lavendelhonig', emoji: '💜', wert: 100, minLevel: 5 },
  { name: 'Heidehonig', emoji: '🌾', wert: 130, minLevel: 7 },
  { name: 'Manuka-Honig', emoji: '🍀', wert: 180, minLevel: 9 },
  { name: 'Tannenhonig', emoji: '🎄', wert: 220, minLevel: 11 },
  { name: 'Gelée Royale Honig', emoji: '👑', wert: 350, minLevel: 14 }
];

const JAHRESZEITEN = ['Frühling', 'Sommer', 'Herbst', 'Winter'];
const SAISON_EFFEKTE = {
  'Frühling': { produktion: 1.2, stichRisiko: 0.1, text: '🌸 Blütezeit — Bienen sind besonders aktiv!' },
  'Sommer': { produktion: 1.5, stichRisiko: 0.15, text: '☀️ Hochsaison — Maximale Honigproduktion!' },
  'Herbst': { produktion: 0.8, stichRisiko: 0.08, text: '🍂 Erntezeit — Die Bienen bereiten sich auf den Winter vor.' },
  'Winter': { produktion: 0.3, stichRisiko: 0.05, text: '❄️ Winterruhe — Wenig Aktivität im Bienenstock.' }
};

const ERNTE_EVENTS = [
  { text: 'Die Waben sind prall gefüllt mit goldenem Honig!', modifier: 1.3 },
  { text: 'Du findest einen Tropfen Gelée Royale!', modifier: 1.1, gelee: true },
  { text: 'Eine Biene sticht dich in den Finger — autsch!', modifier: 0.9, stich: true },
  { text: 'Der Rauch beruhigt die Bienen perfekt.', modifier: 1.2 },
  { text: 'Ein Bär versucht den Honig zu stehlen!', modifier: 0.7 },
  { text: 'Die Bienen summen zufrieden — beste Qualität!', modifier: 1.4 },
  { text: 'Etwas Wachs bleibt am Honig kleben.', modifier: 0.95, wachs: true },
  { text: 'Du entdeckst eine neue Pollenquelle!', modifier: 1.1, pollen: true },
  { text: 'Die Königin legt besonders viele Eier!', modifier: 1.15 },
  { text: 'Regenwetter hält die Bienen im Stock.', modifier: 0.8 }
];

const KUNDEN = [
  { name: 'Nachbar', emoji: '👤', tip: [0, 10], pref: 'Blütenhonig' },
  { name: 'Wochenmarkt-Käuferin', emoji: '🧺', tip: [5, 20], pref: null },
  { name: 'Bio-Laden', emoji: '🌿', tip: [10, 30], pref: 'Waldhonig' },
  { name: 'Restaurant-Chef', emoji: '👨‍🍳', tip: [15, 40], pref: 'Akazienhonig' },
  { name: 'Heilpraktikerin', emoji: '💊', tip: [20, 50], pref: 'Manuka-Honig' },
  { name: 'Luxus-Hotel', emoji: '🏨', tip: [25, 60], pref: 'Gelée Royale Honig' },
  { name: 'Honig-Sommelier', emoji: '🍷', tip: [10, 55], pref: null, rufBonus: 2 },
  { name: 'Großhändler', emoji: '📦', tip: [5, 15], pref: null, mengenBonus: true }
];

const RANKS = [
  { name: 'Bienen-Anfänger', minLevel: 1 },
  { name: 'Hobby-Imker', minLevel: 3 },
  { name: 'Imkergeselle', minLevel: 5 },
  { name: 'Imkermeister', minLevel: 8 },
  { name: 'Bienenflüsterer', minLevel: 12 },
  { name: 'Honig-Baron', minLevel: 16 },
  { name: 'Königinnenzüchter', minLevel: 20 },
  { name: 'Legendärer Imker', minLevel: 25 }
];

const UPGRADES = {
  schleuder: { name: 'Honigschleuder', field: 'upgrade_schleuder', costs: [400, 1000, 2200, 5000, 10000], desc: '+Honig-Ausbeute bei Ernte' },
  rauchgeraet: { name: 'Rauchgerät', field: 'upgrade_rauchgeraet', costs: [300, 800, 1800, 4000, 8000], desc: '-Stichrisiko, ruhigere Bienen' },
  lager: { name: 'Honig-Lager', field: 'upgrade_lager', costs: [350, 900, 2000, 4500, 9000], desc: '+Lagerkapazität' },
  laden: { name: 'Hofladen', field: 'upgrade_laden', costs: [500, 1200, 2600, 5500, 11000], desc: '+Verkaufspreis & Trinkgeld' }
};

function getRank(level) {
  let rank = RANKS[0];
  for (const r of RANKS) { if (level >= r.minLevel) rank = r; }
  return rank;
}

function xpForLevel(level) { return Math.floor(75 * Math.pow(level, 1.45)); }
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function getCurrentSaison() {
  const day = Math.floor(Date.now() / 86400000);
  return JAHRESZEITEN[day % 4];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('imker')
    .setDescription('🐝 Werde Imker und produziere den besten Honig!')
    .addSubcommand(s => s.setName('status').setDescription('Zeige deine Imkerei'))
    .addSubcommand(s => s.setName('umbenennen').setDescription('Benenne deine Imkerei um')
      .addStringOption(o => o.setName('name').setDescription('Neuer Name').setRequired(true)))
    .addSubcommand(s => s.setName('fangen').setDescription('Fange ein wildes Bienenvolk')
      .addIntegerOption(o => o.setName('ort').setDescription('Ort (1=Wald, 2=Wiese, 3=Berg, 4=Garten)').setRequired(true)))
    .addSubcommand(s => s.setName('voelker').setDescription('Zeige deine Bienenvölker'))
    .addSubcommand(s => s.setName('benennen').setDescription('Benenne ein Bienenvolk')
      .addIntegerOption(o => o.setName('id').setDescription('Volk-ID').setRequired(true))
      .addStringOption(o => o.setName('name').setDescription('Neuer Name').setRequired(true)))
    .addSubcommand(s => s.setName('ernten').setDescription('Ernte Honig von einem Volk')
      .addIntegerOption(o => o.setName('id').setDescription('Volk-ID').setRequired(true)))
    .addSubcommand(s => s.setName('verkaufen').setDescription('Verkaufe Honig an Kunden')
      .addIntegerOption(o => o.setName('sorte').setDescription('Honigsorten-Nr (1-8)').setRequired(true)))
    .addSubcommand(s => s.setName('upgrade').setDescription('Verbessere deine Ausrüstung')
      .addStringOption(o => o.setName('item').setDescription('schleuder/rauchgeraet/lager/laden').setRequired(true)))
    .addSubcommand(s => s.setName('trainieren').setDescription('Trainiere eine Fähigkeit')
      .addStringOption(o => o.setName('skill').setDescription('wissen/pflege/zucht/ernte').setRequired(true)))
    .addSubcommand(s => s.setName('saison').setDescription('Zeige die aktuelle Jahreszeit und Effekte'))
    .addSubcommand(s => s.setName('wettbewerb').setDescription('Honig-Wettbewerb gegen einen anderen Imker')
      .addUserOption(o => o.setName('gegner').setDescription('Dein Gegner').setRequired(true))),

  async execute(interaction) {
    ensureImkerTables();
    const config = require('../config.json');
    const userId = interaction.user.id;
    const sub = interaction.options.getSubcommand();

    const now = Date.now();
    const cdKey = `${userId}-${sub}`;
    const cdTime = sub === 'fangen' ? 30000 : sub === 'ernten' ? 20000 : sub === 'verkaufen' ? 15000 : sub === 'wettbewerb' ? 60000 : 5000;
    if (cooldowns.has(cdKey) && now - cooldowns.get(cdKey) < cdTime) {
      const left = Math.ceil((cdTime - (now - cooldowns.get(cdKey))) / 1000);
      return interaction.reply({ content: `⏳ Cooldown: **${left}s**`, ephemeral: true });
    }
    cooldowns.set(cdKey, now);

    let imker = db.db.prepare('SELECT * FROM imkereien WHERE user_id = ?').get(userId);
    if (!imker && sub !== 'status' && sub !== 'saison') {
      db.db.prepare('INSERT INTO imkereien (user_id) VALUES (?)').run(userId);
      imker = db.db.prepare('SELECT * FROM imkereien WHERE user_id = ?').get(userId);
    }

    const saison = getCurrentSaison();
    const saisonEffekt = SAISON_EFFEKTE[saison];

    if (sub === 'status') {
      if (!imker) {
        db.db.prepare('INSERT INTO imkereien (user_id) VALUES (?)').run(userId);
        imker = db.db.prepare('SELECT * FROM imkereien WHERE user_id = ?').get(userId);
      }
      const rank = getRank(imker.level);
      const xpNeeded = xpForLevel(imker.level);
      const bal = (db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId))?.balance || 0;
      const volkCount = db.db.prepare('SELECT COUNT(*) as c FROM bienenvoelker WHERE user_id = ?').get(userId).c;
      const totalHonig = db.db.prepare('SELECT COALESCE(SUM(honig_lager), 0) as s FROM bienenvoelker WHERE user_id = ?').get(userId).s;

      const embed = new EmbedBuilder()
        .setTitle(`🐝 ${imker.name}`)
        .setColor('#ffc107')
        .addFields(
          { name: '📊 Rang', value: `${rank.name} (Lv. ${imker.level})`, inline: true },
          { name: '⭐ XP', value: `${imker.xp}/${xpNeeded}`, inline: true },
          { name: '💰 Coins', value: bal.toLocaleString(), inline: true },
          { name: '🐝 Völker', value: `${volkCount}`, inline: true },
          { name: '🍯 Honig', value: `${totalHonig} Einheiten`, inline: true },
          { name: '⭐ Ruf', value: `${imker.ruf}`, inline: true },
          { name: '🧪 Ressourcen', value: `Wachs: ${imker.wachs} | Pollen: ${imker.pollen} | Gelée: ${imker.gelee_royale}`, inline: false },
          { name: '📚 Skills', value: `Wissen: ${imker.wissen} | Pflege: ${imker.pflege}\nZucht: ${imker.zucht} | Ernte: ${imker.ernte}`, inline: false },
          { name: '🔧 Ausrüstung', value: `Schleuder: Lv.${imker.upgrade_schleuder} | Rauch: Lv.${imker.upgrade_rauchgeraet}\nLager: Lv.${imker.upgrade_lager} | Laden: Lv.${imker.upgrade_laden}`, inline: false },
          { name: '🌿 Saison', value: `${saison} — ${saisonEffekt.text}`, inline: false }
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'umbenennen') {
      const name = interaction.options.getString('name').substring(0, 32);
      db.db.prepare('UPDATE imkereien SET name = ? WHERE user_id = ?').run(name, userId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor('#ffc107').setDescription(`🐝 Deine Imkerei heißt jetzt **${name}**!`)] });
    }

    if (sub === 'saison') {
      const lines = JAHRESZEITEN.map(s => {
        const e = SAISON_EFFEKTE[s];
        const active = s === saison ? ' ⬅️ Aktuell' : '';
        return `**${s}**${active}\n${e.text}\nProduktion: x${e.produktion} | Stichrisiko: ${Math.floor(e.stichRisiko * 100)}%`;
      }).join('\n\n');
      return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🌿 Jahreszeiten').setColor('#ffc107').setDescription(lines)] });
    }

    if (sub === 'fangen') {
      const ortIdx = interaction.options.getInteger('ort');
      const orte = [
        { name: 'Wald', emoji: '🌲', range: [0, 3], cost: 100 },
        { name: 'Wiese', emoji: '🌻', range: [1, 5], cost: 300 },
        { name: 'Berge', emoji: '🏔️', range: [3, 8], cost: 700 },
        { name: 'Geheimer Garten', emoji: '🌺', range: [6, 11], cost: 1500 }
      ];
      if (ortIdx < 1 || ortIdx > orte.length) {
        return interaction.reply({ content: '❌ Wähle einen Ort: 1=Wald, 2=Wiese, 3=Berg, 4=Garten', ephemeral: true });
      }
      const ort = orte[ortIdx - 1];
      const bal = (db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId))?.balance || 0;
      if (bal < ort.cost) {
        return interaction.reply({ content: `❌ Fang kostet **${ort.cost}** Coins!`, ephemeral: true });
      }

      db.db.prepare('UPDATE economy SET balance = balance - ? WHERE user_id = ?').run(ort.cost, userId);

      const catchRoll = rand(1, 20) + imker.zucht * 2;
      if (catchRoll < 8) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor('#f44336').setDescription(`${ort.emoji} Du suchst im **${ort.name}**...\n\n❌ Kein Bienenvolk gefunden! Versuch es nochmal.\n💰 -${ort.cost} Coins`)] });
      }

      const bieneIdx = rand(ort.range[0], ort.range[1]);
      const biene = BIENEN_ARTEN[bieneIdx];
      const staerke = rand(biene.staerke[0], biene.staerke[1]) + Math.floor(imker.zucht * 1.5);
      const produktion = rand(biene.produktion[0], biene.produktion[1]);

      db.db.prepare('INSERT INTO bienenvoelker (user_id, art, name, staerke, honig_produktion, seltenheit, temperament) VALUES (?, ?, ?, ?, ?, ?, ?)').run(userId, biene.name, biene.name, staerke, produktion, biene.seltenheit, biene.temperament);

      const xpGain = Math.floor(10 + staerke * 0.4);
      let newXp = imker.xp + xpGain;
      let newLevel = imker.level;
      let leveledUp = false;
      while (newXp >= xpForLevel(newLevel)) { newXp -= xpForLevel(newLevel); newLevel++; leveledUp = true; }
      db.db.prepare('UPDATE imkereien SET xp = ?, level = ? WHERE user_id = ?').run(newXp, newLevel, userId);

      const embed = new EmbedBuilder()
        .setTitle(`${ort.emoji} Bienenvolk gefangen!`)
        .setColor('#ffc107')
        .setDescription(`Du hast ein wildes Bienenvolk im **${ort.name}** gefangen!`)
        .addFields(
          { name: '🐝 Art', value: `${biene.emoji} **${biene.name}**`, inline: true },
          { name: '💪 Stärke', value: `${staerke}`, inline: true },
          { name: '🍯 Produktion', value: `${produktion}/Ernte`, inline: true },
          { name: '⭐ Seltenheit', value: biene.seltenheit, inline: true },
          { name: '😊 Temperament', value: biene.temperament, inline: true },
          { name: '⭐ XP', value: `+${xpGain}`, inline: true }
        );
      if (leveledUp) embed.addFields({ name: '🎉 Level Up!', value: `Level ${newLevel}! Rang: ${getRank(newLevel).name}` });
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'voelker') {
      const voelker = db.db.prepare('SELECT * FROM bienenvoelker WHERE user_id = ? ORDER BY staerke DESC LIMIT 15').all(userId);
      if (voelker.length === 0) {
        return interaction.reply({ content: '🐝 Noch keine Bienenvölker! Fange eines.', ephemeral: true });
      }
      const total = db.db.prepare('SELECT COUNT(*) as c FROM bienenvoelker WHERE user_id = ?').get(userId).c;
      const lines = voelker.map(v => {
        const art = BIENEN_ARTEN.find(a => a.name === v.art);
        return `**#${v.id}** ${art?.emoji || '🐝'} ${v.name} — Stk: ${v.staerke} | 🍯 ${v.honig_lager}/${v.honig_produktion} | HP: ${v.gesundheit}%`;
      }).join('\n');
      return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🐝 Deine Bienenvölker').setColor('#ffc107').setDescription(lines).setFooter({ text: `${total} Völker insgesamt` })] });
    }

    if (sub === 'benennen') {
      const id = interaction.options.getInteger('id');
      const name = interaction.options.getString('name').substring(0, 25);
      const volk = db.db.prepare('SELECT * FROM bienenvoelker WHERE id = ? AND user_id = ?').get(id, userId);
      if (!volk) return interaction.reply({ content: '❌ Volk nicht gefunden!', ephemeral: true });
      db.db.prepare('UPDATE bienenvoelker SET name = ? WHERE id = ?').run(name, id);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor('#ffc107').setDescription(`🐝 Dein Volk heißt jetzt **${name}**!`)] });
    }

    if (sub === 'ernten') {
      const volkId = interaction.options.getInteger('id');
      const volk = db.db.prepare('SELECT * FROM bienenvoelker WHERE id = ? AND user_id = ?').get(volkId, userId);
      if (!volk) return interaction.reply({ content: '❌ Volk nicht gefunden!', ephemeral: true });

      const event = ERNTE_EVENTS[rand(0, ERNTE_EVENTS.length - 1)];
      const schleuderBonus = 1 + imker.upgrade_schleuder * 0.15;
      const ernteBonus = 1 + imker.ernte * 0.08;
      const saisonMod = saisonEffekt.produktion;

      const honigBase = Math.floor(volk.honig_produktion * schleuderBonus * ernteBonus * saisonMod * event.modifier);
      const honigGain = Math.max(1, honigBase);

      let wachsGain = 0, pollenGain = 0, geleeGain = 0;
      if (event.wachs) wachsGain = rand(1, 4);
      if (event.pollen) pollenGain = rand(2, 6);
      if (event.gelee) geleeGain = rand(1, 2);

      const stichRisiko = saisonEffekt.stichRisiko - imker.upgrade_rauchgeraet * 0.02;
      const gestochen = Math.random() < stichRisiko || event.stich;

      db.db.prepare('UPDATE bienenvoelker SET honig_lager = honig_lager + ? WHERE id = ?').run(honigGain, volkId);
      db.db.prepare('UPDATE imkereien SET wachs = wachs + ?, pollen = pollen + ?, gelee_royale = gelee_royale + ? WHERE user_id = ?').run(wachsGain, pollenGain, geleeGain, userId);

      const xpGain = Math.floor(5 + honigGain * 0.5);
      let newXp = imker.xp + xpGain;
      let newLevel = imker.level;
      let leveledUp = false;
      while (newXp >= xpForLevel(newLevel)) { newXp -= xpForLevel(newLevel); newLevel++; leveledUp = true; }
      db.db.prepare('UPDATE imkereien SET xp = ?, level = ? WHERE user_id = ?').run(newXp, newLevel, userId);

      const art = BIENEN_ARTEN.find(a => a.name === volk.art);
      const embed = new EmbedBuilder()
        .setTitle(`🍯 Honig geerntet!`)
        .setColor('#ffc107')
        .setDescription(`${event.text}\n\n${art?.emoji || '🐝'} **${volk.name}** liefert Honig!`)
        .addFields(
          { name: '🍯 Honig', value: `+${honigGain} (Lager: ${volk.honig_lager + honigGain})`, inline: true },
          { name: '🌿 Saison', value: `${saison} (x${saisonMod})`, inline: true },
          { name: '⭐ XP', value: `+${xpGain}`, inline: true }
        );
      if (wachsGain > 0) embed.addFields({ name: '🕯️ Wachs', value: `+${wachsGain}`, inline: true });
      if (pollenGain > 0) embed.addFields({ name: '🌼 Pollen', value: `+${pollenGain}`, inline: true });
      if (geleeGain > 0) embed.addFields({ name: '👑 Gelée Royale', value: `+${geleeGain}`, inline: true });
      if (gestochen) embed.addFields({ name: '🐝 Autsch!', value: 'Eine Biene hat dich gestochen!' });
      if (leveledUp) embed.addFields({ name: '🎉 Level Up!', value: `Level ${newLevel}! Rang: ${getRank(newLevel).name}` });
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'verkaufen') {
      const sorteIdx = interaction.options.getInteger('sorte') - 1;
      if (sorteIdx < 0 || sorteIdx >= HONIG_SORTEN.length) {
        return interaction.reply({ content: `❌ Wähle eine Sorte 1-${HONIG_SORTEN.length}!`, ephemeral: true });
      }
      const sorte = HONIG_SORTEN[sorteIdx];
      if (imker.level < sorte.minLevel) {
        return interaction.reply({ content: `❌ Du brauchst Level ${sorte.minLevel} für ${sorte.name}!`, ephemeral: true });
      }

      const totalHonig = db.db.prepare('SELECT COALESCE(SUM(honig_lager), 0) as s FROM bienenvoelker WHERE user_id = ?').get(userId).s;
      const honigCost = 3 + sorteIdx * 2;
      if (totalHonig < honigCost) {
        return interaction.reply({ content: `❌ Du brauchst ${honigCost} Honig-Einheiten! (Hast: ${totalHonig})`, ephemeral: true });
      }

      let remaining = honigCost;
      const voelker = db.db.prepare('SELECT * FROM bienenvoelker WHERE user_id = ? AND honig_lager > 0 ORDER BY honig_lager DESC').all(userId);
      for (const v of voelker) {
        if (remaining <= 0) break;
        const take = Math.min(v.honig_lager, remaining);
        db.db.prepare('UPDATE bienenvoelker SET honig_lager = honig_lager - ? WHERE id = ?').run(take, v.id);
        remaining -= take;
      }

      const kunde = KUNDEN[rand(0, KUNDEN.length - 1)];
      const ladenBonus = 1 + imker.upgrade_laden * 0.12;
      let preis = Math.floor(sorte.wert * ladenBonus);
      let tip = rand(kunde.tip[0], kunde.tip[1]);
      let rufGain = 1;

      if (kunde.pref && sorte.name === kunde.pref) {
        preis = Math.floor(preis * 1.3);
        tip = Math.floor(tip * 1.5);
        rufGain += 1;
      }
      if (kunde.rufBonus) rufGain += kunde.rufBonus;
      if (kunde.mengenBonus) preis = Math.floor(preis * 1.2);

      const totalEarning = preis + tip;
      db.db.prepare('UPDATE economy SET balance = balance + ? WHERE user_id = ?').run(totalEarning, userId);
      db.db.prepare('UPDATE imkereien SET honig_verkauft = honig_verkauft + 1, ruf = ruf + ? WHERE user_id = ?').run(rufGain, userId);

      const embed = new EmbedBuilder()
        .setTitle('🛒 Honig verkauft!')
        .setColor('#4caf50')
        .setDescription(`${kunde.emoji} **${kunde.name}** kauft deinen Honig!`)
        .addFields(
          { name: '🍯 Sorte', value: `${sorte.emoji} ${sorte.name}`, inline: true },
          { name: '💰 Preis', value: `${preis} Coins`, inline: true },
          { name: '💝 Trinkgeld', value: `${tip} Coins`, inline: true },
          { name: '💵 Gesamt', value: `**${totalEarning}** Coins`, inline: true },
          { name: '⭐ Ruf', value: `+${rufGain}`, inline: true }
        );
      if (kunde.pref && sorte.name === kunde.pref) {
        embed.addFields({ name: '❤️ Lieblingssorte!', value: `${kunde.name} liebt ${sorte.name}!` });
      }
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'trainieren') {
      const skill = interaction.options.getString('skill').toLowerCase();
      const validSkills = { wissen: 'wissen', pflege: 'pflege', zucht: 'zucht', ernte: 'ernte' };
      if (!validSkills[skill]) {
        return interaction.reply({ content: '❌ Wähle: `wissen`, `pflege`, `zucht` oder `ernte`', ephemeral: true });
      }
      const field = validSkills[skill];
      const currentVal = imker[field];
      const cost = currentVal * 75 + 100;
      const bal = (db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId))?.balance || 0;
      if (bal < cost) {
        return interaction.reply({ content: `❌ Training kostet **${cost}** Coins!`, ephemeral: true });
      }
      const gain = rand(1, 2);
      db.db.prepare(`UPDATE imkereien SET ${field} = ${field} + ? WHERE user_id = ?`).run(gain, userId);
      db.db.prepare('UPDATE economy SET balance = balance - ? WHERE user_id = ?').run(cost, userId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor('#ffc107').setDescription(`🏋️ **${skill.charAt(0).toUpperCase() + skill.slice(1)}** trainiert! +${gain} (jetzt ${currentVal + gain})\n💰 -${cost} Coins`)] });
    }

    if (sub === 'upgrade') {
      const item = interaction.options.getString('item').toLowerCase();
      const upg = UPGRADES[item];
      if (!upg) {
        return interaction.reply({ content: '❌ Wähle: `schleuder`, `rauchgeraet`, `lager` oder `laden`', ephemeral: true });
      }
      const currentLv = imker[upg.field];
      if (currentLv >= upg.costs.length) {
        return interaction.reply({ content: `❌ ${upg.name} ist bereits auf Max-Level!`, ephemeral: true });
      }
      const cost = upg.costs[currentLv];
      const bal = (db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId))?.balance || 0;
      if (bal < cost) {
        return interaction.reply({ content: `❌ Upgrade kostet **${cost.toLocaleString()}** Coins!`, ephemeral: true });
      }
      db.db.prepare(`UPDATE imkereien SET ${upg.field} = ${upg.field} + 1 WHERE user_id = ?`).run(userId);
      db.db.prepare('UPDATE economy SET balance = balance - ? WHERE user_id = ?').run(cost, userId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor('#ffc107').setDescription(`🔧 **${upg.name}** auf Level ${currentLv + 1} verbessert!\n${upg.desc}\n💰 -${cost.toLocaleString()} Coins`)] });
    }

    if (sub === 'wettbewerb') {
      const opponent = interaction.options.getUser('gegner');
      if (opponent.id === userId) return interaction.reply({ content: '❌ Du kannst nicht gegen dich selbst antreten!', ephemeral: true });
      if (opponent.bot) return interaction.reply({ content: '❌ Bots sind keine Imker!', ephemeral: true });

      const oppImker = db.db.prepare('SELECT * FROM imkereien WHERE user_id = ?').get(opponent.id);
      if (!oppImker) return interaction.reply({ content: '❌ Dein Gegner hat keine Imkerei!', ephemeral: true });

      const myScore = imker.level * 5 + imker.ruf * 2 + imker.ernte * 3 + imker.wissen * 2 + rand(1, 25);
      const oppScore = oppImker.level * 5 + oppImker.ruf * 2 + oppImker.ernte * 3 + oppImker.wissen * 2 + rand(1, 25);

      const won = myScore > oppScore;
      const coinPrize = Math.floor((imker.level + oppImker.level) * 22 + rand(50, 180));
      const rufPrize = rand(2, 4);

      if (won) {
        db.db.prepare('UPDATE economy SET balance = balance + ? WHERE user_id = ?').run(coinPrize, userId);
        db.db.prepare('UPDATE imkereien SET ruf = ruf + ? WHERE user_id = ?').run(rufPrize, userId);
      }

      const embed = new EmbedBuilder()
        .setTitle('🏆 Honig-Wettbewerb!')
        .setColor(won ? '#4caf50' : '#f44336')
        .setDescription(`**${imker.name}** vs **${oppImker.name}**`)
        .addFields(
          { name: imker.name, value: `🍯 Punkte: ${myScore}`, inline: true },
          { name: oppImker.name, value: `🍯 Punkte: ${oppScore}`, inline: true },
          { name: '🏆 Ergebnis', value: won ? `**${imker.name}** gewinnt!\n💰 +${coinPrize} Coins | ⭐ +${rufPrize} Ruf` : `**${oppImker.name}** gewinnt!\nÜbe weiter!` }
        );
      return interaction.reply({ embeds: [embed] });
    }
  }
};
