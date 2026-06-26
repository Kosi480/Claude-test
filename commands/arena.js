const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const COOLDOWN = 3 * 60 * 1000;
const cooldowns = new Map();

const moves = [
  { name: 'Schwerthieb', emoji: '⚔️', type: 'attack', power: 15, accuracy: 0.85 },
  { name: 'Feuerzauber', emoji: '🔥', type: 'attack', power: 25, accuracy: 0.65 },
  { name: 'Schildblock', emoji: '🛡️', type: 'defend', power: 0, accuracy: 1.0 },
  { name: 'Heilung', emoji: '💚', type: 'heal', power: 20, accuracy: 0.9 },
];

function getPlayerStats(userId) {
  const user = db.getUser(userId);
  const prestige = user.prestige || 0;
  return {
    hp: 100 + prestige * 15,
    maxHp: 100 + prestige * 15,
    atk: 10 + prestige * 2,
    def: 5 + prestige * 1,
    defending: false,
  };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('arena')
    .setDescription('Fordere jemanden zum PvP-Kampf heraus! (3min CD)')
    .addUserOption(opt => opt.setName('gegner').setDescription('Wen willst du herausfordern?').setRequired(true))
    .addStringOption(opt => opt.setName('betrag').setDescription('Einsatz (Zahl oder "alles")').setRequired(true)),
  async execute(interaction) {
    const userId = interaction.user.id;
    const config = require('../config.json');

    const lastPlay = cooldowns.get(userId);
    if (lastPlay && Date.now() - lastPlay < COOLDOWN) {
      const remaining = Math.ceil((COOLDOWN - (Date.now() - lastPlay)) / 1000);
      return interaction.reply(`⏳ Du musst noch **${remaining}s** warten!`);
    }

    const target = interaction.options.getUser('gegner');
    if (target.id === userId) return interaction.reply('❌ Du kannst nicht gegen dich selbst kämpfen!');
    if (target.bot) return interaction.reply('❌ Du kannst nicht gegen einen Bot kämpfen!');

    const betragStr = interaction.options.getString('betrag');
    let amount;
    if (betragStr === 'all' || betragStr === 'alles') {
      amount = db.getBalance(userId);
    } else {
      amount = parseInt(betragStr);
    }

    if (!amount || amount <= 0) return interaction.reply('❌ Ungültiger Betrag!');
    if (amount > db.getBalance(userId)) return interaction.reply(`❌ Du hast nur **${config.currencySymbol}${db.getBalance(userId).toLocaleString()}**!`);
    if (amount > db.getBalance(target.id)) return interaction.reply(`❌ **${target.username}** hat nicht genug Geld!`);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`arena_accept_${userId}`).setLabel('⚔️ Annehmen!').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`arena_deny_${userId}`).setLabel('❌ Ablehnen').setStyle(ButtonStyle.Danger),
    );

    const embed = new EmbedBuilder()
      .setColor('#e74c3c')
      .setTitle('⚔️ Arena-Herausforderung!')
      .setDescription(
        `**${interaction.user.username}** fordert **${target.username}** heraus!\n\n` +
        `Einsatz: **${config.currencySymbol}${amount.toLocaleString()}** pro Spieler\n` +
        `Gewinner bekommt alles!\n\n` +
        `${target.username}, nimmst du an?`
      )
      .setFooter({ text: '30s zum Akzeptieren' })
      .setTimestamp();

    const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
    const acceptCollector = msg.createMessageComponentCollector({ time: 30000 });

    acceptCollector.on('collect', (btnInteraction) => {
      if (btnInteraction.user.id !== target.id) {
        return btnInteraction.reply({ content: '❌ Nur der Herausgeforderte kann antworten!', flags: 64 });
      }

      acceptCollector.stop();

      if (btnInteraction.customId.startsWith('arena_deny')) {
        const embed = new EmbedBuilder()
          .setColor('#95a5a6')
          .setTitle('⚔️ Herausforderung abgelehnt')
          .setDescription(`**${target.username}** hat die Herausforderung abgelehnt.`)
          .setTimestamp();
        return btnInteraction.update({ embeds: [embed], components: [] });
      }

      if (db.getBalance(userId) < amount || db.getBalance(target.id) < amount) {
        const embed = new EmbedBuilder()
          .setColor('#e74c3c')
          .setTitle('❌ Nicht genug Geld')
          .setDescription('Ein Spieler hat nicht mehr genug Geld!')
          .setTimestamp();
        return btnInteraction.update({ embeds: [embed], components: [] });
      }

      cooldowns.set(userId, Date.now());
      cooldowns.set(target.id, Date.now());

      const p1 = { id: userId, name: interaction.user.username, ...getPlayerStats(userId) };
      const p2 = { id: target.id, name: target.username, ...getPlayerStats(target.id) };

      let turn = p1;
      let round = 0;
      let gameOver = false;
      const battleLog = [];

      const hpBar = (hp, max) => {
        const len = 10;
        const filled = Math.max(0, Math.round((hp / max) * len));
        return '█'.repeat(filled) + '░'.repeat(len - filled);
      };

      const buildBattleEmbed = () => {
        return new EmbedBuilder()
          .setColor('#e67e22')
          .setTitle(`⚔️ Arena — Runde ${round}`)
          .setDescription(
            `**${p1.name}** ❤️ \`${hpBar(p1.hp, p1.maxHp)}\` **${Math.max(0, p1.hp)}/${p1.maxHp}**${p1.defending ? ' 🛡️' : ''}\n` +
            `**${p2.name}** ❤️ \`${hpBar(p2.hp, p2.maxHp)}\` **${Math.max(0, p2.hp)}/${p2.maxHp}**${p2.defending ? ' 🛡️' : ''}\n\n` +
            `🎯 **${turn.name}** ist dran!\n\n` +
            (battleLog.length > 0 ? battleLog.slice(-4).join('\n') : '') +
            `\n\nEinsatz: **${config.currencySymbol}${amount.toLocaleString()}** pro Spieler`
          )
          .setFooter({ text: '20s pro Zug' })
          .setTimestamp();
      };

      const moveButtons = () => {
        return [new ActionRowBuilder().addComponents(
          ...moves.map((m, i) =>
            new ButtonBuilder()
              .setCustomId(`amove_${i}_${turn.id}`)
              .setLabel(`${m.emoji} ${m.name}`)
              .setStyle(m.type === 'attack' ? ButtonStyle.Danger : m.type === 'defend' ? ButtonStyle.Primary : ButtonStyle.Success)
          )
        )];
      };

      round = 1;
      btnInteraction.update({ embeds: [buildBattleEmbed()], components: moveButtons() });

      const battleCollector = msg.createMessageComponentCollector({ time: 20000 });

      battleCollector.on('collect', (moveInteraction) => {
        if (moveInteraction.user.id !== turn.id) {
          return moveInteraction.reply({ content: `❌ **${turn.name}** ist dran!`, flags: 64 });
        }
        if (gameOver) return;

        const moveIdx = parseInt(moveInteraction.customId.split('_')[1]);
        const move = moves[moveIdx];
        const attacker = turn;
        const defender = turn === p1 ? p2 : p1;

        attacker.defending = false;

        if (move.type === 'attack') {
          if (Math.random() < move.accuracy) {
            let dmg = move.power + attacker.atk - Math.floor(defender.def / 2);
            if (defender.defending) {
              dmg = Math.floor(dmg * 0.3);
              defender.defending = false;
            }
            dmg = Math.max(1, dmg + Math.floor(Math.random() * 6) - 3);
            defender.hp -= dmg;
            battleLog.push(`${move.emoji} **${attacker.name}** → **${defender.name}**: **${dmg}** Schaden!`);
          } else {
            battleLog.push(`${move.emoji} **${attacker.name}** verfehlt!`);
          }
        } else if (move.type === 'defend') {
          attacker.defending = true;
          battleLog.push(`🛡️ **${attacker.name}** verteidigt sich!`);
        } else if (move.type === 'heal') {
          if (Math.random() < move.accuracy) {
            const heal = move.power + Math.floor(Math.random() * 10);
            attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal);
            battleLog.push(`💚 **${attacker.name}** heilt sich um **${heal}** HP!`);
          } else {
            battleLog.push(`💚 **${attacker.name}** — Heilung fehlgeschlagen!`);
          }
        }

        if (defender.hp <= 0 || round >= 15) {
          gameOver = true;
          battleCollector.stop('done');

          let winner, loser;
          if (defender.hp <= 0) {
            winner = attacker;
            loser = defender;
          } else {
            winner = p1.hp >= p2.hp ? p1 : p2;
            loser = winner === p1 ? p2 : p1;
          }

          const pot = amount * 2;
          db.updateBalance(winner.id, amount);
          db.updateBalance(loser.id, -amount);

          const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle(`🏆 ${winner.name} gewinnt!`)
            .setDescription(
              `**${p1.name}** ❤️ **${Math.max(0, p1.hp)}** HP\n` +
              `**${p2.name}** ❤️ **${Math.max(0, p2.hp)}** HP\n\n` +
              battleLog.slice(-4).join('\n') +
              `\n\n🏆 **${winner.name}** gewinnt **${config.currencySymbol}${pot.toLocaleString()}**!`
            )
            .setFooter({ text: `Runde ${round}` })
            .setTimestamp();
          moveInteraction.update({ embeds: [embed], components: [] });
          return;
        }

        turn = turn === p1 ? p2 : p1;
        if (turn === p1) round++;

        battleCollector.resetTimer({ time: 20000 });
        moveInteraction.update({ embeds: [buildBattleEmbed()], components: moveButtons() });
      });

      battleCollector.on('end', (_, reason) => {
        if (reason === 'time' && !gameOver) {
          gameOver = true;
          const afk = turn;
          const winner = turn === p1 ? p2 : p1;
          db.updateBalance(winner.id, amount);
          db.updateBalance(afk.id, -amount);

          const embed = new EmbedBuilder()
            .setColor('#f39c12')
            .setTitle('⏰ Zeit abgelaufen')
            .setDescription(
              `**${afk.name}** war zu langsam!\n\n` +
              `🏆 **${winner.name}** gewinnt **${config.currencySymbol}${(amount * 2).toLocaleString()}**!`
            )
            .setTimestamp();
          msg.edit({ embeds: [embed], components: [] });
        }
      });
    });

    acceptCollector.on('end', (_, reason) => {
      if (reason === 'time') msg.edit({ components: [] });
    });
  },
};
