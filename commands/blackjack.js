const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database');

const suits = ['♠', '♥', '♦', '♣'];
const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function createDeck() {
  const deck = [];
  for (const suit of suits) {
    for (const value of values) {
      deck.push({ suit, value });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function cardValue(card) {
  if (['J', 'Q', 'K'].includes(card.value)) return 10;
  if (card.value === 'A') return 11;
  return parseInt(card.value);
}

function handValue(hand) {
  let total = hand.reduce((sum, card) => sum + cardValue(card), 0);
  let aces = hand.filter(c => c.value === 'A').length;
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

function formatHand(hand, hideSecond = false) {
  if (hideSecond && hand.length >= 2) {
    return `${hand[0].value}${hand[0].suit} | ??`;
  }
  return hand.map(c => `${c.value}${c.suit}`).join(' | ');
}

const activeGames = new Map();

module.exports = {
  name: 'blackjack',
  aliases: ['bj'],
  description: 'Spiele Blackjack gegen den Dealer',
  execute(message, args) {
    const userId = message.author.id;
    const config = require('../config.json');

    if (activeGames.has(userId)) return message.reply('❌ Du hast bereits ein laufendes Spiel!');

    if (!args[0]) return message.reply(`❌ Nutzung: \`${config.prefix}blackjack <Betrag>\``);

    let amount;
    if (args[0] === 'all' || args[0] === 'alles') {
      amount = db.getBalance(userId);
    } else {
      amount = parseInt(args[0]);
    }

    if (!amount || amount <= 0) return message.reply('❌ Bitte gib einen gültigen Betrag an!');
    if (amount > db.getBalance(userId)) return message.reply(`❌ Du hast nur **${config.currencySymbol}${db.getBalance(userId)}**!`);

    const deck = createDeck();
    const playerHand = [deck.pop(), deck.pop()];
    const dealerHand = [deck.pop(), deck.pop()];

    const game = { deck, playerHand, dealerHand, amount };
    activeGames.set(userId, game);

    if (handValue(playerHand) === 21) {
      activeGames.delete(userId);
      const winAmount = Math.floor(amount * 1.5);
      db.updateBalance(userId, winAmount);
      const embed = createEmbed(playerHand, dealerHand, false, config)
        .setColor('#FFD700')
        .setTitle('🃏 BLACKJACK!')
        .setDescription(`Blackjack! Du gewinnst **${config.currencySymbol}${winAmount}**!`)
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` });
      return message.reply({ embeds: [embed] });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`bj_hit_${userId}`).setLabel('Hit').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`bj_stand_${userId}`).setLabel('Stand').setStyle(ButtonStyle.Secondary),
    );

    const embed = createEmbed(playerHand, dealerHand, true, config)
      .setFooter({ text: `Einsatz: ${config.currencySymbol}${amount}` });

    message.reply({ embeds: [embed], components: [row] }).then(msg => {
      const collector = msg.createMessageComponentCollector({ time: 60000 });

      collector.on('collect', (interaction) => {
        if (interaction.user.id !== userId) {
          return interaction.reply({ content: '❌ Das ist nicht dein Spiel!', flags: 64 });
        }

        const game = activeGames.get(userId);
        if (!game) return;

        if (interaction.customId === `bj_hit_${userId}`) {
          game.playerHand.push(game.deck.pop());
          const pValue = handValue(game.playerHand);

          if (pValue > 21) {
            activeGames.delete(userId);
            db.updateBalance(userId, -game.amount);
            collector.stop();
            const embed = createEmbed(game.playerHand, game.dealerHand, false, config)
              .setColor('#e74c3c')
              .setTitle('🃏 Bust!')
              .setDescription(`Über 21! Du verlierst **${config.currencySymbol}${game.amount}**!`)
              .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` });
            return interaction.update({ embeds: [embed], components: [] });
          }

          const embed = createEmbed(game.playerHand, game.dealerHand, true, config)
            .setFooter({ text: `Einsatz: ${config.currencySymbol}${game.amount} | Dein Wert: ${pValue}` });
          interaction.update({ embeds: [embed], components: [row] });

        } else if (interaction.customId === `bj_stand_${userId}`) {
          collector.stop();
          while (handValue(game.dealerHand) < 17) {
            game.dealerHand.push(game.deck.pop());
          }

          const pValue = handValue(game.playerHand);
          const dValue = handValue(game.dealerHand);
          let resultText, color;

          if (dValue > 21 || pValue > dValue) {
            db.updateBalance(userId, game.amount);
            resultText = `Du gewinnst! **+${config.currencySymbol}${game.amount}**`;
            color = '#2ecc71';
          } else if (pValue === dValue) {
            resultText = 'Unentschieden! Einsatz zurück.';
            color = '#f39c12';
          } else {
            db.updateBalance(userId, -game.amount);
            resultText = `Dealer gewinnt! **-${config.currencySymbol}${game.amount}**`;
            color = '#e74c3c';
          }

          activeGames.delete(userId);

          const embed = createEmbed(game.playerHand, game.dealerHand, false, config)
            .setColor(color)
            .setTitle('🃏 Blackjack — Ergebnis')
            .setDescription(resultText)
            .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` });
          interaction.update({ embeds: [embed], components: [] });
        }
      });

      collector.on('end', (_, reason) => {
        if (reason === 'time') {
          activeGames.delete(userId);
          db.updateBalance(userId, -activeGames.get(userId)?.amount || 0);
          msg.edit({ components: [] });
        }
      });
    });
  },
};

function createEmbed(playerHand, dealerHand, hideDealer, config) {
  return new EmbedBuilder()
    .setColor('#3498db')
    .setTitle('🃏 Blackjack')
    .addFields(
      { name: `Deine Hand (${handValue(playerHand)})`, value: formatHand(playerHand), inline: false },
      { name: `Dealer ${hideDealer ? '' : `(${handValue(dealerHand)})`}`, value: formatHand(dealerHand, hideDealer), inline: false },
    );
}
