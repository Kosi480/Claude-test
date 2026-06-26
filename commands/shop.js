const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Zeigt den Shop an'),
  async execute(interaction) {
    const items = db.getShopItems();
    const config = require('../config.json');

    const embed = new EmbedBuilder()
      .setColor('#f39c12')
      .setTitle('🛒 Shop')
      .setDescription(items.map(item =>
        `${item.emoji} **${item.name}** — ${config.currencySymbol}${item.price.toLocaleString()}\n┗ ${item.description}`
      ).join('\n\n'))
      .setFooter({ text: 'Kaufen: /buy <Item>' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
