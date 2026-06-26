const { setupTestDb, closeTestDb } = require('./helpers/setup');

let db;

beforeEach(() => {
  jest.resetModules();
  db = setupTestDb();
});

afterEach(() => {
  closeTestDb();
});

describe('Database - User Management', () => {
  test('getUser creates new user if not exists', () => {
    const user = db.getUser('new-user');
    expect(user).toBeDefined();
    expect(user.user_id).toBe('new-user');
    expect(user.balance).toBe(0);
    expect(user.bank).toBe(0);
  });

  test('getUser returns existing user', () => {
    db.getUser('existing');
    db.updateBalance('existing', 500);
    const user = db.getUser('existing');
    expect(user.balance).toBe(500);
  });
});

describe('Database - Balance Operations', () => {
  test('updateBalance adds coins', () => {
    db.getUser('user1');
    const user = db.updateBalance('user1', 1000);
    expect(user.balance).toBe(1000);
  });

  test('updateBalance subtracts coins', () => {
    db.getUser('user1');
    db.updateBalance('user1', 1000);
    const user = db.updateBalance('user1', -300);
    expect(user.balance).toBe(700);
  });

  test('setBalance sets exact amount', () => {
    db.setBalance('user1', 5000);
    expect(db.getBalance('user1')).toBe(5000);
  });

  test('getBalance returns correct value', () => {
    db.updateBalance('user1', 750);
    expect(db.getBalance('user1')).toBe(750);
  });
});

describe('Database - Bank Operations', () => {
  test('deposit moves money from balance to bank', () => {
    db.updateBalance('user1', 1000);
    const user = db.deposit('user1', 400);
    expect(user.balance).toBe(600);
    expect(user.bank).toBe(400);
  });

  test('deposit returns null if insufficient balance', () => {
    db.updateBalance('user1', 100);
    const result = db.deposit('user1', 500);
    expect(result).toBeNull();
  });

  test('withdraw moves money from bank to balance', () => {
    db.updateBalance('user1', 1000);
    db.deposit('user1', 800);
    const user = db.withdraw('user1', 300);
    expect(user.balance).toBe(500);
    expect(user.bank).toBe(500);
  });

  test('withdraw returns null if insufficient bank', () => {
    db.updateBalance('user1', 1000);
    db.deposit('user1', 200);
    const result = db.withdraw('user1', 500);
    expect(result).toBeNull();
  });

  test('getBank returns correct value', () => {
    db.updateBalance('user1', 1000);
    db.deposit('user1', 600);
    expect(db.getBank('user1')).toBe(600);
  });
});

describe('Database - Inventory', () => {
  test('addToInventory adds new item', () => {
    db.addToInventory('user1', 'Schwert', 1);
    const inv = db.getInventory('user1');
    expect(inv.length).toBe(1);
    expect(inv[0].item_name).toBe('Schwert');
    expect(inv[0].quantity).toBe(1);
  });

  test('addToInventory stacks existing items', () => {
    db.addToInventory('user1', 'Trank', 3);
    db.addToInventory('user1', 'Trank', 2);
    const inv = db.getInventory('user1');
    expect(inv.length).toBe(1);
    expect(inv[0].quantity).toBe(5);
  });

  test('removeFromInventory decreases quantity', () => {
    db.addToInventory('user1', 'Trank', 5);
    const result = db.removeFromInventory('user1', 'Trank', 2);
    expect(result).toBe(true);
    const inv = db.getInventory('user1');
    expect(inv[0].quantity).toBe(3);
  });

  test('removeFromInventory deletes item at zero', () => {
    db.addToInventory('user1', 'Trank', 3);
    db.removeFromInventory('user1', 'Trank', 3);
    const inv = db.getInventory('user1');
    expect(inv.length).toBe(0);
  });

  test('removeFromInventory returns false if not enough', () => {
    db.addToInventory('user1', 'Trank', 1);
    const result = db.removeFromInventory('user1', 'Trank', 5);
    expect(result).toBe(false);
  });

  test('removeFromInventory returns false if item missing', () => {
    const result = db.removeFromInventory('user1', 'NichtExistent', 1);
    expect(result).toBe(false);
  });

  test('hasItem returns true for existing item', () => {
    db.addToInventory('user1', 'Schwert', 1);
    expect(db.hasItem('user1', 'Schwert')).toBe(true);
  });

  test('hasItem returns false for missing item', () => {
    expect(db.hasItem('user1', 'Schwert')).toBeFalsy();
  });
});

describe('Database - Timestamps', () => {
  test('setLastDaily sets timestamp', () => {
    db.setLastDaily('user1');
    const user = db.getUser('user1');
    expect(user.last_daily).toBeDefined();
    expect(user.last_daily).not.toBeNull();
  });

  test('setLastWork sets timestamp', () => {
    db.setLastWork('user1');
    const user = db.getUser('user1');
    expect(user.last_work).toBeDefined();
  });

  test('setLastSteal sets timestamp', () => {
    db.setLastSteal('user1');
    const user = db.getUser('user1');
    expect(user.last_steal).toBeDefined();
  });

  test('setLastWeekly sets timestamp', () => {
    db.setLastWeekly('user1');
    const user = db.getUser('user1');
    expect(user.last_weekly).toBeDefined();
  });
});

describe('Database - Leaderboard', () => {
  test('getTopUsers returns sorted users', () => {
    db.updateBalance('user1', 500);
    db.updateBalance('user2', 1000);
    db.updateBalance('user3', 200);
    const top = db.getTopUsers(3);
    expect(top.length).toBe(3);
    expect(top[0].user_id).toBe('user2');
    expect(top[0].total).toBe(1000);
  });

  test('getTopUsers respects limit', () => {
    for (let i = 0; i < 20; i++) {
      db.updateBalance(`user${i}`, i * 100);
    }
    const top = db.getTopUsers(5);
    expect(top.length).toBe(5);
  });
});
