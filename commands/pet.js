const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const petTypes = [
  { species: 'Katze', emoji: '🐱', bonus_type: 'steal', bonus_value: 0.05, desc: '+5% Diebstahl-Erfolg' },
  { species: 'Hund', emoji: '🐕', bonus_type: 'work', bonus_value: 0.08, desc: '+8% Arbeits-Bonus' },
  { species: 'Papagei', emoji: '🦜', bonus_type: 'beg', bonus_value: 0.15, desc: '+15% Bettel-Bonus' },
  { species: 'Drache', emoji: '🐉', bonus_type: 'crime', bonus_value: 0.1, desc: '+10% Verbrechen-Erfolg' },
  { species: 'Fuchs', emoji: '🦊', bonus_type: 'hunt', bonus_value: 0.1, desc: '+10% Jagd-Bonus' },
  { species: 'Eule', emoji: '🦉', bonus_type: 'trivia', bonus_value: 0.2, desc: '+20% Quiz-Bonus' },
  { species: 'Delfin', emoji: '🐬', bonus_type: 'fish', bonus_value: 0.12, desc: '+12% Angel-Bonus' },
  { species: 'Maulwurf', emoji: '🐹', bonus_type: 'dig', bonus_value: 0.12, desc: '+12% Grab-Bonus' },
];

const ADOPT_COST = 1500;
const FEED_COST = 50;
const XP_PER_LEVEL = 100;
const FEED_COOLDOWN = 10 * 60 * 1000;

function getPet(userId) {
  return db.db.prepare('SELECT * FROM pets WHERE user_id = ?').get(userId);
}

function decayStats(pet) {
  if (!pet.last_fed) return pet;
  const hoursSinceFed = (Date.now() - new Date(pet.last_fed).getTime()) / (1000 * 60 * 60);
  const decay = Math.floor(hoursSinceFed * 2);
  pet.hunger = Math.max(0, pet.hunger - decay);
  pet.happiness = Math.max(0, pet.happiness - Math.floor(decay * 0.5));
  return pet;
}

function getPetBonus(userId) {
  const pet = getPet(userId);
  if (!pet) return { type: null, value: 0 };
  decayStats(pet);
  if (pet.hunger < 20 || pet.happiness < 20) return { type: pet.bonus_type, value: 0 };
  const levelMult = 1 + (pet.level - 1) * 0.1;
  return { type: pet.bonus_type, value: pet.bonus_value * levelMult };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pet')
    .setDescription('Haustier-System')
    .addSubcommand(sub =>
      sub.setName('info')
        .setDescription('Zeige dein Haustier'))
    .addSubcommand(sub =>
      sub.setName('adopt')
        .setDescription('Adoptiere ein neues Haustier'))
    .addSubcommand(sub =>
      sub.setName('feed')
        .setDescription('Fuettere dein Haustier'))
    .addSubcommand(sub =>
      sub.setName('train')
        .setDescription('Trainiere dein Haustier'))
    .addSubcommand(sub =>
      sub.setName('rename')
        .setDescription('Benenne dein Haustier um')
        .addStringOption(opt =>
          opt.setName('name')
            .setDescription('Der neue Name fuer dein Haustier')
            .setRequired(true))),
  getPetBonus,
  async execute(interaction) {
    const userId = interaction.user.id;
    const config = require('../config.json');
    const action = interaction.options.getSubcommand();

    if (action === 'adopt') {
      const existing = getPet(userId);
      if (existing) return await interaction.reply('❌ Du hast bereits ein Haustier! Nutze `/pet info` um es zu sehen.');

      const balance = db.getBalance(userId);
      if (balance < ADOPT_COST) {
        return await interaction.reply(`❌ Eine Adoption kostet **${config.currencySymbol}${ADOPT_COST}**! Du hast nur **${config.currencySymbol}${balance}**.`);
      }

      const row = new ActionRowBuilder().addComponents(
        ...petTypes.slice(0, 4).map((p, i) =>
          new ButtonBuilder().setCustomId(`pet_adopt_${i}_${userId}`).setLabel(p.species).setStyle(ButtonStyle.Primary).setEmoji(p.emoji)
        )
      );
      const row2 = new ActionRowBuilder().addComponents(
        ...petTypes.slice(4).map((p, i) =>
          new ButtonBuilder().setCustomId(`pet_adopt_${i + 4}_${userId}`).setLabel(p.species).setStyle(ButtonStyle.Primary).setEmoji(p.emoji)
        )
      );

      const embed = new EmbedBuilder()
        .setColor('#e67e22')
        .setTitle('🏠 Haustier adoptieren')
        .setDescription(
          `Kosten: **${config.currencySymbol}${ADOPT_COST}**\n\nWähle dein Haustier:\n\n` +
          petTypes.map(p => `${p.emoji} **${p.species}** — ${p.desc}`).join('\n')
        )
        .setFooter({ text: '30 Sekunden Zeit' })
        .setTimestamp();

      const msg = await interaction.reply({ embeds: [embed], components: [row, row2], fetchReply: true });
      const collector = msg.createMessageComponentCollector({ time: 30000 });

      collector.on('collect', (btnInteraction) => {
        if (btnInteraction.user.id !== userId) {
          return btnInteraction.reply({ content: '❌ Das ist nicht deine Adoption!', flags: 64 });
        }

        collector.stop();
        const idx = parseInt(btnInteraction.customId.split('_')[2]);
        const chosen = petTypes[idx];

        if (db.getBalance(userId) < ADOPT_COST) {
          return btnInteraction.update({ content: '❌ Nicht genug Geld!', embeds: [], components: [] });
        }

        db.updateBalance(userId, -ADOPT_COST);
        db.db.prepare(
          'INSERT INTO pets (user_id, name, species, emoji, bonus_type, bonus_value, last_fed) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).run(userId, chosen.species, chosen.species, chosen.emoji, chosen.bonus_type, chosen.bonus_value, new Date().toISOString());

        const embed = new EmbedBuilder()
          .setColor('#2ecc71')
          .setTitle(`${chosen.emoji} Haustier adoptiert!`)
          .setDescription(
            `Du hast **${chosen.species}** adoptiert!\n` +
            `Bonus: ${chosen.desc}\n\n` +
            `Vergiss nicht, dein Haustier regelmäßig zu füttern! (\`/pet feed\`)`
          )
          .setTimestamp();

        btnInteraction.update({ embeds: [embed], components: [] });
      });

      collector.on('end', (_, reason) => {
        if (reason === 'time') msg.edit({ components: [] });
      });
      return;
    }

    const pet = getPet(userId);
    if (!pet && action !== 'adopt') {
      return await interaction.reply('❌ Du hast kein Haustier! Adoptiere eins mit `/pet adopt`');
    }

    if (action === 'feed') {
      if (pet.last_fed) {
        const diff = Date.now() - new Date(pet.last_fed).getTime();
        if (diff < FEED_COOLDOWN) {
          const remaining = Math.ceil((FEED_COOLDOWN - diff) / 60000);
          return await interaction.reply(`⏳ Du kannst dein Haustier in **${remaining} Minuten** wieder füttern!`);
        }
      }

      const balance = db.getBalance(userId);
      if (balance < FEED_COST) return await interaction.reply(`❌ Füttern kostet **${config.currencySymbol}${FEED_COST}**!`);

      db.updateBalance(userId, -FEED_COST);
      db.db.prepare('UPDATE pets SET hunger = MIN(100, hunger + 30), happiness = MIN(100, happiness + 15), last_fed = ? WHERE user_id = ?')
        .run(new Date().toISOString(), userId);

      const updated = getPet(userId);

      const embed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle(`${pet.emoji} ${pet.name} gefüttert!`)
        .setDescription(`Hunger: ${statusBar(updated.hunger)} ${updated.hunger}%\nFreude: ${statusBar(updated.happiness)} ${updated.happiness}%`)
        .setFooter({ text: `Kosten: ${config.currencySymbol}${FEED_COST}` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (action === 'train') {
      decayStats(pet);
      if (pet.hunger < 30) return await interaction.reply('❌ Dein Haustier hat zu viel Hunger zum Trainieren! Füttere es zuerst.');

      const xpGain = Math.floor(Math.random() * 30) + 10;
      const newXp = pet.xp + xpGain;
      const levelsGained = Math.floor(newXp / XP_PER_LEVEL);
      const remainingXp = newXp % XP_PER_LEVEL;
      const newLevel = pet.level + levelsGained;

      db.db.prepare('UPDATE pets SET xp = ?, level = ?, happiness = MAX(0, happiness - 5) WHERE user_id = ?')
        .run(remainingXp, newLevel, userId);

      let levelUpText = '';
      if (levelsGained > 0) {
        levelUpText = `\n\n🎉 **LEVEL UP!** Level **${newLevel}**! Bonus verstärkt!`;
      }

      const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle(`${pet.emoji} ${pet.name} trainiert!`)
        .setDescription(`+**${xpGain} XP** erhalten!\nXP: ${remainingXp}/${XP_PER_LEVEL} | Level: **${newLevel}**${levelUpText}`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (action === 'rename') {
      const newName = interaction.options.getString('name');
      if (newName.length > 20) return await interaction.reply('❌ Name max 20 Zeichen!');

      db.db.prepare('UPDATE pets SET name = ? WHERE user_id = ?').run(newName, userId);

      await interaction.reply(`✅ Dein Haustier heißt jetzt **${newName}**!`);
      return;
    }

    // info subcommand
    decayStats(pet);
    const petType = petTypes.find(p => p.species === pet.species);
    const levelMult = 1 + (pet.level - 1) * 0.1;
    const currentBonus = (pet.bonus_value * levelMult * 100).toFixed(1);

    const embed = new EmbedBuilder()
      .setColor('#e67e22')
      .setTitle(`${pet.emoji} ${pet.name}`)
      .setDescription(`Art: **${pet.species}**`)
      .addFields(
        { name: '📊 Level', value: `**${pet.level}** (${pet.xp}/${XP_PER_LEVEL} XP)`, inline: true },
        { name: '🍖 Hunger', value: `${statusBar(pet.hunger)} ${pet.hunger}%`, inline: true },
        { name: '😊 Freude', value: `${statusBar(pet.happiness)} ${pet.happiness}%`, inline: true },
        { name: '⚡ Bonus', value: `${petType ? petType.desc.replace(/\+\d+/, '+' + currentBonus) : 'Keiner'}`, inline: false },
      )
      .setFooter({ text: `/pet feed | /pet train | /pet rename` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

function statusBar(value) {
  const filled = Math.floor(value / 10);
  const empty = 10 - filled;
  return '🟩'.repeat(Math.min(filled, 10)) + '⬛'.repeat(Math.max(empty, 0));
}
