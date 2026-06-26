const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const COOLDOWN = 90 * 1000;
const cooldowns = new Map();

const categories = {
  allgemein: { name: 'Allgemeinwissen', emoji: '🧠' },
  geografie: { name: 'Geografie', emoji: '🌍' },
  geschichte: { name: 'Geschichte', emoji: '📜' },
  natur: { name: 'Natur & Tiere', emoji: '🌿' },
};

const questions = [
  { cat: 'allgemein', q: 'Wie viele Planeten hat unser Sonnensystem?', answers: ['8', '9', '7', '10'], correct: 0 },
  { cat: 'allgemein', q: 'Welches ist das härteste natürliche Material?', answers: ['Diamant', 'Stahl', 'Titan', 'Quarz'], correct: 0 },
  { cat: 'allgemein', q: 'Wie viele Sekunden hat eine Stunde?', answers: ['3600', '3000', '4200', '2400'], correct: 0 },
  { cat: 'allgemein', q: 'Welches Element hat das Symbol "Au"?', answers: ['Gold', 'Silber', 'Aluminium', 'Argon'], correct: 0 },
  { cat: 'allgemein', q: 'Wie heißt die größte Wüste der Welt?', answers: ['Sahara', 'Gobi', 'Antarktis', 'Atacama'], correct: 2 },
  { cat: 'geografie', q: 'Was ist die Hauptstadt von Australien?', answers: ['Canberra', 'Sydney', 'Melbourne', 'Perth'], correct: 0 },
  { cat: 'geografie', q: 'Welcher ist der längste Fluss der Welt?', answers: ['Nil', 'Amazonas', 'Jangtse', 'Mississippi'], correct: 0 },
  { cat: 'geografie', q: 'In welchem Land liegt der Mount Everest?', answers: ['Nepal/China', 'Indien', 'Pakistan', 'Bhutan'], correct: 0 },
  { cat: 'geografie', q: 'Welches Land hat die meisten Einwohner?', answers: ['Indien', 'China', 'USA', 'Indonesien'], correct: 0 },
  { cat: 'geografie', q: 'Wie viele Kontinente gibt es?', answers: ['7', '5', '6', '8'], correct: 0 },
  { cat: 'geschichte', q: 'Wann fiel die Berliner Mauer?', answers: ['1989', '1991', '1987', '1990'], correct: 0 },
  { cat: 'geschichte', q: 'Wer erfand den Buchdruck?', answers: ['Gutenberg', 'Luther', 'Da Vinci', 'Newton'], correct: 0 },
  { cat: 'geschichte', q: 'In welchem Jahr begann der 2. Weltkrieg?', answers: ['1939', '1938', '1940', '1941'], correct: 0 },
  { cat: 'geschichte', q: 'Welches Volk baute die Pyramiden?', answers: ['Ägypter', 'Römer', 'Griechen', 'Perser'], correct: 0 },
  { cat: 'geschichte', q: 'Wann wurde Amerika entdeckt (Kolumbus)?', answers: ['1492', '1452', '1502', '1482'], correct: 0 },
  { cat: 'natur', q: 'Welches ist das größte Säugetier?', answers: ['Blauwal', 'Elefant', 'Giraffe', 'Wal-Hai'], correct: 0 },
  { cat: 'natur', q: 'Wie viele Beine hat eine Spinne?', answers: ['8', '6', '10', '12'], correct: 0 },
  { cat: 'natur', q: 'Welcher Planet ist der Sonne am nächsten?', answers: ['Merkur', 'Venus', 'Mars', 'Erde'], correct: 0 },
  { cat: 'natur', q: 'Wie heißt das männliche Bienenwesen?', answers: ['Drohne', 'Arbeiter', 'König', 'Wächter'], correct: 0 },
  { cat: 'natur', q: 'Welches Gas atmen Pflanzen ein?', answers: ['CO2', 'Sauerstoff', 'Stickstoff', 'Helium'], correct: 0 },
];

function shuffleAnswers(question) {
  const q = { ...question, answers: [...question.answers] };
  const correctAnswer = q.answers[q.correct];
  for (let i = q.answers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [q.answers[i], q.answers[j]] = [q.answers[j], q.answers[i]];
  }
  q.correct = q.answers.indexOf(correctAnswer);
  return q;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('quiz')
    .setDescription('Beantworte Quizfragen für Geld! (90s CD)')
    .addStringOption(opt =>
      opt.setName('kategorie')
        .setDescription('Quiz-Kategorie')
        .addChoices(
          { name: '🧠 Allgemeinwissen', value: 'allgemein' },
          { name: '🌍 Geografie', value: 'geografie' },
          { name: '📜 Geschichte', value: 'geschichte' },
          { name: '🌿 Natur & Tiere', value: 'natur' },
        )),
  async execute(interaction) {
    const userId = interaction.user.id;
    const config = require('../config.json');

    const lastPlay = cooldowns.get(userId);
    if (lastPlay && Date.now() - lastPlay < COOLDOWN) {
      const remaining = Math.ceil((COOLDOWN - (Date.now() - lastPlay)) / 1000);
      return interaction.reply(`⏳ Du musst noch **${remaining}s** warten!`);
    }

    cooldowns.set(userId, Date.now());

    const category = interaction.options.getString('kategorie');
    const pool = category ? questions.filter(q => q.cat === category) : [...questions];

    const selected = [];
    const poolCopy = [...pool];
    for (let i = 0; i < Math.min(5, poolCopy.length); i++) {
      const idx = Math.floor(Math.random() * poolCopy.length);
      selected.push(shuffleAnswers(poolCopy[idx]));
      poolCopy.splice(idx, 1);
    }

    let currentQ = 0;
    let score = 0;
    let streak = 0;
    let gameOver = false;
    const rewards = [50, 100, 200, 400, 800];
    const labels = ['A', 'B', 'C', 'D'];

    const buildQuizEmbed = (result = null) => {
      const q = selected[currentQ];
      const catInfo = categories[q.cat];
      const totalReward = rewards.slice(0, score).reduce((a, b) => a + b, 0);

      let desc = `${catInfo.emoji} **${catInfo.name}** — Frage ${currentQ + 1}/${selected.length}\n`;
      desc += `Punkte: **${score}/${selected.length}** | Streak: **${streak}x** 🔥\n\n`;
      desc += `**${q.q}**\n\n`;
      desc += q.answers.map((a, i) => {
        if (result !== null) {
          if (i === q.correct) return `✅ **${labels[i]}) ${a}**`;
          if (i === result && result !== q.correct) return `❌ ~~${labels[i]}) ${a}~~`;
          return `${labels[i]}) ${a}`;
        }
        return `**${labels[i]})** ${a}`;
      }).join('\n');

      if (result !== null) {
        desc += result === q.correct
          ? `\n\n✅ **Richtig!** +${config.currencySymbol}${rewards[currentQ]}${streak > 1 ? ` (${streak}x Streak!)` : ''}`
          : `\n\n❌ **Falsch!** Streak verloren!`;
      }

      desc += `\n\nBisheriger Gewinn: **${config.currencySymbol}${totalReward}**`;

      return new EmbedBuilder()
        .setColor(result === null ? '#3498db' : result === q.correct ? '#2ecc71' : '#e74c3c')
        .setTitle('🎓 Quiz')
        .setDescription(desc)
        .setFooter({ text: '15s pro Frage' })
        .setTimestamp();
    };

    const buildButtons = () => {
      const q = selected[currentQ];
      return [new ActionRowBuilder().addComponents(
        ...q.answers.map((_, i) =>
          new ButtonBuilder()
            .setCustomId(`quiz_${i}_${userId}`)
            .setLabel(`${labels[i]}`)
            .setStyle(ButtonStyle.Primary)
        )
      )];
    };

    const msg = await interaction.reply({ embeds: [buildQuizEmbed()], components: buildButtons(), fetchReply: true });
    const collector = msg.createMessageComponentCollector({ time: 15000 });

    collector.on('collect', async (btnInteraction) => {
      if (btnInteraction.user.id !== userId) {
        return btnInteraction.reply({ content: '❌ Das ist nicht dein Quiz!', flags: 64 });
      }
      if (gameOver) return;

      const chosen = parseInt(btnInteraction.customId.split('_')[1]);
      const q = selected[currentQ];

      if (chosen === q.correct) {
        score++;
        streak++;
      } else {
        streak = 0;
      }

      await btnInteraction.update({ embeds: [buildQuizEmbed(chosen)], components: [] });

      currentQ++;
      if (currentQ >= selected.length) {
        gameOver = true;
        collector.stop('done');

        let totalReward = rewards.slice(0, score).reduce((a, b) => a + b, 0);
        if (score === selected.length) totalReward = Math.floor(totalReward * 1.5);
        if (totalReward > 0) db.updateBalance(userId, totalReward);

        let tier, color;
        if (score === selected.length) { tier = '🏆 PERFEKT!'; color = '#FFD700'; }
        else if (score >= 4) { tier = '⭐ Ausgezeichnet!'; color = '#2ecc71'; }
        else if (score >= 3) { tier = '👍 Gut!'; color = '#3498db'; }
        else if (score >= 1) { tier = '😐 Naja...'; color = '#f39c12'; }
        else { tier = '💀 Katastrophe!'; color = '#e74c3c'; }

        setTimeout(() => {
          const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle(`🎓 Quiz — ${tier}`)
            .setDescription(
              `**${score}/${selected.length}** richtig beantwortet!\n\n` +
              (score === selected.length ? '🎉 **Perfekt-Bonus: 1.5x!**\n' : '') +
              (totalReward > 0
                ? `Belohnung: **+${config.currencySymbol}${totalReward.toLocaleString()}**`
                : 'Keine Belohnung.')
            )
            .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
            .setTimestamp();
          msg.edit({ embeds: [embed] });
        }, 2000);
        return;
      }

      setTimeout(() => {
        collector.resetTimer({ time: 15000 });
        msg.edit({ embeds: [buildQuizEmbed()], components: buildButtons() });
      }, 2000);
    });

    collector.on('end', (_, reason) => {
      if (reason === 'time' && !gameOver) {
        gameOver = true;
        let totalReward = rewards.slice(0, score).reduce((a, b) => a + b, 0);
        if (totalReward > 0) db.updateBalance(userId, totalReward);

        const embed = new EmbedBuilder()
          .setColor('#f39c12')
          .setTitle('⏰ Quiz — Zeit abgelaufen!')
          .setDescription(
            `**${score}/${selected.length}** richtig bevor die Zeit ablief.\n\n` +
            (totalReward > 0
              ? `Belohnung: **+${config.currencySymbol}${totalReward.toLocaleString()}**`
              : 'Keine Belohnung.')
          )
          .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
          .setTimestamp();
        msg.edit({ embeds: [embed], components: [] });
      }
    });
  },
};
