const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const COOLDOWN = 60 * 1000;
const cooldowns = new Map();
const MAX_WRONG = 6;

const words = [
  { word: 'DRACHE', hint: 'Feuerspeiendes Fabelwesen', reward: 200 },
  { word: 'SCHWERT', hint: 'Waffe eines Ritters', reward: 200 },
  { word: 'DIAMANT', hint: 'Wertvollster Edelstein', reward: 250 },
  { word: 'PIRAT', hint: 'Seeräuber', reward: 150 },
  { word: 'SCHLOSS', hint: 'Wohnsitz eines Königs', reward: 200 },
  { word: 'VULKAN', hint: 'Feuerspuckender Berg', reward: 200 },
  { word: 'EINHORN', hint: 'Magisches Pferd mit Horn', reward: 250 },
  { word: 'OZEAN', hint: 'Riesiges Gewässer', reward: 150 },
  { word: 'PHARAO', hint: 'Herrscher im alten Ägypten', reward: 250 },
  { word: 'ZAUBERER', hint: 'Beherrscht magische Kräfte', reward: 300 },
  { word: 'MONSTER', hint: 'Ungeheuer', reward: 200 },
  { word: 'KRISTALL', hint: 'Durchsichtiger Edelstein', reward: 250 },
  { word: 'RITTER', hint: 'Gepanzerter Kämpfer', reward: 200 },
  { word: 'PHÖNIX', hint: 'Vogel der aus Asche aufersteht', reward: 300 },
  { word: 'TORNADO', hint: 'Wirbelsturm', reward: 200 },
  { word: 'GALAXIE', hint: 'Sternenansammlung im All', reward: 250 },
  { word: 'MUMIE', hint: 'Eingewickelter Untoter', reward: 200 },
  { word: 'ELIXIER', hint: 'Magischer Zaubertrank', reward: 300 },
  { word: 'GOLEM', hint: 'Kreatur aus Stein', reward: 200 },
  { word: 'SPHINX', hint: 'Rätselwesen aus Ägypten', reward: 300 },
];

const hangmanStages = [
  '```\n  +---+\n      |\n      |\n      |\n     ===\n```',
  '```\n  +---+\n  O   |\n      |\n      |\n     ===\n```',
  '```\n  +---+\n  O   |\n  |   |\n      |\n     ===\n```',
  '```\n  +---+\n  O   |\n /|   |\n      |\n     ===\n```',
  '```\n  +---+\n  O   |\n /|\\  |\n      |\n     ===\n```',
  '```\n  +---+\n  O   |\n /|\\  |\n /    |\n     ===\n```',
  '```\n  +---+\n  O   |\n /|\\  |\n / \\  |\n     ===\n```',
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hangman')
    .setDescription('Galgenmännchen — rate das Wort! (60s CD)'),
  async execute(interaction) {
    const userId = interaction.user.id;
    const config = require('../config.json');

    const lastPlay = cooldowns.get(userId);
    if (lastPlay && Date.now() - lastPlay < COOLDOWN) {
      const remaining = Math.ceil((COOLDOWN - (Date.now() - lastPlay)) / 1000);
      return interaction.reply(`⏳ Du musst noch **${remaining}s** warten!`);
    }

    cooldowns.set(userId, Date.now());

    const wordData = words[Math.floor(Math.random() * words.length)];
    const word = wordData.word;
    const guessed = new Set();
    let wrong = 0;
    let gameOver = false;

    const getDisplay = () => {
      return word.split('').map(c => guessed.has(c) ? `**${c}**` : '\\_').join(' ');
    };

    const isWon = () => {
      return word.split('').every(c => guessed.has(c));
    };

    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

    const buildButtons = () => {
      const rows = [];
      for (let r = 0; r < 4; r++) {
        const row = new ActionRowBuilder();
        const start = r * 7;
        const end = Math.min(start + 7, 26);
        if (start >= 26) break;
        for (let i = start; i < end; i++) {
          const letter = alphabet[i];
          const alreadyGuessed = guessed.has(letter);
          const isInWord = word.includes(letter);
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`hm_${letter}_${userId}`)
              .setLabel(letter)
              .setStyle(alreadyGuessed ? (isInWord ? ButtonStyle.Success : ButtonStyle.Danger) : ButtonStyle.Secondary)
              .setDisabled(alreadyGuessed)
          );
        }
        rows.push(row);
      }
      return rows;
    };

    const buildEmbed = () => {
      return new EmbedBuilder()
        .setColor(gameOver ? (isWon() ? '#2ecc71' : '#e74c3c') : '#3498db')
        .setTitle('🪢 Galgenmännchen')
        .setDescription(
          `${hangmanStages[wrong]}\n` +
          `Wort: ${getDisplay()}\n\n` +
          `Hinweis: *${wordData.hint}*\n` +
          `Fehler: **${wrong}/${MAX_WRONG}**\n` +
          `Belohnung: **${config.currencySymbol}${wordData.reward}**`
        )
        .setFooter({ text: '60s Zeit' })
        .setTimestamp();
    };

    const msg = await interaction.reply({ embeds: [buildEmbed()], components: buildButtons(), fetchReply: true });
    const collector = msg.createMessageComponentCollector({ time: 60000 });

    collector.on('collect', (btnInteraction) => {
      if (btnInteraction.user.id !== userId) {
        return btnInteraction.reply({ content: '❌ Das ist nicht dein Spiel!', flags: 64 });
      }
      if (gameOver) return;

      const letter = btnInteraction.customId.split('_')[1];
      guessed.add(letter);

      if (!word.includes(letter)) {
        wrong++;
      }

      if (isWon()) {
        gameOver = true;
        collector.stop('won');
        db.updateBalance(userId, wordData.reward);

        const embed = new EmbedBuilder()
          .setColor('#2ecc71')
          .setTitle('🎉 Gewonnen!')
          .setDescription(
            `${hangmanStages[wrong]}\n` +
            `Wort: **${word}**\n\n` +
            `Du hast das Wort erraten!\n` +
            `Belohnung: **+${config.currencySymbol}${wordData.reward}**`
          )
          .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
          .setTimestamp();
        btnInteraction.update({ embeds: [embed], components: [] });
        return;
      }

      if (wrong >= MAX_WRONG) {
        gameOver = true;
        collector.stop('lost');

        const embed = new EmbedBuilder()
          .setColor('#e74c3c')
          .setTitle('💀 Verloren!')
          .setDescription(
            `${hangmanStages[wrong]}\n` +
            `Das Wort war: **${word}**\n\n` +
            `Leider nicht erraten!`
          )
          .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
          .setTimestamp();
        btnInteraction.update({ embeds: [embed], components: [] });
        return;
      }

      collector.resetTimer({ time: 60000 });
      btnInteraction.update({ embeds: [buildEmbed()], components: buildButtons() });
    });

    collector.on('end', (_, reason) => {
      if (reason === 'time' && !gameOver) {
        gameOver = true;
        const embed = new EmbedBuilder()
          .setColor('#f39c12')
          .setTitle('⏰ Zeit abgelaufen!')
          .setDescription(
            `${hangmanStages[wrong]}\n` +
            `Das Wort war: **${word}**`
          )
          .setTimestamp();
        msg.edit({ embeds: [embed], components: [] });
      }
    });
  },
};
