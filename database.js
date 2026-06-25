const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'economy.db'));

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    balance INTEGER DEFAULT 0,
    bank INTEGER DEFAULT 0,
    last_work TEXT,
    last_steal TEXT,
    last_daily TEXT,
    last_weekly TEXT
  );

  CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    item_name TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    UNIQUE(user_id, item_name)
  );

  CREATE TABLE IF NOT EXISTS shop_items (
    name TEXT PRIMARY KEY,
    price INTEGER NOT NULL,
    description TEXT,
    emoji TEXT DEFAULT '📦'
  );
`);

try { db.exec('ALTER TABLE users ADD COLUMN last_weekly TEXT'); } catch (_) {}

const defaultItems = [
  { name: 'Angel', price: 100, description: 'Eine Angel zum Fischen', emoji: '🎣' },
  { name: 'Schaufel', price: 200, description: 'Zum Graben nach Schätzen', emoji: '⛏️' },
  { name: 'Laptop', price: 500, description: 'Für digitale Arbeit', emoji: '💻' },
  { name: 'Schutzschild', price: 1000, description: 'Schützt vor Dieben (1x)', emoji: '🛡️' },
  { name: 'Glücksbringer', price: 750, description: '+10% beim Arbeiten', emoji: '🍀' },
  { name: 'Tresor', price: 2000, description: 'Erhöht Bank-Kapazität um 5000', emoji: '🔒' },
  { name: 'Diamant-Ring', price: 5000, description: 'Seltener Luxusartikel', emoji: '💎' },
  { name: 'Goldbarren', price: 10000, description: 'Wertanlage', emoji: '🪙' },
];

const insertItem = db.prepare(`INSERT OR IGNORE INTO shop_items (name, price, description, emoji) VALUES (?, ?, ?, ?)`);
for (const item of defaultItems) {
  insertItem.run(item.name, item.price, item.description, item.emoji);
}

function getUser(userId) {
  let user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId);
  if (!user) {
    db.prepare('INSERT INTO users (user_id, balance, bank) VALUES (?, 0, 0)').run(userId);
    user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId);
  }
  return user;
}

function updateBalance(userId, amount) {
  getUser(userId);
  db.prepare('UPDATE users SET balance = balance + ? WHERE user_id = ?').run(amount, userId);
  return getUser(userId);
}

function setBalance(userId, amount) {
  getUser(userId);
  db.prepare('UPDATE users SET balance = ? WHERE user_id = ?').run(amount, userId);
}

function getBalance(userId) {
  return getUser(userId).balance;
}

function getBank(userId) {
  return getUser(userId).bank;
}

function deposit(userId, amount) {
  const user = getUser(userId);
  if (user.balance < amount) return null;
  db.prepare('UPDATE users SET balance = balance - ?, bank = bank + ? WHERE user_id = ?').run(amount, amount, userId);
  return getUser(userId);
}

function withdraw(userId, amount) {
  const user = getUser(userId);
  if (user.bank < amount) return null;
  db.prepare('UPDATE users SET balance = balance + ?, bank = bank - ? WHERE user_id = ?').run(amount, amount, userId);
  return getUser(userId);
}

function setLastWork(userId) {
  getUser(userId);
  db.prepare('UPDATE users SET last_work = ? WHERE user_id = ?').run(new Date().toISOString(), userId);
}

function setLastSteal(userId) {
  getUser(userId);
  db.prepare('UPDATE users SET last_steal = ? WHERE user_id = ?').run(new Date().toISOString(), userId);
}

function setLastDaily(userId) {
  getUser(userId);
  db.prepare('UPDATE users SET last_daily = ? WHERE user_id = ?').run(new Date().toISOString(), userId);
}

function setLastWeekly(userId) {
  getUser(userId);
  db.prepare('UPDATE users SET last_weekly = ? WHERE user_id = ?').run(new Date().toISOString(), userId);
}

function getInventory(userId) {
  return db.prepare('SELECT * FROM inventory WHERE user_id = ?').all(userId);
}

function addToInventory(userId, itemName, quantity = 1) {
  const existing = db.prepare('SELECT * FROM inventory WHERE user_id = ? AND item_name = ?').get(userId, itemName);
  if (existing) {
    db.prepare('UPDATE inventory SET quantity = quantity + ? WHERE user_id = ? AND item_name = ?').run(quantity, userId, itemName);
  } else {
    db.prepare('INSERT INTO inventory (user_id, item_name, quantity) VALUES (?, ?, ?)').run(userId, itemName, quantity);
  }
}

function removeFromInventory(userId, itemName, quantity = 1) {
  const existing = db.prepare('SELECT * FROM inventory WHERE user_id = ? AND item_name = ?').get(userId, itemName);
  if (!existing || existing.quantity < quantity) return false;
  if (existing.quantity === quantity) {
    db.prepare('DELETE FROM inventory WHERE user_id = ? AND item_name = ?').run(userId, itemName);
  } else {
    db.prepare('UPDATE inventory SET quantity = quantity - ? WHERE user_id = ? AND item_name = ?').run(quantity, userId, itemName);
  }
  return true;
}

function hasItem(userId, itemName) {
  const item = db.prepare('SELECT * FROM inventory WHERE user_id = ? AND item_name = ?').get(userId, itemName);
  return item && item.quantity > 0;
}

function getShopItems() {
  return db.prepare('SELECT * FROM shop_items').all();
}

function getShopItem(name) {
  return db.prepare('SELECT * FROM shop_items WHERE name = ?').get(name);
}

function getTopUsers(limit = 10) {
  return db.prepare('SELECT user_id, balance + bank as total FROM users ORDER BY total DESC LIMIT ?').all(limit);
}

module.exports = {
  db, getUser, updateBalance, setBalance, getBalance, getBank,
  deposit, withdraw, setLastWork, setLastSteal, setLastDaily, setLastWeekly,
  getInventory, addToInventory, removeFromInventory, hasItem,
  getShopItems, getShopItem, getTopUsers,
};
