const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const ZUTATEN = [
    { name: 'Roggenmaische', preis: 0, qualitaet: 1.0, emoji: '🌾' },
    { name: 'Weintrester', preis: 1600, qualitaet: 1.2, emoji: '🍇' },
    { name: 'Apfelmaische', preis: 3700, qualitaet: 1.4, emoji: '🍎' },
    { name: 'Gerstenmalz', preis: 8400, qualitaet: 1.7, emoji: '🌿' },
    { name: 'Zuckerrohr', preis: 18500, qualitaet: 2.0, emoji: '🎋' },
    { name: 'Elfenbeeren', preis: 36000, qualitaet: 2.5, emoji: '✨' },
    { name: 'Mondfrüchte', preis: 67000, qualitaet: 3.1, emoji: '🌙' },
    { name: 'Äthernektar', preis: 117000, qualitaet: 3.9, emoji: '💫' }
];

const BRANNTWEINE = [
    { name: 'Einfacher Brand', basisWert: 55, schwierigkeit: 1, minLevel: 1 },
    { name: 'Korn', basisWert: 110, schwierigkeit: 1, minLevel: 1 },
    { name: 'Obstbrand', basisWert: 230, schwierigkeit: 2, minLevel: 2 },
    { name: 'Whisky', basisWert: 460, schwierigkeit: 3, minLevel: 4 },
    { name: 'Rum', basisWert: 860, schwierigkeit: 4, minLevel: 6 },
    { name: 'Weinbrand', basisWert: 1520, schwierigkeit: 5, minLevel: 8 },
    { name: 'Elfenschnaps', basisWert: 3050, schwierigkeit: 7, minLevel: 11 },
    { name: 'Legendäres Götterelixier', basisWert: 5800, schwierigkeit: 9, minLevel: 14 }
];

const FAESSER = [
    { name: 'Eichenfass', bonus: 1.0, minLevel: 1 },
    { name: 'Kirschholzfass', bonus: 1.15, minLevel: 2 },
    { name: 'Kastanienfass', bonus: 1.3, minLevel: 3 },
    { name: 'Apfelholzfass', bonus: 1.5, minLevel: 5 },
    { name: 'Wacholderfass', bonus: 1.7, minLevel: 7 },
    { name: 'Rotwein-Fass', bonus: 1.9, minLevel: 9 },
    { name: 'Elfenholzfass', bonus: 2.3, minLevel: 12 },
    { name: 'Ätherkristallfass', bonus: 2.8, minLevel: 15 }
];

const QUALITAETEN = [
    { name: 'Fusel', multi: 0.3, minRoll: 0 },
    { name: 'Rau', multi: 0.5, minRoll: 12 },
    { name: 'Brauchbar', multi: 0.8, minRoll: 26 },
    { name: 'Rund', multi: 1.0, minRoll: 42 },
    { name: 'Samtweich', multi: 1.5, minRoll: 58 },
    { name: 'Exquisit', multi: 2.2, minRoll: 76 },
    { name: 'Meisterhaft', multi: 3.5, minRoll: 93 }
];

const UPGRADES = {
    destille: { name: 'Destille', stufen: [0, 1500, 5000, 15000, 40000], bonus: [0, 0.1, 0.2, 0.35, 0.5] },
    kuehlschlange: { name: 'Kühlschlange', stufen: [0, 2000, 6000, 18000, 45000], bonus: [0, 0.08, 0.18, 0.3, 0.45] },
    reifekeller: { name: 'Reifekeller', stufen: [0, 2500, 7000, 20000, 52000], bonus: [0, 0.1, 0.22, 0.36, 0.52] },
    werkstatt: { name: 'Brennerei', stufen: [0, 3000, 9000, 25000, 60000], bonus: [0, 1, 2, 3, 5] }
};

const DESTILL_EVENTS = [
    { text: '✨ Perfekter Schnitt! Nur reines Herzstück fließt durch!', qualMulti: 1.5, geldMulti: 1.0 },
    { text: '💥 Der Vorlauf wird nicht getrennt! Fuselgefahr!', qualMulti: 0.5, geldMulti: 1.0 },
    { text: '🌿 Seltene Kräuter fallen in den Kessel — ungeahntes Aroma!', qualMulti: 1.4, geldMulti: 1.3 },
    { text: '👑 Ein Fürst bestellt eine ganze Jahresproduktion!', qualMulti: 1.0, geldMulti: 2.5 },
    { name: '🌡️ Ideale Destillationstemperatur — kristallklarer Brand!', qualMulti: 1.6, geldMulti: 1.2 },
    { text: '🔥 Das Feuer ist zu heiß! Der Brand karamelisiert!', qualMulti: 0.6, geldMulti: 0.8 },
    { text: '🔮 Magische Energie aus dem Holzfass dringt in den Brand!', qualMulti: 1.7, geldMulti: 1.5 }
];

const cooldowns = new Map();

function ensureDestillateurTable(db) {
    db.db.exec(`CREATE TABLE IF NOT EXISTS destillateur (
        user_id TEXT PRIMARY KEY,
        zutaten TEXT DEFAULT '[]',
        faesser TEXT DEFAULT '[]',
        level INTEGER DEFAULT 1,
        xp INTEGER DEFAULT 0,
        brände_destilliert INTEGER DEFAULT 0,
        beste_qualitaet TEXT DEFAULT '',
        gesamtverdienst INTEGER DEFAULT 0,
        destille INTEGER DEFAULT 0,
        kuehlschlange INTEGER DEFAULT 0,
        reifekeller INTEGER DEFAULT 0,
        werkstatt INTEGER DEFAULT 0,
        destillierkunst INTEGER DEFAULT 0,
        reifung INTEGER DEFAULT 0,
        aromakunde INTEGER DEFAULT 0,
        ausdauer INTEGER DEFAULT 0,
        trainings INTEGER DEFAULT 0,
        duelle_gewonnen INTEGER DEFAULT 0,
        duelle_verloren INTEGER DEFAULT 0,
        letztes_destillieren INTEGER DEFAULT 0,
        letztes_training INTEGER DEFAULT 0
    )`);
    db.db.exec(`CREATE TABLE IF NOT EXISTS destillateur_keller (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        brand_typ TEXT,
        zutat TEXT,
        fass TEXT,
        qualitaet TEXT,
        wert INTEGER,
        erstellt_am INTEGER DEFAULT 0
    )`);
}

function getDestillateur(db, uId) {
    const row = db.db.prepare('SELECT * FROM destillateur WHERE user_id = ?').get(uId);
    if (!row) {
        db.db.prepare('INSERT INTO destillateur (user_id) VALUES (?)').run(uId);
        return db.db.prepare('SELECT * FROM destillateur WHERE user_id = ?').get(uId);
    }
    return row;
}

function xpForLevel(l) { return l * l * 52; }

function checkLevelUp(db, uId, d) {
    let lvl = d.level;
    let xp = d.xp;
    let ups = 0;
    while (xp >= xpForLevel(lvl)) {
        xp -= xpForLevel(lvl);
        lvl++;
        ups++;
    }
    if (ups > 0) {
        db.db.prepare('UPDATE destillateur SET level = ?, xp = ? WHERE user_id = ?').run(lvl, xp, uId);
    }
    return { lvl, ups };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('destillateur')
        .setDescription('🥃 Brennerei - Destilliere edle Brände aus feinsten Zutaten!')
        .addSubcommand(s => s.setName('start').setDescription('Beginne deine Destillateur-Karriere'))
        .addSubcommand(s => s.setName('status').setDescription('Zeige deinen Destillateur-Status'))
        .addSubcommand(s => s.setName('zutaten').setDescription('Zeige verfügbare Zutaten'))
        .addSubcommand(s => s.setName('kaufen').setDescription('Kaufe eine neue Zutat')
            .addStringOption(o => o.setName('zutat').setDescription('Name der Zutat').setRequired(true)))
        .addSubcommand(s => s.setName('destillieren').setDescription('Destilliere einen Brand')
            .addStringOption(o => o.setName('brand').setDescription('Brandtyp').setRequired(true))
            .addStringOption(o => o.setName('zutat').setDescription('Zutatensorte').setRequired(true))
            .addStringOption(o => o.setName('fass').setDescription('Reifefass').setRequired(true)))
        .addSubcommand(s => s.setName('training').setDescription('Trainiere deine Destillateur-Fähigkeiten')
            .addStringOption(o => o.setName('typ').setDescription('Trainingstyp (destillierkunst/reifung/aromakunde/ausdauer)').setRequired(true)))
        .addSubcommand(s => s.setName('upgrade').setDescription('Verbessere deine Ausrüstung')
            .addStringOption(o => o.setName('item').setDescription('Ausrüstung (destille/kuehlschlange/reifekeller/werkstatt)').setRequired(true)))
        .addSubcommand(s => s.setName('keller').setDescription('Zeige deinen Brennereikeller'))
        .addSubcommand(s => s.setName('auftrag').setDescription('Nimm einen Brennereiauftrag an'))
        .addSubcommand(s => s.setName('duell').setDescription('Fordere einen anderen Destillateur heraus')
            .addUserOption(o => o.setName('gegner').setDescription('Dein Gegner').setRequired(true))),

    async execute(interaction) {
        const db = interaction.client.db;
        const config = require('../config.json');
        ensureDestillateurTable(db);
        const uId = interaction.user.id;
        const sub = interaction.options.getSubcommand();

        if (sub === 'start') {
            const existing = db.db.prepare('SELECT * FROM destillateur WHERE user_id = ?').get(uId);
            if (existing && existing.zutaten !== '[]') {
                return interaction.reply({ content: '❌ Du bist bereits ein Destillateur!', ephemeral: true });
            }
            db.db.prepare('INSERT OR REPLACE INTO destillateur (user_id, zutaten, faesser) VALUES (?, ?, ?)').run(
                uId, JSON.stringify([ZUTATEN[0].name]), JSON.stringify([FAESSER[0].name])
            );

            const embed = new EmbedBuilder()
                .setTitle('🥃 Willkommen in der Brennerei!')
                .setDescription(`Du erhältst **${ZUTATEN[0].name}** ${ZUTATEN[0].emoji} und lernst das **${FAESSER[0].name}**!`)
                .addFields(
                    { name: '🌾 Zutat', value: ZUTATEN[0].name, inline: true },
                    { name: '🛢️ Fass', value: FAESSER[0].name, inline: true },
                    { name: '💡 Nächster Schritt', value: 'Nutze `/destillateur destillieren` um deinen ersten Brand herzustellen!' }
                )
                .setColor(0xD4A017);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'status') {
            const d = getDestillateur(db, uId);
            if (d.zutaten === '[]') return interaction.reply({ content: '❌ Nutze `/destillateur start` um zu beginnen!', ephemeral: true });
            const zutaten = JSON.parse(d.zutaten);
            const faesser = JSON.parse(d.faesser);
            const xpNeeded = xpForLevel(d.level);

            const embed = new EmbedBuilder()
                .setTitle(`🥃 Destillateur ${interaction.user.username}`)
                .addFields(
                    { name: '📊 Level', value: `${d.level} (${d.xp}/${xpNeeded} XP)`, inline: true },
                    { name: '🥃 Destilliert', value: `${d['brände_destilliert']} Brände`, inline: true },
                    { name: '💰 Verdienst', value: `${d.gesamtverdienst} Münzen`, inline: true },
                    { name: '🏆 Beste Qualität', value: d.beste_qualitaet || 'Keine', inline: true },
                    { name: '🔥 Destille', value: `Stufe ${d.destille}`, inline: true },
                    { name: '🌀 Kühlschlange', value: `Stufe ${d.kuehlschlange}`, inline: true },
                    { name: '🏚️ Reifekeller', value: `Stufe ${d.reifekeller}`, inline: true },
                    { name: '🏠 Brennerei', value: `Stufe ${d.werkstatt}`, inline: true },
                    { name: '🌾 Zutaten', value: `${zutaten.length}`, inline: true },
                    { name: '🛢️ Fässer', value: `${faesser.length}`, inline: true },
                    { name: '🏆 Duelle', value: `${d.duelle_gewonnen}W / ${d.duelle_verloren}L`, inline: true }
                )
                .setColor(0xD4A017);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'zutaten') {
            const d = getDestillateur(db, uId);
            const besitz = d.zutaten !== '[]' ? JSON.parse(d.zutaten) : [];
            const lines = ZUTATEN.map(z => {
                const owned = besitz.includes(z.name) ? ' ✅' : '';
                return `${z.emoji} **${z.name}** - ${z.preis > 0 ? `${z.preis} Münzen` : 'Starter'} | Qualität: x${z.qualitaet}${owned}`;
            });
            const embed = new EmbedBuilder()
                .setTitle('🌾 Verfügbare Zutaten')
                .setDescription(lines.join('\n'))
                .setColor(0xD4A017);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'kaufen') {
            const d = getDestillateur(db, uId);
            if (d.zutaten === '[]') return interaction.reply({ content: '❌ Nutze `/destillateur start` um zu beginnen!', ephemeral: true });

            const zutatName = interaction.options.getString('zutat');
            const zutat = ZUTATEN.find(z => z.name.toLowerCase() === zutatName.toLowerCase());
            if (!zutat) return interaction.reply({ content: '❌ Unbekannte Zutat!', ephemeral: true });

            const besitz = JSON.parse(d.zutaten);
            if (besitz.includes(zutat.name)) return interaction.reply({ content: '❌ Du besitzt diese Zutat bereits!', ephemeral: true });

            const user = db.getUser(uId);
            if (user.balance < zutat.preis) return interaction.reply({ content: `❌ Du brauchst ${zutat.preis} Münzen! (Hast: ${user.balance})`, ephemeral: true });

            db.updateBalance(uId, -zutat.preis);
            besitz.push(zutat.name);
            db.db.prepare('UPDATE destillateur SET zutaten = ? WHERE user_id = ?').run(JSON.stringify(besitz), uId);

            const embed = new EmbedBuilder()
                .setTitle('🌾 Neue Zutat!')
                .setDescription(`Du hast **${zutat.name}** ${zutat.emoji} für **${zutat.preis} Münzen** erworben!`)
                .addFields({ name: '📊 Qualitätsbonus', value: `x${zutat.qualitaet}`, inline: true })
                .setColor(0x00FF00);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'destillieren') {
            const d = getDestillateur(db, uId);
            if (d.zutaten === '[]') return interaction.reply({ content: '❌ Nutze `/destillateur start` um zu beginnen!', ephemeral: true });

            const cdKey = `destillateur_${uId}`;
            const cdTime = cooldowns.get(cdKey);
            if (cdTime && Date.now() - cdTime < 55000) {
                const rest = Math.ceil((55000 - (Date.now() - cdTime)) / 1000);
                return interaction.reply({ content: `⏳ Der Brand muss noch reifen! Warte noch ${rest}s.`, ephemeral: true });
            }

            const brandName = interaction.options.getString('brand');
            const zutatName = interaction.options.getString('zutat');
            const fassName = interaction.options.getString('fass');

            const brand = BRANNTWEINE.find(b => b.name.toLowerCase() === brandName.toLowerCase());
            if (!brand) return interaction.reply({ content: `❌ Unbekannter Brand! Verfügbar: ${BRANNTWEINE.map(b => b.name).join(', ')}`, ephemeral: true });
            if (d.level < brand.minLevel) return interaction.reply({ content: `❌ Du brauchst Level ${brand.minLevel} für ${brand.name}!`, ephemeral: true });

            const zutat = ZUTATEN.find(z => z.name.toLowerCase() === zutatName.toLowerCase());
            if (!zutat) return interaction.reply({ content: '❌ Unbekannte Zutat!', ephemeral: true });
            const besitz = JSON.parse(d.zutaten);
            if (!besitz.includes(zutat.name)) return interaction.reply({ content: '❌ Du besitzt diese Zutat nicht!', ephemeral: true });

            const fass = FAESSER.find(f => f.name.toLowerCase() === fassName.toLowerCase());
            if (!fass) return interaction.reply({ content: `❌ Unbekanntes Fass! Verfügbar: ${FAESSER.map(f => f.name).join(', ')}`, ephemeral: true });

            const faesserBesitz = JSON.parse(d.faesser);
            if (!faesserBesitz.includes(fass.name)) {
                if (d.level < fass.minLevel) return interaction.reply({ content: `❌ Du brauchst Level ${fass.minLevel} für ${fass.name}!`, ephemeral: true });
                faesserBesitz.push(fass.name);
                db.db.prepare('UPDATE destillateur SET faesser = ? WHERE user_id = ?').run(JSON.stringify(faesserBesitz), uId);
            }

            cooldowns.set(cdKey, Date.now());

            const destilleBonus = UPGRADES.destille.bonus[d.destille];
            const kuehlBonus = UPGRADES.kuehlschlange.bonus[d.kuehlschlange];
            const reifungBonus = UPGRADES.reifekeller.bonus[d.reifekeller];
            const kunstBonus = d.destillierkunst * 0.02;
            const reifBonus = d.reifung * 0.018;

            let qualRoll = Math.random() * 100;
            qualRoll += (destilleBonus + kuehlBonus + reifungBonus + kunstBonus + reifBonus) * 28;
            qualRoll *= zutat.qualitaet * fass.bonus / brand.schwierigkeit;

            let event = null;
            if (Math.random() < 0.2) {
                event = DESTILL_EVENTS[Math.floor(Math.random() * DESTILL_EVENTS.length)];
                qualRoll *= event.qualMulti;
            }

            qualRoll = Math.min(100, qualRoll);
            let qualitaet = QUALITAETEN[0];
            for (const q of QUALITAETEN) {
                if (qualRoll >= q.minRoll) qualitaet = q;
            }

            let wert = Math.floor(brand.basisWert * qualitaet.multi * zutat.qualitaet * fass.bonus * (1 + reifungBonus));
            if (event) wert = Math.floor(wert * event.geldMulti);

            db.updateBalance(uId, wert);
            const xpGain = 14 + Math.floor(brand.schwierigkeit * 5) + Math.floor(wert / 50);

            db.db.prepare('INSERT INTO destillateur_keller (user_id, brand_typ, zutat, fass, qualitaet, wert, erstellt_am) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
                uId, brand.name, zutat.name, fass.name, qualitaet.name, wert, Date.now()
            );

            const besteQ = QUALITAETEN.indexOf(qualitaet) > QUALITAETEN.findIndex(q => q.name === d.beste_qualitaet) ? qualitaet.name : (d.beste_qualitaet || qualitaet.name);
            db.db.prepare("UPDATE destillateur SET brände_destilliert = brände_destilliert + 1, gesamtverdienst = gesamtverdienst + ?, xp = xp + ?, beste_qualitaet = ?, letztes_destillieren = ? WHERE user_id = ?").run(
                wert, xpGain, besteQ, Date.now(), uId
            );

            const updatedD = getDestillateur(db, uId);
            const levelUp = checkLevelUp(db, uId, updatedD);

            const embed = new EmbedBuilder()
                .setTitle(`🥃 ${brand.name} destilliert!`)
                .setDescription(`Du hast **${qualitaet.name}en** ${brand.name} aus **${zutat.name}** ${zutat.emoji} im **${fass.name}** gereift!`)
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
            const d = getDestillateur(db, uId);
            if (d.zutaten === '[]') return interaction.reply({ content: '❌ Nutze `/destillateur start` um zu beginnen!', ephemeral: true });

            const cdKey = `destillateur_train_${uId}`;
            const cdTime = cooldowns.get(cdKey);
            if (cdTime && Date.now() - cdTime < 60000) {
                const rest = Math.ceil((60000 - (Date.now() - cdTime)) / 1000);
                return interaction.reply({ content: `⏳ Deine Nase braucht noch Erholung! Warte noch ${rest}s.`, ephemeral: true });
            }

            const typ = interaction.options.getString('typ').toLowerCase();
            const validTypes = ['destillierkunst', 'reifung', 'aromakunde', 'ausdauer'];
            if (!validTypes.includes(typ)) return interaction.reply({ content: `❌ Unbekanntes Training! Verfügbar: ${validTypes.join(', ')}`, ephemeral: true });

            cooldowns.set(cdKey, Date.now());
            const xpGain = 12 + Math.floor(d.level * 2);
            const newVal = d[typ] + 1;

            db.db.prepare(`UPDATE destillateur SET ${typ} = ?, trainings = trainings + 1, xp = xp + ?, letztes_training = ? WHERE user_id = ?`).run(
                newVal, xpGain, Date.now(), uId
            );

            const updatedD = getDestillateur(db, uId);
            const levelUp = checkLevelUp(db, uId, updatedD);

            const embed = new EmbedBuilder()
                .setTitle(`🎓 ${typ.charAt(0).toUpperCase() + typ.slice(1)}-Training`)
                .setDescription(`Du hast deine **${typ}** verbessert!`)
                .addFields(
                    { name: '📈 Fortschritt', value: `${d[typ]} → ${newVal}`, inline: true },
                    { name: '⭐ XP', value: `+${xpGain}`, inline: true }
                )
                .setColor(0x4169E1);

            if (levelUp.ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${levelUp.lvl}!` });

            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'upgrade') {
            const d = getDestillateur(db, uId);
            if (d.zutaten === '[]') return interaction.reply({ content: '❌ Nutze `/destillateur start` um zu beginnen!', ephemeral: true });

            const item = interaction.options.getString('item').toLowerCase();
            const upg = UPGRADES[item];
            if (!upg) return interaction.reply({ content: `❌ Unbekanntes Upgrade! Verfügbar: ${Object.keys(UPGRADES).join(', ')}`, ephemeral: true });

            const currentLvl = d[item];
            if (currentLvl >= 4) return interaction.reply({ content: `❌ ${upg.name} ist bereits auf Maximum (Stufe 4)!`, ephemeral: true });

            const kosten = upg.stufen[currentLvl + 1];
            const user = db.getUser(uId);
            if (user.balance < kosten) return interaction.reply({ content: `❌ Du brauchst ${kosten} Münzen! (Hast: ${user.balance})`, ephemeral: true });

            db.updateBalance(uId, -kosten);
            db.db.prepare(`UPDATE destillateur SET ${item} = ? WHERE user_id = ?`).run(currentLvl + 1, uId);

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

        if (sub === 'keller') {
            const d = getDestillateur(db, uId);
            if (d.zutaten === '[]') return interaction.reply({ content: '❌ Nutze `/destillateur start` um zu beginnen!', ephemeral: true });

            const brände = db.db.prepare('SELECT * FROM destillateur_keller WHERE user_id = ? ORDER BY wert DESC LIMIT 10').all(uId);

            if (brände.length === 0) {
                return interaction.reply({ content: '🥃 Dein Keller ist noch leer. Destilliere deinen ersten Brand!', ephemeral: true });
            }

            const total = db.db.prepare('SELECT COUNT(*) as cnt, SUM(wert) as total FROM destillateur_keller WHERE user_id = ?').get(uId);
            const lines = brände.map((b, i) => `${i + 1}. **${b.brand_typ}** (${b.zutat}/${b.fass}) - ${b.qualitaet} - ${b.wert} Münzen`);

            const embed = new EmbedBuilder()
                .setTitle('🥃 Brennereikeller')
                .setDescription(lines.join('\n'))
                .addFields(
                    { name: '📊 Gesamt', value: `${total.cnt} Brände`, inline: true },
                    { name: '💰 Gesamtwert', value: `${total.total} Münzen`, inline: true }
                )
                .setColor(0xD4A017);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'auftrag') {
            const d = getDestillateur(db, uId);
            if (d.zutaten === '[]') return interaction.reply({ content: '❌ Nutze `/destillateur start` um zu beginnen!', ephemeral: true });

            const cdKey = `destillateur_auftrag_${uId}`;
            const cdTime = cooldowns.get(cdKey);
            if (cdTime && Date.now() - cdTime < 120000) {
                const rest = Math.ceil((120000 - (Date.now() - cdTime)) / 1000);
                return interaction.reply({ content: `⏳ Kein neuer Auftrag verfügbar! Warte noch ${rest}s.`, ephemeral: true });
            }

            cooldowns.set(cdKey, Date.now());
            const auftraege = [
                { kunde: 'Bauer', produkt: 'Korn', belohnung: 220 + d.level * 35 },
                { kunde: 'Wirt', produkt: 'Obstbrand', belohnung: 360 + d.level * 50 },
                { kunde: 'Händler', produkt: 'Whisky', belohnung: 680 + d.level * 85 },
                { kunde: 'Baron', produkt: 'Rum', belohnung: 950 + d.level * 115 },
                { kunde: 'Graf', produkt: 'Weinbrand', belohnung: 1700 + d.level * 175 },
                { kunde: 'König', produkt: 'Götterbier', belohnung: 3500 + d.level * 275 }
            ];

            const auftrag = auftraege[Math.floor(Math.random() * Math.min(auftraege.length, 2 + Math.floor(d.level / 2)))];
            const qualBonus = 1.0 + d.destillierkunst * 0.03 + d.reifung * 0.025;
            const verdienst = Math.floor(auftrag.belohnung * qualBonus);

            db.updateBalance(uId, verdienst);
            const xpGain = 18 + Math.floor(verdienst / 30);
            db.db.prepare("UPDATE destillateur SET brände_destilliert = brände_destilliert + 1, gesamtverdienst = gesamtverdienst + ?, xp = xp + ? WHERE user_id = ?").run(verdienst, xpGain, uId);

            const updatedD = getDestillateur(db, uId);
            const levelUp = checkLevelUp(db, uId, updatedD);

            const embed = new EmbedBuilder()
                .setTitle('📋 Brennereiauftrag abgeschlossen!')
                .setDescription(`Der **${auftrag.kunde}** hat dich beauftragt, **${auftrag.produkt}** zu brennen.`)
                .addFields(
                    { name: '💰 Belohnung', value: `${verdienst} Münzen`, inline: true },
                    { name: '⭐ XP', value: `+${xpGain}`, inline: true }
                )
                .setColor(0x00FF00);

            if (levelUp.ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${levelUp.lvl}!` });

            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'duell') {
            const d = getDestillateur(db, uId);
            if (d.zutaten === '[]') return interaction.reply({ content: '❌ Nutze `/destillateur start` um zu beginnen!', ephemeral: true });
            if (d.level < 3) return interaction.reply({ content: '❌ Du brauchst Level 3 für Duelle!', ephemeral: true });

            const gegner = interaction.options.getUser('gegner');
            if (gegner.id === uId) return interaction.reply({ content: '❌ Du kannst dich nicht selbst herausfordern!', ephemeral: true });
            if (gegner.bot) return interaction.reply({ content: '❌ Du kannst keinen Bot herausfordern!', ephemeral: true });

            const gg = db.db.prepare('SELECT * FROM destillateur WHERE user_id = ?').get(gegner.id);
            if (!gg || gg.zutaten === '[]') return interaction.reply({ content: '❌ Dein Gegner ist kein Destillateur!', ephemeral: true });

            const scoreA = (d.level * 10) + (d.destillierkunst * 5) + (d.reifung * 4) + (d.destille * 8) + (d.kuehlschlange * 6) + (d.reifekeller * 7) + Math.random() * 40;
            const scoreB = (gg.level * 10) + (gg.destillierkunst * 5) + (gg.reifung * 4) + (gg.destille * 8) + (gg.kuehlschlange * 6) + (gg.reifekeller * 7) + Math.random() * 40;

            const gewonnen = scoreA > scoreB;
            const preis = Math.floor(200 + d.level * 50 + gg.level * 50);

            if (gewonnen) {
                db.updateBalance(uId, preis);
                db.db.prepare('UPDATE destillateur SET duelle_gewonnen = duelle_gewonnen + 1 WHERE user_id = ?').run(uId);
                db.db.prepare('UPDATE destillateur SET duelle_verloren = duelle_verloren + 1 WHERE user_id = ?').run(gegner.id);
            } else {
                db.updateBalance(gegner.id, preis);
                db.db.prepare('UPDATE destillateur SET duelle_verloren = duelle_verloren + 1 WHERE user_id = ?').run(uId);
                db.db.prepare('UPDATE destillateur SET duelle_gewonnen = duelle_gewonnen + 1 WHERE user_id = ?').run(gegner.id);
            }

            const embed = new EmbedBuilder()
                .setTitle('🏆 Destillateur-Duell')
                .setDescription(`🥃 **${interaction.user.username}** vs 🥃 **${gegner.username}**`)
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
