const { EmbedBuilder } = require('discord.js');
const db = require('../database');

const bounties = new Map();

module.exports = {
  name: 'bounty',
  aliases: ['kopfgeld', 'wanted'],
  description: 'Setze ein Kopfgeld auf einen Spieler (!bounty @user <Betrag> / !bounty list)',
  getBounty(userId) { return bounties.get(userId); },
  claimBounty(targetId, claimerId) {
    const bounty = bounties.get(targetId);
    if (!bounty) return null;
    db.updateBalance(claimerId, bounty.amount);
    bounties.delete(targetId);
    return bounty;
  },
  execute(message, args) {
    const config = require('../config.json');
    const userId = message.author.id;

    if (!args.length || args[0] === 'list' || args[0] === 'liste') {
      if (bounties.size === 0) {
        return message.reply('📋 Keine aktiven Kopfgelder!');
      }

      const list = [...bounties.entries()].map(([id, b]) =>
        `🎯 <@${id}> — **${config.currencySymbol}${b.amount.toLocaleString()}** (von <@${b.setter}>)`
      ).join('\n');

      const embed = new EmbedBuilder()
        .setColor('#e74c3c')
        .setTitle('🎯 Aktive Kopfgelder')
        .setDescription(list + `\n\nKlaue erfolgreich von einem Gesuchten, um das Kopfgeld zu kassieren!`)
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }

    const target = message.mentions.users.first();
    if (!target) return message.reply('❌ Erwähne einen Spieler! `!bounty @user <Betrag>` oder `!bounty list`');
    if (target.id === userId) return message.reply('❌ Du kannst kein Kopfgeld auf dich selbst setzen!');
    if (target.bot) return message.reply('❌ Du kannst kein Kopfgeld auf Bots setzen!');

    const amountStr = args.find(a => !a.startsWith('<@'));
    if (!amountStr) return message.reply('❌ Gib einen Betrag an! `!bounty @user <Betrag>`');

    const amount = parseInt(amountStr);
    if (!amount || amount < 100) return message.reply('❌ Mindestens **100** Coins für ein Kopfgeld!');

    const balance = db.getBalance(userId);
    if (balance < amount) return message.reply(`❌ Du hast nur **${config.currencySymbol}${balance}**!`);

    db.updateBalance(userId, -amount);

    const existing = bounties.get(target.id);
    if (existing) {
      existing.amount += amount;
    } else {
      bounties.set(target.id, { amount, setter: userId, setterName: message.author.username });
    }

    const totalBounty = bounties.get(target.id).amount;

    const embed = new EmbedBuilder()
      .setColor('#e74c3c')
      .setTitle('🎯 Kopfgeld gesetzt!')
      .setDescription(
        `**${message.author.username}** hat ein Kopfgeld auf **${target.username}** gesetzt!\n\n` +
        `Kopfgeld: **${config.currencySymbol}${totalBounty.toLocaleString()}**\n\n` +
        `Klaue erfolgreich von ${target.username}, um das Kopfgeld zu kassieren!`
      )
      .setThumbnail(target.displayAvatarURL())
      .setTimestamp();

    message.reply({ embeds: [embed] });
  },
};
