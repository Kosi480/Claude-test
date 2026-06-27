const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const STEINE = [
    { name: 'Sandstein', preis: 0, qualitaet: 1.0, emoji: '🟫' },
    { name: 'Kalkstein', preis: 1600, qualitaet: 1.2, emoji: '🪨' },
    { name: 'Granit', preis: 3800, qualitaet: 1.4, emoji: '🪨' },
    { name: 'Basalt', preis: 8500, qualitaet: 1.7, emoji: '🌑' },
    { name: 'Marmor', preis: 19000, qualitaet: 2.0, emoji: '🤍' },
    { name: 'Jade', preis: 36000, qualitaet: 2.5, emoji: '💚' },
    { name: 'Obsidian', preis: 68000, qualitaet: 3.1, emoji: '🖤' },
    { name: 'Ätherquarz', preis: 118000, qualitaet: 3.9, emoji: '💎' }
];

const SKULPTUREN = [
    { name: 'Pflasterstein', basisWert: 55, schwierigkeit: 1, minLevel: 1 },
    { name: 'Grabstein', basisWert: 110, schwierigkeit: 1, minLevel: 1 },
    { name: 'Brunnen', basisWert: 230, schwierigkeit: 2, minLevel: 2 },
    { name: 'Säule', basisWert: 460, schwierigkeit: 3, minLevel: 4 },
    { name: 'Statue', basisWert: 850, schwierigkeit: 4, minLevel: 6 },
    { name: 'Relief', basisWert: 1500, schwierigkeit: 5, minLevel: 8 },
    { name: 'Kathedralenfenster', basisWert: 3000, schwierigkeit: 7, minLevel: 11 },
    { name: 'Monumentalskulptur', basisWert: 5800, schwierigkeit: 9, minLevel: 14 }
];

const TECHNIKEN = [
    { name: 'Grobes Hauen', bonus: 1.0, minLevel: 1 },
    { name: 'Punktieren', bonus: 1.15, minLevel: 2 },
    { name: 'Bossieren', bonus: 1.3, minLevel: 3 },
    { name: 'Zahneisen', bonus: 1.5, minLevel: 5 },
    { name: 'Schleifen', bonus: 1.7, minLevel: 7 },
    { name: 'Polieren', bonus: 1.9, minLevel: 9 },
    { name: 'Elfenmeißelung', bonus: 2.3, minLevel: 12 },
    { name: 'Ätherformung', bonus: 2.8, minLevel: 15 }
];

const QUALITAETEN = [
    { name: 'Rissig', multi: 0.3, minRoll: 0 },
    { name: 'Grob', multi: 0.5, minRoll: 12 },
    { name: 'Brauchbar', multi: 0.8, minRoll: 26 },
    { name: 'Sauber', multi: 1.0, minRoll: 42 },
    { name: 'Fein', multi: 1.5, minRoll: 58 },
    { name: 'Erhaben', multi: 2.2, minRoll: 76 },
    { name: 'Meisterhaft', multi: 3.5, minRoll: 93 }
];

const UPGRADES = {
    meissel: { name: 'Steinmeißel', stufen: [0, 1500, 5000, 15000, 40000], bonus: [0, 0.1, 0.2, 0.35, 0.5] },
    hammer: { name: 'Fäustel', stufen: [0, 2000, 6000, 18000, 45000], bonus: [0, 0.08, 0.18, 0.3, 0.45] },
    saege: { name: 'Steinsäge', stufen: [0, 2500, 7000, 20000, 52000], bonus: [0, 0.1, 0.22, 0.36, 0.52] },
    werkstatt: { name: 'Steinmetzwerkstatt', stufen: [0, 3000, 9000, 25000, 60000], bonus: [0, 1, 2, 3, 5] }
};

const STEIN_EVENTS = [
    { text: '✨ Perfekter Schlag! Der Stein spaltet sich ideal.', qualMulti: 1.5, geldMulti: 1.0 },
    { text: '💥 Ein Riss durchzieht den Stein! Rettungsversuch!', qualMulti: 0.5, geldMulti: 1.0 },
    { text: '💎 Ein verborgener Kristall glitzert im Inneren!', qualMulti: 1.4, geldMulti: 1.3 },
    { text: '👑 Der Bischof bestellt eine Kathedralenverzierung!', qualMulti: 1.0, geldMulti: 2.5 },
    { text: '🌟 Der Stein hat eine natürliche Maserung — atemberaubend!', qualMulti: 1.6, geldMulti: 1.2 },
    { text: '🔨 Dein Meißel bricht ab! Zeitverlust!', qualMulti: 0.6, geldMulti: 0.8 },
    { text: '🔮 Uralte Runen leuchten im Stein auf!', qualMulti: 1.7, geldMulti: 1.5 }
];

const cooldowns = new Map();

function ensureSteinmetzTable(db) {
    db.db.exec(`CREATE TABLE IF NOT EXISTS steinmetz (
        user_id TEXT PRIMARY KEY,
        steine TEXT DEFAULT '[]',
        techniken TEXT DEFAULT '[]',
        level INTEGER DEFAULT 1,
        xp INTEGER DEFAULT 0,
        werke_gefertigt INTEGER DEFAULT 0,
        beste_qualitaet TEXT DEFAULT '',
        gesamtverdienst INTEGER DEFAULT 0,
        meissel INTEGER DEFAULT 0,
        hammer INTEGER DEFAULT 0,
        saege INTEGER DEFAULT 0,
        werkstatt INTEGER DEFAULT 0,
        bildhauerei INTEGER DEFAULT 0,
        praezision INTEGER DEFAULT 0,
        materialkunde INTEGER DEFAULT 0,
        ausdauer INTEGER DEFAULT 0,
        trainings INTEGER DEFAULT 0,
        duelle_gewonnen INTEGER DEFAULT 0,
        duelle_verloren INTEGER DEFAULT 0,
        letztes_hauen INTEGER DEFAULT 0,
        letztes_training INTEGER DEFAULT 0
    )`);
    db.db.exec(`CREATE TABLE IF NOT EXISTS steinmetz_galerie (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        skulptur_typ TEXT,
        stein TEXT,
        technik TEXT,
        qualitaet TEXT,
        wert INTEGER,
        erstellt_am INTEGER DEFAULT 0
    )`);
}

function getSteinmetz(db, uId) {
    const row = db.db.prepare('SELECT * FROM steinmetz WHERE user_id = ?').get(uId);
    if (!row) {
        db.db.prepare('INSERT INTO steinmetz (user_id) VALUES (?)').run(uId);
        return db.db.prepare('SELECT * FROM steinmetz WHERE user_id = ?').get(uId);
    }
    return row;
}

function xpForLevel(l) { return l * l * 54; }

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
        db.db.prepare('UPDATE steinmetz SET level = ?, xp = ? WHERE user_id = ?').run(lvl, xp, uId);
    }
    return { lvl, ups };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('steinmetz')
        .setDescription('🪨 Steinmetzerei - Meißle Skulpturen aus edlem Stein!')
        .addSubcommand(s => s.setName('start').setDescription('Beginne deine Steinmetz-Karriere'))
        .addSubcommand(s => s.setName('status').setDescription('Zeige deinen Steinmetz-Status'))
        .addSubcommand(s => s.setName('steine').setDescription('Zeige verfügbare Steine'))
        .addSubcommand(s => s.setName('kaufen').setDescription('Kaufe einen neuen Stein')
            .addStringOption(o => o.setName('stein').setDescription('Name des Steins').setRequired(true)))
        .addSubcommand(s => s.setName('meisseln').setDescription('Meißle eine Skulptur')
            .addStringOption(o => o.setName('skulptur').setDescription('Skulpturtyp').setRequired(true))
            .addStringOption(o => o.setName('stein').setDescription('Steinart').setRequired(true))
            .addStringOption(o => o.setName('technik').setDescription('Meißeltechnik').setRequired(true)))
        .addSubcommand(s => s.setName('training').setDescription('Trainiere deine Steinmetz-Fähigkeiten')
            .addStringOption(o => o.setName('typ').setDescription('Trainingstyp (bildhauerei/praezision/materialkunde/ausdauer)').setRequired(true)))
        .addSubcommand(s => s.setName('upgrade').setDescription('Verbessere deine Ausrüstung')
            .addStringOption(o => o.setName('item').setDescription('Ausrüstung (meissel/hammer/saege/werkstatt)').setRequired(true)))
        .addSubcommand(s => s.setName('galerie').setDescription('Zeige deine Skulpturen-Galerie'))
        .addSubcommand(s => s.setName('auftrag').setDescription('Nimm einen Steinmetzauftrag an'))
        .addSubcommand(s => s.setName('duell').setDescription('Fordere einen anderen Steinmetz heraus')
            .addUserOption(o => o.setName('gegner').setDescription('Dein Gegner').setRequired(true))),

    async execute(interaction) {
        const db = interaction.client.db;
        const config = require('../config.json');
        ensureSteinmetzTable(db);
        const uId = interaction.user.id;
        const sub = interaction.options.getSubcommand();

        if (sub === 'start') {
            const existing = db.db.prepare('SELECT * FROM steinmetz WHERE user_id = ?').get(uId);
            if (existing && existing.steine !== '[]') {
                return interaction.reply({ content: '❌ Du bist bereits ein Steinmetz!', ephemeral: true });
            }
            db.db.prepare('INSERT OR REPLACE INTO steinmetz (user_id, steine, techniken) VALUES (?, ?, ?)').run(
                uId, JSON.stringify([STEINE[0].name]), JSON.stringify([TECHNIKEN[0].name])
            );

            const embed = new EmbedBuilder()
                .setTitle('🪨 Willkommen in der Steinmetzerei!')
                .setDescription(`Du erhältst **${STEINE[0].name}** ${STEINE[0].emoji} und lernst das **${TECHNIKEN[0].name}**!`)
                .addFields(
                    { name: '🪨 Stein', value: STEINE[0].name, inline: true },
                    { name: '🔨 Technik', value: TECHNIKEN[0].name, inline: true },
                    { name: '💡 Nächster Schritt', value: 'Nutze `/steinmetz meisseln` um deine erste Skulptur zu schaffen!' }
                )
                .setColor(0x808080);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'status') {
            const s = getSteinmetz(db, uId);
            if (s.steine === '[]') return interaction.reply({ content: '❌ Nutze `/steinmetz start` um zu beginnen!', ephemeral: true });
            const steine = JSON.parse(s.steine);
            const techniken = JSON.parse(s.techniken);
            const xpNeeded = xpForLevel(s.level);

            const embed = new EmbedBuilder()
                .setTitle(`🪨 Steinmetz ${interaction.user.username}`)
                .addFields(
                    { name: '📊 Level', value: `${s.level} (${s.xp}/${xpNeeded} XP)`, inline: true },
                    { name: '🗿 Gefertigt', value: `${s.werke_gefertigt} Werke`, inline: true },
                    { name: '💰 Verdienst', value: `${s.gesamtverdienst} Münzen`, inline: true },
                    { name: '🏆 Beste Qualität', value: s.beste_qualitaet || 'Keine', inline: true },
                    { name: '🔨 Meißel', value: `Stufe ${s.meissel}`, inline: true },
                    { name: '🪓 Fäustel', value: `Stufe ${s.hammer}`, inline: true },
                    { name: '🪚 Steinsäge', value: `Stufe ${s.saege}`, inline: true },
                    { name: '🏠 Werkstatt', value: `Stufe ${s.werkstatt}`, inline: true },
                    { name: '🪨 Steine', value: `${steine.length}`, inline: true },
                    { name: '⚒️ Techniken', value: `${techniken.length}`, inline: true },
                    { name: '🏆 Duelle', value: `${s.duelle_gewonnen}W / ${s.duelle_verloren}L`, inline: true }
                )
                .setColor(0x808080);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'steine') {
            const s = getSteinmetz(db, uId);
            const besitz = s.steine !== '[]' ? JSON.parse(s.steine) : [];
            const lines = STEINE.map(st => {
                const owned = besitz.includes(st.name) ? ' ✅' : '';
                return `${st.emoji} **${st.name}** - ${st.preis > 0 ? `${st.preis} Münzen` : 'Starter'} | Qualität: x${st.qualitaet}${owned}`;
            });
            const embed = new EmbedBuilder()
                .setTitle('🪨 Verfügbare Steine')
                .setDescription(lines.join('\n'))
                .setColor(0x808080);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'kaufen') {
            const s = getSteinmetz(db, uId);
            if (s.steine === '[]') return interaction.reply({ content: '❌ Nutze `/steinmetz start` um zu beginnen!', ephemeral: true });

            const steinName = interaction.options.getString('stein');
            const stein = STEINE.find(st => st.name.toLowerCase() === steinName.toLowerCase());
            if (!stein) return interaction.reply({ content: '❌ Unbekannter Stein!', ephemeral: true });

            const steine = JSON.parse(s.steine);
            if (steine.includes(stein.name)) return interaction.reply({ content: '❌ Du besitzt diesen Stein bereits!', ephemeral: true });

            const user = db.getUser(uId);
            if (user.balance < stein.preis) return interaction.reply({ content: `❌ Du brauchst ${stein.preis} Münzen! (Hast: ${user.balance})`, ephemeral: true });

            db.updateBalance(uId, -stein.preis);
            steine.push(stein.name);
            db.db.prepare('UPDATE steinmetz SET steine = ? WHERE user_id = ?').run(JSON.stringify(steine), uId);

            const embed = new EmbedBuilder()
                .setTitle('🪨 Neuer Stein!')
                .setDescription(`Du hast **${stein.name}** ${stein.emoji} für **${stein.preis} Münzen** erworben!`)
                .addFields({ name: '📊 Qualitätsbonus', value: `x${stein.qualitaet}`, inline: true })
                .setColor(0x00FF00);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'meisseln') {
            const s = getSteinmetz(db, uId);
            if (s.steine === '[]') return interaction.reply({ content: '❌ Nutze `/steinmetz start` um zu beginnen!', ephemeral: true });

            const cdKey = `steinmetz_${uId}`;
            const cdTime = cooldowns.get(cdKey);
            if (cdTime && Date.now() - cdTime < 55000) {
                const rest = Math.ceil((55000 - (Date.now() - cdTime)) / 1000);
                return interaction.reply({ content: `⏳ Der Steinstaub muss sich noch setzen! Warte noch ${rest}s.`, ephemeral: true });
            }

            const skulpturName = interaction.options.getString('skulptur');
            const steinName = interaction.options.getString('stein');
            const technikName = interaction.options.getString('technik');

            const skulptur = SKULPTUREN.find(p => p.name.toLowerCase() === skulpturName.toLowerCase());
            if (!skulptur) return interaction.reply({ content: `❌ Unbekannte Skulptur! Verfügbar: ${SKULPTUREN.map(p => p.name).join(', ')}`, ephemeral: true });
            if (s.level < skulptur.minLevel) return interaction.reply({ content: `❌ Du brauchst Level ${skulptur.minLevel} für ${skulptur.name}!`, ephemeral: true });

            const stein = STEINE.find(st => st.name.toLowerCase() === steinName.toLowerCase());
            if (!stein) return interaction.reply({ content: '❌ Unbekannter Stein!', ephemeral: true });
            const steine = JSON.parse(s.steine);
            if (!steine.includes(stein.name)) return interaction.reply({ content: '❌ Du besitzt diesen Stein nicht!', ephemeral: true });

            const technik = TECHNIKEN.find(t => t.name.toLowerCase() === technikName.toLowerCase());
            if (!technik) return interaction.reply({ content: `❌ Unbekannte Technik! Verfügbar: ${TECHNIKEN.map(t => t.name).join(', ')}`, ephemeral: true });

            const techniken = JSON.parse(s.techniken);
            if (!techniken.includes(technik.name)) {
                if (s.level < technik.minLevel) return interaction.reply({ content: `❌ Du brauchst Level ${technik.minLevel} für ${technik.name}!`, ephemeral: true });
                techniken.push(technik.name);
                db.db.prepare('UPDATE steinmetz SET techniken = ? WHERE user_id = ?').run(JSON.stringify(techniken), uId);
            }

            cooldowns.set(cdKey, Date.now());

            const meisselBonus = UPGRADES.meissel.bonus[s.meissel];
            const hammerBonus = UPGRADES.hammer.bonus[s.hammer];
            const saegeBonus = UPGRADES.saege.bonus[s.saege];
            const bildBonus = s.bildhauerei * 0.02;
            const praezBonus = s.praezision * 0.018;

            let qualRoll = Math.random() * 100;
            qualRoll += (meisselBonus + hammerBonus + saegeBonus + bildBonus + praezBonus) * 28;
            qualRoll *= stein.qualitaet * technik.bonus / skulptur.schwierigkeit;

            let event = null;
            if (Math.random() < 0.2) {
                event = STEIN_EVENTS[Math.floor(Math.random() * STEIN_EVENTS.length)];
                qualRoll *= event.qualMulti;
            }

            qualRoll = Math.min(100, qualRoll);
            let qualitaet = QUALITAETEN[0];
            for (const q of QUALITAETEN) {
                if (qualRoll >= q.minRoll) qualitaet = q;
            }

            let wert = Math.floor(skulptur.basisWert * qualitaet.multi * stein.qualitaet * technik.bonus * (1 + saegeBonus));
            if (event) wert = Math.floor(wert * event.geldMulti);

            db.updateBalance(uId, wert);
            const xpGain = 14 + Math.floor(skulptur.schwierigkeit * 5) + Math.floor(wert / 50);

            db.db.prepare('INSERT INTO steinmetz_galerie (user_id, skulptur_typ, stein, technik, qualitaet, wert, erstellt_am) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
                uId, skulptur.name, stein.name, technik.name, qualitaet.name, wert, Date.now()
            );

            const besteQ = QUALITAETEN.indexOf(qualitaet) > QUALITAETEN.findIndex(q => q.name === s.beste_qualitaet) ? qualitaet.name : (s.beste_qualitaet || qualitaet.name);
            db.db.prepare('UPDATE steinmetz SET werke_gefertigt = werke_gefertigt + 1, gesamtverdienst = gesamtverdienst + ?, xp = xp + ?, beste_qualitaet = ?, letztes_hauen = ? WHERE user_id = ?').run(
                wert, xpGain, besteQ, Date.now(), uId
            );

            const updatedS = getSteinmetz(db, uId);
            const levelUp = checkLevelUp(db, uId, updatedS);

            const embed = new EmbedBuilder()
                .setTitle(`🗿 ${skulptur.name} gemeißelt!`)
                .setDescription(`Du hast eine **${qualitaet.name}e** ${skulptur.name} aus **${stein.name}** ${stein.emoji} mit **${technik.name}** geschaffen!`)
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
            const s = getSteinmetz(db, uId);
            if (s.steine === '[]') return interaction.reply({ content: '❌ Nutze `/steinmetz start` um zu beginnen!', ephemeral: true });

            const cdKey = `steinmetz_train_${uId}`;
            const cdTime = cooldowns.get(cdKey);
            if (cdTime && Date.now() - cdTime < 60000) {
                const rest = Math.ceil((60000 - (Date.now() - cdTime)) / 1000);
                return interaction.reply({ content: `⏳ Deine Arme sind noch schwer! Warte noch ${rest}s.`, ephemeral: true });
            }

            const typ = interaction.options.getString('typ').toLowerCase();
            const validTypes = ['bildhauerei', 'praezision', 'materialkunde', 'ausdauer'];
            if (!validTypes.includes(typ)) return interaction.reply({ content: `❌ Unbekanntes Training! Verfügbar: ${validTypes.join(', ')}`, ephemeral: true });

            cooldowns.set(cdKey, Date.now());
            const xpGain = 12 + Math.floor(s.level * 2);
            const newVal = s[typ] + 1;

            db.db.prepare(`UPDATE steinmetz SET ${typ} = ?, trainings = trainings + 1, xp = xp + ?, letztes_training = ? WHERE user_id = ?`).run(
                newVal, xpGain, Date.now(), uId
            );

            const updatedS = getSteinmetz(db, uId);
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
            const s = getSteinmetz(db, uId);
            if (s.steine === '[]') return interaction.reply({ content: '❌ Nutze `/steinmetz start` um zu beginnen!', ephemeral: true });

            const item = interaction.options.getString('item').toLowerCase();
            const upg = UPGRADES[item];
            if (!upg) return interaction.reply({ content: `❌ Unbekanntes Upgrade! Verfügbar: ${Object.keys(UPGRADES).join(', ')}`, ephemeral: true });

            const currentLvl = s[item];
            if (currentLvl >= 4) return interaction.reply({ content: `❌ ${upg.name} ist bereits auf Maximum (Stufe 4)!`, ephemeral: true });

            const kosten = upg.stufen[currentLvl + 1];
            const user = db.getUser(uId);
            if (user.balance < kosten) return interaction.reply({ content: `❌ Du brauchst ${kosten} Münzen! (Hast: ${user.balance})`, ephemeral: true });

            db.updateBalance(uId, -kosten);
            db.db.prepare(`UPDATE steinmetz SET ${item} = ? WHERE user_id = ?`).run(currentLvl + 1, uId);

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

        if (sub === 'galerie') {
            const s = getSteinmetz(db, uId);
            if (s.steine === '[]') return interaction.reply({ content: '❌ Nutze `/steinmetz start` um zu beginnen!', ephemeral: true });

            const werke = db.db.prepare('SELECT * FROM steinmetz_galerie WHERE user_id = ? ORDER BY wert DESC LIMIT 10').all(uId);

            if (werke.length === 0) {
                return interaction.reply({ content: '🗿 Deine Galerie ist noch leer. Meißle deine erste Skulptur!', ephemeral: true });
            }

            const total = db.db.prepare('SELECT COUNT(*) as cnt, SUM(wert) as total FROM steinmetz_galerie WHERE user_id = ?').get(uId);
            const lines = werke.map((w, i) => `${i + 1}. **${w.skulptur_typ}** (${w.stein}/${w.technik}) - ${w.qualitaet} - ${w.wert} Münzen`);

            const embed = new EmbedBuilder()
                .setTitle('🗿 Skulpturen-Galerie')
                .setDescription(lines.join('\n'))
                .addFields(
                    { name: '📊 Gesamt', value: `${total.cnt} Werke`, inline: true },
                    { name: '💰 Gesamtwert', value: `${total.total} Münzen`, inline: true }
                )
                .setColor(0x808080);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'auftrag') {
            const s = getSteinmetz(db, uId);
            if (s.steine === '[]') return interaction.reply({ content: '❌ Nutze `/steinmetz start` um zu beginnen!', ephemeral: true });

            const cdKey = `steinmetz_auftrag_${uId}`;
            const cdTime = cooldowns.get(cdKey);
            if (cdTime && Date.now() - cdTime < 120000) {
                const rest = Math.ceil((120000 - (Date.now() - cdTime)) / 1000);
                return interaction.reply({ content: `⏳ Kein neuer Auftrag verfügbar! Warte noch ${rest}s.`, ephemeral: true });
            }

            cooldowns.set(cdKey, Date.now());
            const auftraege = [
                { kunde: 'Bauer', produkt: 'Pflasterstein', belohnung: 220 + s.level * 35 },
                { kunde: 'Priester', produkt: 'Grabstein', belohnung: 350 + s.level * 55 },
                { kunde: 'Bürgermeister', produkt: 'Brunnen', belohnung: 600 + s.level * 80 },
                { kunde: 'Architekt', produkt: 'Säule', belohnung: 900 + s.level * 110 },
                { kunde: 'Fürst', produkt: 'Statue', belohnung: 1800 + s.level * 180 },
                { kunde: 'Kaiser', produkt: 'Monumentalskulptur', belohnung: 3800 + s.level * 300 }
            ];

            const auftrag = auftraege[Math.floor(Math.random() * Math.min(auftraege.length, 2 + Math.floor(s.level / 2)))];
            const qualBonus = 1.0 + s.bildhauerei * 0.03 + s.praezision * 0.025;
            const verdienst = Math.floor(auftrag.belohnung * qualBonus);

            db.updateBalance(uId, verdienst);
            const xpGain = 18 + Math.floor(verdienst / 30);
            db.db.prepare('UPDATE steinmetz SET werke_gefertigt = werke_gefertigt + 1, gesamtverdienst = gesamtverdienst + ?, xp = xp + ? WHERE user_id = ?').run(verdienst, xpGain, uId);

            const updatedS = getSteinmetz(db, uId);
            const levelUp = checkLevelUp(db, uId, updatedS);

            const embed = new EmbedBuilder()
                .setTitle('📋 Steinmetzauftrag abgeschlossen!')
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
            const s = getSteinmetz(db, uId);
            if (s.steine === '[]') return interaction.reply({ content: '❌ Nutze `/steinmetz start` um zu beginnen!', ephemeral: true });
            if (s.level < 3) return interaction.reply({ content: '❌ Du brauchst Level 3 für Duelle!', ephemeral: true });

            const gegner = interaction.options.getUser('gegner');
            if (gegner.id === uId) return interaction.reply({ content: '❌ Du kannst dich nicht selbst herausfordern!', ephemeral: true });
            if (gegner.bot) return interaction.reply({ content: '❌ Du kannst keinen Bot herausfordern!', ephemeral: true });

            const gg = db.db.prepare('SELECT * FROM steinmetz WHERE user_id = ?').get(gegner.id);
            if (!gg || gg.steine === '[]') return interaction.reply({ content: '❌ Dein Gegner ist kein Steinmetz!', ephemeral: true });

            const scoreA = (s.level * 10) + (s.bildhauerei * 5) + (s.praezision * 4) + (s.meissel * 8) + (s.hammer * 6) + (s.saege * 7) + Math.random() * 40;
            const scoreB = (gg.level * 10) + (gg.bildhauerei * 5) + (gg.praezision * 4) + (gg.meissel * 8) + (gg.hammer * 6) + (gg.saege * 7) + Math.random() * 40;

            const gewonnen = scoreA > scoreB;
            const preis = Math.floor(200 + s.level * 50 + gg.level * 50);

            if (gewonnen) {
                db.updateBalance(uId, preis);
                db.db.prepare('UPDATE steinmetz SET duelle_gewonnen = duelle_gewonnen + 1 WHERE user_id = ?').run(uId);
                db.db.prepare('UPDATE steinmetz SET duelle_verloren = duelle_verloren + 1 WHERE user_id = ?').run(gegner.id);
            } else {
                db.updateBalance(gegner.id, preis);
                db.db.prepare('UPDATE steinmetz SET duelle_verloren = duelle_verloren + 1 WHERE user_id = ?').run(uId);
                db.db.prepare('UPDATE steinmetz SET duelle_gewonnen = duelle_gewonnen + 1 WHERE user_id = ?').run(gegner.id);
            }

            const embed = new EmbedBuilder()
                .setTitle('🏆 Steinmetz-Duell')
                .setDescription(`🪨 **${interaction.user.username}** vs 🪨 **${gegner.username}**`)
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
