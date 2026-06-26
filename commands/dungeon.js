const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const COOLDOWN = 5 * 60 * 1000;
const cooldowns = new Map();

const dungeons = [
  {
    name: 'Goblin-Höhle', emoji: '🕳️', rooms: 4, difficulty: 1,
    enemies: ['Goblin', 'Ratte', 'Fledermaus'],
    boss: { name: 'Goblin-König', emoji: '👑', hp: 80, atk: 12 },
    loot: [100, 300],
  },
  {
    name: 'Verfluchter Wald', emoji: '🌲', rooms: 5, difficulty: 2,
    enemies: ['Wolf', 'Spinne', 'Baumgeist'],
    boss: { name: 'Waldwächter', emoji: '🌳', hp: 150, atk: 18 },
    loot: [250, 600],
  },
  {
    name: 'Drachenhort', emoji: '🏔️', rooms: 6, difficulty: 3,
    enemies: ['Skelettkrieger', 'Feuerelement', 'Dunkler Magier'],
    boss: { name: 'Uralter Drache', emoji: '🐉', hp: 250, atk: 28 },
    loot: [500, 1200],
  },
];

const roomEvents = [
  { type: 'combat', weight: 35 },
  { type: 'trap', weight: 20 },
  { type: 'treasure', weight: 20 },
  { type: 'rest', weight: 15 },
  { type: 'merchant', weight: 10 },
];

function pickEvent() {
  const total = roomEvents.reduce((s, e) => s + e.weight, 0);
  let r = Math.floor(Math.random() * total);
  for (const e of roomEvents) {
    r -= e.weight;
    if (r < 0) return e.type;
  }
  return 'combat';
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dungeon')
    .setDescription('Erkunde einen Dungeon mit Fallen, Schätzen und Boss! (5min CD)')
    .addStringOption(opt =>
      opt.setName('ort')
        .setDescription('Welchen Dungeon?')
        .setRequired(true)
        .addChoices(
          { name: '🕳️ Goblin-Höhle (Leicht)', value: 'goblin' },
          { name: '🌲 Verfluchter Wald (Mittel)', value: 'wald' },
          { name: '🏔️ Drachenhort (Schwer)', value: 'drache' },
        )),
  async execute(interaction) {
    const userId = interaction.user.id;
    const config = require('../config.json');

    const lastPlay = cooldowns.get(userId);
    if (lastPlay && Date.now() - lastPlay < COOLDOWN) {
      const remaining = Math.ceil((COOLDOWN - (Date.now() - lastPlay)) / 1000);
      return interaction.reply(`⏳ Du musst noch **${remaining}s** warten!`);
    }

    const choice = interaction.options.getString('ort');
    const dungeon = dungeons[choice === 'goblin' ? 0 : choice === 'wald' ? 1 : 2];

    const user = db.getUser(userId);
    const prestige = user.prestige || 0;
    const playerMaxHp = 100 + prestige * 15;
    let playerHp = playerMaxHp;
    let playerAtk = 10 + prestige * 2;
    let playerDef = 5 + prestige * 1;
    let gold = 0;
    let currentRoom = 0;
    let gameOver = false;
    let bossDefeated = false;
    const eventLog = [];

    if (db.hasItem(userId, 'Schattendolch')) playerAtk += 4;
    if (db.hasItem(userId, 'Schutzschild')) playerDef += 3;

    cooldowns.set(userId, Date.now());

    const hpBar = (hp, max) => {
      const len = 10;
      const filled = Math.max(0, Math.round((hp / max) * len));
      return '█'.repeat(filled) + '░'.repeat(len - filled);
    };

    const buildEmbed = (roomTitle, roomDesc, color = '#9b59b6') => {
      return new EmbedBuilder()
        .setColor(color)
        .setTitle(`${dungeon.emoji} ${dungeon.name} — ${roomTitle}`)
        .setDescription(
          `❤️ HP: \`${hpBar(playerHp, playerMaxHp)}\` **${playerHp}/${playerMaxHp}**\n` +
          `⚔️ ATK: **${playerAtk}** | 🛡️ DEF: **${playerDef}**\n` +
          `💰 Beute: **${config.currencySymbol}${gold}**\n` +
          `📍 Raum: **${currentRoom}/${dungeon.rooms}**\n\n` +
          roomDesc +
          (eventLog.length > 0 ? `\n\n${eventLog.slice(-3).join('\n')}` : '')
        )
        .setTimestamp();
    };

    const buildButtons = (extra = []) => {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`dg_next_${userId}`)
          .setLabel('🚪 Weiter')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`dg_flee_${userId}`)
          .setLabel('🏃 Fliehen (Beute behalten)')
          .setStyle(ButtonStyle.Secondary),
        ...extra
      );
      return [row];
    };

    const combatButtons = () => {
      return [new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`dg_fight_${userId}`)
          .setLabel('⚔️ Kämpfen')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`dg_dodge_${userId}`)
          .setLabel('🛡️ Ausweichen')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`dg_flee_${userId}`)
          .setLabel('🏃 Fliehen')
          .setStyle(ButtonStyle.Secondary),
      )];
    };

    const startEmbed = buildEmbed('Eingang', `Du betrittst **${dungeon.name}**...\nEs gibt **${dungeon.rooms} Räume** und einen **Boss** am Ende.\n\n*Bereit?*`);
    const msg = await interaction.reply({ embeds: [startEmbed], components: buildButtons(), fetchReply: true });
    const collector = msg.createMessageComponentCollector({ time: 120000 });

    let pendingEnemy = null;

    collector.on('collect', (btnInteraction) => {
      if (btnInteraction.user.id !== userId) {
        return btnInteraction.reply({ content: '❌ Das ist nicht dein Dungeon!', flags: 64 });
      }
      if (gameOver) return;

      const action = btnInteraction.customId.split('_')[1];

      if (action === 'flee') {
        gameOver = true;
        collector.stop('fled');
        if (gold > 0) db.updateBalance(userId, gold);
        const embed = buildEmbed('Geflohen! 🏃', `Du fliehst aus dem Dungeon!\n\n💰 Beute behalten: **${config.currencySymbol}${gold}**`, '#f39c12');
        embed.setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` });
        btnInteraction.update({ embeds: [embed], components: [] });
        return;
      }

      if (action === 'fight' && pendingEnemy) {
        const dmgDealt = Math.max(1, playerAtk - Math.floor(Math.random() * 5) + Math.floor(Math.random() * 6));
        const dmgTaken = Math.max(0, pendingEnemy.atk - playerDef + Math.floor(Math.random() * 4));
        playerHp -= dmgTaken;
        const enemyGold = 20 * dungeon.difficulty + Math.floor(Math.random() * 30);
        gold += enemyGold;

        eventLog.push(`⚔️ Du besiegst **${pendingEnemy.name}**! (-${dmgTaken} HP, +${config.currencySymbol}${enemyGold})`);
        pendingEnemy = null;

        if (playerHp <= 0) {
          gameOver = true;
          collector.stop('died');
          const embed = buildEmbed('💀 Gestorben!', `Du wurdest im Kampf besiegt!\n\n💀 Alle Beute verloren!`, '#e74c3c');
          embed.setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` });
          btnInteraction.update({ embeds: [embed], components: [] });
          return;
        }

        collector.resetTimer({ time: 120000 });
        const embed = buildEmbed(`Raum ${currentRoom}`, `Gegner besiegt! Weiter erkunden?`);
        btnInteraction.update({ embeds: [embed], components: buildButtons() });
        return;
      }

      if (action === 'dodge' && pendingEnemy) {
        if (Math.random() < 0.6) {
          eventLog.push(`🛡️ Du weichst **${pendingEnemy.name}** aus!`);
          pendingEnemy = null;
          collector.resetTimer({ time: 120000 });
          const embed = buildEmbed(`Raum ${currentRoom}`, `Erfolgreich ausgewichen! Weiter?`);
          btnInteraction.update({ embeds: [embed], components: buildButtons() });
        } else {
          const dmg = Math.max(1, pendingEnemy.atk - playerDef);
          playerHp -= dmg;
          eventLog.push(`❌ Ausweichen fehlgeschlagen! **${pendingEnemy.name}** trifft dich (-${dmg} HP)`);
          pendingEnemy = null;

          if (playerHp <= 0) {
            gameOver = true;
            collector.stop('died');
            const embed = buildEmbed('💀 Gestorben!', `Du wurdest besiegt! Beute verloren!`, '#e74c3c');
            embed.setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` });
            btnInteraction.update({ embeds: [embed], components: [] });
            return;
          }

          collector.resetTimer({ time: 120000 });
          const embed = buildEmbed(`Raum ${currentRoom}`, `Du überlebst knapp! Weiter?`);
          btnInteraction.update({ embeds: [embed], components: buildButtons() });
        }
        return;
      }

      if (action === 'next') {
        currentRoom++;

        if (currentRoom > dungeon.rooms) {
          const boss = dungeon.boss;
          let bossHp = boss.hp;
          const rounds = Math.ceil(bossHp / Math.max(1, playerAtk));
          const totalDmg = rounds * Math.max(0, boss.atk - playerDef + 2);

          playerHp -= totalDmg;

          if (playerHp <= 0) {
            gameOver = true;
            collector.stop('boss_lost');
            eventLog.push(`💀 **${boss.emoji} ${boss.name}** hat dich besiegt! (-${totalDmg} HP)`);
            const embed = buildEmbed(`Boss: ${boss.emoji} ${boss.name}`, `Der Boss war zu stark!\n\n💀 Alle Beute verloren!`, '#e74c3c');
            embed.setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` });
            btnInteraction.update({ embeds: [embed], components: [] });
            return;
          }

          bossDefeated = true;
          gameOver = true;
          collector.stop('boss_won');
          const bossGold = dungeon.loot[0] + Math.floor(Math.random() * (dungeon.loot[1] - dungeon.loot[0]));
          gold += bossGold;
          db.updateBalance(userId, gold);

          eventLog.push(`🏆 **${boss.emoji} ${boss.name}** besiegt! (+${config.currencySymbol}${bossGold})`);

          const lootItems = [];
          if (Math.random() < 0.25 * dungeon.difficulty) {
            db.addToInventory(userId, 'Heiltrank');
            lootItems.push('🧪 Heiltrank');
          }
          if (Math.random() < 0.1 * dungeon.difficulty) {
            db.addToInventory(userId, 'Magischer Stein');
            lootItems.push('💠 Magischer Stein');
          }

          const embed = buildEmbed(`🏆 Boss besiegt!`,
            `Du hast **${boss.emoji} ${boss.name}** besiegt!\n\n` +
            `💰 Gesamtbeute: **${config.currencySymbol}${gold.toLocaleString()}**\n` +
            (lootItems.length > 0 ? `🎁 Loot: ${lootItems.join(', ')}\n` : '') +
            `❤️ Überlebt mit **${playerHp}** HP!`,
            '#FFD700');
          embed.setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` });
          btnInteraction.update({ embeds: [embed], components: [] });
          return;
        }

        const event = pickEvent();

        if (event === 'combat') {
          const enemyName = dungeon.enemies[Math.floor(Math.random() * dungeon.enemies.length)];
          pendingEnemy = { name: enemyName, atk: 6 + dungeon.difficulty * 4 + Math.floor(Math.random() * 5) };
          const embed = buildEmbed(`Raum ${currentRoom} — ⚔️ Kampf!`, `Ein **${enemyName}** erscheint!\nATK: **${pendingEnemy.atk}**\n\nKämpfen oder ausweichen?`);
          btnInteraction.update({ embeds: [embed], components: combatButtons() });
        } else if (event === 'trap') {
          const trapDmg = 5 + Math.floor(Math.random() * 10) * dungeon.difficulty;
          playerHp -= trapDmg;
          eventLog.push(`🪤 Falle! Du verlierst **${trapDmg}** HP!`);
          if (playerHp <= 0) {
            gameOver = true;
            collector.stop('trap_died');
            const embed = buildEmbed('💀 Falle!', `Eine Falle hat dich getötet!\n\n💀 Alle Beute verloren!`, '#e74c3c');
            embed.setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` });
            btnInteraction.update({ embeds: [embed], components: [] });
            return;
          }
          collector.resetTimer({ time: 120000 });
          const embed = buildEmbed(`Raum ${currentRoom} — 🪤 Falle!`, `Du bist in eine Falle getreten! (-${trapDmg} HP)\nWeiter erkunden?`);
          btnInteraction.update({ embeds: [embed], components: buildButtons() });
        } else if (event === 'treasure') {
          const treasureGold = 30 * dungeon.difficulty + Math.floor(Math.random() * 50);
          gold += treasureGold;
          eventLog.push(`💎 Schatzkiste! +**${config.currencySymbol}${treasureGold}**`);
          collector.resetTimer({ time: 120000 });
          const embed = buildEmbed(`Raum ${currentRoom} — 💎 Schatz!`, `Du findest eine Schatzkiste!\n+**${config.currencySymbol}${treasureGold}**\n\nWeiter?`);
          btnInteraction.update({ embeds: [embed], components: buildButtons() });
        } else if (event === 'rest') {
          const heal = 15 + Math.floor(Math.random() * 20);
          playerHp = Math.min(playerMaxHp, playerHp + heal);
          eventLog.push(`⛺ Rastplatz! +**${heal}** HP`);
          collector.resetTimer({ time: 120000 });
          const embed = buildEmbed(`Raum ${currentRoom} — ⛺ Rastplatz`, `Du findest einen Rastplatz und erholst dich.\n+**${heal}** HP\n\nWeiter?`);
          btnInteraction.update({ embeds: [embed], components: buildButtons() });
        } else {
          const discount = Math.random() < 0.5;
          if (discount && playerHp < playerMaxHp * 0.7) {
            const heal = Math.floor(playerMaxHp * 0.4);
            playerHp = Math.min(playerMaxHp, playerHp + heal);
            eventLog.push(`🧙 Händler heilt dich! +**${heal}** HP`);
          } else {
            const bonus = 3 + Math.floor(Math.random() * 3);
            playerAtk += bonus;
            eventLog.push(`🧙 Händler verstärkt dein Schwert! +**${bonus}** ATK`);
          }
          collector.resetTimer({ time: 120000 });
          const embed = buildEmbed(`Raum ${currentRoom} — 🧙 Händler`, `Ein wandernder Händler hilft dir!\n\n${eventLog[eventLog.length - 1]}\n\nWeiter?`);
          btnInteraction.update({ embeds: [embed], components: buildButtons() });
        }
      }
    });

    collector.on('end', (_, reason) => {
      if (reason === 'time' && !gameOver) {
        gameOver = true;
        if (gold > 0) db.updateBalance(userId, gold);
        const embed = buildEmbed('⏰ Zeit abgelaufen', `Du verlässt den Dungeon.\n💰 Beute: **${config.currencySymbol}${gold}**`, '#f39c12');
        embed.setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` });
        msg.edit({ embeds: [embed], components: [] });
      }
    });
  },
};
