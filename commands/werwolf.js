const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

const cooldowns = new Map();

function ensureWerewolfTables() {
    db.db.exec(`
        CREATE TABLE IF NOT EXISTS werewolves (
            user_id TEXT PRIMARY KEY,
            wolf_name TEXT DEFAULT 'Namenloser Wolf',
            bloodline TEXT DEFAULT '',
            rank INTEGER DEFAULT 0,
            moon_power INTEGER DEFAULT 0,
            strength INTEGER DEFAULT 5,
            agility INTEGER DEFAULT 5,
            senses INTEGER DEFAULT 5,
            willpower INTEGER DEFAULT 5,
            rage INTEGER DEFAULT 0,
            max_rage INTEGER DEFAULT 100,
            hp INTEGER DEFAULT 100,
            max_hp INTEGER DEFAULT 100,
            pack TEXT DEFAULT '',
            territory TEXT DEFAULT '',
            kills INTEGER DEFAULT 0,
            hunts_completed INTEGER DEFAULT 0,
            transformations INTEGER DEFAULT 0,
            total_earned INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    db.db.exec(`
        CREATE TABLE IF NOT EXISTS wolf_abilities (
            user_id TEXT,
            ability_id TEXT,
            level INTEGER DEFAULT 1,
            PRIMARY KEY (user_id, ability_id)
        )
    `);
}

const RANKS = [
    { name: 'Welpe', power: 0 },
    { name: 'Junger Wolf', power: 100 },
    { name: 'Streunender Wolf', power: 300 },
    { name: 'Rudeljäger', power: 700 },
    { name: 'Betawolf', power: 1500 },
    { name: 'Alphawolf', power: 3500 },
    { name: 'Uralter Wolf', power: 7000 },
    { name: 'Mondbestie', power: 15000 }
];

const BLOODLINES = {
    schatten: { name: '🌑 Schattenwolf', desc: 'Meister der Tarnung', bonusStat: 'agility', bonus: 3 },
    blut: { name: '🩸 Blutwolf', desc: 'Unstillbarer Blutdurst', bonusStat: 'strength', bonus: 3 },
    mond: { name: '🌙 Mondwolf', desc: 'Stärkste Mondverbindung', bonusStat: 'willpower', bonus: 3 },
    geist: { name: '👻 Geisterwolf', desc: 'Zwischen den Welten wandelnd', bonusStat: 'senses', bonus: 3 },
    ur: { name: '🐺 Urwolf', desc: 'Reinblütiger Ursprung', bonusStat: 'strength', bonus: 2, bonusStat2: 'agility', bonus2: 2 }
};

const MOON_PHASES = [
    { name: '🌑 Neumond', powerMod: 0.5, rageMod: 0.3, desc: 'Schwächste Phase' },
    { name: '🌒 Zunehmend', powerMod: 0.7, rageMod: 0.5, desc: 'Kräfte erwachen' },
    { name: '🌓 Halbmond', powerMod: 1.0, rageMod: 0.7, desc: 'Ausgewogen' },
    { name: '🌔 Fast Voll', powerMod: 1.3, rageMod: 1.0, desc: 'Macht steigt' },
    { name: '🌕 Vollmond', powerMod: 2.0, rageMod: 1.5, desc: 'MAXIMALE MACHT!' }
];

const ABILITIES = {
    heulen: { name: '🐺 Wolfsgeheul', desc: 'Stärkt Verbündete', cost: 200, stat: 'willpower', bonus: 3 },
    klauen: { name: '🪝 Stahlklauen', desc: 'Verstärkte Krallen', cost: 300, stat: 'strength', bonus: 4 },
    sprint: { name: '💨 Wolfssprint', desc: 'Übermenschliche Geschwindigkeit', cost: 250, stat: 'agility', bonus: 3 },
    nase: { name: '👃 Übersinn', desc: 'Spüre jede Beute', cost: 200, stat: 'senses', bonus: 4 },
    regeneration: { name: '💚 Regeneration', desc: 'Heile Wunden schneller', cost: 400, stat: 'willpower', bonus: 3 },
    raserei: { name: '😡 Blutrausch', desc: 'Rage wird zu Stärke', cost: 500, stat: 'strength', bonus: 5 },
    rudel: { name: '🐺 Rudelinstinkt', desc: 'Spüre andere Wölfe', cost: 350, stat: 'senses', bonus: 4 },
    mondschild: { name: '🛡️ Mondschild', desc: 'Silberne Schutzaura', cost: 600, stat: 'willpower', bonus: 5 },
    verwandlung: { name: '🌀 Meisterverwandlung', desc: 'Kontrolliere die Transformation', cost: 800, stat: 'agility', bonus: 6 },
    alpharuf: { name: '👑 Alpharuf', desc: 'Befehle die Nacht', cost: 1200, stat: 'strength', bonus: 8 }
};

const PREY = [
    { name: '🐰 Kaninchen', difficulty: 5, reward: [30, 80], rage: 5, power: 3, minRank: 0 },
    { name: '🦌 Hirsch', difficulty: 12, reward: [80, 200], rage: 10, power: 8, minRank: 0 },
    { name: '🐗 Wildschwein', difficulty: 20, reward: [150, 400], rage: 15, power: 15, minRank: 1 },
    { name: '🐻 Bär', difficulty: 30, reward: [300, 700], rage: 25, power: 25, minRank: 2 },
    { name: '🧛 Vampir', difficulty: 42, reward: [500, 1200], rage: 35, power: 40, minRank: 3 },
    { name: '🧙 Hexenjäger', difficulty: 55, reward: [800, 2000], rage: 45, power: 60, minRank: 4 },
    { name: '🐉 Wyvern', difficulty: 70, reward: [1500, 4000], rage: 60, power: 85, minRank: 5 },
    { name: '👹 Wendigo', difficulty: 85, reward: [3000, 8000], rage: 75, power: 120, minRank: 6 },
    { name: '🌕 Monddämon', difficulty: 110, reward: [5000, 15000], rage: 100, power: 200, minRank: 7 }
];

const HUNT_EVENTS = [
    { text: '🌕 Der Mond gibt dir übermenschliche Kraft!', mod: 15 },
    { text: '🐺 Dein Wolfsinstinkt führt dich perfekt!', mod: 12 },
    { text: '🩸 Der Geruch von Blut treibt dich an!', mod: 8 },
    { text: '🌲 Du nutzt das Terrain geschickt!', mod: 5 },
    { text: '💨 Wind trägt deinen Geruch zur Beute...', mod: -5 },
    { text: '🪤 Eine Jägerfalle! Du wirst verletzt.', mod: -10 },
    { text: '🔔 Silberglocken läuten — Schwäche!', mod: -15 },
    { text: '☀️ Mondfinsternis! Deine Kräfte schwinden!', mod: -20 }
];

function getRank(power) {
    for (let i = RANKS.length - 1; i >= 0; i--) {
        if (power >= RANKS[i].power) return i;
    }
    return 0;
}

function getMoonPhase() {
    const day = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
    return MOON_PHASES[day % MOON_PHASES.length];
}

function getWolfPower(wolf, abilities) {
    let total = wolf.strength + wolf.agility + wolf.senses + wolf.willpower;
    for (const a of abilities) {
        const info = ABILITIES[a.ability_id];
        if (info) total += info.bonus * a.level;
    }
    return total;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('werwolf')
        .setDescription('🐺 Werde ein mächtiger Werwolf!')
        .addSubcommand(s => s.setName('profil').setDescription('Zeige dein Werwolf-Profil'))
        .addSubcommand(s => s.setName('blutlinie').setDescription('Wähle deine Blutlinie')
            .addStringOption(o => o.setName('linie').setDescription('Deine Blutlinie').setRequired(true)
                .addChoices(...Object.entries(BLOODLINES).map(([k, v]) => ({ name: v.name, value: k })))))
        .addSubcommand(s => s.setName('name').setDescription('Wähle deinen Wolfsnamen')
            .addStringOption(o => o.setName('wolfname').setDescription('Dein Wolfsname').setRequired(true)))
        .addSubcommand(s => s.setName('jagen').setDescription('Jage eine Beute')
            .addIntegerOption(o => o.setName('beute').setDescription('Beute-Nr (1-9)').setRequired(true)))
        .addSubcommand(s => s.setName('verwandeln').setDescription('Verwandle dich in den Wolf'))
        .addSubcommand(s => s.setName('trainieren').setDescription('Trainiere einen Stat')
            .addStringOption(o => o.setName('stat').setDescription('Welcher Stat').setRequired(true)
                .addChoices(
                    { name: '💪 Stärke', value: 'strength' },
                    { name: '🏃 Agilität', value: 'agility' },
                    { name: '👁️ Sinne', value: 'senses' },
                    { name: '🧠 Willenskraft', value: 'willpower' }
                )))
        .addSubcommand(s => s.setName('faehigkeiten').setDescription('Zeige verfügbare Fähigkeiten'))
        .addSubcommand(s => s.setName('lernen').setDescription('Erlerne eine Fähigkeit')
            .addStringOption(o => o.setName('skill').setDescription('Die Fähigkeit').setRequired(true)
                .addChoices(...Object.entries(ABILITIES).slice(0, 10).map(([k, v]) => ({ name: v.name, value: k })))))
        .addSubcommand(s => s.setName('duell').setDescription('Kämpfe gegen einen anderen Werwolf')
            .addUserOption(o => o.setName('gegner').setDescription('Dein Gegner').setRequired(true)))
        .addSubcommand(s => s.setName('mond').setDescription('Zeige die aktuelle Mondphase')),

    async execute(interaction) {
        ensureWerewolfTables();
        const config = require('../config.json');
        const sub = interaction.options.getSubcommand();
        const userId = interaction.user.id;

        let wolf = db.db.prepare('SELECT * FROM werewolves WHERE user_id = ?').get(userId);

        if (!wolf && sub !== 'profil' && sub !== 'blutlinie') {
            return interaction.reply({ content: '❌ Benutze `/werwolf profil` um ein Werwolf zu werden!', ephemeral: true });
        }

        const moon = getMoonPhase();

        if (sub === 'profil') {
            if (!wolf) {
                db.db.prepare('INSERT INTO werewolves (user_id) VALUES (?)').run(userId);
                const embed = new EmbedBuilder()
                    .setColor('#4a0080')
                    .setTitle('🐺 Du wurdest gebissen...')
                    .setDescription('Das Mondlicht brennt in deinen Adern...\nDu bist jetzt ein **Werwolf**!\n\nWähle deine Blutlinie mit `/werwolf blutlinie`\nund deinen Wolfsnamen mit `/werwolf name`!');
                return interaction.reply({ embeds: [embed] });
            }

            const rank = getRank(wolf.moon_power);
            const nextRank = rank < RANKS.length - 1 ? RANKS[rank + 1] : null;
            const abilities = db.db.prepare('SELECT * FROM wolf_abilities WHERE user_id = ?').all(userId);
            const totalPower = getWolfPower(wolf, abilities);
            const bloodline = BLOODLINES[wolf.bloodline];

            const embed = new EmbedBuilder()
                .setColor('#4a0080')
                .setTitle(`🐺 ${wolf.wolf_name}`)
                .setDescription(`**${RANKS[rank].name}** (Rang ${rank})\n${nextRank ? `Nächster: ${nextRank.name} (${wolf.moon_power}/${nextRank.power} Mondkraft)` : '👑 MAXIMALER RANG!'}\n${bloodline ? `Blutlinie: ${bloodline.name}` : '⚠️ Keine Blutlinie'}\n${moon.name} — ${moon.desc}`)
                .addFields(
                    { name: '🌙 Mondkraft', value: `${wolf.moon_power}`, inline: true },
                    { name: '💥 Kampfkraft', value: `${totalPower}`, inline: true },
                    { name: '😡 Rage', value: `${wolf.rage}/${wolf.max_rage}`, inline: true },
                    { name: '💪 Stärke', value: `${wolf.strength}`, inline: true },
                    { name: '🏃 Agilität', value: `${wolf.agility}`, inline: true },
                    { name: '👁️ Sinne', value: `${wolf.senses}`, inline: true },
                    { name: '🧠 Willenskraft', value: `${wolf.willpower}`, inline: true },
                    { name: '❤️ HP', value: `${wolf.hp}/${wolf.max_hp}`, inline: true },
                    { name: '📊 Stats', value: `🎯 Jagden: ${wolf.hunts_completed}\n💀 Kills: ${wolf.kills}\n🌀 Verwandlungen: ${wolf.transformations}`, inline: true }
                );

            if (abilities.length > 0) {
                embed.addFields({ name: '🌟 Fähigkeiten', value: abilities.map(a => `${ABILITIES[a.ability_id]?.name || a.ability_id} Lv.${a.level}`).join(', ') });
            }
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'blutlinie') {
            if (wolf && wolf.bloodline) return interaction.reply({ content: '❌ Du hast bereits eine Blutlinie!', ephemeral: true });
            const lineId = interaction.options.getString('linie');
            const line = BLOODLINES[lineId];

            if (!wolf) db.db.prepare('INSERT INTO werewolves (user_id) VALUES (?)').run(userId);
            db.db.prepare(`UPDATE werewolves SET bloodline = ?, ${line.bonusStat} = ${line.bonusStat} + ? WHERE user_id = ?`).run(lineId, line.bonus, userId);
            if (line.bonusStat2) {
                db.db.prepare(`UPDATE werewolves SET ${line.bonusStat2} = ${line.bonusStat2} + ? WHERE user_id = ?`).run(line.bonus2, userId);
            }

            const embed = new EmbedBuilder()
                .setColor('#4a0080')
                .setTitle(`${line.name} — Blutlinie gewählt!`)
                .setDescription(`${line.desc}\n\n✨ +${line.bonus} ${line.bonusStat}${line.bonusStat2 ? ` | +${line.bonus2} ${line.bonusStat2}` : ''}`);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'name') {
            const name = interaction.options.getString('wolfname');
            if (name.length > 25) return interaction.reply({ content: '❌ Max. 25 Zeichen!', ephemeral: true });
            db.db.prepare('UPDATE werewolves SET wolf_name = ? WHERE user_id = ?').run(name, userId);
            return interaction.reply({ embeds: [new EmbedBuilder().setColor('#4a0080').setTitle('🐺 Wolfsname gewählt!').setDescription(`Du bist nun bekannt als **${name}**!`)] });
        }

        if (sub === 'jagen') {
            const cdKey = `wolf_hunt_${userId}`;
            if (cooldowns.has(cdKey) && cooldowns.get(cdKey) > Date.now()) {
                const left = Math.ceil((cooldowns.get(cdKey) - Date.now()) / 1000);
                return interaction.reply({ content: `⏳ Jagd-Cooldown: ${left}s`, ephemeral: true });
            }

            const preyIdx = interaction.options.getInteger('beute') - 1;
            if (preyIdx < 0 || preyIdx >= PREY.length) return interaction.reply({ content: '❌ Ungültige Beute!', ephemeral: true });

            const prey = PREY[preyIdx];
            const rank = getRank(wolf.moon_power);
            if (rank < prey.minRank) return interaction.reply({ content: `❌ Du brauchst Rang ${prey.minRank} (${RANKS[prey.minRank].name}).`, ephemeral: true });
            if (wolf.hp < 15) return interaction.reply({ content: '❌ Zu wenig HP! Verwandle dich um zu heilen.', ephemeral: true });

            const abilities = db.db.prepare('SELECT * FROM wolf_abilities WHERE user_id = ?').all(userId);
            const wolfPower = getWolfPower(wolf, abilities);
            const event = HUNT_EVENTS[Math.floor(Math.random() * HUNT_EVENTS.length)];
            const d20 = Math.floor(Math.random() * 20) + 1;
            const ragebonus = Math.floor(wolf.rage * 0.1);
            const huntPower = d20 + Math.floor(wolfPower / 4) + ragebonus + event.mod;
            const moonPower = huntPower * moon.powerMod;
            const success = moonPower >= prey.difficulty;

            const embed = new EmbedBuilder().setTitle(`🐺 Jagd: ${prey.name}`);
            let desc = `${moon.name} | Mondkraft-Multiplikator: x${moon.powerMod}\n\n${event.text}\n\n🎲 Würfel: **${d20}** + Kraft: **${Math.floor(wolfPower / 4)}** + Rage: **${ragebonus}** + Event: **${event.mod}** = **${huntPower}** × ${moon.powerMod} = **${moonPower.toFixed(0)}** vs **${prey.difficulty}**\n\n`;

            if (success) {
                const reward = prey.reward[0] + Math.floor(Math.random() * (prey.reward[1] - prey.reward[0]));
                const rageGain = Math.floor(prey.rage * moon.rageMod);

                let bal = db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId);
                if (!bal) db.db.prepare('INSERT INTO economy (user_id, balance) VALUES (?, 0)').run(userId);
                db.db.prepare('UPDATE economy SET balance = balance + ? WHERE user_id = ?').run(reward, userId);
                db.db.prepare('UPDATE werewolves SET moon_power = moon_power + ?, rage = MIN(max_rage, rage + ?), kills = kills + 1, hunts_completed = hunts_completed + 1, total_earned = total_earned + ? WHERE user_id = ?')
                    .run(prey.power, rageGain, reward, userId);

                desc += `✅ **Beute erlegt!**\n💰 +${reward} Coins\n🌙 +${prey.power} Mondkraft\n😡 +${rageGain} Rage`;
                embed.setColor('#00aa00');
            } else {
                const hpLoss = Math.floor(prey.difficulty * 0.3);
                db.db.prepare('UPDATE werewolves SET hp = MAX(1, hp - ?), rage = MIN(max_rage, rage + 5) WHERE user_id = ?').run(hpLoss, userId);
                desc += `❌ **Beute entkommen!**\n❤️ -${hpLoss} HP\n😡 +5 Rage (Frustration)`;
                embed.setColor('#ff0000');
            }

            embed.setDescription(desc);
            cooldowns.set(cdKey, Date.now() + 50000);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'verwandeln') {
            const cdKey = `wolf_transform_${userId}`;
            if (cooldowns.has(cdKey) && cooldowns.get(cdKey) > Date.now()) {
                const left = Math.ceil((cooldowns.get(cdKey) - Date.now()) / 1000);
                return interaction.reply({ content: `⏳ Verwandlungs-Cooldown: ${left}s`, ephemeral: true });
            }

            const healAmount = Math.floor(wolf.max_hp * 0.3 * moon.powerMod);
            const rageGain = Math.floor(20 * moon.rageMod);
            const powerGain = Math.floor(5 * moon.powerMod);

            db.db.prepare('UPDATE werewolves SET hp = MIN(max_hp, hp + ?), rage = MIN(max_rage, rage + ?), moon_power = moon_power + ?, transformations = transformations + 1 WHERE user_id = ?')
                .run(healAmount, rageGain, powerGain, userId);

            const embed = new EmbedBuilder()
                .setColor('#4a0080')
                .setTitle('🌀 Verwandlung!')
                .setDescription(`${moon.name}\n\n*Knochen brechen und formen sich neu...\nFell sprießt, Klauen wachsen...\nDer Wolf erwacht!*\n\n❤️ +${healAmount} HP (→ ${Math.min(wolf.max_hp, wolf.hp + healAmount)})\n😡 +${rageGain} Rage\n🌙 +${powerGain} Mondkraft\n\n*Mond-Bonus: x${moon.powerMod}*`);

            cooldowns.set(cdKey, Date.now() + 120000);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'trainieren') {
            const cdKey = `wolf_train_${userId}`;
            if (cooldowns.has(cdKey) && cooldowns.get(cdKey) > Date.now()) {
                const left = Math.ceil((cooldowns.get(cdKey) - Date.now()) / 1000);
                return interaction.reply({ content: `⏳ Training-Cooldown: ${left}s`, ephemeral: true });
            }

            const stat = interaction.options.getString('stat');
            const statNames = { strength: '💪 Stärke', agility: '🏃 Agilität', senses: '👁️ Sinne', willpower: '🧠 Willenskraft' };
            const current = wolf[stat];
            const cost = current * 55;

            let balance = db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId);
            if (!balance || balance.balance < cost) return interaction.reply({ content: `❌ Training kostet ${cost} Coins.`, ephemeral: true });

            const gain = Math.floor(Math.random() * 2) + 1;
            db.db.prepare('UPDATE economy SET balance = balance - ? WHERE user_id = ?').run(cost, userId);
            db.db.prepare(`UPDATE werewolves SET ${stat} = ${stat} + ? WHERE user_id = ?`).run(gain, userId);

            const embed = new EmbedBuilder()
                .setColor('#4a0080')
                .setTitle('🏋️ Training abgeschlossen!')
                .setDescription(`${statNames[stat]}: **${current}** → **${current + gain}**\n💰 -${cost} Coins`);
            cooldowns.set(cdKey, Date.now() + 60000);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'faehigkeiten') {
            const myAbilities = db.db.prepare('SELECT * FROM wolf_abilities WHERE user_id = ?').all(userId);
            const list = Object.entries(ABILITIES).map(([k, v]) => {
                const owned = myAbilities.find(a => a.ability_id === k);
                return `${owned ? '✅' : '🔒'} **${v.name}** ${owned ? `Lv.${owned.level}` : ''}\n${v.desc} | +${v.bonus}/Lv ${v.stat} | ${v.cost} Coins`;
            }).join('\n\n');

            const embed = new EmbedBuilder()
                .setColor('#4a0080')
                .setTitle('🌟 Wolf-Fähigkeiten')
                .setDescription(list);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'lernen') {
            const skillId = interaction.options.getString('skill');
            const ability = ABILITIES[skillId];
            const existing = db.db.prepare('SELECT * FROM wolf_abilities WHERE user_id = ? AND ability_id = ?').get(userId, skillId);

            const cost = existing ? ability.cost * (existing.level + 1) : ability.cost;
            let balance = db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId);
            if (!balance || balance.balance < cost) return interaction.reply({ content: `❌ Kostet ${cost} Coins.`, ephemeral: true });

            db.db.prepare('UPDATE economy SET balance = balance - ? WHERE user_id = ?').run(cost, userId);

            if (existing) {
                db.db.prepare('UPDATE wolf_abilities SET level = level + 1 WHERE user_id = ? AND ability_id = ?').run(userId, skillId);
                return interaction.reply({ embeds: [new EmbedBuilder().setColor('#4a0080').setTitle('⬆️ Fähigkeit verbessert!').setDescription(`${ability.name}: Lv.${existing.level} → Lv.${existing.level + 1}\n💰 -${cost} Coins`)] });
            }

            db.db.prepare('INSERT INTO wolf_abilities (user_id, ability_id) VALUES (?, ?)').run(userId, skillId);
            return interaction.reply({ embeds: [new EmbedBuilder().setColor('#4a0080').setTitle('🌟 Neue Fähigkeit!').setDescription(`**${ability.name}** erlernt!\n${ability.desc}\n💰 -${cost} Coins`)] });
        }

        if (sub === 'duell') {
            const cdKey = `wolf_duel_${userId}`;
            if (cooldowns.has(cdKey) && cooldowns.get(cdKey) > Date.now()) {
                const left = Math.ceil((cooldowns.get(cdKey) - Date.now()) / 1000);
                return interaction.reply({ content: `⏳ Duell-Cooldown: ${left}s`, ephemeral: true });
            }

            const opponent = interaction.options.getUser('gegner');
            if (opponent.id === userId) return interaction.reply({ content: '❌ Du kannst nicht gegen dich selbst kämpfen!', ephemeral: true });
            if (opponent.bot) return interaction.reply({ content: '❌ Bots sind keine Werwölfe!', ephemeral: true });

            const oppWolf = db.db.prepare('SELECT * FROM werewolves WHERE user_id = ?').get(opponent.id);
            if (!oppWolf) return interaction.reply({ content: '❌ Dein Gegner ist kein Werwolf!', ephemeral: true });

            const myAbilities = db.db.prepare('SELECT * FROM wolf_abilities WHERE user_id = ?').all(userId);
            const oppAbilities = db.db.prepare('SELECT * FROM wolf_abilities WHERE user_id = ?').all(opponent.id);
            const myPower = getWolfPower(wolf, myAbilities);
            const oppPower = getWolfPower(oppWolf, oppAbilities);

            const phases = ['🐺 Knurren', '🪝 Krallen', '🦷 Biss', '💥 Finaler Angriff'];
            let myScore = 0, oppScore = 0;
            const log = [];

            for (const phase of phases) {
                const myRoll = Math.floor(Math.random() * 20) + 1 + Math.floor(myPower / 6) + Math.floor(wolf.rage * 0.05);
                const oppRoll = Math.floor(Math.random() * 20) + 1 + Math.floor(oppPower / 6) + Math.floor(oppWolf.rage * 0.05);
                if (myRoll > oppRoll) { myScore++; log.push(`${phase}: **${wolf.wolf_name}** dominiert! (${myRoll} vs ${oppRoll})`); }
                else if (oppRoll > myRoll) { oppScore++; log.push(`${phase}: **${oppWolf.wolf_name}** dominiert! (${oppRoll} vs ${myRoll})`); }
                else log.push(`${phase}: Gleichstand! (${myRoll} vs ${oppRoll})`);
            }

            const won = myScore > oppScore;
            const draw = myScore === oppScore;
            const reward = 400;

            if (!draw) {
                const winnerId = won ? userId : opponent.id;
                const loserId = won ? opponent.id : userId;
                let bal = db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(winnerId);
                if (!bal) db.db.prepare('INSERT INTO economy (user_id, balance) VALUES (?, 0)').run(winnerId);
                db.db.prepare('UPDATE economy SET balance = balance + ? WHERE user_id = ?').run(reward, winnerId);
                db.db.prepare('UPDATE werewolves SET moon_power = moon_power + 30, rage = 0 WHERE user_id = ?').run(winnerId);
                db.db.prepare('UPDATE werewolves SET rage = MIN(max_rage, rage + 20) WHERE user_id = ?').run(loserId);
            }

            const embed = new EmbedBuilder()
                .setColor(draw ? '#ffff00' : (won ? '#00ff00' : '#ff0000'))
                .setTitle(`🐺 ${wolf.wolf_name} vs ${oppWolf.wolf_name}`)
                .setDescription(`${moon.name}\n\n${log.join('\n')}\n\n**${myScore} - ${oppScore}**\n${draw ? '🤝 Gleichstand — beide Wölfe ziehen sich zurück!' : (won ? `🏆 ${wolf.wolf_name} gewinnt! +${reward} Coins, +30 Mondkraft` : `💀 ${oppWolf.wolf_name} gewinnt!`)}`)
                .setFooter({ text: 'Werwolf-Duell — Unter dem Mond kämpfen die Bestien' });

            cooldowns.set(cdKey, Date.now() + 120000);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'mond') {
            const embed = new EmbedBuilder()
                .setColor('#4a0080')
                .setTitle('🌙 Aktuelle Mondphase')
                .setDescription(`**${moon.name}**\n${moon.desc}\n\n⚔️ Kampfkraft-Multiplikator: **x${moon.powerMod}**\n😡 Rage-Multiplikator: **x${moon.rageMod}**\n\n*Die Mondphase wechselt täglich und beeinflusst alle Werwolf-Aktionen!*`);
            return interaction.reply({ embeds: [embed] });
        }
    }
};
