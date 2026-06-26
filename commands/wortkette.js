const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const COOLDOWN = 2 * 60 * 1000;
const cooldowns = new Map();

const wordPool = {
  a: ['Apfel', 'Adler', 'Auto', 'Affe', 'Ameise', 'Anker', 'Ast'],
  b: ['Baum', 'Bär', 'Blume', 'Berg', 'Brücke', 'Buch', 'Birne'],
  c: ['Clown', 'Computer', 'Chaos'],
  d: ['Drache', 'Donner', 'Dach', 'Delfin', 'Diamant'],
  e: ['Elefant', 'Erde', 'Eis', 'Eule', 'Engel', 'Eiche'],
  f: ['Fuchs', 'Feuer', 'Fisch', 'Fluss', 'Frosch', 'Feder'],
  g: ['Gold', 'Garten', 'Geist', 'Glocke', 'Grube', 'Gurke'],
  h: ['Haus', 'Hund', 'Herz', 'Hexe', 'Honig', 'Hammer'],
  i: ['Igel', 'Insel'],
  j: ['Jagd', 'Juwel'],
  k: ['Katze', 'König', 'Krone', 'Kerze', 'Kuchen', 'Kristall'],
  l: ['Löwe', 'Lampe', 'Leiter', 'Licht', 'Laub'],
  m: ['Mond', 'Maus', 'Meer', 'Mauer', 'Musik', 'Messer'],
  n: ['Nacht', 'Nest', 'Nadel', 'Nebel', 'Natur'],
  o: ['Ofen', 'Ozean', 'Obst'],
  p: ['Pferd', 'Pilz', 'Perle', 'Palme', 'Pinsel'],
  q: ['Quelle', 'Quarz'],
  r: ['Ritter', 'Regen', 'Rose', 'Rakete', 'Ring', 'Rabe'],
  s: ['Stern', 'Schlange', 'Sonne', 'Schatz', 'Schwert', 'Spinne', 'Stein'],
  t: ['Tiger', 'Turm', 'Tisch', 'Tür', 'Traum', 'Tornado'],
  u: ['Uhr', 'Ufer'],
  v: ['Vogel', 'Vulkan'],
  w: ['Wolf', 'Wasser', 'Wind', 'Wolke', 'Wald', 'Wurm'],
  z: ['Zauber', 'Zahn', 'Ziege', 'Zwerg'],
};

function getRandomWord(letter) {
  const l = letter.toLowerCase();
  const words = wordPool[l];
  if (!words || words.length === 0) return null;
  return words[Math.floor(Math.random() * words.length)];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('wortkette')
    .setDescription('Wortkette — finde Wörter die mit dem letzten Buchstaben beginnen!')
    .addIntegerOption(opt =>
      opt.setName('einsatz')
        .setDescription('Dein Einsatz')
        .setRequired(true)
        .setMinValue(50)
        .setMaxValue(10000)),
  async execute(interaction) {
    const userId = interaction.user.id;
    const config = require('../config.json');

    const lastPlay = cooldowns.get(userId);
    if (lastPlay && Date.now() - lastPlay < COOLDOWN) {
      const remaining = Math.ceil((COOLDOWN - (Date.now() - lastPlay)) / 1000);
      return interaction.reply(`⏳ Du musst noch **${remaining}s** warten!`);
    }

    const bet = interaction.options.getInteger('einsatz');
    if (db.getBalance(userId) < bet) {
      return interaction.reply(`❌ Du brauchst **${config.currencySymbol}${bet.toLocaleString()}**!`);
    }

    cooldowns.set(userId, Date.now());
    db.updateBalance(userId, -bet);

    const usedWords = new Set();
    const startLetters = 'abdefghklmnoprstw';
    let currentWord = getRandomWord(startLetters[Math.floor(Math.random() * startLetters.length)]);
    usedWords.add(currentWord.toLowerCase());

    let chain = [currentWord];
    let score = 0;
    let round = 0;
    const maxRounds = 8;
    let gameOver = false;

    const getLastLetter = (word) => {
      const w = word.toLowerCase();
      let last = w[w.length - 1];
      if (last === 'ß') last = 's';
      return last;
    };

    const generateOptions = (letter) => {
      const l = letter.toLowerCase();
      const available = (wordPool[l] || []).filter(w => !usedWords.has(w.toLowerCase()));

      if (available.length < 2) {
        const allWords = Object.values(wordPool).flat().filter(w =>
          !usedWords.has(w.toLowerCase()) && w[0].toLowerCase() === l
        );
        if (allWords.length < 2) return null;
        return allWords;
      }
      return available;
    };

    const pickOptions = (letter) => {
      const pool = generateOptions(letter);
      if (!pool || pool.length === 0) return null;

      const correct = pool[Math.floor(Math.random() * pool.length)];

      const wrongPool = Object.values(wordPool).flat().filter(w =>
        w[0].toLowerCase() !== letter.toLowerCase() && !usedWords.has(w.toLowerCase())
      );

      const options = [correct];
      while (options.length < 4 && wrongPool.length > 0) {
        const idx = Math.floor(Math.random() * wrongPool.length);
        const wrong = wrongPool.splice(idx, 1)[0];
        if (!options.includes(wrong)) options.push(wrong);
      }

      return { correct, options: options.sort(() => Math.random() - 0.5) };
    };

    let lastLetter = getLastLetter(currentWord);
    let currentOptions = pickOptions(lastLetter);

    if (!currentOptions) {
      db.updateBalance(userId, bet);
      return interaction.reply('❌ Fehler beim Generieren. Einsatz zurück.');
    }

    const buildEmbed = (extra = '') => {
      return new EmbedBuilder()
        .setColor(gameOver ? '#FFD700' : '#3498db')
        .setTitle('🔗 Wortkette')
        .setDescription(
          `💰 Einsatz: **${config.currencySymbol}${bet.toLocaleString()}**\n` +
          `📊 Runde: **${round + 1}/${maxRounds}** | Kette: **${chain.length}**\n\n` +
          `🔗 ${chain.slice(-5).map(w => `**${w}**`).join(' → ')}\n\n` +
          `Letzter Buchstabe: **${lastLetter.toUpperCase()}**\n` +
          `Welches Wort beginnt mit **${lastLetter.toUpperCase()}**?\n` +
          extra
        )
        .setFooter({ text: `Punkte: ${score} | 15s pro Runde` })
        .setTimestamp();
    };

    const buildButtons = () => {
      return [new ActionRowBuilder().addComponents(
        ...currentOptions.options.map((word, i) =>
          new ButtonBuilder()
            .setCustomId(`wk_${i}_${userId}`)
            .setLabel(word)
            .setStyle(ButtonStyle.Primary)
        )
      )];
    };

    const msg = await interaction.reply({ embeds: [buildEmbed()], components: buildButtons(), fetchReply: true });
    const collector = msg.createMessageComponentCollector({ time: 15000 });

    collector.on('collect', (btnInteraction) => {
      if (btnInteraction.user.id !== userId) {
        return btnInteraction.reply({ content: '❌ Das ist nicht dein Spiel!', flags: 64 });
      }
      if (gameOver) return;

      const idx = parseInt(btnInteraction.customId.split('_')[1]);
      const chosen = currentOptions.options[idx];
      const correct = chosen === currentOptions.correct;

      if (correct) {
        round++;
        score += 10 + round * 5;
        usedWords.add(chosen.toLowerCase());
        chain.push(chosen);
        currentWord = chosen;
        lastLetter = getLastLetter(currentWord);

        if (round >= maxRounds) {
          gameOver = true;
          collector.stop('complete');

          const multiplier = 1 + (score / 100);
          const winnings = Math.floor(bet * multiplier);
          db.updateBalance(userId, winnings);

          const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🔗 Wortkette komplett! 🏆')
            .setDescription(
              `🔗 ${chain.map(w => `**${w}**`).join(' → ')}\n\n` +
              `📊 Punkte: **${score}**\n` +
              `🔗 Kettenlänge: **${chain.length}**\n` +
              `💰 Gewinn: **+${config.currencySymbol}${winnings.toLocaleString()}** (x${multiplier.toFixed(1)})`
            )
            .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
            .setTimestamp();
          btnInteraction.update({ embeds: [embed], components: [] });
          return;
        }

        currentOptions = pickOptions(lastLetter);
        if (!currentOptions) {
          gameOver = true;
          collector.stop('nowords');

          const multiplier = 1 + (score / 100);
          const winnings = Math.floor(bet * multiplier);
          db.updateBalance(userId, winnings);

          const embed = new EmbedBuilder()
            .setColor('#2ecc71')
            .setTitle('🔗 Keine Wörter mehr!')
            .setDescription(
              `Die Kette kann nicht fortgesetzt werden!\n\n` +
              `🔗 ${chain.map(w => `**${w}**`).join(' → ')}\n\n` +
              `💰 Gewinn: **+${config.currencySymbol}${winnings.toLocaleString()}**`
            )
            .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
            .setTimestamp();
          btnInteraction.update({ embeds: [embed], components: [] });
          return;
        }

        collector.resetTimer({ time: 15000 });
        btnInteraction.update({ embeds: [buildEmbed('✅ **Richtig!**\n')], components: buildButtons() });
      } else {
        gameOver = true;
        collector.stop('wrong');

        const consolation = score > 30 ? Math.floor(bet * (score / 200)) : 0;
        if (consolation > 0) db.updateBalance(userId, consolation);

        const embed = new EmbedBuilder()
          .setColor('#e74c3c')
          .setTitle('🔗 Falsch! Kette gebrochen!')
          .setDescription(
            `❌ **${chosen}** beginnt nicht mit **${lastLetter.toUpperCase()}**!\n` +
            `✅ Richtig wäre: **${currentOptions.correct}**\n\n` +
            `🔗 ${chain.map(w => `**${w}**`).join(' → ')}\n\n` +
            `📊 Punkte: **${score}** | Kette: **${chain.length}**\n` +
            (consolation > 0
              ? `💰 Trostpreis: **+${config.currencySymbol}${consolation}**`
              : `💸 Verloren: **-${config.currencySymbol}${bet.toLocaleString()}**`)
          )
          .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
          .setTimestamp();
        btnInteraction.update({ embeds: [embed], components: [] });
      }
    });

    collector.on('end', (_, reason) => {
      if (reason === 'time' && !gameOver) {
        gameOver = true;
        const consolation = score > 30 ? Math.floor(bet * (score / 200)) : 0;
        if (consolation > 0) db.updateBalance(userId, consolation);

        const embed = new EmbedBuilder()
          .setColor('#f39c12')
          .setTitle('⏰ Wortkette — Zeit abgelaufen!')
          .setDescription(
            `🔗 ${chain.map(w => `**${w}**`).join(' → ')}\n\n` +
            (consolation > 0
              ? `💰 Trostpreis: **+${config.currencySymbol}${consolation}**`
              : `💸 Verloren: **-${config.currencySymbol}${bet.toLocaleString()}**`)
          )
          .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
          .setTimestamp();
        msg.edit({ embeds: [embed], components: [] });
      }
    });
  },
};
