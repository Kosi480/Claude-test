const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const LEGIERUNGEN = [
    { name: 'Rohzinn', preis: 0, qualitaet: 1.0, emoji: '🪙' },
    { name: 'Britanniametall', preis: 1600, qualitaet: 1.2, emoji: '⚪' },
    { name: 'Hartzinn', preis: 3700, qualitaet: 1.4, emoji: '🔘' },
    { name: 'Silberzinn', preis: 8500, qualitaet: 1.7, emoji: '🥈' },
    { name: 'Goldzinn', preis: 19000, qualitaet: 2.0, emoji: '🥇' },
    { name: 'Mondlegierung', preis: 36000, qualitaet: 2.5, emoji: '🌙' },
    { name: 'Sternenstahl', preis: 67000, qualitaet: 3.1, emoji: '⭐' },
    { name: 'Äthermetall', preis: 117000, qualitaet: 3.9, emoji: '💫' }
];

const PRODUKTE = [
    { name: 'Löffel', basisWert: 50, schwierigkeit: 1, minLevel: 1 },
    { name: 'Becher', basisWert: 105, schwierigkeit: 1, minLevel: 1 },
    { name: 'Teller', basisWert: 220, schwierigkeit: 2, minLevel: 2 },
    { name: 'Kanne', basisWert: 450, schwierigkeit: 3, minLevel: 4 },
    { name: 'Leuchter', basisWert: 850, schwierigkeit: 4, minLevel: 6 },
    { name: 'Pokal', basisWert: 1500, schwierigkeit: 5, minLevel: 8 },
    { name: 'Tafelaufsatz', basisWert: 3000, schwierigkeit: 7, minLevel: 11 },
    { name: 'Monumentaler Kronleuchter', basisWert: 5800, schwierigkeit: 9, minLevel: 14 }
];

const GUSSTECHNIKEN = [
    { name: 'Sandguss', bonus: 1.0, minLevel: 1 },
    { name: 'Kokillenguss', bonus: 1.15, minLevel: 2 },
    { name: 'Schleuderguss', bonus: 1.3, minLevel: 3 },
    { name: 'Wachsausschmelzguss', bonus: 1.5, minLevel: 5 },
    { name: 'Druckguss', bonus: 1.7, minLevel: 7 },
    { name: 'Feinguss', bonus: 1.9, minLevel: 9 },
    { name: 'Elfenguss', bonus: 2.3, minLevel: 12 },
    { name: 'Ätherguss', bonus: 2.8, minLevel: 15 }
];

const QUALITAETEN = [
    { name: 'Porös', multi: 0.3, minRoll: 0 },
    { name: 'Uneben', multi: 0.5, minRoll: 12 },
    { name: 'Brauchbar', multi: 0.8, minRoll: 26 },
    { name: 'Sauber', multi: 1.0, minRoll: 42 },
    { name: 'Glänzend', multi: 1.5, minRoll: 58 },
    { name: 'Prächtig', multi: 2.2, minRoll: 76 },
    { name: 'Meisterhaft', multi: 3.5, minRoll: 93 }
];

const UPGRADES = {
    ofen: { name: 'Schmelzofen', stufen: [0, 1500, 5000, 15000, 40000], bonus: [0, 0.1, 0.2, 0.35, 0.5] },
    form: { name: 'Gussform', stufen: [0, 2000, 6000, 18000, 45000], bonus: [0, 0.08, 0.18, 0.3, 0.45] },
    polierbank: { name: 'Polierbank', stufen: [0, 2500, 7000, 20000, 52000], bonus: [0, 0.1, 0.22, 0.36, 0.52] },
    werkstatt: { name: 'Zinngießerei', stufen: [0, 3000, 9000, 25000, 60000], bonus: [0, 1, 2, 3, 5] }
};

const GUSS_EVENTS = [
    { text: '✨ Perfekter Guss! Keine einzige Luftblase!', qualMulti: 1.5, geldMulti: 1.0 },
    { text: '💥 Das Metall spritzt! Brandgefahr in der Werkstatt!', qualMulti: 0.5, geldMulti: 1.0 },
    { text: '🌡️ Ideale Schmelztemperatur — das Zinn fließt perfekt!', qualMulti: 1.4, geldMulti: 1.3 },
    { text: '👑 Ein Fürst bestellt ein ganzes Tafelservice!', qualMulti: 1.0, geldMulti: 2.5 },
    { text: '🔍 Außergewöhnlich glatte Oberfläche — wie ein Spiegel!', qualMulti: 1.6, geldMulti: 1.2 },
    { text: '🫠 Die Form bricht! Das Zinn läuft aus!', qualMulti: 0.6, geldMulti: 0.8 },
    { text: '🔮 Magische Funken tanzen über dem geschmolzenen Metall!', qualMulti: 1.7, geldMulti: 1.5 }
];

const cooldowns = new Map();

function ensureZinngiesserTable(db) {
    db.db.exec(`CREATE TABLE IF NOT EXISTS zinngiesser (
        user_id TEXT PRIMARY KEY,
        legierungen TEXT DEFAULT '[]',
        techniken TEXT DEFAULT '[]',
        level INTEGER DEFAULT 1,
        xp INTEGER DEFAULT 0,
        werke_gegossen INTEGER DEFAULT 0,
        beste_qualitaet TEXT DEFAULT '',
        gesamtverdienst INTEGER DEFAULT 0,
        ofen INTEGER DEFAULT 0,
        form INTEGER DEFAULT 0,
        polierbank INTEGER DEFAULT 0,
        werkstatt INTEGER DEFAULT 0,
        giesstechnik INTEGER DEFAULT 0,
        formenbau INTEGER DEFAULT 0,
        metallkunde INTEGER DEFAULT 0,
        ausdauer INTEGER DEFAULT 0,
        trainings INTEGER DEFAULT 0,
        duelle_gewonnen INTEGER DEFAULT 0,
        duelle_verloren INTEGER DEFAULT 0,
        letztes_giessen INTEGER DEFAULT 0,
        letztes_training INTEGER DEFAULT 0
    )`);
    db.db.exec(`CREATE TABLE IF NOT EXISTS zinngiesser_regal (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        produkt_typ TEXT,
        legierung TEXT,
        technik TEXT,
        qualitaet TEXT,
        wert INTEGER,
        erstellt_am INTEGER DEFAULT 0
    )`);
}

function getZinngiesser(db, uId) {
    const row = db.db.prepare('SELECT * FROM zinngiesser WHERE user_id = ?').get(uId);
    if (!row) {
        db.db.prepare('INSERT INTO zinngiesser (user_id) VALUES (?)').run(uId);
        return db.db.prepare('SELECT * FROM zinngiesser WHERE user_id = ?').get(uId);
    }
    return row;
}

function xpForLevel(l) { return l * l * 50; }

function checkLevelUp(db, uId, z) {
    let lvl = z.level;
    let xp = z.xp;
    let ups = 0;
    while (xp >= xpForLevel(lvl)) {
        xp -= xpForLevel(lvl);
        lvl++;
        ups++;
    }
    if (ups > 0) {
        db.db.prepare('UPDATE zinngiesser SET level = ?, xp = ? WHERE user_id = ?').run(lvl, xp, uId);
    }
    return { lvl, ups };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('zinngiesser')
        .setDescription('🪙 Zinngießerei - Gieße edle Zinnwaren aus feinen Legierungen!')
        .addSubcommand(s => s.setName('start').setDescription('Beginne deine Zinngießer-Karriere'))
        .addSubcommand(s => s.setName('status').setDescription('Zeige deinen Zinngießer-Status'))
        .addSubcommand(s => s.setName('legierungen').setDescription('Zeige verfügbare Legierungen'))
        .addSubcommand(s => s.setName('kaufen').setDescription('Kaufe eine neue Legierung')
            .addStringOption(o => o.setName('legierung').setDescription('Name der Legierung').setRequired(true)))
        .addSubcommand(s => s.setName('giessen').setDescription('Gieße ein Zinnprodukt')
            .addStringOption(o => o.setName('produkt').setDescription('Produkttyp').setRequired(true))
            .addStringOption(o => o.setName('legierung').setDescription('Legierungsart').setRequired(true))
            .addStringOption(o => o.setName('technik').setDescription('Gusstechnik').setRequired(true)))
        .addSubcommand(s => s.setName('training').setDescription('Trainiere deine Zinngießer-Fähigkeiten')
            .addStringOption(o => o.setName('typ').setDescription('Trainingstyp (giesstechnik/formenbau/metallkunde/ausdauer)').setRequired(true)))
        .addSubcommand(s => s.setName('upgrade').setDescription('Verbessere deine Ausrüstung')
            .addStringOption(o => o.setName('item').setDescription('Ausrüstung (ofen/form/polierbank/werkstatt)').setRequired(true)))
        .addSubcommand(s => s.setName('regal').setDescription('Zeige dein Zinnregal'))
        .addSubcommand(s => s.setName('auftrag').setDescription('Nimm einen Zinngießerauftrag an'))
        .addSubcommand(s => s.setName('duell').setDescription('Fordere einen anderen Zinngießer heraus')
            .addUserOption(o => o.setName('gegner').setDescription('Dein Gegner').setRequired(true))),

    async execute(interaction) {
        const db = interaction.client.db;
        const config = require('../config.json');
        ensureZinngiesserTable(db);
        const uId = interaction.user.id;
        const sub = interaction.options.getSubcommand();

        if (sub === 'start') {
            const existing = db.db.prepare('SELECT * FROM zinngiesser WHERE user_id = ?').get(uId);
            if (existing && existing.legierungen !== '[]') {
                return interaction.reply({ content: '❌ Du bist bereits ein Zinngießer!', ephemeral: true });
            }
            db.db.prepare('INSERT OR REPLACE INTO zinngiesser (user_id, legierungen, techniken) VALUES (?, ?, ?)').run(
                uId, JSON.stringify([LEGIERUNGEN[0].name]), JSON.stringify([GUSSTECHNIKEN[0].name])
            );

            const embed = new EmbedBuilder()
                .setTitle('🪙 Willkommen in der Zinngießerei!')
                .setDescription(`Du erhältst **${LEGIERUNGEN[0].name}** ${LEGIERUNGEN[0].emoji} und lernst den **${GUSSTECHNIKEN[0].name}**!`)
                .addFields(
                    { name: '🪙 Legierung', value: LEGIERUNGEN[0].name, inline: true },
                    { name: '🔥 Technik', value: GUSSTECHNIKEN[0].name, inline: true },
                    { name: '💡 Nächster Schritt', value: 'Nutze `/zinngiesser giessen` um dein erstes Zinnprodukt zu gießen!' }
                )
                .setColor(0xC0C0C0);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'status') {
            const z = getZinngiesser(db, uId);
            if (z.legierungen === '[]') return interaction.reply({ content: '❌ Nutze `/zinngiesser start` um zu beginnen!', ephemeral: true });
            const legierungen = JSON.parse(z.legierungen);
            const techniken = JSON.parse(z.techniken);
            const xpNeeded = xpForLevel(z.level);

            const embed = new EmbedBuilder()
                .setTitle(`🪙 Zinngießer ${interaction.user.username}`)
                .addFields(
                    { name: '📊 Level', value: `${z.level} (${z.xp}/${xpNeeded} XP)`, inline: true },
                    { name: '🫗 Gegossen', value: `${z.werke_gegossen} Werke`, inline: true },
                    { name: '💰 Verdienst', value: `${z.gesamtverdienst} Münzen`, inline: true },
                    { name: '🏆 Beste Qualität', value: z.beste_qualitaet || 'Keine', inline: true },
                    { name: '🔥 Ofen', value: `Stufe ${z.ofen}`, inline: true },
                    { name: '🧱 Form', value: `Stufe ${z.form}`, inline: true },
                    { name: '✨ Polierbank', value: `Stufe ${z.polierbank}`, inline: true },
                    { name: '🏠 Werkstatt', value: `Stufe ${z.werkstatt}`, inline: true },
                    { name: '🪙 Legierungen', value: `${legierungen.length}`, inline: true },
                    { name: '🔥 Techniken', value: `${techniken.length}`, inline: true },
                    { name: '🏆 Duelle', value: `${z.duelle_gewonnen}W / ${z.duelle_verloren}L`, inline: true }
                )
                .setColor(0xC0C0C0);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'legierungen') {
            const z = getZinngiesser(db, uId);
            const besitz = z.legierungen !== '[]' ? JSON.parse(z.legierungen) : [];
            const lines = LEGIERUNGEN.map(l => {
                const owned = besitz.includes(l.name) ? ' ✅' : '';
                return `${l.emoji} **${l.name}** - ${l.preis > 0 ? `${l.preis} Münzen` : 'Starter'} | Qualität: x${l.qualitaet}${owned}`;
            });
            const embed = new EmbedBuilder()
                .setTitle('🪙 Verfügbare Legierungen')
                .setDescription(lines.join('\n'))
                .setColor(0xC0C0C0);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'kaufen') {
            const z = getZinngiesser(db, uId);
            if (z.legierungen === '[]') return interaction.reply({ content: '❌ Nutze `/zinngiesser start` um zu beginnen!', ephemeral: true });

            const legName = interaction.options.getString('legierung');
            const leg = LEGIERUNGEN.find(l => l.name.toLowerCase() === legName.toLowerCase());
            if (!leg) return interaction.reply({ content: '❌ Unbekannte Legierung!', ephemeral: true });

            const besitz = JSON.parse(z.legierungen);
            if (besitz.includes(leg.name)) return interaction.reply({ content: '❌ Du besitzt diese Legierung bereits!', ephemeral: true });

            const user = db.getUser(uId);
            if (user.balance < leg.preis) return interaction.reply({ content: `❌ Du brauchst ${leg.preis} Münzen! (Hast: ${user.balance})`, ephemeral: true });

            db.updateBalance(uId, -leg.preis);
            besitz.push(leg.name);
            db.db.prepare('UPDATE zinngiesser SET legierungen = ? WHERE user_id = ?').run(JSON.stringify(besitz), uId);

            const embed = new EmbedBuilder()
                .setTitle('🪙 Neue Legierung!')
                .setDescription(`Du hast **${leg.name}** ${leg.emoji} für **${leg.preis} Münzen** erworben!`)
                .addFields({ name: '📊 Qualitätsbonus', value: `x${leg.qualitaet}`, inline: true })
                .setColor(0x00FF00);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'giessen') {
            const z = getZinngiesser(db, uId);
            if (z.legierungen === '[]') return interaction.reply({ content: '❌ Nutze `/zinngiesser start` um zu beginnen!', ephemeral: true });

            const cdKey = `zinngiesser_${uId}`;
            const cdTime = cooldowns.get(cdKey);
            if (cdTime && Date.now() - cdTime < 50000) {
                const rest = Math.ceil((50000 - (Date.now() - cdTime)) / 1000);
                return interaction.reply({ content: `⏳ Das Zinn muss noch abkühlen! Warte noch ${rest}s.`, ephemeral: true });
            }

            const produktName = interaction.options.getString('produkt');
            const legName = interaction.options.getString('legierung');
            const technikName = interaction.options.getString('technik');

            const produkt = PRODUKTE.find(p => p.name.toLowerCase() === produktName.toLowerCase());
            if (!produkt) return interaction.reply({ content: `❌ Unbekanntes Produkt! Verfügbar: ${PRODUKTE.map(p => p.name).join(', ')}`, ephemeral: true });
            if (z.level < produkt.minLevel) return interaction.reply({ content: `❌ Du brauchst Level ${produkt.minLevel} für ${produkt.name}!`, ephemeral: true });

            const leg = LEGIERUNGEN.find(l => l.name.toLowerCase() === legName.toLowerCase());
            if (!leg) return interaction.reply({ content: '❌ Unbekannte Legierung!', ephemeral: true });
            const besitz = JSON.parse(z.legierungen);
            if (!besitz.includes(leg.name)) return interaction.reply({ content: '❌ Du besitzt diese Legierung nicht!', ephemeral: true });

            const technik = GUSSTECHNIKEN.find(t => t.name.toLowerCase() === technikName.toLowerCase());
            if (!technik) return interaction.reply({ content: `❌ Unbekannte Technik! Verfügbar: ${GUSSTECHNIKEN.map(t => t.name).join(', ')}`, ephemeral: true });

            const techniken = JSON.parse(z.techniken);
            if (!techniken.includes(technik.name)) {
                if (z.level < technik.minLevel) return interaction.reply({ content: `❌ Du brauchst Level ${technik.minLevel} für ${technik.name}!`, ephemeral: true });
                techniken.push(technik.name);
                db.db.prepare('UPDATE zinngiesser SET techniken = ? WHERE user_id = ?').run(JSON.stringify(techniken), uId);
            }

            cooldowns.set(cdKey, Date.now());

            const ofenBonus = UPGRADES.ofen.bonus[z.ofen];
            const formBonus = UPGRADES.form.bonus[z.form];
            const polierBonus = UPGRADES.polierbank.bonus[z.polierbank];
            const giessBonus = z.giesstechnik * 0.02;
            const formenBonus = z.formenbau * 0.018;

            let qualRoll = Math.random() * 100;
            qualRoll += (ofenBonus + formBonus + polierBonus + giessBonus + formenBonus) * 28;
            qualRoll *= leg.qualitaet * technik.bonus / produkt.schwierigkeit;

            let event = null;
            if (Math.random() < 0.2) {
                event = GUSS_EVENTS[Math.floor(Math.random() * GUSS_EVENTS.length)];
                qualRoll *= event.qualMulti;
            }

            qualRoll = Math.min(100, qualRoll);
            let qualitaet = QUALITAETEN[0];
            for (const q of QUALITAETEN) {
                if (qualRoll >= q.minRoll) qualitaet = q;
            }

            let wert = Math.floor(produkt.basisWert * qualitaet.multi * leg.qualitaet * technik.bonus * (1 + polierBonus));
            if (event) wert = Math.floor(wert * event.geldMulti);

            db.updateBalance(uId, wert);
            const xpGain = 13 + Math.floor(produkt.schwierigkeit * 5) + Math.floor(wert / 50);

            db.db.prepare('INSERT INTO zinngiesser_regal (user_id, produkt_typ, legierung, technik, qualitaet, wert, erstellt_am) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
                uId, produkt.name, leg.name, technik.name, qualitaet.name, wert, Date.now()
            );

            const besteQ = QUALITAETEN.indexOf(qualitaet) > QUALITAETEN.findIndex(q => q.name === z.beste_qualitaet) ? qualitaet.name : (z.beste_qualitaet || qualitaet.name);
            db.db.prepare('UPDATE zinngiesser SET werke_gegossen = werke_gegossen + 1, gesamtverdienst = gesamtverdienst + ?, xp = xp + ?, beste_qualitaet = ?, letztes_giessen = ? WHERE user_id = ?').run(
                wert, xpGain, besteQ, Date.now(), uId
            );

            const updatedZ = getZinngiesser(db, uId);
            const levelUp = checkLevelUp(db, uId, updatedZ);

            const embed = new EmbedBuilder()
                .setTitle(`🫗 ${produkt.name} gegossen!`)
                .setDescription(`Du hast einen **${qualitaet.name}en** ${produkt.name} aus **${leg.name}** ${leg.emoji} mit **${technik.name}** gegossen!`)
                .setColor(qualitaet.multi >= 2.0 ? 0xFFD700 : qualitaet.multi >= 1.0 ? 0x00FF00 : 0xFF6600);

            if (event) embed.addFields({ name: '🎲 Ereignis', value: event.text });

            embed.addFields(
                { name: '📊 Qualität', value: qualitaet.name, inline: true },
                { name: '💰 Wert', value: `${wert} Münzen`, inline: true },
                { name: '⭐ XP', value: `+${xpGain}`, inline: true }
            );

            if (levelUp.ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${levelUp.lvl}!` });

            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'training') {
            const z = getZinngiesser(db, uId);
            if (z.legierungen === '[]') return interaction.reply({ content: '❌ Nutze `/zinngiesser start` um zu beginnen!', ephemeral: true });

            const cdKey = `zinngiesser_train_${uId}`;
            const cdTime = cooldowns.get(cdKey);
            if (cdTime && Date.now() - cdTime < 60000) {
                const rest = Math.ceil((60000 - (Date.now() - cdTime)) / 1000);
                return interaction.reply({ content: `⏳ Deine Hände sind noch heiß! Warte noch ${rest}s.`, ephemeral: true });
            }

            const typ = interaction.options.getString('typ').toLowerCase();
            const validTypes = ['giesstechnik', 'formenbau', 'metallkunde', 'ausdauer'];
            if (!validTypes.includes(typ)) return interaction.reply({ content: `❌ Unbekanntes Training! Verfügbar: ${validTypes.join(', ')}`, ephemeral: true });

            cooldowns.set(cdKey, Date.now());
            const xpGain = 12 + Math.floor(z.level * 2);
            const newVal = z[typ] + 1;

            db.db.prepare(`UPDATE zinngiesser SET ${typ} = ?, trainings = trainings + 1, xp = xp + ?, letztes_training = ? WHERE user_id = ?`).run(
                newVal, xpGain, Date.now(), uId
            );

            const updatedZ = getZinngiesser(db, uId);
            const levelUp = checkLevelUp(db, uId, updatedZ);

            const embed = new EmbedBuilder()
                .setTitle(`🎓 ${typ.charAt(0).toUpperCase() + typ.slice(1)}-Training`)
                .setDescription(`Du hast deine **${typ}** verbessert!`)
                .addFields(
                    { name: '📈 Fortschritt', value: `${z[typ]} → ${newVal}`, inline: true },
                    { name: '⭐ XP', value: `+${xpGain}`, inline: true }
                )
                .setColor(0x4169E1);

            if (levelUp.ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${levelUp.lvl}!` });

            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'upgrade') {
            const z = getZinngiesser(db, uId);
            if (z.legierungen === '[]') return interaction.reply({ content: '❌ Nutze `/zinngiesser start` um zu beginnen!', ephemeral: true });

            const item = interaction.options.getString('item').toLowerCase();
            const upg = UPGRADES[item];
            if (!upg) return interaction.reply({ content: `❌ Unbekanntes Upgrade! Verfügbar: ${Object.keys(UPGRADES).join(', ')}`, ephemeral: true });

            const currentLvl = z[item];
            if (currentLvl >= 4) return interaction.reply({ content: `❌ ${upg.name} ist bereits auf Maximum (Stufe 4)!`, ephemeral: true });

            const kosten = upg.stufen[currentLvl + 1];
            const user = db.getUser(uId);
            if (user.balance < kosten) return interaction.reply({ content: `❌ Du brauchst ${kosten} Münzen! (Hast: ${user.balance})`, ephemeral: true });

            db.updateBalance(uId, -kosten);
            db.db.prepare(`UPDATE zinngiesser SET ${item} = ? WHERE user_id = ?`).run(currentLvl + 1, uId);

            const embed = new EmbedBuilder()
                .setTitle(`⬆️ ${upg.name} verbessert!`)
                .setDescription(`Stufe ${currentLvl} → **Stufe ${currentLvl + 1}**`)
                .addFields(
                    { name: '💰 Kosten', value: `${kosten} Münzen`, inline: true },
                    { name: '📊 Bonus', value: item === 'werkstatt' ? `+${upg.bonus[currentLvl + 1]} Plätze` : `+${(upg.bonus[currentLvl + 1] * 100).toFixed(0)}%`, inline: true }
                )
                .setColor(0xFFD700);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'regal') {
            const z = getZinngiesser(db, uId);
            if (z.legierungen === '[]') return interaction.reply({ content: '❌ Nutze `/zinngiesser start` um zu beginnen!', ephemeral: true });

            const werke = db.db.prepare('SELECT * FROM zinngiesser_regal WHERE user_id = ? ORDER BY wert DESC LIMIT 10').all(uId);

            if (werke.length === 0) {
                return interaction.reply({ content: '🪙 Dein Regal ist noch leer. Gieße dein erstes Zinnstück!', ephemeral: true });
            }

            const total = db.db.prepare('SELECT COUNT(*) as cnt, SUM(wert) as total FROM zinngiesser_regal WHERE user_id = ?').get(uId);
            const lines = werke.map((w, i) => `${i + 1}. **${w.produkt_typ}** (${w.legierung}/${w.technik}) - ${w.qualitaet} - ${w.wert} Münzen`);

            const embed = new EmbedBuilder()
                .setTitle('🪙 Zinnregal')
                .setDescription(lines.join('\n'))
                .addFields(
                    { name: '📊 Gesamt', value: `${total.cnt} Werke`, inline: true },
                    { name: '💰 Gesamtwert', value: `${total.total} Münzen`, inline: true }
                )
                .setColor(0xC0C0C0);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'auftrag') {
            const z = getZinngiesser(db, uId);
            if (z.legierungen === '[]') return interaction.reply({ content: '❌ Nutze `/zinngiesser start` um zu beginnen!', ephemeral: true });

            const cdKey = `zinngiesser_auftrag_${uId}`;
            const cdTime = cooldowns.get(cdKey);
            if (cdTime && Date.now() - cdTime < 120000) {
                const rest = Math.ceil((120000 - (Date.now() - cdTime)) / 1000);
                return interaction.reply({ content: `⏳ Kein neuer Auftrag verfügbar! Warte noch ${rest}s.`, ephemeral: true });
            }

            cooldowns.set(cdKey, Date.now());
            const auftraege = [
                { kunde: 'Gastwirt', produkt: 'Becher', belohnung: 220 + z.level * 35 },
                { kunde: 'Bäcker', produkt: 'Teller', belohnung: 350 + z.level * 50 },
                { kunde: 'Pfarrer', produkt: 'Leuchter', belohnung: 650 + z.level * 85 },
                { kunde: 'Bürgermeister', produkt: 'Kanne', belohnung: 500 + z.level * 70 },
                { kunde: 'Graf', produkt: 'Pokal', belohnung: 1600 + z.level * 165 },
                { kunde: 'Kaiser', produkt: 'Kronleuchter', belohnung: 3500 + z.level * 270 }
            ];

            const auftrag = auftraege[Math.floor(Math.random() * Math.min(auftraege.length, 2 + Math.floor(z.level / 2)))];
            const qualBonus = 1.0 + z.giesstechnik * 0.03 + z.formenbau * 0.025;
            const verdienst = Math.floor(auftrag.belohnung * qualBonus);

            db.updateBalance(uId, verdienst);
            const xpGain = 18 + Math.floor(verdienst / 30);
            db.db.prepare('UPDATE zinngiesser SET werke_gegossen = werke_gegossen + 1, gesamtverdienst = gesamtverdienst + ?, xp = xp + ? WHERE user_id = ?').run(verdienst, xpGain, uId);

            const updatedZ = getZinngiesser(db, uId);
            const levelUp = checkLevelUp(db, uId, updatedZ);

            const embed = new EmbedBuilder()
                .setTitle('📋 Zinngießerauftrag abgeschlossen!')
                .setDescription(`Der **${auftrag.kunde}** hat dich beauftragt, **${auftrag.produkt}** zu fertigen.`)
                .addFields(
                    { name: '💰 Belohnung', value: `${verdienst} Münzen`, inline: true },
                    { name: '⭐ XP', value: `+${xpGain}`, inline: true }
                )
                .setColor(0x00FF00);

            if (levelUp.ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${levelUp.lvl}!` });

            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'duell') {
            const z = getZinngiesser(db, uId);
            if (z.legierungen === '[]') return interaction.reply({ content: '❌ Nutze `/zinngiesser start` um zu beginnen!', ephemeral: true });
            if (z.level < 3) return interaction.reply({ content: '❌ Du brauchst Level 3 für Duelle!', ephemeral: true });

            const gegner = interaction.options.getUser('gegner');
            if (gegner.id === uId) return interaction.reply({ content: '❌ Du kannst dich nicht selbst herausfordern!', ephemeral: true });
            if (gegner.bot) return interaction.reply({ content: '❌ Du kannst keinen Bot herausfordern!', ephemeral: true });

            const gg = db.db.prepare('SELECT * FROM zinngiesser WHERE user_id = ?').get(gegner.id);
            if (!gg || gg.legierungen === '[]') return interaction.reply({ content: '❌ Dein Gegner ist kein Zinngießer!', ephemeral: true });

            const scoreA = (z.level * 10) + (z.giesstechnik * 5) + (z.formenbau * 4) + (z.ofen * 8) + (z.form * 6) + (z.polierbank * 7) + Math.random() * 40;
            const scoreB = (gg.level * 10) + (gg.giesstechnik * 5) + (gg.formenbau * 4) + (gg.ofen * 8) + (gg.form * 6) + (gg.polierbank * 7) + Math.random() * 40;

            const gewonnen = scoreA > scoreB;
            const preis = Math.floor(200 + z.level * 50 + gg.level * 50);

            if (gewonnen) {
                db.updateBalance(uId, preis);
                db.db.prepare('UPDATE zinngiesser SET duelle_gewonnen = duelle_gewonnen + 1 WHERE user_id = ?').run(uId);
                db.db.prepare('UPDATE zinngiesser SET duelle_verloren = duelle_verloren + 1 WHERE user_id = ?').run(gegner.id);
            } else {
                db.updateBalance(gegner.id, preis);
                db.db.prepare('UPDATE zinngiesser SET duelle_verloren = duelle_verloren + 1 WHERE user_id = ?').run(uId);
                db.db.prepare('UPDATE zinngiesser SET duelle_gewonnen = duelle_gewonnen + 1 WHERE user_id = ?').run(gegner.id);
            }

            const embed = new EmbedBuilder()
                .setTitle('🏆 Zinngießer-Duell')
                .setDescription(`🪙 **${interaction.user.username}** vs 🪙 **${gegner.username}**`)
                .addFields(
                    { name: `${interaction.user.username}`, value: `Score: ${Math.floor(scoreA)}`, inline: true },
                    { name: `${gegner.username}`, value: `Score: ${Math.floor(scoreB)}`, inline: true },
                    { name: '🏆 Gewinner', value: gewonnen ? `**${interaction.user.username}** gewinnt ${preis} Münzen!` : `**${gegner.username}** gewinnt ${preis} Münzen!` }
                )
                .setColor(gewonnen ? 0x00FF00 : 0xFF0000);
            return interaction.reply({ embeds: [embed] });
        }
    }
};
