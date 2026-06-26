const fs = require('fs');
const path = require('path');
const { setupTestDb, seedEconomy, closeTestDb } = require('../helpers/setup');

let db;

beforeEach(() => {
  jest.resetModules();
  db = setupTestDb();
  seedEconomy(db, 'test-user-123', 50000);
});

afterEach(() => {
  closeTestDb();
});

const commandsDir = path.join(__dirname, '../../commands');
const commandFiles = fs.readdirSync(commandsDir).filter(f => f.endsWith('.js'));

describe('All commands structural validation', () => {
  test.each(commandFiles)('%s loads without errors', (file) => {
    expect(() => {
      require(path.join(commandsDir, file));
    }).not.toThrow();
  });

  test.each(commandFiles)('%s exports data and execute', (file) => {
    const cmd = require(path.join(commandsDir, file));
    expect(cmd.data).toBeDefined();
    expect(cmd.data.name).toBeDefined();
    expect(typeof cmd.data.name).toBe('string');
    expect(cmd.data.name.length).toBeGreaterThan(0);
    expect(typeof cmd.execute).toBe('function');
  });

  test.each(commandFiles)('%s has a valid command name (lowercase, no spaces)', (file) => {
    const cmd = require(path.join(commandsDir, file));
    expect(cmd.data.name).toMatch(/^[a-z0-9_-]+$/);
  });

  test.each(commandFiles)('%s has a description', (file) => {
    const cmd = require(path.join(commandsDir, file));
    expect(cmd.data.description).toBeDefined();
    expect(cmd.data.description.length).toBeGreaterThan(0);
  });
});

describe('No duplicate command names', () => {
  test('all command names are unique', () => {
    const names = commandFiles.map(file => {
      const cmd = require(path.join(commandsDir, file));
      return cmd.data.name;
    });
    const uniqueNames = new Set(names);
    const duplicates = names.filter((name, idx) => names.indexOf(name) !== idx);
    expect(duplicates).toEqual([]);
    expect(uniqueNames.size).toBe(names.length);
  });
});

describe('Command file naming consistency', () => {
  test.each(commandFiles)('%s filename matches command name', (file) => {
    const cmd = require(path.join(commandsDir, file));
    const fileBaseName = file.replace('.js', '');
    expect(cmd.data.name).toBe(fileBaseName);
  });
});
