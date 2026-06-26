const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const recipes = [
  {
    name: 'Super-Angel',
    emoji: '🎣✨',
    ingredients: [{ item: 'Angel', qty: 2 }, { item: 'Goldbarren', qty: 1 }],
    description: '+25% Fisch-Wert',
    sellPrice: 3000,
  },
  {
    name: 'Diamant-Schaufel',
    emoji: '⛏️💎',
    ingredients: [{ item: 'Schaufel', qty: 2 }, { item: 'Diamant-Ring', qty: 1 }],
    description: '+25% Grab-Wert',
    sellPrice: 3500,
  },
  {
    name: 'Doppelter Glücksbringer',
    emoji: '🍀🍀',
    ingredients: [{ item: 'Glücksbringer', qty: 2 }],
    description: '+25% beim Arbeiten (statt 10%)',
    sellPrice: 2000,
  },
  {
    name: 'Festung',
    emoji: '🏰',
    ingredients: [{ item: 'Schutzschild', qty: 3 }, { item: 'Tresor', qty: 1 }],
    description: 'Schützt 3x vor Dieben + Bank-Kapazität +10.000',
    sellPrice: 6000,
  },
  {
    name: 'Gaming-Setup',
    emoji: '🖥️',
    ingredients: [{ item: 'Laptop', qty: 2 }, { item: 'Diamant-Ring', qty: 1 }],
    description: '+15% auf alle Arbeitseinnahmen',
    sellPrice: 4000,
  },
  {
    name: 'Kronjuwelen',
    emoji: '👑',
    ingredients: [{ item: 'Diamant-Ring', qty: 2 }, { item: 'Goldbarren', qty: 2 }],
    description: 'Legendäres Sammlerstück',
    sellPrice: 15000,
  },
];

function registerCraftedItems() {
  for (const recipe of recipes) {
    try {
      db.db.prepare('INSERT OR IGNORE INTO shop_items (name, price, description, emoji) VALUES (?, ?, ?, ?)')
        .run(recipe.name, recipe.sellPrice, recipe.description, recipe.emoji);
    } catch (_) {}
  }
}
registerCraftedItems();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('craft')
    .setDescription('Stelle Items aus Rezepten her')
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('Zeige alle verfuegbaren Rezepte'))
    .addSubcommand(sub =>
      sub.setName('herstellen')
        .setDescription('Stelle ein Item her')
        .addStringOption(opt =>
          opt.setName('rezept')
            .setDescription('Name des Rezepts')
            .setRequired(true))),
  async execute(interaction) {
    const userId = interaction.user.id;
    const config = require('../config.json');
    const action = interaction.options.getSubcommand();

    if (action === 'list') {
      const inventory = db.getInventory(userId);

      const lines = recipes.map(r => {
        const ingredientList = r.ingredients.map(ing => {
          const has = inventory.find(i => i.item_name === ing.item);
          const hasQty = has ? has.quantity : 0;
          const ok = hasQty >= ing.qty ? '✅' : '❌';
          return `${ok} ${ing.item} x${ing.qty} (${hasQty}/${ing.qty})`;
        }).join('\n  ');

        return `${r.emoji} **${r.name}**\n  ${ingredientList}\n  ┗ ${r.description}`;
      });

      const embed = new EmbedBuilder()
        .setColor('#e67e22')
        .setTitle('🔨 Crafting — Rezepte')
        .setDescription(lines.join('\n\n'))
        .setFooter({ text: `/craft herstellen zum Herstellen` })
        .setTimestamp();

      return await interaction.reply({ embeds: [embed] });
    }

    // herstellen subcommand
    const rezeptName = interaction.options.getString('rezept');
    const recipe = recipes.find(r => r.name.toLowerCase() === rezeptName.toLowerCase());
    if (!recipe) {
      const match = recipes.find(r => r.name.toLowerCase().includes(rezeptName.toLowerCase()));
      if (!match) return await interaction.reply('❌ Rezept nicht gefunden! Nutze `/craft list`');
      return await craftItem(interaction, match, userId, config);
    }

    await craftItem(interaction, recipe, userId, config);
  },
};

async function craftItem(interaction, recipe, userId, config) {
  const inventory = db.getInventory(userId);

  for (const ing of recipe.ingredients) {
    const has = inventory.find(i => i.item_name === ing.item);
    const hasQty = has ? has.quantity : 0;
    if (hasQty < ing.qty) {
      return await interaction.reply(`❌ Dir fehlt **${ing.item}** x${ing.qty - hasQty}!`);
    }
  }

  for (const ing of recipe.ingredients) {
    db.removeFromInventory(userId, ing.item, ing.qty);
  }

  db.addToInventory(userId, recipe.name);

  const usedItems = recipe.ingredients.map(i => `${i.item} x${i.qty}`).join(' + ');

  const embed = new EmbedBuilder()
    .setColor('#2ecc71')
    .setTitle('🔨 Hergestellt!')
    .setDescription(
      `${usedItems} ➜ ${recipe.emoji} **${recipe.name}**!\n\n` +
      `*${recipe.description}*`
    )
    .setFooter({ text: `Verkaufswert: ${config.currencySymbol}${recipe.sellPrice.toLocaleString()}` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
