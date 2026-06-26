const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database');

const PRESTIGE_COST = 50000;
const PRESTIGE_BONUS_PER_LEVEL = 0.05;

module.exports = {
  name: 'prestige',
  aliases: ['rebirth', 'reset'],
  description: 'Prestige: Setze alles zurück für permanente Boni (kostet 50.000)',
  execute(message, args) {
    const userId = message.author.id;
    const user = db.getUser(userId);
    const config = require('../config.json');
    const currentPrestige = user.prestige || 0;
    const totalWealth = user.balance + user.bank;

    if (args[0] === 'info' || !args.length) {
      const bonus = currentPrestige * PRESTIGE_BONUS_PER_LEVEL * 100;
      const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('⭐ Prestige-System')
        .setDescription(
          `**Dein Prestige-Level:** ⭐ ${currentPrestige}\n` +
          `**Aktueller Bonus:** +${bonus}% auf alles Verdiente\n\n` +
          `**Kosten:** ${config.currencySymbol}${PRESTIGE_COST.toLocaleString()} Gesamtvermögen\n` +
          `**Dein Vermögen:** ${config.currencySymbol}${totalWealth.toLocaleString()}\n\n` +
          `Beim Prestige wird dein Geld und Inventar zurückgesetzt,\naber du bekommst **+${PRESTIGE_BONUS_PER_LEVEL * 100}%** permanenten Bonus pro Level!\n\n` +
          `Nutze \`${config.prefix}prestige confirm\` zum Bestätigen.`
        )
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    if (args[0] === 'confirm' || args[0] === 'bestätigen') {
      if (totalWealth < PRESTIGE_COST) {
        return message.reply(`❌ Du brauchst mindestens **${config.currencySymbol}${PRESTIGE_COST.toLocaleString()}** Gesamtvermögen!`);
      }

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`prestige_yes_${userId}`).setLabel('Ja, Prestige!').setStyle(ButtonStyle.Danger).setEmoji('⭐'),
        new ButtonBuilder().setCustomId(`prestige_no_${userId}`).setLabel('Abbrechen').setStyle(ButtonStyle.Secondary),
      );

      const embed = new EmbedBuilder()
        .setColor('#e74c3c')
        .setTitle('⚠️ Prestige bestätigen?')
        .setDescription(
          `Bist du sicher? Das wird zurückgesetzt:\n` +
          `- 💰 Bargeld: ${config.currencySymbol}${user.balance.toLocaleString()}\n` +
          `- 🏦 Bank: ${config.currencySymbol}${user.bank.toLocaleString()}\n` +
          `- 🎒 Alle Items im Inventar\n\n` +
          `Dafür bekommst du: ⭐ **Prestige ${currentPrestige + 1}** (+${(currentPrestige + 1) * PRESTIGE_BONUS_PER_LEVEL * 100}% Bonus)`
        )
        .setTimestamp();

      message.reply({ embeds: [embed], components: [row] }).then(msg => {
        const collector = msg.createMessageComponentCollector({ time: 15000 });

        collector.on('collect', (interaction) => {
          if (interaction.user.id !== userId) {
            return interaction.reply({ content: '❌ Das ist nicht dein Prestige!', flags: 64 });
          }

          if (interaction.customId === `prestige_yes_${userId}`) {
            collector.stop();

            db.setBalance(userId, 0);
            db.deposit(userId, 0);
            db.db.prepare('UPDATE users SET bank = 0 WHERE user_id = ?').run(userId);
            db.db.prepare('DELETE FROM inventory WHERE user_id = ?').run(userId);
            db.db.prepare('UPDATE users SET prestige = ? WHERE user_id = ?').run(currentPrestige + 1, userId);

            const embed = new EmbedBuilder()
              .setColor('#FFD700')
              .setTitle('⭐ PRESTIGE!')
              .setDescription(
                `**${message.author.username}** hat Prestige erreicht!\n\n` +
                `Neues Level: ⭐ **${currentPrestige + 1}**\n` +
                `Permanenter Bonus: **+${(currentPrestige + 1) * PRESTIGE_BONUS_PER_LEVEL * 100}%** auf alles Verdiente`
              )
              .setTimestamp();

            interaction.update({ embeds: [embed], components: [] });
          } else {
            collector.stop();
            const embed = new EmbedBuilder()
              .setColor('#95a5a6')
              .setTitle('⭐ Prestige abgebrochen')
              .setDescription('Prestige wurde abgebrochen.')
              .setTimestamp();
            interaction.update({ embeds: [embed], components: [] });
          }
        });

        collector.on('end', (_, reason) => {
          if (reason === 'time') {
            msg.edit({ components: [] });
          }
        });
      });
    }
  },
};
