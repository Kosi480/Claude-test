const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const COOLDOWN = 3 * 60 * 1000;
const cooldowns = new Map();

function ensurePirateTables() {
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS pirates (
      user_id TEXT PRIMARY KEY,
      captain_name TEXT DEFAULT '',
      ship_type INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      crew INTEGER DEFAULT 5,
      max_crew INTEGER DEFAULT 10,
      cannons INTEGER DEFAULT 2,
      hull INTEGER DEFAULT 100,
      max_hull INTEGER DEFAULT 100,
      speed INTEGER DEFAULT 5,
      rum INTEGER DEFAULT 50,
      infamy INTEGER DEFAULT 0,
      ships_sunk INTEGER DEFAULT 0,
      islands_explored INTEGER DEFAULT 0,
      treasure_found INTEGER DEFAULT 0,
      plunder_total INTEGER DEFAULT 0
    );
  `);
}

const shipTypes = [
  { name: 'Ruderboot', emoji: '🚣', hull: 100, maxCrew: 10, cannons: 2, speed: 5, cost: 0 },
  { name: 'Schaluppe', emoji: '⛵', hull: 150, maxCrew: 15, cannons: 4, speed: 7, cost: 3000 },
  { name: 'Brigantine', emoji: '🚢', hull: 250, maxCrew: 25, cannons: 8, speed: 8, cost: 10000 },
  { name: 'Fregatte', emoji: '⚓', hull: 400, maxCrew: 40, cannons: 16, speed: 10, cost: 30000 },
  { name: 'Galeone', emoji: '🏴‍☠️', hull: 600, maxCrew: 60, cannons: 24, speed: 8, cost: 75000 },
  { name: 'Kriegsschiff', emoji: '💀', hull: 800, maxCrew: 80, cannons: 36, speed: 12, cost: 200000 },
];

const enemies = [
  { name: 'Handelsschiff', emoji: '🚢', hull: 50, cannons: 1, crew: 5, loot: { min: 200, max: 600 }, xp: 20 },
  { name: 'Patrouillenschiff', emoji: '⚓', hull: 100, cannons: 4, crew: 15, loot: { min: 400, max: 1000 }, xp: 35 },
  { name: 'Piratenjäger', emoji: '🛡️', hull: 200, cannons: 8, crew: 30, loot: { min: 800, max: 2000 }, xp: 55 },
  { name: 'Kriegsfregatte', emoji: '⚔️', hull: 350, cannons: 16, crew: 50, loot: { min: 1500, max: 4000 }, xp: 80 },
  { name: 'Flaggschiff der Marine', emoji: '🏛️', hull: 500, cannons: 24, crew: 80, loot: { min: 3000, max: 8000 }, xp: 120 },
  { name: 'Geisterschiff', emoji: '👻', hull: 666, cannons: 30, crew: 66, loot: { min: 5000, max: 15000 }, xp: 200 },
];

const islands = [
  { name: 'Kokosnuss-Insel', emoji: '🥥', minLevel: 1, danger: 1, treasure: { min: 100, max: 500 }, rumGain: 20 },
  { name: 'Schmugglerbucht', emoji: '🏖️', minLevel: 2, danger: 2, treasure: { min: 300, max: 1000 }, rumGain: 30 },
  { name: 'Schädelinsel', emoji: '💀', minLevel: 4, danger: 3, treasure: { min: 600, max: 2000 }, rumGain: 15 },
  { name: 'Vulkaninsel', emoji: '🌋', minLevel: 6, danger: 4, treasure: { min: 1000, max: 4000 }, rumGain: 10 },
  { name: 'Versunkene Stadt', emoji: '🏛️', minLevel: 8, danger: 5, treasure: { min: 2000, max: 8000 }, rumGain: 5 },
  { name: 'Davy Jones Schließfach', emoji: '🌊', minLevel: 12, danger: 7, treasure: { min: 5000, max: 20000 }, rumGain: 0 },
];

const seaEvents = [
  { name: 'Rückenwind', emoji: '💨', text: 'Starker Rückenwind beschleunigt euch!', effect: 'speed_bonus' },
  { name: 'Seemonster', emoji: '🐙', text: 'Ein Kraken greift an!', effect: 'hull_damage', amount: 30 },
  { name: 'Schwimmende Fracht', emoji: '📦', text: 'Treibende Kisten im Wasser!', effect: 'loot', amount: 300 },
  { name: 'Meuterei!', emoji: '😤', text: 'Teile der Crew meutern!', effect: 'crew_loss', amount: 2 },
  { name: 'Sirenengesang', emoji: '🧜', text: 'Sirenen locken die Crew!', effect: 'crew_loss', amount: 1 },
  { name: 'Schatzkarte', emoji: '🗺️', text: 'Ihr findet eine Schatzkarte!', effect: 'loot', amount: 800 },
  { name: 'Sturm', emoji: '🌪️', text: 'Ein gewaltiger Sturm!', effect: 'hull_damage', amount: 40 },
  { name: 'Flaschenpost', emoji: '🍾', text: 'Geheime Koordinaten in einer Flasche!', effect: 'xp', amount: 50 },
];

function getPirate(userId) {
  ensurePirateTables();
  let p = db.db.prepare('SELECT * FROM pirates WHERE user_id = ?').get(userId);
  if (!p) {
    db.db.prepare('INSERT INTO pirates (user_id) VALUES (?)').run(userId);
    p = db.db.prepare('SELECT * FROM pirates WHERE user_id = ?').get(userId);
  }
  return p;
}

function addPirateXP(userId, xp) {
  const p = getPirate(userId);
  const newXP = p.xp + xp;
  const needed = p.level * 150;
  if (newXP >= needed) {
    db.db.prepare('UPDATE pirates SET xp = ?, level = level + 1 WHERE user_id = ?').run(newXP - needed, userId);
    return true;
  }
  db.db.prepare('UPDATE pirates SET xp = ? WHERE user_id = ?').run(newXP, userId);
  return false;
}

function getCombatPower(pirate) {
  return pirate.cannons * 5 + pirate.crew * 2 + pirate.speed * 1.5;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('piraten')
    .setDescription('Werde ein Piratenkapitän — Seeschlachten, Schätze und Abenteuer!')
    .addSubcommand(sub => sub.setName('status').setDescription('Zeige deinen Piratenstatus'))
    .addSubcommand(sub => sub.setName('name').setDescription('Setze deinen Kapitänsnamen')
      .addStringOption(opt => opt.setName('name').setDescription('Dein Piratenname').setRequired(true)))
    .addSubcommand(sub => sub.setName('angriff').setDescription('Greife ein Schiff an')
      .addIntegerOption(opt => opt.setName('gegner').setDescription('Gegner 1-6').setRequired(true).setMinValue(1).setMaxValue(6)))
    .addSubcommand(sub => sub.setName('insel').setDescription('Erkunde eine Insel')
      .addIntegerOption(opt => opt.setName('nummer').setDescription('Insel 1-6').setRequired(true).setMinValue(1).setMaxValue(6)))
    .addSubcommand(sub => sub.setName('werft').setDescription('Upgrade dein Schiff oder kaufe ein neues'))
    .addSubcommand(sub => sub.setName('rekrutieren').setDescription('Rekrutiere neue Crew-Mitglieder')
      .addIntegerOption(opt => opt.setName('anzahl').setDescription('Anzahl').setRequired(true).setMinValue(1).setMaxValue(20)))
    .addSubcommand(sub => sub.setName('reparieren').setDescription('Repariere dein Schiff'))
    .addSubcommand(sub => sub.setName('taverne').setDescription('Besuche die Taverne — Rum auffüllen')),

  async execute(interaction) {
    const userId = interaction.user.id;
    const config = require('../config.json');
    const sub = interaction.options.getSubcommand();
    ensurePirateTables();

    if (sub === 'name') {
      getPirate(userId);
      const name = interaction.options.getString('name').slice(0, 25);
      db.db.prepare('UPDATE pirates SET captain_name = ? WHERE user_id = ?').run(name, userId);
      return interaction.reply(`🏴‍☠️ Ahoi, **Kapitän ${name}**!`);
    }

    if (sub === 'status') {
      const p = getPirate(userId);
      const ship = shipTypes[p.ship_type];
      const xpNeeded = p.level * 150;
      const power = getCombatPower(p);

      const embed = new EmbedBuilder()
        .setColor('#2c3e50')
        .setTitle(`🏴‍☠️ Kapitän ${p.captain_name || interaction.user.username}`)
        .setDescription(
          `**Schiff:** ${ship.emoji} ${ship.name}\n` +
          `**Level:** ${p.level} (${p.xp}/${xpNeeded} XP)\n` +
          `⚔️ Kampfkraft: **${power}**\n\n` +
          `👥 Crew: **${p.crew}/${p.max_crew}**\n` +
          `💣 Kanonen: **${p.cannons}**\n` +
          `🛡️ Hülle: **${p.hull}/${p.max_hull}**\n` +
          `💨 Geschwindigkeit: **${p.speed}**\n` +
          `🍺 Rum: **${p.rum}**\n\n` +
          `📊 **Statistiken:**\n` +
          `☠️ Versenkt: **${p.ships_sunk}** Schiffe\n` +
          `🏝️ Inseln: **${p.islands_explored}**\n` +
          `💎 Schätze: **${p.treasure_found}**\n` +
          `💰 Beute gesamt: **${config.currencySymbol}${p.plunder_total.toLocaleString()}**\n` +
          `😈 Berüchtigung: **${p.infamy}**`
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'angriff') {
      const lastPlay = cooldowns.get(`${userId}_attack`);
      if (lastPlay && Date.now() - lastPlay < COOLDOWN) {
        const remaining = Math.ceil((COOLDOWN - (Date.now() - lastPlay)) / 1000);
        return interaction.reply(`⏳ Nächster Angriff in **${remaining}s**!`);
      }

      const p = getPirate(userId);
      if (p.hull <= 10) return interaction.reply('❌ Dein Schiff ist zu beschädigt! Nutze `/piraten reparieren`.');
      if (p.crew < 3) return interaction.reply('❌ Nicht genug Crew! Nutze `/piraten rekrutieren`.');
      if (p.rum < 10) return interaction.reply('🍺 Kein Rum mehr! Besuche die `/piraten taverne`.');

      const enemyIdx = interaction.options.getInteger('gegner') - 1;
      const enemy = enemies[enemyIdx];

      cooldowns.set(`${userId}_attack`, Date.now());
      db.db.prepare('UPDATE pirates SET rum = MAX(0, rum - 10) WHERE user_id = ?').run(userId);

      const playerPower = getCombatPower(p);
      const enemyPower = enemy.cannons * 5 + enemy.crew * 2;

      const embed = new EmbedBuilder()
        .setColor('#e74c3c')
        .setTitle(`⚔️ Seeschlacht: vs ${enemy.emoji} ${enemy.name}!`)
        .setDescription(`Eure Kampfkraft: **${playerPower}** vs **${enemyPower}**\n\nWähle deine Taktik!`)
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`pir_aggressive_${userId}`).setLabel('💣 Volles Breitseite!').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`pir_balanced_${userId}`).setLabel('⚔️ Ausgewogen').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`pir_boarding_${userId}`).setLabel('🏴‍☠️ Entern!').setStyle(ButtonStyle.Success),
      );

      const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
      const coll = msg.createMessageComponentCollector({ time: 30000 });

      coll.on('collect', (btn) => {
        if (btn.user.id !== userId) return btn.reply({ content: '❌ Nicht dein Kampf!', flags: 64 });
        coll.stop();

        const tactic = btn.customId.split('_')[1];
        let powerMod = 1;
        let riskMod = 1;
        let tacticText = '';

        if (tactic === 'aggressive') {
          powerMod = 1.4; riskMod = 1.5;
          tacticText = '💣 Volles Breitseite! Hoher Schaden, hohes Risiko.';
        } else if (tactic === 'boarding') {
          powerMod = 0.8 + (p.crew / enemy.crew) * 0.5; riskMod = 1.2;
          tacticText = '🏴‍☠️ Enterangriff! Crew-Größe zählt.';
        } else {
          powerMod = 1.0; riskMod = 1.0;
          tacticText = '⚔️ Ausgewogene Taktik.';
        }

        const roll = Math.floor(Math.random() * 30) + 1;
        const totalPower = Math.floor(playerPower * powerMod) + roll;
        const enemyRoll = Math.floor(Math.random() * 20) + 1;
        const totalEnemy = enemyPower + enemyRoll;
        const won = totalPower > totalEnemy;

        let resultText = tacticText + '\n\n';
        resultText += `🎲 Ihr: ${roll} + ⚔️ ${Math.floor(playerPower * powerMod)} = **${totalPower}**\n`;
        resultText += `🎲 Feind: ${enemyRoll} + ⚔️ ${enemyPower} = **${totalEnemy}**\n\n`;

        if (won) {
          const loot = enemy.loot.min + Math.floor(Math.random() * (enemy.loot.max - enemy.loot.min));
          const hullDmg = Math.floor((enemy.cannons * 3) * riskMod * (0.3 + Math.random() * 0.4));
          const crewLoss = Math.floor(Math.random() * Math.min(3, enemy.crew / 10));
          const infamyGain = 5 + enemyIdx * 3;

          db.updateBalance(userId, loot);
          db.db.prepare('UPDATE pirates SET hull = MAX(0, hull - ?), crew = MAX(1, crew - ?), ships_sunk = ships_sunk + 1, infamy = infamy + ?, plunder_total = plunder_total + ? WHERE user_id = ?')
            .run(hullDmg, crewLoss, infamyGain, loot, userId);
          const leveled = addPirateXP(userId, enemy.xp);

          resultText += `🏆 **SIEG!**\n\n`;
          resultText += `💰 Beute: **+${config.currencySymbol}${loot.toLocaleString()}**\n`;
          resultText += `🛡️ Hüllenschaden: **-${hullDmg}**\n`;
          if (crewLoss > 0) resultText += `👥 Crew verloren: **-${crewLoss}**\n`;
          resultText += `😈 Berüchtigung: **+${infamyGain}**\n`;
          resultText += `⭐ **+${enemy.xp} XP**`;
          if (leveled) resultText += ` 🎉 **LEVEL UP!**`;

          const resultEmbed = new EmbedBuilder().setColor('#FFD700').setTitle(`⚔️ ${enemy.emoji} ${enemy.name} versenkt!`).setDescription(resultText)
            .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` }).setTimestamp();
          btn.update({ embeds: [resultEmbed], components: [] });
        } else {
          const hullDmg = Math.floor((enemy.cannons * 5) * riskMod * (0.5 + Math.random() * 0.5));
          const crewLoss = Math.floor(Math.random() * 3) + 1;

          db.db.prepare('UPDATE pirates SET hull = MAX(0, hull - ?), crew = MAX(1, crew - ?) WHERE user_id = ?')
            .run(hullDmg, crewLoss, userId);
          addPirateXP(userId, Math.floor(enemy.xp * 0.2));

          resultText += `💀 **NIEDERLAGE!**\n\n`;
          resultText += `🛡️ Hüllenschaden: **-${hullDmg}**\n`;
          resultText += `👥 Crew verloren: **-${crewLoss}**`;

          const resultEmbed = new EmbedBuilder().setColor('#e74c3c').setTitle(`💀 Niederlage gegen ${enemy.emoji} ${enemy.name}!`).setDescription(resultText).setTimestamp();
          btn.update({ embeds: [resultEmbed], components: [] });
        }
      });

      coll.on('end', (_, reason) => {
        if (reason === 'time') msg.edit({ content: '⏰ Keine Taktik gewählt — der Feind entkommt.', components: [] });
      });
      return;
    }

    if (sub === 'insel') {
      const lastPlay = cooldowns.get(`${userId}_island`);
      if (lastPlay && Date.now() - lastPlay < COOLDOWN) {
        const remaining = Math.ceil((COOLDOWN - (Date.now() - lastPlay)) / 1000);
        return interaction.reply(`⏳ Nächste Erkundung in **${remaining}s**!`);
      }

      const p = getPirate(userId);
      const islandIdx = interaction.options.getInteger('nummer') - 1;
      const island = islands[islandIdx];

      if (p.level < island.minLevel) return interaction.reply(`🔒 Du brauchst **Level ${island.minLevel}**!`);

      cooldowns.set(`${userId}_island`, Date.now());

      const event = seaEvents[Math.floor(Math.random() * seaEvents.length)];
      let eventText = `${event.emoji} **${event.name}:** ${event.text}`;

      switch (event.effect) {
        case 'hull_damage':
          db.db.prepare('UPDATE pirates SET hull = MAX(0, hull - ?) WHERE user_id = ?').run(event.amount, userId);
          eventText += ` (-${event.amount} Hülle)`;
          break;
        case 'loot':
          db.updateBalance(userId, event.amount);
          eventText += ` (+${config.currencySymbol}${event.amount})`;
          break;
        case 'crew_loss':
          db.db.prepare('UPDATE pirates SET crew = MAX(1, crew - ?) WHERE user_id = ?').run(event.amount, userId);
          eventText += ` (-${event.amount} Crew)`;
          break;
        case 'xp':
          addPirateXP(userId, event.amount);
          eventText += ` (+${event.amount} XP)`;
          break;
      }

      const roll = Math.floor(Math.random() * 20) + 1 + p.speed;
      const threshold = island.danger * 8;
      const success = roll >= threshold;

      let treasure = 0;
      if (success) {
        treasure = island.treasure.min + Math.floor(Math.random() * (island.treasure.max - island.treasure.min));
        db.updateBalance(userId, treasure);
        db.db.prepare('UPDATE pirates SET islands_explored = islands_explored + 1, treasure_found = treasure_found + 1, rum = MIN(100, rum + ?), plunder_total = plunder_total + ? WHERE user_id = ?')
          .run(island.rumGain, treasure, userId);
      }

      const xpGain = 15 + island.danger * 10;
      const leveled = addPirateXP(userId, xpGain);
      const updated = getPirate(userId);

      const embed = new EmbedBuilder()
        .setColor(success ? '#27ae60' : '#e74c3c')
        .setTitle(`${island.emoji} ${island.name}${success ? ' — Schatz gefunden!' : ' — Nichts gefunden'}`)
        .setDescription(
          `${eventText}\n\n` +
          `🎲 ${roll} ${success ? '≥' : '<'} ${threshold}\n\n` +
          (success ? `💎 Schatz: **+${config.currencySymbol}${treasure.toLocaleString()}**\n🍺 +${island.rumGain} Rum\n` : '💨 Die Insel war leer...\n') +
          `⭐ +${xpGain} XP` +
          (leveled ? ` 🎉 **LEVEL UP → ${updated.level}!**` : '')
        )
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()} | 🍺 ${updated.rum}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'werft') {
      const p = getPirate(userId);
      const nextShip = p.ship_type < shipTypes.length - 1 ? shipTypes[p.ship_type + 1] : null;
      const currentShip = shipTypes[p.ship_type];

      let desc = `**Aktuell:** ${currentShip.emoji} ${currentShip.name}\n\n`;
      if (nextShip) {
        desc += `🚢 **Nächstes Schiff:** ${nextShip.emoji} **${nextShip.name}**\n`;
        desc += `🛡️ ${nextShip.hull} | 👥 ${nextShip.maxCrew} | 💣 ${nextShip.cannons} | 💨 ${nextShip.speed}\n`;
        desc += `💰 **${config.currencySymbol}${nextShip.cost.toLocaleString()}**\n`;
      } else {
        desc += '🏆 Du hast das beste Schiff!';
      }

      const buttons = [];
      if (nextShip) {
        buttons.push(new ButtonBuilder().setCustomId(`pir_buyship_${userId}`).setLabel(`${nextShip.emoji} ${nextShip.name} kaufen`).setStyle(ButtonStyle.Success)
          .setDisabled(db.getBalance(userId) < nextShip.cost));
      }

      const embed = new EmbedBuilder().setColor('#3498db').setTitle('🔧 Piratenwerft').setDescription(desc)
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` }).setTimestamp();

      const rows = buttons.length > 0 ? [new ActionRowBuilder().addComponents(buttons)] : [];
      const msg = await interaction.reply({ embeds: [embed], components: rows, fetchReply: true });

      if (buttons.length === 0) return;

      const coll = msg.createMessageComponentCollector({ time: 30000 });
      coll.on('collect', (btn) => {
        if (btn.user.id !== userId) return btn.reply({ content: '❌ Nicht deine Werft!', flags: 64 });
        coll.stop();
        const current = getPirate(userId);
        const next = shipTypes[current.ship_type + 1];
        if (!next || db.getBalance(userId) < next.cost) return btn.update({ content: '❌ Nicht genug Geld!', embeds: [], components: [] });

        db.updateBalance(userId, -next.cost);
        db.db.prepare('UPDATE pirates SET ship_type = ?, max_hull = ?, hull = ?, max_crew = ?, cannons = ?, speed = ? WHERE user_id = ?')
          .run(current.ship_type + 1, next.hull, next.hull, next.maxCrew, next.cannons, next.speed, userId);
        btn.update({ content: `🏴‍☠️ **${next.emoji} ${next.name}** gekauft! Voll repariert und ausgerüstet.`, embeds: [], components: [] });
      });
      return;
    }

    if (sub === 'rekrutieren') {
      const p = getPirate(userId);
      const amount = interaction.options.getInteger('anzahl');
      const canRecruit = p.max_crew - p.crew;
      const actual = Math.min(amount, canRecruit);
      if (actual <= 0) return interaction.reply('👥 Crew ist voll!');

      const cost = actual * 100;
      if (db.getBalance(userId) < cost) return interaction.reply(`❌ Rekrutierung kostet **${config.currencySymbol}${cost.toLocaleString()}** (${actual} × ${config.currencySymbol}100)`);

      db.updateBalance(userId, -cost);
      db.db.prepare('UPDATE pirates SET crew = crew + ? WHERE user_id = ?').run(actual, userId);

      return interaction.reply(`👥 **${actual}** neue Crew-Mitglieder angeheuert! (${config.currencySymbol}${cost.toLocaleString()})`);
    }

    if (sub === 'reparieren') {
      const p = getPirate(userId);
      const missing = p.max_hull - p.hull;
      if (missing <= 0) return interaction.reply('🛡️ Schiff ist in Top-Zustand!');

      const cost = missing * 8;
      if (db.getBalance(userId) < cost) return interaction.reply(`❌ Reparatur kostet **${config.currencySymbol}${cost.toLocaleString()}**`);

      db.updateBalance(userId, -cost);
      db.db.prepare('UPDATE pirates SET hull = max_hull WHERE user_id = ?').run(userId);

      return interaction.reply(`🔧 Schiff repariert! **${missing}** Hüllenpunkte für **${config.currencySymbol}${cost.toLocaleString()}**`);
    }

    if (sub === 'taverne') {
      const p = getPirate(userId);
      const missing = 100 - p.rum;
      if (missing <= 0) return interaction.reply('🍺 Rumvorrat ist voll!');

      const cost = missing * 5;
      if (db.getBalance(userId) < cost) return interaction.reply(`❌ Rum kostet **${config.currencySymbol}${cost.toLocaleString()}**`);

      db.updateBalance(userId, -cost);
      db.db.prepare('UPDATE pirates SET rum = 100 WHERE user_id = ?').run(userId);

      return interaction.reply(`🍺 Rum aufgefüllt! **${missing}** Fässer für **${config.currencySymbol}${cost.toLocaleString()}**. Yo ho ho!`);
    }
  },
};
