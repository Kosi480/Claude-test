const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('buy')
    .setDescription('Kaufe ein Item aus dem Shop')
    .addStringOption(opt => opt.setName('item').setDescription('Das Item, das du kaufen willst').setRequired(true)),
  async execute(interaction) {
    const itemName = interaction.options.getString('item');
    if (!itemName) return await interaction.reply('❌ Bitte gib ein Item an! `/buy <Item>`');

    const config = require('../config.json');
    const item = db.getShopItem(itemName);

    if (!item) {
      const allItems = db.getShopItems();
      const match = allItems.find(i => i.name.toLowerCase() === itemName.toLowerCase());
      if (!match) return await interaction.reply(`❌ Item **${itemName}** nicht gefunden! Nutze \`/shop\` um alle Items zu sehen.`);
      return await executeBuy(interaction, match, config);
    }

    await executeBuy(interaction, item, config);
  },
};

async function executeBuy(interaction, item, config) {
  const userId = interaction.user.id;
  const balance = db.getBalance(userId);

  if (balance < item.price) {
    return await interaction.reply(`❌ Du brauchst **${config.currencySymbol}${item.price}** aber hast nur **${config.currencySymbol}${balance}**!`);
  }

  db.updateBalance(userId, -item.price);
  db.addToInventory(userId, item.name);

  const embed = new EmbedBuilder()
    .setColor('#2ecc71')
    .setTitle('🛍️ Gekauft!')
    .setDescription(`Du hast ${item.emoji} **${item.name}** für **${config.currencySymbol}${item.price}** gekauft!`)
    .setFooter({ text: `Verbleibendes Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
