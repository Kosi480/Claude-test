const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const COOLDOWN = 3 * 60 * 1000;
const cooldowns = new Map();

const puzzles = [
  {
    type: 'math',
    generate: () => {
      const a = 10 + Math.floor(Math.random() * 40);
      const b = 5 + Math.floor(Math.random() * 20);
      const ops = ['+', '-', '*'];
      const op = ops[Math.floor(Math.random() * ops.length)];
      const answer = op === '+' ? a + b : op === '-' ? a - b : a * b;
      return { question: `🔢 Was ist **${a} ${op} ${b}**?`, answer: answer.toString(), hint: 'Rechne schnell!' };
    },
  },
  {
    type: 'sequence',
    generate: () => {
      const start = Math.floor(Math.random() * 10);
      const step = 2 + Math.floor(Math.random() * 5);
      const seq = Array.from({ length: 4 }, (_, i) => start + step * i);
      const answer = start + step * 4;
      return { question: `🔗 Welche Zahl kommt als nächstes?\n**${seq.join(', ')}, ?**`, answer: answer.toString(), hint: `Tipp: Schritt = ${step}` };
    },
  },
  {
    type: 'emoji',
    generate: () => {
      const codes = [
        { emojis: '🍎🍊🍋', answer: 'frucht', q: '🍎🍊🍋 — Was haben alle gemeinsam?' },
        { emojis: '🐶🐱🐰', answer: 'tier', q: '🐶🐱🐰 — Was haben alle gemeinsam?' },
        { emojis: '❤️💛💚', answer: 'farbe', q: '❤️💛💚 — Was haben alle gemeinsam?' },
        { emojis: '⚽🏀🎾', answer: 'ball', q: '⚽🏀🎾 — Was haben alle gemeinsam?' },
        { emojis: '🌍🌙⭐', answer: 'himmel', q: '🌍🌙⭐ — Wo findet man diese?' },
      ];
      const code = codes[Math.floor(Math.random() * codes.length)];
      return { question: `🧩 ${code.q}`, answer: code.answer, hint: 'Ein Wort!' };
    },
  },
  {
    type: 'reverse',
    generate: () => {
      const words = ['SCHATZ', 'GOLD', 'DRACHE', 'SCHLOSS', 'FLUCHT', 'RITTER', 'MAGIE', 'KRONE'];
      const word = words[Math.floor(Math.random() * words.length)];
      const reversed = word.split('').reverse().join('');
      return { question: `🔄 Drehe das Wort um:\n**${reversed}**`, answer: word.toLowerCase(), hint: `${word.length} Buchstaben` };
    },
  },
  {
    type: 'missing',
    generate: () => {
      const pairs = [
        { q: '🔑 _ C H L Ü S S E L', answer: 's' },
        { q: '🏰 B U R _', answer: 'g' },
        { q: '💎 D I A M A N _', answer: 't' },
        { q: '🗝️ G E H E I _', answer: 'm' },
        { q: '🚪 T Ü _', answer: 'r' },
      ];
      const pair = pairs[Math.floor(Math.random() * pairs.length)];
      return { question: `📝 Welcher Buchstabe fehlt?\n**${pair.q}**`, answer: pair.answer, hint: 'Nur ein Buchstabe!' };
    },
  },
];

const rooms = [
  { name: 'Eingangshalle', emoji: '🚪', reward: 50 },
  { name: 'Bibliothek', emoji: '📚', reward: 100 },
  { name: 'Labor', emoji: '⚗️', reward: 150 },
  { name: 'Schatzkammer', emoji: '💰', reward: 250 },
  { name: 'Ausgang', emoji: '🏆', reward: 500 },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('escape')
    .setDescription('Escape Room — löse Rätsel um zu entkommen! (3min CD)'),
  async execute(interaction) {
    const userId = interaction.user.id;
    const config = require('../config.json');

    const lastPlay = cooldowns.get(userId);
    if (lastPlay && Date.now() - lastPlay < COOLDOWN) {
      const remaining = Math.ceil((COOLDOWN - (Date.now() - lastPlay)) / 1000);
      return interaction.reply(`⏳ Du musst noch **${remaining}s** warten!`);
    }

    cooldowns.set(userId, Date.now());

    let currentRoom = 0;
    let totalReward = 0;
    let lives = 3;
    let gameOver = false;

    const generatePuzzle = () => {
      const puzzle = puzzles[Math.floor(Math.random() * puzzles.length)];
      return puzzle.generate();
    };

    let currentPuzzle = generatePuzzle();

    const generateOptions = (correctAnswer) => {
      const options = [correctAnswer];
      while (options.length < 4) {
        let wrong;
        if (!isNaN(correctAnswer)) {
          const num = parseInt(correctAnswer);
          wrong = (num + Math.floor(Math.random() * 20) - 10).toString();
          if (wrong === correctAnswer || options.includes(wrong)) continue;
        } else {
          const wrongWords = ['stein', 'wasser', 'feuer', 'luft', 'erde', 'mond', 'stern', 'baum', 'haus', 'berg', 'see', 'wald', 'nacht', 'tag', 'zeit'];
          wrong = wrongWords[Math.floor(Math.random() * wrongWords.length)];
          if (options.includes(wrong)) continue;
        }
        options.push(wrong);
      }
      return options.sort(() => Math.random() - 0.5);
    };

    let options = generateOptions(currentPuzzle.answer);

    const buildEmbed = (extra = '') => {
      const room = rooms[currentRoom];
      const progressBar = rooms.map((r, i) => i < currentRoom ? '✅' : i === currentRoom ? '🔓' : '🔒').join(' ');

      return new EmbedBuilder()
        .setColor(gameOver ? (currentRoom >= rooms.length ? '#FFD700' : '#e74c3c') : '#9b59b6')
        .setTitle(`🔐 Escape Room — ${room.emoji} ${room.name}`)
        .setDescription(
          `${progressBar}\n\n` +
          `❤️ Leben: ${'❤️'.repeat(lives)}${'🖤'.repeat(3 - lives)}\n` +
          `💰 Beute: **${config.currencySymbol}${totalReward}**\n\n` +
          `**Rätsel:**\n${currentPuzzle.question}\n\n` +
          extra
        )
        .setFooter({ text: `Raum ${currentRoom + 1}/${rooms.length} | 20s pro Rätsel` })
        .setTimestamp();
    };

    const buildButtons = () => {
      return [new ActionRowBuilder().addComponents(
        ...options.map((opt, i) =>
          new ButtonBuilder()
            .setCustomId(`esc_${i}_${userId}`)
            .setLabel(opt.toUpperCase())
            .setStyle(ButtonStyle.Primary)
        )
      )];
    };

    const msg = await interaction.reply({ embeds: [buildEmbed()], components: buildButtons(), fetchReply: true });
    const collector = msg.createMessageComponentCollector({ time: 20000 });

    collector.on('collect', (btnInteraction) => {
      if (btnInteraction.user.id !== userId) {
        return btnInteraction.reply({ content: '❌ Das ist nicht dein Escape Room!', flags: 64 });
      }
      if (gameOver) return;

      const chosenIdx = parseInt(btnInteraction.customId.split('_')[1]);
      const chosen = options[chosenIdx];
      const correct = chosen === currentPuzzle.answer;

      if (correct) {
        totalReward += rooms[currentRoom].reward;
        currentRoom++;

        if (currentRoom >= rooms.length) {
          gameOver = true;
          collector.stop('escaped');

          const bonus = lives === 3 ? 300 : lives === 2 ? 150 : 0;
          totalReward += bonus;
          db.updateBalance(userId, totalReward);

          const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🏆 ENTKOMMEN!')
            .setDescription(
              `${rooms.map(() => '✅').join(' ')}\n\n` +
              `Du hast alle Rätsel gelöst und bist entkommen!\n\n` +
              `💰 Beute: **${config.currencySymbol}${totalReward - bonus}**\n` +
              (bonus > 0 ? `❤️ Leben-Bonus: **+${config.currencySymbol}${bonus}**\n` : '') +
              `🏆 Gesamt: **+${config.currencySymbol}${totalReward}**`
            )
            .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
            .setTimestamp();
          btnInteraction.update({ embeds: [embed], components: [] });
          return;
        }

        currentPuzzle = generatePuzzle();
        options = generateOptions(currentPuzzle.answer);

        collector.resetTimer({ time: 20000 });
        btnInteraction.update({ embeds: [buildEmbed('✅ **Richtig!** Nächster Raum...\n')], components: buildButtons() });
      } else {
        lives--;

        if (lives <= 0) {
          gameOver = true;
          collector.stop('dead');

          if (totalReward > 0) db.updateBalance(userId, Math.floor(totalReward * 0.5));

          const embed = new EmbedBuilder()
            .setColor('#e74c3c')
            .setTitle('💀 Gescheitert!')
            .setDescription(
              `Keine Leben mehr!\n` +
              `Richtige Antwort war: **${currentPuzzle.answer.toUpperCase()}**\n\n` +
              (totalReward > 0 ? `💰 Halbe Beute gerettet: **+${config.currencySymbol}${Math.floor(totalReward * 0.5)}**` : 'Keine Beute.')
            )
            .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
            .setTimestamp();
          btnInteraction.update({ embeds: [embed], components: [] });
          return;
        }

        currentPuzzle = generatePuzzle();
        options = generateOptions(currentPuzzle.answer);

        collector.resetTimer({ time: 20000 });
        btnInteraction.update({ embeds: [buildEmbed(`❌ **Falsch!** Antwort war: **${currentPuzzle.answer.toUpperCase()}** (-1 ❤️)\n`)], components: buildButtons() });
      }
    });

    collector.on('end', (_, reason) => {
      if (reason === 'time' && !gameOver) {
        gameOver = true;
        if (totalReward > 0) {
          db.updateBalance(userId, Math.floor(totalReward * 0.5));
        }
        const embed = new EmbedBuilder()
          .setColor('#f39c12')
          .setTitle('⏰ Zeit abgelaufen!')
          .setDescription(
            `Du warst zu langsam!\n\n` +
            (totalReward > 0 ? `💰 Halbe Beute: **+${config.currencySymbol}${Math.floor(totalReward * 0.5)}**` : 'Keine Beute.')
          )
          .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
          .setTimestamp();
        msg.edit({ embeds: [embed], components: [] });
      }
    });
  },
};
