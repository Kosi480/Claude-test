const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const COOLDOWN = 3 * 60 * 1000;
const cooldowns = new Map();

function generateCard() {
  const card = [];
  for (let col = 0; col < 5; col++) {
    const min = col * 15 + 1;
    const max = col * 15 + 15;
    const nums = [];
    while (nums.length < 5) {
      const n = min + Math.floor(Math.random() * (max - min + 1));
      if (!nums.includes(n)) nums.push(n);
    }
    card.push(nums);
  }
  card[2][2] = 0;
  return card;
}

function checkBingo(marked) {
  for (let r = 0; r < 5; r++) {
    if (marked[r].every(Boolean)) return `Reihe ${r + 1}`;
  }
  for (let c = 0; c < 5; c++) {
    if (marked.every(row => row[c])) return `Spalte ${c + 1}`;
  }
  if ([0,1,2,3,4].every(i => marked[i][i])) return 'Diagonale ↘';
  if ([0,1,2,3,4].every(i => marked[i][4-i])) return 'Diagonale ↙';
  return null;
}

function countMarked(marked) {
  return marked.flat().filter(Boolean).length;
}

const headerLetters = ['B', 'I', 'N', 'G', 'O'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bingo')
    .setDescription('Spiele Bingo und gewinne Preise! (3min CD)')
    .addIntegerOption(opt =>
      opt.setName('einsatz')
        .setDescription('Dein Einsatz')
        .setRequired(true)
        .setMinValue(100)
        .setMaxValue(10000)),
  async execute(interaction) {
    const userId = interaction.user.id;
    const config = require('../config.json');

    const lastPlay = cooldowns.get(userId);
    if (lastPlay && Date.now() - lastPlay < COOLDOWN) {
      const remaining = Math.ceil((COOLDOWN - (Date.now() - lastPlay)) / 1000);
      return interaction.reply(`⏳ Du musst noch **${remaining}s** warten!`);
    }

    const bet = interaction.options.getInteger('einsatz');
    if (db.getBalance(userId) < bet) {
      return interaction.reply(`❌ Du brauchst **${config.currencySymbol}${bet.toLocaleString()}**!`);
    }

    cooldowns.set(userId, Date.now());
    db.updateBalance(userId, -bet);

    const card = generateCard();
    const marked = Array.from({ length: 5 }, () => Array(5).fill(false));
    marked[2][2] = true;

    const calledNumbers = [];
    const allNumbers = Array.from({ length: 75 }, (_, i) => i + 1);
    for (let i = allNumbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allNumbers[i], allNumbers[j]] = [allNumbers[j], allNumbers[i]];
    }

    let drawIndex = 0;
    let gameOver = false;
    let drawCount = 0;
    const maxDraws = 30;

    const renderCard = () => {
      let display = '` ' + headerLetters.join('  ') + ' `\n';
      for (let r = 0; r < 5; r++) {
        const cells = [];
        for (let c = 0; c < 5; c++) {
          if (r === 2 && c === 2) {
            cells.push('⭐');
          } else if (marked[r][c]) {
            cells.push('✅');
          } else {
            const num = card[c][r].toString().padStart(2, '0');
            cells.push(num);
          }
        }
        display += '`' + cells.map(c => c.length === 2 ? ` ${c}` : ` ${c} `).join('') + '`\n';
      }
      return display;
    };

    const buildEmbed = (newNum = null) => {
      const embed = new EmbedBuilder()
        .setColor(gameOver ? '#FFD700' : '#3498db')
        .setTitle('🎱 Bingo!')
        .setDescription(
          `💰 Einsatz: **${config.currencySymbol}${bet.toLocaleString()}**\n` +
          `🔢 Gezogen: **${drawCount}/${maxDraws}**\n\n` +
          (newNum ? `📣 Neue Zahl: **${headerLetters[Math.floor((newNum - 1) / 15)]}-${newNum}**\n\n` : '') +
          `**Deine Karte:**\n${renderCard()}\n` +
          `Letzte Zahlen: ${calledNumbers.slice(-5).map(n => `\`${n}\``).join(' ')}`
        )
        .setFooter({ text: `Markiert: ${countMarked(marked)}/25 | Drücke "Ziehen" für die nächste Zahl` })
        .setTimestamp();
      return embed;
    };

    const buildButtons = () => {
      return [new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`bingo_draw_${userId}`)
          .setLabel(`🔢 Ziehen (${maxDraws - drawCount} übrig)`)
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`bingo_auto_${userId}`)
          .setLabel('⚡ Auto-Ziehen (5x)')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`bingo_quit_${userId}`)
          .setLabel('🚪 Aufgeben')
          .setStyle(ButtonStyle.Danger),
      )];
    };

    const drawNumber = () => {
      if (drawIndex >= allNumbers.length) return null;
      const num = allNumbers[drawIndex++];
      calledNumbers.push(num);
      drawCount++;

      const col = Math.floor((num - 1) / 15);
      for (let r = 0; r < 5; r++) {
        if (card[col][r] === num) {
          marked[r][col] = true;
        }
      }
      return num;
    };

    const finishGame = (btnInteraction, bingo) => {
      gameOver = true;

      if (bingo) {
        const multiplier = drawCount <= 15 ? 5 : drawCount <= 20 ? 3 : drawCount <= 25 ? 2 : 1.5;
        const winnings = Math.floor(bet * multiplier);
        db.updateBalance(userId, winnings);

        const embed = new EmbedBuilder()
          .setColor('#FFD700')
          .setTitle('🎱 BINGO! 🎉')
          .setDescription(
            `**${bingo}** nach **${drawCount}** Ziehungen!\n\n` +
            `${renderCard()}\n` +
            `💰 Gewinn: **+${config.currencySymbol}${winnings.toLocaleString()}** (x${multiplier})\n` +
            (multiplier >= 3 ? '⚡ Schnell-Bonus!' : '')
          )
          .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
          .setTimestamp();
        btnInteraction.update({ embeds: [embed], components: [] });
      } else {
        const markedCount = countMarked(marked);
        const consolation = markedCount >= 15 ? Math.floor(bet * 0.5) : 0;
        if (consolation > 0) db.updateBalance(userId, consolation);

        const embed = new EmbedBuilder()
          .setColor('#e74c3c')
          .setTitle('🎱 Kein Bingo!')
          .setDescription(
            `Alle **${maxDraws}** Ziehungen verbraucht!\n\n` +
            `${renderCard()}\n` +
            `Markiert: **${markedCount}/25**\n` +
            (consolation > 0
              ? `💰 Trostpreis: **+${config.currencySymbol}${consolation.toLocaleString()}**`
              : `💸 Verloren: **-${config.currencySymbol}${bet.toLocaleString()}**`)
          )
          .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
          .setTimestamp();
        btnInteraction.update({ embeds: [embed], components: [] });
      }
    };

    const msg = await interaction.reply({ embeds: [buildEmbed()], components: buildButtons(), fetchReply: true });
    const collector = msg.createMessageComponentCollector({ time: 120000 });

    collector.on('collect', (btnInteraction) => {
      if (btnInteraction.user.id !== userId) {
        return btnInteraction.reply({ content: '❌ Das ist nicht dein Bingo!', flags: 64 });
      }
      if (gameOver) return;

      const action = btnInteraction.customId.split('_')[1];

      if (action === 'draw') {
        const num = drawNumber();
        const bingo = checkBingo(marked);

        if (bingo) {
          collector.stop('bingo');
          finishGame(btnInteraction, bingo);
          return;
        }

        if (drawCount >= maxDraws) {
          collector.stop('maxdraws');
          finishGame(btnInteraction, null);
          return;
        }

        collector.resetTimer({ time: 120000 });
        btnInteraction.update({ embeds: [buildEmbed(num)], components: buildButtons() });
        return;
      }

      if (action === 'auto') {
        let lastNum = null;
        let bingo = null;

        for (let i = 0; i < 5; i++) {
          if (drawCount >= maxDraws) break;
          lastNum = drawNumber();
          bingo = checkBingo(marked);
          if (bingo) break;
        }

        if (bingo) {
          collector.stop('bingo');
          finishGame(btnInteraction, bingo);
          return;
        }

        if (drawCount >= maxDraws) {
          collector.stop('maxdraws');
          finishGame(btnInteraction, null);
          return;
        }

        collector.resetTimer({ time: 120000 });
        btnInteraction.update({ embeds: [buildEmbed(lastNum)], components: buildButtons() });
        return;
      }

      if (action === 'quit') {
        gameOver = true;
        collector.stop('quit');
        const embed = new EmbedBuilder()
          .setColor('#95a5a6')
          .setTitle('🎱 Bingo aufgegeben')
          .setDescription(`💸 Einsatz verloren: **-${config.currencySymbol}${bet.toLocaleString()}**`)
          .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
          .setTimestamp();
        btnInteraction.update({ embeds: [embed], components: [] });
      }
    });

    collector.on('end', (_, reason) => {
      if (reason === 'time' && !gameOver) {
        gameOver = true;
        const embed = new EmbedBuilder()
          .setColor('#f39c12')
          .setTitle('⏰ Bingo — Zeit abgelaufen!')
          .setDescription(`💸 Einsatz verloren: **-${config.currencySymbol}${bet.toLocaleString()}**`)
          .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
          .setTimestamp();
        msg.edit({ embeds: [embed], components: [] });
      }
    });
  },
};
