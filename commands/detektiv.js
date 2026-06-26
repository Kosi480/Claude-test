const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const COOLDOWN = 3 * 60 * 1000;
const cooldowns = new Map();

function ensureDetectiveTables() {
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS detectives (
      user_id TEXT PRIMARY KEY,
      rank INTEGER DEFAULT 0,
      xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      cases_solved INTEGER DEFAULT 0,
      cases_failed INTEGER DEFAULT 0,
      streak INTEGER DEFAULT 0,
      best_streak INTEGER DEFAULT 0,
      magnifying_glass INTEGER DEFAULT 1,
      notebook INTEGER DEFAULT 1,
      intuition INTEGER DEFAULT 1
    );
  `);
}

const detectiveRanks = [
  { name: 'Praktikant', emoji: '📋', minLevel: 1 },
  { name: 'Streifenpolizist', emoji: '👮', minLevel: 3 },
  { name: 'Ermittler', emoji: '🔍', minLevel: 5 },
  { name: 'Inspektor', emoji: '🕵️', minLevel: 8 },
  { name: 'Kommissar', emoji: '⭐', minLevel: 12 },
  { name: 'Chefinspektor', emoji: '🏆', minLevel: 17 },
  { name: 'Legende', emoji: '👑', minLevel: 25 },
];

const locations = [
  'Villa', 'Hafen', 'Museum', 'Park', 'Restaurant', 'Büro', 'Bibliothek',
  'Theater', 'Hotel', 'Bahnhof', 'Fabrik', 'Krankenhaus',
];

const weapons = [
  'Messer', 'Gift', 'Seil', 'Leuchter', 'Schraubenschlüssel',
  'Pistole', 'Vase', 'Brieföffner', 'Statue', 'Golfschläger',
];

const suspectNames = [
  'Graf von Stein', 'Frau Dr. Winter', 'Professor Schwarz', 'Herr Müller',
  'Baronin Rot', 'Kommandant Blau', 'Fräulein Gold', 'Direktor Grün',
  'Lady Silber', 'Doktor Braun', 'Oberst Weiß', 'Madame Violett',
];

const motives = [
  'Eifersucht', 'Geld', 'Rache', 'Erbschaft', 'Erpressung',
  'Verrat', 'Geheimnisse', 'Machtkampf',
];

const clueTypes = [
  { name: 'Fingerabdruck', emoji: '👆', stat: 'magnifying_glass' },
  { name: 'Zeugenbefragung', emoji: '🗣️', stat: 'notebook' },
  { name: 'Beweismittel', emoji: '🧪', stat: 'magnifying_glass' },
  { name: 'Alibis prüfen', emoji: '📋', stat: 'notebook' },
  { name: 'Bauchgefühl', emoji: '💡', stat: 'intuition' },
  { name: 'Tatortanalyse', emoji: '🔬', stat: 'magnifying_glass' },
  { name: 'Verhör', emoji: '💬', stat: 'intuition' },
];

function generateCase(level) {
  const numSuspects = Math.min(3 + Math.floor(level / 3), 6);
  const shuffledSuspects = [...suspectNames].sort(() => Math.random() - 0.5).slice(0, numSuspects);
  const culprit = Math.floor(Math.random() * numSuspects);
  const location = locations[Math.floor(Math.random() * locations.length)];
  const weapon = weapons[Math.floor(Math.random() * weapons.length)];
  const motive = motives[Math.floor(Math.random() * motives.length)];

  const difficulty = Math.min(1 + Math.floor(level / 2), 10);
  const reward = 500 + difficulty * 300 + Math.floor(Math.random() * difficulty * 200);

  return {
    suspects: shuffledSuspects,
    culprit,
    location,
    weapon,
    motive,
    difficulty,
    reward,
    cluesFound: 0,
    maxClues: 3 + Math.floor(level / 4),
    revealedClues: [],
    eliminated: [],
  };
}

function generateClue(caseData, detective) {
  const clueType = clueTypes[Math.floor(Math.random() * clueTypes.length)];
  const statValue = detective[clueType.stat];
  const roll = Math.floor(Math.random() * 20) + 1;
  const threshold = 8 + caseData.difficulty * 2;
  const success = roll + statValue * 2 >= threshold;

  if (!success) {
    return { type: clueType, success: false, text: 'Keine verwertbaren Hinweise gefunden.', roll, threshold };
  }

  const culpritName = caseData.suspects[caseData.culprit];
  const nonCulprits = caseData.suspects.filter((_, i) => i !== caseData.culprit && !caseData.eliminated.includes(i));

  const clueVariants = [
    () => {
      if (nonCulprits.length > 0) {
        const innocent = nonCulprits[Math.floor(Math.random() * nonCulprits.length)];
        const idx = caseData.suspects.indexOf(innocent);
        if (!caseData.eliminated.includes(idx)) caseData.eliminated.push(idx);
        return `**${innocent}** hat ein wasserdichtes Alibi — unschuldig!`;
      }
      return `Spuren deuten auf die **${caseData.location}** hin.`;
    },
    () => `Die Tatwaffe war ein **${caseData.weapon}**.`,
    () => `Das Motiv scheint **${caseData.motive}** zu sein.`,
    () => `Ein Zeuge sah **${culpritName}** in der Nähe des Tatorts.`,
    () => {
      if (nonCulprits.length > 0) {
        const innocent = nonCulprits[Math.floor(Math.random() * nonCulprits.length)];
        const idx = caseData.suspects.indexOf(innocent);
        if (!caseData.eliminated.includes(idx)) caseData.eliminated.push(idx);
        return `**${innocent}** war zur Tatzeit woanders — ausgeschlossen!`;
      }
      return `Die Tat geschah in der **${caseData.location}**.`;
    },
    () => `Verdächtige Spuren führen zu **${culpritName}**.`,
    () => `Der Täter hatte ein **${caseData.motive}**-Motiv.`,
  ];

  const variant = clueVariants[Math.floor(Math.random() * clueVariants.length)];
  return { type: clueType, success: true, text: variant(), roll, threshold };
}

function getDetective(userId) {
  ensureDetectiveTables();
  let det = db.db.prepare('SELECT * FROM detectives WHERE user_id = ?').get(userId);
  if (!det) {
    db.db.prepare('INSERT INTO detectives (user_id) VALUES (?)').run(userId);
    det = db.db.prepare('SELECT * FROM detectives WHERE user_id = ?').get(userId);
  }
  return det;
}

function getRank(level) {
  let rank = detectiveRanks[0];
  for (const r of detectiveRanks) {
    if (level >= r.minLevel) rank = r;
  }
  return rank;
}

function addDetXP(userId, xp) {
  const det = getDetective(userId);
  const newXP = det.xp + xp;
  const needed = det.level * 130;
  if (newXP >= needed) {
    db.db.prepare('UPDATE detectives SET xp = ?, level = level + 1 WHERE user_id = ?').run(newXP - needed, userId);
    return true;
  }
  db.db.prepare('UPDATE detectives SET xp = ? WHERE user_id = ?').run(newXP, userId);
  return false;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('detektiv')
    .setDescription('Löse Kriminalfälle als Detektiv!')
    .addSubcommand(sub => sub.setName('fall').setDescription('Starte einen neuen Fall'))
    .addSubcommand(sub => sub.setName('profil').setDescription('Zeige dein Detektiv-Profil'))
    .addSubcommand(sub => sub.setName('trainieren').setDescription('Verbessere deine Fähigkeiten')
      .addStringOption(opt => opt.setName('skill').setDescription('Fähigkeit').setRequired(true)
        .addChoices(
          { name: '🔍 Lupe (Spurensuche)', value: 'magnifying_glass' },
          { name: '📓 Notizbuch (Befragung)', value: 'notebook' },
          { name: '💡 Intuition (Bauchgefühl)', value: 'intuition' }
        ))),

  async execute(interaction) {
    const userId = interaction.user.id;
    const config = require('../config.json');
    const sub = interaction.options.getSubcommand();
    ensureDetectiveTables();

    if (sub === 'profil') {
      const det = getDetective(userId);
      const rank = getRank(det.level);
      const xpNeeded = det.level * 130;
      const total = det.cases_solved + det.cases_failed;
      const rate = total > 0 ? Math.round(det.cases_solved / total * 100) : 0;

      const embed = new EmbedBuilder()
        .setColor('#2c3e50')
        .setTitle(`${rank.emoji} Detektiv ${interaction.user.username}`)
        .setDescription(
          `**Rang:** ${rank.name}\n` +
          `**Level:** ${det.level} (${det.xp}/${xpNeeded} XP)\n\n` +
          `**Fähigkeiten:**\n` +
          `🔍 Lupe: **${det.magnifying_glass}**\n` +
          `📓 Notizbuch: **${det.notebook}**\n` +
          `💡 Intuition: **${det.intuition}**\n\n` +
          `**Statistiken:**\n` +
          `✅ Gelöst: **${det.cases_solved}**\n` +
          `❌ Ungelöst: **${det.cases_failed}**\n` +
          `📊 Aufklärungsrate: **${rate}%**\n` +
          `🔥 Aktuelle Serie: **${det.streak}**\n` +
          `🏆 Beste Serie: **${det.best_streak}**`
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'trainieren') {
      const skill = interaction.options.getString('skill');
      const det = getDetective(userId);
      const skillNames = { magnifying_glass: 'Lupe', notebook: 'Notizbuch', intuition: 'Intuition' };
      const skillEmojis = { magnifying_glass: '🔍', notebook: '📓', intuition: '💡' };
      const cost = 300 + det[skill] * 200;

      if (db.getBalance(userId) < cost) {
        return interaction.reply(`❌ Training kostet **${config.currencySymbol}${cost.toLocaleString()}**!`);
      }

      db.updateBalance(userId, -cost);
      db.db.prepare(`UPDATE detectives SET ${skill} = ${skill} + 1 WHERE user_id = ?`).run(userId);

      return interaction.reply(`${skillEmojis[skill]} **${skillNames[skill]}** verbessert! ${det[skill]} → **${det[skill] + 1}** (${config.currencySymbol}${cost.toLocaleString()})`);
    }

    if (sub === 'fall') {
      const lastPlay = cooldowns.get(userId);
      if (lastPlay && Date.now() - lastPlay < COOLDOWN) {
        const remaining = Math.ceil((COOLDOWN - (Date.now() - lastPlay)) / 1000);
        return interaction.reply(`⏳ Nächster Fall in **${remaining}s**!`);
      }

      cooldowns.set(userId, Date.now());
      const det = getDetective(userId);
      const caseData = generateCase(det.level);

      const buildCaseEmbed = (extra = '') => {
        const suspectList = caseData.suspects.map((s, i) => {
          const eliminated = caseData.eliminated.includes(i);
          return `${eliminated ? '~~' : ''}${i + 1}. **${s}**${eliminated ? '~~ ✅ Alibi' : ''}`;
        }).join('\n');

        return new EmbedBuilder()
          .setColor('#8e44ad')
          .setTitle(`🔍 Kriminalfall — Schwierigkeit ${caseData.difficulty}/10`)
          .setDescription(
            `**Tatort:** ${caseData.location}\n` +
            `🔎 Hinweise: **${caseData.cluesFound}/${caseData.maxClues}**\n\n` +
            `**Verdächtige:**\n${suspectList}\n\n` +
            (caseData.revealedClues.length > 0 ? `**Hinweise:**\n${caseData.revealedClues.slice(-4).join('\n')}\n\n` : '') +
            (extra ? extra + '\n\n' : '') +
            `💰 Belohnung: **${config.currencySymbol}${caseData.reward.toLocaleString()}**`
          )
          .setFooter({ text: `${caseData.maxClues - caseData.cluesFound} Ermittlungen übrig` })
          .setTimestamp();
      };

      const buildButtons = () => {
        const rows = [];
        if (caseData.cluesFound < caseData.maxClues) {
          rows.push(new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`det_clue_${userId}`).setLabel('🔎 Ermitteln').setStyle(ButtonStyle.Primary),
          ));
        }

        const suspectBtns = caseData.suspects
          .map((s, i) => ({ s, i }))
          .filter(({ i }) => !caseData.eliminated.includes(i))
          .slice(0, 5)
          .map(({ s, i }) =>
            new ButtonBuilder().setCustomId(`det_accuse_${i}_${userId}`).setLabel(`🎯 ${s}`).setStyle(ButtonStyle.Danger)
          );

        if (suspectBtns.length > 0) {
          rows.push(new ActionRowBuilder().addComponents(suspectBtns));
        }

        return rows;
      };

      const msg = await interaction.reply({ embeds: [buildCaseEmbed('Ermittle Hinweise oder beschuldige einen Verdächtigen!')], components: buildButtons(), fetchReply: true });
      const coll = msg.createMessageComponentCollector({ time: 90000 });

      coll.on('collect', (btn) => {
        if (btn.user.id !== userId) return btn.reply({ content: '❌ Nicht dein Fall!', flags: 64 });

        if (btn.customId.startsWith('det_clue')) {
          if (caseData.cluesFound >= caseData.maxClues) {
            return btn.reply({ content: '❌ Keine Ermittlungen mehr übrig! Beschuldige jemanden!', flags: 64 });
          }

          caseData.cluesFound++;
          const clue = generateClue(caseData, det);

          if (clue.success) {
            caseData.revealedClues.push(`${clue.type.emoji} ${clue.text}`);
          } else {
            caseData.revealedClues.push(`${clue.type.emoji} ❌ ${clue.text} (🎲${clue.roll}+${det[clue.type.stat]*2} < ${clue.threshold})`);
          }

          coll.resetTimer({ time: 90000 });
          btn.update({ embeds: [buildCaseEmbed()], components: buildButtons() });
          return;
        }

        if (btn.customId.startsWith('det_accuse')) {
          const accusedIdx = parseInt(btn.customId.split('_')[2]);
          coll.stop('accused');

          const correct = accusedIdx === caseData.culprit;
          const culpritName = caseData.suspects[caseData.culprit];

          if (correct) {
            const streakBonus = det.streak * 100;
            const totalReward = caseData.reward + streakBonus;
            db.updateBalance(userId, totalReward);
            const newStreak = det.streak + 1;
            const bestStreak = Math.max(det.best_streak, newStreak);
            db.db.prepare('UPDATE detectives SET cases_solved = cases_solved + 1, streak = ?, best_streak = ? WHERE user_id = ?')
              .run(newStreak, bestStreak, userId);
            const leveled = addDetXP(userId, 30 + caseData.difficulty * 10);
            const updated = getDetective(userId);
            const rank = getRank(updated.level);

            const embed = new EmbedBuilder()
              .setColor('#27ae60')
              .setTitle('🎉 Fall gelöst!')
              .setDescription(
                `**${culpritName}** war der Täter!\n\n` +
                `🔪 Tatwaffe: **${caseData.weapon}**\n` +
                `📍 Tatort: **${caseData.location}**\n` +
                `💢 Motiv: **${caseData.motive}**\n\n` +
                `💰 Belohnung: **+${config.currencySymbol}${caseData.reward.toLocaleString()}**\n` +
                (streakBonus > 0 ? `🔥 Serienbonus: **+${config.currencySymbol}${streakBonus.toLocaleString()}**\n` : '') +
                `🔥 Serie: **${newStreak}**\n` +
                (leveled ? `\n🎉 **LEVEL UP → ${updated.level}!**\n` : '') +
                `${rank.emoji} Rang: **${rank.name}**`
              )
              .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
              .setTimestamp();
            btn.update({ embeds: [embed], components: [] });
          } else {
            db.db.prepare('UPDATE detectives SET cases_failed = cases_failed + 1, streak = 0 WHERE user_id = ?').run(userId);
            addDetXP(userId, 5);

            const embed = new EmbedBuilder()
              .setColor('#e74c3c')
              .setTitle('❌ Falsche Anklage!')
              .setDescription(
                `**${caseData.suspects[accusedIdx]}** war unschuldig!\n\n` +
                `Der wahre Täter war **${culpritName}**.\n` +
                `🔪 Tatwaffe: **${caseData.weapon}**\n` +
                `💢 Motiv: **${caseData.motive}**\n\n` +
                `🔥 Serie verloren! Zurück auf **0**.\n` +
                `*Trainiere deine Fähigkeiten für bessere Hinweise!*`
              )
              .setTimestamp();
            btn.update({ embeds: [embed], components: [] });
          }
        }
      });

      coll.on('end', (_, reason) => {
        if (reason === 'time') {
          db.db.prepare('UPDATE detectives SET cases_failed = cases_failed + 1, streak = 0 WHERE user_id = ?').run(userId);
          const embed = new EmbedBuilder()
            .setColor('#f39c12')
            .setTitle('⏰ Fall — Zeit abgelaufen!')
            .setDescription(`Der Fall wird zu den Akten gelegt. Der Täter war **${caseData.suspects[caseData.culprit]}**.`)
            .setTimestamp();
          msg.edit({ embeds: [embed], components: [] });
        }
      });
    }
  },
};
