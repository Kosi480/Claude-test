const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database');

const questions = [
  { q: 'Was ist die Hauptstadt von Deutschland?', answers: ['Berlin', 'München', 'Hamburg', 'Köln'], correct: 0 },
  { q: 'Wie viele Planeten hat unser Sonnensystem?', answers: ['7', '8', '9', '10'], correct: 1 },
  { q: 'Welches Tier ist das größte der Welt?', answers: ['Elefant', 'Giraffe', 'Blauwal', 'Hai'], correct: 2 },
  { q: 'In welchem Jahr fiel die Berliner Mauer?', answers: ['1987', '1988', '1989', '1990'], correct: 2 },
  { q: 'Was ist H2O?', answers: ['Sauerstoff', 'Wasser', 'Wasserstoff', 'Helium'], correct: 1 },
  { q: 'Welche Farbe hat ein Smaragd?', answers: ['Rot', 'Blau', 'Grün', 'Gelb'], correct: 2 },
  { q: 'Wie viele Beine hat eine Spinne?', answers: ['6', '8', '10', '12'], correct: 1 },
  { q: 'Was ist die kleinste Primzahl?', answers: ['0', '1', '2', '3'], correct: 2 },
  { q: 'Welcher Planet ist der Sonne am nächsten?', answers: ['Venus', 'Merkur', 'Mars', 'Erde'], correct: 1 },
  { q: 'Wie viele Zähne hat ein erwachsener Mensch?', answers: ['28', '30', '32', '34'], correct: 2 },
  { q: 'Wer malte die Mona Lisa?', answers: ['Picasso', 'Da Vinci', 'Van Gogh', 'Monet'], correct: 1 },
  { q: 'Was ist die Hauptstadt von Japan?', answers: ['Osaka', 'Kyoto', 'Tokio', 'Nagoya'], correct: 2 },
  { q: 'Wie viele Kontinente gibt es?', answers: ['5', '6', '7', '8'], correct: 2 },
  { q: 'Welches Element hat das Symbol "Fe"?', answers: ['Fluor', 'Eisen', 'Francium', 'Fermium'], correct: 1 },
  { q: 'In welchem Ozean liegt Hawaii?', answers: ['Atlantik', 'Indischer Ozean', 'Pazifik', 'Arktis'], correct: 2 },
];

const REWARDS = { easy: 75, medium: 150, hard: 250 };
const COOLDOWN = 30 * 1000;
const cooldowns = new Map();
const activeQuizzes = new Set();

module.exports = {
  name: 'trivia',
  aliases: ['quiz', 'rätsel'],
  description: 'Beantworte eine Quizfrage und verdiene Coins (30s Cooldown)',
  execute(message) {
    const userId = message.author.id;
    const config = require('../config.json');

    if (activeQuizzes.has(userId)) return message.reply('❌ Du hast bereits ein aktives Quiz!');

    const lastTrivia = cooldowns.get(userId);
    if (lastTrivia && Date.now() - lastTrivia < COOLDOWN) {
      const remaining = Math.ceil((COOLDOWN - (Date.now() - lastTrivia)) / 1000);
      return message.reply(`⏳ Du musst noch **${remaining}s** warten!`);
    }

    const question = questions[Math.floor(Math.random() * questions.length)];
    const reward = REWARDS.medium;
    const letters = ['A', 'B', 'C', 'D'];

    activeQuizzes.add(userId);
    cooldowns.set(userId, Date.now());

    const row = new ActionRowBuilder().addComponents(
      ...question.answers.map((_, i) =>
        new ButtonBuilder()
          .setCustomId(`trivia_${i}_${userId}`)
          .setLabel(letters[i])
          .setStyle(ButtonStyle.Primary)
      )
    );

    const embed = new EmbedBuilder()
      .setColor('#3498db')
      .setTitle('❓ Trivia-Quiz')
      .setDescription(
        `**${question.q}**\n\n` +
        question.answers.map((a, i) => `**${letters[i]}.** ${a}`).join('\n')
      )
      .setFooter({ text: `Belohnung: ${config.currencySymbol}${reward} | 15 Sekunden Zeit` })
      .setTimestamp();

    message.reply({ embeds: [embed], components: [row] }).then(msg => {
      const collector = msg.createMessageComponentCollector({ time: 15000 });

      collector.on('collect', (interaction) => {
        if (interaction.user.id !== userId) {
          return interaction.reply({ content: '❌ Das ist nicht dein Quiz!', flags: 64 });
        }

        collector.stop();
        activeQuizzes.delete(userId);

        const chosen = parseInt(interaction.customId.split('_')[1]);
        const correct = chosen === question.correct;

        if (correct) {
          db.updateBalance(userId, reward);
          const embed = new EmbedBuilder()
            .setColor('#2ecc71')
            .setTitle('✅ Richtig!')
            .setDescription(`**${question.answers[question.correct]}** war richtig! Du bekommst **${config.currencySymbol}${reward}**!`)
            .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
            .setTimestamp();
          interaction.update({ embeds: [embed], components: [] });
        } else {
          const embed = new EmbedBuilder()
            .setColor('#e74c3c')
            .setTitle('❌ Falsch!')
            .setDescription(`Die richtige Antwort war: **${question.answers[question.correct]}**`)
            .setTimestamp();
          interaction.update({ embeds: [embed], components: [] });
        }
      });

      collector.on('end', (_, reason) => {
        if (reason === 'time') {
          activeQuizzes.delete(userId);
          const embed = new EmbedBuilder()
            .setColor('#95a5a6')
            .setTitle('⏰ Zeit abgelaufen!')
            .setDescription(`Die richtige Antwort wäre **${question.answers[question.correct]}** gewesen.`)
            .setTimestamp();
          msg.edit({ embeds: [embed], components: [] });
        }
      });
    });
  },
};
