const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const COOLDOWN = 2 * 60 * 1000;
const cooldowns = new Map();

function ensureFactoryTables() {
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS factories (
      user_id TEXT PRIMARY KEY,
      factory_name TEXT DEFAULT 'Neue Fabrik',
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      workers INTEGER DEFAULT 2,
      max_workers INTEGER DEFAULT 5,
      machines INTEGER DEFAULT 1,
      max_machines INTEGER DEFAULT 3,
      efficiency INTEGER DEFAULT 50,
      total_produced INTEGER DEFAULT 0,
      total_revenue INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS factory_storage (
      user_id TEXT,
      product TEXT,
      amount INTEGER DEFAULT 0,
      PRIMARY KEY (user_id, product)
    );
    CREATE TABLE IF NOT EXISTS factory_materials (
      user_id TEXT,
      material TEXT,
      amount INTEGER DEFAULT 0,
      PRIMARY KEY (user_id, material)
    );
  `);
}

const rawMaterials = [
  { name: 'Holz', emoji: '🪵', cost: 20 },
  { name: 'Eisen', emoji: '⚙️', cost: 40 },
  { name: 'Stoff', emoji: '🧵', cost: 30 },
  { name: 'Glas', emoji: '🪟', cost: 50 },
  { name: 'Plastik', emoji: '🧱', cost: 25 },
  { name: 'Elektronik', emoji: '💡', cost: 80 },
  { name: 'Leder', emoji: '🟤', cost: 60 },
  { name: 'Gold', emoji: '🥇', cost: 150 },
];

const products = [
  { name: 'Holzstuhl', emoji: '🪑', materials: { 'Holz': 3 }, value: 120, xp: 10, minLevel: 1 },
  { name: 'Stofftier', emoji: '🧸', materials: { 'Stoff': 2, 'Plastik': 1 }, value: 150, xp: 12, minLevel: 1 },
  { name: 'Eisenwerkzeug', emoji: '🔧', materials: { 'Eisen': 3, 'Holz': 1 }, value: 220, xp: 15, minLevel: 2 },
  { name: 'Glasvase', emoji: '🏺', materials: { 'Glas': 3 }, value: 250, xp: 15, minLevel: 2 },
  { name: 'Ledertasche', emoji: '👜', materials: { 'Leder': 3, 'Stoff': 1 }, value: 350, xp: 20, minLevel: 3 },
  { name: 'Smartphone', emoji: '📱', materials: { 'Elektronik': 3, 'Glas': 2, 'Plastik': 1 }, value: 600, xp: 30, minLevel: 4 },
  { name: 'Designermöbel', emoji: '🛋️', materials: { 'Holz': 4, 'Leder': 2, 'Glas': 1 }, value: 750, xp: 35, minLevel: 5 },
  { name: 'Roboter', emoji: '🤖', materials: { 'Elektronik': 5, 'Eisen': 3, 'Plastik': 2 }, value: 1200, xp: 50, minLevel: 6 },
  { name: 'Luxusuhr', emoji: '⌚', materials: { 'Gold': 2, 'Glas': 1, 'Elektronik': 1 }, value: 900, xp: 40, minLevel: 5 },
  { name: 'Goldschmuck', emoji: '💎', materials: { 'Gold': 4, 'Leder': 1 }, value: 1500, xp: 55, minLevel: 7 },
  { name: 'Supercomputer', emoji: '🖥️', materials: { 'Elektronik': 6, 'Gold': 2, 'Glas': 2 }, value: 2500, xp: 80, minLevel: 8 },
  { name: 'Raumanzug', emoji: '🧑‍🚀', materials: { 'Stoff': 4, 'Elektronik': 3, 'Gold': 1, 'Glas': 2 }, value: 3000, xp: 100, minLevel: 10 },
];

const factoryEvents = [
  { name: 'Stromausfall', emoji: '⚡', effect: 'efficiency', amount: -15, text: 'Stromausfall! Effizienz gesunken.' },
  { name: 'Inspektionsbonus', emoji: '✅', effect: 'efficiency', amount: 10, text: 'Inspektion bestanden! Effizienz gestiegen.' },
  { name: 'Arbeiterstreik', emoji: '✊', effect: 'workers_temp', amount: -1, text: 'Arbeiter streiken! Weniger Produktion.' },
  { name: 'Innovationsschub', emoji: '💡', effect: 'bonus_product', amount: 1, text: 'Innovationsschub! Bonusprodukt hergestellt!' },
  { name: 'Materialdiesbstahl', emoji: '🦹', effect: 'material_loss', amount: 0, text: 'Diebe haben Material gestohlen!' },
  { name: 'Großauftrag', emoji: '📦', effect: 'bonus_money', amount: 500, text: 'Großauftrag reinbekommen!' },
];

function getFactory(userId) {
  ensureFactoryTables();
  let fac = db.db.prepare('SELECT * FROM factories WHERE user_id = ?').get(userId);
  if (!fac) {
    db.db.prepare('INSERT INTO factories (user_id) VALUES (?)').run(userId);
    fac = db.db.prepare('SELECT * FROM factories WHERE user_id = ?').get(userId);
  }
  return fac;
}

function getMaterials(userId) {
  return db.db.prepare('SELECT * FROM factory_materials WHERE user_id = ? AND amount > 0').all(userId);
}

function getStorage(userId) {
  return db.db.prepare('SELECT * FROM factory_storage WHERE user_id = ? AND amount > 0').all(userId);
}

function addMaterial(userId, material, amount) {
  db.db.prepare(`INSERT INTO factory_materials (user_id, material, amount) VALUES (?, ?, ?)
    ON CONFLICT(user_id, material) DO UPDATE SET amount = amount + ?`).run(userId, material, amount, amount);
}

function addProduct(userId, product, amount) {
  db.db.prepare(`INSERT INTO factory_storage (user_id, product, amount) VALUES (?, ?, ?)
    ON CONFLICT(user_id, product) DO UPDATE SET amount = amount + ?`).run(userId, product, amount, amount);
}

function hasMaterials(userId, required) {
  for (const [mat, amt] of Object.entries(required)) {
    const row = db.db.prepare('SELECT amount FROM factory_materials WHERE user_id = ? AND material = ?').get(userId, mat);
    if (!row || row.amount < amt) return false;
  }
  return true;
}

function consumeMaterials(userId, required) {
  for (const [mat, amt] of Object.entries(required)) {
    db.db.prepare('UPDATE factory_materials SET amount = amount - ? WHERE user_id = ? AND material = ?').run(amt, userId, mat);
  }
}

function addFactoryXP(userId, xp) {
  const fac = getFactory(userId);
  const newXP = fac.xp + xp;
  const needed = fac.level * 180;
  if (newXP >= needed) {
    db.db.prepare('UPDATE factories SET xp = ?, level = level + 1, max_workers = max_workers + 1, max_machines = max_machines + 1 WHERE user_id = ?')
      .run(newXP - needed, userId);
    return true;
  }
  db.db.prepare('UPDATE factories SET xp = ? WHERE user_id = ?').run(newXP, userId);
  return false;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fabrik')
    .setDescription('Baue und verwalte deine eigene Fabrik!')
    .addSubcommand(sub => sub.setName('status').setDescription('Zeige deinen Fabrik-Status'))
    .addSubcommand(sub => sub.setName('einkaufen').setDescription('Kaufe Rohstoffe ein')
      .addIntegerOption(opt => opt.setName('material').setDescription('Material-Nr (1-8)').setRequired(true).setMinValue(1).setMaxValue(8))
      .addIntegerOption(opt => opt.setName('menge').setDescription('Menge').setRequired(true).setMinValue(1).setMaxValue(50)))
    .addSubcommand(sub => sub.setName('produzieren').setDescription('Stelle ein Produkt her')
      .addIntegerOption(opt => opt.setName('produkt').setDescription('Produkt-Nr (1-12)').setRequired(true).setMinValue(1).setMaxValue(12))
      .addIntegerOption(opt => opt.setName('menge').setDescription('Menge').setRequired(false).setMinValue(1).setMaxValue(10)))
    .addSubcommand(sub => sub.setName('verkaufen').setDescription('Verkaufe hergestellte Produkte')
      .addStringOption(opt => opt.setName('produkt').setDescription('Produktname oder "alle"').setRequired(true)))
    .addSubcommand(sub => sub.setName('lager').setDescription('Zeige Materialien und Produkte'))
    .addSubcommand(sub => sub.setName('upgrade').setDescription('Upgrade deine Fabrik'))
    .addSubcommand(sub => sub.setName('rezepte').setDescription('Zeige alle Produktrezepte')),

  async execute(interaction) {
    const userId = interaction.user.id;
    const config = require('../config.json');
    const sub = interaction.options.getSubcommand();
    ensureFactoryTables();

    if (sub === 'status') {
      const fac = getFactory(userId);
      const xpNeeded = fac.level * 180;

      const embed = new EmbedBuilder()
        .setColor('#e67e22')
        .setTitle(`🏭 ${fac.factory_name}`)
        .setDescription(
          `**Besitzer:** ${interaction.user.username}\n` +
          `**Level:** ${fac.level} (${fac.xp}/${xpNeeded} XP)\n\n` +
          `👷 Arbeiter: **${fac.workers}/${fac.max_workers}**\n` +
          `⚙️ Maschinen: **${fac.machines}/${fac.max_machines}**\n` +
          `📊 Effizienz: **${fac.efficiency}%**\n\n` +
          `📦 Produziert: **${fac.total_produced.toLocaleString()}** Stück\n` +
          `💰 Umsatz: **${config.currencySymbol}${fac.total_revenue.toLocaleString()}**`
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'lager') {
      const materials = getMaterials(userId);
      const storage = getStorage(userId);

      let desc = '**📦 Rohstoffe:**\n';
      if (materials.length === 0) {
        desc += '_Leer_\n';
      } else {
        for (const m of materials) {
          const mat = rawMaterials.find(r => r.name === m.material);
          desc += `${mat ? mat.emoji : '📦'} ${m.material}: **${m.amount}**\n`;
        }
      }

      desc += '\n**🏭 Produkte:**\n';
      if (storage.length === 0) {
        desc += '_Leer_\n';
      } else {
        let totalValue = 0;
        for (const s of storage) {
          const prod = products.find(p => p.name === s.product);
          const value = (prod ? prod.value : 0) * s.amount;
          totalValue += value;
          desc += `${prod ? prod.emoji : '📦'} ${s.product}: **${s.amount}** (${config.currencySymbol}${value.toLocaleString()})\n`;
        }
        desc += `\n💰 Lagerwert: **${config.currencySymbol}${totalValue.toLocaleString()}**`;
      }

      const embed = new EmbedBuilder().setColor('#3498db').setTitle('📦 Lager').setDescription(desc).setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'einkaufen') {
      const matIdx = interaction.options.getInteger('material') - 1;
      const amount = interaction.options.getInteger('menge');
      const mat = rawMaterials[matIdx];
      if (!mat) return interaction.reply('❌ Ungültiges Material!');

      const cost = mat.cost * amount;
      if (db.getBalance(userId) < cost) {
        return interaction.reply(`❌ Du brauchst **${config.currencySymbol}${cost.toLocaleString()}**!`);
      }

      db.updateBalance(userId, -cost);
      addMaterial(userId, mat.name, amount);

      return interaction.reply(`${mat.emoji} **${amount}x ${mat.name}** gekauft für **${config.currencySymbol}${cost.toLocaleString()}**!`);
    }

    if (sub === 'rezepte') {
      const fac = getFactory(userId);
      const lines = products.map((p, i) => {
        const mats = Object.entries(p.materials).map(([m, a]) => {
          const mat = rawMaterials.find(r => r.name === m);
          return `${mat ? mat.emoji : ''} ${a}x ${m}`;
        }).join(', ');
        const locked = p.minLevel > fac.level;
        return `**${i + 1}.** ${p.emoji} **${p.name}** → ${config.currencySymbol}${p.value}${locked ? ' 🔒' : ''}\n   ${mats}`;
      });

      const embed = new EmbedBuilder()
        .setColor('#9b59b6')
        .setTitle('📋 Produktrezepte')
        .setDescription(lines.join('\n') + '\n\n🔒 = Level zu niedrig')
        .setFooter({ text: `Fabrik Level: ${fac.level}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'produzieren') {
      const lastPlay = cooldowns.get(userId);
      if (lastPlay && Date.now() - lastPlay < COOLDOWN) {
        const remaining = Math.ceil((COOLDOWN - (Date.now() - lastPlay)) / 1000);
        return interaction.reply(`⏳ Nächste Produktion in **${remaining}s**!`);
      }

      const prodIdx = interaction.options.getInteger('produkt') - 1;
      const amount = interaction.options.getInteger('menge') || 1;
      const product = products[prodIdx];
      if (!product) return interaction.reply('❌ Ungültiges Produkt!');

      const fac = getFactory(userId);
      if (product.minLevel > fac.level) {
        return interaction.reply(`🔒 Du brauchst **Fabrik Level ${product.minLevel}** für ${product.emoji} ${product.name}!`);
      }

      const scaledMats = {};
      for (const [m, a] of Object.entries(product.materials)) {
        scaledMats[m] = a * amount;
      }

      if (!hasMaterials(userId, scaledMats)) {
        const needed = Object.entries(scaledMats).map(([m, a]) => `${a}x ${m}`).join(', ');
        return interaction.reply(`❌ Nicht genug Material! Benötigt: ${needed}`);
      }

      const maxProduction = Math.min(amount, fac.machines * 2);
      const scaledMatsActual = {};
      for (const [m, a] of Object.entries(product.materials)) {
        scaledMatsActual[m] = a * maxProduction;
      }

      cooldowns.set(userId, Date.now());
      consumeMaterials(userId, scaledMatsActual);

      const efficiencyBonus = Math.random() * 100 < fac.efficiency ? 1 : 0;
      const totalProduced = maxProduction + efficiencyBonus;

      addProduct(userId, product.name, totalProduced);
      db.db.prepare('UPDATE factories SET total_produced = total_produced + ? WHERE user_id = ?').run(totalProduced, userId);

      const event = Math.random() < 0.3 ? factoryEvents[Math.floor(Math.random() * factoryEvents.length)] : null;
      let eventText = '';

      if (event) {
        switch (event.effect) {
          case 'efficiency': {
            const newEff = Math.max(10, Math.min(100, fac.efficiency + event.amount));
            db.db.prepare('UPDATE factories SET efficiency = ? WHERE user_id = ?').run(newEff, userId);
            eventText = `\n\n${event.emoji} **${event.name}:** ${event.text} (${event.amount > 0 ? '+' : ''}${event.amount}%)`;
            break;
          }
          case 'bonus_product':
            addProduct(userId, product.name, 1);
            db.db.prepare('UPDATE factories SET total_produced = total_produced + 1 WHERE user_id = ?').run(userId);
            eventText = `\n\n${event.emoji} **${event.name}:** ${event.text}`;
            break;
          case 'bonus_money':
            db.updateBalance(userId, event.amount);
            eventText = `\n\n${event.emoji} **${event.name}:** ${event.text} +${config.currencySymbol}${event.amount}`;
            break;
          case 'material_loss': {
            const mats = getMaterials(userId);
            if (mats.length > 0) {
              const stolen = mats[Math.floor(Math.random() * mats.length)];
              const loss = Math.min(stolen.amount, Math.floor(Math.random() * 3) + 1);
              db.db.prepare('UPDATE factory_materials SET amount = amount - ? WHERE user_id = ? AND material = ?').run(loss, userId, stolen.material);
              eventText = `\n\n${event.emoji} **${event.name}:** ${loss}x ${stolen.material} gestohlen!`;
            }
            break;
          }
        }
      }

      const leveled = addFactoryXP(userId, product.xp * maxProduction);
      const updated = getFactory(userId);

      const embed = new EmbedBuilder()
        .setColor('#27ae60')
        .setTitle(`${product.emoji} Produktion abgeschlossen!`)
        .setDescription(
          `**${totalProduced}x ${product.name}** hergestellt!\n` +
          (efficiencyBonus > 0 ? `🎯 Effizienzbonus: **+${efficiencyBonus}** extra!\n` : '') +
          `⭐ +${product.xp * maxProduction} XP` +
          (leveled ? ` 🎉 **LEVEL UP → ${updated.level}!**` : '') +
          eventText
        )
        .setFooter({ text: `Fabrik Level ${updated.level} | ${updated.xp}/${updated.level * 180} XP` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'verkaufen') {
      const prodName = interaction.options.getString('produkt');

      if (prodName.toLowerCase() === 'alle') {
        const storage = getStorage(userId);
        if (storage.length === 0) return interaction.reply('📦 Nichts zu verkaufen!');

        let total = 0;
        const sold = [];
        for (const s of storage) {
          const prod = products.find(p => p.name === s.product);
          const value = (prod ? prod.value : 50) * s.amount;
          total += value;
          sold.push(`${prod ? prod.emoji : '📦'} ${s.amount}x ${s.product} → ${config.currencySymbol}${value.toLocaleString()}`);
          db.db.prepare('UPDATE factory_storage SET amount = 0 WHERE user_id = ? AND product = ?').run(userId, s.product);
        }

        db.updateBalance(userId, total);
        db.db.prepare('UPDATE factories SET total_revenue = total_revenue + ? WHERE user_id = ?').run(total, userId);

        const embed = new EmbedBuilder()
          .setColor('#27ae60')
          .setTitle('💰 Alles verkauft!')
          .setDescription(sold.join('\n') + `\n\n**Gesamt: ${config.currencySymbol}${total.toLocaleString()}**`)
          .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      const storage = getStorage(userId);
      const found = storage.find(s => s.product.toLowerCase() === prodName.toLowerCase());
      if (!found) return interaction.reply('❌ Dieses Produkt hast du nicht!');

      const prod = products.find(p => p.name === found.product);
      const value = (prod ? prod.value : 50) * found.amount;
      db.db.prepare('UPDATE factory_storage SET amount = 0 WHERE user_id = ? AND product = ?').run(userId, found.product);
      db.updateBalance(userId, value);
      db.db.prepare('UPDATE factories SET total_revenue = total_revenue + ? WHERE user_id = ?').run(value, userId);

      return interaction.reply(`💰 **${found.amount}x ${found.product}** verkauft für **${config.currencySymbol}${value.toLocaleString()}**!`);
    }

    if (sub === 'upgrade') {
      const fac = getFactory(userId);

      const upgrades = [
        { name: '👷 Arbeiter einstellen', cost: 1000 + fac.workers * 800, field: 'workers', max: fac.max_workers, current: fac.workers },
        { name: '⚙️ Maschine kaufen', cost: 2000 + fac.machines * 1500, field: 'machines', max: fac.max_machines, current: fac.machines },
        { name: '📊 Effizienz verbessern', cost: 500 + fac.efficiency * 30, field: 'efficiency', max: 100, current: fac.efficiency },
      ];

      const lines = upgrades.map((u, i) => {
        if (u.current >= u.max) return `**${i + 1}.** ${u.name} — **MAX**`;
        return `**${i + 1}.** ${u.name} — **${config.currencySymbol}${u.cost.toLocaleString()}** (${u.current}/${u.max})`;
      });

      const embed = new EmbedBuilder()
        .setColor('#f39c12')
        .setTitle('🔧 Fabrik-Upgrades')
        .setDescription(lines.join('\n'))
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();

      const buttons = upgrades.filter(u => u.current < u.max).map((u, i) =>
        new ButtonBuilder().setCustomId(`fac_up_${u.field}_${userId}`).setLabel(u.name).setStyle(ButtonStyle.Primary)
          .setDisabled(db.getBalance(userId) < u.cost)
      );

      const rows = buttons.length > 0 ? [new ActionRowBuilder().addComponents(buttons)] : [];
      const msg = await interaction.reply({ embeds: [embed], components: rows, fetchReply: true });

      if (buttons.length === 0) return;

      const coll = msg.createMessageComponentCollector({ time: 30000 });
      coll.on('collect', (btn) => {
        if (btn.user.id !== userId) return btn.reply({ content: '❌ Nicht deine Fabrik!', flags: 64 });
        coll.stop();

        const field = btn.customId.split('_')[2];
        const upgrade = upgrades.find(u => u.field === field);
        if (!upgrade || upgrade.current >= upgrade.max) return btn.update({ content: '❌ Bereits auf Maximum!', embeds: [], components: [] });
        if (db.getBalance(userId) < upgrade.cost) return btn.update({ content: '❌ Nicht genug Geld!', embeds: [], components: [] });

        db.updateBalance(userId, -upgrade.cost);
        const increment = field === 'efficiency' ? 5 : 1;
        db.db.prepare(`UPDATE factories SET ${field} = MIN(${field} + ${increment}, ${upgrade.max}) WHERE user_id = ?`).run(userId);

        btn.update({ content: `✅ **${upgrade.name}** erfolgreich! (${config.currencySymbol}${upgrade.cost.toLocaleString()})`, embeds: [], components: [] });
      });
    }
  },
};
