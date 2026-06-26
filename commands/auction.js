const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database');

const activeAuctions = new Map();
let auctionCounter = 0;

module.exports = {
  name: 'auction',
  aliases: ['auktion', 'versteigerung', 'ah'],
  description: 'Auktionshaus (!auction create/list/bid)',
  execute(message, args) {
    const userId = message.author.id;
    const config = require('../config.json');
    const action = (args[0] || 'list').toLowerCase();

    if (action === 'create' || action === 'erstellen') {
      const itemName = args.slice(1, -1).join(' ');
      const startPrice = parseInt(args[args.length - 1]);

      if (!itemName || !startPrice || startPrice <= 0) {
        return message.reply(`❌ Nutzung: \`${config.prefix}auction create <Item> <Startpreis>\``);
      }

      const inventory = db.getInventory(userId);
      const invItem = inventory.find(i => i.item_name.toLowerCase() === itemName.toLowerCase());
      if (!invItem) return message.reply(`❌ Du hast **${itemName}** nicht im Inventar!`);

      if ([...activeAuctions.values()].some(a => a.sellerId === userId)) {
        return message.reply('❌ Du hast bereits eine aktive Auktion!');
      }

      db.removeFromInventory(userId, invItem.item_name);

      auctionCounter++;
      const auctionId = auctionCounter;
      const shopItem = db.getShopItem(invItem.item_name);
      const emoji = shopItem ? shopItem.emoji : '📦';

      const auction = {
        id: auctionId,
        sellerId: userId,
        sellerName: message.author.username,
        itemName: invItem.item_name,
        emoji,
        startPrice,
        currentBid: startPrice,
        highestBidder: null,
        highestBidderName: null,
        endTime: Date.now() + 2 * 60 * 1000,
        channelId: message.channel.id,
      };

      activeAuctions.set(auctionId, auction);

      const embed = new EmbedBuilder()
        .setColor('#f39c12')
        .setTitle(`${emoji} Auktion #${auctionId}`)
        .setDescription(
          `**${message.author.username}** versteigert ${emoji} **${invItem.item_name}**!\n\n` +
          `Startpreis: **${config.currencySymbol}${startPrice.toLocaleString()}**\n` +
          `Bieten: \`${config.prefix}auction bid ${auctionId} <Betrag>\`\n\n` +
          `Endet in **2 Minuten**!`
        )
        .setTimestamp();

      message.reply({ embeds: [embed] });

      setTimeout(() => {
        endAuction(auctionId, message.client, config);
      }, 2 * 60 * 1000);

      return;
    }

    if (action === 'bid' || action === 'bieten') {
      const auctionId = parseInt(args[1]);
      const bidAmount = parseInt(args[2]);

      if (!auctionId || !bidAmount) {
        return message.reply(`❌ Nutzung: \`${config.prefix}auction bid <ID> <Betrag>\``);
      }

      const auction = activeAuctions.get(auctionId);
      if (!auction) return message.reply('❌ Auktion nicht gefunden oder bereits beendet!');
      if (auction.sellerId === userId) return message.reply('❌ Du kannst nicht auf deine eigene Auktion bieten!');
      if (Date.now() > auction.endTime) return message.reply('❌ Diese Auktion ist bereits abgelaufen!');

      if (bidAmount <= auction.currentBid) {
        return message.reply(`❌ Dein Gebot muss höher als **${config.currencySymbol}${auction.currentBid}** sein!`);
      }

      const balance = db.getBalance(userId);
      if (balance < bidAmount) {
        return message.reply(`❌ Du hast nur **${config.currencySymbol}${balance}**!`);
      }

      if (auction.highestBidder) {
        db.updateBalance(auction.highestBidder, auction.currentBid);
      }

      db.updateBalance(userId, -bidAmount);
      auction.currentBid = bidAmount;
      auction.highestBidder = userId;
      auction.highestBidderName = message.author.username;

      const embed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle(`${auction.emoji} Auktion #${auctionId} — Neues Gebot!`)
        .setDescription(
          `**${message.author.username}** bietet **${config.currencySymbol}${bidAmount.toLocaleString()}** auf ${auction.emoji} **${auction.itemName}**!\n\n` +
          `Aktuelles Höchstgebot: **${config.currencySymbol}${auction.currentBid.toLocaleString()}**`
        )
        .setTimestamp();

      message.reply({ embeds: [embed] });
      return;
    }

    if (action === 'list' || action === 'liste') {
      if (activeAuctions.size === 0) {
        return message.reply(`📋 Keine aktiven Auktionen! Erstelle eine mit \`${config.prefix}auction create <Item> <Startpreis>\``);
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
        .setFooter({ text: `${config.prefix}auction bid <ID> <Betrag> zum Bieten` })
        .setTimestamp();

      message.reply({ embeds: [embed] });
      return;
    }

    message.reply(`🏛️ Nutzung:\n\`${config.prefix}auction list\` — Aktive Auktionen\n\`${config.prefix}auction create <Item> <Startpreis>\` — Auktion erstellen\n\`${config.prefix}auction bid <ID> <Betrag>\` — Bieten`);
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
