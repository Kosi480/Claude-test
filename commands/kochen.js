const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const COOLDOWN = 2 * 60 * 1000;
const cooldowns = new Map();

const ingredients = [
  { name: 'Mehl', emoji: '🌾', price: 30 },
  { name: 'Ei', emoji: '🥚', price: 20 },
  { name: 'Milch', emoji: '🥛', price: 25 },
  { name: 'Butter', emoji: '🧈', price: 35 },
  { name: 'Zucker', emoji: '🍬', price: 15 },
  { name: 'Fleisch', emoji: '🥩', price: 80 },
  { name: 'Fisch', emoji: '🐟', price: 60 },
  { name: 'Gemüse', emoji: '🥦', price: 40 },
  { name: 'Käse', emoji: '🧀', price: 50 },
  { name: 'Gewürze', emoji: '🌶️', price: 45 },
  { name: 'Schokolade', emoji: '🍫', price: 70 },
  { name: 'Früchte', emoji: '🍓', price: 35 },
];

const recipes = [
  {
    name: 'Pfannkuchen',
    emoji: '🥞',
    ingredients: [{ name: 'Mehl', qty: 2 }, { name: 'Ei', qty: 2 }, { name: 'Milch', qty: 1 }],
    sellPrice: 200,
    xp: 10,
    tier: 1,
  },
  {
    name: 'Omelette',
    emoji: '🍳',
    ingredients: [{ name: 'Ei', qty: 3 }, { name: 'Käse', qty: 1 }, { name: 'Gemüse', qty: 1 }],
    sellPrice: 280,
    xp: 15,
    tier: 1,
  },
  {
    name: 'Burger',
    emoji: '🍔',
    ingredients: [{ name: 'Mehl', qty: 1 }, { name: 'Fleisch', qty: 2 }, { name: 'Gemüse', qty: 1 }],
    sellPrice: 400,
    xp: 20,
    tier: 2,
  },
  {
    name: 'Sushi',
    emoji: '🍣',
    ingredients: [{ name: 'Fisch', qty: 2 }, { name: 'Gemüse', qty: 1 }, { name: 'Gewürze', qty: 1 }],
    sellPrice: 500,
    xp: 25,
    tier: 2,
  },
  {
    name: 'Steak-Dinner',
    emoji: '🥩',
    ingredients: [{ name: 'Fleisch', qty: 3 }, { name: 'Butter', qty: 1 }, { name: 'Gewürze', qty: 2 }],
    sellPrice: 750,
    xp: 35,
    tier: 3,
  },
  {
    name: 'Schokoladenkuchen',
    emoji: '🎂',
    ingredients: [{ name: 'Mehl', qty: 2 }, { name: 'Ei', qty: 2 }, { name: 'Schokolade', qty: 2 }, { name: 'Zucker', qty: 1 }],
    sellPrice: 600,
    xp: 30,
    tier: 2,
  },
  {
    name: 'Frucht-Tarte',
    emoji: '🥧',
    ingredients: [{ name: 'Mehl', qty: 1 }, { name: 'Butter', qty: 2 }, { name: 'Früchte', qty: 3 }, { name: 'Zucker', qty: 1 }],
    sellPrice: 550,
    xp: 28,
    tier: 2,
  },
  {
    name: 'Gourmet-Festmahl',
    emoji: '🍽️',
    ingredients: [{ name: 'Fleisch', qty: 2 }, { name: 'Fisch', qty: 2 }, { name: 'Gemüse', qty: 2 }, { name: 'Gewürze', qty: 2 }, { name: 'Butter', qty: 1 }],
    sellPrice: 1500,
    xp: 60,
    tier: 3,
  },
];

function ensureCookingTable() {
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS cooking (
      user_id TEXT PRIMARY KEY,
      cook_xp INTEGER DEFAULT 0,
      dishes_cooked INTEGER DEFAULT 0
    )
  `);
}

function getCookProfile(userId) {
  let profile = db.db.prepare('SELECT * FROM cooking WHERE user_id = ?').get(userId);
  if (!profile) {
    db.db.prepare('INSERT INTO cooking (user_id) VALUES (?)').run(userId);
    profile = db.db.prepare('SELECT * FROM cooking WHERE user_id = ?').get(userId);
  }
  return profile;
}

function getCookLevel(xp) {
  return Math.floor(xp / 100) + 1;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kochen')
    .setDescription('Kaufe Zutaten und koche Gerichte für Profit!')
    .addSubcommand(sub =>
      sub.setName('zutaten')
        .setDescription('Kaufe Zutaten zum Kochen')
        .addStringOption(opt =>
          opt.setName('zutat')
            .setDescription('Welche Zutat?')
            .setRequired(true)
            .addChoices(
              ...ingredients.map(i => ({ name: `${i.emoji} ${i.name} (${i.price}$)`, value: i.name }))
            ))
        .addIntegerOption(opt =>
          opt.setName('menge')
            .setDescription('Wie viele? (Standard: 1)')
            .setMinValue(1)
            .setMaxValue(20)))
    .addSubcommand(sub =>
      sub.setName('rezepte')
        .setDescription('Zeige alle Koch-Rezepte'))
    .addSubcommand(sub =>
      sub.setName('zubereiten')
        .setDescription('Koche ein Gericht')
        .addStringOption(opt =>
          opt.setName('gericht')
            .setDescription('Welches Gericht?')
            .setRequired(true)
            .addChoices(
              ...recipes.map(r => ({ name: `${r.emoji} ${r.name}`, value: r.name }))
            )))
    .addSubcommand(sub =>
      sub.setName('verkaufen')
        .setDescription('Verkaufe ein gekochtes Gericht')
        .addStringOption(opt =>
          opt.setName('gericht')
            .setDescription('Welches Gericht verkaufen?')
            .setRequired(true)
            .addChoices(
              ...recipes.map(r => ({ name: `${r.emoji} ${r.name}`, value: r.name }))
            ))
        .addIntegerOption(opt =>
          opt.setName('menge')
            .setDescription('Wie viele? (Standard: 1)')
            .setMinValue(1)))
    .addSubcommand(sub =>
      sub.setName('profil')
        .setDescription('Zeige dein Koch-Profil')),
  async execute(interaction) {
    ensureCookingTable();
    const userId = interaction.user.id;
    const config = require('../config.json');
    const action = interaction.options.getSubcommand();

    if (action === 'zutaten') {
      const zutatName = interaction.options.getString('zutat');
      const menge = interaction.options.getInteger('menge') || 1;
      const zutat = ingredients.find(i => i.name === zutatName);

      const totalCost = zutat.price * menge;
      if (db.getBalance(userId) < totalCost) {
        return interaction.reply(`❌ Du brauchst **${config.currencySymbol}${totalCost.toLocaleString()}** für ${menge}x ${zutat.emoji} ${zutat.name}!`);
      }

      db.updateBalance(userId, -totalCost);
      db.addToInventory(userId, zutat.name, menge);

      const embed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle(`${zutat.emoji} Zutaten gekauft!`)
        .setDescription(
          `**${menge}x ${zutat.name}** für **${config.currencySymbol}${totalCost.toLocaleString()}** gekauft.`
        )
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'rezepte') {
      const inventory = db.getInventory(userId);
      const ownedMap = new Map(inventory.map(i => [i.item_name, i.quantity]));
      const profile = getCookProfile(userId);
      const level = getCookLevel(profile.cook_xp);

      const lines = recipes.map(r => {
        const canCook = r.ingredients.every(ing => (ownedMap.get(ing.name) || 0) >= ing.qty);
        const tierLocked = r.tier > Math.ceil(level / 2);

        const ingredientList = r.ingredients.map(ing => {
          const owned = ownedMap.get(ing.name) || 0;
          return `${owned >= ing.qty ? '✅' : '❌'} ${ing.name} x${ing.qty}`;
        }).join(', ');

        return `${r.emoji} **${r.name}** ${tierLocked ? '🔒' : canCook ? '🟢' : '🔴'}\n` +
          `  ${ingredientList}\n` +
          `  💰 Verkauf: **${config.currencySymbol}${r.sellPrice}** | ⭐ XP: **${r.xp}**`;
      });

      const embed = new EmbedBuilder()
        .setColor('#e67e22')
        .setTitle(`👨‍🍳 Koch-Rezepte (Lv.${level})`)
        .setDescription(lines.join('\n\n'))
        .setFooter({ text: '🟢 = kochbar | 🔒 = Level zu niedrig' })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'zubereiten') {
      const lastPlay = cooldowns.get(userId);
      if (lastPlay && Date.now() - lastPlay < COOLDOWN) {
        const remaining = Math.ceil((COOLDOWN - (Date.now() - lastPlay)) / 1000);
        return interaction.reply(`⏳ Du musst noch **${remaining}s** warten!`);
      }

      const gerichtName = interaction.options.getString('gericht');
      const recipe = recipes.find(r => r.name === gerichtName);
      const profile = getCookProfile(userId);
      const level = getCookLevel(profile.cook_xp);

      if (recipe.tier > Math.ceil(level / 2)) {
        return interaction.reply(`🔒 Du brauchst Koch-Level **${recipe.tier * 2 - 1}** für **${recipe.emoji} ${recipe.name}**! (Aktuell: Lv.${level})`);
      }

      const inventory = db.getInventory(userId);
      const ownedMap = new Map(inventory.map(i => [i.item_name, i.quantity]));
      const missing = [];

      for (const ing of recipe.ingredients) {
        const owned = ownedMap.get(ing.name) || 0;
        if (owned < ing.qty) missing.push(`${ing.name}: ${owned}/${ing.qty}`);
      }

      if (missing.length > 0) {
        return interaction.reply(`❌ Dir fehlen Zutaten:\n${missing.map(m => `  • ${m}`).join('\n')}`);
      }

      cooldowns.set(userId, Date.now());

      for (const ing of recipe.ingredients) {
        db.removeFromInventory(userId, ing.name, ing.qty);
      }

      db.addToInventory(userId, recipe.name, 1);

      const bonusXp = Math.random() < 0.2 ? Math.floor(recipe.xp * 0.5) : 0;
      const totalXp = recipe.xp + bonusXp;
      db.db.prepare('UPDATE cooking SET cook_xp = cook_xp + ?, dishes_cooked = dishes_cooked + 1 WHERE user_id = ?')
        .run(totalXp, userId);

      const newProfile = getCookProfile(userId);
      const newLevel = getCookLevel(newProfile.cook_xp);
      const leveledUp = newLevel > level;

      const embed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle(`${recipe.emoji} ${recipe.name} zubereitet!`)
        .setDescription(
          `Du hast **${recipe.name}** gekocht!\n\n` +
          `⭐ +**${totalXp} XP** ${bonusXp > 0 ? '(+Bonus!)' : ''}\n` +
          `💰 Verkaufswert: **${config.currencySymbol}${recipe.sellPrice}**\n` +
          (leveledUp ? `\n🎉 **Level Up!** Koch-Level **${newLevel}** erreicht!` : '') +
          `\n\nVerkaufe mit \`/kochen verkaufen\`!`
        )
        .setFooter({ text: `Koch-XP: ${newProfile.cook_xp} | Level ${newLevel}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'verkaufen') {
      const gerichtName = interaction.options.getString('gericht');
      const menge = interaction.options.getInteger('menge') || 1;
      const recipe = recipes.find(r => r.name === gerichtName);

      const inventory = db.getInventory(userId);
      const owned = inventory.find(i => i.item_name === recipe.name);
      if (!owned || owned.quantity < menge) {
        return interaction.reply(`❌ Du hast nicht genug **${recipe.emoji} ${recipe.name}** (${owned ? owned.quantity : 0}/${menge})!`);
      }

      const profile = getCookProfile(userId);
      const level = getCookLevel(profile.cook_xp);
      const levelBonus = 1 + (level - 1) * 0.05;
      const totalEarnings = Math.floor(recipe.sellPrice * menge * levelBonus);

      db.removeFromInventory(userId, recipe.name, menge);
      db.updateBalance(userId, totalEarnings);

      const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle(`💰 ${recipe.emoji} ${recipe.name} verkauft!`)
        .setDescription(
          `**${menge}x ${recipe.name}** verkauft!\n\n` +
          `💰 Erlös: **+${config.currencySymbol}${totalEarnings.toLocaleString()}**\n` +
          (levelBonus > 1 ? `📈 Koch-Bonus: **+${Math.floor((levelBonus - 1) * 100)}%**` : '')
        )
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'profil') {
      const profile = getCookProfile(userId);
      const level = getCookLevel(profile.cook_xp);
      const xpForNext = level * 100;
      const xpProgress = profile.cook_xp % 100;
      const barLen = 15;
      const filled = Math.round((xpProgress / 100) * barLen);
      const bar = '█'.repeat(filled) + '░'.repeat(barLen - filled);
      const levelBonus = Math.floor((level - 1) * 5);

      const embed = new EmbedBuilder()
        .setColor('#e67e22')
        .setTitle(`👨‍🍳 ${interaction.user.username}'s Koch-Profil`)
        .setDescription(
          `📊 **Level ${level}**\n` +
          `\`${bar}\` ${xpProgress}/${100} XP\n\n` +
          `🍽️ Gerichte gekocht: **${profile.dishes_cooked}**\n` +
          `⭐ Gesamt-XP: **${profile.cook_xp}**\n` +
          `📈 Verkaufsbonus: **+${levelBonus}%**\n\n` +
          `🔓 Freigeschaltete Tier: **${Math.ceil(level / 2)}/${3}**`
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }
  },
};
