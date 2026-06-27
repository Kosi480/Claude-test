const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const HAEUTE = [
    { name: 'Ziegenhaut', preis: 0, qualitaet: 1.0, emoji: '🐐' },
    { name: 'Rindsleder', preis: 1500, qualitaet: 1.2, emoji: '🐄' },
    { name: 'Hirschleder', preis: 3500, qualitaet: 1.4, emoji: '🦌' },
    { name: 'Schlangenleder', preis: 8000, qualitaet: 1.7, emoji: '🐍' },
    { name: 'Krokodilleder', preis: 18000, qualitaet: 2.0, emoji: '🐊' },
    { name: 'Greifenleder', preis: 35000, qualitaet: 2.5, emoji: '🦅' },
    { name: 'Drachenleder', preis: 65000, qualitaet: 3.1, emoji: '🐉' },
    { name: 'Phönixleder', preis: 115000, qualitaet: 3.9, emoji: '🔥' }
];

const PRODUKTE = [
    { name: 'Gürtel', basisWert: 50, schwierigkeit: 1, minLevel: 1 },
    { name: 'Handschuhe', basisWert: 100, schwierigkeit: 1, minLevel: 1 },
    { name: 'Beutel', basisWert: 200, schwierigkeit: 2, minLevel: 2 },
    { name: 'Stiefel', basisWert: 400, schwierigkeit: 3, minLevel: 4 },
    { name: 'Wams', basisWert: 750, schwierigkeit: 4, minLevel: 6 },
    { name: 'Sattel', basisWert: 1400, schwierigkeit: 5, minLevel: 8 },
    { name: 'Rüstung', basisWert: 2800, schwierigkeit: 7, minLevel: 11 },
    { name: 'Legendärer Umhang', basisWert: 5500, schwierigkeit: 9, minLevel: 14 }
];

const GERBMETHODEN = [
    { name: 'Rauchgerbung', bonus: 1.0, minLevel: 1 },
    { name: 'Fettgerbung', bonus: 1.15, minLevel: 2 },
    { name: 'Pflanzengerbung', bonus: 1.3, minLevel: 3 },
    { name: 'Alaungerbung', bonus: 1.5, minLevel: 5 },
    { name: 'Chromgerbung', bonus: 1.7, minLevel: 7 },
    { name: 'Sämischgerbung', bonus: 1.9, minLevel: 9 },
    { name: 'Elfengerbung', bonus: 2.3, minLevel: 12 },
    { name: 'Äthergerbung', bonus: 2.8, minLevel: 15 }
];

const QUALITAETEN = [
    { name: 'Brüchig', multi: 0.3, minRoll: 0 },
    { name: 'Steif', multi: 0.5, minRoll: 12 },
    { name: 'Brauchbar', multi: 0.8, minRoll: 26 },
    { name: 'Geschmeidig', multi: 1.0, minRoll: 42 },
    { name: 'Fein', multi: 1.5, minRoll: 58 },
    { name: 'Exquisit', multi: 2.2, minRoll: 76 },
    { name: 'Meisterhaft', multi: 3.5, minRoll: 93 }
];

const UPGRADES = {
    grube: { name: 'Gerbgrube', stufen: [0, 1500, 5000, 15000, 40000], bonus: [0, 0.1, 0.2, 0.35, 0.5] },
    messer: { name: 'Schabeisen', stufen: [0, 2000, 6000, 18000, 45000], bonus: [0, 0.08, 0.18, 0.3, 0.45] },
    rahmen: { name: 'Spannrahmen', stufen: [0, 2500, 7000, 20000, 52000], bonus: [0, 0.1, 0.22, 0.36, 0.52] },
    werkstatt: { name: 'Gerberei', stufen: [0, 3000, 9000, 25000, 60000], bonus: [0, 1, 2, 3, 5] }
};

const GERB_EVENTS = [
    { text: '✨ Perfekte Gerbung! Das Leder wird butterweich.', qualMulti: 1.5, geldMulti: 1.0 },
    { text: '💧 Die Gerbbrühe ist zu schwach! Das Leder wird steif.', qualMulti: 0.5, geldMulti: 1.0 },
    { text: '🌿 Seltene Eichenrinde verstärkt die Gerbung!', qualMulti: 1.4, geldMulti: 1.3 },
    { text: '👑 Ein Ritter bestellt sofort eine ganze Ausrüstung!', qualMulti: 1.0, geldMulti: 2.5 },
    { text: '🌞 Perfektes Trocknungswetter! Das Leder glänzt.', qualMulti: 1.6, geldMulti: 1.2 },
    { text: '🦠 Schimmel auf der Haut! Schnell handeln!', qualMulti: 0.6, geldMulti: 0.8 },
    { text: '🔮 Das Leder absorbiert magische Energie aus der Umgebung!', qualMulti: 1.7, geldMulti: 1.5 }
];

const cooldowns = new Map();

function ensureGerberTable(db) {
    db.db.exec(`CREATE TABLE IF NOT EXISTS gerber (
        user_id TEXT PRIMARY KEY,
        haeute TEXT DEFAULT '[]',
        methoden TEXT DEFAULT '[]',
        level INTEGER DEFAULT 1,
        xp INTEGER DEFAULT 0,
        produkte_gefertigt INTEGER DEFAULT 0,
        beste_qualitaet TEXT DEFAULT '',
        gesamtverdienst INTEGER DEFAULT 0,
        grube INTEGER DEFAULT 0,
        messer INTEGER DEFAULT 0,
        rahmen INTEGER DEFAULT 0,
        werkstatt INTEGER DEFAULT 0,
        gerbtechnik INTEGER DEFAULT 0,
        schnittkunde INTEGER DEFAULT 0,
        hautpflege INTEGER DEFAULT 0,
        ausdauer INTEGER DEFAULT 0,
        trainings INTEGER DEFAULT 0,
        duelle_gewonnen INTEGER DEFAULT 0,
        duelle_verloren INTEGER DEFAULT 0,
        letztes_gerben INTEGER DEFAULT 0,
        letztes_training INTEGER DEFAULT 0
    )`);
    db.db.exec(`CREATE TABLE IF NOT EXISTS gerber_lager (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        produkt_typ TEXT,
        haut TEXT,
        methode TEXT,
        qualitaet TEXT,
        wert INTEGER,
        erstellt_am INTEGER DEFAULT 0
    )`);
}

function getGerber(db, uId) {
    const row = db.db.prepare('SELECT * FROM gerber WHERE user_id = ?').get(uId);
    if (!row) {
        db.db.prepare('INSERT INTO gerber (user_id) VALUES (?)').run(uId);
        return db.db.prepare('SELECT * FROM gerber WHERE user_id = ?').get(uId);
    }
    return row;
}

function xpForLevel(l) { return l * l * 51; }

function checkLevelUp(db, uId, g) {
    let lvl = g.level;
    let xp = g.xp;
    let ups = 0;
    while (xp >= xpForLevel(lvl)) {
        xp -= xpForLevel(lvl);
        lvl++;
        ups++;
    }
    if (ups > 0) {
        db.db.prepare('UPDATE gerber SET level = ?, xp = ? WHERE user_id = ?').run(lvl, xp, uId);
    }
    return { lvl, ups };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gerber')
        .setDescription('🐄 Gerberei - Verarbeite Häute zu feinstem Leder!')
        .addSubcommand(s => s.setName('start').setDescription('Beginne deine Gerber-Karriere'))
        .addSubcommand(s => s.setName('status').setDescription('Zeige deinen Gerber-Status'))
        .addSubcommand(s => s.setName('haeute').setDescription('Zeige verfügbare Häute'))
        .addSubcommand(s => s.setName('kaufen').setDescription('Kaufe eine neue Haut')
            .addStringOption(o => o.setName('haut').setDescription('Name der Haut').setRequired(true)))
        .addSubcommand(s => s.setName('gerben').setDescription('Gerbe Leder und fertige ein Produkt')
            .addStringOption(o => o.setName('produkt').setDescription('Produkttyp').setRequired(true))
            .addStringOption(o => o.setName('haut').setDescription('Hautart').setRequired(true))
            .addStringOption(o => o.setName('methode').setDescription('Gerbmethode').setRequired(true)))
        .addSubcommand(s => s.setName('training').setDescription('Trainiere deine Gerber-Fähigkeiten')
            .addStringOption(o => o.setName('typ').setDescription('Trainingstyp (gerbtechnik/schnittkunde/hautpflege/ausdauer)').setRequired(true)))
        .addSubcommand(s => s.setName('upgrade').setDescription('Verbessere deine Ausrüstung')
            .addStringOption(o => o.setName('item').setDescription('Ausrüstung (grube/messer/rahmen/werkstatt)').setRequired(true)))
        .addSubcommand(s => s.setName('lager').setDescription('Zeige dein Lederlager'))
        .addSubcommand(s => s.setName('auftrag').setDescription('Nimm einen Gerberauftrag an'))
        .addSubcommand(s => s.setName('duell').setDescription('Fordere einen anderen Gerber heraus')
            .addUserOption(o => o.setName('gegner').setDescription('Dein Gegner').setRequired(true))),

    async execute(interaction) {
        const db = interaction.client.db;
        const config = require('../config.json');
        ensureGerberTable(db);
        const uId = interaction.user.id;
        const sub = interaction.options.getSubcommand();

        if (sub === 'start') {
            const existing = db.db.prepare('SELECT * FROM gerber WHERE user_id = ?').get(uId);
            if (existing && existing.haeute !== '[]') {
                return interaction.reply({ content: '❌ Du bist bereits ein Gerber!', ephemeral: true });
            }
            db.db.prepare('INSERT OR REPLACE INTO gerber (user_id, haeute, methoden) VALUES (?, ?, ?)').run(
                uId, JSON.stringify([HAEUTE[0].name]), JSON.stringify([GERBMETHODEN[0].name])
            );

            const embed = new EmbedBuilder()
                .setTitle('🐄 Willkommen in der Gerberei!')
                .setDescription(`Du erhältst **${HAEUTE[0].name}** ${HAEUTE[0].emoji} und lernst die **${GERBMETHODEN[0].name}**!`)
                .addFields(
                    { name: '🐐 Haut', value: HAEUTE[0].name, inline: true },
                    { name: '🧪 Methode', value: GERBMETHODEN[0].name, inline: true },
                    { name: '💡 Nächster Schritt', value: 'Nutze `/gerber gerben` um dein erstes Lederprodukt zu fertigen!' }
                )
                .setColor(0x8B4513);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'status') {
            const g = getGerber(db, uId);
            if (g.haeute === '[]') return interaction.reply({ content: '❌ Nutze `/gerber start` um zu beginnen!', ephemeral: true });
            const haeute = JSON.parse(g.haeute);
            const methoden = JSON.parse(g.methoden);
            const xpNeeded = xpForLevel(g.level);

            const embed = new EmbedBuilder()
                .setTitle(`🐄 Gerber ${interaction.user.username}`)
                .addFields(
                    { name: '📊 Level', value: `${g.level} (${g.xp}/${xpNeeded} XP)`, inline: true },
                    { name: '🧤 Gefertigt', value: `${g.produkte_gefertigt} Produkte`, inline: true },
                    { name: '💰 Verdienst', value: `${g.gesamtverdienst} Münzen`, inline: true },
                    { name: '🏆 Beste Qualität', value: g.beste_qualitaet || 'Keine', inline: true },
                    { name: '🕳️ Grube', value: `Stufe ${g.grube}`, inline: true },
                    { name: '🔪 Schabeisen', value: `Stufe ${g.messer}`, inline: true },
                    { name: '📐 Rahmen', value: `Stufe ${g.rahmen}`, inline: true },
                    { name: '🏠 Gerberei', value: `Stufe ${g.werkstatt}`, inline: true },
                    { name: '🐐 Häute', value: `${haeute.length}`, inline: true },
                    { name: '🧪 Methoden', value: `${methoden.length}`, inline: true },
                    { name: '🏆 Duelle', value: `${g.duelle_gewonnen}W / ${g.duelle_verloren}L`, inline: true }
                )
                .setColor(0x8B4513);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'haeute') {
            const g = getGerber(db, uId);
            const besitz = g.haeute !== '[]' ? JSON.parse(g.haeute) : [];
            const lines = HAEUTE.map(h => {
                const owned = besitz.includes(h.name) ? ' ✅' : '';
                return `${h.emoji} **${h.name}** - ${h.preis > 0 ? `${h.preis} Münzen` : 'Starter'} | Qualität: x${h.qualitaet}${owned}`;
            });
            const embed = new EmbedBuilder()
                .setTitle('🐐 Verfügbare Häute')
                .setDescription(lines.join('\n'))
                .setColor(0x8B4513);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'kaufen') {
            const g = getGerber(db, uId);
            if (g.haeute === '[]') return interaction.reply({ content: '❌ Nutze `/gerber start` um zu beginnen!', ephemeral: true });

            const hautName = interaction.options.getString('haut');
            const haut = HAEUTE.find(h => h.name.toLowerCase() === hautName.toLowerCase());
            if (!haut) return interaction.reply({ content: '❌ Unbekannte Haut!', ephemeral: true });

            const haeute = JSON.parse(g.haeute);
            if (haeute.includes(haut.name)) return interaction.reply({ content: '❌ Du besitzt diese Haut bereits!', ephemeral: true });

            const user = db.getUser(uId);
            if (user.balance < haut.preis) return interaction.reply({ content: `❌ Du brauchst ${haut.preis} Münzen! (Hast: ${user.balance})`, ephemeral: true });

            db.updateBalance(uId, -haut.preis);
            haeute.push(haut.name);
            db.db.prepare('UPDATE gerber SET haeute = ? WHERE user_id = ?').run(JSON.stringify(haeute), uId);

            const embed = new EmbedBuilder()
                .setTitle('🐐 Neue Haut!')
                .setDescription(`Du hast **${haut.name}** ${haut.emoji} für **${haut.preis} Münzen** erworben!`)
                .addFields({ name: '📊 Qualitätsbonus', value: `x${haut.qualitaet}`, inline: true })
                .setColor(0x00FF00);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'gerben') {
            const g = getGerber(db, uId);
            if (g.haeute === '[]') return interaction.reply({ content: '❌ Nutze `/gerber start` um zu beginnen!', ephemeral: true });

            const cdKey = `gerber_${uId}`;
            const cdTime = cooldowns.get(cdKey);
            if (cdTime && Date.now() - cdTime < 50000) {
                const rest = Math.ceil((50000 - (Date.now() - cdTime)) / 1000);
                return interaction.reply({ content: `⏳ Das Leder trocknet noch! Warte noch ${rest}s.`, ephemeral: true });
            }

            const produktName = interaction.options.getString('produkt');
            const hautName = interaction.options.getString('haut');
            const methodeName = interaction.options.getString('methode');

            const produkt = PRODUKTE.find(p => p.name.toLowerCase() === produktName.toLowerCase());
            if (!produkt) return interaction.reply({ content: `❌ Unbekanntes Produkt! Verfügbar: ${PRODUKTE.map(p => p.name).join(', ')}`, ephemeral: true });
            if (g.level < produkt.minLevel) return interaction.reply({ content: `❌ Du brauchst Level ${produkt.minLevel} für ${produkt.name}!`, ephemeral: true });

            const haut = HAEUTE.find(h => h.name.toLowerCase() === hautName.toLowerCase());
            if (!haut) return interaction.reply({ content: '❌ Unbekannte Haut!', ephemeral: true });
            const haeute = JSON.parse(g.haeute);
            if (!haeute.includes(haut.name)) return interaction.reply({ content: '❌ Du besitzt diese Haut nicht!', ephemeral: true });

            const methode = GERBMETHODEN.find(m => m.name.toLowerCase() === methodeName.toLowerCase());
            if (!methode) return interaction.reply({ content: `❌ Unbekannte Methode! Verfügbar: ${GERBMETHODEN.map(m => m.name).join(', ')}`, ephemeral: true });

            const methoden = JSON.parse(g.methoden);
            if (!methoden.includes(methode.name)) {
                if (g.level < methode.minLevel) return interaction.reply({ content: `❌ Du brauchst Level ${methode.minLevel} für ${methode.name}!`, ephemeral: true });
                methoden.push(methode.name);
                db.db.prepare('UPDATE gerber SET methoden = ? WHERE user_id = ?').run(JSON.stringify(methoden), uId);
            }

            cooldowns.set(cdKey, Date.now());

            const grubeBonus = UPGRADES.grube.bonus[g.grube];
            const messerBonus = UPGRADES.messer.bonus[g.messer];
            const rahmenBonus = UPGRADES.rahmen.bonus[g.rahmen];
            const gerbBonus = g.gerbtechnik * 0.02;
            const schnittBonus = g.schnittkunde * 0.018;

            let qualRoll = Math.random() * 100;
            qualRoll += (grubeBonus + messerBonus + rahmenBonus + gerbBonus + schnittBonus) * 28;
            qualRoll *= haut.qualitaet * methode.bonus / produkt.schwierigkeit;

            let event = null;
            if (Math.random() < 0.2) {
                event = GERB_EVENTS[Math.floor(Math.random() * GERB_EVENTS.length)];
                qualRoll *= event.qualMulti;
            }

            qualRoll = Math.min(100, qualRoll);
            let qualitaet = QUALITAETEN[0];
            for (const q of QUALITAETEN) {
                if (qualRoll >= q.minRoll) qualitaet = q;
            }

            let wert = Math.floor(produkt.basisWert * qualitaet.multi * haut.qualitaet * methode.bonus * (1 + rahmenBonus));
            if (event) wert = Math.floor(wert * event.geldMulti);

            db.updateBalance(uId, wert);
            const xpGain = 13 + Math.floor(produkt.schwierigkeit * 5) + Math.floor(wert / 50);

            db.db.prepare('INSERT INTO gerber_lager (user_id, produkt_typ, haut, methode, qualitaet, wert, erstellt_am) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
                uId, produkt.name, haut.name, methode.name, qualitaet.name, wert, Date.now()
            );

            const besteQ = QUALITAETEN.indexOf(qualitaet) > QUALITAETEN.findIndex(q => q.name === g.beste_qualitaet) ? qualitaet.name : (g.beste_qualitaet || qualitaet.name);
            db.db.prepare('UPDATE gerber SET produkte_gefertigt = produkte_gefertigt + 1, gesamtverdienst = gesamtverdienst + ?, xp = xp + ?, beste_qualitaet = ?, letztes_gerben = ? WHERE user_id = ?').run(
                wert, xpGain, besteQ, Date.now(), uId
            );

            const updatedG = getGerber(db, uId);
            const levelUp = checkLevelUp(db, uId, updatedG);

            const embed = new EmbedBuilder()
                .setTitle(`🧤 ${produkt.name} gefertigt!`)
                .setDescription(`Du hast **${qualitaet.name}e** ${produkt.name} aus **${haut.name}** ${haut.emoji} mit **${methode.name}** gegerbt!`)
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
            const g = getGerber(db, uId);
            if (g.haeute === '[]') return interaction.reply({ content: '❌ Nutze `/gerber start` um zu beginnen!', ephemeral: true });

            const cdKey = `gerber_train_${uId}`;
            const cdTime = cooldowns.get(cdKey);
            if (cdTime && Date.now() - cdTime < 60000) {
                const rest = Math.ceil((60000 - (Date.now() - cdTime)) / 1000);
                return interaction.reply({ content: `⏳ Deine Hände sind noch rau! Warte noch ${rest}s.`, ephemeral: true });
            }

            const typ = interaction.options.getString('typ').toLowerCase();
            const validTypes = ['gerbtechnik', 'schnittkunde', 'hautpflege', 'ausdauer'];
            if (!validTypes.includes(typ)) return interaction.reply({ content: `❌ Unbekanntes Training! Verfügbar: ${validTypes.join(', ')}`, ephemeral: true });

            cooldowns.set(cdKey, Date.now());
            const xpGain = 12 + Math.floor(g.level * 2);
            const newVal = g[typ] + 1;

            db.db.prepare(`UPDATE gerber SET ${typ} = ?, trainings = trainings + 1, xp = xp + ?, letztes_training = ? WHERE user_id = ?`).run(
                newVal, xpGain, Date.now(), uId
            );

            const updatedG = getGerber(db, uId);
            const levelUp = checkLevelUp(db, uId, updatedG);

            const embed = new EmbedBuilder()
                .setTitle(`🎓 ${typ.charAt(0).toUpperCase() + typ.slice(1)}-Training`)
                .setDescription(`Du hast deine **${typ}** verbessert!`)
                .addFields(
                    { name: '📈 Fortschritt', value: `${g[typ]} → ${newVal}`, inline: true },
                    { name: '⭐ XP', value: `+${xpGain}`, inline: true }
                )
                .setColor(0x4169E1);

            if (levelUp.ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${levelUp.lvl}!` });

            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'upgrade') {
            const g = getGerber(db, uId);
            if (g.haeute === '[]') return interaction.reply({ content: '❌ Nutze `/gerber start` um zu beginnen!', ephemeral: true });

            const item = interaction.options.getString('item').toLowerCase();
            const upg = UPGRADES[item];
            if (!upg) return interaction.reply({ content: `❌ Unbekanntes Upgrade! Verfügbar: ${Object.keys(UPGRADES).join(', ')}`, ephemeral: true });

            const currentLvl = g[item];
            if (currentLvl >= 4) return interaction.reply({ content: `❌ ${upg.name} ist bereits auf Maximum (Stufe 4)!`, ephemeral: true });

            const kosten = upg.stufen[currentLvl + 1];
            const user = db.getUser(uId);
            if (user.balance < kosten) return interaction.reply({ content: `❌ Du brauchst ${kosten} Münzen! (Hast: ${user.balance})`, ephemeral: true });

            db.updateBalance(uId, -kosten);
            db.db.prepare(`UPDATE gerber SET ${item} = ? WHERE user_id = ?`).run(currentLvl + 1, uId);

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
            const g = getGerber(db, uId);
            if (g.haeute === '[]') return interaction.reply({ content: '❌ Nutze `/gerber start` um zu beginnen!', ephemeral: true });

            const werke = db.db.prepare('SELECT * FROM gerber_lager WHERE user_id = ? ORDER BY wert DESC LIMIT 10').all(uId);

            if (werke.length === 0) {
                return interaction.reply({ content: '🧤 Dein Lager ist noch leer. Gerbe dein erstes Lederprodukt!', ephemeral: true });
            }

            const total = db.db.prepare('SELECT COUNT(*) as cnt, SUM(wert) as total FROM gerber_lager WHERE user_id = ?').get(uId);
            const lines = werke.map((w, i) => `${i + 1}. **${w.produkt_typ}** (${w.haut}/${w.methode}) - ${w.qualitaet} - ${w.wert} Münzen`);

            const embed = new EmbedBuilder()
                .setTitle('🧤 Lederlager')
                .setDescription(lines.join('\n'))
                .addFields(
                    { name: '📊 Gesamt', value: `${total.cnt} Produkte`, inline: true },
                    { name: '💰 Gesamtwert', value: `${total.total} Münzen`, inline: true }
                )
                .setColor(0x8B4513);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'auftrag') {
            const g = getGerber(db, uId);
            if (g.haeute === '[]') return interaction.reply({ content: '❌ Nutze `/gerber start` um zu beginnen!', ephemeral: true });

            const cdKey = `gerber_auftrag_${uId}`;
            const cdTime = cooldowns.get(cdKey);
            if (cdTime && Date.now() - cdTime < 120000) {
                const rest = Math.ceil((120000 - (Date.now() - cdTime)) / 1000);
                return interaction.reply({ content: `⏳ Kein neuer Auftrag verfügbar! Warte noch ${rest}s.`, ephemeral: true });
            }

            cooldowns.set(cdKey, Date.now());
            const auftraege = [
                { kunde: 'Bauer', produkt: 'Gürtel', belohnung: 200 + g.level * 35 },
                { kunde: 'Jäger', produkt: 'Handschuhe', belohnung: 320 + g.level * 50 },
                { kunde: 'Reiter', produkt: 'Sattel', belohnung: 700 + g.level * 90 },
                { kunde: 'Soldat', produkt: 'Stiefel', belohnung: 550 + g.level * 75 },
                { kunde: 'Ritter', produkt: 'Rüstung', belohnung: 1500 + g.level * 160 },
                { kunde: 'König', produkt: 'Legendärer Umhang', belohnung: 3000 + g.level * 250 }
            ];

            const auftrag = auftraege[Math.floor(Math.random() * Math.min(auftraege.length, 2 + Math.floor(g.level / 2)))];
            const qualBonus = 1.0 + g.gerbtechnik * 0.03 + g.schnittkunde * 0.025;
            const verdienst = Math.floor(auftrag.belohnung * qualBonus);

            db.updateBalance(uId, verdienst);
            const xpGain = 18 + Math.floor(verdienst / 30);
            db.db.prepare('UPDATE gerber SET produkte_gefertigt = produkte_gefertigt + 1, gesamtverdienst = gesamtverdienst + ?, xp = xp + ? WHERE user_id = ?').run(verdienst, xpGain, uId);

            const updatedG = getGerber(db, uId);
            const levelUp = checkLevelUp(db, uId, updatedG);

            const embed = new EmbedBuilder()
                .setTitle('📋 Gerberauftrag abgeschlossen!')
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
            const g = getGerber(db, uId);
            if (g.haeute === '[]') return interaction.reply({ content: '❌ Nutze `/gerber start` um zu beginnen!', ephemeral: true });
            if (g.level < 3) return interaction.reply({ content: '❌ Du brauchst Level 3 für Duelle!', ephemeral: true });

            const gegner = interaction.options.getUser('gegner');
            if (gegner.id === uId) return interaction.reply({ content: '❌ Du kannst dich nicht selbst herausfordern!', ephemeral: true });
            if (gegner.bot) return interaction.reply({ content: '❌ Du kannst keinen Bot herausfordern!', ephemeral: true });

            const gg = db.db.prepare('SELECT * FROM gerber WHERE user_id = ?').get(gegner.id);
            if (!gg || gg.haeute === '[]') return interaction.reply({ content: '❌ Dein Gegner ist kein Gerber!', ephemeral: true });

            const scoreA = (g.level * 10) + (g.gerbtechnik * 5) + (g.schnittkunde * 4) + (g.grube * 8) + (g.messer * 6) + (g.rahmen * 7) + Math.random() * 40;
            const scoreB = (gg.level * 10) + (gg.gerbtechnik * 5) + (gg.schnittkunde * 4) + (gg.grube * 8) + (gg.messer * 6) + (gg.rahmen * 7) + Math.random() * 40;

            const gewonnen = scoreA > scoreB;
            const preis = Math.floor(200 + g.level * 50 + gg.level * 50);

            if (gewonnen) {
                db.updateBalance(uId, preis);
                db.db.prepare('UPDATE gerber SET duelle_gewonnen = duelle_gewonnen + 1 WHERE user_id = ?').run(uId);
                db.db.prepare('UPDATE gerber SET duelle_verloren = duelle_verloren + 1 WHERE user_id = ?').run(gegner.id);
            } else {
                db.updateBalance(gegner.id, preis);
                db.db.prepare('UPDATE gerber SET duelle_verloren = duelle_verloren + 1 WHERE user_id = ?').run(uId);
                db.db.prepare('UPDATE gerber SET duelle_gewonnen = duelle_gewonnen + 1 WHERE user_id = ?').run(gegner.id);
            }

            const embed = new EmbedBuilder()
                .setTitle('🏆 Gerber-Duell')
                .setDescription(`🐄 **${interaction.user.username}** vs 🐄 **${gegner.username}**`)
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
