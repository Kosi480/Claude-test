const { EmbedBuilder } = require('discord.js');
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
  name: 'craft',
  aliases: ['craften', 'herstellen', 'bauen'],
  description: 'Stelle Items her (!craft list / !craft <Rezeptname>)',
  execute(message, args) {
    const userId = message.author.id;
    const config = require('../config.json');
    const action = args.join(' ').toLowerCase();

    if (!args.length || action === 'list' || action === 'liste' || action === 'rezepte') {
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
        .setFooter({ text: `${config.prefix}craft <Name> zum Herstellen` })
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }

    const recipe = recipes.find(r => r.name.toLowerCase() === action);
    if (!recipe) {
      const match = recipes.find(r => r.name.toLowerCase().includes(action));
      if (!match) return message.reply(`❌ Rezept nicht gefunden! Nutze \`${config.prefix}craft list\``);
      return craftItem(message, match, userId, config);
    }

    craftItem(message, recipe, userId, config);
  },
};

function craftItem(message, recipe, userId, config) {
  const inventory = db.getInventory(userId);

  for (const ing of recipe.ingredients) {
    const has = inventory.find(i => i.item_name === ing.item);
    const hasQty = has ? has.quantity : 0;
    if (hasQty < ing.qty) {
      return message.reply(`❌ Dir fehlt **${ing.item}** x${ing.qty - hasQty}!`);
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

  message.reply({ embeds: [embed] });
}
