const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const COOLDOWN = 3 * 60 * 1000;
const cooldowns = new Map();

function ensureSpaceTables() {
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS spaceships (
      user_id TEXT PRIMARY KEY,
      ship_type INTEGER DEFAULT 0,
      fuel INTEGER DEFAULT 100,
      max_fuel INTEGER DEFAULT 100,
      hull INTEGER DEFAULT 100,
      max_hull INTEGER DEFAULT 100,
      cargo_space INTEGER DEFAULT 10,
      scanner_level INTEGER DEFAULT 1,
      shield_level INTEGER DEFAULT 0,
      weapon_level INTEGER DEFAULT 0,
      xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      missions_done INTEGER DEFAULT 0,
      planets_discovered INTEGER DEFAULT 0,
      aliens_defeated INTEGER DEFAULT 0,
      last_refuel TEXT DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS space_cargo (
      user_id TEXT,
      resource TEXT,
      amount INTEGER DEFAULT 0,
      PRIMARY KEY (user_id, resource)
    );
  `);
}

const ships = [
  { name: 'Shuttle', emoji: '🛸', fuelMax: 100, hullMax: 100, cargo: 10, cost: 0 },
  { name: 'Fregatte', emoji: '🚀', fuelMax: 150, hullMax: 150, cargo: 15, cost: 5000 },
  { name: 'Kreuzer', emoji: '⚡', fuelMax: 200, hullMax: 200, cargo: 20, cost: 15000 },
  { name: 'Schlachtschiff', emoji: '🔥', fuelMax: 300, hullMax: 300, cargo: 30, cost: 40000 },
  { name: 'Dreadnought', emoji: '💀', fuelMax: 400, hullMax: 350, cargo: 40, cost: 80000 },
  { name: 'Titan', emoji: '🌟', fuelMax: 500, hullMax: 500, cargo: 50, cost: 200000 },
];

const planets = [
  { name: 'Mondkolonie Alpha', emoji: '🌙', minLevel: 1, fuelCost: 10, danger: 1, resources: ['Mondgestein', 'Helium-3', 'Titanerz'] },
  { name: 'Mars-Basis Omega', emoji: '🔴', minLevel: 2, fuelCost: 20, danger: 2, resources: ['Marsstaub', 'Eisen-Kristall', 'Wasser-Eis'] },
  { name: 'Asteroidengürtel', emoji: '☄️', minLevel: 3, fuelCost: 30, danger: 3, resources: ['Platin-Nugget', 'Seltene Erden', 'Diamant-Kern'] },
  { name: 'Nebulastation', emoji: '🌌', minLevel: 5, fuelCost: 40, danger: 4, resources: ['Nebula-Gas', 'Sternenstaub', 'Plasma-Kristall'] },
  { name: 'Exoplanet Kepler', emoji: '🪐', minLevel: 7, fuelCost: 50, danger: 5, resources: ['Alien-Metall', 'Bio-Kristall', 'Quantenstaub'] },
  { name: 'Schwarzes-Loch-Rand', emoji: '🕳️', minLevel: 10, fuelCost: 70, danger: 7, resources: ['Dunkle Materie', 'Singularitäts-Splitter', 'Zeitkristall'] },
];

const spaceResources = {
  'Mondgestein': { emoji: '🪨', value: 30, rarity: 1 },
  'Helium-3': { emoji: '💨', value: 80, rarity: 2 },
  'Titanerz': { emoji: '⚙️', value: 120, rarity: 3 },
  'Marsstaub': { emoji: '🟤', value: 50, rarity: 1 },
  'Eisen-Kristall': { emoji: '🔷', value: 100, rarity: 2 },
  'Wasser-Eis': { emoji: '🧊', value: 90, rarity: 2 },
  'Platin-Nugget': { emoji: '🥈', value: 200, rarity: 3 },
  'Seltene Erden': { emoji: '🟢', value: 250, rarity: 3 },
  'Diamant-Kern': { emoji: '💎', value: 400, rarity: 4 },
  'Nebula-Gas': { emoji: '🌫️', value: 300, rarity: 3 },
  'Sternenstaub': { emoji: '✨', value: 500, rarity: 4 },
  'Plasma-Kristall': { emoji: '🔮', value: 600, rarity: 4 },
  'Alien-Metall': { emoji: '🛡️', value: 800, rarity: 5 },
  'Bio-Kristall': { emoji: '🧬', value: 900, rarity: 5 },
  'Quantenstaub': { emoji: '⚛️', value: 1200, rarity: 5 },
  'Dunkle Materie': { emoji: '🌑', value: 2000, rarity: 6 },
  'Singularitäts-Splitter': { emoji: '💫', value: 3000, rarity: 6 },
  'Zeitkristall': { emoji: '⏳', value: 5000, rarity: 7 },
};

const encounters = [
  {
    type: 'asteroid',
    name: 'Asteroidenfeld',
    emoji: '☄️',
    description: 'Ein dichtes Asteroidenfeld blockiert den Weg!',
    choices: [
      { label: 'Durchfliegen', risk: 0.4, reward: 'resource', fail: 'hull', failAmount: 30 },
      { label: 'Umfliegen', risk: 0.1, reward: 'fuel_save', fail: 'fuel', failAmount: 15 },
    ],
  },
  {
    type: 'alien',
    name: 'Alien-Kontakt',
    emoji: '👽',
    description: 'Ein außerirdisches Schiff nähert sich!',
    choices: [
      { label: 'Handeln', risk: 0.2, reward: 'trade', fail: 'robbed', failAmount: 0 },
      { label: 'Angreifen', risk: 0.5, reward: 'loot', fail: 'hull', failAmount: 40 },
    ],
  },
  {
    type: 'derelict',
    name: 'Verlassenes Schiff',
    emoji: '🛳️',
    description: 'Ein verlassenes Raumschiff treibt im All!',
    choices: [
      { label: 'Erkunden', risk: 0.3, reward: 'treasure', fail: 'trap', failAmount: 25 },
      { label: 'Ignorieren', risk: 0, reward: 'nothing', fail: 'nothing', failAmount: 0 },
    ],
  },
  {
    type: 'nebula',
    name: 'Ionennebel',
    emoji: '🌌',
    description: 'Ein Ionennebel stört die Sensoren!',
    choices: [
      { label: 'Hindurchfliegen', risk: 0.35, reward: 'discovery', fail: 'hull', failAmount: 20 },
      { label: 'Warten', risk: 0.05, reward: 'nothing', fail: 'fuel', failAmount: 10 },
    ],
  },
  {
    type: 'pirate',
    name: 'Weltraumpiraten',
    emoji: '🏴‍☠️',
    description: 'Piraten fordern Tribut!',
    choices: [
      { label: 'Kämpfen', risk: 0.45, reward: 'pirate_loot', fail: 'hull', failAmount: 50 },
      { label: 'Bezahlen', risk: 0.1, reward: 'safe_passage', fail: 'robbed', failAmount: 0 },
    ],
  },
  {
    type: 'wormhole',
    name: 'Wurmloch',
    emoji: '🌀',
    description: 'Ein instabiles Wurmloch öffnet sich!',
    choices: [
      { label: 'Hineinfliegen', risk: 0.5, reward: 'jackpot', fail: 'hull', failAmount: 60 },
      { label: 'Analysieren', risk: 0.15, reward: 'xp_bonus', fail: 'nothing', failAmount: 0 },
    ],
  },
];

function getShip(userId) {
  ensureSpaceTables();
  let ship = db.db.prepare('SELECT * FROM spaceships WHERE user_id = ?').get(userId);
  if (!ship) {
    db.db.prepare(`INSERT INTO spaceships (user_id) VALUES (?)`).run(userId);
    ship = db.db.prepare('SELECT * FROM spaceships WHERE user_id = ?').get(userId);
  }
  return ship;
}

function getCargo(userId) {
  ensureSpaceTables();
  return db.db.prepare('SELECT * FROM space_cargo WHERE user_id = ? AND amount > 0').all(userId);
}

function getCargoTotal(userId) {
  const cargo = getCargo(userId);
  return cargo.reduce((s, c) => s + c.amount, 0);
}

function addCargo(userId, resource, amount) {
  db.db.prepare(`INSERT INTO space_cargo (user_id, resource, amount) VALUES (?, ?, ?)
    ON CONFLICT(user_id, resource) DO UPDATE SET amount = amount + ?`).run(userId, resource, amount, amount);
}

function removeCargo(userId, resource, amount) {
  db.db.prepare(`UPDATE space_cargo SET amount = MAX(0, amount - ?) WHERE user_id = ? AND resource = ?`).run(amount, userId, resource);
}

function addXP(userId, xp) {
  const ship = getShip(userId);
  const newXP = ship.xp + xp;
  const xpNeeded = ship.level * 150;
  if (newXP >= xpNeeded) {
    db.db.prepare('UPDATE spaceships SET xp = ?, level = level + 1 WHERE user_id = ?').run(newXP - xpNeeded, userId);
    return true;
  }
  db.db.prepare('UPDATE spaceships SET xp = ? WHERE user_id = ?').run(newXP, userId);
  return false;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('weltraum')
    .setDescription('Erkunde den Weltraum, sammle Ressourcen und upgrade dein Raumschiff!')
    .addSubcommand(sub => sub.setName('erkunden').setDescription('Reise zu einem Planeten und erkunde ihn')
      .addIntegerOption(opt => opt.setName('planet').setDescription('Planet-Nummer (1-6)').setRequired(true).setMinValue(1).setMaxValue(6)))
    .addSubcommand(sub => sub.setName('status').setDescription('Zeige dein Raumschiff und Statistiken'))
    .addSubcommand(sub => sub.setName('fracht').setDescription('Zeige deine gesammelten Ressourcen'))
    .addSubcommand(sub => sub.setName('verkaufen').setDescription('Verkaufe Ressourcen an der Raumstation')
      .addStringOption(opt => opt.setName('ressource').setDescription('Name der Ressource (oder "alle")').setRequired(true)))
    .addSubcommand(sub => sub.setName('werft').setDescription('Upgrade oder kaufe ein neues Raumschiff'))
    .addSubcommand(sub => sub.setName('tanken').setDescription('Tanke dein Raumschiff auf'))
    .addSubcommand(sub => sub.setName('reparieren').setDescription('Repariere dein Raumschiff')),

  async execute(interaction) {
    const userId = interaction.user.id;
    const config = require('../config.json');
    const sub = interaction.options.getSubcommand();
    ensureSpaceTables();

    if (sub === 'status') {
      const ship = getShip(userId);
      const s = ships[ship.ship_type];
      const cargoUsed = getCargoTotal(userId);
      const xpNeeded = ship.level * 150;

      const embed = new EmbedBuilder()
        .setColor('#1a1a2e')
        .setTitle(`${s.emoji} ${s.name} — Raumschiff-Status`)
        .setDescription(
          `**Pilot:** ${interaction.user.username}\n` +
          `**Level:** ${ship.level} (${ship.xp}/${xpNeeded} XP)\n\n` +
          `⛽ Treibstoff: **${ship.fuel}/${ship.max_fuel}**\n` +
          `🛡️ Hülle: **${ship.hull}/${ship.max_hull}**\n` +
          `📦 Fracht: **${cargoUsed}/${ship.cargo_space}**\n` +
          `📡 Scanner: **Stufe ${ship.scanner_level}**\n` +
          `🛡️ Schild: **Stufe ${ship.shield_level}**\n` +
          `⚔️ Waffen: **Stufe ${ship.weapon_level}**\n\n` +
          `📊 **Statistiken:**\n` +
          `🚀 Missionen: **${ship.missions_done}**\n` +
          `🪐 Planeten entdeckt: **${ship.planets_discovered}**\n` +
          `👽 Aliens besiegt: **${ship.aliens_defeated}**`
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'fracht') {
      const cargo = getCargo(userId);
      const ship = getShip(userId);
      const cargoUsed = cargo.reduce((s, c) => s + c.amount, 0);

      if (cargo.length === 0) {
        return interaction.reply('📦 Dein Frachtraum ist leer! Erkunde Planeten um Ressourcen zu sammeln.');
      }

      const lines = cargo.map(c => {
        const res = spaceResources[c.resource];
        return `${res ? res.emoji : '📦'} **${c.resource}** x${c.amount} — Wert: ${config.currencySymbol}${((res ? res.value : 0) * c.amount).toLocaleString()}`;
      });

      const totalValue = cargo.reduce((s, c) => s + (spaceResources[c.resource]?.value || 0) * c.amount, 0);

      const embed = new EmbedBuilder()
        .setColor('#2c3e50')
        .setTitle('📦 Frachtraum')
        .setDescription(
          `**Kapazität:** ${cargoUsed}/${ship.cargo_space}\n\n` +
          lines.join('\n') +
          `\n\n💰 Gesamtwert: **${config.currencySymbol}${totalValue.toLocaleString()}**`
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'verkaufen') {
      const resName = interaction.options.getString('ressource');
      const ship = getShip(userId);

      if (resName.toLowerCase() === 'alle') {
        const cargo = getCargo(userId);
        if (cargo.length === 0) return interaction.reply('📦 Nichts zu verkaufen!');

        let total = 0;
        const sold = [];
        for (const c of cargo) {
          const res = spaceResources[c.resource];
          if (!res) continue;
          const value = res.value * c.amount;
          total += value;
          sold.push(`${res.emoji} ${c.resource} x${c.amount} → ${config.currencySymbol}${value.toLocaleString()}`);
          removeCargo(userId, c.resource, c.amount);
        }

        db.updateBalance(userId, total);
        const embed = new EmbedBuilder()
          .setColor('#27ae60')
          .setTitle('💰 Fracht verkauft!')
          .setDescription(sold.join('\n') + `\n\n**Gesamt: ${config.currencySymbol}${total.toLocaleString()}**`)
          .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      const cargo = getCargo(userId);
      const found = cargo.find(c => c.resource.toLowerCase() === resName.toLowerCase());
      if (!found) return interaction.reply('❌ Diese Ressource hast du nicht!');

      const res = spaceResources[found.resource];
      const value = (res ? res.value : 50) * found.amount;
      removeCargo(userId, found.resource, found.amount);
      db.updateBalance(userId, value);

      return interaction.reply(`💰 **${found.amount}x ${found.resource}** verkauft für **${config.currencySymbol}${value.toLocaleString()}**!`);
    }

    if (sub === 'tanken') {
      const ship = getShip(userId);
      const missing = ship.max_fuel - ship.fuel;
      if (missing <= 0) return interaction.reply('⛽ Tank ist bereits voll!');

      const cost = missing * 5;
      if (db.getBalance(userId) < cost) {
        return interaction.reply(`❌ Tanken kostet **${config.currencySymbol}${cost.toLocaleString()}** (${missing} Einheiten × ${config.currencySymbol}5)`);
      }

      db.updateBalance(userId, -cost);
      db.db.prepare('UPDATE spaceships SET fuel = max_fuel WHERE user_id = ?').run(userId);

      return interaction.reply(`⛽ Voll getankt! **${missing}** Treibstoff für **${config.currencySymbol}${cost.toLocaleString()}** nachgefüllt.`);
    }

    if (sub === 'reparieren') {
      const ship = getShip(userId);
      const missing = ship.max_hull - ship.hull;
      if (missing <= 0) return interaction.reply('🛡️ Hülle ist bereits intakt!');

      const cost = missing * 10;
      if (db.getBalance(userId) < cost) {
        return interaction.reply(`❌ Reparatur kostet **${config.currencySymbol}${cost.toLocaleString()}** (${missing} Punkte × ${config.currencySymbol}10)`);
      }

      db.updateBalance(userId, -cost);
      db.db.prepare('UPDATE spaceships SET hull = max_hull WHERE user_id = ?').run(userId);

      return interaction.reply(`🔧 Hülle vollständig repariert! **${missing}** Schadenspunkte für **${config.currencySymbol}${cost.toLocaleString()}** repariert.`);
    }

    if (sub === 'werft') {
      const ship = getShip(userId);
      const upgrades = [
        { name: '📡 Scanner +1', cost: 2000 + ship.scanner_level * 3000, field: 'scanner_level', max: 5 },
        { name: '🛡️ Schild +1', cost: 3000 + ship.shield_level * 4000, field: 'shield_level', max: 5 },
        { name: '⚔️ Waffen +1', cost: 3000 + ship.weapon_level * 4000, field: 'weapon_level', max: 5 },
      ];

      const nextShip = ship.ship_type < ships.length - 1 ? ships[ship.ship_type + 1] : null;

      let desc = `**Aktuelles Schiff:** ${ships[ship.ship_type].emoji} ${ships[ship.ship_type].name}\n\n`;

      if (nextShip) {
        desc += `🚀 **Nächstes Schiff:** ${nextShip.emoji} ${nextShip.name}\n` +
          `   ⛽ ${nextShip.fuelMax} | 🛡️ ${nextShip.hullMax} | 📦 ${nextShip.cargo}\n` +
          `   💰 Kosten: **${config.currencySymbol}${nextShip.cost.toLocaleString()}**\n\n`;
      }

      desc += '**Upgrades:**\n';
      upgrades.forEach((u, i) => {
        const current = ship[u.field];
        if (current >= u.max) {
          desc += `${i + 1}. ${u.name} — **MAX**\n`;
        } else {
          desc += `${i + 1}. ${u.name} — **${config.currencySymbol}${u.cost.toLocaleString()}** (Stufe ${current}→${current + 1})\n`;
        }
      });

      const buttons = [];
      if (nextShip) {
        buttons.push(new ButtonBuilder().setCustomId(`space_buy_ship_${userId}`).setLabel(`${nextShip.emoji} ${nextShip.name} kaufen`).setStyle(ButtonStyle.Success)
          .setDisabled(db.getBalance(userId) < nextShip.cost));
      }
      upgrades.forEach((u, i) => {
        if (ship[u.field] < u.max) {
          buttons.push(new ButtonBuilder().setCustomId(`space_upgrade_${u.field}_${userId}`).setLabel(u.name).setStyle(ButtonStyle.Primary)
            .setDisabled(db.getBalance(userId) < u.cost));
        }
      });

      const embed = new EmbedBuilder().setColor('#8e44ad').setTitle('🔧 Raumwerft').setDescription(desc)
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` }).setTimestamp();

      const rows = [];
      for (let i = 0; i < buttons.length; i += 5) {
        rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
      }

      const msg = await interaction.reply({ embeds: [embed], components: rows, fetchReply: true });
      const coll = msg.createMessageComponentCollector({ time: 30000 });

      coll.on('collect', (btn) => {
        if (btn.user.id !== userId) return btn.reply({ content: '❌ Nicht deine Werft!', flags: 64 });
        coll.stop();

        if (btn.customId.startsWith('space_buy_ship')) {
          const s = getShip(userId);
          const next = ships[s.ship_type + 1];
          if (!next || db.getBalance(userId) < next.cost) {
            return btn.update({ content: '❌ Nicht genug Geld!', embeds: [], components: [] });
          }
          db.updateBalance(userId, -next.cost);
          db.db.prepare('UPDATE spaceships SET ship_type = ?, max_fuel = ?, fuel = ?, max_hull = ?, hull = ?, cargo_space = ? WHERE user_id = ?')
            .run(s.ship_type + 1, next.fuelMax, next.fuelMax, next.hullMax, next.hullMax, next.cargo, userId);
          btn.update({ content: `🚀 **${next.emoji} ${next.name}** gekauft! Voll aufgetankt und repariert.`, embeds: [], components: [] });
        } else if (btn.customId.startsWith('space_upgrade_')) {
          const field = btn.customId.split('_')[2] + '_' + btn.customId.split('_')[3];
          const s = getShip(userId);
          const upgrade = upgrades.find(u => u.field === field);
          if (!upgrade || s[field] >= upgrade.max) return btn.update({ content: '❌ Bereits auf Maximum!', embeds: [], components: [] });
          const cost = upgrade.cost;
          if (db.getBalance(userId) < cost) return btn.update({ content: '❌ Nicht genug Geld!', embeds: [], components: [] });
          db.updateBalance(userId, -cost);
          db.db.prepare(`UPDATE spaceships SET ${field} = ${field} + 1 WHERE user_id = ?`).run(userId);
          btn.update({ content: `✅ **${upgrade.name}** erfolgreich! Stufe ${s[field] + 1}.`, embeds: [], components: [] });
        }
      });
      return;
    }

    if (sub === 'erkunden') {
      const lastPlay = cooldowns.get(userId);
      if (lastPlay && Date.now() - lastPlay < COOLDOWN) {
        const remaining = Math.ceil((COOLDOWN - (Date.now() - lastPlay)) / 1000);
        return interaction.reply(`⏳ Nächste Expedition in **${remaining}s**!`);
      }

      const planetIdx = interaction.options.getInteger('planet') - 1;
      const planet = planets[planetIdx];
      const ship = getShip(userId);

      if (ship.level < planet.minLevel) {
        return interaction.reply(`❌ Du brauchst **Level ${planet.minLevel}** für ${planet.emoji} ${planet.name}! (Aktuell: Level ${ship.level})`);
      }
      if (ship.fuel < planet.fuelCost) {
        return interaction.reply(`❌ Nicht genug Treibstoff! Brauchst **${planet.fuelCost}**, hast **${ship.fuel}**. Nutze \`/weltraum tanken\`!`);
      }
      if (ship.hull <= 10) {
        return interaction.reply('❌ Dein Schiff ist zu beschädigt! Nutze `/weltraum reparieren`!');
      }

      cooldowns.set(userId, Date.now());
      db.db.prepare('UPDATE spaceships SET fuel = fuel - ?, missions_done = missions_done + 1 WHERE user_id = ?').run(planet.fuelCost, userId);

      const encounter = encounters[Math.floor(Math.random() * encounters.length)];
      const cargoUsed = getCargoTotal(userId);
      const cargoFree = ship.cargo_space - cargoUsed;

      const embed = new EmbedBuilder()
        .setColor(planet.minLevel >= 7 ? '#e74c3c' : planet.minLevel >= 3 ? '#e67e22' : '#3498db')
        .setTitle(`${planet.emoji} Mission: ${planet.name}`)
        .setDescription(
          `**${encounter.emoji} ${encounter.name}**\n\n` +
          `${encounter.description}\n\n` +
          `Was tust du?`
        )
        .setFooter({ text: `⛽ ${ship.fuel - planet.fuelCost} | 🛡️ ${ship.hull} | 📦 ${cargoUsed}/${ship.cargo_space}` })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        encounter.choices.map((c, i) =>
          new ButtonBuilder().setCustomId(`space_choice_${i}_${userId}`).setLabel(c.label).setStyle(i === 0 ? ButtonStyle.Danger : ButtonStyle.Secondary)
        )
      );

      const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
      const coll = msg.createMessageComponentCollector({ time: 30000 });

      coll.on('collect', (btn) => {
        if (btn.user.id !== userId) return btn.reply({ content: '❌ Nicht deine Mission!', flags: 64 });
        coll.stop();

        const choiceIdx = parseInt(btn.customId.split('_')[2]);
        const choice = encounter.choices[choiceIdx];

        const shieldBonus = ship.shield_level * 0.05;
        const weaponBonus = ship.weapon_level * 0.05;
        const scannerBonus = ship.scanner_level * 0.1;
        let adjustedRisk = choice.risk - (choice.label === 'Kämpfen' || choice.label === 'Angreifen' ? weaponBonus : shieldBonus);
        adjustedRisk = Math.max(0.05, adjustedRisk);

        const success = Math.random() > adjustedRisk;
        let resultText = '';
        let xpGain = 0;

        if (success) {
          xpGain = 20 + planet.danger * 15;
          switch (choice.reward) {
            case 'resource': {
              const count = 1 + Math.floor(Math.random() * (1 + Math.floor(scannerBonus * 3)));
              const res = planet.resources[Math.floor(Math.random() * planet.resources.length)];
              const amount = Math.min(count, cargoFree);
              if (amount > 0) {
                addCargo(userId, res, amount);
                resultText = `✅ Erfolgreich! Du hast **${amount}x ${spaceResources[res].emoji} ${res}** gefunden!`;
              } else {
                resultText = '✅ Durchgekommen, aber kein Platz im Frachtraum!';
              }
              break;
            }
            case 'trade': {
              const res = planet.resources[Math.floor(Math.random() * planet.resources.length)];
              const amount = Math.min(2, cargoFree);
              if (amount > 0) {
                addCargo(userId, res, amount);
                resultText = `🤝 Friedlicher Handel! Du erhältst **${amount}x ${spaceResources[res].emoji} ${res}**.`;
              } else {
                resultText = '🤝 Friedlicher Kontakt, aber kein Platz im Frachtraum!';
              }
              xpGain += 10;
              break;
            }
            case 'loot': {
              const lootCount = 2 + Math.floor(Math.random() * 3);
              const res = planet.resources[Math.floor(Math.random() * planet.resources.length)];
              const amount = Math.min(lootCount, cargoFree);
              if (amount > 0) addCargo(userId, res, amount);
              db.db.prepare('UPDATE spaceships SET aliens_defeated = aliens_defeated + 1 WHERE user_id = ?').run(userId);
              resultText = `⚔️ Alien besiegt! **${amount}x ${spaceResources[res].emoji} ${res}** erbeutet!`;
              xpGain += 25;
              break;
            }
            case 'treasure': {
              const bonus = 200 + Math.floor(Math.random() * 500 * planet.danger);
              db.updateBalance(userId, bonus);
              const res = planet.resources[Math.floor(Math.random() * planet.resources.length)];
              const amount = Math.min(1, cargoFree);
              if (amount > 0) addCargo(userId, res, amount);
              resultText = `🏆 Schatz gefunden! **${config.currencySymbol}${bonus.toLocaleString()}** und **${amount}x ${res}**!`;
              xpGain += 20;
              break;
            }
            case 'discovery': {
              db.db.prepare('UPDATE spaceships SET planets_discovered = planets_discovered + 1 WHERE user_id = ?').run(userId);
              xpGain += 40;
              const res = planet.resources[Math.floor(Math.random() * planet.resources.length)];
              const amount = Math.min(3, cargoFree);
              if (amount > 0) addCargo(userId, res, amount);
              resultText = `🔭 Neue Entdeckung! **${amount}x ${spaceResources[res].emoji} ${res}** und massig XP!`;
              break;
            }
            case 'pirate_loot': {
              const bonus = 300 + Math.floor(Math.random() * 800);
              db.updateBalance(userId, bonus);
              db.db.prepare('UPDATE spaceships SET aliens_defeated = aliens_defeated + 1 WHERE user_id = ?').run(userId);
              resultText = `🏴‍☠️ Piraten besiegt! **${config.currencySymbol}${bonus.toLocaleString()}** erbeutet!`;
              xpGain += 30;
              break;
            }
            case 'jackpot': {
              const rareRes = planet.resources[planet.resources.length - 1];
              const amount = Math.min(3 + Math.floor(Math.random() * 3), cargoFree);
              if (amount > 0) addCargo(userId, rareRes, amount);
              const bonus = 500 + Math.floor(Math.random() * 1000);
              db.updateBalance(userId, bonus);
              resultText = `🌀 Das Wurmloch führt zu einem Schatzplaneten! **${amount}x ${spaceResources[rareRes].emoji} ${rareRes}** + **${config.currencySymbol}${bonus.toLocaleString()}**!`;
              xpGain += 50;
              break;
            }
            case 'xp_bonus': {
              xpGain += 60;
              resultText = `📊 Wertvolle Daten gesammelt! Massig XP gewonnen!`;
              break;
            }
            case 'fuel_save': {
              const refund = Math.floor(planet.fuelCost * 0.5);
              db.db.prepare('UPDATE spaceships SET fuel = MIN(max_fuel, fuel + ?) WHERE user_id = ?').run(refund, userId);
              resultText = `🛤️ Abkürzung gefunden! **${refund}** Treibstoff zurückgewonnen.`;
              const res = planet.resources[Math.floor(Math.random() * planet.resources.length)];
              const amount = Math.min(1, cargoFree);
              if (amount > 0) addCargo(userId, res, amount);
              break;
            }
            case 'safe_passage':
              resultText = '✅ Sicher durchgekommen.';
              break;
            default:
              resultText = '✅ Nichts Besonderes passiert.';
          }
        } else {
          xpGain = 5 + planet.danger * 3;
          switch (choice.fail) {
            case 'hull': {
              const dmg = Math.max(5, choice.failAmount - ship.shield_level * 5);
              db.db.prepare('UPDATE spaceships SET hull = MAX(0, hull - ?) WHERE user_id = ?').run(dmg, userId);
              resultText = `💥 **${dmg} Hüllenschaden** erlitten!`;
              break;
            }
            case 'fuel': {
              db.db.prepare('UPDATE spaceships SET fuel = MAX(0, fuel - ?) WHERE user_id = ?').run(choice.failAmount, userId);
              resultText = `⛽ **${choice.failAmount}** Treibstoff verloren!`;
              break;
            }
            case 'robbed': {
              const loss = Math.floor(200 + Math.random() * 300);
              const bal = db.getBalance(userId);
              const actualLoss = Math.min(loss, bal);
              if (actualLoss > 0) db.updateBalance(userId, -actualLoss);
              resultText = `😱 Ausgeraubt! **${config.currencySymbol}${actualLoss.toLocaleString()}** verloren!`;
              break;
            }
            case 'trap': {
              const dmg = choice.failAmount - ship.shield_level * 3;
              db.db.prepare('UPDATE spaceships SET hull = MAX(0, hull - ?) WHERE user_id = ?').run(Math.max(5, dmg), userId);
              resultText = `🪤 Falle! **${Math.max(5, dmg)} Hüllenschaden**!`;
              break;
            }
            default:
              resultText = '😐 Nichts passiert.';
          }
        }

        const leveled = addXP(userId, xpGain);
        const updatedShip = getShip(userId);

        const resultEmbed = new EmbedBuilder()
          .setColor(success ? '#27ae60' : '#e74c3c')
          .setTitle(`${planet.emoji} ${planet.name} — ${success ? 'Erfolg!' : 'Fehlschlag!'}`)
          .setDescription(
            `${resultText}\n\n` +
            `+**${xpGain} XP**` +
            (leveled ? ` 🎉 **LEVEL UP! → Level ${updatedShip.level}**` : '') +
            `\n\n⛽ ${updatedShip.fuel}/${updatedShip.max_fuel} | 🛡️ ${updatedShip.hull}/${updatedShip.max_hull} | 📦 ${getCargoTotal(userId)}/${updatedShip.cargo_space}`
          )
          .setFooter({ text: `Level ${updatedShip.level} | ${updatedShip.xp}/${updatedShip.level * 150} XP` })
          .setTimestamp();

        btn.update({ embeds: [resultEmbed], components: [] });
      });

      coll.on('end', (_, reason) => {
        if (reason === 'time') {
          msg.edit({ content: '⏰ Mission abgebrochen — keine Entscheidung getroffen.', components: [] });
        }
      });
    }
  },
};
