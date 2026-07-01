const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const GETREIDE = [
    { name: 'Gerste', preis: 0, qualitaet: 1.0, emoji: '🌾' },
    { name: 'Weizen', preis: 1600, qualitaet: 1.2, emoji: '🌿' },
    { name: 'Roggen', preis: 3700, qualitaet: 1.4, emoji: '🌱' },
    { name: 'Dinkel', preis: 8400, qualitaet: 1.7, emoji: '🌾' },
    { name: 'Hafer', preis: 18500, qualitaet: 2.0, emoji: '🍃' },
    { name: 'Elfenkorn', preis: 36000, qualitaet: 2.5, emoji: '✨' },
    { name: 'Mondweizen', preis: 67000, qualitaet: 3.1, emoji: '🌙' },
    { name: 'Ätherkorn', preis: 117000, qualitaet: 3.9, emoji: '💫' }
];

const BIERSORTEN = [
    { name: 'Dünnbier', basisWert: 50, schwierigkeit: 1, minLevel: 1 },
    { name: 'Helles', basisWert: 105, schwierigkeit: 1, minLevel: 1 },
    { name: 'Dunkles', basisWert: 220, schwierigkeit: 2, minLevel: 2 },
    { name: 'Weizenbier', basisWert: 450, schwierigkeit: 3, minLevel: 4 },
    { name: 'Bockbier', basisWert: 840, schwierigkeit: 4, minLevel: 6 },
    { name: 'Rauchbier', basisWert: 1480, schwierigkeit: 5, minLevel: 8 },
    { name: 'Elfengebräu', basisWert: 2950, schwierigkeit: 7, minLevel: 11 },
    { name: 'Legendäres Götterbier', basisWert: 5700, schwierigkeit: 9, minLevel: 14 }
];

const HOPFEN = [
    { name: 'Bitterhopfen', bonus: 1.0, minLevel: 1 },
    { name: 'Aromahopfen', bonus: 1.15, minLevel: 2 },
    { name: 'Edelhopfen', bonus: 1.3, minLevel: 3 },
    { name: 'Wildhopfen', bonus: 1.5, minLevel: 5 },
    { name: 'Goldhopfen', bonus: 1.7, minLevel: 7 },
    { name: 'Berghopfen', bonus: 1.9, minLevel: 9 },
    { name: 'Elfenhopfen', bonus: 2.3, minLevel: 12 },
    { name: 'Ätherhopfen', bonus: 2.8, minLevel: 15 }
];

const QUALITAETEN = [
    { name: 'Sauer', multi: 0.3, minRoll: 0 },
    { name: 'Schal', multi: 0.5, minRoll: 12 },
    { name: 'Brauchbar', multi: 0.8, minRoll: 26 },
    { name: 'Würzig', multi: 1.0, minRoll: 42 },
    { name: 'Vollmundig', multi: 1.5, minRoll: 58 },
    { name: 'Prächtig', multi: 2.2, minRoll: 76 },
    { name: 'Meisterhaft', multi: 3.5, minRoll: 93 }
];

const UPGRADES = {
    braukessel: { name: 'Braukessel', stufen: [0, 1500, 5000, 15000, 40000], bonus: [0, 0.1, 0.2, 0.35, 0.5] },
    gaertank: { name: 'Gärtank', stufen: [0, 2000, 6000, 18000, 45000], bonus: [0, 0.08, 0.18, 0.3, 0.45] },
    keller: { name: 'Reifekeller', stufen: [0, 2500, 7000, 20000, 52000], bonus: [0, 0.1, 0.22, 0.36, 0.52] },
    werkstatt: { name: 'Brauerei', stufen: [0, 3000, 9000, 25000, 60000], bonus: [0, 1, 2, 3, 5] }
};

const BRAU_EVENTS = [
    { text: '✨ Perfekte Gärung! Das Bier prickelt wunderbar!', qualMulti: 1.5, geldMulti: 1.0 },
    { text: '🦠 Wildhefe verdirbt die Gärung! Rettungsversuch!', qualMulti: 0.5, geldMulti: 1.0 },
    { text: '🌿 Seltener Hopfen steigert das Aroma enorm!', qualMulti: 1.4, geldMulti: 1.3 },
    { text: '👑 Der König bestellt das gesamte Fass für sein Fest!', qualMulti: 1.0, geldMulti: 2.5 },
    { text: '🌡️ Ideale Gärtemperatur — das Bier reift perfekt!', qualMulti: 1.6, geldMulti: 1.2 },
    { text: '💥 Das Fass platzt! Schnell handeln!', qualMulti: 0.6, geldMulti: 0.8 },
    { text: '🔮 Magische Kristalle im Wasser — außergewöhnlicher Geschmack!', qualMulti: 1.7, geldMulti: 1.5 }
];

const cooldowns = new Map();

function ensureBierbrauerTable(db) {
    db.db.exec(`CREATE TABLE IF NOT EXISTS bierbrauer (
        user_id TEXT PRIMARY KEY,
        getreide TEXT DEFAULT '[]',
        hopfen TEXT DEFAULT '[]',
        level INTEGER DEFAULT 1,
        xp INTEGER DEFAULT 0,
        faesser_gebraut INTEGER DEFAULT 0,
        beste_qualitaet TEXT DEFAULT '',
        gesamtverdienst INTEGER DEFAULT 0,
        braukessel INTEGER DEFAULT 0,
        gaertank INTEGER DEFAULT 0,
        keller INTEGER DEFAULT 0,
        werkstatt INTEGER DEFAULT 0,
        braukunst INTEGER DEFAULT 0,
        gaerung INTEGER DEFAULT 0,
        malzkunde INTEGER DEFAULT 0,
        ausdauer INTEGER DEFAULT 0,
        trainings INTEGER DEFAULT 0,
        duelle_gewonnen INTEGER DEFAULT 0,
        duelle_verloren INTEGER DEFAULT 0,
        letztes_brauen INTEGER DEFAULT 0,
        letztes_training INTEGER DEFAULT 0
    )`);
    db.db.exec(`CREATE TABLE IF NOT EXISTS bierbrauer_keller (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        bier_typ TEXT,
        getreide TEXT,
        hopfen TEXT,
        qualitaet TEXT,
        wert INTEGER,
        erstellt_am INTEGER DEFAULT 0
    )`);
}

function getBierbrauer(db, uId) {
    const row = db.db.prepare('SELECT * FROM bierbrauer WHERE user_id = ?').get(uId);
    if (!row) {
        db.db.prepare('INSERT INTO bierbrauer (user_id) VALUES (?)').run(uId);
        return db.db.prepare('SELECT * FROM bierbrauer WHERE user_id = ?').get(uId);
    }
    return row;
}

function xpForLevel(l) { return l * l * 50; }

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
        db.db.prepare('UPDATE bierbrauer SET level = ?, xp = ? WHERE user_id = ?').run(lvl, xp, uId);
    }
    return { lvl, ups };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bierbrauer')
        .setDescription('🍺 Brauerei - Braue köstliches Bier aus edlem Getreide!')
        .addSubcommand(s => s.setName('start').setDescription('Beginne deine Brauer-Karriere'))
        .addSubcommand(s => s.setName('status').setDescription('Zeige deinen Brauer-Status'))
        .addSubcommand(s => s.setName('getreide').setDescription('Zeige verfügbares Getreide'))
        .addSubcommand(s => s.setName('kaufen').setDescription('Kaufe neues Getreide')
            .addStringOption(o => o.setName('getreide').setDescription('Name des Getreides').setRequired(true)))
        .addSubcommand(s => s.setName('brauen').setDescription('Braue ein Bier')
            .addStringOption(o => o.setName('biersorte').setDescription('Biersorte').setRequired(true))
            .addStringOption(o => o.setName('getreide').setDescription('Getreidesorte').setRequired(true))
            .addStringOption(o => o.setName('hopfen').setDescription('Hopfensorte').setRequired(true)))
        .addSubcommand(s => s.setName('training').setDescription('Trainiere deine Brauer-Fähigkeiten')
            .addStringOption(o => o.setName('typ').setDescription('Trainingstyp (braukunst/gaerung/malzkunde/ausdauer)').setRequired(true)))
        .addSubcommand(s => s.setName('upgrade').setDescription('Verbessere deine Ausrüstung')
            .addStringOption(o => o.setName('item').setDescription('Ausrüstung (braukessel/gaertank/keller/werkstatt)').setRequired(true)))
        .addSubcommand(s => s.setName('bierkeller').setDescription('Zeige deinen Bierkeller'))
        .addSubcommand(s => s.setName('auftrag').setDescription('Nimm einen Brauauftrag an'))
        .addSubcommand(s => s.setName('duell').setDescription('Fordere einen anderen Brauer heraus')
            .addUserOption(o => o.setName('gegner').setDescription('Dein Gegner').setRequired(true))),

    async execute(interaction) {
        const db = interaction.client.db;
        const config = require('../config.json');
        ensureBierbrauerTable(db);
        const uId = interaction.user.id;
        const sub = interaction.options.getSubcommand();

        if (sub === 'start') {
            const existing = db.db.prepare('SELECT * FROM bierbrauer WHERE user_id = ?').get(uId);
            if (existing && existing.getreide !== '[]') {
                return interaction.reply({ content: '❌ Du bist bereits ein Brauer!', ephemeral: true });
            }
            db.db.prepare('INSERT OR REPLACE INTO bierbrauer (user_id, getreide, hopfen) VALUES (?, ?, ?)').run(
                uId, JSON.stringify([GETREIDE[0].name]), JSON.stringify([HOPFEN[0].name])
            );

            const embed = new EmbedBuilder()
                .setTitle('🍺 Willkommen in der Brauerei!')
                .setDescription(`Du erhältst **${GETREIDE[0].name}** ${GETREIDE[0].emoji} und lernst den **${HOPFEN[0].name}**!`)
                .addFields(
                    { name: '🌾 Getreide', value: GETREIDE[0].name, inline: true },
                    { name: '🌿 Hopfen', value: HOPFEN[0].name, inline: true },
                    { name: '💡 Nächster Schritt', value: 'Nutze `/bierbrauer brauen` um dein erstes Bier zu brauen!' }
                )
                .setColor(0xD2691E);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'status') {
            const b = getBierbrauer(db, uId);
            if (b.getreide === '[]') return interaction.reply({ content: '❌ Nutze `/bierbrauer start` um zu beginnen!', ephemeral: true });
            const getreide = JSON.parse(b.getreide);
            const hopfen = JSON.parse(b.hopfen);
            const xpNeeded = xpForLevel(b.level);

            const embed = new EmbedBuilder()
                .setTitle(`🍺 Brauer ${interaction.user.username}`)
                .addFields(
                    { name: '📊 Level', value: `${b.level} (${b.xp}/${xpNeeded} XP)`, inline: true },
                    { name: '🍺 Gebraut', value: `${b.faesser_gebraut} Fässer`, inline: true },
                    { name: '💰 Verdienst', value: `${b.gesamtverdienst} Münzen`, inline: true },
                    { name: '🏆 Beste Qualität', value: b.beste_qualitaet || 'Keine', inline: true },
                    { name: '🔥 Braukessel', value: `Stufe ${b.braukessel}`, inline: true },
                    { name: '🧪 Gärtank', value: `Stufe ${b.gaertank}`, inline: true },
                    { name: '🏚️ Keller', value: `Stufe ${b.keller}`, inline: true },
                    { name: '🏠 Brauerei', value: `Stufe ${b.werkstatt}`, inline: true },
                    { name: '🌾 Getreide', value: `${getreide.length}`, inline: true },
                    { name: '🌿 Hopfen', value: `${hopfen.length}`, inline: true },
                    { name: '🏆 Duelle', value: `${b.duelle_gewonnen}W / ${b.duelle_verloren}L`, inline: true }
                )
                .setColor(0xD2691E);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'getreide') {
            const b = getBierbrauer(db, uId);
            const besitz = b.getreide !== '[]' ? JSON.parse(b.getreide) : [];
            const lines = GETREIDE.map(g => {
                const owned = besitz.includes(g.name) ? ' ✅' : '';
                return `${g.emoji} **${g.name}** - ${g.preis > 0 ? `${g.preis} Münzen` : 'Starter'} | Qualität: x${g.qualitaet}${owned}`;
            });
            const embed = new EmbedBuilder()
                .setTitle('🌾 Verfügbares Getreide')
                .setDescription(lines.join('\n'))
                .setColor(0xD2691E);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'kaufen') {
            const b = getBierbrauer(db, uId);
            if (b.getreide === '[]') return interaction.reply({ content: '❌ Nutze `/bierbrauer start` um zu beginnen!', ephemeral: true });

            const getreideName = interaction.options.getString('getreide');
            const getreide = GETREIDE.find(g => g.name.toLowerCase() === getreideName.toLowerCase());
            if (!getreide) return interaction.reply({ content: '❌ Unbekanntes Getreide!', ephemeral: true });

            const besitz = JSON.parse(b.getreide);
            if (besitz.includes(getreide.name)) return interaction.reply({ content: '❌ Du besitzt dieses Getreide bereits!', ephemeral: true });

            const user = db.getUser(uId);
            if (user.balance < getreide.preis) return interaction.reply({ content: `❌ Du brauchst ${getreide.preis} Münzen! (Hast: ${user.balance})`, ephemeral: true });

            db.updateBalance(uId, -getreide.preis);
            besitz.push(getreide.name);
            db.db.prepare('UPDATE bierbrauer SET getreide = ? WHERE user_id = ?').run(JSON.stringify(besitz), uId);

            const embed = new EmbedBuilder()
                .setTitle('🌾 Neues Getreide!')
                .setDescription(`Du hast **${getreide.name}** ${getreide.emoji} für **${getreide.preis} Münzen** erworben!`)
                .addFields({ name: '📊 Qualitätsbonus', value: `x${getreide.qualitaet}`, inline: true })
                .setColor(0x00FF00);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'brauen') {
            const b = getBierbrauer(db, uId);
            if (b.getreide === '[]') return interaction.reply({ content: '❌ Nutze `/bierbrauer start` um zu beginnen!', ephemeral: true });

            const cdKey = `bierbrauer_${uId}`;
            const cdTime = cooldowns.get(cdKey);
            if (cdTime && Date.now() - cdTime < 55000) {
                const rest = Math.ceil((55000 - (Date.now() - cdTime)) / 1000);
                return interaction.reply({ content: `⏳ Das Bier muss noch gären! Warte noch ${rest}s.`, ephemeral: true });
            }

            const biersorteName = interaction.options.getString('biersorte');
            const getreideName = interaction.options.getString('getreide');
            const hopfenName = interaction.options.getString('hopfen');

            const biersorte = BIERSORTEN.find(p => p.name.toLowerCase() === biersorteName.toLowerCase());
            if (!biersorte) return interaction.reply({ content: `❌ Unbekannte Biersorte! Verfügbar: ${BIERSORTEN.map(p => p.name).join(', ')}`, ephemeral: true });
            if (b.level < biersorte.minLevel) return interaction.reply({ content: `❌ Du brauchst Level ${biersorte.minLevel} für ${biersorte.name}!`, ephemeral: true });

            const getreide = GETREIDE.find(g => g.name.toLowerCase() === getreideName.toLowerCase());
            if (!getreide) return interaction.reply({ content: '❌ Unbekanntes Getreide!', ephemeral: true });
            const besitz = JSON.parse(b.getreide);
            if (!besitz.includes(getreide.name)) return interaction.reply({ content: '❌ Du besitzt dieses Getreide nicht!', ephemeral: true });

            const hopfen = HOPFEN.find(h => h.name.toLowerCase() === hopfenName.toLowerCase());
            if (!hopfen) return interaction.reply({ content: `❌ Unbekannter Hopfen! Verfügbar: ${HOPFEN.map(h => h.name).join(', ')}`, ephemeral: true });

            const hopfenBesitz = JSON.parse(b.hopfen);
            if (!hopfenBesitz.includes(hopfen.name)) {
                if (b.level < hopfen.minLevel) return interaction.reply({ content: `❌ Du brauchst Level ${hopfen.minLevel} für ${hopfen.name}!`, ephemeral: true });
                hopfenBesitz.push(hopfen.name);
                db.db.prepare('UPDATE bierbrauer SET hopfen = ? WHERE user_id = ?').run(JSON.stringify(hopfenBesitz), uId);
            }

            cooldowns.set(cdKey, Date.now());

            const kesselBonus = UPGRADES.braukessel.bonus[b.braukessel];
            const gaerBonus = UPGRADES.gaertank.bonus[b.gaertank];
            const kellerBonus = UPGRADES.keller.bonus[b.keller];
            const brauBonus = b.braukunst * 0.02;
            const gaerungBonus = b.gaerung * 0.018;

            let qualRoll = Math.random() * 100;
            qualRoll += (kesselBonus + gaerBonus + kellerBonus + brauBonus + gaerungBonus) * 28;
            qualRoll *= getreide.qualitaet * hopfen.bonus / biersorte.schwierigkeit;

            let event = null;
            if (Math.random() < 0.2) {
                event = BRAU_EVENTS[Math.floor(Math.random() * BRAU_EVENTS.length)];
                qualRoll *= event.qualMulti;
            }

            qualRoll = Math.min(100, qualRoll);
            let qualitaet = QUALITAETEN[0];
            for (const q of QUALITAETEN) {
                if (qualRoll >= q.minRoll) qualitaet = q;
            }

            let wert = Math.floor(biersorte.basisWert * qualitaet.multi * getreide.qualitaet * hopfen.bonus * (1 + kellerBonus));
            if (event) wert = Math.floor(wert * event.geldMulti);

            db.updateBalance(uId, wert);
            const xpGain = 13 + Math.floor(biersorte.schwierigkeit * 5) + Math.floor(wert / 50);

            db.db.prepare('INSERT INTO bierbrauer_keller (user_id, bier_typ, getreide, hopfen, qualitaet, wert, erstellt_am) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
                uId, biersorte.name, getreide.name, hopfen.name, qualitaet.name, wert, Date.now()
            );

            const besteQ = QUALITAETEN.indexOf(qualitaet) > QUALITAETEN.findIndex(q => q.name === b.beste_qualitaet) ? qualitaet.name : (b.beste_qualitaet || qualitaet.name);
            db.db.prepare('UPDATE bierbrauer SET faesser_gebraut = faesser_gebraut + 1, gesamtverdienst = gesamtverdienst + ?, xp = xp + ?, beste_qualitaet = ?, letztes_brauen = ? WHERE user_id = ?').run(
                wert, xpGain, besteQ, Date.now(), uId
            );

            const updatedB = getBierbrauer(db, uId);
            const levelUp = checkLevelUp(db, uId, updatedB);

            const embed = new EmbedBuilder()
                .setTitle(`🍺 ${biersorte.name} gebraut!`)
                .setDescription(`Du hast **${qualitaet.name}es** ${biersorte.name} aus **${getreide.name}** ${getreide.emoji} mit **${hopfen.name}** gebraut!`)
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
            const b = getBierbrauer(db, uId);
            if (b.getreide === '[]') return interaction.reply({ content: '❌ Nutze `/bierbrauer start` um zu beginnen!', ephemeral: true });

            const cdKey = `bierbrauer_train_${uId}`;
            const cdTime = cooldowns.get(cdKey);
            if (cdTime && Date.now() - cdTime < 60000) {
                const rest = Math.ceil((60000 - (Date.now() - cdTime)) / 1000);
                return interaction.reply({ content: `⏳ Dein Bauch braucht noch Ruhe! Warte noch ${rest}s.`, ephemeral: true });
            }

            const typ = interaction.options.getString('typ').toLowerCase();
            const validTypes = ['braukunst', 'gaerung', 'malzkunde', 'ausdauer'];
            if (!validTypes.includes(typ)) return interaction.reply({ content: `❌ Unbekanntes Training! Verfügbar: ${validTypes.join(', ')}`, ephemeral: true });

            cooldowns.set(cdKey, Date.now());
            const xpGain = 12 + Math.floor(b.level * 2);
            const newVal = b[typ] + 1;

            db.db.prepare(`UPDATE bierbrauer SET ${typ} = ?, trainings = trainings + 1, xp = xp + ?, letztes_training = ? WHERE user_id = ?`).run(
                newVal, xpGain, Date.now(), uId
            );

            const updatedB = getBierbrauer(db, uId);
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
            const b = getBierbrauer(db, uId);
            if (b.getreide === '[]') return interaction.reply({ content: '❌ Nutze `/bierbrauer start` um zu beginnen!', ephemeral: true });

            const item = interaction.options.getString('item').toLowerCase();
            const upg = UPGRADES[item];
            if (!upg) return interaction.reply({ content: `❌ Unbekanntes Upgrade! Verfügbar: ${Object.keys(UPGRADES).join(', ')}`, ephemeral: true });

            const currentLvl = b[item];
            if (currentLvl >= 4) return interaction.reply({ content: `❌ ${upg.name} ist bereits auf Maximum (Stufe 4)!`, ephemeral: true });

            const kosten = upg.stufen[currentLvl + 1];
            const user = db.getUser(uId);
            if (user.balance < kosten) return interaction.reply({ content: `❌ Du brauchst ${kosten} Münzen! (Hast: ${user.balance})`, ephemeral: true });

            db.updateBalance(uId, -kosten);
            db.db.prepare(`UPDATE bierbrauer SET ${item} = ? WHERE user_id = ?`).run(currentLvl + 1, uId);

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

        if (sub === 'bierkeller') {
            const b = getBierbrauer(db, uId);
            if (b.getreide === '[]') return interaction.reply({ content: '❌ Nutze `/bierbrauer start` um zu beginnen!', ephemeral: true });

            const faesser = db.db.prepare('SELECT * FROM bierbrauer_keller WHERE user_id = ? ORDER BY wert DESC LIMIT 10').all(uId);

            if (faesser.length === 0) {
                return interaction.reply({ content: '🍺 Dein Keller ist noch leer. Braue dein erstes Bier!', ephemeral: true });
            }

            const total = db.db.prepare('SELECT COUNT(*) as cnt, SUM(wert) as total FROM bierbrauer_keller WHERE user_id = ?').get(uId);
            const lines = faesser.map((f, i) => `${i + 1}. **${f.bier_typ}** (${f.getreide}/${f.hopfen}) - ${f.qualitaet} - ${f.wert} Münzen`);

            const embed = new EmbedBuilder()
                .setTitle('🍺 Bierkeller')
                .setDescription(lines.join('\n'))
                .addFields(
                    { name: '📊 Gesamt', value: `${total.cnt} Fässer`, inline: true },
                    { name: '💰 Gesamtwert', value: `${total.total} Münzen`, inline: true }
                )
                .setColor(0xD2691E);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'auftrag') {
            const b = getBierbrauer(db, uId);
            if (b.getreide === '[]') return interaction.reply({ content: '❌ Nutze `/bierbrauer start` um zu beginnen!', ephemeral: true });

            const cdKey = `bierbrauer_auftrag_${uId}`;
            const cdTime = cooldowns.get(cdKey);
            if (cdTime && Date.now() - cdTime < 120000) {
                const rest = Math.ceil((120000 - (Date.now() - cdTime)) / 1000);
                return interaction.reply({ content: `⏳ Kein neuer Auftrag verfügbar! Warte noch ${rest}s.`, ephemeral: true });
            }

            cooldowns.set(cdKey, Date.now());
            const auftraege = [
                { kunde: 'Bauer', produkt: 'Helles', belohnung: 200 + b.level * 30 },
                { kunde: 'Wirt', produkt: 'Dunkles', belohnung: 340 + b.level * 50 },
                { kunde: 'Ritter', produkt: 'Bockbier', belohnung: 650 + b.level * 80 },
                { kunde: 'Bürgermeister', produkt: 'Weizenbier', belohnung: 500 + b.level * 65 },
                { kunde: 'Fürst', produkt: 'Rauchbier', belohnung: 1500 + b.level * 160 },
                { kunde: 'König', produkt: 'Götterbier', belohnung: 3300 + b.level * 260 }
            ];

            const auftrag = auftraege[Math.floor(Math.random() * Math.min(auftraege.length, 2 + Math.floor(b.level / 2)))];
            const qualBonus = 1.0 + b.braukunst * 0.03 + b.gaerung * 0.025;
            const verdienst = Math.floor(auftrag.belohnung * qualBonus);

            db.updateBalance(uId, verdienst);
            const xpGain = 18 + Math.floor(verdienst / 30);
            db.db.prepare('UPDATE bierbrauer SET faesser_gebraut = faesser_gebraut + 1, gesamtverdienst = gesamtverdienst + ?, xp = xp + ? WHERE user_id = ?').run(verdienst, xpGain, uId);

            const updatedB = getBierbrauer(db, uId);
            const levelUp = checkLevelUp(db, uId, updatedB);

            const embed = new EmbedBuilder()
                .setTitle('📋 Brauauftrag abgeschlossen!')
                .setDescription(`Der **${auftrag.kunde}** hat dich beauftragt, **${auftrag.produkt}** zu brauen.`)
                .addFields(
                    { name: '💰 Belohnung', value: `${verdienst} Münzen`, inline: true },
                    { name: '⭐ XP', value: `+${xpGain}`, inline: true }
                )
                .setColor(0x00FF00);

            if (levelUp.ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${levelUp.lvl}!` });

            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'duell') {
            const b = getBierbrauer(db, uId);
            if (b.getreide === '[]') return interaction.reply({ content: '❌ Nutze `/bierbrauer start` um zu beginnen!', ephemeral: true });
            if (b.level < 3) return interaction.reply({ content: '❌ Du brauchst Level 3 für Duelle!', ephemeral: true });

            const gegner = interaction.options.getUser('gegner');
            if (gegner.id === uId) return interaction.reply({ content: '❌ Du kannst dich nicht selbst herausfordern!', ephemeral: true });
            if (gegner.bot) return interaction.reply({ content: '❌ Du kannst keinen Bot herausfordern!', ephemeral: true });

            const gg = db.db.prepare('SELECT * FROM bierbrauer WHERE user_id = ?').get(gegner.id);
            if (!gg || gg.getreide === '[]') return interaction.reply({ content: '❌ Dein Gegner ist kein Brauer!', ephemeral: true });

            const scoreA = (b.level * 10) + (b.braukunst * 5) + (b.gaerung * 4) + (b.braukessel * 8) + (b.gaertank * 6) + (b.keller * 7) + Math.random() * 40;
            const scoreB = (gg.level * 10) + (gg.braukunst * 5) + (gg.gaerung * 4) + (gg.braukessel * 8) + (gg.gaertank * 6) + (gg.keller * 7) + Math.random() * 40;

            const gewonnen = scoreA > scoreB;
            const preis = Math.floor(200 + b.level * 50 + gg.level * 50);

            if (gewonnen) {
                db.updateBalance(uId, preis);
                db.db.prepare('UPDATE bierbrauer SET duelle_gewonnen = duelle_gewonnen + 1 WHERE user_id = ?').run(uId);
                db.db.prepare('UPDATE bierbrauer SET duelle_verloren = duelle_verloren + 1 WHERE user_id = ?').run(gegner.id);
            } else {
                db.updateBalance(gegner.id, preis);
                db.db.prepare('UPDATE bierbrauer SET duelle_verloren = duelle_verloren + 1 WHERE user_id = ?').run(uId);
                db.db.prepare('UPDATE bierbrauer SET duelle_gewonnen = duelle_gewonnen + 1 WHERE user_id = ?').run(gegner.id);
            }

            const embed = new EmbedBuilder()
                .setTitle('🏆 Brauer-Duell')
                .setDescription(`🍺 **${interaction.user.username}** vs 🍺 **${gegner.username}**`)
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
