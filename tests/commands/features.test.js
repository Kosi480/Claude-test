const { createMockInteraction, createMockUser, createMockBotUser } = require('../helpers/mocks');
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

const COMMAND_SPECIFIC_STRINGS = {
  hacker: { skill: 'coding', ziel: 'wifi', item: 'portscanner' },
  theater: { genre: 'komoedie', skill: 'acting', item: 'stage' },
  archaeologe: { skill: 'tools' },
  superheld: { skill: 'staerke', origin: 'mutation' },
  brauerei: { zutat: 'hopfen', item: 'kessel' },
  zirkus: { item: 'zelt' },
  werwolf: { skill: 'kraft', blutlinie: 'schatten' },
  drachenzucht: { skill: 'kraft' },
  eisenbahn: { item: 'gleise' },
  flughafen: { item: 'terminal' },
  apotheke: { zutat: 'heilkraeuter', item: 'labor' },
  fussball: { item: 'stadion' },
  geisterjaeger: { skill: 'mut', item: 'emf' },
  konditorei: { zutat: 'mehl', item: 'ofen' },
  dinosaurier: { item: 'zaun' },
  imker: { skill: 'wissen', item: 'schleuder' },
  kurier: { skill: 'fitness', item: 'tasche' },
  schmied: { skill: 'kraft', material: 'erz', item: 'amboss' },
  fotograf: { skill: 'kreativitaet', item: 'objektiv' },
};

const SUBCOMMAND_COMMANDS = [
  { file: 'hacker', name: 'hacker', statusSub: 'profil', subs: ['profil', 'programme', 'ziele'] },
  { file: 'drachenzucht', name: 'drachenzucht', statusSub: 'status', subs: ['status', 'drachen', 'arten'] },
  { file: 'theater', name: 'theater', statusSub: 'status', subs: ['status', 'repertoire', 'kritik'] },
  { file: 'archaeologe', name: 'archaeologe', statusSub: 'profil', subs: ['profil', 'orte', 'sammlung'] },
  { file: 'superheld', name: 'superheld', statusSub: 'profil', subs: ['profil', 'kraeft'] },
  { file: 'brauerei', name: 'brauerei', statusSub: 'status', subs: ['status', 'rezepte', 'lager'] },
  { file: 'zirkus', name: 'zirkus', statusSub: 'status', subs: ['status', 'truppe', 'acts'] },
  { file: 'eisenbahn', name: 'eisenbahn', statusSub: 'status', subs: ['status', 'zuege', 'routen'] },
  { file: 'werwolf', name: 'werwolf', statusSub: 'profil', subs: ['profil', 'mond'] },
  { file: 'flughafen', name: 'flughafen', statusSub: 'status', subs: ['status', 'flotte', 'destinationen'] },
  { file: 'apotheke', name: 'apotheke', statusSub: 'status', subs: ['status', 'zutaten', 'rezepte'] },
  { file: 'fussball', name: 'fussball', statusSub: 'status', subs: ['status', 'kader', 'gegner'] },
  { file: 'geisterjaeger', name: 'geisterjaeger', statusSub: 'profil', subs: ['profil', 'orte'] },
  { file: 'konditorei', name: 'konditorei', statusSub: 'status', subs: ['status', 'zutaten', 'rezepte'] },
  { file: 'dinosaurier', name: 'dinosaurier', statusSub: 'status', subs: ['status', 'dinos'] },
  { file: 'imker', name: 'imker', statusSub: 'status', subs: ['status', 'voelker', 'saison'] },
  { file: 'kurier', name: 'kurier', statusSub: 'status', subs: ['status', 'routen', 'auftraege'] },
  { file: 'schmied', name: 'schmied', statusSub: 'status', subs: ['status', 'materialien', 'rezepte'] },
  { file: 'fotograf', name: 'fotograf', statusSub: 'profil', subs: ['profil', 'orte'] },
];

describe.each(SUBCOMMAND_COMMANDS)('/$file command', ({ file, name, statusSub, subs }) => {
  test('exports valid slash command data', () => {
    const cmd = require(`../../commands/${file}`);
    expect(cmd.data).toBeDefined();
    expect(cmd.data.name).toBe(name);
    expect(typeof cmd.execute).toBe('function');
  });

  test(`${statusSub} subcommand creates profile for new user`, async () => {
    const cmd = require(`../../commands/${file}`);
    const interaction = createMockInteraction({ subcommand: statusSub });
    await cmd.execute(interaction);
    expect(interaction.reply).toHaveBeenCalled();
    const reply = interaction.lastReply;
    expect(reply.embeds || reply.content || typeof reply === 'string').toBeTruthy();
  });

  test(`${statusSub} subcommand works on second call`, async () => {
    const cmd = require(`../../commands/${file}`);
    const i1 = createMockInteraction({ subcommand: statusSub });
    await cmd.execute(i1);
    const i2 = createMockInteraction({ subcommand: statusSub, userId: 'test-user-456' });
    seedEconomy(db, 'test-user-456', 50000);
    await cmd.execute(i2);
    expect(i2.reply).toHaveBeenCalled();
  });

  for (const sub of subs) {
    if (sub === statusSub) continue;
    test(`${sub} subcommand does not crash`, async () => {
      const cmd = require(`../../commands/${file}`);
      const i1 = createMockInteraction({ subcommand: statusSub });
      await cmd.execute(i1);

      const cmdStrings = COMMAND_SPECIFIC_STRINGS[file] || {};
      const interaction = createMockInteraction({
        subcommand: sub,
        integers: { ort: 1, rezept: 1, nr: 1, id: 1, sorte: 1, route: 1 },
        strings: { name: 'Test', ...cmdStrings },
      });
      await cmd.execute(interaction);
      expect(interaction.reply).toHaveBeenCalled();
    });
  }
});

describe('hacker specific subcommands', () => {
  test('hacken with valid target works', async () => {
    const cmd = require('../../commands/hacker');
    const i1 = createMockInteraction({ subcommand: 'profil' });
    await cmd.execute(i1);

    const interaction = createMockInteraction({
      subcommand: 'hacken',
      strings: { ziel: 'wifi' }
    });
    await cmd.execute(interaction);
    expect(interaction.reply).toHaveBeenCalled();
  });

  test('trainieren coding works', async () => {
    const cmd = require('../../commands/hacker');
    const i1 = createMockInteraction({ subcommand: 'profil' });
    await cmd.execute(i1);

    const interaction = createMockInteraction({
      subcommand: 'trainieren',
      strings: { skill: 'coding' }
    });
    await cmd.execute(interaction);
    expect(interaction.reply).toHaveBeenCalled();
  });
});

describe('theater specific subcommands', () => {
  test('schreiben with valid genre works', async () => {
    const cmd = require('../../commands/theater');
    const i1 = createMockInteraction({ subcommand: 'status' });
    await cmd.execute(i1);

    const interaction = createMockInteraction({
      subcommand: 'schreiben',
      strings: { genre: 'komoedie' }
    });
    await cmd.execute(interaction);
    expect(interaction.reply).toHaveBeenCalled();
  });
});
