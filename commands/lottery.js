const { EmbedBuilder } = require('discord.js');
const db = require('../database');

const TICKET_PRICE = 100;
const DRAW_INTERVAL = 5 * 60 * 1000;

let jackpot = 0;
let participants = new Map();
let lastDraw = Date.now();

function checkDraw(client, config) {
  if (Date.now() - lastDraw < DRAW_INTERVAL) return;
  if (participants.size < 2) return;

  const entries = [...participants.entries()];
  const winnerEntry = entries[Math.floor(Math.random() * entries.length)];
  const winnerId = winnerEntry[0];
  const winAmount = jackpot;

  db.updateBalance(winnerId, winAmount);

  const embed = new EmbedBuilder()
    .setColor('#FFD700')
    .setTitle('🎉 LOTTERY — GEWINNER!')
    .setDescription(
      `<@${winnerId}> hat die Lottery gewonnen!\n\n` +
      `Jackpot: **${config.currencySymbol}${winAmount.toLocaleString()}**\n` +
      `Teilnehmer: **${participants.size}**`
    )
    .setTimestamp();

  jackpot = 0;
  participants.clear();
  lastDraw = Date.now();

  for (const channel of client.channels.cache.values()) {
    if (channel.isTextBased() && winnerEntry[1] === channel.id) {
      channel.send({ embeds: [embed] });
      break;
    }
  }
}

module.exports = {
  name: 'lottery',
  aliases: ['lotto', 'lotterie'],
  description: 'Kaufe ein Lotterie-Los oder sieh den Jackpot (!lottery buy/info)',
  execute(message, args) {
    const userId = message.author.id;
    const config = require('../config.json');

    checkDraw(message.client, config);

    const action = (args[0] || 'info').toLowerCase();

    if (action === 'buy' || action === 'kaufen') {
      const ticketCount = parseInt(args[1]) || 1;
      const totalCost = TICKET_PRICE * ticketCount;

      if (ticketCount > 10) return message.reply('❌ Maximal 10 Lose auf einmal!');

      const balance = db.getBalance(userId);
      if (balance < totalCost) return message.reply(`❌ Du brauchst **${config.currencySymbol}${totalCost}** für ${ticketCount} Los(e)!`);

      db.updateBalance(userId, -totalCost);
      jackpot += totalCost;

      const currentTickets = participants.get(userId) ? 1 : 0;
      participants.set(userId, message.channel.id);

      const embed = new EmbedBuilder()
        .setColor('#9b59b6')
        .setTitle('🎟️ Lotterie-Los gekauft!')
        .setDescription(
          `Du hast **${ticketCount}** Los(e) für **${config.currencySymbol}${totalCost}** gekauft!\n\n` +
          `Aktueller Jackpot: **${config.currencySymbol}${jackpot.toLocaleString()}**\n` +
          `Teilnehmer: **${participants.size}**`
        )
        .setFooter({ text: `Ziehung: Alle 5 Minuten (mind. 2 Teilnehmer)` })
        .setTimestamp();

      message.reply({ embeds: [embed] });

    } else {
      const timeLeft = Math.max(0, DRAW_INTERVAL - (Date.now() - lastDraw));
      const minutes = Math.floor(timeLeft / 60000);
      const seconds = Math.floor((timeLeft % 60000) / 1000);

      const embed = new EmbedBuilder()
        .setColor('#9b59b6')
        .setTitle('🎰 Lotterie')
        .addFields(
          { name: '💰 Jackpot', value: `${config.currencySymbol}${jackpot.toLocaleString()}`, inline: true },
          { name: '👥 Teilnehmer', value: `${participants.size}`, inline: true },
          { name: '⏰ Nächste Ziehung', value: participants.size < 2 ? 'Mind. 2 Teilnehmer nötig' : `${minutes}m ${seconds}s`, inline: true },
        )
        .setDescription(`Ticketpreis: **${config.currencySymbol}${TICKET_PRICE}**\nKaufen: \`${config.prefix}lottery buy [Anzahl]\``)
        .setTimestamp();

      message.reply({ embeds: [embed] });
    }
  },
};
