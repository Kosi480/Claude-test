const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const challengePool = [
  { id: 'work3', desc: 'Arbeite 3x', target: 3, reward: 500, emoji: '💼', type: 'work' },
  { id: 'fish5', desc: 'Fische 5x', target: 5, reward: 400, emoji: '🎣', type: 'fish' },
  { id: 'gamble3', desc: 'Spiele 3 Glücksspiele', target: 3, reward: 600, emoji: '🎰', type: 'gamble' },
  { id: 'battle2', desc: 'Gewinne 2 Kämpfe', target: 2, reward: 700, emoji: '⚔️', type: 'battle' },
  { id: 'earn2000', desc: 'Verdiene 2.000$', target: 2000, reward: 800, emoji: '💰', type: 'earn' },
  { id: 'dig4', desc: 'Grabe 4x', target: 4, reward: 350, emoji: '⛏️', type: 'dig' },
  { id: 'quiz2', desc: 'Beantworte 2 Quiz richtig', target: 2, reward: 500, emoji: '🧠', type: 'quiz' },
  { id: 'trade1', desc: 'Handle 1x mit jemandem', target: 1, reward: 300, emoji: '🤝', type: 'trade' },
  { id: 'spend5000', desc: 'Gib 5.000$ aus', target: 5000, reward: 1000, emoji: '🛒', type: 'spend' },
  { id: 'hunt3', desc: 'Gehe 3x auf die Jagd', target: 3, reward: 450, emoji: '🏹', type: 'hunt' },
  { id: 'daily_login', desc: 'Hole dein Daily ab', target: 1, reward: 200, emoji: '📅', type: 'daily' },
  { id: 'crime2', desc: 'Begehe 2 Verbrechen', target: 2, reward: 550, emoji: '🦹', type: 'crime' },
];

function ensureChallengeTable() {
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS daily_challenges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      challenge_id TEXT NOT NULL,
      progress INTEGER DEFAULT 0,
      target INTEGER NOT NULL,
      reward INTEGER NOT NULL,
      completed INTEGER DEFAULT 0,
      claimed INTEGER DEFAULT 0,
      date TEXT NOT NULL,
      UNIQUE(user_id, challenge_id, date)
    )
  `);
}

function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

function getDailySeed(userId) {
  const today = getTodayStr();
  let hash = 0;
  const str = userId + today;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getUserChallenges(userId) {
  const today = getTodayStr();
  let challenges = db.db.prepare('SELECT * FROM daily_challenges WHERE user_id = ? AND date = ?').all(userId, today);

  if (challenges.length === 0) {
    const seed = getDailySeed(userId);
    const shuffled = [...challengePool].sort((a, b) => {
      const ha = ((seed * 31 + a.id.charCodeAt(0)) & 0x7fffffff) % 1000;
      const hb = ((seed * 31 + b.id.charCodeAt(0)) & 0x7fffffff) % 1000;
      return ha - hb;
    });
    const selected = shuffled.slice(0, 3);

    const insert = db.db.prepare(
      'INSERT OR IGNORE INTO daily_challenges (user_id, challenge_id, progress, target, reward, date) VALUES (?, ?, 0, ?, ?, ?)'
    );
    for (const c of selected) {
      insert.run(userId, c.id, c.target, c.reward, today);
    }

    challenges = db.db.prepare('SELECT * FROM daily_challenges WHERE user_id = ? AND date = ?').all(userId, today);
  }

  return challenges;
}

function getChallengeInfo(challengeId) {
  return challengePool.find(c => c.id === challengeId);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('challenges')
    .setDescription('Tägliche Herausforderungen für Bonusbelohnungen!')
    .addSubcommand(sub =>
      sub.setName('anzeigen')
        .setDescription('Zeige deine täglichen Herausforderungen'))
    .addSubcommand(sub =>
      sub.setName('abholen')
        .setDescription('Hole Belohnungen für abgeschlossene Herausforderungen ab')),
  async execute(interaction) {
    ensureChallengeTable();
    const userId = interaction.user.id;
    const config = require('../config.json');
    const action = interaction.options.getSubcommand();

    if (action === 'anzeigen') {
      const challenges = getUserChallenges(userId);

      const lines = challenges.map(c => {
        const info = getChallengeInfo(c.challenge_id);
        if (!info) return null;

        const progress = Math.min(c.progress, c.target);
        const pct = Math.floor((progress / c.target) * 100);
        const barLen = 10;
        const filled = Math.round((progress / c.target) * barLen);
        const bar = '█'.repeat(Math.min(filled, barLen)) + '░'.repeat(barLen - Math.min(filled, barLen));

        let status;
        if (c.claimed) status = '✅ Abgeholt';
        else if (c.completed) status = '🎉 Abholbereit!';
        else status = `${progress}/${c.target}`;

        return `${info.emoji} **${info.desc}**\n` +
          `  \`${bar}\` ${status}\n` +
          `  💰 Belohnung: **${config.currencySymbol}${c.reward.toLocaleString()}**`;
      }).filter(Boolean);

      const midnight = new Date();
      midnight.setUTCHours(24, 0, 0, 0);
      const hoursLeft = Math.floor((midnight.getTime() - Date.now()) / (60 * 60 * 1000));
      const minsLeft = Math.floor(((midnight.getTime() - Date.now()) % (60 * 60 * 1000)) / (60 * 1000));

      const totalReward = challenges.reduce((s, c) => s + c.reward, 0);
      const completed = challenges.filter(c => c.completed).length;
      const allDone = completed === challenges.length;

      const embed = new EmbedBuilder()
        .setColor(allDone ? '#FFD700' : '#3498db')
        .setTitle(`📋 Tägliche Herausforderungen ${allDone ? '— Alle erledigt! 🏆' : ''}`)
        .setDescription(
          lines.join('\n\n') +
          `\n\n📊 **${completed}/${challenges.length}** erledigt` +
          (allDone ? ` | Bonus: **+${config.currencySymbol}${Math.floor(totalReward * 0.5)}**` : '') +
          `\n⏰ Reset in **${hoursLeft}h ${minsLeft}m**`
        )
        .setFooter({ text: 'Herausforderungen werden durch Spielen automatisch erfüllt!' })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'abholen') {
      const challenges = getUserChallenges(userId);
      const claimable = challenges.filter(c => c.completed && !c.claimed);

      if (claimable.length === 0) {
        const incomplete = challenges.filter(c => !c.completed);
        if (incomplete.length === 0) {
          return interaction.reply('✅ Du hast heute schon alle Belohnungen abgeholt!');
        }
        return interaction.reply('❌ Noch keine Herausforderungen abgeschlossen! Nutze `/challenges anzeigen`.');
      }

      let totalClaimed = 0;
      const claimedLines = [];

      for (const c of claimable) {
        const info = getChallengeInfo(c.challenge_id);
        if (!info) continue;

        db.db.prepare('UPDATE daily_challenges SET claimed = 1 WHERE id = ?').run(c.id);
        db.updateBalance(userId, c.reward);
        totalClaimed += c.reward;
        claimedLines.push(`${info.emoji} ${info.desc}: **+${config.currencySymbol}${c.reward.toLocaleString()}**`);
      }

      const allCompleted = challenges.every(c => c.completed);
      let bonusAmount = 0;
      if (allCompleted) {
        bonusAmount = Math.floor(challenges.reduce((s, c) => s + c.reward, 0) * 0.5);
        db.updateBalance(userId, bonusAmount);
        totalClaimed += bonusAmount;
      }

      const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('🎉 Belohnungen abgeholt!')
        .setDescription(
          claimedLines.join('\n') +
          (bonusAmount > 0 ? `\n\n🏆 **Alle-erledigt-Bonus: +${config.currencySymbol}${bonusAmount.toLocaleString()}**` : '') +
          `\n\n💰 Gesamt: **+${config.currencySymbol}${totalClaimed.toLocaleString()}**`
        )
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }
  },
  updateProgress(userId, type, amount = 1) {
    ensureChallengeTable();
    const today = getTodayStr();
    const challenges = db.db.prepare(
      'SELECT * FROM daily_challenges WHERE user_id = ? AND date = ? AND completed = 0'
    ).all(userId, today);

    for (const c of challenges) {
      const info = getChallengeInfo(c.challenge_id);
      if (!info || info.type !== type) continue;

      const newProgress = Math.min(c.progress + amount, c.target);
      const completed = newProgress >= c.target ? 1 : 0;
      db.db.prepare('UPDATE daily_challenges SET progress = ?, completed = ? WHERE id = ?')
        .run(newProgress, completed, c.id);
    }
  },
};
