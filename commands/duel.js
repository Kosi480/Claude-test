const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const pendingDuels = new Map();

const attacks = [
  'einen mächtigen Schwerthieb',
  'einen Blitzangriff',
  'eine Feuerkugel',
  'einen Roundhouse-Kick',
  'einen Schildstoß',
  'einen Pfeilhagel',
  'eine Eisattacke',
  'einen Superpunch',
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('duel')
    .setDescription('Fordere einen Spieler zum Duell heraus')
    .addUserOption(opt => opt.setName('user').setDescription('Der Spieler, den du herausforderst').setRequired(true))
    .addStringOption(opt => opt.setName('betrag').setDescription('Einsatz').setRequired(true)),
  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const config = require('../config.json');
    const challengerId = interaction.user.id;

    if (!target) return await interaction.reply('❌ Du musst jemanden erwähnen! `/duel @user <Betrag>`');
    if (target.id === challengerId) return await interaction.reply('❌ Du kannst dich nicht selbst herausfordern!');
    if (target.bot) return await interaction.reply('❌ Du kannst keinen Bot herausfordern!');

    const amountStr = interaction.options.getString('betrag');
    if (!amountStr) return await interaction.reply('❌ Bitte gib einen Betrag an! `/duel @user <Betrag>`');

    const amount = parseInt(amountStr);
    if (!amount || amount <= 0) return await interaction.reply('❌ Bitte gib einen gültigen Betrag an!');

    const challengerBal = db.getBalance(challengerId);
    if (challengerBal < amount) return await interaction.reply(`❌ Du hast nur **${config.currencySymbol}${challengerBal}**!`);

    const targetBal = db.getBalance(target.id);
    if (targetBal < amount) return await interaction.reply(`❌ **${target.username}** hat nicht genug Geld!`);

    if (pendingDuels.has(challengerId)) return await interaction.reply('❌ Du hast bereits ein offenes Duell!');

    const duelId = `${challengerId}_${target.id}_${Date.now()}`;
    pendingDuels.set(challengerId, duelId);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`duel_accept_${duelId}`).setLabel('Annehmen').setStyle(ButtonStyle.Success).setEmoji('⚔️'),
      new ButtonBuilder().setCustomId(`duel_decline_${duelId}`).setLabel('Ablehnen').setStyle(ButtonStyle.Danger).setEmoji('🚫'),
    );

    const embed = new EmbedBuilder()
      .setColor('#f39c12')
      .setTitle('⚔️ Duell-Herausforderung!')
      .setDescription(`**${interaction.user.username}** fordert **${target.username}** zu einem Duell heraus!\n\nEinsatz: **${config.currencySymbol}${amount.toLocaleString()}**`)
      .setFooter({ text: `${target.username} muss annehmen oder ablehnen (30s)` })
      .setTimestamp();

    const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
    const collector = msg.createMessageComponentCollector({ time: 30000 });

    collector.on('collect', (btnInteraction) => {
      if (btnInteraction.customId === `duel_accept_${duelId}`) {
        if (btnInteraction.user.id !== target.id) {
          return btnInteraction.reply({ content: '❌ Nur die herausgeforderte Person kann annehmen!', flags: 64 });
        }

        collector.stop('accepted');
        pendingDuels.delete(challengerId);

        const currentChallengerBal = db.getBalance(challengerId);
        const currentTargetBal = db.getBalance(target.id);
        if (currentChallengerBal < amount || currentTargetBal < amount) {
          const embed = new EmbedBuilder()
            .setColor('#e74c3c')
            .setTitle('⚔️ Duell abgebrochen')
            .setDescription('Einer der Spieler hat nicht mehr genug Geld!')
            .setTimestamp();
          return btnInteraction.update({ embeds: [embed], components: [] });
        }

        const rounds = [];
        let challengerHP = 100;
        let targetHP = 100;

        while (challengerHP > 0 && targetHP > 0) {
          const attackerFirst = Math.random() < 0.5;
          const dmg1 = Math.floor(Math.random() * 25) + 10;
          const dmg2 = Math.floor(Math.random() * 25) + 10;
          const atk1 = attacks[Math.floor(Math.random() * attacks.length)];
          const atk2 = attacks[Math.floor(Math.random() * attacks.length)];

          if (attackerFirst) {
            targetHP -= dmg1;
            if (targetHP <= 0) {
              rounds.push(`⚔️ **${interaction.user.username}** landet ${atk1} für **${dmg1} DMG** — K.O.!`);
              break;
            }
            challengerHP -= dmg2;
            rounds.push(`⚔️ ${interaction.user.username} (${atk1}, ${dmg1} DMG) vs ${target.username} (${atk2}, ${dmg2} DMG)`);
          } else {
            challengerHP -= dmg2;
            if (challengerHP <= 0) {
              rounds.push(`⚔️ **${target.username}** landet ${atk2} für **${dmg2} DMG** — K.O.!`);
              break;
            }
            targetHP -= dmg1;
            rounds.push(`⚔️ ${target.username} (${atk2}, ${dmg2} DMG) vs ${interaction.user.username} (${atk1}, ${dmg1} DMG)`);
          }
        }

        const challengerWon = targetHP <= 0;
        const winner = challengerWon ? interaction.user : target;
        const loser = challengerWon ? target : interaction.user;

        db.updateBalance(winner.id, amount);
        db.updateBalance(loser.id, -amount);

        const resultEmbed = new EmbedBuilder()
          .setColor('#f1c40f')
          .setTitle('⚔️ Duell — Ergebnis')
          .setDescription(
            rounds.slice(-3).join('\n') +
            `\n\n🏆 **${winner.username}** gewinnt und erhält **${config.currencySymbol}${amount.toLocaleString()}**!`
          )
          .addFields(
            { name: `${interaction.user.username}`, value: `❤️ ${Math.max(0, challengerHP)} HP`, inline: true },
            { name: `${target.username}`, value: `❤️ ${Math.max(0, targetHP)} HP`, inline: true },
          )
          .setTimestamp();

        btnInteraction.update({ embeds: [resultEmbed], components: [] });

      } else if (btnInteraction.customId === `duel_decline_${duelId}`) {
        if (btnInteraction.user.id !== target.id) {
          return btnInteraction.reply({ content: '❌ Nur die herausgeforderte Person kann ablehnen!', flags: 64 });
        }

        collector.stop('declined');
        pendingDuels.delete(challengerId);

        const embed = new EmbedBuilder()
          .setColor('#e74c3c')
          .setTitle('⚔️ Duell abgelehnt')
          .setDescription(`**${target.username}** hat das Duell abgelehnt.`)
          .setTimestamp();

        btnInteraction.update({ embeds: [embed], components: [] });
      }
    });

    collector.on('end', (_, reason) => {
      if (reason === 'time') {
        pendingDuels.delete(challengerId);
        const embed = new EmbedBuilder()
          .setColor('#95a5a6')
          .setTitle('⚔️ Duell abgelaufen')
          .setDescription('Die Herausforderung ist abgelaufen.')
          .setTimestamp();
        msg.edit({ embeds: [embed], components: [] });
      }
    });
  },
};
