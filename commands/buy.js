const { EmbedBuilder } = require('discord.js');
const db = require('../database');

module.exports = {
  name: 'buy',
  aliases: ['kaufen', 'kauf'],
  description: 'Kaufe ein Item aus dem Shop',
  execute(message, args) {
    if (!args.length) return message.reply('❌ Bitte gib ein Item an! `!buy <Item>`');

    const itemName = args.join(' ');
    const config = require('../config.json');
    const item = db.getShopItem(itemName);

    if (!item) {
      const allItems = db.getShopItems();
      const match = allItems.find(i => i.name.toLowerCase() === itemName.toLowerCase());
      if (!match) return message.reply(`❌ Item **${itemName}** nicht gefunden! Nutze \`${config.prefix}shop\` um alle Items zu sehen.`);
      return executeBuy(message, match, config);
    }

    executeBuy(message, item, config);
  },
};

function executeBuy(message, item, config) {
  const userId = message.author.id;
  const balance = db.getBalance(userId);

  if (balance < item.price) {
    return message.reply(`❌ Du brauchst **${config.currencySymbol}${item.price}** aber hast nur **${config.currencySymbol}${balance}**!`);
  }

  db.updateBalance(userId, -item.price);
  db.addToInventory(userId, item.name);

  const embed = new EmbedBuilder()
    .setColor('#2ecc71')
    .setTitle('🛍️ Gekauft!')
    .setDescription(`Du hast ${item.emoji} **${item.name}** für **${config.currencySymbol}${item.price}** gekauft!`)
    .setFooter({ text: `Verbleibendes Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
    .setTimestamp();

  message.reply({ embeds: [embed] });
}
