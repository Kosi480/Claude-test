const { EmbedBuilder } = require('discord.js');
const db = require('../database');

const stocks = [
  { symbol: 'DSCRD', name: 'Discord Inc.', basePrice: 500, volatility: 0.15 },
  { symbol: 'MINE', name: 'MineCraft AG', basePrice: 300, volatility: 0.2 },
  { symbol: 'COIN', name: 'CryptoCoin Ltd.', basePrice: 150, volatility: 0.4 },
  { symbol: 'FOOD', name: 'FoodDelivery GmbH', basePrice: 200, volatility: 0.1 },
  { symbol: 'TECH', name: 'TechGiant Corp.', basePrice: 800, volatility: 0.12 },
  { symbol: 'GAME', name: 'GameStudio SE', basePrice: 400, volatility: 0.25 },
  { symbol: 'MOON', name: 'MoonRocket Inc.', basePrice: 100, volatility: 0.5 },
  { symbol: 'SAFE', name: 'SafeBank AG', basePrice: 600, volatility: 0.05 },
];

const priceHistory = new Map();
const UPDATE_INTERVAL = 5 * 60 * 1000;
let lastUpdate = 0;

function updatePrices() {
  if (Date.now() - lastUpdate < UPDATE_INTERVAL) return;
  lastUpdate = Date.now();

  for (const stock of stocks) {
    const history = priceHistory.get(stock.symbol) || [stock.basePrice];
    const lastPrice = history[history.length - 1];
    const change = (Math.random() - 0.48) * stock.volatility * lastPrice;
    const newPrice = Math.max(10, Math.round(lastPrice + change));
    history.push(newPrice);
    if (history.length > 20) history.shift();
    priceHistory.set(stock.symbol, history);
  }
}

function getPrice(symbol) {
  updatePrices();
  const history = priceHistory.get(symbol);
  if (!history) return stocks.find(s => s.symbol === symbol)?.basePrice || 0;
  return history[history.length - 1];
}

function getPriceChange(symbol) {
  const history = priceHistory.get(symbol);
  if (!history || history.length < 2) return 0;
  const prev = history[history.length - 2];
  const curr = history[history.length - 1];
  return ((curr - prev) / prev * 100).toFixed(1);
}

function getTrend(symbol) {
  const history = priceHistory.get(symbol);
  if (!history || history.length < 3) return '➡️';
  const recent = history.slice(-5);
  const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const curr = recent[recent.length - 1];
  if (curr > avg * 1.02) return '📈';
  if (curr < avg * 0.98) return '📉';
  return '➡️';
}

function initPrices() {
  for (const stock of stocks) {
    if (!priceHistory.has(stock.symbol)) {
      priceHistory.set(stock.symbol, [stock.basePrice]);
    }
  }
  updatePrices();
}

initPrices();

db.db.exec(`
  CREATE TABLE IF NOT EXISTS user_stocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    symbol TEXT NOT NULL,
    shares INTEGER DEFAULT 0,
    avg_buy_price INTEGER DEFAULT 0,
    UNIQUE(user_id, symbol)
  );
`);

module.exports = {
  name: 'stocks',
  aliases: ['aktien', 'stock', 'börse'],
  description: 'Aktienmarkt (!stocks, !stocks buy/sell <SYMBOL> <Anzahl>)',
  execute(message, args) {
    const userId = message.author.id;
    const config = require('../config.json');
    const action = (args[0] || 'list').toLowerCase();

    updatePrices();

    if (action === 'list' || action === 'liste' || action === 'markt') {
      const lines = stocks.map(s => {
        const price = getPrice(s.symbol);
        const change = getPriceChange(s.symbol);
        const trend = getTrend(s.symbol);
        const changeStr = change >= 0 ? `+${change}%` : `${change}%`;
        return `${trend} **${s.symbol}** — ${s.name}\n┗ ${config.currencySymbol}${price.toLocaleString()} (${changeStr})`;
      });

      const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle('📊 Aktienmarkt')
        .setDescription(lines.join('\n\n'))
        .setFooter({ text: `Kaufen: ${config.prefix}stocks buy <SYMBOL> <Anzahl> | Kurse ändern sich alle 5 Min` })
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }

    if (action === 'buy' || action === 'kaufen') {
      const symbol = (args[1] || '').toUpperCase();
      const stock = stocks.find(s => s.symbol === symbol);
      if (!stock) return message.reply(`❌ Unbekannte Aktie! Nutze \`${config.prefix}stocks\` für alle Aktien.`);

      const shares = parseInt(args[2]) || 1;
      if (shares <= 0) return message.reply('❌ Ungültige Anzahl!');

      const price = getPrice(symbol);
      const totalCost = price * shares;
      const balance = db.getBalance(userId);

      if (balance < totalCost) {
        return message.reply(`❌ ${shares}x ${symbol} kostet **${config.currencySymbol}${totalCost.toLocaleString()}**, du hast nur **${config.currencySymbol}${balance.toLocaleString()}**!`);
      }

      db.updateBalance(userId, -totalCost);

      const existing = db.db.prepare('SELECT * FROM user_stocks WHERE user_id = ? AND symbol = ?').get(userId, symbol);
      if (existing) {
        const newTotal = existing.shares + shares;
        const newAvg = Math.round((existing.avg_buy_price * existing.shares + price * shares) / newTotal);
        db.db.prepare('UPDATE user_stocks SET shares = ?, avg_buy_price = ? WHERE user_id = ? AND symbol = ?')
          .run(newTotal, newAvg, userId, symbol);
      } else {
        db.db.prepare('INSERT INTO user_stocks (user_id, symbol, shares, avg_buy_price) VALUES (?, ?, ?, ?)')
          .run(userId, symbol, shares, price);
      }

      const embed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle('📈 Aktien gekauft!')
        .setDescription(`**${shares}x ${symbol}** für **${config.currencySymbol}${totalCost.toLocaleString()}** gekauft!\nKurs: ${config.currencySymbol}${price}/Aktie`)
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }

    if (action === 'sell' || action === 'verkaufen') {
      const symbol = (args[1] || '').toUpperCase();
      const stock = stocks.find(s => s.symbol === symbol);
      if (!stock) return message.reply(`❌ Unbekannte Aktie!`);

      const holding = db.db.prepare('SELECT * FROM user_stocks WHERE user_id = ? AND symbol = ?').get(userId, symbol);
      if (!holding || holding.shares <= 0) return message.reply(`❌ Du besitzt keine **${symbol}**-Aktien!`);

      const shares = args[2] === 'all' || args[2] === 'alles' ? holding.shares : (parseInt(args[2]) || 1);
      if (shares <= 0 || shares > holding.shares) return message.reply(`❌ Du hast nur **${holding.shares}** ${symbol}-Aktien!`);

      const price = getPrice(symbol);
      const totalValue = price * shares;
      const profit = (price - holding.avg_buy_price) * shares;

      db.updateBalance(userId, totalValue);

      const remaining = holding.shares - shares;
      if (remaining <= 0) {
        db.db.prepare('DELETE FROM user_stocks WHERE user_id = ? AND symbol = ?').run(userId, symbol);
      } else {
        db.db.prepare('UPDATE user_stocks SET shares = ? WHERE user_id = ? AND symbol = ?').run(remaining, userId, symbol);
      }

      const profitStr = profit >= 0 ? `+${config.currencySymbol}${profit.toLocaleString()}` : `-${config.currencySymbol}${Math.abs(profit).toLocaleString()}`;

      const embed = new EmbedBuilder()
        .setColor(profit >= 0 ? '#2ecc71' : '#e74c3c')
        .setTitle('📉 Aktien verkauft!')
        .setDescription(
          `**${shares}x ${symbol}** für **${config.currencySymbol}${totalValue.toLocaleString()}** verkauft!\n` +
          `Gewinn/Verlust: **${profitStr}**`
        )
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }

    if (action === 'portfolio' || action === 'depot') {
      const holdings = db.db.prepare('SELECT * FROM user_stocks WHERE user_id = ? AND shares > 0').all(userId);

      if (!holdings.length) return message.reply('📊 Dein Depot ist leer!');

      let totalValue = 0;
      let totalProfit = 0;

      const lines = holdings.map(h => {
        const price = getPrice(h.symbol);
        const value = price * h.shares;
        const profit = (price - h.avg_buy_price) * h.shares;
        totalValue += value;
        totalProfit += profit;
        const profitStr = profit >= 0 ? `+${config.currencySymbol}${profit}` : `-${config.currencySymbol}${Math.abs(profit)}`;
        return `**${h.symbol}** — ${h.shares}x @ ${config.currencySymbol}${price}\n┗ Wert: ${config.currencySymbol}${value.toLocaleString()} (${profitStr})`;
      });

      const embed = new EmbedBuilder()
        .setColor(totalProfit >= 0 ? '#2ecc71' : '#e74c3c')
        .setTitle('💼 Dein Depot')
        .setDescription(lines.join('\n\n'))
        .addFields(
          { name: '💰 Depotwert', value: `${config.currencySymbol}${totalValue.toLocaleString()}`, inline: true },
          { name: '📊 Gewinn/Verlust', value: `${totalProfit >= 0 ? '+' : ''}${config.currencySymbol}${totalProfit.toLocaleString()}`, inline: true },
        )
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }

    message.reply(`📊 Nutzung: \`${config.prefix}stocks\` | \`buy/sell <SYMBOL> <Anzahl>\` | \`portfolio\``);
  },
};
