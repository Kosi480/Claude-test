const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const COOLDOWN = 3 * 60 * 1000;
const cooldowns = new Map();

function ensureSchoolTables() {
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS magic_students (
      user_id TEXT PRIMARY KEY,
      student_name TEXT DEFAULT '',
      house INTEGER DEFAULT 0,
      year INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      mana INTEGER DEFAULT 100,
      max_mana INTEGER DEFAULT 100,
      transfiguration INTEGER DEFAULT 5,
      potions INTEGER DEFAULT 5,
      charms INTEGER DEFAULT 5,
      defense INTEGER DEFAULT 5,
      herbology INTEGER DEFAULT 3,
      divination INTEGER DEFAULT 3,
      exams_passed INTEGER DEFAULT 0,
      duels_won INTEGER DEFAULT 0,
      house_points INTEGER DEFAULT 0,
      detentions INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS learned_spells (
      user_id TEXT,
      spell TEXT,
      PRIMARY KEY (user_id, spell)
    );
  `);
}

const houses = [
  { name: 'Drachenfeuer', emoji: '🔥', bonus: 'defense', color: '#e74c3c', desc: 'Mutig und tapfer' },
  { name: 'Silberfuchs', emoji: '🦊', bonus: 'charms', color: '#3498db', desc: 'Klug und listig' },
  { name: 'Goldgreif', emoji: '🦅', bonus: 'transfiguration', color: '#f1c40f', desc: 'Weise und kreativ' },
  { name: 'Schattenschlange', emoji: '🐍', bonus: 'potions', color: '#27ae60', desc: 'Ehrgeizig und gerissen' },
];

const spells = [
  { name: 'Lumos', emoji: '💡', type: 'charms', power: 5, manaCost: 5, minYear: 1, cost: 200 },
  { name: 'Wingardium', emoji: '🪶', type: 'charms', power: 10, manaCost: 10, minYear: 1, cost: 400 },
  { name: 'Stupor', emoji: '⚡', type: 'defense', power: 15, manaCost: 12, minYear: 1, cost: 500 },
  { name: 'Protego', emoji: '🛡️', type: 'defense', power: 12, manaCost: 10, minYear: 2, cost: 800 },
  { name: 'Verwandlung', emoji: '🔄', type: 'transfiguration', power: 18, manaCost: 15, minYear: 2, cost: 1000 },
  { name: 'Heilzauber', emoji: '💚', type: 'charms', power: 14, manaCost: 15, minYear: 2, cost: 900 },
  { name: 'Feuerstoß', emoji: '🔥', type: 'defense', power: 25, manaCost: 20, minYear: 3, cost: 1500 },
  { name: 'Unsichtbarkeit', emoji: '👻', type: 'charms', power: 20, manaCost: 22, minYear: 3, cost: 2000 },
  { name: 'Blitzzauber', emoji: '⚡', type: 'defense', power: 30, manaCost: 25, minYear: 4, cost: 3000 },
  { name: 'Zeitlupe', emoji: '⏳', type: 'transfiguration', power: 28, manaCost: 28, minYear: 4, cost: 3500 },
  { name: 'Giftwolke', emoji: '☠️', type: 'potions', power: 35, manaCost: 30, minYear: 5, cost: 5000 },
  { name: 'Phönixflamme', emoji: '🔥', type: 'defense', power: 40, manaCost: 35, minYear: 5, cost: 7000 },
  { name: 'Seelenblick', emoji: '👁️', type: 'divination', power: 32, manaCost: 30, minYear: 5, cost: 6000 },
  { name: 'Drachenatem', emoji: '🐉', type: 'transfiguration', power: 50, manaCost: 45, minYear: 6, cost: 12000 },
  { name: 'Patronus', emoji: '🦌', type: 'defense', power: 55, manaCost: 50, minYear: 7, cost: 20000 },
];

const examSubjects = [
  { name: 'Verwandlung', stat: 'transfiguration', emoji: '🔄' },
  { name: 'Zaubertränke', stat: 'potions', emoji: '🧪' },
  { name: 'Zauberkunst', stat: 'charms', emoji: '✨' },
  { name: 'Verteidigung', stat: 'defense', emoji: '🛡️' },
  { name: 'Kräuterkunde', stat: 'herbology', emoji: '🌿' },
  { name: 'Wahrsagen', stat: 'divination', emoji: '🔮' },
];

const classEvents = [
  { name: 'Perfekte Antwort', emoji: '✅', effect: 'points', amount: 10, text: 'Perfekt beantwortet! Hauspunkte!' },
  { name: 'Kesselexplosion', emoji: '💥', effect: 'detention', amount: 1, text: 'Dein Kessel explodiert!' },
  { name: 'Geheimgang entdeckt', emoji: '🚪', effect: 'bonus', amount: 300, text: 'Du findest einen Geheimgang mit Schätzen!' },
  { name: 'Bibliotheksfund', emoji: '📚', effect: 'xp', amount: 30, text: 'Ein seltenes Buch gibt Wissen!' },
  { name: 'Strafarbeit', emoji: '📝', effect: 'detention', amount: 1, text: 'Zu spät zum Unterricht!' },
  { name: 'Meisterleistung', emoji: '🌟', effect: 'points', amount: 20, text: 'Beeindruckende Leistung!' },
  { name: 'Verbotener Wald', emoji: '🌲', effect: 'danger', amount: 0, text: 'Im verbotenen Wald erwischt!' },
  { name: 'Quidditch-Sieg', emoji: '🧹', effect: 'points', amount: 30, text: 'Dein Haus gewinnt im Quidditch!' },
];

function getStudent(userId) {
  ensureSchoolTables();
  let s = db.db.prepare('SELECT * FROM magic_students WHERE user_id = ?').get(userId);
  if (!s) {
    db.db.prepare('INSERT INTO magic_students (user_id) VALUES (?)').run(userId);
    s = db.db.prepare('SELECT * FROM magic_students WHERE user_id = ?').get(userId);
  }
  return s;
}

function getSpells(userId) {
  return db.db.prepare('SELECT * FROM learned_spells WHERE user_id = ?').all(userId);
}

function addSchoolXP(userId, xp) {
  const s = getStudent(userId);
  const newXP = s.xp + xp;
  const needed = s.year * 200;
  if (newXP >= needed) {
    db.db.prepare('UPDATE magic_students SET xp = ?, year = MIN(year + 1, 7), max_mana = max_mana + 15, mana = MIN(mana + 15, max_mana + 15) WHERE user_id = ?')
      .run(newXP - needed, userId);
    return true;
  }
  db.db.prepare('UPDATE magic_students SET xp = ? WHERE user_id = ?').run(newXP, userId);
  return false;
}

function getMagicPower(s) {
  return s.transfiguration + s.potions + s.charms + s.defense + s.herbology + s.divination;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('zauberschule')
    .setDescription('Besuche die Zauberschule — Lerne Zauber, bestehe Prüfungen!')
    .addSubcommand(sub => sub.setName('profil').setDescription('Dein Schüler-Profil'))
    .addSubcommand(sub => sub.setName('haus').setDescription('Wähle dein Haus')
      .addIntegerOption(opt => opt.setName('nummer').setDescription('Haus 1-4').setRequired(true).setMinValue(1).setMaxValue(4)))
    .addSubcommand(sub => sub.setName('unterricht').setDescription('Besuche eine Unterrichtsstunde')
      .addIntegerOption(opt => opt.setName('fach').setDescription('Fach 1-6').setRequired(true).setMinValue(1).setMaxValue(6)))
    .addSubcommand(sub => sub.setName('pruefung').setDescription('Lege eine Prüfung ab'))
    .addSubcommand(sub => sub.setName('zauber').setDescription('Zeige und kaufe Zaubersprüche'))
    .addSubcommand(sub => sub.setName('lernen').setDescription('Lerne einen neuen Zauber')
      .addIntegerOption(opt => opt.setName('nummer').setDescription('Zauber 1-15').setRequired(true).setMinValue(1).setMaxValue(15)))
    .addSubcommand(sub => sub.setName('duell').setDescription('Zauberer-Duell')
      .addUserOption(opt => opt.setName('gegner').setDescription('Dein Gegner').setRequired(true))),

  async execute(interaction) {
    const userId = interaction.user.id;
    const config = require('../config.json');
    const sub = interaction.options.getSubcommand();
    ensureSchoolTables();

    if (sub === 'profil') {
      const s = getStudent(userId);
      const house = s.house > 0 ? houses[s.house - 1] : null;
      const xpNeeded = s.year * 200;
      const known = getSpells(userId);
      const power = getMagicPower(s);

      const embed = new EmbedBuilder()
        .setColor(house ? house.color : '#95a5a6')
        .setTitle(`🧙 ${s.student_name || interaction.user.username}`)
        .setDescription(
          `**Haus:** ${house ? `${house.emoji} ${house.name}` : '_Nicht zugewiesen_'}\n` +
          `**Schuljahr:** ${s.year}/7 (${s.xp}/${xpNeeded} XP)\n` +
          `🔮 Magiekraft: **${power}**\n` +
          `🔵 Mana: **${s.mana}/${s.max_mana}**\n\n` +
          `**Fächer:**\n` +
          `🔄 Verwandlung: **${s.transfiguration}**\n` +
          `🧪 Zaubertränke: **${s.potions}**\n` +
          `✨ Zauberkunst: **${s.charms}**\n` +
          `🛡️ Verteidigung: **${s.defense}**\n` +
          `🌿 Kräuterkunde: **${s.herbology}**\n` +
          `🔮 Wahrsagen: **${s.divination}**\n\n` +
          `📜 Zauber: **${known.length}** gelernt\n` +
          `📊 Prüfungen bestanden: **${s.exams_passed}**\n` +
          `⚔️ Duelle gewonnen: **${s.duels_won}**\n` +
          `🏠 Hauspunkte: **${s.house_points}**\n` +
          `😤 Nachsitzen: **${s.detentions}**`
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'haus') {
      const s = getStudent(userId);
      if (s.house > 0) return interaction.reply(`❌ Du bist bereits in ${houses[s.house - 1].emoji} ${houses[s.house - 1].name}!`);

      const idx = interaction.options.getInteger('nummer');
      const house = houses[idx - 1];
      db.db.prepare('UPDATE magic_students SET house = ? WHERE user_id = ?').run(idx, userId);
      db.db.prepare(`UPDATE magic_students SET ${house.bonus} = ${house.bonus} + 3 WHERE user_id = ?`).run(userId);

      const embed = new EmbedBuilder()
        .setColor(house.color)
        .setTitle(`${house.emoji} Willkommen in ${house.name}!`)
        .setDescription(`${house.desc}\n\n+3 **${house.bonus}** Bonus!`)
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'unterricht') {
      const lastPlay = cooldowns.get(`${userId}_class`);
      if (lastPlay && Date.now() - lastPlay < COOLDOWN) {
        const remaining = Math.ceil((COOLDOWN - (Date.now() - lastPlay)) / 1000);
        return interaction.reply(`⏳ Nächster Unterricht in **${remaining}s**!`);
      }

      const subjectIdx = interaction.options.getInteger('fach') - 1;
      const subject = examSubjects[subjectIdx];
      const s = getStudent(userId);

      cooldowns.set(`${userId}_class`, Date.now());

      const cost = 100 + s[subject.stat] * 80;
      if (db.getBalance(userId) < cost) return interaction.reply(`❌ Unterricht kostet **${config.currencySymbol}${cost.toLocaleString()}** (Materialien)!`);

      db.updateBalance(userId, -cost);
      db.db.prepare(`UPDATE magic_students SET ${subject.stat} = ${subject.stat} + 1 WHERE user_id = ?`).run(userId);

      const event = classEvents[Math.floor(Math.random() * classEvents.length)];
      let eventText = `\n\n${event.emoji} **${event.name}:** ${event.text}`;

      switch (event.effect) {
        case 'points':
          db.db.prepare('UPDATE magic_students SET house_points = house_points + ? WHERE user_id = ?').run(event.amount, userId);
          eventText += ` (+${event.amount} Hauspunkte)`;
          break;
        case 'detention':
          db.db.prepare('UPDATE magic_students SET detentions = detentions + 1 WHERE user_id = ?').run(userId);
          break;
        case 'bonus':
          db.updateBalance(userId, event.amount);
          eventText += ` (+${config.currencySymbol}${event.amount})`;
          break;
        case 'xp':
          addSchoolXP(userId, event.amount);
          eventText += ` (+${event.amount} XP)`;
          break;
        case 'danger':
          db.db.prepare('UPDATE magic_students SET house_points = MAX(0, house_points - 10), detentions = detentions + 1 WHERE user_id = ?').run(userId);
          eventText += ' (-10 Hauspunkte, Nachsitzen!)';
          break;
      }

      const xpGain = 15 + subjectIdx * 3;
      const leveled = addSchoolXP(userId, xpGain);
      const updated = getStudent(userId);

      const embed = new EmbedBuilder()
        .setColor('#9b59b6')
        .setTitle(`${subject.emoji} ${subject.name} — Unterricht`)
        .setDescription(
          `**${subject.stat}** verbessert! ${s[subject.stat]} → **${s[subject.stat] + 1}**\n` +
          `⭐ +${xpGain} XP` +
          (leveled ? ` 🎉 **NEUES SCHULJAHR → ${updated.year}!**` : '') +
          eventText
        )
        .setFooter({ text: `Jahr ${updated.year} | Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'pruefung') {
      const lastPlay = cooldowns.get(`${userId}_exam`);
      if (lastPlay && Date.now() - lastPlay < COOLDOWN) {
        const remaining = Math.ceil((COOLDOWN - (Date.now() - lastPlay)) / 1000);
        return interaction.reply(`⏳ Nächste Prüfung in **${remaining}s**!`);
      }

      const s = getStudent(userId);
      cooldowns.set(`${userId}_exam`, Date.now());

      const results = [];
      let totalScore = 0;
      let passed = 0;

      for (const subject of examSubjects) {
        const roll = Math.floor(Math.random() * 20) + 1;
        const score = s[subject.stat] * 2 + roll;
        const threshold = 15 + s.year * 5;
        const success = score >= threshold;
        if (success) passed++;
        totalScore += score;

        const grade = score >= threshold + 15 ? 'O (Ohnegleichen)' : score >= threshold + 8 ? 'E (Erwartungen übertroffen)' : success ? 'A (Annehmbar)' : score >= threshold - 5 ? 'M (Mies)' : 'T (Troll)';
        results.push(`${subject.emoji} **${subject.name}:** 🎲${roll} + ${s[subject.stat] * 2} = ${score}/${threshold} → **${grade}**`);
      }

      const allPassed = passed >= 4;
      const reward = allPassed ? 500 + s.year * 300 : 100;
      db.updateBalance(userId, reward);

      if (allPassed) {
        db.db.prepare('UPDATE magic_students SET exams_passed = exams_passed + 1, house_points = house_points + 20 WHERE user_id = ?').run(userId);
      }

      const xpGain = passed * 10 + (allPassed ? 30 : 0);
      const leveled = addSchoolXP(userId, xpGain);
      const updated = getStudent(userId);

      const embed = new EmbedBuilder()
        .setColor(allPassed ? '#27ae60' : '#e74c3c')
        .setTitle(allPassed ? '📜 Prüfung bestanden!' : '📜 Prüfung nicht bestanden')
        .setDescription(
          results.join('\n') +
          `\n\n**${passed}/${examSubjects.length}** Fächer bestanden\n` +
          `💰 **+${config.currencySymbol}${reward}**\n` +
          `⭐ +${xpGain} XP` +
          (allPassed ? ' | 🏠 +20 Hauspunkte' : '') +
          (leveled ? `\n🎉 **NEUES SCHULJAHR → ${updated.year}!**` : '')
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'zauber') {
      const s = getStudent(userId);
      const owned = getSpells(userId).map(x => x.spell);

      const lines = spells.map((sp, i) => {
        const has = owned.includes(sp.name);
        const locked = sp.minYear > s.year;
        return `**${i + 1}.** ${sp.emoji} **${sp.name}** — ${sp.type} | 💥${sp.power} | 🔵${sp.manaCost} | Jahr ${sp.minYear}\n` +
          `   ${config.currencySymbol}${sp.cost.toLocaleString()}${has ? ' ✅' : locked ? ' 🔒' : ''}`;
      });

      const embed = new EmbedBuilder()
        .setColor('#8e44ad')
        .setTitle('📜 Zauberbibliothek')
        .setDescription(lines.join('\n'))
        .setFooter({ text: `Jahr ${s.year} | Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'lernen') {
      const num = interaction.options.getInteger('nummer') - 1;
      const spell = spells[num];
      if (!spell) return interaction.reply('❌ Ungültig!');

      const s = getStudent(userId);
      if (spell.minYear > s.year) return interaction.reply(`🔒 Ab **Jahr ${spell.minYear}** verfügbar!`);
      if (getSpells(userId).some(x => x.spell === spell.name)) return interaction.reply('❌ Bereits gelernt!');
      if (db.getBalance(userId) < spell.cost) return interaction.reply(`❌ Kostet **${config.currencySymbol}${spell.cost.toLocaleString()}**!`);

      db.updateBalance(userId, -spell.cost);
      db.db.prepare('INSERT OR IGNORE INTO learned_spells (user_id, spell) VALUES (?, ?)').run(userId, spell.name);

      return interaction.reply(`${spell.emoji} **${spell.name}** gelernt! 💥${spell.power} | 🔵${spell.manaCost} Mana`);
    }

    if (sub === 'duell') {
      const target = interaction.options.getUser('gegner');
      if (target.id === userId) return interaction.reply('❌ Kein Selbstduell!');
      if (target.bot) return interaction.reply('❌ Bots können nicht zaubern!');

      const s1 = getStudent(userId);
      const s2 = getStudent(target.id);
      const bet = 200 + s1.year * 80;

      if (db.getBalance(userId) < bet) return interaction.reply(`❌ Du brauchst **${config.currencySymbol}${bet}**!`);
      if (db.getBalance(target.id) < bet) return interaction.reply(`❌ **${target.username}** hat nicht genug!`);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`school_accept_${target.id}_${userId}_${bet}`).setLabel('⚔️ Annehmen').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`school_decline_${target.id}`).setLabel('❌ Ablehnen').setStyle(ButtonStyle.Danger)
      );

      const msg = await interaction.reply({ content: `⚔️ **${interaction.user.username}** (Jahr ${s1.year}) fordert **${target.username}** (Jahr ${s2.year}) zum Zauberduell! Einsatz: **${config.currencySymbol}${bet}**`, components: [row], fetchReply: true });
      const coll = msg.createMessageComponentCollector({ time: 30000 });

      coll.on('collect', (btn) => {
        if (btn.customId.startsWith('school_decline')) {
          if (btn.user.id !== target.id) return btn.reply({ content: '❌ Nicht für dich!', flags: 64 });
          coll.stop();
          return btn.update({ content: `❌ ${target.username} lehnt ab.`, components: [] });
        }
        if (btn.user.id !== target.id) return btn.reply({ content: '❌ Nicht für dich!', flags: 64 });
        coll.stop();

        db.updateBalance(userId, -bet);
        db.updateBalance(target.id, -bet);

        const p1 = getMagicPower(s1) + getSpells(userId).length * 4;
        const p2 = getMagicPower(s2) + getSpells(target.id).length * 4;

        const rounds = [];
        let hp1 = 80 + s1.defense * 3;
        let hp2 = 80 + s2.defense * 3;

        for (let r = 0; r < 5 && hp1 > 0 && hp2 > 0; r++) {
          const atk1 = Math.floor(p1 * (0.6 + Math.random() * 0.8));
          const atk2 = Math.floor(p2 * (0.6 + Math.random() * 0.8));
          const block1 = Math.random() < s1.charms * 0.02;
          const block2 = Math.random() < s2.charms * 0.02;
          hp2 -= block2 ? 0 : atk1;
          hp1 -= block1 ? 0 : atk2;
          rounds.push(`**R${r + 1}:** ${interaction.user.username}: ${block2 ? '🛡️ Block' : `💥${atk1}`} | ${target.username}: ${block1 ? '🛡️ Block' : `💥${atk2}`}`);
        }

        const winner = hp1 > hp2 ? userId : hp2 > hp1 ? target.id : null;
        if (winner) {
          db.updateBalance(winner, bet * 2);
          db.db.prepare('UPDATE magic_students SET duels_won = duels_won + 1, house_points = house_points + 10 WHERE user_id = ?').run(winner);
          addSchoolXP(winner, 25);
          addSchoolXP(winner === userId ? target.id : userId, 8);
          const winName = winner === userId ? interaction.user.username : target.username;

          const embed = new EmbedBuilder().setColor('#FFD700').setTitle(`⚔️ ${winName} gewinnt das Zauberduell!`)
            .setDescription(rounds.join('\n') + `\n\n🏆 **+${config.currencySymbol}${(bet * 2).toLocaleString()}** | +10 Hauspunkte`).setTimestamp();
          btn.update({ embeds: [embed], components: [] });
        } else {
          db.updateBalance(userId, bet);
          db.updateBalance(target.id, bet);
          const embed = new EmbedBuilder().setColor('#f39c12').setTitle('⚔️ Unentschieden!')
            .setDescription(rounds.join('\n') + '\n\n🤝 Einsätze zurück!').setTimestamp();
          btn.update({ embeds: [embed], components: [] });
        }
      });

      coll.on('end', (_, reason) => {
        if (reason === 'time') msg.edit({ content: '⏰ Keine Antwort.', components: [] });
      });
    }
  },
};
