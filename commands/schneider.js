const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const STOFFE = [
    { name: 'Leinen', preis: 0, qualitaet: 1.0, emoji: '🧵' },
    { name: 'Baumwolle', preis: 1200, qualitaet: 1.2, emoji: '🧶' },
    { name: 'Wolle', preis: 3000, qualitaet: 1.4, emoji: '🐑' },
    { name: 'Seide', preis: 8000, qualitaet: 1.7, emoji: '✨' },
    { name: 'Brokat', preis: 18000, qualitaet: 2.0, emoji: '👑' },
    { name: 'Elfengewebe', preis: 35000, qualitaet: 2.4, emoji: '🧚' },
    { name: 'Drachenschuppe', preis: 60000, qualitaet: 3.0, emoji: '🐉' },
    { name: 'Sternenspinnfaden', preis: 110000, qualitaet: 3.8, emoji: '⭐' }
];

const KLEIDUNG = [
    { name: 'Hemd', stoffe: 1, basisWert: 60, schwierigkeit: 1 },
    { name: 'Hose', stoffe: 1, basisWert: 80, schwierigkeit: 1 },
    { name: 'Kleid', stoffe: 2, basisWert: 200, schwierigkeit: 2 },
    { name: 'Mantel', stoffe: 2, basisWert: 350, schwierigkeit: 3 },
    { name: 'Abendgarderobe', stoffe: 3, basisWert: 600, schwierigkeit: 4 },
    { name: 'Rüstungsgewand', stoffe: 3, basisWert: 1000, schwierigkeit: 5 },
    { name: 'Königsrobe', stoffe: 4, basisWert: 2500, schwierigkeit: 7 },
    { name: 'Legendärer Umhang', stoffe: 5, basisWert: 5000, schwierigkeit: 9 }
];

const MUSTER = [
    { name: 'Einfarbig', bonus: 1.0, minLevel: 1 },
    { name: 'Gestreift', bonus: 1.1, minLevel: 2 },
    { name: 'Kariert', bonus: 1.2, minLevel: 3 },
    { name: 'Blumenmuster', bonus: 1.35, minLevel: 5 },
    { name: 'Ornamental', bonus: 1.5, minLevel: 7 },
    { name: 'Heraldisch', bonus: 1.7, minLevel: 9 },
    { name: 'Mythisch', bonus: 2.0, minLevel: 12 },
    { name: 'Kosmisch', bonus: 2.5, minLevel: 15 }
];

const QUALITAETEN = [
    { name: 'Zerlumpt', multi: 0.3, minRoll: 0 },
    { name: 'Grob', multi: 0.5, minRoll: 12 },
    { name: 'Einfach', multi: 0.7, minRoll: 25 },
    { name: 'Ordentlich', multi: 1.0, minRoll: 40 },
    { name: 'Fein', multi: 1.4, minRoll: 55 },
    { name: 'Prächtig', multi: 2.0, minRoll: 75 },
    { name: 'Meisterhaft', multi: 3.0, minRoll: 90 }
];

const UPGRADES = {
    nadel: { name: 'Nähnadel', stufen: [0, 1500, 5000, 15000, 40000], bonus: [0, 0.1, 0.2, 0.35, 0.5] },
    schere: { name: 'Stoffschere', stufen: [0, 2000, 6000, 18000, 45000], bonus: [0, 0.08, 0.18, 0.3, 0.45] },
    naehmaschine: { name: 'Nähmaschine', stufen: [0, 2500, 7500, 22000, 55000], bonus: [0, 0.1, 0.22, 0.38, 0.55] },
    werkstatt: { name: 'Schneiderwerkstatt', stufen: [0, 3000, 9000, 25000, 60000], bonus: [0, 1, 2, 3, 5] }
};

const NAEH_EVENTS = [
    { text: '✨ Perfekte Stiche! Der Stoff fügt sich wie von selbst zusammen.', qualMulti: 1.5, geldMulti: 1.0 },
    { text: '✂️ Die Schere rutscht ab! Ein kleiner Fehler im Muster.', qualMulti: 0.6, geldMulti: 1.0 },
    { text: '🎨 Kreative Inspiration! Du findest ein einzigartiges Design.', qualMulti: 1.4, geldMulti: 1.3 },
    { text: '👑 Eine Adelige bewundert deine Arbeit und gibt Trinkgeld!', qualMulti: 1.0, geldMulti: 2.5 },
    { text: '🌙 Im Mondlicht schimmern die Fäden magisch!', qualMulti: 1.6, geldMulti: 1.2 },
    { text: '🧵 Der Faden reißt! Du musst von vorne beginnen.', qualMulti: 0.5, geldMulti: 0.8 },
    { text: '💎 Du findest eine versteckte Perle im Stoffballen!', qualMulti: 1.2, geldMulti: 2.0 }
];

const cooldowns = new Map();

function ensureSchneiderTable(db) {
    db.db.exec(`CREATE TABLE IF NOT EXISTS schneider (
        user_id TEXT PRIMARY KEY,
        stoffe TEXT DEFAULT '[]',
        muster TEXT DEFAULT '[]',
        level INTEGER DEFAULT 1,
        xp INTEGER DEFAULT 0,
        kleidung_gefertigt INTEGER DEFAULT 0,
        beste_qualitaet TEXT DEFAULT '',
        gesamtverdienst INTEGER DEFAULT 0,
        nadel INTEGER DEFAULT 0,
        schere INTEGER DEFAULT 0,
        naehmaschine INTEGER DEFAULT 0,
        werkstatt INTEGER DEFAULT 0,
        praezision INTEGER DEFAULT 0,
        kreativitaet INTEGER DEFAULT 0,
        geschwindigkeit INTEGER DEFAULT 0,
        stoffkenntnis INTEGER DEFAULT 0,
        trainings INTEGER DEFAULT 0,
        duelle_gewonnen INTEGER DEFAULT 0,
        duelle_verloren INTEGER DEFAULT 0,
        letztes_naehen INTEGER DEFAULT 0,
        letztes_training INTEGER DEFAULT 0
    )`);
    db.db.exec(`CREATE TABLE IF NOT EXISTS schneider_kollektion (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        kleidung_typ TEXT,
        stoff TEXT,
        muster TEXT,
        qualitaet TEXT,
        wert INTEGER,
        erstellt_am INTEGER DEFAULT 0
    )`);
}

function getSchneider(db, uId) {
    const row = db.db.prepare('SELECT * FROM schneider WHERE user_id = ?').get(uId);
    if (!row) {
        db.db.prepare('INSERT INTO schneider (user_id) VALUES (?)').run(uId);
        return db.db.prepare('SELECT * FROM schneider WHERE user_id = ?').get(uId);
    }
    return row;
}

function xpForLevel(l) { return l * l * 58; }

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
        db.db.prepare('UPDATE schneider SET level = ?, xp = ? WHERE user_id = ?').run(lvl, xp, uId);
    }
    return { lvl, ups };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('schneider')
        .setDescription('🧵 Schneiderei - Fertige prächtige Kleidung und Mode!')
        .addSubcommand(s => s.setName('start').setDescription('Beginne deine Schneider-Karriere'))
        .addSubcommand(s => s.setName('status').setDescription('Zeige deinen Schneider-Status'))
        .addSubcommand(s => s.setName('stoffe').setDescription('Zeige verfügbare Stoffe'))
        .addSubcommand(s => s.setName('kaufen').setDescription('Kaufe einen neuen Stoff')
            .addStringOption(o => o.setName('stoff').setDescription('Name des Stoffs').setRequired(true)))
        .addSubcommand(s => s.setName('naehen').setDescription('Fertige ein Kleidungsstück')
            .addStringOption(o => o.setName('kleidung').setDescription('Kleidungstyp').setRequired(true))
            .addStringOption(o => o.setName('stoff').setDescription('Stoffart').setRequired(true))
            .addStringOption(o => o.setName('muster').setDescription('Muster').setRequired(true)))
        .addSubcommand(s => s.setName('training').setDescription('Trainiere deine Schneider-Fähigkeiten')
            .addStringOption(o => o.setName('typ').setDescription('Trainingstyp (praezision/kreativitaet/geschwindigkeit/stoffkenntnis)').setRequired(true)))
        .addSubcommand(s => s.setName('upgrade').setDescription('Verbessere deine Ausrüstung')
            .addStringOption(o => o.setName('item').setDescription('Ausrüstung (nadel/schere/naehmaschine/werkstatt)').setRequired(true)))
        .addSubcommand(s => s.setName('kollektion').setDescription('Zeige deine Kleidungskollektion'))
        .addSubcommand(s => s.setName('auftrag').setDescription('Nimm einen Schneiderauftrag an'))
        .addSubcommand(s => s.setName('duell').setDescription('Fordere einen anderen Schneider heraus')
            .addUserOption(o => o.setName('gegner').setDescription('Dein Gegner').setRequired(true))),

    async execute(interaction) {
        const db = interaction.client.db;
        const config = require('../config.json');
        ensureSchneiderTable(db);
        const uId = interaction.user.id;
        const sub = interaction.options.getSubcommand();

        if (sub === 'start') {
            const existing = db.db.prepare('SELECT * FROM schneider WHERE user_id = ?').get(uId);
            if (existing && existing.stoffe !== '[]') {
                return interaction.reply({ content: '❌ Du bist bereits ein Schneider!', ephemeral: true });
            }
            db.db.prepare('INSERT OR REPLACE INTO schneider (user_id, stoffe, muster) VALUES (?, ?, ?)').run(
                uId, JSON.stringify([STOFFE[0].name]), JSON.stringify([MUSTER[0].name])
            );

            const embed = new EmbedBuilder()
                .setTitle('🧵 Willkommen in der Schneiderei!')
                .setDescription(`Du erhältst **${STOFFE[0].name}** ${STOFFE[0].emoji} und lernst das **${MUSTER[0].name}**-Muster!`)
                .addFields(
                    { name: '🧶 Stoff', value: STOFFE[0].name, inline: true },
                    { name: '🎨 Muster', value: MUSTER[0].name, inline: true },
                    { name: '💡 Nächster Schritt', value: 'Nutze `/schneider naehen` um dein erstes Kleidungsstück zu fertigen!' }
                )
                .setColor(0xDA70D6);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'status') {
            const s = getSchneider(db, uId);
            if (s.stoffe === '[]') return interaction.reply({ content: '❌ Nutze `/schneider start` um zu beginnen!', ephemeral: true });
            const stoffe = JSON.parse(s.stoffe);
            const muster = JSON.parse(s.muster);
            const xpNeeded = xpForLevel(s.level);

            const embed = new EmbedBuilder()
                .setTitle(`🧵 Schneider ${interaction.user.username}`)
                .addFields(
                    { name: '📊 Level', value: `${s.level} (${s.xp}/${xpNeeded} XP)`, inline: true },
                    { name: '👗 Gefertigt', value: `${s.kleidung_gefertigt} Stück`, inline: true },
                    { name: '💰 Gesamtverdienst', value: `${s.gesamtverdienst} Münzen`, inline: true },
                    { name: '🏆 Beste Qualität', value: s.beste_qualitaet || 'Keine', inline: true },
                    { name: '🪡 Nadel', value: `Stufe ${s.nadel}`, inline: true },
                    { name: '✂️ Schere', value: `Stufe ${s.schere}`, inline: true },
                    { name: '🧵 Nähmaschine', value: `Stufe ${s.naehmaschine}`, inline: true },
                    { name: '🏠 Werkstatt', value: `Stufe ${s.werkstatt}`, inline: true },
                    { name: '🧶 Stoffe', value: `${stoffe.length} Sorten`, inline: true },
                    { name: '🎨 Muster', value: `${muster.length} Stile`, inline: true },
                    { name: '🏆 Duelle', value: `${s.duelle_gewonnen}W / ${s.duelle_verloren}L`, inline: true }
                )
                .setColor(0xDA70D6);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'stoffe') {
            const s = getSchneider(db, uId);
            const besitz = s.stoffe !== '[]' ? JSON.parse(s.stoffe) : [];
            const lines = STOFFE.map(st => {
                const owned = besitz.includes(st.name) ? ' ✅' : '';
                return `${st.emoji} **${st.name}** - ${st.preis > 0 ? `${st.preis} Münzen` : 'Starter'} | Qualität: x${st.qualitaet}${owned}`;
            });
            const embed = new EmbedBuilder()
                .setTitle('🧶 Verfügbare Stoffe')
                .setDescription(lines.join('\n'))
                .setColor(0xDA70D6);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'kaufen') {
            const s = getSchneider(db, uId);
            if (s.stoffe === '[]') return interaction.reply({ content: '❌ Nutze `/schneider start` um zu beginnen!', ephemeral: true });

            const stoffName = interaction.options.getString('stoff');
            const stoff = STOFFE.find(st => st.name.toLowerCase() === stoffName.toLowerCase());
            if (!stoff) return interaction.reply({ content: '❌ Unbekannter Stoff!', ephemeral: true });

            const stoffe = JSON.parse(s.stoffe);
            if (stoffe.includes(stoff.name)) return interaction.reply({ content: '❌ Du besitzt diesen Stoff bereits!', ephemeral: true });

            const user = db.getUser(uId);
            if (user.balance < stoff.preis) return interaction.reply({ content: `❌ Du brauchst ${stoff.preis} Münzen! (Hast: ${user.balance})`, ephemeral: true });

            db.updateBalance(uId, -stoff.preis);
            stoffe.push(stoff.name);
            db.db.prepare('UPDATE schneider SET stoffe = ? WHERE user_id = ?').run(JSON.stringify(stoffe), uId);

            const embed = new EmbedBuilder()
                .setTitle('🧶 Neuer Stoff!')
                .setDescription(`Du hast **${stoff.name}** ${stoff.emoji} für **${stoff.preis} Münzen** erworben!`)
                .addFields({ name: '📊 Qualitätsbonus', value: `x${stoff.qualitaet}`, inline: true })
                .setColor(0x00FF00);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'naehen') {
            const s = getSchneider(db, uId);
            if (s.stoffe === '[]') return interaction.reply({ content: '❌ Nutze `/schneider start` um zu beginnen!', ephemeral: true });

            const cdKey = `schneider_${uId}`;
            const cdTime = cooldowns.get(cdKey);
            if (cdTime && Date.now() - cdTime < 45000) {
                const rest = Math.ceil((45000 - (Date.now() - cdTime)) / 1000);
                return interaction.reply({ content: `⏳ Du nähst noch! Warte noch ${rest}s.`, ephemeral: true });
            }

            const kleidungName = interaction.options.getString('kleidung');
            const stoffName = interaction.options.getString('stoff');
            const musterName = interaction.options.getString('muster');

            const kleidung = KLEIDUNG.find(k => k.name.toLowerCase() === kleidungName.toLowerCase());
            if (!kleidung) return interaction.reply({ content: `❌ Unbekannte Kleidung! Verfügbar: ${KLEIDUNG.map(k => k.name).join(', ')}`, ephemeral: true });

            const stoff = STOFFE.find(st => st.name.toLowerCase() === stoffName.toLowerCase());
            if (!stoff) return interaction.reply({ content: '❌ Unbekannter Stoff!', ephemeral: true });
            const stoffe = JSON.parse(s.stoffe);
            if (!stoffe.includes(stoff.name)) return interaction.reply({ content: '❌ Du besitzt diesen Stoff nicht!', ephemeral: true });

            const muster = MUSTER.find(m => m.name.toLowerCase() === musterName.toLowerCase());
            if (!muster) return interaction.reply({ content: `❌ Unbekanntes Muster! Verfügbar: ${MUSTER.map(m => m.name).join(', ')}`, ephemeral: true });

            const musterList = JSON.parse(s.muster);
            if (!musterList.includes(muster.name)) {
                if (s.level < muster.minLevel) return interaction.reply({ content: `❌ Du brauchst Level ${muster.minLevel} für ${muster.name}!`, ephemeral: true });
                musterList.push(muster.name);
                db.db.prepare('UPDATE schneider SET muster = ? WHERE user_id = ?').run(JSON.stringify(musterList), uId);
            }

            cooldowns.set(cdKey, Date.now());

            const nadelBonus = UPGRADES.nadel.bonus[s.nadel];
            const schereBonus = UPGRADES.schere.bonus[s.schere];
            const maschineBonus = UPGRADES.naehmaschine.bonus[s.naehmaschine];
            const praezBonus = s.praezision * 0.02;
            const kreativBonus = s.kreativitaet * 0.015;

            let qualRoll = Math.random() * 100;
            qualRoll += (nadelBonus + schereBonus + maschineBonus + praezBonus + kreativBonus) * 30;
            qualRoll *= stoff.qualitaet * muster.bonus / kleidung.schwierigkeit;

            let event = null;
            if (Math.random() < 0.2) {
                event = NAEH_EVENTS[Math.floor(Math.random() * NAEH_EVENTS.length)];
                qualRoll *= event.qualMulti;
            }

            qualRoll = Math.min(100, qualRoll);
            let qualitaet = QUALITAETEN[0];
            for (const q of QUALITAETEN) {
                if (qualRoll >= q.minRoll) qualitaet = q;
            }

            let wert = Math.floor(kleidung.basisWert * qualitaet.multi * stoff.qualitaet * muster.bonus * (1 + maschineBonus));
            if (event) wert = Math.floor(wert * event.geldMulti);

            db.updateBalance(uId, wert);
            const xpGain = 12 + Math.floor(kleidung.schwierigkeit * 5) + Math.floor(wert / 50);

            db.db.prepare('INSERT INTO schneider_kollektion (user_id, kleidung_typ, stoff, muster, qualitaet, wert, erstellt_am) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
                uId, kleidung.name, stoff.name, muster.name, qualitaet.name, wert, Date.now()
            );

            const besteQ = QUALITAETEN.indexOf(qualitaet) > QUALITAETEN.findIndex(q => q.name === s.beste_qualitaet) ? qualitaet.name : (s.beste_qualitaet || qualitaet.name);
            db.db.prepare('UPDATE schneider SET kleidung_gefertigt = kleidung_gefertigt + 1, gesamtverdienst = gesamtverdienst + ?, xp = xp + ?, beste_qualitaet = ?, letztes_naehen = ? WHERE user_id = ?').run(
                wert, xpGain, besteQ, Date.now(), uId
            );

            const updatedS = getSchneider(db, uId);
            const levelUp = checkLevelUp(db, uId, updatedS);

            const embed = new EmbedBuilder()
                .setTitle(`🧵 ${kleidung.name} gefertigt!`)
                .setDescription(`Du hast ein **${qualitaet.name}es** ${kleidung.name} aus **${stoff.name}** ${stoff.emoji} mit **${muster.name}**-Muster genäht!`)
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
            const s = getSchneider(db, uId);
            if (s.stoffe === '[]') return interaction.reply({ content: '❌ Nutze `/schneider start` um zu beginnen!', ephemeral: true });

            const cdKey = `schneider_train_${uId}`;
            const cdTime = cooldowns.get(cdKey);
            if (cdTime && Date.now() - cdTime < 60000) {
                const rest = Math.ceil((60000 - (Date.now() - cdTime)) / 1000);
                return interaction.reply({ content: `⏳ Deine Finger brauchen Ruhe! Warte noch ${rest}s.`, ephemeral: true });
            }

            const typ = interaction.options.getString('typ').toLowerCase();
            const validTypes = ['praezision', 'kreativitaet', 'geschwindigkeit', 'stoffkenntnis'];
            if (!validTypes.includes(typ)) return interaction.reply({ content: `❌ Unbekanntes Training! Verfügbar: ${validTypes.join(', ')}`, ephemeral: true });

            cooldowns.set(cdKey, Date.now());
            const xpGain = 12 + Math.floor(s.level * 2);
            const newVal = s[typ] + 1;

            db.db.prepare(`UPDATE schneider SET ${typ} = ?, trainings = trainings + 1, xp = xp + ?, letztes_training = ? WHERE user_id = ?`).run(
                newVal, xpGain, Date.now(), uId
            );

            const updatedS = getSchneider(db, uId);
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
            const s = getSchneider(db, uId);
            if (s.stoffe === '[]') return interaction.reply({ content: '❌ Nutze `/schneider start` um zu beginnen!', ephemeral: true });

            const item = interaction.options.getString('item').toLowerCase();
            const upg = UPGRADES[item];
            if (!upg) return interaction.reply({ content: `❌ Unbekanntes Upgrade! Verfügbar: ${Object.keys(UPGRADES).join(', ')}`, ephemeral: true });

            const currentLvl = s[item];
            if (currentLvl >= 4) return interaction.reply({ content: `❌ ${upg.name} ist bereits auf Maximum (Stufe 4)!`, ephemeral: true });

            const kosten = upg.stufen[currentLvl + 1];
            const user = db.getUser(uId);
            if (user.balance < kosten) return interaction.reply({ content: `❌ Du brauchst ${kosten} Münzen! (Hast: ${user.balance})`, ephemeral: true });

            db.updateBalance(uId, -kosten);
            db.db.prepare(`UPDATE schneider SET ${item} = ? WHERE user_id = ?`).run(currentLvl + 1, uId);

            const embed = new EmbedBuilder()
                .setTitle(`⬆️ ${upg.name} verbessert!`)
                .setDescription(`Stufe ${currentLvl} → **Stufe ${currentLvl + 1}**`)
                .addFields(
                    { name: '💰 Kosten', value: `${kosten} Münzen`, inline: true },
                    { name: '📊 Bonus', value: item === 'werkstatt' ? `+${upg.bonus[currentLvl + 1]} Werkplätze` : `+${(upg.bonus[currentLvl + 1] * 100).toFixed(0)}%`, inline: true }
                )
                .setColor(0xFFD700);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'kollektion') {
            const s = getSchneider(db, uId);
            if (s.stoffe === '[]') return interaction.reply({ content: '❌ Nutze `/schneider start` um zu beginnen!', ephemeral: true });

            const werke = db.db.prepare('SELECT * FROM schneider_kollektion WHERE user_id = ? ORDER BY wert DESC LIMIT 10').all(uId);

            if (werke.length === 0) {
                return interaction.reply({ content: '👗 Deine Kollektion ist noch leer. Nähe dein erstes Kleidungsstück!', ephemeral: true });
            }

            const total = db.db.prepare('SELECT COUNT(*) as cnt, SUM(wert) as total FROM schneider_kollektion WHERE user_id = ?').get(uId);
            const lines = werke.map((w, i) => `${i + 1}. **${w.kleidung_typ}** (${w.stoff}/${w.muster}) - ${w.qualitaet} - ${w.wert} Münzen`);

            const embed = new EmbedBuilder()
                .setTitle('👗 Schneider-Kollektion')
                .setDescription(lines.join('\n'))
                .addFields(
                    { name: '📊 Gesamt', value: `${total.cnt} Kleidungsstücke`, inline: true },
                    { name: '💰 Gesamtwert', value: `${total.total} Münzen`, inline: true }
                )
                .setColor(0xDA70D6);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'auftrag') {
            const s = getSchneider(db, uId);
            if (s.stoffe === '[]') return interaction.reply({ content: '❌ Nutze `/schneider start` um zu beginnen!', ephemeral: true });

            const cdKey = `schneider_auftrag_${uId}`;
            const cdTime = cooldowns.get(cdKey);
            if (cdTime && Date.now() - cdTime < 120000) {
                const rest = Math.ceil((120000 - (Date.now() - cdTime)) / 1000);
                return interaction.reply({ content: `⏳ Kein neuer Auftrag verfügbar! Warte noch ${rest}s.`, ephemeral: true });
            }

            cooldowns.set(cdKey, Date.now());
            const auftraege = [
                { kunde: 'Bäuerin', kleidung: 'Hemd', belohnung: 200 + s.level * 40 },
                { kunde: 'Kaufmann', kleidung: 'Hose', belohnung: 300 + s.level * 50 },
                { kunde: 'Baronin', kleidung: 'Kleid', belohnung: 500 + s.level * 80 },
                { kunde: 'General', kleidung: 'Mantel', belohnung: 700 + s.level * 100 },
                { kunde: 'Herzogin', kleidung: 'Abendgarderobe', belohnung: 1200 + s.level * 140 },
                { kunde: 'Königin', kleidung: 'Königsrobe', belohnung: 2500 + s.level * 200 }
            ];

            const auftrag = auftraege[Math.floor(Math.random() * Math.min(auftraege.length, 2 + Math.floor(s.level / 2)))];
            const qualBonus = 1.0 + s.praezision * 0.03 + s.kreativitaet * 0.02;
            const verdienst = Math.floor(auftrag.belohnung * qualBonus);

            db.updateBalance(uId, verdienst);
            const xpGain = 20 + Math.floor(verdienst / 30);
            db.db.prepare('UPDATE schneider SET kleidung_gefertigt = kleidung_gefertigt + 1, gesamtverdienst = gesamtverdienst + ?, xp = xp + ? WHERE user_id = ?').run(verdienst, xpGain, uId);

            const updatedS = getSchneider(db, uId);
            const levelUp = checkLevelUp(db, uId, updatedS);

            const embed = new EmbedBuilder()
                .setTitle('📋 Schneiderauftrag abgeschlossen!')
                .setDescription(`Die **${auftrag.kunde}** hat dich beauftragt, ein **${auftrag.kleidung}** zu fertigen.`)
                .addFields(
                    { name: '💰 Belohnung', value: `${verdienst} Münzen`, inline: true },
                    { name: '⭐ XP', value: `+${xpGain}`, inline: true }
                )
                .setColor(0x00FF00);

            if (levelUp.ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${levelUp.lvl}!` });

            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'duell') {
            const s = getSchneider(db, uId);
            if (s.stoffe === '[]') return interaction.reply({ content: '❌ Nutze `/schneider start` um zu beginnen!', ephemeral: true });
            if (s.level < 3) return interaction.reply({ content: '❌ Du brauchst Level 3 für Duelle!', ephemeral: true });

            const gegner = interaction.options.getUser('gegner');
            if (gegner.id === uId) return interaction.reply({ content: '❌ Du kannst dich nicht selbst herausfordern!', ephemeral: true });
            if (gegner.bot) return interaction.reply({ content: '❌ Du kannst keinen Bot herausfordern!', ephemeral: true });

            const g = db.db.prepare('SELECT * FROM schneider WHERE user_id = ?').get(gegner.id);
            if (!g || g.stoffe === '[]') return interaction.reply({ content: '❌ Dein Gegner ist kein Schneider!', ephemeral: true });

            const scoreA = (s.level * 10) + (s.praezision * 5) + (s.kreativitaet * 4) + (s.nadel * 8) + (s.schere * 6) + (s.naehmaschine * 7) + Math.random() * 40;
            const scoreB = (g.level * 10) + (g.praezision * 5) + (g.kreativitaet * 4) + (g.nadel * 8) + (g.schere * 6) + (g.naehmaschine * 7) + Math.random() * 40;

            const gewonnen = scoreA > scoreB;
            const preis = Math.floor(200 + s.level * 50 + g.level * 50);

            if (gewonnen) {
                db.updateBalance(uId, preis);
                db.db.prepare('UPDATE schneider SET duelle_gewonnen = duelle_gewonnen + 1 WHERE user_id = ?').run(uId);
                db.db.prepare('UPDATE schneider SET duelle_verloren = duelle_verloren + 1 WHERE user_id = ?').run(gegner.id);
            } else {
                db.updateBalance(gegner.id, preis);
                db.db.prepare('UPDATE schneider SET duelle_verloren = duelle_verloren + 1 WHERE user_id = ?').run(uId);
                db.db.prepare('UPDATE schneider SET duelle_gewonnen = duelle_gewonnen + 1 WHERE user_id = ?').run(gegner.id);
            }

            const embed = new EmbedBuilder()
                .setTitle('🏆 Mode-Duell')
                .setDescription(`🧵 **${interaction.user.username}** vs 🧵 **${gegner.username}**`)
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
