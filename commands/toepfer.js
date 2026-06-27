const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const TONARTEN = [
    { name: 'Lehm', preis: 0, qualitaet: 1.0, emoji: '🟤' },
    { name: 'Steingut', preis: 1200, qualitaet: 1.2, emoji: '🧱' },
    { name: 'Steinzeug', preis: 3500, qualitaet: 1.4, emoji: '⬜' },
    { name: 'Porzellan', preis: 8000, qualitaet: 1.7, emoji: '🏺' },
    { name: 'Raku-Ton', preis: 16000, qualitaet: 2.0, emoji: '🔥' },
    { name: 'Celadon-Ton', preis: 32000, qualitaet: 2.4, emoji: '💚' },
    { name: 'Mondstein-Ton', preis: 60000, qualitaet: 3.0, emoji: '🌙' },
    { name: 'Drachenite', preis: 110000, qualitaet: 3.8, emoji: '🐉' }
];

const GEFAESSE = [
    { name: 'Schale', basisWert: 50, schwierigkeit: 1, minLevel: 1 },
    { name: 'Becher', basisWert: 80, schwierigkeit: 1, minLevel: 1 },
    { name: 'Vase', basisWert: 180, schwierigkeit: 2, minLevel: 2 },
    { name: 'Krug', basisWert: 300, schwierigkeit: 3, minLevel: 3 },
    { name: 'Teekanne', basisWert: 550, schwierigkeit: 4, minLevel: 5 },
    { name: 'Skulptur', basisWert: 1000, schwierigkeit: 5, minLevel: 7 },
    { name: 'Amphore', basisWert: 2200, schwierigkeit: 7, minLevel: 10 },
    { name: 'Meistervase', basisWert: 4500, schwierigkeit: 9, minLevel: 14 }
];

const GLASUREN = [
    { name: 'Unglasiert', bonus: 1.0, minLevel: 1 },
    { name: 'Salzglasur', bonus: 1.15, minLevel: 2 },
    { name: 'Zinnglasur', bonus: 1.3, minLevel: 3 },
    { name: 'Ascheglasur', bonus: 1.45, minLevel: 5 },
    { name: 'Kupferglasur', bonus: 1.6, minLevel: 7 },
    { name: 'Kristallglasur', bonus: 1.8, minLevel: 9 },
    { name: 'Goldlüsterglasur', bonus: 2.2, minLevel: 12 },
    { name: 'Himmelsglasur', bonus: 2.8, minLevel: 15 }
];

const QUALITAETEN = [
    { name: 'Zerbrochen', multi: 0.2, minRoll: 0 },
    { name: 'Schief', multi: 0.5, minRoll: 12 },
    { name: 'Einfach', multi: 0.8, minRoll: 28 },
    { name: 'Gleichmäßig', multi: 1.0, minRoll: 42 },
    { name: 'Elegant', multi: 1.5, minRoll: 58 },
    { name: 'Prachtvoll', multi: 2.2, minRoll: 76 },
    { name: 'Meisterhaft', multi: 3.5, minRoll: 93 }
];

const UPGRADES = {
    scheibe: { name: 'Töpferscheibe', stufen: [0, 1500, 5000, 15000, 40000], bonus: [0, 0.1, 0.2, 0.35, 0.5] },
    ofen: { name: 'Brennofen', stufen: [0, 2000, 6500, 19000, 48000], bonus: [0, 0.1, 0.2, 0.32, 0.48] },
    werkzeug: { name: 'Formwerkzeug', stufen: [0, 2500, 7000, 20000, 52000], bonus: [0, 0.08, 0.18, 0.32, 0.5] },
    atelier: { name: 'Töpferwerkstatt', stufen: [0, 3000, 9000, 25000, 60000], bonus: [0, 1, 2, 3, 5] }
};

const BRAND_EVENTS = [
    { text: '🔥 Perfekte Brenntemperatur! Die Glasur bildet wunderschöne Muster.', qualMulti: 1.5, geldMulti: 1.0 },
    { text: '💥 Ein Riss im Brennofen! Hitze entweicht unkontrolliert.', qualMulti: 0.5, geldMulti: 1.0 },
    { text: '✨ Die Glasur reagiert unerwartet und bildet Kristalle!', qualMulti: 1.6, geldMulti: 1.4 },
    { text: '🏺 Ein Museumsexperte sieht dein Werk und bietet sofort!', qualMulti: 1.0, geldMulti: 2.5 },
    { text: '🌈 Regenbogeneffekt! Die Farben der Glasur schillern magisch.', qualMulti: 1.8, geldMulti: 1.3 },
    { text: '💨 Zugluft im Ofen! Die Temperatur schwankt.', qualMulti: 0.6, geldMulti: 0.9 },
    { text: '🌟 Der Ton singt beim Brennen - ein gutes Zeichen!', qualMulti: 1.4, geldMulti: 1.5 }
];

const cooldowns = new Map();

function ensureToepferTable(db) {
    db.db.exec(`CREATE TABLE IF NOT EXISTS toepfer (
        user_id TEXT PRIMARY KEY,
        tonarten TEXT DEFAULT '[]',
        glasuren TEXT DEFAULT '[]',
        level INTEGER DEFAULT 1,
        xp INTEGER DEFAULT 0,
        gefaesse_gefertigt INTEGER DEFAULT 0,
        beste_qualitaet TEXT DEFAULT '',
        gesamtverdienst INTEGER DEFAULT 0,
        scheibe INTEGER DEFAULT 0,
        ofen INTEGER DEFAULT 0,
        werkzeug INTEGER DEFAULT 0,
        atelier INTEGER DEFAULT 0,
        formgebung INTEGER DEFAULT 0,
        glasurkenntnis INTEGER DEFAULT 0,
        brenntechnik INTEGER DEFAULT 0,
        geduld INTEGER DEFAULT 0,
        trainings INTEGER DEFAULT 0,
        duelle_gewonnen INTEGER DEFAULT 0,
        duelle_verloren INTEGER DEFAULT 0,
        letztes_toepfern INTEGER DEFAULT 0,
        letztes_training INTEGER DEFAULT 0
    )`);
    db.db.exec(`CREATE TABLE IF NOT EXISTS toepfer_regal (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        gefaess_typ TEXT,
        ton TEXT,
        glasur TEXT,
        qualitaet TEXT,
        wert INTEGER,
        erstellt_am INTEGER DEFAULT 0
    )`);
}

function getToepfer(db, uId) {
    const row = db.db.prepare('SELECT * FROM toepfer WHERE user_id = ?').get(uId);
    if (!row) {
        db.db.prepare('INSERT INTO toepfer (user_id) VALUES (?)').run(uId);
        return db.db.prepare('SELECT * FROM toepfer WHERE user_id = ?').get(uId);
    }
    return row;
}

function xpForLevel(l) { return l * l * 54; }

function checkLevelUp(db, uId, t) {
    let lvl = t.level;
    let xp = t.xp;
    let ups = 0;
    while (xp >= xpForLevel(lvl)) {
        xp -= xpForLevel(lvl);
        lvl++;
        ups++;
    }
    if (ups > 0) {
        db.db.prepare('UPDATE toepfer SET level = ?, xp = ? WHERE user_id = ?').run(lvl, xp, uId);
    }
    return { lvl, ups };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('toepfer')
        .setDescription('🏺 Töpferei - Forme Ton zu wunderschöner Keramik!')
        .addSubcommand(s => s.setName('start').setDescription('Beginne deine Töpfer-Karriere'))
        .addSubcommand(s => s.setName('status').setDescription('Zeige deinen Töpfer-Status'))
        .addSubcommand(s => s.setName('tonarten').setDescription('Zeige verfügbare Tonarten'))
        .addSubcommand(s => s.setName('kaufen').setDescription('Kaufe eine neue Tonart')
            .addStringOption(o => o.setName('ton').setDescription('Name der Tonart').setRequired(true)))
        .addSubcommand(s => s.setName('toepfern').setDescription('Forme ein neues Gefäß')
            .addStringOption(o => o.setName('gefaess').setDescription('Gefäßtyp').setRequired(true))
            .addStringOption(o => o.setName('ton').setDescription('Tonart').setRequired(true))
            .addStringOption(o => o.setName('glasur').setDescription('Glasurart').setRequired(true)))
        .addSubcommand(s => s.setName('training').setDescription('Trainiere deine Töpfer-Fähigkeiten')
            .addStringOption(o => o.setName('typ').setDescription('Trainingstyp (formgebung/glasurkenntnis/brenntechnik/geduld)').setRequired(true)))
        .addSubcommand(s => s.setName('upgrade').setDescription('Verbessere deine Ausrüstung')
            .addStringOption(o => o.setName('item').setDescription('Ausrüstung (scheibe/ofen/werkzeug/atelier)').setRequired(true)))
        .addSubcommand(s => s.setName('regal').setDescription('Zeige dein Ausstellungsregal'))
        .addSubcommand(s => s.setName('auftrag').setDescription('Nimm einen Töpferauftrag an'))
        .addSubcommand(s => s.setName('duell').setDescription('Fordere einen anderen Töpfer heraus')
            .addUserOption(o => o.setName('gegner').setDescription('Dein Gegner').setRequired(true))),

    async execute(interaction) {
        const db = interaction.client.db;
        const config = require('../config.json');
        ensureToepferTable(db);
        const uId = interaction.user.id;
        const sub = interaction.options.getSubcommand();

        if (sub === 'start') {
            const existing = db.db.prepare('SELECT * FROM toepfer WHERE user_id = ?').get(uId);
            if (existing && existing.tonarten !== '[]') {
                return interaction.reply({ content: '❌ Du bist bereits ein Töpfer!', ephemeral: true });
            }
            db.db.prepare('INSERT OR REPLACE INTO toepfer (user_id, tonarten, glasuren) VALUES (?, ?, ?)').run(
                uId, JSON.stringify([TONARTEN[0].name]), JSON.stringify([GLASUREN[0].name])
            );

            const embed = new EmbedBuilder()
                .setTitle('🏺 Willkommen in der Töpferei!')
                .setDescription(`Du erhältst **${TONARTEN[0].name}** ${TONARTEN[0].emoji} und lernst die **${GLASUREN[0].name}**-Technik!`)
                .addFields(
                    { name: '🟤 Ton', value: TONARTEN[0].name, inline: true },
                    { name: '🎨 Glasur', value: GLASUREN[0].name, inline: true },
                    { name: '💡 Nächster Schritt', value: 'Nutze `/toepfer toepfern` um dein erstes Gefäß zu formen!' }
                )
                .setColor(0xCD853F);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'status') {
            const t = getToepfer(db, uId);
            if (t.tonarten === '[]') return interaction.reply({ content: '❌ Nutze `/toepfer start` um zu beginnen!', ephemeral: true });
            const tonarten = JSON.parse(t.tonarten);
            const glasuren = JSON.parse(t.glasuren);
            const xpNeeded = xpForLevel(t.level);

            const embed = new EmbedBuilder()
                .setTitle(`🏺 Töpfer ${interaction.user.username}`)
                .addFields(
                    { name: '📊 Level', value: `${t.level} (${t.xp}/${xpNeeded} XP)`, inline: true },
                    { name: '🏺 Gefertigt', value: `${t.gefaesse_gefertigt} Stück`, inline: true },
                    { name: '💰 Verdienst', value: `${t.gesamtverdienst} Münzen`, inline: true },
                    { name: '🏆 Beste Qualität', value: t.beste_qualitaet || 'Keine', inline: true },
                    { name: '🔄 Scheibe', value: `Stufe ${t.scheibe}`, inline: true },
                    { name: '🔥 Ofen', value: `Stufe ${t.ofen}`, inline: true },
                    { name: '🔧 Werkzeug', value: `Stufe ${t.werkzeug}`, inline: true },
                    { name: '🏠 Werkstatt', value: `Stufe ${t.atelier}`, inline: true },
                    { name: '🟤 Tonarten', value: `${tonarten.length}`, inline: true },
                    { name: '🎨 Glasuren', value: `${glasuren.length}`, inline: true },
                    { name: '🏆 Duelle', value: `${t.duelle_gewonnen}W / ${t.duelle_verloren}L`, inline: true }
                )
                .setColor(0xCD853F);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'tonarten') {
            const t = getToepfer(db, uId);
            const besitz = t.tonarten !== '[]' ? JSON.parse(t.tonarten) : [];
            const lines = TONARTEN.map(ton => {
                const owned = besitz.includes(ton.name) ? ' ✅' : '';
                return `${ton.emoji} **${ton.name}** - ${ton.preis > 0 ? `${ton.preis} Münzen` : 'Starter'} | Qualität: x${ton.qualitaet}${owned}`;
            });
            const embed = new EmbedBuilder()
                .setTitle('🟤 Verfügbare Tonarten')
                .setDescription(lines.join('\n'))
                .setColor(0xCD853F);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'kaufen') {
            const t = getToepfer(db, uId);
            if (t.tonarten === '[]') return interaction.reply({ content: '❌ Nutze `/toepfer start` um zu beginnen!', ephemeral: true });

            const tonName = interaction.options.getString('ton');
            const ton = TONARTEN.find(a => a.name.toLowerCase() === tonName.toLowerCase());
            if (!ton) return interaction.reply({ content: '❌ Unbekannte Tonart!', ephemeral: true });

            const tonarten = JSON.parse(t.tonarten);
            if (tonarten.includes(ton.name)) return interaction.reply({ content: '❌ Du besitzt diese Tonart bereits!', ephemeral: true });

            const user = db.getUser(uId);
            if (user.balance < ton.preis) return interaction.reply({ content: `❌ Du brauchst ${ton.preis} Münzen! (Hast: ${user.balance})`, ephemeral: true });

            db.updateBalance(uId, -ton.preis);
            tonarten.push(ton.name);
            db.db.prepare('UPDATE toepfer SET tonarten = ? WHERE user_id = ?').run(JSON.stringify(tonarten), uId);

            const embed = new EmbedBuilder()
                .setTitle('🟤 Neue Tonart!')
                .setDescription(`Du hast **${ton.name}** ${ton.emoji} für **${ton.preis} Münzen** erworben!`)
                .addFields({ name: '📊 Qualitätsbonus', value: `x${ton.qualitaet}`, inline: true })
                .setColor(0x00FF00);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'toepfern') {
            const t = getToepfer(db, uId);
            if (t.tonarten === '[]') return interaction.reply({ content: '❌ Nutze `/toepfer start` um zu beginnen!', ephemeral: true });

            const cdKey = `toepfer_${uId}`;
            const cdTime = cooldowns.get(cdKey);
            if (cdTime && Date.now() - cdTime < 45000) {
                const rest = Math.ceil((45000 - (Date.now() - cdTime)) / 1000);
                return interaction.reply({ content: `⏳ Dein Ton trocknet noch! Warte noch ${rest}s.`, ephemeral: true });
            }

            const gefaessName = interaction.options.getString('gefaess');
            const tonName = interaction.options.getString('ton');
            const glasurName = interaction.options.getString('glasur');

            const gefaess = GEFAESSE.find(g => g.name.toLowerCase() === gefaessName.toLowerCase());
            if (!gefaess) return interaction.reply({ content: `❌ Unbekanntes Gefäß! Verfügbar: ${GEFAESSE.map(g => g.name).join(', ')}`, ephemeral: true });
            if (t.level < gefaess.minLevel) return interaction.reply({ content: `❌ Du brauchst Level ${gefaess.minLevel} für ${gefaess.name}!`, ephemeral: true });

            const ton = TONARTEN.find(a => a.name.toLowerCase() === tonName.toLowerCase());
            if (!ton) return interaction.reply({ content: '❌ Unbekannte Tonart!', ephemeral: true });
            const tonarten = JSON.parse(t.tonarten);
            if (!tonarten.includes(ton.name)) return interaction.reply({ content: '❌ Du besitzt diese Tonart nicht!', ephemeral: true });

            const glasur = GLASUREN.find(g => g.name.toLowerCase() === glasurName.toLowerCase());
            if (!glasur) return interaction.reply({ content: `❌ Unbekannte Glasur! Verfügbar: ${GLASUREN.map(g => g.name).join(', ')}`, ephemeral: true });

            const glasuren = JSON.parse(t.glasuren);
            if (!glasuren.includes(glasur.name)) {
                if (t.level < glasur.minLevel) return interaction.reply({ content: `❌ Du brauchst Level ${glasur.minLevel} für ${glasur.name}!`, ephemeral: true });
                glasuren.push(glasur.name);
                db.db.prepare('UPDATE toepfer SET glasuren = ? WHERE user_id = ?').run(JSON.stringify(glasuren), uId);
            }

            cooldowns.set(cdKey, Date.now());

            const scheibeBonus = UPGRADES.scheibe.bonus[t.scheibe];
            const ofenBonus = UPGRADES.ofen.bonus[t.ofen];
            const werkzeugBonus = UPGRADES.werkzeug.bonus[t.werkzeug];
            const formBonus = t.formgebung * 0.02;
            const brennBonus = t.brenntechnik * 0.018;

            let qualRoll = Math.random() * 100;
            qualRoll += (scheibeBonus + ofenBonus + werkzeugBonus + formBonus + brennBonus) * 28;
            qualRoll *= ton.qualitaet * glasur.bonus / gefaess.schwierigkeit;

            let event = null;
            if (Math.random() < 0.2) {
                event = BRAND_EVENTS[Math.floor(Math.random() * BRAND_EVENTS.length)];
                qualRoll *= event.qualMulti;
            }

            qualRoll = Math.min(100, qualRoll);
            let qualitaet = QUALITAETEN[0];
            for (const q of QUALITAETEN) {
                if (qualRoll >= q.minRoll) qualitaet = q;
            }

            let wert = Math.floor(gefaess.basisWert * qualitaet.multi * ton.qualitaet * glasur.bonus * (1 + ofenBonus));
            if (event) wert = Math.floor(wert * event.geldMulti);

            db.updateBalance(uId, wert);
            const xpGain = 13 + Math.floor(gefaess.schwierigkeit * 5) + Math.floor(wert / 50);

            db.db.prepare('INSERT INTO toepfer_regal (user_id, gefaess_typ, ton, glasur, qualitaet, wert, erstellt_am) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
                uId, gefaess.name, ton.name, glasur.name, qualitaet.name, wert, Date.now()
            );

            const besteQ = QUALITAETEN.indexOf(qualitaet) > QUALITAETEN.findIndex(q => q.name === t.beste_qualitaet) ? qualitaet.name : (t.beste_qualitaet || qualitaet.name);
            db.db.prepare('UPDATE toepfer SET gefaesse_gefertigt = gefaesse_gefertigt + 1, gesamtverdienst = gesamtverdienst + ?, xp = xp + ?, beste_qualitaet = ?, letztes_toepfern = ? WHERE user_id = ?').run(
                wert, xpGain, besteQ, Date.now(), uId
            );

            const updatedT = getToepfer(db, uId);
            const levelUp = checkLevelUp(db, uId, updatedT);

            const embed = new EmbedBuilder()
                .setTitle(`🏺 ${gefaess.name} getöpfert!`)
                .setDescription(`Du hast eine **${qualitaet.name}e** ${gefaess.name} aus **${ton.name}** ${ton.emoji} mit **${glasur.name}** geformt!`)
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
            const t = getToepfer(db, uId);
            if (t.tonarten === '[]') return interaction.reply({ content: '❌ Nutze `/toepfer start` um zu beginnen!', ephemeral: true });

            const cdKey = `toepfer_train_${uId}`;
            const cdTime = cooldowns.get(cdKey);
            if (cdTime && Date.now() - cdTime < 60000) {
                const rest = Math.ceil((60000 - (Date.now() - cdTime)) / 1000);
                return interaction.reply({ content: `⏳ Deine Hände sind noch voller Ton! Warte noch ${rest}s.`, ephemeral: true });
            }

            const typ = interaction.options.getString('typ').toLowerCase();
            const validTypes = ['formgebung', 'glasurkenntnis', 'brenntechnik', 'geduld'];
            if (!validTypes.includes(typ)) return interaction.reply({ content: `❌ Unbekanntes Training! Verfügbar: ${validTypes.join(', ')}`, ephemeral: true });

            cooldowns.set(cdKey, Date.now());
            const xpGain = 12 + Math.floor(t.level * 2);
            const newVal = t[typ] + 1;

            db.db.prepare(`UPDATE toepfer SET ${typ} = ?, trainings = trainings + 1, xp = xp + ?, letztes_training = ? WHERE user_id = ?`).run(
                newVal, xpGain, Date.now(), uId
            );

            const updatedT = getToepfer(db, uId);
            const levelUp = checkLevelUp(db, uId, updatedT);

            const embed = new EmbedBuilder()
                .setTitle(`🎓 ${typ.charAt(0).toUpperCase() + typ.slice(1)}-Training`)
                .setDescription(`Du hast deine **${typ}** verbessert!`)
                .addFields(
                    { name: '📈 Fortschritt', value: `${t[typ]} → ${newVal}`, inline: true },
                    { name: '⭐ XP', value: `+${xpGain}`, inline: true }
                )
                .setColor(0x4169E1);

            if (levelUp.ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${levelUp.lvl}!` });

            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'upgrade') {
            const t = getToepfer(db, uId);
            if (t.tonarten === '[]') return interaction.reply({ content: '❌ Nutze `/toepfer start` um zu beginnen!', ephemeral: true });

            const item = interaction.options.getString('item').toLowerCase();
            const upg = UPGRADES[item];
            if (!upg) return interaction.reply({ content: `❌ Unbekanntes Upgrade! Verfügbar: ${Object.keys(UPGRADES).join(', ')}`, ephemeral: true });

            const currentLvl = t[item];
            if (currentLvl >= 4) return interaction.reply({ content: `❌ ${upg.name} ist bereits auf Maximum (Stufe 4)!`, ephemeral: true });

            const kosten = upg.stufen[currentLvl + 1];
            const user = db.getUser(uId);
            if (user.balance < kosten) return interaction.reply({ content: `❌ Du brauchst ${kosten} Münzen! (Hast: ${user.balance})`, ephemeral: true });

            db.updateBalance(uId, -kosten);
            db.db.prepare(`UPDATE toepfer SET ${item} = ? WHERE user_id = ?`).run(currentLvl + 1, uId);

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

        if (sub === 'regal') {
            const t = getToepfer(db, uId);
            if (t.tonarten === '[]') return interaction.reply({ content: '❌ Nutze `/toepfer start` um zu beginnen!', ephemeral: true });

            const werke = db.db.prepare('SELECT * FROM toepfer_regal WHERE user_id = ? ORDER BY wert DESC LIMIT 10').all(uId);

            if (werke.length === 0) {
                return interaction.reply({ content: '🏺 Dein Regal ist noch leer. Töpfere dein erstes Gefäß!', ephemeral: true });
            }

            const total = db.db.prepare('SELECT COUNT(*) as cnt, SUM(wert) as total FROM toepfer_regal WHERE user_id = ?').get(uId);
            const lines = werke.map((w, i) => `${i + 1}. **${w.gefaess_typ}** (${w.ton}/${w.glasur}) - ${w.qualitaet} - ${w.wert} Münzen`);

            const embed = new EmbedBuilder()
                .setTitle('🏺 Ausstellungsregal')
                .setDescription(lines.join('\n'))
                .addFields(
                    { name: '📊 Gesamt', value: `${total.cnt} Gefäße`, inline: true },
                    { name: '💰 Gesamtwert', value: `${total.total} Münzen`, inline: true }
                )
                .setColor(0xCD853F);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'auftrag') {
            const t = getToepfer(db, uId);
            if (t.tonarten === '[]') return interaction.reply({ content: '❌ Nutze `/toepfer start` um zu beginnen!', ephemeral: true });

            const cdKey = `toepfer_auftrag_${uId}`;
            const cdTime = cooldowns.get(cdKey);
            if (cdTime && Date.now() - cdTime < 120000) {
                const rest = Math.ceil((120000 - (Date.now() - cdTime)) / 1000);
                return interaction.reply({ content: `⏳ Kein neuer Auftrag verfügbar! Warte noch ${rest}s.`, ephemeral: true });
            }

            cooldowns.set(cdKey, Date.now());
            const auftraege = [
                { kunde: 'Gastwirt', gefaess: 'Becher', belohnung: 200 + t.level * 35 },
                { kunde: 'Blumenhändler', gefaess: 'Vase', belohnung: 350 + t.level * 55 },
                { kunde: 'Teehaus', gefaess: 'Teekanne', belohnung: 600 + t.level * 80 },
                { kunde: 'Tempel', gefaess: 'Schale', belohnung: 450 + t.level * 70 },
                { kunde: 'Palast', gefaess: 'Amphore', belohnung: 1200 + t.level * 130 },
                { kunde: 'Museum', gefaess: 'Skulptur', belohnung: 2000 + t.level * 200 }
            ];

            const auftrag = auftraege[Math.floor(Math.random() * Math.min(auftraege.length, 2 + Math.floor(t.level / 2)))];
            const qualBonus = 1.0 + t.formgebung * 0.03 + t.glasurkenntnis * 0.02;
            const verdienst = Math.floor(auftrag.belohnung * qualBonus);

            db.updateBalance(uId, verdienst);
            const xpGain = 18 + Math.floor(verdienst / 30);
            db.db.prepare('UPDATE toepfer SET gefaesse_gefertigt = gefaesse_gefertigt + 1, gesamtverdienst = gesamtverdienst + ?, xp = xp + ? WHERE user_id = ?').run(verdienst, xpGain, uId);

            const updatedT = getToepfer(db, uId);
            const levelUp = checkLevelUp(db, uId, updatedT);

            const embed = new EmbedBuilder()
                .setTitle('📋 Töpferauftrag abgeschlossen!')
                .setDescription(`Der **${auftrag.kunde}** hat dich beauftragt, eine **${auftrag.gefaess}** zu fertigen.`)
                .addFields(
                    { name: '💰 Belohnung', value: `${verdienst} Münzen`, inline: true },
                    { name: '⭐ XP', value: `+${xpGain}`, inline: true }
                )
                .setColor(0x00FF00);

            if (levelUp.ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${levelUp.lvl}!` });

            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'duell') {
            const t = getToepfer(db, uId);
            if (t.tonarten === '[]') return interaction.reply({ content: '❌ Nutze `/toepfer start` um zu beginnen!', ephemeral: true });
            if (t.level < 3) return interaction.reply({ content: '❌ Du brauchst Level 3 für Duelle!', ephemeral: true });

            const gegner = interaction.options.getUser('gegner');
            if (gegner.id === uId) return interaction.reply({ content: '❌ Du kannst dich nicht selbst herausfordern!', ephemeral: true });
            if (gegner.bot) return interaction.reply({ content: '❌ Du kannst keinen Bot herausfordern!', ephemeral: true });

            const g = db.db.prepare('SELECT * FROM toepfer WHERE user_id = ?').get(gegner.id);
            if (!g || g.tonarten === '[]') return interaction.reply({ content: '❌ Dein Gegner ist kein Töpfer!', ephemeral: true });

            const scoreA = (t.level * 10) + (t.formgebung * 5) + (t.brenntechnik * 4) + (t.scheibe * 8) + (t.ofen * 7) + (t.werkzeug * 6) + Math.random() * 40;
            const scoreB = (g.level * 10) + (g.formgebung * 5) + (g.brenntechnik * 4) + (g.scheibe * 8) + (g.ofen * 7) + (g.werkzeug * 6) + Math.random() * 40;

            const gewonnen = scoreA > scoreB;
            const preis = Math.floor(200 + t.level * 50 + g.level * 50);

            if (gewonnen) {
                db.updateBalance(uId, preis);
                db.db.prepare('UPDATE toepfer SET duelle_gewonnen = duelle_gewonnen + 1 WHERE user_id = ?').run(uId);
                db.db.prepare('UPDATE toepfer SET duelle_verloren = duelle_verloren + 1 WHERE user_id = ?').run(gegner.id);
            } else {
                db.updateBalance(gegner.id, preis);
                db.db.prepare('UPDATE toepfer SET duelle_verloren = duelle_verloren + 1 WHERE user_id = ?').run(uId);
                db.db.prepare('UPDATE toepfer SET duelle_gewonnen = duelle_gewonnen + 1 WHERE user_id = ?').run(gegner.id);
            }

            const embed = new EmbedBuilder()
                .setTitle('🏆 Töpfer-Duell')
                .setDescription(`🏺 **${interaction.user.username}** vs 🏺 **${gegner.username}**`)
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
