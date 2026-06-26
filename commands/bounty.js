const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const bounties = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bounty')
    .setDescription('Setze ein Kopfgeld auf einen Spieler oder zeige aktive Kopfgelder')
    .addSubcommand(sub =>
      sub.setName('set')
        .setDescription('Setze ein Kopfgeld auf einen Spieler')
        .addUserOption(opt => opt.setName('user').setDescription('Der Spieler, auf den du ein Kopfgeld setzt').setRequired(true))
        .addStringOption(opt => opt.setName('betrag').setDescription('Einsatz').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('Zeige alle aktiven Kopfgelder')
    ),
  getBounty(userId) { return bounties.get(userId); },
  claimBounty(targetId, claimerId) {
    const bounty = bounties.get(targetId);
    if (!bounty) return null;
    db.updateBalance(claimerId, bounty.amount);
    bounties.delete(targetId);
    return bounty;
  },
  async execute(interaction) {
    const config = require('../config.json');
    const userId = interaction.user.id;
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'list') {
      if (bounties.size === 0) {
        return await interaction.reply('📋 Keine aktiven Kopfgelder!');
      }

      const list = [...bounties.entries()].map(([id, b]) =>
        `🎯 <@${id}> — **${config.currencySymbol}${b.amount.toLocaleString()}** (von <@${b.setter}>)`
      ).join('\n');

      const embed = new EmbedBuilder()
        .setColor('#e74c3c')
        .setTitle('🎯 Aktive Kopfgelder')
        .setDescription(list + `\n\nKlaue erfolgreich von einem Gesuchten, um das Kopfgeld zu kassieren!`)
        .setTimestamp();

      return await interaction.reply({ embeds: [embed] });
    }

    // subcommand === 'set'
    const target = interaction.options.getUser('user');
    if (!target) return await interaction.reply('❌ Erwähne einen Spieler! `/bounty set @user <Betrag>`');
    if (target.id === userId) return await interaction.reply('❌ Du kannst kein Kopfgeld auf dich selbst setzen!');
    if (target.bot) return await interaction.reply('❌ Du kannst kein Kopfgeld auf Bots setzen!');

    const amountStr = interaction.options.getString('betrag');
    if (!amountStr) return await interaction.reply('❌ Gib einen Betrag an! `/bounty set @user <Betrag>`');

    const amount = parseInt(amountStr);
    if (!amount || amount < 100) return await interaction.reply('❌ Mindestens **100** Coins für ein Kopfgeld!');

    const balance = db.getBalance(userId);
    if (balance < amount) return await interaction.reply(`❌ Du hast nur **${config.currencySymbol}${balance}**!`);

    db.updateBalance(userId, -amount);

    const existing = bounties.get(target.id);
    if (existing) {
      existing.amount += amount;
    } else {
      bounties.set(target.id, { amount, setter: userId, setterName: interaction.user.username });
    }

    const totalBounty = bounties.get(target.id).amount;

    const embed = new EmbedBuilder()
      .setColor('#e74c3c')
      .setTitle('🎯 Kopfgeld gesetzt!')
      .setDescription(
        `**${interaction.user.username}** hat ein Kopfgeld auf **${target.username}** gesetzt!\n\n` +
        `Kopfgeld: **${config.currencySymbol}${totalBounty.toLocaleString()}**\n\n` +
        `Klaue erfolgreich von ${target.username}, um das Kopfgeld zu kassieren!`
      )
      .setThumbnail(target.displayAvatarURL())
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
