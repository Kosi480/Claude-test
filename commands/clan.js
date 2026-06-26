const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const CREATE_COST = 10000;
const MAX_MEMBERS = 10;

function ensureClanTables() {
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS clans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      emoji TEXT DEFAULT '⚔️',
      owner_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      bank INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS clan_members (
      user_id TEXT PRIMARY KEY,
      clan_id INTEGER NOT NULL,
      joined_at TEXT NOT NULL,
      FOREIGN KEY (clan_id) REFERENCES clans(id)
    );
  `);
}

function getClanByUser(userId) {
  const member = db.db.prepare('SELECT * FROM clan_members WHERE user_id = ?').get(userId);
  if (!member) return null;
  const clan = db.db.prepare('SELECT * FROM clans WHERE id = ?').get(member.clan_id);
  return clan;
}

function getClanMembers(clanId) {
  return db.db.prepare('SELECT * FROM clan_members WHERE clan_id = ?').all(clanId);
}

function getClanLevel(xp) {
  if (xp >= 5000) return { level: 5, bonus: 0.25, title: 'Legende' };
  if (xp >= 2000) return { level: 4, bonus: 0.20, title: 'Elite' };
  if (xp >= 800) return { level: 3, bonus: 0.15, title: 'Veteran' };
  if (xp >= 200) return { level: 2, bonus: 0.10, title: 'Aufsteiger' };
  return { level: 1, bonus: 0.05, title: 'Neuling' };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clan')
    .setDescription('Clan-System: Gründe oder tritt einem Clan bei!')
    .addSubcommand(sub =>
      sub.setName('erstellen')
        .setDescription('Gründe einen neuen Clan')
        .addStringOption(opt => opt.setName('name').setDescription('Clan-Name').setRequired(true))
        .addStringOption(opt => opt.setName('emoji').setDescription('Clan-Emoji').setRequired(false)))
    .addSubcommand(sub =>
      sub.setName('info')
        .setDescription('Zeige Clan-Infos'))
    .addSubcommand(sub =>
      sub.setName('beitreten')
        .setDescription('Tritt einem Clan bei')
        .addStringOption(opt => opt.setName('name').setDescription('Clan-Name').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('verlassen')
        .setDescription('Verlasse deinen Clan'))
    .addSubcommand(sub =>
      sub.setName('einzahlen')
        .setDescription('Zahle in die Clan-Kasse ein')
        .addStringOption(opt => opt.setName('betrag').setDescription('Betrag').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('kick')
        .setDescription('Kicke ein Mitglied (nur Owner)')
        .addUserOption(opt => opt.setName('user').setDescription('Wen kicken?').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('liste')
        .setDescription('Zeige alle Clans'))
    .addSubcommand(sub =>
      sub.setName('auflösen')
        .setDescription('Löse deinen Clan auf (nur Owner)')),
  async execute(interaction) {
    ensureClanTables();
    const userId = interaction.user.id;
    const config = require('../config.json');
    const action = interaction.options.getSubcommand();

    if (action === 'erstellen') {
      if (getClanByUser(userId)) return interaction.reply('❌ Du bist bereits in einem Clan!');
      if (db.getBalance(userId) < CREATE_COST) {
        return interaction.reply(`❌ Ein Clan kostet **${config.currencySymbol}${CREATE_COST.toLocaleString()}**!`);
      }

      const name = interaction.options.getString('name');
      if (name.length > 20) return interaction.reply('❌ Clan-Name max. 20 Zeichen!');

      const existing = db.db.prepare('SELECT * FROM clans WHERE LOWER(name) = LOWER(?)').get(name);
      if (existing) return interaction.reply('❌ Dieser Clan-Name ist vergeben!');

      const emoji = interaction.options.getString('emoji') || '⚔️';
      db.updateBalance(userId, -CREATE_COST);

      const result = db.db.prepare('INSERT INTO clans (name, emoji, owner_id, created_at) VALUES (?, ?, ?, ?)').run(name, emoji, userId, new Date().toISOString());
      db.db.prepare('INSERT INTO clan_members (user_id, clan_id, joined_at) VALUES (?, ?, ?)').run(userId, result.lastInsertRowid, new Date().toISOString());

      const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle(`${emoji} Clan gegründet!`)
        .setDescription(
          `**${name}** wurde erfolgreich gegründet!\n\n` +
          `Gründer: **${interaction.user.username}**\n` +
          `Kosten: **${config.currencySymbol}${CREATE_COST.toLocaleString()}**\n\n` +
          `Andere können mit \`/clan beitreten ${name}\` beitreten!`
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'info') {
      const clan = getClanByUser(userId);
      if (!clan) return interaction.reply('❌ Du bist in keinem Clan! Nutze `/clan liste` oder `/clan erstellen`.');

      const members = getClanMembers(clan.id);
      const levelInfo = getClanLevel(clan.xp);
      const days = Math.floor((Date.now() - new Date(clan.created_at).getTime()) / (1000 * 60 * 60 * 24));

      const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle(`${clan.emoji} ${clan.name}`)
        .setDescription(
          `**Level:** ${levelInfo.level} — ${levelInfo.title}\n` +
          `**XP:** ${clan.xp} | **Bonus:** +${Math.floor(levelInfo.bonus * 100)}% Verdienst\n` +
          `**Kasse:** ${config.currencySymbol}${clan.bank.toLocaleString()}\n` +
          `**Mitglieder:** ${members.length}/${MAX_MEMBERS}\n` +
          `**Gegründet:** vor ${days} Tagen\n` +
          `**Owner:** <@${clan.owner_id}>\n\n` +
          `**Mitglieder:**\n` +
          members.map(m => `${m.user_id === clan.owner_id ? '👑' : '👤'} <@${m.user_id}>`).join('\n')
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'beitreten') {
      if (getClanByUser(userId)) return interaction.reply('❌ Du bist bereits in einem Clan! Erst verlassen.');

      const name = interaction.options.getString('name');
      const clan = db.db.prepare('SELECT * FROM clans WHERE LOWER(name) = LOWER(?)').get(name);
      if (!clan) return interaction.reply('❌ Clan nicht gefunden!');

      const members = getClanMembers(clan.id);
      if (members.length >= MAX_MEMBERS) return interaction.reply('❌ Dieser Clan ist voll!');

      db.db.prepare('INSERT INTO clan_members (user_id, clan_id, joined_at) VALUES (?, ?, ?)').run(userId, clan.id, new Date().toISOString());
      db.db.prepare('UPDATE clans SET xp = xp + 10 WHERE id = ?').run(clan.id);

      const embed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle(`${clan.emoji} Clan beigetreten!`)
        .setDescription(
          `**${interaction.user.username}** ist **${clan.name}** beigetreten!\n` +
          `Mitglieder: **${members.length + 1}/${MAX_MEMBERS}**`
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'verlassen') {
      const clan = getClanByUser(userId);
      if (!clan) return interaction.reply('❌ Du bist in keinem Clan!');
      if (clan.owner_id === userId) return interaction.reply('❌ Als Owner musst du den Clan auflösen (`/clan auflösen`)!');

      db.db.prepare('DELETE FROM clan_members WHERE user_id = ?').run(userId);

      return interaction.reply(`✅ Du hast **${clan.emoji} ${clan.name}** verlassen.`);
    }

    if (action === 'einzahlen') {
      const clan = getClanByUser(userId);
      if (!clan) return interaction.reply('❌ Du bist in keinem Clan!');

      const betragStr = interaction.options.getString('betrag');
      let amount;
      if (betragStr === 'all' || betragStr === 'alles') {
        amount = db.getBalance(userId);
      } else {
        amount = parseInt(betragStr);
      }

      if (!amount || amount <= 0) return interaction.reply('❌ Ungültiger Betrag!');
      if (amount > db.getBalance(userId)) return interaction.reply(`❌ Du hast nur **${config.currencySymbol}${db.getBalance(userId).toLocaleString()}**!`);

      db.updateBalance(userId, -amount);
      db.db.prepare('UPDATE clans SET bank = bank + ?, xp = xp + ? WHERE id = ?').run(amount, Math.floor(amount / 100), clan.id);

      const updated = db.db.prepare('SELECT * FROM clans WHERE id = ?').get(clan.id);
      const embed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle(`${clan.emoji} Clan-Kasse`)
        .setDescription(
          `**+${config.currencySymbol}${amount.toLocaleString()}** eingezahlt!\n` +
          `⭐ +${Math.floor(amount / 100)} Clan-XP\n\n` +
          `Clan-Kasse: **${config.currencySymbol}${updated.bank.toLocaleString()}**`
        )
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'kick') {
      const clan = getClanByUser(userId);
      if (!clan) return interaction.reply('❌ Du bist in keinem Clan!');
      if (clan.owner_id !== userId) return interaction.reply('❌ Nur der Owner kann Mitglieder kicken!');

      const target = interaction.options.getUser('user');
      if (target.id === userId) return interaction.reply('❌ Du kannst dich nicht selbst kicken!');

      const targetMember = db.db.prepare('SELECT * FROM clan_members WHERE user_id = ? AND clan_id = ?').get(target.id, clan.id);
      if (!targetMember) return interaction.reply('❌ Dieser Spieler ist nicht in deinem Clan!');

      db.db.prepare('DELETE FROM clan_members WHERE user_id = ?').run(target.id);
      return interaction.reply(`✅ **${target.username}** wurde aus **${clan.emoji} ${clan.name}** gekickt!`);
    }

    if (action === 'liste') {
      const clans = db.db.prepare('SELECT * FROM clans ORDER BY xp DESC LIMIT 10').all();
      if (clans.length === 0) return interaction.reply('❌ Es gibt noch keine Clans! Erstelle einen mit `/clan erstellen`.');

      const embed = new EmbedBuilder()
        .setColor('#9b59b6')
        .setTitle('🏰 Clan-Rangliste')
        .setDescription(
          clans.map((c, i) => {
            const members = getClanMembers(c.id);
            const lvl = getClanLevel(c.xp);
            return `**${i + 1}.** ${c.emoji} **${c.name}** — Lv.${lvl.level} | ${members.length}/${MAX_MEMBERS} Mitglieder | ${c.xp} XP`;
          }).join('\n')
        )
        .setFooter({ text: 'Nutze /clan beitreten <name> zum Beitreten!' })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'auflösen') {
      const clan = getClanByUser(userId);
      if (!clan) return interaction.reply('❌ Du bist in keinem Clan!');
      if (clan.owner_id !== userId) return interaction.reply('❌ Nur der Owner kann den Clan auflösen!');

      const members = getClanMembers(clan.id);
      if (clan.bank > 0) {
        const share = Math.floor(clan.bank / members.length);
        for (const m of members) {
          db.updateBalance(m.user_id, share);
        }
      }

      db.db.prepare('DELETE FROM clan_members WHERE clan_id = ?').run(clan.id);
      db.db.prepare('DELETE FROM clans WHERE id = ?').run(clan.id);

      return interaction.reply(`✅ **${clan.emoji} ${clan.name}** wurde aufgelöst. Kasse wurde gleichmäßig aufgeteilt.`);
    }
  },
};
