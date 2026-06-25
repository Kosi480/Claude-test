const { EmbedBuilder } = require('discord.js');
const db = require('../database');

module.exports = {
  name: 'profile',
  aliases: ['profil', 'stats'],
  description: 'Zeigt dein Profil mit allen Stats',
  execute(message) {
    const target = message.mentions.users.first() || message.author;
    const user = db.getUser(target.id);
    const config = require('../config.json');
    const inventory = db.getInventory(target.id);
    const topUsers = db.getTopUsers(100);
    const rank = topUsers.findIndex(u => u.user_id === target.id) + 1;

    const totalItems = inventory.reduce((sum, item) => sum + item.quantity, 0);
    const totalWealth = user.balance + user.bank;

    const invValue = inventory.reduce((sum, inv) => {
      const shopItem = db.getShopItem(inv.item_name);
      return sum + (shopItem ? shopItem.price * inv.quantity : 0);
    }, 0);

    const embed = new EmbedBuilder()
      .setColor('#3498db')
      .setTitle(`📋 Profil von ${target.username}`)
      .setThumbnail(target.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: '💰 Vermögen', value: `Bargeld: ${config.currencySymbol}${user.balance.toLocaleString()}\nBank: ${config.currencySymbol}${user.bank.toLocaleString()}\nGesamt: ${config.currencySymbol}${totalWealth.toLocaleString()}`, inline: true },
        { name: '🎒 Inventar', value: `Items: ${totalItems}\nWert: ${config.currencySymbol}${invValue.toLocaleString()}`, inline: true },
        { name: '🏆 Rang', value: rank > 0 ? `#${rank}` : 'Unranked', inline: true },
        { name: '📊 Nettowert', value: `**${config.currencySymbol}${(totalWealth + invValue).toLocaleString()}**`, inline: false },
      )
      .setTimestamp();

    message.reply({ embeds: [embed] });
  },
};
