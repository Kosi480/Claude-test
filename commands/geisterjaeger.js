const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

const cooldowns = new Map();

function ensureGhostTables() {
  db.db.exec(`CREATE TABLE IF NOT EXISTS ghost_hunters (
    user_id TEXT PRIMARY KEY,
    name TEXT DEFAULT 'Geisterjäger',
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    coins_earned INTEGER DEFAULT 0,
    ghosts_caught INTEGER DEFAULT 0,
    missions_done INTEGER DEFAULT 0,
    ektoplasma INTEGER DEFAULT 0,
    mut INTEGER DEFAULT 1,
    technik INTEGER DEFAULT 1,
    spuersinn INTEGER DEFAULT 1,
    wissen INTEGER DEFAULT 1,
    equipment_emf INTEGER DEFAULT 0,
    equipment_falle INTEGER DEFAULT 0,
    equipment_kamera INTEGER DEFAULT 0,
    equipment_schutz INTEGER DEFAULT 0,
    active_ghost TEXT DEFAULT NULL,
    last_hunt TEXT DEFAULT NULL
  )`);
  db.db.exec(`CREATE TABLE IF NOT EXISTS ghost_collection (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    ghost_type TEXT,
    name TEXT,
    power INTEGER,
    rarity TEXT,
    caught_at TEXT DEFAULT (datetime('now'))
  )`);
}

const GHOST_TYPES = [
  { name: 'Irrlichter', emoji: '🔵', power: [5, 15], rarity: 'Gewöhnlich', xp: 10, coins: [30, 80] },
  { name: 'Schatten', emoji: '👤', power: [10, 25], rarity: 'Gewöhnlich', xp: 15, coins: [50, 120] },
  { name: 'Klopfgeist', emoji: '👊', power: [15, 35], rarity: 'Gewöhnlich', xp: 20, coins: [80, 160] },
  { name: 'Nebelfigur', emoji: '🌫️', power: [20, 45], rarity: 'Ungewöhnlich', xp: 30, coins: [120, 250] },
  { name: 'Poltergeist', emoji: '💥', power: [30, 60], rarity: 'Ungewöhnlich', xp: 45, coins: [200, 400] },
  { name: 'Spukgestalt', emoji: '👻', power: [40, 75], rarity: 'Selten', xp: 60, coins: [300, 550] },
  { name: 'Banshee', emoji: '😱', power: [50, 90], rarity: 'Selten', xp: 80, coins: [400, 700] },
  { name: 'Wiedergänger', emoji: '🧟', power: [60, 100], rarity: 'Episch', xp: 100, coins: [500, 900] },
  { name: 'Schattenlord', emoji: '🖤', power: [80, 130], rarity: 'Episch', xp: 130, coins: [700, 1200] },
  { name: 'Totenfürst', emoji: '💀', power: [100, 160], rarity: 'Legendär', xp: 170, coins: [1000, 1800] },
  { name: 'Phantomkönig', emoji: '👑', power: [130, 200], rarity: 'Legendär', xp: 220, coins: [1500, 2500] },
  { name: 'Dimensionsriss-Geist', emoji: '🌀', power: [170, 250], rarity: 'Mythisch', xp: 300, coins: [2000, 3500] }
];

const LOCATIONS = [
  { name: 'Verlassenes Haus', emoji: '🏚️', minLevel: 1, ghostRange: [0, 3], danger: 1 },
  { name: 'Alter Friedhof', emoji: '⚰️', minLevel: 2, ghostRange: [1, 4], danger: 2 },
  { name: 'Ruine', emoji: '🏰', minLevel: 3, ghostRange: [2, 5], danger: 3 },
  { name: 'Verlassene Klinik', emoji: '🏥', minLevel: 5, ghostRange: [3, 6], danger: 4 },
  { name: 'Katakomben', emoji: '🕳️', minLevel: 7, ghostRange: [4, 7], danger: 5 },
  { name: 'Geisterschiff', emoji: '🚢', minLevel: 9, ghostRange: [5, 8], danger: 6 },
  { name: 'Spukschloss', emoji: '🏰', minLevel: 12, ghostRange: [6, 9], danger: 7 },
  { name: 'Dimensionsportal', emoji: '🌀', minLevel: 15, ghostRange: [8, 11], danger: 9 }
];

const HUNT_EVENTS = [
  { text: 'Du hörst unheimliche Schritte hinter dir...', modifier: 0 },
  { text: 'Dein EMF-Detektor schlägt wild aus!', modifier: 2 },
  { text: 'Eine kalte Brise streift dein Gesicht.', modifier: 1 },
  { text: 'Du findest eine alte Geisterfalle mit Ektoplasma!', modifier: 0, ekto: true },
  { text: 'Ein Geist versucht dich zu erschrecken — du bleibst standhaft!', modifier: 3 },
  { text: 'Deine Ausrüstung flackert kurz... dann stabilisiert sie sich.', modifier: -1 },
  { text: 'Du entdeckst ein Geisterportal!', modifier: 4 },
  { text: 'Nebel umhüllt dich — dein Spürsinn leitet dich.', modifier: 2 },
  { text: 'Ein anderer Jäger hat hier schon geräumt — weniger Beute.', modifier: -2 },
  { text: 'Du findest ein altes Jäger-Tagebuch mit wertvollen Hinweisen!', modifier: 3 }
];

const RANKS = [
  { name: 'Geisterlehrling', minLevel: 1 },
  { name: 'Spukjäger', minLevel: 3 },
  { name: 'Geisterfänger', minLevel: 5 },
  { name: 'Exorzist', minLevel: 8 },
  { name: 'Phantomjäger', minLevel: 12 },
  { name: 'Geistermeister', minLevel: 16 },
  { name: 'Seelenwächter', minLevel: 20 },
  { name: 'Dimensionshüter', minLevel: 25 }
];

const UPGRADES = {
  emf: { name: 'EMF-Detektor', field: 'equipment_emf', costs: [500, 1200, 2500, 5000, 10000], desc: '+Spürsinn beim Jagen' },
  falle: { name: 'Geisterfalle', field: 'equipment_falle', costs: [600, 1500, 3000, 6000, 12000], desc: '+Fangchance' },
  kamera: { name: 'Spektralkamera', field: 'equipment_kamera', costs: [400, 1000, 2000, 4500, 9000], desc: '+Beute & XP' },
  schutz: { name: 'Schutzamulett', field: 'equipment_schutz', costs: [800, 1800, 3500, 7000, 14000], desc: '-Gefahr & +Mut' }
};

function getRank(level) {
  let rank = RANKS[0];
  for (const r of RANKS) {
    if (level >= r.minLevel) rank = r;
  }
  return rank;
}

function xpForLevel(level) {
  return Math.floor(80 * Math.pow(level, 1.5));
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const RARITY_COLORS = {
  'Gewöhnlich': '#9e9e9e',
  'Ungewöhnlich': '#4caf50',
  'Selten': '#2196f3',
  'Episch': '#9c27b0',
  'Legendär': '#ff9800',
  'Mythisch': '#e91e63'
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('geisterjaeger')
    .setDescription('👻 Werde ein Geisterjäger und fange übernatürliche Wesen!')
    .addSubcommand(s => s.setName('profil').setDescription('Zeige dein Geisterjäger-Profil'))
    .addSubcommand(s => s.setName('name').setDescription('Benenne dich um')
      .addStringOption(o => o.setName('name').setDescription('Dein Jägername').setRequired(true)))
    .addSubcommand(s => s.setName('jagen').setDescription('Gehe auf Geisterjagd an einem Ort')
      .addIntegerOption(o => o.setName('ort').setDescription('Ortsnummer (1-8)').setRequired(true)))
    .addSubcommand(s => s.setName('fangen').setDescription('Versuche den aktiven Geist zu fangen'))
    .addSubcommand(s => s.setName('sammlung').setDescription('Zeige deine Geistersammlung'))
    .addSubcommand(s => s.setName('trainieren').setDescription('Trainiere eine Fähigkeit')
      .addStringOption(o => o.setName('skill').setDescription('mut/technik/spuersinn/wissen').setRequired(true)))
    .addSubcommand(s => s.setName('upgrade').setDescription('Verbessere deine Ausrüstung')
      .addStringOption(o => o.setName('item').setDescription('emf/falle/kamera/schutz').setRequired(true)))
    .addSubcommand(s => s.setName('orte').setDescription('Zeige alle Jagdorte'))
    .addSubcommand(s => s.setName('exorzismus').setDescription('Exorziere einen Geist für Ektoplasma')
      .addIntegerOption(o => o.setName('id').setDescription('Geist-ID aus Sammlung').setRequired(true)))
    .addSubcommand(s => s.setName('duell').setDescription('Geisterjäger-Duell gegen einen anderen Spieler')
      .addUserOption(o => o.setName('gegner').setDescription('Dein Gegner').setRequired(true))),

  async execute(interaction) {
    ensureGhostTables();
    const config = require('../config.json');
    const userId = interaction.user.id;
    const sub = interaction.options.getSubcommand();

    const now = Date.now();
    const cdKey = `${userId}-${sub}`;
    const cdTime = sub === 'jagen' ? 30000 : sub === 'duell' ? 60000 : 5000;
    if (cooldowns.has(cdKey) && now - cooldowns.get(cdKey) < cdTime) {
      const left = Math.ceil((cdTime - (now - cooldowns.get(cdKey))) / 1000);
      return interaction.reply({ content: `⏳ Cooldown: **${left}s**`, ephemeral: true });
    }
    cooldowns.set(cdKey, now);

    let hunter = db.db.prepare('SELECT * FROM ghost_hunters WHERE user_id = ?').get(userId);
    if (!hunter && sub !== 'profil' && sub !== 'orte') {
      hunter = { user_id: userId, name: 'Geisterjäger', level: 1, xp: 0, coins_earned: 0, ghosts_caught: 0, missions_done: 0, ektoplasma: 0, mut: 1, technik: 1, spuersinn: 1, wissen: 1, equipment_emf: 0, equipment_falle: 0, equipment_kamera: 0, equipment_schutz: 0, active_ghost: null };
      db.db.prepare('INSERT INTO ghost_hunters (user_id) VALUES (?)').run(userId);
    }

    if (sub === 'profil') {
      if (!hunter) {
        db.db.prepare('INSERT INTO ghost_hunters (user_id) VALUES (?)').run(userId);
        hunter = db.db.prepare('SELECT * FROM ghost_hunters WHERE user_id = ?').get(userId);
      }
      const rank = getRank(hunter.level);
      const xpNeeded = xpForLevel(hunter.level);
      const bal = (db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId))?.balance || 0;
      const ghostCount = db.db.prepare('SELECT COUNT(*) as c FROM ghost_collection WHERE user_id = ?').get(userId).c;

      const embed = new EmbedBuilder()
        .setTitle(`👻 ${hunter.name}`)
        .setColor('#6a1b9a')
        .addFields(
          { name: '📊 Rang', value: `${rank.name} (Lv. ${hunter.level})`, inline: true },
          { name: '⭐ XP', value: `${hunter.xp}/${xpNeeded}`, inline: true },
          { name: '💰 Coins', value: bal.toLocaleString(), inline: true },
          { name: '🧪 Ektoplasma', value: `${hunter.ektoplasma}`, inline: true },
          { name: '👻 Gefangen', value: `${hunter.ghosts_caught}`, inline: true },
          { name: '📋 Missionen', value: `${hunter.missions_done}`, inline: true },
          { name: '💪 Fähigkeiten', value: `Mut: ${hunter.mut} | Technik: ${hunter.technik}\nSpürsinn: ${hunter.spuersinn} | Wissen: ${hunter.wissen}`, inline: false },
          { name: '🔧 Ausrüstung', value: `EMF: Lv.${hunter.equipment_emf} | Falle: Lv.${hunter.equipment_falle}\nKamera: Lv.${hunter.equipment_kamera} | Schutz: Lv.${hunter.equipment_schutz}`, inline: false },
          { name: '📦 Sammlung', value: `${ghostCount} Geister`, inline: true }
        );
      if (hunter.active_ghost) {
        embed.addFields({ name: '⚡ Aktiver Geist', value: hunter.active_ghost, inline: true });
      }
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'name') {
      const name = interaction.options.getString('name').substring(0, 30);
      db.db.prepare('UPDATE ghost_hunters SET name = ? WHERE user_id = ?').run(name, userId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor('#6a1b9a').setDescription(`👻 Du heißt jetzt **${name}**!`)] });
    }

    if (sub === 'orte') {
      const lines = LOCATIONS.map((l, i) => {
        const ghosts = GHOST_TYPES.slice(l.ghostRange[0], l.ghostRange[1] + 1).map(g => g.emoji).join('');
        return `**${i + 1}.** ${l.emoji} ${l.name} — Ab Lv.${l.minLevel} | Gefahr: ${'⚠️'.repeat(Math.min(l.danger, 5))} | ${ghosts}`;
      }).join('\n');
      return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🗺️ Jagdorte').setColor('#6a1b9a').setDescription(lines)] });
    }

    if (sub === 'jagen') {
      const ortIdx = interaction.options.getInteger('ort') - 1;
      if (ortIdx < 0 || ortIdx >= LOCATIONS.length) {
        return interaction.reply({ content: `❌ Ungültiger Ort! Wähle 1-${LOCATIONS.length}.`, ephemeral: true });
      }
      const loc = LOCATIONS[ortIdx];
      if (hunter.level < loc.minLevel) {
        return interaction.reply({ content: `❌ Du brauchst Level ${loc.minLevel} für ${loc.name}!`, ephemeral: true });
      }

      const event = HUNT_EVENTS[rand(0, HUNT_EVENTS.length - 1)];
      const ghostIdx = rand(loc.ghostRange[0], loc.ghostRange[1]);
      const ghostType = GHOST_TYPES[ghostIdx];
      const ghostPower = rand(ghostType.power[0], ghostType.power[1]);

      const spuersinnBonus = hunter.spuersinn + hunter.equipment_emf * 2;
      const dangerRoll = rand(1, 20);
      const schutzBonus = hunter.equipment_schutz * 2 + hunter.mut;
      const survived = dangerRoll + schutzBonus > loc.danger * 2;

      let ektoBonus = 0;
      if (event.ekto) ektoBonus = rand(3, 8);

      if (!survived) {
        const lostEkto = Math.min(hunter.ektoplasma, rand(2, 5));
        db.db.prepare('UPDATE ghost_hunters SET ektoplasma = ektoplasma - ?, missions_done = missions_done + 1 WHERE user_id = ?').run(lostEkto, userId);
        const embed = new EmbedBuilder()
          .setTitle(`${loc.emoji} Jagd: ${loc.name}`)
          .setColor('#f44336')
          .setDescription(`${event.text}\n\n😵 Der Geist war zu stark! Du wurdest vertrieben!\n🧪 -${lostEkto} Ektoplasma verloren`)
          .addFields({ name: '👻 Geist', value: `${ghostType.emoji} ${ghostType.name} (Stärke: ${ghostPower})` });
        return interaction.reply({ embeds: [embed] });
      }

      const activeGhostData = JSON.stringify({ type: ghostType.name, emoji: ghostType.emoji, power: ghostPower, rarity: ghostType.rarity, xp: ghostType.xp, coins: ghostType.coins, modifier: event.modifier });
      db.db.prepare('UPDATE ghost_hunters SET active_ghost = ?, missions_done = missions_done + 1, ektoplasma = ektoplasma + ? WHERE user_id = ?').run(activeGhostData, ektoBonus, userId);

      const embed = new EmbedBuilder()
        .setTitle(`${loc.emoji} Jagd: ${loc.name}`)
        .setColor(RARITY_COLORS[ghostType.rarity] || '#6a1b9a')
        .setDescription(`${event.text}\n\n🔍 Du hast einen Geist entdeckt!`)
        .addFields(
          { name: '👻 Geist', value: `${ghostType.emoji} **${ghostType.name}**`, inline: true },
          { name: '💪 Stärke', value: `${ghostPower}`, inline: true },
          { name: '⭐ Seltenheit', value: ghostType.rarity, inline: true }
        )
        .setFooter({ text: 'Nutze /geisterjaeger fangen um den Geist einzufangen!' });
      if (ektoBonus > 0) embed.addFields({ name: '🧪 Bonus', value: `+${ektoBonus} Ektoplasma gefunden!` });
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'fangen') {
      if (!hunter.active_ghost) {
        return interaction.reply({ content: '❌ Kein aktiver Geist! Gehe erst auf Jagd.', ephemeral: true });
      }

      const ghost = JSON.parse(hunter.active_ghost);
      const fallenBonus = hunter.equipment_falle * 3;
      const technikBonus = hunter.technik * 2;
      const catchRoll = rand(1, 20) + fallenBonus + technikBonus + (ghost.modifier || 0);
      const difficulty = ghost.power * 0.6;
      const caught = catchRoll >= difficulty;

      if (!caught) {
        db.db.prepare('UPDATE ghost_hunters SET active_ghost = NULL WHERE user_id = ?').run(userId);
        return interaction.reply({ embeds: [new EmbedBuilder().setColor('#f44336').setDescription(`${ghost.emoji} **${ghost.type}** ist entkommen!\n\n🎲 Wurf: ${catchRoll} vs Schwierigkeit: ${Math.floor(difficulty)}\nVerbessere deine Falle und Technik!`)] });
      }

      const kameraBonus = 1 + hunter.equipment_kamera * 0.15;
      const wissenBonus = 1 + hunter.wissen * 0.05;
      const coinReward = Math.floor(rand(ghost.coins[0], ghost.coins[1]) * kameraBonus * wissenBonus);
      const xpReward = Math.floor(ghost.xp * kameraBonus);
      const ektoReward = rand(1, 3) + Math.floor(ghost.power / 30);

      db.db.prepare('INSERT INTO ghost_collection (user_id, ghost_type, name, power, rarity) VALUES (?, ?, ?, ?, ?)').run(userId, ghost.type, ghost.type, ghost.power, ghost.rarity);

      let newXp = hunter.xp + xpReward;
      let newLevel = hunter.level;
      let leveledUp = false;
      while (newXp >= xpForLevel(newLevel)) {
        newXp -= xpForLevel(newLevel);
        newLevel++;
        leveledUp = true;
      }

      db.db.prepare('UPDATE ghost_hunters SET active_ghost = NULL, xp = ?, level = ?, ghosts_caught = ghosts_caught + 1, ektoplasma = ektoplasma + ?, coins_earned = coins_earned + ? WHERE user_id = ?').run(newXp, newLevel, ektoReward, coinReward, userId);
      db.db.prepare('UPDATE economy SET balance = balance + ? WHERE user_id = ?').run(coinReward, userId);

      const embed = new EmbedBuilder()
        .setTitle(`👻 Geist gefangen!`)
        .setColor(RARITY_COLORS[ghost.rarity] || '#4caf50')
        .setDescription(`${ghost.emoji} **${ghost.type}** wurde eingefangen!`)
        .addFields(
          { name: '💪 Stärke', value: `${ghost.power}`, inline: true },
          { name: '⭐ Seltenheit', value: ghost.rarity, inline: true },
          { name: '💰 Belohnung', value: `${coinReward.toLocaleString()} Coins`, inline: true },
          { name: '⭐ XP', value: `+${xpReward}`, inline: true },
          { name: '🧪 Ektoplasma', value: `+${ektoReward}`, inline: true }
        );
      if (leveledUp) embed.addFields({ name: '🎉 Level Up!', value: `Level ${newLevel}! Rang: ${getRank(newLevel).name}` });
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'sammlung') {
      const ghosts = db.db.prepare('SELECT * FROM ghost_collection WHERE user_id = ? ORDER BY power DESC LIMIT 15').all(userId);
      if (ghosts.length === 0) {
        return interaction.reply({ content: '📦 Deine Sammlung ist leer. Gehe auf Jagd!', ephemeral: true });
      }
      const total = db.db.prepare('SELECT COUNT(*) as c FROM ghost_collection WHERE user_id = ?').get(userId).c;
      const lines = ghosts.map(g => {
        const gt = GHOST_TYPES.find(t => t.name === g.ghost_type);
        return `**#${g.id}** ${gt?.emoji || '👻'} ${g.name} — Stärke: ${g.power} | ${g.rarity}`;
      }).join('\n');
      return interaction.reply({ embeds: [new EmbedBuilder().setTitle('📦 Geistersammlung').setColor('#6a1b9a').setDescription(lines).setFooter({ text: `${total} Geister insgesamt` })] });
    }

    if (sub === 'trainieren') {
      const skill = interaction.options.getString('skill').toLowerCase();
      const validSkills = { mut: 'mut', technik: 'technik', spuersinn: 'spuersinn', wissen: 'wissen' };
      if (!validSkills[skill]) {
        return interaction.reply({ content: '❌ Wähle: `mut`, `technik`, `spuersinn` oder `wissen`', ephemeral: true });
      }
      const field = validSkills[skill];
      const currentVal = hunter[field];
      const cost = currentVal * 80 + 100;
      const bal = (db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId))?.balance || 0;
      if (bal < cost) {
        return interaction.reply({ content: `❌ Zu wenig Coins! Training kostet **${cost}** Coins.`, ephemeral: true });
      }
      const gain = rand(1, 2);
      db.db.prepare(`UPDATE ghost_hunters SET ${field} = ${field} + ? WHERE user_id = ?`).run(gain, userId);
      db.db.prepare('UPDATE economy SET balance = balance - ? WHERE user_id = ?').run(cost, userId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor('#6a1b9a').setDescription(`🏋️ **${skill.charAt(0).toUpperCase() + skill.slice(1)}** trainiert! +${gain} (jetzt ${currentVal + gain})\n💰 -${cost} Coins`)] });
    }

    if (sub === 'upgrade') {
      const item = interaction.options.getString('item').toLowerCase();
      const upg = UPGRADES[item];
      if (!upg) {
        return interaction.reply({ content: '❌ Wähle: `emf`, `falle`, `kamera` oder `schutz`', ephemeral: true });
      }
      const currentLv = hunter[upg.field];
      if (currentLv >= upg.costs.length) {
        return interaction.reply({ content: `❌ ${upg.name} ist bereits auf Max-Level!`, ephemeral: true });
      }
      const cost = upg.costs[currentLv];
      const bal = (db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId))?.balance || 0;
      if (bal < cost) {
        return interaction.reply({ content: `❌ Zu wenig Coins! Upgrade kostet **${cost.toLocaleString()}** Coins.`, ephemeral: true });
      }
      db.db.prepare(`UPDATE ghost_hunters SET ${upg.field} = ${upg.field} + 1 WHERE user_id = ?`).run(userId);
      db.db.prepare('UPDATE economy SET balance = balance - ? WHERE user_id = ?').run(cost, userId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor('#6a1b9a').setDescription(`🔧 **${upg.name}** auf Level ${currentLv + 1} verbessert!\n${upg.desc}\n💰 -${cost.toLocaleString()} Coins`)] });
    }

    if (sub === 'exorzismus') {
      const ghostId = interaction.options.getInteger('id');
      const ghost = db.db.prepare('SELECT * FROM ghost_collection WHERE id = ? AND user_id = ?').get(ghostId, userId);
      if (!ghost) {
        return interaction.reply({ content: '❌ Geist nicht gefunden oder gehört dir nicht!', ephemeral: true });
      }
      const ektoGain = Math.floor(ghost.power / 10) + rand(1, 5);
      const wissenBonus = Math.floor(hunter.wissen * 0.5);
      const totalEkto = ektoGain + wissenBonus;

      db.db.prepare('DELETE FROM ghost_collection WHERE id = ?').run(ghostId);
      db.db.prepare('UPDATE ghost_hunters SET ektoplasma = ektoplasma + ? WHERE user_id = ?').run(totalEkto, userId);

      const gt = GHOST_TYPES.find(t => t.name === ghost.ghost_type);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor('#9c27b0').setDescription(`🔮 ${gt?.emoji || '👻'} **${ghost.name}** exorziert!\n\n🧪 +${totalEkto} Ektoplasma erhalten\n(${ektoGain} Basis + ${wissenBonus} Wissen-Bonus)`)] });
    }

    if (sub === 'duell') {
      const opponent = interaction.options.getUser('gegner');
      if (opponent.id === userId) return interaction.reply({ content: '❌ Du kannst nicht gegen dich selbst kämpfen!', ephemeral: true });
      if (opponent.bot) return interaction.reply({ content: '❌ Du kannst nicht gegen Bots kämpfen!', ephemeral: true });

      const oppHunter = db.db.prepare('SELECT * FROM ghost_hunters WHERE user_id = ?').get(opponent.id);
      if (!oppHunter) return interaction.reply({ content: '❌ Dein Gegner ist kein Geisterjäger!', ephemeral: true });

      const myPower = hunter.mut * 3 + hunter.technik * 2 + hunter.spuersinn * 2 + hunter.wissen + hunter.level * 5 + rand(1, 20);
      const oppPower = oppHunter.mut * 3 + oppHunter.technik * 2 + oppHunter.spuersinn * 2 + oppHunter.wissen + oppHunter.level * 5 + rand(1, 20);

      const won = myPower > oppPower;
      const coinPrize = Math.floor((hunter.level + oppHunter.level) * 25 + rand(50, 200));
      const xpPrize = Math.floor((hunter.level + oppHunter.level) * 5);

      if (won) {
        db.db.prepare('UPDATE economy SET balance = balance + ? WHERE user_id = ?').run(coinPrize, userId);
        let newXp = hunter.xp + xpPrize;
        let newLevel = hunter.level;
        while (newXp >= xpForLevel(newLevel)) { newXp -= xpForLevel(newLevel); newLevel++; }
        db.db.prepare('UPDATE ghost_hunters SET xp = ?, level = ? WHERE user_id = ?').run(newXp, newLevel, userId);
      }

      const embed = new EmbedBuilder()
        .setTitle('⚔️ Geisterjäger-Duell')
        .setColor(won ? '#4caf50' : '#f44336')
        .setDescription(`**${hunter.name}** vs **${oppHunter.name}**`)
        .addFields(
          { name: hunter.name, value: `💪 Stärke: ${myPower}`, inline: true },
          { name: oppHunter.name, value: `💪 Stärke: ${oppPower}`, inline: true },
          { name: '🏆 Ergebnis', value: won ? `**${hunter.name}** gewinnt!\n💰 +${coinPrize} Coins | ⭐ +${xpPrize} XP` : `**${oppHunter.name}** gewinnt!\nBesser nächstes Mal...` }
        );
      return interaction.reply({ embeds: [embed] });
    }
  }
};
