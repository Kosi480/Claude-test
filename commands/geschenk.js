const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const COOLDOWN = 5 * 60 * 1000;
const cooldowns = new Map();

const giftBoxes = [
  {
    name: 'Bronze-Box',
    emoji: '🎁',
    cost: 200,
    rewards: [
      { text: '💰 50$', gold: 50, chance: 0.3 },
      { text: '💰 150$', gold: 150, chance: 0.3 },
      { text: '💰 300$', gold: 300, chance: 0.2 },
      { text: '🧪 Heiltrank', item: 'Heiltrank', chance: 0.15 },
      { text: '💰 500$', gold: 500, chance: 0.05 },
    ],
  },
  {
    name: 'Silber-Box',
    emoji: '🎀',
    cost: 500,
    rewards: [
      { text: '💰 200$', gold: 200, chance: 0.25 },
      { text: '💰 500$', gold: 500, chance: 0.3 },
      { text: '💰 800$', gold: 800, chance: 0.2 },
      { text: '🔮 Mana-Kristall', item: 'Mana-Kristall', chance: 0.15 },
      { text: '💰 1500$', gold: 1500, chance: 0.1 },
    ],
  },
  {
    name: 'Gold-Box',
    emoji: '✨',
    cost: 1500,
    rewards: [
      { text: '💰 500$', gold: 500, chance: 0.2 },
      { text: '💰 1200$', gold: 1200, chance: 0.3 },
      { text: '💰 2500$', gold: 2500, chance: 0.2 },
      { text: '💠 Magischer Stein', item: 'Magischer Stein', chance: 0.15 },
      { text: '💰 5000$', gold: 5000, chance: 0.1 },
      { text: '💎 Diamant-Ring', item: 'Diamant-Ring', chance: 0.05 },
    ],
  },
];

function pickReward(box) {
  const roll = Math.random();
  let cumulative = 0;
  for (const reward of box.rewards) {
    cumulative += reward.chance;
    if (roll < cumulative) return reward;
  }
  return box.rewards[0];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('geschenk')
    .setDescription('Schicke Geschenkboxen an andere Spieler!')
    .addSubcommand(sub =>
      sub.setName('senden')
        .setDescription('Sende eine Geschenkbox')
        .addUserOption(opt => opt.setName('user').setDescription('Wem schicken?').setRequired(true))
        .addStringOption(opt =>
          opt.setName('box')
            .setDescription('Welche Box?')
            .setRequired(true)
            .addChoices(
              { name: '🎁 Bronze-Box (200$)', value: 'bronze' },
              { name: '🎀 Silber-Box (500$)', value: 'silber' },
              { name: '✨ Gold-Box (1500$)', value: 'gold' },
            )))
    .addSubcommand(sub =>
      sub.setName('preise')
        .setDescription('Zeige alle Geschenkbox-Optionen')),
  async execute(interaction) {
    const userId = interaction.user.id;
    const config = require('../config.json');
    const action = interaction.options.getSubcommand();

    if (action === 'preise') {
      const embed = new EmbedBuilder()
        .setColor('#e91e63')
        .setTitle('🎁 Geschenkboxen')
        .setDescription(
          giftBoxes.map(box => {
            const rewardList = box.rewards.map(r => `  ${r.text} (${Math.floor(r.chance * 100)}%)`).join('\n');
            return `${box.emoji} **${box.name}** — ${config.currencySymbol}${box.cost}\n${rewardList}`;
          }).join('\n\n') +
          `\n\n*Nutze \`/geschenk senden @user <box>\` zum Verschicken!*`
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'senden') {
      const lastPlay = cooldowns.get(userId);
      if (lastPlay && Date.now() - lastPlay < COOLDOWN) {
        const remaining = Math.ceil((COOLDOWN - (Date.now() - lastPlay)) / 1000);
        return interaction.reply(`⏳ Du musst noch **${remaining}s** warten!`);
      }

      const target = interaction.options.getUser('user');
      if (target.id === userId) return interaction.reply('❌ Du kannst dir nicht selbst ein Geschenk schicken!');
      if (target.bot) return interaction.reply('❌ Du kannst keinem Bot ein Geschenk schicken!');

      const boxChoice = interaction.options.getString('box');
      const boxIdx = boxChoice === 'bronze' ? 0 : boxChoice === 'silber' ? 1 : 2;
      const box = giftBoxes[boxIdx];

      if (db.getBalance(userId) < box.cost) {
        return interaction.reply(`❌ Du brauchst **${config.currencySymbol}${box.cost}** für eine ${box.emoji} ${box.name}!`);
      }

      cooldowns.set(userId, Date.now());
      db.updateBalance(userId, -box.cost);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`gift_open_${target.id}_${userId}`)
          .setLabel('🎁 Geschenk öffnen!')
          .setStyle(ButtonStyle.Success),
      );

      const embed = new EmbedBuilder()
        .setColor('#e91e63')
        .setTitle(`${box.emoji} Geschenk erhalten!`)
        .setDescription(
          `**${interaction.user.username}** hat **${target.username}** eine **${box.name}** geschickt! 🎉\n\n` +
          `${target.username}, klicke auf den Button um dein Geschenk zu öffnen!`
        )
        .setFooter({ text: '60s zum Öffnen' })
        .setTimestamp();

      const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
      const collector = msg.createMessageComponentCollector({ time: 60000 });

      let opened = false;

      collector.on('collect', (btnInteraction) => {
        if (btnInteraction.user.id !== target.id) {
          return btnInteraction.reply({ content: `❌ Nur **${target.username}** kann dieses Geschenk öffnen!`, flags: 64 });
        }

        if (opened) return;
        opened = true;
        collector.stop('opened');

        const reward = pickReward(box);

        if (reward.gold) {
          db.updateBalance(target.id, reward.gold);
        }
        if (reward.item) {
          db.addToInventory(target.id, reward.item);
        }

        const embed = new EmbedBuilder()
          .setColor('#FFD700')
          .setTitle(`${box.emoji} Geschenk geöffnet!`)
          .setDescription(
            `**${target.username}** öffnet die **${box.name}** von **${interaction.user.username}**...\n\n` +
            `🎉 Inhalt: **${reward.text}**!\n\n` +
            (reward.gold ? `💰 +**${config.currencySymbol}${reward.gold}**` : `📦 Item zum Inventar hinzugefügt!`)
          )
          .setFooter({ text: `${target.username}'s Guthaben: ${config.currencySymbol}${db.getBalance(target.id).toLocaleString()}` })
          .setTimestamp();
        btnInteraction.update({ embeds: [embed], components: [] });
      });

      collector.on('end', (_, reason) => {
        if (reason === 'time' && !opened) {
          const reward = pickReward(box);
          if (reward.gold) db.updateBalance(target.id, reward.gold);
          if (reward.item) db.addToInventory(target.id, reward.item);

          const embed = new EmbedBuilder()
            .setColor('#f39c12')
            .setTitle(`${box.emoji} Geschenk automatisch geöffnet`)
            .setDescription(
              `Die **${box.name}** von **${interaction.user.username}** wurde automatisch geöffnet.\n\n` +
              `🎉 Inhalt für **${target.username}**: **${reward.text}**`
            )
            .setTimestamp();
          msg.edit({ embeds: [embed], components: [] });
        }
      });
    }
  },
};
