const { createMockInteraction, createMockUser } = require('../helpers/mocks');
const { setupTestDb, seedEconomy, closeTestDb } = require('../helpers/setup');

let db;

beforeEach(() => {
  jest.resetModules();
  db = setupTestDb();
});

afterEach(() => {
  closeTestDb();
});

describe('balance command', () => {
  test('shows zero balance for new user', async () => {
    const cmd = require('../../commands/balance');
    const interaction = createMockInteraction();
    await cmd.execute(interaction);
    expect(interaction.reply).toHaveBeenCalled();
    const reply = interaction.lastReply;
    expect(reply.embeds).toBeDefined();
    expect(reply.embeds.length).toBe(1);
  });

  test('exports valid slash command data', () => {
    const cmd = require('../../commands/balance');
    expect(cmd.data).toBeDefined();
    expect(cmd.data.name).toBe('balance');
    expect(typeof cmd.execute).toBe('function');
  });
});

describe('daily command', () => {
  test('gives daily reward to new user', async () => {
    const cmd = require('../../commands/daily');
    const interaction = createMockInteraction();
    await cmd.execute(interaction);
    expect(interaction.reply).toHaveBeenCalled();
    const reply = interaction.lastReply;
    expect(reply.embeds).toBeDefined();
  });

  test('enforces cooldown on second claim', async () => {
    const cmd = require('../../commands/daily');
    const interaction1 = createMockInteraction();
    await cmd.execute(interaction1);

    jest.resetModules();
    db = setupTestDb();
    db.setLastDaily('test-user-123');
    const cmd2 = require('../../commands/daily');
    const interaction2 = createMockInteraction();
    await cmd2.execute(interaction2);
    const reply = interaction2.lastReply;
    expect(typeof reply === 'string' || reply.content || reply.ephemeral).toBeTruthy();
  });

  test('exports valid slash command data', () => {
    const cmd = require('../../commands/daily');
    expect(cmd.data.name).toBe('daily');
  });
});

describe('work command', () => {
  test('exports valid slash command data', () => {
    const cmd = require('../../commands/work');
    expect(cmd.data).toBeDefined();
    expect(cmd.data.name).toBe('work');
    expect(typeof cmd.execute).toBe('function');
  });

  test('executes work command', async () => {
    const cmd = require('../../commands/work');
    const interaction = createMockInteraction();
    await cmd.execute(interaction);
    expect(interaction.reply).toHaveBeenCalled();
  });
});

describe('pay command', () => {
  test('exports valid slash command data', () => {
    const cmd = require('../../commands/pay');
    expect(cmd.data).toBeDefined();
    expect(cmd.data.name).toBe('pay');
    expect(typeof cmd.execute).toBe('function');
  });
});
