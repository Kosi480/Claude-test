const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const SAIL_COOLDOWN = 5 * 60 * 1000;
const cooldowns = new Map();

const ships = [
  { id: 'floss', name: 'Floß', emoji: '🪵', capacity: 5, speed: 1, price: 0 },
  { id: 'boot', name: 'Fischerboot', emoji: '🚣', capacity: 10, speed: 2, price: 2000 },
  { id: 'segler', name: 'Segelschiff', emoji: '⛵', capacity: 20, speed: 3, price: 8000 },
  { id: 'galeone', name: 'Galeone', emoji: '🚢', capacity: 40, speed: 4, price: 25000 },
  { id: 'kriegsschiff', name: 'Kriegsschiff', emoji: '⚓', capacity: 70, speed: 5, price: 60000 },
  { id: 'flaggschiff', name: 'Flaggschiff', emoji: '🏴‍☠️', capacity: 100, speed: 6, price: 150000 },
];

const ports = [
  { id: 'hafen_stadt', name: 'Hafenstadt', emoji: '🏘️', buys: ['Fisch', 'Holz'], sells: ['Gewürze', 'Seide'] },
  { id: 'tropeninsel', name: 'Tropeninsel', emoji: '🏝️', buys: ['Gewürze', 'Rum'], sells: ['Fisch', 'Perlen'] },
  { id: 'nordland', name: 'Nordland', emoji: '🏔️', buys: ['Pelze', 'Holz'], sells: ['Erz', 'Fisch'] },
  { id: 'wuestenhafen', name: 'Wüstenhafen', emoji: '🏜️', buys: ['Seide', 'Gewürze'], sells: ['Gold', 'Edelsteine'] },
  { id: 'kaiserreich', name: 'Kaiserreich', emoji: '🏯', buys: ['Seide', 'Perlen'], sells: ['Porzellan', 'Tee'] },
  { id: 'piratenbucht', name: 'Piratenbucht', emoji: '☠️', buys: ['Rum', 'Waffen'], sells: ['Schmuggelware', 'Karten'] },
];

const goods = [
  { name: 'Fisch', emoji: '🐟', basePrice: 20 },
  { name: 'Holz', emoji: '🪵', basePrice: 30 },
  { name: 'Gewürze', emoji: '🌶️', basePrice: 80 },
  { name: 'Seide', emoji: '🧵', basePrice: 120 },
  { name: 'Rum', emoji: '🍺', basePrice: 60 },
  { name: 'Pelze', emoji: '🧥', basePrice: 90 },
  { name: 'Erz', emoji: '⛏️', basePrice: 50 },
  { name: 'Perlen', emoji: '🦪', basePrice: 150 },
  { name: 'Gold', emoji: '🥇', basePrice: 200 },
  { name: 'Edelsteine', emoji: '💎', basePrice: 250 },
  { name: 'Porzellan', emoji: '🏺', basePrice: 110 },
  { name: 'Tee', emoji: '🍵', basePrice: 70 },
  { name: 'Schmuggelware', emoji: '📦', basePrice: 180 },
  { name: 'Karten', emoji: '🗺️', basePrice: 100 },
  { name: 'Waffen', emoji: '⚔️', basePrice: 160 },
];

function getDynamicPrice(good, portId, isBuying) {
  let hash = 0;
  const seed = `${good.name}_${portId}_${Math.floor(Date.now() / (60 * 60 * 1000))}`;
  for (let i = 0; i < seed.length; i++) hash = ((hash << 5) - hash) + seed.charCodeAt(i);
  const fluctuation = 0.7 + (Math.abs(hash % 60) / 100);
  const price = Math.floor(good.basePrice * fluctuation);
  return isBuying ? Math.floor(price * 1.1) : Math.floor(price * 0.9);
}

function ensureHarborTable() {
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS harbor (
      user_id TEXT PRIMARY KEY,
      ship_id TEXT DEFAULT 'floss',
      current_port TEXT DEFAULT 'hafen_stadt',
      total_trades INTEGER DEFAULT 0,
      total_profit INTEGER DEFAULT 0,
      voyages INTEGER DEFAULT 0,
      trader_level INTEGER DEFAULT 1,
      trader_xp INTEGER DEFAULT 0
    )
  `);
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS ship_cargo (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      good_name TEXT NOT NULL,
      quantity INTEGER DEFAULT 0,
      buy_price INTEGER DEFAULT 0,
      UNIQUE(user_id, good_name)
    )
  `);
}

function getTrader(userId) {
  let trader = db.db.prepare('SELECT * FROM harbor WHERE user_id = ?').get(userId);
  if (!trader) {
    db.db.prepare('INSERT INTO harbor (user_id) VALUES (?)').run(userId);
    trader = db.db.prepare('SELECT * FROM harbor WHERE user_id = ?').get(userId);
  }
  return trader;
}

function getCargo(userId) {
  return db.db.prepare('SELECT * FROM ship_cargo WHERE user_id = ? AND quantity > 0').all(userId);
}

function getCargoTotal(userId) {
  const result = db.db.prepare('SELECT COALESCE(SUM(quantity), 0) as total FROM ship_cargo WHERE user_id = ?').get(userId);
  return result.total;
}

function getXpForLevel(level) {
  return Math.floor(100 * Math.pow(level, 1.3));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hafen')
    .setDescription('Seehandel — Kaufe Waren, segle zwischen Häfen, verkaufe mit Gewinn!')
    .addSubcommand(sub =>
      sub.setName('status')
        .setDescription('Zeige deinen Händler-Status'))
    .addSubcommand(sub =>
      sub.setName('markt')
        .setDescription('Zeige Waren im aktuellen Hafen'))
    .addSubcommand(sub =>
      sub.setName('kaufen')
        .setDescription('Kaufe Waren')
        .addStringOption(opt =>
          opt.setName('ware')
            .setDescription('Welche Ware?')
            .setRequired(true))
        .addIntegerOption(opt =>
          opt.setName('menge')
            .setDescription('Wie viele?')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(100)))
    .addSubcommand(sub =>
      sub.setName('verkaufen')
        .setDescription('Verkaufe Waren')
        .addStringOption(opt =>
          opt.setName('ware')
            .setDescription('Welche Ware?')
            .setRequired(true))
        .addIntegerOption(opt =>
          opt.setName('menge')
            .setDescription('Wie viele?')
            .setRequired(true)
            .setMinValue(1)))
    .addSubcommand(sub =>
      sub.setName('segeln')
        .setDescription('Segle zu einem anderen Hafen')
        .addStringOption(opt =>
          opt.setName('ziel')
            .setDescription('Wohin segeln?')
            .setRequired(true)
            .addChoices(...ports.map(p => ({ name: `${p.emoji} ${p.name}`, value: p.id })))))
    .addSubcommand(sub =>
      sub.setName('werft')
        .setDescription('Kaufe ein besseres Schiff')
        .addStringOption(opt =>
          opt.setName('schiff')
            .setDescription('Welches Schiff?')
            .addChoices(...ships.filter(s => s.price > 0).map(s => ({ name: `${s.emoji} ${s.name} (${s.price}$)`, value: s.id })))))
    .addSubcommand(sub =>
      sub.setName('fracht')
        .setDescription('Zeige deine Ladung')),
  async execute(interaction) {
    ensureHarborTable();
    const userId = interaction.user.id;
    const config = require('../config.json');
    const action = interaction.options.getSubcommand();

    if (action === 'status') {
      const trader = getTrader(userId);
      const ship = ships.find(s => s.id === trader.ship_id) || ships[0];
      const port = ports.find(p => p.id === trader.current_port) || ports[0];
      const cargoTotal = getCargoTotal(userId);
      const xpNeeded = getXpForLevel(trader.trader_level);

      const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle(`⚓ ${interaction.user.username}'s Handels-Profil`)
        .setDescription(
          `📊 Händler-Level: **${trader.trader_level}** (XP: ${trader.trader_xp}/${xpNeeded})\n\n` +
          `${ship.emoji} Schiff: **${ship.name}**\n` +
          `📦 Fracht: **${cargoTotal}/${ship.capacity}**\n` +
          `${port.emoji} Standort: **${port.name}**\n\n` +
          `🔄 Trades: **${trader.total_trades}**\n` +
          `💰 Profit: **${config.currencySymbol}${trader.total_profit.toLocaleString()}**\n` +
          `🚢 Reisen: **${trader.voyages}**`
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'markt') {
      const trader = getTrader(userId);
      const port = ports.find(p => p.id === trader.current_port);

      const buyGoods = port.sells.map(name => {
        const good = goods.find(g => g.name === name);
        const price = getDynamicPrice(good, port.id, true);
        return `${good.emoji} **${good.name}** — ${config.currencySymbol}${price}/Stk. *(Kaufen)*`;
      });

      const sellGoods = port.buys.map(name => {
        const good = goods.find(g => g.name === name);
        const price = getDynamicPrice(good, port.id, false);
        return `${good.emoji} **${good.name}** — ${config.currencySymbol}${price}/Stk. *(Verkaufen)*`;
      });

      const embed = new EmbedBuilder()
        .setColor('#e67e22')
        .setTitle(`${port.emoji} Markt — ${port.name}`)
        .setDescription(
          `**Zum Kaufen verfügbar:**\n${buyGoods.join('\n')}\n\n` +
          `**Ankauf (wir kaufen):**\n${sellGoods.join('\n')}\n\n` +
          `💡 Preise ändern sich stündlich!`
        )
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'kaufen') {
      const trader = getTrader(userId);
      const ship = ships.find(s => s.id === trader.ship_id) || ships[0];
      const port = ports.find(p => p.id === trader.current_port);
      const wareName = interaction.options.getString('ware');
      const qty = interaction.options.getInteger('menge');

      const good = goods.find(g => g.name.toLowerCase() === wareName.toLowerCase());
      if (!good) return interaction.reply(`❌ Ware **${wareName}** nicht gefunden!`);
      if (!port.sells.includes(good.name)) return interaction.reply(`❌ **${good.name}** wird hier nicht verkauft!`);

      const cargoTotal = getCargoTotal(userId);
      if (cargoTotal + qty > ship.capacity) {
        return interaction.reply(`❌ Nicht genug Platz! Fracht: ${cargoTotal}/${ship.capacity}, brauchst ${qty} Plätze.`);
      }

      const price = getDynamicPrice(good, port.id, true);
      const totalCost = price * qty;

      if (db.getBalance(userId) < totalCost) {
        return interaction.reply(`❌ Kosten: **${config.currencySymbol}${totalCost.toLocaleString()}** (${qty}x ${config.currencySymbol}${price})`);
      }

      db.updateBalance(userId, -totalCost);

      const existing = db.db.prepare('SELECT * FROM ship_cargo WHERE user_id = ? AND good_name = ?').get(userId, good.name);
      if (existing) {
        const newAvg = Math.floor(((existing.buy_price * existing.quantity) + (price * qty)) / (existing.quantity + qty));
        db.db.prepare('UPDATE ship_cargo SET quantity = quantity + ?, buy_price = ? WHERE user_id = ? AND good_name = ?')
          .run(qty, newAvg, userId, good.name);
      } else {
        db.db.prepare('INSERT INTO ship_cargo (user_id, good_name, quantity, buy_price) VALUES (?, ?, ?, ?)')
          .run(userId, good.name, qty, price);
      }

      db.db.prepare('UPDATE harbor SET total_trades = total_trades + 1 WHERE user_id = ?').run(userId);

      const embed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle(`${good.emoji} ${qty}x ${good.name} gekauft!`)
        .setDescription(
          `💰 Kosten: **${config.currencySymbol}${totalCost.toLocaleString()}** (${config.currencySymbol}${price}/Stk.)\n` +
          `📦 Fracht: **${cargoTotal + qty}/${ship.capacity}**`
        )
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'verkaufen') {
      const trader = getTrader(userId);
      const port = ports.find(p => p.id === trader.current_port);
      const wareName = interaction.options.getString('ware');
      const qty = interaction.options.getInteger('menge');

      const good = goods.find(g => g.name.toLowerCase() === wareName.toLowerCase());
      if (!good) return interaction.reply(`❌ Ware **${wareName}** nicht gefunden!`);
      if (!port.buys.includes(good.name)) return interaction.reply(`❌ **${good.name}** wird hier nicht angekauft!`);

      const cargo = db.db.prepare('SELECT * FROM ship_cargo WHERE user_id = ? AND good_name = ?').get(userId, good.name);
      if (!cargo || cargo.quantity < qty) {
        return interaction.reply(`❌ Du hast nur **${cargo ? cargo.quantity : 0}x ${good.name}**!`);
      }

      const sellPrice = getDynamicPrice(good, port.id, false);
      const levelBonus = 1 + trader.trader_level * 0.02;
      const finalPrice = Math.floor(sellPrice * levelBonus);
      const totalRevenue = finalPrice * qty;
      const profit = (finalPrice - cargo.buy_price) * qty;

      db.updateBalance(userId, totalRevenue);

      if (cargo.quantity === qty) {
        db.db.prepare('DELETE FROM ship_cargo WHERE user_id = ? AND good_name = ?').run(userId, good.name);
      } else {
        db.db.prepare('UPDATE ship_cargo SET quantity = quantity - ? WHERE user_id = ? AND good_name = ?')
          .run(qty, userId, good.name);
      }

      const xpGain = Math.max(5, Math.floor(Math.abs(profit) / 50));
      db.db.prepare('UPDATE harbor SET total_trades = total_trades + 1, total_profit = total_profit + ?, trader_xp = trader_xp + ? WHERE user_id = ?')
        .run(Math.max(0, profit), xpGain, userId);

      const updatedTrader = getTrader(userId);
      let levelUp = '';
      const xpNeeded = getXpForLevel(updatedTrader.trader_level);
      if (updatedTrader.trader_xp >= xpNeeded) {
        db.db.prepare('UPDATE harbor SET trader_level = trader_level + 1, trader_xp = trader_xp - ? WHERE user_id = ?')
          .run(xpNeeded, userId);
        levelUp = `\n\n🎉 **LEVEL UP!** Händler-Level **${updatedTrader.trader_level + 1}**! (+2% Verkaufsbonus)`;
      }

      const embed = new EmbedBuilder()
        .setColor(profit > 0 ? '#2ecc71' : '#e74c3c')
        .setTitle(`${good.emoji} ${qty}x ${good.name} verkauft!`)
        .setDescription(
          `💰 Erlös: **${config.currencySymbol}${totalRevenue.toLocaleString()}** (${config.currencySymbol}${finalPrice}/Stk.)\n` +
          `📊 Einkauf war: ${config.currencySymbol}${cargo.buy_price}/Stk.\n` +
          `${profit >= 0 ? '📈' : '📉'} Profit: **${profit >= 0 ? '+' : ''}${config.currencySymbol}${profit.toLocaleString()}**\n` +
          `✨ XP: **+${xpGain}**` +
          levelUp
        )
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'segeln') {
      const lastSail = cooldowns.get(userId);
      if (lastSail && Date.now() - lastSail < SAIL_COOLDOWN) {
        const remaining = Math.ceil((SAIL_COOLDOWN - (Date.now() - lastSail)) / 1000);
        return interaction.reply(`⏳ Nächste Reise in **${Math.ceil(remaining / 60)}min**!`);
      }

      const trader = getTrader(userId);
      const zielId = interaction.options.getString('ziel');

      if (zielId === trader.current_port) return interaction.reply('❌ Du bist schon in diesem Hafen!');

      const ship = ships.find(s => s.id === trader.ship_id) || ships[0];
      const fromPort = ports.find(p => p.id === trader.current_port);
      const toPort = ports.find(p => p.id === zielId);

      cooldowns.set(userId, Date.now());

      const eventRoll = Math.random();
      let eventText = '';
      let eventEffect = 0;

      if (eventRoll < 0.1) {
        const loss = Math.floor(100 + Math.random() * 500);
        eventEffect = -loss;
        eventText = `🏴‍☠️ **Piratenangriff!** Du verlierst **${config.currencySymbol}${loss}** bei der Verteidigung!`;
        db.updateBalance(userId, -Math.min(loss, db.getBalance(userId)));
      } else if (eventRoll < 0.2) {
        const find = Math.floor(200 + Math.random() * 800);
        eventEffect = find;
        eventText = `🗺️ **Treibgut gefunden!** Du bergst **+${config.currencySymbol}${find}**!`;
        db.updateBalance(userId, find);
      } else if (eventRoll < 0.28) {
        eventText = `🌊 **Sturm!** Dein Schiff wird beschädigt, aber du kommst durch!`;
      } else if (eventRoll < 0.35) {
        const bonus = 100 + Math.floor(Math.random() * 300);
        eventEffect = bonus;
        eventText = `🐬 **Delfine!** Sie führen dich zu einem Fischschwarm! **+${config.currencySymbol}${bonus}**`;
        db.updateBalance(userId, bonus);
      }

      db.db.prepare('UPDATE harbor SET current_port = ?, voyages = voyages + 1, trader_xp = trader_xp + 10 WHERE user_id = ?')
        .run(zielId, userId);

      const embed = new EmbedBuilder()
        .setColor('#1abc9c')
        .setTitle(`${ship.emoji} Reise nach ${toPort.emoji} ${toPort.name}`)
        .setDescription(
          `${fromPort.emoji} ${fromPort.name} ➡️ ${toPort.emoji} ${toPort.name}\n\n` +
          (eventText ? `${eventText}\n\n` : '⛵ Ruhige See — eine angenehme Reise!\n\n') +
          `Du bist angekommen! Schau dir den Markt an mit \`/hafen markt\`.`
        )
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'werft') {
      const trader = getTrader(userId);
      const buyId = interaction.options.getString('schiff');

      if (buyId) {
        const newShip = ships.find(s => s.id === buyId);
        const currentIdx = ships.findIndex(s => s.id === trader.ship_id);
        const newIdx = ships.findIndex(s => s.id === buyId);
        if (newIdx <= currentIdx) return interaction.reply('❌ Du hast schon ein gleich gutes oder besseres Schiff!');
        if (db.getBalance(userId) < newShip.price) {
          return interaction.reply(`❌ Kostet **${config.currencySymbol}${newShip.price.toLocaleString()}**!`);
        }

        db.updateBalance(userId, -newShip.price);
        db.db.prepare('UPDATE harbor SET ship_id = ? WHERE user_id = ?').run(newShip.id, userId);

        const embed = new EmbedBuilder()
          .setColor('#FFD700')
          .setTitle(`${newShip.emoji} ${newShip.name} gekauft!`)
          .setDescription(
            `📦 Kapazität: **${newShip.capacity}** Waren\n` +
            `💨 Geschwindigkeit: **${newShip.speed}**`
          )
          .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      const current = ships.find(s => s.id === trader.ship_id) || ships[0];
      const list = ships.map(s => {
        const owned = ships.indexOf(s) <= ships.indexOf(current);
        return `${s.emoji} **${s.name}** — 📦 ${s.capacity} | 💨 ${s.speed} ${owned ? '✅' : `| ${config.currencySymbol}${s.price.toLocaleString()}`}`;
      });

      const embed = new EmbedBuilder()
        .setColor('#2c3e50')
        .setTitle('⚓ Werft')
        .setDescription(`Aktuell: ${current.emoji} **${current.name}**\n\n${list.join('\n')}`)
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'fracht') {
      const trader = getTrader(userId);
      const ship = ships.find(s => s.id === trader.ship_id) || ships[0];
      const cargo = getCargo(userId);

      if (cargo.length === 0) {
        return interaction.reply('📦 Dein Laderaum ist leer! Kaufe Waren mit `/hafen kaufen`.');
      }

      const cargoTotal = cargo.reduce((s, c) => s + c.quantity, 0);
      const list = cargo.map(c => {
        const good = goods.find(g => g.name === c.good_name);
        return `${good ? good.emoji : '📦'} **${c.good_name}** x${c.quantity} (EK: ${config.currencySymbol}${c.buy_price}/Stk.)`;
      });

      const embed = new EmbedBuilder()
        .setColor('#e67e22')
        .setTitle(`📦 ${ship.emoji} Fracht — ${ship.name}`)
        .setDescription(
          `📦 **${cargoTotal}/${ship.capacity}** belegt\n\n` +
          list.join('\n')
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }
  },
};
