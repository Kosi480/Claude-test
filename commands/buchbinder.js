const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const PAPIERE = [
    { name: 'Lumpenpaier', preis: 0, qualitaet: 1.0, emoji: '📄' },
    { name: 'Büttenpapier', preis: 1500, qualitaet: 1.2, emoji: '📃' },
    { name: 'Hadernpapier', preis: 3500, qualitaet: 1.4, emoji: '📜' },
    { name: 'Japanpapier', preis: 8000, qualitaet: 1.7, emoji: '🎋' },
    { name: 'Pergament', preis: 18000, qualitaet: 2.0, emoji: '📖' },
    { name: 'Vellum', preis: 35000, qualitaet: 2.5, emoji: '✨' },
    { name: 'Elfenbeinpapier', preis: 65000, qualitaet: 3.1, emoji: '🦢' },
    { name: 'Sternenblatt', preis: 115000, qualitaet: 3.9, emoji: '⭐' }
];

const EINBAENDE = [
    { name: 'Pappeinband', bonus: 1.0, minLevel: 1 },
    { name: 'Leineneinband', bonus: 1.15, minLevel: 2 },
    { name: 'Halbledereinband', bonus: 1.3, minLevel: 3 },
    { name: 'Ganzledereinband', bonus: 1.5, minLevel: 5 },
    { name: 'Maroquin', bonus: 1.75, minLevel: 7 },
    { name: 'Goldprägung', bonus: 2.0, minLevel: 9 },
    { name: 'Juweleneinband', bonus: 2.5, minLevel: 12 },
    { name: 'Drachenlederbund', bonus: 3.2, minLevel: 15 }
];

const BUCH_TYPEN = [
    { name: 'Notizbuch', basisWert: 50, schwierigkeit: 1, minLevel: 1 },
    { name: 'Tagebuch', basisWert: 100, schwierigkeit: 1, minLevel: 1 },
    { name: 'Gedichtband', basisWert: 220, schwierigkeit: 2, minLevel: 2 },
    { name: 'Roman', basisWert: 450, schwierigkeit: 3, minLevel: 4 },
    { name: 'Lexikon', basisWert: 800, schwierigkeit: 4, minLevel: 6 },
    { name: 'Bibel', basisWert: 1500, schwierigkeit: 6, minLevel: 8 },
    { name: 'Zauberbuch', basisWert: 3000, schwierigkeit: 7, minLevel: 11 },
    { name: 'Codex der Ewigkeit', basisWert: 6000, schwierigkeit: 9, minLevel: 14 }
];

const QUALITAETEN = [
    { name: 'Zerfleddert', multi: 0.3, minRoll: 0 },
    { name: 'Schief', multi: 0.5, minRoll: 12 },
    { name: 'Einfach', multi: 0.8, minRoll: 26 },
    { name: 'Sauber', multi: 1.0, minRoll: 42 },
    { name: 'Elegant', multi: 1.5, minRoll: 58 },
    { name: 'Prachtvoll', multi: 2.2, minRoll: 76 },
    { name: 'Meisterhaft', multi: 3.5, minRoll: 93 }
];

const UPGRADES = {
    presse: { name: 'Buchpresse', stufen: [0, 1500, 5000, 15000, 40000], bonus: [0, 0.1, 0.2, 0.35, 0.5] },
    falzbein: { name: 'Falzbein', stufen: [0, 2000, 6000, 18000, 45000], bonus: [0, 0.08, 0.18, 0.3, 0.45] },
    heftlade: { name: 'Heftlade', stufen: [0, 2500, 7000, 20000, 52000], bonus: [0, 0.1, 0.22, 0.36, 0.52] },
    werkstatt: { name: 'Buchbinderei', stufen: [0, 3000, 9000, 25000, 60000], bonus: [0, 1, 2, 3, 5] }
};

const BINDE_EVENTS = [
    { text: '✨ Perfekte Heftung! Jede Seite sitzt makellos.', qualMulti: 1.5, geldMulti: 1.0 },
    { text: '💧 Leimfleck auf dem Einband! Du kaschierst ihn geschickt.', qualMulti: 0.6, geldMulti: 1.0 },
    { text: '📚 Du findest ein altes Meisterwerk als Vorlage!', qualMulti: 1.4, geldMulti: 1.3 },
    { text: '👑 Ein Bibliophiler bietet sofort den doppelten Preis!', qualMulti: 1.0, geldMulti: 2.5 },
    { text: '🌟 Der Einband schimmert im Licht wie ein Juwel!', qualMulti: 1.6, geldMulti: 1.4 },
    { text: '✂️ Das Papier reißt beim Falzen! Vorsicht beim Reparieren.', qualMulti: 0.5, geldMulti: 0.9 },
    { text: '🔮 Magische Runen erscheinen zwischen den Seiten!', qualMulti: 1.3, geldMulti: 2.0 }
];

const cooldowns = new Map();

function ensureBuchbinderTable(db) {
    db.db.exec(`CREATE TABLE IF NOT EXISTS buchbinder (
        user_id TEXT PRIMARY KEY,
        papiere TEXT DEFAULT '[]',
        einbaende TEXT DEFAULT '[]',
        level INTEGER DEFAULT 1,
        xp INTEGER DEFAULT 0,
        buecher_gebunden INTEGER DEFAULT 0,
        beste_qualitaet TEXT DEFAULT '',
        gesamtverdienst INTEGER DEFAULT 0,
        presse INTEGER DEFAULT 0,
        falzbein INTEGER DEFAULT 0,
        heftlade INTEGER DEFAULT 0,
        werkstatt INTEGER DEFAULT 0,
        praezision INTEGER DEFAULT 0,
        hefttechnik INTEGER DEFAULT 0,
        vergoldung INTEGER DEFAULT 0,
        restauration INTEGER DEFAULT 0,
        trainings INTEGER DEFAULT 0,
        duelle_gewonnen INTEGER DEFAULT 0,
        duelle_verloren INTEGER DEFAULT 0,
        letztes_binden INTEGER DEFAULT 0,
        letztes_training INTEGER DEFAULT 0
    )`);
    db.db.exec(`CREATE TABLE IF NOT EXISTS buchbinder_regal (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        buch_typ TEXT,
        papier TEXT,
        einband TEXT,
        qualitaet TEXT,
        wert INTEGER,
        erstellt_am INTEGER DEFAULT 0
    )`);
}

function getBuchbinder(db, uId) {
    const row = db.db.prepare('SELECT * FROM buchbinder WHERE user_id = ?').get(uId);
    if (!row) {
        db.db.prepare('INSERT INTO buchbinder (user_id) VALUES (?)').run(uId);
        return db.db.prepare('SELECT * FROM buchbinder WHERE user_id = ?').get(uId);
    }
    return row;
}

function xpForLevel(l) { return l * l * 53; }

function checkLevelUp(db, uId, b) {
    let lvl = b.level;
    let xp = b.xp;
    let ups = 0;
    while (xp >= xpForLevel(lvl)) {
        xp -= xpForLevel(lvl);
        lvl++;
        ups++;
    }
    if (ups > 0) {
        db.db.prepare('UPDATE buchbinder SET level = ?, xp = ? WHERE user_id = ?').run(lvl, xp, uId);
    }
    return { lvl, ups };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('buchbinder')
        .setDescription('📚 Buchbinderei - Binde prächtige Bücher und Manuskripte!')
        .addSubcommand(s => s.setName('start').setDescription('Beginne deine Buchbinder-Karriere'))
        .addSubcommand(s => s.setName('status').setDescription('Zeige deinen Buchbinder-Status'))
        .addSubcommand(s => s.setName('papiere').setDescription('Zeige verfügbare Papiersorten'))
        .addSubcommand(s => s.setName('kaufen').setDescription('Kaufe eine neue Papiersorte')
            .addStringOption(o => o.setName('papier').setDescription('Name des Papiers').setRequired(true)))
        .addSubcommand(s => s.setName('binden').setDescription('Binde ein neues Buch')
            .addStringOption(o => o.setName('buch').setDescription('Buchtyp').setRequired(true))
            .addStringOption(o => o.setName('papier').setDescription('Papiersorte').setRequired(true))
            .addStringOption(o => o.setName('einband').setDescription('Einbandart').setRequired(true)))
        .addSubcommand(s => s.setName('training').setDescription('Trainiere deine Buchbinder-Fähigkeiten')
            .addStringOption(o => o.setName('typ').setDescription('Trainingstyp (praezision/hefttechnik/vergoldung/restauration)').setRequired(true)))
        .addSubcommand(s => s.setName('upgrade').setDescription('Verbessere deine Ausrüstung')
            .addStringOption(o => o.setName('item').setDescription('Ausrüstung (presse/falzbein/heftlade/werkstatt)').setRequired(true)))
        .addSubcommand(s => s.setName('regal').setDescription('Zeige dein Bücherregal'))
        .addSubcommand(s => s.setName('auftrag').setDescription('Nimm einen Buchbinder-Auftrag an'))
        .addSubcommand(s => s.setName('duell').setDescription('Fordere einen anderen Buchbinder heraus')
            .addUserOption(o => o.setName('gegner').setDescription('Dein Gegner').setRequired(true))),

    async execute(interaction) {
        const db = interaction.client.db;
        const config = require('../config.json');
        ensureBuchbinderTable(db);
        const uId = interaction.user.id;
        const sub = interaction.options.getSubcommand();

        if (sub === 'start') {
            const existing = db.db.prepare('SELECT * FROM buchbinder WHERE user_id = ?').get(uId);
            if (existing && existing.papiere !== '[]') {
                return interaction.reply({ content: '❌ Du bist bereits ein Buchbinder!', ephemeral: true });
            }
            db.db.prepare('INSERT OR REPLACE INTO buchbinder (user_id, papiere, einbaende) VALUES (?, ?, ?)').run(
                uId, JSON.stringify([PAPIERE[0].name]), JSON.stringify([EINBAENDE[0].name])
            );

            const embed = new EmbedBuilder()
                .setTitle('📚 Willkommen in der Buchbinderei!')
                .setDescription(`Du erhältst **${PAPIERE[0].name}** ${PAPIERE[0].emoji} und lernst den **${EINBAENDE[0].name}**!`)
                .addFields(
                    { name: '📄 Papier', value: PAPIERE[0].name, inline: true },
                    { name: '📕 Einband', value: EINBAENDE[0].name, inline: true },
                    { name: '💡 Nächster Schritt', value: 'Nutze `/buchbinder binden` um dein erstes Buch zu binden!' }
                )
                .setColor(0x8B4513);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'status') {
            const b = getBuchbinder(db, uId);
            if (b.papiere === '[]') return interaction.reply({ content: '❌ Nutze `/buchbinder start` um zu beginnen!', ephemeral: true });
            const papiere = JSON.parse(b.papiere);
            const einbaende = JSON.parse(b.einbaende);
            const xpNeeded = xpForLevel(b.level);

            const embed = new EmbedBuilder()
                .setTitle(`📚 Buchbinder ${interaction.user.username}`)
                .addFields(
                    { name: '📊 Level', value: `${b.level} (${b.xp}/${xpNeeded} XP)`, inline: true },
                    { name: '📖 Gebunden', value: `${b.buecher_gebunden} Bücher`, inline: true },
                    { name: '💰 Verdienst', value: `${b.gesamtverdienst} Münzen`, inline: true },
                    { name: '🏆 Beste Qualität', value: b.beste_qualitaet || 'Keine', inline: true },
                    { name: '🔧 Presse', value: `Stufe ${b.presse}`, inline: true },
                    { name: '📐 Falzbein', value: `Stufe ${b.falzbein}`, inline: true },
                    { name: '🪡 Heftlade', value: `Stufe ${b.heftlade}`, inline: true },
                    { name: '🏠 Werkstatt', value: `Stufe ${b.werkstatt}`, inline: true },
                    { name: '📄 Papiere', value: `${papiere.length}`, inline: true },
                    { name: '📕 Einbände', value: `${einbaende.length}`, inline: true },
                    { name: '🏆 Duelle', value: `${b.duelle_gewonnen}W / ${b.duelle_verloren}L`, inline: true }
                )
                .setColor(0x8B4513);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'papiere') {
            const b = getBuchbinder(db, uId);
            const besitz = b.papiere !== '[]' ? JSON.parse(b.papiere) : [];
            const lines = PAPIERE.map(p => {
                const owned = besitz.includes(p.name) ? ' ✅' : '';
                return `${p.emoji} **${p.name}** - ${p.preis > 0 ? `${p.preis} Münzen` : 'Starter'} | Qualität: x${p.qualitaet}${owned}`;
            });
            const embed = new EmbedBuilder()
                .setTitle('📄 Verfügbare Papiersorten')
                .setDescription(lines.join('\n'))
                .setColor(0x8B4513);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'kaufen') {
            const b = getBuchbinder(db, uId);
            if (b.papiere === '[]') return interaction.reply({ content: '❌ Nutze `/buchbinder start` um zu beginnen!', ephemeral: true });

            const papierName = interaction.options.getString('papier');
            const papier = PAPIERE.find(p => p.name.toLowerCase() === papierName.toLowerCase());
            if (!papier) return interaction.reply({ content: '❌ Unbekannte Papiersorte!', ephemeral: true });

            const papiere = JSON.parse(b.papiere);
            if (papiere.includes(papier.name)) return interaction.reply({ content: '❌ Du besitzt dieses Papier bereits!', ephemeral: true });

            const user = db.getUser(uId);
            if (user.balance < papier.preis) return interaction.reply({ content: `❌ Du brauchst ${papier.preis} Münzen! (Hast: ${user.balance})`, ephemeral: true });

            db.updateBalance(uId, -papier.preis);
            papiere.push(papier.name);
            db.db.prepare('UPDATE buchbinder SET papiere = ? WHERE user_id = ?').run(JSON.stringify(papiere), uId);

            const embed = new EmbedBuilder()
                .setTitle('📄 Neue Papiersorte!')
                .setDescription(`Du hast **${papier.name}** ${papier.emoji} für **${papier.preis} Münzen** erworben!`)
                .addFields({ name: '📊 Qualitätsbonus', value: `x${papier.qualitaet}`, inline: true })
                .setColor(0x00FF00);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'binden') {
            const b = getBuchbinder(db, uId);
            if (b.papiere === '[]') return interaction.reply({ content: '❌ Nutze `/buchbinder start` um zu beginnen!', ephemeral: true });

            const cdKey = `buchbinder_${uId}`;
            const cdTime = cooldowns.get(cdKey);
            if (cdTime && Date.now() - cdTime < 50000) {
                const rest = Math.ceil((50000 - (Date.now() - cdTime)) / 1000);
                return interaction.reply({ content: `⏳ Der Leim trocknet noch! Warte noch ${rest}s.`, ephemeral: true });
            }

            const buchName = interaction.options.getString('buch');
            const papierName = interaction.options.getString('papier');
            const einbandName = interaction.options.getString('einband');

            const buch = BUCH_TYPEN.find(bt => bt.name.toLowerCase() === buchName.toLowerCase());
            if (!buch) return interaction.reply({ content: `❌ Unbekannter Buchtyp! Verfügbar: ${BUCH_TYPEN.map(bt => bt.name).join(', ')}`, ephemeral: true });
            if (b.level < buch.minLevel) return interaction.reply({ content: `❌ Du brauchst Level ${buch.minLevel} für ${buch.name}!`, ephemeral: true });

            const papier = PAPIERE.find(p => p.name.toLowerCase() === papierName.toLowerCase());
            if (!papier) return interaction.reply({ content: '❌ Unbekannte Papiersorte!', ephemeral: true });
            const papiere = JSON.parse(b.papiere);
            if (!papiere.includes(papier.name)) return interaction.reply({ content: '❌ Du besitzt dieses Papier nicht!', ephemeral: true });

            const einband = EINBAENDE.find(e => e.name.toLowerCase() === einbandName.toLowerCase());
            if (!einband) return interaction.reply({ content: `❌ Unbekannter Einband! Verfügbar: ${EINBAENDE.map(e => e.name).join(', ')}`, ephemeral: true });

            const einbaende = JSON.parse(b.einbaende);
            if (!einbaende.includes(einband.name)) {
                if (b.level < einband.minLevel) return interaction.reply({ content: `❌ Du brauchst Level ${einband.minLevel} für ${einband.name}!`, ephemeral: true });
                einbaende.push(einband.name);
                db.db.prepare('UPDATE buchbinder SET einbaende = ? WHERE user_id = ?').run(JSON.stringify(einbaende), uId);
            }

            cooldowns.set(cdKey, Date.now());

            const presseBonus = UPGRADES.presse.bonus[b.presse];
            const falzBonus = UPGRADES.falzbein.bonus[b.falzbein];
            const heftBonus = UPGRADES.heftlade.bonus[b.heftlade];
            const praezBonus = b.praezision * 0.02;
            const heftTechBonus = b.hefttechnik * 0.018;

            let qualRoll = Math.random() * 100;
            qualRoll += (presseBonus + falzBonus + heftBonus + praezBonus + heftTechBonus) * 28;
            qualRoll *= papier.qualitaet * einband.bonus / buch.schwierigkeit;

            let event = null;
            if (Math.random() < 0.2) {
                event = BINDE_EVENTS[Math.floor(Math.random() * BINDE_EVENTS.length)];
                qualRoll *= event.qualMulti;
            }

            qualRoll = Math.min(100, qualRoll);
            let qualitaet = QUALITAETEN[0];
            for (const q of QUALITAETEN) {
                if (qualRoll >= q.minRoll) qualitaet = q;
            }

            let wert = Math.floor(buch.basisWert * qualitaet.multi * papier.qualitaet * einband.bonus * (1 + heftBonus));
            if (event) wert = Math.floor(wert * event.geldMulti);

            db.updateBalance(uId, wert);
            const xpGain = 14 + Math.floor(buch.schwierigkeit * 5) + Math.floor(wert / 50);

            db.db.prepare('INSERT INTO buchbinder_regal (user_id, buch_typ, papier, einband, qualitaet, wert, erstellt_am) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
                uId, buch.name, papier.name, einband.name, qualitaet.name, wert, Date.now()
            );

            const besteQ = QUALITAETEN.indexOf(qualitaet) > QUALITAETEN.findIndex(q => q.name === b.beste_qualitaet) ? qualitaet.name : (b.beste_qualitaet || qualitaet.name);
            db.db.prepare('UPDATE buchbinder SET buecher_gebunden = buecher_gebunden + 1, gesamtverdienst = gesamtverdienst + ?, xp = xp + ?, beste_qualitaet = ?, letztes_binden = ? WHERE user_id = ?').run(
                wert, xpGain, besteQ, Date.now(), uId
            );

            const updatedB = getBuchbinder(db, uId);
            const levelUp = checkLevelUp(db, uId, updatedB);

            const embed = new EmbedBuilder()
                .setTitle(`📚 ${buch.name} gebunden!`)
                .setDescription(`Du hast ein **${qualitaet.name}es** ${buch.name} aus **${papier.name}** ${papier.emoji} mit **${einband.name}** gebunden!`)
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
            const b = getBuchbinder(db, uId);
            if (b.papiere === '[]') return interaction.reply({ content: '❌ Nutze `/buchbinder start` um zu beginnen!', ephemeral: true });

            const cdKey = `buchbinder_train_${uId}`;
            const cdTime = cooldowns.get(cdKey);
            if (cdTime && Date.now() - cdTime < 60000) {
                const rest = Math.ceil((60000 - (Date.now() - cdTime)) / 1000);
                return interaction.reply({ content: `⏳ Deine Finger kleben noch! Warte noch ${rest}s.`, ephemeral: true });
            }

            const typ = interaction.options.getString('typ').toLowerCase();
            const validTypes = ['praezision', 'hefttechnik', 'vergoldung', 'restauration'];
            if (!validTypes.includes(typ)) return interaction.reply({ content: `❌ Unbekanntes Training! Verfügbar: ${validTypes.join(', ')}`, ephemeral: true });

            cooldowns.set(cdKey, Date.now());
            const xpGain = 12 + Math.floor(b.level * 2);
            const newVal = b[typ] + 1;

            db.db.prepare(`UPDATE buchbinder SET ${typ} = ?, trainings = trainings + 1, xp = xp + ?, letztes_training = ? WHERE user_id = ?`).run(
                newVal, xpGain, Date.now(), uId
            );

            const updatedB = getBuchbinder(db, uId);
            const levelUp = checkLevelUp(db, uId, updatedB);

            const embed = new EmbedBuilder()
                .setTitle(`🎓 ${typ.charAt(0).toUpperCase() + typ.slice(1)}-Training`)
                .setDescription(`Du hast deine **${typ}** verbessert!`)
                .addFields(
                    { name: '📈 Fortschritt', value: `${b[typ]} → ${newVal}`, inline: true },
                    { name: '⭐ XP', value: `+${xpGain}`, inline: true }
                )
                .setColor(0x4169E1);

            if (levelUp.ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${levelUp.lvl}!` });

            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'upgrade') {
            const b = getBuchbinder(db, uId);
            if (b.papiere === '[]') return interaction.reply({ content: '❌ Nutze `/buchbinder start` um zu beginnen!', ephemeral: true });

            const item = interaction.options.getString('item').toLowerCase();
            const upg = UPGRADES[item];
            if (!upg) return interaction.reply({ content: `❌ Unbekanntes Upgrade! Verfügbar: ${Object.keys(UPGRADES).join(', ')}`, ephemeral: true });

            const currentLvl = b[item];
            if (currentLvl >= 4) return interaction.reply({ content: `❌ ${upg.name} ist bereits auf Maximum (Stufe 4)!`, ephemeral: true });

            const kosten = upg.stufen[currentLvl + 1];
            const user = db.getUser(uId);
            if (user.balance < kosten) return interaction.reply({ content: `❌ Du brauchst ${kosten} Münzen! (Hast: ${user.balance})`, ephemeral: true });

            db.updateBalance(uId, -kosten);
            db.db.prepare(`UPDATE buchbinder SET ${item} = ? WHERE user_id = ?`).run(currentLvl + 1, uId);

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
            const b = getBuchbinder(db, uId);
            if (b.papiere === '[]') return interaction.reply({ content: '❌ Nutze `/buchbinder start` um zu beginnen!', ephemeral: true });

            const werke = db.db.prepare('SELECT * FROM buchbinder_regal WHERE user_id = ? ORDER BY wert DESC LIMIT 10').all(uId);

            if (werke.length === 0) {
                return interaction.reply({ content: '📚 Dein Regal ist noch leer. Binde dein erstes Buch!', ephemeral: true });
            }

            const total = db.db.prepare('SELECT COUNT(*) as cnt, SUM(wert) as total FROM buchbinder_regal WHERE user_id = ?').get(uId);
            const lines = werke.map((w, i) => `${i + 1}. **${w.buch_typ}** (${w.papier}/${w.einband}) - ${w.qualitaet} - ${w.wert} Münzen`);

            const embed = new EmbedBuilder()
                .setTitle('📚 Bücherregal')
                .setDescription(lines.join('\n'))
                .addFields(
                    { name: '📊 Gesamt', value: `${total.cnt} Bücher`, inline: true },
                    { name: '💰 Gesamtwert', value: `${total.total} Münzen`, inline: true }
                )
                .setColor(0x8B4513);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'auftrag') {
            const b = getBuchbinder(db, uId);
            if (b.papiere === '[]') return interaction.reply({ content: '❌ Nutze `/buchbinder start` um zu beginnen!', ephemeral: true });

            const cdKey = `buchbinder_auftrag_${uId}`;
            const cdTime = cooldowns.get(cdKey);
            if (cdTime && Date.now() - cdTime < 120000) {
                const rest = Math.ceil((120000 - (Date.now() - cdTime)) / 1000);
                return interaction.reply({ content: `⏳ Kein neuer Auftrag verfügbar! Warte noch ${rest}s.`, ephemeral: true });
            }

            cooldowns.set(cdKey, Date.now());
            const auftraege = [
                { kunde: 'Student', buch: 'Notizbuch', belohnung: 180 + b.level * 35 },
                { kunde: 'Schriftsteller', buch: 'Tagebuch', belohnung: 300 + b.level * 50 },
                { kunde: 'Dichter', buch: 'Gedichtband', belohnung: 500 + b.level * 70 },
                { kunde: 'Verleger', buch: 'Roman', belohnung: 800 + b.level * 100 },
                { kunde: 'Kloster', buch: 'Bibel', belohnung: 1500 + b.level * 150 },
                { kunde: 'Magierakademie', buch: 'Zauberbuch', belohnung: 2500 + b.level * 220 }
            ];

            const auftrag = auftraege[Math.floor(Math.random() * Math.min(auftraege.length, 2 + Math.floor(b.level / 2)))];
            const qualBonus = 1.0 + b.praezision * 0.03 + b.hefttechnik * 0.025;
            const verdienst = Math.floor(auftrag.belohnung * qualBonus);

            db.updateBalance(uId, verdienst);
            const xpGain = 18 + Math.floor(verdienst / 30);
            db.db.prepare('UPDATE buchbinder SET buecher_gebunden = buecher_gebunden + 1, gesamtverdienst = gesamtverdienst + ?, xp = xp + ? WHERE user_id = ?').run(verdienst, xpGain, uId);

            const updatedB = getBuchbinder(db, uId);
            const levelUp = checkLevelUp(db, uId, updatedB);

            const embed = new EmbedBuilder()
                .setTitle('📋 Buchbinder-Auftrag abgeschlossen!')
                .setDescription(`Der **${auftrag.kunde}** hat dich beauftragt, ein **${auftrag.buch}** zu binden.`)
                .addFields(
                    { name: '💰 Belohnung', value: `${verdienst} Münzen`, inline: true },
                    { name: '⭐ XP', value: `+${xpGain}`, inline: true }
                )
                .setColor(0x00FF00);

            if (levelUp.ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${levelUp.lvl}!` });

            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'duell') {
            const b = getBuchbinder(db, uId);
            if (b.papiere === '[]') return interaction.reply({ content: '❌ Nutze `/buchbinder start` um zu beginnen!', ephemeral: true });
            if (b.level < 3) return interaction.reply({ content: '❌ Du brauchst Level 3 für Duelle!', ephemeral: true });

            const gegner = interaction.options.getUser('gegner');
            if (gegner.id === uId) return interaction.reply({ content: '❌ Du kannst dich nicht selbst herausfordern!', ephemeral: true });
            if (gegner.bot) return interaction.reply({ content: '❌ Du kannst keinen Bot herausfordern!', ephemeral: true });

            const g = db.db.prepare('SELECT * FROM buchbinder WHERE user_id = ?').get(gegner.id);
            if (!g || g.papiere === '[]') return interaction.reply({ content: '❌ Dein Gegner ist kein Buchbinder!', ephemeral: true });

            const scoreA = (b.level * 10) + (b.praezision * 5) + (b.hefttechnik * 4) + (b.vergoldung * 6) + (b.presse * 8) + (b.heftlade * 7) + Math.random() * 40;
            const scoreB = (g.level * 10) + (g.praezision * 5) + (g.hefttechnik * 4) + (g.vergoldung * 6) + (g.presse * 8) + (g.heftlade * 7) + Math.random() * 40;

            const gewonnen = scoreA > scoreB;
            const preis = Math.floor(200 + b.level * 50 + g.level * 50);

            if (gewonnen) {
                db.updateBalance(uId, preis);
                db.db.prepare('UPDATE buchbinder SET duelle_gewonnen = duelle_gewonnen + 1 WHERE user_id = ?').run(uId);
                db.db.prepare('UPDATE buchbinder SET duelle_verloren = duelle_verloren + 1 WHERE user_id = ?').run(gegner.id);
            } else {
                db.updateBalance(gegner.id, preis);
                db.db.prepare('UPDATE buchbinder SET duelle_verloren = duelle_verloren + 1 WHERE user_id = ?').run(uId);
                db.db.prepare('UPDATE buchbinder SET duelle_gewonnen = duelle_gewonnen + 1 WHERE user_id = ?').run(gegner.id);
            }

            const embed = new EmbedBuilder()
                .setTitle('🏆 Buchbinder-Duell')
                .setDescription(`📚 **${interaction.user.username}** vs 📚 **${gegner.username}**`)
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
