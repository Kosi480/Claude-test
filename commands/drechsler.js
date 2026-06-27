const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const HOELZER = [
    { name: 'Fichtenholz', preis: 0, qualitaet: 1.0, emoji: '🌲' },
    { name: 'Buchenholz', preis: 1200, qualitaet: 1.2, emoji: '🌳' },
    { name: 'Eichenholz', preis: 3500, qualitaet: 1.4, emoji: '🪵' },
    { name: 'Nussbaumholz', preis: 8000, qualitaet: 1.7, emoji: '🥜' },
    { name: 'Kirschholz', preis: 16000, qualitaet: 2.0, emoji: '🍒' },
    { name: 'Ebenholz', preis: 33000, qualitaet: 2.5, emoji: '⬛' },
    { name: 'Mondholz', preis: 62000, qualitaet: 3.1, emoji: '🌙' },
    { name: 'Weltenbaum', preis: 115000, qualitaet: 3.9, emoji: '✨' }
];

const WERKSTUECKE = [
    { name: 'Schale', basisWert: 50, schwierigkeit: 1, minLevel: 1 },
    { name: 'Becher', basisWert: 90, schwierigkeit: 1, minLevel: 1 },
    { name: 'Kerzenständer', basisWert: 200, schwierigkeit: 2, minLevel: 2 },
    { name: 'Dose', basisWert: 380, schwierigkeit: 3, minLevel: 4 },
    { name: 'Pokal', basisWert: 700, schwierigkeit: 4, minLevel: 6 },
    { name: 'Schachfigur', basisWert: 1300, schwierigkeit: 5, minLevel: 8 },
    { name: 'Säulenvase', basisWert: 2600, schwierigkeit: 7, minLevel: 11 },
    { name: 'Meisterkugel', basisWert: 5200, schwierigkeit: 9, minLevel: 14 }
];

const TECHNIKEN = [
    { name: 'Langholzdrehen', bonus: 1.0, minLevel: 1 },
    { name: 'Querholzdrehen', bonus: 1.15, minLevel: 2 },
    { name: 'Ausdrehen', bonus: 1.3, minLevel: 3 },
    { name: 'Plandrehen', bonus: 1.45, minLevel: 5 },
    { name: 'Ovaldrehen', bonus: 1.65, minLevel: 7 },
    { name: 'Segmentdrehen', bonus: 1.9, minLevel: 9 },
    { name: 'Spiraldrehen', bonus: 2.3, minLevel: 12 },
    { name: 'Ätherdrehen', bonus: 2.8, minLevel: 15 }
];

const QUALITAETEN = [
    { name: 'Rissig', multi: 0.3, minRoll: 0 },
    { name: 'Grob', multi: 0.5, minRoll: 12 },
    { name: 'Brauchbar', multi: 0.8, minRoll: 26 },
    { name: 'Glatt', multi: 1.0, minRoll: 42 },
    { name: 'Poliert', multi: 1.5, minRoll: 58 },
    { name: 'Kunstvoll', multi: 2.2, minRoll: 76 },
    { name: 'Meisterhaft', multi: 3.5, minRoll: 93 }
];

const UPGRADES = {
    drehbank: { name: 'Drehbank', stufen: [0, 1500, 5000, 15000, 40000], bonus: [0, 0.1, 0.2, 0.35, 0.5] },
    meissel: { name: 'Drehmeissel', stufen: [0, 2000, 6000, 18000, 45000], bonus: [0, 0.08, 0.18, 0.3, 0.45] },
    schleifer: { name: 'Feinschleifer', stufen: [0, 2500, 7000, 20000, 52000], bonus: [0, 0.1, 0.22, 0.36, 0.52] },
    werkstatt: { name: 'Drechslerei', stufen: [0, 3000, 9000, 25000, 60000], bonus: [0, 1, 2, 3, 5] }
};

const DREH_EVENTS = [
    { text: '✨ Perfekte Drehung! Das Holz formt sich wie Butter.', qualMulti: 1.5, geldMulti: 1.0 },
    { text: '💥 Ein Ast im Holz! Der Meissel springt.', qualMulti: 0.5, geldMulti: 1.0 },
    { text: '🌳 Wunderschöne Maserung kommt zum Vorschein!', qualMulti: 1.6, geldMulti: 1.4 },
    { text: '👑 Ein Sammler bietet sofort den doppelten Preis!', qualMulti: 1.0, geldMulti: 2.5 },
    { text: '🪵 Das Holz singt beim Drehen - perfekte Resonanz!', qualMulti: 1.4, geldMulti: 1.3 },
    { text: '💨 Das Holz splittert am Rand!', qualMulti: 0.6, geldMulti: 0.9 },
    { text: '🌟 Goldene Jahresringe bilden ein magisches Muster!', qualMulti: 1.7, geldMulti: 1.8 }
];

const cooldowns = new Map();

function ensureDrechslerTable(db) {
    db.db.exec(`CREATE TABLE IF NOT EXISTS drechsler (
        user_id TEXT PRIMARY KEY,
        hoelzer TEXT DEFAULT '[]',
        techniken TEXT DEFAULT '[]',
        level INTEGER DEFAULT 1,
        xp INTEGER DEFAULT 0,
        werke_gedreht INTEGER DEFAULT 0,
        beste_qualitaet TEXT DEFAULT '',
        gesamtverdienst INTEGER DEFAULT 0,
        drehbank INTEGER DEFAULT 0,
        meissel INTEGER DEFAULT 0,
        schleifer INTEGER DEFAULT 0,
        werkstatt INTEGER DEFAULT 0,
        drehtechnik INTEGER DEFAULT 0,
        holzkunde INTEGER DEFAULT 0,
        formgefuehl INTEGER DEFAULT 0,
        geduld INTEGER DEFAULT 0,
        trainings INTEGER DEFAULT 0,
        duelle_gewonnen INTEGER DEFAULT 0,
        duelle_verloren INTEGER DEFAULT 0,
        letztes_drehen INTEGER DEFAULT 0,
        letztes_training INTEGER DEFAULT 0
    )`);
    db.db.exec(`CREATE TABLE IF NOT EXISTS drechsler_vitrine (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        werk_typ TEXT,
        holz TEXT,
        technik TEXT,
        qualitaet TEXT,
        wert INTEGER,
        erstellt_am INTEGER DEFAULT 0
    )`);
}

function getDrechsler(db, uId) {
    const row = db.db.prepare('SELECT * FROM drechsler WHERE user_id = ?').get(uId);
    if (!row) {
        db.db.prepare('INSERT INTO drechsler (user_id) VALUES (?)').run(uId);
        return db.db.prepare('SELECT * FROM drechsler WHERE user_id = ?').get(uId);
    }
    return row;
}

function xpForLevel(l) { return l * l * 48; }

function checkLevelUp(db, uId, d) {
    let lvl = d.level;
    let xp = d.xp;
    let ups = 0;
    while (xp >= xpForLevel(lvl)) {
        xp -= xpForLevel(lvl);
        lvl++;
        ups++;
    }
    if (ups > 0) {
        db.db.prepare('UPDATE drechsler SET level = ?, xp = ? WHERE user_id = ?').run(lvl, xp, uId);
    }
    return { lvl, ups };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('drechsler')
        .setDescription('🪵 Drechslerei - Drehe edle Hölzer zu kunstvollen Werkstücken!')
        .addSubcommand(s => s.setName('start').setDescription('Beginne deine Drechsler-Karriere'))
        .addSubcommand(s => s.setName('status').setDescription('Zeige deinen Drechsler-Status'))
        .addSubcommand(s => s.setName('hoelzer').setDescription('Zeige verfügbare Holzarten'))
        .addSubcommand(s => s.setName('kaufen').setDescription('Kaufe eine neue Holzart')
            .addStringOption(o => o.setName('holz').setDescription('Name des Holzes').setRequired(true)))
        .addSubcommand(s => s.setName('drehen').setDescription('Drehe ein neues Werkstück')
            .addStringOption(o => o.setName('werk').setDescription('Werkstücktyp').setRequired(true))
            .addStringOption(o => o.setName('holz').setDescription('Holzart').setRequired(true))
            .addStringOption(o => o.setName('technik').setDescription('Drehtechnik').setRequired(true)))
        .addSubcommand(s => s.setName('training').setDescription('Trainiere deine Drechsler-Fähigkeiten')
            .addStringOption(o => o.setName('typ').setDescription('Trainingstyp (drehtechnik/holzkunde/formgefuehl/geduld)').setRequired(true)))
        .addSubcommand(s => s.setName('upgrade').setDescription('Verbessere deine Ausrüstung')
            .addStringOption(o => o.setName('item').setDescription('Ausrüstung (drehbank/meissel/schleifer/werkstatt)').setRequired(true)))
        .addSubcommand(s => s.setName('vitrine').setDescription('Zeige deine Werkstück-Vitrine'))
        .addSubcommand(s => s.setName('auftrag').setDescription('Nimm einen Drechslerauftrag an'))
        .addSubcommand(s => s.setName('duell').setDescription('Fordere einen anderen Drechsler heraus')
            .addUserOption(o => o.setName('gegner').setDescription('Dein Gegner').setRequired(true))),

    async execute(interaction) {
        const db = interaction.client.db;
        const config = require('../config.json');
        ensureDrechslerTable(db);
        const uId = interaction.user.id;
        const sub = interaction.options.getSubcommand();

        if (sub === 'start') {
            const existing = db.db.prepare('SELECT * FROM drechsler WHERE user_id = ?').get(uId);
            if (existing && existing.hoelzer !== '[]') {
                return interaction.reply({ content: '❌ Du bist bereits ein Drechsler!', ephemeral: true });
            }
            db.db.prepare('INSERT OR REPLACE INTO drechsler (user_id, hoelzer, techniken) VALUES (?, ?, ?)').run(
                uId, JSON.stringify([HOELZER[0].name]), JSON.stringify([TECHNIKEN[0].name])
            );

            const embed = new EmbedBuilder()
                .setTitle('🪵 Willkommen in der Drechslerei!')
                .setDescription(`Du erhältst **${HOELZER[0].name}** ${HOELZER[0].emoji} und lernst das **${TECHNIKEN[0].name}**!`)
                .addFields(
                    { name: '🌲 Holz', value: HOELZER[0].name, inline: true },
                    { name: '🔄 Technik', value: TECHNIKEN[0].name, inline: true },
                    { name: '💡 Nächster Schritt', value: 'Nutze `/drechsler drehen` um dein erstes Werkstück zu drehen!' }
                )
                .setColor(0xDEB887);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'status') {
            const d = getDrechsler(db, uId);
            if (d.hoelzer === '[]') return interaction.reply({ content: '❌ Nutze `/drechsler start` um zu beginnen!', ephemeral: true });
            const hoelzer = JSON.parse(d.hoelzer);
            const techniken = JSON.parse(d.techniken);
            const xpNeeded = xpForLevel(d.level);

            const embed = new EmbedBuilder()
                .setTitle(`🪵 Drechsler ${interaction.user.username}`)
                .addFields(
                    { name: '📊 Level', value: `${d.level} (${d.xp}/${xpNeeded} XP)`, inline: true },
                    { name: '🔄 Gedreht', value: `${d.werke_gedreht} Stück`, inline: true },
                    { name: '💰 Verdienst', value: `${d.gesamtverdienst} Münzen`, inline: true },
                    { name: '🏆 Beste Qualität', value: d.beste_qualitaet || 'Keine', inline: true },
                    { name: '⚙️ Drehbank', value: `Stufe ${d.drehbank}`, inline: true },
                    { name: '🔧 Meissel', value: `Stufe ${d.meissel}`, inline: true },
                    { name: '📏 Schleifer', value: `Stufe ${d.schleifer}`, inline: true },
                    { name: '🏠 Werkstatt', value: `Stufe ${d.werkstatt}`, inline: true },
                    { name: '🌲 Hölzer', value: `${hoelzer.length}`, inline: true },
                    { name: '🔄 Techniken', value: `${techniken.length}`, inline: true },
                    { name: '🏆 Duelle', value: `${d.duelle_gewonnen}W / ${d.duelle_verloren}L`, inline: true }
                )
                .setColor(0xDEB887);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'hoelzer') {
            const d = getDrechsler(db, uId);
            const besitz = d.hoelzer !== '[]' ? JSON.parse(d.hoelzer) : [];
            const lines = HOELZER.map(h => {
                const owned = besitz.includes(h.name) ? ' ✅' : '';
                return `${h.emoji} **${h.name}** - ${h.preis > 0 ? `${h.preis} Münzen` : 'Starter'} | Qualität: x${h.qualitaet}${owned}`;
            });
            const embed = new EmbedBuilder()
                .setTitle('🌲 Verfügbare Holzarten')
                .setDescription(lines.join('\n'))
                .setColor(0xDEB887);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'kaufen') {
            const d = getDrechsler(db, uId);
            if (d.hoelzer === '[]') return interaction.reply({ content: '❌ Nutze `/drechsler start` um zu beginnen!', ephemeral: true });

            const holzName = interaction.options.getString('holz');
            const holz = HOELZER.find(h => h.name.toLowerCase() === holzName.toLowerCase());
            if (!holz) return interaction.reply({ content: '❌ Unbekannte Holzart!', ephemeral: true });

            const hoelzer = JSON.parse(d.hoelzer);
            if (hoelzer.includes(holz.name)) return interaction.reply({ content: '❌ Du besitzt dieses Holz bereits!', ephemeral: true });

            const user = db.getUser(uId);
            if (user.balance < holz.preis) return interaction.reply({ content: `❌ Du brauchst ${holz.preis} Münzen! (Hast: ${user.balance})`, ephemeral: true });

            db.updateBalance(uId, -holz.preis);
            hoelzer.push(holz.name);
            db.db.prepare('UPDATE drechsler SET hoelzer = ? WHERE user_id = ?').run(JSON.stringify(hoelzer), uId);

            const embed = new EmbedBuilder()
                .setTitle('🌲 Neue Holzart!')
                .setDescription(`Du hast **${holz.name}** ${holz.emoji} für **${holz.preis} Münzen** erworben!`)
                .addFields({ name: '📊 Qualitätsbonus', value: `x${holz.qualitaet}`, inline: true })
                .setColor(0x00FF00);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'drehen') {
            const d = getDrechsler(db, uId);
            if (d.hoelzer === '[]') return interaction.reply({ content: '❌ Nutze `/drechsler start` um zu beginnen!', ephemeral: true });

            const cdKey = `drechsler_${uId}`;
            const cdTime = cooldowns.get(cdKey);
            if (cdTime && Date.now() - cdTime < 45000) {
                const rest = Math.ceil((45000 - (Date.now() - cdTime)) / 1000);
                return interaction.reply({ content: `⏳ Die Drehbank dreht noch! Warte noch ${rest}s.`, ephemeral: true });
            }

            const werkName = interaction.options.getString('werk');
            const holzName = interaction.options.getString('holz');
            const technikName = interaction.options.getString('technik');

            const werk = WERKSTUECKE.find(w => w.name.toLowerCase() === werkName.toLowerCase());
            if (!werk) return interaction.reply({ content: `❌ Unbekanntes Werkstück! Verfügbar: ${WERKSTUECKE.map(w => w.name).join(', ')}`, ephemeral: true });
            if (d.level < werk.minLevel) return interaction.reply({ content: `❌ Du brauchst Level ${werk.minLevel} für ${werk.name}!`, ephemeral: true });

            const holz = HOELZER.find(h => h.name.toLowerCase() === holzName.toLowerCase());
            if (!holz) return interaction.reply({ content: '❌ Unbekannte Holzart!', ephemeral: true });
            const hoelzer = JSON.parse(d.hoelzer);
            if (!hoelzer.includes(holz.name)) return interaction.reply({ content: '❌ Du besitzt dieses Holz nicht!', ephemeral: true });

            const technik = TECHNIKEN.find(t => t.name.toLowerCase() === technikName.toLowerCase());
            if (!technik) return interaction.reply({ content: `❌ Unbekannte Technik! Verfügbar: ${TECHNIKEN.map(t => t.name).join(', ')}`, ephemeral: true });

            const techniken = JSON.parse(d.techniken);
            if (!techniken.includes(technik.name)) {
                if (d.level < technik.minLevel) return interaction.reply({ content: `❌ Du brauchst Level ${technik.minLevel} für ${technik.name}!`, ephemeral: true });
                techniken.push(technik.name);
                db.db.prepare('UPDATE drechsler SET techniken = ? WHERE user_id = ?').run(JSON.stringify(techniken), uId);
            }

            cooldowns.set(cdKey, Date.now());

            const drehbankBonus = UPGRADES.drehbank.bonus[d.drehbank];
            const meisselBonus = UPGRADES.meissel.bonus[d.meissel];
            const schleiferBonus = UPGRADES.schleifer.bonus[d.schleifer];
            const drehBonus = d.drehtechnik * 0.02;
            const formBonus = d.formgefuehl * 0.018;

            let qualRoll = Math.random() * 100;
            qualRoll += (drehbankBonus + meisselBonus + schleiferBonus + drehBonus + formBonus) * 28;
            qualRoll *= holz.qualitaet * technik.bonus / werk.schwierigkeit;

            let event = null;
            if (Math.random() < 0.2) {
                event = DREH_EVENTS[Math.floor(Math.random() * DREH_EVENTS.length)];
                qualRoll *= event.qualMulti;
            }

            qualRoll = Math.min(100, qualRoll);
            let qualitaet = QUALITAETEN[0];
            for (const q of QUALITAETEN) {
                if (qualRoll >= q.minRoll) qualitaet = q;
            }

            let wert = Math.floor(werk.basisWert * qualitaet.multi * holz.qualitaet * technik.bonus * (1 + schleiferBonus));
            if (event) wert = Math.floor(wert * event.geldMulti);

            db.updateBalance(uId, wert);
            const xpGain = 12 + Math.floor(werk.schwierigkeit * 5) + Math.floor(wert / 50);

            db.db.prepare('INSERT INTO drechsler_vitrine (user_id, werk_typ, holz, technik, qualitaet, wert, erstellt_am) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
                uId, werk.name, holz.name, technik.name, qualitaet.name, wert, Date.now()
            );

            const besteQ = QUALITAETEN.indexOf(qualitaet) > QUALITAETEN.findIndex(q => q.name === d.beste_qualitaet) ? qualitaet.name : (d.beste_qualitaet || qualitaet.name);
            db.db.prepare('UPDATE drechsler SET werke_gedreht = werke_gedreht + 1, gesamtverdienst = gesamtverdienst + ?, xp = xp + ?, beste_qualitaet = ?, letztes_drehen = ? WHERE user_id = ?').run(
                wert, xpGain, besteQ, Date.now(), uId
            );

            const updatedD = getDrechsler(db, uId);
            const levelUp = checkLevelUp(db, uId, updatedD);

            const embed = new EmbedBuilder()
                .setTitle(`🪵 ${werk.name} gedreht!`)
                .setDescription(`Du hast eine **${qualitaet.name}e** ${werk.name} aus **${holz.name}** ${holz.emoji} mit **${technik.name}** gedreht!`)
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
            const d = getDrechsler(db, uId);
            if (d.hoelzer === '[]') return interaction.reply({ content: '❌ Nutze `/drechsler start` um zu beginnen!', ephemeral: true });

            const cdKey = `drechsler_train_${uId}`;
            const cdTime = cooldowns.get(cdKey);
            if (cdTime && Date.now() - cdTime < 60000) {
                const rest = Math.ceil((60000 - (Date.now() - cdTime)) / 1000);
                return interaction.reply({ content: `⏳ Holzstaub in den Augen! Warte noch ${rest}s.`, ephemeral: true });
            }

            const typ = interaction.options.getString('typ').toLowerCase();
            const validTypes = ['drehtechnik', 'holzkunde', 'formgefuehl', 'geduld'];
            if (!validTypes.includes(typ)) return interaction.reply({ content: `❌ Unbekanntes Training! Verfügbar: ${validTypes.join(', ')}`, ephemeral: true });

            cooldowns.set(cdKey, Date.now());
            const xpGain = 12 + Math.floor(d.level * 2);
            const newVal = d[typ] + 1;

            db.db.prepare(`UPDATE drechsler SET ${typ} = ?, trainings = trainings + 1, xp = xp + ?, letztes_training = ? WHERE user_id = ?`).run(
                newVal, xpGain, Date.now(), uId
            );

            const updatedD = getDrechsler(db, uId);
            const levelUp = checkLevelUp(db, uId, updatedD);

            const embed = new EmbedBuilder()
                .setTitle(`🎓 ${typ.charAt(0).toUpperCase() + typ.slice(1)}-Training`)
                .setDescription(`Du hast dein **${typ}** verbessert!`)
                .addFields(
                    { name: '📈 Fortschritt', value: `${d[typ]} → ${newVal}`, inline: true },
                    { name: '⭐ XP', value: `+${xpGain}`, inline: true }
                )
                .setColor(0x4169E1);

            if (levelUp.ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${levelUp.lvl}!` });

            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'upgrade') {
            const d = getDrechsler(db, uId);
            if (d.hoelzer === '[]') return interaction.reply({ content: '❌ Nutze `/drechsler start` um zu beginnen!', ephemeral: true });

            const item = interaction.options.getString('item').toLowerCase();
            const upg = UPGRADES[item];
            if (!upg) return interaction.reply({ content: `❌ Unbekanntes Upgrade! Verfügbar: ${Object.keys(UPGRADES).join(', ')}`, ephemeral: true });

            const currentLvl = d[item];
            if (currentLvl >= 4) return interaction.reply({ content: `❌ ${upg.name} ist bereits auf Maximum (Stufe 4)!`, ephemeral: true });

            const kosten = upg.stufen[currentLvl + 1];
            const user = db.getUser(uId);
            if (user.balance < kosten) return interaction.reply({ content: `❌ Du brauchst ${kosten} Münzen! (Hast: ${user.balance})`, ephemeral: true });

            db.updateBalance(uId, -kosten);
            db.db.prepare(`UPDATE drechsler SET ${item} = ? WHERE user_id = ?`).run(currentLvl + 1, uId);

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

        if (sub === 'vitrine') {
            const d = getDrechsler(db, uId);
            if (d.hoelzer === '[]') return interaction.reply({ content: '❌ Nutze `/drechsler start` um zu beginnen!', ephemeral: true });

            const werke = db.db.prepare('SELECT * FROM drechsler_vitrine WHERE user_id = ? ORDER BY wert DESC LIMIT 10').all(uId);

            if (werke.length === 0) {
                return interaction.reply({ content: '🪵 Deine Vitrine ist noch leer. Drehe dein erstes Werkstück!', ephemeral: true });
            }

            const total = db.db.prepare('SELECT COUNT(*) as cnt, SUM(wert) as total FROM drechsler_vitrine WHERE user_id = ?').get(uId);
            const lines = werke.map((w, i) => `${i + 1}. **${w.werk_typ}** (${w.holz}/${w.technik}) - ${w.qualitaet} - ${w.wert} Münzen`);

            const embed = new EmbedBuilder()
                .setTitle('🪵 Werkstück-Vitrine')
                .setDescription(lines.join('\n'))
                .addFields(
                    { name: '📊 Gesamt', value: `${total.cnt} Werkstücke`, inline: true },
                    { name: '💰 Gesamtwert', value: `${total.total} Münzen`, inline: true }
                )
                .setColor(0xDEB887);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'auftrag') {
            const d = getDrechsler(db, uId);
            if (d.hoelzer === '[]') return interaction.reply({ content: '❌ Nutze `/drechsler start` um zu beginnen!', ephemeral: true });

            const cdKey = `drechsler_auftrag_${uId}`;
            const cdTime = cooldowns.get(cdKey);
            if (cdTime && Date.now() - cdTime < 120000) {
                const rest = Math.ceil((120000 - (Date.now() - cdTime)) / 1000);
                return interaction.reply({ content: `⏳ Kein neuer Auftrag verfügbar! Warte noch ${rest}s.`, ephemeral: true });
            }

            cooldowns.set(cdKey, Date.now());
            const auftraege = [
                { kunde: 'Gastwirt', werk: 'Becher', belohnung: 200 + d.level * 35 },
                { kunde: 'Hausfrau', werk: 'Schale', belohnung: 180 + d.level * 30 },
                { kunde: 'Kirche', werk: 'Kerzenständer', belohnung: 400 + d.level * 60 },
                { kunde: 'Adeliger', werk: 'Pokal', belohnung: 750 + d.level * 95 },
                { kunde: 'Schachclub', werk: 'Schachfigur', belohnung: 1200 + d.level * 140 },
                { kunde: 'Palast', werk: 'Säulenvase', belohnung: 2200 + d.level * 220 }
            ];

            const auftrag = auftraege[Math.floor(Math.random() * Math.min(auftraege.length, 2 + Math.floor(d.level / 2)))];
            const qualBonus = 1.0 + d.drehtechnik * 0.03 + d.formgefuehl * 0.025;
            const verdienst = Math.floor(auftrag.belohnung * qualBonus);

            db.updateBalance(uId, verdienst);
            const xpGain = 18 + Math.floor(verdienst / 30);
            db.db.prepare('UPDATE drechsler SET werke_gedreht = werke_gedreht + 1, gesamtverdienst = gesamtverdienst + ?, xp = xp + ? WHERE user_id = ?').run(verdienst, xpGain, uId);

            const updatedD = getDrechsler(db, uId);
            const levelUp = checkLevelUp(db, uId, updatedD);

            const embed = new EmbedBuilder()
                .setTitle('📋 Drechslerauftrag abgeschlossen!')
                .setDescription(`Der **${auftrag.kunde}** hat dich beauftragt, einen **${auftrag.werk}** zu drehen.`)
                .addFields(
                    { name: '💰 Belohnung', value: `${verdienst} Münzen`, inline: true },
                    { name: '⭐ XP', value: `+${xpGain}`, inline: true }
                )
                .setColor(0x00FF00);

            if (levelUp.ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${levelUp.lvl}!` });

            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'duell') {
            const d = getDrechsler(db, uId);
            if (d.hoelzer === '[]') return interaction.reply({ content: '❌ Nutze `/drechsler start` um zu beginnen!', ephemeral: true });
            if (d.level < 3) return interaction.reply({ content: '❌ Du brauchst Level 3 für Duelle!', ephemeral: true });

            const gegner = interaction.options.getUser('gegner');
            if (gegner.id === uId) return interaction.reply({ content: '❌ Du kannst dich nicht selbst herausfordern!', ephemeral: true });
            if (gegner.bot) return interaction.reply({ content: '❌ Du kannst keinen Bot herausfordern!', ephemeral: true });

            const g = db.db.prepare('SELECT * FROM drechsler WHERE user_id = ?').get(gegner.id);
            if (!g || g.hoelzer === '[]') return interaction.reply({ content: '❌ Dein Gegner ist kein Drechsler!', ephemeral: true });

            const scoreA = (d.level * 10) + (d.drehtechnik * 5) + (d.formgefuehl * 4) + (d.drehbank * 8) + (d.meissel * 7) + (d.schleifer * 6) + Math.random() * 40;
            const scoreB = (g.level * 10) + (g.drehtechnik * 5) + (g.formgefuehl * 4) + (g.drehbank * 8) + (g.meissel * 7) + (g.schleifer * 6) + Math.random() * 40;

            const gewonnen = scoreA > scoreB;
            const preis = Math.floor(200 + d.level * 50 + g.level * 50);

            if (gewonnen) {
                db.updateBalance(uId, preis);
                db.db.prepare('UPDATE drechsler SET duelle_gewonnen = duelle_gewonnen + 1 WHERE user_id = ?').run(uId);
                db.db.prepare('UPDATE drechsler SET duelle_verloren = duelle_verloren + 1 WHERE user_id = ?').run(gegner.id);
            } else {
                db.updateBalance(gegner.id, preis);
                db.db.prepare('UPDATE drechsler SET duelle_verloren = duelle_verloren + 1 WHERE user_id = ?').run(uId);
                db.db.prepare('UPDATE drechsler SET duelle_gewonnen = duelle_gewonnen + 1 WHERE user_id = ?').run(gegner.id);
            }

            const embed = new EmbedBuilder()
                .setTitle('🏆 Drechsler-Duell')
                .setDescription(`🪵 **${interaction.user.username}** vs 🪵 **${gegner.username}**`)
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
