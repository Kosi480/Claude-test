const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database');

const activeGames = new Set();

function randomCard() {
  const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const suits = ['♠', '♥', '♦', '♣'];
  const idx = Math.floor(Math.random() * values.length);
  return { value: values[idx], suit: suits[Math.floor(Math.random() * suits.length)], numValue: idx + 2 };
}

module.exports = {
  name: 'highlow',
  aliases: ['hl', 'höhertiefer'],
  description: 'Höher oder Tiefer — rate die nächste Karte (!highlow <Betrag>)',
  execute(message, args) {
    const userId = message.author.id;
    const config = require('../config.json');

    if (activeGames.has(userId)) return message.reply('❌ Du hast bereits ein laufendes Spiel!');
    if (!args[0]) return message.reply(`❌ Nutzung: \`${config.prefix}highlow <Betrag>\``);

    let bet;
    if (args[0] === 'all' || args[0] === 'alles') {
      bet = db.getBalance(userId);
    } else {
      bet = parseInt(args[0]);
    }

    if (!bet || bet <= 0) return message.reply('❌ Ungültiger Betrag!');
    if (bet > db.getBalance(userId)) return message.reply(`❌ Du hast nur **${config.currencySymbol}${db.getBalance(userId)}**!`);

    activeGames.add(userId);
    let currentCard = randomCard();
    let streak = 0;
    let totalWin = 0;

    function buildEmbed() {
      return new EmbedBuilder()
        .setColor('#3498db')
        .setTitle('🃏 Höher oder Tiefer')
        .setDescription(
          `Aktuelle Karte: **${currentCard.value}${currentCard.suit}**\n\n` +
          `Streak: **${streak}x** | Pot: **${config.currencySymbol}${(bet + totalWin).toLocaleString()}**\n\n` +
          `Ist die nächste Karte **höher** oder **tiefer**?`
        )
        .setFooter({ text: 'Oder nimm deinen Gewinn mit "Auszahlen"' })
        .setTimestamp();
    }

    function buildRow() {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`hl_high_${userId}`).setLabel('Höher ⬆️').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`hl_low_${userId}`).setLabel('Tiefer ⬇️').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`hl_cash_${userId}`).setLabel('Auszahlen 💰').setStyle(ButtonStyle.Secondary).setDisabled(streak === 0),
      );
    }

    message.reply({ embeds: [buildEmbed()], components: [buildRow()] }).then(msg => {
      const collector = msg.createMessageComponentCollector({ time: 30000 });

      collector.on('collect', (interaction) => {
        if (interaction.user.id !== userId) {
          return interaction.reply({ content: '❌ Das ist nicht dein Spiel!', flags: 64 });
        }

        if (interaction.customId === `hl_cash_${userId}`) {
          collector.stop('cashed');
          activeGames.delete(userId);
          db.updateBalance(userId, totalWin);

          const embed = new EmbedBuilder()
            .setColor('#2ecc71')
            .setTitle('🃏 Höher oder Tiefer — Ausgezahlt!')
            .setDescription(`Streak: **${streak}x**\nGewinn: **+${config.currencySymbol}${totalWin.toLocaleString()}**`)
            .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
            .setTimestamp();
          return interaction.update({ embeds: [embed], components: [] });
        }

        const guessHigh = interaction.customId === `hl_high_${userId}`;
        const nextCard = randomCard();
        const correct = guessHigh ? nextCard.numValue >= currentCard.numValue : nextCard.numValue <= currentCard.numValue;

        if (correct) {
          streak++;
          totalWin += Math.floor(bet * 0.5);
          currentCard = nextCard;

          collector.resetTimer();
          interaction.update({ embeds: [buildEmbed()], components: [buildRow()] });
        } else {
          collector.stop('lost');
          activeGames.delete(userId);
          db.updateBalance(userId, -bet);

          const embed = new EmbedBuilder()
            .setColor('#e74c3c')
            .setTitle('🃏 Höher oder Tiefer — Verloren!')
            .setDescription(
              `Nächste Karte: **${nextCard.value}${nextCard.suit}** — Falsch geraten!\n\n` +
              `Du verlierst deinen Einsatz: **-${config.currencySymbol}${bet.toLocaleString()}**`
            )
            .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
            .setTimestamp();
          interaction.update({ embeds: [embed], components: [] });
        }
      });

      collector.on('end', (_, reason) => {
        if (reason === 'time') {
          activeGames.delete(userId);
          if (totalWin > 0) {
            db.updateBalance(userId, totalWin);
          }
          msg.edit({ components: [] });
        }
      });
    });
  },
};
