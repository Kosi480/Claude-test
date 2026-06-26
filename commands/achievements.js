const { EmbedBuilder } = require('discord.js');
const db = require('../database');

const achievements = [
  { id: 'first_work', name: 'Erster Arbeitstag', desc: 'Arbeite zum ersten Mal', emoji: '💼', reward: 100, check: (s) => s.work >= 1 },
  { id: 'work_10', name: 'Fleißig', desc: 'Arbeite 10 Mal', emoji: '⚡', reward: 300, check: (s) => s.work >= 10 },
  { id: 'work_100', name: 'Workaholic', desc: 'Arbeite 100 Mal', emoji: '🏭', reward: 2000, check: (s) => s.work >= 100 },
  { id: 'rich_1k', name: 'Tausender', desc: 'Besitze 1.000 Coins', emoji: '💵', reward: 200, check: (s) => s.wealth >= 1000 },
  { id: 'rich_10k', name: 'Wohlhabend', desc: 'Besitze 10.000 Coins', emoji: '💰', reward: 500, check: (s) => s.wealth >= 10000 },
  { id: 'rich_100k', name: 'Millionär', desc: 'Besitze 100.000 Coins', emoji: '🤑', reward: 5000, check: (s) => s.wealth >= 100000 },
  { id: 'steal_1', name: 'Langfinger', desc: 'Klaue zum ersten Mal erfolgreich', emoji: '🦹', reward: 150, check: (s) => s.steal >= 1 },
  { id: 'steal_25', name: 'Meisterdieb', desc: 'Klaue 25 Mal erfolgreich', emoji: '🎭', reward: 1000, check: (s) => s.steal >= 25 },
  { id: 'gamble_win_5', name: 'Glückspilz', desc: 'Gewinne 5 Casino-Spiele', emoji: '🎰', reward: 400, check: (s) => s.gamble_wins >= 5 },
  { id: 'gamble_win_50', name: 'High Roller', desc: 'Gewinne 50 Casino-Spiele', emoji: '🃏', reward: 3000, check: (s) => s.gamble_wins >= 50 },
  { id: 'fish_rare', name: 'Seltener Fang', desc: 'Fange einen seltenen oder besseren Fisch', emoji: '🐋', reward: 500, check: (s) => s.rare_fish >= 1 },
  { id: 'hunt_legend', name: 'Drachenjäger', desc: 'Jage ein legendäres Tier', emoji: '🐉', reward: 1500, check: (s) => s.legend_hunt >= 1 },
  { id: 'prestige_1', name: 'Wiedergeburt', desc: 'Erreiche Prestige 1', emoji: '⭐', reward: 1000, check: (s) => s.prestige >= 1 },
  { id: 'items_5', name: 'Sammler', desc: 'Besitze 5 verschiedene Items', emoji: '🎒', reward: 300, check: (s) => s.unique_items >= 5 },
  { id: 'pet_lvl5', name: 'Tierflüsterer', desc: 'Haustier auf Level 5', emoji: '🐾', reward: 800, check: (s) => s.pet_level >= 5 },
  { id: 'duel_3', name: 'Gladiator', desc: 'Gewinne 3 Duelle', emoji: '⚔️', reward: 600, check: (s) => s.duel_wins >= 3 },
];

const playerStats = new Map();
const unlockedAchievements = new Map();

function getStats(userId) {
  if (!playerStats.has(userId)) {
    const user = db.getUser(userId);
    const inv = db.getInventory(userId);
    const pet = db.db.prepare('SELECT * FROM pets WHERE user_id = ?').get(userId);
    playerStats.set(userId, {
      work: 0, steal: 0, gamble_wins: 0, rare_fish: 0, legend_hunt: 0,
      duel_wins: 0, wealth: user.balance + user.bank,
      prestige: user.prestige || 0, unique_items: inv.length,
      pet_level: pet ? pet.level : 0,
    });
  }
  return playerStats.get(userId);
}

function incrementStat(userId, stat, amount = 1) {
  const stats = getStats(userId);
  stats[stat] = (stats[stat] || 0) + amount;
  const user = db.getUser(userId);
  stats.wealth = user.balance + user.bank;
  stats.prestige = user.prestige || 0;
  stats.unique_items = db.getInventory(userId).length;
  const pet = db.db.prepare('SELECT * FROM pets WHERE user_id = ?').get(userId);
  stats.pet_level = pet ? pet.level : 0;
  return checkAchievements(userId);
}

function checkAchievements(userId) {
  const stats = getStats(userId);
  const unlocked = unlockedAchievements.get(userId) || new Set();
  const newlyUnlocked = [];

  for (const ach of achievements) {
    if (!unlocked.has(ach.id) && ach.check(stats)) {
      unlocked.add(ach.id);
      newlyUnlocked.push(ach);
      db.updateBalance(userId, ach.reward);
    }
  }

  unlockedAchievements.set(userId, unlocked);
  return newlyUnlocked;
}

module.exports = {
  name: 'achievements',
  aliases: ['erfolge', 'ach'],
  description: 'Zeige deine Achievements/Erfolge',
  incrementStat,
  checkAchievements,
  getStats,
  execute(message) {
    const userId = message.author.id;
    const config = require('../config.json');
    const stats = getStats(userId);
    const unlocked = unlockedAchievements.get(userId) || new Set();

    const newlyUnlocked = checkAchievements(userId);

    const lines = achievements.map(ach => {
      const done = unlocked.has(ach.id);
      return `${done ? '✅' : '⬜'} ${ach.emoji} **${ach.name}** — ${ach.desc}\n┗ Belohnung: ${config.currencySymbol}${ach.reward} ${done ? '*(erhalten)*' : ''}`;
    });

    const progress = unlocked.size;
    const total = achievements.length;
    const bar = '▓'.repeat(Math.floor(progress / total * 15)) + '░'.repeat(15 - Math.floor(progress / total * 15));

    const embed = new EmbedBuilder()
      .setColor('#f1c40f')
      .setTitle('🏅 Achievements')
      .setDescription(
        `Fortschritt: ${bar} **${progress}/${total}**\n\n` +
        lines.join('\n\n')
      )
      .setTimestamp();

    if (newlyUnlocked.length) {
      const bonus = newlyUnlocked.map(a => `${a.emoji} **${a.name}** — +${config.currencySymbol}${a.reward}`).join('\n');
      embed.addFields({ name: '🎉 Neu freigeschaltet!', value: bonus });
    }

    message.reply({ embeds: [embed] });
  },
};
