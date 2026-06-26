const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const JAIL_DURATION = 10 * 60 * 1000;
const ESCAPE_COOLDOWN = 3 * 60 * 1000;

function ensureJailTable() {
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS jail (
      user_id TEXT PRIMARY KEY,
      jailed_at TEXT NOT NULL,
      duration INTEGER NOT NULL,
      reason TEXT,
      escape_attempts INTEGER DEFAULT 0,
      last_escape_attempt TEXT,
      times_jailed INTEGER DEFAULT 0,
      times_escaped INTEGER DEFAULT 0
    )
  `);
}

function isJailed(userId) {
  const record = db.db.prepare('SELECT * FROM jail WHERE user_id = ?').get(userId);
  if (!record) return null;

  const jailedAt = new Date(record.jailed_at).getTime();
  const remaining = (jailedAt + record.duration) - Date.now();

  if (remaining <= 0) {
    db.db.prepare('DELETE FROM jail WHERE user_id = ?').run(userId);
    return null;
  }

  return { ...record, remaining };
}

function jailPlayer(userId, reason, duration = JAIL_DURATION) {
  ensureJailTable();
  const existing = db.db.prepare('SELECT * FROM jail WHERE user_id = ?').get(userId);
  if (existing) {
    db.db.prepare('UPDATE jail SET jailed_at = ?, duration = ?, reason = ?, escape_attempts = 0, times_jailed = times_jailed + 1 WHERE user_id = ?')
      .run(new Date().toISOString(), duration, reason, userId);
  } else {
    db.db.prepare('INSERT INTO jail (user_id, jailed_at, duration, reason, times_jailed) VALUES (?, ?, ?, ?, 1)')
      .run(userId, new Date().toISOString(), duration, reason);
  }
}

module.exports = {
  jailPlayer,
  isJailed,
  data: new SlashCommandBuilder()
    .setName('gefaengnis')
    .setDescription('Gefängnis — Status, Kaution, oder Fluchtversuch!')
    .addSubcommand(sub =>
      sub.setName('status')
        .setDescription('Prüfe deinen Gefängnis-Status')
        .addUserOption(opt =>
          opt.setName('spieler')
            .setDescription('Status eines anderen Spielers')))
    .addSubcommand(sub =>
      sub.setName('kaution')
        .setDescription('Zahle Kaution um freizukommen'))
    .addSubcommand(sub =>
      sub.setName('flucht')
        .setDescription('Versuche aus dem Gefängnis zu fliehen!'))
    .addSubcommand(sub =>
      sub.setName('freikaufen')
        .setDescription('Kaufe einen anderen Spieler frei')
        .addUserOption(opt =>
          opt.setName('spieler')
            .setDescription('Wen freikaufen?')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('besuchen')
        .setDescription('Besuche einen Gefangenen und schicke Geld')
        .addUserOption(opt =>
          opt.setName('spieler')
            .setDescription('Wen besuchen?')
            .setRequired(true))
        .addIntegerOption(opt =>
          opt.setName('betrag')
            .setDescription('Wie viel schicken?')
            .setRequired(true)
            .setMinValue(10))),
  async execute(interaction) {
    ensureJailTable();
    const userId = interaction.user.id;
    const config = require('../config.json');
    const action = interaction.options.getSubcommand();

    if (action === 'status') {
      const targetUser = interaction.options.getUser('spieler') || interaction.user;
      const jailRecord = isJailed(targetUser.id);

      if (!jailRecord) {
        const stats = db.db.prepare('SELECT * FROM jail WHERE user_id = ?').get(targetUser.id);
        if (stats) {
          return interaction.reply(`✅ **${targetUser.username}** ist frei! (${stats.times_jailed}x eingesperrt, ${stats.times_escaped}x geflohen)`);
        }
        return interaction.reply(`✅ **${targetUser.username}** war noch nie im Gefängnis!`);
      }

      const mins = Math.floor(jailRecord.remaining / 60000);
      const secs = Math.floor((jailRecord.remaining % 60000) / 1000);
      const bailCost = Math.floor(jailRecord.remaining / 1000) * 5;

      const embed = new EmbedBuilder()
        .setColor('#95a5a6')
        .setTitle(`🔒 ${targetUser.username} ist im Gefängnis!`)
        .setDescription(
          `📋 Grund: *${jailRecord.reason || 'Kriminelle Aktivitäten'}*\n\n` +
          `⏰ Restzeit: **${mins}m ${secs}s**\n` +
          `💰 Kaution: **${config.currencySymbol}${bailCost.toLocaleString()}**\n` +
          `🏃 Fluchtversuche: **${jailRecord.escape_attempts}**\n\n` +
          `📊 Insgesamt: **${jailRecord.times_jailed}x** eingesperrt, **${jailRecord.times_escaped}x** geflohen`
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'kaution') {
      const jailRecord = isJailed(userId);
      if (!jailRecord) return interaction.reply('✅ Du bist nicht im Gefängnis!');

      const bailCost = Math.floor(jailRecord.remaining / 1000) * 5;

      if (db.getBalance(userId) < bailCost) {
        return interaction.reply(`❌ Kaution: **${config.currencySymbol}${bailCost.toLocaleString()}**. Du hast nicht genug!`);
      }

      db.updateBalance(userId, -bailCost);
      db.db.prepare('DELETE FROM jail WHERE user_id = ?').run(userId);

      const embed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle('🔓 Auf Kaution frei!')
        .setDescription(
          `Du hast **${config.currencySymbol}${bailCost.toLocaleString()}** Kaution gezahlt.\n` +
          `Du bist wieder frei!`
        )
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'flucht') {
      const jailRecord = isJailed(userId);
      if (!jailRecord) return interaction.reply('✅ Du bist nicht im Gefängnis!');

      if (jailRecord.last_escape_attempt) {
        const elapsed = Date.now() - new Date(jailRecord.last_escape_attempt).getTime();
        if (elapsed < ESCAPE_COOLDOWN) {
          const remaining = Math.ceil((ESCAPE_COOLDOWN - elapsed) / 1000);
          return interaction.reply(`⏳ Nächster Fluchtversuch in **${remaining}s**!`);
        }
      }

      db.db.prepare('UPDATE jail SET escape_attempts = escape_attempts + 1, last_escape_attempt = ? WHERE user_id = ?')
        .run(new Date().toISOString(), userId);

      const baseChance = 0.3;
      const attemptPenalty = jailRecord.escape_attempts * 0.05;
      const chance = Math.max(0.1, baseChance - attemptPenalty);
      const success = Math.random() < chance;

      if (success) {
        db.db.prepare('UPDATE jail SET times_escaped = times_escaped + 1 WHERE user_id = ?').run(userId);
        db.db.prepare('DELETE FROM jail WHERE user_id = ?').run(userId);

        const escapeStories = [
          'Du gräbst einen Tunnel mit einem Löffel! 🥄',
          'Du verkleidest dich als Wärter! 🥸',
          'Du schlüpfst durch die Gitterstäbe! 🏃',
          'Du bestichst einen Wärter! 💰',
          'Du springst über die Mauer! 🧗',
        ];

        const embed = new EmbedBuilder()
          .setColor('#2ecc71')
          .setTitle('🏃 Flucht gelungen!')
          .setDescription(
            `${escapeStories[Math.floor(Math.random() * escapeStories.length)]}\n\n` +
            `Du bist frei! Aber sei vorsichtiger...`
          )
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      } else {
        const extraTime = 3 * 60 * 1000;
        db.db.prepare('UPDATE jail SET duration = duration + ? WHERE user_id = ?').run(extraTime, userId);

        const failStories = [
          'Du wirst beim Tunnelgraben erwischt! 🚨',
          'Die Verkleidung fliegt auf! 👮',
          'Du bleibst im Gitter stecken! 😰',
          'Der Wärter ruft Verstärkung! 🚔',
          'Du fällst von der Mauer! 💫',
        ];

        const embed = new EmbedBuilder()
          .setColor('#e74c3c')
          .setTitle('🚨 Flucht gescheitert!')
          .setDescription(
            `${failStories[Math.floor(Math.random() * failStories.length)]}\n\n` +
            `⏰ **+3 Minuten** Strafe!\n` +
            `Fluchtchance sinkt mit jedem Versuch.`
          )
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }
    }

    if (action === 'freikaufen') {
      const targetUser = interaction.options.getUser('spieler');
      if (targetUser.id === userId) return interaction.reply('❌ Nutze `/gefaengnis kaution` für dich selbst!');

      const jailRecord = isJailed(targetUser.id);
      if (!jailRecord) return interaction.reply(`✅ **${targetUser.username}** ist nicht im Gefängnis!`);

      const bailCost = Math.floor(jailRecord.remaining / 1000) * 5;
      if (db.getBalance(userId) < bailCost) {
        return interaction.reply(`❌ Kaution: **${config.currencySymbol}${bailCost.toLocaleString()}**. Du hast nicht genug!`);
      }

      db.updateBalance(userId, -bailCost);
      db.db.prepare('DELETE FROM jail WHERE user_id = ?').run(targetUser.id);

      const embed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle('🔓 Spieler freigekauft!')
        .setDescription(
          `**${interaction.user.username}** hat **${targetUser.username}** für **${config.currencySymbol}${bailCost.toLocaleString()}** freigekauft!\n\n` +
          `${targetUser.username} ist wieder frei! 🎉`
        )
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'besuchen') {
      const targetUser = interaction.options.getUser('spieler');
      const amount = interaction.options.getInteger('betrag');

      if (targetUser.id === userId) return interaction.reply('❌ Du kannst dich nicht selbst besuchen!');

      const jailRecord = isJailed(targetUser.id);
      if (!jailRecord) return interaction.reply(`✅ **${targetUser.username}** ist nicht im Gefängnis!`);

      if (db.getBalance(userId) < amount) {
        return interaction.reply(`❌ Du hast nicht genug Guthaben!`);
      }

      db.updateBalance(userId, -amount);
      db.updateBalance(targetUser.id, amount);

      const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle('🏥 Gefängnisbesuch')
        .setDescription(
          `Du besuchst **${targetUser.username}** im Gefängnis\n` +
          `und schickst **${config.currencySymbol}${amount.toLocaleString()}** durch die Gitterstäbe!\n\n` +
          `💰 ${targetUser.username} hat jetzt **${config.currencySymbol}${db.getBalance(targetUser.id).toLocaleString()}**`
        )
        .setFooter({ text: `Dein Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }
  },
};
