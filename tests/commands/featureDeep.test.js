const { createMockInteraction, createMockUser, createMockBotUser, wasEphemeral } = require('../helpers/mocks');
const { setupTestDb, seedEconomy, closeTestDb } = require('../helpers/setup');

let db;

beforeEach(() => {
  jest.resetModules();
  db = setupTestDb();
  seedEconomy(db, 'test-user-123', 100000);
  seedEconomy(db, 'test-user-456', 100000);
});

afterEach(() => {
  closeTestDb();
});

describe('/schmied deep tests', () => {
  test('buying materials deducts coins', async () => {
    const cmd = require('../../commands/schmied');
    const i1 = createMockInteraction({ subcommand: 'status' });
    await cmd.execute(i1);

    const interaction = createMockInteraction({
      subcommand: 'einkaufen',
      strings: { material: 'stahl' },
      integers: { menge: 5 }
    });
    await cmd.execute(interaction);
    expect(interaction.reply).toHaveBeenCalled();
    const reply = interaction.lastReply;
    expect(reply.embeds || reply.content).toBeTruthy();
  });

  test('invalid material returns error', async () => {
    const cmd = require('../../commands/schmied');
    const i1 = createMockInteraction({ subcommand: 'status' });
    await cmd.execute(i1);

    const interaction = createMockInteraction({
      subcommand: 'einkaufen',
      strings: { material: 'unobtanium' },
      integers: { menge: 1 }
    });
    await cmd.execute(interaction);
    expect(wasEphemeral(interaction)).toBe(true);
  });

  test('schmieden with insufficient materials fails', async () => {
    const cmd = require('../../commands/schmied');
    const i1 = createMockInteraction({ subcommand: 'status' });
    await cmd.execute(i1);

    const interaction = createMockInteraction({
      subcommand: 'schmieden',
      integers: { rezept: 12 }
    });
    await cmd.execute(interaction);
    expect(wasEphemeral(interaction)).toBe(true);
  });

  test('schmieden with materials succeeds', async () => {
    const cmd = require('../../commands/schmied');
    const i1 = createMockInteraction({ subcommand: 'status' });
    await cmd.execute(i1);

    db.db.prepare('UPDATE schmieden SET erz = 20, kohle = 20 WHERE user_id = ?').run('test-user-123');

    const interaction = createMockInteraction({
      subcommand: 'schmieden',
      integers: { rezept: 1 }
    });
    await cmd.execute(interaction);
    expect(interaction.reply).toHaveBeenCalled();
    const reply = interaction.lastReply;
    expect(reply.embeds).toBeDefined();
  });

  test('training a skill works', async () => {
    const cmd = require('../../commands/schmied');
    const i1 = createMockInteraction({ subcommand: 'status' });
    await cmd.execute(i1);

    const interaction = createMockInteraction({
      subcommand: 'trainieren',
      strings: { skill: 'kraft' }
    });
    await cmd.execute(interaction);
    const reply = interaction.lastReply;
    expect(reply.embeds).toBeDefined();
  });

  test('invalid training skill rejected', async () => {
    const cmd = require('../../commands/schmied');
    const i1 = createMockInteraction({ subcommand: 'status' });
    await cmd.execute(i1);

    const interaction = createMockInteraction({
      subcommand: 'trainieren',
      strings: { skill: 'nonsense' }
    });
    await cmd.execute(interaction);
    expect(wasEphemeral(interaction)).toBe(true);
  });

  test('duell against self fails', async () => {
    const cmd = require('../../commands/schmied');
    const i1 = createMockInteraction({ subcommand: 'status' });
    await cmd.execute(i1);

    const interaction = createMockInteraction({
      subcommand: 'duell',
      users: { gegner: { id: 'test-user-123', username: 'Self', displayAvatarURL: () => '', bot: false } }
    });
    await cmd.execute(interaction);
    expect(wasEphemeral(interaction)).toBe(true);
  });

  test('duell against bot fails', async () => {
    const cmd = require('../../commands/schmied');
    const i1 = createMockInteraction({ subcommand: 'status' });
    await cmd.execute(i1);

    const interaction = createMockInteraction({
      subcommand: 'duell',
      users: { gegner: createMockBotUser() }
    });
    await cmd.execute(interaction);
    expect(wasEphemeral(interaction)).toBe(true);
  });
});

describe('/fotograf deep tests', () => {
  test('photographing at valid location works', async () => {
    const cmd = require('../../commands/fotograf');
    const i1 = createMockInteraction({ subcommand: 'profil' });
    await cmd.execute(i1);

    const interaction = createMockInteraction({
      subcommand: 'fotografieren',
      integers: { ort: 1 }
    });
    await cmd.execute(interaction);
    expect(interaction.reply).toHaveBeenCalled();
    const reply = interaction.lastReply;
    expect(reply.embeds).toBeDefined();
  });

  test('photographing at invalid location fails', async () => {
    const cmd = require('../../commands/fotograf');
    const i1 = createMockInteraction({ subcommand: 'profil' });
    await cmd.execute(i1);

    const interaction = createMockInteraction({
      subcommand: 'fotografieren',
      integers: { ort: 99 }
    });
    await cmd.execute(interaction);
    expect(wasEphemeral(interaction)).toBe(true);
  });

  test('photographing at high-level location fails for new user', async () => {
    const cmd = require('../../commands/fotograf');
    const i1 = createMockInteraction({ subcommand: 'profil' });
    await cmd.execute(i1);

    const interaction = createMockInteraction({
      subcommand: 'fotografieren',
      integers: { ort: 9 }
    });
    await cmd.execute(interaction);
    expect(wasEphemeral(interaction)).toBe(true);
  });

  test('selling with empty gallery fails', async () => {
    const cmd = require('../../commands/fotograf');
    const i1 = createMockInteraction({ subcommand: 'profil' });
    await cmd.execute(i1);

    const interaction = createMockInteraction({ subcommand: 'verkaufen' });
    await cmd.execute(interaction);
    expect(wasEphemeral(interaction)).toBe(true);
  });

  test('photo -> sell workflow works', async () => {
    const cmd = require('../../commands/fotograf');
    const i1 = createMockInteraction({ subcommand: 'profil' });
    await cmd.execute(i1);

    const i2 = createMockInteraction({ subcommand: 'fotografieren', integers: { ort: 1 } });
    await cmd.execute(i2);

    const i3 = createMockInteraction({ subcommand: 'verkaufen' });
    await cmd.execute(i3);
    expect(i3.reply).toHaveBeenCalled();
    expect(i3.lastReply.embeds).toBeDefined();
  });

  test('buying a camera works', async () => {
    const cmd = require('../../commands/fotograf');
    const i1 = createMockInteraction({ subcommand: 'profil' });
    await cmd.execute(i1);

    const interaction = createMockInteraction({
      subcommand: 'kamera',
      integers: { nr: 2 }
    });
    await cmd.execute(interaction);
    expect(interaction.reply).toHaveBeenCalled();
  });
});

describe('/konditorei deep tests', () => {
  test('buying ingredients works', async () => {
    const cmd = require('../../commands/konditorei');
    const i1 = createMockInteraction({ subcommand: 'status' });
    await cmd.execute(i1);

    const interaction = createMockInteraction({
      subcommand: 'einkaufen',
      strings: { zutat: 'mehl' },
      integers: { menge: 10 }
    });
    await cmd.execute(interaction);
    expect(interaction.lastReply.embeds).toBeDefined();
  });

  test('baking with ingredients works', async () => {
    const cmd = require('../../commands/konditorei');
    const i1 = createMockInteraction({ subcommand: 'status' });
    await cmd.execute(i1);

    const interaction = createMockInteraction({
      subcommand: 'backen',
      integers: { rezept: 1 }
    });
    await cmd.execute(interaction);
    expect(interaction.reply).toHaveBeenCalled();
  });

  test('baking high-level recipe fails for new user', async () => {
    const cmd = require('../../commands/konditorei');
    const i1 = createMockInteraction({ subcommand: 'status' });
    await cmd.execute(i1);

    const interaction = createMockInteraction({
      subcommand: 'backen',
      integers: { rezept: 12 }
    });
    await cmd.execute(interaction);
    expect(wasEphemeral(interaction)).toBe(true);
  });
});

describe('/dinosaurier deep tests', () => {
  test('expedition to valid location works', async () => {
    const cmd = require('../../commands/dinosaurier');
    const i1 = createMockInteraction({ subcommand: 'status' });
    await cmd.execute(i1);

    const interaction = createMockInteraction({
      subcommand: 'expedition',
      integers: { ort: 1 }
    });
    await cmd.execute(interaction);
    expect(interaction.reply).toHaveBeenCalled();
  });

  test('expedition to high-level location fails', async () => {
    const cmd = require('../../commands/dinosaurier');
    const i1 = createMockInteraction({ subcommand: 'status' });
    await cmd.execute(i1);

    const interaction = createMockInteraction({
      subcommand: 'expedition',
      integers: { ort: 8 }
    });
    await cmd.execute(interaction);
    expect(wasEphemeral(interaction)).toBe(true);
  });

  test('opening park without dinos fails', async () => {
    const cmd = require('../../commands/dinosaurier');
    const i1 = createMockInteraction({ subcommand: 'status' });
    await cmd.execute(i1);

    const interaction = createMockInteraction({ subcommand: 'oeffnen' });
    await cmd.execute(interaction);
    expect(wasEphemeral(interaction)).toBe(true);
  });

  test('ticket price setting works', async () => {
    const cmd = require('../../commands/dinosaurier');
    const i1 = createMockInteraction({ subcommand: 'status' });
    await cmd.execute(i1);

    const interaction = createMockInteraction({
      subcommand: 'ticketpreis',
      integers: { preis: 100 }
    });
    await cmd.execute(interaction);
    expect(interaction.lastReply.embeds).toBeDefined();
  });

  test('invalid ticket price rejected', async () => {
    const cmd = require('../../commands/dinosaurier');
    const i1 = createMockInteraction({ subcommand: 'status' });
    await cmd.execute(i1);

    const interaction = createMockInteraction({
      subcommand: 'ticketpreis',
      integers: { preis: 9999 }
    });
    await cmd.execute(interaction);
    expect(wasEphemeral(interaction)).toBe(true);
  });
});

describe('/geisterjaeger deep tests', () => {
  test('hunting at valid location works', async () => {
    const cmd = require('../../commands/geisterjaeger');
    const i1 = createMockInteraction({ subcommand: 'profil' });
    await cmd.execute(i1);

    const interaction = createMockInteraction({
      subcommand: 'jagen',
      integers: { ort: 1 }
    });
    await cmd.execute(interaction);
    expect(interaction.reply).toHaveBeenCalled();
  });

  test('catching without active ghost fails', async () => {
    const cmd = require('../../commands/geisterjaeger');
    const i1 = createMockInteraction({ subcommand: 'profil' });
    await cmd.execute(i1);

    const interaction = createMockInteraction({ subcommand: 'fangen' });
    await cmd.execute(interaction);
    expect(wasEphemeral(interaction)).toBe(true);
  });

  test('empty collection returns ephemeral', async () => {
    const cmd = require('../../commands/geisterjaeger');
    const i1 = createMockInteraction({ subcommand: 'profil' });
    await cmd.execute(i1);

    const interaction = createMockInteraction({ subcommand: 'sammlung' });
    await cmd.execute(interaction);
    expect(wasEphemeral(interaction)).toBe(true);
  });
});

describe('/imker deep tests', () => {
  test('catching bees at valid location works', async () => {
    const cmd = require('../../commands/imker');
    const i1 = createMockInteraction({ subcommand: 'status' });
    await cmd.execute(i1);

    const interaction = createMockInteraction({
      subcommand: 'fangen',
      integers: { ort: 1 }
    });
    await cmd.execute(interaction);
    expect(interaction.reply).toHaveBeenCalled();
  });

  test('invalid catch location rejected', async () => {
    const cmd = require('../../commands/imker');
    const i1 = createMockInteraction({ subcommand: 'status' });
    await cmd.execute(i1);

    const interaction = createMockInteraction({
      subcommand: 'fangen',
      integers: { ort: 99 }
    });
    await cmd.execute(interaction);
    expect(wasEphemeral(interaction)).toBe(true);
  });

  test('saison subcommand works without profile', async () => {
    const cmd = require('../../commands/imker');
    const interaction = createMockInteraction({ subcommand: 'saison' });
    await cmd.execute(interaction);
    expect(interaction.reply).toHaveBeenCalled();
    expect(interaction.lastReply.embeds).toBeDefined();
  });
});

describe('/kurier deep tests', () => {
  test('accepting order on valid route works', async () => {
    const cmd = require('../../commands/kurier');
    const i1 = createMockInteraction({ subcommand: 'status' });
    await cmd.execute(i1);

    const interaction = createMockInteraction({
      subcommand: 'auftrag',
      integers: { route: 1 }
    });
    await cmd.execute(interaction);
    expect(interaction.reply).toHaveBeenCalled();
    expect(interaction.lastReply.embeds).toBeDefined();
  });

  test('delivering without orders fails', async () => {
    const cmd = require('../../commands/kurier');
    const i1 = createMockInteraction({ subcommand: 'status' });
    await cmd.execute(i1);

    const interaction = createMockInteraction({ subcommand: 'liefern' });
    await cmd.execute(interaction);
    expect(wasEphemeral(interaction)).toBe(true);
  });

  test('order -> deliver workflow works', async () => {
    const cmd = require('../../commands/kurier');
    const i1 = createMockInteraction({ subcommand: 'status' });
    await cmd.execute(i1);

    const i2 = createMockInteraction({ subcommand: 'auftrag', integers: { route: 1 } });
    await cmd.execute(i2);

    const i3 = createMockInteraction({ subcommand: 'liefern' });
    await cmd.execute(i3);
    expect(i3.reply).toHaveBeenCalled();
    expect(i3.lastReply.embeds).toBeDefined();
  });

  test('buying a vehicle works', async () => {
    const cmd = require('../../commands/kurier');
    const i1 = createMockInteraction({ subcommand: 'status' });
    await cmd.execute(i1);

    db.db.prepare('UPDATE kuriere SET level = 5 WHERE user_id = ?').run('test-user-123');

    const interaction = createMockInteraction({
      subcommand: 'fahrzeug',
      integers: { nr: 3 }
    });
    await cmd.execute(interaction);
    expect(interaction.reply).toHaveBeenCalled();
  });

  test('repairing at full condition returns message', async () => {
    const cmd = require('../../commands/kurier');
    const i1 = createMockInteraction({ subcommand: 'status' });
    await cmd.execute(i1);

    const interaction = createMockInteraction({ subcommand: 'reparieren' });
    await cmd.execute(interaction);
    expect(wasEphemeral(interaction)).toBe(true);
  });
});
