const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const COOLDOWN = 3 * 60 * 1000;
const cooldowns = new Map();

const vehicles = [
  { id: 'fahrrad', name: 'Fahrrad', emoji: '🚲', speed: 1, cost: 0 },
  { id: 'roller', name: 'Roller', emoji: '🛵', speed: 2, cost: 500 },
  { id: 'auto', name: 'Auto', emoji: '🚗', speed: 3, cost: 2000 },
  { id: 'sportwagen', name: 'Sportwagen', emoji: '🏎️', speed: 5, cost: 8000 },
  { id: 'rakete', name: 'Rakete', emoji: '🚀', speed: 8, cost: 25000 },
];

const tracks = [
  { name: 'Stadtstraße', emoji: '🏙️', length: 20, minBet: 50, events: ['ampel', 'stau', 'abkürzung'] },
  { name: 'Bergstrecke', emoji: '⛰️', length: 25, minBet: 200, events: ['steinschlag', 'kurve', 'turbo'] },
  { name: 'Wüstenrallye', emoji: '🏜️', length: 30, minBet: 500, events: ['sandsturm', 'oase', 'mirage'] },
];

const raceEvents = {
  ampel: { text: 'wartet an einer roten Ampel!', effect: -2, emoji: '🚦' },
  stau: { text: 'steckt im Stau fest!', effect: -3, emoji: '🚗' },
  abkürzung: { text: 'nimmt eine Abkürzung!', effect: 3, emoji: '🛤️' },
  steinschlag: { text: 'weicht Steinschlag aus!', effect: -2, emoji: '🪨' },
  kurve: { text: 'driftet perfekt durch die Kurve!', effect: 2, emoji: '🔄' },
  turbo: { text: 'findet einen Turbo-Boost!', effect: 4, emoji: '💨' },
  sandsturm: { text: 'kämpft gegen einen Sandsturm!', effect: -3, emoji: '🌪️' },
  oase: { text: 'erfrischt sich an einer Oase!', effect: 2, emoji: '🏝️' },
  mirage: { text: 'verliert die Orientierung in einer Fata Morgana!', effect: -1, emoji: '🌫️' },
};

function ensureVehicleTable() {
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS player_vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      vehicle_id TEXT NOT NULL,
      upgrade_level INTEGER DEFAULT 0,
      races_won INTEGER DEFAULT 0,
      UNIQUE(user_id, vehicle_id)
    )
  `);
}

function getPlayerVehicle(userId) {
  const owned = db.db.prepare('SELECT * FROM player_vehicles WHERE user_id = ? ORDER BY upgrade_level DESC').all(userId);
  if (owned.length === 0) {
    db.db.prepare('INSERT OR IGNORE INTO player_vehicles (user_id, vehicle_id) VALUES (?, ?)').run(userId, 'fahrrad');
    return { vehicle_id: 'fahrrad', upgrade_level: 0, races_won: 0 };
  }
  return owned[0];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rennen')
    .setDescription('Fahre Rennen mit deinem Fahrzeug!')
    .addSubcommand(sub =>
      sub.setName('starten')
        .setDescription('Starte ein Rennen!')
        .addStringOption(opt =>
          opt.setName('strecke')
            .setDescription('Welche Strecke?')
            .setRequired(true)
            .addChoices(
              { name: '🏙️ Stadtstraße (50$ min)', value: '0' },
              { name: '⛰️ Bergstrecke (200$ min)', value: '1' },
              { name: '🏜️ Wüstenrallye (500$ min)', value: '2' },
            ))
        .addIntegerOption(opt =>
          opt.setName('einsatz')
            .setDescription('Dein Einsatz')
            .setRequired(true)
            .setMinValue(50)))
    .addSubcommand(sub =>
      sub.setName('garage')
        .setDescription('Zeige deine Fahrzeuge'))
    .addSubcommand(sub =>
      sub.setName('kaufen')
        .setDescription('Kaufe ein Fahrzeug')
        .addStringOption(opt =>
          opt.setName('fahrzeug')
            .setDescription('Welches Fahrzeug?')
            .setRequired(true)
            .addChoices(
              { name: '🛵 Roller (500$)', value: 'roller' },
              { name: '🚗 Auto (2.000$)', value: 'auto' },
              { name: '🏎️ Sportwagen (8.000$)', value: 'sportwagen' },
              { name: '🚀 Rakete (25.000$)', value: 'rakete' },
            )))
    .addSubcommand(sub =>
      sub.setName('tuning')
        .setDescription('Upgrade dein Fahrzeug')
        .addStringOption(opt =>
          opt.setName('fahrzeug')
            .setDescription('Welches upgraden?')
            .setRequired(true)
            .addChoices(
              ...vehicles.map(v => ({ name: `${v.emoji} ${v.name}`, value: v.id }))
            ))),
  async execute(interaction) {
    ensureVehicleTable();
    const userId = interaction.user.id;
    const config = require('../config.json');
    const action = interaction.options.getSubcommand();

    if (action === 'starten') {
      const lastPlay = cooldowns.get(userId);
      if (lastPlay && Date.now() - lastPlay < COOLDOWN) {
        const remaining = Math.ceil((COOLDOWN - (Date.now() - lastPlay)) / 1000);
        return interaction.reply(`⏳ Du musst noch **${remaining}s** warten!`);
      }

      const trackIdx = parseInt(interaction.options.getString('strecke'));
      const track = tracks[trackIdx];
      const bet = interaction.options.getInteger('einsatz');

      if (bet < track.minBet) {
        return interaction.reply(`❌ Mindesteinsatz für **${track.emoji} ${track.name}**: **${config.currencySymbol}${track.minBet}**!`);
      }
      if (db.getBalance(userId) < bet) {
        return interaction.reply(`❌ Du brauchst **${config.currencySymbol}${bet.toLocaleString()}**!`);
      }

      cooldowns.set(userId, Date.now());
      db.updateBalance(userId, -bet);

      const pVehicle = getPlayerVehicle(userId);
      const vInfo = vehicles.find(v => v.id === pVehicle.vehicle_id);
      const playerSpeed = vInfo.speed + pVehicle.upgrade_level * 0.5;

      const opponents = [
        { name: 'Bot-Racer', emoji: '🤖', speed: 2 + Math.random() * 3, position: 0 },
        { name: 'Turbo-Tim', emoji: '👨‍🦰', speed: 3 + Math.random() * 3, position: 0 },
        { name: 'Speed-Sara', emoji: '👩‍🦰', speed: 2.5 + Math.random() * 4, position: 0 },
      ];

      let playerPos = 0;
      let raceLog = [];
      let round = 0;

      while (playerPos < track.length && opponents.every(o => o.position < track.length)) {
        round++;
        const move = playerSpeed + Math.random() * 3;
        playerPos += move;

        if (Math.random() < 0.25) {
          const event = track.events[Math.floor(Math.random() * track.events.length)];
          const ev = raceEvents[event];
          playerPos += ev.effect;
          raceLog.push(`${ev.emoji} Du ${ev.text} (${ev.effect > 0 ? '+' : ''}${ev.effect})`);
        }

        for (const opp of opponents) {
          opp.position += opp.speed + Math.random() * 3;
          if (Math.random() < 0.15) {
            opp.position += (Math.random() < 0.5 ? 2 : -2);
          }
        }

        if (round > 15) break;
      }

      playerPos = Math.max(0, playerPos);
      const allPositions = [
        { name: interaction.user.username, emoji: vInfo.emoji, position: playerPos, isPlayer: true },
        ...opponents,
      ].sort((a, b) => b.position - a.position);

      const playerRank = allPositions.findIndex(p => p.isPlayer) + 1;
      const won = playerRank === 1;

      const multiplier = won ? (trackIdx === 0 ? 2 : trackIdx === 1 ? 2.5 : 3) : (playerRank === 2 ? 1.2 : 0);
      const winnings = Math.floor(bet * multiplier);
      if (winnings > 0) db.updateBalance(userId, winnings);

      if (won) {
        db.db.prepare('UPDATE player_vehicles SET races_won = races_won + 1 WHERE user_id = ? AND vehicle_id = ?')
          .run(userId, pVehicle.vehicle_id);
      }

      const trackVisual = allPositions.map((p, i) => {
        const pos = Math.min(Math.floor((p.position / track.length) * 15), 15);
        const bar = '░'.repeat(pos) + p.emoji + '░'.repeat(Math.max(0, 15 - pos));
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '4️⃣';
        return `${medal} ${bar} **${p.name}**`;
      }).join('\n');

      const embed = new EmbedBuilder()
        .setColor(won ? '#FFD700' : playerRank === 2 ? '#C0C0C0' : '#e74c3c')
        .setTitle(`${track.emoji} ${track.name} — ${won ? '🏆 Gewonnen!' : playerRank === 2 ? '🥈 Zweiter!' : '💨 Verloren!'}`)
        .setDescription(
          `${trackVisual}\n\n` +
          (raceLog.length > 0 ? raceLog.slice(-3).join('\n') + '\n\n' : '') +
          `🏁 Runden: **${round}** | Platz: **${playerRank}/${allPositions.length}**\n` +
          (winnings > 0
            ? `💰 Gewinn: **+${config.currencySymbol}${winnings.toLocaleString()}** (x${multiplier})`
            : `💸 Verlust: **-${config.currencySymbol}${bet.toLocaleString()}**`)
        )
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'garage') {
      const owned = db.db.prepare('SELECT * FROM player_vehicles WHERE user_id = ?').all(userId);
      if (owned.length === 0) {
        getPlayerVehicle(userId);
        return interaction.reply('🚲 Du hast ein **Fahrrad**! Kaufe bessere Fahrzeuge mit `/rennen kaufen`.');
      }

      const lines = owned.map(pv => {
        const v = vehicles.find(veh => veh.id === pv.vehicle_id);
        const totalSpeed = v.speed + pv.upgrade_level * 0.5;
        return `${v.emoji} **${v.name}** (Tuning Lv.${pv.upgrade_level})\n` +
          `  💨 Speed: **${totalSpeed.toFixed(1)}** | 🏆 Siege: **${pv.races_won}**`;
      });

      const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle(`🏎️ ${interaction.user.username}'s Garage`)
        .setDescription(lines.join('\n\n'))
        .setFooter({ text: '/rennen kaufen oder /rennen tuning' })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'kaufen') {
      const vehicleId = interaction.options.getString('fahrzeug');
      const v = vehicles.find(veh => veh.id === vehicleId);

      const existing = db.db.prepare('SELECT * FROM player_vehicles WHERE user_id = ? AND vehicle_id = ?').get(userId, vehicleId);
      if (existing) return interaction.reply(`❌ Du besitzt bereits ein **${v.emoji} ${v.name}**!`);

      if (db.getBalance(userId) < v.cost) {
        return interaction.reply(`❌ Du brauchst **${config.currencySymbol}${v.cost.toLocaleString()}** für ein ${v.emoji} ${v.name}!`);
      }

      db.updateBalance(userId, -v.cost);
      db.db.prepare('INSERT INTO player_vehicles (user_id, vehicle_id) VALUES (?, ?)').run(userId, vehicleId);

      const embed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle(`${v.emoji} ${v.name} gekauft!`)
        .setDescription(
          `Neues Fahrzeug: **${v.name}**\n` +
          `💨 Speed: **${v.speed}**\n` +
          `Nutze \`/rennen starten\` zum Fahren!`
        )
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'tuning') {
      const vehicleId = interaction.options.getString('fahrzeug');
      const v = vehicles.find(veh => veh.id === vehicleId);

      const existing = db.db.prepare('SELECT * FROM player_vehicles WHERE user_id = ? AND vehicle_id = ?').get(userId, vehicleId);
      if (!existing) return interaction.reply(`❌ Du besitzt kein **${v.emoji} ${v.name}**!`);

      if (existing.upgrade_level >= 10) return interaction.reply('❌ Maximales Tuning-Level (10) erreicht!');

      const cost = (existing.upgrade_level + 1) * 500 + v.cost * 0.2;
      const totalCost = Math.floor(cost);

      if (db.getBalance(userId) < totalCost) {
        return interaction.reply(`❌ Tuning kostet **${config.currencySymbol}${totalCost.toLocaleString()}**!`);
      }

      db.updateBalance(userId, -totalCost);
      db.db.prepare('UPDATE player_vehicles SET upgrade_level = upgrade_level + 1 WHERE user_id = ? AND vehicle_id = ?')
        .run(userId, vehicleId);

      const newSpeed = v.speed + (existing.upgrade_level + 1) * 0.5;

      const embed = new EmbedBuilder()
        .setColor('#9b59b6')
        .setTitle(`🔧 ${v.emoji} ${v.name} getuned!`)
        .setDescription(
          `Tuning Level **${existing.upgrade_level}** → **${existing.upgrade_level + 1}**\n` +
          `💨 Speed: **${newSpeed.toFixed(1)}**\n` +
          `💰 Kosten: **${config.currencySymbol}${totalCost.toLocaleString()}**`
        )
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }
  },
};
