const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database');

const quests = [
  { id: 'fisher', name: 'Meisterangler', desc: 'Fange 5 Fische', goal: 5, reward: 500, emoji: '🎣', track: 'fish' },
  { id: 'worker', name: 'Fleißiger Arbeiter', desc: 'Arbeite 10 Mal', goal: 10, reward: 800, emoji: '💼', track: 'work' },
  { id: 'gambler', name: 'Glücksspieler', desc: 'Spiele 5 Casino-Spiele', goal: 5, reward: 400, emoji: '🎰', track: 'gamble' },
  { id: 'hunter', name: 'Großwildjäger', desc: 'Jage 8 Tiere', goal: 8, reward: 600, emoji: '🏹', track: 'hunt' },
  { id: 'digger', name: 'Schatzgräber', desc: 'Grabe 7 Mal', goal: 7, reward: 550, emoji: '⛏️', track: 'dig' },
  { id: 'criminal', name: 'Unterwelt-Boss', desc: 'Begehe 3 Verbrechen', goal: 3, reward: 700, emoji: '🦹', track: 'crime' },
  { id: 'quiz', name: 'Schlaukopf', desc: 'Beantworte 5 Quiz-Fragen', goal: 5, reward: 450, emoji: '❓', track: 'trivia' },
  { id: 'beggar', name: 'Bettlerkönig', desc: 'Bettle 10 Mal', goal: 10, reward: 350, emoji: '🙏', track: 'beg' },
];

const activeQuests = new Map();
const questCooldowns = new Map();
const QUEST_COOLDOWN = 30 * 60 * 1000;

function getPlayerQuests(userId) {
  if (!activeQuests.has(userId)) {
    activeQuests.set(userId, []);
  }
  return activeQuests.get(userId);
}

function assignRandomQuest(userId) {
  const playerQuests = getPlayerQuests(userId);
  const activeIds = playerQuests.map(q => q.id);
  const available = quests.filter(q => !activeIds.includes(q.id));
  if (available.length === 0 || playerQuests.length >= 3) return null;

  const quest = available[Math.floor(Math.random() * available.length)];
  const active = { ...quest, progress: 0 };
  playerQuests.push(active);
  return active;
}

function trackProgress(userId, type) {
  const playerQuests = getPlayerQuests(userId);
  const completed = [];
  for (const quest of playerQuests) {
    if (quest.track === type && quest.progress < quest.goal) {
      quest.progress++;
      if (quest.progress >= quest.goal) {
        completed.push(quest);
      }
    }
  }
  return completed;
}

module.exports = {
  name: 'quest',
  aliases: ['quests', 'auftrag', 'aufträge', 'mission'],
  description: 'Zeige deine Quests oder hole neue (!quest / !quest new)',
  trackProgress,
  execute(message, args) {
    const userId = message.author.id;
    const config = require('../config.json');
    const action = (args[0] || 'list').toLowerCase();

    if (action === 'new' || action === 'neu') {
      const lastQuest = questCooldowns.get(userId);
      if (lastQuest && Date.now() - lastQuest < QUEST_COOLDOWN) {
        const remaining = Math.ceil((QUEST_COOLDOWN - (Date.now() - lastQuest)) / 60000);
        return message.reply(`⏳ Du kannst in **${remaining} Minuten** einen neuen Auftrag holen!`);
      }

      const playerQuests = getPlayerQuests(userId);
      if (playerQuests.length >= 3) {
        return message.reply('❌ Du hast bereits 3 aktive Quests! Schließe erst welche ab.');
      }

      const quest = assignRandomQuest(userId);
      if (!quest) return message.reply('❌ Keine neuen Quests verfügbar!');

      questCooldowns.set(userId, Date.now());

      const embed = new EmbedBuilder()
        .setColor('#9b59b6')
        .setTitle('📜 Neuer Auftrag!')
        .setDescription(
          `${quest.emoji} **${quest.name}**\n` +
          `${quest.desc}\n\n` +
          `Belohnung: **${config.currencySymbol}${quest.reward}**`
        )
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }

    if (action === 'claim' || action === 'abholen') {
      const playerQuests = getPlayerQuests(userId);
      const completed = playerQuests.filter(q => q.progress >= q.goal);

      if (!completed.length) return message.reply('❌ Du hast keine abgeschlossenen Quests!');

      let totalReward = 0;
      const claimed = [];
      for (const quest of completed) {
        totalReward += quest.reward;
        claimed.push(`${quest.emoji} **${quest.name}** — ${config.currencySymbol}${quest.reward}`);
        const idx = playerQuests.indexOf(quest);
        playerQuests.splice(idx, 1);
      }

      db.updateBalance(userId, totalReward);

      const embed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle('🎉 Quests abgeschlossen!')
        .setDescription(
          claimed.join('\n') +
          `\n\nGesamt: **${config.currencySymbol}${totalReward}**`
        )
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }

    const playerQuests = getPlayerQuests(userId);

    if (!playerQuests.length) {
      return message.reply(`📜 Du hast keine aktiven Quests! Hole dir welche mit \`${config.prefix}quest new\``);
    }

    const embed = new EmbedBuilder()
      .setColor('#9b59b6')
      .setTitle('📜 Deine Quests')
      .setDescription(
        playerQuests.map(q => {
          const bar = progressBar(q.progress, q.goal);
          const done = q.progress >= q.goal ? ' ✅' : '';
          return `${q.emoji} **${q.name}**${done}\n${q.desc}\n${bar} (${q.progress}/${q.goal}) — ${config.currencySymbol}${q.reward}`;
        }).join('\n\n')
      )
      .setFooter({ text: `${config.prefix}quest claim — Abgeschlossene abholen | ${config.prefix}quest new — Neuer Auftrag` })
      .setTimestamp();

    message.reply({ embeds: [embed] });
  },
};

function progressBar(current, max) {
  const filled = Math.floor((current / max) * 10);
  const empty = 10 - filled;
  return '▓'.repeat(filled) + '░'.repeat(empty);
}
