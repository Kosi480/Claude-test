const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Zeigt Server-Economy-Statistiken'),
  async execute(interaction) {
    const config = require('../config.json');

    const totalUsers = db.db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const totalCash = db.db.prepare('SELECT COALESCE(SUM(balance), 0) as total FROM users').get().total;
    const totalBank = db.db.prepare('SELECT COALESCE(SUM(bank), 0) as total FROM users').get().total;
    const totalItems = db.db.prepare('SELECT COALESCE(SUM(quantity), 0) as total FROM inventory').get().total;
    const richest = db.db.prepare('SELECT user_id, balance + bank as total FROM users ORDER BY total DESC LIMIT 1').get();
    const avgWealth = totalUsers > 0 ? Math.floor((totalCash + totalBank) / totalUsers) : 0;

    const topItems = db.db.prepare(
      'SELECT item_name, SUM(quantity) as total FROM inventory GROUP BY item_name ORDER BY total DESC LIMIT 5'
    ).all();

    const embed = new EmbedBuilder()
      .setColor('#3498db')
      .setTitle('📊 Economy-Statistiken')
      .addFields(
        { name: '👥 Spieler', value: `${totalUsers}`, inline: true },
        { name: '💰 Gesamtes Bargeld', value: `${config.currencySymbol}${totalCash.toLocaleString()}`, inline: true },
        { name: '🏦 Gesamte Bank', value: `${config.currencySymbol}${totalBank.toLocaleString()}`, inline: true },
        { name: '💎 Gesamtvermögen', value: `${config.currencySymbol}${(totalCash + totalBank).toLocaleString()}`, inline: true },
        { name: '📦 Items im Umlauf', value: `${totalItems}`, inline: true },
        { name: '📈 Ø Vermögen', value: `${config.currencySymbol}${avgWealth.toLocaleString()}`, inline: true },
      )
      .setTimestamp();

    if (richest) {
      embed.addFields({ name: '🥇 Reichster Spieler', value: `<@${richest.user_id}> — ${config.currencySymbol}${richest.total.toLocaleString()}`, inline: false });
    }

    if (topItems.length) {
      const itemList = topItems.map((item, i) => {
        const shopItem = db.getShopItem(item.item_name);
        const emoji = shopItem ? shopItem.emoji : '📦';
        return `${i + 1}. ${emoji} ${item.item_name} — ${item.total}x`;
      }).join('\n');
      embed.addFields({ name: '🔥 Beliebteste Items', value: itemList, inline: false });
    }

    await interaction.reply({ embeds: [embed] });
  },
};
