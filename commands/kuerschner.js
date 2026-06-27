const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const PELZE = [
    { name: 'Kaninchenfell', preis: 0, qualitaet: 1.0, emoji: '🐇' },
    { name: 'Fuchspelz', preis: 1700, qualitaet: 1.2, emoji: '🦊' },
    { name: 'Wolfspelz', preis: 3900, qualitaet: 1.4, emoji: '🐺' },
    { name: 'Bärenfell', preis: 8800, qualitaet: 1.7, emoji: '🐻' },
    { name: 'Zobelpelz', preis: 19500, qualitaet: 2.0, emoji: '🦦' },
    { name: 'Silberfuchspelz', preis: 37000, qualitaet: 2.5, emoji: '🦊' },
    { name: 'Einhornfell', preis: 69000, qualitaet: 3.1, emoji: '🦄' },
    { name: 'Phönixfeder-Pelz', preis: 120000, qualitaet: 3.9, emoji: '🔥' }
];

const KLEIDUNG = [
    { name: 'Fellmütze', basisWert: 55, schwierigkeit: 1, minLevel: 1 },
    { name: 'Handschuhe', basisWert: 110, schwierigkeit: 1, minLevel: 1 },
    { name: 'Pelzkragen', basisWert: 230, schwierigkeit: 2, minLevel: 2 },
    { name: 'Pelzweste', basisWert: 470, schwierigkeit: 3, minLevel: 4 },
    { name: 'Pelzmantel', basisWert: 880, schwierigkeit: 4, minLevel: 6 },
    { name: 'Pelzumhang', basisWert: 1550, schwierigkeit: 5, minLevel: 8 },
    { name: 'Königsrobe', basisWert: 3100, schwierigkeit: 7, minLevel: 11 },
    { name: 'Legendärer Hermelinmantel', basisWert: 5900, schwierigkeit: 9, minLevel: 14 }
];

const BEHANDLUNGEN = [
    { name: 'Lufttrocknung', bonus: 1.0, minLevel: 1 },
    { name: 'Salzgerbung', bonus: 1.15, minLevel: 2 },
    { name: 'Räucherung', bonus: 1.3, minLevel: 3 },
    { name: 'Ölbehandlung', bonus: 1.5, minLevel: 5 },
    { name: 'Alaunierung', bonus: 1.7, minLevel: 7 },
    { name: 'Seidenveredelung', bonus: 1.9, minLevel: 9 },
    { name: 'Elfenbehandlung', bonus: 2.3, minLevel: 12 },
    { name: 'Ätherveredelung', bonus: 2.8, minLevel: 15 }
];

const QUALITAETEN = [
    { name: 'Struppig', multi: 0.3, minRoll: 0 },
    { name: 'Rau', multi: 0.5, minRoll: 12 },
    { name: 'Brauchbar', multi: 0.8, minRoll: 26 },
    { name: 'Weich', multi: 1.0, minRoll: 42 },
    { name: 'Seidig', multi: 1.5, minRoll: 58 },
    { name: 'Luxuriös', multi: 2.2, minRoll: 76 },
    { name: 'Meisterhaft', multi: 3.5, minRoll: 93 }
];

const UPGRADES = {
    schneidtisch: { name: 'Schneidtisch', stufen: [0, 1500, 5000, 15000, 40000], bonus: [0, 0.1, 0.2, 0.35, 0.5] },
    nadel: { name: 'Kürschnernadel', stufen: [0, 2000, 6000, 18000, 45000], bonus: [0, 0.08, 0.18, 0.3, 0.45] },
    spannrahmen: { name: 'Pelz-Spannrahmen', stufen: [0, 2500, 7000, 20000, 52000], bonus: [0, 0.1, 0.22, 0.36, 0.52] },
    werkstatt: { name: 'Kürschnerei', stufen: [0, 3000, 9000, 25000, 60000], bonus: [0, 1, 2, 3, 5] }
};

const PELZ_EVENTS = [
    { text: '✨ Der Pelz glänzt wunderbar nach der Behandlung!', qualMulti: 1.5, geldMulti: 1.0 },
    { text: '🪳 Motten haben den Pelz angefressen! Schnelle Rettung!', qualMulti: 0.5, geldMulti: 1.0 },
    { text: '❄️ Kaltes Wetter macht den Pelz besonders flauschig!', qualMulti: 1.4, geldMulti: 1.3 },
    { text: '👑 Die Königin bestellt eine komplette Garderobe!', qualMulti: 1.0, geldMulti: 2.5 },
    { text: '🌟 Seltene Fellzeichnung entdeckt — einzigartig!', qualMulti: 1.6, geldMulti: 1.2 },
    { text: '💧 Feuchtigkeit hat den Pelz beschädigt!', qualMulti: 0.6, geldMulti: 0.8 },
    { text: '🔮 Der Pelz absorbiert magische Wärme!', qualMulti: 1.7, geldMulti: 1.5 }
];

const cooldowns = new Map();

function ensureKuerschnerTable(db) {
    db.db.exec(`CREATE TABLE IF NOT EXISTS kuerschner (
        user_id TEXT PRIMARY KEY,
        pelze TEXT DEFAULT '[]',
        behandlungen TEXT DEFAULT '[]',
        level INTEGER DEFAULT 1,
        xp INTEGER DEFAULT 0,
        werke_gefertigt INTEGER DEFAULT 0,
        beste_qualitaet TEXT DEFAULT '',
        gesamtverdienst INTEGER DEFAULT 0,
        schneidtisch INTEGER DEFAULT 0,
        nadel INTEGER DEFAULT 0,
        spannrahmen INTEGER DEFAULT 0,
        werkstatt INTEGER DEFAULT 0,
        pelzkunde INTEGER DEFAULT 0,
        naehkunst INTEGER DEFAULT 0,
        fellpflege INTEGER DEFAULT 0,
        ausdauer INTEGER DEFAULT 0,
        trainings INTEGER DEFAULT 0,
        duelle_gewonnen INTEGER DEFAULT 0,
        duelle_verloren INTEGER DEFAULT 0,
        letztes_fertigen INTEGER DEFAULT 0,
        letztes_training INTEGER DEFAULT 0
    )`);
    db.db.exec(`CREATE TABLE IF NOT EXISTS kuerschner_garderobe (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        kleidung_typ TEXT,
        pelz TEXT,
        behandlung TEXT,
        qualitaet TEXT,
        wert INTEGER,
        erstellt_am INTEGER DEFAULT 0
    )`);
}

function getKuerschner(db, uId) {
    const row = db.db.prepare('SELECT * FROM kuerschner WHERE user_id = ?').get(uId);
    if (!row) {
        db.db.prepare('INSERT INTO kuerschner (user_id) VALUES (?)').run(uId);
        return db.db.prepare('SELECT * FROM kuerschner WHERE user_id = ?').get(uId);
    }
    return row;
}

function xpForLevel(l) { return l * l * 52; }

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
        db.db.prepare('UPDATE kuerschner SET level = ?, xp = ? WHERE user_id = ?').run(lvl, xp, uId);
    }
    return { lvl, ups };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kuerschner')
        .setDescription('🦊 Kürschnerei - Verarbeite edle Pelze zu luxuriöser Kleidung!')
        .addSubcommand(s => s.setName('start').setDescription('Beginne deine Kürschner-Karriere'))
        .addSubcommand(s => s.setName('status').setDescription('Zeige deinen Kürschner-Status'))
        .addSubcommand(s => s.setName('pelze').setDescription('Zeige verfügbare Pelze'))
        .addSubcommand(s => s.setName('kaufen').setDescription('Kaufe einen neuen Pelz')
            .addStringOption(o => o.setName('pelz').setDescription('Name des Pelzes').setRequired(true)))
        .addSubcommand(s => s.setName('fertigen').setDescription('Fertige ein Pelzkleidungsstück')
            .addStringOption(o => o.setName('kleidung').setDescription('Kleidungstyp').setRequired(true))
            .addStringOption(o => o.setName('pelz').setDescription('Pelzart').setRequired(true))
            .addStringOption(o => o.setName('behandlung').setDescription('Behandlungsmethode').setRequired(true)))
        .addSubcommand(s => s.setName('training').setDescription('Trainiere deine Kürschner-Fähigkeiten')
            .addStringOption(o => o.setName('typ').setDescription('Trainingstyp (pelzkunde/naehkunst/fellpflege/ausdauer)').setRequired(true)))
        .addSubcommand(s => s.setName('upgrade').setDescription('Verbessere deine Ausrüstung')
            .addStringOption(o => o.setName('item').setDescription('Ausrüstung (schneidtisch/nadel/spannrahmen/werkstatt)').setRequired(true)))
        .addSubcommand(s => s.setName('garderobe').setDescription('Zeige deine Pelzgarderobe'))
        .addSubcommand(s => s.setName('auftrag').setDescription('Nimm einen Kürschnerauftrag an'))
        .addSubcommand(s => s.setName('duell').setDescription('Fordere einen anderen Kürschner heraus')
            .addUserOption(o => o.setName('gegner').setDescription('Dein Gegner').setRequired(true))),

    async execute(interaction) {
        const db = interaction.client.db;
        const config = require('../config.json');
        ensureKuerschnerTable(db);
        const uId = interaction.user.id;
        const sub = interaction.options.getSubcommand();

        if (sub === 'start') {
            const existing = db.db.prepare('SELECT * FROM kuerschner WHERE user_id = ?').get(uId);
            if (existing && existing.pelze !== '[]') {
                return interaction.reply({ content: '❌ Du bist bereits ein Kürschner!', ephemeral: true });
            }
            db.db.prepare('INSERT OR REPLACE INTO kuerschner (user_id, pelze, behandlungen) VALUES (?, ?, ?)').run(
                uId, JSON.stringify([PELZE[0].name]), JSON.stringify([BEHANDLUNGEN[0].name])
            );

            const embed = new EmbedBuilder()
                .setTitle('🦊 Willkommen in der Kürschnerei!')
                .setDescription(`Du erhältst **${PELZE[0].name}** ${PELZE[0].emoji} und lernst die **${BEHANDLUNGEN[0].name}**!`)
                .addFields(
                    { name: '🐇 Pelz', value: PELZE[0].name, inline: true },
                    { name: '🧪 Behandlung', value: BEHANDLUNGEN[0].name, inline: true },
                    { name: '💡 Nächster Schritt', value: 'Nutze `/kuerschner fertigen` um dein erstes Pelzkleidungsstück zu fertigen!' }
                )
                .setColor(0xD2691E);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'status') {
            const k = getKuerschner(db, uId);
            if (k.pelze === '[]') return interaction.reply({ content: '❌ Nutze `/kuerschner start` um zu beginnen!', ephemeral: true });
            const pelze = JSON.parse(k.pelze);
            const behandlungen = JSON.parse(k.behandlungen);
            const xpNeeded = xpForLevel(k.level);

            const embed = new EmbedBuilder()
                .setTitle(`🦊 Kürschner ${interaction.user.username}`)
                .addFields(
                    { name: '📊 Level', value: `${k.level} (${k.xp}/${xpNeeded} XP)`, inline: true },
                    { name: '🧥 Gefertigt', value: `${k.werke_gefertigt} Stücke`, inline: true },
                    { name: '💰 Verdienst', value: `${k.gesamtverdienst} Münzen`, inline: true },
                    { name: '🏆 Beste Qualität', value: k.beste_qualitaet || 'Keine', inline: true },
                    { name: '✂️ Schneidtisch', value: `Stufe ${k.schneidtisch}`, inline: true },
                    { name: '🪡 Nadel', value: `Stufe ${k.nadel}`, inline: true },
                    { name: '📐 Spannrahmen', value: `Stufe ${k.spannrahmen}`, inline: true },
                    { name: '🏠 Kürschnerei', value: `Stufe ${k.werkstatt}`, inline: true },
                    { name: '🐇 Pelze', value: `${pelze.length}`, inline: true },
                    { name: '🧪 Behandlungen', value: `${behandlungen.length}`, inline: true },
                    { name: '🏆 Duelle', value: `${k.duelle_gewonnen}W / ${k.duelle_verloren}L`, inline: true }
                )
                .setColor(0xD2691E);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'pelze') {
            const k = getKuerschner(db, uId);
            const besitz = k.pelze !== '[]' ? JSON.parse(k.pelze) : [];
            const lines = PELZE.map(p => {
                const owned = besitz.includes(p.name) ? ' ✅' : '';
                return `${p.emoji} **${p.name}** - ${p.preis > 0 ? `${p.preis} Münzen` : 'Starter'} | Qualität: x${p.qualitaet}${owned}`;
            });
            const embed = new EmbedBuilder()
                .setTitle('🐇 Verfügbare Pelze')
                .setDescription(lines.join('\n'))
                .setColor(0xD2691E);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'kaufen') {
            const k = getKuerschner(db, uId);
            if (k.pelze === '[]') return interaction.reply({ content: '❌ Nutze `/kuerschner start` um zu beginnen!', ephemeral: true });

            const pelzName = interaction.options.getString('pelz');
            const pelz = PELZE.find(p => p.name.toLowerCase() === pelzName.toLowerCase());
            if (!pelz) return interaction.reply({ content: '❌ Unbekannter Pelz!', ephemeral: true });

            const besitz = JSON.parse(k.pelze);
            if (besitz.includes(pelz.name)) return interaction.reply({ content: '❌ Du besitzt diesen Pelz bereits!', ephemeral: true });

            const user = db.getUser(uId);
            if (user.balance < pelz.preis) return interaction.reply({ content: `❌ Du brauchst ${pelz.preis} Münzen! (Hast: ${user.balance})`, ephemeral: true });

            db.updateBalance(uId, -pelz.preis);
            besitz.push(pelz.name);
            db.db.prepare('UPDATE kuerschner SET pelze = ? WHERE user_id = ?').run(JSON.stringify(besitz), uId);

            const embed = new EmbedBuilder()
                .setTitle('🐇 Neuer Pelz!')
                .setDescription(`Du hast **${pelz.name}** ${pelz.emoji} für **${pelz.preis} Münzen** erworben!`)
                .addFields({ name: '📊 Qualitätsbonus', value: `x${pelz.qualitaet}`, inline: true })
                .setColor(0x00FF00);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'fertigen') {
            const k = getKuerschner(db, uId);
            if (k.pelze === '[]') return interaction.reply({ content: '❌ Nutze `/kuerschner start` um zu beginnen!', ephemeral: true });

            const cdKey = `kuerschner_${uId}`;
            const cdTime = cooldowns.get(cdKey);
            if (cdTime && Date.now() - cdTime < 50000) {
                const rest = Math.ceil((50000 - (Date.now() - cdTime)) / 1000);
                return interaction.reply({ content: `⏳ Der Pelz muss noch trocknen! Warte noch ${rest}s.`, ephemeral: true });
            }

            const kleidungName = interaction.options.getString('kleidung');
            const pelzName = interaction.options.getString('pelz');
            const behandlungName = interaction.options.getString('behandlung');

            const kleidung = KLEIDUNG.find(p => p.name.toLowerCase() === kleidungName.toLowerCase());
            if (!kleidung) return interaction.reply({ content: `❌ Unbekannte Kleidung! Verfügbar: ${KLEIDUNG.map(p => p.name).join(', ')}`, ephemeral: true });
            if (k.level < kleidung.minLevel) return interaction.reply({ content: `❌ Du brauchst Level ${kleidung.minLevel} für ${kleidung.name}!`, ephemeral: true });

            const pelz = PELZE.find(p => p.name.toLowerCase() === pelzName.toLowerCase());
            if (!pelz) return interaction.reply({ content: '❌ Unbekannter Pelz!', ephemeral: true });
            const besitz = JSON.parse(k.pelze);
            if (!besitz.includes(pelz.name)) return interaction.reply({ content: '❌ Du besitzt diesen Pelz nicht!', ephemeral: true });

            const behandlung = BEHANDLUNGEN.find(b => b.name.toLowerCase() === behandlungName.toLowerCase());
            if (!behandlung) return interaction.reply({ content: `❌ Unbekannte Behandlung! Verfügbar: ${BEHANDLUNGEN.map(b => b.name).join(', ')}`, ephemeral: true });

            const behandlungen = JSON.parse(k.behandlungen);
            if (!behandlungen.includes(behandlung.name)) {
                if (k.level < behandlung.minLevel) return interaction.reply({ content: `❌ Du brauchst Level ${behandlung.minLevel} für ${behandlung.name}!`, ephemeral: true });
                behandlungen.push(behandlung.name);
                db.db.prepare('UPDATE kuerschner SET behandlungen = ? WHERE user_id = ?').run(JSON.stringify(behandlungen), uId);
            }

            cooldowns.set(cdKey, Date.now());

            const schneidBonus = UPGRADES.schneidtisch.bonus[k.schneidtisch];
            const nadelBonus = UPGRADES.nadel.bonus[k.nadel];
            const spannBonus = UPGRADES.spannrahmen.bonus[k.spannrahmen];
            const pelzBonus = k.pelzkunde * 0.02;
            const naehBonus = k.naehkunst * 0.018;

            let qualRoll = Math.random() * 100;
            qualRoll += (schneidBonus + nadelBonus + spannBonus + pelzBonus + naehBonus) * 28;
            qualRoll *= pelz.qualitaet * behandlung.bonus / kleidung.schwierigkeit;

            let event = null;
            if (Math.random() < 0.2) {
                event = PELZ_EVENTS[Math.floor(Math.random() * PELZ_EVENTS.length)];
                qualRoll *= event.qualMulti;
            }

            qualRoll = Math.min(100, qualRoll);
            let qualitaet = QUALITAETEN[0];
            for (const q of QUALITAETEN) {
                if (qualRoll >= q.minRoll) qualitaet = q;
            }

            let wert = Math.floor(kleidung.basisWert * qualitaet.multi * pelz.qualitaet * behandlung.bonus * (1 + spannBonus));
            if (event) wert = Math.floor(wert * event.geldMulti);

            db.updateBalance(uId, wert);
            const xpGain = 13 + Math.floor(kleidung.schwierigkeit * 5) + Math.floor(wert / 50);

            db.db.prepare('INSERT INTO kuerschner_garderobe (user_id, kleidung_typ, pelz, behandlung, qualitaet, wert, erstellt_am) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
                uId, kleidung.name, pelz.name, behandlung.name, qualitaet.name, wert, Date.now()
            );

            const besteQ = QUALITAETEN.indexOf(qualitaet) > QUALITAETEN.findIndex(q => q.name === k.beste_qualitaet) ? qualitaet.name : (k.beste_qualitaet || qualitaet.name);
            db.db.prepare('UPDATE kuerschner SET werke_gefertigt = werke_gefertigt + 1, gesamtverdienst = gesamtverdienst + ?, xp = xp + ?, beste_qualitaet = ?, letztes_fertigen = ? WHERE user_id = ?').run(
                wert, xpGain, besteQ, Date.now(), uId
            );

            const updatedK = getKuerschner(db, uId);
            const levelUp = checkLevelUp(db, uId, updatedK);

            const embed = new EmbedBuilder()
                .setTitle(`🧥 ${kleidung.name} gefertigt!`)
                .setDescription(`Du hast **${qualitaet.name}e** ${kleidung.name} aus **${pelz.name}** ${pelz.emoji} mit **${behandlung.name}** gefertigt!`)
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
            const k = getKuerschner(db, uId);
            if (k.pelze === '[]') return interaction.reply({ content: '❌ Nutze `/kuerschner start` um zu beginnen!', ephemeral: true });

            const cdKey = `kuerschner_train_${uId}`;
            const cdTime = cooldowns.get(cdKey);
            if (cdTime && Date.now() - cdTime < 60000) {
                const rest = Math.ceil((60000 - (Date.now() - cdTime)) / 1000);
                return interaction.reply({ content: `⏳ Deine Hände brauchen noch Ruhe! Warte noch ${rest}s.`, ephemeral: true });
            }

            const typ = interaction.options.getString('typ').toLowerCase();
            const validTypes = ['pelzkunde', 'naehkunst', 'fellpflege', 'ausdauer'];
            if (!validTypes.includes(typ)) return interaction.reply({ content: `❌ Unbekanntes Training! Verfügbar: ${validTypes.join(', ')}`, ephemeral: true });

            cooldowns.set(cdKey, Date.now());
            const xpGain = 12 + Math.floor(k.level * 2);
            const newVal = k[typ] + 1;

            db.db.prepare(`UPDATE kuerschner SET ${typ} = ?, trainings = trainings + 1, xp = xp + ?, letztes_training = ? WHERE user_id = ?`).run(
                newVal, xpGain, Date.now(), uId
            );

            const updatedK = getKuerschner(db, uId);
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
            const k = getKuerschner(db, uId);
            if (k.pelze === '[]') return interaction.reply({ content: '❌ Nutze `/kuerschner start` um zu beginnen!', ephemeral: true });

            const item = interaction.options.getString('item').toLowerCase();
            const upg = UPGRADES[item];
            if (!upg) return interaction.reply({ content: `❌ Unbekanntes Upgrade! Verfügbar: ${Object.keys(UPGRADES).join(', ')}`, ephemeral: true });

            const currentLvl = k[item];
            if (currentLvl >= 4) return interaction.reply({ content: `❌ ${upg.name} ist bereits auf Maximum (Stufe 4)!`, ephemeral: true });

            const kosten = upg.stufen[currentLvl + 1];
            const user = db.getUser(uId);
            if (user.balance < kosten) return interaction.reply({ content: `❌ Du brauchst ${kosten} Münzen! (Hast: ${user.balance})`, ephemeral: true });

            db.updateBalance(uId, -kosten);
            db.db.prepare(`UPDATE kuerschner SET ${item} = ? WHERE user_id = ?`).run(currentLvl + 1, uId);

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

        if (sub === 'garderobe') {
            const k = getKuerschner(db, uId);
            if (k.pelze === '[]') return interaction.reply({ content: '❌ Nutze `/kuerschner start` um zu beginnen!', ephemeral: true });

            const werke = db.db.prepare('SELECT * FROM kuerschner_garderobe WHERE user_id = ? ORDER BY wert DESC LIMIT 10').all(uId);

            if (werke.length === 0) {
                return interaction.reply({ content: '🧥 Deine Garderobe ist noch leer. Fertige dein erstes Pelzstück!', ephemeral: true });
            }

            const total = db.db.prepare('SELECT COUNT(*) as cnt, SUM(wert) as total FROM kuerschner_garderobe WHERE user_id = ?').get(uId);
            const lines = werke.map((w, i) => `${i + 1}. **${w.kleidung_typ}** (${w.pelz}/${w.behandlung}) - ${w.qualitaet} - ${w.wert} Münzen`);

            const embed = new EmbedBuilder()
                .setTitle('🧥 Pelzgarderobe')
                .setDescription(lines.join('\n'))
                .addFields(
                    { name: '📊 Gesamt', value: `${total.cnt} Stücke`, inline: true },
                    { name: '💰 Gesamtwert', value: `${total.total} Münzen`, inline: true }
                )
                .setColor(0xD2691E);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'auftrag') {
            const k = getKuerschner(db, uId);
            if (k.pelze === '[]') return interaction.reply({ content: '❌ Nutze `/kuerschner start` um zu beginnen!', ephemeral: true });

            const cdKey = `kuerschner_auftrag_${uId}`;
            const cdTime = cooldowns.get(cdKey);
            if (cdTime && Date.now() - cdTime < 120000) {
                const rest = Math.ceil((120000 - (Date.now() - cdTime)) / 1000);
                return interaction.reply({ content: `⏳ Kein neuer Auftrag verfügbar! Warte noch ${rest}s.`, ephemeral: true });
            }

            cooldowns.set(cdKey, Date.now());
            const auftraege = [
                { kunde: 'Bauer', produkt: 'Fellmütze', belohnung: 200 + k.level * 35 },
                { kunde: 'Jäger', produkt: 'Handschuhe', belohnung: 330 + k.level * 50 },
                { kunde: 'Händler', produkt: 'Pelzkragen', belohnung: 550 + k.level * 70 },
                { kunde: 'Baronin', produkt: 'Pelzmantel', belohnung: 900 + k.level * 110 },
                { kunde: 'Fürstin', produkt: 'Pelzumhang', belohnung: 1700 + k.level * 175 },
                { kunde: 'Kaiserin', produkt: 'Königsrobe', belohnung: 3500 + k.level * 280 }
            ];

            const auftrag = auftraege[Math.floor(Math.random() * Math.min(auftraege.length, 2 + Math.floor(k.level / 2)))];
            const qualBonus = 1.0 + k.pelzkunde * 0.03 + k.naehkunst * 0.025;
            const verdienst = Math.floor(auftrag.belohnung * qualBonus);

            db.updateBalance(uId, verdienst);
            const xpGain = 18 + Math.floor(verdienst / 30);
            db.db.prepare('UPDATE kuerschner SET werke_gefertigt = werke_gefertigt + 1, gesamtverdienst = gesamtverdienst + ?, xp = xp + ? WHERE user_id = ?').run(verdienst, xpGain, uId);

            const updatedK = getKuerschner(db, uId);
            const levelUp = checkLevelUp(db, uId, updatedK);

            const embed = new EmbedBuilder()
                .setTitle('📋 Kürschnerauftrag abgeschlossen!')
                .setDescription(`Die **${auftrag.kunde}** hat dich beauftragt, **${auftrag.produkt}** zu fertigen.`)
                .addFields(
                    { name: '💰 Belohnung', value: `${verdienst} Münzen`, inline: true },
                    { name: '⭐ XP', value: `+${xpGain}`, inline: true }
                )
                .setColor(0x00FF00);

            if (levelUp.ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${levelUp.lvl}!` });

            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'duell') {
            const k = getKuerschner(db, uId);
            if (k.pelze === '[]') return interaction.reply({ content: '❌ Nutze `/kuerschner start` um zu beginnen!', ephemeral: true });
            if (k.level < 3) return interaction.reply({ content: '❌ Du brauchst Level 3 für Duelle!', ephemeral: true });

            const gegner = interaction.options.getUser('gegner');
            if (gegner.id === uId) return interaction.reply({ content: '❌ Du kannst dich nicht selbst herausfordern!', ephemeral: true });
            if (gegner.bot) return interaction.reply({ content: '❌ Du kannst keinen Bot herausfordern!', ephemeral: true });

            const gg = db.db.prepare('SELECT * FROM kuerschner WHERE user_id = ?').get(gegner.id);
            if (!gg || gg.pelze === '[]') return interaction.reply({ content: '❌ Dein Gegner ist kein Kürschner!', ephemeral: true });

            const scoreA = (k.level * 10) + (k.pelzkunde * 5) + (k.naehkunst * 4) + (k.schneidtisch * 8) + (k.nadel * 6) + (k.spannrahmen * 7) + Math.random() * 40;
            const scoreB = (gg.level * 10) + (gg.pelzkunde * 5) + (gg.naehkunst * 4) + (gg.schneidtisch * 8) + (gg.nadel * 6) + (gg.spannrahmen * 7) + Math.random() * 40;

            const gewonnen = scoreA > scoreB;
            const preis = Math.floor(200 + k.level * 50 + gg.level * 50);

            if (gewonnen) {
                db.updateBalance(uId, preis);
                db.db.prepare('UPDATE kuerschner SET duelle_gewonnen = duelle_gewonnen + 1 WHERE user_id = ?').run(uId);
                db.db.prepare('UPDATE kuerschner SET duelle_verloren = duelle_verloren + 1 WHERE user_id = ?').run(gegner.id);
            } else {
                db.updateBalance(gegner.id, preis);
                db.db.prepare('UPDATE kuerschner SET duelle_verloren = duelle_verloren + 1 WHERE user_id = ?').run(uId);
                db.db.prepare('UPDATE kuerschner SET duelle_gewonnen = duelle_gewonnen + 1 WHERE user_id = ?').run(gegner.id);
            }

            const embed = new EmbedBuilder()
                .setTitle('🏆 Kürschner-Duell')
                .setDescription(`🦊 **${interaction.user.username}** vs 🦊 **${gegner.username}**`)
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
