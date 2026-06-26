const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const COOLDOWN = 10 * 60 * 1000;
const cooldowns = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('turnier')
    .setDescription('Starte ein Eliminierungs-Turnier! (10min CD)')
    .addIntegerOption(opt =>
      opt.setName('einsatz')
        .setDescription('Einsatz pro Spieler')
        .setRequired(true)
        .setMinValue(100)
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

    const players = new Map();
    players.set(userId, { name: interaction.user.username, id: userId });

    let phase = 'join';

    const buildJoinEmbed = () => {
      return new EmbedBuilder()
        .setColor('#e67e22')
        .setTitle('⚔️ Turnier — Anmeldung')
        .setDescription(
          `**${interaction.user.username}** startet ein Turnier!\n\n` +
          `💰 Einsatz: **${config.currencySymbol}${bet.toLocaleString()}** pro Spieler\n` +
          `🏆 Preisgeld: **${config.currencySymbol}${(bet * players.size).toLocaleString()}** (Gewinner bekommt alles)\n\n` +
          `**Teilnehmer (${players.size}/8):**\n` +
          [...players.values()].map((p, i) => `${i + 1}. ⚔️ ${p.name}`).join('\n') +
          `\n\n*Min. 4 Spieler | 45s zum Beitreten*`
        )
        .setFooter({ text: 'Klicke Beitreten um mitzumachen!' })
        .setTimestamp();
    };

    const buildJoinButtons = () => {
      return [new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`tur_join_${userId}`)
          .setLabel('⚔️ Beitreten')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`tur_start_${userId}`)
          .setLabel(`🏆 Turnier starten (${players.size}/4+)`)
          .setStyle(ButtonStyle.Primary)
          .setDisabled(players.size < 4),
      )];
    };

    const simulateFight = (p1, p2) => {
      const prestige1 = (db.getUser(p1.id).prestige || 0);
      const prestige2 = (db.getUser(p2.id).prestige || 0);

      let hp1 = 100 + prestige1 * 10;
      let hp2 = 100 + prestige2 * 10;
      const atk1 = 15 + prestige1 * 3 + Math.floor(Math.random() * 10);
      const atk2 = 15 + prestige2 * 3 + Math.floor(Math.random() * 10);

      const log = [];
      let round = 0;

      while (hp1 > 0 && hp2 > 0 && round < 10) {
        round++;
        const dmg1 = atk1 + Math.floor(Math.random() * 8);
        const crit1 = Math.random() < 0.15;
        const finalDmg1 = crit1 ? Math.floor(dmg1 * 1.5) : dmg1;
        hp2 -= finalDmg1;

        if (hp2 <= 0) {
          log.push(`⚔️ **${p1.name}** ${crit1 ? '💥 KRIT ' : ''}→ ${finalDmg1} Schaden → **${p2.name}** besiegt!`);
          break;
        }

        const dmg2 = atk2 + Math.floor(Math.random() * 8);
        const crit2 = Math.random() < 0.15;
        const finalDmg2 = crit2 ? Math.floor(dmg2 * 1.5) : dmg2;
        hp1 -= finalDmg2;

        if (hp1 <= 0) {
          log.push(`⚔️ **${p2.name}** ${crit2 ? '💥 KRIT ' : ''}→ ${finalDmg2} Schaden → **${p1.name}** besiegt!`);
          break;
        }

        if (round <= 3) {
          log.push(`R${round}: ${p1.name} (${Math.max(0, hp1)} HP) ⚔️ ${p2.name} (${Math.max(0, hp2)} HP)`);
        }
      }

      const winner = hp1 > hp2 ? p1 : p2;
      return { winner, log };
    };

    const msg = await interaction.reply({ embeds: [buildJoinEmbed()], components: buildJoinButtons(), fetchReply: true });
    const joinCollector = msg.createMessageComponentCollector({ time: 45000 });

    joinCollector.on('collect', async (btnInteraction) => {
      const action = btnInteraction.customId.split('_')[1];

      if (action === 'join' && phase === 'join') {
        if (players.has(btnInteraction.user.id)) {
          return btnInteraction.reply({ content: '❌ Du bist schon angemeldet!', flags: 64 });
        }
        if (players.size >= 8) {
          return btnInteraction.reply({ content: '❌ Turnier ist voll (max 8)!', flags: 64 });
        }
        if (db.getBalance(btnInteraction.user.id) < bet) {
          return btnInteraction.reply({ content: `❌ Du brauchst **${config.currencySymbol}${bet.toLocaleString()}**!`, flags: 64 });
        }

        db.updateBalance(btnInteraction.user.id, -bet);
        players.set(btnInteraction.user.id, { name: btnInteraction.user.username, id: btnInteraction.user.id });
        cooldowns.set(btnInteraction.user.id, Date.now());

        btnInteraction.update({ embeds: [buildJoinEmbed()], components: buildJoinButtons() });
        return;
      }

      if (action === 'start' && phase === 'join') {
        if (btnInteraction.user.id !== userId) {
          return btnInteraction.reply({ content: '❌ Nur der Ersteller kann starten!', flags: 64 });
        }
        if (players.size < 4) {
          return btnInteraction.reply({ content: '❌ Mindestens 4 Spieler nötig!', flags: 64 });
        }

        phase = 'battle';
        cooldowns.set(userId, Date.now());
        db.updateBalance(userId, -bet);
        joinCollector.stop('started');

        let bracket = [...players.values()].sort(() => Math.random() - 0.5);
        const totalPrize = bet * players.size;
        let roundNum = 0;
        const tournamentLog = [];

        while (bracket.length > 1) {
          roundNum++;
          const roundName = bracket.length === 2 ? '🏆 FINALE' :
            bracket.length <= 4 ? '⚔️ Halbfinale' : '⚔️ Viertelfinale';

          const nextRound = [];
          const matchResults = [];

          for (let i = 0; i < bracket.length; i += 2) {
            if (i + 1 >= bracket.length) {
              nextRound.push(bracket[i]);
              matchResults.push(`🎟️ **${bracket[i].name}** — Freilos!`);
              continue;
            }

            const { winner, log } = simulateFight(bracket[i], bracket[i + 1]);
            const loser = winner === bracket[i] ? bracket[i + 1] : bracket[i];
            nextRound.push(winner);
            matchResults.push(`${winner.name} ⚔️ ~~${loser.name}~~\n${log.slice(-1)[0]}`);
          }

          tournamentLog.push(`\n**${roundName}:**\n${matchResults.join('\n')}`);
          bracket = nextRound;
        }

        const champion = bracket[0];
        db.updateBalance(champion.id, totalPrize);

        const embed = new EmbedBuilder()
          .setColor('#FFD700')
          .setTitle(`🏆 Turnier — ${champion.name} gewinnt!`)
          .setDescription(
            `**${players.size} Spieler** | Preisgeld: **${config.currencySymbol}${totalPrize.toLocaleString()}**\n` +
            tournamentLog.join('\n') +
            `\n\n🏆 **${champion.name}** gewinnt **${config.currencySymbol}${totalPrize.toLocaleString()}**!`
          )
          .setFooter({ text: 'GG! Nächstes Turnier in 10 Minuten.' })
          .setTimestamp();
        btnInteraction.update({ embeds: [embed], components: [] });
      }
    });

    joinCollector.on('end', (_, reason) => {
      if (reason === 'time' && phase === 'join') {
        for (const [pid] of players) {
          if (pid !== userId) db.updateBalance(pid, bet);
        }
        const embed = new EmbedBuilder()
          .setColor('#95a5a6')
          .setTitle('⏰ Turnier abgebrochen')
          .setDescription('Nicht genug Spieler. Einsätze zurückgegeben.')
          .setTimestamp();
        msg.edit({ embeds: [embed], components: [] });
      }
    });
  },
};
