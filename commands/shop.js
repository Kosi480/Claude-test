const { EmbedBuilder } = require('discord.js');
const db = require('../database');

module.exports = {
  name: 'shop',
  aliases: ['laden', 'store'],
  description: 'Zeigt den Shop an',
  execute(message) {
    const items = db.getShopItems();
    const config = require('../config.json');

    const embed = new EmbedBuilder()
      .setColor('#f39c12')
      .setTitle('🛒 Shop')
      .setDescription(items.map(item =>
        `${item.emoji} **${item.name}** — ${config.currencySymbol}${item.price.toLocaleString()}\n┗ ${item.description}`
      ).join('\n\n'))
      .setFooter({ text: `Kaufen: ${config.prefix}buy <Item>` })
      .setTimestamp();

    message.reply({ embeds: [embed] });
  },
};
