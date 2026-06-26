const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database');

const cooldowns = new Map();

function ensureDragonTables() {
    db.db.exec(`
        CREATE TABLE IF NOT EXISTS dragon_trainers (
            user_id TEXT PRIMARY KEY,
            trainer_name TEXT DEFAULT 'Drachenmeister',
            rank INTEGER DEFAULT 0,
            reputation INTEGER DEFAULT 0,
            dragon_food INTEGER DEFAULT 10,
            dragon_gold INTEGER DEFAULT 0,
            total_battles INTEGER DEFAULT 0,
            total_wins INTEGER DEFAULT 0,
            total_bred INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    db.db.exec(`
        CREATE TABLE IF NOT EXISTS dragons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            name TEXT DEFAULT 'Drache',
            species TEXT,
            element TEXT,
            rarity INTEGER DEFAULT 1,
            level INTEGER DEFAULT 1,
            xp INTEGER DEFAULT 0,
            attack INTEGER DEFAULT 5,
            defense INTEGER DEFAULT 5,
            speed INTEGER DEFAULT 5,
            hp INTEGER DEFAULT 50,
            max_hp INTEGER DEFAULT 50,
            happiness INTEGER DEFAULT 80,
            hunger INTEGER DEFAULT 50,
            is_active INTEGER DEFAULT 0,
            evolved INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

const RANKS = [
    { name: 'Drachenlehrling', rep: 0 },
    { name: 'Drachenhüter', rep: 100 },
    { name: 'Drachenbändiger', rep: 300 },
    { name: 'Drachenritter', rep: 700 },
    { name: 'Drachenmeister', rep: 1500 },
    { name: 'Drachenlord', rep: 3000 },
    { name: 'Drachenkönig', rep: 6000 }
];

const ELEMENTS = ['🔥 Feuer', '💧 Wasser', '🌿 Natur', '⚡ Blitz', '❄️ Eis', '🌑 Schatten', '✨ Licht'];

const SPECIES = [
    { id: 'flammendrache', name: 'Flammendrache', element: '🔥 Feuer', rarity: 1, baseAtk: 8, baseDef: 4, baseSpd: 6, baseHp: 45 },
    { id: 'wellendrache', name: 'Wellendrache', element: '💧 Wasser', rarity: 1, baseAtk: 5, baseDef: 7, baseSpd: 6, baseHp: 55 },
    { id: 'walddrache', name: 'Walddrache', element: '🌿 Natur', rarity: 1, baseAtk: 6, baseDef: 6, baseSpd: 5, baseHp: 60 },
    { id: 'blitzdrache', name: 'Blitzdrache', element: '⚡ Blitz', rarity: 1, baseAtk: 7, baseDef: 3, baseSpd: 9, baseHp: 40 },
    { id: 'frostdrache', name: 'Frostdrache', element: '❄️ Eis', rarity: 2, baseAtk: 6, baseDef: 8, baseSpd: 4, baseHp: 65 },
    { id: 'schattendrache', name: 'Schattendrache', element: '🌑 Schatten', rarity: 2, baseAtk: 9, baseDef: 4, baseSpd: 7, baseHp: 45 },
    { id: 'lichtdrache', name: 'Lichtdrache', element: '✨ Licht', rarity: 2, baseAtk: 7, baseDef: 7, baseSpd: 6, baseHp: 55 },
    { id: 'sturmdrache', name: 'Sturmdrache', element: '⚡ Blitz', rarity: 3, baseAtk: 10, baseDef: 5, baseSpd: 10, baseHp: 50 },
    { id: 'vulkandrache', name: 'Vulkandrache', element: '🔥 Feuer', rarity: 3, baseAtk: 12, baseDef: 8, baseSpd: 4, baseHp: 70 },
    { id: 'gezeitendrache', name: 'Gezeitendrache', element: '💧 Wasser', rarity: 3, baseAtk: 8, baseDef: 10, baseSpd: 7, baseHp: 75 },
    { id: 'nebeldrache', name: 'Nebeldrache', element: '🌑 Schatten', rarity: 4, baseAtk: 11, baseDef: 9, baseSpd: 8, baseHp: 65 },
    { id: 'phoenixdrache', name: 'Phoenixdrache', element: '🔥 Feuer', rarity: 4, baseAtk: 14, baseDef: 6, baseSpd: 9, baseHp: 60 },
    { id: 'kristalldrache', name: 'Kristalldrache', element: '✨ Licht', rarity: 4, baseAtk: 10, baseDef: 13, baseSpd: 5, baseHp: 80 },
    { id: 'urdrache', name: 'Urdrache', element: '🌿 Natur', rarity: 5, baseAtk: 13, baseDef: 12, baseSpd: 10, baseHp: 90 },
    { id: 'chaosdrache', name: 'Chaosdrache', element: '🌑 Schatten', rarity: 5, baseAtk: 16, baseDef: 8, baseSpd: 12, baseHp: 70 }
];

const RARITY_NAMES = ['', '⭐ Gewöhnlich', '⭐⭐ Ungewöhnlich', '⭐⭐⭐ Selten', '⭐⭐⭐⭐ Episch', '⭐⭐⭐⭐⭐ Legendär'];
const RARITY_COLORS = ['', '#aaaaaa', '#00aa00', '#0066ff', '#aa00ff', '#ffaa00'];

const BREED_RESULTS = {
    '🔥 Feuer+💧 Wasser': ['sturmdrache', 'nebeldrache'],
    '🔥 Feuer+🌿 Natur': ['vulkandrache', 'phoenixdrache'],
    '🔥 Feuer+⚡ Blitz': ['phoenixdrache', 'sturmdrache'],
    '💧 Wasser+❄️ Eis': ['gezeitendrache', 'kristalldrache'],
    '💧 Wasser+🌿 Natur': ['gezeitendrache', 'walddrache'],
    '🌑 Schatten+✨ Licht': ['chaosdrache', 'urdrache'],
    '⚡ Blitz+❄️ Eis': ['sturmdrache', 'kristalldrache'],
    '🌿 Natur+✨ Licht': ['urdrache', 'lichtdrache'],
    '🌑 Schatten+🔥 Feuer': ['nebeldrache', 'chaosdrache'],
    '❄️ Eis+🌑 Schatten': ['nebeldrache', 'frostdrache']
};

const WILD_ENCOUNTERS = [
    { text: 'Ein wilder Drache erscheint aus dem Nebel!', bonus: 0 },
    { text: 'Ein verletzter Drache sucht Schutz bei dir!', bonus: 5 },
    { text: 'Ein Drachenei liegt verlassen am Wegesrand!', bonus: 10 },
    { text: 'Ein seltener Drache wurde in einer Höhle entdeckt!', bonus: 15 },
    { text: 'Ein legendärer Drache zeigt sich am Horizont!', bonus: 25 }
];

const BATTLE_EVENTS = [
    { text: 'Kritischer Treffer!', atkMod: 1.5, defMod: 1.0 },
    { text: 'Elementar-Ausbruch!', atkMod: 1.3, defMod: 0.8 },
    { text: 'Ausweichmanöver!', atkMod: 0.7, defMod: 1.3 },
    { text: 'Wutanfall!', atkMod: 1.8, defMod: 0.5 },
    { text: 'Schutzschild!', atkMod: 0.5, defMod: 2.0 },
    { text: 'Normaler Angriff.', atkMod: 1.0, defMod: 1.0 }
];

function getRank(rep) {
    for (let i = RANKS.length - 1; i >= 0; i--) {
        if (rep >= RANKS[i].rep) return i;
    }
    return 0;
}

function xpToLevel(level) {
    return level * level * 25;
}

function getEffectiveStats(dragon) {
    const lvlBonus = dragon.level - 1;
    return {
        attack: dragon.attack + lvlBonus * 2,
        defense: dragon.defense + lvlBonus * 1.5,
        speed: dragon.speed + lvlBonus,
        hp: dragon.max_hp + lvlBonus * 5
    };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('drachenzucht')
        .setDescription('🐉 Züchte und trainiere mächtige Drachen!')
        .addSubcommand(s => s.setName('status').setDescription('Zeige dein Drachenzüchter-Profil'))
        .addSubcommand(s => s.setName('fangen').setDescription('Fange einen wilden Drachen'))
        .addSubcommand(s => s.setName('drachen').setDescription('Zeige alle deine Drachen'))
        .addSubcommand(s => s.setName('aktiv').setDescription('Wähle deinen aktiven Drachen')
            .addIntegerOption(o => o.setName('id').setDescription('Drachen-ID').setRequired(true)))
        .addSubcommand(s => s.setName('benennen').setDescription('Benenne einen Drachen um')
            .addIntegerOption(o => o.setName('id').setDescription('Drachen-ID').setRequired(true))
            .addStringOption(o => o.setName('name').setDescription('Neuer Name').setRequired(true)))
        .addSubcommand(s => s.setName('fuettern').setDescription('Füttere deinen aktiven Drachen'))
        .addSubcommand(s => s.setName('trainieren').setDescription('Trainiere deinen aktiven Drachen')
            .addStringOption(o => o.setName('stat').setDescription('Welchen Stat trainieren').setRequired(true)
                .addChoices(
                    { name: 'Angriff', value: 'attack' },
                    { name: 'Verteidigung', value: 'defense' },
                    { name: 'Geschwindigkeit', value: 'speed' }
                )))
        .addSubcommand(s => s.setName('kampf').setDescription('Kämpfe gegen einen wilden Drachen'))
        .addSubcommand(s => s.setName('zuechten').setDescription('Züchte zwei Drachen zusammen')
            .addIntegerOption(o => o.setName('drache1').setDescription('Erste Drachen-ID').setRequired(true))
            .addIntegerOption(o => o.setName('drache2').setDescription('Zweite Drachen-ID').setRequired(true)))
        .addSubcommand(s => s.setName('duell').setDescription('Fordere einen Spieler zum Drachenduell')
            .addUserOption(o => o.setName('gegner').setDescription('Dein Gegner').setRequired(true)))
        .addSubcommand(s => s.setName('arten').setDescription('Zeige alle Drachenarten')),

    async execute(interaction) {
        ensureDragonTables();
        const config = require('../config.json');
        const sub = interaction.options.getSubcommand();
        const userId = interaction.user.id;

        let trainer = db.db.prepare('SELECT * FROM dragon_trainers WHERE user_id = ?').get(userId);

        if (!trainer && sub !== 'status') {
            return interaction.reply({ content: '❌ Benutze zuerst `/drachenzucht status` um Drachenzüchter zu werden!', ephemeral: true });
        }

        if (sub === 'status') {
            if (!trainer) {
                db.db.prepare('INSERT INTO dragon_trainers (user_id) VALUES (?)').run(userId);
                trainer = db.db.prepare('SELECT * FROM dragon_trainers WHERE user_id = ?').get(userId);

                const starterSpecies = SPECIES.filter(s => s.rarity === 1);
                const starter = starterSpecies[Math.floor(Math.random() * starterSpecies.length)];
                db.db.prepare(`INSERT INTO dragons (user_id, name, species, element, rarity, attack, defense, speed, hp, max_hp, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`)
                    .run(userId, starter.name, starter.id, starter.element, starter.rarity, starter.baseAtk, starter.baseDef, starter.baseSpd, starter.baseHp, starter.baseHp);

                const embed = new EmbedBuilder()
                    .setColor('#ff6600')
                    .setTitle('🐉 Willkommen, junger Drachenzüchter!')
                    .setDescription(`Du hast deinen ersten Drachen erhalten!\n\n🐲 **${starter.name}** (${starter.element})\nATK: ${starter.baseAtk} | DEF: ${starter.baseDef} | SPD: ${starter.baseSpd} | HP: ${starter.baseHp}\n\nBenutze \`/drachenzucht drachen\` um deine Drachen zu sehen!`);
                return interaction.reply({ embeds: [embed] });
            }

            const rank = getRank(trainer.reputation);
            const nextRank = rank < RANKS.length - 1 ? RANKS[rank + 1] : null;
            const dragonCount = db.db.prepare('SELECT COUNT(*) as cnt FROM dragons WHERE user_id = ?').get(userId).cnt;
            const activeDragon = db.db.prepare('SELECT * FROM dragons WHERE user_id = ? AND is_active = 1').get(userId);

            const embed = new EmbedBuilder()
                .setColor('#ff6600')
                .setTitle(`🐉 ${trainer.trainer_name}`)
                .setDescription(`**${RANKS[rank].name}** (Rang ${rank})\n${nextRank ? `Nächster Rang: ${nextRank.name} (${trainer.reputation}/${nextRank.rep} Rep)` : '👑 MAXIMALER RANG!'}`)
                .addFields(
                    { name: '⭐ Reputation', value: `${trainer.reputation}`, inline: true },
                    { name: '🐲 Drachen', value: `${dragonCount}`, inline: true },
                    { name: '🍖 Futter', value: `${trainer.dragon_food}`, inline: true },
                    { name: '🪙 Drachengold', value: `${trainer.dragon_gold}`, inline: true },
                    { name: '⚔️ Kämpfe', value: `${trainer.total_battles} (${trainer.total_wins} Siege)`, inline: true },
                    { name: '🥚 Gezüchtet', value: `${trainer.total_bred}`, inline: true }
                );

            if (activeDragon) {
                const stats = getEffectiveStats(activeDragon);
                embed.addFields({
                    name: `🐲 Aktiver Drache: ${activeDragon.name}`,
                    value: `${activeDragon.element} | ${RARITY_NAMES[activeDragon.rarity]} | Lv.${activeDragon.level}\nATK: ${stats.attack.toFixed(0)} | DEF: ${stats.defense.toFixed(0)} | SPD: ${stats.speed.toFixed(0)} | HP: ${activeDragon.hp}/${stats.hp.toFixed(0)}\n😊 Glück: ${activeDragon.happiness}% | 🍖 Hunger: ${activeDragon.hunger}%\nXP: ${activeDragon.xp}/${xpToLevel(activeDragon.level)}`
                });
            }
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'fangen') {
            const cdKey = `dragon_catch_${userId}`;
            if (cooldowns.has(cdKey) && cooldowns.get(cdKey) > Date.now()) {
                const left = Math.ceil((cooldowns.get(cdKey) - Date.now()) / 1000);
                return interaction.reply({ content: `⏳ Warte ${left}s bevor du wieder fangen kannst.`, ephemeral: true });
            }

            const dragonCount = db.db.prepare('SELECT COUNT(*) as cnt FROM dragons WHERE user_id = ?').get(userId).cnt;
            const rank = getRank(trainer.reputation);
            const maxDragons = 5 + rank * 3;
            if (dragonCount >= maxDragons) {
                return interaction.reply({ content: `❌ Du hast bereits ${dragonCount}/${maxDragons} Drachen. Steige im Rang auf für mehr Plätze!`, ephemeral: true });
            }

            const encounter = WILD_ENCOUNTERS[Math.floor(Math.random() * WILD_ENCOUNTERS.length)];
            const roll = Math.floor(Math.random() * 100) + encounter.bonus;

            let availableSpecies;
            if (roll >= 95) availableSpecies = SPECIES.filter(s => s.rarity === 5);
            else if (roll >= 85) availableSpecies = SPECIES.filter(s => s.rarity === 4);
            else if (roll >= 70) availableSpecies = SPECIES.filter(s => s.rarity === 3);
            else if (roll >= 45) availableSpecies = SPECIES.filter(s => s.rarity === 2);
            else availableSpecies = SPECIES.filter(s => s.rarity === 1);

            const caught = availableSpecies[Math.floor(Math.random() * availableSpecies.length)];
            const catchChance = Math.max(20, 80 - (caught.rarity - 1) * 15);
            const success = Math.random() * 100 < catchChance;

            const embed = new EmbedBuilder().setTitle('🐉 Drachenfang');

            if (success) {
                db.db.prepare(`INSERT INTO dragons (user_id, name, species, element, rarity, attack, defense, speed, hp, max_hp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
                    .run(userId, caught.name, caught.id, caught.element, caught.rarity, caught.baseAtk, caught.baseDef, caught.baseSpd, caught.baseHp, caught.baseHp);
                db.db.prepare('UPDATE dragon_trainers SET reputation = reputation + ? WHERE user_id = ?').run(caught.rarity * 10, userId);

                embed.setColor(RARITY_COLORS[caught.rarity])
                    .setDescription(`${encounter.text}\n\n✅ **${caught.name} gefangen!**\n${caught.element} | ${RARITY_NAMES[caught.rarity]}\nATK: ${caught.baseAtk} | DEF: ${caught.baseDef} | SPD: ${caught.baseSpd} | HP: ${caught.baseHp}\n\n⭐ +${caught.rarity * 10} Reputation`);
            } else {
                embed.setColor('#ff0000')
                    .setDescription(`${encounter.text}\n\n❌ **${caught.name}** ist entkommen!\n${caught.element} | ${RARITY_NAMES[caught.rarity]}\nFangchance war ${catchChance}%... Pech gehabt!`);
            }

            cooldowns.set(cdKey, Date.now() + 60000);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'drachen') {
            const dragons = db.db.prepare('SELECT * FROM dragons WHERE user_id = ? ORDER BY rarity DESC, level DESC').all(userId);

            if (dragons.length === 0) {
                return interaction.reply({ content: '❌ Du hast keine Drachen!', ephemeral: true });
            }

            const list = dragons.map(d => {
                const stats = getEffectiveStats(d);
                const active = d.is_active ? ' 🟢' : '';
                return `**#${d.id} ${d.name}**${active} — ${d.element} | ${RARITY_NAMES[d.rarity]}\nLv.${d.level} | ATK: ${stats.attack.toFixed(0)} DEF: ${stats.defense.toFixed(0)} SPD: ${stats.speed.toFixed(0)} HP: ${d.hp}/${stats.hp.toFixed(0)} | 😊${d.happiness}%`;
            }).join('\n\n');

            const embed = new EmbedBuilder()
                .setColor('#ff6600')
                .setTitle('🐲 Deine Drachen')
                .setDescription(list)
                .setFooter({ text: `${dragons.length} Drachen | 🟢 = aktiver Drache` });
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'aktiv') {
            const dragonId = interaction.options.getInteger('id');
            const dragon = db.db.prepare('SELECT * FROM dragons WHERE id = ? AND user_id = ?').get(dragonId, userId);
            if (!dragon) return interaction.reply({ content: '❌ Drache nicht gefunden!', ephemeral: true });

            db.db.prepare('UPDATE dragons SET is_active = 0 WHERE user_id = ?').run(userId);
            db.db.prepare('UPDATE dragons SET is_active = 1 WHERE id = ? AND user_id = ?').run(dragonId, userId);

            const embed = new EmbedBuilder()
                .setColor('#ff6600')
                .setTitle('🐲 Aktiver Drache gewechselt')
                .setDescription(`**${dragon.name}** (${dragon.element}) ist jetzt dein aktiver Drache!`);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'benennen') {
            const dragonId = interaction.options.getInteger('id');
            const newName = interaction.options.getString('name');
            if (newName.length > 25) return interaction.reply({ content: '❌ Name max. 25 Zeichen!', ephemeral: true });

            const dragon = db.db.prepare('SELECT * FROM dragons WHERE id = ? AND user_id = ?').get(dragonId, userId);
            if (!dragon) return interaction.reply({ content: '❌ Drache nicht gefunden!', ephemeral: true });

            db.db.prepare('UPDATE dragons SET name = ? WHERE id = ?').run(newName, dragonId);
            const embed = new EmbedBuilder()
                .setColor('#ff6600')
                .setTitle('🐲 Drache umbenannt')
                .setDescription(`**${dragon.name}** heißt jetzt **${newName}**!`);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'fuettern') {
            const dragon = db.db.prepare('SELECT * FROM dragons WHERE user_id = ? AND is_active = 1').get(userId);
            if (!dragon) return interaction.reply({ content: '❌ Kein aktiver Drache! Setze einen mit `/drachenzucht aktiv`.', ephemeral: true });
            if (trainer.dragon_food < 1) return interaction.reply({ content: '❌ Du hast kein Drachenfutter! Gewinne welches durch Kämpfe.', ephemeral: true });

            const hungerRestore = Math.min(30, 100 - dragon.hunger);
            const happinessGain = Math.min(10, 100 - dragon.happiness);
            const hpRestore = Math.min(15, getEffectiveStats(dragon).hp - dragon.hp);

            db.db.prepare('UPDATE dragons SET hunger = MIN(100, hunger + 30), happiness = MIN(100, happiness + 10), hp = MIN(?, hp + 15) WHERE id = ?')
                .run(getEffectiveStats(dragon).hp, dragon.id);
            db.db.prepare('UPDATE dragon_trainers SET dragon_food = dragon_food - 1 WHERE user_id = ?').run(userId);

            const embed = new EmbedBuilder()
                .setColor('#ff6600')
                .setTitle(`🍖 ${dragon.name} gefüttert!`)
                .setDescription(`🍖 Hunger: +${hungerRestore}% (→ ${Math.min(100, dragon.hunger + 30)}%)\n😊 Glück: +${happinessGain}% (→ ${Math.min(100, dragon.happiness + 10)}%)\n❤️ HP: +${hpRestore}\n\n🍖 Futter übrig: ${trainer.dragon_food - 1}`);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'trainieren') {
            const cdKey = `dragon_train_${userId}`;
            if (cooldowns.has(cdKey) && cooldowns.get(cdKey) > Date.now()) {
                const left = Math.ceil((cooldowns.get(cdKey) - Date.now()) / 1000);
                return interaction.reply({ content: `⏳ Training-Cooldown: ${left}s`, ephemeral: true });
            }

            const dragon = db.db.prepare('SELECT * FROM dragons WHERE user_id = ? AND is_active = 1').get(userId);
            if (!dragon) return interaction.reply({ content: '❌ Kein aktiver Drache!', ephemeral: true });

            const stat = interaction.options.getString('stat');
            const statNames = { attack: 'Angriff', defense: 'Verteidigung', speed: 'Geschwindigkeit' };
            const cost = dragon.level * 30;

            let balance = db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId);
            if (!balance || balance.balance < cost) {
                return interaction.reply({ content: `❌ Training kostet ${cost} Coins. Du hast ${balance?.balance || 0}.`, ephemeral: true });
            }

            const gain = Math.floor(Math.random() * 3) + 1;
            const xpGain = 15 + Math.floor(Math.random() * 10);

            db.db.prepare('UPDATE economy SET balance = balance - ? WHERE user_id = ?').run(cost, userId);
            db.db.prepare(`UPDATE dragons SET ${stat} = ${stat} + ?, xp = xp + ?, happiness = MAX(0, happiness - 5) WHERE id = ?`).run(gain, xpGain, dragon.id);

            let levelUp = '';
            const newXp = dragon.xp + xpGain;
            if (newXp >= xpToLevel(dragon.level)) {
                db.db.prepare('UPDATE dragons SET level = level + 1, xp = 0, max_hp = max_hp + 5, hp = MIN(hp + 5, max_hp + 5) WHERE id = ?').run(dragon.id);
                levelUp = `\n\n🎉 **LEVEL UP!** ${dragon.name} ist jetzt Level ${dragon.level + 1}!`;
            }

            const embed = new EmbedBuilder()
                .setColor('#ff6600')
                .setTitle(`⚔️ ${dragon.name} trainiert!`)
                .setDescription(`**${statNames[stat]}** +${gain} (→ ${dragon[stat] + gain})\n📊 XP: +${xpGain}\n💰 -${cost} Coins${levelUp}`);
            cooldowns.set(cdKey, Date.now() + 45000);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'kampf') {
            const cdKey = `dragon_battle_${userId}`;
            if (cooldowns.has(cdKey) && cooldowns.get(cdKey) > Date.now()) {
                const left = Math.ceil((cooldowns.get(cdKey) - Date.now()) / 1000);
                return interaction.reply({ content: `⏳ Kampf-Cooldown: ${left}s`, ephemeral: true });
            }

            const dragon = db.db.prepare('SELECT * FROM dragons WHERE user_id = ? AND is_active = 1').get(userId);
            if (!dragon) return interaction.reply({ content: '❌ Kein aktiver Drache!', ephemeral: true });
            if (dragon.hp < 10) return interaction.reply({ content: '❌ Dein Drache hat zu wenig HP! Füttere ihn zuerst.', ephemeral: true });

            const rank = getRank(trainer.reputation);
            const enemyPool = SPECIES.filter(s => s.rarity <= Math.min(5, rank + 2));
            const enemySpecies = enemyPool[Math.floor(Math.random() * enemyPool.length)];
            const enemyLevel = Math.max(1, dragon.level + Math.floor(Math.random() * 5) - 2);
            const enemyHp = enemySpecies.baseHp + (enemyLevel - 1) * 5;

            const myStats = getEffectiveStats(dragon);
            const enemyStats = {
                attack: enemySpecies.baseAtk + (enemyLevel - 1) * 2,
                defense: enemySpecies.baseDef + (enemyLevel - 1) * 1.5,
                speed: enemySpecies.baseSpd + (enemyLevel - 1),
                hp: enemyHp
            };

            let myHp = dragon.hp;
            let eHp = enemyHp;
            const log = [];
            let rounds = 0;

            while (myHp > 0 && eHp > 0 && rounds < 6) {
                rounds++;
                const myEvent = BATTLE_EVENTS[Math.floor(Math.random() * BATTLE_EVENTS.length)];
                const eEvent = BATTLE_EVENTS[Math.floor(Math.random() * BATTLE_EVENTS.length)];

                const myDmg = Math.max(1, Math.floor((myStats.attack * myEvent.atkMod - enemyStats.defense * 0.3) * (0.8 + Math.random() * 0.4)));
                const eDmg = Math.max(1, Math.floor((enemyStats.attack * eEvent.atkMod - myStats.defense * 0.3) * (0.8 + Math.random() * 0.4)));

                const iFirst = myStats.speed >= enemyStats.speed;
                if (iFirst) {
                    eHp -= myDmg;
                    log.push(`⚔️ R${rounds}: ${dragon.name} — ${myEvent.text} (-${myDmg} HP)`);
                    if (eHp > 0) {
                        myHp -= eDmg;
                        log.push(`🐲 R${rounds}: ${enemySpecies.name} — ${eEvent.text} (-${eDmg} HP)`);
                    }
                } else {
                    myHp -= eDmg;
                    log.push(`🐲 R${rounds}: ${enemySpecies.name} — ${eEvent.text} (-${eDmg} HP)`);
                    if (myHp > 0) {
                        eHp -= myDmg;
                        log.push(`⚔️ R${rounds}: ${dragon.name} — ${myEvent.text} (-${myDmg} HP)`);
                    }
                }
            }

            const won = eHp <= 0 && myHp > 0;
            const embed = new EmbedBuilder()
                .setTitle(`🐉 ${dragon.name} vs ${enemySpecies.name} (Lv.${enemyLevel})`)
                .setDescription(log.join('\n'));

            if (won) {
                const xpGain = enemyLevel * 10 + enemySpecies.rarity * 15;
                const goldGain = enemyLevel * 5 + enemySpecies.rarity * 10;
                const foodGain = Math.random() < 0.4 ? Math.floor(Math.random() * 3) + 1 : 0;
                const coinReward = enemyLevel * 20 + enemySpecies.rarity * 50;

                db.db.prepare('UPDATE dragons SET hp = ?, xp = xp + ? WHERE id = ?').run(Math.max(1, myHp), xpGain, dragon.id);
                db.db.prepare('UPDATE dragon_trainers SET reputation = reputation + ?, dragon_gold = dragon_gold + ?, dragon_food = dragon_food + ?, total_battles = total_battles + 1, total_wins = total_wins + 1 WHERE user_id = ?')
                    .run(enemySpecies.rarity * 5, goldGain, foodGain, userId);

                let bal = db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId);
                if (!bal) db.db.prepare('INSERT INTO economy (user_id, balance) VALUES (?, 0)').run(userId);
                db.db.prepare('UPDATE economy SET balance = balance + ? WHERE user_id = ?').run(coinReward, userId);

                let levelUp = '';
                const newXp = dragon.xp + xpGain;
                if (newXp >= xpToLevel(dragon.level)) {
                    db.db.prepare('UPDATE dragons SET level = level + 1, xp = 0, max_hp = max_hp + 5 WHERE id = ?').run(dragon.id);
                    levelUp = `\n🎉 **LEVEL UP!** Level ${dragon.level + 1}!`;
                }

                embed.setColor('#00ff00')
                    .addFields({ name: '🏆 Sieg!', value: `📊 +${xpGain} XP | 🪙 +${goldGain} Gold | 💰 +${coinReward} Coins${foodGain > 0 ? ` | 🍖 +${foodGain} Futter` : ''}\n❤️ HP: ${Math.max(1, myHp)}/${myStats.hp.toFixed(0)}${levelUp}` });
            } else {
                db.db.prepare('UPDATE dragons SET hp = ? WHERE id = ?').run(Math.max(1, Math.floor(myHp * 0.5)), dragon.id);
                db.db.prepare('UPDATE dragon_trainers SET total_battles = total_battles + 1 WHERE user_id = ?').run(userId);
                embed.setColor('#ff0000')
                    .addFields({ name: '💀 Niederlage!', value: `Dein Drache wurde besiegt.\n❤️ HP auf ${Math.max(1, Math.floor(myHp * 0.5))} gesetzt. Füttere ihn!` });
            }

            cooldowns.set(cdKey, Date.now() + 60000);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'zuechten') {
            const cdKey = `dragon_breed_${userId}`;
            if (cooldowns.has(cdKey) && cooldowns.get(cdKey) > Date.now()) {
                const left = Math.ceil((cooldowns.get(cdKey) - Date.now()) / 1000);
                return interaction.reply({ content: `⏳ Zucht-Cooldown: ${left}s`, ephemeral: true });
            }

            const id1 = interaction.options.getInteger('drache1');
            const id2 = interaction.options.getInteger('drache2');
            if (id1 === id2) return interaction.reply({ content: '❌ Du brauchst zwei verschiedene Drachen!', ephemeral: true });

            const d1 = db.db.prepare('SELECT * FROM dragons WHERE id = ? AND user_id = ?').get(id1, userId);
            const d2 = db.db.prepare('SELECT * FROM dragons WHERE id = ? AND user_id = ?').get(id2, userId);
            if (!d1 || !d2) return interaction.reply({ content: '❌ Einer der Drachen wurde nicht gefunden!', ephemeral: true });
            if (d1.level < 5 || d2.level < 5) return interaction.reply({ content: '❌ Beide Drachen müssen mindestens Level 5 sein!', ephemeral: true });

            const rank = getRank(trainer.reputation);
            const dragonCount = db.db.prepare('SELECT COUNT(*) as cnt FROM dragons WHERE user_id = ?').get(userId).cnt;
            const maxDragons = 5 + rank * 3;
            if (dragonCount >= maxDragons) return interaction.reply({ content: `❌ Kein Platz! ${dragonCount}/${maxDragons} Drachen.`, ephemeral: true });

            const cost = 500 + (d1.rarity + d2.rarity) * 200;
            let balance = db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId);
            if (!balance || balance.balance < cost) return interaction.reply({ content: `❌ Zucht kostet ${cost} Coins!`, ephemeral: true });

            const elements = [d1.element, d2.element].sort();
            const breedKey = elements.join('+');
            const reverseKey = elements.reverse().join('+');
            let resultPool = BREED_RESULTS[breedKey] || BREED_RESULTS[reverseKey];

            let baby;
            if (resultPool) {
                const babyId = resultPool[Math.floor(Math.random() * resultPool.length)];
                baby = SPECIES.find(s => s.id === babyId);
            }
            if (!baby) {
                const parentSpecies = [SPECIES.find(s => s.id === d1.species), SPECIES.find(s => s.id === d2.species)].filter(Boolean);
                baby = parentSpecies[Math.floor(Math.random() * parentSpecies.length)] || SPECIES[0];
            }

            const bonusAtk = Math.floor((d1.attack + d2.attack) * 0.1);
            const bonusDef = Math.floor((d1.defense + d2.defense) * 0.1);
            const bonusSpd = Math.floor((d1.speed + d2.speed) * 0.1);

            db.db.prepare('UPDATE economy SET balance = balance - ? WHERE user_id = ?').run(cost, userId);
            db.db.prepare(`INSERT INTO dragons (user_id, name, species, element, rarity, attack, defense, speed, hp, max_hp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
                .run(userId, baby.name, baby.id, baby.element, baby.rarity, baby.baseAtk + bonusAtk, baby.baseDef + bonusDef, baby.baseSpd + bonusSpd, baby.baseHp, baby.baseHp);
            db.db.prepare('UPDATE dragon_trainers SET total_bred = total_bred + 1, reputation = reputation + ? WHERE user_id = ?').run(baby.rarity * 15, userId);

            const embed = new EmbedBuilder()
                .setColor(RARITY_COLORS[baby.rarity])
                .setTitle('🥚 Zucht erfolgreich!')
                .setDescription(`**${d1.name}** × **${d2.name}**\n\n🐲 **${baby.name}** geschlüpft!\n${baby.element} | ${RARITY_NAMES[baby.rarity]}\nATK: ${baby.baseAtk + bonusAtk} | DEF: ${baby.baseDef + bonusDef} | SPD: ${baby.baseSpd + bonusSpd} | HP: ${baby.baseHp}\n*(Eltern-Bonus: +${bonusAtk} ATK, +${bonusDef} DEF, +${bonusSpd} SPD)*\n\n💰 -${cost} Coins | ⭐ +${baby.rarity * 15} Rep`);
            cooldowns.set(cdKey, Date.now() + 300000);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'duell') {
            const cdKey = `dragon_duel_${userId}`;
            if (cooldowns.has(cdKey) && cooldowns.get(cdKey) > Date.now()) {
                const left = Math.ceil((cooldowns.get(cdKey) - Date.now()) / 1000);
                return interaction.reply({ content: `⏳ Duell-Cooldown: ${left}s`, ephemeral: true });
            }

            const opponent = interaction.options.getUser('gegner');
            if (opponent.id === userId) return interaction.reply({ content: '❌ Du kannst nicht gegen dich selbst kämpfen!', ephemeral: true });
            if (opponent.bot) return interaction.reply({ content: '❌ Bots haben keine Drachen!', ephemeral: true });

            const myDragon = db.db.prepare('SELECT * FROM dragons WHERE user_id = ? AND is_active = 1').get(userId);
            const oppDragon = db.db.prepare('SELECT * FROM dragons WHERE user_id = ? AND is_active = 1').get(opponent.id);
            if (!myDragon) return interaction.reply({ content: '❌ Du hast keinen aktiven Drachen!', ephemeral: true });
            if (!oppDragon) return interaction.reply({ content: '❌ Dein Gegner hat keinen aktiven Drachen!', ephemeral: true });

            const myStats = getEffectiveStats(myDragon);
            const oppStats = getEffectiveStats(oppDragon);

            let myHp = myStats.hp, oppHp = oppStats.hp;
            const log = [];
            let rounds = 0;

            while (myHp > 0 && oppHp > 0 && rounds < 8) {
                rounds++;
                const myEvent = BATTLE_EVENTS[Math.floor(Math.random() * BATTLE_EVENTS.length)];
                const oppEvent = BATTLE_EVENTS[Math.floor(Math.random() * BATTLE_EVENTS.length)];

                const myDmg = Math.max(1, Math.floor((myStats.attack * myEvent.atkMod - oppStats.defense * 0.3) * (0.8 + Math.random() * 0.4)));
                const oppDmg = Math.max(1, Math.floor((oppStats.attack * oppEvent.atkMod - myStats.defense * 0.3) * (0.8 + Math.random() * 0.4)));

                if (myStats.speed >= oppStats.speed) {
                    oppHp -= myDmg;
                    log.push(`R${rounds}: 🐲 ${myDragon.name} — ${myEvent.text} (-${myDmg})`);
                    if (oppHp > 0) {
                        myHp -= oppDmg;
                        log.push(`R${rounds}: 🐉 ${oppDragon.name} — ${oppEvent.text} (-${oppDmg})`);
                    }
                } else {
                    myHp -= oppDmg;
                    log.push(`R${rounds}: 🐉 ${oppDragon.name} — ${oppEvent.text} (-${oppDmg})`);
                    if (myHp > 0) {
                        oppHp -= myDmg;
                        log.push(`R${rounds}: 🐲 ${myDragon.name} — ${myEvent.text} (-${myDmg})`);
                    }
                }
            }

            const won = oppHp <= 0 && myHp > 0;
            const draw = myHp <= 0 && oppHp <= 0 || (myHp > 0 && oppHp > 0);
            const reward = 300 + Math.max(myDragon.level, oppDragon.level) * 20;

            if (!draw) {
                const winnerId = won ? userId : opponent.id;
                const loserId = won ? opponent.id : userId;
                let bal = db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(winnerId);
                if (!bal) db.db.prepare('INSERT INTO economy (user_id, balance) VALUES (?, 0)').run(winnerId);
                db.db.prepare('UPDATE economy SET balance = balance + ? WHERE user_id = ?').run(reward, winnerId);
                db.db.prepare('UPDATE dragon_trainers SET reputation = reputation + 20, total_wins = total_wins + 1, total_battles = total_battles + 1 WHERE user_id = ?').run(winnerId);
                db.db.prepare('UPDATE dragon_trainers SET total_battles = total_battles + 1 WHERE user_id = ?').run(loserId);
            }

            const embed = new EmbedBuilder()
                .setColor(draw ? '#ffff00' : (won ? '#00ff00' : '#ff0000'))
                .setTitle(`🐉 Drachenduell: ${myDragon.name} vs ${oppDragon.name}`)
                .setDescription(log.join('\n') + `\n\n${draw ? '🤝 Unentschieden!' : (won ? `🏆 **${myDragon.name}** gewinnt! +${reward} Coins, +20 Rep` : `💀 **${oppDragon.name}** gewinnt!`)}`)
                .setFooter({ text: `${interaction.user.username} vs ${opponent.username}` });

            cooldowns.set(cdKey, Date.now() + 120000);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'arten') {
            const grouped = {};
            for (const s of SPECIES) {
                if (!grouped[s.rarity]) grouped[s.rarity] = [];
                grouped[s.rarity].push(s);
            }

            let desc = '';
            for (let r = 1; r <= 5; r++) {
                if (!grouped[r]) continue;
                desc += `\n**${RARITY_NAMES[r]}**\n`;
                desc += grouped[r].map(s => `🐲 ${s.name} (${s.element}) — ATK:${s.baseAtk} DEF:${s.baseDef} SPD:${s.baseSpd} HP:${s.baseHp}`).join('\n');
                desc += '\n';
            }

            const embed = new EmbedBuilder()
                .setColor('#ff6600')
                .setTitle('📖 Drachenarten')
                .setDescription(desc)
                .setFooter({ text: `${SPECIES.length} Arten | Höhere Seltenheit = stärkere Basis-Stats` });
            return interaction.reply({ embeds: [embed] });
        }
    }
};
