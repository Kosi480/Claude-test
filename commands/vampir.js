const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const COOLDOWN = 3 * 60 * 1000;
const cooldowns = new Map();

function ensureVampireTables() {
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS vampires (
      user_id TEXT PRIMARY KEY,
      vampire_name TEXT DEFAULT '',
      bloodline INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      blood INTEGER DEFAULT 100,
      max_blood INTEGER DEFAULT 100,
      strength INTEGER DEFAULT 5,
      speed INTEGER DEFAULT 5,
      charm INTEGER DEFAULT 5,
      dark_magic INTEGER DEFAULT 5,
      humans_fed INTEGER DEFAULT 0,
      hunts_done INTEGER DEFAULT 0,
      duels_won INTEGER DEFAULT 0,
      age INTEGER DEFAULT 1,
      sun_resistance INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS vampire_powers (
      user_id TEXT,
      power TEXT,
      PRIMARY KEY (user_id, power)
    );
  `);
}

const bloodlines = [
  { name: 'Nosferatu', emoji: '🧛', bonus: 'strength', desc: 'Brutale Stärke, monsterhaft' },
  { name: 'Ventrue', emoji: '👑', bonus: 'charm', desc: 'Adelig und manipulativ' },
  { name: 'Tremere', emoji: '🔮', bonus: 'dark_magic', desc: 'Blutmagie-Meister' },
  { name: 'Gangrel', emoji: '🐺', bonus: 'speed', desc: 'Bestialisch und schnell' },
  { name: 'Malkavian', emoji: '🌀', bonus: 'dark_magic', desc: 'Wahnsinnig aber mächtig' },
];

const vampireRanks = [
  { name: 'Neugeborener', emoji: '🩸', minLevel: 1 },
  { name: 'Fledgling', emoji: '🦇', minLevel: 3 },
  { name: 'Ancilla', emoji: '🌙', minLevel: 6 },
  { name: 'Elder', emoji: '⚰️', minLevel: 10 },
  { name: 'Methuselah', emoji: '🏚️', minLevel: 15 },
  { name: 'Antediluvian', emoji: '👁️', minLevel: 20 },
  { name: 'Urvampir', emoji: '💀', minLevel: 30 },
];

const darkPowers = [
  { name: 'Schattenschritt', emoji: '🌑', type: 'speed', power: 15, bloodCost: 10, minLevel: 1, cost: 500 },
  { name: 'Blutdurst', emoji: '🩸', type: 'strength', power: 12, bloodCost: 8, minLevel: 1, cost: 400 },
  { name: 'Hypnose', emoji: '🌀', type: 'charm', power: 18, bloodCost: 15, minLevel: 3, cost: 1200 },
  { name: 'Fledermausschwarm', emoji: '🦇', type: 'dark_magic', power: 20, bloodCost: 18, minLevel: 4, cost: 1800 },
  { name: 'Nebelgestalt', emoji: '🌫️', type: 'speed', power: 25, bloodCost: 20, minLevel: 5, cost: 2500 },
  { name: 'Blutmagie', emoji: '🔮', type: 'dark_magic', power: 30, bloodCost: 25, minLevel: 7, cost: 4000 },
  { name: 'Todesgriff', emoji: '💀', type: 'strength', power: 35, bloodCost: 30, minLevel: 9, cost: 6000 },
  { name: 'Seelenfresser', emoji: '👁️', type: 'dark_magic', power: 40, bloodCost: 35, minLevel: 12, cost: 10000 },
  { name: 'Ewige Nacht', emoji: '🌑', type: 'dark_magic', power: 50, bloodCost: 45, minLevel: 15, cost: 20000 },
  { name: 'Blutgott-Form', emoji: '😈', type: 'strength', power: 60, bloodCost: 55, minLevel: 20, cost: 50000 },
];

const huntingGrounds = [
  { name: 'Dunkle Gasse', emoji: '🏚️', minLevel: 1, difficulty: 1, bloodGain: 20, reward: { min: 100, max: 400 }, xp: 15 },
  { name: 'Nachtclub', emoji: '🎵', minLevel: 2, difficulty: 2, bloodGain: 30, reward: { min: 250, max: 700 }, xp: 25 },
  { name: 'Friedhof', emoji: '⚰️', minLevel: 4, difficulty: 3, bloodGain: 25, reward: { min: 400, max: 1200 }, xp: 40 },
  { name: 'Herrenhaus', emoji: '🏰', minLevel: 6, difficulty: 4, bloodGain: 40, reward: { min: 700, max: 2000 }, xp: 55 },
  { name: 'Königspalast', emoji: '👑', minLevel: 9, difficulty: 6, bloodGain: 50, reward: { min: 1500, max: 5000 }, xp: 80 },
  { name: 'Jägerfestung', emoji: '⚔️', minLevel: 13, difficulty: 8, bloodGain: 35, reward: { min: 3000, max: 10000 }, xp: 130 },
  { name: 'Kirche des Lichts', emoji: '⛪', minLevel: 18, difficulty: 10, bloodGain: 60, reward: { min: 6000, max: 25000 }, xp: 200 },
];

const nightEvents = [
  { name: 'Vampirjäger!', emoji: '🏹', effect: 'combat', text: 'Ein Vampirjäger hat dich entdeckt!' },
  { name: 'Mondfinsternis', emoji: '🌑', effect: 'power_boost', text: 'Die Mondfinsternis verstärkt deine Kräfte!' },
  { name: 'Vergiftetes Blut', emoji: '☠️', effect: 'blood_loss', amount: 20, text: 'Das Blut war vergiftet!' },
  { name: 'Uraltes Grab', emoji: '⚱️', effect: 'treasure', text: 'Du findest ein uraltes Vampirgrab mit Schätzen!' },
  { name: 'Sonnenlichtfalle', emoji: '☀️', effect: 'health_loss', amount: 15, text: 'Eine UV-Lichtfalle!' },
  { name: 'Blutmond', emoji: '🔴', effect: 'blood_gain', amount: 30, text: 'Der Blutmond stärkt dich!' },
  { name: 'Verbündeter Vampir', emoji: '🧛', effect: 'ally', text: 'Ein älterer Vampir gibt dir Tipps!' },
  { name: 'Silberkugel', emoji: '🔫', effect: 'combat', text: 'Ein Angriff mit Silber!' },
];

function getVampire(userId) {
  ensureVampireTables();
  let v = db.db.prepare('SELECT * FROM vampires WHERE user_id = ?').get(userId);
  if (!v) {
    db.db.prepare('INSERT INTO vampires (user_id) VALUES (?)').run(userId);
    v = db.db.prepare('SELECT * FROM vampires WHERE user_id = ?').get(userId);
  }
  return v;
}

function getVampirePowers(userId) {
  return db.db.prepare('SELECT * FROM vampire_powers WHERE user_id = ?').all(userId);
}

function getRank(level) {
  let rank = vampireRanks[0];
  for (const r of vampireRanks) {
    if (level >= r.minLevel) rank = r;
  }
  return rank;
}

function addVampXP(userId, xp) {
  const v = getVampire(userId);
  const newXP = v.xp + xp;
  const needed = v.level * 140;
  if (newXP >= needed) {
    db.db.prepare('UPDATE vampires SET xp = ?, level = level + 1, max_blood = max_blood + 10, age = age + 50 WHERE user_id = ?')
      .run(newXP - needed, userId);
    return true;
  }
  db.db.prepare('UPDATE vampires SET xp = ? WHERE user_id = ?').run(newXP, userId);
  return false;
}

function getCombatPower(v) {
  return v.strength * 2 + v.speed * 1.5 + v.dark_magic * 2 + v.charm;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vampir')
    .setDescription('Werde ein Vampir — Jage, sammle Kräfte und herrsche über die Nacht!')
    .addSubcommand(sub => sub.setName('profil').setDescription('Dein Vampir-Profil'))
    .addSubcommand(sub => sub.setName('blutlinie').setDescription('Wähle deine Blutlinie')
      .addIntegerOption(opt => opt.setName('nummer').setDescription('Blutlinie 1-5').setRequired(true).setMinValue(1).setMaxValue(5)))
    .addSubcommand(sub => sub.setName('jagen').setDescription('Gehe auf die Jagd')
      .addIntegerOption(opt => opt.setName('ort').setDescription('Jagdgebiet 1-7').setRequired(true).setMinValue(1).setMaxValue(7)))
    .addSubcommand(sub => sub.setName('trainieren').setDescription('Trainiere eine Fähigkeit')
      .addStringOption(opt => opt.setName('skill').setDescription('Fähigkeit').setRequired(true)
        .addChoices(
          { name: '💪 Stärke', value: 'strength' },
          { name: '💨 Geschwindigkeit', value: 'speed' },
          { name: '🌀 Charme', value: 'charm' },
          { name: '🔮 Dunkle Magie', value: 'dark_magic' }
        )))
    .addSubcommand(sub => sub.setName('kraeft').setDescription('Zeige und kaufe dunkle Kräfte'))
    .addSubcommand(sub => sub.setName('lernen').setDescription('Lerne eine dunkle Kraft')
      .addIntegerOption(opt => opt.setName('nummer').setDescription('Kraft 1-10').setRequired(true).setMinValue(1).setMaxValue(10)))
    .addSubcommand(sub => sub.setName('duell').setDescription('Fordere einen anderen Vampir heraus')
      .addUserOption(opt => opt.setName('gegner').setDescription('Dein Gegner').setRequired(true))),

  async execute(interaction) {
    const userId = interaction.user.id;
    const config = require('../config.json');
    const sub = interaction.options.getSubcommand();
    ensureVampireTables();

    if (sub === 'profil') {
      const v = getVampire(userId);
      const rank = getRank(v.level);
      const bl = v.bloodline > 0 ? bloodlines[v.bloodline - 1] : null;
      const xpNeeded = v.level * 140;
      const powers = getVampirePowers(userId);
      const power = getCombatPower(v);

      const embed = new EmbedBuilder()
        .setColor('#8b0000')
        .setTitle(`${rank.emoji} ${v.vampire_name || interaction.user.username}`)
        .setDescription(
          `**Rang:** ${rank.name}\n` +
          `**Blutlinie:** ${bl ? `${bl.emoji} ${bl.name}` : '_Keine_'}\n` +
          `**Level:** ${v.level} (${v.xp}/${xpNeeded} XP)\n` +
          `**Alter:** ${v.age} Jahre\n` +
          `⚔️ Kampfkraft: **${power}**\n\n` +
          `🩸 Blut: **${v.blood}/${v.max_blood}**\n\n` +
          `**Fähigkeiten:**\n` +
          `💪 Stärke: **${v.strength}** | 💨 Speed: **${v.speed}**\n` +
          `🌀 Charme: **${v.charm}** | 🔮 Dunkle Magie: **${v.dark_magic}**\n` +
          `☀️ Sonnenresistenz: **${v.sun_resistance}**\n\n` +
          `**Kräfte:** ${powers.length > 0 ? powers.map(p => {
            const pd = darkPowers.find(x => x.name === p.power);
            return `${pd ? pd.emoji : '🔮'} ${p.power}`;
          }).join(', ') : '_Keine_'}\n\n` +
          `📊 Jagden: **${v.hunts_done}** | Duelle: **${v.duels_won}W**`
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'blutlinie') {
      const v = getVampire(userId);
      if (v.bloodline > 0) return interaction.reply(`❌ Du bist bereits ${bloodlines[v.bloodline - 1].emoji} ${bloodlines[v.bloodline - 1].name}!`);

      const idx = interaction.options.getInteger('nummer');
      const bl = bloodlines[idx - 1];
      db.db.prepare('UPDATE vampires SET bloodline = ? WHERE user_id = ?').run(idx, userId);
      db.db.prepare(`UPDATE vampires SET ${bl.bonus} = ${bl.bonus} + 3 WHERE user_id = ?`).run(userId);

      return interaction.reply(`${bl.emoji} Du bist nun ein **${bl.name}**! ${bl.desc}\n+3 **${bl.bonus}** Bonus!`);
    }

    if (sub === 'trainieren') {
      const skill = interaction.options.getString('skill');
      const v = getVampire(userId);
      const cost = 250 + v[skill] * 120;
      const emojis = { strength: '💪', speed: '💨', charm: '🌀', dark_magic: '🔮' };

      if (db.getBalance(userId) < cost) return interaction.reply(`❌ Training kostet **${config.currencySymbol}${cost.toLocaleString()}**!`);

      db.updateBalance(userId, -cost);
      db.db.prepare(`UPDATE vampires SET ${skill} = ${skill} + 1 WHERE user_id = ?`).run(userId);

      return interaction.reply(`${emojis[skill]} **${skill}** trainiert! ${v[skill]} → **${v[skill] + 1}** (${config.currencySymbol}${cost.toLocaleString()})`);
    }

    if (sub === 'kraeft') {
      const v = getVampire(userId);
      const owned = getVampirePowers(userId).map(p => p.power);

      const lines = darkPowers.map((p, i) => {
        const has = owned.includes(p.name);
        const locked = p.minLevel > v.level;
        return `**${i + 1}.** ${p.emoji} **${p.name}** — ${p.type} | 💥 ${p.power} | 🩸 ${p.bloodCost}\n` +
          `   ${config.currencySymbol}${p.cost.toLocaleString()} | Lv.${p.minLevel}${has ? ' ✅' : locked ? ' 🔒' : ''}`;
      });

      const embed = new EmbedBuilder()
        .setColor('#4a0000')
        .setTitle('🔮 Dunkle Kräfte')
        .setDescription(lines.join('\n') + '\n\n*Lerne mit `/vampir lernen nummer:<Nr>`*')
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'lernen') {
      const num = interaction.options.getInteger('nummer') - 1;
      const power = darkPowers[num];
      if (!power) return interaction.reply('❌ Ungültige Nummer!');

      const v = getVampire(userId);
      if (power.minLevel > v.level) return interaction.reply(`🔒 Du brauchst **Level ${power.minLevel}**!`);
      const owned = getVampirePowers(userId);
      if (owned.some(p => p.power === power.name)) return interaction.reply('❌ Du beherrschst diese Kraft bereits!');
      if (db.getBalance(userId) < power.cost) return interaction.reply(`❌ Kostet **${config.currencySymbol}${power.cost.toLocaleString()}**!`);

      db.updateBalance(userId, -power.cost);
      db.db.prepare('INSERT OR IGNORE INTO vampire_powers (user_id, power) VALUES (?, ?)').run(userId, power.name);

      return interaction.reply(`${power.emoji} **${power.name}** erlernt! 💥 ${power.power} Macht | 🩸 ${power.bloodCost} Blut`);
    }

    if (sub === 'jagen') {
      const lastPlay = cooldowns.get(userId);
      if (lastPlay && Date.now() - lastPlay < COOLDOWN) {
        const remaining = Math.ceil((COOLDOWN - (Date.now() - lastPlay)) / 1000);
        return interaction.reply(`⏳ Nächste Jagd in **${remaining}s**!`);
      }

      const v = getVampire(userId);
      const groundIdx = interaction.options.getInteger('ort') - 1;
      const ground = huntingGrounds[groundIdx];

      if (v.level < ground.minLevel) return interaction.reply(`🔒 Du brauchst **Level ${ground.minLevel}**!`);

      cooldowns.set(userId, Date.now());

      const power = getCombatPower(v);
      const powers = getVampirePowers(userId);
      const powerBonus = powers.length * 5;
      const roll = Math.floor(Math.random() * 25) + 1;
      const score = power + powerBonus + roll;
      const threshold = ground.difficulty * 12 + 10;
      const success = score >= threshold;

      const event = nightEvents[Math.floor(Math.random() * nightEvents.length)];
      let eventText = `${event.emoji} **${event.name}:** ${event.text}`;

      switch (event.effect) {
        case 'blood_loss':
          db.db.prepare('UPDATE vampires SET blood = MAX(0, blood - ?) WHERE user_id = ?').run(event.amount, userId);
          eventText += ` (-${event.amount} 🩸)`;
          break;
        case 'blood_gain':
          db.db.prepare('UPDATE vampires SET blood = MIN(max_blood, blood + ?) WHERE user_id = ?').run(event.amount, userId);
          eventText += ` (+${event.amount} 🩸)`;
          break;
        case 'power_boost':
          eventText += ' (+Bonus auf Jagd!)';
          break;
        case 'treasure': {
          const bonus = 300 + Math.floor(Math.random() * 700);
          db.updateBalance(userId, bonus);
          eventText += ` (+${config.currencySymbol}${bonus})`;
          break;
        }
      }

      if (success) {
        const reward = ground.reward.min + Math.floor(Math.random() * (ground.reward.max - ground.reward.min));
        db.updateBalance(userId, reward);
        db.db.prepare('UPDATE vampires SET blood = MIN(max_blood, blood + ?), hunts_done = hunts_done + 1, humans_fed = humans_fed + 1 WHERE user_id = ?')
          .run(ground.bloodGain, userId);
        const leveled = addVampXP(userId, ground.xp);
        const updated = getVampire(userId);
        const rank = getRank(updated.level);

        const embed = new EmbedBuilder()
          .setColor('#8b0000')
          .setTitle(`${ground.emoji} Jagd erfolgreich!`)
          .setDescription(
            `**${ground.name}** — Beute gemacht!\n\n` +
            `🎲 ${roll} + ⚔️ ${power} + 🔮 ${powerBonus} = **${score}** ≥ ${threshold}\n\n` +
            `${eventText}\n\n` +
            `💰 **+${config.currencySymbol}${reward.toLocaleString()}**\n` +
            `🩸 **+${ground.bloodGain}** Blut\n` +
            `⭐ **+${ground.xp} XP**` +
            (leveled ? ` 🎉 **LEVEL UP → ${updated.level}!** ${rank.emoji} ${rank.name}` : '')
          )
          .setFooter({ text: `🩸 ${updated.blood}/${updated.max_blood} | Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      } else {
        addVampXP(userId, Math.floor(ground.xp * 0.2));
        const embed = new EmbedBuilder()
          .setColor('#2c3e50')
          .setTitle(`${ground.emoji} Jagd gescheitert!`)
          .setDescription(
            `**${ground.name}** — entwischt!\n\n` +
            `🎲 ${roll} + ⚔️ ${power} + 🔮 ${powerBonus} = **${score}** < ${threshold}\n\n` +
            `${eventText}\n\n` +
            `*Trainiere deine Kräfte und lerne neue Fähigkeiten!*`
          )
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }
    }

    if (sub === 'duell') {
      const target = interaction.options.getUser('gegner');
      if (target.id === userId) return interaction.reply('❌ Du kannst nicht gegen dich selbst kämpfen!');
      if (target.bot) return interaction.reply('❌ Bots sind keine Vampire!');

      const v1 = getVampire(userId);
      const v2 = getVampire(target.id);
      const bet = 300 + v1.level * 60;

      if (db.getBalance(userId) < bet) return interaction.reply(`❌ Du brauchst **${config.currencySymbol}${bet}**!`);
      if (db.getBalance(target.id) < bet) return interaction.reply(`❌ **${target.username}** hat nicht genug Geld!`);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`vamp_accept_${target.id}_${userId}_${bet}`).setLabel('🩸 Annehmen').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`vamp_decline_${target.id}`).setLabel('❌ Ablehnen').setStyle(ButtonStyle.Secondary)
      );

      const embed = new EmbedBuilder()
        .setColor('#8b0000')
        .setTitle('🩸 Vampir-Duell!')
        .setDescription(
          `**${interaction.user.username}** (Lv.${v1.level}) fordert **${target.username}** (Lv.${v2.level})!\n\n` +
          `💰 Einsatz: **${config.currencySymbol}${bet}**`
        )
        .setTimestamp();

      const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
      const coll = msg.createMessageComponentCollector({ time: 30000 });

      coll.on('collect', (btn) => {
        if (btn.customId.startsWith('vamp_decline')) {
          if (btn.user.id !== target.id) return btn.reply({ content: '❌ Nicht für dich!', flags: 64 });
          coll.stop();
          return btn.update({ content: `❌ **${target.username}** lehnt ab.`, embeds: [], components: [] });
        }
        if (btn.user.id !== target.id) return btn.reply({ content: '❌ Nicht für dich!', flags: 64 });
        coll.stop();

        db.updateBalance(userId, -bet);
        db.updateBalance(target.id, -bet);

        const p1 = getCombatPower(v1) + getVampirePowers(userId).length * 5;
        const p2 = getCombatPower(v2) + getVampirePowers(target.id).length * 5;

        const rounds = [];
        let hp1 = 100 + v1.strength * 3;
        let hp2 = 100 + v2.strength * 3;

        for (let r = 0; r < 5 && hp1 > 0 && hp2 > 0; r++) {
          const atk1 = Math.floor(p1 * (0.6 + Math.random() * 0.8));
          const atk2 = Math.floor(p2 * (0.6 + Math.random() * 0.8));
          const dodge1 = Math.random() * 100 < v1.speed * 2;
          const dodge2 = Math.random() * 100 < v2.speed * 2;
          hp2 -= dodge2 ? 0 : atk1;
          hp1 -= dodge1 ? 0 : atk2;
          rounds.push(`**Runde ${r + 1}:** ${interaction.user.username}: ${dodge2 ? '🌫️ Miss' : `💥${atk1}`} | ${target.username}: ${dodge1 ? '🌫️ Miss' : `💥${atk2}`}`);
        }

        const winner = hp1 > hp2 ? userId : hp2 > hp1 ? target.id : null;
        const prize = bet * 2;

        if (winner) {
          db.updateBalance(winner, prize);
          db.db.prepare('UPDATE vampires SET duels_won = duels_won + 1 WHERE user_id = ?').run(winner);
          addVampXP(winner, 35);
          addVampXP(winner === userId ? target.id : userId, 10);
          const winnerName = winner === userId ? interaction.user.username : target.username;

          const resultEmbed = new EmbedBuilder().setColor('#8b0000')
            .setTitle(`🩸 ${winnerName} gewinnt das Vampir-Duell!`)
            .setDescription(rounds.join('\n') + `\n\n🏆 **+${config.currencySymbol}${prize.toLocaleString()}**`)
            .setTimestamp();
          btn.update({ embeds: [resultEmbed], components: [] });
        } else {
          db.updateBalance(userId, bet);
          db.updateBalance(target.id, bet);
          const tieEmbed = new EmbedBuilder().setColor('#4a0000').setTitle('🩸 Unentschieden!')
            .setDescription(rounds.join('\n') + '\n\n🤝 Einsätze zurück!').setTimestamp();
          btn.update({ embeds: [tieEmbed], components: [] });
        }
      });

      coll.on('end', (_, reason) => {
        if (reason === 'time') msg.edit({ content: '⏰ Keine Antwort.', embeds: [], components: [] });
      });
    }
  },
};
