const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const dropEvents = [
  { type: 'money', title: '💰 Geldregen!', desc: 'Schnell klicken um das Geld aufzusammeln!', min: 100, max: 500, color: '#2ecc71' },
  { type: 'chest', title: '🏴‍☠️ Schatztruhe!', desc: 'Eine Schatztruhe wurde gefunden!', min: 200, max: 800, color: '#f39c12' },
  { type: 'meteor', title: '☄️ Meteorit!', desc: 'Ein Meteorit aus Gold ist gelandet!', min: 300, max: 1000, color: '#e74c3c' },
  { type: 'fairy', title: '🧚 Geldfee!', desc: 'Eine Fee verteilt Geschenke!', min: 150, max: 600, color: '#9b59b6' },
  { type: 'rainbow', title: '🌈 Regenbogen!', desc: 'Am Ende des Regenbogens liegt ein Schatz!', min: 250, max: 750, color: '#3498db' },
];

const MIN_INTERVAL = 3 * 60 * 1000;
const MAX_INTERVAL = 10 * 60 * 1000;
const activeDrops = new Map();
let dropTimers = new Map();

function scheduleNextDrop(client, channelId) {
  const delay = Math.floor(Math.random() * (MAX_INTERVAL - MIN_INTERVAL)) + MIN_INTERVAL;

  const timer = setTimeout(() => {
    spawnDrop(client, channelId);
  }, delay);

  dropTimers.set(channelId, timer);
}

function spawnDrop(client, channelId) {
  const channel = client.channels.cache.get(channelId);
  if (!channel || !channel.isTextBased()) return;

  if (activeDrops.has(channelId)) return;

  const event = dropEvents[Math.floor(Math.random() * dropEvents.length)];
  const reward = Math.floor(Math.random() * (event.max - event.min + 1)) + event.min;

  const isMulti = Math.random() < 0.3;

  if (isMulti) {
    const maxClaimers = 3;
    const share = Math.floor(reward / maxClaimers);
    const claimed = new Set();

    activeDrops.set(channelId, true);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`drop_multi_${channelId}`).setLabel('Einsammeln!').setStyle(ButtonStyle.Success).setEmoji('🤑')
    );

    const embed = new EmbedBuilder()
      .setColor(event.color)
      .setTitle(event.title)
      .setDescription(`${event.desc}\n\n**${maxClaimers} Spieler** können je **$${share}** einsammeln!\n\nSchnell klicken!`)
      .setTimestamp();

    channel.send({ embeds: [embed], components: [row] }).then(msg => {
      const collector = msg.createMessageComponentCollector({ time: 15000 });

      collector.on('collect', (interaction) => {
        if (claimed.has(interaction.user.id)) {
          return interaction.reply({ content: '❌ Du hast bereits eingesammelt!', flags: 64 });
        }

        claimed.add(interaction.user.id);
        db.updateBalance(interaction.user.id, share);
        interaction.reply({ content: `🤑 **+$${share}** eingesammelt!`, flags: 64 });

        if (claimed.size >= maxClaimers) {
          collector.stop('full');
        }
      });

      collector.on('end', () => {
        activeDrops.delete(channelId);
        const embed = new EmbedBuilder()
          .setColor('#95a5a6')
          .setTitle(`${event.title} — Vorbei!`)
          .setDescription(`${claimed.size} Spieler haben eingesammelt.`)
          .setTimestamp();
        msg.edit({ embeds: [embed], components: [] });
        scheduleNextDrop(client, channelId);
      });
    });

  } else {
    activeDrops.set(channelId, true);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`drop_single_${channelId}`).setLabel('SCHNAPPEN!').setStyle(ButtonStyle.Success).setEmoji('💰')
    );

    const embed = new EmbedBuilder()
      .setColor(event.color)
      .setTitle(event.title)
      .setDescription(`${event.desc}\n\n**$${reward}** — Erster klickt, gewinnt!`)
      .setTimestamp();

    channel.send({ embeds: [embed], components: [row] }).then(msg => {
      const collector = msg.createMessageComponentCollector({ time: 20000, max: 1 });

      collector.on('collect', (interaction) => {
        db.updateBalance(interaction.user.id, reward);

        const embed = new EmbedBuilder()
          .setColor('#2ecc71')
          .setTitle(`${event.title} — Geschnappt!`)
          .setDescription(`**${interaction.user.username}** hat **$${reward}** eingesammelt!`)
          .setTimestamp();

        interaction.update({ embeds: [embed], components: [] });
      });

      collector.on('end', (collected) => {
        activeDrops.delete(channelId);
        if (collected.size === 0) {
          const embed = new EmbedBuilder()
            .setColor('#95a5a6')
            .setTitle(`${event.title} — Verschwunden!`)
            .setDescription('Niemand hat schnell genug reagiert...')
            .setTimestamp();
          msg.edit({ embeds: [embed], components: [] });
        }
        scheduleNextDrop(client, channelId);
      });
    });
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('drops')
    .setDescription('Aktiviere zufaellige Drop-Events in diesem Channel')
    .addSubcommand(sub =>
      sub.setName('info')
        .setDescription('Zeige den Drop-Status fuer diesen Channel'))
    .addSubcommand(sub =>
      sub.setName('on')
        .setDescription('Aktiviere Drop-Events in diesem Channel'))
    .addSubcommand(sub =>
      sub.setName('off')
        .setDescription('Deaktiviere Drop-Events in diesem Channel')),
  scheduleNextDrop,
  async execute(interaction) {
    const channelId = interaction.channel.id;
    const action = interaction.options.getSubcommand();

    if (action === 'on') {
      if (dropTimers.has(channelId)) {
        return await interaction.reply('❌ Drops sind in diesem Channel bereits aktiv!');
      }

      scheduleNextDrop(interaction.client, channelId);

      const embed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle('🎁 Drop-Events aktiviert!')
        .setDescription('Zufällige Drops erscheinen jetzt alle 3-10 Minuten in diesem Channel!\n\nSei schnell und klicke um Belohnungen einzusammeln!')
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

    } else if (action === 'off') {
      const timer = dropTimers.get(channelId);
      if (!timer) return await interaction.reply('❌ Drops sind in diesem Channel nicht aktiv!');

      clearTimeout(timer);
      dropTimers.delete(channelId);
      activeDrops.delete(channelId);

      await interaction.reply('✅ Drop-Events in diesem Channel deaktiviert.');

    } else {
      // info subcommand
      const active = dropTimers.has(channelId);
      const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle('🎁 Drop-Events')
        .setDescription(
          `Status: ${active ? '✅ Aktiv' : '❌ Inaktiv'}\n\n` +
          `\`/drops on\` — Aktivieren\n` +
          `\`/drops off\` — Deaktivieren\n\n` +
          `**Events:**\n` +
          dropEvents.map(e => `${e.title} — $${e.min}-${e.max}`).join('\n')
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }
  },
};
