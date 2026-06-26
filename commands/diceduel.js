const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database');

const pendingGames = new Map();

module.exports = {
  name: 'diceduel',
  aliases: ['dd', 'würfelduell'],
  description: 'Würfel-Duell gegen einen Spieler (!diceduel @user <Betrag>)',
  execute(message, args) {
    const target = message.mentions.users.first();
    const config = require('../config.json');
    const userId = message.author.id;

    if (!target) return message.reply('❌ Erwähne einen Spieler! `!diceduel @user <Betrag>`');
    if (target.id === userId) return message.reply('❌ Du kannst nicht gegen dich selbst spielen!');
    if (target.bot) return message.reply('❌ Bots können nicht würfeln!');

    const amountStr = args.find(a => !a.startsWith('<@'));
    if (!amountStr) return message.reply('❌ Gib einen Betrag an!');

    const amount = parseInt(amountStr);
    if (!amount || amount <= 0) return message.reply('❌ Ungültiger Betrag!');

    if (db.getBalance(userId) < amount) return message.reply(`❌ Du hast nicht genug Geld!`);
    if (db.getBalance(target.id) < amount) return message.reply(`❌ **${target.username}** hat nicht genug Geld!`);

    if (pendingGames.has(userId)) return message.reply('❌ Du hast bereits ein offenes Würfelduell!');
    pendingGames.set(userId, true);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`dd_accept_${userId}`).setLabel('Annehmen').setStyle(ButtonStyle.Success).setEmoji('🎲'),
      new ButtonBuilder().setCustomId(`dd_decline_${userId}`).setLabel('Ablehnen').setStyle(ButtonStyle.Danger),
    );

    const embed = new EmbedBuilder()
      .setColor('#e67e22')
      .setTitle('🎲 Würfel-Duell')
      .setDescription(
        `**${message.author.username}** fordert **${target.username}** zum Würfel-Duell!\n\n` +
        `Einsatz: **${config.currencySymbol}${amount.toLocaleString()}**\n` +
        `Beide würfeln 3 Würfel — höhere Summe gewinnt!`
      )
      .setFooter({ text: '30s zum Annehmen' })
      .setTimestamp();

    message.reply({ embeds: [embed], components: [row] }).then(msg => {
      const collector = msg.createMessageComponentCollector({ time: 30000 });

      collector.on('collect', (interaction) => {
        if (interaction.user.id !== target.id) {
          return interaction.reply({ content: '❌ Nur die herausgeforderte Person kann reagieren!', flags: 64 });
        }

        collector.stop();
        pendingGames.delete(userId);

        if (interaction.customId === `dd_decline_${userId}`) {
          const embed = new EmbedBuilder()
            .setColor('#95a5a6')
            .setTitle('🎲 Abgelehnt')
            .setDescription(`**${target.username}** hat das Würfelduell abgelehnt.`)
            .setTimestamp();
          return interaction.update({ embeds: [embed], components: [] });
        }

        if (db.getBalance(userId) < amount || db.getBalance(target.id) < amount) {
          return interaction.update({ content: '❌ Nicht genug Geld!', embeds: [], components: [] });
        }

        const p1Dice = [roll(), roll(), roll()];
        const p2Dice = [roll(), roll(), roll()];
        const p1Total = p1Dice.reduce((a, b) => a + b, 0);
        const p2Total = p2Dice.reduce((a, b) => a + b, 0);

        const diceEmojis = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
        const p1Display = p1Dice.map(d => diceEmojis[d]).join(' ');
        const p2Display = p2Dice.map(d => diceEmojis[d]).join(' ');

        let resultText, color;
        if (p1Total > p2Total) {
          db.updateBalance(userId, amount);
          db.updateBalance(target.id, -amount);
          resultText = `**${message.author.username}** gewinnt **${config.currencySymbol}${amount}**!`;
          color = '#2ecc71';
        } else if (p2Total > p1Total) {
          db.updateBalance(target.id, amount);
          db.updateBalance(userId, -amount);
          resultText = `**${target.username}** gewinnt **${config.currencySymbol}${amount}**!`;
          color = '#e74c3c';
        } else {
          resultText = 'Unentschieden! Einsatz zurück.';
          color = '#f39c12';
        }

        const embed = new EmbedBuilder()
          .setColor(color)
          .setTitle('🎲 Würfel-Duell — Ergebnis')
          .addFields(
            { name: message.author.username, value: `${p1Display} = **${p1Total}**`, inline: true },
            { name: target.username, value: `${p2Display} = **${p2Total}**`, inline: true },
          )
          .setDescription(resultText)
          .setTimestamp();

        interaction.update({ embeds: [embed], components: [] });
      });

      collector.on('end', (_, reason) => {
        if (reason === 'time') {
          pendingGames.delete(userId);
          msg.edit({ components: [] });
        }
      });
    });
  },
};

function roll() {
  return Math.floor(Math.random() * 6) + 1;
}
