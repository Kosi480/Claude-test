const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const COOLDOWN = 60 * 1000;
const cooldowns = new Map();

const diceEmojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

const hands = [
  { name: 'Fünfling', check: d => d.some(v => d.filter(x => x === v).length === 5), mult: 10 },
  { name: 'Große Straße', check: d => { const s = [...new Set(d)].sort((a,b) => a-b); return s.length === 5 && s[4] - s[0] === 4; }, mult: 8 },
  { name: 'Kleine Straße', check: d => { const s = [...new Set(d)].sort((a,b) => a-b).join(''); return s.includes('1234') || s.includes('2345') || s.includes('3456'); }, mult: 5 },
  { name: 'Full House', check: d => { const c = {}; d.forEach(v => c[v] = (c[v]||0)+1); const v = Object.values(c).sort(); return v.length === 2 && v[0] === 2 && v[1] === 3; }, mult: 6 },
  { name: 'Vierling', check: d => d.some(v => d.filter(x => x === v).length === 4), mult: 7 },
  { name: 'Drilling', check: d => d.some(v => d.filter(x => x === v).length === 3), mult: 3 },
  { name: 'Zwei Paare', check: d => { const c = {}; d.forEach(v => c[v] = (c[v]||0)+1); return Object.values(c).filter(v => v >= 2).length >= 2; }, mult: 2 },
  { name: 'Ein Paar', check: d => d.some(v => d.filter(x => x === v).length === 2), mult: 1.5 },
];

function rollDice(count) {
  return Array.from({ length: count }, () => 1 + Math.floor(Math.random() * 6));
}

function evaluateHand(dice) {
  for (const hand of hands) {
    if (hand.check(dice)) return hand;
  }
  return { name: 'Nichts', mult: 0 };
}

function displayDice(dice, held = []) {
  return dice.map((d, i) => {
    const emoji = diceEmojis[d - 1];
    return held.includes(i) ? `[${emoji}]` : emoji;
  }).join(' ');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('wuerfelpoker')
    .setDescription('Würfelpoker — halte die besten Würfel! (1min CD)')
    .addIntegerOption(opt =>
      opt.setName('einsatz')
        .setDescription('Dein Einsatz')
        .setRequired(true)
        .setMinValue(50)
        .setMaxValue(50000)),
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

    let dice = rollDice(5);
    let held = [];
    let rollsLeft = 2;
    let gameOver = false;

    const buildEmbed = (extra = '') => {
      const hand = evaluateHand(dice);
      return new EmbedBuilder()
        .setColor(rollsLeft === 0 ? (hand.mult > 0 ? '#FFD700' : '#e74c3c') : '#3498db')
        .setTitle('🎲 Würfelpoker')
        .setDescription(
          `**Einsatz:** ${config.currencySymbol}${bet.toLocaleString()}\n\n` +
          `🎲 ${displayDice(dice, held)}\n\n` +
          `📊 Aktuelle Hand: **${hand.name}** (${hand.mult > 0 ? `x${hand.mult}` : '---'})\n` +
          `🔄 Würfe übrig: **${rollsLeft}**\n` +
          (held.length > 0 ? `🔒 Gehalten: ${held.map(i => diceEmojis[dice[i] - 1]).join(' ')}\n` : '') +
          extra +
          `\n\n**Kombinationen:**\n` +
          `⚅⚅⚅⚅⚅ Fünfling x10 | 🔢 Gr.Straße x8\n` +
          `⚄⚄⚄⚄ Vierling x7 | ⚃⚃⚃⚁⚁ Full House x6\n` +
          `🔢 Kl.Straße x5 | ⚂⚂⚂ Drilling x3\n` +
          `⚁⚁⚀⚀ 2 Paare x2 | ⚅⚅ Paar x1.5`
        )
        .setFooter({ text: 'Klicke Würfel zum Halten, dann Würfeln!' })
        .setTimestamp();
    };

    const buildButtons = () => {
      const row1 = new ActionRowBuilder().addComponents(
        ...dice.map((d, i) =>
          new ButtonBuilder()
            .setCustomId(`wp_d${i}_${userId}`)
            .setLabel(`${d}`)
            .setEmoji(diceEmojis[d - 1])
            .setStyle(held.includes(i) ? ButtonStyle.Success : ButtonStyle.Secondary)
        )
      );
      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`wp_roll_${userId}`)
          .setLabel(`🎲 Würfeln (${rollsLeft} übrig)`)
          .setStyle(ButtonStyle.Primary)
          .setDisabled(rollsLeft <= 0),
        new ButtonBuilder()
          .setCustomId(`wp_stand_${userId}`)
          .setLabel('✅ Stehen bleiben')
          .setStyle(ButtonStyle.Danger),
      );
      return [row1, row2];
    };

    const finishGame = (btnInteraction) => {
      gameOver = true;
      const hand = evaluateHand(dice);
      const winnings = Math.floor(bet * hand.mult);

      if (winnings > 0) {
        db.updateBalance(userId, winnings);
      }

      const net = winnings - bet;
      const embed = new EmbedBuilder()
        .setColor(winnings > 0 ? '#FFD700' : '#e74c3c')
        .setTitle(winnings > 0 ? '🎲 Gewonnen!' : '🎲 Verloren!')
        .setDescription(
          `🎲 ${displayDice(dice)}\n\n` +
          `📊 Hand: **${hand.name}** (x${hand.mult})\n\n` +
          `💰 Einsatz: **${config.currencySymbol}${bet.toLocaleString()}**\n` +
          (winnings > 0
            ? `🏆 Gewinn: **${config.currencySymbol}${winnings.toLocaleString()}** (${net > 0 ? '+' : ''}${config.currencySymbol}${net.toLocaleString()})`
            : `💸 Verlust: **-${config.currencySymbol}${bet.toLocaleString()}**`)
        )
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();
      btnInteraction.update({ embeds: [embed], components: [] });
    };

    const msg = await interaction.reply({ embeds: [buildEmbed()], components: buildButtons(), fetchReply: true });
    const collector = msg.createMessageComponentCollector({ time: 30000 });

    collector.on('collect', (btnInteraction) => {
      if (btnInteraction.user.id !== userId) {
        return btnInteraction.reply({ content: '❌ Das ist nicht dein Spiel!', flags: 64 });
      }
      if (gameOver) return;

      const parts = btnInteraction.customId.split('_');
      const action = parts[1];

      if (action.startsWith('d')) {
        const idx = parseInt(action[1]);
        if (held.includes(idx)) {
          held = held.filter(i => i !== idx);
        } else {
          held.push(idx);
        }
        btnInteraction.update({ embeds: [buildEmbed()], components: buildButtons() });
        return;
      }

      if (action === 'roll') {
        for (let i = 0; i < 5; i++) {
          if (!held.includes(i)) {
            dice[i] = 1 + Math.floor(Math.random() * 6);
          }
        }
        rollsLeft--;

        if (rollsLeft <= 0) {
          collector.stop('done');
          finishGame(btnInteraction);
          return;
        }

        collector.resetTimer({ time: 30000 });
        btnInteraction.update({ embeds: [buildEmbed()], components: buildButtons() });
        return;
      }

      if (action === 'stand') {
        collector.stop('stand');
        finishGame(btnInteraction);
      }
    });

    collector.on('end', (_, reason) => {
      if (reason === 'time' && !gameOver) {
        gameOver = true;
        const hand = evaluateHand(dice);
        const winnings = Math.floor(bet * hand.mult);
        if (winnings > 0) db.updateBalance(userId, winnings);

        const embed = new EmbedBuilder()
          .setColor('#f39c12')
          .setTitle('⏰ Zeit abgelaufen!')
          .setDescription(
            `🎲 ${displayDice(dice)}\n\n` +
            `📊 Hand: **${hand.name}** (x${hand.mult})\n` +
            (winnings > 0
              ? `💰 Gewinn: **${config.currencySymbol}${winnings.toLocaleString()}**`
              : `💸 Verlust: **-${config.currencySymbol}${bet.toLocaleString()}**`)
          )
          .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
          .setTimestamp();
        msg.edit({ embeds: [embed], components: [] });
      }
    });
  },
};
