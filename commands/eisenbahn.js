const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

const cooldowns = new Map();

function ensureRailTables() {
    db.db.exec(`
        CREATE TABLE IF NOT EXISTS railways (
            user_id TEXT PRIMARY KEY,
            company_name TEXT DEFAULT 'Kleine Bahngesellschaft',
            rank INTEGER DEFAULT 0,
            prestige INTEGER DEFAULT 0,
            tracks_level INTEGER DEFAULT 1,
            station_level INTEGER DEFAULT 1,
            signal_level INTEGER DEFAULT 1,
            depot_level INTEGER DEFAULT 1,
            total_trips INTEGER DEFAULT 0,
            total_passengers INTEGER DEFAULT 0,
            total_cargo INTEGER DEFAULT 0,
            total_earned INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    db.db.exec(`
        CREATE TABLE IF NOT EXISTS trains (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            name TEXT DEFAULT 'Zug',
            train_type TEXT,
            speed INTEGER DEFAULT 50,
            capacity INTEGER DEFAULT 30,
            cargo_capacity INTEGER DEFAULT 0,
            condition_pct INTEGER DEFAULT 100,
            total_km INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

const RANKS = [
    { name: 'Lokführer-Azubi', prestige: 0 },
    { name: 'Stationsvorsteher', prestige: 150 },
    { name: 'Bahninspektor', prestige: 400 },
    { name: 'Bahndirektor', prestige: 1000 },
    { name: 'Eisenbahnbaron', prestige: 2500 },
    { name: 'Schienenmagnat', prestige: 5500 },
    { name: 'Eisenbahnimperator', prestige: 12000 }
];

const TRAIN_TYPES = {
    dampflok: { name: '🚂 Dampflok', speed: 40, passengers: 30, cargo: 20, cost: 300, minRank: 0 },
    diesellok: { name: '🚆 Diesellok', speed: 70, passengers: 50, cargo: 40, cost: 800, minRank: 1 },
    elektrolok: { name: '⚡ E-Lok', speed: 100, passengers: 80, cargo: 30, cost: 1500, minRank: 2 },
    intercity: { name: '🚄 InterCity', speed: 130, passengers: 120, cargo: 10, cost: 3000, minRank: 3 },
    gueterzug: { name: '📦 Güterzug', speed: 60, passengers: 0, cargo: 150, cost: 2000, minRank: 2 },
    ice: { name: '🚅 ICE', speed: 200, passengers: 200, cargo: 5, cost: 6000, minRank: 4 },
    nachtzug: { name: '🌙 Nachtzug', speed: 90, passengers: 60, cargo: 20, cost: 2500, minRank: 3 },
    luxuszug: { name: '💎 Orient Express', speed: 80, passengers: 40, cargo: 0, cost: 10000, minRank: 5 },
    hyperloop: { name: '🔮 Hyperloop', speed: 500, passengers: 300, cargo: 50, cost: 25000, minRank: 6 }
};

const ROUTES = [
    { id: 'dorf', name: '🏘️ Dorfstrecke', km: 20, difficulty: 3, passengerDemand: 0.6, cargoDemand: 0.4, minRank: 0 },
    { id: 'stadt', name: '🏙️ Stadtverbindung', km: 50, difficulty: 8, passengerDemand: 0.8, cargoDemand: 0.6, minRank: 0 },
    { id: 'bergpass', name: '⛰️ Bergpass', km: 80, difficulty: 15, passengerDemand: 0.5, cargoDemand: 0.8, minRank: 1 },
    { id: 'kuestenlinie', name: '🏖️ Küstenlinie', km: 120, difficulty: 12, passengerDemand: 0.9, cargoDemand: 0.3, minRank: 1 },
    { id: 'fernverkehr', name: '🗺️ Fernverkehr', km: 200, difficulty: 20, passengerDemand: 0.85, cargoDemand: 0.7, minRank: 2 },
    { id: 'grenzroute', name: '🛂 Grenzroute', km: 300, difficulty: 25, passengerDemand: 0.7, cargoDemand: 0.9, minRank: 3 },
    { id: 'transalpin', name: '🏔️ Transalpin', km: 450, difficulty: 35, passengerDemand: 0.6, cargoDemand: 0.85, minRank: 4 },
    { id: 'transkontinental', name: '🌍 Transkontinental', km: 800, difficulty: 50, passengerDemand: 0.75, cargoDemand: 0.95, minRank: 5 },
    { id: 'polarexpress', name: '❄️ Polarexpress', km: 1200, difficulty: 70, passengerDemand: 0.4, cargoDemand: 0.5, minRank: 6 }
];

const TRIP_EVENTS = [
    { text: '☀️ Perfektes Reisewetter! Alle sind zufrieden.', passMod: 1.3, cargoMod: 1.0, condMod: 0 },
    { text: '🎉 Eine Reisegruppe bucht spontan dazu!', passMod: 1.5, cargoMod: 1.0, condMod: 0 },
    { text: '📦 Eilfracht-Auftrag unterwegs aufgenommen!', passMod: 1.0, cargoMod: 1.5, condMod: 0 },
    { text: '🚂 Reibungslose Fahrt, alles nach Plan.', passMod: 1.0, cargoMod: 1.0, condMod: 0 },
    { text: '🐄 Kühe auf den Gleisen! Kurze Verspätung.', passMod: 0.9, cargoMod: 0.9, condMod: -3 },
    { text: '🌧️ Starkregen verlangsamt die Fahrt.', passMod: 0.85, cargoMod: 0.85, condMod: -5 },
    { text: '🔧 Kleine technische Panne unterwegs.', passMod: 0.8, cargoMod: 0.8, condMod: -10 },
    { text: '⚡ Blitzeinschlag in die Oberleitung!', passMod: 0.6, cargoMod: 0.7, condMod: -15 },
    { text: '🪨 Erdrutsch auf der Strecke!', passMod: 0.5, cargoMod: 0.5, condMod: -20 },
    { text: '🌟 Ein Promi fährt mit — Medienrummel!', passMod: 1.4, cargoMod: 1.0, condMod: 0 }
];

const CARGO_TYPES = [
    { name: '📦 Pakete', pricePerUnit: 3 },
    { name: '🪵 Holz', pricePerUnit: 4 },
    { name: '⛽ Öl', pricePerUnit: 6 },
    { name: '🥫 Lebensmittel', pricePerUnit: 5 },
    { name: '🏗️ Baumaterial', pricePerUnit: 7 },
    { name: '💎 Wertgüter', pricePerUnit: 12 }
];

function getRank(prestige) {
    for (let i = RANKS.length - 1; i >= 0; i--) {
        if (prestige >= RANKS[i].prestige) return i;
    }
    return 0;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('eisenbahn')
        .setDescription('🚂 Baue dein Eisenbahnimperium auf!')
        .addSubcommand(s => s.setName('status').setDescription('Zeige dein Eisenbahn-Imperium'))
        .addSubcommand(s => s.setName('umbenennen').setDescription('Benenne deine Gesellschaft um')
            .addStringOption(o => o.setName('name').setDescription('Neuer Name').setRequired(true)))
        .addSubcommand(s => s.setName('kaufen').setDescription('Kaufe einen Zug')
            .addStringOption(o => o.setName('typ').setDescription('Zugtyp').setRequired(true)
                .addChoices(...Object.entries(TRAIN_TYPES).map(([k, v]) => ({ name: v.name, value: k })))))
        .addSubcommand(s => s.setName('zuege').setDescription('Zeige deine Züge'))
        .addSubcommand(s => s.setName('benennen').setDescription('Benenne einen Zug um')
            .addIntegerOption(o => o.setName('id').setDescription('Zug-ID').setRequired(true))
            .addStringOption(o => o.setName('name').setDescription('Neuer Name').setRequired(true)))
        .addSubcommand(s => s.setName('fahrt').setDescription('Starte eine Fahrt')
            .addIntegerOption(o => o.setName('zug').setDescription('Zug-ID').setRequired(true))
            .addStringOption(o => o.setName('route').setDescription('Route').setRequired(true)
                .addChoices(...ROUTES.map(r => ({ name: r.name, value: r.id })))))
        .addSubcommand(s => s.setName('reparieren').setDescription('Repariere einen Zug')
            .addIntegerOption(o => o.setName('id').setDescription('Zug-ID').setRequired(true)))
        .addSubcommand(s => s.setName('upgrade').setDescription('Verbessere deine Infrastruktur')
            .addStringOption(o => o.setName('was').setDescription('Was upgraden').setRequired(true)
                .addChoices(
                    { name: '🛤️ Gleise', value: 'tracks' },
                    { name: '🏛️ Bahnhof', value: 'station' },
                    { name: '🚦 Signaltechnik', value: 'signal' },
                    { name: '🔧 Depot', value: 'depot' }
                )))
        .addSubcommand(s => s.setName('routen').setDescription('Zeige alle verfügbaren Routen'))
        .addSubcommand(s => s.setName('verschrotten').setDescription('Verschrotte einen Zug')
            .addIntegerOption(o => o.setName('id').setDescription('Zug-ID').setRequired(true))),

    async execute(interaction) {
        ensureRailTables();
        const config = require('../config.json');
        const sub = interaction.options.getSubcommand();
        const userId = interaction.user.id;

        let railway = db.db.prepare('SELECT * FROM railways WHERE user_id = ?').get(userId);

        if (!railway && sub !== 'status') {
            return interaction.reply({ content: '❌ Benutze `/eisenbahn status` um deine Bahngesellschaft zu gründen!', ephemeral: true });
        }

        if (sub === 'status') {
            if (!railway) {
                db.db.prepare('INSERT INTO railways (user_id) VALUES (?)').run(userId);
                railway = db.db.prepare('SELECT * FROM railways WHERE user_id = ?').get(userId);

                db.db.prepare('INSERT INTO trains (user_id, name, train_type, speed, capacity, cargo_capacity) VALUES (?, ?, ?, ?, ?, ?)')
                    .run(userId, 'Alte Dampflok', 'dampflok', 40, 30, 20);

                const embed = new EmbedBuilder()
                    .setColor('#2F4F4F')
                    .setTitle('🚂 Bahngesellschaft gegründet!')
                    .setDescription('Deine **Kleine Bahngesellschaft** wurde gegründet!\n\nDu hast eine alte Dampflok erhalten.\nStarte deine erste Fahrt mit `/eisenbahn fahrt`!');
                return interaction.reply({ embeds: [embed] });
            }

            const rank = getRank(railway.prestige);
            const nextRank = rank < RANKS.length - 1 ? RANKS[rank + 1] : null;
            const trainCount = db.db.prepare('SELECT COUNT(*) as cnt FROM trains WHERE user_id = ?').get(userId).cnt;

            const embed = new EmbedBuilder()
                .setColor('#2F4F4F')
                .setTitle(`🚂 ${railway.company_name}`)
                .setDescription(`**${RANKS[rank].name}** (Rang ${rank})\n${nextRank ? `Nächster: ${nextRank.name} (${railway.prestige}/${nextRank.prestige} Prestige)` : '👑 MAXIMALER RANG!'}`)
                .addFields(
                    { name: '⭐ Prestige', value: `${railway.prestige}`, inline: true },
                    { name: '🚂 Züge', value: `${trainCount}`, inline: true },
                    { name: '🎫 Fahrten', value: `${railway.total_trips}`, inline: true },
                    { name: '🛤️ Gleise', value: `Lv.${railway.tracks_level}`, inline: true },
                    { name: '🏛️ Bahnhof', value: `Lv.${railway.station_level}`, inline: true },
                    { name: '🚦 Signale', value: `Lv.${railway.signal_level}`, inline: true },
                    { name: '🔧 Depot', value: `Lv.${railway.depot_level}`, inline: true },
                    { name: '👥 Passagiere', value: `${railway.total_passengers}`, inline: true },
                    { name: '📦 Fracht', value: `${railway.total_cargo} t`, inline: true },
                    { name: '💰 Verdient', value: `${railway.total_earned} Coins`, inline: false }
                );
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'umbenennen') {
            const name = interaction.options.getString('name');
            if (name.length > 30) return interaction.reply({ content: '❌ Max. 30 Zeichen!', ephemeral: true });
            db.db.prepare('UPDATE railways SET company_name = ? WHERE user_id = ?').run(name, userId);
            return interaction.reply({ embeds: [new EmbedBuilder().setColor('#2F4F4F').setTitle('🚂 Umbenannt!').setDescription(`Deine Gesellschaft heißt jetzt **${name}**!`)] });
        }

        if (sub === 'kaufen') {
            const typeId = interaction.options.getString('typ');
            const type = TRAIN_TYPES[typeId];
            const rank = getRank(railway.prestige);

            if (rank < type.minRank) return interaction.reply({ content: `❌ Du brauchst Rang ${type.minRank} (${RANKS[type.minRank].name}).`, ephemeral: true });

            const maxTrains = 2 + rank * 2;
            const trainCount = db.db.prepare('SELECT COUNT(*) as cnt FROM trains WHERE user_id = ?').get(userId).cnt;
            if (trainCount >= maxTrains) return interaction.reply({ content: `❌ Max. ${maxTrains} Züge (Rang ${rank}).`, ephemeral: true });

            let balance = db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId);
            if (!balance || balance.balance < type.cost) return interaction.reply({ content: `❌ Kostet ${type.cost} Coins.`, ephemeral: true });

            db.db.prepare('UPDATE economy SET balance = balance - ? WHERE user_id = ?').run(type.cost, userId);
            db.db.prepare('INSERT INTO trains (user_id, name, train_type, speed, capacity, cargo_capacity) VALUES (?, ?, ?, ?, ?, ?)')
                .run(userId, type.name, typeId, type.speed, type.passengers, type.cargo);

            const embed = new EmbedBuilder()
                .setColor('#2F4F4F')
                .setTitle('🚂 Neuer Zug!')
                .setDescription(`**${type.name}** gekauft!\n\n⚡ Speed: ${type.speed} km/h\n👥 Passagiere: ${type.passengers}\n📦 Fracht: ${type.cargo} t\n💰 -${type.cost} Coins`);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'zuege') {
            const trains = db.db.prepare('SELECT * FROM trains WHERE user_id = ? ORDER BY speed DESC').all(userId);
            if (trains.length === 0) return interaction.reply({ content: '❌ Keine Züge!', ephemeral: true });

            const list = trains.map(t => {
                const condBar = '█'.repeat(Math.floor(t.condition_pct / 10)) + '░'.repeat(10 - Math.floor(t.condition_pct / 10));
                return `**#${t.id} ${t.name}**\n⚡ ${t.speed} km/h | 👥 ${t.capacity} | 📦 ${t.cargo_capacity} t\n🔧 [${condBar}] ${t.condition_pct}% | 📏 ${t.total_km} km gefahren`;
            }).join('\n\n');

            const embed = new EmbedBuilder()
                .setColor('#2F4F4F')
                .setTitle('🚂 Deine Züge')
                .setDescription(list);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'benennen') {
            const trainId = interaction.options.getInteger('id');
            const name = interaction.options.getString('name');
            if (name.length > 25) return interaction.reply({ content: '❌ Max. 25 Zeichen!', ephemeral: true });
            const train = db.db.prepare('SELECT * FROM trains WHERE id = ? AND user_id = ?').get(trainId, userId);
            if (!train) return interaction.reply({ content: '❌ Zug nicht gefunden!', ephemeral: true });

            db.db.prepare('UPDATE trains SET name = ? WHERE id = ?').run(name, trainId);
            return interaction.reply({ embeds: [new EmbedBuilder().setColor('#2F4F4F').setTitle('🚂 Umbenannt!').setDescription(`Zug #${trainId} heißt jetzt **${name}**!`)] });
        }

        if (sub === 'fahrt') {
            const cdKey = `rail_trip_${userId}`;
            if (cooldowns.has(cdKey) && cooldowns.get(cdKey) > Date.now()) {
                const left = Math.ceil((cooldowns.get(cdKey) - Date.now()) / 1000);
                return interaction.reply({ content: `⏳ Nächste Fahrt in ${left}s.`, ephemeral: true });
            }

            const trainId = interaction.options.getInteger('zug');
            const routeId = interaction.options.getString('route');
            const train = db.db.prepare('SELECT * FROM trains WHERE id = ? AND user_id = ?').get(trainId, userId);
            if (!train) return interaction.reply({ content: '❌ Zug nicht gefunden!', ephemeral: true });

            const route = ROUTES.find(r => r.id === routeId);
            const rank = getRank(railway.prestige);
            if (rank < route.minRank) return interaction.reply({ content: `❌ Route braucht Rang ${route.minRank} (${RANKS[route.minRank].name}).`, ephemeral: true });

            if (train.condition_pct < 15) return interaction.reply({ content: '❌ Zug muss repariert werden! `/eisenbahn reparieren`', ephemeral: true });

            const event = TRIP_EVENTS[Math.floor(Math.random() * TRIP_EVENTS.length)];

            const trackBonus = railway.tracks_level * 0.05;
            const stationBonus = railway.station_level * 0.06;
            const signalBonus = railway.signal_level * 0.04;
            const conditionFactor = train.condition_pct / 100;

            const passengers = Math.floor(train.capacity * route.passengerDemand * (1 + stationBonus) * conditionFactor * event.passMod * (0.7 + Math.random() * 0.6));
            const cargo = Math.floor(train.cargo_capacity * route.cargoDemand * (1 + trackBonus) * conditionFactor * event.cargoMod * (0.7 + Math.random() * 0.6));

            const cargoType = CARGO_TYPES[Math.floor(Math.random() * CARGO_TYPES.length)];
            const passengerRevenue = passengers * Math.floor(route.km * 0.15);
            const cargoRevenue = cargo * cargoType.pricePerUnit;
            const speedBonus = Math.floor(train.speed * route.km * 0.005 * (1 + signalBonus));
            const totalRevenue = passengerRevenue + cargoRevenue + speedBonus;

            const condLoss = Math.max(3, Math.floor(route.difficulty * 0.5) + Math.abs(event.condMod));

            let bal = db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId);
            if (!bal) db.db.prepare('INSERT INTO economy (user_id, balance) VALUES (?, 0)').run(userId);
            db.db.prepare('UPDATE economy SET balance = balance + ? WHERE user_id = ?').run(totalRevenue, userId);

            db.db.prepare('UPDATE trains SET condition_pct = MAX(0, condition_pct - ?), total_km = total_km + ? WHERE id = ?')
                .run(condLoss, route.km, trainId);

            const prestigeGain = Math.floor(route.km * 0.05 + passengers * 0.1);
            db.db.prepare('UPDATE railways SET total_trips = total_trips + 1, total_passengers = total_passengers + ?, total_cargo = total_cargo + ?, total_earned = total_earned + ?, prestige = prestige + ? WHERE user_id = ?')
                .run(passengers, cargo, totalRevenue, prestigeGain, userId);

            const travelTime = Math.floor(route.km / train.speed * 60);

            const embed = new EmbedBuilder()
                .setColor('#2F4F4F')
                .setTitle(`🚂 ${train.name} — ${route.name}`)
                .setDescription(`${event.text}\n\n📏 Strecke: ${route.km} km | ⏱️ Fahrzeit: ${travelTime} min\n\n👥 Passagiere: ${passengers}\n📦 Fracht: ${cargo} t ${cargoType.name}\n\n🎫 Fahrgäste: ${passengerRevenue} Coins\n📦 Fracht: ${cargoRevenue} Coins\n⚡ Geschwindigkeitsbonus: ${speedBonus} Coins\n**💰 Gesamt: ${totalRevenue} Coins**\n\n🔧 Zustand: -${condLoss}% (→ ${Math.max(0, train.condition_pct - condLoss)}%)\n⭐ +${prestigeGain} Prestige`);

            cooldowns.set(cdKey, Date.now() + 55000);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'reparieren') {
            const trainId = interaction.options.getInteger('id');
            const train = db.db.prepare('SELECT * FROM trains WHERE id = ? AND user_id = ?').get(trainId, userId);
            if (!train) return interaction.reply({ content: '❌ Zug nicht gefunden!', ephemeral: true });
            if (train.condition_pct >= 100) return interaction.reply({ content: '✅ Zug ist in perfektem Zustand!', ephemeral: true });

            const repairNeeded = 100 - train.condition_pct;
            const baseCost = Math.floor(repairNeeded * 3);
            const depotDiscount = 1 - railway.depot_level * 0.05;
            const cost = Math.max(10, Math.floor(baseCost * depotDiscount));

            let balance = db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId);
            if (!balance || balance.balance < cost) return interaction.reply({ content: `❌ Reparatur kostet ${cost} Coins.`, ephemeral: true });

            db.db.prepare('UPDATE economy SET balance = balance - ? WHERE user_id = ?').run(cost, userId);
            db.db.prepare('UPDATE trains SET condition_pct = 100 WHERE id = ?').run(trainId);

            const embed = new EmbedBuilder()
                .setColor('#2F4F4F')
                .setTitle('🔧 Zug repariert!')
                .setDescription(`**${train.name}** ist wieder einsatzbereit!\n🔧 ${train.condition_pct}% → 100%\n💰 -${cost} Coins${railway.depot_level > 1 ? `\n🔧 Depot-Rabatt: ${Math.floor((1 - depotDiscount) * 100)}%` : ''}`);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'upgrade') {
            const what = interaction.options.getString('was');
            const fieldMap = { tracks: 'tracks_level', station: 'station_level', signal: 'signal_level', depot: 'depot_level' };
            const nameMap = { tracks: '🛤️ Gleise', station: '🏛️ Bahnhof', signal: '🚦 Signaltechnik', depot: '🔧 Depot' };
            const costMap = { tracks: 600, station: 500, signal: 450, depot: 550 };
            const descMap = { tracks: 'Mehr Frachtkapazität', station: 'Mehr Passagiere', signal: 'Geschwindigkeitsbonus', depot: 'Günstigere Reparaturen' };

            const field = fieldMap[what];
            const current = railway[field];
            if (current >= 10) return interaction.reply({ content: '❌ Maximum erreicht!', ephemeral: true });

            const cost = costMap[what] * (current + 1);
            let balance = db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId);
            if (!balance || balance.balance < cost) return interaction.reply({ content: `❌ Kostet ${cost} Coins.`, ephemeral: true });

            db.db.prepare('UPDATE economy SET balance = balance - ? WHERE user_id = ?').run(cost, userId);
            db.db.prepare(`UPDATE railways SET ${field} = ${field} + 1 WHERE user_id = ?`).run(userId);

            return interaction.reply({ embeds: [new EmbedBuilder().setColor('#2F4F4F').setTitle(`⬆️ ${nameMap[what]} verbessert!`).setDescription(`Lv.${current} → Lv.${current + 1}\n${descMap[what]}\n💰 -${cost} Coins`)] });
        }

        if (sub === 'routen') {
            const rank = getRank(railway.prestige);
            const list = ROUTES.map(r => {
                const locked = rank < r.minRank;
                return `${locked ? '🔒' : '🛤️'} **${r.name}** ${locked ? `(Rang ${r.minRank})` : ''}\n📏 ${r.km} km | ⚠️ Schw.: ${r.difficulty} | 👥 ${Math.floor(r.passengerDemand * 100)}% | 📦 ${Math.floor(r.cargoDemand * 100)}%`;
            }).join('\n\n');

            const embed = new EmbedBuilder()
                .setColor('#2F4F4F')
                .setTitle('🗺️ Verfügbare Routen')
                .setDescription(list)
                .setFooter({ text: `Dein Rang: ${RANKS[rank].name}` });
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'verschrotten') {
            const trainId = interaction.options.getInteger('id');
            const train = db.db.prepare('SELECT * FROM trains WHERE id = ? AND user_id = ?').get(trainId, userId);
            if (!train) return interaction.reply({ content: '❌ Zug nicht gefunden!', ephemeral: true });

            const type = TRAIN_TYPES[train.train_type];
            const scrapValue = Math.floor((type?.cost || 100) * 0.3);

            let bal = db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId);
            if (!bal) db.db.prepare('INSERT INTO economy (user_id, balance) VALUES (?, 0)').run(userId);
            db.db.prepare('UPDATE economy SET balance = balance + ? WHERE user_id = ?').run(scrapValue, userId);
            db.db.prepare('DELETE FROM trains WHERE id = ?').run(trainId);

            return interaction.reply({ embeds: [new EmbedBuilder().setColor('#2F4F4F').setTitle('🗑️ Zug verschrottet').setDescription(`**${train.name}** wurde verschrottet.\n💰 +${scrapValue} Coins Schrottwert`)] });
        }
    }
};
