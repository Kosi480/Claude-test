const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const MINE_COOLDOWN = 5 * 60 * 1000;
const cooldowns = new Map();

const ores = [
  { id: 'stein', name: 'Stein', emoji: '🪨', value: 5, smeltResult: null, depth: 1, weight: 40 },
  { id: 'kohle', name: 'Kohle', emoji: '⬛', value: 15, smeltResult: null, depth: 1, weight: 30 },
  { id: 'kupfer', name: 'Kupfererz', emoji: '🟤', value: 30, smeltResult: 'Kupferbarren', smeltValue: 80, depth: 1, weight: 20 },
  { id: 'eisen', name: 'Eisenerz', emoji: '⚪', value: 50, smeltResult: 'Eisenbarren', smeltValue: 140, depth: 3, weight: 25 },
  { id: 'silber', name: 'Silbererz', emoji: '🩶', value: 80, smeltResult: 'Silberbarren', smeltValue: 220, depth: 5, weight: 18 },
  { id: 'gold_erz', name: 'Golderz', emoji: '🟡', value: 150, smeltResult: 'Goldbarren', smeltValue: 400, depth: 8, weight: 12 },
  { id: 'rubin', name: 'Rohrubin', emoji: '🔴', value: 250, smeltResult: 'Geschliffener Rubin', smeltValue: 650, depth: 12, weight: 8 },
  { id: 'saphir', name: 'Rohsaphir', emoji: '🔵', value: 300, smeltResult: 'Geschliffener Saphir', smeltValue: 750, depth: 15, weight: 6 },
  { id: 'smaragd', name: 'Rohsmaragd', emoji: '🟢', value: 400, smeltResult: 'Geschliffener Smaragd', smeltValue: 1000, depth: 20, weight: 4 },
  { id: 'diamant_erz', name: 'Rohdiamant', emoji: '💎', value: 800, smeltResult: 'Perfekter Diamant', smeltValue: 2000, depth: 25, weight: 2 },
  { id: 'mythril', name: 'Mythril-Erz', emoji: '🌟', value: 1500, smeltResult: 'Mythril-Barren', smeltValue: 4000, depth: 30, weight: 1 },
];

const pickaxes = [
  { id: 'holz', name: 'Holzspitzhacke', emoji: '🪓', power: 1, luck: 0, price: 0 },
  { id: 'stein_p', name: 'Steinspitzhacke', emoji: '⛏️', power: 2, luck: 0.02, price: 500 },
  { id: 'eisen_p', name: 'Eisenspitzhacke', emoji: '🔨', power: 3, luck: 0.05, price: 2000 },
  { id: 'gold_p', name: 'Goldspitzhacke', emoji: '🥇', power: 4, luck: 0.1, price: 8000 },
  { id: 'diamant_p', name: 'Diamantspitzhacke', emoji: '💎', power: 6, luck: 0.15, price: 25000 },
  { id: 'mythril_p', name: 'Mythril-Spitzhacke', emoji: '🌟', power: 8, luck: 0.2, price: 75000 },
];

const events = [
  { name: 'Höhleneinsturz', emoji: '💥', type: 'bad', effect: 'lose_ore', text: 'Ein Teil der Mine stürzt ein! Du verlierst etwas Erz.' },
  { name: 'Unterirdischer See', emoji: '💧', type: 'neutral', effect: 'none', text: 'Du findest einen unterirdischen See. Schön, aber nutzlos.' },
  { name: 'Geheimer Gang', emoji: '🚪', type: 'good', effect: 'bonus_ore', text: 'Ein geheimer Gang! Extra Erze gefunden!' },
  { name: 'Glühwürmchen', emoji: '✨', type: 'good', effect: 'bonus_money', text: 'Glühwürmchen erhellen eine Schatzkammer!' },
  { name: 'Giftgas', emoji: '☠️', type: 'bad', effect: 'end_early', text: 'Giftgas! Du musst sofort raus!' },
  { name: 'Kristallhöhle', emoji: '💎', type: 'great', effect: 'rare_find', text: 'Eine Kristallhöhle! Seltene Erze überall!' },
  { name: 'Alter Schacht', emoji: '🕳️', type: 'good', effect: 'depth_bonus', text: 'Ein alter Schacht führt dich tiefer!' },
];

function ensureMineTable() {
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS mining (
      user_id TEXT PRIMARY KEY,
      pickaxe_id TEXT DEFAULT 'holz',
      mine_level INTEGER DEFAULT 1,
      mine_xp INTEGER DEFAULT 0,
      depth_reached INTEGER DEFAULT 1,
      total_mined INTEGER DEFAULT 0,
      total_earned INTEGER DEFAULT 0
    )
  `);
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS ore_storage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      ore_id TEXT NOT NULL,
      quantity INTEGER DEFAULT 0,
      UNIQUE(user_id, ore_id)
    )
  `);
}

function getMiner(userId) {
  let miner = db.db.prepare('SELECT * FROM mining WHERE user_id = ?').get(userId);
  if (!miner) {
    db.db.prepare('INSERT INTO mining (user_id) VALUES (?)').run(userId);
    miner = db.db.prepare('SELECT * FROM mining WHERE user_id = ?').get(userId);
  }
  return miner;
}

function getOreStorage(userId) {
  return db.db.prepare('SELECT * FROM ore_storage WHERE user_id = ? AND quantity > 0').all(userId);
}

function addOre(userId, oreId, qty) {
  const existing = db.db.prepare('SELECT * FROM ore_storage WHERE user_id = ? AND ore_id = ?').get(userId, oreId);
  if (existing) {
    db.db.prepare('UPDATE ore_storage SET quantity = quantity + ? WHERE user_id = ? AND ore_id = ?').run(qty, userId, oreId);
  } else {
    db.db.prepare('INSERT INTO ore_storage (user_id, ore_id, quantity) VALUES (?, ?, ?)').run(userId, oreId, qty);
  }
}

function removeOre(userId, oreId, qty) {
  db.db.prepare('UPDATE ore_storage SET quantity = quantity - ? WHERE user_id = ? AND ore_id = ?').run(qty, userId, oreId);
  db.db.prepare('DELETE FROM ore_storage WHERE quantity <= 0').run();
}

function getXpForLevel(level) {
  return Math.floor(80 * Math.pow(level, 1.4));
}

function rollOre(depth, luck) {
  const available = ores.filter(o => o.depth <= depth);
  const weights = available.map(o => {
    let w = o.weight;
    if (luck > 0 && o.value > 100) w *= (1 + luck * 3);
    return w;
  });
  const total = weights.reduce((s, w) => s + w, 0);
  const roll = Math.random() * total;
  let cumulative = 0;
  for (let i = 0; i < available.length; i++) {
    cumulative += weights[i];
    if (roll < cumulative) return available[i];
  }
  return available[0];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bergwerk')
    .setDescription('Bergwerk — Mine Erze, schmelze Barren, werde reich!')
    .addSubcommand(sub =>
      sub.setName('graben')
        .setDescription('Gehe in die Mine und grabe Erze! (5min CD)'))
    .addSubcommand(sub =>
      sub.setName('lager')
        .setDescription('Zeige dein Erz-Lager'))
    .addSubcommand(sub =>
      sub.setName('schmelzen')
        .setDescription('Schmelze Erze zu Barren')
        .addStringOption(opt =>
          opt.setName('erz')
            .setDescription('Welches Erz schmelzen?')
            .setRequired(true))
        .addIntegerOption(opt =>
          opt.setName('menge')
            .setDescription('Wie viele?')
            .setRequired(true)
            .setMinValue(1)))
    .addSubcommand(sub =>
      sub.setName('verkaufen')
        .setDescription('Verkaufe Erze oder Barren')
        .addStringOption(opt =>
          opt.setName('item')
            .setDescription('Was verkaufen?')
            .setRequired(true))
        .addIntegerOption(opt =>
          opt.setName('menge')
            .setDescription('Wie viele?')
            .setRequired(true)
            .setMinValue(1)))
    .addSubcommand(sub =>
      sub.setName('spitzhacke')
        .setDescription('Kaufe eine bessere Spitzhacke')
        .addStringOption(opt =>
          opt.setName('kaufen')
            .setDescription('Welche Spitzhacke?')
            .addChoices(...pickaxes.filter(p => p.price > 0).map(p => ({ name: `${p.emoji} ${p.name} (${p.price}$)`, value: p.id })))))
    .addSubcommand(sub =>
      sub.setName('profil')
        .setDescription('Zeige dein Bergbau-Profil')),
  async execute(interaction) {
    ensureMineTable();
    const userId = interaction.user.id;
    const config = require('../config.json');
    const action = interaction.options.getSubcommand();

    if (action === 'graben') {
      const lastMine = cooldowns.get(userId);
      if (lastMine && Date.now() - lastMine < MINE_COOLDOWN) {
        const remaining = Math.ceil((MINE_COOLDOWN - (Date.now() - lastMine)) / 1000);
        return interaction.reply(`⏳ Die Mine braucht Ruhe! Noch **${Math.ceil(remaining / 60)}min**`);
      }

      const miner = getMiner(userId);
      const pick = pickaxes.find(p => p.id === miner.pickaxe_id) || pickaxes[0];
      cooldowns.set(userId, Date.now());

      const currentDepth = miner.depth_reached;
      const mineRounds = 3 + pick.power;
      const foundOres = [];
      const log = [];
      let totalXp = 0;
      let bonusMoney = 0;
      let endEarly = false;
      let depthGain = 0;

      for (let i = 0; i < mineRounds && !endEarly; i++) {
        if (Math.random() < 0.2) {
          const event = events[Math.floor(Math.random() * events.length)];
          switch (event.effect) {
            case 'lose_ore':
              if (foundOres.length > 0) {
                foundOres.pop();
                log.push(`${event.emoji} ${event.text}`);
              }
              break;
            case 'bonus_ore': {
              const bonusOre = rollOre(currentDepth + depthGain, pick.luck);
              foundOres.push(bonusOre);
              log.push(`${event.emoji} ${event.text} (+${bonusOre.emoji} ${bonusOre.name})`);
              break;
            }
            case 'bonus_money': {
              const money = 100 + Math.floor(Math.random() * 500);
              bonusMoney += money;
              log.push(`${event.emoji} ${event.text} (+${config.currencySymbol}${money})`);
              break;
            }
            case 'end_early':
              endEarly = true;
              log.push(`${event.emoji} ${event.text}`);
              break;
            case 'rare_find': {
              const rareOre = rollOre(Math.min(currentDepth + depthGain + 10, 35), pick.luck + 0.3);
              foundOres.push(rareOre);
              foundOres.push(rareOre);
              log.push(`${event.emoji} ${event.text} (+2x ${rareOre.emoji} ${rareOre.name}!)`);
              break;
            }
            case 'depth_bonus':
              depthGain += 3;
              log.push(`${event.emoji} ${event.text} (+3 Tiefe)`);
              break;
            default:
              log.push(`${event.emoji} ${event.text}`);
          }
        } else {
          const ore = rollOre(currentDepth + depthGain, pick.luck);
          foundOres.push(ore);
          totalXp += Math.floor(ore.value / 10);
          log.push(`⛏️ ${ore.emoji} **${ore.name}** abgebaut!`);
        }
      }

      for (const ore of foundOres) {
        addOre(userId, ore.id, 1);
      }

      if (bonusMoney > 0) db.updateBalance(userId, bonusMoney);

      const newDepth = Math.max(currentDepth, currentDepth + depthGain + (endEarly ? 0 : 1));
      db.db.prepare('UPDATE mining SET mine_xp = mine_xp + ?, total_mined = total_mined + ?, depth_reached = MAX(depth_reached, ?) WHERE user_id = ?')
        .run(totalXp, foundOres.length, newDepth, userId);

      const updatedMiner = getMiner(userId);
      let levelUp = '';
      const xpNeeded = getXpForLevel(updatedMiner.mine_level);
      if (updatedMiner.mine_xp >= xpNeeded) {
        db.db.prepare('UPDATE mining SET mine_level = mine_level + 1, mine_xp = mine_xp - ? WHERE user_id = ?')
          .run(xpNeeded, userId);
        const newMiner = getMiner(userId);
        levelUp = `\n\n🎉 **LEVEL UP!** Bergbau-Level **${newMiner.mine_level}**!`;
      }

      const oreCount = {};
      for (const ore of foundOres) {
        oreCount[ore.name] = (oreCount[ore.name] || 0) + 1;
      }
      const summary = Object.entries(oreCount).map(([name, count]) => {
        const ore = ores.find(o => o.name === name);
        return `${ore.emoji} ${count}x ${name}`;
      }).join(', ');

      const embed = new EmbedBuilder()
        .setColor(foundOres.some(o => o.value >= 400) ? '#FFD700' : '#8B4513')
        .setTitle(`⛏️ Bergwerk — Tiefe ${currentDepth + depthGain}`)
        .setDescription(
          `${pick.emoji} **${pick.name}** | Runden: **${mineRounds}**\n\n` +
          `**Minenlog:**\n${log.join('\n')}\n\n` +
          `📦 Beute: ${summary || 'Nichts'}` +
          (bonusMoney > 0 ? `\n💰 Bonus: **+${config.currencySymbol}${bonusMoney}**` : '') +
          `\n✨ XP: **+${totalXp}**` +
          levelUp
        )
        .setFooter({ text: `Tiefe: ${newDepth} | Nutze /bergwerk schmelzen und /bergwerk verkaufen` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'lager') {
      const storage = getOreStorage(userId);

      if (storage.length === 0) return interaction.reply('📦 Dein Lager ist leer! Grabe mit `/bergwerk graben`.');

      const list = storage.map(s => {
        const ore = ores.find(o => o.id === s.ore_id);
        if (ore) {
          return `${ore.emoji} **${ore.name}** x${s.quantity} (${config.currencySymbol}${ore.value}/Stk.)${ore.smeltResult ? ` → ${ore.smeltResult}` : ''}`;
        }
        return `📦 **${s.ore_id}** x${s.quantity}`;
      });

      const embed = new EmbedBuilder()
        .setColor('#8B4513')
        .setTitle(`📦 ${interaction.user.username}'s Erz-Lager`)
        .setDescription(list.join('\n'))
        .setFooter({ text: 'Schmelze Erze für mehr Wert! /bergwerk schmelzen' })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'schmelzen') {
      const erzName = interaction.options.getString('erz').toLowerCase();
      const qty = interaction.options.getInteger('menge');

      const ore = ores.find(o => o.name.toLowerCase() === erzName || o.id === erzName);
      if (!ore) return interaction.reply(`❌ Erz **${erzName}** nicht gefunden!`);
      if (!ore.smeltResult) return interaction.reply(`❌ **${ore.name}** kann nicht geschmolzen werden!`);

      const stored = db.db.prepare('SELECT * FROM ore_storage WHERE user_id = ? AND ore_id = ?').get(userId, ore.id);
      if (!stored || stored.quantity < qty) {
        return interaction.reply(`❌ Du hast nur **${stored ? stored.quantity : 0}x ${ore.name}**!`);
      }

      removeOre(userId, ore.id, qty);
      db.addToInventory(userId, ore.smeltResult, qty);

      const embed = new EmbedBuilder()
        .setColor('#e67e22')
        .setTitle('🔥 Geschmolzen!')
        .setDescription(
          `${ore.emoji} **${qty}x ${ore.name}** → **${qty}x ${ore.smeltResult}**\n\n` +
          `📈 Wert: ${config.currencySymbol}${ore.value}/Stk. → ${config.currencySymbol}${ore.smeltValue}/Stk.`
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'verkaufen') {
      const itemName = interaction.options.getString('item').toLowerCase();
      const qty = interaction.options.getInteger('menge');

      const ore = ores.find(o => o.name.toLowerCase() === itemName || o.id === itemName);
      if (ore) {
        const stored = db.db.prepare('SELECT * FROM ore_storage WHERE user_id = ? AND ore_id = ?').get(userId, ore.id);
        if (!stored || stored.quantity < qty) return interaction.reply(`❌ Du hast nur **${stored ? stored.quantity : 0}x ${ore.name}**!`);

        const miner = getMiner(userId);
        const levelBonus = 1 + miner.mine_level * 0.03;
        const price = Math.floor(ore.value * levelBonus);
        const total = price * qty;

        removeOre(userId, ore.id, qty);
        db.updateBalance(userId, total);
        db.db.prepare('UPDATE mining SET total_earned = total_earned + ? WHERE user_id = ?').run(total, userId);

        const embed = new EmbedBuilder()
          .setColor('#2ecc71')
          .setTitle(`💰 ${qty}x ${ore.emoji} ${ore.name} verkauft!`)
          .setDescription(`💰 Erlös: **+${config.currencySymbol}${total.toLocaleString()}** (${config.currencySymbol}${price}/Stk.)`)
          .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      const smeltOre = ores.find(o => o.smeltResult && o.smeltResult.toLowerCase() === itemName);
      if (smeltOre) {
        if (!db.hasItem(userId, smeltOre.smeltResult)) return interaction.reply(`❌ Du hast kein **${smeltOre.smeltResult}**!`);
        const inv = db.db.prepare('SELECT * FROM inventory WHERE user_id = ? AND item_name = ?').get(userId, smeltOre.smeltResult);
        if (!inv || inv.quantity < qty) return interaction.reply(`❌ Du hast nur **${inv ? inv.quantity : 0}x ${smeltOre.smeltResult}**!`);

        const miner = getMiner(userId);
        const levelBonus = 1 + miner.mine_level * 0.03;
        const price = Math.floor(smeltOre.smeltValue * levelBonus);
        const total = price * qty;

        db.removeFromInventory(userId, smeltOre.smeltResult, qty);
        db.updateBalance(userId, total);
        db.db.prepare('UPDATE mining SET total_earned = total_earned + ? WHERE user_id = ?').run(total, userId);

        const embed = new EmbedBuilder()
          .setColor('#FFD700')
          .setTitle(`💰 ${qty}x ${smeltOre.smeltResult} verkauft!`)
          .setDescription(`💰 Erlös: **+${config.currencySymbol}${total.toLocaleString()}** (${config.currencySymbol}${price}/Stk.)`)
          .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      return interaction.reply('❌ Item nicht gefunden! Nutze `/bergwerk lager` um dein Lager zu sehen.');
    }

    if (action === 'spitzhacke') {
      const miner = getMiner(userId);
      const buyId = interaction.options.getString('kaufen');

      if (buyId) {
        const pick = pickaxes.find(p => p.id === buyId);
        const currentIdx = pickaxes.findIndex(p => p.id === miner.pickaxe_id);
        const newIdx = pickaxes.findIndex(p => p.id === buyId);
        if (newIdx <= currentIdx) return interaction.reply('❌ Du hast schon eine gleich gute oder bessere Spitzhacke!');
        if (db.getBalance(userId) < pick.price) return interaction.reply(`❌ Kostet **${config.currencySymbol}${pick.price.toLocaleString()}**!`);

        db.updateBalance(userId, -pick.price);
        db.db.prepare('UPDATE mining SET pickaxe_id = ? WHERE user_id = ?').run(pick.id, userId);

        const embed = new EmbedBuilder()
          .setColor('#2ecc71')
          .setTitle(`${pick.emoji} ${pick.name} gekauft!`)
          .setDescription(`⛏️ Power: **${pick.power}** | 🍀 Glück: **+${(pick.luck * 100).toFixed(0)}%**`)
          .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      const current = pickaxes.find(p => p.id === miner.pickaxe_id) || pickaxes[0];
      const list = pickaxes.map(p => {
        const owned = pickaxes.indexOf(p) <= pickaxes.indexOf(current);
        return `${p.emoji} **${p.name}** — ⛏️${p.power} 🍀+${(p.luck * 100).toFixed(0)}% ${owned ? '✅' : `| ${config.currencySymbol}${p.price.toLocaleString()}`}`;
      });

      const embed = new EmbedBuilder()
        .setColor('#e67e22')
        .setTitle('⛏️ Spitzhacken-Shop')
        .setDescription(`Aktuell: ${current.emoji} **${current.name}**\n\n${list.join('\n')}`)
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (action === 'profil') {
      const miner = getMiner(userId);
      const pick = pickaxes.find(p => p.id === miner.pickaxe_id) || pickaxes[0];
      const xpNeeded = getXpForLevel(miner.mine_level);
      const bar = '█'.repeat(Math.floor((miner.mine_xp / xpNeeded) * 10)) +
                  '░'.repeat(10 - Math.floor((miner.mine_xp / xpNeeded) * 10));

      const embed = new EmbedBuilder()
        .setColor('#8B4513')
        .setTitle(`⛏️ ${interaction.user.username}'s Bergbau-Profil`)
        .setDescription(
          `📊 Level: **${miner.mine_level}** \`${bar}\` ${miner.mine_xp}/${xpNeeded}\n` +
          `${pick.emoji} Spitzhacke: **${pick.name}**\n` +
          `🕳️ Tiefe: **${miner.depth_reached}**\n\n` +
          `⛏️ Erze abgebaut: **${miner.total_mined}**\n` +
          `💰 Gesamt verdient: **${config.currencySymbol}${miner.total_earned.toLocaleString()}**`
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }
  },
};
