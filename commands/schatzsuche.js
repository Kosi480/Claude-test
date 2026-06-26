const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const COOLDOWN = 3 * 60 * 1000;
const cooldowns = new Map();

const GRID_SIZE = 5;
const MAX_DIGS = 10;

const treasures = [
  { name: 'Rostiger Nagel', emoji: '🔩', value: 10, weight: 25 },
  { name: 'Alte Münze', emoji: '🪙', value: 50, weight: 20 },
  { name: 'Silberkette', emoji: '📿', value: 150, weight: 15 },
  { name: 'Goldring', emoji: '💍', value: 300, weight: 12 },
  { name: 'Juwelenkästchen', emoji: '💎', value: 600, weight: 8 },
  { name: 'Piratenschatz', emoji: '🏴‍☠️', value: 1200, weight: 5 },
  { name: 'Königskrone', emoji: '👑', value: 2500, weight: 3 },
  { name: 'Dracheneier', emoji: '🥚', value: 5000, weight: 1.5 },
  { name: 'Legendäres Artefakt', emoji: '⭐', value: 10000, weight: 0.5 },
];

const terrainTypes = [
  { emoji: '🌿', name: 'Gras' },
  { emoji: '🪨', name: 'Felsen' },
  { emoji: '🌊', name: 'Sumpf' },
  { emoji: '🌲', name: 'Wald' },
  { emoji: '🏜️', name: 'Sand' },
];

const mapThemes = [
  { name: 'Verlassene Insel', emoji: '🏝️', color: '#2ecc71' },
  { name: 'Geisterschiff-Wrack', emoji: '🚢', color: '#95a5a6' },
  { name: 'Vergessener Tempel', emoji: '🏛️', color: '#e67e22' },
  { name: 'Drachenhöhle', emoji: '🐉', color: '#e74c3c' },
  { name: 'Versunkene Stadt', emoji: '🌊', color: '#3498db' },
];

function rollTreasure() {
  const totalWeight = treasures.reduce((s, t) => s + t.weight, 0);
  const roll = Math.random() * totalWeight;
  let cumulative = 0;
  for (const t of treasures) {
    cumulative += t.weight;
    if (roll < cumulative) return t;
  }
  return treasures[0];
}

function generateMap() {
  const treasureCount = 2 + Math.floor(Math.random() * 3);
  const treasurePositions = [];

  while (treasurePositions.length < treasureCount) {
    const x = Math.floor(Math.random() * GRID_SIZE);
    const y = Math.floor(Math.random() * GRID_SIZE);
    if (!treasurePositions.some(p => p.x === x && p.y === y)) {
      treasurePositions.push({ x, y, treasure: rollTreasure() });
    }
  }

  const terrain = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    terrain[y] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      terrain[y][x] = terrainTypes[Math.floor(Math.random() * terrainTypes.length)];
    }
  }

  return { treasurePositions, terrain, theme: mapThemes[Math.floor(Math.random() * mapThemes.length)] };
}

function getDistance(x1, y1, x2, y2) {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

function getClosestTreasureDistance(x, y, treasurePositions, foundPositions) {
  let minDist = Infinity;
  for (const t of treasurePositions) {
    if (foundPositions.some(f => f.x === t.x && f.y === t.y)) continue;
    const d = getDistance(x, y, t.x, t.y);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

function getHint(distance) {
  if (distance === 0) return { text: '🏆 **SCHATZ GEFUNDEN!**', emoji: '🏆' };
  if (distance === 1) return { text: '🔥 **HEISS!** Direkt daneben!', emoji: '🔥' };
  if (distance === 2) return { text: '🟠 **Warm!** In der Nähe!', emoji: '🟠' };
  if (distance === 3) return { text: '🟡 **Lauwarm.** Nicht weit.', emoji: '🟡' };
  if (distance <= 5) return { text: '🔵 **Kühl.** Noch ein Stück.', emoji: '🔵' };
  return { text: '❄️ **Eiskalt!** Ganz woanders.', emoji: '❄️' };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('schatzsuche')
    .setDescription('Grabe nach vergrabenen Schätzen auf einer 5x5 Karte!')
    .addIntegerOption(opt =>
      opt.setName('einsatz')
        .setDescription('Dein Einsatz für die Schatzsuche')
        .setRequired(true)
        .setMinValue(100)
        .setMaxValue(20000)),
  async execute(interaction) {
    const userId = interaction.user.id;
    const config = require('../config.json');

    const lastPlay = cooldowns.get(userId);
    if (lastPlay && Date.now() - lastPlay < COOLDOWN) {
      const remaining = Math.ceil((COOLDOWN - (Date.now() - lastPlay)) / 1000);
      return interaction.reply(`⏳ Nächste Schatzsuche in **${remaining}s**!`);
    }

    const bet = interaction.options.getInteger('einsatz');
    if (db.getBalance(userId) < bet) {
      return interaction.reply(`❌ Du brauchst **${config.currencySymbol}${bet.toLocaleString()}**!`);
    }

    cooldowns.set(userId, Date.now());
    db.updateBalance(userId, -bet);

    const map = generateMap();
    const dug = [];
    const foundTreasures = [];
    const foundPositions = [];
    let digsLeft = MAX_DIGS;
    let totalValue = 0;
    let gameOver = false;
    const log = [];

    const renderMap = () => {
      const header = '  ' + '1️⃣2️⃣3️⃣4️⃣5️⃣';
      const rowLabels = ['🇦', '🇧', '🇨', '🇩', '🇪'];
      let grid = header + '\n';

      for (let y = 0; y < GRID_SIZE; y++) {
        grid += rowLabels[y];
        for (let x = 0; x < GRID_SIZE; x++) {
          const dugSpot = dug.find(d => d.x === x && d.y === y);
          if (dugSpot) {
            if (dugSpot.found) {
              grid += '🏆';
            } else {
              grid += dugSpot.hint.emoji;
            }
          } else {
            grid += '⬛';
          }
        }
        grid += '\n';
      }
      return grid;
    };

    const buildEmbed = (extra = '') => {
      return new EmbedBuilder()
        .setColor(map.theme.color)
        .setTitle(`${map.theme.emoji} ${map.theme.name} — Schatzsuche`)
        .setDescription(
          `💰 Einsatz: **${config.currencySymbol}${bet.toLocaleString()}** | ⛏️ Versuche: **${digsLeft}/${MAX_DIGS}**\n` +
          `🏆 Gefunden: **${foundTreasures.length}/${map.treasurePositions.length}** | 💎 Wert: **${config.currencySymbol}${totalValue.toLocaleString()}**\n\n` +
          renderMap() + '\n' +
          (log.length > 0 ? `${log.slice(-3).join('\n')}\n` : '') +
          (extra ? `\n${extra}` : '') +
          `\n*Wähle eine Reihe (A-E), dann eine Spalte (1-5)*`
        )
        .setFooter({ text: `${map.treasurePositions.length} Schätze versteckt | Heißer = näher` })
        .setTimestamp();
    };

    let selectedRow = null;

    const buildRowButtons = () => {
      const labels = ['A', 'B', 'C', 'D', 'E'];
      return [new ActionRowBuilder().addComponents(
        ...labels.map((l, i) => new ButtonBuilder()
          .setCustomId(`ss_row_${i}_${userId}`)
          .setLabel(l)
          .setStyle(ButtonStyle.Primary)
        )
      )];
    };

    const buildColButtons = () => {
      return [new ActionRowBuilder().addComponents(
        ...[1, 2, 3, 4, 5].map((n, i) => new ButtonBuilder()
          .setCustomId(`ss_col_${i}_${userId}`)
          .setLabel(String(n))
          .setStyle(ButtonStyle.Success)
        ),
      ), new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`ss_back_${userId}`)
          .setLabel('↩️ Zurück')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`ss_stop_${userId}`)
          .setLabel(`💰 Aufhören (${config.currencySymbol}${totalValue})`)
          .setStyle(ButtonStyle.Danger)
          .setDisabled(totalValue <= 0)
      )];
    };

    const msg = await interaction.reply({ embeds: [buildEmbed('Wähle eine **Reihe** (A-E):')], components: buildRowButtons(), fetchReply: true });
    const collector = msg.createMessageComponentCollector({ time: 120000 });

    collector.on('collect', (btn) => {
      if (btn.user.id !== userId) return btn.reply({ content: '❌ Das ist nicht deine Schatzsuche!', flags: 64 });
      if (gameOver) return;

      const parts = btn.customId.split('_');
      const action = parts[1];

      if (action === 'stop') {
        gameOver = true;
        collector.stop('stopped');

        const winnings = totalValue;
        if (winnings > 0) db.updateBalance(userId, winnings);
        const net = winnings - bet;

        const embed = new EmbedBuilder()
          .setColor(net >= 0 ? '#FFD700' : '#e74c3c')
          .setTitle(`${map.theme.emoji} Schatzsuche beendet!`)
          .setDescription(
            renderMap() + '\n' +
            `🏆 Gefunden: **${foundTreasures.length}** Schätze\n` +
            foundTreasures.map(t => `${t.emoji} ${t.name}: **${config.currencySymbol}${t.value.toLocaleString()}**`).join('\n') +
            `\n\n💰 Gesamt: **${config.currencySymbol}${winnings.toLocaleString()}** (${net >= 0 ? '+' : ''}${config.currencySymbol}${net.toLocaleString()} netto)`
          )
          .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
          .setTimestamp();
        btn.update({ embeds: [embed], components: [] });
        return;
      }

      if (action === 'back') {
        selectedRow = null;
        collector.resetTimer({ time: 120000 });
        btn.update({ embeds: [buildEmbed('Wähle eine **Reihe** (A-E):')], components: buildRowButtons() });
        return;
      }

      if (action === 'row') {
        selectedRow = parseInt(parts[2]);
        collector.resetTimer({ time: 120000 });
        btn.update({ embeds: [buildEmbed(`Reihe **${'ABCDE'[selectedRow]}** gewählt. Wähle **Spalte** (1-5):`)], components: buildColButtons() });
        return;
      }

      if (action === 'col') {
        const col = parseInt(parts[2]);
        const row = selectedRow;
        selectedRow = null;

        if (dug.some(d => d.x === col && d.y === row)) {
          collector.resetTimer({ time: 120000 });
          btn.update({ embeds: [buildEmbed('❌ Hier hast du schon gegraben! Wähle eine **Reihe**:')], components: buildRowButtons() });
          return;
        }

        digsLeft--;

        const treasureHere = map.treasurePositions.find(t => t.x === col && t.y === row);

        if (treasureHere) {
          const valueMultiplier = 1 + bet / 10000;
          const finalValue = Math.floor(treasureHere.treasure.value * valueMultiplier);
          totalValue += finalValue;
          foundTreasures.push({ ...treasureHere.treasure, value: finalValue });
          foundPositions.push({ x: col, y: row });
          dug.push({ x: col, y: row, found: true, hint: { emoji: '🏆' } });
          log.push(`🏆 **${treasureHere.treasure.emoji} ${treasureHere.treasure.name}** gefunden! +${config.currencySymbol}${finalValue.toLocaleString()}`);
        } else {
          const dist = getClosestTreasureDistance(col, row, map.treasurePositions, foundPositions);
          const hint = getHint(dist);
          dug.push({ x: col, y: row, found: false, hint });
          log.push(`⛏️ ${'ABCDE'[row]}${col + 1}: ${hint.text}`);
        }

        if (foundTreasures.length === map.treasurePositions.length || digsLeft <= 0) {
          gameOver = true;
          collector.stop('done');

          const winnings = totalValue;
          if (winnings > 0) db.updateBalance(userId, winnings);
          const net = winnings - bet;

          const revealedMap = [];
          for (const t of map.treasurePositions) {
            if (!foundPositions.some(f => f.x === t.x && f.y === t.y)) {
              revealedMap.push(`❌ ${'ABCDE'[t.y]}${t.x + 1}: ${t.treasure.emoji} ${t.treasure.name} (verpasst!)`);
            }
          }

          const embed = new EmbedBuilder()
            .setColor(net >= 0 ? '#FFD700' : '#e74c3c')
            .setTitle(foundTreasures.length === map.treasurePositions.length
              ? `${map.theme.emoji} Alle Schätze gefunden! 🏆`
              : `${map.theme.emoji} Schatzsuche vorbei!`)
            .setDescription(
              renderMap() + '\n' +
              (foundTreasures.length > 0
                ? `🏆 **Gefunden:**\n${foundTreasures.map(t => `${t.emoji} ${t.name}: +${config.currencySymbol}${t.value.toLocaleString()}`).join('\n')}\n`
                : '💨 Keine Schätze gefunden!\n') +
              (revealedMap.length > 0 ? `\n${revealedMap.join('\n')}\n` : '') +
              `\n💰 Gesamt: **${config.currencySymbol}${winnings.toLocaleString()}** (${net >= 0 ? '+' : ''}${config.currencySymbol}${net.toLocaleString()} netto)`
            )
            .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
            .setTimestamp();
          btn.update({ embeds: [embed], components: [] });
          return;
        }

        collector.resetTimer({ time: 120000 });
        btn.update({ embeds: [buildEmbed('Wähle eine **Reihe** (A-E):')], components: buildRowButtons() });
      }
    });

    collector.on('end', (_, reason) => {
      if (reason === 'time' && !gameOver) {
        gameOver = true;
        if (totalValue > 0) db.updateBalance(userId, totalValue);

        const embed = new EmbedBuilder()
          .setColor('#f39c12')
          .setTitle('⏰ Schatzsuche — Zeit abgelaufen!')
          .setDescription(
            totalValue > 0
              ? `💰 Bisherige Schätze ausbezahlt: **+${config.currencySymbol}${totalValue.toLocaleString()}**`
              : `💸 Verloren: **-${config.currencySymbol}${bet.toLocaleString()}**`
          )
          .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
          .setTimestamp();
        msg.edit({ embeds: [embed], components: [] });
      }
    });
  },
};
