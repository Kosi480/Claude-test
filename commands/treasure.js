const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const GRID = 4;
const COOLDOWN = 2 * 60 * 1000;
const MAX_MOVES = 6;
const cooldowns = new Map();

const tileTypes = [
  { type: 'gold_s', emoji: '💰', text: 'Kleiner Goldfund!', value: [30, 80] },
  { type: 'gold_m', emoji: '💎', text: 'Edelsteine entdeckt!', value: [100, 250] },
  { type: 'gold_l', emoji: '👑', text: 'Königlicher Schatz!', value: [300, 600] },
  { type: 'trap', emoji: '💀', text: 'Eine Falle! Du verlierst Beute!', value: null },
  { type: 'item', emoji: '🎁', text: 'Ein Item gefunden!', value: null },
  { type: 'double', emoji: '✨', text: 'Magisches Feld! Beute verdoppelt!', value: null },
  { type: 'empty', emoji: '🌫️', text: 'Nichts hier...', value: null },
  { type: 'monster', emoji: '👹', text: 'Ein Monster! Du verlierst einen Zug!', value: null },
];

function generateMap() {
  const tiles = [];
  const distribution = [
    'gold_s', 'gold_s', 'gold_s', 'gold_s',
    'gold_m', 'gold_m', 'gold_m',
    'gold_l', 'gold_l',
    'trap', 'trap',
    'item',
    'double',
    'empty', 'empty',
    'monster',
  ];

  const shuffled = distribution.sort(() => Math.random() - 0.5);
  for (let i = 0; i < GRID * GRID; i++) {
    tiles.push({
      type: shuffled[i],
      revealed: false,
    });
  }
  return tiles;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('treasure')
    .setDescription('Schatzsuche — decke Felder auf und finde Schätze! (2min CD)'),
  async execute(interaction) {
    const userId = interaction.user.id;
    const config = require('../config.json');

    const lastPlay = cooldowns.get(userId);
    if (lastPlay && Date.now() - lastPlay < COOLDOWN) {
      const remaining = Math.ceil((COOLDOWN - (Date.now() - lastPlay)) / 1000);
      return interaction.reply(`⏳ Du musst noch **${remaining}s** warten!`);
    }

    cooldowns.set(userId, Date.now());

    const tiles = generateMap();
    let movesLeft = MAX_MOVES;
    let totalGold = 0;
    let gameOver = false;
    const log = [];

    const buildGrid = (showAll = false) => {
      let grid = '';
      for (let i = 0; i < GRID * GRID; i++) {
        if (showAll || tiles[i].revealed) {
          const tileInfo = tileTypes.find(t => t.type === tiles[i].type);
          grid += tileInfo.emoji;
        } else {
          grid += '⬜';
        }
        grid += (i + 1) % GRID === 0 ? '\n' : ' ';
      }
      return grid;
    };

    const buildButtons = (disabled = false) => {
      const rows = [];
      for (let r = 0; r < GRID; r++) {
        const row = new ActionRowBuilder();
        for (let c = 0; c < GRID; c++) {
          const idx = r * GRID + c;
          const isRevealed = tiles[idx].revealed;
          const tileInfo = tileTypes.find(t => t.type === tiles[idx].type);
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`tr_${idx}_${userId}`)
              .setLabel(isRevealed ? tileInfo.emoji : `${idx + 1}`)
              .setStyle(isRevealed ? ButtonStyle.Success : ButtonStyle.Secondary)
              .setDisabled(disabled || isRevealed)
          );
        }
        rows.push(row);
      }
      return rows;
    };

    const buildEmbed = (color = '#e67e22') => {
      return new EmbedBuilder()
        .setColor(color)
        .setTitle('🗺️ Schatzsuche')
        .setDescription(
          `Züge übrig: **${movesLeft}/${MAX_MOVES}**\n` +
          `Beute: **${config.currencySymbol}${totalGold.toLocaleString()}**\n\n` +
          `${buildGrid()}\n` +
          (log.length > 0 ? log.slice(-3).join('\n') : '*Decke ein Feld auf!*')
        )
        .setFooter({ text: '45s Zeit | Finde so viel Schatz wie möglich!' })
        .setTimestamp();
    };

    const msg = await interaction.reply({ embeds: [buildEmbed()], components: buildButtons(), fetchReply: true });
    const collector = msg.createMessageComponentCollector({ time: 45000 });

    collector.on('collect', (btnInteraction) => {
      if (btnInteraction.user.id !== userId) {
        return btnInteraction.reply({ content: '❌ Das ist nicht deine Schatzsuche!', flags: 64 });
      }
      if (gameOver) return;

      const idx = parseInt(btnInteraction.customId.split('_')[1]);
      tiles[idx].revealed = true;
      movesLeft--;

      const tile = tileTypes.find(t => t.type === tiles[idx].type);

      if (tiles[idx].type.startsWith('gold')) {
        const range = tile.value;
        const gold = range[0] + Math.floor(Math.random() * (range[1] - range[0]));
        totalGold += gold;
        log.push(`${tile.emoji} ${tile.text} **+${config.currencySymbol}${gold}**`);
      } else if (tiles[idx].type === 'trap') {
        const loss = Math.floor(totalGold * 0.4);
        totalGold -= loss;
        if (totalGold < 0) totalGold = 0;
        log.push(`${tile.emoji} ${tile.text} **-${config.currencySymbol}${loss}**`);
      } else if (tiles[idx].type === 'item') {
        const items = ['Heiltrank', 'Mana-Kristall', 'Glücksbringer'];
        const item = items[Math.floor(Math.random() * items.length)];
        db.addToInventory(userId, item);
        log.push(`${tile.emoji} **${item}** gefunden!`);
      } else if (tiles[idx].type === 'double') {
        totalGold = totalGold * 2;
        log.push(`${tile.emoji} ${tile.text} Beute: **${config.currencySymbol}${totalGold}**!`);
      } else if (tiles[idx].type === 'monster') {
        movesLeft = Math.max(0, movesLeft - 1);
        log.push(`${tile.emoji} ${tile.text} (-1 Extra-Zug!)`);
      } else {
        log.push(`${tile.emoji} ${tile.text}`);
      }

      if (movesLeft <= 0) {
        gameOver = true;
        collector.stop('done');

        if (totalGold > 0) db.updateBalance(userId, totalGold);

        const embed = new EmbedBuilder()
          .setColor(totalGold > 0 ? '#FFD700' : '#e74c3c')
          .setTitle('🗺️ Schatzsuche beendet!')
          .setDescription(
            `${buildGrid(true)}\n\n` +
            log.slice(-4).join('\n') +
            `\n\n${totalGold > 0
              ? `💰 Gesamtbeute: **+${config.currencySymbol}${totalGold.toLocaleString()}**`
              : '💀 Kein Gewinn!'}`
          )
          .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
          .setTimestamp();
        btnInteraction.update({ embeds: [embed], components: [] });
        return;
      }

      collector.resetTimer({ time: 45000 });
      btnInteraction.update({ embeds: [buildEmbed()], components: buildButtons() });
    });

    collector.on('end', (_, reason) => {
      if (reason === 'time' && !gameOver) {
        gameOver = true;
        if (totalGold > 0) db.updateBalance(userId, totalGold);

        const embed = new EmbedBuilder()
          .setColor('#f39c12')
          .setTitle('⏰ Schatzsuche — Zeit abgelaufen!')
          .setDescription(
            `${buildGrid(true)}\n\n` +
            `💰 Beute: **${config.currencySymbol}${totalGold.toLocaleString()}**`
          )
          .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
          .setTimestamp();
        msg.edit({ embeds: [embed], components: [] });
      }
    });
  },
};
