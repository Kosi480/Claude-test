const path = require('path');
const Database = require('better-sqlite3');

function createTestDb() {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      user_id TEXT PRIMARY KEY,
      balance INTEGER DEFAULT 0,
      bank INTEGER DEFAULT 0,
      last_work TEXT,
      last_steal TEXT,
      last_daily TEXT,
      last_weekly TEXT,
      prestige INTEGER DEFAULT 0
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
    CREATE TABLE IF NOT EXISTS pets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      species TEXT NOT NULL,
      emoji TEXT NOT NULL,
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      hunger INTEGER DEFAULT 100,
      happiness INTEGER DEFAULT 100,
      bonus_type TEXT,
      bonus_value REAL DEFAULT 0,
      last_fed TEXT,
      UNIQUE(user_id)
    );
    CREATE TABLE IF NOT EXISTS economy (
      user_id TEXT PRIMARY KEY,
      balance INTEGER DEFAULT 0
    );
  `);

  return db;
}

function createMockInteraction(options = {}) {
  const replies = [];
  const userId = options.userId || 'test-user-123';
  const targetUser = options.targetUser || null;

  const optionsStore = {
    strings: options.strings || {},
    integers: options.integers || {},
    users: options.users || {},
    subcommand: options.subcommand || null,
    booleans: options.booleans || {},
    numbers: options.numbers || {}
  };

  return {
    user: {
      id: userId,
      username: options.username || 'TestUser',
      displayAvatarURL: () => 'https://example.com/avatar.png',
      bot: false
    },
    options: {
      getString: (name) => optionsStore.strings[name] ?? null,
      getInteger: (name) => optionsStore.integers[name] ?? null,
      getNumber: (name) => optionsStore.numbers[name] ?? null,
      getUser: (name) => optionsStore.users[name] ?? targetUser,
      getSubcommand: () => optionsStore.subcommand,
      getBoolean: (name) => optionsStore.booleans[name] ?? null,
    },
    reply: jest.fn(async (data) => {
      replies.push(data);
      return data;
    }),
    editReply: jest.fn(async (data) => {
      replies.push(data);
      return data;
    }),
    deferReply: jest.fn(async () => {}),
    followUp: jest.fn(async (data) => {
      replies.push(data);
      return data;
    }),
    replied: false,
    deferred: false,
    _replies: replies,
    get lastReply() {
      return replies[replies.length - 1];
    }
  };
}

function createMockUser(id, username = 'MockUser') {
  return {
    id,
    username,
    displayAvatarURL: () => 'https://example.com/avatar.png',
    bot: false
  };
}

function createMockBotUser() {
  return {
    id: 'bot-123',
    username: 'BotUser',
    displayAvatarURL: () => 'https://example.com/avatar.png',
    bot: true
  };
}

function getReplyContent(interaction) {
  const reply = interaction.lastReply;
  if (!reply) return null;
  if (typeof reply === 'string') return reply;
  if (reply.content) return reply.content;
  if (reply.embeds && reply.embeds.length > 0) {
    const embed = reply.embeds[0];
    return embed.data?.description || embed.data?.title || JSON.stringify(embed.data);
  }
  return JSON.stringify(reply);
}

function getReplyEmbed(interaction) {
  const reply = interaction.lastReply;
  if (!reply) return null;
  if (reply.embeds && reply.embeds.length > 0) {
    return reply.embeds[0];
  }
  return null;
}

function wasEphemeral(interaction) {
  const reply = interaction.lastReply;
  return reply?.ephemeral === true;
}

module.exports = {
  createTestDb,
  createMockInteraction,
  createMockUser,
  createMockBotUser,
  getReplyContent,
  getReplyEmbed,
  wasEphemeral
};
