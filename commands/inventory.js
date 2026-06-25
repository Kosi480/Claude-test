const { EmbedBuilder } = require('discord.js');
const db = require('../database');

module.exports = {
  name: 'inventory',
  aliases: ['inv', 'inventar', 'items'],
  description: 'Zeigt dein Inventar an',
  execute(message) {
    const target = message.mentions.users.first() || message.author;
    const inventory = db.getInventory(target.id);

    if (!inventory.length) {
      return message.reply(`📦 ${target.id === message.author.id ? 'Dein' : `${target.username}s`} Inventar ist leer!`);
    }

    const items = inventory.map(inv => {
      const shopItem = db.getShopItem(inv.item_name);
      const emoji = shopItem ? shopItem.emoji : '📦';
      return `${emoji} **${inv.item_name}** x${inv.quantity}`;
    });

    const embed = new EmbedBuilder()
      .setColor('#9b59b6')
      .setTitle(`🎒 Inventar von ${target.username}`)
      .setDescription(items.join('\n'))
      .setThumbnail(target.displayAvatarURL())
      .setTimestamp();

    message.reply({ embeds: [embed] });
  },
};
