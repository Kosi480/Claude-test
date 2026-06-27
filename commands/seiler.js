const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const FASERN = [
    { name: 'Hanffaser', preis: 0, qualitaet: 1.0, emoji: '🌿' },
    { name: 'Jutefaser', preis: 1200, qualitaet: 1.2, emoji: '🟤' },
    { name: 'Sisalfaser', preis: 3000, qualitaet: 1.4, emoji: '🌾' },
    { name: 'Baumwollfaser', preis: 7000, qualitaet: 1.7, emoji: '☁️' },
    { name: 'Flachsfaser', preis: 15000, qualitaet: 2.0, emoji: '💛' },
    { name: 'Seidenfaser', preis: 32000, qualitaet: 2.4, emoji: '✨' },
    { name: 'Mithrilfaser', preis: 60000, qualitaet: 3.0, emoji: '⚡' },
    { name: 'Ätherfaser', preis: 110000, qualitaet: 3.8, emoji: '💫' }
];

const SEIL_TYPEN = [
    { name: 'Bindfaden', basisWert: 40, schwierigkeit: 1, minLevel: 1 },
    { name: 'Schnur', basisWert: 80, schwierigkeit: 1, minLevel: 1 },
    { name: 'Strick', basisWert: 180, schwierigkeit: 2, minLevel: 2 },
    { name: 'Tau', basisWert: 350, schwierigkeit: 3, minLevel: 4 },
    { name: 'Ankertau', basisWert: 700, schwierigkeit: 4, minLevel: 6 },
    { name: 'Kletterseil', basisWert: 1300, schwierigkeit: 5, minLevel: 8 },
    { name: 'Brückenseil', basisWert: 2800, schwierigkeit: 7, minLevel: 11 },
    { name: 'Himmelsseil', basisWert: 5500, schwierigkeit: 9, minLevel: 14 }
];

const KNOTEN = [
    { name: 'Kreuzknoten', bonus: 1.0, minLevel: 1 },
    { name: 'Palstek', bonus: 1.15, minLevel: 2 },
    { name: 'Webleinstek', bonus: 1.3, minLevel: 3 },
    { name: 'Achterknoten', bonus: 1.45, minLevel: 5 },
    { name: 'Türkischer Bund', bonus: 1.65, minLevel: 7 },
    { name: 'Affenfaust', bonus: 1.9, minLevel: 9 },
    { name: 'Diamantknoten', bonus: 2.3, minLevel: 12 },
    { name: 'Ewiger Knoten', bonus: 2.8, minLevel: 15 }
];

const QUALITAETEN = [
    { name: 'Ausgefranst', multi: 0.3, minRoll: 0 },
    { name: 'Locker', multi: 0.5, minRoll: 12 },
    { name: 'Brauchbar', multi: 0.8, minRoll: 26 },
    { name: 'Fest', multi: 1.0, minRoll: 42 },
    { name: 'Robust', multi: 1.5, minRoll: 58 },
    { name: 'Unzerreißbar', multi: 2.2, minRoll: 76 },
    { name: 'Legendär', multi: 3.5, minRoll: 93 }
];

const UPGRADES = {
    seilbahn: { name: 'Seilbahn', stufen: [0, 1500, 5000, 15000, 40000], bonus: [0, 0.1, 0.2, 0.35, 0.5] },
    spinnrad: { name: 'Spinnrad', stufen: [0, 2000, 6000, 18000, 45000], bonus: [0, 0.08, 0.18, 0.3, 0.45] },
    flechtbank: { name: 'Flechtbank', stufen: [0, 2500, 7000, 20000, 52000], bonus: [0, 0.1, 0.22, 0.36, 0.52] },
    werkstatt: { name: 'Seilerei', stufen: [0, 3000, 9000, 25000, 60000], bonus: [0, 1, 2, 3, 5] }
};

const SEIL_EVENTS = [
    { text: '✨ Perfekte Drehung! Die Fasern verzwirnen sich gleichmäßig.', qualMulti: 1.5, geldMulti: 1.0 },
    { text: '💥 Eine Faser bricht! Du musst neu ansetzen.', qualMulti: 0.5, geldMulti: 1.0 },
    { text: '⚓ Ein Kapitän sieht dein Seil und bestellt sofort!', qualMulti: 1.0, geldMulti: 2.5 },
    { text: '🌊 Das Seil wird mit Salzwasser getestet - es hält perfekt!', qualMulti: 1.4, geldMulti: 1.3 },
    { text: '🏔️ Ein Bergsteiger testet dein Seil und ist begeistert!', qualMulti: 1.3, geldMulti: 2.0 },
    { text: '💨 Wind trocknet die Fasern zu schnell! Qualität leidet.', qualMulti: 0.6, geldMulti: 0.9 },
    { text: '🌟 Die Fasern leuchten beim Flechten magisch auf!', qualMulti: 1.7, geldMulti: 1.5 }
];

const cooldowns = new Map();

function ensureSeilerTable(db) {
    db.db.exec(`CREATE TABLE IF NOT EXISTS seiler (
        user_id TEXT PRIMARY KEY,
        fasern TEXT DEFAULT '[]',
        knoten TEXT DEFAULT '[]',
        level INTEGER DEFAULT 1,
        xp INTEGER DEFAULT 0,
        seile_gefertigt INTEGER DEFAULT 0,
        beste_qualitaet TEXT DEFAULT '',
        gesamtverdienst INTEGER DEFAULT 0,
        seilbahn INTEGER DEFAULT 0,
        spinnrad INTEGER DEFAULT 0,
        flechtbank INTEGER DEFAULT 0,
        werkstatt INTEGER DEFAULT 0,
        drehtechnik INTEGER DEFAULT 0,
        knotenkunde INTEGER DEFAULT 0,
        faserkunde INTEGER DEFAULT 0,
        ausdauer INTEGER DEFAULT 0,
        trainings INTEGER DEFAULT 0,
        duelle_gewonnen INTEGER DEFAULT 0,
        duelle_verloren INTEGER DEFAULT 0,
        letztes_seilen INTEGER DEFAULT 0,
        letztes_training INTEGER DEFAULT 0
    )`);
    db.db.exec(`CREATE TABLE IF NOT EXISTS seiler_lager (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        seil_typ TEXT,
        faser TEXT,
        knoten TEXT,
        qualitaet TEXT,
        wert INTEGER,
        erstellt_am INTEGER DEFAULT 0
    )`);
}

function getSeiler(db, uId) {
    const row = db.db.prepare('SELECT * FROM seiler WHERE user_id = ?').get(uId);
    if (!row) {
        db.db.prepare('INSERT INTO seiler (user_id) VALUES (?)').run(uId);
        return db.db.prepare('SELECT * FROM seiler WHERE user_id = ?').get(uId);
    }
    return row;
}

function xpForLevel(l) { return l * l * 50; }

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
        db.db.prepare('UPDATE seiler SET level = ?, xp = ? WHERE user_id = ?').run(lvl, xp, uId);
    }
    return { lvl, ups };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('seiler')
        .setDescription('🪢 Seilerei - Drehe und flechte Seile aus feinsten Fasern!')
        .addSubcommand(s => s.setName('start').setDescription('Beginne deine Seiler-Karriere'))
        .addSubcommand(s => s.setName('status').setDescription('Zeige deinen Seiler-Status'))
        .addSubcommand(s => s.setName('fasern').setDescription('Zeige verfügbare Fasern'))
        .addSubcommand(s => s.setName('kaufen').setDescription('Kaufe eine neue Faser')
            .addStringOption(o => o.setName('faser').setDescription('Name der Faser').setRequired(true)))
        .addSubcommand(s => s.setName('flechten').setDescription('Flechte ein neues Seil')
            .addStringOption(o => o.setName('seil').setDescription('Seiltyp').setRequired(true))
            .addStringOption(o => o.setName('faser').setDescription('Faserart').setRequired(true))
            .addStringOption(o => o.setName('knoten').setDescription('Knotentechnik').setRequired(true)))
        .addSubcommand(s => s.setName('training').setDescription('Trainiere deine Seiler-Fähigkeiten')
            .addStringOption(o => o.setName('typ').setDescription('Trainingstyp (drehtechnik/knotenkunde/faserkunde/ausdauer)').setRequired(true)))
        .addSubcommand(s => s.setName('upgrade').setDescription('Verbessere deine Ausrüstung')
            .addStringOption(o => o.setName('item').setDescription('Ausrüstung (seilbahn/spinnrad/flechtbank/werkstatt)').setRequired(true)))
        .addSubcommand(s => s.setName('lager').setDescription('Zeige dein Seillager'))
        .addSubcommand(s => s.setName('auftrag').setDescription('Nimm einen Seilerauftrag an'))
        .addSubcommand(s => s.setName('duell').setDescription('Fordere einen anderen Seiler heraus')
            .addUserOption(o => o.setName('gegner').setDescription('Dein Gegner').setRequired(true))),

    async execute(interaction) {
        const db = interaction.client.db;
        const config = require('../config.json');
        ensureSeilerTable(db);
        const uId = interaction.user.id;
        const sub = interaction.options.getSubcommand();

        if (sub === 'start') {
            const existing = db.db.prepare('SELECT * FROM seiler WHERE user_id = ?').get(uId);
            if (existing && existing.fasern !== '[]') {
                return interaction.reply({ content: '❌ Du bist bereits ein Seiler!', ephemeral: true });
            }
            db.db.prepare('INSERT OR REPLACE INTO seiler (user_id, fasern, knoten) VALUES (?, ?, ?)').run(
                uId, JSON.stringify([FASERN[0].name]), JSON.stringify([KNOTEN[0].name])
            );

            const embed = new EmbedBuilder()
                .setTitle('🪢 Willkommen in der Seilerei!')
                .setDescription(`Du erhältst **${FASERN[0].name}** ${FASERN[0].emoji} und lernst den **${KNOTEN[0].name}**!`)
                .addFields(
                    { name: '🌿 Faser', value: FASERN[0].name, inline: true },
                    { name: '🪢 Knoten', value: KNOTEN[0].name, inline: true },
                    { name: '💡 Nächster Schritt', value: 'Nutze `/seiler flechten` um dein erstes Seil zu flechten!' }
                )
                .setColor(0xD2691E);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'status') {
            const s = getSeiler(db, uId);
            if (s.fasern === '[]') return interaction.reply({ content: '❌ Nutze `/seiler start` um zu beginnen!', ephemeral: true });
            const fasern = JSON.parse(s.fasern);
            const knoten = JSON.parse(s.knoten);
            const xpNeeded = xpForLevel(s.level);

            const embed = new EmbedBuilder()
                .setTitle(`🪢 Seiler ${interaction.user.username}`)
                .addFields(
                    { name: '📊 Level', value: `${s.level} (${s.xp}/${xpNeeded} XP)`, inline: true },
                    { name: '🪢 Gefertigt', value: `${s.seile_gefertigt} Seile`, inline: true },
                    { name: '💰 Verdienst', value: `${s.gesamtverdienst} Münzen`, inline: true },
                    { name: '🏆 Beste Qualität', value: s.beste_qualitaet || 'Keine', inline: true },
                    { name: '🔄 Seilbahn', value: `Stufe ${s.seilbahn}`, inline: true },
                    { name: '🌀 Spinnrad', value: `Stufe ${s.spinnrad}`, inline: true },
                    { name: '📏 Flechtbank', value: `Stufe ${s.flechtbank}`, inline: true },
                    { name: '🏠 Seilerei', value: `Stufe ${s.werkstatt}`, inline: true },
                    { name: '🌿 Fasern', value: `${fasern.length}`, inline: true },
                    { name: '🪢 Knoten', value: `${knoten.length}`, inline: true },
                    { name: '🏆 Duelle', value: `${s.duelle_gewonnen}W / ${s.duelle_verloren}L`, inline: true }
                )
                .setColor(0xD2691E);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'fasern') {
            const s = getSeiler(db, uId);
            const besitz = s.fasern !== '[]' ? JSON.parse(s.fasern) : [];
            const lines = FASERN.map(f => {
                const owned = besitz.includes(f.name) ? ' ✅' : '';
                return `${f.emoji} **${f.name}** - ${f.preis > 0 ? `${f.preis} Münzen` : 'Starter'} | Qualität: x${f.qualitaet}${owned}`;
            });
            const embed = new EmbedBuilder()
                .setTitle('🌿 Verfügbare Fasern')
                .setDescription(lines.join('\n'))
                .setColor(0xD2691E);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'kaufen') {
            const s = getSeiler(db, uId);
            if (s.fasern === '[]') return interaction.reply({ content: '❌ Nutze `/seiler start` um zu beginnen!', ephemeral: true });

            const faserName = interaction.options.getString('faser');
            const faser = FASERN.find(f => f.name.toLowerCase() === faserName.toLowerCase());
            if (!faser) return interaction.reply({ content: '❌ Unbekannte Faser!', ephemeral: true });

            const fasern = JSON.parse(s.fasern);
            if (fasern.includes(faser.name)) return interaction.reply({ content: '❌ Du besitzt diese Faser bereits!', ephemeral: true });

            const user = db.getUser(uId);
            if (user.balance < faser.preis) return interaction.reply({ content: `❌ Du brauchst ${faser.preis} Münzen! (Hast: ${user.balance})`, ephemeral: true });

            db.updateBalance(uId, -faser.preis);
            fasern.push(faser.name);
            db.db.prepare('UPDATE seiler SET fasern = ? WHERE user_id = ?').run(JSON.stringify(fasern), uId);

            const embed = new EmbedBuilder()
                .setTitle('🌿 Neue Faser!')
                .setDescription(`Du hast **${faser.name}** ${faser.emoji} für **${faser.preis} Münzen** erworben!`)
                .addFields({ name: '📊 Qualitätsbonus', value: `x${faser.qualitaet}`, inline: true })
                .setColor(0x00FF00);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'flechten') {
            const s = getSeiler(db, uId);
            if (s.fasern === '[]') return interaction.reply({ content: '❌ Nutze `/seiler start` um zu beginnen!', ephemeral: true });

            const cdKey = `seiler_${uId}`;
            const cdTime = cooldowns.get(cdKey);
            if (cdTime && Date.now() - cdTime < 45000) {
                const rest = Math.ceil((45000 - (Date.now() - cdTime)) / 1000);
                return interaction.reply({ content: `⏳ Das Seil wird noch gedreht! Warte noch ${rest}s.`, ephemeral: true });
            }

            const seilName = interaction.options.getString('seil');
            const faserName = interaction.options.getString('faser');
            const knotenName = interaction.options.getString('knoten');

            const seil = SEIL_TYPEN.find(st => st.name.toLowerCase() === seilName.toLowerCase());
            if (!seil) return interaction.reply({ content: `❌ Unbekannter Seiltyp! Verfügbar: ${SEIL_TYPEN.map(st => st.name).join(', ')}`, ephemeral: true });
            if (s.level < seil.minLevel) return interaction.reply({ content: `❌ Du brauchst Level ${seil.minLevel} für ${seil.name}!`, ephemeral: true });

            const faser = FASERN.find(f => f.name.toLowerCase() === faserName.toLowerCase());
            if (!faser) return interaction.reply({ content: '❌ Unbekannte Faser!', ephemeral: true });
            const fasern = JSON.parse(s.fasern);
            if (!fasern.includes(faser.name)) return interaction.reply({ content: '❌ Du besitzt diese Faser nicht!', ephemeral: true });

            const knoten = KNOTEN.find(k => k.name.toLowerCase() === knotenName.toLowerCase());
            if (!knoten) return interaction.reply({ content: `❌ Unbekannter Knoten! Verfügbar: ${KNOTEN.map(k => k.name).join(', ')}`, ephemeral: true });

            const knotenList = JSON.parse(s.knoten);
            if (!knotenList.includes(knoten.name)) {
                if (s.level < knoten.minLevel) return interaction.reply({ content: `❌ Du brauchst Level ${knoten.minLevel} für ${knoten.name}!`, ephemeral: true });
                knotenList.push(knoten.name);
                db.db.prepare('UPDATE seiler SET knoten = ? WHERE user_id = ?').run(JSON.stringify(knotenList), uId);
            }

            cooldowns.set(cdKey, Date.now());

            const seilbahnBonus = UPGRADES.seilbahn.bonus[s.seilbahn];
            const spinnradBonus = UPGRADES.spinnrad.bonus[s.spinnrad];
            const flechtBonus = UPGRADES.flechtbank.bonus[s.flechtbank];
            const drehBonus = s.drehtechnik * 0.02;
            const knotenBonus = s.knotenkunde * 0.018;

            let qualRoll = Math.random() * 100;
            qualRoll += (seilbahnBonus + spinnradBonus + flechtBonus + drehBonus + knotenBonus) * 28;
            qualRoll *= faser.qualitaet * knoten.bonus / seil.schwierigkeit;

            let event = null;
            if (Math.random() < 0.2) {
                event = SEIL_EVENTS[Math.floor(Math.random() * SEIL_EVENTS.length)];
                qualRoll *= event.qualMulti;
            }

            qualRoll = Math.min(100, qualRoll);
            let qualitaet = QUALITAETEN[0];
            for (const q of QUALITAETEN) {
                if (qualRoll >= q.minRoll) qualitaet = q;
            }

            let wert = Math.floor(seil.basisWert * qualitaet.multi * faser.qualitaet * knoten.bonus * (1 + flechtBonus));
            if (event) wert = Math.floor(wert * event.geldMulti);

            db.updateBalance(uId, wert);
            const xpGain = 12 + Math.floor(seil.schwierigkeit * 5) + Math.floor(wert / 50);

            db.db.prepare('INSERT INTO seiler_lager (user_id, seil_typ, faser, knoten, qualitaet, wert, erstellt_am) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
                uId, seil.name, faser.name, knoten.name, qualitaet.name, wert, Date.now()
            );

            const besteQ = QUALITAETEN.indexOf(qualitaet) > QUALITAETEN.findIndex(q => q.name === s.beste_qualitaet) ? qualitaet.name : (s.beste_qualitaet || qualitaet.name);
            db.db.prepare('UPDATE seiler SET seile_gefertigt = seile_gefertigt + 1, gesamtverdienst = gesamtverdienst + ?, xp = xp + ?, beste_qualitaet = ?, letztes_seilen = ? WHERE user_id = ?').run(
                wert, xpGain, besteQ, Date.now(), uId
            );

            const updatedS = getSeiler(db, uId);
            const levelUp = checkLevelUp(db, uId, updatedS);

            const embed = new EmbedBuilder()
                .setTitle(`🪢 ${seil.name} geflochten!`)
                .setDescription(`Du hast ein **${qualitaet.name}es** ${seil.name} aus **${faser.name}** ${faser.emoji} mit **${knoten.name}** geflochten!`)
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
            const s = getSeiler(db, uId);
            if (s.fasern === '[]') return interaction.reply({ content: '❌ Nutze `/seiler start` um zu beginnen!', ephemeral: true });

            const cdKey = `seiler_train_${uId}`;
            const cdTime = cooldowns.get(cdKey);
            if (cdTime && Date.now() - cdTime < 60000) {
                const rest = Math.ceil((60000 - (Date.now() - cdTime)) / 1000);
                return interaction.reply({ content: `⏳ Deine Hände sind wund! Warte noch ${rest}s.`, ephemeral: true });
            }

            const typ = interaction.options.getString('typ').toLowerCase();
            const validTypes = ['drehtechnik', 'knotenkunde', 'faserkunde', 'ausdauer'];
            if (!validTypes.includes(typ)) return interaction.reply({ content: `❌ Unbekanntes Training! Verfügbar: ${validTypes.join(', ')}`, ephemeral: true });

            cooldowns.set(cdKey, Date.now());
            const xpGain = 12 + Math.floor(s.level * 2);
            const newVal = s[typ] + 1;

            db.db.prepare(`UPDATE seiler SET ${typ} = ?, trainings = trainings + 1, xp = xp + ?, letztes_training = ? WHERE user_id = ?`).run(
                newVal, xpGain, Date.now(), uId
            );

            const updatedS = getSeiler(db, uId);
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
            const s = getSeiler(db, uId);
            if (s.fasern === '[]') return interaction.reply({ content: '❌ Nutze `/seiler start` um zu beginnen!', ephemeral: true });

            const item = interaction.options.getString('item').toLowerCase();
            const upg = UPGRADES[item];
            if (!upg) return interaction.reply({ content: `❌ Unbekanntes Upgrade! Verfügbar: ${Object.keys(UPGRADES).join(', ')}`, ephemeral: true });

            const currentLvl = s[item];
            if (currentLvl >= 4) return interaction.reply({ content: `❌ ${upg.name} ist bereits auf Maximum (Stufe 4)!`, ephemeral: true });

            const kosten = upg.stufen[currentLvl + 1];
            const user = db.getUser(uId);
            if (user.balance < kosten) return interaction.reply({ content: `❌ Du brauchst ${kosten} Münzen! (Hast: ${user.balance})`, ephemeral: true });

            db.updateBalance(uId, -kosten);
            db.db.prepare(`UPDATE seiler SET ${item} = ? WHERE user_id = ?`).run(currentLvl + 1, uId);

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
            const s = getSeiler(db, uId);
            if (s.fasern === '[]') return interaction.reply({ content: '❌ Nutze `/seiler start` um zu beginnen!', ephemeral: true });

            const werke = db.db.prepare('SELECT * FROM seiler_lager WHERE user_id = ? ORDER BY wert DESC LIMIT 10').all(uId);

            if (werke.length === 0) {
                return interaction.reply({ content: '🪢 Dein Lager ist noch leer. Flechte dein erstes Seil!', ephemeral: true });
            }

            const total = db.db.prepare('SELECT COUNT(*) as cnt, SUM(wert) as total FROM seiler_lager WHERE user_id = ?').get(uId);
            const lines = werke.map((w, i) => `${i + 1}. **${w.seil_typ}** (${w.faser}/${w.knoten}) - ${w.qualitaet} - ${w.wert} Münzen`);

            const embed = new EmbedBuilder()
                .setTitle('🪢 Seillager')
                .setDescription(lines.join('\n'))
                .addFields(
                    { name: '📊 Gesamt', value: `${total.cnt} Seile`, inline: true },
                    { name: '💰 Gesamtwert', value: `${total.total} Münzen`, inline: true }
                )
                .setColor(0xD2691E);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'auftrag') {
            const s = getSeiler(db, uId);
            if (s.fasern === '[]') return interaction.reply({ content: '❌ Nutze `/seiler start` um zu beginnen!', ephemeral: true });

            const cdKey = `seiler_auftrag_${uId}`;
            const cdTime = cooldowns.get(cdKey);
            if (cdTime && Date.now() - cdTime < 120000) {
                const rest = Math.ceil((120000 - (Date.now() - cdTime)) / 1000);
                return interaction.reply({ content: `⏳ Kein neuer Auftrag verfügbar! Warte noch ${rest}s.`, ephemeral: true });
            }

            cooldowns.set(cdKey, Date.now());
            const auftraege = [
                { kunde: 'Fischer', seil: 'Schnur', belohnung: 200 + s.level * 35 },
                { kunde: 'Bauer', seil: 'Strick', belohnung: 350 + s.level * 55 },
                { kunde: 'Kapitän', seil: 'Ankertau', belohnung: 700 + s.level * 90 },
                { kunde: 'Bergführer', seil: 'Kletterseil', belohnung: 1100 + s.level * 120 },
                { kunde: 'Architekt', seil: 'Brückenseil', belohnung: 2000 + s.level * 180 },
                { kunde: 'Himmelsturm', seil: 'Himmelsseil', belohnung: 3500 + s.level * 250 }
            ];

            const auftrag = auftraege[Math.floor(Math.random() * Math.min(auftraege.length, 2 + Math.floor(s.level / 2)))];
            const qualBonus = 1.0 + s.drehtechnik * 0.03 + s.knotenkunde * 0.025;
            const verdienst = Math.floor(auftrag.belohnung * qualBonus);

            db.updateBalance(uId, verdienst);
            const xpGain = 18 + Math.floor(verdienst / 30);
            db.db.prepare('UPDATE seiler SET seile_gefertigt = seile_gefertigt + 1, gesamtverdienst = gesamtverdienst + ?, xp = xp + ? WHERE user_id = ?').run(verdienst, xpGain, uId);

            const updatedS = getSeiler(db, uId);
            const levelUp = checkLevelUp(db, uId, updatedS);

            const embed = new EmbedBuilder()
                .setTitle('📋 Seilerauftrag abgeschlossen!')
                .setDescription(`Der **${auftrag.kunde}** hat dich beauftragt, ein **${auftrag.seil}** zu flechten.`)
                .addFields(
                    { name: '💰 Belohnung', value: `${verdienst} Münzen`, inline: true },
                    { name: '⭐ XP', value: `+${xpGain}`, inline: true }
                )
                .setColor(0x00FF00);

            if (levelUp.ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${levelUp.lvl}!` });

            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'duell') {
            const s = getSeiler(db, uId);
            if (s.fasern === '[]') return interaction.reply({ content: '❌ Nutze `/seiler start` um zu beginnen!', ephemeral: true });
            if (s.level < 3) return interaction.reply({ content: '❌ Du brauchst Level 3 für Duelle!', ephemeral: true });

            const gegner = interaction.options.getUser('gegner');
            if (gegner.id === uId) return interaction.reply({ content: '❌ Du kannst dich nicht selbst herausfordern!', ephemeral: true });
            if (gegner.bot) return interaction.reply({ content: '❌ Du kannst keinen Bot herausfordern!', ephemeral: true });

            const g = db.db.prepare('SELECT * FROM seiler WHERE user_id = ?').get(gegner.id);
            if (!g || g.fasern === '[]') return interaction.reply({ content: '❌ Dein Gegner ist kein Seiler!', ephemeral: true });

            const scoreA = (s.level * 10) + (s.drehtechnik * 5) + (s.knotenkunde * 4) + (s.seilbahn * 8) + (s.spinnrad * 6) + (s.flechtbank * 7) + Math.random() * 40;
            const scoreB = (g.level * 10) + (g.drehtechnik * 5) + (g.knotenkunde * 4) + (g.seilbahn * 8) + (g.spinnrad * 6) + (g.flechtbank * 7) + Math.random() * 40;

            const gewonnen = scoreA > scoreB;
            const preis = Math.floor(200 + s.level * 50 + g.level * 50);

            if (gewonnen) {
                db.updateBalance(uId, preis);
                db.db.prepare('UPDATE seiler SET duelle_gewonnen = duelle_gewonnen + 1 WHERE user_id = ?').run(uId);
                db.db.prepare('UPDATE seiler SET duelle_verloren = duelle_verloren + 1 WHERE user_id = ?').run(gegner.id);
            } else {
                db.updateBalance(gegner.id, preis);
                db.db.prepare('UPDATE seiler SET duelle_verloren = duelle_verloren + 1 WHERE user_id = ?').run(uId);
                db.db.prepare('UPDATE seiler SET duelle_gewonnen = duelle_gewonnen + 1 WHERE user_id = ?').run(gegner.id);
            }

            const embed = new EmbedBuilder()
                .setTitle('🏆 Seiler-Duell')
                .setDescription(`🪢 **${interaction.user.username}** vs 🪢 **${gegner.username}**`)
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
