const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database');

const careers = [
  {
    name: 'Programmierer',
    emoji: '💻',
    levels: [
      { title: 'Junior Developer', pay: [80, 150], req: 0 },
      { title: 'Developer', pay: [150, 280], req: 10 },
      { title: 'Senior Developer', pay: [280, 450], req: 30 },
      { title: 'Tech Lead', pay: [450, 700], req: 60 },
      { title: 'CTO', pay: [700, 1200], req: 100 },
    ],
  },
  {
    name: 'Koch',
    emoji: '👨‍🍳',
    levels: [
      { title: 'Küchenhilfe', pay: [60, 120], req: 0 },
      { title: 'Linien-Koch', pay: [120, 220], req: 10 },
      { title: 'Sous-Chef', pay: [220, 380], req: 30 },
      { title: 'Chefkoch', pay: [380, 600], req: 60 },
      { title: 'Sternekoch', pay: [600, 1000], req: 100 },
    ],
  },
  {
    name: 'Arzt',
    emoji: '🩺',
    levels: [
      { title: 'Praktikant', pay: [70, 130], req: 0 },
      { title: 'Assistenzarzt', pay: [130, 250], req: 10 },
      { title: 'Facharzt', pay: [250, 420], req: 30 },
      { title: 'Oberarzt', pay: [420, 680], req: 60 },
      { title: 'Chefarzt', pay: [680, 1100], req: 100 },
    ],
  },
  {
    name: 'Künstler',
    emoji: '🎨',
    levels: [
      { title: 'Straßenkünstler', pay: [40, 180], req: 0 },
      { title: 'Freelancer', pay: [100, 300], req: 10 },
      { title: 'Galerie-Künstler', pay: [200, 500], req: 30 },
      { title: 'Berühmter Künstler', pay: [350, 750], req: 60 },
      { title: 'Legende', pay: [500, 1300], req: 100 },
    ],
  },
  {
    name: 'Krimineller',
    emoji: '🦹',
    levels: [
      { title: 'Taschendieb', pay: [50, 200], req: 0 },
      { title: 'Einbrecher', pay: [120, 350], req: 10 },
      { title: 'Safeknacker', pay: [250, 550], req: 30 },
      { title: 'Bankräuber', pay: [400, 800], req: 60 },
      { title: 'Pate', pay: [600, 1500], req: 100 },
    ],
  },
];

const playerJobs = new Map();

db.db.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    user_id TEXT PRIMARY KEY,
    career TEXT NOT NULL,
    shifts_worked INTEGER DEFAULT 0
  );
`);

function getJob(userId) {
  if (playerJobs.has(userId)) return playerJobs.get(userId);
  const job = db.db.prepare('SELECT * FROM jobs WHERE user_id = ?').get(userId);
  if (job) playerJobs.set(userId, job);
  return job;
}

function getCareerLevel(career, shiftsWorked) {
  const c = careers.find(c => c.name === career);
  if (!c) return null;
  let level = c.levels[0];
  for (const l of c.levels) {
    if (shiftsWorked >= l.req) level = l;
  }
  return { career: c, level, levelIndex: c.levels.indexOf(level) };
}

module.exports = {
  name: 'job',
  aliases: ['beruf', 'karriere', 'career'],
  description: 'Wähle einen Beruf und steige auf (!job, !job list, !job apply, !job work, !job quit)',
  execute(message, args) {
    const userId = message.author.id;
    const config = require('../config.json');
    const action = (args[0] || 'info').toLowerCase();

    if (action === 'list' || action === 'liste' || action === 'berufe') {
      const lines = careers.map(c => {
        const maxPay = c.levels[c.levels.length - 1].pay[1];
        return `${c.emoji} **${c.name}**\n┗ ${c.levels.map(l => l.title).join(' → ')}\n┗ Max: ${config.currencySymbol}${maxPay}/Schicht`;
      });

      const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle('📋 Verfügbare Berufe')
        .setDescription(lines.join('\n\n'))
        .setFooter({ text: `${config.prefix}job apply <Beruf> zum Bewerben` })
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }

    if (action === 'apply' || action === 'bewerben') {
      const existing = getJob(userId);
      if (existing) return message.reply(`❌ Du arbeitest bereits als **${existing.career}**! Kündige zuerst mit \`${config.prefix}job quit\``);

      const careerName = args.slice(1).join(' ');
      const career = careers.find(c => c.name.toLowerCase() === careerName.toLowerCase());
      if (!career) {
        return message.reply(`❌ Beruf nicht gefunden! Nutze \`${config.prefix}job list\``);
      }

      db.db.prepare('INSERT OR REPLACE INTO jobs (user_id, career, shifts_worked) VALUES (?, ?, 0)').run(userId, career.name);
      playerJobs.set(userId, { user_id: userId, career: career.name, shifts_worked: 0 });

      const embed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle(`${career.emoji} Job angenommen!`)
        .setDescription(
          `Du bist jetzt **${career.levels[0].title}** bei **${career.name}**!\n\n` +
          `Nutze \`${config.prefix}job work\` um Schichten zu arbeiten und aufzusteigen!`
        )
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }

    if (action === 'work' || action === 'schicht') {
      const job = getJob(userId);
      if (!job) return message.reply(`❌ Du hast keinen Job! Bewirb dich mit \`${config.prefix}job apply <Beruf>\``);

      const info = getCareerLevel(job.career, job.shifts_worked);
      if (!info) return message.reply('❌ Fehler beim Laden deines Jobs!');

      const pay = Math.floor(Math.random() * (info.level.pay[1] - info.level.pay[0] + 1)) + info.level.pay[0];

      const user = db.getUser(userId);
      const prestige = user.prestige || 0;
      const finalPay = prestige > 0 ? Math.floor(pay * (1 + prestige * 0.05)) : pay;

      db.updateBalance(userId, finalPay);

      const newShifts = job.shifts_worked + 1;
      db.db.prepare('UPDATE jobs SET shifts_worked = ? WHERE user_id = ?').run(newShifts, userId);
      job.shifts_worked = newShifts;
      playerJobs.set(userId, job);

      const newInfo = getCareerLevel(job.career, newShifts);
      let promoText = '';
      if (newInfo.levelIndex > info.levelIndex) {
        promoText = `\n\n🎉 **BEFÖRDERUNG!** Du bist jetzt **${newInfo.level.title}**!`;
      }

      const nextLevel = info.career.levels[info.levelIndex + 1];
      const progressText = nextLevel
        ? `Nächste Beförderung: ${newShifts}/${nextLevel.req} Schichten`
        : 'Maximaler Rang erreicht!';

      const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle(`${info.career.emoji} Schicht als ${info.level.title}`)
        .setDescription(
          `Du hast eine Schicht als **${info.level.title}** gearbeitet!\n` +
          `Verdienst: **${config.currencySymbol}${finalPay}**${promoText}\n\n` +
          `${progressText}`
        )
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();

      message.reply({ embeds: [embed] });
      return;
    }

    if (action === 'quit' || action === 'kündigen') {
      const job = getJob(userId);
      if (!job) return message.reply('❌ Du hast keinen Job!');

      db.db.prepare('DELETE FROM jobs WHERE user_id = ?').run(userId);
      playerJobs.delete(userId);

      message.reply(`✅ Du hast als **${job.career}** gekündigt. (${job.shifts_worked} Schichten gearbeitet)`);
      return;
    }

    const job = getJob(userId);
    if (!job) {
      return message.reply(`❌ Du hast keinen Job! Nutze \`${config.prefix}job list\` und \`${config.prefix}job apply <Beruf>\``);
    }

    const info = getCareerLevel(job.career, job.shifts_worked);
    const nextLevel = info.career.levels[info.levelIndex + 1];
    const progress = nextLevel
      ? `${job.shifts_worked}/${nextLevel.req} Schichten`
      : 'Max erreicht!';
    const bar = nextLevel
      ? '▓'.repeat(Math.floor(job.shifts_worked / nextLevel.req * 10)) + '░'.repeat(10 - Math.floor(job.shifts_worked / nextLevel.req * 10))
      : '▓'.repeat(10);

    const embed = new EmbedBuilder()
      .setColor('#3498db')
      .setTitle(`${info.career.emoji} Dein Job`)
      .addFields(
        { name: 'Beruf', value: info.career.name, inline: true },
        { name: 'Rang', value: info.level.title, inline: true },
        { name: 'Gehalt', value: `${config.currencySymbol}${info.level.pay[0]}-${info.level.pay[1]}/Schicht`, inline: true },
        { name: 'Fortschritt', value: `${bar} ${progress}`, inline: false },
        { name: 'Schichten', value: `${job.shifts_worked}`, inline: true },
      )
      .setTimestamp();

    message.reply({ embeds: [embed] });
  },
};
