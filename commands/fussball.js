const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

const cooldowns = new Map();

function ensureFootballTables() {
    db.db.exec(`
        CREATE TABLE IF NOT EXISTS football_teams (
            user_id TEXT PRIMARY KEY,
            team_name TEXT DEFAULT 'FC Unbekannt',
            rank INTEGER DEFAULT 0,
            fame INTEGER DEFAULT 0,
            stadium_level INTEGER DEFAULT 1,
            training_level INTEGER DEFAULT 1,
            medical_level INTEGER DEFAULT 1,
            youth_level INTEGER DEFAULT 1,
            budget INTEGER DEFAULT 1000,
            wins INTEGER DEFAULT 0,
            draws INTEGER DEFAULT 0,
            losses INTEGER DEFAULT 0,
            goals_scored INTEGER DEFAULT 0,
            goals_conceded INTEGER DEFAULT 0,
            total_earned INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    db.db.exec(`
        CREATE TABLE IF NOT EXISTS football_players (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            name TEXT,
            position TEXT,
            overall INTEGER DEFAULT 50,
            attack INTEGER DEFAULT 50,
            defense INTEGER DEFAULT 50,
            speed INTEGER DEFAULT 50,
            stamina INTEGER DEFAULT 100,
            morale INTEGER DEFAULT 80,
            salary INTEGER DEFAULT 10,
            goals INTEGER DEFAULT 0,
            assists INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

const RANKS = [
    { name: 'Kreisliga', fame: 0 },
    { name: 'Bezirksliga', fame: 150 },
    { name: 'Landesliga', fame: 400 },
    { name: 'Regionalliga', fame: 1000 },
    { name: '3. Liga', fame: 2500 },
    { name: '2. Bundesliga', fame: 5500 },
    { name: '1. Bundesliga', fame: 12000 },
    { name: 'Champions League', fame: 25000 }
];

const POSITIONS = {
    TW: { name: '🧤 Torwart', defWeight: 0.4, atkWeight: 0.0, spdWeight: 0.2 },
    IV: { name: '🛡️ Innenverteidiger', defWeight: 0.5, atkWeight: 0.1, spdWeight: 0.2 },
    AV: { name: '🏃 Außenverteidiger', defWeight: 0.3, atkWeight: 0.2, spdWeight: 0.4 },
    ZM: { name: '⚙️ Zentrales Mittelfeld', defWeight: 0.25, atkWeight: 0.3, spdWeight: 0.25 },
    OM: { name: '🎯 Off. Mittelfeld', defWeight: 0.1, atkWeight: 0.45, spdWeight: 0.3 },
    ST: { name: '⚽ Stürmer', defWeight: 0.05, atkWeight: 0.55, spdWeight: 0.3 }
};

const FIRST_NAMES = ['Max', 'Leon', 'Paul', 'Finn', 'Luis', 'Elias', 'Noah', 'Ben', 'Jonas', 'Felix', 'Luca', 'Tim', 'Tom', 'Jan', 'Nico', 'David', 'Erik', 'Kai', 'Mats', 'Marco'];
const LAST_NAMES = ['Müller', 'Schmidt', 'Weber', 'Fischer', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann', 'Koch', 'Richter', 'Klein', 'Wolf', 'Braun', 'Krause', 'Berger', 'Lange', 'Werner', 'König', 'Hartmann'];

const MATCH_EVENTS = [
    { text: '⚽ TOR! Wunderschöner Schuss ins Eck!', goalChance: 0.8, type: 'goal' },
    { text: '🎯 Freistoß direkt verwandelt!', goalChance: 0.6, type: 'goal' },
    { text: '🏃 Konterangriff — allein vor dem Tor!', goalChance: 0.7, type: 'goal' },
    { text: '🤕 Elfmeter! Foul im Strafraum!', goalChance: 0.75, type: 'penalty' },
    { text: '🟨 Gelbe Karte nach hartem Foul.', goalChance: 0, type: 'card' },
    { text: '🟥 Rote Karte! Notbremse!', goalChance: 0, type: 'red_card' },
    { text: '🤕 Verletzung! Spieler muss vom Feld.', goalChance: 0, type: 'injury' },
    { text: '💨 Lattentreffer! So knapp!', goalChance: 0.2, type: 'near_miss' },
    { text: '🧤 Weltklasse-Parade des Torwarts!', goalChance: 0.1, type: 'save' },
    { text: '📣 Die Fans peitschen die Mannschaft nach vorne!', goalChance: 0.4, type: 'momentum' }
];

const OPPONENTS = [
    { name: 'SV Dorfkicker', strength: 30, fame: 5, minRank: 0 },
    { name: 'FC Vorstadt', strength: 45, fame: 10, minRank: 0 },
    { name: 'TSV Bergheim', strength: 55, fame: 15, minRank: 1 },
    { name: 'Dynamo Stadtpark', strength: 65, fame: 25, minRank: 2 },
    { name: 'SC Adler', strength: 72, fame: 35, minRank: 3 },
    { name: 'VfB Löwen', strength: 80, fame: 50, minRank: 4 },
    { name: 'FC Bayern München II', strength: 85, fame: 70, minRank: 5 },
    { name: 'Borussia Elite', strength: 90, fame: 100, minRank: 6 },
    { name: 'Real Galácticos', strength: 95, fame: 150, minRank: 7 }
];

function getRank(fame) {
    for (let i = RANKS.length - 1; i >= 0; i--) {
        if (fame >= RANKS[i].fame) return i;
    }
    return 0;
}

function getTeamStrength(players) {
    if (players.length === 0) return 0;
    const total = players.reduce((s, p) => {
        const pos = POSITIONS[p.position] || { defWeight: 0.25, atkWeight: 0.25, spdWeight: 0.25 };
        return s + p.attack * pos.atkWeight + p.defense * pos.defWeight + p.speed * pos.spdWeight + p.overall * 0.25;
    }, 0);
    return Math.floor(total / players.length);
}

function generatePlayer(position) {
    const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    const pos = POSITIONS[position];
    const base = 35 + Math.floor(Math.random() * 25);
    const atk = base + Math.floor(pos.atkWeight * 30 + Math.random() * 15);
    const def = base + Math.floor(pos.defWeight * 30 + Math.random() * 15);
    const spd = base + Math.floor(pos.spdWeight * 30 + Math.random() * 15);
    const overall = Math.floor((atk + def + spd) / 3);
    const salary = Math.floor(overall * 0.3);
    return { name: `${first} ${last}`, position, overall, attack: atk, defense: def, speed: spd, salary };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fussball')
        .setDescription('⚽ Manage dein eigenes Fußballteam!')
        .addSubcommand(s => s.setName('status').setDescription('Zeige deinen Team-Status'))
        .addSubcommand(s => s.setName('umbenennen').setDescription('Benenne dein Team um')
            .addStringOption(o => o.setName('name').setDescription('Neuer Teamname').setRequired(true)))
        .addSubcommand(s => s.setName('kader').setDescription('Zeige deinen Kader'))
        .addSubcommand(s => s.setName('verpflichten').setDescription('Verpflichte einen neuen Spieler')
            .addStringOption(o => o.setName('position').setDescription('Position').setRequired(true)
                .addChoices(...Object.entries(POSITIONS).map(([k, v]) => ({ name: v.name, value: k })))))
        .addSubcommand(s => s.setName('trainieren').setDescription('Trainiere einen Spieler')
            .addIntegerOption(o => o.setName('id').setDescription('Spieler-ID').setRequired(true)))
        .addSubcommand(s => s.setName('spiel').setDescription('Spiele ein Match')
            .addIntegerOption(o => o.setName('gegner').setDescription('Gegner-Nr (1-9)').setRequired(true)))
        .addSubcommand(s => s.setName('upgrade').setDescription('Verbessere dein Team')
            .addStringOption(o => o.setName('was').setDescription('Was upgraden').setRequired(true)
                .addChoices(
                    { name: '🏟️ Stadion', value: 'stadium' },
                    { name: '🏋️ Trainingsgelände', value: 'training' },
                    { name: '🏥 Medizin', value: 'medical' },
                    { name: '🧒 Jugendakademie', value: 'youth' }
                )))
        .addSubcommand(s => s.setName('entlassen').setDescription('Entlasse einen Spieler')
            .addIntegerOption(o => o.setName('id').setDescription('Spieler-ID').setRequired(true)))
        .addSubcommand(s => s.setName('gegner').setDescription('Zeige alle Gegner'))
        .addSubcommand(s => s.setName('duell').setDescription('Spiele gegen ein anderes Team')
            .addUserOption(o => o.setName('manager').setDescription('Gegnerischer Manager').setRequired(true))),

    async execute(interaction) {
        ensureFootballTables();
        const config = require('../config.json');
        const sub = interaction.options.getSubcommand();
        const userId = interaction.user.id;

        let team = db.db.prepare('SELECT * FROM football_teams WHERE user_id = ?').get(userId);

        if (!team && sub !== 'status') {
            return interaction.reply({ content: '❌ Benutze `/fussball status` um dein Team zu gründen!', ephemeral: true });
        }

        if (sub === 'status') {
            if (!team) {
                db.db.prepare('INSERT INTO football_teams (user_id) VALUES (?)').run(userId);
                team = db.db.prepare('SELECT * FROM football_teams WHERE user_id = ?').get(userId);

                const starterPositions = ['TW', 'IV', 'IV', 'AV', 'ZM', 'ZM', 'OM', 'ST'];
                for (const pos of starterPositions) {
                    const p = generatePlayer(pos);
                    db.db.prepare('INSERT INTO football_players (user_id, name, position, overall, attack, defense, speed, salary) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
                        .run(userId, p.name, p.position, p.overall, p.attack, p.defense, p.speed, p.salary);
                }

                const embed = new EmbedBuilder()
                    .setColor('#2ECC71')
                    .setTitle('⚽ Team gegründet!')
                    .setDescription('Dein **FC Unbekannt** ist bereit!\n\n8 Startspieler wurden verpflichtet.\nSpiele dein erstes Match mit `/fussball spiel`!');
                return interaction.reply({ embeds: [embed] });
            }

            const rank = getRank(team.fame);
            const nextRank = rank < RANKS.length - 1 ? RANKS[rank + 1] : null;
            const players = db.db.prepare('SELECT * FROM football_players WHERE user_id = ?').all(userId);
            const strength = getTeamStrength(players);
            const gd = team.goals_scored - team.goals_conceded;

            const embed = new EmbedBuilder()
                .setColor('#2ECC71')
                .setTitle(`⚽ ${team.team_name}`)
                .setDescription(`**${RANKS[rank].name}** (Rang ${rank})\n${nextRank ? `Aufstieg: ${nextRank.name} (${team.fame}/${nextRank.fame} Ruhm)` : '👑 MAXIMALER RANG!'}`)
                .addFields(
                    { name: '⭐ Ruhm', value: `${team.fame}`, inline: true },
                    { name: '💪 Stärke', value: `${strength}`, inline: true },
                    { name: '👥 Kader', value: `${players.length}`, inline: true },
                    { name: '📊 Bilanz', value: `${team.wins}S ${team.draws}U ${team.losses}N`, inline: true },
                    { name: '⚽ Tore', value: `${team.goals_scored}:${team.goals_conceded} (${gd >= 0 ? '+' : ''}${gd})`, inline: true },
                    { name: '💰 Budget', value: `${team.budget} Coins`, inline: true },
                    { name: '🏟️ Stadion', value: `Lv.${team.stadium_level}`, inline: true },
                    { name: '🏋️ Training', value: `Lv.${team.training_level}`, inline: true },
                    { name: '🏥 Medizin', value: `Lv.${team.medical_level}`, inline: true }
                );
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'umbenennen') {
            const name = interaction.options.getString('name');
            if (name.length > 25) return interaction.reply({ content: '❌ Max. 25 Zeichen!', ephemeral: true });
            db.db.prepare('UPDATE football_teams SET team_name = ? WHERE user_id = ?').run(name, userId);
            return interaction.reply({ embeds: [new EmbedBuilder().setColor('#2ECC71').setTitle('⚽ Umbenannt!').setDescription(`Dein Team heißt jetzt **${name}**!`)] });
        }

        if (sub === 'kader') {
            const players = db.db.prepare('SELECT * FROM football_players WHERE user_id = ? ORDER BY overall DESC').all(userId);
            if (players.length === 0) return interaction.reply({ content: '❌ Kein Spieler im Kader!', ephemeral: true });

            const list = players.map(p => {
                const pos = POSITIONS[p.position];
                return `**#${p.id} ${p.name}** ${pos?.name || p.position} | OVR: ${p.overall}\n⚔️ ${p.attack} | 🛡️ ${p.defense} | 🏃 ${p.speed} | 💪 ${p.stamina}% | 😊 ${p.morale}%\n⚽ ${p.goals} Tore, ${p.assists} Assists | 💰 ${p.salary}/Spiel`;
            }).join('\n\n');

            return interaction.reply({ embeds: [new EmbedBuilder().setColor('#2ECC71').setTitle(`⚽ Kader — ${team.team_name}`).setDescription(list).setFooter({ text: `${players.length} Spieler | Stärke: ${getTeamStrength(players)}` })] });
        }

        if (sub === 'verpflichten') {
            const position = interaction.options.getString('position');
            const rank = getRank(team.fame);
            const maxPlayers = 8 + rank * 2;
            const playerCount = db.db.prepare('SELECT COUNT(*) as cnt FROM football_players WHERE user_id = ?').get(userId).cnt;
            if (playerCount >= maxPlayers) return interaction.reply({ content: `❌ Kader voll! ${playerCount}/${maxPlayers}`, ephemeral: true });

            const p = generatePlayer(position);
            const youthBonus = team.youth_level * 3;
            p.overall = Math.min(99, p.overall + youthBonus);
            p.attack = Math.min(99, p.attack + youthBonus);
            p.defense = Math.min(99, p.defense + youthBonus);

            const cost = p.overall * 15;
            let balance = db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId);
            if (!balance || balance.balance < cost) return interaction.reply({ content: `❌ Verpflichtung kostet ${cost} Coins.`, ephemeral: true });

            db.db.prepare('UPDATE economy SET balance = balance - ? WHERE user_id = ?').run(cost, userId);
            db.db.prepare('INSERT INTO football_players (user_id, name, position, overall, attack, defense, speed, salary) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
                .run(userId, p.name, p.position, p.overall, p.attack, p.defense, p.speed, p.salary);

            const pos = POSITIONS[position];
            const embed = new EmbedBuilder()
                .setColor('#2ECC71')
                .setTitle('🤝 Neuer Spieler!')
                .setDescription(`**${p.name}** — ${pos.name}\nOVR: ${p.overall} | ⚔️ ${p.attack} | 🛡️ ${p.defense} | 🏃 ${p.speed}\n💰 Gehalt: ${p.salary}/Spiel\n💰 -${cost} Coins Ablöse`);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'trainieren') {
            const cdKey = `fb_train_${userId}`;
            if (cooldowns.has(cdKey) && cooldowns.get(cdKey) > Date.now()) {
                const left = Math.ceil((cooldowns.get(cdKey) - Date.now()) / 1000);
                return interaction.reply({ content: `⏳ Training-Cooldown: ${left}s`, ephemeral: true });
            }

            const playerId = interaction.options.getInteger('id');
            const player = db.db.prepare('SELECT * FROM football_players WHERE id = ? AND user_id = ?').get(playerId, userId);
            if (!player) return interaction.reply({ content: '❌ Spieler nicht gefunden!', ephemeral: true });

            const cost = player.overall * 5;
            let balance = db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId);
            if (!balance || balance.balance < cost) return interaction.reply({ content: `❌ Training kostet ${cost} Coins.`, ephemeral: true });

            const trainBonus = team.training_level * 0.5;
            const atkGain = Math.floor(Math.random() * 3 + trainBonus);
            const defGain = Math.floor(Math.random() * 3 + trainBonus);
            const spdGain = Math.floor(Math.random() * 2 + trainBonus * 0.5);

            db.db.prepare('UPDATE economy SET balance = balance - ? WHERE user_id = ?').run(cost, userId);
            db.db.prepare('UPDATE football_players SET attack = MIN(99, attack + ?), defense = MIN(99, defense + ?), speed = MIN(99, speed + ?), overall = MIN(99, overall + ?), stamina = MAX(50, stamina - 10) WHERE id = ?')
                .run(atkGain, defGain, spdGain, Math.floor((atkGain + defGain + spdGain) / 3), playerId);

            const embed = new EmbedBuilder()
                .setColor('#2ECC71')
                .setTitle(`🏋️ ${player.name} trainiert!`)
                .setDescription(`⚔️ Angriff: +${atkGain}\n🛡️ Verteidigung: +${defGain}\n🏃 Speed: +${spdGain}\n💰 -${cost} Coins`);

            cooldowns.set(cdKey, Date.now() + 60000);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'spiel') {
            const cdKey = `fb_match_${userId}`;
            if (cooldowns.has(cdKey) && cooldowns.get(cdKey) > Date.now()) {
                const left = Math.ceil((cooldowns.get(cdKey) - Date.now()) / 1000);
                return interaction.reply({ content: `⏳ Nächstes Spiel in ${left}s.`, ephemeral: true });
            }

            const oppIdx = interaction.options.getInteger('gegner') - 1;
            if (oppIdx < 0 || oppIdx >= OPPONENTS.length) return interaction.reply({ content: '❌ Ungültiger Gegner!', ephemeral: true });

            const opponent = OPPONENTS[oppIdx];
            const rank = getRank(team.fame);
            if (rank < opponent.minRank) return interaction.reply({ content: `❌ Braucht Rang ${opponent.minRank} (${RANKS[opponent.minRank].name}).`, ephemeral: true });

            const players = db.db.prepare('SELECT * FROM football_players WHERE user_id = ? AND stamina > 20 ORDER BY overall DESC LIMIT 11').all(userId);
            if (players.length < 5) return interaction.reply({ content: '❌ Nicht genug fitte Spieler!', ephemeral: true });

            const myStrength = getTeamStrength(players);
            const stadiumBonus = team.stadium_level * 2;
            let myGoals = 0, oppGoals = 0;
            const log = [];

            for (let minute = 1; minute <= 90; minute += Math.floor(Math.random() * 20) + 10) {
                const event = MATCH_EVENTS[Math.floor(Math.random() * MATCH_EVENTS.length)];
                const myChance = (myStrength + stadiumBonus) / (myStrength + stadiumBonus + opponent.strength);

                if (event.type === 'goal' || event.type === 'penalty' || event.type === 'near_miss' || event.type === 'momentum') {
                    const isMyTeam = Math.random() < myChance;
                    const scores = Math.random() < event.goalChance;

                    if (scores) {
                        if (isMyTeam) {
                            myGoals++;
                            const scorer = players[Math.floor(Math.random() * players.length)];
                            log.push(`⏱️ ${minute}' ${event.text} — **${scorer.name}** (${team.team_name}) ${myGoals}:${oppGoals}`);
                            db.db.prepare('UPDATE football_players SET goals = goals + 1 WHERE id = ?').run(scorer.id);
                        } else {
                            oppGoals++;
                            log.push(`⏱️ ${minute}' ${event.text} — ${opponent.name} ${myGoals}:${oppGoals}`);
                        }
                    } else {
                        log.push(`⏱️ ${minute}' ${event.text}`);
                    }
                } else {
                    log.push(`⏱️ ${minute}' ${event.text}`);
                }
            }

            const won = myGoals > oppGoals;
            const draw = myGoals === oppGoals;
            const salaryCost = players.reduce((s, p) => s + p.salary, 0);
            const ticketRevenue = (won ? 1.5 : draw ? 1.0 : 0.7) * team.stadium_level * 50;
            const reward = Math.floor(ticketRevenue + (won ? opponent.strength * 5 : draw ? opponent.strength * 2 : 0));
            const netReward = Math.max(0, reward - salaryCost);

            let bal = db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId);
            if (!bal) db.db.prepare('INSERT INTO economy (user_id, balance) VALUES (?, 0)').run(userId);
            db.db.prepare('UPDATE economy SET balance = balance + ? WHERE user_id = ?').run(netReward, userId);

            const fameGain = won ? opponent.fame : draw ? Math.floor(opponent.fame * 0.3) : 0;
            db.db.prepare(`UPDATE football_teams SET wins = wins + ?, draws = draws + ?, losses = losses + ?, goals_scored = goals_scored + ?, goals_conceded = goals_conceded + ?, fame = fame + ?, total_earned = total_earned + ? WHERE user_id = ?`)
                .run(won ? 1 : 0, draw ? 1 : 0, !won && !draw ? 1 : 0, myGoals, oppGoals, fameGain, netReward, userId);

            for (const p of players) {
                db.db.prepare('UPDATE football_players SET stamina = MAX(20, stamina - ?), morale = MIN(100, morale + ?) WHERE id = ?')
                    .run(15 + Math.floor(Math.random() * 10), won ? 5 : draw ? 0 : -5, p.id);
            }
            db.db.prepare('UPDATE football_players SET stamina = MIN(100, stamina + 5) WHERE user_id = ?').run(userId);

            const embed = new EmbedBuilder()
                .setColor(won ? '#00aa00' : draw ? '#ffaa00' : '#ff0000')
                .setTitle(`⚽ ${team.team_name} ${myGoals} : ${oppGoals} ${opponent.name}`)
                .setDescription(log.slice(-8).join('\n') + `\n\n${won ? '🏆 **SIEG!**' : draw ? '🤝 **Unentschieden!**' : '💀 **Niederlage!**'}\n\n🎟️ Einnahmen: ${reward} | 💰 Gehälter: -${salaryCost}\n💰 **Gewinn: ${netReward} Coins**\n⭐ +${fameGain} Ruhm`)
                .setFooter({ text: `Teamstärke: ${myStrength} vs ${opponent.strength}` });

            cooldowns.set(cdKey, Date.now() + 70000);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'upgrade') {
            const what = interaction.options.getString('was');
            const ups = {
                stadium: { field: 'stadium_level', name: '🏟️ Stadion', baseCost: 800, max: 10, desc: 'Mehr Einnahmen' },
                training: { field: 'training_level', name: '🏋️ Training', baseCost: 600, max: 10, desc: 'Besseres Training' },
                medical: { field: 'medical_level', name: '🏥 Medizin', baseCost: 500, max: 10, desc: 'Schnellere Erholung' },
                youth: { field: 'youth_level', name: '🧒 Jugend', baseCost: 700, max: 10, desc: 'Bessere Neuzugänge' }
            };

            const upgrade = ups[what];
            const current = team[upgrade.field];
            if (current >= upgrade.max) return interaction.reply({ content: '❌ Maximum!', ephemeral: true });

            const cost = upgrade.baseCost * (current + 1);
            let balance = db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId);
            if (!balance || balance.balance < cost) return interaction.reply({ content: `❌ Kostet ${cost} Coins.`, ephemeral: true });

            db.db.prepare('UPDATE economy SET balance = balance - ? WHERE user_id = ?').run(cost, userId);
            db.db.prepare(`UPDATE football_teams SET ${upgrade.field} = ${upgrade.field} + 1 WHERE user_id = ?`).run(userId);

            return interaction.reply({ embeds: [new EmbedBuilder().setColor('#2ECC71').setTitle(`⬆️ ${upgrade.name} verbessert!`).setDescription(`Lv.${current} → Lv.${current + 1}\n${upgrade.desc}\n💰 -${cost} Coins`)] });
        }

        if (sub === 'entlassen') {
            const playerId = interaction.options.getInteger('id');
            const player = db.db.prepare('SELECT * FROM football_players WHERE id = ? AND user_id = ?').get(playerId, userId);
            if (!player) return interaction.reply({ content: '❌ Spieler nicht gefunden!', ephemeral: true });
            db.db.prepare('DELETE FROM football_players WHERE id = ?').run(playerId);
            return interaction.reply({ embeds: [new EmbedBuilder().setColor('#2ECC71').setTitle('👋 Spieler entlassen').setDescription(`**${player.name}** verlässt den Verein.`)] });
        }

        if (sub === 'gegner') {
            const rank = getRank(team.fame);
            const list = OPPONENTS.map((o, i) => {
                const locked = rank < o.minRank;
                return `${locked ? '🔒' : '⚽'} **${i + 1}. ${o.name}** ${locked ? `(Rang ${o.minRank})` : ''}\n💪 Stärke: ${o.strength} | ⭐ +${o.fame} Ruhm`;
            }).join('\n\n');

            return interaction.reply({ embeds: [new EmbedBuilder().setColor('#2ECC71').setTitle('⚽ Gegner').setDescription(list).setFooter({ text: `Rang: ${RANKS[rank].name}` })] });
        }

        if (sub === 'duell') {
            const cdKey = `fb_duel_${userId}`;
            if (cooldowns.has(cdKey) && cooldowns.get(cdKey) > Date.now()) {
                const left = Math.ceil((cooldowns.get(cdKey) - Date.now()) / 1000);
                return interaction.reply({ content: `⏳ Duell-Cooldown: ${left}s`, ephemeral: true });
            }

            const opponent = interaction.options.getUser('manager');
            if (opponent.id === userId) return interaction.reply({ content: '❌ Nicht gegen dich selbst!', ephemeral: true });
            if (opponent.bot) return interaction.reply({ content: '❌ Bots spielen kein Fußball!', ephemeral: true });

            const oppTeam = db.db.prepare('SELECT * FROM football_teams WHERE user_id = ?').get(opponent.id);
            if (!oppTeam) return interaction.reply({ content: '❌ Gegner hat kein Team!', ephemeral: true });

            const myPlayers = db.db.prepare('SELECT * FROM football_players WHERE user_id = ? ORDER BY overall DESC LIMIT 11').all(userId);
            const oppPlayers = db.db.prepare('SELECT * FROM football_players WHERE user_id = ? ORDER BY overall DESC LIMIT 11').all(opponent.id);

            const myStr = getTeamStrength(myPlayers);
            const oppStr = getTeamStrength(oppPlayers);

            let myGoals = 0, oppGoals = 0;
            for (let i = 0; i < 6; i++) {
                const myRoll = Math.floor(Math.random() * myStr) + Math.floor(Math.random() * 20);
                const oppRoll = Math.floor(Math.random() * oppStr) + Math.floor(Math.random() * 20);
                if (myRoll > oppRoll + 10) myGoals++;
                if (oppRoll > myRoll + 10) oppGoals++;
            }

            const won = myGoals > oppGoals;
            const draw = myGoals === oppGoals;
            const reward = 600;

            if (!draw) {
                const winnerId = won ? userId : opponent.id;
                let bal = db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(winnerId);
                if (!bal) db.db.prepare('INSERT INTO economy (user_id, balance) VALUES (?, 0)').run(winnerId);
                db.db.prepare('UPDATE economy SET balance = balance + ? WHERE user_id = ?').run(reward, winnerId);
                db.db.prepare('UPDATE football_teams SET fame = fame + 25 WHERE user_id = ?').run(winnerId);
            }

            const embed = new EmbedBuilder()
                .setColor(draw ? '#ffff00' : (won ? '#00ff00' : '#ff0000'))
                .setTitle(`⚽ ${team.team_name} ${myGoals} : ${oppGoals} ${oppTeam.team_name}`)
                .setDescription(`💪 ${myStr} vs ${oppStr}\n\n${draw ? '🤝 Unentschieden!' : (won ? `🏆 **${team.team_name}** gewinnt! +${reward} Coins, +25 Ruhm` : `💀 **${oppTeam.team_name}** gewinnt!`)}`)
                .setFooter({ text: `${interaction.user.username} vs ${opponent.username}` });

            cooldowns.set(cdKey, Date.now() + 120000);
            return interaction.reply({ embeds: [embed] });
        }
    }
};
