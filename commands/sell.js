const { EmbedBuilder } = require('discord.js');
const db = require('../database');

module.exports = {
  name: 'sell',
  aliases: ['verkaufen', 'verkauf'],
  description: 'Verkaufe ein Item aus deinem Inventar',
  execute(message, args) {
    if (!args.length) return message.reply('❌ Bitte gib ein Item an! `!sell <Item>`');

    const itemName = args.join(' ');
    const userId = message.author.id;
    const config = require('../config.json');
    const inventory = db.getInventory(userId);

    const invItem = inventory.find(i => i.item_name.toLowerCase() === itemName.toLowerCase());
    if (!invItem) return message.reply(`❌ Du hast **${itemName}** nicht in deinem Inventar!`);

    const shopItem = db.getShopItem(invItem.item_name);
    if (!shopItem) return message.reply('❌ Dieses Item kann nicht verkauft werden!');

    const sellPrice = Math.floor(shopItem.price * 0.7);

    db.removeFromInventory(userId, invItem.item_name);
    db.updateBalance(userId, sellPrice);

    const embed = new EmbedBuilder()
      .setColor('#e67e22')
      .setTitle('💸 Verkauft!')
      .setDescription(`Du hast ${shopItem.emoji} **${invItem.item_name}** für **${config.currencySymbol}${sellPrice}** verkauft! (70% vom Originalpreis)`)
      .setFooter({ text: `Neues Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
      .setTimestamp();

    message.reply({ embeds: [embed] });
  },
};
