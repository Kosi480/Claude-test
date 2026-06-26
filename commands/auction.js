const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const activeAuctions = new Map();
let auctionCounter = 0;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('auction')
    .setDescription('Auktionshaus - erstelle, biete und liste Auktionen')
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('Zeige alle aktiven Auktionen'))
    .addSubcommand(sub =>
      sub.setName('create')
        .setDescription('Erstelle eine neue Auktion')
        .addStringOption(opt =>
          opt.setName('item')
            .setDescription('Der Name des Items')
            .setRequired(true))
        .addIntegerOption(opt =>
          opt.setName('startpreis')
            .setDescription('Der Startpreis der Auktion')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('bid')
        .setDescription('Biete auf eine Auktion')
        .addIntegerOption(opt =>
          opt.setName('id')
            .setDescription('Die Auktions-ID')
            .setRequired(true))
        .addIntegerOption(opt =>
          opt.setName('betrag')
            .setDescription('Dein Gebot')
            .setRequired(true))),
  async execute(interaction) {
    const userId = interaction.user.id;
    const config = require('../config.json');
    const action = interaction.options.getSubcommand();

    if (action === 'create') {
      const itemName = interaction.options.getString('item');
      const startPrice = interaction.options.getInteger('startpreis');

      if (startPrice <= 0) {
        return await interaction.reply('❌ Der Startpreis muss positiv sein!');
      }

      const inventory = db.getInventory(userId);
      const invItem = inventory.find(i => i.item_name.toLowerCase() === itemName.toLowerCase());
      if (!invItem) return await interaction.reply(`❌ Du hast **${itemName}** nicht im Inventar!`);

      if ([...activeAuctions.values()].some(a => a.sellerId === userId)) {
        return await interaction.reply('❌ Du hast bereits eine aktive Auktion!');
      }

      db.removeFromInventory(userId, invItem.item_name);

      auctionCounter++;
      const auctionId = auctionCounter;
      const shopItem = db.getShopItem(invItem.item_name);
      const emoji = shopItem ? shopItem.emoji : '📦';

      const auction = {
        id: auctionId,
        sellerId: userId,
        sellerName: interaction.user.username,
        itemName: invItem.item_name,
        emoji,
        startPrice,
        currentBid: startPrice,
        highestBidder: null,
        highestBidderName: null,
        endTime: Date.now() + 2 * 60 * 1000,
        channelId: interaction.channel.id,
      };

      activeAuctions.set(auctionId, auction);

      const embed = new EmbedBuilder()
        .setColor('#f39c12')
        .setTitle(`${emoji} Auktion #${auctionId}`)
        .setDescription(
          `**${interaction.user.username}** versteigert ${emoji} **${invItem.item_name}**!\n\n` +
          `Startpreis: **${config.currencySymbol}${startPrice.toLocaleString()}**\n` +
          `Bieten: \`/auction bid\`\n\n` +
          `Endet in **2 Minuten**!`
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      setTimeout(() => {
        endAuction(auctionId, interaction.client, config);
      }, 2 * 60 * 1000);

      return;
    }

    if (action === 'bid') {
      const auctionId = interaction.options.getInteger('id');
      const bidAmount = interaction.options.getInteger('betrag');

      const auction = activeAuctions.get(auctionId);
      if (!auction) return await interaction.reply('❌ Auktion nicht gefunden oder bereits beendet!');
      if (auction.sellerId === userId) return await interaction.reply('❌ Du kannst nicht auf deine eigene Auktion bieten!');
      if (Date.now() > auction.endTime) return await interaction.reply('❌ Diese Auktion ist bereits abgelaufen!');

      if (bidAmount <= auction.currentBid) {
        return await interaction.reply(`❌ Dein Gebot muss höher als **${config.currencySymbol}${auction.currentBid}** sein!`);
      }

      const balance = db.getBalance(userId);
      if (balance < bidAmount) {
        return await interaction.reply(`❌ Du hast nur **${config.currencySymbol}${balance}**!`);
      }

      if (auction.highestBidder) {
        db.updateBalance(auction.highestBidder, auction.currentBid);
      }

      db.updateBalance(userId, -bidAmount);
      auction.currentBid = bidAmount;
      auction.highestBidder = userId;
      auction.highestBidderName = interaction.user.username;

      const embed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle(`${auction.emoji} Auktion #${auctionId} — Neues Gebot!`)
        .setDescription(
          `**${interaction.user.username}** bietet **${config.currencySymbol}${bidAmount.toLocaleString()}** auf ${auction.emoji} **${auction.itemName}**!\n\n` +
          `Aktuelles Höchstgebot: **${config.currencySymbol}${auction.currentBid.toLocaleString()}**`
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (action === 'list') {
      if (activeAuctions.size === 0) {
        return await interaction.reply('📋 Keine aktiven Auktionen! Erstelle eine mit `/auction create`');
      }

      const lines = [...activeAuctions.values()].map(a => {
        const timeLeft = Math.max(0, Math.ceil((a.endTime - Date.now()) / 1000));
        const bidder = a.highestBidderName || 'Keiner';
        return `**#${a.id}** ${a.emoji} **${a.itemName}** von ${a.sellerName}\n┗ Gebot: ${config.currencySymbol}${a.currentBid.toLocaleString()} (${bidder}) — ${timeLeft}s übrig`;
      });

      const embed = new EmbedBuilder()
        .setColor('#f39c12')
        .setTitle('🏛️ Auktionshaus')
        .setDescription(lines.join('\n\n'))
        .setFooter({ text: `/auction bid zum Bieten` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      return;
    }
  },
};

function endAuction(auctionId, client, config) {
  const auction = activeAuctions.get(auctionId);
  if (!auction) return;

  activeAuctions.delete(auctionId);

  const channel = client.channels.cache.get(auction.channelId);
  if (!channel) return;

  if (auction.highestBidder) {
    db.addToInventory(auction.highestBidder, auction.itemName);
    db.updateBalance(auction.sellerId, auction.currentBid);

    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle(`🏛️ Auktion #${auctionId} — Beendet!`)
      .setDescription(
        `${auction.emoji} **${auction.itemName}** geht an **${auction.highestBidderName}** für **${config.currencySymbol}${auction.currentBid.toLocaleString()}**!\n\n` +
        `Verkäufer **${auction.sellerName}** erhält das Geld.`
      )
      .setTimestamp();

    channel.send({ embeds: [embed] });
  } else {
    db.addToInventory(auction.sellerId, auction.itemName);

    const embed = new EmbedBuilder()
      .setColor('#95a5a6')
      .setTitle(`🏛️ Auktion #${auctionId} — Keine Gebote`)
      .setDescription(`${auction.emoji} **${auction.itemName}** wird an **${auction.sellerName}** zurückgegeben.`)
      .setTimestamp();

    channel.send({ embeds: [embed] });
  }
}
