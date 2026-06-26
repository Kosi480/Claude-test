const { createTestDb } = require('./mocks');

let testDb;

function setupTestDb() {
  testDb = createTestDb();

  const mockDbModule = {
    db: testDb,
    getUser(userId) {
      let user = testDb.prepare('SELECT * FROM users WHERE user_id = ?').get(userId);
      if (!user) {
        testDb.prepare('INSERT INTO users (user_id, balance, bank) VALUES (?, 0, 0)').run(userId);
        user = testDb.prepare('SELECT * FROM users WHERE user_id = ?').get(userId);
      }
      return user;
    },
    updateBalance(userId, amount) {
      this.getUser(userId);
      testDb.prepare('UPDATE users SET balance = balance + ? WHERE user_id = ?').run(amount, userId);
      return this.getUser(userId);
    },
    setBalance(userId, amount) {
      this.getUser(userId);
      testDb.prepare('UPDATE users SET balance = ? WHERE user_id = ?').run(amount, userId);
    },
    getBalance(userId) { return this.getUser(userId).balance; },
    getBank(userId) { return this.getUser(userId).bank; },
    deposit(userId, amount) {
      const user = this.getUser(userId);
      if (user.balance < amount) return null;
      testDb.prepare('UPDATE users SET balance = balance - ?, bank = bank + ? WHERE user_id = ?').run(amount, amount, userId);
      return this.getUser(userId);
    },
    withdraw(userId, amount) {
      const user = this.getUser(userId);
      if (user.bank < amount) return null;
      testDb.prepare('UPDATE users SET balance = balance + ?, bank = bank - ? WHERE user_id = ?').run(amount, amount, userId);
      return this.getUser(userId);
    },
    setLastWork(userId) {
      this.getUser(userId);
      testDb.prepare('UPDATE users SET last_work = ? WHERE user_id = ?').run(new Date().toISOString(), userId);
    },
    setLastSteal(userId) {
      this.getUser(userId);
      testDb.prepare('UPDATE users SET last_steal = ? WHERE user_id = ?').run(new Date().toISOString(), userId);
    },
    setLastDaily(userId) {
      this.getUser(userId);
      testDb.prepare('UPDATE users SET last_daily = ? WHERE user_id = ?').run(new Date().toISOString(), userId);
    },
    setLastWeekly(userId) {
      this.getUser(userId);
      testDb.prepare('UPDATE users SET last_weekly = ? WHERE user_id = ?').run(new Date().toISOString(), userId);
    },
    getInventory(userId) { return testDb.prepare('SELECT * FROM inventory WHERE user_id = ?').all(userId); },
    addToInventory(userId, itemName, quantity = 1) {
      const existing = testDb.prepare('SELECT * FROM inventory WHERE user_id = ? AND item_name = ?').get(userId, itemName);
      if (existing) {
        testDb.prepare('UPDATE inventory SET quantity = quantity + ? WHERE user_id = ? AND item_name = ?').run(quantity, userId, itemName);
      } else {
        testDb.prepare('INSERT INTO inventory (user_id, item_name, quantity) VALUES (?, ?, ?)').run(userId, itemName, quantity);
      }
    },
    removeFromInventory(userId, itemName, quantity = 1) {
      const existing = testDb.prepare('SELECT * FROM inventory WHERE user_id = ? AND item_name = ?').get(userId, itemName);
      if (!existing || existing.quantity < quantity) return false;
      if (existing.quantity === quantity) {
        testDb.prepare('DELETE FROM inventory WHERE user_id = ? AND item_name = ?').run(userId, itemName);
      } else {
        testDb.prepare('UPDATE inventory SET quantity = quantity - ? WHERE user_id = ? AND item_name = ?').run(quantity, userId, itemName);
      }
      return true;
    },
    hasItem(userId, itemName) {
      const item = testDb.prepare('SELECT * FROM inventory WHERE user_id = ? AND item_name = ?').get(userId, itemName);
      return item && item.quantity > 0;
    },
    getShopItems() { return testDb.prepare('SELECT * FROM shop_items').all(); },
    getShopItem(name) { return testDb.prepare('SELECT * FROM shop_items WHERE name = ?').get(name); },
    getTopUsers(limit = 10) {
      return testDb.prepare('SELECT user_id, balance + bank as total FROM users ORDER BY total DESC LIMIT ?').all(limit);
    }
  };

  jest.doMock('../../database', () => mockDbModule);

  jest.doMock('../../config.json', () => ({
    token: 'fake-token',
    clientId: 'fake-client-id',
    guildId: 'fake-guild-id',
    currencySymbol: '💰',
    currencyName: 'Coins'
  }));

  return mockDbModule;
}

function seedEconomy(db, userId, balance = 10000) {
  const existing = db.db.prepare('SELECT * FROM economy WHERE user_id = ?').get(userId);
  if (existing) {
    db.db.prepare('UPDATE economy SET balance = ? WHERE user_id = ?').run(balance, userId);
  } else {
    db.db.prepare('INSERT INTO economy (user_id, balance) VALUES (?, ?)').run(userId, balance);
  }
  db.setBalance(userId, balance);
}

function closeTestDb() {
  if (testDb) {
    testDb.close();
    testDb = null;
  }
}

module.exports = { setupTestDb, seedEconomy, closeTestDb };
