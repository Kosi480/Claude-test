const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const crops = [
  { name: 'Karotte', emoji: '🥕', cost: 20, value: 50, growTime: 5 * 60 * 1000, xp: 5 },
  { name: 'Tomate', emoji: '🍅', cost: 40, value: 100, growTime: 10 * 60 * 1000, xp: 10 },
  { name: 'Mais', emoji: '🌽', cost: 80, value: 200, growTime: 20 * 60 * 1000, xp: 20 },
  { name: 'Erdbeere', emoji: '🍓', cost: 150, value: 400, growTime: 30 * 60 * 1000, xp: 35 },
  { name: 'Kürbis', emoji: '🎃', cost: 300, value: 800, growTime: 60 * 60 * 1000, xp: 60 },
  { name: 'Goldapfel', emoji: '🍎', cost: 600, value: 1800, growTime: 2 * 60 * 60 * 1000, xp: 100 },
];

const MAX_PLOTS = 6;

function ensureFarmTable() {
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS farm (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      plot INTEGER NOT NULL,
      crop_name TEXT NOT NULL,
      planted_at TEXT NOT NULL,
      watered INTEGER DEFAULT 0,
      UNIQUE(user_id, plot)
    )
  `);
  try { db.db.exec('ALTER TABLE users ADD COLUMN farm_xp INTEGER DEFAULT 0'); } catch (_) {}
  try { db.db.exec('ALTER TABLE users ADD COLUMN farm_plots INTEGER DEFAULT 3'); } catch (_) {}
}

function getFarmLevel(xp) {
  if (xp >= 1000) return { level: 5, title: 'Meisterbauer' };
  if (xp >= 500) return { level: 4, title: 'Großbauer' };
  if (xp >= 200) return { level: 3, title: 'Landwirt' };
  if (xp >= 50) return { level: 2, title: 'Gärtner' };
  return { level: 1, title: 'Anfänger' };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('farm')
    .setDescription('Baue Pflanzen an und ernte sie für Profit!')
    .addSubcommand(sub =>
      sub.setName('info')
        .setDescription('Zeige deine Farm und Felder'))
    .addSubcommand(sub =>
      sub.setName('pflanzen')
        .setDescription('Pflanze eine Pflanze auf ein Feld')
        .addStringOption(opt => opt.setName('pflanze').setDescription('Name der Pflanze').setRequired(true))
        .addIntegerOption(opt => opt.setName('feld').setDescription('Feldnummer (1-6)').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('giessen')
        .setDescription('Gieße ein Feld für schnelleres Wachstum')
        .addIntegerOption(opt => opt.setName('feld').setDescription('Feldnummer').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('ernten')
        .setDescription('Ernte alle fertigen Pflanzen'))
    .addSubcommand(sub =>
      sub.setName('laden')
        .setDescription('Zeige verfügbare Samen')),
  async execute(interaction) {
    ensureFarmTable();
    const userId = interaction.user.id;
    const config = require('../config.json');
    const action = interaction.options.getSubcommand();
    const user = db.getUser(userId);
    const farmXp = db.db.prepare('SELECT farm_xp, farm_plots FROM users WHERE user_id = ?').get(userId);
    const xp = farmXp?.farm_xp || 0;
    const maxPlots = farmXp?.farm_plots || 3;
    const farmInfo = getFarmLevel(xp);

    if (action === 'laden') {
      const embed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle('🌱 Saatgut-Laden')
        .setDescription(
          crops.map(c => {
            const mins = Math.floor(c.growTime / 60000);
            const timeStr = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
            return `${c.emoji} **${c.name}** — Kosten: ${config.currencySymbol}${c.cost} | Ertrag: ${config.currencySymbol}${c.value} | Zeit: ${timeStr}`;
          }).join('\n') +
          `\n\nNutze \`/farm pflanzen <name> <feld>\` zum Pflanzen!`
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'info') {
      const plots = db.db.prepare('SELECT * FROM farm WHERE user_id = ? ORDER BY plot').all(userId);
      let farmDisplay = '';

      for (let i = 1; i <= maxPlots; i++) {
        const plot = plots.find(p => p.plot === i);
        if (!plot) {
          farmDisplay += `**Feld ${i}:** 🟫 Leer\n`;
        } else {
          const crop = crops.find(c => c.name === plot.crop_name);
          const elapsed = Date.now() - new Date(plot.planted_at).getTime();
          const growTime = plot.watered ? crop.growTime * 0.7 : crop.growTime;
          const progress = Math.min(1, elapsed / growTime);
          const barLen = 8;
          const filled = Math.round(progress * barLen);
          const bar = '🟩'.repeat(filled) + '⬜'.repeat(barLen - filled);

          if (progress >= 1) {
            farmDisplay += `**Feld ${i}:** ${crop.emoji} ${crop.name} — ✅ ERNTEREIF!\n`;
          } else {
            const remaining = Math.ceil((growTime - elapsed) / 60000);
            const timeStr = remaining >= 60 ? `${Math.floor(remaining / 60)}h ${remaining % 60}m` : `${remaining}m`;
            farmDisplay += `**Feld ${i}:** ${crop.emoji} ${crop.name} — ${bar} ${timeStr}${plot.watered ? ' 💧' : ''}\n`;
          }
        }
      }

      for (let i = maxPlots + 1; i <= MAX_PLOTS; i++) {
        farmDisplay += `**Feld ${i}:** 🔒 Gesperrt (Level ${i - 2})\n`;
      }

      const nextLevelXp = [0, 50, 200, 500, 1000][farmInfo.level] || '∞';

      const embed = new EmbedBuilder()
        .setColor('#8B4513')
        .setTitle(`🌾 ${interaction.user.username}'s Farm`)
        .setDescription(
          `🏷️ **${farmInfo.title}** (Level ${farmInfo.level})\n` +
          `⭐ XP: **${xp}**${typeof nextLevelXp === 'number' ? ` / ${nextLevelXp}` : ''}\n` +
          `🟫 Felder: **${maxPlots}/${MAX_PLOTS}**\n\n` +
          farmDisplay
        )
        .setFooter({ text: 'Gieße Pflanzen für 30% schnelleres Wachstum!' })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'pflanzen') {
      const cropName = interaction.options.getString('pflanze');
      const plotNum = interaction.options.getInteger('feld');

      if (plotNum < 1 || plotNum > maxPlots) {
        return interaction.reply(`❌ Ungültiges Feld! Du hast Felder **1-${maxPlots}**.`);
      }

      const crop = crops.find(c => c.name.toLowerCase() === cropName.toLowerCase());
      if (!crop) {
        return interaction.reply(`❌ Unbekannte Pflanze! Nutze \`/farm laden\` für die Liste.`);
      }

      const existing = db.db.prepare('SELECT * FROM farm WHERE user_id = ? AND plot = ?').get(userId, plotNum);
      if (existing) {
        return interaction.reply(`❌ Feld ${plotNum} ist schon belegt!`);
      }

      if (db.getBalance(userId) < crop.cost) {
        return interaction.reply(`❌ Du brauchst **${config.currencySymbol}${crop.cost}** für ${crop.emoji} ${crop.name}!`);
      }

      db.updateBalance(userId, -crop.cost);
      db.db.prepare('INSERT INTO farm (user_id, plot, crop_name, planted_at) VALUES (?, ?, ?, ?)').run(userId, plotNum, crop.name, new Date().toISOString());

      const embed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle('🌱 Gepflanzt!')
        .setDescription(
          `${crop.emoji} **${crop.name}** auf Feld **${plotNum}** gepflanzt!\n\n` +
          `Kosten: **${config.currencySymbol}${crop.cost}**\n` +
          `Ertrag: **${config.currencySymbol}${crop.value}**\n` +
          `Wachstumszeit: **${Math.floor(crop.growTime / 60000)} Minuten**`
        )
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'giessen') {
      const plotNum = interaction.options.getInteger('feld');
      const plot = db.db.prepare('SELECT * FROM farm WHERE user_id = ? AND plot = ?').get(userId, plotNum);

      if (!plot) return interaction.reply(`❌ Feld ${plotNum} ist leer!`);
      if (plot.watered) return interaction.reply(`❌ Feld ${plotNum} wurde bereits gegossen! 💧`);

      db.db.prepare('UPDATE farm SET watered = 1 WHERE user_id = ? AND plot = ?').run(userId, plotNum);
      const crop = crops.find(c => c.name === plot.crop_name);

      const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle('💧 Gegossen!')
        .setDescription(
          `Feld **${plotNum}** (${crop.emoji} ${crop.name}) wurde gegossen!\n` +
          `Wachstum ist jetzt **30% schneller**!`
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'ernten') {
      const plots = db.db.prepare('SELECT * FROM farm WHERE user_id = ?').all(userId);
      let totalValue = 0;
      let totalXp = 0;
      let harvested = [];

      for (const plot of plots) {
        const crop = crops.find(c => c.name === plot.crop_name);
        if (!crop) continue;
        const elapsed = Date.now() - new Date(plot.planted_at).getTime();
        const growTime = plot.watered ? crop.growTime * 0.7 : crop.growTime;

        if (elapsed >= growTime) {
          const bonus = plot.watered ? 1.15 : 1.0;
          const value = Math.floor(crop.value * bonus);
          totalValue += value;
          totalXp += crop.xp;
          harvested.push({ ...crop, plot: plot.plot, value, watered: plot.watered });
          db.db.prepare('DELETE FROM farm WHERE user_id = ? AND plot = ?').run(userId, plot.plot);
        }
      }

      if (harvested.length === 0) {
        return interaction.reply('❌ Keine Pflanzen sind erntereif! Nutze `/farm info` um den Status zu sehen.');
      }

      db.updateBalance(userId, totalValue);
      db.db.prepare('UPDATE users SET farm_xp = farm_xp + ? WHERE user_id = ?').run(totalXp, userId);

      const newXp = (farmXp?.farm_xp || 0) + totalXp;
      const newLevel = getFarmLevel(newXp);
      const oldLevel = farmInfo.level;

      let levelUpMsg = '';
      if (newLevel.level > oldLevel) {
        const newPlots = Math.min(MAX_PLOTS, maxPlots + 1);
        db.db.prepare('UPDATE users SET farm_plots = ? WHERE user_id = ?').run(newPlots, userId);
        levelUpMsg = `\n\n🎉 **LEVEL UP!** Du bist jetzt **${newLevel.title}** (Level ${newLevel.level})!\n🟫 Neues Feld freigeschaltet! (${newPlots}/${MAX_PLOTS})`;
      }

      const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('🌾 Ernte eingefahren!')
        .setDescription(
          harvested.map(h => `${h.emoji} **${h.name}** (Feld ${h.plot}) — ${config.currencySymbol}${h.value}${h.watered ? ' 💧+15%' : ''}`).join('\n') +
          `\n\n💰 Gesamt: **+${config.currencySymbol}${totalValue.toLocaleString()}**\n` +
          `⭐ +**${totalXp}** Farm-XP` +
          levelUpMsg
        )
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }
  },
};
