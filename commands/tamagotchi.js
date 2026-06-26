const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const FEED_COOLDOWN = 30 * 60 * 1000;
const PLAY_COOLDOWN = 20 * 60 * 1000;
const TRAIN_COOLDOWN = 60 * 60 * 1000;

const creatures = [
  { id: 'drachi', name: 'Drachi', emoji: '🐉', baseAtk: 3, baseDef: 2 },
  { id: 'wolfi', name: 'Wolfi', emoji: '🐺', baseAtk: 4, baseDef: 1 },
  { id: 'baeri', name: 'Bäri', emoji: '🐻', baseAtk: 2, baseDef: 4 },
  { id: 'katz', name: 'Katz', emoji: '🐱', baseAtk: 2, baseDef: 2 },
  { id: 'phoenix', name: 'Phoenix', emoji: '🦅', baseAtk: 5, baseDef: 1 },
  { id: 'schildi', name: 'Schildi', emoji: '🐢', baseAtk: 1, baseDef: 5 },
];

const evolutions = [
  { level: 1, stage: 'Baby', emoji: '🥒' },
  { level: 5, stage: 'Kind', emoji: '🌱' },
  { level: 10, stage: 'Jugendlich', emoji: '🌿' },
  { level: 20, stage: 'Erwachsen', emoji: '🌳' },
  { level: 35, stage: 'Meister', emoji: '👑' },
  { level: 50, stage: 'Legendär', emoji: '⭐' },
];

const foods = [
  { name: 'Apfel', emoji: '🍎', hunger: 15, happiness: 5, cost: 50 },
  { name: 'Fleisch', emoji: '🥩', hunger: 30, happiness: 10, cost: 150 },
  { name: 'Kuchen', emoji: '🍰', hunger: 10, happiness: 25, cost: 200 },
  { name: 'Goldapfel', emoji: '🍏', hunger: 50, happiness: 30, cost: 500 },
  { name: 'Drachenfrucht', emoji: '🐲', hunger: 40, happiness: 40, cost: 800 },
];

const tricks = [
  { name: 'Sitz', minLevel: 1, xp: 10, reward: 50 },
  { name: 'Platz', minLevel: 3, xp: 15, reward: 80 },
  { name: 'Rolle', minLevel: 5, xp: 25, reward: 150 },
  { name: 'High Five', minLevel: 8, xp: 35, reward: 250 },
  { name: 'Tanz', minLevel: 12, xp: 50, reward: 400 },
  { name: 'Feuerball', minLevel: 18, xp: 75, reward: 700 },
  { name: 'Teleport', minLevel: 25, xp: 100, reward: 1000 },
];

function ensureTamagotchiTable() {
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS tamagotchi (
      user_id TEXT PRIMARY KEY,
      creature_id TEXT NOT NULL,
      nickname TEXT NOT NULL,
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      hunger INTEGER DEFAULT 100,
      happiness INTEGER DEFAULT 100,
      energy INTEGER DEFAULT 100,
      atk INTEGER DEFAULT 0,
      def INTEGER DEFAULT 0,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      tricks_learned TEXT DEFAULT '[]',
      created_at TEXT NOT NULL,
      last_fed TEXT,
      last_played TEXT,
      last_trained TEXT,
      last_decay TEXT
    )
  `);
}

function getTamagotchi(userId) {
  return db.db.prepare('SELECT * FROM tamagotchi WHERE user_id = ?').get(userId);
}

function getXpForLevel(level) {
  return Math.floor(50 * Math.pow(level, 1.5));
}

function getEvolution(level) {
  let evo = evolutions[0];
  for (const e of evolutions) {
    if (level >= e.level) evo = e;
  }
  return evo;
}

function applyDecay(tama) {
  if (!tama.last_decay) {
    db.db.prepare('UPDATE tamagotchi SET last_decay = ? WHERE user_id = ?')
      .run(new Date().toISOString(), tama.user_id);
    return tama;
  }

  const elapsed = Date.now() - new Date(tama.last_decay).getTime();
  const hours = Math.floor(elapsed / (60 * 60 * 1000));

  if (hours >= 1) {
    const hungerLoss = Math.min(tama.hunger, hours * 3);
    const happyLoss = Math.min(tama.happiness, hours * 2);
    const energyGain = Math.min(100 - tama.energy, hours * 5);

    db.db.prepare(`
      UPDATE tamagotchi
      SET hunger = MAX(0, hunger - ?),
          happiness = MAX(0, happiness - ?),
          energy = MIN(100, energy + ?),
          last_decay = ?
      WHERE user_id = ?
    `).run(hungerLoss, happyLoss, energyGain, new Date().toISOString(), tama.user_id);

    return getTamagotchi(tama.user_id);
  }
  return tama;
}

function buildStatusBar(value, max = 100) {
  const filled = Math.floor((value / max) * 10);
  return '█'.repeat(filled) + '░'.repeat(10 - filled) + ` ${value}/${max}`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tamagotchi')
    .setDescription('Virtuelles Haustier — Aufziehen, Trainieren, Kämpfen!')
    .addSubcommand(sub =>
      sub.setName('adoptieren')
        .setDescription('Adoptiere ein Tamagotchi!')
        .addStringOption(opt =>
          opt.setName('kreatur')
            .setDescription('Welche Kreatur?')
            .setRequired(true)
            .addChoices(...creatures.map(c => ({ name: `${c.emoji} ${c.name}`, value: c.id }))))
        .addStringOption(opt =>
          opt.setName('name')
            .setDescription('Spitzname für dein Tamagotchi')
            .setRequired(true)
            .setMaxLength(20)))
    .addSubcommand(sub =>
      sub.setName('status')
        .setDescription('Zeige deinen Tamagotchi-Status'))
    .addSubcommand(sub =>
      sub.setName('fuettern')
        .setDescription('Füttere dein Tamagotchi')
        .addStringOption(opt =>
          opt.setName('futter')
            .setDescription('Was füttern?')
            .setRequired(true)
            .addChoices(...foods.map(f => ({ name: `${f.emoji} ${f.name} (${f.cost}$)`, value: f.name })))))
    .addSubcommand(sub =>
      sub.setName('spielen')
        .setDescription('Spiele mit deinem Tamagotchi'))
    .addSubcommand(sub =>
      sub.setName('trainieren')
        .setDescription('Trainiere Tricks mit deinem Tamagotchi'))
    .addSubcommand(sub =>
      sub.setName('kampf')
        .setDescription('Lass dein Tamagotchi gegen ein anderes kämpfen!')
        .addUserOption(opt =>
          opt.setName('gegner')
            .setDescription('Gegen wen kämpfen?')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('freilassen')
        .setDescription('Lasse dein Tamagotchi frei (unwiderruflich!)')),
  async execute(interaction) {
    ensureTamagotchiTable();
    const userId = interaction.user.id;
    const config = require('../config.json');
    const action = interaction.options.getSubcommand();

    if (action === 'adoptieren') {
      const existing = getTamagotchi(userId);
      if (existing) return interaction.reply('❌ Du hast bereits ein Tamagotchi! Nutze `/tamagotchi freilassen` zuerst.');

      const creatureId = interaction.options.getString('kreatur');
      const nickname = interaction.options.getString('name');
      const creature = creatures.find(c => c.id === creatureId);

      db.db.prepare(`
        INSERT INTO tamagotchi (user_id, creature_id, nickname, atk, def, created_at, last_decay)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(userId, creatureId, nickname, creature.baseAtk, creature.baseDef, new Date().toISOString(), new Date().toISOString());

      const embed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle(`${creature.emoji} Tamagotchi adoptiert!`)
        .setDescription(
          `Du hast **${nickname}** das **${creature.name}** adoptiert!\n\n` +
          `⚔️ ATK: **${creature.baseAtk}** | 🛡️ DEF: **${creature.baseDef}**\n\n` +
          `Füttere, spiele und trainiere mit ${nickname}!\n` +
          `Vergiss nicht — Hunger und Glück sinken über Zeit!`
        )
        .setFooter({ text: 'Nutze /tamagotchi status um deinen Status zu sehen' })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'status') {
      let tama = getTamagotchi(userId);
      if (!tama) return interaction.reply('❌ Du hast kein Tamagotchi! Nutze `/tamagotchi adoptieren`.');

      tama = applyDecay(tama);
      const creature = creatures.find(c => c.id === tama.creature_id);
      const evo = getEvolution(tama.level);
      const xpNeeded = getXpForLevel(tama.level);
      const learnedTricks = JSON.parse(tama.tricks_learned || '[]');

      const mood = tama.happiness >= 80 ? '😊 Glücklich' :
                   tama.happiness >= 50 ? '😐 Zufrieden' :
                   tama.happiness >= 20 ? '😢 Traurig' : '😡 Wütend';

      const embed = new EmbedBuilder()
        .setColor(tama.happiness >= 50 ? '#2ecc71' : '#e74c3c')
        .setTitle(`${creature.emoji} ${tama.nickname} — ${evo.emoji} ${evo.stage}`)
        .setDescription(
          `**Level ${tama.level}** | XP: ${tama.xp}/${xpNeeded}\n` +
          `Stimmung: ${mood}\n\n` +
          `🍖 Hunger: \`${buildStatusBar(tama.hunger)}\`\n` +
          `💖 Glück: \`${buildStatusBar(tama.happiness)}\`\n` +
          `⚡ Energie: \`${buildStatusBar(tama.energy)}\`\n\n` +
          `⚔️ ATK: **${tama.atk}** | 🛡️ DEF: **${tama.def}**\n` +
          `🏆 Siege: **${tama.wins}** | 💀 Niederlagen: **${tama.losses}**\n\n` +
          `🎓 Tricks: **${learnedTricks.length}/${tricks.length}**\n` +
          (learnedTricks.length > 0 ? learnedTricks.join(', ') : '_Noch keine_')
        )
        .setFooter({ text: `Adoptiert am ${new Date(tama.created_at).toLocaleDateString('de-DE')}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'fuettern') {
      let tama = getTamagotchi(userId);
      if (!tama) return interaction.reply('❌ Du hast kein Tamagotchi!');

      tama = applyDecay(tama);

      if (tama.last_fed) {
        const elapsed = Date.now() - new Date(tama.last_fed).getTime();
        if (elapsed < FEED_COOLDOWN) {
          const remaining = Math.ceil((FEED_COOLDOWN - elapsed) / 1000);
          return interaction.reply(`⏳ Du kannst in **${Math.ceil(remaining / 60)}min** wieder füttern!`);
        }
      }

      const foodName = interaction.options.getString('futter');
      const food = foods.find(f => f.name === foodName);

      if (db.getBalance(userId) < food.cost) {
        return interaction.reply(`❌ ${food.emoji} ${food.name} kostet **${config.currencySymbol}${food.cost}**!`);
      }

      if (tama.hunger >= 100) {
        return interaction.reply(`❌ ${tama.nickname} ist schon satt! 🍽️`);
      }

      db.updateBalance(userId, -food.cost);
      const newHunger = Math.min(100, tama.hunger + food.hunger);
      const newHappy = Math.min(100, tama.happiness + food.happiness);
      const xpGain = Math.floor(food.cost / 20);

      db.db.prepare(`
        UPDATE tamagotchi SET hunger = ?, happiness = ?, xp = xp + ?, last_fed = ? WHERE user_id = ?
      `).run(newHunger, newHappy, xpGain, new Date().toISOString(), userId);

      tama = getTamagotchi(userId);
      let levelUp = '';
      const xpNeeded = getXpForLevel(tama.level);
      if (tama.xp >= xpNeeded) {
        db.db.prepare('UPDATE tamagotchi SET level = level + 1, xp = xp - ?, atk = atk + 1, def = def + 1 WHERE user_id = ?')
          .run(xpNeeded, userId);
        tama = getTamagotchi(userId);
        const newEvo = getEvolution(tama.level);
        levelUp = `\n\n🎉 **LEVEL UP!** Level **${tama.level}**! ${newEvo.emoji} ${newEvo.stage}`;
      }

      const embed = new EmbedBuilder()
        .setColor('#e67e22')
        .setTitle(`${food.emoji} ${tama.nickname} frisst ${food.name}!`)
        .setDescription(
          `🍖 Hunger: **+${food.hunger}** → ${newHunger}/100\n` +
          `💖 Glück: **+${food.happiness}** → ${newHappy}/100\n` +
          `✨ XP: **+${xpGain}**` +
          levelUp
        )
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'spielen') {
      let tama = getTamagotchi(userId);
      if (!tama) return interaction.reply('❌ Du hast kein Tamagotchi!');

      tama = applyDecay(tama);

      if (tama.last_played) {
        const elapsed = Date.now() - new Date(tama.last_played).getTime();
        if (elapsed < PLAY_COOLDOWN) {
          const remaining = Math.ceil((PLAY_COOLDOWN - elapsed) / 1000);
          return interaction.reply(`⏳ ${tama.nickname} muss sich ausruhen! Noch **${Math.ceil(remaining / 60)}min**`);
        }
      }

      if (tama.energy < 10) {
        return interaction.reply(`❌ ${tama.nickname} hat keine Energie mehr! Warte etwas. ⚡`);
      }

      const games = [
        { name: 'Fangen', emoji: '🏃', happyGain: 20 },
        { name: 'Verstecken', emoji: '🙈', happyGain: 15 },
        { name: 'Ball', emoji: '⚽', happyGain: 25 },
        { name: 'Schwimmen', emoji: '🏊', happyGain: 18 },
        { name: 'Klettern', emoji: '🧗', happyGain: 22 },
      ];

      const game = games[Math.floor(Math.random() * games.length)];
      const happyGain = game.happyGain + Math.floor(Math.random() * 10);
      const energyCost = 15 + Math.floor(Math.random() * 10);
      const xpGain = 15 + Math.floor(Math.random() * 10);
      const moneyReward = 50 + Math.floor(Math.random() * 100) + tama.level * 5;

      const newHappy = Math.min(100, tama.happiness + happyGain);
      const newEnergy = Math.max(0, tama.energy - energyCost);

      db.db.prepare(`
        UPDATE tamagotchi SET happiness = ?, energy = ?, xp = xp + ?, last_played = ? WHERE user_id = ?
      `).run(newHappy, newEnergy, xpGain, new Date().toISOString(), userId);
      db.updateBalance(userId, moneyReward);

      tama = getTamagotchi(userId);
      let levelUp = '';
      const xpNeeded = getXpForLevel(tama.level);
      if (tama.xp >= xpNeeded) {
        db.db.prepare('UPDATE tamagotchi SET level = level + 1, xp = xp - ?, atk = atk + 1, def = def + 1 WHERE user_id = ?')
          .run(xpNeeded, userId);
        tama = getTamagotchi(userId);
        levelUp = `\n\n🎉 **LEVEL UP!** Level **${tama.level}**!`;
      }

      const creature = creatures.find(c => c.id === tama.creature_id);
      const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle(`${game.emoji} ${tama.nickname} spielt ${game.name}!`)
        .setDescription(
          `${creature.emoji} ${tama.nickname} hat Spaß!\n\n` +
          `💖 Glück: **+${happyGain}** → ${newHappy}/100\n` +
          `⚡ Energie: **-${energyCost}** → ${newEnergy}/100\n` +
          `✨ XP: **+${xpGain}**\n` +
          `💰 Belohnung: **+${config.currencySymbol}${moneyReward}**` +
          levelUp
        )
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'trainieren') {
      let tama = getTamagotchi(userId);
      if (!tama) return interaction.reply('❌ Du hast kein Tamagotchi!');

      tama = applyDecay(tama);

      if (tama.last_trained) {
        const elapsed = Date.now() - new Date(tama.last_trained).getTime();
        if (elapsed < TRAIN_COOLDOWN) {
          const remaining = Math.ceil((TRAIN_COOLDOWN - elapsed) / 1000);
          return interaction.reply(`⏳ Nächstes Training in **${Math.ceil(remaining / 60)}min**!`);
        }
      }

      if (tama.energy < 20) {
        return interaction.reply(`❌ ${tama.nickname} braucht mehr Energie zum Trainieren! ⚡`);
      }

      if (tama.happiness < 30) {
        return interaction.reply(`❌ ${tama.nickname} ist zu traurig zum Trainieren! Spiel erst mit ihm. 💖`);
      }

      const learnedTricks = JSON.parse(tama.tricks_learned || '[]');
      const availableTricks = tricks.filter(t => !learnedTricks.includes(t.name) && tama.level >= t.minLevel);

      if (availableTricks.length === 0) {
        const nextTrick = tricks.find(t => !learnedTricks.includes(t.name));
        if (nextTrick) {
          return interaction.reply(`❌ Der nächste Trick **${nextTrick.name}** braucht Level **${nextTrick.minLevel}**! (Aktuell: ${tama.level})`);
        }
        return interaction.reply('🏆 Dein Tamagotchi kennt alle Tricks!');
      }

      const trick = availableTricks[0];
      const success = Math.random() < 0.6 + (tama.happiness / 500);

      if (success) {
        learnedTricks.push(trick.name);
        db.db.prepare(`
          UPDATE tamagotchi SET tricks_learned = ?, xp = xp + ?, energy = energy - 20, last_trained = ? WHERE user_id = ?
        `).run(JSON.stringify(learnedTricks), trick.xp, new Date().toISOString(), userId);
        db.updateBalance(userId, trick.reward);

        tama = getTamagotchi(userId);
        let levelUp = '';
        const xpNeeded = getXpForLevel(tama.level);
        if (tama.xp >= xpNeeded) {
          db.db.prepare('UPDATE tamagotchi SET level = level + 1, xp = xp - ?, atk = atk + 1, def = def + 1 WHERE user_id = ?')
            .run(xpNeeded, userId);
          tama = getTamagotchi(userId);
          levelUp = `\n\n🎉 **LEVEL UP!** Level **${tama.level}**!`;
        }

        const embed = new EmbedBuilder()
          .setColor('#2ecc71')
          .setTitle(`🎓 Trick gelernt: ${trick.name}!`)
          .setDescription(
            `${tama.nickname} hat **${trick.name}** gelernt! 🎉\n\n` +
            `✨ XP: **+${trick.xp}**\n` +
            `💰 Belohnung: **+${config.currencySymbol}${trick.reward}**\n` +
            `🎓 Tricks: **${learnedTricks.length}/${tricks.length}**` +
            levelUp
          )
          .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      } else {
        db.db.prepare('UPDATE tamagotchi SET energy = energy - 15, xp = xp + 5, last_trained = ? WHERE user_id = ?')
          .run(new Date().toISOString(), userId);

        const embed = new EmbedBuilder()
          .setColor('#e74c3c')
          .setTitle(`🎓 Training fehlgeschlagen!`)
          .setDescription(
            `${tama.nickname} konnte **${trick.name}** noch nicht lernen...\n\n` +
            `✨ XP: **+5** (Übung)\n` +
            `⚡ Energie: **-15**\n\n` +
            `Versuche es nochmal! Glückliche Tamagotchis lernen schneller. 💖`
          )
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }
    }

    if (action === 'kampf') {
      let tama = getTamagotchi(userId);
      if (!tama) return interaction.reply('❌ Du hast kein Tamagotchi!');

      tama = applyDecay(tama);

      const targetUser = interaction.options.getUser('gegner');
      if (targetUser.id === userId) return interaction.reply('❌ Du kannst nicht gegen dich selbst kämpfen!');
      if (targetUser.bot) return interaction.reply('❌ Bots haben keine Tamagotchis!');

      let enemyTama = getTamagotchi(targetUser.id);
      if (!enemyTama) return interaction.reply(`❌ **${targetUser.username}** hat kein Tamagotchi!`);

      enemyTama = applyDecay(enemyTama);

      if (tama.energy < 25) return interaction.reply(`❌ ${tama.nickname} braucht mindestens **25 Energie** zum Kämpfen!`);
      if (tama.hunger < 20) return interaction.reply(`❌ ${tama.nickname} ist zu hungrig zum Kämpfen! Füttere erst.`);

      db.db.prepare('UPDATE tamagotchi SET energy = energy - 25 WHERE user_id = ?').run(userId);

      const playerPower = tama.atk * 2 + tama.def + tama.level * 1.5 + (tama.happiness / 10) + Math.random() * 20;
      const enemyPower = enemyTama.atk * 2 + enemyTama.def + enemyTama.level * 1.5 + (enemyTama.happiness / 10) + Math.random() * 20;

      const playerCreature = creatures.find(c => c.id === tama.creature_id);
      const enemyCreature = creatures.find(c => c.id === enemyTama.creature_id);

      const won = playerPower > enemyPower;
      const xpGain = won ? 30 + enemyTama.level * 2 : 10;
      const moneyWin = won ? 200 + tama.level * 20 : 0;

      if (won) {
        db.db.prepare('UPDATE tamagotchi SET wins = wins + 1, xp = xp + ? WHERE user_id = ?').run(xpGain, userId);
        db.db.prepare('UPDATE tamagotchi SET losses = losses + 1 WHERE user_id = ?').run(targetUser.id);
        if (moneyWin > 0) db.updateBalance(userId, moneyWin);
      } else {
        db.db.prepare('UPDATE tamagotchi SET losses = losses + 1, xp = xp + ? WHERE user_id = ?').run(xpGain, userId);
        db.db.prepare('UPDATE tamagotchi SET wins = wins + 1, xp = xp + 15 WHERE user_id = ?').run(targetUser.id);
      }

      tama = getTamagotchi(userId);
      let levelUp = '';
      const xpNeeded = getXpForLevel(tama.level);
      if (tama.xp >= xpNeeded) {
        db.db.prepare('UPDATE tamagotchi SET level = level + 1, xp = xp - ?, atk = atk + 1, def = def + 1 WHERE user_id = ?')
          .run(xpNeeded, userId);
        tama = getTamagotchi(userId);
        levelUp = `\n\n🎉 **${tama.nickname} LEVEL UP!** Level **${tama.level}**!`;
      }

      const rounds = [
        `${playerCreature.emoji} ${tama.nickname} greift an! (${Math.floor(playerPower)} Power)`,
        `${enemyCreature.emoji} ${enemyTama.nickname} kontert! (${Math.floor(enemyPower)} Power)`,
        won
          ? `💥 ${tama.nickname} gewinnt den Kampf!`
          : `💥 ${enemyTama.nickname} ist stärker!`,
      ];

      const embed = new EmbedBuilder()
        .setColor(won ? '#2ecc71' : '#e74c3c')
        .setTitle(won ? `⚔️ ${tama.nickname} gewinnt!` : `⚔️ ${tama.nickname} verliert!`)
        .setDescription(
          `${playerCreature.emoji} **${tama.nickname}** (Lv.${tama.level}) vs ${enemyCreature.emoji} **${enemyTama.nickname}** (Lv.${enemyTama.level})\n\n` +
          rounds.join('\n') + '\n\n' +
          `✨ XP: **+${xpGain}**\n` +
          (won ? `💰 Gewinn: **+${config.currencySymbol}${moneyWin}**` : `Beim nächsten Mal! 💪`) +
          levelUp
        )
        .setFooter({ text: `${tama.nickname}: ${tama.wins}W/${tama.losses}L` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'freilassen') {
      const tama = getTamagotchi(userId);
      if (!tama) return interaction.reply('❌ Du hast kein Tamagotchi!');

      const creature = creatures.find(c => c.id === tama.creature_id);

      const embed = new EmbedBuilder()
        .setColor('#e74c3c')
        .setTitle(`${creature.emoji} ${tama.nickname} freilassen?`)
        .setDescription(
          `Bist du sicher? **Das kann nicht rückgängig gemacht werden!**\n\n` +
          `Level: **${tama.level}** | Siege: **${tama.wins}**\n` +
          `Tricks: **${JSON.parse(tama.tricks_learned || '[]').length}**`
        );

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`tama_release_yes_${userId}`)
          .setLabel('Ja, freilassen')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`tama_release_no_${userId}`)
          .setLabel('Nein, behalten')
          .setStyle(ButtonStyle.Secondary)
      );

      const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
      const collector = msg.createMessageComponentCollector({ time: 15000 });

      collector.on('collect', (btn) => {
        if (btn.user.id !== userId) return btn.reply({ content: '❌ Das ist nicht dein Tamagotchi!', flags: 64 });

        if (btn.customId.includes('yes')) {
          db.db.prepare('DELETE FROM tamagotchi WHERE user_id = ?').run(userId);
          const farewell = new EmbedBuilder()
            .setColor('#95a5a6')
            .setTitle(`${creature.emoji} ${tama.nickname} wurde freigelassen...`)
            .setDescription(`${tama.nickname} winkt zum Abschied und verschwindet in der Wildnis. 👋`)
            .setTimestamp();
          btn.update({ embeds: [farewell], components: [] });
        } else {
          const keep = new EmbedBuilder()
            .setColor('#2ecc71')
            .setTitle(`${creature.emoji} ${tama.nickname} bleibt bei dir!`)
            .setDescription(`${tama.nickname} freut sich! 💖`)
            .setTimestamp();
          btn.update({ embeds: [keep], components: [] });
        }
        collector.stop();
      });

      collector.on('end', (_, reason) => {
        if (reason === 'time') {
          msg.edit({ components: [] });
        }
      });
    }
  },
};
