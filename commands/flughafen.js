const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

const cooldowns = new Map();

function ensureAirportTables() {
    db.db.exec(`
        CREATE TABLE IF NOT EXISTS airports (
            user_id TEXT PRIMARY KEY,
            airport_name TEXT DEFAULT 'Kleiner Flugplatz',
            rank INTEGER DEFAULT 0,
            reputation INTEGER DEFAULT 0,
            terminal_level INTEGER DEFAULT 1,
            runway_level INTEGER DEFAULT 1,
            tower_level INTEGER DEFAULT 1,
            lounge_level INTEGER DEFAULT 0,
            gates INTEGER DEFAULT 2,
            fuel_storage INTEGER DEFAULT 100,
            fuel_current INTEGER DEFAULT 50,
            total_flights INTEGER DEFAULT 0,
            total_passengers INTEGER DEFAULT 0,
            total_earned INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    db.db.exec(`
        CREATE TABLE IF NOT EXISTS airport_planes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            name TEXT DEFAULT 'Flieger',
            plane_type TEXT,
            capacity INTEGER DEFAULT 50,
            range_km INTEGER DEFAULT 500,
            speed INTEGER DEFAULT 400,
            condition_pct INTEGER DEFAULT 100,
            total_flights INTEGER DEFAULT 0,
            total_km INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

const RANKS = [
    { name: 'Flugplatz', rep: 0 },
    { name: 'Regionalflughafen', rep: 150 },
    { name: 'Stadtflughafen', rep: 400 },
    { name: 'Nationalflughafen', rep: 1000 },
    { name: 'Internationaler Flughafen', rep: 2500 },
    { name: 'Drehkreuz', rep: 5500 },
    { name: 'Megahub', rep: 12000 }
];

const PLANE_TYPES = {
    propeller: { name: '🛩️ Propellermaschine', capacity: 20, range: 500, speed: 300, cost: 500, minRank: 0 },
    regional: { name: '✈️ Regionaljet', capacity: 50, range: 1200, speed: 500, cost: 1500, minRank: 0 },
    kurzstrecke: { name: '🛫 Kurzstreckenjet', capacity: 120, range: 2500, speed: 700, cost: 4000, minRank: 1 },
    mittelstrecke: { name: '🛬 Mittelstreckenjet', capacity: 180, range: 5000, speed: 800, cost: 8000, minRank: 2 },
    langstrecke: { name: '🌍 Langstreckenjet', capacity: 280, range: 10000, speed: 850, cost: 15000, minRank: 3 },
    jumbo: { name: '✈️ Jumbo Jet', capacity: 400, range: 12000, speed: 900, cost: 30000, minRank: 4 },
    fracht: { name: '📦 Frachtflugzeug', capacity: 0, range: 8000, speed: 750, cost: 12000, minRank: 2, cargo: 200 },
    luxus: { name: '💎 Privatjet', capacity: 12, range: 9000, speed: 950, cost: 20000, minRank: 4 },
    superjumbo: { name: '🏆 A380 SuperJumbo', capacity: 550, range: 15000, speed: 900, cost: 50000, minRank: 5 },
    hypersonic: { name: '🚀 Hyperschall-Jet', capacity: 100, range: 20000, speed: 2500, cost: 100000, minRank: 6 }
};

const DESTINATIONS = [
    { id: 'regional', name: '🏘️ Regionaler Flug', km: 300, demand: 0.9, ticketBase: 30, minRank: 0 },
    { id: 'inland', name: '🇩🇪 Inlandsflug', km: 600, demand: 0.85, ticketBase: 60, minRank: 0 },
    { id: 'europa_kurz', name: '🇪🇺 Europa Kurzstrecke', km: 1500, demand: 0.8, ticketBase: 120, minRank: 1 },
    { id: 'europa_lang', name: '🌍 Europa Langstrecke', km: 3000, demand: 0.75, ticketBase: 200, minRank: 2 },
    { id: 'nordafrika', name: '🏜️ Nordafrika', km: 3500, demand: 0.7, ticketBase: 250, minRank: 2 },
    { id: 'nahost', name: '🕌 Naher Osten', km: 5000, demand: 0.65, ticketBase: 350, minRank: 3 },
    { id: 'asien', name: '🏯 Ostasien', km: 9000, demand: 0.6, ticketBase: 500, minRank: 4 },
    { id: 'amerika', name: '🗽 Nordamerika', km: 8000, demand: 0.7, ticketBase: 450, minRank: 4 },
    { id: 'suedamerika', name: '🌴 Südamerika', km: 11000, demand: 0.55, ticketBase: 550, minRank: 5 },
    { id: 'australien', name: '🦘 Australien', km: 16000, demand: 0.5, ticketBase: 700, minRank: 5 },
    { id: 'antarktis', name: '🧊 Antarktis', km: 14000, demand: 0.3, ticketBase: 1200, minRank: 6 }
];

const FLIGHT_EVENTS = [
    { text: '☀️ Perfektes Flugwetter! Alle Passagiere zufrieden.', passMod: 1.3, fuelMod: 0.9, condMod: 0 },
    { text: '🎉 VIP an Bord! Medienaufmerksamkeit garantiert.', passMod: 1.2, fuelMod: 1.0, condMod: 0 },
    { text: '✈️ Ruhiger Flug, pünktliche Landung.', passMod: 1.0, fuelMod: 1.0, condMod: 0 },
    { text: '🌧️ Leichter Regen, kurze Verspätung.', passMod: 0.95, fuelMod: 1.05, condMod: -2 },
    { text: '💨 Starker Gegenwind, Mehrverbrauch!', passMod: 0.9, fuelMod: 1.3, condMod: -3 },
    { text: '⛈️ Gewitter! Umleitung nötig.', passMod: 0.8, fuelMod: 1.4, condMod: -5 },
    { text: '🐦 Vogelschlag! Leichte Schäden.', passMod: 0.85, fuelMod: 1.0, condMod: -10 },
    { text: '⚠️ Technische Probleme, Notlandung!', passMod: 0.5, fuelMod: 1.5, condMod: -20 },
    { text: '📸 Influencer postet Foto — geht viral!', passMod: 1.4, fuelMod: 1.0, condMod: 0 },
    { text: '🌅 Atemberaubender Sonnenuntergang über den Wolken!', passMod: 1.1, fuelMod: 1.0, condMod: 0 }
];

const UPGRADES = {
    terminal: { field: 'terminal_level', name: '🏛️ Terminal', baseCost: 600, max: 10, desc: 'Mehr Passagiere' },
    runway: { field: 'runway_level', name: '🛫 Landebahn', baseCost: 800, max: 10, desc: 'Größere Flugzeuge' },
    tower: { field: 'tower_level', name: '🗼 Kontrollturm', baseCost: 500, max: 10, desc: 'Weniger Verspätungen' },
    lounge: { field: 'lounge_level', name: '🛋️ VIP Lounge', baseCost: 1000, max: 5, desc: 'Premium-Tickets' },
    gates: { field: 'gates', name: '🚪 Gates', baseCost: 400, max: 20, desc: '+2 Gates' },
    fuel: { field: 'fuel_storage', name: '⛽ Tanklager', baseCost: 350, max: 1000, desc: '+50 Kraftstoff' }
};

function getRank(rep) {
    for (let i = RANKS.length - 1; i >= 0; i--) {
        if (rep >= RANKS[i].rep) return i;
    }
    return 0;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('flughafen')
        .setDescription('✈️ Baue deinen eigenen Flughafen!')
        .addSubcommand(s => s.setName('status').setDescription('Zeige deinen Flughafen'))
        .addSubcommand(s => s.setName('umbenennen').setDescription('Benenne deinen Flughafen um')
            .addStringOption(o => o.setName('name').setDescription('Neuer Name').setRequired(true)))
        .addSubcommand(s => s.setName('kaufen').setDescription('Kaufe ein Flugzeug')
            .addStringOption(o => o.setName('typ').setDescription('Flugzeugtyp').setRequired(true)
                .addChoices(...Object.entries(PLANE_TYPES).slice(0, 10).map(([k, v]) => ({ name: v.name, value: k })))))
        .addSubcommand(s => s.setName('flotte').setDescription('Zeige deine Flugzeuge'))
        .addSubcommand(s => s.setName('flug').setDescription('Starte einen Flug')
            .addIntegerOption(o => o.setName('flugzeug').setDescription('Flugzeug-ID').setRequired(true))
            .addStringOption(o => o.setName('ziel').setDescription('Destination').setRequired(true)
                .addChoices(...DESTINATIONS.map(d => ({ name: d.name, value: d.id })))))
        .addSubcommand(s => s.setName('tanken').setDescription('Kaufe Treibstoff')
            .addIntegerOption(o => o.setName('menge').setDescription('Menge (1-100)').setRequired(true)))
        .addSubcommand(s => s.setName('reparieren').setDescription('Repariere ein Flugzeug')
            .addIntegerOption(o => o.setName('id').setDescription('Flugzeug-ID').setRequired(true)))
        .addSubcommand(s => s.setName('upgrade').setDescription('Verbessere deinen Flughafen')
            .addStringOption(o => o.setName('was').setDescription('Was upgraden').setRequired(true)
                .addChoices(...Object.entries(UPGRADES).map(([k, v]) => ({ name: v.name, value: k })))))
        .addSubcommand(s => s.setName('destinationen').setDescription('Zeige alle Flugziele'))
        .addSubcommand(s => s.setName('verschrotten').setDescription('Verschrotte ein Flugzeug')
            .addIntegerOption(o => o.setName('id').setDescription('Flugzeug-ID').setRequired(true))),

    async execute(interaction) {
        ensureAirportTables();
        const config = require('../config.json');
        const sub = interaction.options.getSubcommand();
        const userId = interaction.user.id;

        let airport = db.db.prepare('SELECT * FROM airports WHERE user_id = ?').get(userId);

        if (!airport && sub !== 'status') {
            return interaction.reply({ content: '❌ Benutze `/flughafen status` um deinen Flughafen zu bauen!', ephemeral: true });
        }

        if (sub === 'status') {
            if (!airport) {
                db.db.prepare('INSERT INTO airports (user_id) VALUES (?)').run(userId);
                airport = db.db.prepare('SELECT * FROM airports WHERE user_id = ?').get(userId);

                db.db.prepare('INSERT INTO airport_planes (user_id, name, plane_type, capacity, range_km, speed) VALUES (?, ?, ?, ?, ?, ?)')
                    .run(userId, 'Alte Propellermaschine', 'propeller', 20, 500, 300);

                const embed = new EmbedBuilder()
                    .setColor('#00BFFF')
                    .setTitle('✈️ Flughafen eröffnet!')
                    .setDescription('Dein **Kleiner Flugplatz** ist eröffnet!\n\nDu hast eine Propellermaschine erhalten.\nStarte deinen ersten Flug mit `/flughafen flug`!');
                return interaction.reply({ embeds: [embed] });
            }

            const rank = getRank(airport.reputation);
            const nextRank = rank < RANKS.length - 1 ? RANKS[rank + 1] : null;
            const planeCount = db.db.prepare('SELECT COUNT(*) as cnt FROM airport_planes WHERE user_id = ?').get(userId).cnt;

            const embed = new EmbedBuilder()
                .setColor('#00BFFF')
                .setTitle(`✈️ ${airport.airport_name}`)
                .setDescription(`**${RANKS[rank].name}** (Rang ${rank})\n${nextRank ? `Nächster: ${nextRank.name} (${airport.reputation}/${nextRank.rep} Rep)` : '👑 MAXIMALER RANG!'}`)
                .addFields(
                    { name: '⭐ Reputation', value: `${airport.reputation}`, inline: true },
                    { name: '✈️ Flugzeuge', value: `${planeCount}`, inline: true },
                    { name: '🛫 Flüge', value: `${airport.total_flights}`, inline: true },
                    { name: '🏛️ Terminal', value: `Lv.${airport.terminal_level}`, inline: true },
                    { name: '🛫 Landebahn', value: `Lv.${airport.runway_level}`, inline: true },
                    { name: '🗼 Tower', value: `Lv.${airport.tower_level}`, inline: true },
                    { name: '🛋️ Lounge', value: airport.lounge_level > 0 ? `Lv.${airport.lounge_level}` : '❌', inline: true },
                    { name: '🚪 Gates', value: `${airport.gates}`, inline: true },
                    { name: '⛽ Treibstoff', value: `${airport.fuel_current}/${airport.fuel_storage}`, inline: true },
                    { name: '👥 Passagiere', value: `${airport.total_passengers}`, inline: true },
                    { name: '💰 Verdient', value: `${airport.total_earned}`, inline: true }
                );
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'umbenennen') {
            const name = interaction.options.getString('name');
            if (name.length > 30) return interaction.reply({ content: '❌ Max. 30 Zeichen!', ephemeral: true });
            db.db.prepare('UPDATE airports SET airport_name = ? WHERE user_id = ?').run(name, userId);
            return interaction.reply({ embeds: [new EmbedBuilder().setColor('#00BFFF').setTitle('✈️ Umbenannt!').setDescription(`Dein Flughafen heißt jetzt **${name}**!`)] });
        }

        if (sub === 'kaufen') {
            const typeId = interaction.options.getString('typ');
            const type = PLANE_TYPES[typeId];
            const rank = getRank(airport.reputation);
            if (rank < type.minRank) return interaction.reply({ content: `❌ Braucht Rang ${type.minRank} (${RANKS[type.minRank].name}).`, ephemeral: true });

            const maxPlanes = airport.gates;
            const planeCount = db.db.prepare('SELECT COUNT(*) as cnt FROM airport_planes WHERE user_id = ?').get(userId).cnt;
            if (planeCount >= maxPlanes) return interaction.reply({ content: `❌ Kein freies Gate! ${planeCount}/${maxPlanes}. Baue mehr Gates.`, ephemeral: true });

            let balance = db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId);
            if (!balance || balance.balance < type.cost) return interaction.reply({ content: `❌ Kostet ${type.cost} Coins.`, ephemeral: true });

            db.db.prepare('UPDATE economy SET balance = balance - ? WHERE user_id = ?').run(type.cost, userId);
            db.db.prepare('INSERT INTO airport_planes (user_id, name, plane_type, capacity, range_km, speed) VALUES (?, ?, ?, ?, ?, ?)')
                .run(userId, type.name, typeId, type.capacity, type.range, type.speed);

            const embed = new EmbedBuilder()
                .setColor('#00BFFF')
                .setTitle('✈️ Neues Flugzeug!')
                .setDescription(`**${type.name}** gekauft!\n\n👥 Kapazität: ${type.capacity}${type.cargo ? ` | 📦 Fracht: ${type.cargo}t` : ''}\n📏 Reichweite: ${type.range} km\n⚡ Speed: ${type.speed} km/h\n💰 -${type.cost} Coins`);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'flotte') {
            const planes = db.db.prepare('SELECT * FROM airport_planes WHERE user_id = ? ORDER BY capacity DESC').all(userId);
            if (planes.length === 0) return interaction.reply({ content: '❌ Keine Flugzeuge!', ephemeral: true });

            const list = planes.map(p => {
                const condBar = '█'.repeat(Math.floor(p.condition_pct / 10)) + '░'.repeat(10 - Math.floor(p.condition_pct / 10));
                return `**#${p.id} ${p.name}**\n👥 ${p.capacity} | 📏 ${p.range_km} km | ⚡ ${p.speed} km/h\n🔧 [${condBar}] ${p.condition_pct}% | ✈️ ${p.total_flights} Flüge | ${p.total_km} km`;
            }).join('\n\n');

            return interaction.reply({ embeds: [new EmbedBuilder().setColor('#00BFFF').setTitle('✈️ Deine Flotte').setDescription(list)] });
        }

        if (sub === 'flug') {
            const cdKey = `airport_flight_${userId}`;
            if (cooldowns.has(cdKey) && cooldowns.get(cdKey) > Date.now()) {
                const left = Math.ceil((cooldowns.get(cdKey) - Date.now()) / 1000);
                return interaction.reply({ content: `⏳ Nächster Flug in ${left}s.`, ephemeral: true });
            }

            const planeId = interaction.options.getInteger('flugzeug');
            const destId = interaction.options.getString('ziel');
            const plane = db.db.prepare('SELECT * FROM airport_planes WHERE id = ? AND user_id = ?').get(planeId, userId);
            if (!plane) return interaction.reply({ content: '❌ Flugzeug nicht gefunden!', ephemeral: true });

            const dest = DESTINATIONS.find(d => d.id === destId);
            const rank = getRank(airport.reputation);
            if (rank < dest.minRank) return interaction.reply({ content: `❌ Braucht Rang ${dest.minRank}.`, ephemeral: true });
            if (plane.range_km < dest.km) return interaction.reply({ content: `❌ Reichweite zu gering! ${plane.range_km}/${dest.km} km.`, ephemeral: true });
            if (plane.condition_pct < 15) return interaction.reply({ content: '❌ Flugzeug muss repariert werden!', ephemeral: true });

            const fuelNeeded = Math.ceil(dest.km / 100);
            if (airport.fuel_current < fuelNeeded) return interaction.reply({ content: `❌ Nicht genug Treibstoff! ${airport.fuel_current}/${fuelNeeded}`, ephemeral: true });

            const event = FLIGHT_EVENTS[Math.floor(Math.random() * FLIGHT_EVENTS.length)];

            const terminalBonus = 1 + airport.terminal_level * 0.06;
            const towerBonus = 1 + airport.tower_level * 0.03;
            const condFactor = plane.condition_pct / 100;
            const loungeBonus = airport.lounge_level > 0 ? 1 + airport.lounge_level * 0.1 : 1;

            const passengers = Math.min(plane.capacity, Math.floor(
                plane.capacity * dest.demand * terminalBonus * condFactor * event.passMod * (0.7 + Math.random() * 0.6)
            ));

            const ticketPrice = Math.floor(dest.ticketBase * loungeBonus * towerBonus);
            const revenue = passengers * ticketPrice;
            const fuelUsed = Math.ceil(fuelNeeded * event.fuelMod);
            const condLoss = Math.max(2, 5 + Math.floor(dest.km / 1000) + Math.abs(event.condMod));
            const flightTime = Math.floor(dest.km / plane.speed * 60);

            db.db.prepare('UPDATE airports SET fuel_current = MAX(0, fuel_current - ?), total_flights = total_flights + 1, total_passengers = total_passengers + ?, total_earned = total_earned + ?, reputation = reputation + ? WHERE user_id = ?')
                .run(fuelUsed, passengers, revenue, Math.floor(dest.km * 0.02 + passengers * 0.05), userId);
            db.db.prepare('UPDATE airport_planes SET condition_pct = MAX(0, condition_pct - ?), total_flights = total_flights + 1, total_km = total_km + ? WHERE id = ?')
                .run(condLoss, dest.km, planeId);

            let bal = db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId);
            if (!bal) db.db.prepare('INSERT INTO economy (user_id, balance) VALUES (?, 0)').run(userId);
            db.db.prepare('UPDATE economy SET balance = balance + ? WHERE user_id = ?').run(revenue, userId);

            const repGain = Math.floor(dest.km * 0.02 + passengers * 0.05);
            const fillPct = plane.capacity > 0 ? Math.floor((passengers / plane.capacity) * 100) : 0;
            const fillBar = '█'.repeat(Math.floor(fillPct / 10)) + '░'.repeat(10 - Math.floor(fillPct / 10));

            const embed = new EmbedBuilder()
                .setColor(passengers > plane.capacity * 0.7 ? '#00aa00' : '#ffaa00')
                .setTitle(`✈️ ${plane.name} → ${dest.name}`)
                .setDescription(`${event.text}\n\n📏 Distanz: ${dest.km} km | ⏱️ Flugzeit: ${flightTime} min\n👥 Passagiere: **${passengers}/${plane.capacity}** [${fillBar}] ${fillPct}%\n\n🎟️ Ticketpreis: ${ticketPrice} Coins\n💰 **Einnahmen: ${revenue} Coins**\n⛽ Verbrauch: ${fuelUsed} (→ ${Math.max(0, airport.fuel_current - fuelUsed)})\n🔧 Zustand: -${condLoss}% (→ ${Math.max(0, plane.condition_pct - condLoss)}%)\n⭐ +${repGain} Reputation`);

            cooldowns.set(cdKey, Date.now() + 60000);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'tanken') {
            const menge = interaction.options.getInteger('menge');
            if (menge < 1 || menge > 100) return interaction.reply({ content: '❌ Menge: 1-100!', ephemeral: true });
            if (airport.fuel_current + menge > airport.fuel_storage) return interaction.reply({ content: `❌ Tanklager voll! ${airport.fuel_current}/${airport.fuel_storage}. Upgrade dein Tanklager.`, ephemeral: true });

            const cost = menge * 8;
            let balance = db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId);
            if (!balance || balance.balance < cost) return interaction.reply({ content: `❌ Kostet ${cost} Coins.`, ephemeral: true });

            db.db.prepare('UPDATE economy SET balance = balance - ? WHERE user_id = ?').run(cost, userId);
            db.db.prepare('UPDATE airports SET fuel_current = fuel_current + ? WHERE user_id = ?').run(menge, userId);

            return interaction.reply({ embeds: [new EmbedBuilder().setColor('#00BFFF').setTitle('⛽ Aufgetankt!').setDescription(`+${menge} Treibstoff (→ ${airport.fuel_current + menge}/${airport.fuel_storage})\n💰 -${cost} Coins`)] });
        }

        if (sub === 'reparieren') {
            const planeId = interaction.options.getInteger('id');
            const plane = db.db.prepare('SELECT * FROM airport_planes WHERE id = ? AND user_id = ?').get(planeId, userId);
            if (!plane) return interaction.reply({ content: '❌ Flugzeug nicht gefunden!', ephemeral: true });
            if (plane.condition_pct >= 100) return interaction.reply({ content: '✅ Flugzeug ist in Top-Zustand!', ephemeral: true });

            const type = PLANE_TYPES[plane.plane_type];
            const repairCost = Math.floor((100 - plane.condition_pct) * (type?.cost || 500) * 0.005);

            let balance = db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId);
            if (!balance || balance.balance < repairCost) return interaction.reply({ content: `❌ Reparatur kostet ${repairCost} Coins.`, ephemeral: true });

            db.db.prepare('UPDATE economy SET balance = balance - ? WHERE user_id = ?').run(repairCost, userId);
            db.db.prepare('UPDATE airport_planes SET condition_pct = 100 WHERE id = ?').run(planeId);

            return interaction.reply({ embeds: [new EmbedBuilder().setColor('#00BFFF').setTitle('🔧 Repariert!').setDescription(`**${plane.name}**: ${plane.condition_pct}% → 100%\n💰 -${repairCost} Coins`)] });
        }

        if (sub === 'upgrade') {
            const what = interaction.options.getString('was');
            const upgrade = UPGRADES[what];
            const current = airport[upgrade.field];

            if (what === 'gates') {
                if (current >= upgrade.max) return interaction.reply({ content: '❌ Maximum!', ephemeral: true });
                const cost = upgrade.baseCost * Math.floor(current / 2 + 1);
                let balance = db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId);
                if (!balance || balance.balance < cost) return interaction.reply({ content: `❌ Kostet ${cost} Coins.`, ephemeral: true });
                db.db.prepare('UPDATE economy SET balance = balance - ? WHERE user_id = ?').run(cost, userId);
                db.db.prepare('UPDATE airports SET gates = gates + 2 WHERE user_id = ?').run(userId);
                return interaction.reply({ embeds: [new EmbedBuilder().setColor('#00BFFF').setTitle('🚪 Gates erweitert!').setDescription(`${current} → ${current + 2} Gates\n💰 -${cost} Coins`)] });
            }

            if (what === 'fuel') {
                if (current >= upgrade.max) return interaction.reply({ content: '❌ Maximum!', ephemeral: true });
                const cost = upgrade.baseCost * Math.floor(current / 50);
                let balance = db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId);
                if (!balance || balance.balance < cost) return interaction.reply({ content: `❌ Kostet ${cost} Coins.`, ephemeral: true });
                db.db.prepare('UPDATE economy SET balance = balance - ? WHERE user_id = ?').run(cost, userId);
                db.db.prepare('UPDATE airports SET fuel_storage = fuel_storage + 50 WHERE user_id = ?').run(userId);
                return interaction.reply({ embeds: [new EmbedBuilder().setColor('#00BFFF').setTitle('⛽ Tanklager erweitert!').setDescription(`${current} → ${current + 50} Kapazität\n💰 -${cost} Coins`)] });
            }

            if (current >= upgrade.max) return interaction.reply({ content: '❌ Maximum!', ephemeral: true });
            const cost = upgrade.baseCost * (current + 1);
            let balance = db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId);
            if (!balance || balance.balance < cost) return interaction.reply({ content: `❌ Kostet ${cost} Coins.`, ephemeral: true });

            db.db.prepare('UPDATE economy SET balance = balance - ? WHERE user_id = ?').run(cost, userId);
            db.db.prepare(`UPDATE airports SET ${upgrade.field} = ${upgrade.field} + 1 WHERE user_id = ?`).run(userId);

            return interaction.reply({ embeds: [new EmbedBuilder().setColor('#00BFFF').setTitle(`⬆️ ${upgrade.name} verbessert!`).setDescription(`Lv.${current} → Lv.${current + 1}\n${upgrade.desc}\n💰 -${cost} Coins`)] });
        }

        if (sub === 'destinationen') {
            const rank = getRank(airport.reputation);
            const list = DESTINATIONS.map(d => {
                const locked = rank < d.minRank;
                return `${locked ? '🔒' : '🌍'} **${d.name}** ${locked ? `(Rang ${d.minRank})` : ''}\n📏 ${d.km} km | 🎟️ ${d.ticketBase} Coins | 📊 Nachfrage: ${Math.floor(d.demand * 100)}%`;
            }).join('\n\n');

            return interaction.reply({ embeds: [new EmbedBuilder().setColor('#00BFFF').setTitle('🗺️ Flugziele').setDescription(list).setFooter({ text: `Rang: ${RANKS[rank].name}` })] });
        }

        if (sub === 'verschrotten') {
            const planeId = interaction.options.getInteger('id');
            const plane = db.db.prepare('SELECT * FROM airport_planes WHERE id = ? AND user_id = ?').get(planeId, userId);
            if (!plane) return interaction.reply({ content: '❌ Flugzeug nicht gefunden!', ephemeral: true });

            const type = PLANE_TYPES[plane.plane_type];
            const scrapValue = Math.floor((type?.cost || 200) * 0.25);

            let bal = db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId);
            if (!bal) db.db.prepare('INSERT INTO economy (user_id, balance) VALUES (?, 0)').run(userId);
            db.db.prepare('UPDATE economy SET balance = balance + ? WHERE user_id = ?').run(scrapValue, userId);
            db.db.prepare('DELETE FROM airport_planes WHERE id = ?').run(planeId);

            return interaction.reply({ embeds: [new EmbedBuilder().setColor('#00BFFF').setTitle('🗑️ Verschrottet').setDescription(`**${plane.name}** verschrottet.\n💰 +${scrapValue} Coins`)] });
        }
    }
};
