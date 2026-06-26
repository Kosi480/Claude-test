const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const streakRewards = [
  { day: 1, reward: 100, emoji: '📅' },
  { day: 2, reward: 150, emoji: '📅' },
  { day: 3, reward: 250, emoji: '🔥' },
  { day: 4, reward: 300, emoji: '🔥' },
  { day: 5, reward: 500, emoji: '🔥' },
  { day: 6, reward: 600, emoji: '💎' },
  { day: 7, reward: 1000, emoji: '🏆' },
];

const milestones = [
  { days: 7, bonus: 2000, title: '1 Woche', emoji: '⭐' },
  { days: 14, bonus: 5000, title: '2 Wochen', emoji: '🌟' },
  { days: 30, bonus: 15000, title: '1 Monat', emoji: '💫' },
  { days: 60, bonus: 35000, title: '2 Monate', emoji: '🏅' },
  { days: 100, bonus: 75000, title: '100 Tage', emoji: '👑' },
  { days: 365, bonus: 500000, title: '1 Jahr', emoji: '🎆' },
];

function ensureStreakTable() {
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS streaks (
      user_id TEXT PRIMARY KEY,
      current_streak INTEGER DEFAULT 0,
      longest_streak INTEGER DEFAULT 0,
      last_claim TEXT,
      total_claims INTEGER DEFAULT 0
    )
  `);
}

function getStreakData(userId) {
  let data = db.db.prepare('SELECT * FROM streaks WHERE user_id = ?').get(userId);
  if (!data) {
    db.db.prepare('INSERT INTO streaks (user_id) VALUES (?)').run(userId);
    data = db.db.prepare('SELECT * FROM streaks WHERE user_id = ?').get(userId);
  }
  return data;
}

function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

function getYesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('streak')
    .setDescription('Täglicher Login-Streak mit steigenden Belohnungen!')
    .addSubcommand(sub =>
      sub.setName('claim')
        .setDescription('Hole deine tägliche Streak-Belohnung ab'))
    .addSubcommand(sub =>
      sub.setName('info')
        .setDescription('Zeige deinen Streak-Status')
        .addUserOption(opt =>
          opt.setName('spieler')
            .setDescription('Streak eines anderen Spielers'))),
  async execute(interaction) {
    ensureStreakTable();
    const userId = interaction.user.id;
    const config = require('../config.json');
    const action = interaction.options.getSubcommand();

    if (action === 'claim') {
      const data = getStreakData(userId);
      const today = getTodayStr();
      const yesterday = getYesterdayStr();

      if (data.last_claim === today) {
        return interaction.reply('❌ Du hast heute schon deinen Streak abgeholt! Komm morgen wieder.');
      }

      let newStreak;
      if (data.last_claim === yesterday) {
        newStreak = data.current_streak + 1;
      } else if (!data.last_claim) {
        newStreak = 1;
      } else {
        newStreak = 1;
      }

      const dayIndex = ((newStreak - 1) % 7);
      const reward = streakRewards[dayIndex];
      const streakMultiplier = 1 + Math.floor(newStreak / 7) * 0.1;
      const baseReward = Math.floor(reward.reward * streakMultiplier);

      const hitMilestone = milestones.find(m => m.days === newStreak);
      const milestoneBonus = hitMilestone ? hitMilestone.bonus : 0;
      const totalReward = baseReward + milestoneBonus;

      db.updateBalance(userId, totalReward);

      const longestStreak = Math.max(data.longest_streak, newStreak);
      db.db.prepare(
        'UPDATE streaks SET current_streak = ?, longest_streak = ?, last_claim = ?, total_claims = total_claims + 1 WHERE user_id = ?'
      ).run(newStreak, longestStreak, today, userId);

      const lostStreak = data.current_streak > 0 && data.last_claim !== yesterday && data.last_claim !== null;

      const weekProgress = Array.from({ length: 7 }, (_, i) => {
        if (i < dayIndex) return '✅';
        if (i === dayIndex) return '🔥';
        return '⬜';
      }).join(' ');

      let desc = '';
      if (lostStreak) {
        desc += `😢 Streak von **${data.current_streak} Tagen** verloren! Neu gestartet.\n\n`;
      }

      desc += `${weekProgress}\n\n` +
        `${reward.emoji} **Tag ${newStreak}** — Streak-Belohnung!\n` +
        `💰 +**${config.currencySymbol}${baseReward.toLocaleString()}**`;

      if (streakMultiplier > 1) {
        desc += ` (x${streakMultiplier.toFixed(1)} Wochen-Bonus)`;
      }

      if (hitMilestone) {
        desc += `\n\n${hitMilestone.emoji} **Meilenstein: ${hitMilestone.title}!**\n` +
          `🎁 Bonus: **+${config.currencySymbol}${milestoneBonus.toLocaleString()}**`;
      }

      desc += `\n\n💰 Gesamt: **+${config.currencySymbol}${totalReward.toLocaleString()}**`;

      const nextMilestone = milestones.find(m => m.days > newStreak);
      if (nextMilestone) {
        desc += `\n\n📍 Nächster Meilenstein: **${nextMilestone.emoji} ${nextMilestone.title}** in **${nextMilestone.days - newStreak}** Tagen`;
      }

      const embed = new EmbedBuilder()
        .setColor(hitMilestone ? '#FFD700' : newStreak >= 7 ? '#e67e22' : '#2ecc71')
        .setTitle(`🔥 Streak: Tag ${newStreak}!`)
        .setDescription(desc)
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()} | Längster Streak: ${longestStreak}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'info') {
      const targetUser = interaction.options.getUser('spieler') || interaction.user;
      const data = getStreakData(targetUser.id);

      const today = getTodayStr();
      const yesterday = getYesterdayStr();
      const isActive = data.last_claim === today || data.last_claim === yesterday;
      const claimedToday = data.last_claim === today;

      const dayIndex = isActive ? ((data.current_streak - 1) % 7) : 0;
      const weekProgress = Array.from({ length: 7 }, (_, i) => {
        if (!isActive) return '⬜';
        if (i <= dayIndex) return '✅';
        return '⬜';
      }).join(' ');

      const nextMilestone = milestones.find(m => m.days > (isActive ? data.current_streak : 0));
      const streakMultiplier = 1 + Math.floor((isActive ? data.current_streak : 0) / 7) * 0.1;

      const embed = new EmbedBuilder()
        .setColor(isActive ? '#e67e22' : '#95a5a6')
        .setTitle(`🔥 ${targetUser.username}'s Streak`)
        .setDescription(
          `${weekProgress}\n\n` +
          `🔥 Aktueller Streak: **${isActive ? data.current_streak : 0} Tage** ${isActive ? '' : '(inaktiv)'}\n` +
          `🏆 Längster Streak: **${data.longest_streak} Tage**\n` +
          `📅 Gesamt Claims: **${data.total_claims}**\n` +
          `📈 Wochen-Bonus: **x${streakMultiplier.toFixed(1)}**\n\n` +
          (claimedToday ? '✅ Heute schon abgeholt!\n' : '⏳ Heute noch nicht abgeholt!\n') +
          (nextMilestone ? `\n📍 Nächster Meilenstein: **${nextMilestone.emoji} ${nextMilestone.title}** (noch **${nextMilestone.days - (isActive ? data.current_streak : 0)}** Tage)` : '')
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }
  },
};
