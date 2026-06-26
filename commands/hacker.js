const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database');

const cooldowns = new Map();

function ensureHackerTables() {
    db.db.exec(`
        CREATE TABLE IF NOT EXISTS hackers (
            user_id TEXT PRIMARY KEY,
            handle TEXT DEFAULT 'Anonymous',
            rank INTEGER DEFAULT 0,
            coding INTEGER DEFAULT 1,
            networking INTEGER DEFAULT 1,
            crypto INTEGER DEFAULT 1,
            social INTEGER DEFAULT 1,
            reputation INTEGER DEFAULT 0,
            bitcoins REAL DEFAULT 0.5,
            vpn_active INTEGER DEFAULT 0,
            total_hacks INTEGER DEFAULT 0,
            total_earned INTEGER DEFAULT 0,
            streak INTEGER DEFAULT 0,
            last_hack TEXT DEFAULT '',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    db.db.exec(`
        CREATE TABLE IF NOT EXISTS hacker_programs (
            user_id TEXT,
            program_id TEXT,
            level INTEGER DEFAULT 1,
            PRIMARY KEY (user_id, program_id)
        )
    `);
}

const RANKS = [
    { name: 'Script Kiddie', rep: 0 },
    { name: 'Newbie Hacker', rep: 100 },
    { name: 'Grey Hat', rep: 300 },
    { name: 'Black Hat', rep: 600 },
    { name: 'Elite Hacker', rep: 1200 },
    { name: 'Cyber Ghost', rep: 2500 },
    { name: 'Zero Day Master', rep: 5000 },
    { name: 'Digital God', rep: 10000 }
];

const PROGRAMS = {
    portscanner: { name: 'Port Scanner', desc: 'Findet offene Ports', cost: 0.2, stat: 'networking', bonus: 2 },
    bruteforce: { name: 'Brute Force', desc: 'Knackt schwache Passwörter', cost: 0.5, stat: 'coding', bonus: 3 },
    keylogger: { name: 'Keylogger', desc: 'Zeichnet Tastatureingaben auf', cost: 1.0, stat: 'social', bonus: 2 },
    rootkit: { name: 'Rootkit', desc: 'Versteckt deine Spuren', cost: 2.0, stat: 'crypto', bonus: 4 },
    ransomware: { name: 'Ransomware', desc: 'Verschlüsselt Zieldaten', cost: 3.5, stat: 'coding', bonus: 5 },
    exploit_kit: { name: 'Exploit Kit', desc: 'Sammlung von 0-Day Exploits', cost: 5.0, stat: 'networking', bonus: 6 },
    botnet: { name: 'Botnet', desc: 'Netzwerk aus Zombie-Rechnern', cost: 8.0, stat: 'networking', bonus: 8 },
    quantum_decrypt: { name: 'Quantum Decryptor', desc: 'Knackt jede Verschlüsselung', cost: 15.0, stat: 'crypto', bonus: 10 }
};

const TARGETS = [
    { id: 'wifi', name: 'Nachbars WLAN', difficulty: 5, reward: [50, 150], btc: [0.01, 0.05], rep: 5, minRank: 0 },
    { id: 'email', name: 'E-Mail Server', difficulty: 10, reward: [100, 300], btc: [0.02, 0.08], rep: 10, minRank: 0 },
    { id: 'shop', name: 'Online-Shop DB', difficulty: 18, reward: [200, 600], btc: [0.05, 0.15], rep: 20, minRank: 1 },
    { id: 'social', name: 'Social Media Plattform', difficulty: 25, reward: [400, 1000], btc: [0.1, 0.3], rep: 30, minRank: 2 },
    { id: 'bank', name: 'Bank-Server', difficulty: 35, reward: [800, 2000], btc: [0.2, 0.5], rep: 50, minRank: 3 },
    { id: 'corp', name: 'Konzern-Netzwerk', difficulty: 45, reward: [1500, 4000], btc: [0.5, 1.0], rep: 75, minRank: 4 },
    { id: 'gov', name: 'Regierungsserver', difficulty: 55, reward: [3000, 8000], btc: [1.0, 2.5], rep: 100, minRank: 5 },
    { id: 'military', name: 'Militär-Mainframe', difficulty: 70, reward: [5000, 15000], btc: [2.0, 5.0], rep: 150, minRank: 6 },
    { id: 'nsa', name: 'NSA Darknet Node', difficulty: 90, reward: [10000, 30000], btc: [5.0, 10.0], rep: 250, minRank: 7 }
];

const HACK_EVENTS = [
    { text: '🔓 Backdoor gefunden! Sofortiger Zugang.', modifier: 15 },
    { text: '🐛 Ein Bug im System gibt dir root-Rechte!', modifier: 12 },
    { text: '📡 Unverschlüsselte Verbindung abgefangen!', modifier: 10 },
    { text: '⚡ Buffer Overflow ausgenutzt!', modifier: 8 },
    { text: '🔍 IDS hat dich fast erwischt...', modifier: -5 },
    { text: '🚨 Firewall-Alarm ausgelöst!', modifier: -10 },
    { text: '🕵️ Honeypot entdeckt — Falle!', modifier: -15 },
    { text: '💀 Gegenattacke! Dein System wird gescannt!', modifier: -20 }
];

const TRACE_EVENTS = [
    'Die Polizei hat deine IP zurückverfolgt! Du verlierst {fine} Coins.',
    'Ein Whitehat hat dich gemeldet! {fine} Coins Strafe.',
    'Dein VPN wurde kompromittiert! {fine} Coins weg.',
    'Ein Honeypot hat dich erwischt! {fine} Coins Verlust.'
];

function getRank(rep) {
    let rank = 0;
    for (let i = RANKS.length - 1; i >= 0; i--) {
        if (rep >= RANKS[i].rep) { rank = i; break; }
    }
    return rank;
}

function getSkillTotal(hacker, programs) {
    let total = hacker.coding + hacker.networking + hacker.crypto + hacker.social;
    for (const prog of programs) {
        const info = PROGRAMS[prog.program_id];
        if (info) total += info.bonus * prog.level;
    }
    return total;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hacker')
        .setDescription('💻 Werde ein Elite-Hacker im Cyberspace!')
        .addSubcommand(s => s.setName('profil').setDescription('Zeige dein Hacker-Profil'))
        .addSubcommand(s => s.setName('handle').setDescription('Wähle deinen Hacker-Namen')
            .addStringOption(o => o.setName('name').setDescription('Dein neuer Handle').setRequired(true)))
        .addSubcommand(s => s.setName('hacken').setDescription('Hacke ein Ziel')
            .addStringOption(o => o.setName('ziel').setDescription('Das Ziel').setRequired(true)
                .addChoices(...TARGETS.map(t => ({ name: t.name, value: t.id })))))
        .addSubcommand(s => s.setName('trainieren').setDescription('Trainiere einen Skill')
            .addStringOption(o => o.setName('skill').setDescription('Der Skill').setRequired(true)
                .addChoices(
                    { name: 'Coding', value: 'coding' },
                    { name: 'Networking', value: 'networking' },
                    { name: 'Kryptografie', value: 'crypto' },
                    { name: 'Social Engineering', value: 'social' }
                )))
        .addSubcommand(s => s.setName('programme').setDescription('Zeige deine Programme'))
        .addSubcommand(s => s.setName('kaufen').setDescription('Kaufe ein Programm')
            .addStringOption(o => o.setName('programm').setDescription('Das Programm').setRequired(true)
                .addChoices(...Object.entries(PROGRAMS).map(([k, v]) => ({ name: v.name, value: k })))))
        .addSubcommand(s => s.setName('ziele').setDescription('Zeige verfügbare Ziele'))
        .addSubcommand(s => s.setName('cyberwar').setDescription('Starte einen Cyberwar gegen einen Spieler')
            .addUserOption(o => o.setName('gegner').setDescription('Dein Gegner').setRequired(true))),

    async execute(interaction) {
        ensureHackerTables();
        const config = require('../config.json');
        const sub = interaction.options.getSubcommand();
        const userId = interaction.user.id;

        const hacker = db.db.prepare('SELECT * FROM hackers WHERE user_id = ?').get(userId);

        if (!hacker && sub !== 'profil' && sub !== 'handle') {
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('💻 Hacker Terminal')
                .setDescription('Du bist noch kein Hacker!\nBenutze `/hacker profil` um dein Terminal zu starten.');
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'profil') {
            if (!hacker) {
                db.db.prepare('INSERT INTO hackers (user_id) VALUES (?)').run(userId);
                const embed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('💻 Terminal gestartet...')
                    .setDescription('```\n> INITIALIZING HACKER OS...\n> CREATING IDENTITY...\n> CONNECTING TO DARKNET...\n> SYSTEM READY.\n```\nWillkommen im Cyberspace, **Script Kiddie**!')
                    .addFields(
                        { name: '🪪 Handle', value: 'Anonymous', inline: true },
                        { name: '₿ Bitcoin', value: '0.50 BTC', inline: true }
                    );
                return interaction.reply({ embeds: [embed] });
            }

            const rank = getRank(hacker.reputation);
            const nextRank = rank < RANKS.length - 1 ? RANKS[rank + 1] : null;
            const programs = db.db.prepare('SELECT * FROM hacker_programs WHERE user_id = ?').all(userId);

            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle(`💻 ${hacker.handle}`)
                .setDescription(`\`\`\`\n${RANKS[rank].name} [Rang ${rank}]\n${nextRank ? `Nächster Rang: ${nextRank.name} (${hacker.reputation}/${nextRank.rep} Rep)` : 'MAXIMALER RANG ERREICHT'}\n\`\`\``)
                .addFields(
                    { name: '⭐ Reputation', value: `${hacker.reputation}`, inline: true },
                    { name: '₿ Bitcoin', value: `${hacker.bitcoins.toFixed(2)} BTC`, inline: true },
                    { name: '🔐 VPN', value: hacker.vpn_active ? '✅ Aktiv' : '❌ Aus', inline: true },
                    { name: '💻 Skills', value: `Coding: ${hacker.coding}\nNetworking: ${hacker.networking}\nKrypto: ${hacker.crypto}\nSocial: ${hacker.social}`, inline: true },
                    { name: '📊 Statistiken', value: `Hacks: ${hacker.total_hacks}\nVerdient: ${hacker.total_earned} Coins\nStreak: ${hacker.streak}🔥`, inline: true },
                    { name: '🖥️ Programme', value: programs.length > 0 ? programs.map(p => `${PROGRAMS[p.program_id]?.name || p.program_id} Lv.${p.level}`).join(', ') : 'Keine', inline: true }
                )
                .setFooter({ text: 'Skill Total: ' + getSkillTotal(hacker, programs) });
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'handle') {
            const name = interaction.options.getString('name');
            if (name.length > 20) {
                return interaction.reply({ content: '❌ Handle darf max. 20 Zeichen lang sein.', ephemeral: true });
            }
            if (!hacker) {
                db.db.prepare('INSERT INTO hackers (user_id, handle) VALUES (?, ?)').run(userId, name);
            } else {
                db.db.prepare('UPDATE hackers SET handle = ? WHERE user_id = ?').run(name, userId);
            }
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('💻 Handle geändert')
                .setDescription(`\`\`\`\n> SET HANDLE "${name}"\n> IDENTITY UPDATED.\n\`\`\``);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'hacken') {
            const cdKey = `hacker_hack_${userId}`;
            if (cooldowns.has(cdKey) && cooldowns.get(cdKey) > Date.now()) {
                const left = Math.ceil((cooldowns.get(cdKey) - Date.now()) / 1000);
                return interaction.reply({ content: `⏳ Warte ${left}s bevor du wieder hacken kannst.`, ephemeral: true });
            }

            const targetId = interaction.options.getString('ziel');
            const target = TARGETS.find(t => t.id === targetId);
            const rank = getRank(hacker.reputation);

            if (rank < target.minRank) {
                return interaction.reply({ content: `❌ Du brauchst mindestens Rang ${target.minRank} (${RANKS[target.minRank].name}) für dieses Ziel.`, ephemeral: true });
            }

            const programs = db.db.prepare('SELECT * FROM hacker_programs WHERE user_id = ?').all(userId);
            const skillTotal = getSkillTotal(hacker, programs);
            const event = HACK_EVENTS[Math.floor(Math.random() * HACK_EVENTS.length)];
            const d20 = Math.floor(Math.random() * 20) + 1;
            const hackPower = d20 + Math.floor(skillTotal / 5) + event.modifier;
            const success = hackPower >= target.difficulty;

            const embed = new EmbedBuilder().setTitle(`💻 Hacking: ${target.name}`);

            let description = `\`\`\`\n> CONNECTING TO TARGET...\n> SCANNING PORTS...\n> ATTEMPTING INFILTRATION...\n\`\`\`\n${event.text}\n\n🎲 Würfel: **${d20}** + Skill: **${Math.floor(skillTotal / 5)}** + Event: **${event.modifier}** = **${hackPower}** vs **${target.difficulty}**\n\n`;

            if (success) {
                const reward = target.reward[0] + Math.floor(Math.random() * (target.reward[1] - target.reward[0]));
                const btc = target.btc[0] + Math.random() * (target.btc[1] - target.btc[0]);
                const streakBonus = Math.floor(reward * hacker.streak * 0.05);
                const totalReward = reward + streakBonus;

                let balance = db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId);
                if (!balance) {
                    db.db.prepare('INSERT INTO economy (user_id, balance) VALUES (?, ?)').run(userId, 0);
                    balance = { balance: 0 };
                }
                db.db.prepare('UPDATE economy SET balance = balance + ? WHERE user_id = ?').run(totalReward, userId);
                db.db.prepare('UPDATE hackers SET bitcoins = bitcoins + ?, reputation = reputation + ?, total_hacks = total_hacks + 1, total_earned = total_earned + ?, streak = streak + 1 WHERE user_id = ?')
                    .run(btc, target.rep, totalReward, userId);

                description += `✅ **HACK ERFOLGREICH!**\n💰 +${totalReward} Coins${streakBonus > 0 ? ` (davon ${streakBonus} Streak-Bonus)` : ''}\n₿ +${btc.toFixed(3)} BTC\n⭐ +${target.rep} Reputation\n🔥 Streak: ${hacker.streak + 1}`;
                embed.setColor('#00ff00');
            } else {
                const traced = Math.random() < 0.4 && !hacker.vpn_active;
                description += '❌ **HACK FEHLGESCHLAGEN!**\n';

                if (traced) {
                    const fine = Math.floor(target.reward[0] * 0.5);
                    const traceMsg = TRACE_EVENTS[Math.floor(Math.random() * TRACE_EVENTS.length)].replace('{fine}', fine);
                    db.db.prepare('UPDATE economy SET balance = MAX(0, balance - ?) WHERE user_id = ?').run(fine, userId);
                    db.db.prepare('UPDATE hackers SET streak = 0, reputation = MAX(0, reputation - ?) WHERE user_id = ?').run(Math.floor(target.rep / 2), userId);
                    description += `🚨 ${traceMsg}\n⭐ -${Math.floor(target.rep / 2)} Reputation\n🔥 Streak zurückgesetzt!`;
                } else {
                    db.db.prepare('UPDATE hackers SET streak = 0 WHERE user_id = ?').run(userId);
                    description += hacker.vpn_active ? '🛡️ Dein VPN hat dich geschützt!' : '😮‍💨 Knapp entkommen, aber Streak verloren.';
                }
                embed.setColor('#ff0000');
            }

            if (hacker.vpn_active) {
                db.db.prepare('UPDATE hackers SET vpn_active = 0 WHERE user_id = ?').run(userId);
                description += '\n\n🔒 VPN-Verbindung nach Hack getrennt.';
            }

            embed.setDescription(description);
            cooldowns.set(cdKey, Date.now() + 45000);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'trainieren') {
            const cdKey = `hacker_train_${userId}`;
            if (cooldowns.has(cdKey) && cooldowns.get(cdKey) > Date.now()) {
                const left = Math.ceil((cooldowns.get(cdKey) - Date.now()) / 1000);
                return interaction.reply({ content: `⏳ Training-Cooldown: ${left}s`, ephemeral: true });
            }

            const skill = interaction.options.getString('skill');
            const skillNames = { coding: 'Coding', networking: 'Networking', crypto: 'Kryptografie', social: 'Social Engineering' };
            const currentVal = hacker[skill];
            const cost = currentVal * 50;

            let balance = db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId);
            if (!balance || balance.balance < cost) {
                return interaction.reply({ content: `❌ Du brauchst ${cost} Coins für das Training. Du hast ${balance?.balance || 0}.`, ephemeral: true });
            }

            const success = Math.random() < 0.75;
            if (success) {
                db.db.prepare('UPDATE economy SET balance = balance - ? WHERE user_id = ?').run(cost, userId);
                db.db.prepare(`UPDATE hackers SET ${skill} = ${skill} + 1 WHERE user_id = ?`).run(userId);
                const embed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('💻 Training erfolgreich!')
                    .setDescription(`\`\`\`\n> RUNNING ${skillNames[skill].toUpperCase()} MODULE...\n> SKILL UPGRADED!\n\`\`\`\n**${skillNames[skill]}**: ${currentVal} → ${currentVal + 1}\n💰 -${cost} Coins`);
                cooldowns.set(cdKey, Date.now() + 60000);
                return interaction.reply({ embeds: [embed] });
            } else {
                db.db.prepare('UPDATE economy SET balance = balance - ? WHERE user_id = ?').run(Math.floor(cost / 2), userId);
                const embed = new EmbedBuilder()
                    .setColor('#ff6600')
                    .setTitle('💻 Training fehlgeschlagen')
                    .setDescription(`\`\`\`\n> RUNNING ${skillNames[skill].toUpperCase()} MODULE...\n> ERROR: TUTORIAL CORRUPTED.\n\`\`\`\nDein Skill bleibt bei ${currentVal}.\n💰 -${Math.floor(cost / 2)} Coins (halbe Kosten)`);
                cooldowns.set(cdKey, Date.now() + 30000);
                return interaction.reply({ embeds: [embed] });
            }
        }

        if (sub === 'programme') {
            const programs = db.db.prepare('SELECT * FROM hacker_programs WHERE user_id = ?').all(userId);
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('🖥️ Deine Programme');

            if (programs.length === 0) {
                embed.setDescription('Du hast noch keine Programme.\nKaufe welche mit `/hacker kaufen`!');
            } else {
                const list = programs.map(p => {
                    const info = PROGRAMS[p.program_id];
                    if (!info) return null;
                    const upgradeCost = (info.cost * (p.level + 1)).toFixed(2);
                    return `**${info.name}** Lv.${p.level}\n${info.desc}\nBonus: +${info.bonus * p.level} ${info.stat}\nUpgrade: ${upgradeCost} BTC`;
                }).filter(Boolean).join('\n\n');
                embed.setDescription(list);
            }
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'kaufen') {
            const progId = interaction.options.getString('programm');
            const prog = PROGRAMS[progId];
            const existing = db.db.prepare('SELECT * FROM hacker_programs WHERE user_id = ? AND program_id = ?').get(userId, progId);

            if (existing) {
                const upgradeCost = prog.cost * (existing.level + 1);
                if (hacker.bitcoins < upgradeCost) {
                    return interaction.reply({ content: `❌ Upgrade kostet ${upgradeCost.toFixed(2)} BTC. Du hast ${hacker.bitcoins.toFixed(2)} BTC.`, ephemeral: true });
                }
                db.db.prepare('UPDATE hackers SET bitcoins = bitcoins - ? WHERE user_id = ?').run(upgradeCost, userId);
                db.db.prepare('UPDATE hacker_programs SET level = level + 1 WHERE user_id = ? AND program_id = ?').run(userId, progId);
                const embed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('⬆️ Programm aufgerüstet!')
                    .setDescription(`\`\`\`\n> UPGRADING ${prog.name.toUpperCase()}...\n> COMPILING...\n> DONE.\n\`\`\`\n**${prog.name}** Lv.${existing.level} → Lv.${existing.level + 1}\n₿ -${upgradeCost.toFixed(2)} BTC`);
                return interaction.reply({ embeds: [embed] });
            }

            if (hacker.bitcoins < prog.cost) {
                return interaction.reply({ content: `❌ ${prog.name} kostet ${prog.cost.toFixed(2)} BTC. Du hast ${hacker.bitcoins.toFixed(2)} BTC.`, ephemeral: true });
            }

            db.db.prepare('UPDATE hackers SET bitcoins = bitcoins - ? WHERE user_id = ?').run(prog.cost, userId);
            db.db.prepare('INSERT INTO hacker_programs (user_id, program_id) VALUES (?, ?)').run(userId, progId);
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('💾 Programm installiert!')
                .setDescription(`\`\`\`\n> DOWNLOADING ${prog.name.toUpperCase()}...\n> INSTALLING...\n> READY.\n\`\`\`\n**${prog.name}** Lv.1\n${prog.desc}\n₿ -${prog.cost.toFixed(2)} BTC`);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'ziele') {
            const rank = getRank(hacker.reputation);
            const list = TARGETS.map(t => {
                const locked = rank < t.minRank;
                return `${locked ? '🔒' : '🎯'} **${t.name}** ${locked ? `(Rang ${t.minRank} benötigt)` : ''}\nSchwierigkeit: ${t.difficulty} | Belohnung: ${t.reward[0]}-${t.reward[1]} Coins | ₿ ${t.btc[0].toFixed(2)}-${t.btc[1].toFixed(2)} BTC | +${t.rep} Rep`;
            }).join('\n\n');

            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('🎯 Verfügbare Ziele')
                .setDescription(list)
                .setFooter({ text: `Dein Rang: ${RANKS[rank].name} (${rank})` });
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'cyberwar') {
            const cdKey = `hacker_pvp_${userId}`;
            if (cooldowns.has(cdKey) && cooldowns.get(cdKey) > Date.now()) {
                const left = Math.ceil((cooldowns.get(cdKey) - Date.now()) / 1000);
                return interaction.reply({ content: `⏳ Cyberwar-Cooldown: ${left}s`, ephemeral: true });
            }

            const opponent = interaction.options.getUser('gegner');
            if (opponent.id === userId) return interaction.reply({ content: '❌ Du kannst dich nicht selbst hacken!', ephemeral: true });
            if (opponent.bot) return interaction.reply({ content: '❌ Bots sind zu gut geschützt.', ephemeral: true });

            const oppHacker = db.db.prepare('SELECT * FROM hackers WHERE user_id = ?').get(opponent.id);
            if (!oppHacker) return interaction.reply({ content: '❌ Dieser Spieler ist kein Hacker!', ephemeral: true });

            const myProgs = db.db.prepare('SELECT * FROM hacker_programs WHERE user_id = ?').all(userId);
            const oppProgs = db.db.prepare('SELECT * FROM hacker_programs WHERE user_id = ?').all(opponent.id);
            const myPower = getSkillTotal(hacker, myProgs);
            const oppPower = getSkillTotal(oppHacker, oppProgs);

            const phases = ['🔍 Aufklärung', '🔓 Infiltration', '💻 Exploitation', '🏴 Übernahme'];
            let myScore = 0, oppScore = 0;
            const log = [];

            for (const phase of phases) {
                const myRoll = Math.floor(Math.random() * 20) + 1 + Math.floor(myPower / 8);
                const oppRoll = Math.floor(Math.random() * 20) + 1 + Math.floor(oppPower / 8);
                if (myRoll > oppRoll) {
                    myScore++;
                    log.push(`${phase}: **${hacker.handle}** gewinnt (${myRoll} vs ${oppRoll})`);
                } else if (oppRoll > myRoll) {
                    oppScore++;
                    log.push(`${phase}: **${oppHacker.handle}** gewinnt (${oppRoll} vs ${myRoll})`);
                } else {
                    log.push(`${phase}: Unentschieden! (${myRoll} vs ${oppRoll})`);
                }
            }

            const won = myScore > oppScore;
            const draw = myScore === oppScore;
            const btcStake = 0.1;

            if (!draw) {
                const winnerId = won ? userId : opponent.id;
                const loserId = won ? opponent.id : userId;
                db.db.prepare('UPDATE hackers SET bitcoins = bitcoins + ?, reputation = reputation + 25 WHERE user_id = ?').run(btcStake, winnerId);
                db.db.prepare('UPDATE hackers SET bitcoins = MAX(0, bitcoins - ?), reputation = MAX(0, reputation - 10) WHERE user_id = ?').run(btcStake, loserId);
            }

            const embed = new EmbedBuilder()
                .setColor(draw ? '#ffff00' : (won ? '#00ff00' : '#ff0000'))
                .setTitle(`⚔️ Cyberwar: ${hacker.handle} vs ${oppHacker.handle}`)
                .setDescription(log.join('\n') + `\n\n**Ergebnis: ${myScore} - ${oppScore}**\n${draw ? '🤝 Unentschieden!' : (won ? `🏆 ${hacker.handle} gewinnt! +${btcStake} BTC, +25 Rep` : `💀 ${oppHacker.handle} gewinnt! -${btcStake} BTC, -10 Rep`)}`)
                .setFooter({ text: 'Cyberwar — Möge der bessere Hacker gewinnen' });

            cooldowns.set(cdKey, Date.now() + 120000);
            return interaction.reply({ embeds: [embed] });
        }
    }
};
