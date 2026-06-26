const { EmbedBuilder } = require('discord.js');
const db = require('../database');

const words = [
  { word: 'DIAMANT', hint: 'Edelstein' },
  { word: 'GOLD', hint: 'Wertvolles Metall' },
  { word: 'SCHWERT', hint: 'Mittelalterliche Waffe' },
  { word: 'DRACHE', hint: 'Feuerspeiendes Fabelwesen' },
  { word: 'SCHATZ', hint: 'Wertvoller Fund' },
  { word: 'RITTER', hint: 'Mittelalterlicher Kämpfer' },
  { word: 'BURG', hint: 'Mittelalterliches Gebäude' },
  { word: 'KRONE', hint: 'Kopfschmuck eines Königs' },
  { word: 'PIRAT', hint: 'Seeräuber' },
  { word: 'MAGIE', hint: 'Zauberkraft' },
  { word: 'ELIXIER', hint: 'Magisches Getränk' },
  { word: 'RUBIN', hint: 'Roter Edelstein' },
  { word: 'SMARAGD', hint: 'Grüner Edelstein' },
  { word: 'MÜNZE', hint: 'Zahlungsmittel' },
  { word: 'TEMPEL', hint: 'Heiliger Ort' },
  { word: 'TURM', hint: 'Hohes Gebäude' },
  { word: 'WOLF', hint: 'Raubtier im Rudel' },
  { word: 'FALKE', hint: 'Schneller Raubvogel' },
  { word: 'PERLE', hint: 'Aus einer Muschel' },
  { word: 'KRISTALL', hint: 'Durchsichtiger Stein' },
];

const REWARD = 200;
const COOLDOWN = 45 * 1000;
const cooldowns = new Map();
const activeGames = new Set();

function scrambleWord(word) {
  const arr = word.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  const scrambled = arr.join('');
  if (scrambled === word) return scrambleWord(word);
  return scrambled;
}

module.exports = {
  name: 'scramble',
  aliases: ['wortspiel', 'unscramble'],
  description: 'Entwirre das Wort und verdiene Coins (45s Cooldown)',
  execute(message) {
    const userId = message.author.id;
    const config = require('../config.json');

    if (activeGames.has(userId)) return message.reply('❌ Du hast bereits ein aktives Wortspiel!');

    const lastGame = cooldowns.get(userId);
    if (lastGame && Date.now() - lastGame < COOLDOWN) {
      const remaining = Math.ceil((COOLDOWN - (Date.now() - lastGame)) / 1000);
      return message.reply(`⏳ Du musst noch **${remaining}s** warten!`);
    }

    const entry = words[Math.floor(Math.random() * words.length)];
    const scrambled = scrambleWord(entry.word);

    activeGames.add(userId);
    cooldowns.set(userId, Date.now());

    const embed = new EmbedBuilder()
      .setColor('#e67e22')
      .setTitle('🔤 Wortspiel')
      .setDescription(
        `Entwirre das Wort!\n\n` +
        `> **${scrambled}**\n\n` +
        `Hinweis: *${entry.hint}*\n` +
        `Belohnung: **${config.currencySymbol}${REWARD}**`
      )
      .setFooter({ text: '20 Sekunden Zeit — Schreibe die Antwort in den Chat!' })
      .setTimestamp();

    message.reply({ embeds: [embed] }).then(() => {
      const filter = m => m.author.id === userId;
      const collector = message.channel.createMessageCollector({ filter, time: 20000 });

      collector.on('collect', (msg) => {
        if (msg.content.toUpperCase().trim() === entry.word) {
          collector.stop('correct');
          activeGames.delete(userId);
          db.updateBalance(userId, REWARD);

          const embed = new EmbedBuilder()
            .setColor('#2ecc71')
            .setTitle('🔤 Richtig!')
            .setDescription(`**${entry.word}** war korrekt! Du bekommst **${config.currencySymbol}${REWARD}**!`)
            .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
            .setTimestamp();

          msg.reply({ embeds: [embed] });
        }
      });

      collector.on('end', (_, reason) => {
        activeGames.delete(userId);
        if (reason === 'time') {
          const embed = new EmbedBuilder()
            .setColor('#e74c3c')
            .setTitle('🔤 Zeit abgelaufen!')
            .setDescription(`Das Wort war: **${entry.word}**`)
            .setTimestamp();

          message.channel.send({ embeds: [embed] });
        }
      });
    });
  },
};
