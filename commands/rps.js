const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database');

const choices = ['Schere', 'Stein', 'Papier'];
const emojis = { Schere: '✂️', Stein: '🪨', Papier: '📄' };
const wins = { Schere: 'Papier', Stein: 'Schere', Papier: 'Stein' };

module.exports = {
  name: 'rps',
  aliases: ['ssp', 'schere'],
  description: 'Schere-Stein-Papier mit Wetteinsatz (!rps <Betrag>)',
  execute(message, args) {
    const userId = message.author.id;
    const config = require('../config.json');

    if (!args[0]) return message.reply(`❌ Nutzung: \`${config.prefix}rps <Betrag>\``);

    let amount;
    if (args[0] === 'all' || args[0] === 'alles') {
      amount = db.getBalance(userId);
    } else {
      amount = parseInt(args[0]);
    }

    if (!amount || amount <= 0) return message.reply('❌ Ungültiger Betrag!');
    if (amount > db.getBalance(userId)) return message.reply(`❌ Du hast nur **${config.currencySymbol}${db.getBalance(userId)}**!`);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`rps_0_${userId}`).setLabel('Schere').setStyle(ButtonStyle.Primary).setEmoji('✂️'),
      new ButtonBuilder().setCustomId(`rps_1_${userId}`).setLabel('Stein').setStyle(ButtonStyle.Primary).setEmoji('🪨'),
      new ButtonBuilder().setCustomId(`rps_2_${userId}`).setLabel('Papier').setStyle(ButtonStyle.Primary).setEmoji('📄'),
    );

    const embed = new EmbedBuilder()
      .setColor('#3498db')
      .setTitle('✂️🪨📄 Schere-Stein-Papier')
      .setDescription(`Einsatz: **${config.currencySymbol}${amount}**\n\nWähle deine Waffe!`)
      .setFooter({ text: '15 Sekunden Zeit' })
      .setTimestamp();

    message.reply({ embeds: [embed], components: [row] }).then(msg => {
      const collector = msg.createMessageComponentCollector({ time: 15000 });

      collector.on('collect', (interaction) => {
        if (interaction.user.id !== userId) {
          return interaction.reply({ content: '❌ Das ist nicht dein Spiel!', flags: 64 });
        }

        collector.stop();

        const playerIdx = parseInt(interaction.customId.split('_')[1]);
        const botIdx = Math.floor(Math.random() * 3);
        const playerChoice = choices[playerIdx];
        const botChoice = choices[botIdx];

        let resultText, color, winAmount;

        if (playerChoice === botChoice) {
          resultText = 'Unentschieden! Einsatz zurück.';
          color = '#f39c12';
          winAmount = 0;
        } else if (wins[playerChoice] === botChoice) {
          resultText = `Du gewinnst! **+${config.currencySymbol}${amount}**`;
          color = '#2ecc71';
          winAmount = amount;
          db.updateBalance(userId, amount);
        } else {
          resultText = `Du verlierst! **-${config.currencySymbol}${amount}**`;
          color = '#e74c3c';
          winAmount = -amount;
          db.updateBalance(userId, -amount);
        }

        const embed = new EmbedBuilder()
          .setColor(color)
          .setTitle('✂️🪨📄 Schere-Stein-Papier')
          .setDescription(
            `${emojis[playerChoice]} **${playerChoice}** vs ${emojis[botChoice]} **${botChoice}**\n\n${resultText}`
          )
          .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
          .setTimestamp();

        interaction.update({ embeds: [embed], components: [] });
      });

      collector.on('end', (_, reason) => {
        if (reason === 'time') msg.edit({ components: [] });
      });
    });
  },
};
