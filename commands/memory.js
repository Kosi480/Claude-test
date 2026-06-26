const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const COOLDOWN = 90 * 1000;
const cooldowns = new Map();
const GRID = 4;
const PAIRS = 8;

const cardEmojis = ['🍎', '🍊', '🍋', '🍇', '🌟', '💎', '🔥', '🎯'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('memory')
    .setDescription('Memory — finde alle Kartenpaare! (90s CD)'),
  async execute(interaction) {
    const userId = interaction.user.id;
    const config = require('../config.json');

    const lastPlay = cooldowns.get(userId);
    if (lastPlay && Date.now() - lastPlay < COOLDOWN) {
      const remaining = Math.ceil((COOLDOWN - (Date.now() - lastPlay)) / 1000);
      return interaction.reply(`⏳ Du musst noch **${remaining}s** warten!`);
    }

    cooldowns.set(userId, Date.now());

    const cards = [...cardEmojis, ...cardEmojis].sort(() => Math.random() - 0.5);
    const revealed = Array(GRID * GRID).fill(false);
    const matched = Array(GRID * GRID).fill(false);
    let firstPick = null;
    let pairsFound = 0;
    let moves = 0;
    let gameOver = false;
    let processing = false;

    const buildButtons = (showFirst = null) => {
      const rows = [];
      for (let r = 0; r < GRID; r++) {
        const row = new ActionRowBuilder();
        for (let c = 0; c < GRID; c++) {
          const idx = r * GRID + c;
          const isMatched = matched[idx];
          const isRevealed = idx === showFirst;

          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`mem_${idx}_${userId}`)
              .setLabel(isMatched || isRevealed ? cards[idx] : `${idx + 1}`)
              .setStyle(isMatched ? ButtonStyle.Success : isRevealed ? ButtonStyle.Primary : ButtonStyle.Secondary)
              .setDisabled(isMatched || processing)
          );
        }
        rows.push(row);
      }
      return rows;
    };

    const buildRevealButtons = (idx1, idx2, isMatch) => {
      const rows = [];
      for (let r = 0; r < GRID; r++) {
        const row = new ActionRowBuilder();
        for (let c = 0; c < GRID; c++) {
          const idx = r * GRID + c;
          const isMatched = matched[idx];
          const isShown = idx === idx1 || idx === idx2;

          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`mem_${idx}_${userId}`)
              .setLabel(isMatched || isShown ? cards[idx] : `${idx + 1}`)
              .setStyle(isMatched ? ButtonStyle.Success : isShown ? (isMatch ? ButtonStyle.Success : ButtonStyle.Danger) : ButtonStyle.Secondary)
              .setDisabled(true)
          );
        }
        rows.push(row);
      }
      return rows;
    };

    const buildEmbed = (extra = '') => {
      return new EmbedBuilder()
        .setColor(gameOver ? '#FFD700' : '#9b59b6')
        .setTitle('🃏 Memory')
        .setDescription(
          `Paare: **${pairsFound}/${PAIRS}** | Züge: **${moves}**\n` +
          (firstPick !== null ? `Erste Karte: **${cards[firstPick]}**\n` : '') +
          extra
        )
        .setFooter({ text: '60s Zeit | Finde alle 8 Paare!' })
        .setTimestamp();
    };

    const msg = await interaction.reply({ embeds: [buildEmbed()], components: buildButtons(), fetchReply: true });
    const collector = msg.createMessageComponentCollector({ time: 60000 });

    collector.on('collect', async (btnInteraction) => {
      if (btnInteraction.user.id !== userId) {
        return btnInteraction.reply({ content: '❌ Das ist nicht dein Spiel!', flags: 64 });
      }
      if (gameOver || processing) return;

      const idx = parseInt(btnInteraction.customId.split('_')[1]);
      if (matched[idx]) return;

      if (firstPick === null) {
        firstPick = idx;
        collector.resetTimer({ time: 60000 });
        await btnInteraction.update({ embeds: [buildEmbed()], components: buildButtons(idx) });
      } else {
        if (idx === firstPick) return;
        processing = true;
        moves++;

        const isMatch = cards[firstPick] === cards[idx];

        await btnInteraction.update({
          embeds: [buildEmbed(isMatch ? `✅ **${cards[idx]}** Paar gefunden!` : `❌ Kein Paar!`)],
          components: buildRevealButtons(firstPick, idx, isMatch),
        });

        if (isMatch) {
          matched[firstPick] = true;
          matched[idx] = true;
          pairsFound++;

          if (pairsFound >= PAIRS) {
            gameOver = true;
            collector.stop('won');

            let reward, tier;
            if (moves <= 12) { reward = 800; tier = 'Perfektes Gedächtnis!'; }
            else if (moves <= 16) { reward = 500; tier = 'Ausgezeichnet!'; }
            else if (moves <= 20) { reward = 300; tier = 'Gut gemacht!'; }
            else { reward = 150; tier = 'Geschafft!'; }

            db.updateBalance(userId, reward);

            setTimeout(() => {
              const embed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle(`🃏 Memory — ${tier}`)
                .setDescription(
                  `Alle **${PAIRS}** Paare in **${moves}** Zügen gefunden!\n\n` +
                  `Belohnung: **+${config.currencySymbol}${reward}**`
                )
                .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
                .setTimestamp();
              msg.edit({ embeds: [embed], components: [] });
            }, 1000);
            return;
          }
        }

        setTimeout(() => {
          firstPick = null;
          processing = false;
          collector.resetTimer({ time: 60000 });
          msg.edit({ embeds: [buildEmbed()], components: buildButtons() }).catch(() => {});
        }, 1500);
      }
    });

    collector.on('end', (_, reason) => {
      if (reason === 'time' && !gameOver) {
        gameOver = true;
        let reward = pairsFound * 30;
        if (reward > 0) db.updateBalance(userId, reward);

        const embed = new EmbedBuilder()
          .setColor('#f39c12')
          .setTitle('⏰ Memory — Zeit abgelaufen!')
          .setDescription(
            `**${pairsFound}/${PAIRS}** Paare in **${moves}** Zügen gefunden.\n\n` +
            (reward > 0 ? `Belohnung: **+${config.currencySymbol}${reward}**` : 'Keine Belohnung.')
          )
          .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
          .setTimestamp();
        msg.edit({ embeds: [embed], components: [] });
      }
    });
  },
};
