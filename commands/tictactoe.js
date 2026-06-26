const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const COOLDOWN = 30 * 1000;
const cooldowns = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tictactoe')
    .setDescription('Tic-Tac-Toe gegen einen Spieler mit Einsatz! (30s CD)')
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
      new ButtonBuilder().setCustomId(`ttt_accept_${userId}`).setLabel('✅ Annehmen').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`ttt_deny_${userId}`).setLabel('❌ Ablehnen').setStyle(ButtonStyle.Danger),
    );

    const embed = new EmbedBuilder()
      .setColor('#3498db')
      .setTitle('❌⭕ Tic-Tac-Toe Herausforderung!')
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

      if (btnInteraction.customId.startsWith('ttt_deny')) {
        const embed = new EmbedBuilder()
          .setColor('#95a5a6')
          .setTitle('❌ Herausforderung abgelehnt')
          .setDescription(`**${target.username}** hat abgelehnt.`)
          .setTimestamp();
        return btnInteraction.update({ embeds: [embed], components: [] });
      }

      if (db.getBalance(userId) < amount || db.getBalance(target.id) < amount) {
        const embed = new EmbedBuilder()
          .setColor('#e74c3c')
          .setTitle('❌ Nicht genug Geld')
          .setDescription('Ein Spieler hat nicht mehr genug Geld!')
          .setTimestamp();
        return btnInteraction.update({ embeds: [embed], components: [] });
      }

      cooldowns.set(userId, Date.now());
      cooldowns.set(target.id, Date.now());

      const board = Array(9).fill(null);
      let currentPlayer = userId;
      let gameOver = false;
      const symbols = { [userId]: '❌', [target.id]: '⭕' };
      const names = { [userId]: interaction.user.username, [target.id]: target.username };

      const checkWin = () => {
        const lines = [
          [0, 1, 2], [3, 4, 5], [6, 7, 8],
          [0, 3, 6], [1, 4, 7], [2, 5, 8],
          [0, 4, 8], [2, 4, 6],
        ];
        for (const [a, b, c] of lines) {
          if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
          }
        }
        return null;
      };

      const isDraw = () => board.every(c => c !== null);

      const buildBoard = () => {
        const rows = [];
        for (let r = 0; r < 3; r++) {
          const row = new ActionRowBuilder();
          for (let c = 0; c < 3; c++) {
            const idx = r * 3 + c;
            const val = board[idx];
            row.addComponents(
              new ButtonBuilder()
                .setCustomId(`tttm_${idx}_${userId}`)
                .setLabel(val || '⬜')
                .setStyle(val === '❌' ? ButtonStyle.Danger : val === '⭕' ? ButtonStyle.Primary : ButtonStyle.Secondary)
                .setDisabled(!!val || gameOver)
            );
          }
          rows.push(row);
        }
        return rows;
      };

      const buildGameEmbed = (status = null) => {
        return new EmbedBuilder()
          .setColor(status === 'win' ? '#FFD700' : status === 'draw' ? '#f39c12' : '#3498db')
          .setTitle('❌⭕ Tic-Tac-Toe')
          .setDescription(
            `${symbols[userId]} **${names[userId]}** vs ${symbols[target.id]} **${names[target.id]}**\n` +
            `Einsatz: **${config.currencySymbol}${amount.toLocaleString()}** pro Spieler\n\n` +
            (gameOver ? '' : `${symbols[currentPlayer]} **${names[currentPlayer]}** ist dran!`)
          )
          .setFooter({ text: '30s pro Zug' })
          .setTimestamp();
      };

      btnInteraction.update({ embeds: [buildGameEmbed()], components: buildBoard() });

      const gameCollector = msg.createMessageComponentCollector({ time: 30000 });

      gameCollector.on('collect', (moveInteraction) => {
        if (moveInteraction.user.id !== currentPlayer) {
          return moveInteraction.reply({ content: `❌ **${names[currentPlayer]}** ist dran!`, flags: 64 });
        }
        if (gameOver) return;

        const idx = parseInt(moveInteraction.customId.split('_')[1]);
        if (board[idx]) return;

        board[idx] = symbols[currentPlayer];

        const winner = checkWin();
        if (winner) {
          gameOver = true;
          gameCollector.stop('win');

          const winnerId = winner === symbols[userId] ? userId : target.id;
          const loserId = winnerId === userId ? target.id : userId;

          db.updateBalance(winnerId, amount);
          db.updateBalance(loserId, -amount);

          const embed = buildGameEmbed('win');
          embed.setDescription(
            `${symbols[userId]} **${names[userId]}** vs ${symbols[target.id]} **${names[target.id]}**\n\n` +
            `🏆 **${names[winnerId]}** gewinnt **${config.currencySymbol}${(amount * 2).toLocaleString()}**!`
          );
          moveInteraction.update({ embeds: [embed], components: buildBoard() });
          return;
        }

        if (isDraw()) {
          gameOver = true;
          gameCollector.stop('draw');

          const embed = buildGameEmbed('draw');
          embed.setDescription(
            `${symbols[userId]} **${names[userId]}** vs ${symbols[target.id]} **${names[target.id]}**\n\n` +
            `🤝 Unentschieden! Einsatz zurück.`
          );
          moveInteraction.update({ embeds: [embed], components: buildBoard() });
          return;
        }

        currentPlayer = currentPlayer === userId ? target.id : userId;
        gameCollector.resetTimer({ time: 30000 });
        moveInteraction.update({ embeds: [buildGameEmbed()], components: buildBoard() });
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
              `🏆 **${names[winnerId]}** gewinnt **${config.currencySymbol}${(amount * 2).toLocaleString()}**!`
            )
            .setTimestamp();
          msg.edit({ embeds: [embed], components: buildBoard() });
        }
      });
    });

    acceptCollector.on('end', (_, reason) => {
      if (reason === 'time') msg.edit({ components: [] });
    });
  },
};
