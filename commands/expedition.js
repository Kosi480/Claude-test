const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const COOLDOWN = 5 * 60 * 1000;
const cooldowns = new Map();

const locations = [
  {
    id: 'wald',
    name: 'Dunkler Wald',
    emoji: '🌲',
    color: '#2d5016',
    difficulty: 1,
    stages: 3,
    minLevel: 0,
    encounters: [
      { type: 'monster', name: 'Waldwolf', emoji: '🐺', hp: 15, atk: 4, reward: 200 },
      { type: 'monster', name: 'Giftspinne', emoji: '🕷️', hp: 10, atk: 6, reward: 250 },
      { type: 'treasure', name: 'Baumhöhle', emoji: '🕳️', reward: 300, item: 'Heiltrank' },
      { type: 'trap', name: 'Fallgrube', emoji: '⚠️', damage: 8 },
      { type: 'merchant', name: 'Waldhandler', emoji: '🧝', heal: 10, cost: 100 },
    ],
  },
  {
    id: 'hoehle',
    name: 'Kristallhöhle',
    emoji: '💎',
    color: '#6a0dad',
    difficulty: 2,
    stages: 4,
    minLevel: 3,
    encounters: [
      { type: 'monster', name: 'Höhlentroll', emoji: '👹', hp: 25, atk: 7, reward: 400 },
      { type: 'monster', name: 'Fledermausschwarm', emoji: '🦇', hp: 15, atk: 9, reward: 350 },
      { type: 'treasure', name: 'Kristallader', emoji: '💎', reward: 600, item: 'Mana-Kristall' },
      { type: 'trap', name: 'Stalaktit-Fall', emoji: '⚠️', damage: 12 },
      { type: 'puzzle', name: 'Steinrätsel', emoji: '🧩', reward: 500, failDamage: 10 },
      { type: 'merchant', name: 'Zwergenschmied', emoji: '⚒️', heal: 15, cost: 200 },
    ],
  },
  {
    id: 'vulkan',
    name: 'Vulkanfestung',
    emoji: '🌋',
    color: '#cc3300',
    difficulty: 3,
    stages: 5,
    minLevel: 8,
    encounters: [
      { type: 'monster', name: 'Lavawurm', emoji: '🐛', hp: 30, atk: 10, reward: 600 },
      { type: 'monster', name: 'Feuerdämon', emoji: '😈', hp: 35, atk: 12, reward: 800 },
      { type: 'treasure', name: 'Drachenhort', emoji: '🏆', reward: 1000, item: 'Drachenschuppe' },
      { type: 'trap', name: 'Lavastrom', emoji: '⚠️', damage: 18 },
      { type: 'puzzle', name: 'Feuerrätsel', emoji: '🧩', reward: 700, failDamage: 15 },
      { type: 'boss', name: 'Feuer-Elementar', emoji: '🔥', hp: 50, atk: 14, reward: 1500 },
    ],
  },
  {
    id: 'abgrund',
    name: 'Abgrund der Schatten',
    emoji: '🌑',
    color: '#1a1a2e',
    difficulty: 4,
    stages: 6,
    minLevel: 15,
    encounters: [
      { type: 'monster', name: 'Schattenwächter', emoji: '👤', hp: 40, atk: 13, reward: 900 },
      { type: 'monster', name: 'Seelenfresser', emoji: '👻', hp: 35, atk: 16, reward: 1000 },
      { type: 'treasure', name: 'Schattentruhe', emoji: '🗝️', reward: 1200, item: 'Schattendolch' },
      { type: 'trap', name: 'Leere', emoji: '⚠️', damage: 22 },
      { type: 'puzzle', name: 'Schattenrätsel', emoji: '🧩', reward: 1000, failDamage: 18 },
      { type: 'boss', name: 'Schattenlord', emoji: '🌑', hp: 65, atk: 18, reward: 2500 },
    ],
  },
  {
    id: 'himmel',
    name: 'Himmelstempel',
    emoji: '⛅',
    color: '#FFD700',
    difficulty: 5,
    stages: 7,
    minLevel: 25,
    encounters: [
      { type: 'monster', name: 'Sturmgeist', emoji: '🌪️', hp: 50, atk: 15, reward: 1200 },
      { type: 'monster', name: 'Himmelsdrache', emoji: '🐲', hp: 60, atk: 18, reward: 1800 },
      { type: 'treasure', name: 'Götterschrein', emoji: '✨', reward: 2000, item: 'Goldbarren' },
      { type: 'trap', name: 'Blitzfalle', emoji: '⚠️', damage: 25 },
      { type: 'puzzle', name: 'Göttliches Rätsel', emoji: '🧩', reward: 1500, failDamage: 20 },
      { type: 'boss', name: 'Himmelswächter', emoji: '👼', hp: 80, atk: 20, reward: 5000 },
    ],
  },
];

function ensureExpeditionTable() {
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS expeditions (
      user_id TEXT PRIMARY KEY,
      exp_level INTEGER DEFAULT 1,
      exp_xp INTEGER DEFAULT 0,
      total_expeditions INTEGER DEFAULT 0,
      total_earned INTEGER DEFAULT 0,
      bosses_defeated INTEGER DEFAULT 0,
      highest_location TEXT DEFAULT 'wald'
    )
  `);
}

function getExpPlayer(userId) {
  let player = db.db.prepare('SELECT * FROM expeditions WHERE user_id = ?').get(userId);
  if (!player) {
    db.db.prepare('INSERT INTO expeditions (user_id) VALUES (?)').run(userId);
    player = db.db.prepare('SELECT * FROM expeditions WHERE user_id = ?').get(userId);
  }
  return player;
}

function getXpForLevel(level) {
  return Math.floor(80 * Math.pow(level, 1.4));
}

function getPlayerPower(userId, expLevel) {
  const hasSchattendolch = db.hasItem(userId, 'Schattendolch');
  const hasDrachenschuppe = db.hasItem(userId, 'Drachenschuppe');
  let basePower = 8 + expLevel * 2;
  if (hasSchattendolch) basePower += 5;
  if (hasDrachenschuppe) basePower += 3;
  return basePower;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('expedition')
    .setDescription('Gehe auf gefährliche Expeditionen!')
    .addSubcommand(sub =>
      sub.setName('starten')
        .setDescription('Starte eine Expedition')
        .addStringOption(opt =>
          opt.setName('ort')
            .setDescription('Wohin?')
            .setRequired(true)
            .addChoices(...locations.map(l => ({ name: `${l.emoji} ${l.name} (Diff. ${l.difficulty})`, value: l.id })))))
    .addSubcommand(sub =>
      sub.setName('profil')
        .setDescription('Zeige dein Expeditions-Profil'))
    .addSubcommand(sub =>
      sub.setName('orte')
        .setDescription('Zeige alle verfügbaren Orte')),
  async execute(interaction) {
    ensureExpeditionTable();
    const userId = interaction.user.id;
    const config = require('../config.json');
    const action = interaction.options.getSubcommand();

    if (action === 'orte') {
      const player = getExpPlayer(userId);
      const list = locations.map(loc => {
        const unlocked = player.exp_level >= loc.minLevel;
        const bossExists = loc.encounters.some(e => e.type === 'boss');
        return `${unlocked ? loc.emoji : '🔒'} **${loc.name}** — Diff. ${'⭐'.repeat(loc.difficulty)}\n` +
          `  Stufen: ${loc.stages} | Min. Level: ${loc.minLevel} ${bossExists ? '| 👹 Boss' : ''}\n` +
          `  ${unlocked ? '✅ Freigeschaltet' : `❌ Braucht Level ${loc.minLevel}`}`;
      });

      const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle('🗺️ Expeditions-Orte')
        .setDescription(
          `Dein Level: **${player.exp_level}**\n\n` +
          list.join('\n\n')
        )
        .setFooter({ text: 'Starte mit /expedition starten ort:<name>' })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'profil') {
      const player = getExpPlayer(userId);
      const xpNeeded = getXpForLevel(player.exp_level);
      const bar = '█'.repeat(Math.floor((player.exp_xp / xpNeeded) * 10)) +
                  '░'.repeat(10 - Math.floor((player.exp_xp / xpNeeded) * 10));

      const unlockedCount = locations.filter(l => player.exp_level >= l.minLevel).length;

      const embed = new EmbedBuilder()
        .setColor('#e67e22')
        .setTitle(`🗺️ ${interaction.user.username}'s Expeditions-Profil`)
        .setDescription(
          `📊 Level: **${player.exp_level}**\n` +
          `✨ XP: \`${bar}\` ${player.exp_xp}/${xpNeeded}\n\n` +
          `🗺️ Expeditionen: **${player.total_expeditions}**\n` +
          `💰 Gesamt verdient: **${config.currencySymbol}${player.total_earned.toLocaleString()}**\n` +
          `👹 Bosse besiegt: **${player.bosses_defeated}**\n` +
          `🔓 Orte freigeschaltet: **${unlockedCount}/${locations.length}**`
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'starten') {
      const lastPlay = cooldowns.get(userId);
      if (lastPlay && Date.now() - lastPlay < COOLDOWN) {
        const remaining = Math.ceil((COOLDOWN - (Date.now() - lastPlay)) / 1000);
        return interaction.reply(`⏳ Nächste Expedition in **${Math.ceil(remaining / 60)}min**!`);
      }

      const locId = interaction.options.getString('ort');
      const location = locations.find(l => l.id === locId);
      const player = getExpPlayer(userId);

      if (player.exp_level < location.minLevel) {
        return interaction.reply(`❌ **${location.name}** braucht Level **${location.minLevel}**! (Du: ${player.exp_level})`);
      }

      cooldowns.set(userId, Date.now());

      let hp = 30 + player.exp_level * 3;
      const maxHp = hp;
      let totalReward = 0;
      let totalXp = 0;
      let stage = 0;
      let gameOver = false;
      let fled = false;
      const log = [];
      const itemsFound = [];
      let bossDefeated = false;

      const power = getPlayerPower(userId, player.exp_level);

      const getEncounter = () => {
        const isBossStage = stage === location.stages - 1;
        const pool = isBossStage
          ? location.encounters.filter(e => e.type === 'boss').length > 0
            ? location.encounters.filter(e => e.type === 'boss')
            : location.encounters.filter(e => e.type !== 'boss')
          : location.encounters.filter(e => e.type !== 'boss');
        return pool[Math.floor(Math.random() * pool.length)];
      };

      let currentEncounter = getEncounter();

      const buildEmbed = () => {
        const hpBar = '❤️'.repeat(Math.max(0, Math.ceil(hp / maxHp * 5))) +
                      '🖤'.repeat(5 - Math.max(0, Math.ceil(hp / maxHp * 5)));

        let encounterText = '';
        const enc = currentEncounter;
        switch (enc.type) {
          case 'monster':
          case 'boss':
            encounterText = `${enc.emoji} **${enc.name}** erscheint!\n⚔️ ATK: ${enc.atk} | ❤️ HP: ${enc.hp}\n${enc.type === 'boss' ? '👹 **BOSS-KAMPF!**\n' : ''}Kämpfen oder fliehen?`;
            break;
          case 'treasure':
            encounterText = `${enc.emoji} Du findest **${enc.name}**!\n💰 **+${config.currencySymbol}${enc.reward}** ${enc.item ? `und 📦 ${enc.item}` : ''}`;
            break;
          case 'trap':
            encounterText = `${enc.emoji} **Falle!** ${enc.name}\n💥 **-${enc.damage} HP**`;
            break;
          case 'puzzle':
            encounterText = `${enc.emoji} **${enc.name}** — Ein Rätsel blockiert den Weg!\nLöse es oder umgehe es.`;
            break;
          case 'merchant':
            encounterText = `${enc.emoji} **${enc.name}** bietet Heilung an!\n💚 +${enc.heal} HP für ${config.currencySymbol}${enc.cost}`;
            break;
        }

        return new EmbedBuilder()
          .setColor(location.color)
          .setTitle(`${location.emoji} ${location.name} — Stufe ${stage + 1}/${location.stages}`)
          .setDescription(
            `${hpBar} **${hp}/${maxHp} HP** | ⚔️ Power: **${power}**\n\n` +
            encounterText +
            (log.length > 0 ? `\n\n**Log:**\n${log.slice(-3).join('\n')}` : '') +
            `\n\n💰 Beute: **${config.currencySymbol}${totalReward.toLocaleString()}**`
          )
          .setFooter({ text: `Expedition Level ${player.exp_level} | ${location.name}` })
          .setTimestamp();
      };

      const buildButtons = () => {
        const enc = currentEncounter;
        const row = new ActionRowBuilder();

        switch (enc.type) {
          case 'monster':
          case 'boss':
            row.addComponents(
              new ButtonBuilder().setCustomId(`exp_fight_${userId}`).setLabel('⚔️ Kämpfen').setStyle(ButtonStyle.Danger),
              new ButtonBuilder().setCustomId(`exp_flee_${userId}`).setLabel('🏃 Fliehen').setStyle(ButtonStyle.Secondary)
                .setDisabled(enc.type === 'boss')
            );
            break;
          case 'treasure':
            row.addComponents(
              new ButtonBuilder().setCustomId(`exp_take_${userId}`).setLabel('💰 Einsammeln').setStyle(ButtonStyle.Success)
            );
            break;
          case 'trap':
            row.addComponents(
              new ButtonBuilder().setCustomId(`exp_endure_${userId}`).setLabel('💪 Weitermachen').setStyle(ButtonStyle.Primary)
            );
            break;
          case 'puzzle':
            row.addComponents(
              new ButtonBuilder().setCustomId(`exp_solve_${userId}`).setLabel('🧩 Lösen').setStyle(ButtonStyle.Primary),
              new ButtonBuilder().setCustomId(`exp_skip_${userId}`).setLabel('⏭️ Umgehen').setStyle(ButtonStyle.Secondary)
            );
            break;
          case 'merchant':
            row.addComponents(
              new ButtonBuilder().setCustomId(`exp_buy_${userId}`).setLabel(`💚 Heilen (${config.currencySymbol}${enc.cost})`).setStyle(ButtonStyle.Success)
                .setDisabled(db.getBalance(userId) < enc.cost),
              new ButtonBuilder().setCustomId(`exp_pass_${userId}`).setLabel('➡️ Weiter').setStyle(ButtonStyle.Secondary)
            );
            break;
        }
        return [row];
      };

      const processAutoEncounter = () => {
        const enc = currentEncounter;
        if (enc.type === 'trap') {
          hp -= enc.damage;
          log.push(`${enc.emoji} Falle! **-${enc.damage} HP**`);
        } else if (enc.type === 'treasure') {
          totalReward += enc.reward;
          totalXp += 15;
          if (enc.item) {
            db.addToInventory(userId, enc.item, 1);
            itemsFound.push(enc.item);
          }
          log.push(`${enc.emoji} Schatz! **+${config.currencySymbol}${enc.reward}** ${enc.item ? `+ ${enc.item}` : ''}`);
        }
      };

      if (['trap', 'treasure'].includes(currentEncounter.type)) {
        processAutoEncounter();
      }

      const msg = await interaction.reply({ embeds: [buildEmbed()], components: buildButtons(), fetchReply: true });
      const collector = msg.createMessageComponentCollector({ time: 120000 });

      collector.on('collect', (btn) => {
        if (btn.user.id !== userId) return btn.reply({ content: '❌ Das ist nicht deine Expedition!', flags: 64 });
        if (gameOver) return;

        const action = btn.customId.split('_')[1];
        const enc = currentEncounter;

        switch (action) {
          case 'fight': {
            const playerDmg = power + Math.floor(Math.random() * 6);
            const monsterDmg = Math.max(1, enc.atk - Math.floor(power / 4) + Math.floor(Math.random() * 4));
            const crit = Math.random() < 0.15;
            const finalPlayerDmg = crit ? Math.floor(playerDmg * 1.5) : playerDmg;

            if (finalPlayerDmg >= enc.hp) {
              totalReward += enc.reward;
              totalXp += enc.type === 'boss' ? 50 : 20;
              if (enc.type === 'boss') bossDefeated = true;
              log.push(`${enc.emoji} ${enc.name} besiegt! ${crit ? '💥 KRIT! ' : ''}**+${config.currencySymbol}${enc.reward}**`);
            } else {
              hp -= monsterDmg;
              totalReward += Math.floor(enc.reward * 0.5);
              totalXp += 10;
              log.push(`⚔️ Kampf gegen ${enc.name}: **-${monsterDmg} HP**, +${config.currencySymbol}${Math.floor(enc.reward * 0.5)}`);
            }
            break;
          }
          case 'flee': {
            const fleeDmg = Math.floor(enc.atk * 0.5);
            hp -= fleeDmg;
            log.push(`🏃 Geflohen vor ${enc.name}! **-${fleeDmg} HP**`);
            break;
          }
          case 'take': {
            if (enc.type !== 'treasure') {
              totalReward += enc.reward || 0;
              totalXp += 10;
            }
            log.push(`✅ Weiter!`);
            break;
          }
          case 'endure': {
            log.push(`💪 Du machst weiter trotz der Falle.`);
            break;
          }
          case 'solve': {
            const success = Math.random() < 0.5 + player.exp_level * 0.02;
            if (success) {
              totalReward += enc.reward;
              totalXp += 25;
              log.push(`🧩 Rätsel gelöst! **+${config.currencySymbol}${enc.reward}**`);
            } else {
              hp -= enc.failDamage;
              log.push(`🧩 Rätsel falsch! **-${enc.failDamage} HP**`);
            }
            break;
          }
          case 'skip': {
            log.push(`⏭️ Rätsel umgangen.`);
            break;
          }
          case 'buy': {
            if (db.getBalance(userId) >= enc.cost) {
              db.updateBalance(userId, -enc.cost);
              hp = Math.min(maxHp, hp + enc.heal);
              log.push(`💚 Geheilt! **+${enc.heal} HP** (-${config.currencySymbol}${enc.cost})`);
            }
            break;
          }
          case 'pass': {
            log.push(`➡️ Vorbeigelaufen.`);
            break;
          }
        }

        stage++;

        if (hp <= 0 || stage >= location.stages) {
          gameOver = true;
          collector.stop('done');

          const survived = hp > 0;
          const finalReward = survived ? totalReward : Math.floor(totalReward * 0.3);
          if (finalReward > 0) db.updateBalance(userId, finalReward);

          db.db.prepare(`
            UPDATE expeditions SET
              total_expeditions = total_expeditions + 1,
              total_earned = total_earned + ?,
              exp_xp = exp_xp + ?,
              bosses_defeated = bosses_defeated + ?
            WHERE user_id = ?
          `).run(finalReward, totalXp, bossDefeated ? 1 : 0, userId);

          const updated = getExpPlayer(userId);
          const xpNeeded = getXpForLevel(updated.exp_level);
          let levelUp = '';
          if (updated.exp_xp >= xpNeeded) {
            db.db.prepare('UPDATE expeditions SET exp_level = exp_level + 1, exp_xp = exp_xp - ? WHERE user_id = ?')
              .run(xpNeeded, userId);
            const newPlayer = getExpPlayer(userId);
            levelUp = `\n\n🎉 **LEVEL UP!** Expeditions-Level **${newPlayer.exp_level}**!`;
            const newUnlock = locations.find(l => l.minLevel === newPlayer.exp_level);
            if (newUnlock) levelUp += `\n🔓 **${newUnlock.emoji} ${newUnlock.name}** freigeschaltet!`;
          }

          const embed = new EmbedBuilder()
            .setColor(survived ? '#FFD700' : '#e74c3c')
            .setTitle(survived
              ? `${location.emoji} Expedition erfolgreich!`
              : `${location.emoji} Expedition gescheitert!`)
            .setDescription(
              `${survived ? '🏆' : '💀'} ${survived ? 'Du kehrst siegreich zurück!' : 'Du wurdest besiegt...'}\n\n` +
              `**Log:**\n${log.join('\n')}\n\n` +
              `💰 Beute: **${config.currencySymbol}${finalReward.toLocaleString()}**${!survived ? ' (30% Verlust)' : ''}\n` +
              `✨ XP: **+${totalXp}**` +
              (itemsFound.length > 0 ? `\n📦 Items: ${itemsFound.join(', ')}` : '') +
              (bossDefeated ? '\n👹 **BOSS BESIEGT!**' : '') +
              levelUp
            )
            .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
            .setTimestamp();
          btn.update({ embeds: [embed], components: [] });
          return;
        }

        currentEncounter = getEncounter();
        if (['trap', 'treasure'].includes(currentEncounter.type)) {
          processAutoEncounter();
        }

        if (hp <= 0) {
          gameOver = true;
          collector.stop('dead');

          const finalReward = Math.floor(totalReward * 0.3);
          if (finalReward > 0) db.updateBalance(userId, finalReward);

          db.db.prepare('UPDATE expeditions SET total_expeditions = total_expeditions + 1, total_earned = total_earned + ?, exp_xp = exp_xp + ? WHERE user_id = ?')
            .run(finalReward, totalXp, userId);

          const embed = new EmbedBuilder()
            .setColor('#e74c3c')
            .setTitle(`💀 Expedition gescheitert!`)
            .setDescription(
              `Du wurdest in **${location.name}** besiegt!\n\n` +
              `**Log:**\n${log.join('\n')}\n\n` +
              `💰 Beute (30%): **${config.currencySymbol}${finalReward.toLocaleString()}**`
            )
            .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
            .setTimestamp();
          btn.update({ embeds: [embed], components: [] });
          return;
        }

        collector.resetTimer({ time: 120000 });
        btn.update({ embeds: [buildEmbed()], components: buildButtons() });
      });

      collector.on('end', (_, reason) => {
        if (reason === 'time' && !gameOver) {
          gameOver = true;
          const finalReward = Math.floor(totalReward * 0.5);
          if (finalReward > 0) db.updateBalance(userId, finalReward);

          const embed = new EmbedBuilder()
            .setColor('#f39c12')
            .setTitle('⏰ Expedition abgebrochen!')
            .setDescription(`Du kehrst mit **${config.currencySymbol}${finalReward.toLocaleString()}** zurück (50% Beute).`)
            .setTimestamp();
          msg.edit({ embeds: [embed], components: [] });
        }
      });
    }
  },
};
