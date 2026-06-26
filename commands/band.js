const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const COOLDOWN = 3 * 60 * 1000;
const cooldowns = new Map();

function ensureBandTables() {
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS bands (
      user_id TEXT PRIMARY KEY,
      band_name TEXT DEFAULT 'Unbenannt',
      genre INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      fans INTEGER DEFAULT 0,
      fame INTEGER DEFAULT 0,
      energy INTEGER DEFAULT 100,
      vocals INTEGER DEFAULT 5,
      guitar INTEGER DEFAULT 5,
      drums INTEGER DEFAULT 5,
      style INTEGER DEFAULT 5,
      songs_written INTEGER DEFAULT 0,
      concerts_played INTEGER DEFAULT 0,
      tours_done INTEGER DEFAULT 0,
      total_earnings INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS band_songs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      title TEXT,
      quality INTEGER DEFAULT 0,
      plays INTEGER DEFAULT 0
    );
  `);
}

const genres = [
  { name: 'Rock', emoji: '🎸', fanBase: 1.0, desc: 'Klassischer Rock' },
  { name: 'Pop', emoji: '🎤', fanBase: 1.3, desc: 'Massentauglich' },
  { name: 'Metal', emoji: '🤘', fanBase: 0.8, desc: 'Harte Riffs, treue Fans' },
  { name: 'Hip-Hop', emoji: '🎧', fanBase: 1.2, desc: 'Beats und Rhymes' },
  { name: 'Electronic', emoji: '🎹', fanBase: 1.1, desc: 'Synthesizer und Drops' },
  { name: 'Jazz', emoji: '🎷', fanBase: 0.7, desc: 'Anspruchsvoll, Premium-Fans' },
];

const venues = [
  { name: 'Straßenecke', emoji: '🏘️', minLevel: 1, minFans: 0, basePay: 100, fanGain: 5 },
  { name: 'Kneipe', emoji: '🍺', minLevel: 2, minFans: 20, basePay: 300, fanGain: 15 },
  { name: 'Jugendclub', emoji: '🏠', minLevel: 3, minFans: 50, basePay: 600, fanGain: 30 },
  { name: 'Musikclub', emoji: '🎵', minLevel: 5, minFans: 150, basePay: 1200, fanGain: 60 },
  { name: 'Konzerthalle', emoji: '🏛️', minLevel: 7, minFans: 500, basePay: 3000, fanGain: 120 },
  { name: 'Festival', emoji: '🎪', minLevel: 10, minFans: 1500, basePay: 8000, fanGain: 300 },
  { name: 'Stadion', emoji: '🏟️', minLevel: 15, minFans: 5000, basePay: 20000, fanGain: 800 },
  { name: 'Welttournee', emoji: '🌍', minLevel: 20, minFans: 15000, basePay: 50000, fanGain: 2000 },
];

const songTitles = [
  'Nachtfieber', 'Sternenregen', 'Donnerherz', 'Schattenläufer', 'Flammenwind',
  'Eismond', 'Goldstaub', 'Blitzgewitter', 'Nebelkind', 'Sturmbrecher',
  'Seelentanz', 'Drachenblut', 'Kristallträne', 'Mitternachtsglut', 'Wolkenreiter',
  'Feuerseele', 'Silberregen', 'Traumjäger', 'Endlose Nacht', 'Phoenixflug',
];

const concertEvents = [
  { name: 'Zugabe!', emoji: '👏', effect: 'fans', amount: 1.5, text: 'Das Publikum will mehr!' },
  { name: 'Technische Probleme', emoji: '⚡', effect: 'quality', amount: 0.6, text: 'Der Sound bricht zusammen!' },
  { name: 'Stage Diving', emoji: '🤸', effect: 'fans', amount: 1.3, text: 'Wildes Stage Diving!' },
  { name: 'Promi im Publikum', emoji: '⭐', effect: 'fame', amount: 50, text: 'Ein Promi filmt euch!' },
  { name: 'Regen', emoji: '🌧️', effect: 'quality', amount: 0.7, text: 'Es regnet auf die Open-Air-Bühne!' },
  { name: 'Viral Video', emoji: '📱', effect: 'fans', amount: 2.0, text: 'Ein Fan-Video geht viral!' },
  { name: 'Standing Ovation', emoji: '🎉', effect: 'fame', amount: 30, text: 'Standing Ovation!' },
  { name: 'Bühnenfeuer', emoji: '🔥', effect: 'fans', amount: 1.4, text: 'Pyrotechnik begeistert alle!' },
];

function getBand(userId) {
  ensureBandTables();
  let band = db.db.prepare('SELECT * FROM bands WHERE user_id = ?').get(userId);
  if (!band) {
    db.db.prepare('INSERT INTO bands (user_id) VALUES (?)').run(userId);
    band = db.db.prepare('SELECT * FROM bands WHERE user_id = ?').get(userId);
  }
  return band;
}

function getSongs(userId) {
  return db.db.prepare('SELECT * FROM band_songs WHERE user_id = ? ORDER BY quality DESC').all(userId);
}

function addBandXP(userId, xp) {
  const band = getBand(userId);
  const newXP = band.xp + xp;
  const needed = band.level * 160;
  if (newXP >= needed) {
    db.db.prepare('UPDATE bands SET xp = ?, level = level + 1 WHERE user_id = ?').run(newXP - needed, userId);
    return true;
  }
  db.db.prepare('UPDATE bands SET xp = ? WHERE user_id = ?').run(newXP, userId);
  return false;
}

function getPerformanceScore(band) {
  return band.vocals * 2 + band.guitar * 2 + band.drums * 1.5 + band.style * 1.5;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('band')
    .setDescription('Gründe eine Band, schreibe Songs und gib Konzerte!')
    .addSubcommand(sub => sub.setName('status').setDescription('Zeige deinen Band-Status'))
    .addSubcommand(sub => sub.setName('gruenden').setDescription('Gründe deine Band')
      .addStringOption(opt => opt.setName('name').setDescription('Bandname').setRequired(true))
      .addIntegerOption(opt => opt.setName('genre').setDescription('Genre 1-6').setRequired(true).setMinValue(1).setMaxValue(6)))
    .addSubcommand(sub => sub.setName('trainieren').setDescription('Übe eine Fähigkeit')
      .addStringOption(opt => opt.setName('skill').setDescription('Fähigkeit').setRequired(true)
        .addChoices(
          { name: '🎤 Vocals', value: 'vocals' },
          { name: '🎸 Gitarre', value: 'guitar' },
          { name: '🥁 Drums', value: 'drums' },
          { name: '✨ Style', value: 'style' }
        )))
    .addSubcommand(sub => sub.setName('song').setDescription('Schreibe einen neuen Song'))
    .addSubcommand(sub => sub.setName('konzert').setDescription('Gib ein Konzert')
      .addIntegerOption(opt => opt.setName('venue').setDescription('Venue 1-8').setRequired(true).setMinValue(1).setMaxValue(8)))
    .addSubcommand(sub => sub.setName('songs').setDescription('Zeige deine Songs'))
    .addSubcommand(sub => sub.setName('venues').setDescription('Zeige verfügbare Auftrittsorte')),

  async execute(interaction) {
    const userId = interaction.user.id;
    const config = require('../config.json');
    const sub = interaction.options.getSubcommand();
    ensureBandTables();

    if (sub === 'gruenden') {
      const band = getBand(userId);
      if (band.genre > 0) return interaction.reply('❌ Du hast bereits eine Band!');

      const name = interaction.options.getString('name').slice(0, 25);
      const genreIdx = interaction.options.getInteger('genre');
      const genre = genres[genreIdx - 1];

      db.db.prepare('UPDATE bands SET band_name = ?, genre = ? WHERE user_id = ?').run(name, genreIdx, userId);

      const embed = new EmbedBuilder()
        .setColor('#e74c3c')
        .setTitle(`${genre.emoji} Band gegründet!`)
        .setDescription(
          `**${name}** betritt die Bühne!\n\n` +
          `🎵 Genre: **${genre.name}** — ${genre.desc}\n` +
          `👥 Fanbasis-Multiplikator: **x${genre.fanBase}**\n\n` +
          `*Trainiere deine Skills und schreibe Songs!*`
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'status') {
      const band = getBand(userId);
      if (band.genre === 0) return interaction.reply('❌ Du hast noch keine Band! Nutze `/band gruenden`.');

      const genre = genres[band.genre - 1];
      const xpNeeded = band.level * 160;
      const songs = getSongs(userId);
      const perf = getPerformanceScore(band);

      const embed = new EmbedBuilder()
        .setColor('#9b59b6')
        .setTitle(`${genre.emoji} ${band.band_name}`)
        .setDescription(
          `**Genre:** ${genre.name}\n` +
          `**Level:** ${band.level} (${band.xp}/${xpNeeded} XP)\n` +
          `⚡ Energie: **${band.energy}/100**\n\n` +
          `**Skills:**\n` +
          `🎤 Vocals: **${band.vocals}** | 🎸 Gitarre: **${band.guitar}**\n` +
          `🥁 Drums: **${band.drums}** | ✨ Style: **${band.style}**\n` +
          `🎯 Performance: **${perf}**\n\n` +
          `**Statistiken:**\n` +
          `👥 Fans: **${band.fans.toLocaleString()}**\n` +
          `⭐ Ruhm: **${band.fame}**\n` +
          `🎵 Songs: **${songs.length}**\n` +
          `🎤 Konzerte: **${band.concerts_played}**\n` +
          `💰 Verdient: **${config.currencySymbol}${band.total_earnings.toLocaleString()}**`
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'trainieren') {
      const skill = interaction.options.getString('skill');
      const band = getBand(userId);
      if (band.genre === 0) return interaction.reply('❌ Gründe erst eine Band!');

      const cost = 200 + band[skill] * 120;
      const emojis = { vocals: '🎤', guitar: '🎸', drums: '🥁', style: '✨' };

      if (db.getBalance(userId) < cost) return interaction.reply(`❌ Training kostet **${config.currencySymbol}${cost.toLocaleString()}**!`);

      db.updateBalance(userId, -cost);
      db.db.prepare(`UPDATE bands SET ${skill} = ${skill} + 1 WHERE user_id = ?`).run(userId);

      return interaction.reply(`${emojis[skill]} **${skill}** geübt! ${band[skill]} → **${band[skill] + 1}** (${config.currencySymbol}${cost.toLocaleString()})`);
    }

    if (sub === 'song') {
      const band = getBand(userId);
      if (band.genre === 0) return interaction.reply('❌ Gründe erst eine Band!');

      const cost = 300 + band.songs_written * 100;
      if (db.getBalance(userId) < cost) return interaction.reply(`❌ Songwriting kostet **${config.currencySymbol}${cost.toLocaleString()}** (Studiozeit)!`);

      db.updateBalance(userId, -cost);

      const perf = getPerformanceScore(band);
      const quality = Math.floor(perf * (0.6 + Math.random() * 0.8) + Math.random() * 20);
      const title = songTitles[Math.floor(Math.random() * songTitles.length)] + (band.songs_written > songTitles.length ? ` ${band.songs_written}` : '');

      db.db.prepare('INSERT INTO band_songs (user_id, title, quality) VALUES (?, ?, ?)').run(userId, title, quality);
      db.db.prepare('UPDATE bands SET songs_written = songs_written + 1 WHERE user_id = ?').run(userId);

      const qualityLabel = quality >= 80 ? '🌟 Meisterwerk!' : quality >= 60 ? '⭐ Großartig!' : quality >= 40 ? '👍 Solide' : '😐 Mittelmäßig';
      const leveled = addBandXP(userId, 15 + Math.floor(quality / 5));

      const embed = new EmbedBuilder()
        .setColor(quality >= 60 ? '#FFD700' : '#3498db')
        .setTitle('🎵 Neuer Song geschrieben!')
        .setDescription(
          `**"${title}"**\n\n` +
          `📊 Qualität: **${quality}** — ${qualityLabel}\n` +
          `⭐ +${15 + Math.floor(quality / 5)} XP` +
          (leveled ? ` 🎉 **LEVEL UP!**` : '')
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'songs') {
      const songs = getSongs(userId);
      if (songs.length === 0) return interaction.reply('🎵 Noch keine Songs! Nutze `/band song`.');

      const lines = songs.slice(0, 15).map((s, i) => {
        const stars = s.quality >= 80 ? '🌟' : s.quality >= 60 ? '⭐' : s.quality >= 40 ? '👍' : '😐';
        return `${i + 1}. ${stars} **"${s.title}"** — Qualität: ${s.quality} | ▶️ ${s.plays}x gespielt`;
      });

      const embed = new EmbedBuilder()
        .setColor('#9b59b6')
        .setTitle('🎵 Deine Songs')
        .setDescription(lines.join('\n'))
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'venues') {
      const band = getBand(userId);
      const lines = venues.map((v, i) => {
        const locked = v.minLevel > band.level || v.minFans > band.fans;
        return `**${i + 1}.** ${v.emoji} **${v.name}**\n` +
          `   Lv.${v.minLevel} | 👥 ${v.minFans}+ Fans | 💰 ${config.currencySymbol}${v.basePay.toLocaleString()}+${locked ? ' 🔒' : ''}`;
      });

      const embed = new EmbedBuilder()
        .setColor('#e67e22')
        .setTitle('🎤 Auftrittsorte')
        .setDescription(lines.join('\n') + `\n\n*Spiele mit \`/band konzert venue:<Nr>\`*`)
        .setFooter({ text: `Level ${band.level} | ${band.fans} Fans` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'konzert') {
      const lastPlay = cooldowns.get(userId);
      if (lastPlay && Date.now() - lastPlay < COOLDOWN) {
        const remaining = Math.ceil((COOLDOWN - (Date.now() - lastPlay)) / 1000);
        return interaction.reply(`⏳ Nächstes Konzert in **${remaining}s**!`);
      }

      const band = getBand(userId);
      if (band.genre === 0) return interaction.reply('❌ Gründe erst eine Band!');

      const songs = getSongs(userId);
      if (songs.length === 0) return interaction.reply('❌ Du brauchst mindestens einen Song!');

      const venueIdx = interaction.options.getInteger('venue') - 1;
      const venue = venues[venueIdx];

      if (band.level < venue.minLevel) return interaction.reply(`🔒 Du brauchst **Level ${venue.minLevel}**!`);
      if (band.fans < venue.minFans) return interaction.reply(`🔒 Du brauchst **${venue.minFans} Fans**!`);
      if (band.energy < 20) return interaction.reply('⚡ Nicht genug Energie! Warte etwas.');

      cooldowns.set(userId, Date.now());

      const genre = genres[band.genre - 1];
      const perf = getPerformanceScore(band);
      const bestSong = songs[0];
      const event = concertEvents[Math.floor(Math.random() * concertEvents.length)];

      const roll = Math.floor(Math.random() * 30) + 1;
      const totalScore = perf + roll + Math.floor(bestSong.quality / 3);

      let earnings = Math.floor(venue.basePay * (totalScore / 50));
      let fanGain = Math.floor(venue.fanGain * genre.fanBase);
      let fameGain = 5 + venueIdx * 3;

      if (event.effect === 'fans') {
        fanGain = Math.floor(fanGain * event.amount);
      } else if (event.effect === 'quality') {
        earnings = Math.floor(earnings * event.amount);
      } else if (event.effect === 'fame') {
        fameGain += event.amount;
      }

      db.updateBalance(userId, earnings);
      db.db.prepare('UPDATE bands SET fans = fans + ?, fame = fame + ?, energy = MAX(0, energy - 20), concerts_played = concerts_played + 1, total_earnings = total_earnings + ? WHERE user_id = ?')
        .run(fanGain, fameGain, earnings, userId);
      db.db.prepare('UPDATE band_songs SET plays = plays + 1 WHERE id = ?').run(bestSong.id);

      const xpGain = 20 + venueIdx * 10;
      const leveled = addBandXP(userId, xpGain);
      const updated = getBand(userId);

      const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle(`${venue.emoji} Konzert: ${band.band_name} @ ${venue.name}!`)
        .setDescription(
          `🎵 Gespielt: **"${bestSong.title}"** + ${songs.length - 1} weitere\n` +
          `🎯 Performance: 🎲${roll} + ⚡${perf} + 🎵${Math.floor(bestSong.quality / 3)} = **${totalScore}**\n\n` +
          `${event.emoji} **${event.name}:** ${event.text}\n\n` +
          `💰 Einnahmen: **+${config.currencySymbol}${earnings.toLocaleString()}**\n` +
          `👥 Neue Fans: **+${fanGain.toLocaleString()}** (Gesamt: ${updated.fans.toLocaleString()})\n` +
          `⭐ Ruhm: **+${fameGain}** (Gesamt: ${updated.fame})\n` +
          `⭐ +${xpGain} XP` +
          (leveled ? ` 🎉 **LEVEL UP → ${updated.level}!**` : '')
        )
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()} | ⚡ ${updated.energy}/100` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }
  },
};
