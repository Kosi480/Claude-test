const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const GRID_SIZE = 5;
const SHIPS = [
  { name: 'U-Boot', size: 2, emoji: '🚢' },
  { name: 'Kreuzer', size: 3, emoji: '⛴️' },
];

function createGrid() {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill('water'));
}

function placeShipsRandom(grid) {
  const placed = [];
  for (const ship of SHIPS) {
    let attempts = 0;
    while (attempts < 50) {
      attempts++;
      const horizontal = Math.random() < 0.5;
      const x = Math.floor(Math.random() * (horizontal ? GRID_SIZE - ship.size + 1 : GRID_SIZE));
      const y = Math.floor(Math.random() * (horizontal ? GRID_SIZE : GRID_SIZE - ship.size + 1));

      const cells = [];
      let valid = true;
      for (let i = 0; i < ship.size; i++) {
        const cx = horizontal ? x + i : x;
        const cy = horizontal ? y : y + i;
        if (grid[cy][cx] !== 'water') { valid = false; break; }
        cells.push([cx, cy]);
      }
      if (!valid) continue;

      for (const [cx, cy] of cells) grid[cy][cx] = 'ship';
      placed.push({ ...ship, cells });
      break;
    }
  }
  return placed;
}

function renderGrid(grid, hideShips = false) {
  const cols = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];
  const rows = ['🇦', '🇧', '🇨', '🇩', '🇪'];
  let display = '⬛' + cols.join('') + '\n';

  for (let y = 0; y < GRID_SIZE; y++) {
    display += rows[y];
    for (let x = 0; x < GRID_SIZE; x++) {
      const cell = grid[y][x];
      if (cell === 'water') display += '🟦';
      else if (cell === 'ship') display += (hideShips ? '🟦' : '⬜');
      else if (cell === 'hit') display += '💥';
      else if (cell === 'miss') display += '⚫';
      else if (cell === 'sunk') display += '🔴';
    }
    display += '\n';
  }
  return display;
}

function checkSunk(ship, grid) {
  return ship.cells.every(([x, y]) => grid[y][x] === 'hit' || grid[y][x] === 'sunk');
}

function markSunk(ship, grid) {
  for (const [x, y] of ship.cells) grid[y][x] = 'sunk';
}

function allSunk(ships, grid) {
  return ships.every(s => checkSunk(s, grid));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('schiffe')
    .setDescription('Schiffe versenken gegen einen anderen Spieler!')
    .addUserOption(opt =>
      opt.setName('gegner')
        .setDescription('Gegen wen spielen?')
        .setRequired(true))
    .addIntegerOption(opt =>
      opt.setName('einsatz')
        .setDescription('Einsatz (beide zahlen)')
        .setRequired(true)
        .setMinValue(100)
        .setMaxValue(20000)),
  async execute(interaction) {
    const userId = interaction.user.id;
    const config = require('../config.json');
    const opponent = interaction.options.getUser('gegner');
    const bet = interaction.options.getInteger('einsatz');

    if (opponent.id === userId) return interaction.reply('❌ Du kannst nicht gegen dich selbst spielen!');
    if (opponent.bot) return interaction.reply('❌ Du kannst nicht gegen Bots spielen!');

    if (db.getBalance(userId) < bet) {
      return interaction.reply(`❌ Du brauchst **${config.currencySymbol}${bet.toLocaleString()}**!`);
    }
    if (db.getBalance(opponent.id) < bet) {
      return interaction.reply(`❌ ${opponent.username} hat nicht genug Guthaben!`);
    }

    const p1Grid = createGrid();
    const p2Grid = createGrid();
    const p1Ships = placeShipsRandom(p1Grid);
    const p2Ships = placeShipsRandom(p2Grid);

    let currentTurn = userId;
    let gameOver = false;
    let accepted = false;
    let shotsFired = { [userId]: 0, [opponent.id]: 0 };

    const buildChallengeEmbed = () => {
      return new EmbedBuilder()
        .setColor('#3498db')
        .setTitle('⚓ Schiffe versenken — Herausforderung')
        .setDescription(
          `**${interaction.user.username}** fordert **${opponent.username}** heraus!\n\n` +
          `💰 Einsatz: **${config.currencySymbol}${bet.toLocaleString()}** pro Spieler\n` +
          `🏆 Gewinner bekommt: **${config.currencySymbol}${(bet * 2).toLocaleString()}**\n\n` +
          `Schiffe werden automatisch platziert (${SHIPS.map(s => `${s.emoji}${s.name}(${s.size})`).join(', ')})`
        )
        .setFooter({ text: '30s zum Annehmen' })
        .setTimestamp();
    };

    const buildBattleEmbed = (log = '') => {
      const currentName = currentTurn === userId ? interaction.user.username : opponent.username;
      const targetGrid = currentTurn === userId ? p2Grid : p1Grid;

      return new EmbedBuilder()
        .setColor('#e74c3c')
        .setTitle(`⚓ Schiffe versenken — ${currentName} ist dran!`)
        .setDescription(
          `**Ziel-Feld:**\n${renderGrid(targetGrid, true)}\n` +
          `⚔️ Schüsse: ${interaction.user.username}: **${shotsFired[userId]}** | ${opponent.username}: **${shotsFired[opponent.id]}**\n` +
          (log ? `\n${log}` : '') +
          `\n\n*Wähle eine Spalte (1-5) und Reihe (A-E)*`
        )
        .setTimestamp();
    };

    const buildFireButtons = () => {
      const rows = [];
      for (let y = 0; y < GRID_SIZE; y++) {
        const rowLabel = ['A', 'B', 'C', 'D', 'E'][y];
        const row = new ActionRowBuilder().addComponents(
          ...Array.from({ length: GRID_SIZE }, (_, x) => {
            const targetGrid = currentTurn === userId ? p2Grid : p1Grid;
            const cell = targetGrid[y][x];
            const alreadyShot = cell === 'hit' || cell === 'miss' || cell === 'sunk';
            return new ButtonBuilder()
              .setCustomId(`ship_${x}_${y}_${interaction.id}`)
              .setLabel(`${rowLabel}${x + 1}`)
              .setStyle(alreadyShot ? (cell === 'miss' ? ButtonStyle.Secondary : ButtonStyle.Danger) : ButtonStyle.Primary)
              .setDisabled(alreadyShot);
          })
        );
        rows.push(row);
      }
      return rows;
    };

    const msg = await interaction.reply({
      content: `${opponent}`,
      embeds: [buildChallengeEmbed()],
      components: [new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`ship_accept_${interaction.id}`).setLabel('✅ Annehmen').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`ship_decline_${interaction.id}`).setLabel('❌ Ablehnen').setStyle(ButtonStyle.Danger),
      )],
      fetchReply: true,
    });

    const collector = msg.createMessageComponentCollector({ time: 180000 });

    collector.on('collect', (btnInteraction) => {
      if (gameOver) return;

      const parts = btnInteraction.customId.split('_');

      if (parts[1] === 'accept') {
        if (btnInteraction.user.id !== opponent.id) {
          return btnInteraction.reply({ content: '❌ Nur der Herausgeforderte kann annehmen!', flags: 64 });
        }
        accepted = true;
        db.updateBalance(userId, -bet);
        db.updateBalance(opponent.id, -bet);

        btnInteraction.update({ embeds: [buildBattleEmbed()], components: buildFireButtons() });
        return;
      }

      if (parts[1] === 'decline') {
        if (btnInteraction.user.id !== opponent.id) {
          return btnInteraction.reply({ content: '❌ Nur der Herausgeforderte kann ablehnen!', flags: 64 });
        }
        gameOver = true;
        collector.stop('declined');
        const embed = new EmbedBuilder()
          .setColor('#95a5a6')
          .setTitle('⚓ Herausforderung abgelehnt')
          .setDescription(`${opponent.username} hat abgelehnt.`)
          .setTimestamp();
        btnInteraction.update({ embeds: [embed], components: [] });
        return;
      }

      if (!accepted) return;

      if (btnInteraction.user.id !== currentTurn) {
        return btnInteraction.reply({ content: '❌ Du bist nicht dran!', flags: 64 });
      }

      const x = parseInt(parts[1]);
      const y = parseInt(parts[2]);
      const targetGrid = currentTurn === userId ? p2Grid : p1Grid;
      const targetShips = currentTurn === userId ? p2Ships : p1Ships;
      const shooterName = currentTurn === userId ? interaction.user.username : opponent.username;

      shotsFired[currentTurn]++;
      let log = '';

      if (targetGrid[y][x] === 'ship') {
        targetGrid[y][x] = 'hit';
        const hitShip = targetShips.find(s => s.cells.some(([sx, sy]) => sx === x && sy === y));

        if (hitShip && checkSunk(hitShip, targetGrid)) {
          markSunk(hitShip, targetGrid);
          log = `💥 **${shooterName}** versenkt **${hitShip.emoji} ${hitShip.name}**!`;

          if (allSunk(targetShips, targetGrid)) {
            gameOver = true;
            collector.stop('won');
            const prize = bet * 2;
            db.updateBalance(currentTurn, prize);

            const embed = new EmbedBuilder()
              .setColor('#FFD700')
              .setTitle(`🏆 ${shooterName} gewinnt!`)
              .setDescription(
                `Alle Schiffe versenkt!\n\n` +
                `**${interaction.user.username}'s Feld:**\n${renderGrid(p1Grid)}\n` +
                `**${opponent.username}'s Feld:**\n${renderGrid(p2Grid)}\n` +
                `💰 Gewinn: **+${config.currencySymbol}${prize.toLocaleString()}**`
              )
              .setTimestamp();
            btnInteraction.update({ embeds: [embed], components: [] });
            return;
          }
        } else {
          log = `💥 **${shooterName}** — Treffer!`;
        }
      } else {
        targetGrid[y][x] = 'miss';
        log = `⚫ **${shooterName}** — Daneben!`;
        currentTurn = currentTurn === userId ? opponent.id : userId;
      }

      collector.resetTimer({ time: 180000 });
      btnInteraction.update({ embeds: [buildBattleEmbed(log)], components: buildFireButtons() });
    });

    collector.on('end', (_, reason) => {
      if (reason === 'time' && !gameOver) {
        gameOver = true;
        if (accepted) {
          db.updateBalance(userId, bet);
          db.updateBalance(opponent.id, bet);
        }
        const embed = new EmbedBuilder()
          .setColor('#f39c12')
          .setTitle('⏰ Schiffe versenken — Zeit abgelaufen')
          .setDescription(accepted ? 'Einsätze zurückgegeben.' : 'Keine Antwort erhalten.')
          .setTimestamp();
        msg.edit({ embeds: [embed], components: [] });
      }
    });
  },
};
