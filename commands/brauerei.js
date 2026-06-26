const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

const cooldowns = new Map();

function ensureBreweryTables() {
    db.db.exec(`
        CREATE TABLE IF NOT EXISTS breweries (
            user_id TEXT PRIMARY KEY,
            brewery_name TEXT DEFAULT 'Kleine Brauerei',
            rank INTEGER DEFAULT 0,
            reputation INTEGER DEFAULT 0,
            kessel_level INTEGER DEFAULT 1,
            lager_level INTEGER DEFAULT 1,
            qualitaet_level INTEGER DEFAULT 1,
            taverne_level INTEGER DEFAULT 0,
            hopfen INTEGER DEFAULT 5,
            malz INTEGER DEFAULT 5,
            hefe INTEGER DEFAULT 3,
            wasser INTEGER DEFAULT 10,
            spezial INTEGER DEFAULT 0,
            total_brewed INTEGER DEFAULT 0,
            total_sold INTEGER DEFAULT 0,
            total_earned INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    db.db.exec(`
        CREATE TABLE IF NOT EXISTS beer_storage (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            beer_id TEXT,
            quality INTEGER DEFAULT 50,
            amount INTEGER DEFAULT 1,
            fermented INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

const RANKS = [
    { name: 'Hobbybrauer', rep: 0 },
    { name: 'Braugeselle', rep: 100 },
    { name: 'Braumeister', rep: 300 },
    { name: 'Oberbrauer', rep: 700 },
    { name: 'Braudirektor', rep: 1500 },
    { name: 'Brauerei-Baron', rep: 3500 },
    { name: 'Bierkönig', rep: 8000 }
];

const BEERS = {
    helles: { name: '🍺 Helles', hopfen: 1, malz: 2, hefe: 1, wasser: 3, spezial: 0, difficulty: 5, basePrice: 15, minRank: 0 },
    weizen: { name: '🌾 Weizenbier', hopfen: 1, malz: 3, hefe: 2, wasser: 3, spezial: 0, difficulty: 8, basePrice: 20, minRank: 0 },
    pils: { name: '🍻 Pilsner', hopfen: 3, malz: 2, hefe: 1, wasser: 3, spezial: 0, difficulty: 12, basePrice: 25, minRank: 1 },
    dunkel: { name: '🫗 Dunkles', hopfen: 2, malz: 4, hefe: 1, wasser: 2, spezial: 0, difficulty: 15, basePrice: 30, minRank: 1 },
    ipa: { name: '🍺 IPA', hopfen: 5, malz: 2, hefe: 1, wasser: 2, spezial: 0, difficulty: 20, basePrice: 40, minRank: 2 },
    stout: { name: '🖤 Stout', hopfen: 2, malz: 5, hefe: 2, wasser: 2, spezial: 0, difficulty: 25, basePrice: 45, minRank: 2 },
    bock: { name: '🐐 Bockbier', hopfen: 3, malz: 5, hefe: 2, wasser: 3, spezial: 0, difficulty: 30, basePrice: 55, minRank: 3 },
    porter: { name: '🏴 Porter', hopfen: 3, malz: 4, hefe: 2, wasser: 2, spezial: 1, difficulty: 35, basePrice: 65, minRank: 3 },
    doppelbock: { name: '💪 Doppelbock', hopfen: 4, malz: 6, hefe: 3, wasser: 3, spezial: 1, difficulty: 42, basePrice: 80, minRank: 4 },
    rauch: { name: '🔥 Rauchbier', hopfen: 3, malz: 4, hefe: 1, wasser: 2, spezial: 2, difficulty: 48, basePrice: 90, minRank: 4 },
    trappist: { name: '⛪ Trappistenbier', hopfen: 4, malz: 5, hefe: 3, wasser: 3, spezial: 2, difficulty: 55, basePrice: 120, minRank: 5 },
    meisterbraeu: { name: '👑 Meisterbräu', hopfen: 5, malz: 6, hefe: 3, wasser: 4, spezial: 3, difficulty: 70, basePrice: 200, minRank: 6 }
};

const BREW_EVENTS = [
    { text: '🌟 Perfekte Gärtemperatur! Das Bier wird exzellent!', qualityMod: 20 },
    { text: '🍯 Besonders aromatischer Hopfen in dieser Charge!', qualityMod: 15 },
    { text: '✨ Der Braumeister-Instinkt sagt: Genau richtig!', qualityMod: 10 },
    { text: '👍 Solider Brauprozess, alles nach Plan.', qualityMod: 5 },
    { text: '😐 Durchschnittlicher Brauvorgang.', qualityMod: 0 },
    { text: '🌡️ Temperatur schwankt etwas...', qualityMod: -5 },
    { text: '🦠 Leichte Kontamination! Schnell gegengesteuert.', qualityMod: -10 },
    { text: '💥 Der Kessel kocht über! Einiges geht verloren.', qualityMod: -15 }
];

const TAVERN_CUSTOMERS = [
    { name: '👷 Arbeiter', preference: ['helles', 'pils', 'weizen'], tipFactor: 0.8 },
    { name: '👨‍💼 Geschäftsmann', preference: ['pils', 'ipa', 'porter'], tipFactor: 1.5 },
    { name: '👩‍🎓 Studentin', preference: ['weizen', 'helles', 'dunkel'], tipFactor: 0.6 },
    { name: '🧔 Bierkenner', preference: ['trappist', 'doppelbock', 'bock'], tipFactor: 2.0 },
    { name: '👵 Stammgast', preference: ['helles', 'dunkel', 'weizen'], tipFactor: 1.0 },
    { name: '🎭 Tourist', preference: ['rauch', 'bock', 'stout'], tipFactor: 1.3 },
    { name: '👨‍🍳 Koch', preference: ['stout', 'porter', 'ipa'], tipFactor: 1.2 },
    { name: '🤴 Adeliger', preference: ['meisterbraeu', 'trappist', 'doppelbock'], tipFactor: 3.0 }
];

const UPGRADES = {
    kessel: { field: 'kessel_level', name: '🫕 Braukessel', baseCost: 400, max: 10, desc: 'Mehr Bier pro Brauvorgang' },
    lager: { field: 'lager_level', name: '🏪 Lagerkeller', baseCost: 350, max: 10, desc: 'Verbessert Gärung' },
    qualitaet: { field: 'qualitaet_level', name: '⭐ Qualitätskontrolle', baseCost: 500, max: 10, desc: 'Höhere Bierqualität' },
    taverne: { field: 'taverne_level', name: '🍺 Taverne', baseCost: 800, max: 5, desc: 'Mehr Kunden & bessere Preise' }
};

function getRank(rep) {
    for (let i = RANKS.length - 1; i >= 0; i--) {
        if (rep >= RANKS[i].rep) return i;
    }
    return 0;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('brauerei')
        .setDescription('🍺 Braue dein eigenes Bier und führe eine Taverne!')
        .addSubcommand(s => s.setName('status').setDescription('Zeige deinen Brauerei-Status'))
        .addSubcommand(s => s.setName('umbenennen').setDescription('Benenne deine Brauerei um')
            .addStringOption(o => o.setName('name').setDescription('Neuer Name').setRequired(true)))
        .addSubcommand(s => s.setName('brauen').setDescription('Braue ein Bier')
            .addStringOption(o => o.setName('bier').setDescription('Welches Bier').setRequired(true)
                .addChoices(...Object.entries(BEERS).slice(0, 12).map(([k, v]) => ({ name: v.name, value: k })))))
        .addSubcommand(s => s.setName('lager').setDescription('Zeige dein Bierlager'))
        .addSubcommand(s => s.setName('gaeren').setDescription('Lass ein Bier gären')
            .addIntegerOption(o => o.setName('id').setDescription('Bier-ID').setRequired(true)))
        .addSubcommand(s => s.setName('verkaufen').setDescription('Verkaufe Bier am Markt')
            .addIntegerOption(o => o.setName('id').setDescription('Bier-ID').setRequired(true))
            .addIntegerOption(o => o.setName('menge').setDescription('Menge').setRequired(true)))
        .addSubcommand(s => s.setName('taverne').setDescription('Öffne deine Taverne für Gäste'))
        .addSubcommand(s => s.setName('einkaufen').setDescription('Kaufe Zutaten')
            .addStringOption(o => o.setName('zutat').setDescription('Welche Zutat').setRequired(true)
                .addChoices(
                    { name: '🌿 Hopfen (10 Coins)', value: 'hopfen' },
                    { name: '🌾 Malz (8 Coins)', value: 'malz' },
                    { name: '🧫 Hefe (15 Coins)', value: 'hefe' },
                    { name: '💧 Wasser (3 Coins)', value: 'wasser' },
                    { name: '✨ Spezialzutat (50 Coins)', value: 'spezial' }
                ))
            .addIntegerOption(o => o.setName('menge').setDescription('Menge (1-50)').setRequired(true)))
        .addSubcommand(s => s.setName('upgrade').setDescription('Verbessere deine Brauerei')
            .addStringOption(o => o.setName('was').setDescription('Was upgraden').setRequired(true)
                .addChoices(...Object.entries(UPGRADES).map(([k, v]) => ({ name: v.name, value: k })))))
        .addSubcommand(s => s.setName('rezepte').setDescription('Zeige alle Bierrezepte')),

    async execute(interaction) {
        ensureBreweryTables();
        const config = require('../config.json');
        const sub = interaction.options.getSubcommand();
        const userId = interaction.user.id;

        let brewery = db.db.prepare('SELECT * FROM breweries WHERE user_id = ?').get(userId);

        if (!brewery && sub !== 'status') {
            return interaction.reply({ content: '❌ Benutze `/brauerei status` um deine Brauerei zu gründen!', ephemeral: true });
        }

        if (sub === 'status') {
            if (!brewery) {
                db.db.prepare('INSERT INTO breweries (user_id) VALUES (?)').run(userId);
                brewery = db.db.prepare('SELECT * FROM breweries WHERE user_id = ?').get(userId);
                const embed = new EmbedBuilder()
                    .setColor('#D4A017')
                    .setTitle('🍺 Brauerei gegründet!')
                    .setDescription('Deine **Kleine Brauerei** ist eröffnet!\n\nDu hast Grundzutaten erhalten.\nBraue dein erstes Bier mit `/brauerei brauen`!');
                return interaction.reply({ embeds: [embed] });
            }

            const rank = getRank(brewery.reputation);
            const nextRank = rank < RANKS.length - 1 ? RANKS[rank + 1] : null;
            const beerCount = db.db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM beer_storage WHERE user_id = ?').get(userId).total;

            const embed = new EmbedBuilder()
                .setColor('#D4A017')
                .setTitle(`🍺 ${brewery.brewery_name}`)
                .setDescription(`**${RANKS[rank].name}** (Rang ${rank})\n${nextRank ? `Nächster: ${nextRank.name} (${brewery.reputation}/${nextRank.rep} Rep)` : '👑 MAXIMALER RANG!'}`)
                .addFields(
                    { name: '⭐ Reputation', value: `${brewery.reputation}`, inline: true },
                    { name: '🍺 Im Lager', value: `${beerCount} Fässer`, inline: true },
                    { name: '💰 Verdient', value: `${brewery.total_earned}`, inline: true },
                    { name: '🫕 Kessel', value: `Lv.${brewery.kessel_level}`, inline: true },
                    { name: '🏪 Lager', value: `Lv.${brewery.lager_level}`, inline: true },
                    { name: '⭐ Qualität', value: `Lv.${brewery.qualitaet_level}`, inline: true },
                    { name: '🍺 Taverne', value: brewery.taverne_level > 0 ? `Lv.${brewery.taverne_level}` : '❌ Nicht gebaut', inline: true },
                    { name: '📦 Zutaten', value: `🌿 Hopfen: ${brewery.hopfen}\n🌾 Malz: ${brewery.malz}\n🧫 Hefe: ${brewery.hefe}\n💧 Wasser: ${brewery.wasser}\n✨ Spezial: ${brewery.spezial}`, inline: true },
                    { name: '📊 Stats', value: `Gebraut: ${brewery.total_brewed}\nVerkauft: ${brewery.total_sold}`, inline: true }
                );
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'umbenennen') {
            const name = interaction.options.getString('name');
            if (name.length > 30) return interaction.reply({ content: '❌ Max. 30 Zeichen!', ephemeral: true });
            db.db.prepare('UPDATE breweries SET brewery_name = ? WHERE user_id = ?').run(name, userId);
            return interaction.reply({ embeds: [new EmbedBuilder().setColor('#D4A017').setTitle('🍺 Umbenannt!').setDescription(`Deine Brauerei heißt jetzt **${name}**!`)] });
        }

        if (sub === 'brauen') {
            const cdKey = `brew_brew_${userId}`;
            if (cooldowns.has(cdKey) && cooldowns.get(cdKey) > Date.now()) {
                const left = Math.ceil((cooldowns.get(cdKey) - Date.now()) / 1000);
                return interaction.reply({ content: `⏳ Brauvorgang läuft... Warte ${left}s.`, ephemeral: true });
            }

            const beerId = interaction.options.getString('bier');
            const beer = BEERS[beerId];
            const rank = getRank(brewery.reputation);

            if (rank < beer.minRank) return interaction.reply({ content: `❌ Du brauchst Rang ${beer.minRank} (${RANKS[beer.minRank].name}).`, ephemeral: true });

            if (brewery.hopfen < beer.hopfen || brewery.malz < beer.malz || brewery.hefe < beer.hefe || brewery.wasser < beer.wasser || brewery.spezial < beer.spezial) {
                return interaction.reply({ content: `❌ Nicht genug Zutaten!\nBenötigt: 🌿${beer.hopfen} 🌾${beer.malz} 🧫${beer.hefe} 💧${beer.wasser} ✨${beer.spezial}\nVorhanden: 🌿${brewery.hopfen} 🌾${brewery.malz} 🧫${brewery.hefe} 💧${brewery.wasser} ✨${brewery.spezial}`, ephemeral: true });
            }

            const event = BREW_EVENTS[Math.floor(Math.random() * BREW_EVENTS.length)];
            const baseQuality = 30 + Math.floor(Math.random() * 30);
            const qualBonus = brewery.qualitaet_level * 4;
            const kesselBonus = brewery.kessel_level * 2;
            const quality = Math.min(100, Math.max(10, baseQuality + qualBonus + kesselBonus + event.qualityMod));
            const amount = 1 + Math.floor(brewery.kessel_level / 3);

            db.db.prepare('UPDATE breweries SET hopfen = hopfen - ?, malz = malz - ?, hefe = hefe - ?, wasser = wasser - ?, spezial = spezial - ?, total_brewed = total_brewed + ?, reputation = reputation + ? WHERE user_id = ?')
                .run(beer.hopfen, beer.malz, beer.hefe, beer.wasser, beer.spezial, amount, 3, userId);

            const existing = db.db.prepare('SELECT * FROM beer_storage WHERE user_id = ? AND beer_id = ? AND quality = ? AND fermented = 0').get(userId, beerId, quality);
            if (existing) {
                db.db.prepare('UPDATE beer_storage SET amount = amount + ? WHERE id = ?').run(amount, existing.id);
            } else {
                db.db.prepare('INSERT INTO beer_storage (user_id, beer_id, quality, amount) VALUES (?, ?, ?, ?)').run(userId, beerId, quality, amount);
            }

            const stars = '★'.repeat(Math.floor(quality / 20)) + '☆'.repeat(5 - Math.floor(quality / 20));
            const embed = new EmbedBuilder()
                .setColor('#D4A017')
                .setTitle(`🍺 ${beer.name} gebraut!`)
                .setDescription(`${event.text}\n\n${stars} Qualität: **${quality}/100**\n📦 Menge: **${amount} Fass/Fässer**\n\n*Kessel-Bonus: +${kesselBonus} | Qualitäts-Bonus: +${qualBonus}*\n\n💡 Lass es gären mit \`/brauerei gaeren\` für bessere Qualität!`);

            cooldowns.set(cdKey, Date.now() + 60000);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'lager') {
            const beers = db.db.prepare('SELECT * FROM beer_storage WHERE user_id = ? AND amount > 0 ORDER BY quality DESC').all(userId);

            if (beers.length === 0) return interaction.reply({ content: '❌ Dein Lager ist leer! Braue etwas mit `/brauerei brauen`.', ephemeral: true });

            const list = beers.map(b => {
                const info = BEERS[b.beer_id];
                const stars = '★'.repeat(Math.floor(b.quality / 20)) + '☆'.repeat(5 - Math.floor(b.quality / 20));
                const fermented = b.fermented ? '🟢 Gegärt' : '🟡 Ungegärt';
                return `**#${b.id} ${info?.name || b.beer_id}** x${b.amount}\n${stars} (${b.quality}/100) | ${fermented}`;
            }).join('\n\n');

            const embed = new EmbedBuilder()
                .setColor('#D4A017')
                .setTitle('🏪 Bierlager')
                .setDescription(list);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'gaeren') {
            const cdKey = `brew_ferment_${userId}`;
            if (cooldowns.has(cdKey) && cooldowns.get(cdKey) > Date.now()) {
                const left = Math.ceil((cooldowns.get(cdKey) - Date.now()) / 1000);
                return interaction.reply({ content: `⏳ Gärung läuft... Warte ${left}s.`, ephemeral: true });
            }

            const beerId = interaction.options.getInteger('id');
            const beer = db.db.prepare('SELECT * FROM beer_storage WHERE id = ? AND user_id = ?').get(beerId, userId);
            if (!beer) return interaction.reply({ content: '❌ Bier nicht gefunden!', ephemeral: true });
            if (beer.fermented) return interaction.reply({ content: '❌ Dieses Bier ist bereits gegärt!', ephemeral: true });

            const lagerBonus = brewery.lager_level * 5;
            const qualityGain = 10 + Math.floor(Math.random() * 10) + lagerBonus;
            const newQuality = Math.min(100, beer.quality + qualityGain);

            db.db.prepare('UPDATE beer_storage SET quality = ?, fermented = 1 WHERE id = ?').run(newQuality, beerId);

            const embed = new EmbedBuilder()
                .setColor('#D4A017')
                .setTitle('🫙 Gärung abgeschlossen!')
                .setDescription(`Qualität: **${beer.quality}** → **${newQuality}** (+${qualityGain})\n*Lager-Bonus: +${lagerBonus}*\n\n${'★'.repeat(Math.floor(newQuality / 20))}${'☆'.repeat(5 - Math.floor(newQuality / 20))}`);

            cooldowns.set(cdKey, Date.now() + 90000);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'verkaufen') {
            const beerId = interaction.options.getInteger('id');
            const amount = interaction.options.getInteger('menge');
            const beer = db.db.prepare('SELECT * FROM beer_storage WHERE id = ? AND user_id = ?').get(beerId, userId);
            if (!beer) return interaction.reply({ content: '❌ Bier nicht gefunden!', ephemeral: true });
            if (beer.amount < amount) return interaction.reply({ content: `❌ Du hast nur ${beer.amount} Fässer!`, ephemeral: true });
            if (amount < 1) return interaction.reply({ content: '❌ Mindestens 1 Fass!', ephemeral: true });

            const info = BEERS[beer.beer_id];
            const qualityMul = beer.quality / 50;
            const fermentBonus = beer.fermented ? 1.5 : 1.0;
            const pricePerUnit = Math.floor(info.basePrice * qualityMul * fermentBonus);
            const total = pricePerUnit * amount;

            let bal = db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId);
            if (!bal) db.db.prepare('INSERT INTO economy (user_id, balance) VALUES (?, 0)').run(userId);
            db.db.prepare('UPDATE economy SET balance = balance + ? WHERE user_id = ?').run(total, userId);

            if (beer.amount === amount) {
                db.db.prepare('DELETE FROM beer_storage WHERE id = ?').run(beerId);
            } else {
                db.db.prepare('UPDATE beer_storage SET amount = amount - ? WHERE id = ?').run(amount, beerId);
            }
            db.db.prepare('UPDATE breweries SET total_sold = total_sold + ?, total_earned = total_earned + ?, reputation = reputation + ? WHERE user_id = ?')
                .run(amount, total, amount, userId);

            const embed = new EmbedBuilder()
                .setColor('#00aa00')
                .setTitle('💰 Bier verkauft!')
                .setDescription(`**${info.name}** x${amount}\n💰 ${pricePerUnit} Coins/Fass = **${total} Coins**\n${beer.fermented ? '🟢 Gegärt-Bonus: x1.5' : ''}`);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'taverne') {
            const cdKey = `brew_tavern_${userId}`;
            if (cooldowns.has(cdKey) && cooldowns.get(cdKey) > Date.now()) {
                const left = Math.ceil((cooldowns.get(cdKey) - Date.now()) / 1000);
                return interaction.reply({ content: `⏳ Taverne ist beschäftigt... Warte ${left}s.`, ephemeral: true });
            }

            if (brewery.taverne_level < 1) return interaction.reply({ content: '❌ Du hast noch keine Taverne! Baue eine mit `/brauerei upgrade`.', ephemeral: true });

            const beers = db.db.prepare('SELECT * FROM beer_storage WHERE user_id = ? AND amount > 0 ORDER BY quality DESC').all(userId);
            if (beers.length === 0) return interaction.reply({ content: '❌ Kein Bier zum Ausschenken! Braue zuerst welches.', ephemeral: true });

            const customerCount = 2 + brewery.taverne_level + Math.floor(Math.random() * 3);
            let totalRevenue = 0;
            let totalTips = 0;
            let beersSold = 0;
            const log = [];

            for (let i = 0; i < customerCount; i++) {
                const customer = TAVERN_CUSTOMERS[Math.floor(Math.random() * TAVERN_CUSTOMERS.length)];
                const matchingBeer = beers.find(b => customer.preference.includes(b.beer_id) && b.amount > 0);
                const soldBeer = matchingBeer || beers.find(b => b.amount > 0);

                if (!soldBeer) break;

                const info = BEERS[soldBeer.beer_id];
                const price = Math.floor(info.basePrice * (soldBeer.quality / 50) * 1.2);
                const tip = Math.floor(price * customer.tipFactor * (0.5 + Math.random() * 0.5));
                const isPreferred = matchingBeer === soldBeer;

                totalRevenue += price;
                totalTips += tip;
                beersSold++;
                soldBeer.amount--;

                db.db.prepare('UPDATE beer_storage SET amount = amount - 1 WHERE id = ?').run(soldBeer.id);
                log.push(`${customer.name}: ${info.name} ${isPreferred ? '😍' : '😐'} — ${price} + ${tip} Trinkgeld`);
            }

            db.db.prepare('DELETE FROM beer_storage WHERE amount <= 0 AND user_id = ?').run(userId);

            const total = totalRevenue + totalTips;
            let bal = db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId);
            if (!bal) db.db.prepare('INSERT INTO economy (user_id, balance) VALUES (?, 0)').run(userId);
            db.db.prepare('UPDATE economy SET balance = balance + ? WHERE user_id = ?').run(total, userId);
            db.db.prepare('UPDATE breweries SET total_sold = total_sold + ?, total_earned = total_earned + ?, reputation = reputation + ? WHERE user_id = ?')
                .run(beersSold, total, beersSold * 2, userId);

            const embed = new EmbedBuilder()
                .setColor('#D4A017')
                .setTitle('🍺 Taverne — Feierabend!')
                .setDescription(log.join('\n') + `\n\n👥 Kunden: ${customerCount}\n🍺 Bier verkauft: ${beersSold}\n💰 Einnahmen: ${totalRevenue} Coins\n💵 Trinkgeld: ${totalTips} Coins\n**💰 Gesamt: ${total} Coins**`);

            cooldowns.set(cdKey, Date.now() + 75000);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'einkaufen') {
            const zutat = interaction.options.getString('zutat');
            const menge = interaction.options.getInteger('menge');
            if (menge < 1 || menge > 50) return interaction.reply({ content: '❌ Menge: 1-50!', ephemeral: true });

            const prices = { hopfen: 10, malz: 8, hefe: 15, wasser: 3, spezial: 50 };
            const names = { hopfen: '🌿 Hopfen', malz: '🌾 Malz', hefe: '🧫 Hefe', wasser: '💧 Wasser', spezial: '✨ Spezialzutat' };
            const cost = prices[zutat] * menge;

            let balance = db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId);
            if (!balance || balance.balance < cost) return interaction.reply({ content: `❌ Kostet ${cost} Coins. Du hast ${balance?.balance || 0}.`, ephemeral: true });

            db.db.prepare('UPDATE economy SET balance = balance - ? WHERE user_id = ?').run(cost, userId);
            db.db.prepare(`UPDATE breweries SET ${zutat} = ${zutat} + ? WHERE user_id = ?`).run(menge, userId);

            const embed = new EmbedBuilder()
                .setColor('#D4A017')
                .setTitle('🛒 Zutaten gekauft!')
                .setDescription(`${names[zutat]} x${menge}\n💰 -${cost} Coins`);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'upgrade') {
            const what = interaction.options.getString('was');
            const upgrade = UPGRADES[what];
            const current = brewery[upgrade.field];
            if (current >= upgrade.max) return interaction.reply({ content: '❌ Maximum erreicht!', ephemeral: true });

            const cost = upgrade.baseCost * (current + 1);
            let balance = db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId);
            if (!balance || balance.balance < cost) return interaction.reply({ content: `❌ Kostet ${cost} Coins.`, ephemeral: true });

            db.db.prepare('UPDATE economy SET balance = balance - ? WHERE user_id = ?').run(cost, userId);
            db.db.prepare(`UPDATE breweries SET ${upgrade.field} = ${upgrade.field} + 1 WHERE user_id = ?`).run(userId);

            const embed = new EmbedBuilder()
                .setColor('#D4A017')
                .setTitle(`⬆️ ${upgrade.name} verbessert!`)
                .setDescription(`Lv.${current} → Lv.${current + 1}\n${upgrade.desc}\n💰 -${cost} Coins`);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'rezepte') {
            const rank = getRank(brewery.reputation);
            const list = Object.entries(BEERS).map(([k, v]) => {
                const locked = rank < v.minRank;
                return `${locked ? '🔒' : '🍺'} **${v.name}** ${locked ? `(Rang ${v.minRank})` : ''}\n🌿${v.hopfen} 🌾${v.malz} 🧫${v.hefe} 💧${v.wasser} ✨${v.spezial} | Preis: ${v.basePrice} | Schw.: ${v.difficulty}`;
            }).join('\n\n');

            const embed = new EmbedBuilder()
                .setColor('#D4A017')
                .setTitle('📖 Bierrezepte')
                .setDescription(list)
                .setFooter({ text: `Dein Rang: ${RANKS[rank].name}` });
            return interaction.reply({ embeds: [embed] });
        }
    }
};
