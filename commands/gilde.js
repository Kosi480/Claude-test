const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const MAX_MEMBERS = 15;

const guildPerks = [
  { level: 1, name: 'Anfänger-Gilde', emoji: '🏠', desc: 'Gilde gegründet' },
  { level: 3, name: 'Gilden-Bank', emoji: '🏦', desc: '+5% tägliche Belohnungen für Mitglieder' },
  { level: 5, name: 'Handelsposten', emoji: '📦', desc: '+10% Verkaufspreise' },
  { level: 8, name: 'Übungsplatz', emoji: '⚔️', desc: '+10% Kampf-Belohnungen' },
  { level: 10, name: 'Gilden-Festung', emoji: '🏰', desc: 'Maximale Mitglieder +5' },
  { level: 15, name: 'Schatzkammer', emoji: '💎', desc: '+15% auf alle Einnahmen' },
  { level: 20, name: 'Legendäre Gilde', emoji: '👑', desc: '+25% auf alle Einnahmen' },
];

function ensureGuildTable() {
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS guilds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      emoji TEXT DEFAULT '⚔️',
      leader_id TEXT NOT NULL,
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      treasury INTEGER DEFAULT 0,
      total_contributed INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      description TEXT DEFAULT 'Eine tapfere Gilde!'
    )
  `);
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS guild_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id INTEGER NOT NULL,
      user_id TEXT UNIQUE NOT NULL,
      role TEXT DEFAULT 'member',
      contributed INTEGER DEFAULT 0,
      joined_at TEXT NOT NULL,
      FOREIGN KEY (guild_id) REFERENCES guilds(id)
    )
  `);
}

function getGuildByUser(userId) {
  const membership = db.db.prepare('SELECT * FROM guild_members WHERE user_id = ?').get(userId);
  if (!membership) return null;
  const guild = db.db.prepare('SELECT * FROM guilds WHERE id = ?').get(membership.guild_id);
  return guild ? { ...guild, membership } : null;
}

function getGuildMembers(guildId) {
  return db.db.prepare('SELECT * FROM guild_members WHERE guild_id = ? ORDER BY contributed DESC').all(guildId);
}

function getXpForLevel(level) {
  return Math.floor(500 * Math.pow(level, 1.5));
}

function getMaxMembers(guildLevel) {
  return MAX_MEMBERS + (guildLevel >= 10 ? 5 : 0);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gilde')
    .setDescription('Gilden-System — Gründe oder tritt einer Gilde bei!')
    .addSubcommand(sub =>
      sub.setName('gruenden')
        .setDescription('Gründe eine neue Gilde (5.000$)')
        .addStringOption(opt =>
          opt.setName('name')
            .setDescription('Gildenname')
            .setRequired(true)
            .setMaxLength(25))
        .addStringOption(opt =>
          opt.setName('emoji')
            .setDescription('Gilden-Symbol')
            .setMaxLength(5)))
    .addSubcommand(sub =>
      sub.setName('info')
        .setDescription('Zeige Gilden-Infos')
        .addStringOption(opt =>
          opt.setName('name')
            .setDescription('Gildenname (leer = deine Gilde)')))
    .addSubcommand(sub =>
      sub.setName('beitreten')
        .setDescription('Tritt einer Gilde bei')
        .addStringOption(opt =>
          opt.setName('name')
            .setDescription('Gildenname')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('verlassen')
        .setDescription('Verlasse deine Gilde'))
    .addSubcommand(sub =>
      sub.setName('spenden')
        .setDescription('Spende Geld an die Gildenkasse')
        .addIntegerOption(opt =>
          opt.setName('betrag')
            .setDescription('Wie viel spenden?')
            .setRequired(true)
            .setMinValue(100)))
    .addSubcommand(sub =>
      sub.setName('kick')
        .setDescription('Entferne ein Mitglied (nur Anführer)')
        .addUserOption(opt =>
          opt.setName('spieler')
            .setDescription('Wen entfernen?')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('befoerdern')
        .setDescription('Befördere ein Mitglied zum Offizier')
        .addUserOption(opt =>
          opt.setName('spieler')
            .setDescription('Wen befördern?')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('liste')
        .setDescription('Zeige alle Gilden'))
    .addSubcommand(sub =>
      sub.setName('auszahlen')
        .setDescription('Zahle Geld aus der Kasse aus (nur Anführer)')
        .addIntegerOption(opt =>
          opt.setName('betrag')
            .setDescription('Wie viel auszahlen?')
            .setRequired(true)
            .setMinValue(100)))
    .addSubcommand(sub =>
      sub.setName('beschreibung')
        .setDescription('Ändere die Gilden-Beschreibung')
        .addStringOption(opt =>
          opt.setName('text')
            .setDescription('Neue Beschreibung')
            .setRequired(true)
            .setMaxLength(100))),
  async execute(interaction) {
    ensureGuildTable();
    const userId = interaction.user.id;
    const config = require('../config.json');
    const action = interaction.options.getSubcommand();

    if (action === 'gruenden') {
      if (getGuildByUser(userId)) return interaction.reply('❌ Du bist bereits in einer Gilde! Verlasse sie zuerst.');

      const cost = 5000;
      if (db.getBalance(userId) < cost) return interaction.reply(`❌ Eine Gilde kostet **${config.currencySymbol}${cost.toLocaleString()}**!`);

      const name = interaction.options.getString('name');
      const emoji = interaction.options.getString('emoji') || '⚔️';

      const existing = db.db.prepare('SELECT * FROM guilds WHERE LOWER(name) = LOWER(?)').get(name);
      if (existing) return interaction.reply('❌ Dieser Gildenname ist bereits vergeben!');

      db.updateBalance(userId, -cost);

      const result = db.db.prepare('INSERT INTO guilds (name, emoji, leader_id, created_at) VALUES (?, ?, ?, ?)')
        .run(name, emoji, userId, new Date().toISOString());

      db.db.prepare('INSERT INTO guild_members (guild_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)')
        .run(result.lastInsertRowid, userId, 'leader', new Date().toISOString());

      const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle(`${emoji} Gilde "${name}" gegründet!`)
        .setDescription(
          `**${interaction.user.username}** hat die Gilde **${name}** gegründet!\n\n` +
          `Lade andere ein mit \`/gilde beitreten ${name}\`\n` +
          `Spende Geld mit \`/gilde spenden\` um die Gilde zu leveln!`
        )
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'info') {
      const guildName = interaction.options.getString('name');
      let guild;

      if (guildName) {
        guild = db.db.prepare('SELECT * FROM guilds WHERE LOWER(name) = LOWER(?)').get(guildName);
      } else {
        const data = getGuildByUser(userId);
        guild = data;
      }

      if (!guild) return interaction.reply('❌ Gilde nicht gefunden!');

      const members = getGuildMembers(guild.id);
      const xpNeeded = getXpForLevel(guild.level);
      const bar = '█'.repeat(Math.floor((guild.xp / xpNeeded) * 10)) +
                  '░'.repeat(10 - Math.floor((guild.xp / xpNeeded) * 10));
      const maxMem = getMaxMembers(guild.level);

      const memberList = members.slice(0, 10).map(m => {
        const roleEmoji = m.role === 'leader' ? '👑' : m.role === 'officer' ? '⭐' : '👤';
        return `${roleEmoji} <@${m.user_id}> — ${config.currencySymbol}${m.contributed.toLocaleString()} gespendet`;
      });

      const currentPerks = guildPerks.filter(p => guild.level >= p.level);
      const nextPerk = guildPerks.find(p => p.level > guild.level);

      const embed = new EmbedBuilder()
        .setColor('#9b59b6')
        .setTitle(`${guild.emoji} ${guild.name}`)
        .setDescription(
          `*${guild.description}*\n\n` +
          `📊 Level: **${guild.level}** \`${bar}\` ${guild.xp}/${xpNeeded}\n` +
          `💰 Kasse: **${config.currencySymbol}${guild.treasury.toLocaleString()}**\n` +
          `📈 Gesamt gespendet: **${config.currencySymbol}${guild.total_contributed.toLocaleString()}**\n` +
          `👥 Mitglieder: **${members.length}/${maxMem}**\n\n` +
          `**Mitglieder:**\n${memberList.join('\n')}\n\n` +
          `**Aktive Perks:**\n${currentPerks.map(p => `${p.emoji} ${p.name} — ${p.desc}`).join('\n')}` +
          (nextPerk ? `\n\n➡️ Nächster Perk: ${nextPerk.emoji} **${nextPerk.name}** (Level ${nextPerk.level})` : '')
        )
        .setFooter({ text: `Gegründet: ${new Date(guild.created_at).toLocaleDateString('de-DE')}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'beitreten') {
      if (getGuildByUser(userId)) return interaction.reply('❌ Du bist bereits in einer Gilde!');

      const guildName = interaction.options.getString('name');
      const guild = db.db.prepare('SELECT * FROM guilds WHERE LOWER(name) = LOWER(?)').get(guildName);
      if (!guild) return interaction.reply('❌ Gilde nicht gefunden!');

      const members = getGuildMembers(guild.id);
      const maxMem = getMaxMembers(guild.level);
      if (members.length >= maxMem) return interaction.reply('❌ Diese Gilde ist voll!');

      db.db.prepare('INSERT INTO guild_members (guild_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)')
        .run(guild.id, userId, 'member', new Date().toISOString());

      const embed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle(`${guild.emoji} Gilde beigetreten!`)
        .setDescription(`Du bist **${guild.name}** beigetreten! 🎉\n👥 Mitglieder: **${members.length + 1}/${maxMem}**`)
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'verlassen') {
      const data = getGuildByUser(userId);
      if (!data) return interaction.reply('❌ Du bist in keiner Gilde!');
      if (data.leader_id === userId) {
        const members = getGuildMembers(data.id);
        if (members.length > 1) return interaction.reply('❌ Befördere erst jemanden zum Anführer oder kicke alle Mitglieder!');
        db.db.prepare('DELETE FROM guild_members WHERE guild_id = ?').run(data.id);
        db.db.prepare('DELETE FROM guilds WHERE id = ?').run(data.id);
        return interaction.reply(`${data.emoji} Gilde **${data.name}** wurde aufgelöst.`);
      }

      db.db.prepare('DELETE FROM guild_members WHERE user_id = ?').run(userId);
      return interaction.reply(`Du hast **${data.name}** verlassen.`);
    }

    if (action === 'spenden') {
      const data = getGuildByUser(userId);
      if (!data) return interaction.reply('❌ Du bist in keiner Gilde!');

      const amount = interaction.options.getInteger('betrag');
      if (db.getBalance(userId) < amount) return interaction.reply(`❌ Du brauchst **${config.currencySymbol}${amount.toLocaleString()}**!`);

      db.updateBalance(userId, -amount);
      db.db.prepare('UPDATE guilds SET treasury = treasury + ?, total_contributed = total_contributed + ?, xp = xp + ? WHERE id = ?')
        .run(amount, amount, Math.floor(amount / 10), data.id);
      db.db.prepare('UPDATE guild_members SET contributed = contributed + ? WHERE user_id = ?')
        .run(amount, userId);

      const guild = db.db.prepare('SELECT * FROM guilds WHERE id = ?').get(data.id);
      let levelUp = '';
      const xpNeeded = getXpForLevel(guild.level);
      if (guild.xp >= xpNeeded) {
        db.db.prepare('UPDATE guilds SET level = level + 1, xp = xp - ? WHERE id = ?').run(xpNeeded, guild.id);
        const newGuild = db.db.prepare('SELECT * FROM guilds WHERE id = ?').get(guild.id);
        const newPerk = guildPerks.find(p => p.level === newGuild.level);
        levelUp = `\n\n🎉 **GILDE LEVEL UP!** Level **${newGuild.level}**!`;
        if (newPerk) levelUp += `\n${newPerk.emoji} **${newPerk.name}** freigeschaltet: ${newPerk.desc}`;
      }

      const embed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle(`${data.emoji} Spende an ${data.name}!`)
        .setDescription(
          `💰 **${config.currencySymbol}${amount.toLocaleString()}** gespendet!\n` +
          `✨ Gilden-XP: **+${Math.floor(amount / 10)}**\n` +
          `🏦 Kasse: **${config.currencySymbol}${(guild.treasury).toLocaleString()}**` +
          levelUp
        )
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'kick') {
      const data = getGuildByUser(userId);
      if (!data) return interaction.reply('❌ Du bist in keiner Gilde!');
      if (data.membership.role !== 'leader') return interaction.reply('❌ Nur der Anführer kann Mitglieder kicken!');

      const target = interaction.options.getUser('spieler');
      if (target.id === userId) return interaction.reply('❌ Du kannst dich nicht selbst kicken!');

      const targetMember = db.db.prepare('SELECT * FROM guild_members WHERE user_id = ? AND guild_id = ?').get(target.id, data.id);
      if (!targetMember) return interaction.reply('❌ Dieser Spieler ist nicht in deiner Gilde!');

      db.db.prepare('DELETE FROM guild_members WHERE user_id = ?').run(target.id);
      return interaction.reply(`👢 **${target.username}** wurde aus **${data.name}** entfernt.`);
    }

    if (action === 'befoerdern') {
      const data = getGuildByUser(userId);
      if (!data) return interaction.reply('❌ Du bist in keiner Gilde!');
      if (data.membership.role !== 'leader') return interaction.reply('❌ Nur der Anführer kann befördern!');

      const target = interaction.options.getUser('spieler');
      const targetMember = db.db.prepare('SELECT * FROM guild_members WHERE user_id = ? AND guild_id = ?').get(target.id, data.id);
      if (!targetMember) return interaction.reply('❌ Dieser Spieler ist nicht in deiner Gilde!');

      if (targetMember.role === 'officer') {
        db.db.prepare("UPDATE guild_members SET role = 'leader' WHERE user_id = ?").run(target.id);
        db.db.prepare("UPDATE guild_members SET role = 'officer' WHERE user_id = ?").run(userId);
        db.db.prepare('UPDATE guilds SET leader_id = ? WHERE id = ?').run(target.id, data.id);
        return interaction.reply(`👑 **${target.username}** ist jetzt der neue Anführer von **${data.name}**!`);
      }

      db.db.prepare("UPDATE guild_members SET role = 'officer' WHERE user_id = ?").run(target.id);
      return interaction.reply(`⭐ **${target.username}** wurde zum Offizier befördert!`);
    }

    if (action === 'liste') {
      const allGuilds = db.db.prepare('SELECT * FROM guilds ORDER BY level DESC, total_contributed DESC LIMIT 10').all();

      if (allGuilds.length === 0) return interaction.reply('📭 Noch keine Gilden! Gründe eine mit `/gilde gruenden`.');

      const list = allGuilds.map((g, i) => {
        const members = getGuildMembers(g.id);
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
        return `${medal} ${g.emoji} **${g.name}** — Level **${g.level}** | 👥 ${members.length} | 💰 ${config.currencySymbol}${g.total_contributed.toLocaleString()}`;
      });

      const embed = new EmbedBuilder()
        .setColor('#e67e22')
        .setTitle('🏰 Gilden-Rangliste')
        .setDescription(list.join('\n'))
        .setFooter({ text: 'Tritt einer Gilde bei mit /gilde beitreten' })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'auszahlen') {
      const data = getGuildByUser(userId);
      if (!data) return interaction.reply('❌ Du bist in keiner Gilde!');
      if (data.membership.role !== 'leader') return interaction.reply('❌ Nur der Anführer kann auszahlen!');

      const amount = interaction.options.getInteger('betrag');
      const guild = db.db.prepare('SELECT * FROM guilds WHERE id = ?').get(data.id);
      if (guild.treasury < amount) return interaction.reply(`❌ Die Kasse hat nur **${config.currencySymbol}${guild.treasury.toLocaleString()}**!`);

      db.db.prepare('UPDATE guilds SET treasury = treasury - ? WHERE id = ?').run(amount, data.id);
      db.updateBalance(userId, amount);

      return interaction.reply(`🏦 **${config.currencySymbol}${amount.toLocaleString()}** aus der Gildenkasse ausgezahlt.`);
    }

    if (action === 'beschreibung') {
      const data = getGuildByUser(userId);
      if (!data) return interaction.reply('❌ Du bist in keiner Gilde!');
      if (data.membership.role !== 'leader' && data.membership.role !== 'officer') {
        return interaction.reply('❌ Nur Anführer und Offiziere können die Beschreibung ändern!');
      }

      const text = interaction.options.getString('text');
      db.db.prepare('UPDATE guilds SET description = ? WHERE id = ?').run(text, data.id);
      return interaction.reply(`✅ Gilden-Beschreibung aktualisiert: *${text}*`);
    }
  },
};
