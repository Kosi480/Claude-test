const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('inventory')
    .setDescription('Zeigt dein Inventar an')
    .addUserOption(opt => opt.setName('user').setDescription('Spieler dessen Inventar angezeigt werden soll').setRequired(false)),
  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    const inventory = db.getInventory(target.id);

    if (!inventory.length) {
      return interaction.reply(`📦 ${target.id === interaction.user.id ? 'Dein' : `${target.username}s`} Inventar ist leer!`);
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

    await interaction.reply({ embeds: [embed] });
  },
};
