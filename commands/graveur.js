const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const MATERIALIEN = [
    { name: 'Kupfer', preis: 0, qualitaet: 1.0, emoji: '🟤' },
    { name: 'Messing', preis: 1500, qualitaet: 1.2, emoji: '🟡' },
    { name: 'Silber', preis: 4000, qualitaet: 1.5, emoji: '⬜' },
    { name: 'Gold', preis: 10000, qualitaet: 1.8, emoji: '🟨' },
    { name: 'Platin', preis: 22000, qualitaet: 2.2, emoji: '💎' },
    { name: 'Obsidian', preis: 40000, qualitaet: 2.6, emoji: '⬛' },
    { name: 'Meteorit', preis: 70000, qualitaet: 3.2, emoji: '☄️' },
    { name: 'Ätherkristall', preis: 120000, qualitaet: 4.0, emoji: '✨' }
];

const GRAVUR_TYPEN = [
    { name: 'Initialen', basisWert: 50, schwierigkeit: 1, minLevel: 1 },
    { name: 'Wappen', basisWert: 150, schwierigkeit: 2, minLevel: 2 },
    { name: 'Ornament', basisWert: 300, schwierigkeit: 3, minLevel: 3 },
    { name: 'Porträt', basisWert: 550, schwierigkeit: 4, minLevel: 5 },
    { name: 'Landschaft', basisWert: 900, schwierigkeit: 5, minLevel: 7 },
    { name: 'Mythische Szene', basisWert: 1500, schwierigkeit: 6, minLevel: 9 },
    { name: 'Runeninschrift', basisWert: 2800, schwierigkeit: 7, minLevel: 12 },
    { name: 'Kosmisches Mandala', basisWert: 5000, schwierigkeit: 9, minLevel: 15 }
];

const EDELSTEINE = [
    { name: 'Bergkristall', wert: 100, seltenheit: 'Gewöhnlich', bonus: 1.1 },
    { name: 'Amethyst', wert: 250, seltenheit: 'Gewöhnlich', bonus: 1.2 },
    { name: 'Topas', wert: 500, seltenheit: 'Ungewöhnlich', bonus: 1.3 },
    { name: 'Saphir', wert: 1000, seltenheit: 'Ungewöhnlich', bonus: 1.5 },
    { name: 'Smaragd', wert: 2000, seltenheit: 'Selten', bonus: 1.7 },
    { name: 'Rubin', wert: 3500, seltenheit: 'Selten', bonus: 2.0 },
    { name: 'Diamant', wert: 6000, seltenheit: 'Episch', bonus: 2.5 },
    { name: 'Sternenstein', wert: 12000, seltenheit: 'Legendär', bonus: 3.5 }
];

const QUALITAETEN = [
    { name: 'Verkratzt', multi: 0.3, minRoll: 0 },
    { name: 'Grob', multi: 0.5, minRoll: 12 },
    { name: 'Sauber', multi: 0.8, minRoll: 28 },
    { name: 'Fein', multi: 1.0, minRoll: 42 },
    { name: 'Kunstvoll', multi: 1.5, minRoll: 60 },
    { name: 'Meisterhaft', multi: 2.2, minRoll: 78 },
    { name: 'Göttlich', multi: 3.5, minRoll: 93 }
];

const UPGRADES = {
    stichel: { name: 'Gravierstichel', stufen: [0, 1500, 5000, 15000, 40000], bonus: [0, 0.1, 0.2, 0.35, 0.5] },
    lupe: { name: 'Vergrößerungsglas', stufen: [0, 2000, 6000, 18000, 45000], bonus: [0, 0.08, 0.18, 0.3, 0.45] },
    drehbank: { name: 'Gravurdrehbank', stufen: [0, 2500, 7500, 22000, 55000], bonus: [0, 0.1, 0.22, 0.38, 0.55] },
    werkstatt: { name: 'Gravurwerkstatt', stufen: [0, 3000, 9000, 25000, 60000], bonus: [0, 1, 2, 3, 5] }
};

const GRAVUR_EVENTS = [
    { text: '✨ Perfekte Linienführung! Jeder Strich sitzt wie von Geisterhand.', qualMulti: 1.5, geldMulti: 1.0 },
    { text: '💥 Der Stichel rutscht ab! Eine Kerbe im Material.', qualMulti: 0.5, geldMulti: 1.0 },
    { text: '🔍 Unter der Lupe entdeckst du ein verborgenes Muster im Material!', qualMulti: 1.3, geldMulti: 1.5 },
    { text: '👑 Ein Sammler beobachtet deine Arbeit und bietet mehr!', qualMulti: 1.0, geldMulti: 2.5 },
    { text: '🌟 Das Material reagiert auf deine Berührung und leuchtet kurz!', qualMulti: 1.8, geldMulti: 1.3 },
    { text: '🔨 Dein Werkzeug bricht! Du reparierst es notdürftig.', qualMulti: 0.6, geldMulti: 0.8 },
    { text: '💎 Du findest einen winzigen Edelstein eingebettet im Material!', qualMulti: 1.2, geldMulti: 2.0 }
];

const cooldowns = new Map();

function ensureGraveurTable(db) {
    db.db.exec(`CREATE TABLE IF NOT EXISTS graveure (
        user_id TEXT PRIMARY KEY,
        materialien TEXT DEFAULT '[]',
        level INTEGER DEFAULT 1,
        xp INTEGER DEFAULT 0,
        gravuren INTEGER DEFAULT 0,
        edelsteine_gefunden INTEGER DEFAULT 0,
        beste_qualitaet TEXT DEFAULT '',
        gesamtverdienst INTEGER DEFAULT 0,
        stichel INTEGER DEFAULT 0,
        lupe INTEGER DEFAULT 0,
        drehbank INTEGER DEFAULT 0,
        werkstatt INTEGER DEFAULT 0,
        praezision INTEGER DEFAULT 0,
        detailarbeit INTEGER DEFAULT 0,
        materialkunde INTEGER DEFAULT 0,
        geduld INTEGER DEFAULT 0,
        trainings INTEGER DEFAULT 0,
        duelle_gewonnen INTEGER DEFAULT 0,
        duelle_verloren INTEGER DEFAULT 0,
        letzte_gravur INTEGER DEFAULT 0,
        letztes_training INTEGER DEFAULT 0
    )`);
    db.db.exec(`CREATE TABLE IF NOT EXISTS gravur_galerie (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        gravur_typ TEXT,
        material TEXT,
        qualitaet TEXT,
        edelstein TEXT DEFAULT '',
        wert INTEGER,
        erstellt_am INTEGER DEFAULT 0
    )`);
}

function getGraveur(db, uId) {
    const row = db.db.prepare('SELECT * FROM graveure WHERE user_id = ?').get(uId);
    if (!row) {
        db.db.prepare('INSERT INTO graveure (user_id) VALUES (?)').run(uId);
        return db.db.prepare('SELECT * FROM graveure WHERE user_id = ?').get(uId);
    }
    return row;
}

function xpForLevel(l) { return l * l * 56; }

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
        db.db.prepare('UPDATE graveure SET level = ?, xp = ? WHERE user_id = ?').run(lvl, xp, uId);
    }
    return { lvl, ups };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('graveur')
        .setDescription('🔨 Gravur - Meistere die Kunst der Metallgravur und Edelsteinarbeit!')
        .addSubcommand(s => s.setName('start').setDescription('Beginne deine Graveur-Karriere'))
        .addSubcommand(s => s.setName('status').setDescription('Zeige deinen Graveur-Status'))
        .addSubcommand(s => s.setName('materialien').setDescription('Zeige verfügbare Materialien'))
        .addSubcommand(s => s.setName('kaufen').setDescription('Kaufe ein neues Material')
            .addStringOption(o => o.setName('material').setDescription('Name des Materials').setRequired(true)))
        .addSubcommand(s => s.setName('gravieren').setDescription('Erstelle eine Gravur')
            .addStringOption(o => o.setName('typ').setDescription('Gravurtyp').setRequired(true))
            .addStringOption(o => o.setName('material').setDescription('Material').setRequired(true)))
        .addSubcommand(s => s.setName('training').setDescription('Trainiere deine Gravur-Fähigkeiten')
            .addStringOption(o => o.setName('typ').setDescription('Trainingstyp (praezision/detailarbeit/materialkunde/geduld)').setRequired(true)))
        .addSubcommand(s => s.setName('upgrade').setDescription('Verbessere deine Ausrüstung')
            .addStringOption(o => o.setName('item').setDescription('Ausrüstung (stichel/lupe/drehbank/werkstatt)').setRequired(true)))
        .addSubcommand(s => s.setName('galerie').setDescription('Zeige deine besten Gravuren'))
        .addSubcommand(s => s.setName('auftrag').setDescription('Nimm einen Gravurauftrag an'))
        .addSubcommand(s => s.setName('duell').setDescription('Fordere einen anderen Graveur heraus')
            .addUserOption(o => o.setName('gegner').setDescription('Dein Gegner').setRequired(true))),

    async execute(interaction) {
        const db = interaction.client.db;
        const config = require('../config.json');
        ensureGraveurTable(db);
        const uId = interaction.user.id;
        const sub = interaction.options.getSubcommand();

        if (sub === 'start') {
            const existing = db.db.prepare('SELECT * FROM graveure WHERE user_id = ?').get(uId);
            if (existing && existing.materialien !== '[]') {
                return interaction.reply({ content: '❌ Du bist bereits ein Graveur!', ephemeral: true });
            }
            db.db.prepare('INSERT OR REPLACE INTO graveure (user_id, materialien) VALUES (?, ?)').run(
                uId, JSON.stringify([MATERIALIEN[0].name])
            );

            const embed = new EmbedBuilder()
                .setTitle('🔨 Willkommen in der Gravurkunst!')
                .setDescription(`Du erhältst **${MATERIALIEN[0].name}** ${MATERIALIEN[0].emoji} als dein erstes Material!`)
                .addFields(
                    { name: '🟤 Material', value: MATERIALIEN[0].name, inline: true },
                    { name: '📊 Status', value: 'Level 1 Graveur', inline: true },
                    { name: '💡 Nächster Schritt', value: 'Nutze `/graveur gravieren` um deine erste Gravur zu erstellen!' }
                )
                .setColor(0xB87333);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'status') {
            const g = getGraveur(db, uId);
            if (g.materialien === '[]') return interaction.reply({ content: '❌ Nutze `/graveur start` um zu beginnen!', ephemeral: true });
            const materialien = JSON.parse(g.materialien);
            const xpNeeded = xpForLevel(g.level);

            const embed = new EmbedBuilder()
                .setTitle(`🔨 Graveur ${interaction.user.username}`)
                .addFields(
                    { name: '📊 Level', value: `${g.level} (${g.xp}/${xpNeeded} XP)`, inline: true },
                    { name: '🔨 Gravuren', value: `${g.gravuren}`, inline: true },
                    { name: '💎 Edelsteine', value: `${g.edelsteine_gefunden} gefunden`, inline: true },
                    { name: '💰 Gesamtverdienst', value: `${g.gesamtverdienst} Münzen`, inline: true },
                    { name: '🏆 Beste Qualität', value: g.beste_qualitaet || 'Keine', inline: true },
                    { name: '🔧 Stichel', value: `Stufe ${g.stichel}`, inline: true },
                    { name: '🔍 Lupe', value: `Stufe ${g.lupe}`, inline: true },
                    { name: '⚙️ Drehbank', value: `Stufe ${g.drehbank}`, inline: true },
                    { name: '🏠 Werkstatt', value: `Stufe ${g.werkstatt}`, inline: true },
                    { name: '🟤 Materialien', value: `${materialien.length} Sorten`, inline: true },
                    { name: '🏆 Duelle', value: `${g.duelle_gewonnen}W / ${g.duelle_verloren}L`, inline: true }
                )
                .setColor(0xB87333);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'materialien') {
            const g = getGraveur(db, uId);
            const besitz = g.materialien !== '[]' ? JSON.parse(g.materialien) : [];
            const lines = MATERIALIEN.map(m => {
                const owned = besitz.includes(m.name) ? ' ✅' : '';
                return `${m.emoji} **${m.name}** - ${m.preis > 0 ? `${m.preis} Münzen` : 'Starter'} | Qualität: x${m.qualitaet}${owned}`;
            });
            const embed = new EmbedBuilder()
                .setTitle('🟤 Verfügbare Materialien')
                .setDescription(lines.join('\n'))
                .setColor(0xB87333);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'kaufen') {
            const g = getGraveur(db, uId);
            if (g.materialien === '[]') return interaction.reply({ content: '❌ Nutze `/graveur start` um zu beginnen!', ephemeral: true });

            const matName = interaction.options.getString('material');
            const material = MATERIALIEN.find(m => m.name.toLowerCase() === matName.toLowerCase());
            if (!material) return interaction.reply({ content: '❌ Unbekanntes Material!', ephemeral: true });

            const materialien = JSON.parse(g.materialien);
            if (materialien.includes(material.name)) return interaction.reply({ content: '❌ Du besitzt dieses Material bereits!', ephemeral: true });

            const user = db.getUser(uId);
            if (user.balance < material.preis) return interaction.reply({ content: `❌ Du brauchst ${material.preis} Münzen! (Hast: ${user.balance})`, ephemeral: true });

            db.updateBalance(uId, -material.preis);
            materialien.push(material.name);
            db.db.prepare('UPDATE graveure SET materialien = ? WHERE user_id = ?').run(JSON.stringify(materialien), uId);

            const embed = new EmbedBuilder()
                .setTitle('🟤 Neues Material!')
                .setDescription(`Du hast **${material.name}** ${material.emoji} für **${material.preis} Münzen** erworben!`)
                .addFields({ name: '📊 Qualitätsbonus', value: `x${material.qualitaet}`, inline: true })
                .setColor(0x00FF00);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'gravieren') {
            const g = getGraveur(db, uId);
            if (g.materialien === '[]') return interaction.reply({ content: '❌ Nutze `/graveur start` um zu beginnen!', ephemeral: true });

            const cdKey = `graveur_${uId}`;
            const cdTime = cooldowns.get(cdKey);
            if (cdTime && Date.now() - cdTime < 50000) {
                const rest = Math.ceil((50000 - (Date.now() - cdTime)) / 1000);
                return interaction.reply({ content: `⏳ Dein Stichel kühlt ab! Warte noch ${rest}s.`, ephemeral: true });
            }

            const typName = interaction.options.getString('typ');
            const matName = interaction.options.getString('material');

            const gravurTyp = GRAVUR_TYPEN.find(t => t.name.toLowerCase() === typName.toLowerCase());
            if (!gravurTyp) return interaction.reply({ content: `❌ Unbekannter Gravurtyp! Verfügbar: ${GRAVUR_TYPEN.map(t => t.name).join(', ')}`, ephemeral: true });
            if (g.level < gravurTyp.minLevel) return interaction.reply({ content: `❌ Du brauchst Level ${gravurTyp.minLevel} für ${gravurTyp.name}!`, ephemeral: true });

            const material = MATERIALIEN.find(m => m.name.toLowerCase() === matName.toLowerCase());
            if (!material) return interaction.reply({ content: '❌ Unbekanntes Material!', ephemeral: true });
            const materialien = JSON.parse(g.materialien);
            if (!materialien.includes(material.name)) return interaction.reply({ content: '❌ Du besitzt dieses Material nicht!', ephemeral: true });

            cooldowns.set(cdKey, Date.now());

            const stichelBonus = UPGRADES.stichel.bonus[g.stichel];
            const lupeBonus = UPGRADES.lupe.bonus[g.lupe];
            const drehbankBonus = UPGRADES.drehbank.bonus[g.drehbank];
            const praezBonus = g.praezision * 0.02;
            const detailBonus = g.detailarbeit * 0.018;

            let qualRoll = Math.random() * 100;
            qualRoll += (stichelBonus + lupeBonus + drehbankBonus + praezBonus + detailBonus) * 30;
            qualRoll *= material.qualitaet / gravurTyp.schwierigkeit;

            let event = null;
            if (Math.random() < 0.2) {
                event = GRAVUR_EVENTS[Math.floor(Math.random() * GRAVUR_EVENTS.length)];
                qualRoll *= event.qualMulti;
            }

            let edelstein = null;
            if (Math.random() < 0.15 + g.materialkunde * 0.01) {
                const pool = EDELSTEINE.filter((_, i) => i <= Math.min(EDELSTEINE.length - 1, 2 + Math.floor(g.level / 2)));
                edelstein = pool[Math.floor(Math.random() * pool.length)];
            }

            qualRoll = Math.min(100, qualRoll);
            let qualitaet = QUALITAETEN[0];
            for (const q of QUALITAETEN) {
                if (qualRoll >= q.minRoll) qualitaet = q;
            }

            let wert = Math.floor(gravurTyp.basisWert * qualitaet.multi * material.qualitaet * (1 + drehbankBonus));
            if (edelstein) wert = Math.floor(wert * edelstein.bonus);
            if (event) wert = Math.floor(wert * event.geldMulti);

            db.updateBalance(uId, wert);
            const xpGain = 14 + Math.floor(gravurTyp.schwierigkeit * 5) + Math.floor(wert / 50);

            db.db.prepare('INSERT INTO gravur_galerie (user_id, gravur_typ, material, qualitaet, edelstein, wert, erstellt_am) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
                uId, gravurTyp.name, material.name, qualitaet.name, edelstein ? edelstein.name : '', wert, Date.now()
            );

            const besteQ = QUALITAETEN.indexOf(qualitaet) > QUALITAETEN.findIndex(q => q.name === g.beste_qualitaet) ? qualitaet.name : (g.beste_qualitaet || qualitaet.name);
            db.db.prepare('UPDATE graveure SET gravuren = gravuren + 1, edelsteine_gefunden = edelsteine_gefunden + ?, gesamtverdienst = gesamtverdienst + ?, xp = xp + ?, beste_qualitaet = ?, letzte_gravur = ? WHERE user_id = ?').run(
                edelstein ? 1 : 0, wert, xpGain, besteQ, Date.now(), uId
            );

            const updatedG = getGraveur(db, uId);
            const levelUp = checkLevelUp(db, uId, updatedG);

            const embed = new EmbedBuilder()
                .setTitle(`🔨 ${gravurTyp.name} graviert!`)
                .setDescription(`Du hast eine **${qualitaet.name}e** ${gravurTyp.name}-Gravur in **${material.name}** ${material.emoji} erstellt!`)
                .setColor(qualitaet.multi >= 2.0 ? 0xFFD700 : qualitaet.multi >= 1.0 ? 0x00FF00 : 0xFF6600);

            if (event) embed.addFields({ name: '🎲 Ereignis', value: event.text });
            if (edelstein) embed.addFields({ name: '💎 Edelstein gefunden!', value: `${edelstein.name} (${edelstein.seltenheit}) - Wertbonus x${edelstein.bonus}` });

            embed.addFields(
                { name: '📊 Qualität', value: qualitaet.name, inline: true },
                { name: '💰 Wert', value: `${wert} Münzen`, inline: true },
                { name: '⭐ XP', value: `+${xpGain}`, inline: true }
            );

            if (levelUp.ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${levelUp.lvl}!` });

            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'training') {
            const g = getGraveur(db, uId);
            if (g.materialien === '[]') return interaction.reply({ content: '❌ Nutze `/graveur start` um zu beginnen!', ephemeral: true });

            const cdKey = `graveur_train_${uId}`;
            const cdTime = cooldowns.get(cdKey);
            if (cdTime && Date.now() - cdTime < 60000) {
                const rest = Math.ceil((60000 - (Date.now() - cdTime)) / 1000);
                return interaction.reply({ content: `⏳ Deine Hände brauchen Ruhe! Warte noch ${rest}s.`, ephemeral: true });
            }

            const typ = interaction.options.getString('typ').toLowerCase();
            const validTypes = ['praezision', 'detailarbeit', 'materialkunde', 'geduld'];
            if (!validTypes.includes(typ)) return interaction.reply({ content: `❌ Unbekanntes Training! Verfügbar: ${validTypes.join(', ')}`, ephemeral: true });

            cooldowns.set(cdKey, Date.now());
            const xpGain = 12 + Math.floor(g.level * 2);
            const newVal = g[typ] + 1;

            db.db.prepare(`UPDATE graveure SET ${typ} = ?, trainings = trainings + 1, xp = xp + ?, letztes_training = ? WHERE user_id = ?`).run(
                newVal, xpGain, Date.now(), uId
            );

            const updatedG = getGraveur(db, uId);
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
            const g = getGraveur(db, uId);
            if (g.materialien === '[]') return interaction.reply({ content: '❌ Nutze `/graveur start` um zu beginnen!', ephemeral: true });

            const item = interaction.options.getString('item').toLowerCase();
            const upg = UPGRADES[item];
            if (!upg) return interaction.reply({ content: `❌ Unbekanntes Upgrade! Verfügbar: ${Object.keys(UPGRADES).join(', ')}`, ephemeral: true });

            const currentLvl = g[item];
            if (currentLvl >= 4) return interaction.reply({ content: `❌ ${upg.name} ist bereits auf Maximum (Stufe 4)!`, ephemeral: true });

            const kosten = upg.stufen[currentLvl + 1];
            const user = db.getUser(uId);
            if (user.balance < kosten) return interaction.reply({ content: `❌ Du brauchst ${kosten} Münzen! (Hast: ${user.balance})`, ephemeral: true });

            db.updateBalance(uId, -kosten);
            db.db.prepare(`UPDATE graveure SET ${item} = ? WHERE user_id = ?`).run(currentLvl + 1, uId);

            const embed = new EmbedBuilder()
                .setTitle(`⬆️ ${upg.name} verbessert!`)
                .setDescription(`Stufe ${currentLvl} → **Stufe ${currentLvl + 1}**`)
                .addFields(
                    { name: '💰 Kosten', value: `${kosten} Münzen`, inline: true },
                    { name: '📊 Bonus', value: item === 'werkstatt' ? `+${upg.bonus[currentLvl + 1]} Werkplätze` : `+${(upg.bonus[currentLvl + 1] * 100).toFixed(0)}%`, inline: true }
                )
                .setColor(0xFFD700);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'galerie') {
            const g = getGraveur(db, uId);
            if (g.materialien === '[]') return interaction.reply({ content: '❌ Nutze `/graveur start` um zu beginnen!', ephemeral: true });

            const werke = db.db.prepare('SELECT * FROM gravur_galerie WHERE user_id = ? ORDER BY wert DESC LIMIT 10').all(uId);

            if (werke.length === 0) {
                return interaction.reply({ content: '🖼️ Deine Galerie ist noch leer. Erstelle deine erste Gravur!', ephemeral: true });
            }

            const total = db.db.prepare('SELECT COUNT(*) as cnt, SUM(wert) as total FROM gravur_galerie WHERE user_id = ?').get(uId);
            const lines = werke.map((w, i) => {
                const gem = w.edelstein ? ` 💎${w.edelstein}` : '';
                return `${i + 1}. **${w.gravur_typ}** (${w.material}) - ${w.qualitaet}${gem} - ${w.wert} Münzen`;
            });

            const embed = new EmbedBuilder()
                .setTitle('🖼️ Gravur-Galerie')
                .setDescription(lines.join('\n'))
                .addFields(
                    { name: '📊 Gesamt', value: `${total.cnt} Gravuren`, inline: true },
                    { name: '💰 Gesamtwert', value: `${total.total} Münzen`, inline: true }
                )
                .setColor(0xB87333);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'auftrag') {
            const g = getGraveur(db, uId);
            if (g.materialien === '[]') return interaction.reply({ content: '❌ Nutze `/graveur start` um zu beginnen!', ephemeral: true });

            const cdKey = `graveur_auftrag_${uId}`;
            const cdTime = cooldowns.get(cdKey);
            if (cdTime && Date.now() - cdTime < 120000) {
                const rest = Math.ceil((120000 - (Date.now() - cdTime)) / 1000);
                return interaction.reply({ content: `⏳ Kein neuer Auftrag verfügbar! Warte noch ${rest}s.`, ephemeral: true });
            }

            cooldowns.set(cdKey, Date.now());
            const auftraege = [
                { kunde: 'Schmied', gravur: 'Initialen', belohnung: 200 + g.level * 40 },
                { kunde: 'Ritter', gravur: 'Wappen', belohnung: 400 + g.level * 60 },
                { kunde: 'Kirche', gravur: 'Ornament', belohnung: 600 + g.level * 80 },
                { kunde: 'Gräfin', gravur: 'Porträt', belohnung: 900 + g.level * 110 },
                { kunde: 'Museum', gravur: 'Mythische Szene', belohnung: 1500 + g.level * 150 },
                { kunde: 'Kaiserpalast', gravur: 'Runeninschrift', belohnung: 2500 + g.level * 220 }
            ];

            const auftrag = auftraege[Math.floor(Math.random() * Math.min(auftraege.length, 2 + Math.floor(g.level / 2)))];
            const qualBonus = 1.0 + g.praezision * 0.03 + g.detailarbeit * 0.025;
            const verdienst = Math.floor(auftrag.belohnung * qualBonus);

            db.updateBalance(uId, verdienst);
            const xpGain = 20 + Math.floor(verdienst / 30);
            db.db.prepare('UPDATE graveure SET gravuren = gravuren + 1, gesamtverdienst = gesamtverdienst + ?, xp = xp + ? WHERE user_id = ?').run(verdienst, xpGain, uId);

            const updatedG = getGraveur(db, uId);
            const levelUp = checkLevelUp(db, uId, updatedG);

            const embed = new EmbedBuilder()
                .setTitle('📋 Gravurauftrag abgeschlossen!')
                .setDescription(`Der **${auftrag.kunde}** hat dich beauftragt, eine **${auftrag.gravur}** zu gravieren.`)
                .addFields(
                    { name: '💰 Belohnung', value: `${verdienst} Münzen`, inline: true },
                    { name: '⭐ XP', value: `+${xpGain}`, inline: true }
                )
                .setColor(0x00FF00);

            if (levelUp.ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${levelUp.lvl}!` });

            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'duell') {
            const g = getGraveur(db, uId);
            if (g.materialien === '[]') return interaction.reply({ content: '❌ Nutze `/graveur start` um zu beginnen!', ephemeral: true });
            if (g.level < 3) return interaction.reply({ content: '❌ Du brauchst Level 3 für Duelle!', ephemeral: true });

            const gegner = interaction.options.getUser('gegner');
            if (gegner.id === uId) return interaction.reply({ content: '❌ Du kannst dich nicht selbst herausfordern!', ephemeral: true });
            if (gegner.bot) return interaction.reply({ content: '❌ Du kannst keinen Bot herausfordern!', ephemeral: true });

            const gg = db.db.prepare('SELECT * FROM graveure WHERE user_id = ?').get(gegner.id);
            if (!gg || gg.materialien === '[]') return interaction.reply({ content: '❌ Dein Gegner ist kein Graveur!', ephemeral: true });

            const scoreA = (g.level * 10) + (g.praezision * 5) + (g.detailarbeit * 4) + (g.stichel * 8) + (g.lupe * 6) + (g.drehbank * 7) + Math.random() * 40;
            const scoreB = (gg.level * 10) + (gg.praezision * 5) + (gg.detailarbeit * 4) + (gg.stichel * 8) + (gg.lupe * 6) + (gg.drehbank * 7) + Math.random() * 40;

            const gewonnen = scoreA > scoreB;
            const preis = Math.floor(200 + g.level * 50 + gg.level * 50);

            if (gewonnen) {
                db.updateBalance(uId, preis);
                db.db.prepare('UPDATE graveure SET duelle_gewonnen = duelle_gewonnen + 1 WHERE user_id = ?').run(uId);
                db.db.prepare('UPDATE graveure SET duelle_verloren = duelle_verloren + 1 WHERE user_id = ?').run(gegner.id);
            } else {
                db.updateBalance(gegner.id, preis);
                db.db.prepare('UPDATE graveure SET duelle_verloren = duelle_verloren + 1 WHERE user_id = ?').run(uId);
                db.db.prepare('UPDATE graveure SET duelle_gewonnen = duelle_gewonnen + 1 WHERE user_id = ?').run(gegner.id);
            }

            const embed = new EmbedBuilder()
                .setTitle('🏆 Gravur-Duell')
                .setDescription(`🔨 **${interaction.user.username}** vs 🔨 **${gegner.username}**`)
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
