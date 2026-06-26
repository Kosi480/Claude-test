const { EmbedBuilder } = require('discord.js');
const db = require('../database');

const COOLDOWN = 60 * 1000;
const cooldowns = new Map();

const wordSets = [
  { letters: 'A R T E S', words: ['art', 'rat', 'star', 'rest', 'aster', 'taste', 'rate', 'set', 'tear', 'seat'] },
  { letters: 'H U N D E', words: ['hund', 'und', 'den', 'dune', 'hen', 'end', 'nude', 'due', 'hun', 'dune'] },
  { letters: 'S P I E L', words: ['spiel', 'seil', 'eis', 'pils', 'slip', 'lisp', 'pie', 'lip', 'lies', 'isle'] },
  { letters: 'G O L D E', words: ['gold', 'geld', 'lode', 'god', 'old', 'gel', 'dog', 'log', 'ogle', 'dole'] },
  { letters: 'F E U E R', words: ['feuer', 'fuer', 'fee', 'fur', 'reef', 'free', 'rue', 'ref', 'fee', 'ere'] },
  { letters: 'M A C H T', words: ['macht', 'chat', 'match', 'mat', 'hat', 'act', 'cat', 'ham', 'tam', 'mac'] },
  { letters: 'K R A F T', words: ['kraft', 'kart', 'raft', 'art', 'rat', 'ark', 'far', 'fat', 'tar', 'aft'] },
  { letters: 'W I N T E', words: ['wein', 'weit', 'wint', 'win', 'net', 'new', 'ten', 'tin', 'wet', 'wit'] },
  { letters: 'B L U M E', words: ['blume', 'blum', 'lum', 'mule', 'blue', 'elm', 'emu', 'bum', 'mel', 'lub'] },
  { letters: 'S T E I N', words: ['stein', 'nest', 'nist', 'sein', 'set', 'net', 'sin', 'ten', 'tin', 'sit'] },
];

module.exports = {
  name: 'wortjagd',
  aliases: ['wordhunt', 'wj', 'buchstaben'],
  description: 'Finde Wörter aus den Buchstaben! (60s CD)',
  execute(message) {
    const userId = message.author.id;
    const config = require('../config.json');

    const lastPlay = cooldowns.get(userId);
    if (lastPlay && Date.now() - lastPlay < COOLDOWN) {
      const remaining = Math.ceil((COOLDOWN - (Date.now() - lastPlay)) / 1000);
      return message.reply(`⏳ Du musst noch **${remaining}s** warten!`);
    }

    cooldowns.set(userId, Date.now());

    const wordSet = wordSets[Math.floor(Math.random() * wordSets.length)];
    const uniqueWords = [...new Set(wordSet.words)];
    const foundWords = new Set();

    const embed = new EmbedBuilder()
      .setColor('#3498db')
      .setTitle('📝 Wortjagd!')
      .setDescription(
        `Buchstaben: **\` ${wordSet.letters} \`**\n\n` +
        `Schreibe so viele Wörter wie möglich!\n` +
        `Mindestens **3 Buchstaben** pro Wort.\n` +
        `Es gibt **${uniqueWords.length}** mögliche Wörter!\n\n` +
        `Gefunden: **0/${uniqueWords.length}**`
      )
      .setFooter({ text: '30 Sekunden Zeit!' })
      .setTimestamp();

    message.reply({ embeds: [embed] }).then(msg => {
      const collector = message.channel.createMessageCollector({
        filter: m => m.author.id === userId,
        time: 30000,
      });

      collector.on('collect', (m) => {
        const guess = m.content.toLowerCase().trim();

        if (guess.length < 3) return;

        if (uniqueWords.includes(guess) && !foundWords.has(guess)) {
          foundWords.add(guess);
          m.react('✅').catch(() => {});

          if (foundWords.size >= uniqueWords.length) {
            collector.stop('allFound');
          }
        } else if (foundWords.has(guess)) {
          m.react('🔄').catch(() => {});
        } else {
          m.react('❌').catch(() => {});
        }
      });

      collector.on('end', (_, reason) => {
        const count = foundWords.size;
        let reward, tier, color;

        if (count >= uniqueWords.length) {
          reward = 1000;
          tier = 'PERFEKT';
          color = '#FFD700';
        } else if (count >= 7) {
          reward = 600;
          tier = 'Ausgezeichnet';
          color = '#2ecc71';
        } else if (count >= 5) {
          reward = 400;
          tier = 'Sehr gut';
          color = '#3498db';
        } else if (count >= 3) {
          reward = 200;
          tier = 'Gut';
          color = '#f39c12';
        } else if (count >= 1) {
          reward = 75;
          tier = 'OK';
          color = '#e67e22';
        } else {
          reward = 0;
          tier = 'Nichts gefunden';
          color = '#e74c3c';
        }

        if (reward > 0) db.updateBalance(userId, reward);

        const missedWords = uniqueWords.filter(w => !foundWords.has(w));

        const resultEmbed = new EmbedBuilder()
          .setColor(color)
          .setTitle(`📝 Wortjagd — ${tier}!`)
          .setDescription(
            `Buchstaben: **\` ${wordSet.letters} \`**\n\n` +
            `Gefunden: **${count}/${uniqueWords.length}**\n` +
            (count > 0 ? `Deine Wörter: ${[...foundWords].join(', ')}\n` : '') +
            (missedWords.length > 0 ? `Verpasst: ||${missedWords.join(', ')}||\n` : '') +
            `\n` +
            (reward > 0
              ? `Belohnung: **+${config.currencySymbol}${reward}**`
              : `Keine Belohnung.`)
          )
          .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
          .setTimestamp();

        msg.edit({ embeds: [resultEmbed] });
      });
    });
  },
};
