const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const COOLDOWN = 2 * 60 * 1000;
const cooldowns = new Map();

const sectors = [
  { id: 'x2', label: 'x2', emoji: '🟢', type: 'multiplier', value: 2, weight: 20 },
  { id: 'x3', label: 'x3', emoji: '🔵', type: 'multiplier', value: 3, weight: 15 },
  { id: 'x5', label: 'x5', emoji: '🟣', type: 'multiplier', value: 5, weight: 8 },
  { id: 'x10', label: 'x10', emoji: '🟡', type: 'multiplier', value: 10, weight: 3 },
  { id: 'bankrott', label: 'BANKROTT', emoji: '💀', type: 'bankrupt', value: 0, weight: 10 },
  { id: 'bonus500', label: '+500$', emoji: '💰', type: 'flat', value: 500, weight: 15 },
  { id: 'bonus1000', label: '+1000$', emoji: '💰', type: 'flat', value: 1000, weight: 10 },
  { id: 'bonus2500', label: '+2500$', emoji: '💎', type: 'flat', value: 2500, weight: 5 },
  { id: 'nochmal', label: 'NOCHMAL', emoji: '🔄', type: 'respin', value: 0, weight: 8 },
  { id: 'jackpot', label: 'JACKPOT', emoji: '🏆', type: 'jackpot', value: 0, weight: 2 },
  { id: 'item', label: 'ITEM', emoji: '📦', type: 'item', value: 0, weight: 7 },
  { id: 'dieb', label: 'DIEB', emoji: '🦹', type: 'steal', value: 0, weight: 7 },
];

const itemPrizes = [
  { name: 'Heiltrank', qty: 3, emoji: '🧪' },
  { name: 'Mana-Kristall', qty: 2, emoji: '🔮' },
  { name: 'Glücksbringer', qty: 1, emoji: '🍀' },
  { name: 'Magischer Stein', qty: 1, emoji: '💠' },
  { name: 'Goldbarren', qty: 1, emoji: '🪙' },
];

function ensureJackpotTable() {
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS wheel_jackpot (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      amount INTEGER DEFAULT 10000,
      last_won TEXT,
      times_won INTEGER DEFAULT 0
    )
  `);
  const existing = db.db.prepare('SELECT * FROM wheel_jackpot WHERE id = 1').get();
  if (!existing) {
    db.db.prepare('INSERT INTO wheel_jackpot (id, amount) VALUES (1, 10000)').run();
  }
}

function getJackpot() {
  return db.db.prepare('SELECT * FROM wheel_jackpot WHERE id = 1').get();
}

function addToJackpot(amount) {
  db.db.prepare('UPDATE wheel_jackpot SET amount = amount + ? WHERE id = 1').run(amount);
}

function resetJackpot(userId) {
  db.db.prepare('UPDATE wheel_jackpot SET amount = 10000, last_won = ?, times_won = times_won + 1 WHERE id = 1')
    .run(new Date().toISOString());
}

function spinWheel() {
  const totalWeight = sectors.reduce((s, sec) => s + sec.weight, 0);
  const roll = Math.random() * totalWeight;
  let cumulative = 0;
  for (const sec of sectors) {
    cumulative += sec.weight;
    if (roll < cumulative) return sec;
  }
  return sectors[0];
}

function buildWheelAnimation(result) {
  const display = sectors.slice(0, 8).map(s => s.emoji).join(' ');
  return `🎡 ${display}\n        ⬆️\n   ${result.emoji} **${result.label}**`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gluecksrad')
    .setDescription('Drehe das Glücksrad-Deluxe mit Jackpot! (2min CD)')
    .addIntegerOption(opt =>
      opt.setName('einsatz')
        .setDescription('Dein Einsatz')
        .setRequired(true)
        .setMinValue(100)
        .setMaxValue(25000)),
  async execute(interaction) {
    ensureJackpotTable();
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
    addToJackpot(Math.floor(bet * 0.1));

    let totalWinnings = 0;
    let spinsLeft = 1;
    let spinCount = 0;
    let gameOver = false;
    const spinResults = [];

    const doSpin = () => {
      const result = spinWheel();
      spinCount++;
      spinsLeft--;
      return result;
    };

    const processResult = (result) => {
      let text = '';

      switch (result.type) {
        case 'multiplier': {
          const win = bet * result.value;
          totalWinnings += win;
          text = `${result.emoji} **${result.label}** — +**${config.currencySymbol}${win.toLocaleString()}**!`;
          break;
        }
        case 'flat': {
          totalWinnings += result.value;
          text = `${result.emoji} **${result.label}** — +**${config.currencySymbol}${result.value.toLocaleString()}**!`;
          break;
        }
        case 'bankrupt': {
          totalWinnings = 0;
          text = `${result.emoji} **BANKROTT!** Alle Gewinne verloren! 💀`;
          break;
        }
        case 'respin': {
          spinsLeft += 2;
          text = `${result.emoji} **NOCHMAL!** +2 Extra-Drehungen!`;
          break;
        }
        case 'jackpot': {
          const jp = getJackpot();
          totalWinnings += jp.amount;
          text = `${result.emoji} **🏆 JACKPOT! +${config.currencySymbol}${jp.amount.toLocaleString()}!** 🏆`;
          resetJackpot(userId);
          break;
        }
        case 'item': {
          const prize = itemPrizes[Math.floor(Math.random() * itemPrizes.length)];
          db.addToInventory(userId, prize.name, prize.qty);
          text = `${result.emoji} **ITEM!** ${prize.emoji} ${prize.qty}x ${prize.name}!`;
          break;
        }
        case 'steal': {
          const stolen = Math.floor(bet * 0.5 + Math.random() * bet);
          totalWinnings += stolen;
          text = `${result.emoji} **DIEB!** Du stiehlst **${config.currencySymbol}${stolen.toLocaleString()}**!`;
          break;
        }
      }

      spinResults.push(text);
      return text;
    };

    const buildEmbed = (currentResult = null) => {
      const jp = getJackpot();
      return new EmbedBuilder()
        .setColor(gameOver ? (totalWinnings > 0 ? '#FFD700' : '#e74c3c') : '#9b59b6')
        .setTitle('🎡 Glücksrad Deluxe')
        .setDescription(
          `💰 Einsatz: **${config.currencySymbol}${bet.toLocaleString()}**\n` +
          `🏆 Jackpot: **${config.currencySymbol}${jp.amount.toLocaleString()}**\n` +
          `🔄 Drehungen: **${spinCount}** | Übrig: **${spinsLeft}**\n\n` +
          (currentResult ? `${buildWheelAnimation(currentResult)}\n\n` : '') +
          (spinResults.length > 0 ? `**Ergebnisse:**\n${spinResults.slice(-5).join('\n')}\n\n` : '') +
          `💰 Bisheriger Gewinn: **${config.currencySymbol}${totalWinnings.toLocaleString()}**`
        )
        .setFooter({ text: '10% jedes Einsatzes fließt in den Jackpot' })
        .setTimestamp();
    };

    const buildButtons = () => {
      return [new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`gr_spin_${userId}`)
          .setLabel(`🎡 Drehen (${spinsLeft} übrig)`)
          .setStyle(ButtonStyle.Primary)
          .setDisabled(spinsLeft <= 0),
        new ButtonBuilder()
          .setCustomId(`gr_take_${userId}`)
          .setLabel(`💰 Mitnehmen (${totalWinnings}$)`)
          .setStyle(ButtonStyle.Success)
          .setDisabled(totalWinnings <= 0),
      )];
    };

    const result = doSpin();
    processResult(result);

    if (spinsLeft <= 0 && result.type !== 'respin') {
      gameOver = true;
      if (totalWinnings > 0) db.updateBalance(userId, totalWinnings);

      const net = totalWinnings - bet;
      const embed = new EmbedBuilder()
        .setColor(totalWinnings > 0 ? '#FFD700' : '#e74c3c')
        .setTitle(totalWinnings > 0 ? '🎡 Gewonnen!' : '🎡 Verloren!')
        .setDescription(
          `${buildWheelAnimation(result)}\n\n` +
          `${spinResults.join('\n')}\n\n` +
          (totalWinnings > 0
            ? `💰 Gewinn: **+${config.currencySymbol}${totalWinnings.toLocaleString()}** (${net >= 0 ? '+' : ''}${config.currencySymbol}${net.toLocaleString()} netto)`
            : `💸 Verlust: **-${config.currencySymbol}${bet.toLocaleString()}**`)
        )
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed], components: [] });
    }

    const msg = await interaction.reply({ embeds: [buildEmbed(result)], components: buildButtons(), fetchReply: true });
    const collector = msg.createMessageComponentCollector({ time: 30000 });

    collector.on('collect', (btnInteraction) => {
      if (btnInteraction.user.id !== userId) {
        return btnInteraction.reply({ content: '❌ Das ist nicht dein Glücksrad!', flags: 64 });
      }
      if (gameOver) return;

      const action = btnInteraction.customId.split('_')[1];

      if (action === 'take') {
        gameOver = true;
        collector.stop('taken');
        db.updateBalance(userId, totalWinnings);

        const net = totalWinnings - bet;
        const embed = new EmbedBuilder()
          .setColor('#2ecc71')
          .setTitle('🎡 Gewinn mitgenommen!')
          .setDescription(
            `${spinResults.join('\n')}\n\n` +
            `💰 Gewinn: **+${config.currencySymbol}${totalWinnings.toLocaleString()}** (${net >= 0 ? '+' : ''}${config.currencySymbol}${net.toLocaleString()} netto)`
          )
          .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
          .setTimestamp();
        btnInteraction.update({ embeds: [embed], components: [] });
        return;
      }

      if (action === 'spin') {
        const spinResult = doSpin();
        processResult(spinResult);

        if (spinResult.type === 'bankrupt') {
          gameOver = true;
          collector.stop('bankrupt');

          const embed = new EmbedBuilder()
            .setColor('#e74c3c')
            .setTitle('💀 BANKROTT!')
            .setDescription(
              `${buildWheelAnimation(spinResult)}\n\n` +
              `${spinResults.join('\n')}\n\n` +
              `💸 Alle Gewinne verloren! Verlust: **-${config.currencySymbol}${bet.toLocaleString()}**`
            )
            .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
            .setTimestamp();
          btnInteraction.update({ embeds: [embed], components: [] });
          return;
        }

        if (spinsLeft <= 0) {
          gameOver = true;
          collector.stop('done');
          if (totalWinnings > 0) db.updateBalance(userId, totalWinnings);

          const net = totalWinnings - bet;
          const embed = new EmbedBuilder()
            .setColor(totalWinnings > 0 ? '#FFD700' : '#e74c3c')
            .setTitle(totalWinnings > 0 ? '🎡 Alle Drehungen vorbei!' : '🎡 Verloren!')
            .setDescription(
              `${buildWheelAnimation(spinResult)}\n\n` +
              `${spinResults.join('\n')}\n\n` +
              (totalWinnings > 0
                ? `💰 Gewinn: **+${config.currencySymbol}${totalWinnings.toLocaleString()}** (${net >= 0 ? '+' : ''}${config.currencySymbol}${net.toLocaleString()} netto)`
                : `💸 Verlust: **-${config.currencySymbol}${bet.toLocaleString()}**`)
            )
            .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
            .setTimestamp();
          btnInteraction.update({ embeds: [embed], components: [] });
          return;
        }

        collector.resetTimer({ time: 30000 });
        btnInteraction.update({ embeds: [buildEmbed(spinResult)], components: buildButtons() });
      }
    });

    collector.on('end', (_, reason) => {
      if (reason === 'time' && !gameOver) {
        gameOver = true;
        if (totalWinnings > 0) db.updateBalance(userId, totalWinnings);

        const embed = new EmbedBuilder()
          .setColor('#f39c12')
          .setTitle('⏰ Glücksrad — Zeit abgelaufen')
          .setDescription(
            totalWinnings > 0
              ? `💰 Gewinn ausbezahlt: **+${config.currencySymbol}${totalWinnings.toLocaleString()}**`
              : `💸 Verlust: **-${config.currencySymbol}${bet.toLocaleString()}**`
          )
          .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
          .setTimestamp();
        msg.edit({ embeds: [embed], components: [] });
      }
    });
  },
};
