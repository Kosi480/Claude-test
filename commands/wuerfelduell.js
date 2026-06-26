const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const COOLDOWN = 2 * 60 * 1000;
const cooldowns = new Map();

const diceFaces = [
  { value: 1, emoji: '⚀', name: 'Eins' },
  { value: 2, emoji: '⚁', name: 'Zwei' },
  { value: 3, emoji: '⚂', name: 'Drei' },
  { value: 4, emoji: '⚃', name: 'Vier' },
  { value: 5, emoji: '⚄', name: 'Fünf' },
  { value: 6, emoji: '⚅', name: 'Sechs' },
];

const specialRolls = [
  { name: 'Pasch', check: (d) => d[0] === d[1] && d[1] === d[2], multiplier: 3, emoji: '🎯' },
  { name: 'Straße', check: (d) => { const s = [...d].sort((a,b) => a-b); return s[2]-s[1]===1 && s[1]-s[0]===1; }, multiplier: 2, emoji: '📈' },
  { name: 'Doppel', check: (d) => d[0]===d[1] || d[1]===d[2] || d[0]===d[2], multiplier: 1.5, emoji: '✌️' },
];

function rollDice(count = 3) {
  const results = [];
  for (let i = 0; i < count; i++) {
    results.push(1 + Math.floor(Math.random() * 6));
  }
  return results;
}

function getDiceEmoji(values) {
  return values.map(v => diceFaces[v - 1].emoji).join(' ');
}

function getSum(values) {
  return values.reduce((s, v) => s + v, 0);
}

function checkSpecial(values) {
  for (const special of specialRolls) {
    if (special.check(values)) return special;
  }
  return null;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('wuerfelduell')
    .setDescription('Würfelduell — Fordere jemanden zu einem Würfelduell heraus!')
    .addUserOption(opt =>
      opt.setName('gegner')
        .setDescription('Gegen wen?')
        .setRequired(true))
    .addIntegerOption(opt =>
      opt.setName('einsatz')
        .setDescription('Einsatz pro Spieler')
        .setRequired(true)
        .setMinValue(50)
        .setMaxValue(25000)),
  async execute(interaction) {
    const userId = interaction.user.id;
    const config = require('../config.json');

    const lastPlay = cooldowns.get(userId);
    if (lastPlay && Date.now() - lastPlay < COOLDOWN) {
      const remaining = Math.ceil((COOLDOWN - (Date.now() - lastPlay)) / 1000);
      return interaction.reply(`⏳ Nächstes Duell in **${remaining}s**!`);
    }

    const target = interaction.options.getUser('gegner');
    if (target.id === userId) return interaction.reply('❌ Du kannst nicht gegen dich selbst spielen!');
    if (target.bot) return interaction.reply('❌ Bots können nicht würfeln!');

    const bet = interaction.options.getInteger('einsatz');
    if (db.getBalance(userId) < bet) {
      return interaction.reply(`❌ Du brauchst **${config.currencySymbol}${bet.toLocaleString()}**!`);
    }

    const challengeEmbed = new EmbedBuilder()
      .setColor('#e67e22')
      .setTitle('🎲 Würfelduell — Herausforderung!')
      .setDescription(
        `**${interaction.user.username}** fordert **${target.username}** heraus!\n\n` +
        `💰 Einsatz: **${config.currencySymbol}${bet.toLocaleString()}** pro Spieler\n` +
        `🏆 Gewinner bekommt: **${config.currencySymbol}${(bet * 2).toLocaleString()}**\n\n` +
        `Jeder würfelt 3 Würfel über 3 Runden.\n` +
        `Spezialwürfe geben Bonus-Multiplikatoren!\n\n` +
        `🎯 Dreier-Pasch: **x3** | 📈 Straße: **x2** | ✌️ Doppel: **x1.5**`
      )
      .setTimestamp();

    const challengeRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`wd_accept_${target.id}_${userId}_${bet}`)
        .setLabel('✅ Annehmen')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`wd_decline_${target.id}`)
        .setLabel('❌ Ablehnen')
        .setStyle(ButtonStyle.Danger)
    );

    const msg = await interaction.reply({ embeds: [challengeEmbed], components: [challengeRow], fetchReply: true });
    const acceptCollector = msg.createMessageComponentCollector({ time: 30000 });

    let accepted = false;

    acceptCollector.on('collect', (btn) => {
      if (btn.customId.startsWith('wd_decline')) {
        if (btn.user.id !== target.id) return btn.reply({ content: '❌ Nur der Herausgeforderte kann ablehnen!', flags: 64 });
        acceptCollector.stop('declined');
        const declineEmbed = new EmbedBuilder()
          .setColor('#e74c3c')
          .setTitle('🎲 Würfelduell abgelehnt!')
          .setDescription(`**${target.username}** hat die Herausforderung abgelehnt.`)
          .setTimestamp();
        btn.update({ embeds: [declineEmbed], components: [] });
        return;
      }

      if (!btn.customId.startsWith('wd_accept')) return;
      if (btn.user.id !== target.id) return btn.reply({ content: '❌ Nur der Herausgeforderte kann annehmen!', flags: 64 });

      if (db.getBalance(target.id) < bet) {
        btn.reply({ content: `❌ Du brauchst **${config.currencySymbol}${bet.toLocaleString()}**!`, flags: 64 });
        return;
      }

      accepted = true;
      acceptCollector.stop('accepted');

      cooldowns.set(userId, Date.now());
      cooldowns.set(target.id, Date.now());
      db.updateBalance(userId, -bet);
      db.updateBalance(target.id, -bet);

      const players = [
        { id: userId, name: interaction.user.username, totalScore: 0, rounds: [] },
        { id: target.id, name: target.username, totalScore: 0, rounds: [] },
      ];

      let currentRound = 0;
      const maxRounds = 3;
      let currentPlayer = 0;
      let gameOver = false;

      const buildGameEmbed = (extraText = '') => {
        const scoreboard = players.map(p => {
          const roundTexts = p.rounds.map((r, i) =>
            `R${i + 1}: ${getDiceEmoji(r.dice)} = ${r.score}${r.special ? ` ${r.special.emoji} x${r.special.multiplier}` : ''} → **${r.finalScore}**`
          );
          return `**${p.name}** — Gesamt: **${p.totalScore}**\n${roundTexts.join('\n') || '_Noch keine Würfe_'}`;
        });

        return new EmbedBuilder()
          .setColor('#3498db')
          .setTitle(`🎲 Würfelduell — Runde ${Math.min(currentRound + 1, maxRounds)}/${maxRounds}`)
          .setDescription(
            `💰 Pot: **${config.currencySymbol}${(bet * 2).toLocaleString()}**\n\n` +
            scoreboard.join('\n\n') +
            (extraText ? `\n\n${extraText}` : '') +
            (!gameOver ? `\n\n🎲 **${players[currentPlayer].name}** ist dran!` : '')
          )
          .setTimestamp();
      };

      const buildRollButton = () => {
        return [new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`wd_roll_${players[currentPlayer].id}`)
            .setLabel('🎲 Würfeln!')
            .setStyle(ButtonStyle.Primary)
        )];
      };

      btn.update({ embeds: [buildGameEmbed()], components: buildRollButton() });

      const gameCollector = msg.createMessageComponentCollector({ time: 120000 });

      gameCollector.on('collect', (rollBtn) => {
        if (gameOver) return;
        if (rollBtn.user.id !== players[currentPlayer].id) {
          return rollBtn.reply({ content: `❌ **${players[currentPlayer].name}** ist dran!`, flags: 64 });
        }

        const dice = rollDice(3);
        const sum = getSum(dice);
        const special = checkSpecial(dice);
        const finalScore = special ? Math.floor(sum * special.multiplier) : sum;

        players[currentPlayer].rounds.push({ dice, score: sum, special, finalScore });
        players[currentPlayer].totalScore += finalScore;

        let roundText = `${getDiceEmoji(dice)} = **${sum}**`;
        if (special) {
          roundText += ` ${special.emoji} **${special.name}!** x${special.multiplier} → **${finalScore}**`;
        }

        if (currentPlayer === 1) {
          currentRound++;
        }
        currentPlayer = 1 - currentPlayer;

        if (currentRound >= maxRounds && currentPlayer === 0) {
          gameOver = true;
          gameCollector.stop('done');

          const p1 = players[0];
          const p2 = players[1];
          let winnerId, winnerName, loserName;

          if (p1.totalScore > p2.totalScore) {
            winnerId = p1.id;
            winnerName = p1.name;
            loserName = p2.name;
          } else if (p2.totalScore > p1.totalScore) {
            winnerId = p2.id;
            winnerName = p2.name;
            loserName = p1.name;
          } else {
            db.updateBalance(p1.id, bet);
            db.updateBalance(p2.id, bet);

            const tieEmbed = buildGameEmbed(`\n🤝 **UNENTSCHIEDEN!** Beide erhalten ihren Einsatz zurück.`);
            tieEmbed.setColor('#f39c12');
            tieEmbed.setTitle('🎲 Würfelduell — Unentschieden!');
            rollBtn.update({ embeds: [tieEmbed], components: [] });
            return;
          }

          const prize = bet * 2;
          db.updateBalance(winnerId, prize);

          const finalEmbed = buildGameEmbed(`\n🏆 **${winnerName} gewinnt ${config.currencySymbol}${prize.toLocaleString()}!**`);
          finalEmbed.setColor('#FFD700');
          finalEmbed.setTitle(`🎲 ${winnerName} gewinnt das Würfelduell!`);
          finalEmbed.setFooter({ text: `${winnerName}: ${config.currencySymbol}${db.getBalance(winnerId).toLocaleString()}` });
          rollBtn.update({ embeds: [finalEmbed], components: [] });
          return;
        }

        gameCollector.resetTimer({ time: 120000 });
        rollBtn.update({ embeds: [buildGameEmbed(roundText)], components: buildRollButton() });
      });

      gameCollector.on('end', (_, reason) => {
        if (reason === 'time' && !gameOver) {
          gameOver = true;
          db.updateBalance(players[0].id, bet);
          db.updateBalance(players[1].id, bet);

          const timeoutEmbed = new EmbedBuilder()
            .setColor('#f39c12')
            .setTitle('⏰ Würfelduell — Zeit abgelaufen!')
            .setDescription('Einsätze wurden zurückerstattet.')
            .setTimestamp();
          msg.edit({ embeds: [timeoutEmbed], components: [] });
        }
      });
    });

    acceptCollector.on('end', (_, reason) => {
      if (reason === 'time' && !accepted) {
        const timeoutEmbed = new EmbedBuilder()
          .setColor('#95a5a6')
          .setTitle('🎲 Würfelduell — Keine Antwort')
          .setDescription(`**${target.username}** hat nicht rechtzeitig geantwortet.`)
          .setTimestamp();
        msg.edit({ embeds: [timeoutEmbed], components: [] });
      }
    });
  },
};
