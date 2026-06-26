const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

function ensureBettingTable() {
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS wettbuero (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      creator_id TEXT NOT NULL,
      title TEXT NOT NULL,
      option_a TEXT NOT NULL,
      option_b TEXT NOT NULL,
      status TEXT DEFAULT 'open',
      winner TEXT,
      total_pool INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      closed_at TEXT,
      resolved_at TEXT
    )
  `);
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS wettbuero_bets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bet_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      chosen_option TEXT NOT NULL,
      amount INTEGER NOT NULL,
      placed_at TEXT NOT NULL,
      UNIQUE(bet_id, user_id),
      FOREIGN KEY (bet_id) REFERENCES wettbuero(id)
    )
  `);
}

const HOUSE_CUT = 0.05;
const MAX_ACTIVE_BETS = 3;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('wettbuero')
    .setDescription('Wettbüro — Erstelle und platziere Wetten!')
    .addSubcommand(sub =>
      sub.setName('erstellen')
        .setDescription('Erstelle eine neue Wette')
        .addStringOption(opt =>
          opt.setName('titel')
            .setDescription('Worum geht es?')
            .setRequired(true)
            .setMaxLength(100))
        .addStringOption(opt =>
          opt.setName('option_a')
            .setDescription('Erste Option')
            .setRequired(true)
            .setMaxLength(50))
        .addStringOption(opt =>
          opt.setName('option_b')
            .setDescription('Zweite Option')
            .setRequired(true)
            .setMaxLength(50)))
    .addSubcommand(sub =>
      sub.setName('wetten')
        .setDescription('Platziere eine Wette')
        .addIntegerOption(opt =>
          opt.setName('id')
            .setDescription('Wett-ID')
            .setRequired(true))
        .addStringOption(opt =>
          opt.setName('option')
            .setDescription('Auf welche Option?')
            .setRequired(true)
            .addChoices(
              { name: 'Option A', value: 'a' },
              { name: 'Option B', value: 'b' }
            ))
        .addIntegerOption(opt =>
          opt.setName('betrag')
            .setDescription('Wetteinsatz')
            .setRequired(true)
            .setMinValue(50)
            .setMaxValue(50000)))
    .addSubcommand(sub =>
      sub.setName('liste')
        .setDescription('Zeige offene Wetten'))
    .addSubcommand(sub =>
      sub.setName('schliessen')
        .setDescription('Schließe Wettannahme für deine Wette')
        .addIntegerOption(opt =>
          opt.setName('id')
            .setDescription('Wett-ID')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('auswerten')
        .setDescription('Werte eine Wette aus (nur Ersteller)')
        .addIntegerOption(opt =>
          opt.setName('id')
            .setDescription('Wett-ID')
            .setRequired(true))
        .addStringOption(opt =>
          opt.setName('gewinner')
            .setDescription('Welche Option hat gewonnen?')
            .setRequired(true)
            .addChoices(
              { name: 'Option A', value: 'a' },
              { name: 'Option B', value: 'b' }
            )))
    .addSubcommand(sub =>
      sub.setName('abbrechen')
        .setDescription('Breche deine Wette ab (alle werden erstattet)')
        .addIntegerOption(opt =>
          opt.setName('id')
            .setDescription('Wett-ID')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('info')
        .setDescription('Details zu einer Wette')
        .addIntegerOption(opt =>
          opt.setName('id')
            .setDescription('Wett-ID')
            .setRequired(true))),
  async execute(interaction) {
    ensureBettingTable();
    const userId = interaction.user.id;
    const config = require('../config.json');
    const action = interaction.options.getSubcommand();

    if (action === 'erstellen') {
      const activeBets = db.db.prepare(
        "SELECT COUNT(*) as cnt FROM wettbuero WHERE creator_id = ? AND status IN ('open', 'closed')"
      ).get(userId);
      if (activeBets.cnt >= MAX_ACTIVE_BETS) {
        return interaction.reply(`❌ Du kannst maximal **${MAX_ACTIVE_BETS}** aktive Wetten haben!`);
      }

      const title = interaction.options.getString('titel');
      const optA = interaction.options.getString('option_a');
      const optB = interaction.options.getString('option_b');

      const result = db.db.prepare(
        'INSERT INTO wettbuero (creator_id, title, option_a, option_b, created_at) VALUES (?, ?, ?, ?, ?)'
      ).run(userId, title, optA, optB, new Date().toISOString());

      const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle('🎰 Neue Wette erstellt!')
        .setDescription(
          `**#${result.lastInsertRowid}** — ${title}\n\n` +
          `🅰️ **${optA}**\n` +
          `🅱️ **${optB}**\n\n` +
          `Andere können jetzt mit \`/wettbuero wetten\` teilnehmen!\n` +
          `Schließe mit \`/wettbuero schliessen\` und werte aus mit \`/wettbuero auswerten\`.`
        )
        .setFooter({ text: `Erstellt von ${interaction.user.username} | ${(HOUSE_CUT * 100)}% Hausanteil` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'wetten') {
      const betId = interaction.options.getInteger('id');
      const option = interaction.options.getString('option');
      const amount = interaction.options.getInteger('betrag');

      const bet = db.db.prepare('SELECT * FROM wettbuero WHERE id = ?').get(betId);
      if (!bet) return interaction.reply('❌ Wette nicht gefunden!');
      if (bet.status !== 'open') return interaction.reply('❌ Diese Wette nimmt keine Einsätze mehr an!');
      if (bet.creator_id === userId) return interaction.reply('❌ Du kannst nicht auf deine eigene Wette setzen!');

      const existing = db.db.prepare('SELECT * FROM wettbuero_bets WHERE bet_id = ? AND user_id = ?').get(betId, userId);
      if (existing) return interaction.reply('❌ Du hast bereits auf diese Wette gesetzt!');

      if (db.getBalance(userId) < amount) {
        return interaction.reply(`❌ Du brauchst **${config.currencySymbol}${amount.toLocaleString()}**!`);
      }

      db.updateBalance(userId, -amount);
      db.db.prepare(
        'INSERT INTO wettbuero_bets (bet_id, user_id, chosen_option, amount, placed_at) VALUES (?, ?, ?, ?, ?)'
      ).run(betId, userId, option, amount, new Date().toISOString());
      db.db.prepare('UPDATE wettbuero SET total_pool = total_pool + ? WHERE id = ?').run(amount, betId);

      const optionName = option === 'a' ? bet.option_a : bet.option_b;
      const updatedBet = db.db.prepare('SELECT * FROM wettbuero WHERE id = ?').get(betId);

      const betsA = db.db.prepare("SELECT SUM(amount) as total FROM wettbuero_bets WHERE bet_id = ? AND chosen_option = 'a'").get(betId);
      const betsB = db.db.prepare("SELECT SUM(amount) as total FROM wettbuero_bets WHERE bet_id = ? AND chosen_option = 'b'").get(betId);

      const embed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle('🎰 Wette platziert!')
        .setDescription(
          `**#${betId}** — ${bet.title}\n\n` +
          `Du setzt **${config.currencySymbol}${amount.toLocaleString()}** auf **${optionName}**!\n\n` +
          `📊 Pool: **${config.currencySymbol}${updatedBet.total_pool.toLocaleString()}**\n` +
          `🅰️ ${bet.option_a}: **${config.currencySymbol}${(betsA.total || 0).toLocaleString()}**\n` +
          `🅱️ ${bet.option_b}: **${config.currencySymbol}${(betsB.total || 0).toLocaleString()}**`
        )
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'liste') {
      const openBets = db.db.prepare("SELECT * FROM wettbuero WHERE status IN ('open', 'closed') ORDER BY id DESC LIMIT 10").all();

      if (openBets.length === 0) {
        return interaction.reply('📭 Keine aktiven Wetten! Erstelle eine mit `/wettbuero erstellen`.');
      }

      const entries = openBets.map(bet => {
        const betCount = db.db.prepare('SELECT COUNT(*) as cnt FROM wettbuero_bets WHERE bet_id = ?').get(bet.id);
        const statusEmoji = bet.status === 'open' ? '🟢' : '🔴';
        return `${statusEmoji} **#${bet.id}** — ${bet.title}\n` +
          `🅰️ ${bet.option_a} | 🅱️ ${bet.option_b}\n` +
          `💰 Pool: **${config.currencySymbol}${bet.total_pool.toLocaleString()}** | 👥 ${betCount.cnt} Wetten`;
      });

      const embed = new EmbedBuilder()
        .setColor('#9b59b6')
        .setTitle('🎰 Wettbüro — Aktive Wetten')
        .setDescription(entries.join('\n\n'))
        .setFooter({ text: '🟢 Offen | 🔴 Geschlossen (Auswertung steht aus)' })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'schliessen') {
      const betId = interaction.options.getInteger('id');
      const bet = db.db.prepare('SELECT * FROM wettbuero WHERE id = ?').get(betId);

      if (!bet) return interaction.reply('❌ Wette nicht gefunden!');
      if (bet.creator_id !== userId) return interaction.reply('❌ Nur der Ersteller kann die Wette schließen!');
      if (bet.status !== 'open') return interaction.reply('❌ Wette ist bereits geschlossen!');

      db.db.prepare("UPDATE wettbuero SET status = 'closed', closed_at = ? WHERE id = ?")
        .run(new Date().toISOString(), betId);

      const betCount = db.db.prepare('SELECT COUNT(*) as cnt FROM wettbuero_bets WHERE bet_id = ?').get(betId);

      const embed = new EmbedBuilder()
        .setColor('#e74c3c')
        .setTitle('🔒 Wette geschlossen!')
        .setDescription(
          `**#${betId}** — ${bet.title}\n\n` +
          `Keine weiteren Einsätze möglich.\n` +
          `👥 **${betCount.cnt}** Teilnehmer | 💰 Pool: **${config.currencySymbol}${bet.total_pool.toLocaleString()}**\n\n` +
          `Werte jetzt aus mit \`/wettbuero auswerten ${betId} gewinner:a/b\``
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'auswerten') {
      const betId = interaction.options.getInteger('id');
      const winnerOption = interaction.options.getString('gewinner');

      const bet = db.db.prepare('SELECT * FROM wettbuero WHERE id = ?').get(betId);
      if (!bet) return interaction.reply('❌ Wette nicht gefunden!');
      if (bet.creator_id !== userId) return interaction.reply('❌ Nur der Ersteller kann auswerten!');
      if (bet.status === 'resolved') return interaction.reply('❌ Diese Wette wurde bereits ausgewertet!');
      if (bet.status === 'cancelled') return interaction.reply('❌ Diese Wette wurde abgebrochen!');

      const allBets = db.db.prepare('SELECT * FROM wettbuero_bets WHERE bet_id = ?').all(betId);
      if (allBets.length === 0) {
        db.db.prepare("UPDATE wettbuero SET status = 'resolved', winner = ?, resolved_at = ? WHERE id = ?")
          .run(winnerOption, new Date().toISOString(), betId);
        return interaction.reply('✅ Wette ausgewertet — keine Teilnehmer.');
      }

      const winners = allBets.filter(b => b.chosen_option === winnerOption);
      const losers = allBets.filter(b => b.chosen_option !== winnerOption);

      const totalPool = allBets.reduce((s, b) => s + b.amount, 0);
      const houseCut = Math.floor(totalPool * HOUSE_CUT);
      const winnerPool = totalPool - houseCut;
      const winnersTotal = winners.reduce((s, b) => s + b.amount, 0);

      const payouts = [];
      for (const winner of winners) {
        const share = winnersTotal > 0 ? winner.amount / winnersTotal : 0;
        const payout = Math.floor(winnerPool * share);
        db.updateBalance(winner.user_id, payout);
        payouts.push({ userId: winner.user_id, amount: payout, bet: winner.amount });
      }

      db.updateBalance(userId, houseCut);

      db.db.prepare("UPDATE wettbuero SET status = 'resolved', winner = ?, resolved_at = ? WHERE id = ?")
        .run(winnerOption, new Date().toISOString(), betId);

      const winnerName = winnerOption === 'a' ? bet.option_a : bet.option_b;
      const payoutList = payouts.length > 0
        ? payouts.map(p => `<@${p.userId}>: +**${config.currencySymbol}${p.amount.toLocaleString()}** (Einsatz: ${config.currencySymbol}${p.bet.toLocaleString()})`).join('\n')
        : '_Keine Gewinner_';

      const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('🏆 Wette ausgewertet!')
        .setDescription(
          `**#${betId}** — ${bet.title}\n\n` +
          `✅ Gewinner: **${winnerName}**\n\n` +
          `💰 Gesamt-Pool: **${config.currencySymbol}${totalPool.toLocaleString()}**\n` +
          `🏦 Hausanteil (${HOUSE_CUT * 100}%): **${config.currencySymbol}${houseCut.toLocaleString()}**\n\n` +
          `**Auszahlungen:**\n${payoutList}\n\n` +
          `👥 **${winners.length}** Gewinner | **${losers.length}** Verlierer`
        )
        .setFooter({ text: `Ausgewertet von ${interaction.user.username}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'abbrechen') {
      const betId = interaction.options.getInteger('id');
      const bet = db.db.prepare('SELECT * FROM wettbuero WHERE id = ?').get(betId);

      if (!bet) return interaction.reply('❌ Wette nicht gefunden!');
      if (bet.creator_id !== userId) return interaction.reply('❌ Nur der Ersteller kann abbrechen!');
      if (bet.status === 'resolved') return interaction.reply('❌ Bereits ausgewertet!');
      if (bet.status === 'cancelled') return interaction.reply('❌ Bereits abgebrochen!');

      const allBets = db.db.prepare('SELECT * FROM wettbuero_bets WHERE bet_id = ?').all(betId);
      for (const b of allBets) {
        db.updateBalance(b.user_id, b.amount);
      }

      db.db.prepare("UPDATE wettbuero SET status = 'cancelled' WHERE id = ?").run(betId);

      const embed = new EmbedBuilder()
        .setColor('#95a5a6')
        .setTitle('❌ Wette abgebrochen!')
        .setDescription(
          `**#${betId}** — ${bet.title}\n\n` +
          `💸 **${allBets.length}** Einsätze erstattet.\n` +
          `Gesamt: **${config.currencySymbol}${bet.total_pool.toLocaleString()}** zurückgezahlt.`
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'info') {
      const betId = interaction.options.getInteger('id');
      const bet = db.db.prepare('SELECT * FROM wettbuero WHERE id = ?').get(betId);

      if (!bet) return interaction.reply('❌ Wette nicht gefunden!');

      const allBets = db.db.prepare('SELECT * FROM wettbuero_bets WHERE bet_id = ?').all(betId);
      const betsA = allBets.filter(b => b.chosen_option === 'a');
      const betsB = allBets.filter(b => b.chosen_option === 'b');
      const totalA = betsA.reduce((s, b) => s + b.amount, 0);
      const totalB = betsB.reduce((s, b) => s + b.amount, 0);

      const oddsA = totalB > 0 ? ((totalA + totalB) / (totalA || 1)).toFixed(2) : '—';
      const oddsB = totalA > 0 ? ((totalA + totalB) / (totalB || 1)).toFixed(2) : '—';

      const statusText = bet.status === 'open' ? '🟢 Offen'
        : bet.status === 'closed' ? '🔴 Geschlossen'
        : bet.status === 'resolved' ? '✅ Ausgewertet'
        : '❌ Abgebrochen';

      const embed = new EmbedBuilder()
        .setColor(bet.status === 'open' ? '#3498db' : '#95a5a6')
        .setTitle(`🎰 Wette #${betId}`)
        .setDescription(
          `**${bet.title}**\n` +
          `Status: ${statusText}\n` +
          `Ersteller: <@${bet.creator_id}>\n\n` +
          `🅰️ **${bet.option_a}**\n` +
          `  👥 ${betsA.length} Wetten | 💰 ${config.currencySymbol}${totalA.toLocaleString()} | Quote: **${oddsA}x**\n\n` +
          `🅱️ **${bet.option_b}**\n` +
          `  👥 ${betsB.length} Wetten | 💰 ${config.currencySymbol}${totalB.toLocaleString()} | Quote: **${oddsB}x**\n\n` +
          `💰 Pool: **${config.currencySymbol}${bet.total_pool.toLocaleString()}**\n` +
          `🏦 Hausanteil: **${HOUSE_CUT * 100}%**` +
          (bet.winner ? `\n\n✅ Gewinner: **${bet.winner === 'a' ? bet.option_a : bet.option_b}**` : '')
        )
        .setFooter({ text: `Erstellt: ${new Date(bet.created_at).toLocaleString('de-DE')}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }
  },
};
