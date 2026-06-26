const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const FIGHT_COOLDOWN = 3 * 60 * 1000;
const TRAIN_COOLDOWN = 10 * 60 * 1000;
const cooldowns = new Map();

const ranks = [
  { id: 'sklave', name: 'Sklave', emoji: '⛓️', minWins: 0, reward: 100 },
  { id: 'novize', name: 'Novize', emoji: '🥉', minWins: 3, reward: 200 },
  { id: 'kaempfer', name: 'Kämpfer', emoji: '⚔️', minWins: 8, reward: 350 },
  { id: 'veteran', name: 'Veteran', emoji: '🥈', minWins: 15, reward: 500 },
  { id: 'champion', name: 'Champion', emoji: '🥇', minWins: 25, reward: 800 },
  { id: 'gladiator', name: 'Gladiator', emoji: '🏆', minWins: 40, reward: 1200 },
  { id: 'legende', name: 'Legende', emoji: '⭐', minWins: 60, reward: 2000 },
  { id: 'unsterblich', name: 'Unsterblicher', emoji: '👑', minWins: 100, reward: 3500 },
];

const weapons = [
  { id: 'faust', name: 'Fäuste', emoji: '👊', atk: 2, price: 0 },
  { id: 'dolch', name: 'Dolch', emoji: '🗡️', atk: 5, price: 300 },
  { id: 'schwert', name: 'Gladius', emoji: '⚔️', atk: 8, price: 1000 },
  { id: 'axt', name: 'Kriegsaxt', emoji: '🪓', atk: 12, price: 3000 },
  { id: 'dreizack', name: 'Dreizack', emoji: '🔱', atk: 16, price: 8000 },
  { id: 'flamme', name: 'Flammenklinge', emoji: '🔥', atk: 22, price: 20000 },
];

const armors = [
  { id: 'nackt', name: 'Keine Rüstung', emoji: '👤', def: 0, price: 0 },
  { id: 'leder', name: 'Lederrüstung', emoji: '🦺', def: 4, price: 500 },
  { id: 'kette', name: 'Kettenhemd', emoji: '⛓️', def: 8, price: 2000 },
  { id: 'platte', name: 'Plattenrüstung', emoji: '🛡️', def: 13, price: 6000 },
  { id: 'golden', name: 'Goldrüstung', emoji: '🥇', def: 18, price: 15000 },
  { id: 'goettlich', name: 'Göttliche Rüstung', emoji: '✨', def: 25, price: 40000 },
];

const arenaEnemies = [
  { name: 'Gefangener', emoji: '⛓️', baseHp: 20, baseAtk: 3, baseDef: 1, rank: 0 },
  { name: 'Straßenkämpfer', emoji: '👊', baseHp: 30, baseAtk: 6, baseDef: 3, rank: 1 },
  { name: 'Barbar', emoji: '🪓', baseHp: 45, baseAtk: 10, baseDef: 5, rank: 2 },
  { name: 'Söldner', emoji: '⚔️', baseHp: 60, baseAtk: 14, baseDef: 8, rank: 3 },
  { name: 'Elitekrieger', emoji: '🗡️', baseHp: 80, baseAtk: 18, baseDef: 12, rank: 4 },
  { name: 'Arena-Champion', emoji: '🏆', baseHp: 100, baseAtk: 22, baseDef: 15, rank: 5 },
  { name: 'Kriegsgott', emoji: '⚡', baseHp: 130, baseAtk: 28, baseDef: 20, rank: 6 },
  { name: 'Titan', emoji: '🏔️', baseHp: 170, baseAtk: 35, baseDef: 25, rank: 7 },
];

const trainStats = ['str', 'agi', 'end'];
const trainNames = { str: '💪 Stärke', agi: '💨 Beweglichkeit', end: '❤️ Ausdauer' };

function ensureGladiatorTable() {
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS gladiators (
      user_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      str INTEGER DEFAULT 5,
      agi INTEGER DEFAULT 5,
      end_stat INTEGER DEFAULT 5,
      weapon_id TEXT DEFAULT 'faust',
      armor_id TEXT DEFAULT 'nackt',
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      streak INTEGER DEFAULT 0,
      best_streak INTEGER DEFAULT 0,
      gold_earned INTEGER DEFAULT 0,
      last_fight TEXT,
      last_train TEXT,
      created_at TEXT NOT NULL
    )
  `);
}

function getGladiator(userId) {
  return db.db.prepare('SELECT * FROM gladiators WHERE user_id = ?').get(userId);
}

function getRank(wins) {
  let rank = ranks[0];
  for (const r of ranks) {
    if (wins >= r.minWins) rank = r;
  }
  return rank;
}

function getRankIndex(wins) {
  let idx = 0;
  for (let i = 0; i < ranks.length; i++) {
    if (wins >= ranks[i].minWins) idx = i;
  }
  return idx;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gladiator')
    .setDescription('Gladiator-Arena — Trainiere, Rüste aus, Kämpfe!')
    .addSubcommand(sub =>
      sub.setName('erstellen')
        .setDescription('Erstelle deinen Gladiator')
        .addStringOption(opt =>
          opt.setName('name')
            .setDescription('Name deines Gladiators')
            .setRequired(true)
            .setMaxLength(20)))
    .addSubcommand(sub =>
      sub.setName('status')
        .setDescription('Zeige deinen Gladiator'))
    .addSubcommand(sub =>
      sub.setName('kaempfen')
        .setDescription('Kämpfe in der Arena!'))
    .addSubcommand(sub =>
      sub.setName('trainieren')
        .setDescription('Trainiere einen Stat')
        .addStringOption(opt =>
          opt.setName('stat')
            .setDescription('Was trainieren?')
            .setRequired(true)
            .addChoices(
              { name: '💪 Stärke (+ATK)', value: 'str' },
              { name: '💨 Beweglichkeit (+Ausweichen)', value: 'agi' },
              { name: '❤️ Ausdauer (+HP)', value: 'end' }
            )))
    .addSubcommand(sub =>
      sub.setName('waffenladen')
        .setDescription('Kaufe Waffen')
        .addStringOption(opt =>
          opt.setName('kaufen')
            .setDescription('Welche Waffe?')
            .addChoices(...weapons.filter(w => w.price > 0).map(w => ({ name: `${w.emoji} ${w.name} (${w.price}$)`, value: w.id })))))
    .addSubcommand(sub =>
      sub.setName('ruestungsladen')
        .setDescription('Kaufe Rüstungen')
        .addStringOption(opt =>
          opt.setName('kaufen')
            .setDescription('Welche Rüstung?')
            .addChoices(...armors.filter(a => a.price > 0).map(a => ({ name: `${a.emoji} ${a.name} (${a.price}$)`, value: a.id })))))
    .addSubcommand(sub =>
      sub.setName('rangliste')
        .setDescription('Zeige die Arena-Ränge')),
  async execute(interaction) {
    ensureGladiatorTable();
    const userId = interaction.user.id;
    const config = require('../config.json');
    const action = interaction.options.getSubcommand();

    if (action === 'erstellen') {
      const existing = getGladiator(userId);
      if (existing) return interaction.reply('❌ Du hast bereits einen Gladiator! Kämpfe mit ihm weiter.');

      const name = interaction.options.getString('name');
      db.db.prepare('INSERT INTO gladiators (user_id, name, created_at) VALUES (?, ?, ?)')
        .run(userId, name, new Date().toISOString());

      const embed = new EmbedBuilder()
        .setColor('#e74c3c')
        .setTitle('⚔️ Gladiator erstellt!')
        .setDescription(
          `**${name}** betritt die Arena!\n\n` +
          `💪 Stärke: **5** | 💨 Beweglichkeit: **5** | ❤️ Ausdauer: **5**\n` +
          `👊 Waffe: Fäuste | 👤 Rüstung: Keine\n\n` +
          `Trainiere und rüste dich aus, bevor du kämpfst!`
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    const glad = getGladiator(userId);
    if (!glad && action !== 'rangliste') return interaction.reply('❌ Erstelle zuerst einen Gladiator mit `/gladiator erstellen`!');

    if (action === 'status') {
      const rank = getRank(glad.wins);
      const weapon = weapons.find(w => w.id === glad.weapon_id) || weapons[0];
      const armor = armors.find(a => a.id === glad.armor_id) || armors[0];
      const totalAtk = glad.str + weapon.atk;
      const totalDef = glad.end_stat + armor.def;
      const totalHp = 50 + glad.end_stat * 5;
      const dodgeChance = Math.min(30, glad.agi * 1.5);
      const nextRank = ranks.find(r => r.minWins > glad.wins);

      const embed = new EmbedBuilder()
        .setColor('#e74c3c')
        .setTitle(`${rank.emoji} ${glad.name} — ${rank.name}`)
        .setDescription(
          `**Stats:**\n` +
          `💪 Stärke: **${glad.str}** | 💨 Beweglichkeit: **${glad.agi}** | ❤️ Ausdauer: **${glad.end_stat}**\n\n` +
          `**Ausrüstung:**\n` +
          `${weapon.emoji} ${weapon.name} (⚔️+${weapon.atk}) | ${armor.emoji} ${armor.name} (🛡️+${armor.def})\n\n` +
          `**Kampfwerte:**\n` +
          `⚔️ ATK: **${totalAtk}** | 🛡️ DEF: **${totalDef}** | ❤️ HP: **${totalHp}** | 💨 Ausweichen: **${dodgeChance.toFixed(0)}%**\n\n` +
          `**Rekord:**\n` +
          `🏆 Siege: **${glad.wins}** | 💀 Niederlagen: **${glad.losses}** | 🔥 Streak: **${glad.streak}** (Best: ${glad.best_streak})\n` +
          `💰 Verdient: **${config.currencySymbol}${glad.gold_earned.toLocaleString()}**` +
          (nextRank ? `\n\n➡️ Nächster Rang: ${nextRank.emoji} **${nextRank.name}** (${nextRank.minWins - glad.wins} Siege)` : '\n\n👑 **Höchster Rang erreicht!**')
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'trainieren') {
      const lastTrain = cooldowns.get(`${userId}_train`);
      if (lastTrain && Date.now() - lastTrain < TRAIN_COOLDOWN) {
        const remaining = Math.ceil((TRAIN_COOLDOWN - (Date.now() - lastTrain)) / 1000);
        return interaction.reply(`⏳ Nächstes Training in **${Math.ceil(remaining / 60)}min**!`);
      }

      const stat = interaction.options.getString('stat');
      const cost = 200 + (glad[stat === 'end' ? 'end_stat' : stat]) * 50;

      if (db.getBalance(userId) < cost) {
        return interaction.reply(`❌ Training kostet **${config.currencySymbol}${cost}**!`);
      }

      cooldowns.set(`${userId}_train`, Date.now());
      db.updateBalance(userId, -cost);

      const column = stat === 'end' ? 'end_stat' : stat;
      const gain = 1 + (Math.random() < 0.2 ? 1 : 0);
      db.db.prepare(`UPDATE gladiators SET ${column} = ${column} + ? WHERE user_id = ?`).run(gain, userId);

      const updated = getGladiator(userId);
      const statName = trainNames[stat];

      const embed = new EmbedBuilder()
        .setColor('#e67e22')
        .setTitle(`💪 Training: ${statName}`)
        .setDescription(
          `${glad.name} trainiert hart!\n\n` +
          `${statName}: **+${gain}** → **${updated[column]}**\n` +
          (gain > 1 ? '🌟 **Bonus-Training!** Doppelter Fortschritt!\n' : '') +
          `💰 Kosten: **${config.currencySymbol}${cost}**`
        )
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'kaempfen') {
      const lastFight = cooldowns.get(`${userId}_fight`);
      if (lastFight && Date.now() - lastFight < FIGHT_COOLDOWN) {
        const remaining = Math.ceil((FIGHT_COOLDOWN - (Date.now() - lastFight)) / 1000);
        return interaction.reply(`⏳ Nächster Kampf in **${remaining}s**!`);
      }

      cooldowns.set(`${userId}_fight`, Date.now());

      const weapon = weapons.find(w => w.id === glad.weapon_id) || weapons[0];
      const armor = armors.find(a => a.id === glad.armor_id) || armors[0];
      const rankIdx = getRankIndex(glad.wins);
      const rank = ranks[rankIdx];

      const enemyPool = arenaEnemies.filter(e => e.rank <= rankIdx + 1 && e.rank >= Math.max(0, rankIdx - 1));
      const enemy = enemyPool[Math.floor(Math.random() * enemyPool.length)];
      const scaleFactor = 1 + rankIdx * 0.15;

      let playerHp = 50 + glad.end_stat * 5;
      const playerAtk = glad.str + weapon.atk;
      const playerDef = glad.end_stat + armor.def;
      const dodgeChance = Math.min(0.3, glad.agi * 0.015);

      let enemyHp = Math.floor(enemy.baseHp * scaleFactor);
      const enemyAtk = Math.floor(enemy.baseAtk * scaleFactor);
      const enemyDef = Math.floor(enemy.baseDef * scaleFactor);

      const rounds = [];
      let round = 0;

      while (playerHp > 0 && enemyHp > 0 && round < 10) {
        round++;
        const crit = Math.random() < 0.12;
        const playerDmg = Math.max(1, Math.floor((playerAtk * (0.8 + Math.random() * 0.4)) - enemyDef * 0.3) * (crit ? 2 : 1));
        enemyHp -= playerDmg;
        rounds.push(`⚔️ R${round}: ${glad.name} schlägt zu! **${playerDmg}** Schaden${crit ? ' 💥KRIT!' : ''}`);

        if (enemyHp <= 0) break;

        const dodged = Math.random() < dodgeChance;
        if (dodged) {
          rounds.push(`💨 ${glad.name} weicht aus!`);
        } else {
          const eDmg = Math.max(1, Math.floor((enemyAtk * (0.8 + Math.random() * 0.4)) - playerDef * 0.3));
          playerHp -= eDmg;
          rounds.push(`🗡️ ${enemy.emoji} ${enemy.name}: **${eDmg}** Schaden!`);
        }
      }

      const won = playerHp > 0 && enemyHp <= 0;
      const reward = won ? rank.reward + Math.floor(glad.streak * rank.reward * 0.1) : 0;

      if (won) {
        db.db.prepare('UPDATE gladiators SET wins = wins + 1, streak = streak + 1, best_streak = MAX(best_streak, streak + 1), gold_earned = gold_earned + ? WHERE user_id = ?')
          .run(reward, userId);
        db.updateBalance(userId, reward);
      } else {
        db.db.prepare('UPDATE gladiators SET losses = losses + 1, streak = 0 WHERE user_id = ?').run(userId);
      }

      const updatedGlad = getGladiator(userId);
      const newRank = getRank(updatedGlad.wins);
      const rankUp = won && newRank.id !== rank.id;

      const embed = new EmbedBuilder()
        .setColor(won ? '#FFD700' : '#e74c3c')
        .setTitle(won ? `⚔️ ${glad.name} SIEGT!` : `⚔️ ${glad.name} verliert!`)
        .setDescription(
          `${rank.emoji} **${glad.name}** vs ${enemy.emoji} **${enemy.name}**\n\n` +
          rounds.slice(-6).join('\n') + '\n\n' +
          `❤️ ${glad.name}: **${Math.max(0, playerHp)} HP** | ${enemy.emoji}: **${Math.max(0, enemyHp)} HP**\n\n` +
          (won
            ? `💰 Belohnung: **+${config.currencySymbol}${reward.toLocaleString()}**\n🔥 Streak: **${updatedGlad.streak}**`
            : `💀 Niederlage! Streak zurückgesetzt.`) +
          (rankUp ? `\n\n🎉 **RANG-AUFSTIEG!** ${newRank.emoji} **${newRank.name}**!` : '')
        )
        .setFooter({ text: `${updatedGlad.wins}W/${updatedGlad.losses}L | Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'waffenladen') {
      const buyId = interaction.options.getString('kaufen');
      if (buyId) {
        const weapon = weapons.find(w => w.id === buyId);
        const currentIdx = weapons.findIndex(w => w.id === glad.weapon_id);
        const newIdx = weapons.findIndex(w => w.id === buyId);
        if (newIdx <= currentIdx) return interaction.reply('❌ Du hast schon eine gleich gute oder bessere Waffe!');
        if (db.getBalance(userId) < weapon.price) return interaction.reply(`❌ Kostet **${config.currencySymbol}${weapon.price.toLocaleString()}**!`);

        db.updateBalance(userId, -weapon.price);
        db.db.prepare('UPDATE gladiators SET weapon_id = ? WHERE user_id = ?').run(weapon.id, userId);

        const embed = new EmbedBuilder()
          .setColor('#2ecc71')
          .setTitle(`${weapon.emoji} ${weapon.name} gekauft!`)
          .setDescription(`⚔️ ATK: **+${weapon.atk}**`)
          .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      const current = weapons.find(w => w.id === glad.weapon_id) || weapons[0];
      const list = weapons.map(w => {
        const owned = weapons.indexOf(w) <= weapons.indexOf(current);
        return `${w.emoji} **${w.name}** — ⚔️+${w.atk} ${owned ? '✅' : `| ${config.currencySymbol}${w.price.toLocaleString()}`}`;
      });

      const embed = new EmbedBuilder()
        .setColor('#e67e22')
        .setTitle('⚔️ Waffenladen')
        .setDescription(`Aktuelle Waffe: ${current.emoji} **${current.name}**\n\n${list.join('\n')}`)
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'ruestungsladen') {
      const buyId = interaction.options.getString('kaufen');
      if (buyId) {
        const armor = armors.find(a => a.id === buyId);
        const currentIdx = armors.findIndex(a => a.id === glad.armor_id);
        const newIdx = armors.findIndex(a => a.id === buyId);
        if (newIdx <= currentIdx) return interaction.reply('❌ Du hast schon eine gleich gute oder bessere Rüstung!');
        if (db.getBalance(userId) < armor.price) return interaction.reply(`❌ Kostet **${config.currencySymbol}${armor.price.toLocaleString()}**!`);

        db.updateBalance(userId, -armor.price);
        db.db.prepare('UPDATE gladiators SET armor_id = ? WHERE user_id = ?').run(armor.id, userId);

        const embed = new EmbedBuilder()
          .setColor('#2ecc71')
          .setTitle(`${armor.emoji} ${armor.name} gekauft!`)
          .setDescription(`🛡️ DEF: **+${armor.def}**`)
          .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      const current = armors.find(a => a.id === glad.armor_id) || armors[0];
      const list = armors.map(a => {
        const owned = armors.indexOf(a) <= armors.indexOf(current);
        return `${a.emoji} **${a.name}** — 🛡️+${a.def} ${owned ? '✅' : `| ${config.currencySymbol}${a.price.toLocaleString()}`}`;
      });

      const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle('🛡️ Rüstungsladen')
        .setDescription(`Aktuelle Rüstung: ${current.emoji} **${current.name}**\n\n${list.join('\n')}`)
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'rangliste') {
      const list = ranks.map(r => `${r.emoji} **${r.name}** — ab ${r.minWins} Siege | 💰 ${config.currencySymbol}${r.reward}/Kampf`);

      const embed = new EmbedBuilder()
        .setColor('#9b59b6')
        .setTitle('🏟️ Arena-Ränge')
        .setDescription(list.join('\n'))
        .setFooter({ text: 'Gewinne Kämpfe um aufzusteigen!' })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }
  },
};
