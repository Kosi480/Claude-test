const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database');

const COOLDOWN = 30 * 1000;
const cooldowns = new Map();

module.exports = {
  name: 'crash',
  aliases: ['rakete', 'rocket'],
  description: 'Crash-Spiel — Cashe aus bevor die Rakete abstürzt! (!crash <Betrag>, 30s CD)',
  execute(message, args) {
    const userId = message.author.id;
    const config = require('../config.json');

    if (!args[0]) return message.reply(`❌ Nutzung: \`${config.prefix}crash <Betrag>\``);

    const lastPlay = cooldowns.get(userId);
    if (lastPlay && Date.now() - lastPlay < COOLDOWN) {
      const remaining = Math.ceil((COOLDOWN - (Date.now() - lastPlay)) / 1000);
      return message.reply(`⏳ Du musst noch **${remaining}s** warten!`);
    }

    let amount;
    if (args[0] === 'all' || args[0] === 'alles') {
      amount = db.getBalance(userId);
    } else {
      amount = parseInt(args[0]);
    }

    if (!amount || amount <= 0) return message.reply('❌ Ungültiger Betrag!');
    if (amount > db.getBalance(userId)) return message.reply(`❌ Du hast nur **${config.currencySymbol}${db.getBalance(userId)}**!`);

    cooldowns.set(userId, Date.now());

    const crashPoint = generateCrashPoint();
    let currentMultiplier = 1.0;
    let crashed = false;
    let cashedOut = false;

    const buildEmbed = () => {
      const bar = buildBar(currentMultiplier, crashPoint);
      return new EmbedBuilder()
        .setColor(crashed ? '#e74c3c' : cashedOut ? '#2ecc71' : '#3498db')
        .setTitle('🚀 Crash')
        .setDescription(
          `Einsatz: **${config.currencySymbol}${amount.toLocaleString()}**\n\n` +
          `${bar}\n\n` +
          `Multiplikator: **${currentMultiplier.toFixed(2)}x**\n` +
          `Möglicher Gewinn: **${config.currencySymbol}${Math.floor(amount * currentMultiplier).toLocaleString()}**`
        )
        .setTimestamp();
    };

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`crash_out_${userId}`)
        .setLabel('💰 Auscashen!')
        .setStyle(ButtonStyle.Success)
    );

    message.reply({ embeds: [buildEmbed()], components: [row] }).then(msg => {
      const collector = msg.createMessageComponentCollector({ time: 30000 });

      collector.on('collect', (interaction) => {
        if (interaction.user.id !== userId) {
          return interaction.reply({ content: '❌ Das ist nicht dein Spiel!', flags: 64 });
        }

        if (crashed || cashedOut) return;

        cashedOut = true;
        collector.stop('cashout');

        const winAmount = Math.floor(amount * currentMultiplier);
        const profit = winAmount - amount;
        db.updateBalance(userId, profit);

        const embed = new EmbedBuilder()
          .setColor('#2ecc71')
          .setTitle('🚀 Ausgecasht!')
          .setDescription(
            `${buildBar(currentMultiplier, crashPoint)}\n\n` +
            `Ausgecasht bei **${currentMultiplier.toFixed(2)}x**!\n` +
            `Gewinn: **+${config.currencySymbol}${profit.toLocaleString()}**\n\n` +
            `Die Rakete wäre bei **${crashPoint.toFixed(2)}x** abgestürzt.`
          )
          .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
          .setTimestamp();

        interaction.update({ embeds: [embed], components: [] });
      });

      let tickCount = 0;
      const interval = setInterval(() => {
        if (cashedOut || crashed) {
          clearInterval(interval);
          return;
        }

        tickCount++;
        currentMultiplier = 1.0 + tickCount * 0.15;

        if (currentMultiplier >= crashPoint) {
          crashed = true;
          clearInterval(interval);
          collector.stop('crashed');

          db.updateBalance(userId, -amount);

          const embed = new EmbedBuilder()
            .setColor('#e74c3c')
            .setTitle('💥 Abgestürzt!')
            .setDescription(
              `${buildBar(crashPoint, crashPoint)}\n\n` +
              `Die Rakete ist bei **${crashPoint.toFixed(2)}x** abgestürzt!\n` +
              `Verlust: **-${config.currencySymbol}${amount.toLocaleString()}**`
            )
            .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
            .setTimestamp();

          msg.edit({ embeds: [embed], components: [] });
          return;
        }

        const embed = buildEmbed();
        msg.edit({ embeds: [embed], components: [row] }).catch(() => {});
      }, 1500);

      collector.on('end', (_, reason) => {
        clearInterval(interval);
        if (reason === 'time' && !cashedOut && !crashed) {
          crashed = true;
          db.updateBalance(userId, -amount);

          const embed = new EmbedBuilder()
            .setColor('#e74c3c')
            .setTitle('💥 Zeit abgelaufen!')
            .setDescription(
              `Du hast nicht rechtzeitig ausgecasht!\n` +
              `Verlust: **-${config.currencySymbol}${amount.toLocaleString()}**`
            )
            .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
            .setTimestamp();

          msg.edit({ embeds: [embed], components: [] });
        }
      });
    });
  },
};

function generateCrashPoint() {
  const r = Math.random();
  if (r < 0.03) return 1.0;
  return 1.0 + (-1 / Math.log(1 - r)) * 0.5;
}

function buildBar(current, max) {
  const steps = Math.min(Math.floor((current - 1) * 5), 15);
  const rocketTrail = '▓'.repeat(steps);
  const empty = '░'.repeat(Math.max(15 - steps, 0));
  return `\`${rocketTrail}🚀${empty}\` ${current.toFixed(2)}x`;
}
