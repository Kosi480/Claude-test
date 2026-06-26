const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const GRID_SIZE = 5;
const MINE_COUNT = 7;
const COOLDOWN = 30 * 1000;
const cooldowns = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mines')
    .setDescription('Minenfeld — Decke Felder auf ohne Minen zu treffen! (30s CD)')
    .addStringOption(opt => opt.setName('betrag').setDescription('Einsatz (Zahl oder "alles")').setRequired(true)),
  async execute(interaction) {
    const userId = interaction.user.id;
    const config = require('../config.json');

    const lastPlay = cooldowns.get(userId);
    if (lastPlay && Date.now() - lastPlay < COOLDOWN) {
      const remaining = Math.ceil((COOLDOWN - (Date.now() - lastPlay)) / 1000);
      return interaction.reply(`⏳ Du musst noch **${remaining}s** warten!`);
    }

    const betragStr = interaction.options.getString('betrag');
    let amount;
    if (betragStr === 'all' || betragStr === 'alles') {
      amount = db.getBalance(userId);
    } else {
      amount = parseInt(betragStr);
    }

    if (!amount || amount <= 0) return interaction.reply('❌ Ungültiger Betrag!');
    if (amount > db.getBalance(userId)) return interaction.reply(`❌ Du hast nur **${config.currencySymbol}${db.getBalance(userId)}**!`);

    cooldowns.set(userId, Date.now());

    const mines = new Set();
    while (mines.size < MINE_COUNT) {
      mines.add(Math.floor(Math.random() * GRID_SIZE * GRID_SIZE));
    }

    const revealed = new Set();
    let gameOver = false;

    const getMultiplier = () => {
      const safe = revealed.size;
      if (safe === 0) return 1.0;
      return parseFloat((1.0 + safe * 0.4 + Math.pow(safe, 1.5) * 0.05).toFixed(2));
    };

    const buildGrid = (showAll = false) => {
      let grid = '';
      for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
        if (showAll) {
          grid += mines.has(i) ? '💣' : (revealed.has(i) ? '💎' : '💎');
        } else {
          if (revealed.has(i)) grid += '💎';
          else grid += '⬜';
        }
        if ((i + 1) % GRID_SIZE === 0) grid += '\n';
        else grid += ' ';
      }
      return grid;
    };

    const buildRevealedGrid = () => {
      let grid = '';
      for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
        if (mines.has(i)) grid += '💣';
        else if (revealed.has(i)) grid += '💎';
        else grid += '⬛';
        if ((i + 1) % GRID_SIZE === 0) grid += '\n';
        else grid += ' ';
      }
      return grid;
    };

    const buildButtons = (disabled = false) => {
      const rows = [];
      for (let r = 0; r < GRID_SIZE; r++) {
        const row = new ActionRowBuilder();
        for (let c = 0; c < GRID_SIZE; c++) {
          const idx = r * GRID_SIZE + c;
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`mine_${idx}_${userId}`)
              .setLabel(revealed.has(idx) ? '💎' : `${idx + 1}`)
              .setStyle(revealed.has(idx) ? ButtonStyle.Success : ButtonStyle.Secondary)
              .setDisabled(disabled || revealed.has(idx))
          );
        }
        rows.push(row);
      }
      return rows;
    };

    const embed = new EmbedBuilder()
      .setColor('#3498db')
      .setTitle('💣 Minenfeld')
      .setDescription(
        `Einsatz: **${config.currencySymbol}${amount.toLocaleString()}**\n` +
        `Minen: **${MINE_COUNT}** von **${GRID_SIZE * GRID_SIZE}** Feldern\n\n` +
        `${buildGrid()}\n` +
        `Multiplikator: **${getMultiplier()}x**\n` +
        `Schreibe \`stop\` zum Auscashen!`
      )
      .setFooter({ text: '45s Zeit | 7 Minen versteckt' })
      .setTimestamp();

    const msg = await interaction.reply({ embeds: [embed], components: buildButtons(), fetchReply: true });
    const btnCollector = msg.createMessageComponentCollector({ time: 45000 });
    const msgCollector = interaction.channel.createMessageCollector({
      filter: m => m.author.id === userId && m.content.toLowerCase() === 'stop',
      time: 45000,
    });

    msgCollector.on('collect', (m) => {
      if (gameOver || revealed.size === 0) return;
      gameOver = true;
      btnCollector.stop('cashout');
      msgCollector.stop();
      m.delete().catch(() => {});

      const mult = getMultiplier();
      const winAmount = Math.floor(amount * mult);
      const profit = winAmount - amount;
      db.updateBalance(userId, profit);

      const embed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle('💰 Ausgecasht!')
        .setDescription(
          `${buildRevealedGrid()}\n` +
          `**${revealed.size}** Felder aufgedeckt — **${mult}x**\n` +
          `Gewinn: **+${config.currencySymbol}${profit.toLocaleString()}**`
        )
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();

      msg.edit({ embeds: [embed], components: [] });
    });

    btnCollector.on('collect', (interaction) => {
      if (interaction.user.id !== userId) {
        return interaction.reply({ content: '❌ Das ist nicht dein Spiel!', flags: 64 });
      }
      if (gameOver) return;

      const idx = parseInt(interaction.customId.split('_')[1]);

      if (mines.has(idx)) {
        gameOver = true;
        btnCollector.stop('boom');
        msgCollector.stop();

        db.updateBalance(userId, -amount);

        const embed = new EmbedBuilder()
          .setColor('#e74c3c')
          .setTitle('💥 BOOM! Mine getroffen!')
          .setDescription(
            `${buildRevealedGrid()}\n` +
            `Du hast eine Mine getroffen!\n` +
            `Verlust: **-${config.currencySymbol}${amount.toLocaleString()}**`
          )
          .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
          .setTimestamp();

        interaction.update({ embeds: [embed], components: [] });
        return;
      }

      revealed.add(idx);
      const safeLeft = GRID_SIZE * GRID_SIZE - MINE_COUNT - revealed.size;

      if (safeLeft === 0) {
        gameOver = true;
        btnCollector.stop('cleared');
        msgCollector.stop();

        const mult = getMultiplier();
        const winAmount = Math.floor(amount * mult);
        const profit = winAmount - amount;
        db.updateBalance(userId, profit);

        const embed = new EmbedBuilder()
          .setColor('#FFD700')
          .setTitle('🏆 ALLE FELDER GESCHAFFT!')
          .setDescription(
            `${buildRevealedGrid()}\n` +
            `Unglaublich! Alle sicheren Felder aufgedeckt!\n` +
            `Multiplikator: **${mult}x**\n` +
            `Gewinn: **+${config.currencySymbol}${profit.toLocaleString()}**`
          )
          .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
          .setTimestamp();

        interaction.update({ embeds: [embed], components: [] });
        return;
      }

      const mult = getMultiplier();
      const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle('💣 Minenfeld')
        .setDescription(
          `Einsatz: **${config.currencySymbol}${amount.toLocaleString()}**\n` +
          `Aufgedeckt: **${revealed.size}** | Noch sicher: **${safeLeft}**\n\n` +
          `${buildGrid()}\n` +
          `Multiplikator: **${mult}x** → Gewinn: **${config.currencySymbol}${Math.floor(amount * mult).toLocaleString()}**\n` +
          `Schreibe \`stop\` zum Auscashen!`
        )
        .setFooter({ text: '45s Zeit | 7 Minen versteckt' })
        .setTimestamp();

      interaction.update({ embeds: [embed], components: buildButtons() });
    });

    btnCollector.on('end', (_, reason) => {
      msgCollector.stop();
      if (reason === 'time' && !gameOver) {
        gameOver = true;
        if (revealed.size > 0) {
          const mult = getMultiplier();
          const winAmount = Math.floor(amount * mult);
          const profit = winAmount - amount;
          db.updateBalance(userId, profit);

          const embed = new EmbedBuilder()
            .setColor('#f39c12')
            .setTitle('⏰ Zeit abgelaufen — Auto-Cashout')
            .setDescription(
              `${buildRevealedGrid()}\n` +
              `**${revealed.size}** Felder aufgedeckt — **${mult}x**\n` +
              `Gewinn: **+${config.currencySymbol}${profit.toLocaleString()}**`
            )
            .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
            .setTimestamp();

          msg.edit({ embeds: [embed], components: [] });
        } else {
          db.updateBalance(userId, -amount);
          const embed = new EmbedBuilder()
            .setColor('#e74c3c')
            .setTitle('⏰ Zeit abgelaufen')
            .setDescription(`Du hast kein Feld aufgedeckt!\nVerlust: **-${config.currencySymbol}${amount.toLocaleString()}**`)
            .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
            .setTimestamp();

          msg.edit({ embeds: [embed], components: [] });
        }
      }
    });
  },
};
