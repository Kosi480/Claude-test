const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database');

module.exports = {
  name: 'admin',
  aliases: ['eco', 'economy'],
  description: 'Admin-Befehle für die Economy (nur Admins)',
  execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('❌ Du brauchst **Administrator**-Rechte für diesen Befehl!');
    }

    const config = require('../config.json');
    const action = (args[0] || '').toLowerCase();

    if (action === 'give' || action === 'geben') {
      const target = message.mentions.users.first();
      if (!target) return message.reply('❌ `!admin give @user <Betrag>`');
      const amount = parseInt(args.find(a => !a.startsWith('<@') && a !== 'give' && a !== 'geben'));
      if (!amount || amount <= 0) return message.reply('❌ Ungültiger Betrag!');

      db.updateBalance(target.id, amount);

      const embed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle('👑 Admin — Geld gegeben')
        .setDescription(`**${config.currencySymbol}${amount.toLocaleString()}** an **${target.username}** gegeben.`)
        .setFooter({ text: `Neues Guthaben: ${config.currencySymbol}${db.getBalance(target.id).toLocaleString()}` })
        .setTimestamp();
      message.reply({ embeds: [embed] });

    } else if (action === 'remove' || action === 'nehmen') {
      const target = message.mentions.users.first();
      if (!target) return message.reply('❌ `!admin remove @user <Betrag>`');
      const amount = parseInt(args.find(a => !a.startsWith('<@') && a !== 'remove' && a !== 'nehmen'));
      if (!amount || amount <= 0) return message.reply('❌ Ungültiger Betrag!');

      db.updateBalance(target.id, -amount);

      const embed = new EmbedBuilder()
        .setColor('#e74c3c')
        .setTitle('👑 Admin — Geld genommen')
        .setDescription(`**${config.currencySymbol}${amount.toLocaleString()}** von **${target.username}** genommen.`)
        .setFooter({ text: `Neues Guthaben: ${config.currencySymbol}${db.getBalance(target.id).toLocaleString()}` })
        .setTimestamp();
      message.reply({ embeds: [embed] });

    } else if (action === 'set' || action === 'setzen') {
      const target = message.mentions.users.first();
      if (!target) return message.reply('❌ `!admin set @user <Betrag>`');
      const amount = parseInt(args.find(a => !a.startsWith('<@') && a !== 'set' && a !== 'setzen'));
      if (isNaN(amount)) return message.reply('❌ Ungültiger Betrag!');

      db.setBalance(target.id, amount);

      const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle('👑 Admin — Geld gesetzt')
        .setDescription(`Guthaben von **${target.username}** auf **${config.currencySymbol}${amount.toLocaleString()}** gesetzt.`)
        .setTimestamp();
      message.reply({ embeds: [embed] });

    } else if (action === 'reset') {
      const target = message.mentions.users.first();
      if (!target) return message.reply('❌ `!admin reset @user`');

      db.setBalance(target.id, 0);
      db.db.prepare('UPDATE users SET bank = 0 WHERE user_id = ?').run(target.id);
      db.db.prepare('DELETE FROM inventory WHERE user_id = ?').run(target.id);

      const embed = new EmbedBuilder()
        .setColor('#e74c3c')
        .setTitle('👑 Admin — Account zurückgesetzt')
        .setDescription(`**${target.username}** wurde komplett zurückgesetzt (Geld, Bank, Inventar).`)
        .setTimestamp();
      message.reply({ embeds: [embed] });

    } else {
      const embed = new EmbedBuilder()
        .setColor('#f39c12')
        .setTitle('👑 Admin-Befehle')
        .setDescription(
          `\`${config.prefix}admin give @user <Betrag>\` — Geld geben\n` +
          `\`${config.prefix}admin remove @user <Betrag>\` — Geld nehmen\n` +
          `\`${config.prefix}admin set @user <Betrag>\` — Geld setzen\n` +
          `\`${config.prefix}admin reset @user\` — Account zurücksetzen`
        )
        .setTimestamp();
      message.reply({ embeds: [embed] });
    }
  },
};
