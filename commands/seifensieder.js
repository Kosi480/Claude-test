const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const FETTE = [
    { name: 'Talg', preis: 0, qualitaet: 1.0, emoji: '🧈' },
    { name: 'Kokosöl', preis: 1500, qualitaet: 1.2, emoji: '🥥' },
    { name: 'Olivenöl', preis: 3600, qualitaet: 1.4, emoji: '🫒' },
    { name: 'Mandelöl', preis: 8200, qualitaet: 1.7, emoji: '🌰' },
    { name: 'Jojobaöl', preis: 18500, qualitaet: 2.0, emoji: '🌿' },
    { name: 'Arganöl', preis: 35000, qualitaet: 2.5, emoji: '✨' },
    { name: 'Einhorntränen-Öl', preis: 66000, qualitaet: 3.1, emoji: '🦄' },
    { name: 'Ätherisches Sternenöl', preis: 115000, qualitaet: 3.9, emoji: '💫' }
];

const SEIFEN = [
    { name: 'Kernseife', basisWert: 50, schwierigkeit: 1, minLevel: 1 },
    { name: 'Handseife', basisWert: 100, schwierigkeit: 1, minLevel: 1 },
    { name: 'Badeseife', basisWert: 220, schwierigkeit: 2, minLevel: 2 },
    { name: 'Duftseife', basisWert: 440, schwierigkeit: 3, minLevel: 4 },
    { name: 'Heilseife', basisWert: 820, schwierigkeit: 4, minLevel: 6 },
    { name: 'Luxusseife', basisWert: 1450, schwierigkeit: 5, minLevel: 8 },
    { name: 'Königliche Prachtseife', basisWert: 2900, schwierigkeit: 7, minLevel: 11 },
    { name: 'Legendäre Ätherseife', basisWert: 5600, schwierigkeit: 9, minLevel: 14 }
];

const DUEFTE = [
    { name: 'Unparfümiert', bonus: 1.0, minLevel: 1 },
    { name: 'Lavendel', bonus: 1.15, minLevel: 2 },
    { name: 'Rosenblüte', bonus: 1.3, minLevel: 3 },
    { name: 'Honig-Milch', bonus: 1.5, minLevel: 5 },
    { name: 'Sandelholz', bonus: 1.7, minLevel: 7 },
    { name: 'Jasmin-Gold', bonus: 1.9, minLevel: 9 },
    { name: 'Elfenblütenessenz', bonus: 2.3, minLevel: 12 },
    { name: 'Sternenduft', bonus: 2.8, minLevel: 15 }
];

const QUALITAETEN = [
    { name: 'Bröckelig', multi: 0.3, minRoll: 0 },
    { name: 'Rau', multi: 0.5, minRoll: 12 },
    { name: 'Brauchbar', multi: 0.8, minRoll: 26 },
    { name: 'Geschmeidig', multi: 1.0, minRoll: 42 },
    { name: 'Cremig', multi: 1.5, minRoll: 58 },
    { name: 'Luxuriös', multi: 2.2, minRoll: 76 },
    { name: 'Meisterhaft', multi: 3.5, minRoll: 93 }
];

const UPGRADES = {
    kessel: { name: 'Siedekessel', stufen: [0, 1500, 5000, 15000, 40000], bonus: [0, 0.1, 0.2, 0.35, 0.5] },
    ruehrwerk: { name: 'Rührwerk', stufen: [0, 2000, 6000, 18000, 45000], bonus: [0, 0.08, 0.18, 0.3, 0.45] },
    form: { name: 'Seifenform', stufen: [0, 2500, 7000, 20000, 52000], bonus: [0, 0.1, 0.22, 0.36, 0.52] },
    werkstatt: { name: 'Seifensiederei', stufen: [0, 3000, 9000, 25000, 60000], bonus: [0, 1, 2, 3, 5] }
};

const SIEDE_EVENTS = [
    { text: '✨ Perfekte Verseifung! Die Seife wird samtig weich.', qualMulti: 1.5, geldMulti: 1.0 },
    { text: '🔥 Die Lauge ist zu heiß! Die Seife wird fleckig.', qualMulti: 0.5, geldMulti: 1.0 },
    { text: '🌸 Seltene Blüten fallen in den Kessel — wunderbarer Duft!', qualMulti: 1.4, geldMulti: 1.3 },
    { text: '👑 Die Königin bestellt ein ganzes Seifensortiment!', qualMulti: 1.0, geldMulti: 2.5 },
    { text: '🫧 Traumhafte Schaumbildung — die Seife ist perfekt!', qualMulti: 1.6, geldMulti: 1.2 },
    { text: '💧 Zu viel Wasser in der Mischung! Die Seife wird weich.', qualMulti: 0.6, geldMulti: 0.8 },
    { text: '🔮 Magische Kräuter verleihen der Seife heilende Kräfte!', qualMulti: 1.7, geldMulti: 1.5 }
];

const cooldowns = new Map();

function ensureSeifensiederTable(db) {
    db.db.exec(`CREATE TABLE IF NOT EXISTS seifensieder (
        user_id TEXT PRIMARY KEY,
        fette TEXT DEFAULT '[]',
        duefte TEXT DEFAULT '[]',
        level INTEGER DEFAULT 1,
        xp INTEGER DEFAULT 0,
        seifen_gesiedet INTEGER DEFAULT 0,
        beste_qualitaet TEXT DEFAULT '',
        gesamtverdienst INTEGER DEFAULT 0,
        kessel INTEGER DEFAULT 0,
        ruehrwerk INTEGER DEFAULT 0,
        form INTEGER DEFAULT 0,
        werkstatt INTEGER DEFAULT 0,
        siedekunst INTEGER DEFAULT 0,
        duftkunde INTEGER DEFAULT 0,
        laugenmischung INTEGER DEFAULT 0,
        ausdauer INTEGER DEFAULT 0,
        trainings INTEGER DEFAULT 0,
        duelle_gewonnen INTEGER DEFAULT 0,
        duelle_verloren INTEGER DEFAULT 0,
        letztes_sieden INTEGER DEFAULT 0,
        letztes_training INTEGER DEFAULT 0
    )`);
    db.db.exec(`CREATE TABLE IF NOT EXISTS seifensieder_regal (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        seifen_typ TEXT,
        fett TEXT,
        duft TEXT,
        qualitaet TEXT,
        wert INTEGER,
        erstellt_am INTEGER DEFAULT 0
    )`);
}

function getSeifensieder(db, uId) {
    const row = db.db.prepare('SELECT * FROM seifensieder WHERE user_id = ?').get(uId);
    if (!row) {
        db.db.prepare('INSERT INTO seifensieder (user_id) VALUES (?)').run(uId);
        return db.db.prepare('SELECT * FROM seifensieder WHERE user_id = ?').get(uId);
    }
    return row;
}

function xpForLevel(l) { return l * l * 49; }

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
        db.db.prepare('UPDATE seifensieder SET level = ?, xp = ? WHERE user_id = ?').run(lvl, xp, uId);
    }
    return { lvl, ups };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('seifensieder')
        .setDescription('🧼 Seifensiederei - Siede duftende Seifen aus edlen Ölen!')
        .addSubcommand(s => s.setName('start').setDescription('Beginne deine Seifensieder-Karriere'))
        .addSubcommand(s => s.setName('status').setDescription('Zeige deinen Seifensieder-Status'))
        .addSubcommand(s => s.setName('fette').setDescription('Zeige verfügbare Fette und Öle'))
        .addSubcommand(s => s.setName('kaufen').setDescription('Kaufe ein neues Fett')
            .addStringOption(o => o.setName('fett').setDescription('Name des Fetts').setRequired(true)))
        .addSubcommand(s => s.setName('sieden').setDescription('Siede eine Seife')
            .addStringOption(o => o.setName('seife').setDescription('Seifentyp').setRequired(true))
            .addStringOption(o => o.setName('fett').setDescription('Fettart').setRequired(true))
            .addStringOption(o => o.setName('duft').setDescription('Duftsorte').setRequired(true)))
        .addSubcommand(s => s.setName('training').setDescription('Trainiere deine Seifensieder-Fähigkeiten')
            .addStringOption(o => o.setName('typ').setDescription('Trainingstyp (siedekunst/duftkunde/laugenmischung/ausdauer)').setRequired(true)))
        .addSubcommand(s => s.setName('upgrade').setDescription('Verbessere deine Ausrüstung')
            .addStringOption(o => o.setName('item').setDescription('Ausrüstung (kessel/ruehrwerk/form/werkstatt)').setRequired(true)))
        .addSubcommand(s => s.setName('regal').setDescription('Zeige dein Seifenregal'))
        .addSubcommand(s => s.setName('auftrag').setDescription('Nimm einen Seifensiederauftrag an'))
        .addSubcommand(s => s.setName('duell').setDescription('Fordere einen anderen Seifensieder heraus')
            .addUserOption(o => o.setName('gegner').setDescription('Dein Gegner').setRequired(true))),

    async execute(interaction) {
        const db = interaction.client.db;
        const config = require('../config.json');
        ensureSeifensiederTable(db);
        const uId = interaction.user.id;
        const sub = interaction.options.getSubcommand();

        if (sub === 'start') {
            const existing = db.db.prepare('SELECT * FROM seifensieder WHERE user_id = ?').get(uId);
            if (existing && existing.fette !== '[]') {
                return interaction.reply({ content: '❌ Du bist bereits ein Seifensieder!', ephemeral: true });
            }
            db.db.prepare('INSERT OR REPLACE INTO seifensieder (user_id, fette, duefte) VALUES (?, ?, ?)').run(
                uId, JSON.stringify([FETTE[0].name]), JSON.stringify([DUEFTE[0].name])
            );

            const embed = new EmbedBuilder()
                .setTitle('🧼 Willkommen in der Seifensiederei!')
                .setDescription(`Du erhältst **${FETTE[0].name}** ${FETTE[0].emoji} und lernst die **${DUEFTE[0].name}**e Seife!`)
                .addFields(
                    { name: '🧈 Fett', value: FETTE[0].name, inline: true },
                    { name: '🌸 Duft', value: DUEFTE[0].name, inline: true },
                    { name: '💡 Nächster Schritt', value: 'Nutze `/seifensieder sieden` um deine erste Seife zu sieden!' }
                )
                .setColor(0xFFC0CB);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'status') {
            const s = getSeifensieder(db, uId);
            if (s.fette === '[]') return interaction.reply({ content: '❌ Nutze `/seifensieder start` um zu beginnen!', ephemeral: true });
            const fette = JSON.parse(s.fette);
            const duefte = JSON.parse(s.duefte);
            const xpNeeded = xpForLevel(s.level);

            const embed = new EmbedBuilder()
                .setTitle(`🧼 Seifensieder ${interaction.user.username}`)
                .addFields(
                    { name: '📊 Level', value: `${s.level} (${s.xp}/${xpNeeded} XP)`, inline: true },
                    { name: '🧼 Gesiedet', value: `${s.seifen_gesiedet} Seifen`, inline: true },
                    { name: '💰 Verdienst', value: `${s.gesamtverdienst} Münzen`, inline: true },
                    { name: '🏆 Beste Qualität', value: s.beste_qualitaet || 'Keine', inline: true },
                    { name: '🔥 Kessel', value: `Stufe ${s.kessel}`, inline: true },
                    { name: '🥄 Rührwerk', value: `Stufe ${s.ruehrwerk}`, inline: true },
                    { name: '🧱 Form', value: `Stufe ${s.form}`, inline: true },
                    { name: '🏠 Siederei', value: `Stufe ${s.werkstatt}`, inline: true },
                    { name: '🧈 Fette', value: `${fette.length}`, inline: true },
                    { name: '🌸 Düfte', value: `${duefte.length}`, inline: true },
                    { name: '🏆 Duelle', value: `${s.duelle_gewonnen}W / ${s.duelle_verloren}L`, inline: true }
                )
                .setColor(0xFFC0CB);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'fette') {
            const s = getSeifensieder(db, uId);
            const besitz = s.fette !== '[]' ? JSON.parse(s.fette) : [];
            const lines = FETTE.map(f => {
                const owned = besitz.includes(f.name) ? ' ✅' : '';
                return `${f.emoji} **${f.name}** - ${f.preis > 0 ? `${f.preis} Münzen` : 'Starter'} | Qualität: x${f.qualitaet}${owned}`;
            });
            const embed = new EmbedBuilder()
                .setTitle('🧈 Verfügbare Fette & Öle')
                .setDescription(lines.join('\n'))
                .setColor(0xFFC0CB);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'kaufen') {
            const s = getSeifensieder(db, uId);
            if (s.fette === '[]') return interaction.reply({ content: '❌ Nutze `/seifensieder start` um zu beginnen!', ephemeral: true });

            const fettName = interaction.options.getString('fett');
            const fett = FETTE.find(f => f.name.toLowerCase() === fettName.toLowerCase());
            if (!fett) return interaction.reply({ content: '❌ Unbekanntes Fett!', ephemeral: true });

            const besitz = JSON.parse(s.fette);
            if (besitz.includes(fett.name)) return interaction.reply({ content: '❌ Du besitzt dieses Fett bereits!', ephemeral: true });

            const user = db.getUser(uId);
            if (user.balance < fett.preis) return interaction.reply({ content: `❌ Du brauchst ${fett.preis} Münzen! (Hast: ${user.balance})`, ephemeral: true });

            db.updateBalance(uId, -fett.preis);
            besitz.push(fett.name);
            db.db.prepare('UPDATE seifensieder SET fette = ? WHERE user_id = ?').run(JSON.stringify(besitz), uId);

            const embed = new EmbedBuilder()
                .setTitle('🧈 Neues Fett!')
                .setDescription(`Du hast **${fett.name}** ${fett.emoji} für **${fett.preis} Münzen** erworben!`)
                .addFields({ name: '📊 Qualitätsbonus', value: `x${fett.qualitaet}`, inline: true })
                .setColor(0x00FF00);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'sieden') {
            const s = getSeifensieder(db, uId);
            if (s.fette === '[]') return interaction.reply({ content: '❌ Nutze `/seifensieder start` um zu beginnen!', ephemeral: true });

            const cdKey = `seifensieder_${uId}`;
            const cdTime = cooldowns.get(cdKey);
            if (cdTime && Date.now() - cdTime < 50000) {
                const rest = Math.ceil((50000 - (Date.now() - cdTime)) / 1000);
                return interaction.reply({ content: `⏳ Die Seife muss noch aushärten! Warte noch ${rest}s.`, ephemeral: true });
            }

            const seifeName = interaction.options.getString('seife');
            const fettName = interaction.options.getString('fett');
            const duftName = interaction.options.getString('duft');

            const seife = SEIFEN.find(p => p.name.toLowerCase() === seifeName.toLowerCase());
            if (!seife) return interaction.reply({ content: `❌ Unbekannte Seife! Verfügbar: ${SEIFEN.map(p => p.name).join(', ')}`, ephemeral: true });
            if (s.level < seife.minLevel) return interaction.reply({ content: `❌ Du brauchst Level ${seife.minLevel} für ${seife.name}!`, ephemeral: true });

            const fett = FETTE.find(f => f.name.toLowerCase() === fettName.toLowerCase());
            if (!fett) return interaction.reply({ content: '❌ Unbekanntes Fett!', ephemeral: true });
            const besitz = JSON.parse(s.fette);
            if (!besitz.includes(fett.name)) return interaction.reply({ content: '❌ Du besitzt dieses Fett nicht!', ephemeral: true });

            const duft = DUEFTE.find(d => d.name.toLowerCase() === duftName.toLowerCase());
            if (!duft) return interaction.reply({ content: `❌ Unbekannter Duft! Verfügbar: ${DUEFTE.map(d => d.name).join(', ')}`, ephemeral: true });

            const duefte = JSON.parse(s.duefte);
            if (!duefte.includes(duft.name)) {
                if (s.level < duft.minLevel) return interaction.reply({ content: `❌ Du brauchst Level ${duft.minLevel} für ${duft.name}!`, ephemeral: true });
                duefte.push(duft.name);
                db.db.prepare('UPDATE seifensieder SET duefte = ? WHERE user_id = ?').run(JSON.stringify(duefte), uId);
            }

            cooldowns.set(cdKey, Date.now());

            const kesselBonus = UPGRADES.kessel.bonus[s.kessel];
            const ruehrBonus = UPGRADES.ruehrwerk.bonus[s.ruehrwerk];
            const formBonus = UPGRADES.form.bonus[s.form];
            const siedeBonus = s.siedekunst * 0.02;
            const duftBonus = s.duftkunde * 0.018;

            let qualRoll = Math.random() * 100;
            qualRoll += (kesselBonus + ruehrBonus + formBonus + siedeBonus + duftBonus) * 28;
            qualRoll *= fett.qualitaet * duft.bonus / seife.schwierigkeit;

            let event = null;
            if (Math.random() < 0.2) {
                event = SIEDE_EVENTS[Math.floor(Math.random() * SIEDE_EVENTS.length)];
                qualRoll *= event.qualMulti;
            }

            qualRoll = Math.min(100, qualRoll);
            let qualitaet = QUALITAETEN[0];
            for (const q of QUALITAETEN) {
                if (qualRoll >= q.minRoll) qualitaet = q;
            }

            let wert = Math.floor(seife.basisWert * qualitaet.multi * fett.qualitaet * duft.bonus * (1 + formBonus));
            if (event) wert = Math.floor(wert * event.geldMulti);

            db.updateBalance(uId, wert);
            const xpGain = 13 + Math.floor(seife.schwierigkeit * 5) + Math.floor(wert / 50);

            db.db.prepare('INSERT INTO seifensieder_regal (user_id, seifen_typ, fett, duft, qualitaet, wert, erstellt_am) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
                uId, seife.name, fett.name, duft.name, qualitaet.name, wert, Date.now()
            );

            const besteQ = QUALITAETEN.indexOf(qualitaet) > QUALITAETEN.findIndex(q => q.name === s.beste_qualitaet) ? qualitaet.name : (s.beste_qualitaet || qualitaet.name);
            db.db.prepare('UPDATE seifensieder SET seifen_gesiedet = seifen_gesiedet + 1, gesamtverdienst = gesamtverdienst + ?, xp = xp + ?, beste_qualitaet = ?, letztes_sieden = ? WHERE user_id = ?').run(
                wert, xpGain, besteQ, Date.now(), uId
            );

            const updatedS = getSeifensieder(db, uId);
            const levelUp = checkLevelUp(db, uId, updatedS);

            const embed = new EmbedBuilder()
                .setTitle(`🧼 ${seife.name} gesiedet!`)
                .setDescription(`Du hast **${qualitaet.name}e** ${seife.name} aus **${fett.name}** ${fett.emoji} mit **${duft.name}** gesiedet!`)
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
            const s = getSeifensieder(db, uId);
            if (s.fette === '[]') return interaction.reply({ content: '❌ Nutze `/seifensieder start` um zu beginnen!', ephemeral: true });

            const cdKey = `seifensieder_train_${uId}`;
            const cdTime = cooldowns.get(cdKey);
            if (cdTime && Date.now() - cdTime < 60000) {
                const rest = Math.ceil((60000 - (Date.now() - cdTime)) / 1000);
                return interaction.reply({ content: `⏳ Deine Nase braucht noch Erholung! Warte noch ${rest}s.`, ephemeral: true });
            }

            const typ = interaction.options.getString('typ').toLowerCase();
            const validTypes = ['siedekunst', 'duftkunde', 'laugenmischung', 'ausdauer'];
            if (!validTypes.includes(typ)) return interaction.reply({ content: `❌ Unbekanntes Training! Verfügbar: ${validTypes.join(', ')}`, ephemeral: true });

            cooldowns.set(cdKey, Date.now());
            const xpGain = 12 + Math.floor(s.level * 2);
            const newVal = s[typ] + 1;

            db.db.prepare(`UPDATE seifensieder SET ${typ} = ?, trainings = trainings + 1, xp = xp + ?, letztes_training = ? WHERE user_id = ?`).run(
                newVal, xpGain, Date.now(), uId
            );

            const updatedS = getSeifensieder(db, uId);
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
            const s = getSeifensieder(db, uId);
            if (s.fette === '[]') return interaction.reply({ content: '❌ Nutze `/seifensieder start` um zu beginnen!', ephemeral: true });

            const item = interaction.options.getString('item').toLowerCase();
            const upg = UPGRADES[item];
            if (!upg) return interaction.reply({ content: `❌ Unbekanntes Upgrade! Verfügbar: ${Object.keys(UPGRADES).join(', ')}`, ephemeral: true });

            const currentLvl = s[item];
            if (currentLvl >= 4) return interaction.reply({ content: `❌ ${upg.name} ist bereits auf Maximum (Stufe 4)!`, ephemeral: true });

            const kosten = upg.stufen[currentLvl + 1];
            const user = db.getUser(uId);
            if (user.balance < kosten) return interaction.reply({ content: `❌ Du brauchst ${kosten} Münzen! (Hast: ${user.balance})`, ephemeral: true });

            db.updateBalance(uId, -kosten);
            db.db.prepare(`UPDATE seifensieder SET ${item} = ? WHERE user_id = ?`).run(currentLvl + 1, uId);

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
            const s = getSeifensieder(db, uId);
            if (s.fette === '[]') return interaction.reply({ content: '❌ Nutze `/seifensieder start` um zu beginnen!', ephemeral: true });

            const werke = db.db.prepare('SELECT * FROM seifensieder_regal WHERE user_id = ? ORDER BY wert DESC LIMIT 10').all(uId);

            if (werke.length === 0) {
                return interaction.reply({ content: '🧼 Dein Regal ist noch leer. Siede deine erste Seife!', ephemeral: true });
            }

            const total = db.db.prepare('SELECT COUNT(*) as cnt, SUM(wert) as total FROM seifensieder_regal WHERE user_id = ?').get(uId);
            const lines = werke.map((w, i) => `${i + 1}. **${w.seifen_typ}** (${w.fett}/${w.duft}) - ${w.qualitaet} - ${w.wert} Münzen`);

            const embed = new EmbedBuilder()
                .setTitle('🧼 Seifenregal')
                .setDescription(lines.join('\n'))
                .addFields(
                    { name: '📊 Gesamt', value: `${total.cnt} Seifen`, inline: true },
                    { name: '💰 Gesamtwert', value: `${total.total} Münzen`, inline: true }
                )
                .setColor(0xFFC0CB);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'auftrag') {
            const s = getSeifensieder(db, uId);
            if (s.fette === '[]') return interaction.reply({ content: '❌ Nutze `/seifensieder start` um zu beginnen!', ephemeral: true });

            const cdKey = `seifensieder_auftrag_${uId}`;
            const cdTime = cooldowns.get(cdKey);
            if (cdTime && Date.now() - cdTime < 120000) {
                const rest = Math.ceil((120000 - (Date.now() - cdTime)) / 1000);
                return interaction.reply({ content: `⏳ Kein neuer Auftrag verfügbar! Warte noch ${rest}s.`, ephemeral: true });
            }

            cooldowns.set(cdKey, Date.now());
            const auftraege = [
                { kunde: 'Bäuerin', produkt: 'Kernseife', belohnung: 200 + s.level * 30 },
                { kunde: 'Bademeister', produkt: 'Badeseife', belohnung: 350 + s.level * 50 },
                { kunde: 'Apotheker', produkt: 'Heilseife', belohnung: 600 + s.level * 80 },
                { kunde: 'Gräfin', produkt: 'Duftseife', belohnung: 500 + s.level * 65 },
                { kunde: 'Fürstin', produkt: 'Luxusseife', belohnung: 1500 + s.level * 160 },
                { kunde: 'Kaiserin', produkt: 'Prachtseife', belohnung: 3200 + s.level * 260 }
            ];

            const auftrag = auftraege[Math.floor(Math.random() * Math.min(auftraege.length, 2 + Math.floor(s.level / 2)))];
            const qualBonus = 1.0 + s.siedekunst * 0.03 + s.duftkunde * 0.025;
            const verdienst = Math.floor(auftrag.belohnung * qualBonus);

            db.updateBalance(uId, verdienst);
            const xpGain = 18 + Math.floor(verdienst / 30);
            db.db.prepare('UPDATE seifensieder SET seifen_gesiedet = seifen_gesiedet + 1, gesamtverdienst = gesamtverdienst + ?, xp = xp + ? WHERE user_id = ?').run(verdienst, xpGain, uId);

            const updatedS = getSeifensieder(db, uId);
            const levelUp = checkLevelUp(db, uId, updatedS);

            const embed = new EmbedBuilder()
                .setTitle('📋 Seifensiederauftrag abgeschlossen!')
                .setDescription(`Die **${auftrag.kunde}** hat dich beauftragt, **${auftrag.produkt}** zu sieden.`)
                .addFields(
                    { name: '💰 Belohnung', value: `${verdienst} Münzen`, inline: true },
                    { name: '⭐ XP', value: `+${xpGain}`, inline: true }
                )
                .setColor(0x00FF00);

            if (levelUp.ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${levelUp.lvl}!` });

            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'duell') {
            const s = getSeifensieder(db, uId);
            if (s.fette === '[]') return interaction.reply({ content: '❌ Nutze `/seifensieder start` um zu beginnen!', ephemeral: true });
            if (s.level < 3) return interaction.reply({ content: '❌ Du brauchst Level 3 für Duelle!', ephemeral: true });

            const gegner = interaction.options.getUser('gegner');
            if (gegner.id === uId) return interaction.reply({ content: '❌ Du kannst dich nicht selbst herausfordern!', ephemeral: true });
            if (gegner.bot) return interaction.reply({ content: '❌ Du kannst keinen Bot herausfordern!', ephemeral: true });

            const gg = db.db.prepare('SELECT * FROM seifensieder WHERE user_id = ?').get(gegner.id);
            if (!gg || gg.fette === '[]') return interaction.reply({ content: '❌ Dein Gegner ist kein Seifensieder!', ephemeral: true });

            const scoreA = (s.level * 10) + (s.siedekunst * 5) + (s.duftkunde * 4) + (s.kessel * 8) + (s.ruehrwerk * 6) + (s.form * 7) + Math.random() * 40;
            const scoreB = (gg.level * 10) + (gg.siedekunst * 5) + (gg.duftkunde * 4) + (gg.kessel * 8) + (gg.ruehrwerk * 6) + (gg.form * 7) + Math.random() * 40;

            const gewonnen = scoreA > scoreB;
            const preis = Math.floor(200 + s.level * 50 + gg.level * 50);

            if (gewonnen) {
                db.updateBalance(uId, preis);
                db.db.prepare('UPDATE seifensieder SET duelle_gewonnen = duelle_gewonnen + 1 WHERE user_id = ?').run(uId);
                db.db.prepare('UPDATE seifensieder SET duelle_verloren = duelle_verloren + 1 WHERE user_id = ?').run(gegner.id);
            } else {
                db.updateBalance(gegner.id, preis);
                db.db.prepare('UPDATE seifensieder SET duelle_verloren = duelle_verloren + 1 WHERE user_id = ?').run(uId);
                db.db.prepare('UPDATE seifensieder SET duelle_gewonnen = duelle_gewonnen + 1 WHERE user_id = ?').run(gegner.id);
            }

            const embed = new EmbedBuilder()
                .setTitle('🏆 Seifensieder-Duell')
                .setDescription(`🧼 **${interaction.user.username}** vs 🧼 **${gegner.username}**`)
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
