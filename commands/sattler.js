const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const LEDER = [
    { name: 'Rindsleder', preis: 0, qualitaet: 1.0, emoji: '🐄' },
    { name: 'Büffelleder', preis: 1800, qualitaet: 1.2, emoji: '🐃' },
    { name: 'Hirschleder', preis: 4000, qualitaet: 1.4, emoji: '🦌' },
    { name: 'Elchleder', preis: 9000, qualitaet: 1.7, emoji: '🫎' },
    { name: 'Krokodilleder', preis: 20000, qualitaet: 2.0, emoji: '🐊' },
    { name: 'Greifenleder', preis: 38000, qualitaet: 2.5, emoji: '🦅' },
    { name: 'Drachenleder', preis: 70000, qualitaet: 3.1, emoji: '🐉' },
    { name: 'Phönixleder', preis: 120000, qualitaet: 3.9, emoji: '🔥' }
];

const PRODUKTE = [
    { name: 'Zügel', basisWert: 60, schwierigkeit: 1, minLevel: 1 },
    { name: 'Halfter', basisWert: 120, schwierigkeit: 1, minLevel: 1 },
    { name: 'Kummet', basisWert: 250, schwierigkeit: 2, minLevel: 2 },
    { name: 'Reitsattel', basisWert: 500, schwierigkeit: 3, minLevel: 4 },
    { name: 'Turniersattel', basisWert: 900, schwierigkeit: 4, minLevel: 6 },
    { name: 'Kriegssattel', basisWert: 1600, schwierigkeit: 5, minLevel: 8 },
    { name: 'Drachensattel', basisWert: 3200, schwierigkeit: 7, minLevel: 11 },
    { name: 'Legendäres Geschirr', basisWert: 6000, schwierigkeit: 9, minLevel: 14 }
];

const VERZIERUNGEN = [
    { name: 'Schlicht', bonus: 1.0, minLevel: 1 },
    { name: 'Geprägt', bonus: 1.15, minLevel: 2 },
    { name: 'Gefärbt', bonus: 1.3, minLevel: 3 },
    { name: 'Beschlagen', bonus: 1.5, minLevel: 5 },
    { name: 'Bestickt', bonus: 1.7, minLevel: 7 },
    { name: 'Vergoldet', bonus: 1.9, minLevel: 9 },
    { name: 'Runenverziert', bonus: 2.3, minLevel: 12 },
    { name: 'Äthergeschmiedet', bonus: 2.8, minLevel: 15 }
];

const QUALITAETEN = [
    { name: 'Wackelig', multi: 0.3, minRoll: 0 },
    { name: 'Grob', multi: 0.5, minRoll: 12 },
    { name: 'Brauchbar', multi: 0.8, minRoll: 26 },
    { name: 'Solide', multi: 1.0, minRoll: 42 },
    { name: 'Fein', multi: 1.5, minRoll: 58 },
    { name: 'Prächtig', multi: 2.2, minRoll: 76 },
    { name: 'Meisterhaft', multi: 3.5, minRoll: 93 }
];

const UPGRADES = {
    werkbank: { name: 'Sattlerwerkbank', stufen: [0, 1500, 5000, 15000, 40000], bonus: [0, 0.1, 0.2, 0.35, 0.5] },
    ahle: { name: 'Sattlerahle', stufen: [0, 2000, 6000, 18000, 45000], bonus: [0, 0.08, 0.18, 0.3, 0.45] },
    sattelbaum: { name: 'Sattelbaum-Presse', stufen: [0, 2500, 7000, 20000, 52000], bonus: [0, 0.1, 0.22, 0.36, 0.52] },
    werkstatt: { name: 'Sattlerei', stufen: [0, 3000, 9000, 25000, 60000], bonus: [0, 1, 2, 3, 5] }
};

const SATTEL_EVENTS = [
    { text: '✨ Perfekter Sitz! Der Sattel passt wie angegossen.', qualMulti: 1.5, geldMulti: 1.0 },
    { text: '💧 Das Leder ist zu feucht! Die Nähte halten nicht.', qualMulti: 0.5, geldMulti: 1.0 },
    { text: '🐴 Ein edles Ross wird als Testpferd gebracht!', qualMulti: 1.4, geldMulti: 1.3 },
    { text: '👑 Der König persönlich bestellt Reitausrüstung!', qualMulti: 1.0, geldMulti: 2.5 },
    { text: '🪡 Dein Sattelgurt hält besonders fest! Höchste Qualität.', qualMulti: 1.6, geldMulti: 1.2 },
    { text: '🪳 Mottenbefall im Leder! Schnelle Rettung nötig!', qualMulti: 0.6, geldMulti: 0.8 },
    { text: '🔮 Magische Energie durchströmt das Leder beim Nähen!', qualMulti: 1.7, geldMulti: 1.5 }
];

const cooldowns = new Map();

function ensureSattlerTable(db) {
    db.db.exec(`CREATE TABLE IF NOT EXISTS sattler (
        user_id TEXT PRIMARY KEY,
        leder TEXT DEFAULT '[]',
        verzierungen TEXT DEFAULT '[]',
        level INTEGER DEFAULT 1,
        xp INTEGER DEFAULT 0,
        produkte_gefertigt INTEGER DEFAULT 0,
        beste_qualitaet TEXT DEFAULT '',
        gesamtverdienst INTEGER DEFAULT 0,
        werkbank INTEGER DEFAULT 0,
        ahle INTEGER DEFAULT 0,
        sattelbaum INTEGER DEFAULT 0,
        werkstatt INTEGER DEFAULT 0,
        naehkunst INTEGER DEFAULT 0,
        lederpflege INTEGER DEFAULT 0,
        passform INTEGER DEFAULT 0,
        ausdauer INTEGER DEFAULT 0,
        trainings INTEGER DEFAULT 0,
        duelle_gewonnen INTEGER DEFAULT 0,
        duelle_verloren INTEGER DEFAULT 0,
        letztes_satteln INTEGER DEFAULT 0,
        letztes_training INTEGER DEFAULT 0
    )`);
    db.db.exec(`CREATE TABLE IF NOT EXISTS sattler_lager (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        produkt_typ TEXT,
        leder TEXT,
        verzierung TEXT,
        qualitaet TEXT,
        wert INTEGER,
        erstellt_am INTEGER DEFAULT 0
    )`);
}

function getSattler(db, uId) {
    const row = db.db.prepare('SELECT * FROM sattler WHERE user_id = ?').get(uId);
    if (!row) {
        db.db.prepare('INSERT INTO sattler (user_id) VALUES (?)').run(uId);
        return db.db.prepare('SELECT * FROM sattler WHERE user_id = ?').get(uId);
    }
    return row;
}

function xpForLevel(l) { return l * l * 53; }

function checkLevelUp(db, uId, s) {
    let lvl = s.level;
    let xp = s.xp;
    let ups = 0;
    while (xp >= xpForLevel(lvl)) {
        xp -= xpForLevel(lvl);
        lvl++;
        ups++;
    }
    if (ups > 0) {
        db.db.prepare('UPDATE sattler SET level = ?, xp = ? WHERE user_id = ?').run(lvl, xp, uId);
    }
    return { lvl, ups };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sattler')
        .setDescription('🐴 Sattlerei - Fertige Sättel und Geschirre aus feinstem Leder!')
        .addSubcommand(s => s.setName('start').setDescription('Beginne deine Sattler-Karriere'))
        .addSubcommand(s => s.setName('status').setDescription('Zeige deinen Sattler-Status'))
        .addSubcommand(s => s.setName('leder').setDescription('Zeige verfügbare Leder'))
        .addSubcommand(s => s.setName('kaufen').setDescription('Kaufe neues Leder')
            .addStringOption(o => o.setName('leder').setDescription('Name des Leders').setRequired(true)))
        .addSubcommand(s => s.setName('fertigen').setDescription('Fertige einen Sattel oder Geschirr')
            .addStringOption(o => o.setName('produkt').setDescription('Produkttyp').setRequired(true))
            .addStringOption(o => o.setName('leder').setDescription('Lederart').setRequired(true))
            .addStringOption(o => o.setName('verzierung').setDescription('Verzierungsstil').setRequired(true)))
        .addSubcommand(s => s.setName('training').setDescription('Trainiere deine Sattler-Fähigkeiten')
            .addStringOption(o => o.setName('typ').setDescription('Trainingstyp (naehkunst/lederpflege/passform/ausdauer)').setRequired(true)))
        .addSubcommand(s => s.setName('upgrade').setDescription('Verbessere deine Ausrüstung')
            .addStringOption(o => o.setName('item').setDescription('Ausrüstung (werkbank/ahle/sattelbaum/werkstatt)').setRequired(true)))
        .addSubcommand(s => s.setName('lager').setDescription('Zeige dein Sattlerlager'))
        .addSubcommand(s => s.setName('auftrag').setDescription('Nimm einen Sattlerauftrag an'))
        .addSubcommand(s => s.setName('duell').setDescription('Fordere einen anderen Sattler heraus')
            .addUserOption(o => o.setName('gegner').setDescription('Dein Gegner').setRequired(true))),

    async execute(interaction) {
        const db = interaction.client.db;
        const config = require('../config.json');
        ensureSattlerTable(db);
        const uId = interaction.user.id;
        const sub = interaction.options.getSubcommand();

        if (sub === 'start') {
            const existing = db.db.prepare('SELECT * FROM sattler WHERE user_id = ?').get(uId);
            if (existing && existing.leder !== '[]') {
                return interaction.reply({ content: '❌ Du bist bereits ein Sattler!', ephemeral: true });
            }
            db.db.prepare('INSERT OR REPLACE INTO sattler (user_id, leder, verzierungen) VALUES (?, ?, ?)').run(
                uId, JSON.stringify([LEDER[0].name]), JSON.stringify([VERZIERUNGEN[0].name])
            );

            const embed = new EmbedBuilder()
                .setTitle('🐴 Willkommen in der Sattlerei!')
                .setDescription(`Du erhältst **${LEDER[0].name}** ${LEDER[0].emoji} und lernst die **${VERZIERUNGEN[0].name}**e Verzierung!`)
                .addFields(
                    { name: '🐄 Leder', value: LEDER[0].name, inline: true },
                    { name: '🎨 Verzierung', value: VERZIERUNGEN[0].name, inline: true },
                    { name: '💡 Nächster Schritt', value: 'Nutze `/sattler fertigen` um deinen ersten Sattel zu fertigen!' }
                )
                .setColor(0x8B4513);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'status') {
            const s = getSattler(db, uId);
            if (s.leder === '[]') return interaction.reply({ content: '❌ Nutze `/sattler start` um zu beginnen!', ephemeral: true });
            const leder = JSON.parse(s.leder);
            const verzierungen = JSON.parse(s.verzierungen);
            const xpNeeded = xpForLevel(s.level);

            const embed = new EmbedBuilder()
                .setTitle(`🐴 Sattler ${interaction.user.username}`)
                .addFields(
                    { name: '📊 Level', value: `${s.level} (${s.xp}/${xpNeeded} XP)`, inline: true },
                    { name: '🪡 Gefertigt', value: `${s.produkte_gefertigt} Produkte`, inline: true },
                    { name: '💰 Verdienst', value: `${s.gesamtverdienst} Münzen`, inline: true },
                    { name: '🏆 Beste Qualität', value: s.beste_qualitaet || 'Keine', inline: true },
                    { name: '🪵 Werkbank', value: `Stufe ${s.werkbank}`, inline: true },
                    { name: '🪡 Ahle', value: `Stufe ${s.ahle}`, inline: true },
                    { name: '🪵 Sattelbaum', value: `Stufe ${s.sattelbaum}`, inline: true },
                    { name: '🏠 Sattlerei', value: `Stufe ${s.werkstatt}`, inline: true },
                    { name: '🐄 Leder', value: `${leder.length}`, inline: true },
                    { name: '🎨 Verzierungen', value: `${verzierungen.length}`, inline: true },
                    { name: '🏆 Duelle', value: `${s.duelle_gewonnen}W / ${s.duelle_verloren}L`, inline: true }
                )
                .setColor(0x8B4513);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'leder') {
            const s = getSattler(db, uId);
            const besitz = s.leder !== '[]' ? JSON.parse(s.leder) : [];
            const lines = LEDER.map(l => {
                const owned = besitz.includes(l.name) ? ' ✅' : '';
                return `${l.emoji} **${l.name}** - ${l.preis > 0 ? `${l.preis} Münzen` : 'Starter'} | Qualität: x${l.qualitaet}${owned}`;
            });
            const embed = new EmbedBuilder()
                .setTitle('🐄 Verfügbare Leder')
                .setDescription(lines.join('\n'))
                .setColor(0x8B4513);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'kaufen') {
            const s = getSattler(db, uId);
            if (s.leder === '[]') return interaction.reply({ content: '❌ Nutze `/sattler start` um zu beginnen!', ephemeral: true });

            const lederName = interaction.options.getString('leder');
            const leder = LEDER.find(l => l.name.toLowerCase() === lederName.toLowerCase());
            if (!leder) return interaction.reply({ content: '❌ Unbekanntes Leder!', ephemeral: true });

            const besitz = JSON.parse(s.leder);
            if (besitz.includes(leder.name)) return interaction.reply({ content: '❌ Du besitzt dieses Leder bereits!', ephemeral: true });

            const user = db.getUser(uId);
            if (user.balance < leder.preis) return interaction.reply({ content: `❌ Du brauchst ${leder.preis} Münzen! (Hast: ${user.balance})`, ephemeral: true });

            db.updateBalance(uId, -leder.preis);
            besitz.push(leder.name);
            db.db.prepare('UPDATE sattler SET leder = ? WHERE user_id = ?').run(JSON.stringify(besitz), uId);

            const embed = new EmbedBuilder()
                .setTitle('🐄 Neues Leder!')
                .setDescription(`Du hast **${leder.name}** ${leder.emoji} für **${leder.preis} Münzen** erworben!`)
                .addFields({ name: '📊 Qualitätsbonus', value: `x${leder.qualitaet}`, inline: true })
                .setColor(0x00FF00);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'fertigen') {
            const s = getSattler(db, uId);
            if (s.leder === '[]') return interaction.reply({ content: '❌ Nutze `/sattler start` um zu beginnen!', ephemeral: true });

            const cdKey = `sattler_${uId}`;
            const cdTime = cooldowns.get(cdKey);
            if (cdTime && Date.now() - cdTime < 55000) {
                const rest = Math.ceil((55000 - (Date.now() - cdTime)) / 1000);
                return interaction.reply({ content: `⏳ Der Sattel muss noch trocknen! Warte noch ${rest}s.`, ephemeral: true });
            }

            const produktName = interaction.options.getString('produkt');
            const lederName = interaction.options.getString('leder');
            const verzierungName = interaction.options.getString('verzierung');

            const produkt = PRODUKTE.find(p => p.name.toLowerCase() === produktName.toLowerCase());
            if (!produkt) return interaction.reply({ content: `❌ Unbekanntes Produkt! Verfügbar: ${PRODUKTE.map(p => p.name).join(', ')}`, ephemeral: true });
            if (s.level < produkt.minLevel) return interaction.reply({ content: `❌ Du brauchst Level ${produkt.minLevel} für ${produkt.name}!`, ephemeral: true });

            const leder = LEDER.find(l => l.name.toLowerCase() === lederName.toLowerCase());
            if (!leder) return interaction.reply({ content: '❌ Unbekanntes Leder!', ephemeral: true });
            const besitz = JSON.parse(s.leder);
            if (!besitz.includes(leder.name)) return interaction.reply({ content: '❌ Du besitzt dieses Leder nicht!', ephemeral: true });

            const verzierung = VERZIERUNGEN.find(v => v.name.toLowerCase() === verzierungName.toLowerCase());
            if (!verzierung) return interaction.reply({ content: `❌ Unbekannte Verzierung! Verfügbar: ${VERZIERUNGEN.map(v => v.name).join(', ')}`, ephemeral: true });

            const verzierungen = JSON.parse(s.verzierungen);
            if (!verzierungen.includes(verzierung.name)) {
                if (s.level < verzierung.minLevel) return interaction.reply({ content: `❌ Du brauchst Level ${verzierung.minLevel} für ${verzierung.name}!`, ephemeral: true });
                verzierungen.push(verzierung.name);
                db.db.prepare('UPDATE sattler SET verzierungen = ? WHERE user_id = ?').run(JSON.stringify(verzierungen), uId);
            }

            cooldowns.set(cdKey, Date.now());

            const werkbankBonus = UPGRADES.werkbank.bonus[s.werkbank];
            const ahleBonus = UPGRADES.ahle.bonus[s.ahle];
            const sattelbaumBonus = UPGRADES.sattelbaum.bonus[s.sattelbaum];
            const naehBonus = s.naehkunst * 0.02;
            const pflegeBonus = s.lederpflege * 0.018;

            let qualRoll = Math.random() * 100;
            qualRoll += (werkbankBonus + ahleBonus + sattelbaumBonus + naehBonus + pflegeBonus) * 28;
            qualRoll *= leder.qualitaet * verzierung.bonus / produkt.schwierigkeit;

            let event = null;
            if (Math.random() < 0.2) {
                event = SATTEL_EVENTS[Math.floor(Math.random() * SATTEL_EVENTS.length)];
                qualRoll *= event.qualMulti;
            }

            qualRoll = Math.min(100, qualRoll);
            let qualitaet = QUALITAETEN[0];
            for (const q of QUALITAETEN) {
                if (qualRoll >= q.minRoll) qualitaet = q;
            }

            let wert = Math.floor(produkt.basisWert * qualitaet.multi * leder.qualitaet * verzierung.bonus * (1 + sattelbaumBonus));
            if (event) wert = Math.floor(wert * event.geldMulti);

            db.updateBalance(uId, wert);
            const xpGain = 14 + Math.floor(produkt.schwierigkeit * 5) + Math.floor(wert / 50);

            db.db.prepare('INSERT INTO sattler_lager (user_id, produkt_typ, leder, verzierung, qualitaet, wert, erstellt_am) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
                uId, produkt.name, leder.name, verzierung.name, qualitaet.name, wert, Date.now()
            );

            const besteQ = QUALITAETEN.indexOf(qualitaet) > QUALITAETEN.findIndex(q => q.name === s.beste_qualitaet) ? qualitaet.name : (s.beste_qualitaet || qualitaet.name);
            db.db.prepare('UPDATE sattler SET produkte_gefertigt = produkte_gefertigt + 1, gesamtverdienst = gesamtverdienst + ?, xp = xp + ?, beste_qualitaet = ?, letztes_satteln = ? WHERE user_id = ?').run(
                wert, xpGain, besteQ, Date.now(), uId
            );

            const updatedS = getSattler(db, uId);
            const levelUp = checkLevelUp(db, uId, updatedS);

            const embed = new EmbedBuilder()
                .setTitle(`🐴 ${produkt.name} gefertigt!`)
                .setDescription(`Du hast einen **${qualitaet.name}en** ${produkt.name} aus **${leder.name}** ${leder.emoji} mit **${verzierung.name}er** Verzierung gefertigt!`)
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
            const s = getSattler(db, uId);
            if (s.leder === '[]') return interaction.reply({ content: '❌ Nutze `/sattler start` um zu beginnen!', ephemeral: true });

            const cdKey = `sattler_train_${uId}`;
            const cdTime = cooldowns.get(cdKey);
            if (cdTime && Date.now() - cdTime < 60000) {
                const rest = Math.ceil((60000 - (Date.now() - cdTime)) / 1000);
                return interaction.reply({ content: `⏳ Deine Finger sind noch wund! Warte noch ${rest}s.`, ephemeral: true });
            }

            const typ = interaction.options.getString('typ').toLowerCase();
            const validTypes = ['naehkunst', 'lederpflege', 'passform', 'ausdauer'];
            if (!validTypes.includes(typ)) return interaction.reply({ content: `❌ Unbekanntes Training! Verfügbar: ${validTypes.join(', ')}`, ephemeral: true });

            cooldowns.set(cdKey, Date.now());
            const xpGain = 12 + Math.floor(s.level * 2);
            const newVal = s[typ] + 1;

            db.db.prepare(`UPDATE sattler SET ${typ} = ?, trainings = trainings + 1, xp = xp + ?, letztes_training = ? WHERE user_id = ?`).run(
                newVal, xpGain, Date.now(), uId
            );

            const updatedS = getSattler(db, uId);
            const levelUp = checkLevelUp(db, uId, updatedS);

            const embed = new EmbedBuilder()
                .setTitle(`🎓 ${typ.charAt(0).toUpperCase() + typ.slice(1)}-Training`)
                .setDescription(`Du hast deine **${typ}** verbessert!`)
                .addFields(
                    { name: '📈 Fortschritt', value: `${s[typ]} → ${newVal}`, inline: true },
                    { name: '⭐ XP', value: `+${xpGain}`, inline: true }
                )
                .setColor(0x4169E1);

            if (levelUp.ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${levelUp.lvl}!` });

            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'upgrade') {
            const s = getSattler(db, uId);
            if (s.leder === '[]') return interaction.reply({ content: '❌ Nutze `/sattler start` um zu beginnen!', ephemeral: true });

            const item = interaction.options.getString('item').toLowerCase();
            const upg = UPGRADES[item];
            if (!upg) return interaction.reply({ content: `❌ Unbekanntes Upgrade! Verfügbar: ${Object.keys(UPGRADES).join(', ')}`, ephemeral: true });

            const currentLvl = s[item];
            if (currentLvl >= 4) return interaction.reply({ content: `❌ ${upg.name} ist bereits auf Maximum (Stufe 4)!`, ephemeral: true });

            const kosten = upg.stufen[currentLvl + 1];
            const user = db.getUser(uId);
            if (user.balance < kosten) return interaction.reply({ content: `❌ Du brauchst ${kosten} Münzen! (Hast: ${user.balance})`, ephemeral: true });

            db.updateBalance(uId, -kosten);
            db.db.prepare(`UPDATE sattler SET ${item} = ? WHERE user_id = ?`).run(currentLvl + 1, uId);

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

        if (sub === 'lager') {
            const s = getSattler(db, uId);
            if (s.leder === '[]') return interaction.reply({ content: '❌ Nutze `/sattler start` um zu beginnen!', ephemeral: true });

            const werke = db.db.prepare('SELECT * FROM sattler_lager WHERE user_id = ? ORDER BY wert DESC LIMIT 10').all(uId);

            if (werke.length === 0) {
                return interaction.reply({ content: '🐴 Dein Lager ist noch leer. Fertige deinen ersten Sattel!', ephemeral: true });
            }

            const total = db.db.prepare('SELECT COUNT(*) as cnt, SUM(wert) as total FROM sattler_lager WHERE user_id = ?').get(uId);
            const lines = werke.map((w, i) => `${i + 1}. **${w.produkt_typ}** (${w.leder}/${w.verzierung}) - ${w.qualitaet} - ${w.wert} Münzen`);

            const embed = new EmbedBuilder()
                .setTitle('🐴 Sattlerlager')
                .setDescription(lines.join('\n'))
                .addFields(
                    { name: '📊 Gesamt', value: `${total.cnt} Produkte`, inline: true },
                    { name: '💰 Gesamtwert', value: `${total.total} Münzen`, inline: true }
                )
                .setColor(0x8B4513);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'auftrag') {
            const s = getSattler(db, uId);
            if (s.leder === '[]') return interaction.reply({ content: '❌ Nutze `/sattler start` um zu beginnen!', ephemeral: true });

            const cdKey = `sattler_auftrag_${uId}`;
            const cdTime = cooldowns.get(cdKey);
            if (cdTime && Date.now() - cdTime < 120000) {
                const rest = Math.ceil((120000 - (Date.now() - cdTime)) / 1000);
                return interaction.reply({ content: `⏳ Kein neuer Auftrag verfügbar! Warte noch ${rest}s.`, ephemeral: true });
            }

            cooldowns.set(cdKey, Date.now());
            const auftraege = [
                { kunde: 'Bauer', produkt: 'Kummet', belohnung: 250 + s.level * 40 },
                { kunde: 'Reiter', produkt: 'Reitsattel', belohnung: 400 + s.level * 60 },
                { kunde: 'Händler', produkt: 'Halfter', belohnung: 300 + s.level * 45 },
                { kunde: 'Ritter', produkt: 'Turniersattel', belohnung: 750 + s.level * 100 },
                { kunde: 'General', produkt: 'Kriegssattel', belohnung: 1600 + s.level * 170 },
                { kunde: 'Drachenreiter', produkt: 'Drachensattel', belohnung: 3500 + s.level * 280 }
            ];

            const auftrag = auftraege[Math.floor(Math.random() * Math.min(auftraege.length, 2 + Math.floor(s.level / 2)))];
            const qualBonus = 1.0 + s.naehkunst * 0.03 + s.passform * 0.025;
            const verdienst = Math.floor(auftrag.belohnung * qualBonus);

            db.updateBalance(uId, verdienst);
            const xpGain = 18 + Math.floor(verdienst / 30);
            db.db.prepare('UPDATE sattler SET produkte_gefertigt = produkte_gefertigt + 1, gesamtverdienst = gesamtverdienst + ?, xp = xp + ? WHERE user_id = ?').run(verdienst, xpGain, uId);

            const updatedS = getSattler(db, uId);
            const levelUp = checkLevelUp(db, uId, updatedS);

            const embed = new EmbedBuilder()
                .setTitle('📋 Sattlerauftrag abgeschlossen!')
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
            const s = getSattler(db, uId);
            if (s.leder === '[]') return interaction.reply({ content: '❌ Nutze `/sattler start` um zu beginnen!', ephemeral: true });
            if (s.level < 3) return interaction.reply({ content: '❌ Du brauchst Level 3 für Duelle!', ephemeral: true });

            const gegner = interaction.options.getUser('gegner');
            if (gegner.id === uId) return interaction.reply({ content: '❌ Du kannst dich nicht selbst herausfordern!', ephemeral: true });
            if (gegner.bot) return interaction.reply({ content: '❌ Du kannst keinen Bot herausfordern!', ephemeral: true });

            const gg = db.db.prepare('SELECT * FROM sattler WHERE user_id = ?').get(gegner.id);
            if (!gg || gg.leder === '[]') return interaction.reply({ content: '❌ Dein Gegner ist kein Sattler!', ephemeral: true });

            const scoreA = (s.level * 10) + (s.naehkunst * 5) + (s.passform * 4) + (s.werkbank * 8) + (s.ahle * 6) + (s.sattelbaum * 7) + Math.random() * 40;
            const scoreB = (gg.level * 10) + (gg.naehkunst * 5) + (gg.passform * 4) + (gg.werkbank * 8) + (gg.ahle * 6) + (gg.sattelbaum * 7) + Math.random() * 40;

            const gewonnen = scoreA > scoreB;
            const preis = Math.floor(200 + s.level * 50 + gg.level * 50);

            if (gewonnen) {
                db.updateBalance(uId, preis);
                db.db.prepare('UPDATE sattler SET duelle_gewonnen = duelle_gewonnen + 1 WHERE user_id = ?').run(uId);
                db.db.prepare('UPDATE sattler SET duelle_verloren = duelle_verloren + 1 WHERE user_id = ?').run(gegner.id);
            } else {
                db.updateBalance(gegner.id, preis);
                db.db.prepare('UPDATE sattler SET duelle_verloren = duelle_verloren + 1 WHERE user_id = ?').run(uId);
                db.db.prepare('UPDATE sattler SET duelle_gewonnen = duelle_gewonnen + 1 WHERE user_id = ?').run(gegner.id);
            }

            const embed = new EmbedBuilder()
                .setTitle('🏆 Sattler-Duell')
                .setDescription(`🐴 **${interaction.user.username}** vs 🐴 **${gegner.username}**`)
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
