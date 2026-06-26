const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const COOLDOWN = 3 * 60 * 1000;
const cooldowns = new Map();

const eras = [
  {
    id: 'steinzeit',
    name: 'Steinzeit',
    emoji: '🦴',
    year: '10.000 v.Chr.',
    color: '#8B4513',
    events: [
      {
        text: 'Du triffst einen Stamm von Jägern. Sie bieten dir Mammutfleisch an.',
        choices: [
          { label: 'Annehmen', outcome: 'good', text: 'Du isst mit ihnen und sie zeigen dir eine Höhle voller Schätze!', reward: 300 },
          { label: 'Ablehnen', outcome: 'neutral', text: 'Du lehnst höflich ab und wanderst weiter.', reward: 100 },
        ],
      },
      {
        text: 'Ein Säbelzahntiger versperrt den Weg!',
        choices: [
          { label: 'Kämpfen', outcome: 'risky', text: 'Du besiegst den Tiger mit einem Speer!', reward: 500, failText: 'Der Tiger jagt dich davon!', failReward: -200 },
          { label: 'Schleichen', outcome: 'good', text: 'Du schleichst vorbei und findest einen Feuerstein.', reward: 250 },
        ],
      },
      {
        text: 'Du entdeckst Höhlenmalereien. Sie zeigen eine Karte!',
        choices: [
          { label: 'Folgen', outcome: 'good', text: 'Die Karte führt zu einem vergrabenen Schatz!', reward: 400 },
          { label: 'Kopieren', outcome: 'item', text: 'Du machst eine Kopie — ein wertvolles Artefakt!', item: 'Höhlenmalerei', reward: 200 },
        ],
      },
    ],
  },
  {
    id: 'aegypten',
    name: 'Altes Ägypten',
    emoji: '🏺',
    year: '2.500 v.Chr.',
    color: '#DAA520',
    events: [
      {
        text: 'Der Pharao sucht einen Berater. Du wirst zum Palast geführt.',
        choices: [
          { label: 'Beraten', outcome: 'good', text: 'Der Pharao belohnt dich mit Gold!', reward: 600 },
          { label: 'Fliehen', outcome: 'neutral', text: 'Du fliehst und findest einen geheimen Tunnel.', reward: 300 },
        ],
      },
      {
        text: 'Du stehst vor der Sphinx. Sie stellt ein Rätsel!',
        choices: [
          { label: 'Antworten', outcome: 'risky', text: 'Richtig! Die Sphinx öffnet eine Schatzkammer!', reward: 800, failText: 'Falsch! Du musst fliehen!', failReward: -300 },
          { label: 'Umgehen', outcome: 'good', text: 'Du findest einen Seiteneingang zur Pyramide.', reward: 400 },
        ],
      },
      {
        text: 'Ein Grabräuber bietet dir einen Skarabäus an.',
        choices: [
          { label: 'Kaufen', outcome: 'item', text: 'Ein magischer Skarabäus! Sehr wertvoll!', item: 'Goldener Skarabäus', reward: 150 },
          { label: 'Melden', outcome: 'good', text: 'Die Wachen belohnen dich für deine Ehrlichkeit!', reward: 500 },
        ],
      },
    ],
  },
  {
    id: 'rom',
    name: 'Römisches Reich',
    emoji: '⚔️',
    year: '100 n.Chr.',
    color: '#8B0000',
    events: [
      {
        text: 'Du landest im Kolosseum! Die Menge jubelt!',
        choices: [
          { label: 'Kämpfen', outcome: 'risky', text: 'Du besiegst den Gladiator! Der Kaiser applaudiert!', reward: 700, failText: 'Der Gladiator ist zu stark!', failReward: -400 },
          { label: 'Verhandeln', outcome: 'good', text: 'Du überzeugst den Kaiser, dich als Berater einzustellen.', reward: 450 },
        ],
      },
      {
        text: 'Ein Senator bietet dir ein Geschäft an.',
        choices: [
          { label: 'Einwilligen', outcome: 'good', text: 'Das Geschäft bringt riesige Gewinne!', reward: 550 },
          { label: 'Ablehnen', outcome: 'neutral', text: 'Klug — der Senator wurde später verhaftet.', reward: 200 },
        ],
      },
      {
        text: 'Du findest eine antike Münze auf dem Forum.',
        choices: [
          { label: 'Behalten', outcome: 'item', text: 'Eine seltene Kaisermünze!', item: 'Römische Münze', reward: 100 },
          { label: 'Verkaufen', outcome: 'good', text: 'Ein Händler zahlt einen guten Preis!', reward: 400 },
        ],
      },
    ],
  },
  {
    id: 'mittelalter',
    name: 'Mittelalter',
    emoji: '🏰',
    year: '1200 n.Chr.',
    color: '#4A4A4A',
    events: [
      {
        text: 'Ein Ritter fordert dich zum Turnier heraus!',
        choices: [
          { label: 'Annehmen', outcome: 'risky', text: 'Du gewinnst das Turnier! Der König ehrt dich!', reward: 800, failText: 'Du fällst vom Pferd...', failReward: -350 },
          { label: 'Zuschauen', outcome: 'neutral', text: 'Du wettest auf den Sieger und gewinnst!', reward: 300 },
        ],
      },
      {
        text: 'Eine Hexe bietet dir einen Trank an.',
        choices: [
          { label: 'Trinken', outcome: 'risky', text: 'Der Trank gibt dir übermenschliche Kraft!', reward: 600, failText: 'Der Trank schmeckt furchtbar und du wirst krank.', failReward: -250 },
          { label: 'Tauschen', outcome: 'item', text: 'Du tauschst und bekommst ein magisches Amulett!', item: 'Mittelalter-Amulett', reward: 200 },
        ],
      },
      {
        text: 'Du entdeckst einen geheimen Raum in der Burg.',
        choices: [
          { label: 'Erkunden', outcome: 'good', text: 'Eine Schatzkammer! Goldmünzen überall!', reward: 500 },
          { label: 'Melden', outcome: 'good', text: 'Der Burgherr belohnt dich großzügig.', reward: 450 },
        ],
      },
    ],
  },
  {
    id: 'renaissance',
    name: 'Renaissance',
    emoji: '🎨',
    year: '1500 n.Chr.',
    color: '#9B59B6',
    events: [
      {
        text: 'Leonardo da Vinci braucht einen Assistenten!',
        choices: [
          { label: 'Helfen', outcome: 'good', text: 'Du hilfst bei einer genialen Erfindung!', reward: 600 },
          { label: 'Beobachten', outcome: 'item', text: 'Du skizzierst seine Pläne — ein wertvolles Dokument!', item: 'Da Vinci Skizze', reward: 250 },
        ],
      },
      {
        text: 'Ein Kunsthändler bietet dir ein Gemälde an.',
        choices: [
          { label: 'Kaufen', outcome: 'risky', text: 'Es ist ein echtes Meisterwerk! Riesiger Gewinn!', reward: 1000, failText: 'Es ist eine Fälschung!', failReward: -500 },
          { label: 'Ablehnen', outcome: 'neutral', text: 'Du malst lieber selbst und verkaufst es.', reward: 350 },
        ],
      },
      {
        text: 'Du wirst zu einem Maskenball im Palazzo eingeladen.',
        choices: [
          { label: 'Hingehen', outcome: 'good', text: 'Du triffst einen Mäzen der dich fördert!', reward: 550 },
          { label: 'Ablehnen', outcome: 'neutral', text: 'Du verbringst den Abend in einer Bibliothek und lernst viel.', reward: 200 },
        ],
      },
    ],
  },
  {
    id: 'pirat',
    name: 'Piraten-Ära',
    emoji: '🏴‍☠️',
    year: '1700 n.Chr.',
    color: '#2C3E50',
    events: [
      {
        text: 'Ein Piratenschiff taucht am Horizont auf!',
        choices: [
          { label: 'Entern', outcome: 'risky', text: 'Du eroberst das Schiff und findest eine Schatzkarte!', reward: 900, failText: 'Die Piraten fangen dich!', failReward: -400 },
          { label: 'Verstecken', outcome: 'good', text: 'Du findest eine versteckte Bucht mit einem Wrack.', reward: 400 },
        ],
      },
      {
        text: 'Du findest eine Schatzkarte in einer Flasche!',
        choices: [
          { label: 'Folgen', outcome: 'good', text: 'X markiert die Stelle — ein vergrabener Schatz!', reward: 700 },
          { label: 'Verkaufen', outcome: 'neutral', text: 'Ein Händler zahlt gut dafür.', reward: 350 },
        ],
      },
      {
        text: 'Der Kapitän bietet dir einen Platz in der Crew.',
        choices: [
          { label: 'Beitreten', outcome: 'item', text: 'Du bekommst deinen Anteil der Beute!', item: 'Piratendublone', reward: 300 },
          { label: 'Ablehnen', outcome: 'good', text: 'Du bleibst an Land und eröffnest eine Taverne.', reward: 500 },
        ],
      },
    ],
  },
  {
    id: 'zukunft',
    name: 'Zukunft',
    emoji: '🚀',
    year: '2500 n.Chr.',
    color: '#00CED1',
    events: [
      {
        text: 'Ein Roboter bietet dir Kryptowährung an!',
        choices: [
          { label: 'Investieren', outcome: 'risky', text: 'Der Kurs explodiert! Riesiger Gewinn!', reward: 1200, failText: 'Der Kurs crasht!', failReward: -600 },
          { label: 'Ablehnen', outcome: 'neutral', text: 'Du investierst in sichere Anleihen.', reward: 300 },
        ],
      },
      {
        text: 'Du entdeckst ein Portal zu einer anderen Dimension!',
        choices: [
          { label: 'Betreten', outcome: 'risky', text: 'Eine Welt voller Kristalle und Gold!', reward: 1000, failText: 'Die Dimension ist instabil! Du wirst zurückgeschleudert.', failReward: -500 },
          { label: 'Scannen', outcome: 'item', text: 'Du scannst die Technologie — bahnbrechend!', item: 'Zukunfts-Chip', reward: 400 },
        ],
      },
      {
        text: 'Eine KI bietet dir an, die Lottozahlen vorherzusagen.',
        choices: [
          { label: 'Vertrauen', outcome: 'good', text: 'Die KI hat Recht! Du gewinnst!', reward: 800 },
          { label: 'Misstrauen', outcome: 'good', text: 'Die KI war fehlerhaft, gut dass du vorsichtig warst. Belohnung für Weisheit!', reward: 500 },
        ],
      },
    ],
  },
];

const artifacts = [
  'Höhlenmalerei', 'Goldener Skarabäus', 'Römische Münze',
  'Mittelalter-Amulett', 'Da Vinci Skizze', 'Piratendublone', 'Zukunfts-Chip',
];

function ensureTimeTable() {
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS time_travel (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      era_id TEXT NOT NULL,
      visited_at TEXT NOT NULL,
      artifacts_found TEXT DEFAULT '[]',
      total_trips INTEGER DEFAULT 0,
      total_earned INTEGER DEFAULT 0
    )
  `);
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS time_artifacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      artifact_name TEXT NOT NULL,
      found_at TEXT NOT NULL,
      UNIQUE(user_id, artifact_name)
    )
  `);
}

function getPlayerStats(userId) {
  const rows = db.db.prepare('SELECT * FROM time_travel WHERE user_id = ? ORDER BY visited_at DESC').all(userId);
  const artifactRows = db.db.prepare('SELECT artifact_name FROM time_artifacts WHERE user_id = ?').all(userId);
  return {
    trips: rows.length,
    totalEarned: rows.reduce((s, r) => s + (r.total_earned || 0), 0),
    artifacts: artifactRows.map(r => r.artifact_name),
    recentEras: rows.slice(0, 5).map(r => r.era_id),
  };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('zeitreise')
    .setDescription('Reise durch die Zeit und sammle Artefakte!')
    .addSubcommand(sub =>
      sub.setName('reisen')
        .setDescription('Starte eine Zeitreise! (3min CD)')
        .addIntegerOption(opt =>
          opt.setName('einsatz')
            .setDescription('Dein Einsatz für die Reise')
            .setRequired(true)
            .setMinValue(100)
            .setMaxValue(15000)))
    .addSubcommand(sub =>
      sub.setName('museum')
        .setDescription('Zeige deine gesammelten Artefakte'))
    .addSubcommand(sub =>
      sub.setName('chronik')
        .setDescription('Zeige deine Zeitreise-Statistiken')),
  async execute(interaction) {
    ensureTimeTable();
    const userId = interaction.user.id;
    const config = require('../config.json');
    const action = interaction.options.getSubcommand();

    if (action === 'reisen') {
      const lastPlay = cooldowns.get(userId);
      if (lastPlay && Date.now() - lastPlay < COOLDOWN) {
        const remaining = Math.ceil((COOLDOWN - (Date.now() - lastPlay)) / 1000);
        return interaction.reply(`⏳ Die Zeitmaschine lädt auf! Noch **${remaining}s**`);
      }

      const bet = interaction.options.getInteger('einsatz');
      if (db.getBalance(userId) < bet) {
        return interaction.reply(`❌ Du brauchst **${config.currencySymbol}${bet.toLocaleString()}** für Zeitreise-Treibstoff!`);
      }

      cooldowns.set(userId, Date.now());
      db.updateBalance(userId, -bet);

      const era = eras[Math.floor(Math.random() * eras.length)];
      const event = era.events[Math.floor(Math.random() * era.events.length)];

      const embed = new EmbedBuilder()
        .setColor(era.color)
        .setTitle(`${era.emoji} Zeitreise — ${era.name} (${era.year})`)
        .setDescription(
          `⚡ Die Zeitmaschine aktiviert sich...\n` +
          `Du landest im **${era.name}**!\n\n` +
          `📜 *${event.text}*\n\n` +
          `💰 Einsatz: **${config.currencySymbol}${bet.toLocaleString()}**`
        )
        .setFooter({ text: 'Wähle weise — riskante Optionen können fehlschlagen!' })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        ...event.choices.map((choice, i) =>
          new ButtonBuilder()
            .setCustomId(`zr_${i}_${userId}`)
            .setLabel(`${choice.label}${choice.outcome === 'risky' ? ' ⚠️' : ''}`)
            .setStyle(choice.outcome === 'risky' ? ButtonStyle.Danger : ButtonStyle.Primary)
        )
      );

      const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
      const collector = msg.createMessageComponentCollector({ time: 20000 });

      collector.on('collect', (btn) => {
        if (btn.user.id !== userId) return btn.reply({ content: '❌ Das ist nicht deine Zeitmaschine!', flags: 64 });

        collector.stop('chosen');
        const idx = parseInt(btn.customId.split('_')[1]);
        const choice = event.choices[idx];

        let success = true;
        if (choice.outcome === 'risky') {
          success = Math.random() < 0.55;
        }

        let finalReward;
        let resultText;
        let artifactFound = null;

        if (success) {
          finalReward = Math.floor(choice.reward * (1 + bet / 5000));
          resultText = choice.text;

          if (choice.outcome === 'item' && choice.item) {
            artifactFound = choice.item;
            const existing = db.db.prepare('SELECT * FROM time_artifacts WHERE user_id = ? AND artifact_name = ?')
              .get(userId, choice.item);
            if (!existing) {
              db.db.prepare('INSERT INTO time_artifacts (user_id, artifact_name, found_at) VALUES (?, ?, ?)')
                .run(userId, choice.item, new Date().toISOString());
            }
            db.addToInventory(userId, choice.item, 1);
          }
        } else {
          finalReward = choice.failReward || 0;
          resultText = choice.failText || 'Es ging schief...';
        }

        if (finalReward > 0) {
          db.updateBalance(userId, finalReward);
        } else if (finalReward < 0) {
          db.updateBalance(userId, finalReward);
        }

        const net = finalReward - bet;

        db.db.prepare('INSERT INTO time_travel (user_id, era_id, visited_at, total_earned) VALUES (?, ?, ?, ?)')
          .run(userId, era.id, new Date().toISOString(), finalReward);

        const stats = getPlayerStats(userId);

        const resultEmbed = new EmbedBuilder()
          .setColor(success ? '#2ecc71' : '#e74c3c')
          .setTitle(`${era.emoji} ${era.name} — ${success ? 'Erfolg!' : 'Fehlschlag!'}`)
          .setDescription(
            `📜 *${resultText}*\n\n` +
            (artifactFound ? `📦 **Artefakt gefunden:** ${artifactFound}!\n` : '') +
            (finalReward > 0
              ? `💰 Gewinn: **+${config.currencySymbol}${finalReward.toLocaleString()}**`
              : `💸 Verlust: **${config.currencySymbol}${finalReward.toLocaleString()}**`) +
            `\n📊 Netto: **${net >= 0 ? '+' : ''}${config.currencySymbol}${net.toLocaleString()}**\n\n` +
            `🕐 Zeitreisen: **${stats.trips}** | 📦 Artefakte: **${stats.artifacts.length}/${artifacts.length}**`
          )
          .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
          .setTimestamp();

        let bonusEmbed = null;
        if (stats.artifacts.length === artifacts.length) {
          const bonus = 25000;
          db.updateBalance(userId, bonus);
          bonusEmbed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🏆 Alle Artefakte gesammelt!')
            .setDescription(`Du hast alle **${artifacts.length}** Zeitreise-Artefakte!\n\n💰 **Meister-Bonus: +${config.currencySymbol}${bonus.toLocaleString()}!**`);
        }

        const embeds = [resultEmbed];
        if (bonusEmbed) embeds.push(bonusEmbed);
        btn.update({ embeds, components: [] });
      });

      collector.on('end', (_, reason) => {
        if (reason === 'time') {
          db.updateBalance(userId, bet);
          const timeoutEmbed = new EmbedBuilder()
            .setColor('#f39c12')
            .setTitle('⏰ Zeitreise abgebrochen!')
            .setDescription(`Du hast zu lange gezögert! Einsatz zurückerstattet.`)
            .setTimestamp();
          msg.edit({ embeds: [timeoutEmbed], components: [] });
        }
      });
    }

    if (action === 'museum') {
      const stats = getPlayerStats(userId);

      const display = artifacts.map(name => {
        const found = stats.artifacts.includes(name);
        const era = eras.find(e => e.events.some(ev => ev.choices.some(c => c.item === name)));
        return found
          ? `${era ? era.emoji : '📦'} **${name}** ✅`
          : `❓ ??? _(${era ? era.name : '???'})_`;
      });

      const completion = Math.floor((stats.artifacts.length / artifacts.length) * 100);
      const bar = '█'.repeat(Math.floor(completion / 10)) + '░'.repeat(10 - Math.floor(completion / 10));

      const embed = new EmbedBuilder()
        .setColor('#9b59b6')
        .setTitle(`🏛️ ${interaction.user.username}'s Zeitreise-Museum`)
        .setDescription(
          `\`${bar}\` **${completion}%** (${stats.artifacts.length}/${artifacts.length})\n\n` +
          display.join('\n') +
          (stats.artifacts.length === artifacts.length
            ? '\n\n🏆 **KOMPLETT! Du bist ein Meister-Zeitreisender!**'
            : '\n\n💡 Reise durch die Zeit um Artefakte zu finden!')
        )
        .setFooter({ text: 'Nutze /zeitreise reisen um neue Artefakte zu entdecken' })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'chronik') {
      const stats = getPlayerStats(userId);
      const visits = {};
      const rows = db.db.prepare('SELECT era_id FROM time_travel WHERE user_id = ?').all(userId);
      for (const r of rows) {
        visits[r.era_id] = (visits[r.era_id] || 0) + 1;
      }

      const eraStats = eras.map(era => {
        const count = visits[era.id] || 0;
        return `${era.emoji} **${era.name}** (${era.year}): ${count}x besucht`;
      });

      const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle(`📖 ${interaction.user.username}'s Zeitreise-Chronik`)
        .setDescription(
          `🕐 Gesamt-Reisen: **${stats.trips}**\n` +
          `💰 Gesamt verdient: **${config.currencySymbol}${stats.totalEarned.toLocaleString()}**\n` +
          `📦 Artefakte: **${stats.artifacts.length}/${artifacts.length}**\n\n` +
          `**Besuchte Epochen:**\n${eraStats.join('\n')}`
        )
        .setFooter({ text: 'Reise durch alle Epochen und sammle alle Artefakte!' })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }
  },
};
