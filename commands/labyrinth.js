const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const COOLDOWN = 3 * 60 * 1000;
const cooldowns = new Map();

const SIZE = 7;
const TILE = {
  WALL: '⬛',
  PATH: '⬜',
  PLAYER: '🔵',
  EXIT: '🟢',
  COIN: '🪙',
  GEM: '💎',
  TRAP: '💀',
  KEY: '🔑',
  DOOR: '🚪',
  FOG: '🌫️',
};

function generateMaze() {
  const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(1));

  const carve = (x, y) => {
    grid[y][x] = 0;
    const dirs = [[0,-2],[0,2],[-2,0],[2,0]].sort(() => Math.random() - 0.5);
    for (const [dx, dy] of dirs) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && nx < SIZE && ny >= 0 && ny < SIZE && grid[ny][nx] === 1) {
        grid[y + dy/2][x + dx/2] = 0;
        carve(nx, ny);
      }
    }
  };
  carve(0, 0);

  grid[0][0] = 0;
  grid[SIZE-1][SIZE-1] = 0;
  if (grid[SIZE-2][SIZE-1] === 1 && grid[SIZE-1][SIZE-2] === 1) {
    grid[SIZE-1][SIZE-2] = 0;
  }

  const items = [];
  const pathCells = [];
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (grid[y][x] === 0 && !(x === 0 && y === 0) && !(x === SIZE-1 && y === SIZE-1)) {
        pathCells.push([x, y]);
      }
    }
  }

  const shuffled = pathCells.sort(() => Math.random() - 0.5);
  let idx = 0;
  const coinCount = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < coinCount && idx < shuffled.length; i++, idx++) {
    items.push({ x: shuffled[idx][0], y: shuffled[idx][1], type: 'coin' });
  }
  if (idx < shuffled.length) {
    items.push({ x: shuffled[idx][0], y: shuffled[idx][1], type: 'gem' });
    idx++;
  }
  const trapCount = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < trapCount && idx < shuffled.length; i++, idx++) {
    items.push({ x: shuffled[idx][0], y: shuffled[idx][1], type: 'trap' });
  }
  if (idx < shuffled.length) {
    items.push({ x: shuffled[idx][0], y: shuffled[idx][1], type: 'key' });
    idx++;
  }

  return { grid, items };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('labyrinth')
    .setDescription('Navigiere durch ein Labyrinth und sammle Beute! (3min CD)')
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

    const { grid, items } = generateMaze();
    let px = 0, py = 0;
    let moves = 0;
    const maxMoves = 40;
    let loot = 0;
    let hasKey = false;
    let gameOver = false;
    const collected = new Set();
    const visited = new Set();
    visited.add('0,0');
    const eventLog = [];

    const renderMaze = () => {
      let display = '';
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          if (x === px && y === py) {
            display += TILE.PLAYER;
          } else if (x === SIZE-1 && y === SIZE-1) {
            display += TILE.EXIT;
          } else {
            const dist = Math.abs(x - px) + Math.abs(y - py);
            if (dist > 3 && !visited.has(`${x},${y}`)) {
              display += TILE.FOG;
            } else if (grid[y][x] === 1) {
              display += TILE.WALL;
            } else {
              const item = items.find(i => i.x === x && i.y === y && !collected.has(`${i.x},${i.y}`));
              if (item) {
                if (dist <= 3 || visited.has(`${x},${y}`)) {
                  display += item.type === 'coin' ? TILE.COIN :
                    item.type === 'gem' ? TILE.GEM :
                    item.type === 'trap' ? TILE.TRAP : TILE.KEY;
                } else {
                  display += TILE.FOG;
                }
              } else {
                display += TILE.PATH;
              }
            }
          }
        }
        display += '\n';
      }
      return display;
    };

    const buildEmbed = () => {
      return new EmbedBuilder()
        .setColor(gameOver ? '#FFD700' : '#3498db')
        .setTitle('🔮 Labyrinth')
        .setDescription(
          `${renderMaze()}\n` +
          `🔵 Du | 🟢 Ausgang | 🌫️ Nebel\n\n` +
          `👣 Schritte: **${moves}/${maxMoves}**\n` +
          `💰 Beute: **${config.currencySymbol}${loot.toLocaleString()}**\n` +
          `🔑 Schlüssel: ${hasKey ? '✅' : '❌'}\n` +
          (eventLog.length > 0 ? `\n${eventLog.slice(-2).join('\n')}` : '')
        )
        .setFooter({ text: 'Navigiere zum grünen Ausgang!' })
        .setTimestamp();
    };

    const buildButtons = () => {
      const canUp = py > 0 && grid[py-1][px] === 0;
      const canDown = py < SIZE-1 && grid[py+1][px] === 0;
      const canLeft = px > 0 && grid[py][px-1] === 0;
      const canRight = px < SIZE-1 && grid[py][px+1] === 0;

      return [new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`maze_up_${userId}`)
          .setLabel('⬆️')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(!canUp),
        new ButtonBuilder()
          .setCustomId(`maze_down_${userId}`)
          .setLabel('⬇️')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(!canDown),
        new ButtonBuilder()
          .setCustomId(`maze_left_${userId}`)
          .setLabel('⬅️')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(!canLeft),
        new ButtonBuilder()
          .setCustomId(`maze_right_${userId}`)
          .setLabel('➡️')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(!canRight),
        new ButtonBuilder()
          .setCustomId(`maze_quit_${userId}`)
          .setLabel('🚪')
          .setStyle(ButtonStyle.Danger),
      )];
    };

    const handleItem = () => {
      const key = `${px},${py}`;
      const item = items.find(i => i.x === px && i.y === py && !collected.has(key));
      if (!item) return;

      collected.add(key);
      if (item.type === 'coin') {
        const amount = Math.floor(bet * (0.2 + Math.random() * 0.3));
        loot += amount;
        eventLog.push(`🪙 +**${config.currencySymbol}${amount}** gefunden!`);
      } else if (item.type === 'gem') {
        const amount = Math.floor(bet * (0.5 + Math.random() * 0.5));
        loot += amount;
        eventLog.push(`💎 +**${config.currencySymbol}${amount}** Edelstein!`);
      } else if (item.type === 'trap') {
        const loss = Math.floor(loot * 0.3);
        loot = Math.max(0, loot - loss);
        eventLog.push(`💀 Falle! **-${config.currencySymbol}${loss}** Beute verloren!`);
      } else if (item.type === 'key') {
        hasKey = true;
        eventLog.push(`🔑 Schlüssel gefunden! Bonus am Ausgang!`);
      }
    };

    const msg = await interaction.reply({ embeds: [buildEmbed()], components: buildButtons(), fetchReply: true });
    const collector = msg.createMessageComponentCollector({ time: 90000 });

    collector.on('collect', (btnInteraction) => {
      if (btnInteraction.user.id !== userId) {
        return btnInteraction.reply({ content: '❌ Das ist nicht dein Labyrinth!', flags: 64 });
      }
      if (gameOver) return;

      const action = btnInteraction.customId.split('_')[1];

      if (action === 'quit') {
        gameOver = true;
        collector.stop('quit');
        const salvage = Math.floor(loot * 0.5);
        if (salvage > 0) db.updateBalance(userId, salvage);

        const embed = new EmbedBuilder()
          .setColor('#95a5a6')
          .setTitle('🔮 Labyrinth verlassen')
          .setDescription(
            `Du hast aufgegeben.\n` +
            (salvage > 0 ? `💰 Halbe Beute: **+${config.currencySymbol}${salvage}**` : `💸 Verloren: **-${config.currencySymbol}${bet.toLocaleString()}**`)
          )
          .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
          .setTimestamp();
        btnInteraction.update({ embeds: [embed], components: [] });
        return;
      }

      const dirs = { up: [0,-1], down: [0,1], left: [-1,0], right: [1,0] };
      const [dx, dy] = dirs[action];
      const nx = px + dx, ny = py + dy;

      if (nx < 0 || nx >= SIZE || ny < 0 || ny >= SIZE || grid[ny][nx] === 1) {
        return btnInteraction.reply({ content: '❌ Da ist eine Wand!', flags: 64 });
      }

      px = nx;
      py = ny;
      moves++;
      visited.add(`${px},${py}`);

      handleItem();

      if (px === SIZE-1 && py === SIZE-1) {
        gameOver = true;
        collector.stop('exit');

        const speedBonus = moves <= 15 ? Math.floor(bet * 0.5) : moves <= 25 ? Math.floor(bet * 0.2) : 0;
        const keyBonus = hasKey ? Math.floor(bet * 0.8) : 0;
        const total = loot + speedBonus + keyBonus;
        db.updateBalance(userId, total);

        const embed = new EmbedBuilder()
          .setColor('#FFD700')
          .setTitle('🏆 Labyrinth geschafft!')
          .setDescription(
            `${renderMaze()}\n` +
            `Du hast den Ausgang in **${moves}** Schritten erreicht!\n\n` +
            `💰 Beute: **${config.currencySymbol}${loot.toLocaleString()}**\n` +
            (speedBonus > 0 ? `⚡ Speed-Bonus: **+${config.currencySymbol}${speedBonus.toLocaleString()}**\n` : '') +
            (keyBonus > 0 ? `🔑 Schlüssel-Bonus: **+${config.currencySymbol}${keyBonus.toLocaleString()}**\n` : '') +
            `\n🏆 Gesamt: **+${config.currencySymbol}${total.toLocaleString()}**`
          )
          .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
          .setTimestamp();
        btnInteraction.update({ embeds: [embed], components: [] });
        return;
      }

      if (moves >= maxMoves) {
        gameOver = true;
        collector.stop('maxmoves');

        const salvage = Math.floor(loot * 0.5);
        if (salvage > 0) db.updateBalance(userId, salvage);

        const embed = new EmbedBuilder()
          .setColor('#e74c3c')
          .setTitle('💀 Im Labyrinth verloren!')
          .setDescription(
            `Schritte aufgebraucht!\n\n` +
            (salvage > 0 ? `💰 Halbe Beute: **+${config.currencySymbol}${salvage}**` : `💸 Verloren: **-${config.currencySymbol}${bet.toLocaleString()}**`)
          )
          .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
          .setTimestamp();
        btnInteraction.update({ embeds: [embed], components: [] });
        return;
      }

      collector.resetTimer({ time: 90000 });
      btnInteraction.update({ embeds: [buildEmbed()], components: buildButtons() });
    });

    collector.on('end', (_, reason) => {
      if (reason === 'time' && !gameOver) {
        gameOver = true;
        const embed = new EmbedBuilder()
          .setColor('#f39c12')
          .setTitle('⏰ Labyrinth — Zeit abgelaufen!')
          .setDescription(`💸 Verloren: **-${config.currencySymbol}${bet.toLocaleString()}**`)
          .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
          .setTimestamp();
        msg.edit({ embeds: [embed], components: [] });
      }
    });
  },
};
