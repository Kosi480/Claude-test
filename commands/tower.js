const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database');

const MAX_FLOORS = 10;
const COOLDOWN = 40 * 1000;
const cooldowns = new Map();

const floors = [
  { name: 'Erdgeschoss', emoji: '🏠', chance: 0.90, multiplier: 1.2 },
  { name: '1. Stock', emoji: '🪜', chance: 0.85, multiplier: 1.5 },
  { name: '2. Stock', emoji: '🏗️', chance: 0.80, multiplier: 1.9 },
  { name: '3. Stock', emoji: '🏢', chance: 0.75, multiplier: 2.5 },
  { name: '4. Stock', emoji: '🏬', chance: 0.68, multiplier: 3.2 },
  { name: '5. Stock', emoji: '🏙️', chance: 0.60, multiplier: 4.5 },
  { name: '6. Stock', emoji: '⛅', chance: 0.50, multiplier: 6.0 },
  { name: '7. Stock', emoji: '☁️', chance: 0.40, multiplier: 9.0 },
  { name: '8. Stock', emoji: '✈️', chance: 0.30, multiplier: 15.0 },
  { name: '9. Stock', emoji: '🚀', chance: 0.20, multiplier: 30.0 },
];

module.exports = {
  name: 'tower',
  aliases: ['turm', 'climb', 'klettern'],
  description: 'Erklimme den Turm — je höher, desto mehr Gewinn! (!tower <Betrag>, 40s CD)',
  execute(message, args) {
    const userId = message.author.id;
    const config = require('../config.json');

    if (!args[0]) return message.reply(`❌ Nutzung: \`${config.prefix}tower <Betrag>\``);

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

    let currentFloor = -1;
    let gameOver = false;

    const buildTower = (fell = false) => {
      let tower = '';
      for (let i = floors.length - 1; i >= 0; i--) {
        const f = floors[i];
        let line;
        if (i === currentFloor && fell) {
          line = `${f.emoji} **${f.name}** — 💀 GEFALLEN!`;
        } else if (i === currentFloor) {
          line = `${f.emoji} **${f.name}** ◀ DU (${f.multiplier}x)`;
        } else if (i < currentFloor) {
          line = `✅ ~~${f.name}~~ — ${f.multiplier}x`;
        } else {
          line = `${f.emoji} ${f.name} — ${f.multiplier}x (${Math.floor(f.chance * 100)}%)`;
        }
        tower += line + '\n';
      }
      return tower;
    };

    const buildButtons = () => {
      const nextFloor = currentFloor + 1;
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`tower_climb_${userId}`)
          .setLabel(`⬆️ ${floors[nextFloor].name} (${Math.floor(floors[nextFloor].chance * 100)}%)`)
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`tower_cash_${userId}`)
          .setLabel(`💰 Auscashen${currentFloor >= 0 ? ` (${floors[currentFloor].multiplier}x)` : ''}`)
          .setStyle(ButtonStyle.Success)
          .setDisabled(currentFloor < 0)
      );
      return [row];
    };

    const embed = new EmbedBuilder()
      .setColor('#9b59b6')
      .setTitle('🗼 Turm-Aufstieg')
      .setDescription(
        `Einsatz: **${config.currencySymbol}${amount.toLocaleString()}**\n\n` +
        `${buildTower()}\n` +
        `Klettere höher für mehr Gewinn — aber fall nicht!`
      )
      .setFooter({ text: '30s Zeit pro Entscheidung' })
      .setTimestamp();

    message.reply({ embeds: [embed], components: buildButtons() }).then(msg => {
      const collector = msg.createMessageComponentCollector({ time: 30000 });

      collector.on('collect', (interaction) => {
        if (interaction.user.id !== userId) {
          return interaction.reply({ content: '❌ Das ist nicht dein Turm!', flags: 64 });
        }
        if (gameOver) return;

        if (interaction.customId === `tower_cash_${userId}`) {
          gameOver = true;
          collector.stop('cashout');

          const mult = floors[currentFloor].multiplier;
          const winAmount = Math.floor(amount * mult);
          const profit = winAmount - amount;
          db.updateBalance(userId, profit);

          const embed = new EmbedBuilder()
            .setColor('#2ecc71')
            .setTitle('🗼 Ausgecasht!')
            .setDescription(
              `${buildTower()}\n` +
              `Ausgecasht auf **${floors[currentFloor].name}** — **${mult}x**\n` +
              `Gewinn: **+${config.currencySymbol}${profit.toLocaleString()}**`
            )
            .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
            .setTimestamp();

          interaction.update({ embeds: [embed], components: [] });
          return;
        }

        const nextFloor = currentFloor + 1;
        const success = Math.random() < floors[nextFloor].chance;

        if (success) {
          currentFloor = nextFloor;

          if (currentFloor >= floors.length - 1) {
            gameOver = true;
            collector.stop('top');

            const mult = floors[currentFloor].multiplier;
            const winAmount = Math.floor(amount * mult);
            const profit = winAmount - amount;
            db.updateBalance(userId, profit);

            const embed = new EmbedBuilder()
              .setColor('#FFD700')
              .setTitle('🏆 SPITZE ERREICHT!')
              .setDescription(
                `${buildTower()}\n` +
                `Du hast die Spitze erreicht! **${mult}x**!\n` +
                `Gewinn: **+${config.currencySymbol}${profit.toLocaleString()}**`
              )
              .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
              .setTimestamp();

            interaction.update({ embeds: [embed], components: [] });
            return;
          }

          collector.resetTimer({ time: 30000 });

          const embed = new EmbedBuilder()
            .setColor('#9b59b6')
            .setTitle('🗼 Turm-Aufstieg')
            .setDescription(
              `Einsatz: **${config.currencySymbol}${amount.toLocaleString()}**\n\n` +
              `${buildTower()}\n` +
              `Weiter klettern oder auscashen?`
            )
            .setFooter({ text: '30s Zeit pro Entscheidung' })
            .setTimestamp();

          interaction.update({ embeds: [embed], components: buildButtons() });
        } else {
          gameOver = true;
          currentFloor = nextFloor;
          collector.stop('fell');

          db.updateBalance(userId, -amount);

          const embed = new EmbedBuilder()
            .setColor('#e74c3c')
            .setTitle('💀 Abgestürzt!')
            .setDescription(
              `${buildTower(true)}\n` +
              `Du bist auf **${floors[nextFloor].name}** abgestürzt!\n` +
              `Verlust: **-${config.currencySymbol}${amount.toLocaleString()}**`
            )
            .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
            .setTimestamp();

          interaction.update({ embeds: [embed], components: [] });
        }
      });

      collector.on('end', (_, reason) => {
        if (reason === 'time' && !gameOver) {
          gameOver = true;
          if (currentFloor >= 0) {
            const mult = floors[currentFloor].multiplier;
            const winAmount = Math.floor(amount * mult);
            const profit = winAmount - amount;
            db.updateBalance(userId, profit);

            const embed = new EmbedBuilder()
              .setColor('#f39c12')
              .setTitle('⏰ Zeit abgelaufen — Auto-Cashout')
              .setDescription(
                `${buildTower()}\n` +
                `Automatisch ausgecasht auf **${floors[currentFloor].name}** — **${mult}x**\n` +
                `Gewinn: **+${config.currencySymbol}${profit.toLocaleString()}**`
              )
              .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
              .setTimestamp();

            msg.edit({ embeds: [embed], components: [] });
          } else {
            db.updateBalance(userId, -amount);
            const embed = new EmbedBuilder()
              .setColor('#e74c3c')
              .setTitle('⏰ Zeit abgelaufen')
              .setDescription(`Du hast nicht geklettert!\nVerlust: **-${config.currencySymbol}${amount.toLocaleString()}**`)
              .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
              .setTimestamp();

            msg.edit({ embeds: [embed], components: [] });
          }
        }
      });
    });
  },
};
