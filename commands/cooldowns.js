const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cooldowns')
    .setDescription('Zeigt alle deine Cooldowns an'),
  async execute(interaction) {
    const userId = interaction.user.id;
    const user = db.getUser(userId);
    const config = require('../config.json');

    const cooldowns = [
      { name: '💼 Arbeiten', last: user.last_work, cd: 30 * 1000 },
      { name: '🦹 Klauen', last: user.last_steal, cd: 60 * 1000 },
      { name: '📅 Daily', last: user.last_daily, cd: 24 * 60 * 60 * 1000 },
      { name: '📅 Weekly', last: user.last_weekly, cd: 7 * 24 * 60 * 60 * 1000 },
    ];

    const lines = cooldowns.map(c => {
      if (!c.last) return `${c.name} — ✅ Bereit!`;
      const diff = Date.now() - new Date(c.last).getTime();
      if (diff >= c.cd) return `${c.name} — ✅ Bereit!`;
      const remaining = c.cd - diff;
      return `${c.name} — ⏳ ${formatTime(remaining)}`;
    });

    const embed = new EmbedBuilder()
      .setColor('#3498db')
      .setTitle('⏰ Deine Cooldowns')
      .setDescription(lines.join('\n'))
      .setFooter({ text: 'Andere Cooldowns (Fish, Dig, Hunt etc.) laufen über den Arbeitsspeicher' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

function formatTime(ms) {
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0) parts.push(`${seconds}s`);
  return parts.join(' ') || '0s';
}
