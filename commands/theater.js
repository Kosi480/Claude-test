const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

const cooldowns = new Map();

function ensureTheaterTables() {
    db.db.exec(`
        CREATE TABLE IF NOT EXISTS theaters (
            user_id TEXT PRIMARY KEY,
            theater_name TEXT DEFAULT 'Kleine Bühne',
            rank INTEGER DEFAULT 0,
            fame INTEGER DEFAULT 0,
            seats INTEGER DEFAULT 50,
            stage_level INTEGER DEFAULT 1,
            costume_level INTEGER DEFAULT 1,
            lighting_level INTEGER DEFAULT 1,
            sound_level INTEGER DEFAULT 1,
            actors INTEGER DEFAULT 2,
            ticket_price INTEGER DEFAULT 10,
            total_shows INTEGER DEFAULT 0,
            total_earned INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    db.db.exec(`
        CREATE TABLE IF NOT EXISTS theater_plays (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            title TEXT,
            genre TEXT,
            quality INTEGER DEFAULT 50,
            times_performed INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

const RANKS = [
    { name: 'Straßenkünstler', fame: 0 },
    { name: 'Amateurregisseur', fame: 150 },
    { name: 'Theaterleiter', fame: 400 },
    { name: 'Bühnenmeister', fame: 900 },
    { name: 'Starregisseur', fame: 2000 },
    { name: 'Broadway-Legende', fame: 4500 },
    { name: 'Theaterimperator', fame: 10000 }
];

const GENRES = {
    komoedie: { name: '😂 Komödie', popularity: 1.2, difficulty: 8 },
    drama: { name: '😢 Drama', popularity: 1.0, difficulty: 12 },
    musical: { name: '🎵 Musical', popularity: 1.5, difficulty: 18 },
    horror: { name: '👻 Horror', popularity: 0.9, difficulty: 10 },
    romanze: { name: '❤️ Romanze', popularity: 1.1, difficulty: 9 },
    krimi: { name: '🔍 Krimi', popularity: 1.0, difficulty: 14 },
    fantasy: { name: '🧙 Fantasy', popularity: 1.3, difficulty: 16 },
    tragoedie: { name: '💀 Tragödie', popularity: 0.8, difficulty: 20 }
};

const PLAY_TITLES = {
    komoedie: ['Der verrückte Professor', 'Chaos im Hotel', 'Die Verwechslung', 'Nachbarn von nebenan', 'Der Hochzeitsplaner'],
    drama: ['Stille Wasser', 'Der letzte Brief', 'Schatten der Vergangenheit', 'Zerbrochene Spiegel', 'Am Abgrund'],
    musical: ['Sternenstaub', 'Rhythmus der Nacht', 'Die Melodie des Lebens', 'Tanzende Schatten', 'Goldene Stimmen'],
    horror: ['Das Haus am See', 'Mitternachtsschrei', 'Der Keller', 'Flüstern im Dunkeln', 'Geisterstunde'],
    romanze: ['Liebe auf den ersten Blick', 'Sommernachtstraum', 'Herzen im Wind', 'Brief an dich', 'Mondschein-Serenade'],
    krimi: ['Der Mord im Orient', 'Zeuge der Nacht', 'Das verschwundene Gemälde', 'Tödliches Alibi', 'Inspector König'],
    fantasy: ['Der Drachentempel', 'Elfenfeuer', 'Das magische Schwert', 'Reise nach Avalon', 'Nebelreich'],
    tragoedie: ['Der Fall des Königs', 'Verlorene Ehre', 'Das Opfer', 'Ikarus', 'Die letzte Nacht']
};

const SHOW_EVENTS = [
    { text: '🌟 Standing Ovations! Das Publikum ist begeistert!', visitorMod: 1.4, tipMod: 2.0 },
    { text: '👏 Tosender Applaus nach dem Finale!', visitorMod: 1.2, tipMod: 1.5 },
    { text: '📸 Ein Kritiker ist im Publikum und schreibt eine tolle Rezension!', visitorMod: 1.3, tipMod: 1.3 },
    { text: '🎭 Die Schauspieler improvisieren brillant!', visitorMod: 1.1, tipMod: 1.2 },
    { text: '😐 Solide Vorstellung, nichts Besonderes.', visitorMod: 1.0, tipMod: 1.0 },
    { text: '🤦 Ein Schauspieler vergisst seinen Text...', visitorMod: 0.8, tipMod: 0.7 },
    { text: '💡 Die Beleuchtung fällt kurz aus!', visitorMod: 0.85, tipMod: 0.8 },
    { text: '📱 Handys klingeln ständig im Publikum!', visitorMod: 0.9, tipMod: 0.6 },
    { text: '🚪 Zuschauer verlassen vorzeitig den Saal...', visitorMod: 0.7, tipMod: 0.5 },
    { text: '⭐ Ein berühmter Schauspieler besucht überraschend die Vorstellung!', visitorMod: 1.5, tipMod: 1.8 }
];

const UPGRADES = {
    buehne: { field: 'stage_level', name: '🎭 Bühne', baseCost: 500, maxLevel: 10, desc: 'Verbessert Stückqualität' },
    kostueme: { field: 'costume_level', name: '👗 Kostüme', baseCost: 400, maxLevel: 10, desc: 'Erhöht Zuschauerzufriedenheit' },
    licht: { field: 'lighting_level', name: '💡 Beleuchtung', baseCost: 350, maxLevel: 10, desc: 'Bessere Atmosphäre' },
    sound: { field: 'sound_level', name: '🔊 Soundsystem', baseCost: 450, maxLevel: 10, desc: 'Verbessert Musicals' },
    sitze: { field: 'seats', name: '💺 Sitzplätze', baseCost: 300, maxLevel: 500, desc: '+25 Sitzplätze' },
    schauspieler: { field: 'actors', name: '🎭 Schauspieler', baseCost: 600, maxLevel: 20, desc: '+1 Schauspieler' }
};

function getRank(fame) {
    for (let i = RANKS.length - 1; i >= 0; i--) {
        if (fame >= RANKS[i].fame) return i;
    }
    return 0;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('theater')
        .setDescription('🎭 Leite dein eigenes Theater!')
        .addSubcommand(s => s.setName('status').setDescription('Zeige deinen Theater-Status'))
        .addSubcommand(s => s.setName('umbenennen').setDescription('Benenne dein Theater um')
            .addStringOption(o => o.setName('name').setDescription('Neuer Name').setRequired(true)))
        .addSubcommand(s => s.setName('schreiben').setDescription('Schreibe ein neues Theaterstück')
            .addStringOption(o => o.setName('genre').setDescription('Das Genre').setRequired(true)
                .addChoices(...Object.entries(GENRES).map(([k, v]) => ({ name: v.name, value: k })))))
        .addSubcommand(s => s.setName('auffuehren').setDescription('Führe ein Stück auf')
            .addIntegerOption(o => o.setName('stueck').setDescription('Stück-ID').setRequired(true)))
        .addSubcommand(s => s.setName('repertoire').setDescription('Zeige deine Theaterstücke'))
        .addSubcommand(s => s.setName('upgrade').setDescription('Verbessere dein Theater')
            .addStringOption(o => o.setName('was').setDescription('Was upgraden').setRequired(true)
                .addChoices(
                    { name: '🎭 Bühne', value: 'buehne' },
                    { name: '👗 Kostüme', value: 'kostueme' },
                    { name: '💡 Beleuchtung', value: 'licht' },
                    { name: '🔊 Sound', value: 'sound' },
                    { name: '💺 Sitzplätze', value: 'sitze' },
                    { name: '🎭 Schauspieler', value: 'schauspieler' }
                )))
        .addSubcommand(s => s.setName('ticketpreis').setDescription('Setze den Ticketpreis')
            .addIntegerOption(o => o.setName('preis').setDescription('Preis pro Ticket (5-500)').setRequired(true)))
        .addSubcommand(s => s.setName('kritik').setDescription('Lass dein Theater bewerten')),

    async execute(interaction) {
        ensureTheaterTables();
        const config = require('../config.json');
        const sub = interaction.options.getSubcommand();
        const userId = interaction.user.id;

        let theater = db.db.prepare('SELECT * FROM theaters WHERE user_id = ?').get(userId);

        if (!theater && sub !== 'status') {
            return interaction.reply({ content: '❌ Benutze zuerst `/theater status` um dein Theater zu eröffnen!', ephemeral: true });
        }

        if (sub === 'status') {
            if (!theater) {
                db.db.prepare('INSERT INTO theaters (user_id) VALUES (?)').run(userId);
                theater = db.db.prepare('SELECT * FROM theaters WHERE user_id = ?').get(userId);
                const embed = new EmbedBuilder()
                    .setColor('#8B0000')
                    .setTitle('🎭 Theater eröffnet!')
                    .setDescription('Der Vorhang hebt sich...\n\nDein **Kleine Bühne** ist bereit!\nDu hast 2 Schauspieler und 50 Sitzplätze.\n\nSchreibe dein erstes Stück mit `/theater schreiben`!');
                return interaction.reply({ embeds: [embed] });
            }

            const rank = getRank(theater.fame);
            const nextRank = rank < RANKS.length - 1 ? RANKS[rank + 1] : null;
            const playCount = db.db.prepare('SELECT COUNT(*) as cnt FROM theater_plays WHERE user_id = ?').get(userId).cnt;

            const embed = new EmbedBuilder()
                .setColor('#8B0000')
                .setTitle(`🎭 ${theater.theater_name}`)
                .setDescription(`**${RANKS[rank].name}** (Rang ${rank})\n${nextRank ? `Nächster Rang: ${nextRank.name} (${theater.fame}/${nextRank.fame} Ruhm)` : '👑 MAXIMALER RANG!'}`)
                .addFields(
                    { name: '⭐ Ruhm', value: `${theater.fame}`, inline: true },
                    { name: '📜 Stücke', value: `${playCount}`, inline: true },
                    { name: '🎪 Shows', value: `${theater.total_shows}`, inline: true },
                    { name: '🎭 Bühne', value: `Lv.${theater.stage_level}`, inline: true },
                    { name: '👗 Kostüme', value: `Lv.${theater.costume_level}`, inline: true },
                    { name: '💡 Licht', value: `Lv.${theater.lighting_level}`, inline: true },
                    { name: '🔊 Sound', value: `Lv.${theater.sound_level}`, inline: true },
                    { name: '💺 Sitze', value: `${theater.seats}`, inline: true },
                    { name: '🎭 Schauspieler', value: `${theater.actors}`, inline: true },
                    { name: '🎟️ Ticketpreis', value: `${theater.ticket_price} Coins`, inline: true },
                    { name: '💰 Gesamteinnahmen', value: `${theater.total_earned} Coins`, inline: true }
                );
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'umbenennen') {
            const name = interaction.options.getString('name');
            if (name.length > 30) return interaction.reply({ content: '❌ Name max. 30 Zeichen!', ephemeral: true });
            db.db.prepare('UPDATE theaters SET theater_name = ? WHERE user_id = ?').run(name, userId);
            const embed = new EmbedBuilder()
                .setColor('#8B0000')
                .setTitle('🎭 Theater umbenannt!')
                .setDescription(`Dein Theater heißt jetzt **${name}**!`);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'schreiben') {
            const cdKey = `theater_write_${userId}`;
            if (cooldowns.has(cdKey) && cooldowns.get(cdKey) > Date.now()) {
                const left = Math.ceil((cooldowns.get(cdKey) - Date.now()) / 1000);
                return interaction.reply({ content: `⏳ Du schreibst noch... Warte ${left}s.`, ephemeral: true });
            }

            const genreId = interaction.options.getString('genre');
            const genre = GENRES[genreId];
            const cost = genre.difficulty * 30;

            let balance = db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId);
            if (!balance || balance.balance < cost) {
                return interaction.reply({ content: `❌ Das Schreiben kostet ${cost} Coins (Recherche, Material). Du hast ${balance?.balance || 0}.`, ephemeral: true });
            }

            const titles = PLAY_TITLES[genreId];
            const title = titles[Math.floor(Math.random() * titles.length)];

            const baseQuality = 30 + Math.floor(Math.random() * 30);
            const stageBonus = theater.stage_level * 3;
            const actorBonus = Math.min(theater.actors * 2, 20);
            const quality = Math.min(100, baseQuality + stageBonus + actorBonus);

            db.db.prepare('UPDATE economy SET balance = balance - ? WHERE user_id = ?').run(cost, userId);
            db.db.prepare('INSERT INTO theater_plays (user_id, title, genre, quality) VALUES (?, ?, ?, ?)').run(userId, title, genreId, quality);
            db.db.prepare('UPDATE theaters SET fame = fame + ? WHERE user_id = ?').run(5, userId);

            const embed = new EmbedBuilder()
                .setColor('#8B0000')
                .setTitle('📜 Neues Stück geschrieben!')
                .setDescription(`**"${title}"**\n${genre.name}\n\n⭐ Qualität: ${'★'.repeat(Math.floor(quality / 20))}${'☆'.repeat(5 - Math.floor(quality / 20))} (${quality}/100)\n\n*Bühnen-Bonus: +${stageBonus} | Schauspieler-Bonus: +${actorBonus}*\n\n💰 -${cost} Coins | ⭐ +5 Ruhm`)
                .setFooter({ text: 'Führe es auf mit /theater auffuehren!' });

            cooldowns.set(cdKey, Date.now() + 90000);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'auffuehren') {
            const cdKey = `theater_show_${userId}`;
            if (cooldowns.has(cdKey) && cooldowns.get(cdKey) > Date.now()) {
                const left = Math.ceil((cooldowns.get(cdKey) - Date.now()) / 1000);
                return interaction.reply({ content: `⏳ Nächste Vorstellung in ${left}s.`, ephemeral: true });
            }

            const playId = interaction.options.getInteger('stueck');
            const play = db.db.prepare('SELECT * FROM theater_plays WHERE id = ? AND user_id = ?').get(playId, userId);
            if (!play) return interaction.reply({ content: '❌ Stück nicht gefunden!', ephemeral: true });

            const genre = GENRES[play.genre];
            const event = SHOW_EVENTS[Math.floor(Math.random() * SHOW_EVENTS.length)];

            const demandFactor = Math.max(0.3, 1.0 - (theater.ticket_price / 100) * 0.5);
            const qualityFactor = play.quality / 100;
            const costumeFactor = 1 + theater.costume_level * 0.05;
            const lightFactor = 1 + theater.lighting_level * 0.03;
            const soundFactor = play.genre === 'musical' ? 1 + theater.sound_level * 0.08 : 1 + theater.sound_level * 0.02;
            const popularityFactor = genre.popularity;
            const repeatPenalty = Math.max(0.5, 1.0 - play.times_performed * 0.05);

            const visitors = Math.min(theater.seats, Math.floor(
                theater.seats * demandFactor * qualityFactor * costumeFactor * lightFactor * soundFactor * popularityFactor * repeatPenalty * event.visitorMod * (0.8 + Math.random() * 0.4)
            ));

            const ticketRevenue = visitors * theater.ticket_price;
            const tips = Math.floor(visitors * (play.quality / 50) * event.tipMod * (0.5 + Math.random() * 1.0));
            const totalRevenue = ticketRevenue + tips;
            const fameGain = Math.floor(visitors * qualityFactor * event.visitorMod * 0.3);

            let balance = db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId);
            if (!balance) {
                db.db.prepare('INSERT INTO economy (user_id, balance) VALUES (?, 0)').run(userId);
            }
            db.db.prepare('UPDATE economy SET balance = balance + ? WHERE user_id = ?').run(totalRevenue, userId);
            db.db.prepare('UPDATE theaters SET total_shows = total_shows + 1, total_earned = total_earned + ?, fame = fame + ? WHERE user_id = ?')
                .run(totalRevenue, fameGain, userId);
            db.db.prepare('UPDATE theater_plays SET times_performed = times_performed + 1 WHERE id = ?').run(playId);

            const fillPercent = Math.floor((visitors / theater.seats) * 100);
            const fillBar = '█'.repeat(Math.floor(fillPercent / 10)) + '░'.repeat(10 - Math.floor(fillPercent / 10));

            const embed = new EmbedBuilder()
                .setColor(visitors > theater.seats * 0.7 ? '#00aa00' : (visitors > theater.seats * 0.4 ? '#ffaa00' : '#ff0000'))
                .setTitle(`🎭 "${play.title}" — Vorstellung #${play.times_performed + 1}`)
                .setDescription(`${genre.name}\n\n${event.text}\n\n👥 Zuschauer: **${visitors}/${theater.seats}** [${fillBar}] ${fillPercent}%\n\n🎟️ Tickets: ${ticketRevenue} Coins\n💵 Trinkgeld: ${tips} Coins\n💰 **Gesamt: ${totalRevenue} Coins**\n⭐ +${fameGain} Ruhm`)
                .setFooter({ text: `${play.times_performed + 1}x aufgeführt | Qualität: ${play.quality}/100` });

            cooldowns.set(cdKey, Date.now() + 60000);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'repertoire') {
            const plays = db.db.prepare('SELECT * FROM theater_plays WHERE user_id = ? ORDER BY quality DESC').all(userId);

            if (plays.length === 0) {
                return interaction.reply({ content: '❌ Du hast noch keine Stücke! Schreibe eines mit `/theater schreiben`.', ephemeral: true });
            }

            const list = plays.map(p => {
                const genre = GENRES[p.genre];
                const stars = '★'.repeat(Math.floor(p.quality / 20)) + '☆'.repeat(5 - Math.floor(p.quality / 20));
                return `**#${p.id} "${p.title}"** ${genre.name}\n${stars} (${p.quality}/100) | ${p.times_performed}x aufgeführt`;
            }).join('\n\n');

            const embed = new EmbedBuilder()
                .setColor('#8B0000')
                .setTitle('📜 Dein Repertoire')
                .setDescription(list)
                .setFooter({ text: `${plays.length} Stücke` });
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'upgrade') {
            const what = interaction.options.getString('was');
            const upgrade = UPGRADES[what];
            const currentLevel = theater[upgrade.field];

            if (what === 'sitze') {
                const cost = upgrade.baseCost + currentLevel * 10;
                let balance = db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId);
                if (!balance || balance.balance < cost) {
                    return interaction.reply({ content: `❌ Upgrade kostet ${cost} Coins. Du hast ${balance?.balance || 0}.`, ephemeral: true });
                }
                if (currentLevel >= upgrade.maxLevel) return interaction.reply({ content: '❌ Maximum erreicht!', ephemeral: true });

                db.db.prepare('UPDATE economy SET balance = balance - ? WHERE user_id = ?').run(cost, userId);
                db.db.prepare('UPDATE theaters SET seats = seats + 25 WHERE user_id = ?').run(userId);

                const embed = new EmbedBuilder()
                    .setColor('#8B0000')
                    .setTitle(`${upgrade.name} erweitert!`)
                    .setDescription(`💺 ${currentLevel} → ${currentLevel + 25} Sitzplätze\n💰 -${cost} Coins`);
                return interaction.reply({ embeds: [embed] });
            }

            if (what === 'schauspieler') {
                const cost = upgrade.baseCost * currentLevel;
                let balance = db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId);
                if (!balance || balance.balance < cost) {
                    return interaction.reply({ content: `❌ Neuer Schauspieler kostet ${cost} Coins.`, ephemeral: true });
                }
                if (currentLevel >= upgrade.maxLevel) return interaction.reply({ content: '❌ Maximum erreicht!', ephemeral: true });

                db.db.prepare('UPDATE economy SET balance = balance - ? WHERE user_id = ?').run(cost, userId);
                db.db.prepare('UPDATE theaters SET actors = actors + 1 WHERE user_id = ?').run(userId);

                const embed = new EmbedBuilder()
                    .setColor('#8B0000')
                    .setTitle(`${upgrade.name} angeheuert!`)
                    .setDescription(`🎭 ${currentLevel} → ${currentLevel + 1} Schauspieler\n💰 -${cost} Coins`);
                return interaction.reply({ embeds: [embed] });
            }

            const cost = upgrade.baseCost * currentLevel;
            let balance = db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId);
            if (!balance || balance.balance < cost) {
                return interaction.reply({ content: `❌ Upgrade kostet ${cost} Coins. Du hast ${balance?.balance || 0}.`, ephemeral: true });
            }
            if (currentLevel >= upgrade.maxLevel) return interaction.reply({ content: '❌ Maximum erreicht!', ephemeral: true });

            db.db.prepare('UPDATE economy SET balance = balance - ? WHERE user_id = ?').run(cost, userId);
            db.db.prepare(`UPDATE theaters SET ${upgrade.field} = ${upgrade.field} + 1 WHERE user_id = ?`).run(userId);

            const embed = new EmbedBuilder()
                .setColor('#8B0000')
                .setTitle(`${upgrade.name} verbessert!`)
                .setDescription(`${upgrade.name}: Lv.${currentLevel} → Lv.${currentLevel + 1}\n${upgrade.desc}\n💰 -${cost} Coins`);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'ticketpreis') {
            const price = interaction.options.getInteger('preis');
            if (price < 5 || price > 500) return interaction.reply({ content: '❌ Preis muss zwischen 5 und 500 Coins liegen!', ephemeral: true });

            db.db.prepare('UPDATE theaters SET ticket_price = ? WHERE user_id = ?').run(price, userId);

            const demandStr = price <= 20 ? '📈 Sehr hohe Nachfrage' : price <= 50 ? '📊 Gute Nachfrage' : price <= 100 ? '📉 Moderate Nachfrage' : '⚠️ Niedrige Nachfrage';

            const embed = new EmbedBuilder()
                .setColor('#8B0000')
                .setTitle('🎟️ Ticketpreis angepasst')
                .setDescription(`Neuer Preis: **${price} Coins** pro Ticket\n${demandStr}\n\n*Höhere Preise = weniger Zuschauer, aber mehr pro Ticket*`);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'kritik') {
            const cdKey = `theater_review_${userId}`;
            if (cooldowns.has(cdKey) && cooldowns.get(cdKey) > Date.now()) {
                const left = Math.ceil((cooldowns.get(cdKey) - Date.now()) / 1000);
                return interaction.reply({ content: `⏳ Nächste Kritik in ${left}s.`, ephemeral: true });
            }

            const plays = db.db.prepare('SELECT * FROM theater_plays WHERE user_id = ? ORDER BY quality DESC LIMIT 3').all(userId);
            if (plays.length === 0) return interaction.reply({ content: '❌ Du hast noch keine Stücke!', ephemeral: true });

            const avgQuality = plays.reduce((s, p) => s + p.quality, 0) / plays.length;
            const totalLevel = theater.stage_level + theater.costume_level + theater.lighting_level + theater.sound_level;
            const score = Math.min(100, Math.floor(avgQuality * 0.5 + totalLevel * 2 + theater.actors * 1.5 + Math.random() * 20));

            const reviews = [
                { min: 90, text: '🌟🌟🌟🌟🌟 "Ein Meisterwerk! Absolut weltklasse!" — Theaterjournal', fame: 50 },
                { min: 75, text: '🌟🌟🌟🌟 "Beeindruckend! Großartiges Theater!" — Kulturmagazin', fame: 35 },
                { min: 60, text: '🌟🌟🌟 "Solide Unterhaltung, guter Abend!" — Stadtblatt', fame: 20 },
                { min: 40, text: '🌟🌟 "Ausbaufähig, aber es gibt Potenzial." — Kritikerblog', fame: 10 },
                { min: 20, text: '🌟 "Leider enttäuschend. Mehr Arbeit nötig." — Abendzeitg.', fame: 3 },
                { min: 0, text: '💩 "Katastrophal. Spart euch das Geld." — Onlineforum', fame: 0 }
            ];

            const review = reviews.find(r => score >= r.min);
            db.db.prepare('UPDATE theaters SET fame = fame + ? WHERE user_id = ?').run(review.fame, userId);

            const embed = new EmbedBuilder()
                .setColor(score >= 60 ? '#00aa00' : (score >= 40 ? '#ffaa00' : '#ff0000'))
                .setTitle('📰 Theaterkritik')
                .setDescription(`**${theater.theater_name}**\n\nBewertung: **${score}/100**\n\n${review.text}\n\n⭐ +${review.fame} Ruhm`)
                .addFields(
                    { name: 'Bewertungsdetails', value: `Stück-Qualität: ${avgQuality.toFixed(0)}/100\nAusstattung: ${totalLevel}/40\nSchauspieler: ${theater.actors}` }
                );

            cooldowns.set(cdKey, Date.now() + 180000);
            return interaction.reply({ embeds: [embed] });
        }
    }
};
