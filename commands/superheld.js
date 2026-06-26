const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

const cooldowns = new Map();

function ensureHeroTables() {
    db.db.exec(`
        CREATE TABLE IF NOT EXISTS superheroes (
            user_id TEXT PRIMARY KEY,
            hero_name TEXT DEFAULT 'Unbekannter Held',
            origin TEXT DEFAULT '',
            rank INTEGER DEFAULT 0,
            fame INTEGER DEFAULT 0,
            strength INTEGER DEFAULT 5,
            speed INTEGER DEFAULT 5,
            intelligence INTEGER DEFAULT 5,
            durability INTEGER DEFAULT 5,
            energy INTEGER DEFAULT 100,
            max_energy INTEGER DEFAULT 100,
            citizens_saved INTEGER DEFAULT 0,
            villains_defeated INTEGER DEFAULT 0,
            missions_completed INTEGER DEFAULT 0,
            total_earned INTEGER DEFAULT 0,
            streak INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    db.db.exec(`
        CREATE TABLE IF NOT EXISTS hero_powers (
            user_id TEXT,
            power_id TEXT,
            level INTEGER DEFAULT 1,
            PRIMARY KEY (user_id, power_id)
        )
    `);
}

const RANKS = [
    { name: 'Stadtteil-Held', fame: 0 },
    { name: 'Lokaler Held', fame: 150 },
    { name: 'Stadtbeschützer', fame: 400 },
    { name: 'Regionalheld', fame: 900 },
    { name: 'Nationalheld', fame: 2000 },
    { name: 'Weltheld', fame: 4500 },
    { name: 'Legendärer Held', fame: 9000 },
    { name: 'Kosmischer Wächter', fame: 18000 }
];

const ORIGINS = {
    mutation: { name: '🧬 Mutation', desc: 'Genetische Superkräfte', bonusStat: 'strength', bonus: 3 },
    technik: { name: '🔧 Technik', desc: 'Hightech-Anzug und Gadgets', bonusStat: 'intelligence', bonus: 3 },
    magie: { name: '✨ Magie', desc: 'Mystische Kräfte', bonusStat: 'energy', bonus: 20 },
    alien: { name: '👽 Außerirdisch', desc: 'Kräfte von einem anderen Planeten', bonusStat: 'durability', bonus: 3 },
    experiment: { name: '⚗️ Experiment', desc: 'Laborunfall mit Superkräften', bonusStat: 'speed', bonus: 3 }
};

const POWERS = {
    superstaerke: { name: '💪 Superstärke', desc: 'Unglaubliche Kraft', cost: 200, stat: 'strength', bonus: 4 },
    flug: { name: '🦅 Flug', desc: 'Durch die Lüfte gleiten', cost: 300, stat: 'speed', bonus: 3 },
    unsichtbarkeit: { name: '👻 Unsichtbarkeit', desc: 'Verschwinde im Nichts', cost: 250, stat: 'intelligence', bonus: 3 },
    laserblick: { name: '👁️ Laserblick', desc: 'Vernichtende Augenstrahlen', cost: 400, stat: 'strength', bonus: 5 },
    schutzschild: { name: '🛡️ Schutzschild', desc: 'Energiebarriere', cost: 350, stat: 'durability', bonus: 5 },
    teleportation: { name: '🌀 Teleportation', desc: 'Sofortige Ortswechsel', cost: 500, stat: 'speed', bonus: 6 },
    gedankenkontrolle: { name: '🧠 Gedankenkontrolle', desc: 'Kontrolliere schwache Gegner', cost: 600, stat: 'intelligence', bonus: 6 },
    zeitlupe: { name: '⏱️ Zeitlupe', desc: 'Verlangsame die Zeit', cost: 800, stat: 'speed', bonus: 8 },
    elementarkraft: { name: '🌪️ Elementarkraft', desc: 'Kontrolliere die Elemente', cost: 1000, stat: 'strength', bonus: 8 },
    unsterblichkeit: { name: '♾️ Regeneration', desc: 'Heile jede Wunde', cost: 1500, stat: 'durability', bonus: 10 }
};

const VILLAINS = [
    { name: 'Taschendieb', power: 8, reward: [50, 150], fame: 5, minRank: 0 },
    { name: 'Bankräuber-Bande', power: 15, reward: [100, 300], fame: 10, minRank: 0 },
    { name: 'Der Pyromane', power: 25, reward: [200, 500], fame: 20, minRank: 1 },
    { name: 'Doktor Chaos', power: 35, reward: [400, 900], fame: 35, minRank: 2 },
    { name: 'Die Schattenkönigin', power: 48, reward: [600, 1500], fame: 50, minRank: 3 },
    { name: 'Mecha-Titan', power: 60, reward: [1000, 2500], fame: 75, minRank: 4 },
    { name: 'Lord Finsternis', power: 75, reward: [1500, 4000], fame: 100, minRank: 5 },
    { name: 'Der Weltverschlinger', power: 90, reward: [3000, 8000], fame: 150, minRank: 6 },
    { name: 'Omega', power: 120, reward: [5000, 15000], fame: 250, minRank: 7 }
];

const CRISES = [
    { text: '🔥 Ein Gebäude brennt! Rette die Bewohner!', stat: 'speed', difficulty: 10, saved: [3, 8], fame: 8 },
    { text: '🌊 Überschwemmung! Baue einen Damm!', stat: 'strength', difficulty: 15, saved: [5, 15], fame: 12 },
    { text: '🚗 Massenkarambolage auf der Autobahn!', stat: 'speed', difficulty: 20, saved: [8, 20], fame: 18 },
    { text: '💣 Bombe im Stadtzentrum!', stat: 'intelligence', difficulty: 25, saved: [10, 30], fame: 25 },
    { text: '🌋 Vulkanausbruch nahe der Stadt!', stat: 'durability', difficulty: 35, saved: [20, 50], fame: 40 },
    { text: '☄️ Meteor rast auf die Stadt zu!', stat: 'strength', difficulty: 50, saved: [50, 200], fame: 60 },
    { text: '🌀 Dimensionsportal öffnet sich!', stat: 'intelligence', difficulty: 60, saved: [100, 500], fame: 80 },
    { text: '🕳️ Schwarzes Loch über der Stadt!', stat: 'durability', difficulty: 80, saved: [200, 1000], fame: 120 }
];

const BATTLE_EVENTS = [
    { text: '💥 Kritischer Treffer!', mod: 1.5 },
    { text: '⚡ Superkraft-Combo!', mod: 1.4 },
    { text: '🦸 Heldenhafter Moment!', mod: 1.3 },
    { text: '👊 Solider Angriff.', mod: 1.0 },
    { text: '😰 Der Villain kontert!', mod: 0.7 },
    { text: '💀 Hinterhaltsangriff!', mod: 0.6 }
];

function getRank(fame) {
    for (let i = RANKS.length - 1; i >= 0; i--) {
        if (fame >= RANKS[i].fame) return i;
    }
    return 0;
}

function getHeroPower(hero, powers) {
    let total = hero.strength + hero.speed + hero.intelligence + hero.durability;
    for (const p of powers) {
        const info = POWERS[p.power_id];
        if (info) total += info.bonus * p.level;
    }
    return total;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('superheld')
        .setDescription('🦸 Werde ein Superheld und beschütze die Stadt!')
        .addSubcommand(s => s.setName('profil').setDescription('Zeige dein Heldenprofil'))
        .addSubcommand(s => s.setName('origin').setDescription('Wähle deinen Ursprung')
            .addStringOption(o => o.setName('ursprung').setDescription('Dein Ursprung').setRequired(true)
                .addChoices(...Object.entries(ORIGINS).map(([k, v]) => ({ name: v.name, value: k })))))
        .addSubcommand(s => s.setName('name').setDescription('Wähle deinen Heldennamen')
            .addStringOption(o => o.setName('heldenname').setDescription('Dein Heldenname').setRequired(true)))
        .addSubcommand(s => s.setName('kampf').setDescription('Kämpfe gegen einen Bösewicht')
            .addIntegerOption(o => o.setName('villain').setDescription('Villain-Nr (1-9)').setRequired(true)))
        .addSubcommand(s => s.setName('rettung').setDescription('Rette Bürger aus einer Krise'))
        .addSubcommand(s => s.setName('trainieren').setDescription('Trainiere einen Stat')
            .addStringOption(o => o.setName('stat').setDescription('Welcher Stat').setRequired(true)
                .addChoices(
                    { name: '💪 Stärke', value: 'strength' },
                    { name: '⚡ Geschwindigkeit', value: 'speed' },
                    { name: '🧠 Intelligenz', value: 'intelligence' },
                    { name: '🛡️ Ausdauer', value: 'durability' }
                )))
        .addSubcommand(s => s.setName('kraeft').setDescription('Zeige verfügbare Superkräfte'))
        .addSubcommand(s => s.setName('lernen').setDescription('Erlerne eine Superkraft')
            .addStringOption(o => o.setName('kraft').setDescription('Die Kraft').setRequired(true)
                .addChoices(...Object.entries(POWERS).map(([k, v]) => ({ name: v.name, value: k })))))
        .addSubcommand(s => s.setName('duell').setDescription('Helden-Duell gegen einen Spieler')
            .addUserOption(o => o.setName('gegner').setDescription('Dein Gegner').setRequired(true))),

    async execute(interaction) {
        ensureHeroTables();
        const config = require('../config.json');
        const sub = interaction.options.getSubcommand();
        const userId = interaction.user.id;

        let hero = db.db.prepare('SELECT * FROM superheroes WHERE user_id = ?').get(userId);

        if (!hero && sub !== 'profil' && sub !== 'origin') {
            return interaction.reply({ content: '❌ Benutze `/superheld profil` um ein Superheld zu werden!', ephemeral: true });
        }

        if (sub === 'profil') {
            if (!hero) {
                db.db.prepare('INSERT INTO superheroes (user_id) VALUES (?)').run(userId);
                const embed = new EmbedBuilder()
                    .setColor('#0066ff')
                    .setTitle('🦸 Superheld erwacht!')
                    .setDescription('Deine Kräfte erwachen...\n\nWähle deinen Ursprung mit `/superheld origin`\nund deinen Heldennamen mit `/superheld name`!');
                return interaction.reply({ embeds: [embed] });
            }

            const rank = getRank(hero.fame);
            const nextRank = rank < RANKS.length - 1 ? RANKS[rank + 1] : null;
            const powers = db.db.prepare('SELECT * FROM hero_powers WHERE user_id = ?').all(userId);
            const totalPower = getHeroPower(hero, powers);
            const originInfo = ORIGINS[hero.origin];

            const embed = new EmbedBuilder()
                .setColor('#0066ff')
                .setTitle(`🦸 ${hero.hero_name}`)
                .setDescription(`**${RANKS[rank].name}** (Rang ${rank})\n${nextRank ? `Nächster: ${nextRank.name} (${hero.fame}/${nextRank.fame} Ruhm)` : '👑 MAXIMALER RANG!'}\n${originInfo ? `Ursprung: ${originInfo.name}` : '⚠️ Kein Ursprung gewählt'}`)
                .addFields(
                    { name: '⭐ Ruhm', value: `${hero.fame}`, inline: true },
                    { name: '⚡ Energie', value: `${hero.energy}/${hero.max_energy}`, inline: true },
                    { name: '💥 Kampfkraft', value: `${totalPower}`, inline: true },
                    { name: '💪 Stärke', value: `${hero.strength}`, inline: true },
                    { name: '⚡ Speed', value: `${hero.speed}`, inline: true },
                    { name: '🧠 Intelligenz', value: `${hero.intelligence}`, inline: true },
                    { name: '🛡️ Ausdauer', value: `${hero.durability}`, inline: true },
                    { name: '🔥 Streak', value: `${hero.streak}`, inline: true },
                    { name: '📊 Statistiken', value: `👥 Gerettet: ${hero.citizens_saved}\n💀 Besiegt: ${hero.villains_defeated}\n🎯 Missionen: ${hero.missions_completed}\n💰 Verdient: ${hero.total_earned}`, inline: true }
                );

            if (powers.length > 0) {
                embed.addFields({ name: '🌟 Superkräfte', value: powers.map(p => `${POWERS[p.power_id]?.name || p.power_id} Lv.${p.level}`).join(', ') });
            }
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'origin') {
            if (hero && hero.origin) {
                return interaction.reply({ content: '❌ Du hast bereits einen Ursprung gewählt!', ephemeral: true });
            }
            const originId = interaction.options.getString('ursprung');
            const origin = ORIGINS[originId];

            if (!hero) db.db.prepare('INSERT INTO superheroes (user_id) VALUES (?)').run(userId);

            if (origin.bonusStat === 'energy') {
                db.db.prepare('UPDATE superheroes SET origin = ?, max_energy = max_energy + ?, energy = energy + ? WHERE user_id = ?').run(originId, origin.bonus, origin.bonus, userId);
            } else {
                db.db.prepare(`UPDATE superheroes SET origin = ?, ${origin.bonusStat} = ${origin.bonusStat} + ? WHERE user_id = ?`).run(originId, origin.bonus, userId);
            }

            const embed = new EmbedBuilder()
                .setColor('#0066ff')
                .setTitle(`${origin.name} — Ursprung gewählt!`)
                .setDescription(`${origin.desc}\n\n✨ Bonus: +${origin.bonus} ${origin.bonusStat === 'energy' ? 'Max-Energie' : origin.bonusStat}`);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'name') {
            const name = interaction.options.getString('heldenname');
            if (name.length > 25) return interaction.reply({ content: '❌ Name max. 25 Zeichen!', ephemeral: true });
            db.db.prepare('UPDATE superheroes SET hero_name = ? WHERE user_id = ?').run(name, userId);
            const embed = new EmbedBuilder()
                .setColor('#0066ff')
                .setTitle('🦸 Heldenname gesetzt!')
                .setDescription(`Von nun an bist du bekannt als **${name}**!`);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'kampf') {
            const cdKey = `hero_fight_${userId}`;
            if (cooldowns.has(cdKey) && cooldowns.get(cdKey) > Date.now()) {
                const left = Math.ceil((cooldowns.get(cdKey) - Date.now()) / 1000);
                return interaction.reply({ content: `⏳ Kampf-Cooldown: ${left}s`, ephemeral: true });
            }

            const villainIdx = interaction.options.getInteger('villain') - 1;
            if (villainIdx < 0 || villainIdx >= VILLAINS.length) return interaction.reply({ content: '❌ Ungültige Villain-Nr!', ephemeral: true });

            const villain = VILLAINS[villainIdx];
            const rank = getRank(hero.fame);
            if (rank < villain.minRank) return interaction.reply({ content: `❌ Du brauchst Rang ${villain.minRank} (${RANKS[villain.minRank].name}).`, ephemeral: true });

            if (hero.energy < 20) return interaction.reply({ content: '❌ Nicht genug Energie! Warte oder trainiere.', ephemeral: true });

            const powers = db.db.prepare('SELECT * FROM hero_powers WHERE user_id = ?').all(userId);
            const heroPower = getHeroPower(hero, powers);

            const rounds = [];
            let heroHp = 100 + hero.durability * 5;
            let villainHp = villain.power * 3;

            for (let i = 0; i < 5 && heroHp > 0 && villainHp > 0; i++) {
                const event = BATTLE_EVENTS[Math.floor(Math.random() * BATTLE_EVENTS.length)];
                const heroDmg = Math.max(1, Math.floor(heroPower * 0.8 * event.mod * (0.8 + Math.random() * 0.4)));
                const villainDmg = Math.max(1, Math.floor(villain.power * 0.6 * (0.8 + Math.random() * 0.4)));

                villainHp -= heroDmg;
                rounds.push(`⚔️ R${i + 1}: ${event.text} (-${heroDmg} HP an ${villain.name})`);
                if (villainHp > 0) {
                    heroHp -= villainDmg;
                    rounds.push(`💀 R${i + 1}: ${villain.name} schlägt zurück! (-${villainDmg} HP)`);
                }
            }

            const won = villainHp <= 0;
            const embed = new EmbedBuilder()
                .setTitle(`🦸 ${hero.hero_name} vs ${villain.name}`);

            db.db.prepare('UPDATE superheroes SET energy = MAX(0, energy - 20) WHERE user_id = ?').run(userId);

            if (won) {
                const reward = villain.reward[0] + Math.floor(Math.random() * (villain.reward[1] - villain.reward[0]));
                const streakBonus = Math.floor(reward * hero.streak * 0.03);
                const total = reward + streakBonus;

                let bal = db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId);
                if (!bal) db.db.prepare('INSERT INTO economy (user_id, balance) VALUES (?, 0)').run(userId);
                db.db.prepare('UPDATE economy SET balance = balance + ? WHERE user_id = ?').run(total, userId);
                db.db.prepare('UPDATE superheroes SET fame = fame + ?, villains_defeated = villains_defeated + 1, missions_completed = missions_completed + 1, total_earned = total_earned + ?, streak = streak + 1 WHERE user_id = ?')
                    .run(villain.fame, total, userId);

                embed.setColor('#00ff00')
                    .setDescription(rounds.join('\n') + `\n\n🏆 **SIEG!**\n💰 +${total} Coins${streakBonus > 0 ? ` (${streakBonus} Streak-Bonus)` : ''}\n⭐ +${villain.fame} Ruhm\n🔥 Streak: ${hero.streak + 1}`);
            } else {
                db.db.prepare('UPDATE superheroes SET streak = 0 WHERE user_id = ?').run(userId);
                embed.setColor('#ff0000')
                    .setDescription(rounds.join('\n') + `\n\n💀 **NIEDERLAGE!**\n${villain.name} war zu stark...\n🔥 Streak zurückgesetzt!`);
            }

            cooldowns.set(cdKey, Date.now() + 50000);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'rettung') {
            const cdKey = `hero_rescue_${userId}`;
            if (cooldowns.has(cdKey) && cooldowns.get(cdKey) > Date.now()) {
                const left = Math.ceil((cooldowns.get(cdKey) - Date.now()) / 1000);
                return interaction.reply({ content: `⏳ Rettungs-Cooldown: ${left}s`, ephemeral: true });
            }

            if (hero.energy < 15) return interaction.reply({ content: '❌ Nicht genug Energie!', ephemeral: true });

            const crisis = CRISES[Math.floor(Math.random() * CRISES.length)];
            const statValue = hero[crisis.stat];
            const d20 = Math.floor(Math.random() * 20) + 1;
            const roll = d20 + Math.floor(statValue / 2);
            const success = roll >= crisis.difficulty;

            const embed = new EmbedBuilder().setTitle('🚨 Krise!');
            db.db.prepare('UPDATE superheroes SET energy = MAX(0, energy - 15) WHERE user_id = ?').run(userId);

            if (success) {
                const saved = crisis.saved[0] + Math.floor(Math.random() * (crisis.saved[1] - crisis.saved[0]));
                const reward = saved * 10;

                let bal = db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId);
                if (!bal) db.db.prepare('INSERT INTO economy (user_id, balance) VALUES (?, 0)').run(userId);
                db.db.prepare('UPDATE economy SET balance = balance + ? WHERE user_id = ?').run(reward, userId);
                db.db.prepare('UPDATE superheroes SET fame = fame + ?, citizens_saved = citizens_saved + ?, missions_completed = missions_completed + 1, total_earned = total_earned + ? WHERE user_id = ?')
                    .run(crisis.fame, saved, reward, userId);

                embed.setColor('#00ff00')
                    .setDescription(`${crisis.text}\n\n🎲 Würfel: **${d20}** + ${crisis.stat}: **${Math.floor(statValue / 2)}** = **${roll}** vs **${crisis.difficulty}**\n\n✅ **Rettung erfolgreich!**\n👥 ${saved} Bürger gerettet!\n💰 +${reward} Coins | ⭐ +${crisis.fame} Ruhm`);
            } else {
                embed.setColor('#ff6600')
                    .setDescription(`${crisis.text}\n\n🎲 Würfel: **${d20}** + ${crisis.stat}: **${Math.floor(statValue / 2)}** = **${roll}** vs **${crisis.difficulty}**\n\n❌ **Nicht geschafft!**\nDu konntest nicht genug tun... Trainiere weiter!`);
            }

            cooldowns.set(cdKey, Date.now() + 45000);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'trainieren') {
            const cdKey = `hero_train_${userId}`;
            if (cooldowns.has(cdKey) && cooldowns.get(cdKey) > Date.now()) {
                const left = Math.ceil((cooldowns.get(cdKey) - Date.now()) / 1000);
                return interaction.reply({ content: `⏳ Training-Cooldown: ${left}s`, ephemeral: true });
            }

            const stat = interaction.options.getString('stat');
            const statNames = { strength: '💪 Stärke', speed: '⚡ Geschwindigkeit', intelligence: '🧠 Intelligenz', durability: '🛡️ Ausdauer' };
            const current = hero[stat];
            const cost = current * 60;

            let balance = db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId);
            if (!balance || balance.balance < cost) return interaction.reply({ content: `❌ Training kostet ${cost} Coins.`, ephemeral: true });

            const gain = Math.floor(Math.random() * 2) + 1;
            const energyRestore = 15;
            db.db.prepare('UPDATE economy SET balance = balance - ? WHERE user_id = ?').run(cost, userId);
            db.db.prepare(`UPDATE superheroes SET ${stat} = ${stat} + ?, energy = MIN(max_energy, energy + ?) WHERE user_id = ?`).run(gain, energyRestore, userId);

            const embed = new EmbedBuilder()
                .setColor('#0066ff')
                .setTitle('🏋️ Training abgeschlossen!')
                .setDescription(`${statNames[stat]}: **${current}** → **${current + gain}**\n⚡ +${energyRestore} Energie\n💰 -${cost} Coins`);
            cooldowns.set(cdKey, Date.now() + 60000);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'kraeft') {
            const myPowers = db.db.prepare('SELECT * FROM hero_powers WHERE user_id = ?').all(userId);
            const list = Object.entries(POWERS).map(([k, v]) => {
                const owned = myPowers.find(p => p.power_id === k);
                return `${owned ? '✅' : '🔒'} **${v.name}** ${owned ? `Lv.${owned.level}` : ''}\n${v.desc}\nBonus: +${v.bonus}/Lv ${v.stat} | Kosten: ${v.cost} Coins${owned ? ` | Upgrade: ${v.cost * (owned.level + 1)} Coins` : ''}`;
            }).join('\n\n');

            const embed = new EmbedBuilder()
                .setColor('#0066ff')
                .setTitle('🌟 Superkräfte')
                .setDescription(list);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'lernen') {
            const powerId = interaction.options.getString('kraft');
            const power = POWERS[powerId];
            const existing = db.db.prepare('SELECT * FROM hero_powers WHERE user_id = ? AND power_id = ?').get(userId, powerId);

            const cost = existing ? power.cost * (existing.level + 1) : power.cost;
            let balance = db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId);
            if (!balance || balance.balance < cost) return interaction.reply({ content: `❌ Kostet ${cost} Coins. Du hast ${balance?.balance || 0}.`, ephemeral: true });

            db.db.prepare('UPDATE economy SET balance = balance - ? WHERE user_id = ?').run(cost, userId);

            if (existing) {
                db.db.prepare('UPDATE hero_powers SET level = level + 1 WHERE user_id = ? AND power_id = ?').run(userId, powerId);
                const embed = new EmbedBuilder()
                    .setColor('#0066ff')
                    .setTitle('⬆️ Superkraft verbessert!')
                    .setDescription(`${power.name}: Lv.${existing.level} → Lv.${existing.level + 1}\n+${power.bonus} ${power.stat} pro Level\n💰 -${cost} Coins`);
                return interaction.reply({ embeds: [embed] });
            }

            db.db.prepare('INSERT INTO hero_powers (user_id, power_id) VALUES (?, ?)').run(userId, powerId);
            const embed = new EmbedBuilder()
                .setColor('#0066ff')
                .setTitle('🌟 Neue Superkraft!')
                .setDescription(`**${power.name}** erlernt!\n${power.desc}\n+${power.bonus} ${power.stat}\n💰 -${cost} Coins`);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'duell') {
            const cdKey = `hero_duel_${userId}`;
            if (cooldowns.has(cdKey) && cooldowns.get(cdKey) > Date.now()) {
                const left = Math.ceil((cooldowns.get(cdKey) - Date.now()) / 1000);
                return interaction.reply({ content: `⏳ Duell-Cooldown: ${left}s`, ephemeral: true });
            }

            const opponent = interaction.options.getUser('gegner');
            if (opponent.id === userId) return interaction.reply({ content: '❌ Du kannst nicht gegen dich selbst kämpfen!', ephemeral: true });
            if (opponent.bot) return interaction.reply({ content: '❌ Bots sind keine Superhelden!', ephemeral: true });

            const oppHero = db.db.prepare('SELECT * FROM superheroes WHERE user_id = ?').get(opponent.id);
            if (!oppHero) return interaction.reply({ content: '❌ Dein Gegner ist kein Superheld!', ephemeral: true });

            const myPowers = db.db.prepare('SELECT * FROM hero_powers WHERE user_id = ?').all(userId);
            const oppPowers = db.db.prepare('SELECT * FROM hero_powers WHERE user_id = ?').all(opponent.id);
            const myPower = getHeroPower(hero, myPowers);
            const oppPower = getHeroPower(oppHero, oppPowers);

            const phases = ['💥 Aufprall', '⚡ Kräftemessen', '🌪️ Finaler Schlag'];
            let myScore = 0, oppScore = 0;
            const log = [];

            for (const phase of phases) {
                const myRoll = Math.floor(Math.random() * 20) + 1 + Math.floor(myPower / 6);
                const oppRoll = Math.floor(Math.random() * 20) + 1 + Math.floor(oppPower / 6);
                if (myRoll > oppRoll) { myScore++; log.push(`${phase}: **${hero.hero_name}** gewinnt! (${myRoll} vs ${oppRoll})`); }
                else if (oppRoll > myRoll) { oppScore++; log.push(`${phase}: **${oppHero.hero_name}** gewinnt! (${oppRoll} vs ${myRoll})`); }
                else log.push(`${phase}: Gleichstand! (${myRoll} vs ${oppRoll})`);
            }

            const won = myScore > oppScore;
            const draw = myScore === oppScore;
            const reward = 500;

            if (!draw) {
                const winnerId = won ? userId : opponent.id;
                let bal = db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(winnerId);
                if (!bal) db.db.prepare('INSERT INTO economy (user_id, balance) VALUES (?, 0)').run(winnerId);
                db.db.prepare('UPDATE economy SET balance = balance + ? WHERE user_id = ?').run(reward, winnerId);
                db.db.prepare('UPDATE superheroes SET fame = fame + 30 WHERE user_id = ?').run(winnerId);
            }

            const embed = new EmbedBuilder()
                .setColor(draw ? '#ffff00' : (won ? '#00ff00' : '#ff0000'))
                .setTitle(`🦸 ${hero.hero_name} vs ${oppHero.hero_name}`)
                .setDescription(log.join('\n') + `\n\n**${myScore} - ${oppScore}**\n${draw ? '🤝 Unentschieden!' : (won ? `🏆 ${hero.hero_name} gewinnt! +${reward} Coins, +30 Ruhm` : `💀 ${oppHero.hero_name} gewinnt!`)}`);

            cooldowns.set(cdKey, Date.now() + 120000);
            return interaction.reply({ embeds: [embed] });
        }
    }
};
