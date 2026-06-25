const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
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
  name: 'duel',
  aliases: ['duell', 'kampf', 'fight'],
  description: 'Fordere einen Spieler zum Duell heraus (!duel @user <Betrag>)',
  execute(message, args) {
    const target = message.mentions.users.first();
    const config = require('../config.json');
    const challengerId = message.author.id;

    if (!target) return message.reply('❌ Du musst jemanden erwähnen! `!duel @user <Betrag>`');
    if (target.id === challengerId) return message.reply('❌ Du kannst dich nicht selbst herausfordern!');
    if (target.bot) return message.reply('❌ Du kannst keinen Bot herausfordern!');

    const amountStr = args.find(a => !a.startsWith('<@'));
    if (!amountStr) return message.reply('❌ Bitte gib einen Betrag an! `!duel @user <Betrag>`');

    const amount = parseInt(amountStr);
    if (!amount || amount <= 0) return message.reply('❌ Bitte gib einen gültigen Betrag an!');

    const challengerBal = db.getBalance(challengerId);
    if (challengerBal < amount) return message.reply(`❌ Du hast nur **${config.currencySymbol}${challengerBal}**!`);

    const targetBal = db.getBalance(target.id);
    if (targetBal < amount) return message.reply(`❌ **${target.username}** hat nicht genug Geld!`);

    if (pendingDuels.has(challengerId)) return message.reply('❌ Du hast bereits ein offenes Duell!');

    const duelId = `${challengerId}_${target.id}_${Date.now()}`;
    pendingDuels.set(challengerId, duelId);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`duel_accept_${duelId}`).setLabel('Annehmen').setStyle(ButtonStyle.Success).setEmoji('⚔️'),
      new ButtonBuilder().setCustomId(`duel_decline_${duelId}`).setLabel('Ablehnen').setStyle(ButtonStyle.Danger).setEmoji('🚫'),
    );

    const embed = new EmbedBuilder()
      .setColor('#f39c12')
      .setTitle('⚔️ Duell-Herausforderung!')
      .setDescription(`**${message.author.username}** fordert **${target.username}** zu einem Duell heraus!\n\nEinsatz: **${config.currencySymbol}${amount.toLocaleString()}**`)
      .setFooter({ text: `${target.username} muss annehmen oder ablehnen (30s)` })
      .setTimestamp();

    message.reply({ embeds: [embed], components: [row] }).then(msg => {
      const collector = msg.createMessageComponentCollector({ time: 30000 });

      collector.on('collect', (interaction) => {
        if (interaction.customId === `duel_accept_${duelId}`) {
          if (interaction.user.id !== target.id) {
            return interaction.reply({ content: '❌ Nur die herausgeforderte Person kann annehmen!', flags: 64 });
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
            return interaction.update({ embeds: [embed], components: [] });
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
                rounds.push(`⚔️ **${message.author.username}** landet ${atk1} für **${dmg1} DMG** — K.O.!`);
                break;
              }
              challengerHP -= dmg2;
              rounds.push(`⚔️ ${message.author.username} (${atk1}, ${dmg1} DMG) vs ${target.username} (${atk2}, ${dmg2} DMG)`);
            } else {
              challengerHP -= dmg2;
              if (challengerHP <= 0) {
                rounds.push(`⚔️ **${target.username}** landet ${atk2} für **${dmg2} DMG** — K.O.!`);
                break;
              }
              targetHP -= dmg1;
              rounds.push(`⚔️ ${target.username} (${atk2}, ${dmg2} DMG) vs ${message.author.username} (${atk1}, ${dmg1} DMG)`);
            }
          }

          const challengerWon = targetHP <= 0;
          const winner = challengerWon ? message.author : target;
          const loser = challengerWon ? target : message.author;

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
              { name: `${message.author.username}`, value: `❤️ ${Math.max(0, challengerHP)} HP`, inline: true },
              { name: `${target.username}`, value: `❤️ ${Math.max(0, targetHP)} HP`, inline: true },
            )
            .setTimestamp();

          interaction.update({ embeds: [resultEmbed], components: [] });

        } else if (interaction.customId === `duel_decline_${duelId}`) {
          if (interaction.user.id !== target.id) {
            return interaction.reply({ content: '❌ Nur die herausgeforderte Person kann ablehnen!', flags: 64 });
          }

          collector.stop('declined');
          pendingDuels.delete(challengerId);

          const embed = new EmbedBuilder()
            .setColor('#e74c3c')
            .setTitle('⚔️ Duell abgelehnt')
            .setDescription(`**${target.username}** hat das Duell abgelehnt.`)
            .setTimestamp();

          interaction.update({ embeds: [embed], components: [] });
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
    });
  },
};
