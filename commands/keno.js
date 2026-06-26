const { EmbedBuilder } = require('discord.js');
const db = require('../database');

const COOLDOWN = 30 * 1000;
const cooldowns = new Map();
const MAX_NUM = 40;
const DRAW_COUNT = 10;

const payouts = {
  1: { 1: 2 },
  2: { 2: 4 },
  3: { 2: 1.5, 3: 8 },
  4: { 2: 1, 3: 4, 4: 15 },
  5: { 2: 1, 3: 2, 4: 8, 5: 30 },
  6: { 3: 1.5, 4: 4, 5: 15, 6: 50 },
  7: { 3: 1, 4: 3, 5: 8, 6: 25, 7: 100 },
  8: { 4: 2, 5: 5, 6: 15, 7: 50, 8: 200 },
  9: { 4: 1.5, 5: 3, 6: 10, 7: 30, 8: 100, 9: 500 },
  10: { 5: 2, 6: 5, 7: 20, 8: 75, 9: 250, 10: 1000 },
};

module.exports = {
  name: 'keno',
  aliases: ['lotterie', 'zahlenlotto'],
  description: 'Wähle Zahlen und hoffe auf Treffer! (!keno <Betrag> <Zahlen>, 30s CD)',
  execute(message, args) {
    const userId = message.author.id;
    const config = require('../config.json');

    if (args.length < 2) {
      return message.reply(
        `❌ Nutzung: \`${config.prefix}keno <Betrag> <Zahl1> <Zahl2> ...\`\n` +
        `Wähle 1-10 Zahlen zwischen 1 und ${MAX_NUM}.\n` +
        `Beispiel: \`${config.prefix}keno 100 3 15 22 37\``
      );
    }

    const lastPlay = cooldowns.get(userId);
    if (lastPlay && Date.now() - lastPlay < COOLDOWN) {
      const remaining = Math.ceil((COOLDOWN - (Date.now() - lastPlay)) / 1000);
      return message.reply(`⏳ Du musst noch **${remaining}s** warten!`);
    }

    let amount;
    if (args[0] === 'all' || args[0] === 'alles') {
      amount = db.getBalance(userId);
    } else {
      amount = parseInt(args[0]);
    }

    if (!amount || amount <= 0) return message.reply('❌ Ungültiger Betrag!');
    if (amount > db.getBalance(userId)) return message.reply(`❌ Du hast nur **${config.currencySymbol}${db.getBalance(userId)}**!`);

    const picked = [];
    for (let i = 1; i < args.length; i++) {
      const num = parseInt(args[i]);
      if (isNaN(num) || num < 1 || num > MAX_NUM) {
        return message.reply(`❌ **${args[i]}** ist keine gültige Zahl (1-${MAX_NUM})!`);
      }
      if (picked.includes(num)) {
        return message.reply(`❌ Zahl **${num}** wurde doppelt gewählt!`);
      }
      picked.push(num);
    }

    if (picked.length < 1 || picked.length > 10) {
      return message.reply('❌ Wähle zwischen 1 und 10 Zahlen!');
    }

    cooldowns.set(userId, Date.now());

    const drawn = [];
    const pool = Array.from({ length: MAX_NUM }, (_, i) => i + 1);
    for (let i = 0; i < DRAW_COUNT; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      drawn.push(pool[idx]);
      pool.splice(idx, 1);
    }
    drawn.sort((a, b) => a - b);

    const hits = picked.filter(n => drawn.includes(n));
    const pickCount = picked.length;
    const hitCount = hits.length;

    const multiplier = (payouts[pickCount] && payouts[pickCount][hitCount]) || 0;
    const winAmount = Math.floor(amount * multiplier);
    const profit = winAmount - amount;

    db.updateBalance(userId, profit);

    const drawnDisplay = drawn.map(n => {
      if (hits.includes(n)) return `**\`${String(n).padStart(2, ' ')}\`** ✅`;
      return `\`${String(n).padStart(2, ' ')}\``;
    }).join('  ');

    const pickedDisplay = picked.sort((a, b) => a - b).map(n => {
      if (hits.includes(n)) return `**${n}** ✅`;
      return `~~${n}~~`;
    }).join('  ');

    const payoutTable = payouts[pickCount];
    let tableText = '';
    if (payoutTable) {
      tableText = Object.entries(payoutTable)
        .map(([h, m]) => `${h} Treffer = ${m}x${parseInt(h) === hitCount ? ' ◀' : ''}`)
        .join(' | ');
    }

    let color, title;
    if (hitCount === pickCount && pickCount > 0) {
      color = '#FFD700';
      title = '🎯 PERFEKT!';
    } else if (multiplier > 0) {
      color = '#2ecc71';
      title = '🎯 Treffer!';
    } else {
      color = '#e74c3c';
      title = '🎯 Daneben!';
    }

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(
        `**Deine Zahlen:** ${pickedDisplay}\n\n` +
        `**Gezogen:** ${drawnDisplay}\n\n` +
        `Treffer: **${hitCount}/${pickCount}**\n` +
        (multiplier > 0
          ? `Multiplikator: **${multiplier}x** → Gewinn: **+${config.currencySymbol}${profit.toLocaleString()}**`
          : `Verlust: **-${config.currencySymbol}${amount.toLocaleString()}**`) +
        `\n\n\`${tableText}\``
      )
      .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
      .setTimestamp();

    message.reply({ embeds: [embed] });
  },
};
