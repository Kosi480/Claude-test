const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

const cooldowns = new Map();

function ensureCircusTables() {
    db.db.exec(`
        CREATE TABLE IF NOT EXISTS circuses (
            user_id TEXT PRIMARY KEY,
            circus_name TEXT DEFAULT 'Kleiner Zirkus',
            rank INTEGER DEFAULT 0,
            fame INTEGER DEFAULT 0,
            tent_level INTEGER DEFAULT 1,
            seats INTEGER DEFAULT 30,
            decoration_level INTEGER DEFAULT 1,
            safety_level INTEGER DEFAULT 1,
            music_level INTEGER DEFAULT 1,
            ticket_price INTEGER DEFAULT 15,
            total_shows INTEGER DEFAULT 0,
            total_earned INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    db.db.exec(`
        CREATE TABLE IF NOT EXISTS circus_performers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            name TEXT,
            act_type TEXT,
            skill INTEGER DEFAULT 30,
            charisma INTEGER DEFAULT 30,
            stamina INTEGER DEFAULT 100,
            salary INTEGER DEFAULT 20,
            shows_performed INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

const RANKS = [
    { name: 'Wanderzirkus', fame: 0 },
    { name: 'Dorfzirkus', fame: 120 },
    { name: 'Stadtzirkus', fame: 350 },
    { name: 'Großer Zirkus', fame: 800 },
    { name: 'Nationalzirkus', fame: 1800 },
    { name: 'Weltzirkus', fame: 4000 },
    { name: 'Cirque Légendaire', fame: 9000 }
];

const ACT_TYPES = {
    akrobatik: { name: '🤸 Akrobatik', desc: 'Saltos, Handstand und mehr', baseSalary: 20, popularity: 1.1 },
    clown: { name: '🤡 Clown', desc: 'Komik und Slapstick', baseSalary: 15, popularity: 1.3 },
    jongleur: { name: '🤹 Jongleur', desc: 'Bälle, Keulen und Fackeln', baseSalary: 18, popularity: 1.0 },
    dompteur: { name: '🦁 Dompteur', desc: 'Tierdressur und Tricks', baseSalary: 30, popularity: 1.4 },
    trapez: { name: '🎪 Trapez', desc: 'Luftakrobatik am Seil', baseSalary: 25, popularity: 1.2 },
    magier: { name: '🎩 Magier', desc: 'Illusionen und Zaubertricks', baseSalary: 22, popularity: 1.2 },
    feuerschlucker: { name: '🔥 Feuerschlucker', desc: 'Feuriges Spektakel', baseSalary: 28, popularity: 1.3 },
    seiltaenzer: { name: '🪢 Seiltänzer', desc: 'Balance in der Höhe', baseSalary: 24, popularity: 1.1 },
    messerwerfer: { name: '🗡️ Messerwerfer', desc: 'Präzision auf den Punkt', baseSalary: 26, popularity: 1.0 },
    kontorsionist: { name: '🧘 Kontorsionist', desc: 'Unglaubliche Flexibilität', baseSalary: 20, popularity: 0.9 }
};

const PERFORMER_NAMES = [
    'Marco', 'Isabella', 'Pierre', 'Natasha', 'Roberto', 'Ling', 'Dimitri',
    'Esperanza', 'Klaus', 'Yuki', 'Sven', 'Amara', 'Bogdan', 'Catalina',
    'Fernando', 'Greta', 'Hassan', 'Ingrid', 'Jorge', 'Katarina'
];

const SHOW_EVENTS = [
    { text: '🌟 Standing Ovations! Das Publikum ist aus dem Häuschen!', visitorMod: 1.4, tipMod: 2.5 },
    { text: '🎆 Pyrotechnik-Finale begeistert alle!', visitorMod: 1.3, tipMod: 2.0 },
    { text: '👶 Ein Kind wird zum Mitmachen eingeladen — alle lieben es!', visitorMod: 1.2, tipMod: 1.5 },
    { text: '📸 Ein Influencer filmt die Show — geht viral!', visitorMod: 1.5, tipMod: 1.3 },
    { text: '👏 Guter Applaus, zufriedene Zuschauer.', visitorMod: 1.0, tipMod: 1.0 },
    { text: '🥱 Das Publikum wirkt etwas gelangweilt...', visitorMod: 0.9, tipMod: 0.7 },
    { text: '🤕 Ein Performer stolpert — peinliche Stille...', visitorMod: 0.8, tipMod: 0.5 },
    { text: '🌧️ Es regnet ins Zelt! Einige Zuschauer gehen.', visitorMod: 0.7, tipMod: 0.4 },
    { text: '🐒 Ein Tier bricht aus! Chaos im Zelt!', visitorMod: 0.6, tipMod: 0.3 },
    { text: '⭐ Ein berühmter Kritiker ist im Publikum!', visitorMod: 1.1, tipMod: 1.8 }
];

const TRAINING_EVENTS = [
    { text: 'Perfektes Training! Großer Fortschritt!', gain: [8, 15] },
    { text: 'Gutes Training, stetige Verbesserung.', gain: [4, 8] },
    { text: 'Durchschnittliches Training.', gain: [2, 5] },
    { text: 'Schwieriger Tag, wenig Fortschritt.', gain: [1, 3] }
];

const UPGRADES = {
    zelt: { field: 'tent_level', name: '🎪 Zelt', baseCost: 500, max: 10, desc: 'Größeres Zelt' },
    sitze: { field: 'seats', name: '💺 Sitzplätze', baseCost: 200, max: 500, desc: '+20 Sitzplätze' },
    deko: { field: 'decoration_level', name: '✨ Dekoration', baseCost: 300, max: 10, desc: 'Mehr Zuschauerzufriedenheit' },
    sicherheit: { field: 'safety_level', name: '🛡️ Sicherheit', baseCost: 400, max: 10, desc: 'Weniger Unfälle' },
    musik: { field: 'music_level', name: '🎵 Musik', baseCost: 350, max: 10, desc: 'Bessere Atmosphäre' }
};

function getRank(fame) {
    for (let i = RANKS.length - 1; i >= 0; i--) {
        if (fame >= RANKS[i].fame) return i;
    }
    return 0;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('zirkus')
        .setDescription('🎪 Leite deinen eigenen Zirkus!')
        .addSubcommand(s => s.setName('status').setDescription('Zeige deinen Zirkus-Status'))
        .addSubcommand(s => s.setName('umbenennen').setDescription('Benenne deinen Zirkus um')
            .addStringOption(o => o.setName('name').setDescription('Neuer Name').setRequired(true)))
        .addSubcommand(s => s.setName('anwerben').setDescription('Werbe einen neuen Performer an')
            .addStringOption(o => o.setName('art').setDescription('Art des Performers').setRequired(true)
                .addChoices(...Object.entries(ACT_TYPES).map(([k, v]) => ({ name: v.name, value: k })))))
        .addSubcommand(s => s.setName('truppe').setDescription('Zeige deine Performer'))
        .addSubcommand(s => s.setName('trainieren').setDescription('Trainiere einen Performer')
            .addIntegerOption(o => o.setName('id').setDescription('Performer-ID').setRequired(true)))
        .addSubcommand(s => s.setName('show').setDescription('Führe eine Show auf'))
        .addSubcommand(s => s.setName('ticketpreis').setDescription('Setze den Ticketpreis')
            .addIntegerOption(o => o.setName('preis').setDescription('Preis (5-300)').setRequired(true)))
        .addSubcommand(s => s.setName('upgrade').setDescription('Verbessere deinen Zirkus')
            .addStringOption(o => o.setName('was').setDescription('Was upgraden').setRequired(true)
                .addChoices(...Object.entries(UPGRADES).map(([k, v]) => ({ name: v.name, value: k })))))
        .addSubcommand(s => s.setName('entlassen').setDescription('Entlasse einen Performer')
            .addIntegerOption(o => o.setName('id').setDescription('Performer-ID').setRequired(true)))
        .addSubcommand(s => s.setName('acts').setDescription('Zeige alle verfügbaren Act-Typen')),

    async execute(interaction) {
        ensureCircusTables();
        const config = require('../config.json');
        const sub = interaction.options.getSubcommand();
        const userId = interaction.user.id;

        let circus = db.db.prepare('SELECT * FROM circuses WHERE user_id = ?').get(userId);

        if (!circus && sub !== 'status') {
            return interaction.reply({ content: '❌ Benutze `/zirkus status` um deinen Zirkus zu gründen!', ephemeral: true });
        }

        if (sub === 'status') {
            if (!circus) {
                db.db.prepare('INSERT INTO circuses (user_id) VALUES (?)').run(userId);
                circus = db.db.prepare('SELECT * FROM circuses WHERE user_id = ?').get(userId);
                const embed = new EmbedBuilder()
                    .setColor('#FF4500')
                    .setTitle('🎪 Zirkus gegründet!')
                    .setDescription('Dein **Kleiner Zirkus** öffnet seine Pforten!\n\nWerbe Performer an mit `/zirkus anwerben`\nund gib deine erste Show mit `/zirkus show`!');
                return interaction.reply({ embeds: [embed] });
            }

            const rank = getRank(circus.fame);
            const nextRank = rank < RANKS.length - 1 ? RANKS[rank + 1] : null;
            const performerCount = db.db.prepare('SELECT COUNT(*) as cnt FROM circus_performers WHERE user_id = ?').get(userId).cnt;

            const embed = new EmbedBuilder()
                .setColor('#FF4500')
                .setTitle(`🎪 ${circus.circus_name}`)
                .setDescription(`**${RANKS[rank].name}** (Rang ${rank})\n${nextRank ? `Nächster: ${nextRank.name} (${circus.fame}/${nextRank.fame} Ruhm)` : '👑 MAXIMALER RANG!'}`)
                .addFields(
                    { name: '⭐ Ruhm', value: `${circus.fame}`, inline: true },
                    { name: '🎭 Performer', value: `${performerCount}`, inline: true },
                    { name: '🎪 Shows', value: `${circus.total_shows}`, inline: true },
                    { name: '🎪 Zelt', value: `Lv.${circus.tent_level}`, inline: true },
                    { name: '💺 Sitze', value: `${circus.seats}`, inline: true },
                    { name: '✨ Deko', value: `Lv.${circus.decoration_level}`, inline: true },
                    { name: '🛡️ Sicherheit', value: `Lv.${circus.safety_level}`, inline: true },
                    { name: '🎵 Musik', value: `Lv.${circus.music_level}`, inline: true },
                    { name: '🎟️ Ticket', value: `${circus.ticket_price} Coins`, inline: true },
                    { name: '💰 Verdient', value: `${circus.total_earned} Coins`, inline: false }
                );
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'umbenennen') {
            const name = interaction.options.getString('name');
            if (name.length > 30) return interaction.reply({ content: '❌ Max. 30 Zeichen!', ephemeral: true });
            db.db.prepare('UPDATE circuses SET circus_name = ? WHERE user_id = ?').run(name, userId);
            return interaction.reply({ embeds: [new EmbedBuilder().setColor('#FF4500').setTitle('🎪 Umbenannt!').setDescription(`Dein Zirkus heißt jetzt **${name}**!`)] });
        }

        if (sub === 'anwerben') {
            const cdKey = `circus_hire_${userId}`;
            if (cooldowns.has(cdKey) && cooldowns.get(cdKey) > Date.now()) {
                const left = Math.ceil((cooldowns.get(cdKey) - Date.now()) / 1000);
                return interaction.reply({ content: `⏳ Warte ${left}s.`, ephemeral: true });
            }

            const actType = interaction.options.getString('art');
            const act = ACT_TYPES[actType];
            const rank = getRank(circus.fame);
            const maxPerformers = 3 + rank * 2;
            const performerCount = db.db.prepare('SELECT COUNT(*) as cnt FROM circus_performers WHERE user_id = ?').get(userId).cnt;

            if (performerCount >= maxPerformers) return interaction.reply({ content: `❌ Max. ${maxPerformers} Performer (Rang ${rank}). Steige im Rang auf!`, ephemeral: true });

            const hiringCost = act.baseSalary * 10;
            let balance = db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId);
            if (!balance || balance.balance < hiringCost) return interaction.reply({ content: `❌ Anwerben kostet ${hiringCost} Coins.`, ephemeral: true });

            const name = PERFORMER_NAMES[Math.floor(Math.random() * PERFORMER_NAMES.length)];
            const skill = 25 + Math.floor(Math.random() * 25);
            const charisma = 25 + Math.floor(Math.random() * 25);

            db.db.prepare('UPDATE economy SET balance = balance - ? WHERE user_id = ?').run(hiringCost, userId);
            db.db.prepare('INSERT INTO circus_performers (user_id, name, act_type, skill, charisma, salary) VALUES (?, ?, ?, ?, ?, ?)')
                .run(userId, name, actType, skill, charisma, act.baseSalary);

            const embed = new EmbedBuilder()
                .setColor('#FF4500')
                .setTitle('🎭 Neuer Performer!')
                .setDescription(`**${name}** — ${act.name}\n\n🎯 Skill: ${skill}/100\n✨ Charisma: ${charisma}/100\n💰 Gehalt: ${act.baseSalary} Coins/Show\n\n💰 -${hiringCost} Coins Anwerbungskosten`);

            cooldowns.set(cdKey, Date.now() + 30000);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'truppe') {
            const performers = db.db.prepare('SELECT * FROM circus_performers WHERE user_id = ? ORDER BY skill DESC').all(userId);

            if (performers.length === 0) return interaction.reply({ content: '❌ Keine Performer! Werbe welche an mit `/zirkus anwerben`.', ephemeral: true });

            const list = performers.map(p => {
                const act = ACT_TYPES[p.act_type];
                return `**#${p.id} ${p.name}** — ${act?.name || p.act_type}\n🎯 Skill: ${p.skill} | ✨ Charisma: ${p.charisma} | 💪 Stamina: ${p.stamina}%\n💰 Gehalt: ${p.salary}/Show | 🎪 Shows: ${p.shows_performed}`;
            }).join('\n\n');

            const embed = new EmbedBuilder()
                .setColor('#FF4500')
                .setTitle('🎭 Deine Truppe')
                .setDescription(list);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'trainieren') {
            const cdKey = `circus_train_${userId}`;
            if (cooldowns.has(cdKey) && cooldowns.get(cdKey) > Date.now()) {
                const left = Math.ceil((cooldowns.get(cdKey) - Date.now()) / 1000);
                return interaction.reply({ content: `⏳ Training-Cooldown: ${left}s`, ephemeral: true });
            }

            const perfId = interaction.options.getInteger('id');
            const performer = db.db.prepare('SELECT * FROM circus_performers WHERE id = ? AND user_id = ?').get(perfId, userId);
            if (!performer) return interaction.reply({ content: '❌ Performer nicht gefunden!', ephemeral: true });

            const cost = Math.floor(performer.skill * 5);
            let balance = db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId);
            if (!balance || balance.balance < cost) return interaction.reply({ content: `❌ Training kostet ${cost} Coins.`, ephemeral: true });

            const event = TRAINING_EVENTS[Math.floor(Math.random() * TRAINING_EVENTS.length)];
            const skillGain = event.gain[0] + Math.floor(Math.random() * (event.gain[1] - event.gain[0]));
            const charismaGain = Math.floor(skillGain * 0.6);

            db.db.prepare('UPDATE economy SET balance = balance - ? WHERE user_id = ?').run(cost, userId);
            db.db.prepare('UPDATE circus_performers SET skill = MIN(100, skill + ?), charisma = MIN(100, charisma + ?) WHERE id = ?')
                .run(skillGain, charismaGain, perfId);

            const embed = new EmbedBuilder()
                .setColor('#FF4500')
                .setTitle(`🏋️ ${performer.name} trainiert!`)
                .setDescription(`${event.text}\n\n🎯 Skill: +${skillGain} (→ ${Math.min(100, performer.skill + skillGain)})\n✨ Charisma: +${charismaGain} (→ ${Math.min(100, performer.charisma + charismaGain)})\n💰 -${cost} Coins`);

            cooldowns.set(cdKey, Date.now() + 60000);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'show') {
            const cdKey = `circus_show_${userId}`;
            if (cooldowns.has(cdKey) && cooldowns.get(cdKey) > Date.now()) {
                const left = Math.ceil((cooldowns.get(cdKey) - Date.now()) / 1000);
                return interaction.reply({ content: `⏳ Nächste Show in ${left}s.`, ephemeral: true });
            }

            const performers = db.db.prepare('SELECT * FROM circus_performers WHERE user_id = ? AND stamina > 20').all(userId);
            if (performers.length === 0) return interaction.reply({ content: '❌ Keine Performer verfügbar! Werbe welche an oder warte bis sie sich erholen.', ephemeral: true });

            const event = SHOW_EVENTS[Math.floor(Math.random() * SHOW_EVENTS.length)];

            const avgSkill = performers.reduce((s, p) => s + p.skill, 0) / performers.length;
            const avgCharisma = performers.reduce((s, p) => s + p.charisma, 0) / performers.length;

            const demandFactor = Math.max(0.2, 1.0 - (circus.ticket_price / 80) * 0.4);
            const performanceFactor = (avgSkill + avgCharisma) / 200;
            const decoFactor = 1 + circus.decoration_level * 0.05;
            const musicFactor = 1 + circus.music_level * 0.04;
            const tentFactor = 1 + circus.tent_level * 0.03;
            const varietyBonus = 1 + new Set(performers.map(p => p.act_type)).size * 0.05;

            const visitors = Math.min(circus.seats, Math.floor(
                circus.seats * demandFactor * performanceFactor * decoFactor * musicFactor * tentFactor * varietyBonus * event.visitorMod * (0.7 + Math.random() * 0.6)
            ));

            const ticketRevenue = visitors * circus.ticket_price;
            const tips = Math.floor(visitors * avgCharisma * 0.02 * event.tipMod);
            const salaryCost = performers.reduce((s, p) => s + p.salary, 0);
            const totalRevenue = ticketRevenue + tips - salaryCost;

            const showLog = [];
            for (const p of performers) {
                const act = ACT_TYPES[p.act_type];
                const performanceRoll = Math.random() * 100;
                const safetyCheck = circus.safety_level * 10 + Math.random() * 50;

                if (performanceRoll < p.skill * 0.8) {
                    showLog.push(`${act.name} **${p.name}**: ⭐ Brillante Darbietung!`);
                } else if (safetyCheck < 30) {
                    showLog.push(`${act.name} **${p.name}**: 🤕 Kleiner Unfall!`);
                } else {
                    showLog.push(`${act.name} **${p.name}**: 👍 Solide Show.`);
                }

                db.db.prepare('UPDATE circus_performers SET stamina = MAX(0, stamina - ?), shows_performed = shows_performed + 1 WHERE id = ?')
                    .run(15 + Math.floor(Math.random() * 10), p.id);
            }

            let bal = db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId);
            if (!bal) db.db.prepare('INSERT INTO economy (user_id, balance) VALUES (?, 0)').run(userId);
            db.db.prepare('UPDATE economy SET balance = balance + ? WHERE user_id = ?').run(Math.max(0, totalRevenue), userId);

            const fameGain = Math.floor(visitors * performanceFactor * event.visitorMod * 0.4);
            db.db.prepare('UPDATE circuses SET total_shows = total_shows + 1, total_earned = total_earned + ?, fame = fame + ? WHERE user_id = ?')
                .run(Math.max(0, totalRevenue), fameGain, userId);

            // Restore stamina slowly
            db.db.prepare('UPDATE circus_performers SET stamina = MIN(100, stamina + 5) WHERE user_id = ? AND stamina < 100').run(userId);

            const fillPercent = Math.floor((visitors / circus.seats) * 100);
            const fillBar = '█'.repeat(Math.floor(fillPercent / 10)) + '░'.repeat(10 - Math.floor(fillPercent / 10));

            const embed = new EmbedBuilder()
                .setColor(totalRevenue > 0 ? '#00aa00' : '#ff6600')
                .setTitle(`🎪 Show — ${circus.circus_name}`)
                .setDescription(`${event.text}\n\n${showLog.join('\n')}\n\n👥 Zuschauer: **${visitors}/${circus.seats}** [${fillBar}] ${fillPercent}%\n\n🎟️ Tickets: ${ticketRevenue}\n💵 Trinkgeld: ${tips}\n💰 Gehälter: -${salaryCost}\n**💰 Gewinn: ${totalRevenue} Coins**\n⭐ +${fameGain} Ruhm`)
                .setFooter({ text: `${performers.length} Performer | ${new Set(performers.map(p => p.act_type)).size} verschiedene Acts` });

            cooldowns.set(cdKey, Date.now() + 75000);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'ticketpreis') {
            const price = interaction.options.getInteger('preis');
            if (price < 5 || price > 300) return interaction.reply({ content: '❌ Preis muss 5-300 sein!', ephemeral: true });
            db.db.prepare('UPDATE circuses SET ticket_price = ? WHERE user_id = ?').run(price, userId);

            const demand = price <= 20 ? '📈 Sehr hoch' : price <= 50 ? '📊 Gut' : price <= 100 ? '📉 Mittel' : '⚠️ Niedrig';
            const embed = new EmbedBuilder()
                .setColor('#FF4500')
                .setTitle('🎟️ Ticketpreis gesetzt')
                .setDescription(`Neuer Preis: **${price} Coins**\nNachfrage: ${demand}`);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'upgrade') {
            const what = interaction.options.getString('was');
            const upgrade = UPGRADES[what];
            const current = circus[upgrade.field];

            if (what === 'sitze') {
                const cost = upgrade.baseCost + current * 8;
                if (current >= upgrade.max) return interaction.reply({ content: '❌ Maximum erreicht!', ephemeral: true });
                let balance = db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId);
                if (!balance || balance.balance < cost) return interaction.reply({ content: `❌ Kostet ${cost} Coins.`, ephemeral: true });

                db.db.prepare('UPDATE economy SET balance = balance - ? WHERE user_id = ?').run(cost, userId);
                db.db.prepare('UPDATE circuses SET seats = seats + 20 WHERE user_id = ?').run(userId);
                return interaction.reply({ embeds: [new EmbedBuilder().setColor('#FF4500').setTitle('💺 Sitzplätze erweitert!').setDescription(`${current} → ${current + 20} Sitze\n💰 -${cost} Coins`)] });
            }

            if (current >= upgrade.max) return interaction.reply({ content: '❌ Maximum erreicht!', ephemeral: true });
            const cost = upgrade.baseCost * (current + 1);
            let balance = db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId);
            if (!balance || balance.balance < cost) return interaction.reply({ content: `❌ Kostet ${cost} Coins.`, ephemeral: true });

            db.db.prepare('UPDATE economy SET balance = balance - ? WHERE user_id = ?').run(cost, userId);
            db.db.prepare(`UPDATE circuses SET ${upgrade.field} = ${upgrade.field} + 1 WHERE user_id = ?`).run(userId);

            return interaction.reply({ embeds: [new EmbedBuilder().setColor('#FF4500').setTitle(`⬆️ ${upgrade.name} verbessert!`).setDescription(`Lv.${current} → Lv.${current + 1}\n${upgrade.desc}\n💰 -${cost} Coins`)] });
        }

        if (sub === 'entlassen') {
            const perfId = interaction.options.getInteger('id');
            const performer = db.db.prepare('SELECT * FROM circus_performers WHERE id = ? AND user_id = ?').get(perfId, userId);
            if (!performer) return interaction.reply({ content: '❌ Performer nicht gefunden!', ephemeral: true });

            db.db.prepare('DELETE FROM circus_performers WHERE id = ?').run(perfId);
            return interaction.reply({ embeds: [new EmbedBuilder().setColor('#FF4500').setTitle('👋 Performer entlassen').setDescription(`**${performer.name}** verlässt den Zirkus.`)] });
        }

        if (sub === 'acts') {
            const list = Object.entries(ACT_TYPES).map(([k, v]) => {
                return `**${v.name}**\n${v.desc}\n💰 Gehalt: ${v.baseSalary}/Show | 📊 Popularität: x${v.popularity}`;
            }).join('\n\n');

            const embed = new EmbedBuilder()
                .setColor('#FF4500')
                .setTitle('🎭 Verfügbare Acts')
                .setDescription(list)
                .setFooter({ text: 'Mehr Vielfalt = bessere Shows!' });
            return interaction.reply({ embeds: [embed] });
        }
    }
};
