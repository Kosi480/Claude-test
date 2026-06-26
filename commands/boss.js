const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const COOLDOWN = 10 * 60 * 1000;
const cooldowns = new Map();

const bosses = [
  { name: 'Frostgigant', emoji: '🧊', hp: 500, atk: 20, reward: [200, 500], xp: 50 },
  { name: 'Lavawurm', emoji: '🌋', hp: 800, atk: 30, reward: [400, 900], xp: 80 },
  { name: 'Schattendrache', emoji: '🐉', hp: 1200, atk: 40, reward: [600, 1500], xp: 120 },
  { name: 'Uralter Titan', emoji: '🗿', hp: 2000, atk: 50, reward: [1000, 2500], xp: 200 },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('boss')
    .setDescription('Starte einen Multiplayer-Bosskampf! (10min CD)')
    .addStringOption(opt =>
      opt.setName('boss')
        .setDescription('Welchen Boss?')
        .setRequired(true)
        .addChoices(
          { name: '🧊 Frostgigant (500 HP)', value: '0' },
          { name: '🌋 Lavawurm (800 HP)', value: '1' },
          { name: '🐉 Schattendrache (1200 HP)', value: '2' },
          { name: '🗿 Uralter Titan (2000 HP)', value: '3' },
        )),
  async execute(interaction) {
    const userId = interaction.user.id;
    const config = require('../config.json');

    const lastPlay = cooldowns.get(userId);
    if (lastPlay && Date.now() - lastPlay < COOLDOWN) {
      const remaining = Math.ceil((COOLDOWN - (Date.now() - lastPlay)) / 1000);
      return interaction.reply(`⏳ Du musst noch **${remaining}s** warten!`);
    }

    const bossIdx = parseInt(interaction.options.getString('boss'));
    const boss = { ...bosses[bossIdx] };
    const maxHp = boss.hp;

    const players = new Map();
    players.set(userId, { name: interaction.user.username, damage: 0, alive: true });

    let phase = 'join';
    let round = 0;
    let gameOver = false;

    const hpBar = (hp, max) => {
      const len = 15;
      const filled = Math.max(0, Math.round((hp / max) * len));
      return '█'.repeat(filled) + '░'.repeat(len - filled);
    };

    const buildJoinEmbed = () => {
      return new EmbedBuilder()
        .setColor('#e74c3c')
        .setTitle(`${boss.emoji} Weltboss: ${boss.name}`)
        .setDescription(
          `**${interaction.user.username}** ruft zum Kampf gegen **${boss.name}**!\n\n` +
          `${boss.emoji} HP: \`${hpBar(boss.hp, maxHp)}\` **${boss.hp}/${maxHp}**\n` +
          `⚔️ ATK: **${boss.atk}**\n` +
          `💰 Belohnung: **${config.currencySymbol}${boss.reward[0]}-${boss.reward[1]}** pro Spieler\n\n` +
          `**Kämpfer (${players.size}):**\n` +
          [...players.values()].map(p => `⚔️ ${p.name}`).join('\n') +
          `\n\nKlicke **Beitreten** um mitzukämpfen!`
        )
        .setFooter({ text: '30s zum Beitreten | Min. 1 Spieler' })
        .setTimestamp();
    };

    const buildJoinButtons = () => {
      return [new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`boss_join_${userId}`)
          .setLabel('⚔️ Beitreten')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`boss_start_${userId}`)
          .setLabel('🚀 Kampf starten!')
          .setStyle(ButtonStyle.Primary),
      )];
    };

    const buildBattleEmbed = (log = []) => {
      const playerList = [...players.entries()].map(([, p]) =>
        `${p.alive ? '⚔️' : '💀'} **${p.name}** — ${p.damage} Schaden`
      ).join('\n');

      return new EmbedBuilder()
        .setColor(boss.hp <= 0 ? '#FFD700' : '#e74c3c')
        .setTitle(`${boss.emoji} ${boss.name} — Runde ${round}`)
        .setDescription(
          `${boss.emoji} HP: \`${hpBar(Math.max(0, boss.hp), maxHp)}\` **${Math.max(0, boss.hp)}/${maxHp}**\n\n` +
          `**Kämpfer:**\n${playerList}\n\n` +
          (log.length > 0 ? log.slice(-5).join('\n') : '')
        )
        .setTimestamp();
    };

    const buildAttackButtons = () => {
      return [new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`boss_atk_${userId}`)
          .setLabel('⚔️ Angriff')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`boss_special_${userId}`)
          .setLabel('💥 Spezialangriff')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`boss_defend_${userId}`)
          .setLabel('🛡️ Verteidigen')
          .setStyle(ButtonStyle.Secondary),
      )];
    };

    const msg = await interaction.reply({ embeds: [buildJoinEmbed()], components: buildJoinButtons(), fetchReply: true });
    const collector = msg.createMessageComponentCollector({ time: 30000 });

    collector.on('collect', (btnInteraction) => {
      const action = btnInteraction.customId.split('_')[1];

      if (action === 'join' && phase === 'join') {
        if (players.has(btnInteraction.user.id)) {
          return btnInteraction.reply({ content: '❌ Du bist schon dabei!', flags: 64 });
        }
        if (players.size >= 6) {
          return btnInteraction.reply({ content: '❌ Max. 6 Spieler!', flags: 64 });
        }

        players.set(btnInteraction.user.id, { name: btnInteraction.user.username, damage: 0, alive: true });
        cooldowns.set(btnInteraction.user.id, Date.now());
        btnInteraction.update({ embeds: [buildJoinEmbed()], components: buildJoinButtons() });
        return;
      }

      if (action === 'start' && phase === 'join') {
        if (btnInteraction.user.id !== userId) {
          return btnInteraction.reply({ content: '❌ Nur der Ersteller kann starten!', flags: 64 });
        }

        phase = 'battle';
        cooldowns.set(userId, Date.now());
        round = 1;

        const battleLog = [`🏁 **Der Kampf gegen ${boss.emoji} ${boss.name} beginnt!**`];
        collector.stop('started');
        btnInteraction.update({ embeds: [buildBattleEmbed(battleLog)], components: buildAttackButtons() });

        const roundActions = new Map();
        const battleCollector = msg.createMessageComponentCollector({ time: 15000 });

        battleCollector.on('collect', (moveInteraction) => {
          if (!players.has(moveInteraction.user.id)) {
            return moveInteraction.reply({ content: '❌ Du bist nicht im Kampf!', flags: 64 });
          }
          const player = players.get(moveInteraction.user.id);
          if (!player.alive) {
            return moveInteraction.reply({ content: '💀 Du bist besiegt!', flags: 64 });
          }
          if (roundActions.has(moveInteraction.user.id)) {
            return moveInteraction.reply({ content: '❌ Du hast diese Runde schon agiert!', flags: 64 });
          }
          if (gameOver) return;

          const move = moveInteraction.customId.split('_')[1];
          roundActions.set(moveInteraction.user.id, move);

          const prestige = (db.getUser(moveInteraction.user.id).prestige || 0);
          const baseAtk = 15 + prestige * 3;

          if (move === 'atk') {
            const dmg = baseAtk + Math.floor(Math.random() * 10);
            boss.hp -= dmg;
            player.damage += dmg;
            battleLog.push(`⚔️ **${player.name}** greift an: **${dmg}** Schaden!`);
          } else if (move === 'special') {
            if (Math.random() < 0.6) {
              const dmg = Math.floor(baseAtk * 2.5) + Math.floor(Math.random() * 15);
              boss.hp -= dmg;
              player.damage += dmg;
              battleLog.push(`💥 **${player.name}** Spezialangriff: **${dmg}** Schaden!`);
            } else {
              battleLog.push(`💨 **${player.name}** Spezialangriff verfehlt!`);
            }
          } else {
            battleLog.push(`🛡️ **${player.name}** verteidigt sich!`);
          }

          if (boss.hp <= 0) {
            gameOver = true;
            battleCollector.stop('won');

            const rewardBase = boss.reward[0] + Math.floor(Math.random() * (boss.reward[1] - boss.reward[0]));
            const winners = [];

            for (const [pid, p] of players) {
              if (p.damage > 0) {
                const dmgShare = p.damage / [...players.values()].reduce((s, pl) => s + pl.damage, 0);
                const reward = Math.floor(rewardBase * (0.5 + dmgShare * 0.5));
                db.updateBalance(pid, reward);
                winners.push(`${p.name}: +**${config.currencySymbol}${reward}** (${Math.floor(dmgShare * 100)}% Schaden)`);
              }
            }

            const embed = new EmbedBuilder()
              .setColor('#FFD700')
              .setTitle(`🏆 ${boss.emoji} ${boss.name} besiegt!`)
              .setDescription(
                `Der Boss wurde in **${round}** Runden besiegt!\n\n` +
                `**Belohnungen:**\n${winners.join('\n')}\n\n` +
                battleLog.slice(-3).join('\n')
              )
              .setTimestamp();
            moveInteraction.update({ embeds: [embed], components: [] });
            return;
          }

          const alivePlayers = [...players.values()].filter(p => p.alive);
          if (roundActions.size >= alivePlayers.length) {
            const bossTarget = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
            const defended = roundActions.get([...players.entries()].find(([, p]) => p === bossTarget)?.[0]) === 'defend';
            const bossDmg = defended ? Math.floor(boss.atk * 0.3) : boss.atk;

            if (!defended && Math.random() < 0.15) {
              bossTarget.alive = false;
              battleLog.push(`${boss.emoji} **${boss.name}** vernichtet **${bossTarget.name}**! 💀`);
            } else {
              battleLog.push(`${boss.emoji} **${boss.name}** greift **${bossTarget.name}** an! (${defended ? '🛡️ geblockt' : `${bossDmg} Schaden`})`);
            }

            round++;
            roundActions.clear();

            const stillAlive = [...players.values()].filter(p => p.alive);
            if (stillAlive.length === 0) {
              gameOver = true;
              battleCollector.stop('lost');
              battleLog.push(`💀 Alle Kämpfer besiegt!`);
              const embed = buildBattleEmbed(battleLog);
              embed.setTitle(`💀 ${boss.emoji} ${boss.name} hat gewonnen!`);
              embed.setColor('#e74c3c');
              moveInteraction.update({ embeds: [embed], components: [] });
              return;
            }

            if (round > 20) {
              gameOver = true;
              battleCollector.stop('timeout');
              battleLog.push(`⏰ Zu viele Runden — Boss entkommt!`);
              const embed = buildBattleEmbed(battleLog);
              embed.setTitle(`⏰ ${boss.emoji} ${boss.name} ist entkommen!`);
              embed.setColor('#f39c12');
              moveInteraction.update({ embeds: [embed], components: [] });
              return;
            }

            battleCollector.resetTimer({ time: 15000 });
          }

          moveInteraction.update({ embeds: [buildBattleEmbed(battleLog)], components: buildAttackButtons() });
        });

        battleCollector.on('end', (_, reason) => {
          if (reason === 'time' && !gameOver) {
            gameOver = true;
            const embed = buildBattleEmbed(battleLog);
            embed.setTitle(`⏰ Bosskampf abgebrochen`);
            embed.setColor('#f39c12');
            msg.edit({ embeds: [embed], components: [] });
          }
        });
        return;
      }
    });

    collector.on('end', (_, reason) => {
      if (reason === 'time' && phase === 'join') {
        msg.edit({ components: [] });
      }
    });
  },
};
