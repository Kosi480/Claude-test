const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const WACHSE = [
    { name: 'Talg', preis: 0, qualitaet: 1.0, emoji: '🕯️' },
    { name: 'Bienenwachs', preis: 1200, qualitaet: 1.2, emoji: '🐝' },
    { name: 'Palmwachs', preis: 3000, qualitaet: 1.4, emoji: '🌴' },
    { name: 'Sojawachs', preis: 7000, qualitaet: 1.7, emoji: '🌱' },
    { name: 'Walratwachs', preis: 16000, qualitaet: 2.0, emoji: '🐋' },
    { name: 'Elfenwachs', preis: 33000, qualitaet: 2.5, emoji: '🧚' },
    { name: 'Phönixwachs', preis: 62000, qualitaet: 3.1, emoji: '🔥' },
    { name: 'Sternenwachs', preis: 112000, qualitaet: 3.9, emoji: '⭐' }
];

const KERZEN_TYPEN = [
    { name: 'Stumpenkerze', basisWert: 45, schwierigkeit: 1, minLevel: 1 },
    { name: 'Stabkerze', basisWert: 90, schwierigkeit: 1, minLevel: 1 },
    { name: 'Duftkerze', basisWert: 200, schwierigkeit: 2, minLevel: 2 },
    { name: 'Figurenkerze', basisWert: 400, schwierigkeit: 3, minLevel: 4 },
    { name: 'Altarkerze', basisWert: 750, schwierigkeit: 4, minLevel: 6 },
    { name: 'Kronleuchterkerze', basisWert: 1400, schwierigkeit: 5, minLevel: 8 },
    { name: 'Ritualkerze', basisWert: 2800, schwierigkeit: 7, minLevel: 11 },
    { name: 'Ewige Flamme', basisWert: 5500, schwierigkeit: 9, minLevel: 14 }
];

const DUEFTE = [
    { name: 'Unparfümiert', bonus: 1.0, minLevel: 1 },
    { name: 'Lavendel', bonus: 1.15, minLevel: 2 },
    { name: 'Vanille', bonus: 1.3, minLevel: 3 },
    { name: 'Sandelholz', bonus: 1.45, minLevel: 5 },
    { name: 'Rose', bonus: 1.65, minLevel: 7 },
    { name: 'Weihrauch', bonus: 1.9, minLevel: 9 },
    { name: 'Mondblüte', bonus: 2.3, minLevel: 12 },
    { name: 'Sternenessenz', bonus: 2.8, minLevel: 15 }
];

const QUALITAETEN = [
    { name: 'Tropfend', multi: 0.3, minRoll: 0 },
    { name: 'Schief', multi: 0.5, minRoll: 12 },
    { name: 'Einfach', multi: 0.8, minRoll: 26 },
    { name: 'Gleichmäßig', multi: 1.0, minRoll: 42 },
    { name: 'Elegant', multi: 1.5, minRoll: 58 },
    { name: 'Prachtvoll', multi: 2.2, minRoll: 76 },
    { name: 'Göttlich', multi: 3.5, minRoll: 93 }
];

const UPGRADES = {
    kessel: { name: 'Schmelzkessel', stufen: [0, 1500, 5000, 15000, 40000], bonus: [0, 0.1, 0.2, 0.35, 0.5] },
    form: { name: 'Gießform', stufen: [0, 2000, 6000, 18000, 45000], bonus: [0, 0.08, 0.18, 0.3, 0.45] },
    docht: { name: 'Dochtwickler', stufen: [0, 2500, 7000, 20000, 52000], bonus: [0, 0.1, 0.22, 0.36, 0.52] },
    werkstatt: { name: 'Kerzenwerkstatt', stufen: [0, 3000, 9000, 25000, 60000], bonus: [0, 1, 2, 3, 5] }
};

const KERZEN_EVENTS = [
    { text: '✨ Perfekter Guss! Die Kerze hat eine makellose Form.', qualMulti: 1.5, geldMulti: 1.0 },
    { text: '💧 Das Wachs ist zu heiß! Blasen bilden sich.', qualMulti: 0.5, geldMulti: 1.0 },
    { text: '🌸 Der Duft verbreitet sich betörend im Raum!', qualMulti: 1.4, geldMulti: 1.4 },
    { text: '⛪ Ein Abt bestellt sofort hundert Kerzen!', qualMulti: 1.0, geldMulti: 2.5 },
    { text: '🔥 Die Flamme leuchtet in überirdischen Farben!', qualMulti: 1.7, geldMulti: 1.3 },
    { text: '💨 Zugluft lässt den Docht schief erstarren.', qualMulti: 0.6, geldMulti: 0.9 },
    { text: '🌟 Das Wachs kristallisiert zu wunderschönen Mustern!', qualMulti: 1.6, geldMulti: 1.8 }
];

const cooldowns = new Map();

function ensureKerzenTable(db) {
    db.db.exec(`CREATE TABLE IF NOT EXISTS kerzenzieher (
        user_id TEXT PRIMARY KEY,
        wachse TEXT DEFAULT '[]',
        duefte TEXT DEFAULT '[]',
        level INTEGER DEFAULT 1,
        xp INTEGER DEFAULT 0,
        kerzen_gefertigt INTEGER DEFAULT 0,
        beste_qualitaet TEXT DEFAULT '',
        gesamtverdienst INTEGER DEFAULT 0,
        kessel INTEGER DEFAULT 0,
        form INTEGER DEFAULT 0,
        docht INTEGER DEFAULT 0,
        werkstatt INTEGER DEFAULT 0,
        giesstechnik INTEGER DEFAULT 0,
        duftmischung INTEGER DEFAULT 0,
        formgebung INTEGER DEFAULT 0,
        geduld INTEGER DEFAULT 0,
        trainings INTEGER DEFAULT 0,
        duelle_gewonnen INTEGER DEFAULT 0,
        duelle_verloren INTEGER DEFAULT 0,
        letztes_giessen INTEGER DEFAULT 0,
        letztes_training INTEGER DEFAULT 0
    )`);
    db.db.exec(`CREATE TABLE IF NOT EXISTS kerzen_regal (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        kerzen_typ TEXT,
        wachs TEXT,
        duft TEXT,
        qualitaet TEXT,
        wert INTEGER,
        erstellt_am INTEGER DEFAULT 0
    )`);
}

function getKerzenzieher(db, uId) {
    const row = db.db.prepare('SELECT * FROM kerzenzieher WHERE user_id = ?').get(uId);
    if (!row) {
        db.db.prepare('INSERT INTO kerzenzieher (user_id) VALUES (?)').run(uId);
        return db.db.prepare('SELECT * FROM kerzenzieher WHERE user_id = ?').get(uId);
    }
    return row;
}

function xpForLevel(l) { return l * l * 49; }

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
        db.db.prepare('UPDATE kerzenzieher SET level = ?, xp = ? WHERE user_id = ?').run(lvl, xp, uId);
    }
    return { lvl, ups };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kerzenzieher')
        .setDescription('🕯️ Kerzenmacherei - Gieße duftende Kerzen aus feinstem Wachs!')
        .addSubcommand(s => s.setName('start').setDescription('Beginne deine Kerzenzieher-Karriere'))
        .addSubcommand(s => s.setName('status').setDescription('Zeige deinen Kerzenzieher-Status'))
        .addSubcommand(s => s.setName('wachse').setDescription('Zeige verfügbare Wachssorten'))
        .addSubcommand(s => s.setName('kaufen').setDescription('Kaufe eine neue Wachssorte')
            .addStringOption(o => o.setName('wachs').setDescription('Name des Wachses').setRequired(true)))
        .addSubcommand(s => s.setName('giessen').setDescription('Gieße eine neue Kerze')
            .addStringOption(o => o.setName('kerze').setDescription('Kerzentyp').setRequired(true))
            .addStringOption(o => o.setName('wachs').setDescription('Wachssorte').setRequired(true))
            .addStringOption(o => o.setName('duft').setDescription('Duftart').setRequired(true)))
        .addSubcommand(s => s.setName('training').setDescription('Trainiere deine Kerzenmacher-Fähigkeiten')
            .addStringOption(o => o.setName('typ').setDescription('Trainingstyp (giesstechnik/duftmischung/formgebung/geduld)').setRequired(true)))
        .addSubcommand(s => s.setName('upgrade').setDescription('Verbessere deine Ausrüstung')
            .addStringOption(o => o.setName('item').setDescription('Ausrüstung (kessel/form/docht/werkstatt)').setRequired(true)))
        .addSubcommand(s => s.setName('regal').setDescription('Zeige dein Kerzenregal'))
        .addSubcommand(s => s.setName('auftrag').setDescription('Nimm einen Kerzenauftrag an'))
        .addSubcommand(s => s.setName('duell').setDescription('Fordere einen anderen Kerzenzieher heraus')
            .addUserOption(o => o.setName('gegner').setDescription('Dein Gegner').setRequired(true))),

    async execute(interaction) {
        const db = interaction.client.db;
        const config = require('../config.json');
        ensureKerzenTable(db);
        const uId = interaction.user.id;
        const sub = interaction.options.getSubcommand();

        if (sub === 'start') {
            const existing = db.db.prepare('SELECT * FROM kerzenzieher WHERE user_id = ?').get(uId);
            if (existing && existing.wachse !== '[]') {
                return interaction.reply({ content: '❌ Du bist bereits ein Kerzenzieher!', ephemeral: true });
            }
            db.db.prepare('INSERT OR REPLACE INTO kerzenzieher (user_id, wachse, duefte) VALUES (?, ?, ?)').run(
                uId, JSON.stringify([WACHSE[0].name]), JSON.stringify([DUEFTE[0].name])
            );

            const embed = new EmbedBuilder()
                .setTitle('🕯️ Willkommen in der Kerzenmacherei!')
                .setDescription(`Du erhältst **${WACHSE[0].name}** ${WACHSE[0].emoji} und den Duft **${DUEFTE[0].name}**!`)
                .addFields(
                    { name: '🕯️ Wachs', value: WACHSE[0].name, inline: true },
                    { name: '🌸 Duft', value: DUEFTE[0].name, inline: true },
                    { name: '💡 Nächster Schritt', value: 'Nutze `/kerzenzieher giessen` um deine erste Kerze zu gießen!' }
                )
                .setColor(0xFFD700);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'status') {
            const k = getKerzenzieher(db, uId);
            if (k.wachse === '[]') return interaction.reply({ content: '❌ Nutze `/kerzenzieher start` um zu beginnen!', ephemeral: true });
            const wachse = JSON.parse(k.wachse);
            const duefte = JSON.parse(k.duefte);
            const xpNeeded = xpForLevel(k.level);

            const embed = new EmbedBuilder()
                .setTitle(`🕯️ Kerzenzieher ${interaction.user.username}`)
                .addFields(
                    { name: '📊 Level', value: `${k.level} (${k.xp}/${xpNeeded} XP)`, inline: true },
                    { name: '🕯️ Gefertigt', value: `${k.kerzen_gefertigt} Kerzen`, inline: true },
                    { name: '💰 Verdienst', value: `${k.gesamtverdienst} Münzen`, inline: true },
                    { name: '🏆 Beste Qualität', value: k.beste_qualitaet || 'Keine', inline: true },
                    { name: '🫕 Kessel', value: `Stufe ${k.kessel}`, inline: true },
                    { name: '🔲 Form', value: `Stufe ${k.form}`, inline: true },
                    { name: '🧵 Docht', value: `Stufe ${k.docht}`, inline: true },
                    { name: '🏠 Werkstatt', value: `Stufe ${k.werkstatt}`, inline: true },
                    { name: '🕯️ Wachse', value: `${wachse.length}`, inline: true },
                    { name: '🌸 Düfte', value: `${duefte.length}`, inline: true },
                    { name: '🏆 Duelle', value: `${k.duelle_gewonnen}W / ${k.duelle_verloren}L`, inline: true }
                )
                .setColor(0xFFD700);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'wachse') {
            const k = getKerzenzieher(db, uId);
            const besitz = k.wachse !== '[]' ? JSON.parse(k.wachse) : [];
            const lines = WACHSE.map(w => {
                const owned = besitz.includes(w.name) ? ' ✅' : '';
                return `${w.emoji} **${w.name}** - ${w.preis > 0 ? `${w.preis} Münzen` : 'Starter'} | Qualität: x${w.qualitaet}${owned}`;
            });
            const embed = new EmbedBuilder()
                .setTitle('🕯️ Verfügbare Wachssorten')
                .setDescription(lines.join('\n'))
                .setColor(0xFFD700);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'kaufen') {
            const k = getKerzenzieher(db, uId);
            if (k.wachse === '[]') return interaction.reply({ content: '❌ Nutze `/kerzenzieher start` um zu beginnen!', ephemeral: true });

            const wachsName = interaction.options.getString('wachs');
            const wachs = WACHSE.find(w => w.name.toLowerCase() === wachsName.toLowerCase());
            if (!wachs) return interaction.reply({ content: '❌ Unbekannte Wachssorte!', ephemeral: true });

            const wachse = JSON.parse(k.wachse);
            if (wachse.includes(wachs.name)) return interaction.reply({ content: '❌ Du besitzt dieses Wachs bereits!', ephemeral: true });

            const user = db.getUser(uId);
            if (user.balance < wachs.preis) return interaction.reply({ content: `❌ Du brauchst ${wachs.preis} Münzen! (Hast: ${user.balance})`, ephemeral: true });

            db.updateBalance(uId, -wachs.preis);
            wachse.push(wachs.name);
            db.db.prepare('UPDATE kerzenzieher SET wachse = ? WHERE user_id = ?').run(JSON.stringify(wachse), uId);

            const embed = new EmbedBuilder()
                .setTitle('🕯️ Neues Wachs!')
                .setDescription(`Du hast **${wachs.name}** ${wachs.emoji} für **${wachs.preis} Münzen** erworben!`)
                .addFields({ name: '📊 Qualitätsbonus', value: `x${wachs.qualitaet}`, inline: true })
                .setColor(0x00FF00);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'giessen') {
            const k = getKerzenzieher(db, uId);
            if (k.wachse === '[]') return interaction.reply({ content: '❌ Nutze `/kerzenzieher start` um zu beginnen!', ephemeral: true });

            const cdKey = `kerzen_${uId}`;
            const cdTime = cooldowns.get(cdKey);
            if (cdTime && Date.now() - cdTime < 45000) {
                const rest = Math.ceil((45000 - (Date.now() - cdTime)) / 1000);
                return interaction.reply({ content: `⏳ Das Wachs kühlt noch ab! Warte noch ${rest}s.`, ephemeral: true });
            }

            const kerzenName = interaction.options.getString('kerze');
            const wachsName = interaction.options.getString('wachs');
            const duftName = interaction.options.getString('duft');

            const kerze = KERZEN_TYPEN.find(kt => kt.name.toLowerCase() === kerzenName.toLowerCase());
            if (!kerze) return interaction.reply({ content: `❌ Unbekannter Kerzentyp! Verfügbar: ${KERZEN_TYPEN.map(kt => kt.name).join(', ')}`, ephemeral: true });
            if (k.level < kerze.minLevel) return interaction.reply({ content: `❌ Du brauchst Level ${kerze.minLevel} für ${kerze.name}!`, ephemeral: true });

            const wachs = WACHSE.find(w => w.name.toLowerCase() === wachsName.toLowerCase());
            if (!wachs) return interaction.reply({ content: '❌ Unbekannte Wachssorte!', ephemeral: true });
            const wachse = JSON.parse(k.wachse);
            if (!wachse.includes(wachs.name)) return interaction.reply({ content: '❌ Du besitzt dieses Wachs nicht!', ephemeral: true });

            const duft = DUEFTE.find(d => d.name.toLowerCase() === duftName.toLowerCase());
            if (!duft) return interaction.reply({ content: `❌ Unbekannter Duft! Verfügbar: ${DUEFTE.map(d => d.name).join(', ')}`, ephemeral: true });

            const duefte = JSON.parse(k.duefte);
            if (!duefte.includes(duft.name)) {
                if (k.level < duft.minLevel) return interaction.reply({ content: `❌ Du brauchst Level ${duft.minLevel} für ${duft.name}!`, ephemeral: true });
                duefte.push(duft.name);
                db.db.prepare('UPDATE kerzenzieher SET duefte = ? WHERE user_id = ?').run(JSON.stringify(duefte), uId);
            }

            cooldowns.set(cdKey, Date.now());

            const kesselBonus = UPGRADES.kessel.bonus[k.kessel];
            const formBonus = UPGRADES.form.bonus[k.form];
            const dochtBonus = UPGRADES.docht.bonus[k.docht];
            const giessBonus = k.giesstechnik * 0.02;
            const duftBonus = k.duftmischung * 0.018;

            let qualRoll = Math.random() * 100;
            qualRoll += (kesselBonus + formBonus + dochtBonus + giessBonus + duftBonus) * 28;
            qualRoll *= wachs.qualitaet * duft.bonus / kerze.schwierigkeit;

            let event = null;
            if (Math.random() < 0.2) {
                event = KERZEN_EVENTS[Math.floor(Math.random() * KERZEN_EVENTS.length)];
                qualRoll *= event.qualMulti;
            }

            qualRoll = Math.min(100, qualRoll);
            let qualitaet = QUALITAETEN[0];
            for (const q of QUALITAETEN) {
                if (qualRoll >= q.minRoll) qualitaet = q;
            }

            let wert = Math.floor(kerze.basisWert * qualitaet.multi * wachs.qualitaet * duft.bonus * (1 + dochtBonus));
            if (event) wert = Math.floor(wert * event.geldMulti);

            db.updateBalance(uId, wert);
            const xpGain = 12 + Math.floor(kerze.schwierigkeit * 5) + Math.floor(wert / 50);

            db.db.prepare('INSERT INTO kerzen_regal (user_id, kerzen_typ, wachs, duft, qualitaet, wert, erstellt_am) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
                uId, kerze.name, wachs.name, duft.name, qualitaet.name, wert, Date.now()
            );

            const besteQ = QUALITAETEN.indexOf(qualitaet) > QUALITAETEN.findIndex(q => q.name === k.beste_qualitaet) ? qualitaet.name : (k.beste_qualitaet || qualitaet.name);
            db.db.prepare('UPDATE kerzenzieher SET kerzen_gefertigt = kerzen_gefertigt + 1, gesamtverdienst = gesamtverdienst + ?, xp = xp + ?, beste_qualitaet = ?, letztes_giessen = ? WHERE user_id = ?').run(
                wert, xpGain, besteQ, Date.now(), uId
            );

            const updatedK = getKerzenzieher(db, uId);
            const levelUp = checkLevelUp(db, uId, updatedK);

            const embed = new EmbedBuilder()
                .setTitle(`🕯️ ${kerze.name} gegossen!`)
                .setDescription(`Du hast eine **${qualitaet.name}e** ${kerze.name} aus **${wachs.name}** ${wachs.emoji} mit **${duft.name}**-Duft gegossen!`)
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
            const k = getKerzenzieher(db, uId);
            if (k.wachse === '[]') return interaction.reply({ content: '❌ Nutze `/kerzenzieher start` um zu beginnen!', ephemeral: true });

            const cdKey = `kerzen_train_${uId}`;
            const cdTime = cooldowns.get(cdKey);
            if (cdTime && Date.now() - cdTime < 60000) {
                const rest = Math.ceil((60000 - (Date.now() - cdTime)) / 1000);
                return interaction.reply({ content: `⏳ Das Wachs klebt noch! Warte noch ${rest}s.`, ephemeral: true });
            }

            const typ = interaction.options.getString('typ').toLowerCase();
            const validTypes = ['giesstechnik', 'duftmischung', 'formgebung', 'geduld'];
            if (!validTypes.includes(typ)) return interaction.reply({ content: `❌ Unbekanntes Training! Verfügbar: ${validTypes.join(', ')}`, ephemeral: true });

            cooldowns.set(cdKey, Date.now());
            const xpGain = 12 + Math.floor(k.level * 2);
            const newVal = k[typ] + 1;

            db.db.prepare(`UPDATE kerzenzieher SET ${typ} = ?, trainings = trainings + 1, xp = xp + ?, letztes_training = ? WHERE user_id = ?`).run(
                newVal, xpGain, Date.now(), uId
            );

            const updatedK = getKerzenzieher(db, uId);
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
            const k = getKerzenzieher(db, uId);
            if (k.wachse === '[]') return interaction.reply({ content: '❌ Nutze `/kerzenzieher start` um zu beginnen!', ephemeral: true });

            const item = interaction.options.getString('item').toLowerCase();
            const upg = UPGRADES[item];
            if (!upg) return interaction.reply({ content: `❌ Unbekanntes Upgrade! Verfügbar: ${Object.keys(UPGRADES).join(', ')}`, ephemeral: true });

            const currentLvl = k[item];
            if (currentLvl >= 4) return interaction.reply({ content: `❌ ${upg.name} ist bereits auf Maximum (Stufe 4)!`, ephemeral: true });

            const kosten = upg.stufen[currentLvl + 1];
            const user = db.getUser(uId);
            if (user.balance < kosten) return interaction.reply({ content: `❌ Du brauchst ${kosten} Münzen! (Hast: ${user.balance})`, ephemeral: true });

            db.updateBalance(uId, -kosten);
            db.db.prepare(`UPDATE kerzenzieher SET ${item} = ? WHERE user_id = ?`).run(currentLvl + 1, uId);

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
            const k = getKerzenzieher(db, uId);
            if (k.wachse === '[]') return interaction.reply({ content: '❌ Nutze `/kerzenzieher start` um zu beginnen!', ephemeral: true });

            const werke = db.db.prepare('SELECT * FROM kerzen_regal WHERE user_id = ? ORDER BY wert DESC LIMIT 10').all(uId);

            if (werke.length === 0) {
                return interaction.reply({ content: '🕯️ Dein Regal ist noch leer. Gieße deine erste Kerze!', ephemeral: true });
            }

            const total = db.db.prepare('SELECT COUNT(*) as cnt, SUM(wert) as total FROM kerzen_regal WHERE user_id = ?').get(uId);
            const lines = werke.map((w, i) => `${i + 1}. **${w.kerzen_typ}** (${w.wachs}/${w.duft}) - ${w.qualitaet} - ${w.wert} Münzen`);

            const embed = new EmbedBuilder()
                .setTitle('🕯️ Kerzenregal')
                .setDescription(lines.join('\n'))
                .addFields(
                    { name: '📊 Gesamt', value: `${total.cnt} Kerzen`, inline: true },
                    { name: '💰 Gesamtwert', value: `${total.total} Münzen`, inline: true }
                )
                .setColor(0xFFD700);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'auftrag') {
            const k = getKerzenzieher(db, uId);
            if (k.wachse === '[]') return interaction.reply({ content: '❌ Nutze `/kerzenzieher start` um zu beginnen!', ephemeral: true });

            const cdKey = `kerzen_auftrag_${uId}`;
            const cdTime = cooldowns.get(cdKey);
            if (cdTime && Date.now() - cdTime < 120000) {
                const rest = Math.ceil((120000 - (Date.now() - cdTime)) / 1000);
                return interaction.reply({ content: `⏳ Kein neuer Auftrag verfügbar! Warte noch ${rest}s.`, ephemeral: true });
            }

            cooldowns.set(cdKey, Date.now());
            const auftraege = [
                { kunde: 'Gastwirt', kerze: 'Stumpenkerze', belohnung: 180 + k.level * 30 },
                { kunde: 'Parfümerie', kerze: 'Duftkerze', belohnung: 350 + k.level * 55 },
                { kunde: 'Kirche', kerze: 'Altarkerze', belohnung: 650 + k.level * 85 },
                { kunde: 'Schloss', kerze: 'Kronleuchterkerze', belohnung: 1000 + k.level * 120 },
                { kunde: 'Tempel', kerze: 'Ritualkerze', belohnung: 1800 + k.level * 170 },
                { kunde: 'Magier', kerze: 'Ewige Flamme', belohnung: 3200 + k.level * 250 }
            ];

            const auftrag = auftraege[Math.floor(Math.random() * Math.min(auftraege.length, 2 + Math.floor(k.level / 2)))];
            const qualBonus = 1.0 + k.giesstechnik * 0.03 + k.duftmischung * 0.025;
            const verdienst = Math.floor(auftrag.belohnung * qualBonus);

            db.updateBalance(uId, verdienst);
            const xpGain = 18 + Math.floor(verdienst / 30);
            db.db.prepare('UPDATE kerzenzieher SET kerzen_gefertigt = kerzen_gefertigt + 1, gesamtverdienst = gesamtverdienst + ?, xp = xp + ? WHERE user_id = ?').run(verdienst, xpGain, uId);

            const updatedK = getKerzenzieher(db, uId);
            const levelUp = checkLevelUp(db, uId, updatedK);

            const embed = new EmbedBuilder()
                .setTitle('📋 Kerzenauftrag abgeschlossen!')
                .setDescription(`Der **${auftrag.kunde}** hat dich beauftragt, eine **${auftrag.kerze}** zu gießen.`)
                .addFields(
                    { name: '💰 Belohnung', value: `${verdienst} Münzen`, inline: true },
                    { name: '⭐ XP', value: `+${xpGain}`, inline: true }
                )
                .setColor(0x00FF00);

            if (levelUp.ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${levelUp.lvl}!` });

            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'duell') {
            const k = getKerzenzieher(db, uId);
            if (k.wachse === '[]') return interaction.reply({ content: '❌ Nutze `/kerzenzieher start` um zu beginnen!', ephemeral: true });
            if (k.level < 3) return interaction.reply({ content: '❌ Du brauchst Level 3 für Duelle!', ephemeral: true });

            const gegner = interaction.options.getUser('gegner');
            if (gegner.id === uId) return interaction.reply({ content: '❌ Du kannst dich nicht selbst herausfordern!', ephemeral: true });
            if (gegner.bot) return interaction.reply({ content: '❌ Du kannst keinen Bot herausfordern!', ephemeral: true });

            const g = db.db.prepare('SELECT * FROM kerzenzieher WHERE user_id = ?').get(gegner.id);
            if (!g || g.wachse === '[]') return interaction.reply({ content: '❌ Dein Gegner ist kein Kerzenzieher!', ephemeral: true });

            const scoreA = (k.level * 10) + (k.giesstechnik * 5) + (k.duftmischung * 4) + (k.kessel * 8) + (k.form * 7) + (k.docht * 6) + Math.random() * 40;
            const scoreB = (g.level * 10) + (g.giesstechnik * 5) + (g.duftmischung * 4) + (g.kessel * 8) + (g.form * 7) + (g.docht * 6) + Math.random() * 40;

            const gewonnen = scoreA > scoreB;
            const preis = Math.floor(200 + k.level * 50 + g.level * 50);

            if (gewonnen) {
                db.updateBalance(uId, preis);
                db.db.prepare('UPDATE kerzenzieher SET duelle_gewonnen = duelle_gewonnen + 1 WHERE user_id = ?').run(uId);
                db.db.prepare('UPDATE kerzenzieher SET duelle_verloren = duelle_verloren + 1 WHERE user_id = ?').run(gegner.id);
            } else {
                db.updateBalance(gegner.id, preis);
                db.db.prepare('UPDATE kerzenzieher SET duelle_verloren = duelle_verloren + 1 WHERE user_id = ?').run(uId);
                db.db.prepare('UPDATE kerzenzieher SET duelle_gewonnen = duelle_gewonnen + 1 WHERE user_id = ?').run(gegner.id);
            }

            const embed = new EmbedBuilder()
                .setTitle('🏆 Kerzenzieher-Duell')
                .setDescription(`🕯️ **${interaction.user.username}** vs 🕯️ **${gegner.username}**`)
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
