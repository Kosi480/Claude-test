const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const eventThemes = [
  { name: 'Schatztruhen-Festival', emoji: '🎁', color: '#e67e22' },
  { name: 'Drachenfest', emoji: '🐉', color: '#e74c3c' },
  { name: 'Goldene Woche', emoji: '🌟', color: '#FFD700' },
  { name: 'Magischer Markt', emoji: '🔮', color: '#9b59b6' },
];

const dailyRewards = [
  { day: 1, reward: 'money', amount: 200, emoji: '💰', desc: '200$' },
  { day: 2, reward: 'money', amount: 300, emoji: '💰', desc: '300$' },
  { day: 3, reward: 'item', item: 'Heiltrank', amount: 2, emoji: '🧪', desc: '2x Heiltrank' },
  { day: 4, reward: 'money', amount: 500, emoji: '💰', desc: '500$' },
  { day: 5, reward: 'money', amount: 400, emoji: '💰', desc: '400$' },
  { day: 6, reward: 'item', item: 'Mana-Kristall', amount: 1, emoji: '🔮', desc: '1x Mana-Kristall' },
  { day: 7, reward: 'mystery', emoji: '🎁', desc: 'Mysteriöse Belohnung' },
  { day: 8, reward: 'money', amount: 600, emoji: '💰', desc: '600$' },
  { day: 9, reward: 'money', amount: 700, emoji: '💰', desc: '700$' },
  { day: 10, reward: 'item', item: 'Glücksbringer', amount: 1, emoji: '🍀', desc: '1x Glücksbringer' },
  { day: 11, reward: 'money', amount: 800, emoji: '💰', desc: '800$' },
  { day: 12, reward: 'money', amount: 900, emoji: '💰', desc: '900$' },
  { day: 13, reward: 'item', item: 'Magischer Stein', amount: 1, emoji: '💠', desc: '1x Magischer Stein' },
  { day: 14, reward: 'mystery', emoji: '🎁', desc: 'Mysteriöse Belohnung' },
  { day: 15, reward: 'money', amount: 1000, emoji: '💰', desc: '1.000$' },
  { day: 16, reward: 'money', amount: 1100, emoji: '💰', desc: '1.100$' },
  { day: 17, reward: 'item', item: 'Schattendolch', amount: 1, emoji: '🗡️', desc: '1x Schattendolch' },
  { day: 18, reward: 'money', amount: 1300, emoji: '💰', desc: '1.300$' },
  { day: 19, reward: 'money', amount: 1500, emoji: '💰', desc: '1.500$' },
  { day: 20, reward: 'money', amount: 2000, emoji: '💰', desc: '2.000$' },
  { day: 21, reward: 'mystery', emoji: '🎁', desc: 'Mysteriöse Belohnung' },
  { day: 22, reward: 'money', amount: 2500, emoji: '💰', desc: '2.500$' },
  { day: 23, reward: 'item', item: 'Drachenschuppe', amount: 1, emoji: '🪬', desc: '1x Drachenschuppe' },
  { day: 24, reward: 'money', amount: 3000, emoji: '💰', desc: '3.000$' },
  { day: 25, reward: 'money', amount: 4000, emoji: '💰', desc: '4.000$' },
  { day: 26, reward: 'item', item: 'Goldbarren', amount: 1, emoji: '🪙', desc: '1x Goldbarren' },
  { day: 27, reward: 'money', amount: 5000, emoji: '💰', desc: '5.000$' },
  { day: 28, reward: 'mystery', emoji: '🎁', desc: 'GROSSE Mysteriöse Belohnung' },
  { day: 29, reward: 'money', amount: 7500, emoji: '💰', desc: '7.500$' },
  { day: 30, reward: 'money', amount: 10000, emoji: '🏆', desc: '10.000$ JACKPOT' },
];

const mysteryRewards = [
  { type: 'money', amount: 1000, desc: '1.000$' },
  { type: 'money', amount: 2000, desc: '2.000$' },
  { type: 'money', amount: 3000, desc: '3.000$' },
  { type: 'money', amount: 5000, desc: '5.000$' },
  { type: 'item', item: 'Diamant-Ring', amount: 1, desc: '1x Diamant-Ring 💎' },
  { type: 'item', item: 'Goldbarren', amount: 1, desc: '1x Goldbarren 🪙' },
];

function ensureCalendarTable() {
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS event_calendar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      event_start TEXT NOT NULL,
      day_claimed INTEGER NOT NULL,
      claimed_at TEXT NOT NULL,
      UNIQUE(user_id, event_start, day_claimed)
    )
  `);
}

function getEventStart() {
  const now = new Date();
  const dayOfMonth = now.getDate();
  const cycleStart = new Date(now.getFullYear(), now.getMonth(), dayOfMonth <= 15 ? 1 : 16);
  return cycleStart.toISOString().split('T')[0];
}

function getCurrentDay() {
  const now = new Date();
  const eventStart = getEventStart();
  const start = new Date(eventStart);
  return Math.floor((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
}

function getTheme() {
  const start = getEventStart();
  let hash = 0;
  for (let i = 0; i < start.length; i++) hash = ((hash << 5) - hash) + start.charCodeAt(i);
  return eventThemes[Math.abs(hash) % eventThemes.length];
}

function getClaimedDays(userId) {
  const eventStart = getEventStart();
  return db.db.prepare('SELECT day_claimed FROM event_calendar WHERE user_id = ? AND event_start = ?')
    .all(userId, eventStart).map(r => r.day_claimed);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kalender')
    .setDescription('Event-Kalender mit täglichen Belohnungen!')
    .addSubcommand(sub =>
      sub.setName('oeffnen')
        .setDescription('Öffne das heutige Türchen'))
    .addSubcommand(sub =>
      sub.setName('anzeigen')
        .setDescription('Zeige den Kalender-Fortschritt')),
  async execute(interaction) {
    ensureCalendarTable();
    const userId = interaction.user.id;
    const config = require('../config.json');
    const action = interaction.options.getSubcommand();
    const theme = getTheme();

    if (action === 'oeffnen') {
      const currentDay = getCurrentDay();
      if (currentDay > 30) {
        return interaction.reply('❌ Das aktuelle Event ist vorbei! Warte auf das nächste.');
      }

      const claimed = getClaimedDays(userId);
      if (claimed.includes(currentDay)) {
        return interaction.reply('❌ Du hast heute schon dein Türchen geöffnet! Komm morgen wieder.');
      }

      const dayReward = dailyRewards[(currentDay - 1) % dailyRewards.length];
      let rewardText = '';
      let actualReward = '';

      if (dayReward.reward === 'money') {
        db.updateBalance(userId, dayReward.amount);
        rewardText = `💰 **+${config.currencySymbol}${dayReward.amount.toLocaleString()}**`;
        actualReward = dayReward.desc;
      } else if (dayReward.reward === 'item') {
        db.addToInventory(userId, dayReward.item, dayReward.amount);
        rewardText = `📦 **${dayReward.amount}x ${dayReward.item}**`;
        actualReward = dayReward.desc;
      } else if (dayReward.reward === 'mystery') {
        const mystery = mysteryRewards[Math.floor(Math.random() * mysteryRewards.length)];
        if (mystery.type === 'money') {
          db.updateBalance(userId, mystery.amount);
          rewardText = `🎁 **+${config.currencySymbol}${mystery.amount.toLocaleString()}**`;
        } else {
          db.addToInventory(userId, mystery.item, mystery.amount);
          rewardText = `🎁 **${mystery.desc}**`;
        }
        actualReward = `Mysteriös → ${mystery.desc}`;
      }

      db.db.prepare('INSERT INTO event_calendar (user_id, event_start, day_claimed, claimed_at) VALUES (?, ?, ?, ?)')
        .run(userId, getEventStart(), currentDay, new Date().toISOString());

      const newClaimed = getClaimedDays(userId);
      const consecutiveDays = countConsecutive(newClaimed, currentDay);
      let bonusText = '';

      if (consecutiveDays >= 7 && consecutiveDays % 7 === 0) {
        const bonus = consecutiveDays * 100;
        db.updateBalance(userId, bonus);
        bonusText = `\n\n🔥 **${consecutiveDays}-Tage-Streak-Bonus: +${config.currencySymbol}${bonus}!**`;
      }

      const embed = new EmbedBuilder()
        .setColor(theme.color)
        .setTitle(`${theme.emoji} ${theme.name} — Tag ${currentDay}`)
        .setDescription(
          `Du öffnest Türchen **#${currentDay}**...\n\n` +
          `${dayReward.emoji} ${rewardText}` +
          bonusText +
          `\n\n📅 Fortschritt: **${newClaimed.length}/30** Tage`
        )
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'anzeigen') {
      const currentDay = getCurrentDay();
      const claimed = getClaimedDays(userId);
      const claimedSet = new Set(claimed);

      let calendarGrid = '';
      for (let d = 1; d <= 30; d++) {
        if (claimedSet.has(d)) {
          calendarGrid += '✅';
        } else if (d === currentDay) {
          calendarGrid += '🎁';
        } else if (d < currentDay) {
          calendarGrid += '❌';
        } else {
          calendarGrid += '🔒';
        }
        if (d % 10 === 0) calendarGrid += '\n';
        else calendarGrid += ' ';
      }

      const totalEarned = claimed.reduce((sum, d) => {
        const r = dailyRewards[(d - 1) % dailyRewards.length];
        return sum + (r.reward === 'money' ? r.amount : 0);
      }, 0);

      const nextRewards = [];
      for (let d = currentDay; d <= Math.min(currentDay + 2, 30); d++) {
        const r = dailyRewards[(d - 1) % dailyRewards.length];
        const isClaimed = claimedSet.has(d);
        nextRewards.push(`Tag ${d}: ${r.emoji} ${r.desc} ${isClaimed ? '✅' : d === currentDay ? '← Heute' : ''}`);
      }

      const embed = new EmbedBuilder()
        .setColor(theme.color)
        .setTitle(`${theme.emoji} ${theme.name}`)
        .setDescription(
          `${calendarGrid}\n\n` +
          `📅 Tag: **${Math.min(currentDay, 30)}/30**\n` +
          `✅ Geöffnet: **${claimed.length}/30**\n` +
          `💰 Geld verdient: **${config.currencySymbol}${totalEarned.toLocaleString()}**\n\n` +
          `**Nächste Belohnungen:**\n${nextRewards.join('\n')}`
        )
        .setFooter({ text: '✅ Geöffnet | 🎁 Heute | ❌ Verpasst | 🔒 Kommend' })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }
  },
};

function countConsecutive(claimedDays, upToDay) {
  let count = 0;
  for (let d = upToDay; d >= 1; d--) {
    if (claimedDays.includes(d)) count++;
    else break;
  }
  return count;
}
