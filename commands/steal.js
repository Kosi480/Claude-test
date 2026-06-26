const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const COOLDOWN = 60 * 1000;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('steal')
    .setDescription('Versuche einem anderen Spieler Geld zu klauen (60s Cooldown)')
    .addUserOption(opt => opt.setName('user').setDescription('Der Spieler, den du beklauen willst').setRequired(true)),
  async execute(interaction) {
    const target = interaction.options.getUser('user');
    if (!target) return await interaction.reply('❌ Du musst jemanden erwähnen! `/steal @user`');
    if (target.id === interaction.user.id) return await interaction.reply('❌ Du kannst dich nicht selbst beklauen!');
    if (target.bot) return await interaction.reply('❌ Du kannst keinen Bot beklauen!');

    const userId = interaction.user.id;
    const user = db.getUser(userId);
    const config = require('../config.json');

    if (user.last_steal) {
      const lastSteal = new Date(user.last_steal);
      const diff = Date.now() - lastSteal.getTime();
      if (diff < COOLDOWN) {
        const remaining = Math.ceil((COOLDOWN - diff) / 1000);
        return await interaction.reply(`⏳ Du musst noch **${remaining}s** warten, bevor du wieder klauen kannst!`);
      }
    }

    const targetUser = db.getUser(target.id);

    if (targetUser.balance < 10) {
      return await interaction.reply(`❌ **${target.username}** hat nicht genug Bargeld zum Klauen!`);
    }

    if (db.hasItem(target.id, 'Schutzschild')) {
      db.removeFromInventory(target.id, 'Schutzschild');
      db.setLastSteal(userId);
      const embed = new EmbedBuilder()
        .setColor('#e74c3c')
        .setTitle('🛡️ Geschützt!')
        .setDescription(`**${target.username}** hatte ein Schutzschild! Dein Diebstahl wurde abgewehrt und das Schild verbraucht.`)
        .setTimestamp();
      return await interaction.reply({ embeds: [embed] });
    }

    const successChance = 0.4;
    const success = Math.random() < successChance;

    db.setLastSteal(userId);

    if (success) {
      const maxSteal = Math.floor(targetUser.balance * 0.3);
      const stolen = Math.floor(Math.random() * maxSteal) + 1;

      db.updateBalance(target.id, -stolen);
      db.updateBalance(userId, stolen);
      try { require('./achievements').incrementStat(userId, 'steal'); } catch (_) {}

      let bountyText = '';
      try {
        const bountyCmd = require('./bounty');
        const bounty = bountyCmd.claimBounty(target.id, userId);
        if (bounty) {
          bountyText = `\n\n🎯 **KOPFGELD KASSIERT!** +**${config.currencySymbol}${bounty.amount}**!`;
        }
      } catch (_) {}

      const embed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle('🦹 Erfolgreicher Diebstahl!')
        .setDescription(`Du hast **${config.currencySymbol}${stolen}** von **${target.username}** geklaut!${bountyText}`)
        .setFooter({ text: `Dein Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } else {
      const fine = Math.floor(Math.random() * 100) + 50;
      const actualFine = Math.min(fine, user.balance);
      db.updateBalance(userId, -actualFine);

      const embed = new EmbedBuilder()
        .setColor('#e74c3c')
        .setTitle('🚔 Erwischt!')
        .setDescription(`Du wurdest beim Klauen erwischt und musst **${config.currencySymbol}${actualFine}** Strafe zahlen!`)
        .setFooter({ text: `Dein Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }
  },
};
