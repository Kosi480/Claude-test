const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const COOLDOWN = 3 * 60 * 1000;
const cooldowns = new Map();

function ensureNinjaTables() {
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS ninjas (
      user_id TEXT PRIMARY KEY,
      ninja_name TEXT DEFAULT '',
      clan INTEGER DEFAULT 0,
      rank INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      taijutsu INTEGER DEFAULT 5,
      ninjutsu INTEGER DEFAULT 5,
      genjutsu INTEGER DEFAULT 5,
      speed INTEGER DEFAULT 5,
      chakra INTEGER DEFAULT 100,
      max_chakra INTEGER DEFAULT 100,
      missions_done INTEGER DEFAULT 0,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      jutsu_slots INTEGER DEFAULT 2
    );
    CREATE TABLE IF NOT EXISTS ninja_jutsu (
      user_id TEXT,
      jutsu TEXT,
      PRIMARY KEY (user_id, jutsu)
    );
  `);
}

const clans = [
  { name: 'Schatten-Clan', emoji: '🌑', bonus: 'genjutsu', desc: 'Meister der Illusionen' },
  { name: 'Flammen-Clan', emoji: '🔥', bonus: 'ninjutsu', desc: 'Feuer-Spezialisten' },
  { name: 'Sturm-Clan', emoji: '⚡', bonus: 'speed', desc: 'Blitzschnelle Krieger' },
  { name: 'Stein-Clan', emoji: '🪨', bonus: 'taijutsu', desc: 'Unzerstörbare Kämpfer' },
  { name: 'Nebel-Clan', emoji: '🌫️', bonus: 'genjutsu', desc: 'Unsichtbare Assassinen' },
];

const ninjaRanks = [
  { name: 'Akademie-Schüler', emoji: '📚', minLevel: 1 },
  { name: 'Genin', emoji: '🎗️', minLevel: 3 },
  { name: 'Chunin', emoji: '🥋', minLevel: 6 },
  { name: 'Jonin', emoji: '⚔️', minLevel: 10 },
  { name: 'ANBU', emoji: '🎭', minLevel: 15 },
  { name: 'Kage', emoji: '👑', minLevel: 20 },
  { name: 'Legende', emoji: '🌟', minLevel: 30 },
];

const jutsuList = [
  { name: 'Feuerball', emoji: '🔥', type: 'ninjutsu', power: 15, chakraCost: 20, minLevel: 1, cost: 500 },
  { name: 'Schattenklon', emoji: '👥', type: 'ninjutsu', power: 12, chakraCost: 15, minLevel: 1, cost: 300 },
  { name: 'Blitzschlag', emoji: '⚡', type: 'ninjutsu', power: 20, chakraCost: 25, minLevel: 3, cost: 1000 },
  { name: 'Erdmauer', emoji: '🧱', type: 'taijutsu', power: 10, chakraCost: 15, minLevel: 2, cost: 600 },
  { name: 'Wasserdracke', emoji: '🐉', type: 'ninjutsu', power: 25, chakraCost: 30, minLevel: 5, cost: 2000 },
  { name: 'Genjutsu-Falle', emoji: '🌀', type: 'genjutsu', power: 18, chakraCost: 22, minLevel: 4, cost: 1500 },
  { name: 'Tausend Nadeln', emoji: '🪡', type: 'ninjutsu', power: 22, chakraCost: 28, minLevel: 6, cost: 2500 },
  { name: 'Rasengan', emoji: '🌪️', type: 'ninjutsu', power: 35, chakraCost: 40, minLevel: 8, cost: 5000 },
  { name: 'Tsukuyomi', emoji: '🌙', type: 'genjutsu', power: 30, chakraCost: 35, minLevel: 7, cost: 4000 },
  { name: 'Acht Tore', emoji: '💪', type: 'taijutsu', power: 40, chakraCost: 50, minLevel: 10, cost: 8000 },
  { name: 'Amaterasu', emoji: '☀️', type: 'ninjutsu', power: 45, chakraCost: 55, minLevel: 12, cost: 12000 },
  { name: 'Susanoo', emoji: '🗡️', type: 'ninjutsu', power: 50, chakraCost: 60, minLevel: 15, cost: 20000 },
];

const missionTypes = [
  { name: 'D-Rang: Katze fangen', emoji: '🐱', minLevel: 1, difficulty: 1, reward: { min: 200, max: 500 }, xp: 20 },
  { name: 'C-Rang: Eskorte', emoji: '🛡️', minLevel: 2, difficulty: 2, reward: { min: 400, max: 1000 }, xp: 35 },
  { name: 'B-Rang: Banditencamp', emoji: '⚔️', minLevel: 4, difficulty: 3, reward: { min: 800, max: 2000 }, xp: 55 },
  { name: 'A-Rang: Assassination', emoji: '🗡️', minLevel: 7, difficulty: 5, reward: { min: 1500, max: 4000 }, xp: 80 },
  { name: 'S-Rang: Bijuu-Jagd', emoji: '🐉', minLevel: 10, difficulty: 7, reward: { min: 3000, max: 8000 }, xp: 120 },
  { name: 'SS-Rang: Weltbedrohung', emoji: '🌍', minLevel: 15, difficulty: 10, reward: { min: 6000, max: 20000 }, xp: 200 },
];

function getNinja(userId) {
  ensureNinjaTables();
  let ninja = db.db.prepare('SELECT * FROM ninjas WHERE user_id = ?').get(userId);
  if (!ninja) {
    db.db.prepare('INSERT INTO ninjas (user_id) VALUES (?)').run(userId);
    ninja = db.db.prepare('SELECT * FROM ninjas WHERE user_id = ?').get(userId);
  }
  return ninja;
}

function getNinjaJutsu(userId) {
  return db.db.prepare('SELECT * FROM ninja_jutsu WHERE user_id = ?').all(userId);
}

function getRank(level) {
  let rank = ninjaRanks[0];
  for (const r of ninjaRanks) {
    if (level >= r.minLevel) rank = r;
  }
  return rank;
}

function addNinjaXP(userId, xp) {
  const ninja = getNinja(userId);
  const newXP = ninja.xp + xp;
  const needed = ninja.level * 140;
  if (newXP >= needed) {
    db.db.prepare('UPDATE ninjas SET xp = ?, level = level + 1, max_chakra = max_chakra + 10, chakra = MIN(chakra + 10, max_chakra + 10) WHERE user_id = ?')
      .run(newXP - needed, userId);
    return true;
  }
  db.db.prepare('UPDATE ninjas SET xp = ? WHERE user_id = ?').run(newXP, userId);
  return false;
}

function getCombatPower(ninja) {
  return ninja.taijutsu * 2 + ninja.ninjutsu * 2 + ninja.genjutsu * 2 + ninja.speed;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ninja')
    .setDescription('Werde ein Ninja — Trainiere, lerne Jutsu und kämpfe!')
    .addSubcommand(sub => sub.setName('profil').setDescription('Zeige dein Ninja-Profil'))
    .addSubcommand(sub => sub.setName('clan').setDescription('Wähle einen Clan')
      .addIntegerOption(opt => opt.setName('nummer').setDescription('Clan 1-5').setRequired(true).setMinValue(1).setMaxValue(5)))
    .addSubcommand(sub => sub.setName('trainieren').setDescription('Trainiere eine Fähigkeit')
      .addStringOption(opt => opt.setName('skill').setDescription('Fähigkeit').setRequired(true)
        .addChoices(
          { name: '👊 Taijutsu', value: 'taijutsu' },
          { name: '🔮 Ninjutsu', value: 'ninjutsu' },
          { name: '🌀 Genjutsu', value: 'genjutsu' },
          { name: '💨 Speed', value: 'speed' }
        )))
    .addSubcommand(sub => sub.setName('mission').setDescription('Starte eine Mission')
      .addIntegerOption(opt => opt.setName('rang').setDescription('Missionsrang 1-6').setRequired(true).setMinValue(1).setMaxValue(6)))
    .addSubcommand(sub => sub.setName('jutsu').setDescription('Zeige und kaufe Jutsu'))
    .addSubcommand(sub => sub.setName('lernen').setDescription('Lerne ein neues Jutsu')
      .addIntegerOption(opt => opt.setName('nummer').setDescription('Jutsu-Nr 1-12').setRequired(true).setMinValue(1).setMaxValue(12)))
    .addSubcommand(sub => sub.setName('kampf').setDescription('Kämpfe gegen einen anderen Ninja')
      .addUserOption(opt => opt.setName('gegner').setDescription('Dein Gegner').setRequired(true))),

  async execute(interaction) {
    const userId = interaction.user.id;
    const config = require('../config.json');
    const sub = interaction.options.getSubcommand();
    ensureNinjaTables();

    if (sub === 'profil') {
      const ninja = getNinja(userId);
      const rank = getRank(ninja.level);
      const clan = ninja.clan > 0 ? clans[ninja.clan - 1] : null;
      const xpNeeded = ninja.level * 140;
      const jutsu = getNinjaJutsu(userId);
      const power = getCombatPower(ninja);

      const embed = new EmbedBuilder()
        .setColor(clan ? '#e74c3c' : '#2c3e50')
        .setTitle(`${rank.emoji} ${ninja.ninja_name || interaction.user.username}`)
        .setDescription(
          `**Rang:** ${rank.name}\n` +
          `**Clan:** ${clan ? `${clan.emoji} ${clan.name}` : '_Kein Clan_'}\n` +
          `**Level:** ${ninja.level} (${ninja.xp}/${xpNeeded} XP)\n` +
          `**Kampfkraft:** ${power}\n\n` +
          `**Fähigkeiten:**\n` +
          `👊 Taijutsu: **${ninja.taijutsu}**\n` +
          `🔮 Ninjutsu: **${ninja.ninjutsu}**\n` +
          `🌀 Genjutsu: **${ninja.genjutsu}**\n` +
          `💨 Speed: **${ninja.speed}**\n` +
          `🔵 Chakra: **${ninja.chakra}/${ninja.max_chakra}**\n\n` +
          `**Jutsu:** ${jutsu.length > 0 ? jutsu.map(j => {
            const jd = jutsuList.find(x => x.name === j.jutsu);
            return `${jd ? jd.emoji : '📜'} ${j.jutsu}`;
          }).join(', ') : '_Keine_'}\n\n` +
          `📊 Missionen: **${ninja.missions_done}** | ⚔️ ${ninja.wins}W/${ninja.losses}L`
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'clan') {
      const ninja = getNinja(userId);
      if (ninja.clan > 0) return interaction.reply(`❌ Du bist bereits im ${clans[ninja.clan - 1].emoji} ${clans[ninja.clan - 1].name}!`);

      const clanIdx = interaction.options.getInteger('nummer');
      const clan = clans[clanIdx - 1];
      db.db.prepare('UPDATE ninjas SET clan = ? WHERE user_id = ?').run(clanIdx, userId);
      db.db.prepare(`UPDATE ninjas SET ${clan.bonus} = ${clan.bonus} + 3 WHERE user_id = ?`).run(userId);

      return interaction.reply(`${clan.emoji} Du bist dem **${clan.name}** beigetreten! ${clan.desc}\n+3 **${clan.bonus}** Bonus!`);
    }

    if (sub === 'trainieren') {
      const skill = interaction.options.getString('skill');
      const ninja = getNinja(userId);
      const cost = 200 + ninja[skill] * 100;
      const emojis = { taijutsu: '👊', ninjutsu: '🔮', genjutsu: '🌀', speed: '💨' };

      if (db.getBalance(userId) < cost) return interaction.reply(`❌ Training kostet **${config.currencySymbol}${cost.toLocaleString()}**!`);

      db.updateBalance(userId, -cost);
      db.db.prepare(`UPDATE ninjas SET ${skill} = ${skill} + 1 WHERE user_id = ?`).run(userId);

      return interaction.reply(`${emojis[skill]} **${skill}** trainiert! ${ninja[skill]} → **${ninja[skill] + 1}** (${config.currencySymbol}${cost.toLocaleString()})`);
    }

    if (sub === 'jutsu') {
      const ninja = getNinja(userId);
      const owned = getNinjaJutsu(userId);
      const ownedNames = owned.map(j => j.jutsu);

      const lines = jutsuList.map((j, i) => {
        const has = ownedNames.includes(j.name);
        const locked = j.minLevel > ninja.level;
        return `**${i + 1}.** ${j.emoji} **${j.name}** — ${j.type} | 💥 ${j.power} | 🔵 ${j.chakraCost}\n` +
          `   ${config.currencySymbol}${j.cost.toLocaleString()} | Lv.${j.minLevel}${has ? ' ✅' : locked ? ' 🔒' : ''}`;
      });

      const embed = new EmbedBuilder()
        .setColor('#9b59b6')
        .setTitle('📜 Jutsu-Bibliothek')
        .setDescription(lines.join('\n') + '\n\n*Lerne mit `/ninja lernen nummer:<Nr>`*')
        .setFooter({ text: `Level ${ninja.level} | Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'lernen') {
      const num = interaction.options.getInteger('nummer') - 1;
      const jutsu = jutsuList[num];
      if (!jutsu) return interaction.reply('❌ Ungültige Nummer!');

      const ninja = getNinja(userId);
      if (jutsu.minLevel > ninja.level) return interaction.reply(`🔒 Du brauchst **Level ${jutsu.minLevel}**!`);

      const owned = getNinjaJutsu(userId);
      if (owned.some(j => j.jutsu === jutsu.name)) return interaction.reply('❌ Du kannst dieses Jutsu bereits!');
      if (db.getBalance(userId) < jutsu.cost) return interaction.reply(`❌ Kostet **${config.currencySymbol}${jutsu.cost.toLocaleString()}**!`);

      db.updateBalance(userId, -jutsu.cost);
      db.db.prepare('INSERT OR IGNORE INTO ninja_jutsu (user_id, jutsu) VALUES (?, ?)').run(userId, jutsu.name);

      return interaction.reply(`${jutsu.emoji} **${jutsu.name}** gelernt! ${jutsu.type} | 💥 ${jutsu.power} | 🔵 ${jutsu.chakraCost} Chakra`);
    }

    if (sub === 'mission') {
      const lastPlay = cooldowns.get(userId);
      if (lastPlay && Date.now() - lastPlay < COOLDOWN) {
        const remaining = Math.ceil((COOLDOWN - (Date.now() - lastPlay)) / 1000);
        return interaction.reply(`⏳ Nächste Mission in **${remaining}s**!`);
      }

      const missionIdx = interaction.options.getInteger('rang') - 1;
      const mission = missionTypes[missionIdx];
      const ninja = getNinja(userId);

      if (ninja.level < mission.minLevel) return interaction.reply(`🔒 Du brauchst **Level ${mission.minLevel}** für ${mission.name}!`);

      cooldowns.set(userId, Date.now());

      const power = getCombatPower(ninja);
      const jutsu = getNinjaJutsu(userId);
      const jutsuBonus = jutsu.length * 5;
      const roll = Math.floor(Math.random() * 30) + 1;
      const score = power + jutsuBonus + roll;
      const threshold = mission.difficulty * 15 + 10;
      const success = score >= threshold;

      const chakraUsed = 10 + mission.difficulty * 5;
      db.db.prepare('UPDATE ninjas SET chakra = MAX(0, chakra - ?), missions_done = missions_done + 1 WHERE user_id = ?').run(chakraUsed, userId);

      if (success) {
        const reward = mission.reward.min + Math.floor(Math.random() * (mission.reward.max - mission.reward.min));
        db.updateBalance(userId, reward);
        const leveled = addNinjaXP(userId, mission.xp);
        const updated = getNinja(userId);
        const rank = getRank(updated.level);

        const embed = new EmbedBuilder()
          .setColor('#27ae60')
          .setTitle(`${mission.emoji} Mission Erfolgreich!`)
          .setDescription(
            `**${mission.name}** abgeschlossen!\n\n` +
            `🎲 Würfel: ${roll} + ⚔️ ${power} + 📜 ${jutsuBonus} = **${score}** ≥ ${threshold}\n\n` +
            `💰 **+${config.currencySymbol}${reward.toLocaleString()}**\n` +
            `⭐ **+${mission.xp} XP**\n` +
            `🔵 -${chakraUsed} Chakra` +
            (leveled ? `\n\n🎉 **LEVEL UP → ${updated.level}!** ${rank.emoji} ${rank.name}` : '')
          )
          .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      } else {
        addNinjaXP(userId, Math.floor(mission.xp * 0.2));
        const embed = new EmbedBuilder()
          .setColor('#e74c3c')
          .setTitle(`${mission.emoji} Mission Gescheitert!`)
          .setDescription(
            `**${mission.name}** fehlgeschlagen!\n\n` +
            `🎲 Würfel: ${roll} + ⚔️ ${power} + 📜 ${jutsuBonus} = **${score}** < ${threshold}\n\n` +
            `🔵 -${chakraUsed} Chakra\n` +
            `*Trainiere und lerne mehr Jutsu!*`
          )
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }
    }

    if (sub === 'kampf') {
      const target = interaction.options.getUser('gegner');
      if (target.id === userId) return interaction.reply('❌ Du kannst nicht gegen dich selbst kämpfen!');
      if (target.bot) return interaction.reply('❌ Bots sind keine Ninjas!');

      const ninja1 = getNinja(userId);
      const ninja2 = getNinja(target.id);
      const jutsu1 = getNinjaJutsu(userId);
      const jutsu2 = getNinjaJutsu(target.id);

      const bet = 200 + ninja1.level * 50;

      if (db.getBalance(userId) < bet) return interaction.reply(`❌ Du brauchst **${config.currencySymbol}${bet}** für den Kampf!`);
      if (db.getBalance(target.id) < bet) return interaction.reply(`❌ **${target.username}** hat nicht genug Geld!`);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`ninja_accept_${target.id}_${userId}_${bet}`).setLabel('⚔️ Annehmen').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`ninja_decline_${target.id}`).setLabel('❌ Ablehnen').setStyle(ButtonStyle.Danger)
      );

      const embed = new EmbedBuilder()
        .setColor('#e74c3c')
        .setTitle('⚔️ Ninja-Kampf — Herausforderung!')
        .setDescription(
          `**${interaction.user.username}** (Lv.${ninja1.level}) fordert **${target.username}** (Lv.${ninja2.level}) heraus!\n\n` +
          `💰 Einsatz: **${config.currencySymbol}${bet}** pro Kämpfer`
        )
        .setTimestamp();

      const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
      const coll = msg.createMessageComponentCollector({ time: 30000 });

      coll.on('collect', (btn) => {
        if (btn.customId.startsWith('ninja_decline')) {
          if (btn.user.id !== target.id) return btn.reply({ content: '❌ Nicht für dich!', flags: 64 });
          coll.stop();
          btn.update({ content: `❌ **${target.username}** hat den Kampf abgelehnt.`, embeds: [], components: [] });
          return;
        }

        if (btn.user.id !== target.id) return btn.reply({ content: '❌ Nicht für dich!', flags: 64 });
        coll.stop();

        db.updateBalance(userId, -bet);
        db.updateBalance(target.id, -bet);

        const power1 = getCombatPower(ninja1) + jutsu1.length * 5 + Math.floor(Math.random() * 20);
        const power2 = getCombatPower(ninja2) + jutsu2.length * 5 + Math.floor(Math.random() * 20);

        const rounds = [];
        let hp1 = 100 + ninja1.taijutsu * 3;
        let hp2 = 100 + ninja2.taijutsu * 3;

        for (let r = 0; r < 5 && hp1 > 0 && hp2 > 0; r++) {
          const atk1 = Math.floor(power1 * (0.7 + Math.random() * 0.6));
          const atk2 = Math.floor(power2 * (0.7 + Math.random() * 0.6));
          const dodge1 = Math.random() * 100 < ninja1.speed * 2;
          const dodge2 = Math.random() * 100 < ninja2.speed * 2;

          const dmg1 = dodge2 ? 0 : atk1;
          const dmg2 = dodge1 ? 0 : atk2;
          hp2 -= dmg1;
          hp1 -= dmg2;

          rounds.push(
            `**Runde ${r + 1}:**\n` +
            `${interaction.user.username}: ${dodge2 ? '💨 Ausgewichen!' : `💥 ${dmg1} Schaden`}\n` +
            `${target.username}: ${dodge1 ? '💨 Ausgewichen!' : `💥 ${dmg2} Schaden`}`
          );
        }

        const winner = hp1 > hp2 ? userId : hp2 > hp1 ? target.id : null;
        const prize = bet * 2;

        if (winner) {
          db.updateBalance(winner, prize);
          db.db.prepare('UPDATE ninjas SET wins = wins + 1 WHERE user_id = ?').run(winner);
          const loser = winner === userId ? target.id : userId;
          db.db.prepare('UPDATE ninjas SET losses = losses + 1 WHERE user_id = ?').run(loser);
          addNinjaXP(winner, 30);
          addNinjaXP(loser, 10);

          const winnerName = winner === userId ? interaction.user.username : target.username;
          const resultEmbed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle(`⚔️ ${winnerName} gewinnt den Ninja-Kampf!`)
            .setDescription(rounds.join('\n\n') + `\n\n🏆 **${winnerName}** gewinnt **${config.currencySymbol}${prize.toLocaleString()}**!`)
            .setTimestamp();
          btn.update({ embeds: [resultEmbed], components: [] });
        } else {
          db.updateBalance(userId, bet);
          db.updateBalance(target.id, bet);
          const tieEmbed = new EmbedBuilder()
            .setColor('#f39c12')
            .setTitle('⚔️ Unentschieden!')
            .setDescription(rounds.join('\n\n') + '\n\n🤝 Einsätze zurückerstattet!')
            .setTimestamp();
          btn.update({ embeds: [tieEmbed], components: [] });
        }
      });

      coll.on('end', (_, reason) => {
        if (reason === 'time') {
          msg.edit({ content: `⏰ **${target.username}** hat nicht geantwortet.`, embeds: [], components: [] });
        }
      });
    }
  },
};
