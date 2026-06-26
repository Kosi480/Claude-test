const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
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
  data: new SlashCommandBuilder()
    .setName('lottery')
    .setDescription('Kaufe ein Lotterie-Los oder sieh den Jackpot')
    .addSubcommand(sub =>
      sub.setName('info')
        .setDescription('Zeige den aktuellen Jackpot und Infos'))
    .addSubcommand(sub =>
      sub.setName('buy')
        .setDescription('Kaufe Lotterie-Lose')
        .addIntegerOption(opt =>
          opt.setName('anzahl')
            .setDescription('Anzahl der Lose (max 10)')
            .setRequired(false))),
  async execute(interaction) {
    const userId = interaction.user.id;
    const config = require('../config.json');

    checkDraw(interaction.client, config);

    const action = interaction.options.getSubcommand();

    if (action === 'buy') {
      const ticketCount = interaction.options.getInteger('anzahl') || 1;
      const totalCost = TICKET_PRICE * ticketCount;

      if (ticketCount > 10) return await interaction.reply('❌ Maximal 10 Lose auf einmal!');

      const balance = db.getBalance(userId);
      if (balance < totalCost) return await interaction.reply(`❌ Du brauchst **${config.currencySymbol}${totalCost}** für ${ticketCount} Los(e)!`);

      db.updateBalance(userId, -totalCost);
      jackpot += totalCost;

      participants.set(userId, interaction.channel.id);

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

      await interaction.reply({ embeds: [embed] });

    } else {
      // info subcommand
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
        .setDescription(`Ticketpreis: **${config.currencySymbol}${TICKET_PRICE}**\nKaufen: \`/lottery buy\``)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }
  },
};
