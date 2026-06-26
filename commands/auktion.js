const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

function ensureAuctionTable() {
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS auctions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      seller_id TEXT NOT NULL,
      item_name TEXT NOT NULL,
      quantity INTEGER DEFAULT 1,
      start_price INTEGER NOT NULL,
      current_bid INTEGER DEFAULT 0,
      bidder_id TEXT,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      status TEXT DEFAULT 'active'
    )
  `);
}

function getActiveAuctions() {
  return db.db.prepare("SELECT * FROM auctions WHERE status = 'active' ORDER BY created_at DESC").all();
}

function getAuction(id) {
  return db.db.prepare('SELECT * FROM auctions WHERE id = ?').get(id);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('auktion')
    .setDescription('Auktionshaus — versteigere und ersteigere Items!')
    .addSubcommand(sub =>
      sub.setName('erstellen')
        .setDescription('Erstelle eine Auktion')
        .addStringOption(opt =>
          opt.setName('item')
            .setDescription('Welches Item versteigern?')
            .setRequired(true))
        .addIntegerOption(opt =>
          opt.setName('startpreis')
            .setDescription('Mindestgebot')
            .setRequired(true)
            .setMinValue(50))
        .addIntegerOption(opt =>
          opt.setName('menge')
            .setDescription('Anzahl (Standard: 1)')
            .setMinValue(1)))
    .addSubcommand(sub =>
      sub.setName('liste')
        .setDescription('Zeige aktive Auktionen'))
    .addSubcommand(sub =>
      sub.setName('bieten')
        .setDescription('Biete auf eine Auktion')
        .addIntegerOption(opt =>
          opt.setName('id')
            .setDescription('Auktions-ID')
            .setRequired(true))
        .addIntegerOption(opt =>
          opt.setName('betrag')
            .setDescription('Dein Gebot')
            .setRequired(true)
            .setMinValue(50)))
    .addSubcommand(sub =>
      sub.setName('abbrechen')
        .setDescription('Breche deine Auktion ab')
        .addIntegerOption(opt =>
          opt.setName('id')
            .setDescription('Auktions-ID')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('meine')
        .setDescription('Zeige deine aktiven Auktionen')),
  async execute(interaction) {
    ensureAuctionTable();
    const userId = interaction.user.id;
    const config = require('../config.json');
    const action = interaction.options.getSubcommand();

    expireAuctions();

    if (action === 'erstellen') {
      const itemName = interaction.options.getString('item');
      const startPrice = interaction.options.getInteger('startpreis');
      const quantity = interaction.options.getInteger('menge') || 1;

      const inventory = db.getInventory(userId);
      const owned = inventory.find(i => i.item_name.toLowerCase() === itemName.toLowerCase());
      if (!owned || owned.quantity < quantity) {
        return interaction.reply(`❌ Du hast nicht genug **${itemName}** (${owned ? owned.quantity : 0}/${quantity})!`);
      }

      const activeCount = db.db.prepare("SELECT COUNT(*) as cnt FROM auctions WHERE seller_id = ? AND status = 'active'").get(userId).cnt;
      if (activeCount >= 5) {
        return interaction.reply('❌ Du kannst maximal **5 Auktionen** gleichzeitig haben!');
      }

      db.removeFromInventory(userId, owned.item_name, quantity);

      const now = new Date();
      const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const result = db.db.prepare(
        'INSERT INTO auctions (seller_id, item_name, quantity, start_price, current_bid, created_at, expires_at) VALUES (?, ?, ?, ?, 0, ?, ?)'
      ).run(userId, owned.item_name, quantity, startPrice, now.toISOString(), expires.toISOString());

      const embed = new EmbedBuilder()
        .setColor('#e67e22')
        .setTitle('🏛️ Auktion erstellt!')
        .setDescription(
          `**${owned.item_name}** x${quantity}\n\n` +
          `💰 Startpreis: **${config.currencySymbol}${startPrice.toLocaleString()}**\n` +
          `⏰ Läuft ab: <t:${Math.floor(expires.getTime() / 1000)}:R>\n` +
          `🆔 Auktions-ID: **#${result.lastInsertRowid}**\n\n` +
          `Andere können mit \`/auktion bieten\` bieten!`
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'liste') {
      const auctions = getActiveAuctions();

      if (auctions.length === 0) {
        return interaction.reply('📭 Keine aktiven Auktionen vorhanden!');
      }

      const lines = auctions.slice(0, 10).map(a => {
        const expires = new Date(a.expires_at);
        const timeLeft = expires.getTime() - Date.now();
        const hoursLeft = Math.max(0, Math.floor(timeLeft / (60 * 60 * 1000)));
        const minsLeft = Math.max(0, Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000)));

        return `**#${a.id}** — **${a.item_name}** x${a.quantity}\n` +
          `  💰 ${a.current_bid > 0 ? `Höchstgebot: **${config.currencySymbol}${a.current_bid.toLocaleString()}**` : `Startpreis: **${config.currencySymbol}${a.start_price.toLocaleString()}**`}\n` +
          `  ${a.bidder_id ? `👤 Bieter: <@${a.bidder_id}>` : '👤 Noch keine Gebote'}\n` +
          `  ⏰ ${hoursLeft}h ${minsLeft}m übrig`;
      });

      const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle(`🏛️ Auktionshaus (${auctions.length} aktiv)`)
        .setDescription(lines.join('\n\n'))
        .setFooter({ text: 'Nutze /auktion bieten <id> <betrag> zum Bieten' })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'bieten') {
      const auctionId = interaction.options.getInteger('id');
      const bidAmount = interaction.options.getInteger('betrag');

      const auction = getAuction(auctionId);
      if (!auction || auction.status !== 'active') {
        return interaction.reply('❌ Auktion nicht gefunden oder bereits beendet!');
      }

      if (auction.seller_id === userId) {
        return interaction.reply('❌ Du kannst nicht auf deine eigene Auktion bieten!');
      }

      const minBid = auction.current_bid > 0
        ? auction.current_bid + Math.max(50, Math.floor(auction.current_bid * 0.05))
        : auction.start_price;

      if (bidAmount < minBid) {
        return interaction.reply(`❌ Mindestgebot: **${config.currencySymbol}${minBid.toLocaleString()}**!`);
      }

      if (db.getBalance(userId) < bidAmount) {
        return interaction.reply(`❌ Du brauchst **${config.currencySymbol}${bidAmount.toLocaleString()}**!`);
      }

      if (auction.bidder_id) {
        db.updateBalance(auction.bidder_id, auction.current_bid);
      }

      db.updateBalance(userId, -bidAmount);
      db.db.prepare('UPDATE auctions SET current_bid = ?, bidder_id = ? WHERE id = ?')
        .run(bidAmount, userId, auctionId);

      const embed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle('🏛️ Gebot abgegeben!')
        .setDescription(
          `**${auction.item_name}** x${auction.quantity}\n\n` +
          `💰 Dein Gebot: **${config.currencySymbol}${bidAmount.toLocaleString()}**\n` +
          (auction.bidder_id ? `📤 Vorheriger Bieter wurde erstattet.\n` : '') +
          `⏰ Endet: <t:${Math.floor(new Date(auction.expires_at).getTime() / 1000)}:R>`
        )
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'abbrechen') {
      const auctionId = interaction.options.getInteger('id');
      const auction = getAuction(auctionId);

      if (!auction || auction.status !== 'active') {
        return interaction.reply('❌ Auktion nicht gefunden oder bereits beendet!');
      }

      if (auction.seller_id !== userId) {
        return interaction.reply('❌ Das ist nicht deine Auktion!');
      }

      if (auction.bidder_id) {
        db.updateBalance(auction.bidder_id, auction.current_bid);
      }

      db.addToInventory(userId, auction.item_name, auction.quantity);
      db.db.prepare("UPDATE auctions SET status = 'cancelled' WHERE id = ?").run(auctionId);

      const embed = new EmbedBuilder()
        .setColor('#e74c3c')
        .setTitle('❌ Auktion abgebrochen')
        .setDescription(
          `**${auction.item_name}** x${auction.quantity} zurück im Inventar.\n` +
          (auction.bidder_id ? `💰 Gebot von **${config.currencySymbol}${auction.current_bid.toLocaleString()}** wurde erstattet.` : '')
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'meine') {
      const myAuctions = db.db.prepare("SELECT * FROM auctions WHERE seller_id = ? AND status = 'active' ORDER BY created_at DESC").all(userId);

      if (myAuctions.length === 0) {
        return interaction.reply('📭 Du hast keine aktiven Auktionen!');
      }

      const lines = myAuctions.map(a => {
        const expires = new Date(a.expires_at);
        const hoursLeft = Math.max(0, Math.floor((expires.getTime() - Date.now()) / (60 * 60 * 1000)));

        return `**#${a.id}** — **${a.item_name}** x${a.quantity}\n` +
          `  💰 ${a.current_bid > 0 ? `Höchstgebot: **${config.currencySymbol}${a.current_bid.toLocaleString()}**` : 'Noch keine Gebote'}\n` +
          `  ⏰ ${hoursLeft}h übrig`;
      });

      const embed = new EmbedBuilder()
        .setColor('#9b59b6')
        .setTitle(`🏛️ Deine Auktionen (${myAuctions.length}/5)`)
        .setDescription(lines.join('\n\n'))
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }
  },
};

function expireAuctions() {
  const expired = db.db.prepare("SELECT * FROM auctions WHERE status = 'active' AND expires_at < ?").all(new Date().toISOString());

  for (const auction of expired) {
    if (auction.bidder_id && auction.current_bid > 0) {
      db.addToInventory(auction.bidder_id, auction.item_name, auction.quantity);
      db.updateBalance(auction.seller_id, auction.current_bid);
      db.db.prepare("UPDATE auctions SET status = 'sold' WHERE id = ?").run(auction.id);
    } else {
      db.addToInventory(auction.seller_id, auction.item_name, auction.quantity);
      db.db.prepare("UPDATE auctions SET status = 'expired' WHERE id = ?").run(auction.id);
    }
  }
}
