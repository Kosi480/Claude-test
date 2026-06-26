const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sell')
    .setDescription('Verkaufe ein Item aus deinem Inventar')
    .addStringOption(opt => opt.setName('item').setDescription('Das Item, das du verkaufen willst').setRequired(true)),
  async execute(interaction) {
    const itemName = interaction.options.getString('item');
    if (!itemName) return await interaction.reply('❌ Bitte gib ein Item an! `/sell <Item>`');

    const userId = interaction.user.id;
    const config = require('../config.json');
    const inventory = db.getInventory(userId);

    const invItem = inventory.find(i => i.item_name.toLowerCase() === itemName.toLowerCase());
    if (!invItem) return await interaction.reply(`❌ Du hast **${itemName}** nicht in deinem Inventar!`);

    const shopItem = db.getShopItem(invItem.item_name);
    if (!shopItem) return await interaction.reply('❌ Dieses Item kann nicht verkauft werden!');

    const sellPrice = Math.floor(shopItem.price * 0.7);

    db.removeFromInventory(userId, invItem.item_name);
    db.updateBalance(userId, sellPrice);

    const embed = new EmbedBuilder()
      .setColor('#e67e22')
      .setTitle('💸 Verkauft!')
      .setDescription(`Du hast ${shopItem.emoji} **${invItem.item_name}** für **${config.currencySymbol}${sellPrice}** verkauft! (70% vom Originalpreis)`)
      .setFooter({ text: `Neues Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
