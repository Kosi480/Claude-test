const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const pendingGames = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('diceduel')
    .setDescription('Würfel-Duell gegen einen Spieler')
    .addUserOption(opt => opt.setName('user').setDescription('Der Spieler, den du herausforderst').setRequired(true))
    .addStringOption(opt => opt.setName('betrag').setDescription('Einsatz').setRequired(true)),
  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const config = require('../config.json');
    const userId = interaction.user.id;

    if (!target) return await interaction.reply('❌ Erwähne einen Spieler! `/diceduel @user <Betrag>`');
    if (target.id === userId) return await interaction.reply('❌ Du kannst nicht gegen dich selbst spielen!');
    if (target.bot) return await interaction.reply('❌ Bots können nicht würfeln!');

    const amountStr = interaction.options.getString('betrag');
    if (!amountStr) return await interaction.reply('❌ Gib einen Betrag an!');

    const amount = parseInt(amountStr);
    if (!amount || amount <= 0) return await interaction.reply('❌ Ungültiger Betrag!');

    if (db.getBalance(userId) < amount) return await interaction.reply(`❌ Du hast nicht genug Geld!`);
    if (db.getBalance(target.id) < amount) return await interaction.reply(`❌ **${target.username}** hat nicht genug Geld!`);

    if (pendingGames.has(userId)) return await interaction.reply('❌ Du hast bereits ein offenes Würfelduell!');
    pendingGames.set(userId, true);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`dd_accept_${userId}`).setLabel('Annehmen').setStyle(ButtonStyle.Success).setEmoji('🎲'),
      new ButtonBuilder().setCustomId(`dd_decline_${userId}`).setLabel('Ablehnen').setStyle(ButtonStyle.Danger),
    );

    const embed = new EmbedBuilder()
      .setColor('#e67e22')
      .setTitle('🎲 Würfel-Duell')
      .setDescription(
        `**${interaction.user.username}** fordert **${target.username}** zum Würfel-Duell!\n\n` +
        `Einsatz: **${config.currencySymbol}${amount.toLocaleString()}**\n` +
        `Beide würfeln 3 Würfel — höhere Summe gewinnt!`
      )
      .setFooter({ text: '30s zum Annehmen' })
      .setTimestamp();

    const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
    const collector = msg.createMessageComponentCollector({ time: 30000 });

    collector.on('collect', (btnInteraction) => {
      if (btnInteraction.user.id !== target.id) {
        return btnInteraction.reply({ content: '❌ Nur die herausgeforderte Person kann reagieren!', flags: 64 });
      }

      collector.stop();
      pendingGames.delete(userId);

      if (btnInteraction.customId === `dd_decline_${userId}`) {
        const embed = new EmbedBuilder()
          .setColor('#95a5a6')
          .setTitle('🎲 Abgelehnt')
          .setDescription(`**${target.username}** hat das Würfelduell abgelehnt.`)
          .setTimestamp();
        return btnInteraction.update({ embeds: [embed], components: [] });
      }

      if (db.getBalance(userId) < amount || db.getBalance(target.id) < amount) {
        return btnInteraction.update({ content: '❌ Nicht genug Geld!', embeds: [], components: [] });
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
        resultText = `**${interaction.user.username}** gewinnt **${config.currencySymbol}${amount}**!`;
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
          { name: interaction.user.username, value: `${p1Display} = **${p1Total}**`, inline: true },
          { name: target.username, value: `${p2Display} = **${p2Total}**`, inline: true },
        )
        .setDescription(resultText)
        .setTimestamp();

      btnInteraction.update({ embeds: [embed], components: [] });
    });

    collector.on('end', (_, reason) => {
      if (reason === 'time') {
        pendingGames.delete(userId);
        msg.edit({ components: [] });
      }
    });
  },
};

function roll() {
  return Math.floor(Math.random() * 6) + 1;
}
