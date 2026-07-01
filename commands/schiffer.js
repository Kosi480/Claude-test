const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

const HOELZER = [
  { name: 'Kiefernholz', preis: 12, qualitaet: 1.0, emoji: '🌲' },
  { name: 'Eichenholz', preis: 26, qualitaet: 1.35, emoji: '🌳' },
  { name: 'Teakholz', preis: 50, qualitaet: 1.75, emoji: '🪵' },
  { name: 'Mahagoni', preis: 95, qualitaet: 2.2, emoji: '🟫' },
  { name: 'Schwarzeiche', preis: 180, qualitaet: 2.8, emoji: '🖤' },
  { name: 'Elfenholz', preis: 340, qualitaet: 3.6, emoji: '✨' },
  { name: 'Mondholz', preis: 650, qualitaet: 4.6, emoji: '🌙' },
  { name: 'Aetherholz', preis: 1200, qualitaet: 6.2, emoji: '🌟' },
];

const SCHIFFE = [
  { name: 'Ruderboot', basisWert: 55, schwierigkeit: 1, minLevel: 1 },
  { name: 'Fischerboot', basisWert: 120, schwierigkeit: 2, minLevel: 3 },
  { name: 'Flussbarke', basisWert: 200, schwierigkeit: 3, minLevel: 5 },
  { name: 'Segelschiff', basisWert: 320, schwierigkeit: 4, minLevel: 8 },
  { name: 'Handelskogge', basisWert: 490, schwierigkeit: 5, minLevel: 12 },
  { name: 'Kriegsgaleere', basisWert: 740, schwierigkeit: 6, minLevel: 16 },
  { name: 'Koenigskaravelle', basisWert: 1100, schwierigkeit: 7, minLevel: 21 },
  { name: 'Legendaeres Aetherschiff', basisWert: 1700, schwierigkeit: 8, minLevel: 28 },
];

const TECHNIKEN = [
  { name: 'Klinkerbau', bonus: 1.0, minLevel: 1 },
  { name: 'Kravelbau', bonus: 1.25, minLevel: 3 },
  { name: 'Spantenbau', bonus: 1.55, minLevel: 5 },
  { name: 'Kalfatern', bonus: 1.9, minLevel: 8 },
  { name: 'Kupferbeplatten', bonus: 2.35, minLevel: 12 },
  { name: 'Runenversiegelung', bonus: 2.9, minLevel: 16 },
  { name: 'Elfenbaukunst', bonus: 3.7, minLevel: 21 },
  { name: 'Aetherkonstruktion', bonus: 5.2, minLevel: 28 },
];

const QUALITAETEN = [
  { name: 'Leck', multi: 0.3, minRoll: 0 },
  { name: 'Schwimmfaehig', multi: 0.55, minRoll: 14 },
  { name: 'Solide', multi: 0.8, minRoll: 29 },
  { name: 'Seetueichtig', multi: 1.05, minRoll: 48 },
  { name: 'Robust', multi: 1.45, minRoll: 64 },
  { name: 'Praechtig', multi: 2.0, minRoll: 80 },
  { name: 'Meisterhaft', multi: 2.9, minRoll: 92 },
];

const UPGRADES = {
  saege: { name: 'Saege', stufen: [0, 1, 2, 3, 4], bonus: [0, 0.06, 0.13, 0.21, 0.30] },
  hobel: { name: 'Hobel', stufen: [0, 1, 2, 3, 4], bonus: [0, 0.05, 0.12, 0.20, 0.29] },
  stemmeisen: { name: 'Stemmeisen', stufen: [0, 1, 2, 3, 4], bonus: [0, 0.05, 0.11, 0.19, 0.28] },
  werft: { name: 'Werft', stufen: [0, 1, 2, 3, 4], bonus: [0, 0.08, 0.16, 0.25, 0.36] },
};

const SCHIFFER_EVENTS = [
  { text: '🌊 Das Holz fuegt sich perfekt zusammen — ein meisterhaftes Schiff!', qualMulti: 1.9, geldMulti: 1.0 },
  { text: '💰 Ein Kaufmann zahlt das Dreifache fuer dein Schiff!', qualMulti: 1.0, geldMulti: 2.2 },
  { text: '🪵 Das Holz war besonders trocken und leicht zu bearbeiten!', qualMulti: 1.7, geldMulti: 1.2 },
  { text: '💨 Ein Windstoß liess dein Werkzeug abrutschen — kleiner Riss.', qualMulti: 0.55, geldMulti: 1.0 },
  { text: '⚓ Der Admiral der Koenig-Marine zeigt Interesse!', qualMulti: 1.5, geldMulti: 1.9 },
  { text: '🌧️ Regen beschaedigte das frische Holz — Abzuege noetig.', qualMulti: 0.65, geldMulti: 0.9 },
  { text: '🌟 Dein Schiff wird als das schoenste der Flotte gepriesen!', qualMulti: 1.4, geldMulti: 1.7 },
];

const cooldowns = new Map();

function ensureSchifferTable() {
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS schiffer (
      userId TEXT PRIMARY KEY,
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      geld INTEGER DEFAULT 0,
      holz TEXT DEFAULT 'Kiefernholz',
      holzMenge INTEGER DEFAULT 0,
      technik TEXT DEFAULT 'Klinkerbau',
      saege INTEGER DEFAULT 0,
      hobel INTEGER DEFAULT 0,
      stemmeisen INTEGER DEFAULT 0,
      werft INTEGER DEFAULT 0,
      schiffeGebaut INTEGER DEFAULT 0,
      auftraege INTEGER DEFAULT 0,
      duelle INTEGER DEFAULT 0,
      duelleGewonnen INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS schiffer_hafen (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT,
      schiff TEXT,
      qualitaet TEXT,
      wert INTEGER,
      gebautAm TEXT
    );
  `);
}

function getSchiffer(uId) {
  let row = db.db.prepare('SELECT * FROM schiffer WHERE userId = ?').get(uId);
  if (!row) {
    db.db.prepare('INSERT INTO schiffer (userId) VALUES (?)').run(uId);
    row = db.db.prepare('SELECT * FROM schiffer WHERE userId = ?').get(uId);
  }
  return row;
}

function xpForLevel(l) { return l * l * 53; }

function checkLevelUp(uId, obj) {
  let lvl = obj.level;
  let ups = 0;
  while (obj.xp >= xpForLevel(lvl)) {
    obj.xp -= xpForLevel(lvl);
    lvl++;
    ups++;
  }
  if (ups > 0) {
    db.db.prepare('UPDATE schiffer SET level = ?, xp = ? WHERE userId = ?').run(lvl, obj.xp, uId);
  }
  return { lvl, ups };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('schiffer')
    .setDescription('Arbeite als Schiffbauer und baue edle Schiffe fuer Meere und Fluesse')
    .addSubcommand(s => s.setName('start').setDescription('Beginne deine Schiffbauer-Karriere'))
    .addSubcommand(s => s.setName('status').setDescription('Zeige deinen Schiffbauer-Status'))
    .addSubcommand(s => s.setName('hoelzer').setDescription('Liste alle Holzarten auf'))
    .addSubcommand(s => s.setName('kaufen').setDescription('Kaufe Holz')
      .addStringOption(o => o.setName('holz').setDescription('Welches Holz?').setRequired(true))
      .addIntegerOption(o => o.setName('menge').setDescription('Wie viel?').setRequired(true).setMinValue(1)))
    .addSubcommand(s => s.setName('bauen').setDescription('Baue ein Schiff')
      .addStringOption(o => o.setName('schiff').setDescription('Was bauen?').setRequired(true))
      .addStringOption(o => o.setName('technik').setDescription('Welche Technik?').setRequired(true)))
    .addSubcommand(s => s.setName('training').setDescription('Trainiere deine Schiffbaukunst'))
    .addSubcommand(s => s.setName('upgrade').setDescription('Verbessere deine Werkzeuge')
      .addStringOption(o => o.setName('slot').setDescription('Was upgraden?').setRequired(true)
        .addChoices(
          { name: 'Saege', value: 'saege' },
          { name: 'Hobel', value: 'hobel' },
          { name: 'Stemmeisen', value: 'stemmeisen' },
          { name: 'Werft', value: 'werft' }
        )))
    .addSubcommand(s => s.setName('hafen').setDescription('Zeige deinen Hafen'))
    .addSubcommand(s => s.setName('auftrag').setDescription('Nimm einen Schiffbauauftrag an'))
    .addSubcommand(s => s.setName('duell').setDescription('Fordere einen anderen Schiffbauer heraus')
      .addUserOption(o => o.setName('gegner').setDescription('Wen herausfordern?').setRequired(true))),

  async execute(interaction) {
    const config = require('../config.json');
    ensureSchifferTable();
    const uId = interaction.user.id;
    const sub = interaction.options.getSubcommand();

    if (sub === 'start') {
      const existing = db.db.prepare('SELECT userId FROM schiffer WHERE userId = ?').get(uId);
      if (existing) {
        return interaction.reply({ content: '⚓ Du bist bereits Schiffbauer!', ephemeral: true });
      }
      db.db.prepare('INSERT INTO schiffer (userId) VALUES (?)').run(uId);
      const embed = new EmbedBuilder()
        .setColor(0x1E90FF)
        .setTitle('⚓ Willkommen auf der Werft!')
        .setDescription('Deine Karriere als Schiffbauer beginnt.\nZimmer, Saege, Baue — erschaffe Schiffe die Legenden werden!')
        .addFields(
          { name: 'Startholz', value: 'Kiefernholz', inline: true },
          { name: 'Technik', value: 'Klinkerbau', inline: true }
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'status') {
      const s = getSchiffer(uId);
      const xpNeeded = xpForLevel(s.level);
      const upBonus = UPGRADES.saege.bonus[s.saege] + UPGRADES.hobel.bonus[s.hobel] +
        UPGRADES.stemmeisen.bonus[s.stemmeisen] + UPGRADES.werft.bonus[s.werft];
      const embed = new EmbedBuilder()
        .setColor(0x1E90FF)
        .setTitle(`⚓ Schiffbauer-Status von ${interaction.user.username}`)
        .addFields(
          { name: 'Level', value: `${s.level}`, inline: true },
          { name: 'XP', value: `${s.xp}/${xpNeeded}`, inline: true },
          { name: 'Geld', value: `${s.geld} Taler`, inline: true },
          { name: 'Holz', value: `${s.holz} (${s.holzMenge} Einh.)`, inline: true },
          { name: 'Technik', value: s.technik, inline: true },
          { name: 'Upgrade-Bonus', value: `+${(upBonus * 100).toFixed(0)}%`, inline: true },
          { name: 'Schiffe gebaut', value: `${s.schiffeGebaut}`, inline: true },
          { name: 'Auftraege', value: `${s.auftraege}`, inline: true },
          { name: 'Duelle', value: `${s.duelleGewonnen}/${s.duelle}`, inline: true }
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'hoelzer') {
      const embed = new EmbedBuilder()
        .setColor(0x1E90FF)
        .setTitle('🪵 Verfuegbare Holzarten')
        .setDescription(HOELZER.map(h =>
          `${h.emoji} **${h.name}** — ${h.preis} Taler | Qualität x${h.qualitaet}`
        ).join('\n'));
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'kaufen') {
      const s = getSchiffer(uId);
      const holzName = interaction.options.getString('holz');
      const menge = interaction.options.getInteger('menge');
      const holz = HOELZER.find(h => h.name.toLowerCase() === holzName.toLowerCase());
      if (!holz) return interaction.reply({ content: '❌ Unbekannte Holzart!', ephemeral: true });
      const kosten = holz.preis * menge;
      if (s.geld < kosten) return interaction.reply({ content: `❌ Nicht genug Taler! Benötigt: ${kosten}`, ephemeral: true });
      db.db.prepare('UPDATE schiffer SET geld = geld - ?, holz = ?, holzMenge = holzMenge + ? WHERE userId = ?')
        .run(kosten, holz.name, menge, uId);
      return interaction.reply({ content: `✅ ${menge}x ${holz.emoji} ${holz.name} für ${kosten} Taler gekauft.` });
    }

    if (sub === 'bauen') {
      const now = Date.now();
      const cd = cooldowns.get(uId + '_bauen') || 0;
      if (now - cd < 30000) {
        const left = ((30000 - (now - cd)) / 1000).toFixed(1);
        return interaction.reply({ content: `⏳ Noch ${left}s warten!`, ephemeral: true });
      }
      const s = getSchiffer(uId);
      if (s.holzMenge < 3) return interaction.reply({ content: '❌ Nicht genug Holz! (mind. 3)', ephemeral: true });

      const schiffName = interaction.options.getString('schiff');
      const technikName = interaction.options.getString('technik');
      const schiff = SCHIFFE.find(p => p.name.toLowerCase() === schiffName.toLowerCase());
      const technik = TECHNIKEN.find(t => t.name.toLowerCase() === technikName.toLowerCase());
      if (!schiff) return interaction.reply({ content: '❌ Unbekannter Schiffstyp!', ephemeral: true });
      if (!technik) return interaction.reply({ content: '❌ Unbekannte Technik!', ephemeral: true });
      if (s.level < schiff.minLevel) return interaction.reply({ content: `❌ Level ${schiff.minLevel} benötigt!`, ephemeral: true });
      if (s.level < technik.minLevel) return interaction.reply({ content: `❌ Level ${technik.minLevel} für diese Technik benötigt!`, ephemeral: true });

      const holz = HOELZER.find(h => h.name === s.holz) || HOELZER[0];
      const upBonus = 1 + UPGRADES.saege.bonus[s.saege] + UPGRADES.hobel.bonus[s.hobel] +
        UPGRADES.stemmeisen.bonus[s.stemmeisen] + UPGRADES.werft.bonus[s.werft];
      const roll = Math.random() * 100 * holz.qualitaet * technik.bonus * upBonus;
      const qual = [...QUALITAETEN].reverse().find(q => roll >= q.minRoll) || QUALITAETEN[0];

      const event = Math.random() < 0.25 ? SCHIFFER_EVENTS[Math.floor(Math.random() * SCHIFFER_EVENTS.length)] : null;
      const eqm = event ? event.qualMulti : 1.0;
      const egm = event ? event.geldMulti : 1.0;

      const wert = Math.floor(schiff.basisWert * qual.multi * holz.qualitaet * technik.bonus * upBonus * eqm * egm);
      const xpGain = Math.floor((schiff.schwierigkeit * 20 + wert / 12) * (event ? 1.1 : 1));

      cooldowns.set(uId + '_bauen', now);
      db.db.prepare('UPDATE schiffer SET geld = geld + ?, xp = xp + ?, holzMenge = holzMenge - 3, schiffeGebaut = schiffeGebaut + 1, technik = ? WHERE userId = ?')
        .run(wert, xpGain, technik.name, uId);
      db.db.prepare('INSERT INTO schiffer_hafen (userId, schiff, qualitaet, wert, gebautAm) VALUES (?, ?, ?, ?, ?)')
        .run(uId, schiff.name, qual.name, wert, new Date().toISOString());

      const s2 = getSchiffer(uId);
      const { lvl, ups } = checkLevelUp(uId, { level: s2.level, xp: s2.xp });

      const embed = new EmbedBuilder()
        .setColor(0x1E90FF)
        .setTitle('⚓ Schiff gebaut!')
        .setDescription(event ? event.text : '🪵 Du hast erfolgreich gebaut!')
        .addFields(
          { name: 'Schiff', value: schiff.name, inline: true },
          { name: 'Qualität', value: qual.name, inline: true },
          { name: 'Technik', value: technik.name, inline: true },
          { name: 'Wert', value: `${wert} Taler`, inline: true },
          { name: 'XP', value: `+${xpGain}`, inline: true },
          { name: 'Level', value: ups > 0 ? `⬆️ ${lvl} (+${ups})` : `${lvl}`, inline: true }
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'training') {
      const now = Date.now();
      const cd = cooldowns.get(uId + '_training') || 0;
      if (now - cd < 60000) {
        const left = ((60000 - (now - cd)) / 1000).toFixed(0);
        return interaction.reply({ content: `⏳ Noch ${left}s bis zum nächsten Training!`, ephemeral: true });
      }
      cooldowns.set(uId + '_training', now);
      const s = getSchiffer(uId);
      const xpGain = Math.floor((9 + s.level * 3) * (1 + Math.random()));
      const geldGain = Math.floor(s.level * 5 * Math.random());
      db.db.prepare('UPDATE schiffer SET xp = xp + ?, geld = geld + ? WHERE userId = ?').run(xpGain, geldGain, uId);
      const s2 = getSchiffer(uId);
      const { lvl, ups } = checkLevelUp(uId, { level: s2.level, xp: s2.xp });
      return interaction.reply({
        content: `🏋️ Training abgeschlossen! +${xpGain} XP, +${geldGain} Taler${ups > 0 ? ` | ⬆️ Level ${lvl}!` : ''}`,
      });
    }

    if (sub === 'upgrade') {
      const s = getSchiffer(uId);
      const slot = interaction.options.getString('slot');
      const upg = UPGRADES[slot];
      const current = s[slot];
      if (current >= 4) return interaction.reply({ content: '❌ Bereits auf maximaler Stufe!', ephemeral: true });
      const kosten = [0, 220, 550, 1200, 2600][current + 1];
      if (s.geld < kosten) return interaction.reply({ content: `❌ Benötigt ${kosten} Taler!`, ephemeral: true });
      db.db.prepare(`UPDATE schiffer SET geld = geld - ?, ${slot} = ${slot} + 1 WHERE userId = ?`).run(kosten, uId);
      return interaction.reply({
        content: `✅ **${upg.name}** auf Stufe ${current + 1} verbessert! (+${(upg.bonus[current + 1] * 100).toFixed(0)}% Bonus)`,
      });
    }

    if (sub === 'hafen') {
      const rows = db.db.prepare('SELECT * FROM schiffer_hafen WHERE userId = ? ORDER BY id DESC LIMIT 8').all(uId);
      if (!rows.length) return interaction.reply({ content: '⚓ Dein Hafen ist noch leer.', ephemeral: true });
      const embed = new EmbedBuilder()
        .setColor(0x1E90FF)
        .setTitle('⚓ Dein Hafen')
        .setDescription(rows.map(r => `**${r.schiff}** (${r.qualitaet}) — ${r.wert} Taler`).join('\n'));
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'auftrag') {
      const now = Date.now();
      const cd = cooldowns.get(uId + '_auftrag') || 0;
      if (now - cd < 120000) {
        const left = ((120000 - (now - cd)) / 1000).toFixed(0);
        return interaction.reply({ content: `⏳ Nächster Auftrag in ${left}s!`, ephemeral: true });
      }
      cooldowns.set(uId + '_auftrag', now);
      const s = getSchiffer(uId);
      const schiff = SCHIFFE[Math.min(Math.floor(Math.random() * 3) + Math.floor(s.level / 5), SCHIFFE.length - 1)];
      const belohnung = Math.floor(schiff.basisWert * (1.6 + Math.random()));
      const xpBonus = Math.floor(schiff.schwierigkeit * 27);
      db.db.prepare('UPDATE schiffer SET geld = geld + ?, xp = xp + ?, auftraege = auftraege + 1 WHERE userId = ?')
        .run(belohnung, xpBonus, uId);
      const s2 = getSchiffer(uId);
      const { lvl, ups } = checkLevelUp(uId, { level: s2.level, xp: s2.xp });
      return interaction.reply({
        content: `📋 Auftrag erfüllt: **${schiff.name}** — +${belohnung} Taler, +${xpBonus} XP${ups > 0 ? ` | ⬆️ Level ${lvl}!` : ''}`,
      });
    }

    if (sub === 'duell') {
      const gegner = interaction.options.getUser('gegner');
      if (gegner.id === uId) return interaction.reply({ content: '❌ Du kannst nicht gegen dich selbst kämpfen!', ephemeral: true });
      const s = getSchiffer(uId);
      const opp = db.db.prepare('SELECT * FROM schiffer WHERE userId = ?').get(gegner.id);
      if (!opp) return interaction.reply({ content: '❌ Dein Gegner ist kein Schiffbauer!', ephemeral: true });

      const myScore = s.level * 12 + s.schiffeGebaut * 2 + Math.random() * 40;
      const oppScore = opp.level * 12 + opp.schiffeGebaut * 2 + Math.random() * 40;
      const won = myScore > oppScore;
      const reward = Math.floor(60 + s.level * 18);

      db.db.prepare('UPDATE schiffer SET duelle = duelle + 1, duelleGewonnen = duelleGewonnen + ?, geld = geld + ?, xp = xp + ? WHERE userId = ?')
        .run(won ? 1 : 0, won ? reward : 0, won ? 34 : 12, uId);
      db.db.prepare('UPDATE schiffer SET duelle = duelle + 1 WHERE userId = ?').run(gegner.id);

      const s2 = getSchiffer(uId);
      const { lvl, ups } = checkLevelUp(uId, { level: s2.level, xp: s2.xp });

      const embed = new EmbedBuilder()
        .setColor(won ? 0x00FF00 : 0xFF0000)
        .setTitle(won ? '⚓ Duell gewonnen!' : '⚓ Duell verloren!')
        .setDescription(won
          ? `Deine Schiffe sind besser als die von ${gegner.username}!\n+${reward} Taler, +34 XP${ups > 0 ? ` | ⬆️ Level ${lvl}!` : ''}`
          : `${gegner.username} hat dich überlistet. Uebe weiter!\n+12 XP Trostpreis`);
      return interaction.reply({ embeds: [embed] });
    }
  },
};
