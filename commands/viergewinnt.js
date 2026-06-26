const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const COLS = 7;
const ROWS = 6;
const COOLDOWN = 30 * 1000;
const cooldowns = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('viergewinnt')
    .setDescription('Vier Gewinnt gegen einen Spieler! (30s CD)')
    .addUserOption(opt => opt.setName('gegner').setDescription('Gegen wen?').setRequired(true))
    .addStringOption(opt => opt.setName('betrag').setDescription('Einsatz (Zahl oder "alles")').setRequired(true)),
  async execute(interaction) {
    const userId = interaction.user.id;
    const config = require('../config.json');

    const lastPlay = cooldowns.get(userId);
    if (lastPlay && Date.now() - lastPlay < COOLDOWN) {
      const remaining = Math.ceil((COOLDOWN - (Date.now() - lastPlay)) / 1000);
      return interaction.reply(`⏳ Du musst noch **${remaining}s** warten!`);
    }

    const target = interaction.options.getUser('gegner');
    if (target.id === userId) return interaction.reply('❌ Du kannst nicht gegen dich selbst spielen!');
    if (target.bot) return interaction.reply('❌ Du kannst nicht gegen einen Bot spielen!');

    const betragStr = interaction.options.getString('betrag');
    let amount;
    if (betragStr === 'all' || betragStr === 'alles') {
      amount = db.getBalance(userId);
    } else {
      amount = parseInt(betragStr);
    }

    if (!amount || amount <= 0) return interaction.reply('❌ Ungültiger Betrag!');
    if (amount > db.getBalance(userId)) return interaction.reply(`❌ Du hast nur **${config.currencySymbol}${db.getBalance(userId).toLocaleString()}**!`);
    if (amount > db.getBalance(target.id)) return interaction.reply(`❌ **${target.username}** hat nicht genug Geld!`);

    const acceptRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`vg_accept_${userId}`).setLabel('✅ Annehmen').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`vg_deny_${userId}`).setLabel('❌ Ablehnen').setStyle(ButtonStyle.Danger),
    );

    const embed = new EmbedBuilder()
      .setColor('#3498db')
      .setTitle('🔴🟡 Vier Gewinnt!')
      .setDescription(
        `**${interaction.user.username}** fordert **${target.username}** heraus!\n\n` +
        `Einsatz: **${config.currencySymbol}${amount.toLocaleString()}** pro Spieler\n\n` +
        `${target.username}, nimmst du an?`
      )
      .setFooter({ text: '30s zum Akzeptieren' })
      .setTimestamp();

    const msg = await interaction.reply({ embeds: [embed], components: [acceptRow], fetchReply: true });
    const acceptCollector = msg.createMessageComponentCollector({ time: 30000 });

    acceptCollector.on('collect', (btnInteraction) => {
      if (btnInteraction.user.id !== target.id) {
        return btnInteraction.reply({ content: '❌ Nur der Herausgeforderte kann antworten!', flags: 64 });
      }

      acceptCollector.stop();

      if (btnInteraction.customId.startsWith('vg_deny')) {
        const embed = new EmbedBuilder()
          .setColor('#95a5a6')
          .setTitle('❌ Herausforderung abgelehnt')
          .setDescription(`**${target.username}** hat abgelehnt.`)
          .setTimestamp();
        return btnInteraction.update({ embeds: [embed], components: [] });
      }

      if (db.getBalance(userId) < amount || db.getBalance(target.id) < amount) {
        return btnInteraction.update({ embeds: [new EmbedBuilder().setColor('#e74c3c').setTitle('❌ Nicht genug Geld').setTimestamp()], components: [] });
      }

      cooldowns.set(userId, Date.now());
      cooldowns.set(target.id, Date.now());

      const board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
      let currentPlayer = userId;
      let gameOver = false;
      const symbols = { [userId]: '🔴', [target.id]: '🟡' };
      const names = { [userId]: interaction.user.username, [target.id]: target.username };

      const dropPiece = (col) => {
        for (let r = ROWS - 1; r >= 0; r--) {
          if (!board[r][col]) {
            board[r][col] = currentPlayer;
            return r;
          }
        }
        return -1;
      };

      const checkWin = (row, col) => {
        const player = board[row][col];
        const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];

        for (const [dr, dc] of directions) {
          let count = 1;
          for (let d = 1; d <= 3; d++) {
            const r = row + dr * d, c = col + dc * d;
            if (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === player) count++;
            else break;
          }
          for (let d = 1; d <= 3; d++) {
            const r = row - dr * d, c = col - dc * d;
            if (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === player) count++;
            else break;
          }
          if (count >= 4) return true;
        }
        return false;
      };

      const isFull = () => board[0].every(c => c !== null);

      const renderBoard = () => {
        let display = '1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣7️⃣\n';
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            display += board[r][c] ? symbols[board[r][c]] : '⚫';
          }
          display += '\n';
        }
        return display;
      };

      const buildColButtons = () => {
        return [new ActionRowBuilder().addComponents(
          ...Array.from({ length: COLS }, (_, i) =>
            new ButtonBuilder()
              .setCustomId(`vgm_${i}_${userId}`)
              .setLabel(`${i + 1}`)
              .setStyle(ButtonStyle.Primary)
              .setDisabled(board[0][i] !== null || gameOver)
          )
        )];
      };

      const buildGameEmbed = () => {
        return new EmbedBuilder()
          .setColor(currentPlayer === userId ? '#e74c3c' : '#f1c40f')
          .setTitle('🔴🟡 Vier Gewinnt')
          .setDescription(
            `${symbols[userId]} **${names[userId]}** vs ${symbols[target.id]} **${names[target.id]}**\n` +
            `Einsatz: **${config.currencySymbol}${amount.toLocaleString()}**\n\n` +
            `${renderBoard()}\n` +
            `${symbols[currentPlayer]} **${names[currentPlayer]}** ist dran!`
          )
          .setFooter({ text: '30s pro Zug' })
          .setTimestamp();
      };

      btnInteraction.update({ embeds: [buildGameEmbed()], components: buildColButtons() });

      const gameCollector = msg.createMessageComponentCollector({ time: 30000 });

      gameCollector.on('collect', (moveInteraction) => {
        if (moveInteraction.user.id !== currentPlayer) {
          return moveInteraction.reply({ content: `❌ **${names[currentPlayer]}** ist dran!`, flags: 64 });
        }
        if (gameOver) return;

        const col = parseInt(moveInteraction.customId.split('_')[1]);
        const row = dropPiece(col);
        if (row === -1) return moveInteraction.reply({ content: '❌ Spalte ist voll!', flags: 64 });

        if (checkWin(row, col)) {
          gameOver = true;
          gameCollector.stop('win');

          const winnerId = currentPlayer;
          const loserId = winnerId === userId ? target.id : userId;
          db.updateBalance(winnerId, amount);
          db.updateBalance(loserId, -amount);

          const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle(`🏆 ${names[winnerId]} gewinnt!`)
            .setDescription(
              `${symbols[userId]} **${names[userId]}** vs ${symbols[target.id]} **${names[target.id]}**\n\n` +
              `${renderBoard()}\n` +
              `🏆 **${names[winnerId]}** gewinnt **${config.currencySymbol}${(amount * 2).toLocaleString()}**!`
            )
            .setTimestamp();
          moveInteraction.update({ embeds: [embed], components: [] });
          return;
        }

        if (isFull()) {
          gameOver = true;
          gameCollector.stop('draw');

          const embed = new EmbedBuilder()
            .setColor('#f39c12')
            .setTitle('🤝 Unentschieden!')
            .setDescription(
              `${symbols[userId]} **${names[userId]}** vs ${symbols[target.id]} **${names[target.id]}**\n\n` +
              `${renderBoard()}\n` +
              `Unentschieden! Einsatz zurück.`
            )
            .setTimestamp();
          moveInteraction.update({ embeds: [embed], components: [] });
          return;
        }

        currentPlayer = currentPlayer === userId ? target.id : userId;
        gameCollector.resetTimer({ time: 30000 });
        moveInteraction.update({ embeds: [buildGameEmbed()], components: buildColButtons() });
      });

      gameCollector.on('end', (_, reason) => {
        if (reason === 'time' && !gameOver) {
          gameOver = true;
          const winnerId = currentPlayer === userId ? target.id : userId;
          db.updateBalance(winnerId, amount);
          db.updateBalance(currentPlayer, -amount);

          const embed = new EmbedBuilder()
            .setColor('#f39c12')
            .setTitle('⏰ Zeit abgelaufen!')
            .setDescription(
              `**${names[currentPlayer]}** war zu langsam!\n\n` +
              `${renderBoard()}\n` +
              `🏆 **${names[winnerId]}** gewinnt **${config.currencySymbol}${(amount * 2).toLocaleString()}**!`
            )
            .setTimestamp();
          msg.edit({ embeds: [embed], components: [] });
        }
      });
    });

    acceptCollector.on('end', (_, reason) => {
      if (reason === 'time') msg.edit({ components: [] });
    });
  },
};
