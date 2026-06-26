const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const missions = [
  { name: 'Juweliergeschäft', emoji: '💍', baseLoot: 800, difficulty: 0.55 },
  { name: 'Kunstgalerie', emoji: '🖼️', baseLoot: 1200, difficulty: 0.45 },
  { name: 'Banktresor', emoji: '🏦', baseLoot: 2000, difficulty: 0.35 },
  { name: 'Casino-Kasse', emoji: '🎰', baseLoot: 1500, difficulty: 0.40 },
  { name: 'Luxus-Yacht', emoji: '🛥️', baseLoot: 2500, difficulty: 0.30 },
];

const roles = [
  { name: 'Hacker', emoji: '💻', bonus: 'Alarm deaktivieren (+15% Chance)' },
  { name: 'Einbrecher', emoji: '🔓', bonus: 'Schlösser knacken (+20% Beute)' },
  { name: 'Fahrer', emoji: '🚗', bonus: 'Schnelle Flucht (+10% Chance)' },
  { name: 'Ablenkung', emoji: '🎭', bonus: 'Wachen ablenken (+25% Chance bei Risiko)' },
];

const COOLDOWN = 5 * 60 * 1000;
const cooldowns = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('duo')
    .setDescription('Kooperativer Raub zu zweit (5min Cooldown)')
    .addUserOption(opt => opt.setName('user').setDescription('Dein Partner für den Raub').setRequired(true)),
  async execute(interaction) {
    const userId = interaction.user.id;
    const config = require('../config.json');
    const target = interaction.options.getUser('user');

    if (!target) return await interaction.reply('❌ Erwähne einen Partner! `/duo @partner`');
    if (target.id === userId) return await interaction.reply('❌ Du brauchst einen echten Partner!');
    if (target.bot) return await interaction.reply('❌ Bots können nicht mitmachen!');

    const lastPlay = cooldowns.get(userId);
    if (lastPlay && Date.now() - lastPlay < COOLDOWN) {
      const remaining = Math.ceil((COOLDOWN - (Date.now() - lastPlay)) / 1000);
      return await interaction.reply(`⏳ Du musst noch **${remaining}s** warten!`);
    }

    const mission = missions[Math.floor(Math.random() * missions.length)];

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`duo_accept_${userId}`).setLabel('Mitmachen!').setStyle(ButtonStyle.Success).setEmoji('🤝'),
      new ButtonBuilder().setCustomId(`duo_decline_${userId}`).setLabel('Ablehnen').setStyle(ButtonStyle.Danger),
    );

    const embed = new EmbedBuilder()
      .setColor('#e67e22')
      .setTitle(`${mission.emoji} Duo-Raub: ${mission.name}`)
      .setDescription(
        `**${interaction.user.username}** sucht einen Partner für einen Raub!\n\n` +
        `Ziel: **${mission.name}** ${mission.emoji}\n` +
        `Mögliche Beute: **${config.currencySymbol}${mission.baseLoot.toLocaleString()}+**\n` +
        `Schwierigkeit: **${Math.floor((1 - mission.difficulty) * 100)}%**\n\n` +
        `${target.username}, bist du dabei?`
      )
      .setFooter({ text: '30s zum Annehmen' })
      .setTimestamp();

    const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
    const collector = msg.createMessageComponentCollector({ time: 30000 });

    collector.on('collect', (btnInteraction) => {
      if (btnInteraction.user.id !== target.id) {
        return btnInteraction.reply({ content: '❌ Nur die eingeladene Person kann reagieren!', flags: 64 });
      }

      collector.stop();

      if (btnInteraction.customId === `duo_decline_${userId}`) {
        const embed = new EmbedBuilder()
          .setColor('#95a5a6')
          .setTitle('🤝 Abgelehnt')
          .setDescription(`**${target.username}** hat den Duo-Raub abgelehnt.`)
          .setTimestamp();
        return btnInteraction.update({ embeds: [embed], components: [] });
      }

      cooldowns.set(userId, Date.now());
      cooldowns.set(target.id, Date.now());

      const role1 = roles[Math.floor(Math.random() * roles.length)];
      let role2;
      do { role2 = roles[Math.floor(Math.random() * roles.length)]; } while (role2 === role1);

      let successChance = mission.difficulty;
      let lootBonus = 1.0;

      if (role1.name === 'Hacker' || role2.name === 'Hacker') successChance += 0.15;
      if (role1.name === 'Fahrer' || role2.name === 'Fahrer') successChance += 0.10;
      if (role1.name === 'Ablenkung' || role2.name === 'Ablenkung') successChance += 0.12;
      if (role1.name === 'Einbrecher' || role2.name === 'Einbrecher') lootBonus += 0.20;

      successChance = Math.min(successChance, 0.90);
      const success = Math.random() < successChance;

      if (success) {
        const loot = Math.floor(mission.baseLoot * lootBonus * (0.8 + Math.random() * 0.6));
        const share = Math.floor(loot / 2);

        db.updateBalance(userId, share);
        db.updateBalance(target.id, share);

        const embed = new EmbedBuilder()
          .setColor('#2ecc71')
          .setTitle(`${mission.emoji} Raub erfolgreich!`)
          .setDescription(
            `**Rollen:**\n` +
            `${role1.emoji} **${interaction.user.username}** — ${role1.name}\n` +
            `${role2.emoji} **${target.username}** — ${role2.name}\n\n` +
            `Gesamtbeute: **${config.currencySymbol}${loot.toLocaleString()}**\n` +
            `Anteil pro Person: **${config.currencySymbol}${share.toLocaleString()}**`
          )
          .setFooter({ text: 'Erfolgsrate: ' + Math.floor(successChance * 100) + '%' })
          .setTimestamp();

        btnInteraction.update({ embeds: [embed], components: [] });
      } else {
        const fine = Math.floor(mission.baseLoot * 0.3);
        const fine1 = Math.min(fine, db.getBalance(userId));
        const fine2 = Math.min(fine, db.getBalance(target.id));

        db.updateBalance(userId, -fine1);
        db.updateBalance(target.id, -fine2);

        const embed = new EmbedBuilder()
          .setColor('#e74c3c')
          .setTitle(`🚔 Raub fehlgeschlagen!`)
          .setDescription(
            `**Rollen:**\n` +
            `${role1.emoji} **${interaction.user.username}** — ${role1.name}\n` +
            `${role2.emoji} **${target.username}** — ${role2.name}\n\n` +
            `Ihr wurdet erwischt! 🚨\n` +
            `Strafe: **${interaction.user.username}** -${config.currencySymbol}${fine1} | **${target.username}** -${config.currencySymbol}${fine2}`
          )
          .setFooter({ text: 'Erfolgsrate: ' + Math.floor(successChance * 100) + '%' })
          .setTimestamp();

        btnInteraction.update({ embeds: [embed], components: [] });
      }
    });

    collector.on('end', (_, reason) => {
      if (reason === 'time') msg.edit({ components: [] });
    });
  },
};
