const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Admin-Befehle fuer die Economy (nur Admins)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('give')
        .setDescription('Gib einem Benutzer Geld')
        .addUserOption(opt =>
          opt.setName('user')
            .setDescription('Der Benutzer')
            .setRequired(true))
        .addIntegerOption(opt =>
          opt.setName('betrag')
            .setDescription('Der Betrag')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Nimm einem Benutzer Geld')
        .addUserOption(opt =>
          opt.setName('user')
            .setDescription('Der Benutzer')
            .setRequired(true))
        .addIntegerOption(opt =>
          opt.setName('betrag')
            .setDescription('Der Betrag')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('set')
        .setDescription('Setze das Guthaben eines Benutzers')
        .addUserOption(opt =>
          opt.setName('user')
            .setDescription('Der Benutzer')
            .setRequired(true))
        .addIntegerOption(opt =>
          opt.setName('betrag')
            .setDescription('Der Betrag')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('reset')
        .setDescription('Setze den Account eines Benutzers zurueck')
        .addUserOption(opt =>
          opt.setName('user')
            .setDescription('Der Benutzer')
            .setRequired(true))),
  async execute(interaction) {
    const config = require('../config.json');
    const action = interaction.options.getSubcommand();

    if (action === 'give') {
      const target = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('betrag');
      if (amount <= 0) return await interaction.reply('❌ Ungültiger Betrag!');

      db.updateBalance(target.id, amount);

      const embed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle('👑 Admin — Geld gegeben')
        .setDescription(`**${config.currencySymbol}${amount.toLocaleString()}** an **${target.username}** gegeben.`)
        .setFooter({ text: `Neues Guthaben: ${config.currencySymbol}${db.getBalance(target.id).toLocaleString()}` })
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });

    } else if (action === 'remove') {
      const target = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('betrag');
      if (amount <= 0) return await interaction.reply('❌ Ungültiger Betrag!');

      db.updateBalance(target.id, -amount);

      const embed = new EmbedBuilder()
        .setColor('#e74c3c')
        .setTitle('👑 Admin — Geld genommen')
        .setDescription(`**${config.currencySymbol}${amount.toLocaleString()}** von **${target.username}** genommen.`)
        .setFooter({ text: `Neues Guthaben: ${config.currencySymbol}${db.getBalance(target.id).toLocaleString()}` })
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });

    } else if (action === 'set') {
      const target = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('betrag');

      db.setBalance(target.id, amount);

      const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle('👑 Admin — Geld gesetzt')
        .setDescription(`Guthaben von **${target.username}** auf **${config.currencySymbol}${amount.toLocaleString()}** gesetzt.`)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });

    } else if (action === 'reset') {
      const target = interaction.options.getUser('user');

      db.setBalance(target.id, 0);
      db.db.prepare('UPDATE users SET bank = 0 WHERE user_id = ?').run(target.id);
      db.db.prepare('DELETE FROM inventory WHERE user_id = ?').run(target.id);

      const embed = new EmbedBuilder()
        .setColor('#e74c3c')
        .setTitle('👑 Admin — Account zurückgesetzt')
        .setDescription(`**${target.username}** wurde komplett zurückgesetzt (Geld, Bank, Inventar).`)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  },
};
