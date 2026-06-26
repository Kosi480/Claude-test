const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const COOLDOWN = 2 * 60 * 1000;
const cooldowns = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('wette')
    .setDescription('Erstelle eine Wette und lass andere darauf setzen! (2min CD)')
    .addStringOption(opt => opt.setName('frage').setDescription('Die Wettfrage').setRequired(true))
    .addStringOption(opt => opt.setName('option1').setDescription('Erste Option').setRequired(true))
    .addStringOption(opt => opt.setName('option2').setDescription('Zweite Option').setRequired(true))
    .addStringOption(opt => opt.setName('betrag').setDescription('Mindesteinsatz').setRequired(true)),
  async execute(interaction) {
    const userId = interaction.user.id;
    const config = require('../config.json');

    const lastPlay = cooldowns.get(userId);
    if (lastPlay && Date.now() - lastPlay < COOLDOWN) {
      const remaining = Math.ceil((COOLDOWN - (Date.now() - lastPlay)) / 1000);
      return interaction.reply(`⏳ Du musst noch **${remaining}s** warten!`);
    }

    const question = interaction.options.getString('frage');
    const option1 = interaction.options.getString('option1');
    const option2 = interaction.options.getString('option2');
    const betragStr = interaction.options.getString('betrag');
    const minBet = parseInt(betragStr);

    if (!minBet || minBet < 50) return interaction.reply('❌ Mindesteinsatz muss mindestens **50** sein!');
    if (question.length > 200) return interaction.reply('❌ Frage zu lang (max 200 Zeichen)!');

    cooldowns.set(userId, Date.now());

    const bets = { 1: new Map(), 2: new Map() };
    let resolved = false;

    const getTotals = () => {
      let total1 = 0, total2 = 0;
      for (const [, amt] of bets[1]) total1 += amt;
      for (const [, amt] of bets[2]) total2 += amt;
      return { total1, total2, count1: bets[1].size, count2: bets[2].size };
    };

    const buildEmbed = () => {
      const { total1, total2, count1, count2 } = getTotals();
      const totalPool = total1 + total2;

      return new EmbedBuilder()
        .setColor('#e67e22')
        .setTitle('🎰 Wette!')
        .setDescription(
          `**${question}**\n\n` +
          `von **${interaction.user.username}** erstellt\n` +
          `Mindesteinsatz: **${config.currencySymbol}${minBet}**\n\n` +
          `**1️⃣ ${option1}**\n` +
          `Wetter: **${count1}** | Pool: **${config.currencySymbol}${total1.toLocaleString()}**\n\n` +
          `**2️⃣ ${option2}**\n` +
          `Wetter: **${count2}** | Pool: **${config.currencySymbol}${total2.toLocaleString()}**\n\n` +
          `💰 Gesamtpool: **${config.currencySymbol}${totalPool.toLocaleString()}**`
        )
        .setFooter({ text: '60s zum Wetten | Ersteller löst auf' })
        .setTimestamp();
    };

    const buildBetButtons = () => {
      return [new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`wette_1_${userId}`)
          .setLabel(`1️⃣ ${option1}`)
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`wette_2_${userId}`)
          .setLabel(`2️⃣ ${option2}`)
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`wette_close_${userId}`)
          .setLabel('🔒 Wetten schließen')
          .setStyle(ButtonStyle.Danger),
      )];
    };

    const buildResolveButtons = () => {
      return [new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`wette_win1_${userId}`)
          .setLabel(`✅ ${option1} gewinnt`)
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`wette_win2_${userId}`)
          .setLabel(`✅ ${option2} gewinnt`)
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`wette_cancel_${userId}`)
          .setLabel('❌ Abbrechen')
          .setStyle(ButtonStyle.Danger),
      )];
    };

    const msg = await interaction.reply({ embeds: [buildEmbed()], components: buildBetButtons(), fetchReply: true });
    const collector = msg.createMessageComponentCollector({ time: 120000 });

    let bettingOpen = true;

    collector.on('collect', async (btnInteraction) => {
      if (resolved) return;

      const action = btnInteraction.customId.split('_')[1];

      if (action === '1' || action === '2') {
        if (!bettingOpen) {
          return btnInteraction.reply({ content: '❌ Wetten sind geschlossen!', flags: 64 });
        }
        if (btnInteraction.user.id === userId) {
          return btnInteraction.reply({ content: '❌ Du kannst nicht auf deine eigene Wette setzen!', flags: 64 });
        }

        const side = parseInt(action);
        const otherSide = side === 1 ? 2 : 1;
        if (bets[otherSide].has(btnInteraction.user.id)) {
          return btnInteraction.reply({ content: '❌ Du hast schon auf die andere Seite gesetzt!', flags: 64 });
        }

        const currentBet = bets[side].get(btnInteraction.user.id) || 0;
        if (currentBet > 0) {
          return btnInteraction.reply({ content: '❌ Du hast hier schon gesetzt!', flags: 64 });
        }

        if (db.getBalance(btnInteraction.user.id) < minBet) {
          return btnInteraction.reply({ content: `❌ Du brauchst mindestens **${config.currencySymbol}${minBet}**!`, flags: 64 });
        }

        db.updateBalance(btnInteraction.user.id, -minBet);
        bets[side].set(btnInteraction.user.id, minBet);

        await btnInteraction.reply({ content: `✅ **${config.currencySymbol}${minBet}** auf **${side === 1 ? option1 : option2}** gesetzt!`, flags: 64 });
        msg.edit({ embeds: [buildEmbed()] }).catch(() => {});
        return;
      }

      if (action === 'close') {
        if (btnInteraction.user.id !== userId) {
          return btnInteraction.reply({ content: '❌ Nur der Ersteller kann Wetten schließen!', flags: 64 });
        }

        const { count1, count2 } = getTotals();
        if (count1 === 0 && count2 === 0) {
          return btnInteraction.reply({ content: '❌ Noch niemand hat gewettet!', flags: 64 });
        }

        bettingOpen = false;
        collector.resetTimer({ time: 60000 });
        btnInteraction.update({ embeds: [buildEmbed()], components: buildResolveButtons() });
        return;
      }

      if (action === 'win1' || action === 'win2') {
        if (btnInteraction.user.id !== userId) {
          return btnInteraction.reply({ content: '❌ Nur der Ersteller kann auflösen!', flags: 64 });
        }

        resolved = true;
        collector.stop('resolved');

        const winningSide = action === 'win1' ? 1 : 2;
        const losingSide = winningSide === 1 ? 2 : 1;
        const winningOption = winningSide === 1 ? option1 : option2;
        const { total1, total2 } = getTotals();
        const totalPool = total1 + total2;
        const winnerPool = winningSide === 1 ? total1 : total2;

        const payouts = [];
        if (winnerPool > 0) {
          for (const [uid, bet] of bets[winningSide]) {
            const share = Math.floor((bet / winnerPool) * totalPool);
            db.updateBalance(uid, share);
            payouts.push(`<@${uid}>: +**${config.currencySymbol}${share.toLocaleString()}**`);
          }
        }

        const embed = new EmbedBuilder()
          .setColor('#2ecc71')
          .setTitle('🎰 Wette aufgelöst!')
          .setDescription(
            `**${question}**\n\n` +
            `✅ Gewinner: **${winningOption}**\n` +
            `💰 Pool: **${config.currencySymbol}${totalPool.toLocaleString()}**\n\n` +
            (payouts.length > 0 ? `**Auszahlungen:**\n${payouts.join('\n')}` : 'Keine Gewinner.')
          )
          .setTimestamp();
        btnInteraction.update({ embeds: [embed], components: [] });
        return;
      }

      if (action === 'cancel') {
        if (btnInteraction.user.id !== userId) {
          return btnInteraction.reply({ content: '❌ Nur der Ersteller kann abbrechen!', flags: 64 });
        }

        resolved = true;
        collector.stop('cancelled');

        for (const side of [1, 2]) {
          for (const [uid, bet] of bets[side]) {
            db.updateBalance(uid, bet);
          }
        }

        const embed = new EmbedBuilder()
          .setColor('#95a5a6')
          .setTitle('❌ Wette abgebrochen')
          .setDescription('Alle Einsätze wurden zurückgegeben.')
          .setTimestamp();
        btnInteraction.update({ embeds: [embed], components: [] });
      }
    });

    collector.on('end', (_, reason) => {
      if (reason === 'time' && !resolved) {
        resolved = true;
        for (const side of [1, 2]) {
          for (const [uid, bet] of bets[side]) {
            db.updateBalance(uid, bet);
          }
        }
        const embed = new EmbedBuilder()
          .setColor('#f39c12')
          .setTitle('⏰ Wette abgelaufen')
          .setDescription('Wette wurde nicht aufgelöst. Einsätze zurückgegeben.')
          .setTimestamp();
        msg.edit({ embeds: [embed], components: [] });
      }
    });
  },
};
