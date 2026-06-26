const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database');

const pendingTrades = new Map();

module.exports = {
  name: 'trade',
  aliases: ['handeln', 'tauschen'],
  description: 'Handle Items mit anderen Spielern (!trade @user <Item>)',
  execute(message, args) {
    const target = message.mentions.users.first();
    const config = require('../config.json');
    const userId = message.author.id;

    if (!target) return message.reply('❌ Erwähne einen Spieler! `!trade @user <Item>`');
    if (target.id === userId) return message.reply('❌ Du kannst nicht mit dir selbst handeln!');
    if (target.bot) return message.reply('❌ Du kannst nicht mit Bots handeln!');

    const itemName = args.filter(a => !a.startsWith('<@')).join(' ');
    if (!itemName) return message.reply('❌ Gib ein Item an! `!trade @user <Item>`');

    const inventory = db.getInventory(userId);
    const invItem = inventory.find(i => i.item_name.toLowerCase() === itemName.toLowerCase());
    if (!invItem) return message.reply(`❌ Du hast **${itemName}** nicht im Inventar!`);

    if (pendingTrades.has(userId)) return message.reply('❌ Du hast bereits einen offenen Handel!');

    const shopItem = db.getShopItem(invItem.item_name);
    const emoji = shopItem ? shopItem.emoji : '📦';
    const tradeId = `${userId}_${Date.now()}`;
    pendingTrades.set(userId, tradeId);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`trade_accept_${tradeId}`).setLabel('Annehmen').setStyle(ButtonStyle.Success).setEmoji('🤝'),
      new ButtonBuilder().setCustomId(`trade_decline_${tradeId}`).setLabel('Ablehnen').setStyle(ButtonStyle.Danger),
    );

    const embed = new EmbedBuilder()
      .setColor('#e67e22')
      .setTitle('🤝 Handelsangebot')
      .setDescription(
        `**${message.author.username}** möchte ${emoji} **${invItem.item_name}** an **${target.username}** geben!\n\n` +
        (shopItem ? `Wert: **${config.currencySymbol}${shopItem.price.toLocaleString()}**\n` : '') +
        `\n${target.username} muss annehmen oder ablehnen.`
      )
      .setFooter({ text: '30 Sekunden Zeit' })
      .setTimestamp();

    message.reply({ embeds: [embed], components: [row] }).then(msg => {
      const collector = msg.createMessageComponentCollector({ time: 30000 });

      collector.on('collect', (interaction) => {
        if (interaction.user.id !== target.id) {
          return interaction.reply({ content: '❌ Nur die Zielperson kann reagieren!', flags: 64 });
        }

        collector.stop();
        pendingTrades.delete(userId);

        if (interaction.customId === `trade_accept_${tradeId}`) {
          if (!db.hasItem(userId, invItem.item_name)) {
            const embed = new EmbedBuilder()
              .setColor('#e74c3c')
              .setTitle('🤝 Handel fehlgeschlagen')
              .setDescription('Das Item ist nicht mehr im Inventar!')
              .setTimestamp();
            return interaction.update({ embeds: [embed], components: [] });
          }

          db.removeFromInventory(userId, invItem.item_name);
          db.addToInventory(target.id, invItem.item_name);

          const embed = new EmbedBuilder()
            .setColor('#2ecc71')
            .setTitle('🤝 Handel erfolgreich!')
            .setDescription(`${emoji} **${invItem.item_name}** wurde von **${message.author.username}** an **${target.username}** übergeben!`)
            .setTimestamp();

          interaction.update({ embeds: [embed], components: [] });
        } else {
          const embed = new EmbedBuilder()
            .setColor('#e74c3c')
            .setTitle('🤝 Handel abgelehnt')
            .setDescription(`**${target.username}** hat den Handel abgelehnt.`)
            .setTimestamp();

          interaction.update({ embeds: [embed], components: [] });
        }
      });

      collector.on('end', (_, reason) => {
        if (reason === 'time') {
          pendingTrades.delete(userId);
          msg.edit({ components: [] });
        }
      });
    });
  },
};
