const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const MARRY_COST = 5000;
const DIVORCE_COST = 2000;
const PARTNER_BONUS = 0.1;

function ensureMarriageTable() {
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS marriages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user1 TEXT NOT NULL,
      user2 TEXT NOT NULL,
      married_at TEXT NOT NULL,
      shared_bank INTEGER DEFAULT 0,
      UNIQUE(user1),
      UNIQUE(user2)
    )
  `);
}

function getMarriage(userId) {
  return db.db.prepare('SELECT * FROM marriages WHERE user1 = ? OR user2 = ?').get(userId, userId);
}

function getPartnerId(userId, marriage) {
  return marriage.user1 === userId ? marriage.user2 : marriage.user1;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('marry')
    .setDescription('Heirate einen anderen Spieler für gemeinsame Boni!')
    .addSubcommand(sub =>
      sub.setName('antrag')
        .setDescription('Mache jemandem einen Heiratsantrag')
        .addUserOption(opt => opt.setName('user').setDescription('Wen willst du heiraten?').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('info')
        .setDescription('Zeige deinen Ehe-Status'))
    .addSubcommand(sub =>
      sub.setName('einzahlen')
        .setDescription('Zahle in die gemeinsame Kasse ein')
        .addStringOption(opt => opt.setName('betrag').setDescription('Betrag').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('abheben')
        .setDescription('Hebe aus der gemeinsamen Kasse ab')
        .addStringOption(opt => opt.setName('betrag').setDescription('Betrag').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('scheidung')
        .setDescription('Lasse dich scheiden')),
  async execute(interaction) {
    ensureMarriageTable();
    const userId = interaction.user.id;
    const config = require('../config.json');
    const action = interaction.options.getSubcommand();

    if (action === 'antrag') {
      const target = interaction.options.getUser('user');
      if (target.id === userId) return interaction.reply('❌ Du kannst dich nicht selbst heiraten!');
      if (target.bot) return interaction.reply('❌ Du kannst keinen Bot heiraten!');

      const existingUser = getMarriage(userId);
      if (existingUser) return interaction.reply('❌ Du bist bereits verheiratet!');

      const existingTarget = getMarriage(target.id);
      if (existingTarget) return interaction.reply(`❌ **${target.username}** ist bereits verheiratet!`);

      if (db.getBalance(userId) < MARRY_COST) {
        return interaction.reply(`❌ Eine Hochzeit kostet **${config.currencySymbol}${MARRY_COST.toLocaleString()}**! Du hast nicht genug.`);
      }

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`marry_yes_${userId}_${target.id}`)
          .setLabel('💍 Ja, ich will!')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`marry_no_${userId}_${target.id}`)
          .setLabel('❌ Nein')
          .setStyle(ButtonStyle.Danger),
      );

      const embed = new EmbedBuilder()
        .setColor('#FF69B4')
        .setTitle('💒 Heiratsantrag!')
        .setDescription(
          `**${interaction.user.username}** macht **${target.username}** einen Antrag! 💍\n\n` +
          `Hochzeitskosten: **${config.currencySymbol}${MARRY_COST.toLocaleString()}** (zahlt der Antragsteller)\n\n` +
          `**Ehe-Boni:**\n` +
          `💰 +10% auf alle Verdienste\n` +
          `🏦 Gemeinsame Kasse\n\n` +
          `${target.username}, akzeptierst du?`
        )
        .setTimestamp();

      const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
      const collector = msg.createMessageComponentCollector({ time: 30000 });

      collector.on('collect', (btnInteraction) => {
        if (btnInteraction.user.id !== target.id) {
          return btnInteraction.reply({ content: '❌ Nur die angesprochene Person kann antworten!', flags: 64 });
        }

        collector.stop();

        if (btnInteraction.customId.startsWith('marry_yes')) {
          if (db.getBalance(userId) < MARRY_COST) {
            const embed = new EmbedBuilder()
              .setColor('#e74c3c')
              .setTitle('❌ Hochzeit fehlgeschlagen')
              .setDescription(`${interaction.user.username} hat nicht mehr genug Geld!`)
              .setTimestamp();
            return btnInteraction.update({ embeds: [embed], components: [] });
          }

          db.updateBalance(userId, -MARRY_COST);
          db.db.prepare('INSERT INTO marriages (user1, user2, married_at) VALUES (?, ?, ?)').run(userId, target.id, new Date().toISOString());

          const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('💒 Frisch Verheiratet! 🎉')
            .setDescription(
              `**${interaction.user.username}** 💍 **${target.username}**\n\n` +
              `Herzlichen Glückwunsch! Ihr seid jetzt verheiratet!\n\n` +
              `✅ +10% Verdienst-Bonus aktiv\n` +
              `✅ Gemeinsame Kasse freigeschaltet\n\n` +
              `Nutzt \`/marry einzahlen\` und \`/marry abheben\` für die gemeinsame Kasse!`
            )
            .setTimestamp();
          btnInteraction.update({ embeds: [embed], components: [] });
        } else {
          const embed = new EmbedBuilder()
            .setColor('#e74c3c')
            .setTitle('💔 Antrag abgelehnt')
            .setDescription(`**${target.username}** hat den Antrag von **${interaction.user.username}** abgelehnt.`)
            .setTimestamp();
          btnInteraction.update({ embeds: [embed], components: [] });
        }
      });

      collector.on('end', (_, reason) => {
        if (reason === 'time') {
          msg.edit({ components: [] });
        }
      });
      return;
    }

    if (action === 'info') {
      const marriage = getMarriage(userId);
      if (!marriage) {
        return interaction.reply('💔 Du bist nicht verheiratet. Nutze `/marry antrag @user` für einen Antrag!');
      }

      const partnerId = getPartnerId(userId, marriage);
      const marriedDate = new Date(marriage.married_at);
      const days = Math.floor((Date.now() - marriedDate.getTime()) / (1000 * 60 * 60 * 24));

      const embed = new EmbedBuilder()
        .setColor('#FF69B4')
        .setTitle('💍 Ehe-Status')
        .setDescription(
          `**Partner:** <@${partnerId}>\n` +
          `**Verheiratet seit:** ${days} Tagen\n` +
          `**Gemeinsame Kasse:** ${config.currencySymbol}${marriage.shared_bank.toLocaleString()}\n\n` +
          `**Boni:**\n` +
          `💰 +10% auf alle Verdienste\n` +
          `🏦 Gemeinsame Kasse`
        )
        .setFooter({ text: 'Tipp: Zahlt in die gemeinsame Kasse ein für große Anschaffungen!' })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'einzahlen') {
      const marriage = getMarriage(userId);
      if (!marriage) return interaction.reply('❌ Du bist nicht verheiratet!');

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
      db.db.prepare('UPDATE marriages SET shared_bank = shared_bank + ? WHERE user1 = ? OR user2 = ?').run(amount, userId, userId);

      const updated = getMarriage(userId);
      const embed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle('🏦 Gemeinsame Kasse')
        .setDescription(
          `**+${config.currencySymbol}${amount.toLocaleString()}** eingezahlt!\n\n` +
          `Gemeinsame Kasse: **${config.currencySymbol}${updated.shared_bank.toLocaleString()}**`
        )
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'abheben') {
      const marriage = getMarriage(userId);
      if (!marriage) return interaction.reply('❌ Du bist nicht verheiratet!');

      const betragStr = interaction.options.getString('betrag');
      let amount;
      if (betragStr === 'all' || betragStr === 'alles') {
        amount = marriage.shared_bank;
      } else {
        amount = parseInt(betragStr);
      }

      if (!amount || amount <= 0) return interaction.reply('❌ Ungültiger Betrag!');
      if (amount > marriage.shared_bank) return interaction.reply(`❌ Die gemeinsame Kasse hat nur **${config.currencySymbol}${marriage.shared_bank.toLocaleString()}**!`);

      db.updateBalance(userId, amount);
      db.db.prepare('UPDATE marriages SET shared_bank = shared_bank - ? WHERE (user1 = ? OR user2 = ?) AND shared_bank >= ?').run(amount, userId, userId, amount);

      const embed = new EmbedBuilder()
        .setColor('#e67e22')
        .setTitle('🏦 Gemeinsame Kasse')
        .setDescription(
          `**-${config.currencySymbol}${amount.toLocaleString()}** abgehoben!\n\n` +
          `Gemeinsame Kasse: **${config.currencySymbol}${(marriage.shared_bank - amount).toLocaleString()}**`
        )
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'scheidung') {
      const marriage = getMarriage(userId);
      if (!marriage) return interaction.reply('❌ Du bist nicht verheiratet!');

      if (db.getBalance(userId) < DIVORCE_COST) {
        return interaction.reply(`❌ Eine Scheidung kostet **${config.currencySymbol}${DIVORCE_COST.toLocaleString()}**!`);
      }

      const partnerId = getPartnerId(userId, marriage);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`divorce_yes_${userId}`)
          .setLabel('💔 Ja, scheiden')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`divorce_no_${userId}`)
          .setLabel('❌ Abbrechen')
          .setStyle(ButtonStyle.Secondary),
      );

      const embed = new EmbedBuilder()
        .setColor('#e74c3c')
        .setTitle('⚠️ Scheidung bestätigen?')
        .setDescription(
          `Bist du sicher, dass du dich von <@${partnerId}> scheiden lassen willst?\n\n` +
          `Kosten: **${config.currencySymbol}${DIVORCE_COST.toLocaleString()}**\n` +
          `Gemeinsame Kasse (**${config.currencySymbol}${marriage.shared_bank.toLocaleString()}**) wird 50/50 aufgeteilt.`
        )
        .setTimestamp();

      const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
      const collector = msg.createMessageComponentCollector({ time: 15000 });

      collector.on('collect', (btnInteraction) => {
        if (btnInteraction.user.id !== userId) {
          return btnInteraction.reply({ content: '❌ Das ist nicht deine Entscheidung!', flags: 64 });
        }

        collector.stop();

        if (btnInteraction.customId.startsWith('divorce_yes')) {
          db.updateBalance(userId, -DIVORCE_COST);

          const half = Math.floor(marriage.shared_bank / 2);
          if (half > 0) {
            db.updateBalance(userId, half);
            db.updateBalance(partnerId, half);
          }

          db.db.prepare('DELETE FROM marriages WHERE user1 = ? OR user2 = ?').run(userId, userId);

          const embed = new EmbedBuilder()
            .setColor('#95a5a6')
            .setTitle('💔 Geschieden')
            .setDescription(
              `**${interaction.user.username}** und <@${partnerId}> sind jetzt geschieden.\n\n` +
              (half > 0 ? `Gemeinsame Kasse aufgeteilt: je **${config.currencySymbol}${half.toLocaleString()}**\n` : '') +
              `Ehe-Boni wurden entfernt.`
            )
            .setTimestamp();
          btnInteraction.update({ embeds: [embed], components: [] });
        } else {
          const embed = new EmbedBuilder()
            .setColor('#2ecc71')
            .setTitle('💍 Scheidung abgebrochen')
            .setDescription('Die Ehe bleibt bestehen! 💕')
            .setTimestamp();
          btnInteraction.update({ embeds: [embed], components: [] });
        }
      });

      collector.on('end', (_, reason) => {
        if (reason === 'time') msg.edit({ components: [] });
      });
    }
  },
};
