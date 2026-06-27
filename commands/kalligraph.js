const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const TINTEN = [
    { name: 'Rußtinte', preis: 0, qualitaet: 1.0, farbe: '⬛' },
    { name: 'Eisengallustinte', preis: 1500, qualitaet: 1.2, farbe: '🟫' },
    { name: 'Sepiatinte', preis: 3500, qualitaet: 1.4, farbe: '🟤' },
    { name: 'Zinnobertinte', preis: 7000, qualitaet: 1.6, farbe: '🟥' },
    { name: 'Lapislazuli-Tinte', preis: 15000, qualitaet: 1.9, farbe: '🟦' },
    { name: 'Goldtinte', preis: 30000, qualitaet: 2.3, farbe: '🟡' },
    { name: 'Silbermond-Tinte', preis: 55000, qualitaet: 2.8, farbe: '⬜' },
    { name: 'Sternenstaub-Tinte', preis: 100000, qualitaet: 3.5, farbe: '✨' }
];

const SCHRIFTEN = [
    { name: 'Kursiv', minLevel: 1, schwierigkeit: 1, schoenheit: 1.0 },
    { name: 'Unziale', minLevel: 2, schwierigkeit: 2, schoenheit: 1.3 },
    { name: 'Fraktur', minLevel: 3, schwierigkeit: 3, schoenheit: 1.5 },
    { name: 'Gotische Textura', minLevel: 5, schwierigkeit: 4, schoenheit: 1.8 },
    { name: 'Karolingische Minuskel', minLevel: 7, schwierigkeit: 5, schoenheit: 2.1 },
    { name: 'Nastaliq', minLevel: 9, schwierigkeit: 6, schoenheit: 2.5 },
    { name: 'Kaiserschrift', minLevel: 12, schwierigkeit: 7, schoenheit: 3.0 },
    { name: 'Himmlische Glyphen', minLevel: 15, schwierigkeit: 8, schoenheit: 4.0 }
];

const WERK_TYPEN = [
    { name: 'Brief', schriften: 1, tinten: 1, basisWert: 50, zeit: 'kurz' },
    { name: 'Gedicht', schriften: 1, tinten: 1, basisWert: 120, zeit: 'kurz' },
    { name: 'Urkunde', schriften: 2, tinten: 1, basisWert: 250, zeit: 'mittel' },
    { name: 'Buchseite', schriften: 2, tinten: 2, basisWert: 400, zeit: 'mittel' },
    { name: 'Manuskript', schriften: 3, tinten: 2, basisWert: 800, zeit: 'lang' },
    { name: 'Illumination', schriften: 3, tinten: 3, basisWert: 1500, zeit: 'lang' },
    { name: 'Heilige Schriftrolle', schriften: 4, tinten: 3, basisWert: 3000, zeit: 'sehr lang' },
    { name: 'Codex Aureus', schriften: 5, tinten: 4, basisWert: 6000, zeit: 'meisterwerk' }
];

const QUALITAETEN = [
    { name: 'Verwischt', multi: 0.3, minRoll: 0 },
    { name: 'Leserlich', multi: 0.6, minRoll: 15 },
    { name: 'Ordentlich', multi: 0.8, minRoll: 30 },
    { name: 'Schön', multi: 1.0, minRoll: 45 },
    { name: 'Prachtvoll', multi: 1.5, minRoll: 65 },
    { name: 'Meisterhaft', multi: 2.0, minRoll: 80 },
    { name: 'Göttlich', multi: 3.0, minRoll: 95 }
];

const UPGRADES = {
    feder: { name: 'Schreibfeder', stufen: [0, 1500, 5000, 15000, 40000], bonus: [0, 0.1, 0.2, 0.35, 0.5] },
    pult: { name: 'Schreibpult', stufen: [0, 2000, 6000, 18000, 45000], bonus: [0, 0.08, 0.18, 0.3, 0.45] },
    papier: { name: 'Pergamentqualität', stufen: [0, 2500, 7000, 20000, 50000], bonus: [0, 0.1, 0.2, 0.35, 0.55] },
    atelier: { name: 'Schreibstube', stufen: [0, 3000, 9000, 25000, 60000], bonus: [0, 1, 2, 3, 5] }
};

const SCHREIB_EVENTS = [
    { text: '✨ Göttliche Inspiration! Die Buchstaben fließen wie Musik aufs Pergament.', qualMulti: 1.5, geldMulti: 1.0 },
    { text: '💧 Ein Tintenfleck! Du musst vorsichtig weiterschreiben.', qualMulti: 0.6, geldMulti: 1.0 },
    { text: '🕯️ Das Kerzenlicht tanzt perfekt - ideale Schreibbedingungen!', qualMulti: 1.3, geldMulti: 1.2 },
    { text: '📜 Du entdeckst eine alte Technik in einem vergessenen Buch!', qualMulti: 1.4, geldMulti: 1.0 },
    { text: '👑 Ein Adliger sieht dein Werk und ist begeistert!', qualMulti: 1.0, geldMulti: 2.0 },
    { text: '🌙 Mondlicht fällt auf dein Pergament und die Tinte schimmert magisch!', qualMulti: 1.8, geldMulti: 1.5 },
    { text: '💨 Ein Windstoß weht durch die Stube!', qualMulti: 0.7, geldMulti: 0.8 }
];

const cooldowns = new Map();

function ensureKalligraphTable(db) {
    db.db.exec(`CREATE TABLE IF NOT EXISTS kalligraphen (
        user_id TEXT PRIMARY KEY,
        tinten TEXT DEFAULT '[]',
        schriften TEXT DEFAULT '[]',
        level INTEGER DEFAULT 1,
        xp INTEGER DEFAULT 0,
        werke_geschrieben INTEGER DEFAULT 0,
        beste_qualitaet TEXT DEFAULT '',
        gesamtverdienst INTEGER DEFAULT 0,
        feder INTEGER DEFAULT 0,
        pult INTEGER DEFAULT 0,
        papier INTEGER DEFAULT 0,
        atelier INTEGER DEFAULT 0,
        praezision INTEGER DEFAULT 0,
        kreativitaet INTEGER DEFAULT 0,
        ausdauer INTEGER DEFAULT 0,
        tintenkenntnis INTEGER DEFAULT 0,
        trainings INTEGER DEFAULT 0,
        duelle_gewonnen INTEGER DEFAULT 0,
        duelle_verloren INTEGER DEFAULT 0,
        letztes_werk INTEGER DEFAULT 0,
        letztes_training INTEGER DEFAULT 0
    )`);
    db.db.exec(`CREATE TABLE IF NOT EXISTS kalligraph_werke (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        werk_typ TEXT,
        schrift TEXT,
        tinte TEXT,
        qualitaet TEXT,
        wert INTEGER,
        erstellt_am INTEGER DEFAULT 0
    )`);
}

function getKalligraph(db, uId) {
    const row = db.db.prepare('SELECT * FROM kalligraphen WHERE user_id = ?').get(uId);
    if (!row) {
        db.db.prepare('INSERT INTO kalligraphen (user_id) VALUES (?)').run(uId);
        return db.db.prepare('SELECT * FROM kalligraphen WHERE user_id = ?').get(uId);
    }
    return row;
}

function xpForLevel(l) { return l * l * 55; }

function checkLevelUp(db, uId, k) {
    let lvl = k.level;
    let xp = k.xp;
    let ups = 0;
    while (xp >= xpForLevel(lvl)) {
        xp -= xpForLevel(lvl);
        lvl++;
        ups++;
    }
    if (ups > 0) {
        db.db.prepare('UPDATE kalligraphen SET level = ?, xp = ? WHERE user_id = ?').run(lvl, xp, uId);
    }
    return { lvl, ups };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kalligraph')
        .setDescription('✒️ Kalligraphie - Meistere die Kunst der schönen Schrift!')
        .addSubcommand(s => s.setName('start').setDescription('Beginne deine Kalligraphie-Karriere'))
        .addSubcommand(s => s.setName('status').setDescription('Zeige deinen Kalligraphen-Status'))
        .addSubcommand(s => s.setName('tinten').setDescription('Zeige verfügbare Tinten'))
        .addSubcommand(s => s.setName('kaufen').setDescription('Kaufe eine neue Tinte')
            .addStringOption(o => o.setName('tinte').setDescription('Name der Tinte').setRequired(true)))
        .addSubcommand(s => s.setName('schreiben').setDescription('Erstelle ein kalligraphisches Werk')
            .addStringOption(o => o.setName('werk').setDescription('Werktyp').setRequired(true))
            .addStringOption(o => o.setName('schrift').setDescription('Schriftart').setRequired(true))
            .addStringOption(o => o.setName('tinte').setDescription('Tintenart').setRequired(true)))
        .addSubcommand(s => s.setName('training').setDescription('Trainiere deine Kalligraphie-Fähigkeiten')
            .addStringOption(o => o.setName('typ').setDescription('Trainingstyp (praezision/kreativitaet/ausdauer/tintenkenntnis)').setRequired(true)))
        .addSubcommand(s => s.setName('upgrade').setDescription('Verbessere deine Ausrüstung')
            .addStringOption(o => o.setName('item').setDescription('Ausrüstung (feder/pult/papier/atelier)').setRequired(true)))
        .addSubcommand(s => s.setName('galerie').setDescription('Zeige deine besten Werke'))
        .addSubcommand(s => s.setName('auftrag').setDescription('Nimm einen Schreibauftrag an'))
        .addSubcommand(s => s.setName('duell').setDescription('Fordere einen anderen Kalligraphen heraus')
            .addUserOption(o => o.setName('gegner').setDescription('Dein Gegner').setRequired(true))),

    async execute(interaction) {
        const db = interaction.client.db;
        const config = require('../config.json');
        ensureKalligraphTable(db);
        const uId = interaction.user.id;
        const sub = interaction.options.getSubcommand();

        if (sub === 'start') {
            const existing = db.db.prepare('SELECT * FROM kalligraphen WHERE user_id = ?').get(uId);
            if (existing && existing.tinten !== '[]') {
                return interaction.reply({ content: '❌ Du bist bereits ein Kalligraph!', ephemeral: true });
            }
            const starterTinte = TINTEN[0];
            const starterSchrift = SCHRIFTEN[0];
            db.db.prepare('INSERT OR REPLACE INTO kalligraphen (user_id, tinten, schriften) VALUES (?, ?, ?)').run(
                uId, JSON.stringify([starterTinte.name]), JSON.stringify([starterSchrift.name])
            );

            const embed = new EmbedBuilder()
                .setTitle('✒️ Willkommen in der Kalligraphie!')
                .setDescription(`Du erhältst **${starterTinte.name}** ${starterTinte.farbe} und lernst die **${starterSchrift.name}**-Schrift!`)
                .addFields(
                    { name: '🖊️ Tinte', value: starterTinte.name, inline: true },
                    { name: '📝 Schrift', value: starterSchrift.name, inline: true },
                    { name: '💡 Nächster Schritt', value: 'Nutze `/kalligraph schreiben` um dein erstes Werk zu erstellen!' }
                )
                .setColor(0x4B0082);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'status') {
            const k = getKalligraph(db, uId);
            if (k.tinten === '[]') return interaction.reply({ content: '❌ Nutze `/kalligraph start` um zu beginnen!', ephemeral: true });
            const tinten = JSON.parse(k.tinten);
            const schriften = JSON.parse(k.schriften);
            const xpNeeded = xpForLevel(k.level);

            const embed = new EmbedBuilder()
                .setTitle(`✒️ Kalligraph ${interaction.user.username}`)
                .addFields(
                    { name: '📊 Level', value: `${k.level} (${k.xp}/${xpNeeded} XP)`, inline: true },
                    { name: '📜 Werke', value: `${k.werke_geschrieben}`, inline: true },
                    { name: '💰 Gesamtverdienst', value: `${k.gesamtverdienst} Münzen`, inline: true },
                    { name: '🏆 Beste Qualität', value: k.beste_qualitaet || 'Keine', inline: true },
                    { name: '🖊️ Feder', value: `Stufe ${k.feder}`, inline: true },
                    { name: '📐 Pult', value: `Stufe ${k.pult}`, inline: true },
                    { name: '📄 Pergament', value: `Stufe ${k.papier}`, inline: true },
                    { name: '🏠 Schreibstube', value: `Stufe ${k.atelier}`, inline: true },
                    { name: '🎯 Tinten', value: `${tinten.length} Sorten`, inline: true },
                    { name: '✍️ Schriften', value: `${schriften.length} Stile`, inline: true },
                    { name: '🏆 Duelle', value: `${k.duelle_gewonnen}W / ${k.duelle_verloren}L`, inline: true }
                )
                .setColor(0x4B0082);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'tinten') {
            const k = getKalligraph(db, uId);
            const besitz = k.tinten !== '[]' ? JSON.parse(k.tinten) : [];
            const lines = TINTEN.map(t => {
                const owned = besitz.includes(t.name) ? ' ✅' : '';
                return `${t.farbe} **${t.name}** - ${t.preis > 0 ? `${t.preis} Münzen` : 'Starter'} | Qualität: x${t.qualitaet}${owned}`;
            });
            const embed = new EmbedBuilder()
                .setTitle('🖊️ Verfügbare Tinten')
                .setDescription(lines.join('\n'))
                .setColor(0x4B0082);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'kaufen') {
            const k = getKalligraph(db, uId);
            if (k.tinten === '[]') return interaction.reply({ content: '❌ Nutze `/kalligraph start` um zu beginnen!', ephemeral: true });

            const tinteName = interaction.options.getString('tinte');
            const tinte = TINTEN.find(t => t.name.toLowerCase() === tinteName.toLowerCase());
            if (!tinte) return interaction.reply({ content: '❌ Unbekannte Tinte!', ephemeral: true });

            const tinten = JSON.parse(k.tinten);
            if (tinten.includes(tinte.name)) return interaction.reply({ content: '❌ Du besitzt diese Tinte bereits!', ephemeral: true });

            const user = db.getUser(uId);
            if (user.balance < tinte.preis) return interaction.reply({ content: `❌ Du brauchst ${tinte.preis} Münzen! (Hast: ${user.balance})`, ephemeral: true });

            db.updateBalance(uId, -tinte.preis);
            tinten.push(tinte.name);
            db.db.prepare('UPDATE kalligraphen SET tinten = ? WHERE user_id = ?').run(JSON.stringify(tinten), uId);

            const embed = new EmbedBuilder()
                .setTitle('🖊️ Neue Tinte!')
                .setDescription(`Du hast **${tinte.name}** ${tinte.farbe} für **${tinte.preis} Münzen** erworben!`)
                .addFields({ name: '📊 Qualitätsbonus', value: `x${tinte.qualitaet}`, inline: true })
                .setColor(0x00FF00);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'schreiben') {
            const k = getKalligraph(db, uId);
            if (k.tinten === '[]') return interaction.reply({ content: '❌ Nutze `/kalligraph start` um zu beginnen!', ephemeral: true });

            const cdKey = `kalligraph_${uId}`;
            const cdTime = cooldowns.get(cdKey);
            if (cdTime && Date.now() - cdTime < 50000) {
                const rest = Math.ceil((50000 - (Date.now() - cdTime)) / 1000);
                return interaction.reply({ content: `⏳ Deine Tinte trocknet noch! Warte noch ${rest}s.`, ephemeral: true });
            }

            const werkName = interaction.options.getString('werk');
            const schriftName = interaction.options.getString('schrift');
            const tinteName = interaction.options.getString('tinte');

            const werk = WERK_TYPEN.find(w => w.name.toLowerCase() === werkName.toLowerCase());
            if (!werk) return interaction.reply({ content: `❌ Unbekannter Werktyp! Verfügbar: ${WERK_TYPEN.map(w => w.name).join(', ')}`, ephemeral: true });

            const schrift = SCHRIFTEN.find(s => s.name.toLowerCase() === schriftName.toLowerCase());
            if (!schrift) return interaction.reply({ content: `❌ Unbekannte Schrift! Verfügbar: ${SCHRIFTEN.map(s => s.name).join(', ')}`, ephemeral: true });

            const schriften = JSON.parse(k.schriften);
            if (!schriften.includes(schrift.name)) {
                if (k.level < schrift.minLevel) return interaction.reply({ content: `❌ Du brauchst Level ${schrift.minLevel} für ${schrift.name}!`, ephemeral: true });
                schriften.push(schrift.name);
                db.db.prepare('UPDATE kalligraphen SET schriften = ? WHERE user_id = ?').run(JSON.stringify(schriften), uId);
            }

            const tinten = JSON.parse(k.tinten);
            const tinte = TINTEN.find(t => t.name.toLowerCase() === tinteName.toLowerCase());
            if (!tinte) return interaction.reply({ content: '❌ Unbekannte Tinte!', ephemeral: true });
            if (!tinten.includes(tinte.name)) return interaction.reply({ content: '❌ Du besitzt diese Tinte nicht!', ephemeral: true });

            cooldowns.set(cdKey, Date.now());

            const federBonus = UPGRADES.feder.bonus[k.feder];
            const pultBonus = UPGRADES.pult.bonus[k.pult];
            const papierBonus = UPGRADES.papier.bonus[k.papier];
            const praezisionBonus = k.praezision * 0.02;
            const kreativBonus = k.kreativitaet * 0.015;

            let qualRoll = Math.random() * 100;
            qualRoll += (federBonus + pultBonus + papierBonus + praezisionBonus + kreativBonus) * 30;
            qualRoll *= tinte.qualitaet * schrift.schoenheit / schrift.schwierigkeit;

            let event = null;
            if (Math.random() < 0.2) {
                event = SCHREIB_EVENTS[Math.floor(Math.random() * SCHREIB_EVENTS.length)];
                qualRoll *= event.qualMulti;
            }

            qualRoll = Math.min(100, qualRoll);
            let qualitaet = QUALITAETEN[0];
            for (const q of QUALITAETEN) {
                if (qualRoll >= q.minRoll) qualitaet = q;
            }

            let wert = Math.floor(werk.basisWert * qualitaet.multi * tinte.qualitaet * schrift.schoenheit * (1 + papierBonus));
            if (event) wert = Math.floor(wert * event.geldMulti);

            db.updateBalance(uId, wert);
            const xpGain = 15 + Math.floor(schrift.schwierigkeit * 5) + Math.floor(wert / 50);

            db.db.prepare('INSERT INTO kalligraph_werke (user_id, werk_typ, schrift, tinte, qualitaet, wert, erstellt_am) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
                uId, werk.name, schrift.name, tinte.name, qualitaet.name, wert, Date.now()
            );

            const besteQ = QUALITAETEN.indexOf(qualitaet) > QUALITAETEN.findIndex(q => q.name === k.beste_qualitaet) ? qualitaet.name : (k.beste_qualitaet || qualitaet.name);
            db.db.prepare('UPDATE kalligraphen SET werke_geschrieben = werke_geschrieben + 1, gesamtverdienst = gesamtverdienst + ?, xp = xp + ?, beste_qualitaet = ?, letztes_werk = ? WHERE user_id = ?').run(
                wert, xpGain, besteQ, Date.now(), uId
            );

            const updatedK = getKalligraph(db, uId);
            const levelUp = checkLevelUp(db, uId, updatedK);

            const embed = new EmbedBuilder()
                .setTitle(`✒️ ${werk.name} geschrieben!`)
                .setDescription(`Du hast ein **${qualitaet.name}es** ${werk.name} in **${schrift.name}** mit **${tinte.name}** ${tinte.farbe} erstellt!`)
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
            const k = getKalligraph(db, uId);
            if (k.tinten === '[]') return interaction.reply({ content: '❌ Nutze `/kalligraph start` um zu beginnen!', ephemeral: true });

            const cdKey = `kalligraph_train_${uId}`;
            const cdTime = cooldowns.get(cdKey);
            if (cdTime && Date.now() - cdTime < 60000) {
                const rest = Math.ceil((60000 - (Date.now() - cdTime)) / 1000);
                return interaction.reply({ content: `⏳ Deine Hand braucht Ruhe! Warte noch ${rest}s.`, ephemeral: true });
            }

            const typ = interaction.options.getString('typ').toLowerCase();
            const validTypes = ['praezision', 'kreativitaet', 'ausdauer', 'tintenkenntnis'];
            if (!validTypes.includes(typ)) return interaction.reply({ content: `❌ Unbekanntes Training! Verfügbar: ${validTypes.join(', ')}`, ephemeral: true });

            cooldowns.set(cdKey, Date.now());
            const xpGain = 12 + Math.floor(k.level * 2);
            const newVal = k[typ] + 1;

            db.db.prepare(`UPDATE kalligraphen SET ${typ} = ?, trainings = trainings + 1, xp = xp + ?, letztes_training = ? WHERE user_id = ?`).run(
                newVal, xpGain, Date.now(), uId
            );

            const updatedK = getKalligraph(db, uId);
            const levelUp = checkLevelUp(db, uId, updatedK);

            const embed = new EmbedBuilder()
                .setTitle(`🎓 ${typ.charAt(0).toUpperCase() + typ.slice(1)}-Training`)
                .setDescription(`Du hast deine **${typ}** verbessert!`)
                .addFields(
                    { name: '📈 Fortschritt', value: `${k[typ]} → ${newVal}`, inline: true },
                    { name: '⭐ XP', value: `+${xpGain}`, inline: true }
                )
                .setColor(0x4169E1);

            if (levelUp.ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${levelUp.lvl}!` });

            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'upgrade') {
            const k = getKalligraph(db, uId);
            if (k.tinten === '[]') return interaction.reply({ content: '❌ Nutze `/kalligraph start` um zu beginnen!', ephemeral: true });

            const item = interaction.options.getString('item').toLowerCase();
            const upg = UPGRADES[item];
            if (!upg) return interaction.reply({ content: `❌ Unbekanntes Upgrade! Verfügbar: ${Object.keys(UPGRADES).join(', ')}`, ephemeral: true });

            const currentLvl = k[item];
            if (currentLvl >= 4) return interaction.reply({ content: `❌ ${upg.name} ist bereits auf Maximum (Stufe 4)!`, ephemeral: true });

            const kosten = upg.stufen[currentLvl + 1];
            const user = db.getUser(uId);
            if (user.balance < kosten) return interaction.reply({ content: `❌ Du brauchst ${kosten} Münzen! (Hast: ${user.balance})`, ephemeral: true });

            db.updateBalance(uId, -kosten);
            db.db.prepare(`UPDATE kalligraphen SET ${item} = ? WHERE user_id = ?`).run(currentLvl + 1, uId);

            const embed = new EmbedBuilder()
                .setTitle(`⬆️ ${upg.name} verbessert!`)
                .setDescription(`Stufe ${currentLvl} → **Stufe ${currentLvl + 1}**`)
                .addFields(
                    { name: '💰 Kosten', value: `${kosten} Münzen`, inline: true },
                    { name: '📊 Bonus', value: item === 'atelier' ? `+${upg.bonus[currentLvl + 1]} Werkplätze` : `+${(upg.bonus[currentLvl + 1] * 100).toFixed(0)}%`, inline: true }
                )
                .setColor(0xFFD700);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'galerie') {
            const k = getKalligraph(db, uId);
            if (k.tinten === '[]') return interaction.reply({ content: '❌ Nutze `/kalligraph start` um zu beginnen!', ephemeral: true });

            const werke = db.db.prepare('SELECT * FROM kalligraph_werke WHERE user_id = ? ORDER BY wert DESC LIMIT 10').all(uId);

            if (werke.length === 0) {
                return interaction.reply({ content: '📜 Deine Galerie ist noch leer. Schreibe dein erstes Werk!', ephemeral: true });
            }

            const total = db.db.prepare('SELECT COUNT(*) as cnt, SUM(wert) as total FROM kalligraph_werke WHERE user_id = ?').get(uId);
            const lines = werke.map((w, i) => `${i + 1}. **${w.werk_typ}** (${w.schrift}/${w.tinte}) - ${w.qualitaet} - ${w.wert} Münzen`);

            const embed = new EmbedBuilder()
                .setTitle('🖼️ Kalligraphie-Galerie')
                .setDescription(lines.join('\n'))
                .addFields(
                    { name: '📊 Gesamt', value: `${total.cnt} Werke`, inline: true },
                    { name: '💰 Gesamtwert', value: `${total.total} Münzen`, inline: true }
                )
                .setColor(0x4B0082);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'auftrag') {
            const k = getKalligraph(db, uId);
            if (k.tinten === '[]') return interaction.reply({ content: '❌ Nutze `/kalligraph start` um zu beginnen!', ephemeral: true });

            const cdKey = `kalligraph_auftrag_${uId}`;
            const cdTime = cooldowns.get(cdKey);
            if (cdTime && Date.now() - cdTime < 120000) {
                const rest = Math.ceil((120000 - (Date.now() - cdTime)) / 1000);
                return interaction.reply({ content: `⏳ Kein neuer Auftrag verfügbar! Warte noch ${rest}s.`, ephemeral: true });
            }

            cooldowns.set(cdKey, Date.now());
            const auftraege = [
                { kunde: 'Bürgermeister', werk: 'Urkunde', belohnung: 300 + k.level * 50 },
                { kunde: 'Kloster', werk: 'Buchseite', belohnung: 500 + k.level * 80 },
                { kunde: 'Adeliger', werk: 'Gedicht', belohnung: 250 + k.level * 40 },
                { kunde: 'Universität', werk: 'Manuskript', belohnung: 800 + k.level * 100 },
                { kunde: 'König', werk: 'Illumination', belohnung: 1500 + k.level * 150 },
                { kunde: 'Tempel', werk: 'Heilige Schriftrolle', belohnung: 2000 + k.level * 200 }
            ];

            const auftrag = auftraege[Math.floor(Math.random() * Math.min(auftraege.length, 2 + Math.floor(k.level / 2)))];
            const qualBonus = 1.0 + k.praezision * 0.03 + k.kreativitaet * 0.02;
            const verdienst = Math.floor(auftrag.belohnung * qualBonus);

            db.updateBalance(uId, verdienst);
            const xpGain = 20 + Math.floor(verdienst / 30);
            db.db.prepare('UPDATE kalligraphen SET werke_geschrieben = werke_geschrieben + 1, gesamtverdienst = gesamtverdienst + ?, xp = xp + ? WHERE user_id = ?').run(verdienst, xpGain, uId);

            const updatedK = getKalligraph(db, uId);
            const levelUp = checkLevelUp(db, uId, updatedK);

            const embed = new EmbedBuilder()
                .setTitle('📋 Schreibauftrag abgeschlossen!')
                .setDescription(`Der **${auftrag.kunde}** hat dich beauftragt, ein **${auftrag.werk}** zu schreiben.`)
                .addFields(
                    { name: '💰 Belohnung', value: `${verdienst} Münzen`, inline: true },
                    { name: '⭐ XP', value: `+${xpGain}`, inline: true }
                )
                .setColor(0x00FF00);

            if (levelUp.ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${levelUp.lvl}!` });

            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'duell') {
            const k = getKalligraph(db, uId);
            if (k.tinten === '[]') return interaction.reply({ content: '❌ Nutze `/kalligraph start` um zu beginnen!', ephemeral: true });
            if (k.level < 3) return interaction.reply({ content: '❌ Du brauchst Level 3 für Duelle!', ephemeral: true });

            const gegner = interaction.options.getUser('gegner');
            if (gegner.id === uId) return interaction.reply({ content: '❌ Du kannst dich nicht selbst herausfordern!', ephemeral: true });
            if (gegner.bot) return interaction.reply({ content: '❌ Du kannst keinen Bot herausfordern!', ephemeral: true });

            const g = db.db.prepare('SELECT * FROM kalligraphen WHERE user_id = ?').get(gegner.id);
            if (!g || g.tinten === '[]') return interaction.reply({ content: '❌ Dein Gegner ist kein Kalligraph!', ephemeral: true });

            const scoreA = (k.level * 10) + (k.praezision * 5) + (k.kreativitaet * 4) + (k.feder * 8) + (k.pult * 6) + Math.random() * 40;
            const scoreB = (g.level * 10) + (g.praezision * 5) + (g.kreativitaet * 4) + (g.feder * 8) + (g.pult * 6) + Math.random() * 40;

            const gewonnen = scoreA > scoreB;
            const preis = Math.floor(200 + k.level * 50 + g.level * 50);

            if (gewonnen) {
                db.updateBalance(uId, preis);
                db.db.prepare('UPDATE kalligraphen SET duelle_gewonnen = duelle_gewonnen + 1 WHERE user_id = ?').run(uId);
                db.db.prepare('UPDATE kalligraphen SET duelle_verloren = duelle_verloren + 1 WHERE user_id = ?').run(gegner.id);
            } else {
                db.updateBalance(gegner.id, preis);
                db.db.prepare('UPDATE kalligraphen SET duelle_verloren = duelle_verloren + 1 WHERE user_id = ?').run(uId);
                db.db.prepare('UPDATE kalligraphen SET duelle_gewonnen = duelle_gewonnen + 1 WHERE user_id = ?').run(gegner.id);
            }

            const embed = new EmbedBuilder()
                .setTitle('🏆 Kalligraphie-Duell')
                .setDescription(`✒️ **${interaction.user.username}** vs ✒️ **${gegner.username}**`)
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
