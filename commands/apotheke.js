const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

const cooldowns = new Map();

function ensureApothekeTables() {
    db.db.exec(`
        CREATE TABLE IF NOT EXISTS apotheken (
            user_id TEXT PRIMARY KEY,
            shop_name TEXT DEFAULT 'Kleine Apotheke',
            rank INTEGER DEFAULT 0,
            reputation INTEGER DEFAULT 0,
            labor_level INTEGER DEFAULT 1,
            lager_level INTEGER DEFAULT 1,
            kessel_level INTEGER DEFAULT 1,
            laden_level INTEGER DEFAULT 1,
            total_brewed INTEGER DEFAULT 0,
            total_sold INTEGER DEFAULT 0,
            total_earned INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    db.db.exec(`
        CREATE TABLE IF NOT EXISTS apotheke_ingredients (
            user_id TEXT,
            ingredient_id TEXT,
            amount INTEGER DEFAULT 0,
            PRIMARY KEY (user_id, ingredient_id)
        )
    `);
    db.db.exec(`
        CREATE TABLE IF NOT EXISTS apotheke_potions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            potion_id TEXT,
            quality INTEGER DEFAULT 50,
            amount INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

const RANKS = [
    { name: 'Kräutersammler', rep: 0 },
    { name: 'Lehrling', rep: 100 },
    { name: 'Apotheker', rep: 300 },
    { name: 'Meisterapotheker', rep: 700 },
    { name: 'Alchemist', rep: 1500 },
    { name: 'Großmeister', rep: 3500 },
    { name: 'Legendärer Heiler', rep: 8000 }
];

const INGREDIENTS = {
    krauter: { name: '🌿 Heilkräuter', gatherChance: 0.9, price: 5 },
    pilze: { name: '🍄 Mondpilze', gatherChance: 0.7, price: 8 },
    beeren: { name: '🫐 Zauberbeeren', gatherChance: 0.8, price: 6 },
    wurzeln: { name: '🪴 Tiefwurzeln', gatherChance: 0.6, price: 10 },
    blueten: { name: '🌸 Sternblüten', gatherChance: 0.5, price: 15 },
    kristalle: { name: '💎 Ätherkristalle', gatherChance: 0.3, price: 25 },
    essenz: { name: '✨ Mondessenz', gatherChance: 0.2, price: 40 },
    phoenix: { name: '🔥 Phönixasche', gatherChance: 0.1, price: 80 }
};

const POTIONS = {
    heiltrank: { name: '❤️ Heiltrank', ingredients: { krauter: 3, beeren: 2 }, difficulty: 5, basePrice: 30, effect: 'Heilt leichte Wunden', minRank: 0 },
    energietrank: { name: '⚡ Energietrank', ingredients: { krauter: 2, pilze: 2, beeren: 1 }, difficulty: 10, basePrice: 50, effect: 'Gibt neue Energie', minRank: 0 },
    gegengift: { name: '🟢 Gegengift', ingredients: { krauter: 3, wurzeln: 2, pilze: 1 }, difficulty: 15, basePrice: 70, effect: 'Neutralisiert jedes Gift', minRank: 1 },
    staerketrank: { name: '💪 Stärketrank', ingredients: { wurzeln: 3, pilze: 2, beeren: 2 }, difficulty: 20, basePrice: 100, effect: 'Erhöht Stärke temporär', minRank: 1 },
    schutztrank: { name: '🛡️ Schutztrank', ingredients: { kristalle: 1, wurzeln: 3, krauter: 2 }, difficulty: 25, basePrice: 140, effect: 'Magischer Schutzschild', minRank: 2 },
    unsichtbar: { name: '👻 Unsichtbarkeitstrank', ingredients: { kristalle: 2, blueten: 2, essenz: 1 }, difficulty: 35, basePrice: 220, effect: 'Macht unsichtbar', minRank: 3 },
    weisheit: { name: '🧠 Weisheitstrank', ingredients: { blueten: 3, essenz: 2, pilze: 2 }, difficulty: 40, basePrice: 300, effect: 'Erhöht Intelligenz', minRank: 3 },
    flugtrank: { name: '🦅 Flugtrank', ingredients: { essenz: 2, kristalle: 2, blueten: 2 }, difficulty: 50, basePrice: 400, effect: 'Verleiht temporäres Fliegen', minRank: 4 },
    verjuengung: { name: '🌟 Verjüngungstrank', ingredients: { essenz: 3, phoenix: 1, blueten: 3 }, difficulty: 60, basePrice: 600, effect: 'Macht 10 Jahre jünger', minRank: 5 },
    unsterblich: { name: '♾️ Lebenselixier', ingredients: { phoenix: 3, essenz: 3, kristalle: 3 }, difficulty: 80, basePrice: 1500, effect: 'Ewiges Leben... vorübergehend', minRank: 6 }
};

const GATHER_EVENTS = [
    { text: '🌈 Ein Regenbogen führt dich zu seltenen Kräutern!', bonusChance: 0.3, bonusAmount: 2 },
    { text: '🦋 Ein magischer Schmetterling zeigt dir den Weg!', bonusChance: 0.2, bonusAmount: 1 },
    { text: '🌙 Mondlicht lässt die Pflanzen leuchten!', bonusChance: 0.15, bonusAmount: 3 },
    { text: '🍃 Ein ruhiger Tag zum Sammeln.', bonusChance: 0.0, bonusAmount: 0 },
    { text: '🐝 Bienen vertreiben dich kurzzeitig!', bonusChance: -0.1, bonusAmount: 0 },
    { text: '🌧️ Regen macht die Suche schwieriger.', bonusChance: -0.15, bonusAmount: 0 }
];

const BREW_EVENTS = [
    { text: '✨ Perfekte Mischung! Der Trank leuchtet golden!', qualityMod: 25 },
    { text: '🌟 Exzellente Reaktion im Kessel!', qualityMod: 15 },
    { text: '👍 Solide Brauarbeit.', qualityMod: 5 },
    { text: '😐 Durchschnittliches Ergebnis.', qualityMod: 0 },
    { text: '💨 Etwas Dampf entweicht... Qualitätsverlust.', qualityMod: -10 },
    { text: '💥 Der Kessel brodelt über!', qualityMod: -20 }
];

const CUSTOMERS = [
    { name: '🤒 Kranker Bauer', preference: ['heiltrank', 'gegengift'], tipFactor: 0.8 },
    { name: '⚔️ Abenteurer', preference: ['staerketrank', 'schutztrank', 'heiltrank'], tipFactor: 1.2 },
    { name: '🧙 Zauberer', preference: ['weisheit', 'unsichtbar', 'flugtrank'], tipFactor: 1.5 },
    { name: '👸 Adelige', preference: ['verjuengung', 'unsichtbar', 'weisheit'], tipFactor: 2.0 },
    { name: '🏃 Kurier', preference: ['energietrank', 'flugtrank', 'staerketrank'], tipFactor: 1.0 },
    { name: '🧛 Vampir', preference: ['gegengift', 'schutztrank', 'unsterblich'], tipFactor: 1.8 },
    { name: '👨‍🌾 Bauer', preference: ['heiltrank', 'energietrank'], tipFactor: 0.6 },
    { name: '👑 König', preference: ['unsterblich', 'verjuengung', 'weisheit'], tipFactor: 3.0 }
];

function getRank(rep) {
    for (let i = RANKS.length - 1; i >= 0; i--) {
        if (rep >= RANKS[i].rep) return i;
    }
    return 0;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('apotheke')
        .setDescription('🧪 Braue magische Tränke und führe eine Apotheke!')
        .addSubcommand(s => s.setName('status').setDescription('Zeige deinen Apotheken-Status'))
        .addSubcommand(s => s.setName('umbenennen').setDescription('Benenne deine Apotheke um')
            .addStringOption(o => o.setName('name').setDescription('Neuer Name').setRequired(true)))
        .addSubcommand(s => s.setName('sammeln').setDescription('Sammle Zutaten in der Wildnis'))
        .addSubcommand(s => s.setName('zutaten').setDescription('Zeige deine Zutaten'))
        .addSubcommand(s => s.setName('einkaufen').setDescription('Kaufe Zutaten beim Händler')
            .addStringOption(o => o.setName('zutat').setDescription('Welche Zutat').setRequired(true)
                .addChoices(...Object.entries(INGREDIENTS).map(([k, v]) => ({ name: v.name, value: k }))))
            .addIntegerOption(o => o.setName('menge').setDescription('Menge (1-20)').setRequired(true)))
        .addSubcommand(s => s.setName('brauen').setDescription('Braue einen Trank')
            .addStringOption(o => o.setName('trank').setDescription('Welcher Trank').setRequired(true)
                .addChoices(...Object.entries(POTIONS).slice(0, 10).map(([k, v]) => ({ name: v.name, value: k })))))
        .addSubcommand(s => s.setName('lager').setDescription('Zeige dein Tranklager'))
        .addSubcommand(s => s.setName('verkaufen').setDescription('Verkaufe Tränke am Markt')
            .addIntegerOption(o => o.setName('id').setDescription('Trank-ID').setRequired(true))
            .addIntegerOption(o => o.setName('menge').setDescription('Menge').setRequired(true)))
        .addSubcommand(s => s.setName('laden').setDescription('Öffne deinen Laden für Kunden'))
        .addSubcommand(s => s.setName('upgrade').setDescription('Verbessere deine Apotheke')
            .addStringOption(o => o.setName('was').setDescription('Was upgraden').setRequired(true)
                .addChoices(
                    { name: '🔬 Labor', value: 'labor' },
                    { name: '📦 Lager', value: 'lager' },
                    { name: '🫕 Kessel', value: 'kessel' },
                    { name: '🏪 Laden', value: 'laden' }
                )))
        .addSubcommand(s => s.setName('rezepte').setDescription('Zeige alle Trankrezepte')),

    async execute(interaction) {
        ensureApothekeTables();
        const config = require('../config.json');
        const sub = interaction.options.getSubcommand();
        const userId = interaction.user.id;

        let shop = db.db.prepare('SELECT * FROM apotheken WHERE user_id = ?').get(userId);

        if (!shop && sub !== 'status') {
            return interaction.reply({ content: '❌ Benutze `/apotheke status` um deine Apotheke zu eröffnen!', ephemeral: true });
        }

        if (sub === 'status') {
            if (!shop) {
                db.db.prepare('INSERT INTO apotheken (user_id) VALUES (?)').run(userId);
                shop = db.db.prepare('SELECT * FROM apotheken WHERE user_id = ?').get(userId);
                const embed = new EmbedBuilder()
                    .setColor('#9B59B6')
                    .setTitle('🧪 Apotheke eröffnet!')
                    .setDescription('Deine **Kleine Apotheke** ist bereit!\n\nSammle Zutaten mit `/apotheke sammeln`\nund braue deinen ersten Trank mit `/apotheke brauen`!');
                return interaction.reply({ embeds: [embed] });
            }

            const rank = getRank(shop.reputation);
            const nextRank = rank < RANKS.length - 1 ? RANKS[rank + 1] : null;
            const potionCount = db.db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM apotheke_potions WHERE user_id = ?').get(userId).total;
            const ingredientCount = db.db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM apotheke_ingredients WHERE user_id = ?').get(userId).total;

            const embed = new EmbedBuilder()
                .setColor('#9B59B6')
                .setTitle(`🧪 ${shop.shop_name}`)
                .setDescription(`**${RANKS[rank].name}** (Rang ${rank})\n${nextRank ? `Nächster: ${nextRank.name} (${shop.reputation}/${nextRank.rep} Rep)` : '👑 MAXIMALER RANG!'}`)
                .addFields(
                    { name: '⭐ Reputation', value: `${shop.reputation}`, inline: true },
                    { name: '🧪 Tränke', value: `${potionCount}`, inline: true },
                    { name: '🌿 Zutaten', value: `${ingredientCount}`, inline: true },
                    { name: '🔬 Labor', value: `Lv.${shop.labor_level}`, inline: true },
                    { name: '📦 Lager', value: `Lv.${shop.lager_level}`, inline: true },
                    { name: '🫕 Kessel', value: `Lv.${shop.kessel_level}`, inline: true },
                    { name: '🏪 Laden', value: `Lv.${shop.laden_level}`, inline: true },
                    { name: '📊 Stats', value: `Gebraut: ${shop.total_brewed}\nVerkauft: ${shop.total_sold}\nVerdient: ${shop.total_earned}`, inline: true }
                );
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'umbenennen') {
            const name = interaction.options.getString('name');
            if (name.length > 30) return interaction.reply({ content: '❌ Max. 30 Zeichen!', ephemeral: true });
            db.db.prepare('UPDATE apotheken SET shop_name = ? WHERE user_id = ?').run(name, userId);
            return interaction.reply({ embeds: [new EmbedBuilder().setColor('#9B59B6').setTitle('🧪 Umbenannt!').setDescription(`Deine Apotheke heißt jetzt **${name}**!`)] });
        }

        if (sub === 'sammeln') {
            const cdKey = `apo_gather_${userId}`;
            if (cooldowns.has(cdKey) && cooldowns.get(cdKey) > Date.now()) {
                const left = Math.ceil((cooldowns.get(cdKey) - Date.now()) / 1000);
                return interaction.reply({ content: `⏳ Warte ${left}s.`, ephemeral: true });
            }

            const event = GATHER_EVENTS[Math.floor(Math.random() * GATHER_EVENTS.length)];
            const found = [];

            for (const [id, ing] of Object.entries(INGREDIENTS)) {
                const chance = Math.min(0.95, ing.gatherChance + event.bonusChance + shop.labor_level * 0.03);
                if (Math.random() < chance) {
                    const amount = 1 + Math.floor(Math.random() * 2) + (event.bonusAmount > 0 && Math.random() < 0.3 ? event.bonusAmount : 0);
                    const existing = db.db.prepare('SELECT * FROM apotheke_ingredients WHERE user_id = ? AND ingredient_id = ?').get(userId, id);
                    if (existing) {
                        db.db.prepare('UPDATE apotheke_ingredients SET amount = amount + ? WHERE user_id = ? AND ingredient_id = ?').run(amount, userId, id);
                    } else {
                        db.db.prepare('INSERT INTO apotheke_ingredients (user_id, ingredient_id, amount) VALUES (?, ?, ?)').run(userId, id, amount);
                    }
                    found.push(`${ing.name} x${amount}`);
                }
            }

            const embed = new EmbedBuilder()
                .setColor('#9B59B6')
                .setTitle('🌿 Zutaten gesammelt!')
                .setDescription(`${event.text}\n\n${found.length > 0 ? found.join('\n') : '❌ Nichts gefunden...'}`);

            db.db.prepare('UPDATE apotheken SET reputation = reputation + 2 WHERE user_id = ?').run(userId);
            cooldowns.set(cdKey, Date.now() + 40000);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'zutaten') {
            const ingredients = db.db.prepare('SELECT * FROM apotheke_ingredients WHERE user_id = ? AND amount > 0').all(userId);
            if (ingredients.length === 0) return interaction.reply({ content: '❌ Keine Zutaten! Sammle welche mit `/apotheke sammeln`.', ephemeral: true });

            const list = ingredients.map(i => {
                const info = INGREDIENTS[i.ingredient_id];
                return `${info?.name || i.ingredient_id}: **${i.amount}**`;
            }).join('\n');

            return interaction.reply({ embeds: [new EmbedBuilder().setColor('#9B59B6').setTitle('🌿 Deine Zutaten').setDescription(list)] });
        }

        if (sub === 'einkaufen') {
            const zutatId = interaction.options.getString('zutat');
            const menge = interaction.options.getInteger('menge');
            if (menge < 1 || menge > 20) return interaction.reply({ content: '❌ Menge: 1-20!', ephemeral: true });

            const ing = INGREDIENTS[zutatId];
            const cost = ing.price * menge;

            let balance = db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId);
            if (!balance || balance.balance < cost) return interaction.reply({ content: `❌ Kostet ${cost} Coins.`, ephemeral: true });

            db.db.prepare('UPDATE economy SET balance = balance - ? WHERE user_id = ?').run(cost, userId);
            const existing = db.db.prepare('SELECT * FROM apotheke_ingredients WHERE user_id = ? AND ingredient_id = ?').get(userId, zutatId);
            if (existing) {
                db.db.prepare('UPDATE apotheke_ingredients SET amount = amount + ? WHERE user_id = ? AND ingredient_id = ?').run(menge, userId, zutatId);
            } else {
                db.db.prepare('INSERT INTO apotheke_ingredients (user_id, ingredient_id, amount) VALUES (?, ?, ?)').run(userId, zutatId, menge);
            }

            return interaction.reply({ embeds: [new EmbedBuilder().setColor('#9B59B6').setTitle('🛒 Eingekauft!').setDescription(`${ing.name} x${menge}\n💰 -${cost} Coins`)] });
        }

        if (sub === 'brauen') {
            const cdKey = `apo_brew_${userId}`;
            if (cooldowns.has(cdKey) && cooldowns.get(cdKey) > Date.now()) {
                const left = Math.ceil((cooldowns.get(cdKey) - Date.now()) / 1000);
                return interaction.reply({ content: `⏳ Brauvorgang... Warte ${left}s.`, ephemeral: true });
            }

            const potionId = interaction.options.getString('trank');
            const potion = POTIONS[potionId];
            const rank = getRank(shop.reputation);
            if (rank < potion.minRank) return interaction.reply({ content: `❌ Braucht Rang ${potion.minRank} (${RANKS[potion.minRank].name}).`, ephemeral: true });

            for (const [ingId, needed] of Object.entries(potion.ingredients)) {
                const have = db.db.prepare('SELECT amount FROM apotheke_ingredients WHERE user_id = ? AND ingredient_id = ?').get(userId, ingId);
                if (!have || have.amount < needed) {
                    const ing = INGREDIENTS[ingId];
                    return interaction.reply({ content: `❌ Nicht genug ${ing.name}! Brauchst ${needed}, hast ${have?.amount || 0}.`, ephemeral: true });
                }
            }

            for (const [ingId, needed] of Object.entries(potion.ingredients)) {
                db.db.prepare('UPDATE apotheke_ingredients SET amount = amount - ? WHERE user_id = ? AND ingredient_id = ?').run(needed, userId, ingId);
            }

            const event = BREW_EVENTS[Math.floor(Math.random() * BREW_EVENTS.length)];
            const baseQuality = 30 + Math.floor(Math.random() * 30);
            const laborBonus = shop.labor_level * 4;
            const kesselBonus = shop.kessel_level * 3;
            const quality = Math.min(100, Math.max(10, baseQuality + laborBonus + kesselBonus + event.qualityMod));
            const amount = 1 + Math.floor(shop.kessel_level / 4);

            const existing = db.db.prepare('SELECT * FROM apotheke_potions WHERE user_id = ? AND potion_id = ? AND quality = ?').get(userId, potionId, quality);
            if (existing) {
                db.db.prepare('UPDATE apotheke_potions SET amount = amount + ? WHERE id = ?').run(amount, existing.id);
            } else {
                db.db.prepare('INSERT INTO apotheke_potions (user_id, potion_id, quality, amount) VALUES (?, ?, ?, ?)').run(userId, potionId, quality, amount);
            }

            db.db.prepare('UPDATE apotheken SET total_brewed = total_brewed + ?, reputation = reputation + ? WHERE user_id = ?').run(amount, 3, userId);

            const stars = '★'.repeat(Math.floor(quality / 20)) + '☆'.repeat(5 - Math.floor(quality / 20));
            const embed = new EmbedBuilder()
                .setColor('#9B59B6')
                .setTitle(`🧪 ${potion.name} gebraut!`)
                .setDescription(`${event.text}\n\n${stars} Qualität: **${quality}/100**\n📦 Menge: **${amount}**\n💫 *${potion.effect}*\n\n*Labor +${laborBonus} | Kessel +${kesselBonus}*`);

            cooldowns.set(cdKey, Date.now() + 60000);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'lager') {
            const potions = db.db.prepare('SELECT * FROM apotheke_potions WHERE user_id = ? AND amount > 0 ORDER BY quality DESC').all(userId);
            if (potions.length === 0) return interaction.reply({ content: '❌ Kein Trank im Lager!', ephemeral: true });

            const list = potions.map(p => {
                const info = POTIONS[p.potion_id];
                const stars = '★'.repeat(Math.floor(p.quality / 20)) + '☆'.repeat(5 - Math.floor(p.quality / 20));
                return `**#${p.id} ${info?.name || p.potion_id}** x${p.amount}\n${stars} (${p.quality}/100) | 💫 ${info?.effect || ''}`;
            }).join('\n\n');

            return interaction.reply({ embeds: [new EmbedBuilder().setColor('#9B59B6').setTitle('📦 Tranklager').setDescription(list)] });
        }

        if (sub === 'verkaufen') {
            const potionDbId = interaction.options.getInteger('id');
            const menge = interaction.options.getInteger('menge');
            const potion = db.db.prepare('SELECT * FROM apotheke_potions WHERE id = ? AND user_id = ?').get(potionDbId, userId);
            if (!potion) return interaction.reply({ content: '❌ Trank nicht gefunden!', ephemeral: true });
            if (potion.amount < menge || menge < 1) return interaction.reply({ content: `❌ Du hast nur ${potion.amount}!`, ephemeral: true });

            const info = POTIONS[potion.potion_id];
            const price = Math.floor(info.basePrice * (potion.quality / 50));
            const total = price * menge;

            let bal = db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId);
            if (!bal) db.db.prepare('INSERT INTO economy (user_id, balance) VALUES (?, 0)').run(userId);
            db.db.prepare('UPDATE economy SET balance = balance + ? WHERE user_id = ?').run(total, userId);

            if (potion.amount === menge) db.db.prepare('DELETE FROM apotheke_potions WHERE id = ?').run(potionDbId);
            else db.db.prepare('UPDATE apotheke_potions SET amount = amount - ? WHERE id = ?').run(menge, potionDbId);

            db.db.prepare('UPDATE apotheken SET total_sold = total_sold + ?, total_earned = total_earned + ? WHERE user_id = ?').run(menge, total, userId);

            return interaction.reply({ embeds: [new EmbedBuilder().setColor('#00aa00').setTitle('💰 Verkauft!').setDescription(`${info.name} x${menge}\n💰 **+${total} Coins** (${price}/Stück)`)] });
        }

        if (sub === 'laden') {
            const cdKey = `apo_shop_${userId}`;
            if (cooldowns.has(cdKey) && cooldowns.get(cdKey) > Date.now()) {
                const left = Math.ceil((cooldowns.get(cdKey) - Date.now()) / 1000);
                return interaction.reply({ content: `⏳ Laden ist beschäftigt... ${left}s.`, ephemeral: true });
            }

            const potions = db.db.prepare('SELECT * FROM apotheke_potions WHERE user_id = ? AND amount > 0 ORDER BY quality DESC').all(userId);
            if (potions.length === 0) return interaction.reply({ content: '❌ Keine Tränke zum Verkaufen!', ephemeral: true });

            const customerCount = 1 + shop.laden_level + Math.floor(Math.random() * 3);
            let totalRevenue = 0, totalTips = 0, potionsSold = 0;
            const log = [];

            for (let i = 0; i < customerCount; i++) {
                const customer = CUSTOMERS[Math.floor(Math.random() * CUSTOMERS.length)];
                const matchingPotion = potions.find(p => customer.preference.includes(p.potion_id) && p.amount > 0);
                const soldPotion = matchingPotion || potions.find(p => p.amount > 0);
                if (!soldPotion) break;

                const info = POTIONS[soldPotion.potion_id];
                const price = Math.floor(info.basePrice * (soldPotion.quality / 50) * 1.3);
                const tip = Math.floor(price * customer.tipFactor * (0.3 + Math.random() * 0.7));
                const preferred = matchingPotion === soldPotion;

                totalRevenue += price;
                totalTips += tip;
                potionsSold++;
                soldPotion.amount--;
                db.db.prepare('UPDATE apotheke_potions SET amount = amount - 1 WHERE id = ?').run(soldPotion.id);
                log.push(`${customer.name}: ${info.name} ${preferred ? '😍' : '🤔'} — ${price} + ${tip} Trinkgeld`);
            }

            db.db.prepare('DELETE FROM apotheke_potions WHERE amount <= 0 AND user_id = ?').run(userId);
            const total = totalRevenue + totalTips;

            let bal = db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId);
            if (!bal) db.db.prepare('INSERT INTO economy (user_id, balance) VALUES (?, 0)').run(userId);
            db.db.prepare('UPDATE economy SET balance = balance + ? WHERE user_id = ?').run(total, userId);
            db.db.prepare('UPDATE apotheken SET total_sold = total_sold + ?, total_earned = total_earned + ?, reputation = reputation + ? WHERE user_id = ?')
                .run(potionsSold, total, potionsSold * 3, userId);

            const embed = new EmbedBuilder()
                .setColor('#9B59B6')
                .setTitle('🏪 Laden geschlossen!')
                .setDescription(log.join('\n') + `\n\n👥 Kunden: ${customerCount}\n🧪 Verkauft: ${potionsSold}\n💰 Einnahmen: ${totalRevenue}\n💵 Trinkgeld: ${totalTips}\n**💰 Gesamt: ${total} Coins**`);

            cooldowns.set(cdKey, Date.now() + 75000);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'upgrade') {
            const what = interaction.options.getString('was');
            const upgrades = {
                labor: { field: 'labor_level', name: '🔬 Labor', baseCost: 500, max: 10, desc: 'Bessere Qualität & Sammelchance' },
                lager: { field: 'lager_level', name: '📦 Lager', baseCost: 300, max: 10, desc: 'Mehr Lagerplatz' },
                kessel: { field: 'kessel_level', name: '🫕 Kessel', baseCost: 450, max: 10, desc: 'Mehr Tränke & Qualität' },
                laden: { field: 'laden_level', name: '🏪 Laden', baseCost: 600, max: 8, desc: 'Mehr Kunden' }
            };

            const upgrade = upgrades[what];
            const current = shop[upgrade.field];
            if (current >= upgrade.max) return interaction.reply({ content: '❌ Maximum!', ephemeral: true });

            const cost = upgrade.baseCost * (current + 1);
            let balance = db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId);
            if (!balance || balance.balance < cost) return interaction.reply({ content: `❌ Kostet ${cost} Coins.`, ephemeral: true });

            db.db.prepare('UPDATE economy SET balance = balance - ? WHERE user_id = ?').run(cost, userId);
            db.db.prepare(`UPDATE apotheken SET ${upgrade.field} = ${upgrade.field} + 1 WHERE user_id = ?`).run(userId);

            return interaction.reply({ embeds: [new EmbedBuilder().setColor('#9B59B6').setTitle(`⬆️ ${upgrade.name} verbessert!`).setDescription(`Lv.${current} → Lv.${current + 1}\n${upgrade.desc}\n💰 -${cost} Coins`)] });
        }

        if (sub === 'rezepte') {
            const rank = getRank(shop.reputation);
            const list = Object.entries(POTIONS).map(([k, v]) => {
                const locked = rank < v.minRank;
                const ings = Object.entries(v.ingredients).map(([i, a]) => `${INGREDIENTS[i]?.name || i} x${a}`).join(', ');
                return `${locked ? '🔒' : '🧪'} **${v.name}** ${locked ? `(Rang ${v.minRank})` : ''}\n${ings}\n💫 ${v.effect} | 💰 ${v.basePrice} Coins`;
            }).join('\n\n');

            return interaction.reply({ embeds: [new EmbedBuilder().setColor('#9B59B6').setTitle('📖 Trankrezepte').setDescription(list).setFooter({ text: `Rang: ${RANKS[rank].name}` })] });
        }
    }
};
