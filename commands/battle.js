const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const COOLDOWN = 60 * 1000;
const cooldowns = new Map();

const monsters = [
  { name: 'Schleim', emoji: '🟢', hp: 30, atk: 5, def: 2, xp: 10, gold: [20, 50], tier: 1 },
  { name: 'Goblin', emoji: '👺', hp: 50, atk: 8, def: 3, xp: 20, gold: [40, 100], tier: 1 },
  { name: 'Skelett', emoji: '💀', hp: 60, atk: 10, def: 5, xp: 30, gold: [60, 150], tier: 1 },
  { name: 'Wolf', emoji: '🐺', hp: 70, atk: 12, def: 4, xp: 35, gold: [80, 180], tier: 2 },
  { name: 'Ork', emoji: '👹', hp: 100, atk: 15, def: 8, xp: 50, gold: [100, 250], tier: 2 },
  { name: 'Vampir', emoji: '🧛', hp: 120, atk: 18, def: 10, xp: 70, gold: [150, 350], tier: 2 },
  { name: 'Drache', emoji: '🐉', hp: 200, atk: 25, def: 15, xp: 120, gold: [300, 600], tier: 3 },
  { name: 'Dämon', emoji: '😈', hp: 250, atk: 30, def: 18, xp: 150, gold: [400, 800], tier: 3 },
  { name: 'Hydra', emoji: '🐲', hp: 300, atk: 35, def: 20, xp: 200, gold: [500, 1000], tier: 3 },
];

const lootTable = [
  { name: 'Heiltrank', emoji: '🧪', chance: 0.3, tier: 1 },
  { name: 'Mana-Kristall', emoji: '🔮', chance: 0.2, tier: 1 },
  { name: 'Drachenschuppe', emoji: '🪬', chance: 0.1, tier: 3 },
  { name: 'Magischer Stein', emoji: '💠', chance: 0.15, tier: 2 },
  { name: 'Schattendolch', emoji: '🗡️', chance: 0.08, tier: 2 },
];

function getPlayerStats(userId) {
  const user = db.getUser(userId);
  const prestige = user.prestige || 0;
  const baseHp = 100 + prestige * 20;
  const baseAtk = 12 + prestige * 3;
  const baseDef = 5 + prestige * 2;
  let atkBonus = 0;
  let defBonus = 0;
  if (db.hasItem(userId, 'Schattendolch')) atkBonus += 5;
  if (db.hasItem(userId, 'Schutzschild')) defBonus += 3;
  if (db.hasItem(userId, 'Drachenschuppe')) { atkBonus += 3; defBonus += 3; }
  return { hp: baseHp, maxHp: baseHp, atk: baseAtk + atkBonus, def: baseDef + defBonus };
}

function calcDamage(atk, def) {
  const base = Math.max(1, atk - def / 2);
  const variance = Math.floor(Math.random() * 5) - 2;
  return Math.max(1, Math.floor(base + variance));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('battle')
    .setDescription('Kämpfe gegen Monster und verdiene Gold und Loot! (60s CD)'),
  async execute(interaction) {
    const userId = interaction.user.id;
    const config = require('../config.json');

    const lastPlay = cooldowns.get(userId);
    if (lastPlay && Date.now() - lastPlay < COOLDOWN) {
      const remaining = Math.ceil((COOLDOWN - (Date.now() - lastPlay)) / 1000);
      return interaction.reply(`⏳ Du musst noch **${remaining}s** warten!`);
    }

    cooldowns.set(userId, Date.now());

    const user = db.getUser(userId);
    const prestige = user.prestige || 0;
    const maxTier = prestige >= 2 ? 3 : prestige >= 1 ? 2 : 1;
    const available = monsters.filter(m => m.tier <= maxTier);
    const monster = { ...available[Math.floor(Math.random() * available.length)] };
    const player = getPlayerStats(userId);

    let round = 0;
    let gameOver = false;
    let fled = false;
    const log = [];

    const buildHpBar = (current, max, length = 10) => {
      const filled = Math.max(0, Math.round((current / max) * length));
      return '█'.repeat(filled) + '░'.repeat(length - filled);
    };

    const buildEmbed = () => {
      return new EmbedBuilder()
        .setColor(gameOver ? (monster.hp <= 0 ? '#2ecc71' : '#e74c3c') : '#e67e22')
        .setTitle(`⚔️ ${interaction.user.username} vs ${monster.emoji} ${monster.name}`)
        .setDescription(
          `**Runde ${round}**\n\n` +
          `❤️ Du: \`${buildHpBar(player.hp, player.maxHp)}\` **${Math.max(0, player.hp)}/${player.maxHp}** HP\n` +
          `⚔️ ATK: **${player.atk}** | 🛡️ DEF: **${player.def}**\n\n` +
          `${monster.emoji} ${monster.name}: \`${buildHpBar(monster.hp, monsters.find(m => m.name === monster.name)?.hp || monster.hp)}\` **${Math.max(0, monster.hp)}** HP\n` +
          `⚔️ ATK: **${monster.atk}** | 🛡️ DEF: **${monster.def}**\n\n` +
          (log.length > 0 ? log.slice(-4).join('\n') : '*Wähle deine Aktion!*')
        )
        .setFooter({ text: `Tier ${monster.tier} Monster | 20s pro Zug` })
        .setTimestamp();
    };

    const buildButtons = () => {
      return [new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`battle_atk_${userId}`)
          .setLabel('⚔️ Angriff')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`battle_def_${userId}`)
          .setLabel('🛡️ Verteidigen')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`battle_heal_${userId}`)
          .setLabel(`🧪 Heilen${db.hasItem(userId, 'Heiltrank') ? '' : ' (-)'}`)
          .setStyle(ButtonStyle.Success)
          .setDisabled(!db.hasItem(userId, 'Heiltrank')),
        new ButtonBuilder()
          .setCustomId(`battle_flee_${userId}`)
          .setLabel('🏃 Fliehen')
          .setStyle(ButtonStyle.Secondary),
      )];
    };

    const msg = await interaction.reply({ embeds: [buildEmbed()], components: buildButtons(), fetchReply: true });
    const collector = msg.createMessageComponentCollector({ time: 20000 });

    collector.on('collect', (btnInteraction) => {
      if (btnInteraction.user.id !== userId) {
        return btnInteraction.reply({ content: '❌ Das ist nicht dein Kampf!', flags: 64 });
      }
      if (gameOver) return;

      round++;
      const action = btnInteraction.customId.split('_')[1];

      let playerDefBonus = 0;

      if (action === 'flee') {
        const fleeChance = 0.5 + (player.atk > monster.atk ? 0.2 : 0);
        if (Math.random() < fleeChance) {
          fled = true;
          gameOver = true;
          log.push('🏃 Du bist geflohen!');
          collector.stop('fled');
          btnInteraction.update({ embeds: [buildEmbed()], components: [] });
          return;
        }
        log.push('🏃 Fluchtversuch fehlgeschlagen!');
      } else if (action === 'atk') {
        const crit = Math.random() < 0.15;
        let dmg = calcDamage(player.atk, monster.def);
        if (crit) dmg = Math.floor(dmg * 1.8);
        monster.hp -= dmg;
        log.push(`⚔️ Du triffst ${monster.emoji} für **${dmg}** Schaden!${crit ? ' 💥 KRITISCH!' : ''}`);
      } else if (action === 'def') {
        playerDefBonus = 8;
        log.push('🛡️ Du gehst in Verteidigungsstellung! (+8 DEF)');
      } else if (action === 'heal') {
        if (db.hasItem(userId, 'Heiltrank')) {
          db.removeFromInventory(userId, 'Heiltrank');
          const heal = 30 + Math.floor(Math.random() * 20);
          player.hp = Math.min(player.maxHp, player.hp + heal);
          log.push(`🧪 Du heilst dich um **${heal}** HP!`);
        }
      }

      if (monster.hp <= 0) {
        gameOver = true;
        collector.stop('won');

        const goldReward = monster.gold[0] + Math.floor(Math.random() * (monster.gold[1] - monster.gold[0]));
        db.updateBalance(userId, goldReward);

        let lootMsg = '';
        for (const loot of lootTable) {
          if (loot.tier <= monster.tier && Math.random() < loot.chance) {
            db.addToInventory(userId, loot.name);
            lootMsg += `\n${loot.emoji} **${loot.name}** gefunden!`;
          }
        }

        log.push(`\n🏆 **${monster.emoji} ${monster.name} besiegt!**`);
        log.push(`💰 +**${config.currencySymbol}${goldReward}** | ⭐ +**${monster.xp}** XP`);
        if (lootMsg) log.push(lootMsg);

        const embed = buildEmbed();
        embed.setColor('#FFD700');
        embed.setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` });
        btnInteraction.update({ embeds: [embed], components: [] });
        return;
      }

      if (!gameOver) {
        const monsterDmg = calcDamage(monster.atk, player.def + playerDefBonus);
        player.hp -= monsterDmg;
        log.push(`${monster.emoji} ${monster.name} greift an für **${monsterDmg}** Schaden!`);

        if (player.hp <= 0) {
          gameOver = true;
          collector.stop('lost');

          const loss = Math.min(Math.floor(db.getBalance(userId) * 0.1), 500);
          if (loss > 0) db.updateBalance(userId, -loss);

          log.push(`\n💀 Du wurdest besiegt! Verlust: **-${config.currencySymbol}${loss}**`);

          const embed = buildEmbed();
          embed.setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` });
          btnInteraction.update({ embeds: [embed], components: [] });
          return;
        }
      }

      collector.resetTimer({ time: 20000 });
      btnInteraction.update({ embeds: [buildEmbed()], components: buildButtons() });
    });

    collector.on('end', (_, reason) => {
      if (reason === 'time' && !gameOver) {
        gameOver = true;
        log.push('⏰ Zeit abgelaufen — du bist geflohen!');
        msg.edit({ embeds: [buildEmbed()], components: [] });
      }
    });
  },
};
