const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const HAEUTE = [
    { name: 'Schafshaut', preis: 0, qualitaet: 1.0, emoji: '🐑' },
    { name: 'Ziegenhaut', preis: 1600, qualitaet: 1.2, emoji: '🐐' },
    { name: 'Kalbshaut', preis: 3700, qualitaet: 1.4, emoji: '🐄' },
    { name: 'Hirschhaut', preis: 8300, qualitaet: 1.7, emoji: '🦌' },
    { name: 'Gazellenhaut', preis: 18500, qualitaet: 2.0, emoji: '🦌' },
    { name: 'Greifenhaut', preis: 35000, qualitaet: 2.5, emoji: '🦅' },
    { name: 'Drachenhaut', preis: 66000, qualitaet: 3.1, emoji: '🐉' },
    { name: 'Phönixhaut', preis: 116000, qualitaet: 3.9, emoji: '🔥' }
];

const PRODUKTE = [
    { name: 'Notizblatt', basisWert: 50, schwierigkeit: 1, minLevel: 1 },
    { name: 'Briefbogen', basisWert: 105, schwierigkeit: 1, minLevel: 1 },
    { name: 'Schriftrolle', basisWert: 220, schwierigkeit: 2, minLevel: 2 },
    { name: 'Urkunde', basisWert: 450, schwierigkeit: 3, minLevel: 4 },
    { name: 'Landkarte', basisWert: 840, schwierigkeit: 4, minLevel: 6 },
    { name: 'Gesetzescodex', basisWert: 1500, schwierigkeit: 5, minLevel: 8 },
    { name: 'Königliche Charta', basisWert: 3000, schwierigkeit: 7, minLevel: 11 },
    { name: 'Legendäres Weltenmanuskript', basisWert: 5700, schwierigkeit: 9, minLevel: 14 }
];

const TECHNIKEN = [
    { name: 'Kalkung', bonus: 1.0, minLevel: 1 },
    { name: 'Entfleischung', bonus: 1.15, minLevel: 2 },
    { name: 'Bimsstein-Glättung', bonus: 1.3, minLevel: 3 },
    { name: 'Kreidebehandlung', bonus: 1.5, minLevel: 5 },
    { name: 'Ölpolitur', bonus: 1.7, minLevel: 7 },
    { name: 'Goldschnitt', bonus: 1.9, minLevel: 9 },
    { name: 'Elfenveredelung', bonus: 2.3, minLevel: 12 },
    { name: 'Ätherversiegelung', bonus: 2.8, minLevel: 15 }
];

const QUALITAETEN = [
    { name: 'Löchrig', multi: 0.3, minRoll: 0 },
    { name: 'Rau', multi: 0.5, minRoll: 12 },
    { name: 'Brauchbar', multi: 0.8, minRoll: 26 },
    { name: 'Glatt', multi: 1.0, minRoll: 42 },
    { name: 'Fein', multi: 1.5, minRoll: 58 },
    { name: 'Exquisit', multi: 2.2, minRoll: 76 },
    { name: 'Meisterhaft', multi: 3.5, minRoll: 93 }
];

const UPGRADES = {
    spannrahmen: { name: 'Spannrahmen', stufen: [0, 1500, 5000, 15000, 40000], bonus: [0, 0.1, 0.2, 0.35, 0.5] },
    schaber: { name: 'Pergamentschaber', stufen: [0, 2000, 6000, 18000, 45000], bonus: [0, 0.08, 0.18, 0.3, 0.45] },
    glaetter: { name: 'Glättstein', stufen: [0, 2500, 7000, 20000, 52000], bonus: [0, 0.1, 0.22, 0.36, 0.52] },
    werkstatt: { name: 'Pergamentwerkstatt', stufen: [0, 3000, 9000, 25000, 60000], bonus: [0, 1, 2, 3, 5] }
};

const PERGAMENT_EVENTS = [
    { text: '✨ Die Haut ist perfekt gespannt — seidenglatt!', qualMulti: 1.5, geldMulti: 1.0 },
    { text: '🕳️ Ein Loch in der Haut! Vorsichtig drumherum arbeiten!', qualMulti: 0.5, geldMulti: 1.0 },
    { text: '🌿 Seltene Kräuter in der Kalklauge — besonderer Glanz!', qualMulti: 1.4, geldMulti: 1.3 },
    { text: '👑 Das Kloster bestellt hundert Blatt für eine Bibel!', qualMulti: 1.0, geldMulti: 2.5 },
    { text: '☀️ Perfektes Trocknungswetter — gleichmäßige Spannung!', qualMulti: 1.6, geldMulti: 1.2 },
    { text: '🌧️ Regen während der Trocknung! Das Pergament wellt sich!', qualMulti: 0.6, geldMulti: 0.8 },
    { text: '🔮 Alte Runen erscheinen auf dem Pergament!', qualMulti: 1.7, geldMulti: 1.5 }
];

const cooldowns = new Map();

function ensurePergamenterTable(db) {
    db.db.exec(`CREATE TABLE IF NOT EXISTS pergamenter (
        user_id TEXT PRIMARY KEY,
        haeute TEXT DEFAULT '[]',
        techniken TEXT DEFAULT '[]',
        level INTEGER DEFAULT 1,
        xp INTEGER DEFAULT 0,
        werke_gefertigt INTEGER DEFAULT 0,
        beste_qualitaet TEXT DEFAULT '',
        gesamtverdienst INTEGER DEFAULT 0,
        spannrahmen INTEGER DEFAULT 0,
        schaber INTEGER DEFAULT 0,
        glaetter INTEGER DEFAULT 0,
        werkstatt INTEGER DEFAULT 0,
        hautbearbeitung INTEGER DEFAULT 0,
        glaettkunst INTEGER DEFAULT 0,
        kalkmischung INTEGER DEFAULT 0,
        ausdauer INTEGER DEFAULT 0,
        trainings INTEGER DEFAULT 0,
        duelle_gewonnen INTEGER DEFAULT 0,
        duelle_verloren INTEGER DEFAULT 0,
        letztes_fertigen INTEGER DEFAULT 0,
        letztes_training INTEGER DEFAULT 0
    )`);
    db.db.exec(`CREATE TABLE IF NOT EXISTS pergamenter_archiv (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        produkt_typ TEXT,
        haut TEXT,
        technik TEXT,
        qualitaet TEXT,
        wert INTEGER,
        erstellt_am INTEGER DEFAULT 0
    )`);
}

function getPergamenter(db, uId) {
    const row = db.db.prepare('SELECT * FROM pergamenter WHERE user_id = ?').get(uId);
    if (!row) {
        db.db.prepare('INSERT INTO pergamenter (user_id) VALUES (?)').run(uId);
        return db.db.prepare('SELECT * FROM pergamenter WHERE user_id = ?').get(uId);
    }
    return row;
}

function xpForLevel(l) { return l * l * 51; }

function checkLevelUp(db, uId, p) {
    let lvl = p.level;
    let xp = p.xp;
    let ups = 0;
    while (xp >= xpForLevel(lvl)) {
        xp -= xpForLevel(lvl);
        lvl++;
        ups++;
    }
    if (ups > 0) {
        db.db.prepare('UPDATE pergamenter SET level = ?, xp = ? WHERE user_id = ?').run(lvl, xp, uId);
    }
    return { lvl, ups };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pergamenter')
        .setDescription('📜 Pergamentmacherei - Fertige edles Pergament aus feinsten Häuten!')
        .addSubcommand(s => s.setName('start').setDescription('Beginne deine Pergamenter-Karriere'))
        .addSubcommand(s => s.setName('status').setDescription('Zeige deinen Pergamenter-Status'))
        .addSubcommand(s => s.setName('haeute').setDescription('Zeige verfügbare Häute'))
        .addSubcommand(s => s.setName('kaufen').setDescription('Kaufe eine neue Haut')
            .addStringOption(o => o.setName('haut').setDescription('Name der Haut').setRequired(true)))
        .addSubcommand(s => s.setName('fertigen').setDescription('Fertige ein Pergamentprodukt')
            .addStringOption(o => o.setName('produkt').setDescription('Produkttyp').setRequired(true))
            .addStringOption(o => o.setName('haut').setDescription('Hautart').setRequired(true))
            .addStringOption(o => o.setName('technik').setDescription('Vorbereitungstechnik').setRequired(true)))
        .addSubcommand(s => s.setName('training').setDescription('Trainiere deine Pergamenter-Fähigkeiten')
            .addStringOption(o => o.setName('typ').setDescription('Trainingstyp (hautbearbeitung/glaettkunst/kalkmischung/ausdauer)').setRequired(true)))
        .addSubcommand(s => s.setName('upgrade').setDescription('Verbessere deine Ausrüstung')
            .addStringOption(o => o.setName('item').setDescription('Ausrüstung (spannrahmen/schaber/glaetter/werkstatt)').setRequired(true)))
        .addSubcommand(s => s.setName('archiv').setDescription('Zeige dein Pergamentarchiv'))
        .addSubcommand(s => s.setName('auftrag').setDescription('Nimm einen Pergamenterauftrag an'))
        .addSubcommand(s => s.setName('duell').setDescription('Fordere einen anderen Pergamenter heraus')
            .addUserOption(o => o.setName('gegner').setDescription('Dein Gegner').setRequired(true))),

    async execute(interaction) {
        const db = interaction.client.db;
        const config = require('../config.json');
        ensurePergamenterTable(db);
        const uId = interaction.user.id;
        const sub = interaction.options.getSubcommand();

        if (sub === 'start') {
            const existing = db.db.prepare('SELECT * FROM pergamenter WHERE user_id = ?').get(uId);
            if (existing && existing.haeute !== '[]') {
                return interaction.reply({ content: '❌ Du bist bereits ein Pergamenter!', ephemeral: true });
            }
            db.db.prepare('INSERT OR REPLACE INTO pergamenter (user_id, haeute, techniken) VALUES (?, ?, ?)').run(
                uId, JSON.stringify([HAEUTE[0].name]), JSON.stringify([TECHNIKEN[0].name])
            );

            const embed = new EmbedBuilder()
                .setTitle('📜 Willkommen in der Pergamentmacherei!')
                .setDescription(`Du erhältst **${HAEUTE[0].name}** ${HAEUTE[0].emoji} und lernst die **${TECHNIKEN[0].name}**!`)
                .addFields(
                    { name: '🐑 Haut', value: HAEUTE[0].name, inline: true },
                    { name: '🧪 Technik', value: TECHNIKEN[0].name, inline: true },
                    { name: '💡 Nächster Schritt', value: 'Nutze `/pergamenter fertigen` um dein erstes Pergament herzustellen!' }
                )
                .setColor(0xF5DEB3);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'status') {
            const p = getPergamenter(db, uId);
            if (p.haeute === '[]') return interaction.reply({ content: '❌ Nutze `/pergamenter start` um zu beginnen!', ephemeral: true });
            const haeute = JSON.parse(p.haeute);
            const techniken = JSON.parse(p.techniken);
            const xpNeeded = xpForLevel(p.level);

            const embed = new EmbedBuilder()
                .setTitle(`📜 Pergamenter ${interaction.user.username}`)
                .addFields(
                    { name: '📊 Level', value: `${p.level} (${p.xp}/${xpNeeded} XP)`, inline: true },
                    { name: '📜 Gefertigt', value: `${p.werke_gefertigt} Werke`, inline: true },
                    { name: '💰 Verdienst', value: `${p.gesamtverdienst} Münzen`, inline: true },
                    { name: '🏆 Beste Qualität', value: p.beste_qualitaet || 'Keine', inline: true },
                    { name: '📐 Spannrahmen', value: `Stufe ${p.spannrahmen}`, inline: true },
                    { name: '🔪 Schaber', value: `Stufe ${p.schaber}`, inline: true },
                    { name: '🪨 Glättstein', value: `Stufe ${p.glaetter}`, inline: true },
                    { name: '🏠 Werkstatt', value: `Stufe ${p.werkstatt}`, inline: true },
                    { name: '🐑 Häute', value: `${haeute.length}`, inline: true },
                    { name: '🧪 Techniken', value: `${techniken.length}`, inline: true },
                    { name: '🏆 Duelle', value: `${p.duelle_gewonnen}W / ${p.duelle_verloren}L`, inline: true }
                )
                .setColor(0xF5DEB3);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'haeute') {
            const p = getPergamenter(db, uId);
            const besitz = p.haeute !== '[]' ? JSON.parse(p.haeute) : [];
            const lines = HAEUTE.map(h => {
                const owned = besitz.includes(h.name) ? ' ✅' : '';
                return `${h.emoji} **${h.name}** - ${h.preis > 0 ? `${h.preis} Münzen` : 'Starter'} | Qualität: x${h.qualitaet}${owned}`;
            });
            const embed = new EmbedBuilder()
                .setTitle('🐑 Verfügbare Häute')
                .setDescription(lines.join('\n'))
                .setColor(0xF5DEB3);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'kaufen') {
            const p = getPergamenter(db, uId);
            if (p.haeute === '[]') return interaction.reply({ content: '❌ Nutze `/pergamenter start` um zu beginnen!', ephemeral: true });

            const hautName = interaction.options.getString('haut');
            const haut = HAEUTE.find(h => h.name.toLowerCase() === hautName.toLowerCase());
            if (!haut) return interaction.reply({ content: '❌ Unbekannte Haut!', ephemeral: true });

            const besitz = JSON.parse(p.haeute);
            if (besitz.includes(haut.name)) return interaction.reply({ content: '❌ Du besitzt diese Haut bereits!', ephemeral: true });

            const user = db.getUser(uId);
            if (user.balance < haut.preis) return interaction.reply({ content: `❌ Du brauchst ${haut.preis} Münzen! (Hast: ${user.balance})`, ephemeral: true });

            db.updateBalance(uId, -haut.preis);
            besitz.push(haut.name);
            db.db.prepare('UPDATE pergamenter SET haeute = ? WHERE user_id = ?').run(JSON.stringify(besitz), uId);

            const embed = new EmbedBuilder()
                .setTitle('🐑 Neue Haut!')
                .setDescription(`Du hast **${haut.name}** ${haut.emoji} für **${haut.preis} Münzen** erworben!`)
                .addFields({ name: '📊 Qualitätsbonus', value: `x${haut.qualitaet}`, inline: true })
                .setColor(0x00FF00);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'fertigen') {
            const p = getPergamenter(db, uId);
            if (p.haeute === '[]') return interaction.reply({ content: '❌ Nutze `/pergamenter start` um zu beginnen!', ephemeral: true });

            const cdKey = `pergamenter_${uId}`;
            const cdTime = cooldowns.get(cdKey);
            if (cdTime && Date.now() - cdTime < 50000) {
                const rest = Math.ceil((50000 - (Date.now() - cdTime)) / 1000);
                return interaction.reply({ content: `⏳ Das Pergament muss noch trocknen! Warte noch ${rest}s.`, ephemeral: true });
            }

            const produktName = interaction.options.getString('produkt');
            const hautName = interaction.options.getString('haut');
            const technikName = interaction.options.getString('technik');

            const produkt = PRODUKTE.find(pr => pr.name.toLowerCase() === produktName.toLowerCase());
            if (!produkt) return interaction.reply({ content: `❌ Unbekanntes Produkt! Verfügbar: ${PRODUKTE.map(pr => pr.name).join(', ')}`, ephemeral: true });
            if (p.level < produkt.minLevel) return interaction.reply({ content: `❌ Du brauchst Level ${produkt.minLevel} für ${produkt.name}!`, ephemeral: true });

            const haut = HAEUTE.find(h => h.name.toLowerCase() === hautName.toLowerCase());
            if (!haut) return interaction.reply({ content: '❌ Unbekannte Haut!', ephemeral: true });
            const besitz = JSON.parse(p.haeute);
            if (!besitz.includes(haut.name)) return interaction.reply({ content: '❌ Du besitzt diese Haut nicht!', ephemeral: true });

            const technik = TECHNIKEN.find(t => t.name.toLowerCase() === technikName.toLowerCase());
            if (!technik) return interaction.reply({ content: `❌ Unbekannte Technik! Verfügbar: ${TECHNIKEN.map(t => t.name).join(', ')}`, ephemeral: true });

            const techniken = JSON.parse(p.techniken);
            if (!techniken.includes(technik.name)) {
                if (p.level < technik.minLevel) return interaction.reply({ content: `❌ Du brauchst Level ${technik.minLevel} für ${technik.name}!`, ephemeral: true });
                techniken.push(technik.name);
                db.db.prepare('UPDATE pergamenter SET techniken = ? WHERE user_id = ?').run(JSON.stringify(techniken), uId);
            }

            cooldowns.set(cdKey, Date.now());

            const spannBonus = UPGRADES.spannrahmen.bonus[p.spannrahmen];
            const schaberBonus = UPGRADES.schaber.bonus[p.schaber];
            const glaettBonus = UPGRADES.glaetter.bonus[p.glaetter];
            const hautBonus = p.hautbearbeitung * 0.02;
            const kunstBonus = p.glaettkunst * 0.018;

            let qualRoll = Math.random() * 100;
            qualRoll += (spannBonus + schaberBonus + glaettBonus + hautBonus + kunstBonus) * 28;
            qualRoll *= haut.qualitaet * technik.bonus / produkt.schwierigkeit;

            let event = null;
            if (Math.random() < 0.2) {
                event = PERGAMENT_EVENTS[Math.floor(Math.random() * PERGAMENT_EVENTS.length)];
                qualRoll *= event.qualMulti;
            }

            qualRoll = Math.min(100, qualRoll);
            let qualitaet = QUALITAETEN[0];
            for (const q of QUALITAETEN) {
                if (qualRoll >= q.minRoll) qualitaet = q;
            }

            let wert = Math.floor(produkt.basisWert * qualitaet.multi * haut.qualitaet * technik.bonus * (1 + glaettBonus));
            if (event) wert = Math.floor(wert * event.geldMulti);

            db.updateBalance(uId, wert);
            const xpGain = 13 + Math.floor(produkt.schwierigkeit * 5) + Math.floor(wert / 50);

            db.db.prepare('INSERT INTO pergamenter_archiv (user_id, produkt_typ, haut, technik, qualitaet, wert, erstellt_am) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
                uId, produkt.name, haut.name, technik.name, qualitaet.name, wert, Date.now()
            );

            const besteQ = QUALITAETEN.indexOf(qualitaet) > QUALITAETEN.findIndex(q => q.name === p.beste_qualitaet) ? qualitaet.name : (p.beste_qualitaet || qualitaet.name);
            db.db.prepare('UPDATE pergamenter SET werke_gefertigt = werke_gefertigt + 1, gesamtverdienst = gesamtverdienst + ?, xp = xp + ?, beste_qualitaet = ?, letztes_fertigen = ? WHERE user_id = ?').run(
                wert, xpGain, besteQ, Date.now(), uId
            );

            const updatedP = getPergamenter(db, uId);
            const levelUp = checkLevelUp(db, uId, updatedP);

            const embed = new EmbedBuilder()
                .setTitle(`📜 ${produkt.name} gefertigt!`)
                .setDescription(`Du hast **${qualitaet.name}es** ${produkt.name} aus **${haut.name}** ${haut.emoji} mit **${technik.name}** gefertigt!`)
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
            const p = getPergamenter(db, uId);
            if (p.haeute === '[]') return interaction.reply({ content: '❌ Nutze `/pergamenter start` um zu beginnen!', ephemeral: true });

            const cdKey = `pergamenter_train_${uId}`;
            const cdTime = cooldowns.get(cdKey);
            if (cdTime && Date.now() - cdTime < 60000) {
                const rest = Math.ceil((60000 - (Date.now() - cdTime)) / 1000);
                return interaction.reply({ content: `⏳ Deine Hände sind noch vom Kalk verätzt! Warte noch ${rest}s.`, ephemeral: true });
            }

            const typ = interaction.options.getString('typ').toLowerCase();
            const validTypes = ['hautbearbeitung', 'glaettkunst', 'kalkmischung', 'ausdauer'];
            if (!validTypes.includes(typ)) return interaction.reply({ content: `❌ Unbekanntes Training! Verfügbar: ${validTypes.join(', ')}`, ephemeral: true });

            cooldowns.set(cdKey, Date.now());
            const xpGain = 12 + Math.floor(p.level * 2);
            const newVal = p[typ] + 1;

            db.db.prepare(`UPDATE pergamenter SET ${typ} = ?, trainings = trainings + 1, xp = xp + ?, letztes_training = ? WHERE user_id = ?`).run(
                newVal, xpGain, Date.now(), uId
            );

            const updatedP = getPergamenter(db, uId);
            const levelUp = checkLevelUp(db, uId, updatedP);

            const embed = new EmbedBuilder()
                .setTitle(`🎓 ${typ.charAt(0).toUpperCase() + typ.slice(1)}-Training`)
                .setDescription(`Du hast deine **${typ}** verbessert!`)
                .addFields(
                    { name: '📈 Fortschritt', value: `${p[typ]} → ${newVal}`, inline: true },
                    { name: '⭐ XP', value: `+${xpGain}`, inline: true }
                )
                .setColor(0x4169E1);

            if (levelUp.ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${levelUp.lvl}!` });

            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'upgrade') {
            const p = getPergamenter(db, uId);
            if (p.haeute === '[]') return interaction.reply({ content: '❌ Nutze `/pergamenter start` um zu beginnen!', ephemeral: true });

            const item = interaction.options.getString('item').toLowerCase();
            const upg = UPGRADES[item];
            if (!upg) return interaction.reply({ content: `❌ Unbekanntes Upgrade! Verfügbar: ${Object.keys(UPGRADES).join(', ')}`, ephemeral: true });

            const currentLvl = p[item];
            if (currentLvl >= 4) return interaction.reply({ content: `❌ ${upg.name} ist bereits auf Maximum (Stufe 4)!`, ephemeral: true });

            const kosten = upg.stufen[currentLvl + 1];
            const user = db.getUser(uId);
            if (user.balance < kosten) return interaction.reply({ content: `❌ Du brauchst ${kosten} Münzen! (Hast: ${user.balance})`, ephemeral: true });

            db.updateBalance(uId, -kosten);
            db.db.prepare(`UPDATE pergamenter SET ${item} = ? WHERE user_id = ?`).run(currentLvl + 1, uId);

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

        if (sub === 'archiv') {
            const p = getPergamenter(db, uId);
            if (p.haeute === '[]') return interaction.reply({ content: '❌ Nutze `/pergamenter start` um zu beginnen!', ephemeral: true });

            const werke = db.db.prepare('SELECT * FROM pergamenter_archiv WHERE user_id = ? ORDER BY wert DESC LIMIT 10').all(uId);

            if (werke.length === 0) {
                return interaction.reply({ content: '📜 Dein Archiv ist noch leer. Fertige dein erstes Pergament!', ephemeral: true });
            }

            const total = db.db.prepare('SELECT COUNT(*) as cnt, SUM(wert) as total FROM pergamenter_archiv WHERE user_id = ?').get(uId);
            const lines = werke.map((w, i) => `${i + 1}. **${w.produkt_typ}** (${w.haut}/${w.technik}) - ${w.qualitaet} - ${w.wert} Münzen`);

            const embed = new EmbedBuilder()
                .setTitle('📜 Pergamentarchiv')
                .setDescription(lines.join('\n'))
                .addFields(
                    { name: '📊 Gesamt', value: `${total.cnt} Werke`, inline: true },
                    { name: '💰 Gesamtwert', value: `${total.total} Münzen`, inline: true }
                )
                .setColor(0xF5DEB3);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'auftrag') {
            const p = getPergamenter(db, uId);
            if (p.haeute === '[]') return interaction.reply({ content: '❌ Nutze `/pergamenter start` um zu beginnen!', ephemeral: true });

            const cdKey = `pergamenter_auftrag_${uId}`;
            const cdTime = cooldowns.get(cdKey);
            if (cdTime && Date.now() - cdTime < 120000) {
                const rest = Math.ceil((120000 - (Date.now() - cdTime)) / 1000);
                return interaction.reply({ content: `⏳ Kein neuer Auftrag verfügbar! Warte noch ${rest}s.`, ephemeral: true });
            }

            cooldowns.set(cdKey, Date.now());
            const auftraege = [
                { kunde: 'Schreiber', produkt: 'Briefbogen', belohnung: 210 + p.level * 35 },
                { kunde: 'Mönch', produkt: 'Schriftrolle', belohnung: 350 + p.level * 50 },
                { kunde: 'Notar', produkt: 'Urkunde', belohnung: 600 + p.level * 80 },
                { kunde: 'Kartograph', produkt: 'Landkarte', belohnung: 900 + p.level * 110 },
                { kunde: 'Bischof', produkt: 'Gesetzescodex', belohnung: 1600 + p.level * 170 },
                { kunde: 'Kaiser', produkt: 'Königliche Charta', belohnung: 3400 + p.level * 270 }
            ];

            const auftrag = auftraege[Math.floor(Math.random() * Math.min(auftraege.length, 2 + Math.floor(p.level / 2)))];
            const qualBonus = 1.0 + p.hautbearbeitung * 0.03 + p.glaettkunst * 0.025;
            const verdienst = Math.floor(auftrag.belohnung * qualBonus);

            db.updateBalance(uId, verdienst);
            const xpGain = 18 + Math.floor(verdienst / 30);
            db.db.prepare('UPDATE pergamenter SET werke_gefertigt = werke_gefertigt + 1, gesamtverdienst = gesamtverdienst + ?, xp = xp + ? WHERE user_id = ?').run(verdienst, xpGain, uId);

            const updatedP = getPergamenter(db, uId);
            const levelUp = checkLevelUp(db, uId, updatedP);

            const embed = new EmbedBuilder()
                .setTitle('📋 Pergamenterauftrag abgeschlossen!')
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
            const p = getPergamenter(db, uId);
            if (p.haeute === '[]') return interaction.reply({ content: '❌ Nutze `/pergamenter start` um zu beginnen!', ephemeral: true });
            if (p.level < 3) return interaction.reply({ content: '❌ Du brauchst Level 3 für Duelle!', ephemeral: true });

            const gegner = interaction.options.getUser('gegner');
            if (gegner.id === uId) return interaction.reply({ content: '❌ Du kannst dich nicht selbst herausfordern!', ephemeral: true });
            if (gegner.bot) return interaction.reply({ content: '❌ Du kannst keinen Bot herausfordern!', ephemeral: true });

            const gg = db.db.prepare('SELECT * FROM pergamenter WHERE user_id = ?').get(gegner.id);
            if (!gg || gg.haeute === '[]') return interaction.reply({ content: '❌ Dein Gegner ist kein Pergamenter!', ephemeral: true });

            const scoreA = (p.level * 10) + (p.hautbearbeitung * 5) + (p.glaettkunst * 4) + (p.spannrahmen * 8) + (p.schaber * 6) + (p.glaetter * 7) + Math.random() * 40;
            const scoreB = (gg.level * 10) + (gg.hautbearbeitung * 5) + (gg.glaettkunst * 4) + (gg.spannrahmen * 8) + (gg.schaber * 6) + (gg.glaetter * 7) + Math.random() * 40;

            const gewonnen = scoreA > scoreB;
            const preis = Math.floor(200 + p.level * 50 + gg.level * 50);

            if (gewonnen) {
                db.updateBalance(uId, preis);
                db.db.prepare('UPDATE pergamenter SET duelle_gewonnen = duelle_gewonnen + 1 WHERE user_id = ?').run(uId);
                db.db.prepare('UPDATE pergamenter SET duelle_verloren = duelle_verloren + 1 WHERE user_id = ?').run(gegner.id);
            } else {
                db.updateBalance(gegner.id, preis);
                db.db.prepare('UPDATE pergamenter SET duelle_verloren = duelle_verloren + 1 WHERE user_id = ?').run(uId);
                db.db.prepare('UPDATE pergamenter SET duelle_gewonnen = duelle_gewonnen + 1 WHERE user_id = ?').run(gegner.id);
            }

            const embed = new EmbedBuilder()
                .setTitle('🏆 Pergamenter-Duell')
                .setDescription(`📜 **${interaction.user.username}** vs 📜 **${gegner.username}**`)
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
