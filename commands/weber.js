const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const FAEDEN = [
    { name: 'Hanffaden', preis: 0, qualitaet: 1.0, emoji: '🧵' },
    { name: 'Leinenfaden', preis: 1200, qualitaet: 1.2, emoji: '🪡' },
    { name: 'Wollfaden', preis: 3000, qualitaet: 1.4, emoji: '🐑' },
    { name: 'Baumwollfaden', preis: 7000, qualitaet: 1.7, emoji: '☁️' },
    { name: 'Seidenfaden', preis: 15000, qualitaet: 2.0, emoji: '✨' },
    { name: 'Silberfaden', preis: 30000, qualitaet: 2.4, emoji: '🪙' },
    { name: 'Goldfaden', preis: 58000, qualitaet: 3.0, emoji: '🌟' },
    { name: 'Ätherfaden', preis: 105000, qualitaet: 3.8, emoji: '💫' }
];

const TEXTILIEN = [
    { name: 'Tuch', basisWert: 45, schwierigkeit: 1, minLevel: 1 },
    { name: 'Schal', basisWert: 90, schwierigkeit: 1, minLevel: 1 },
    { name: 'Decke', basisWert: 200, schwierigkeit: 2, minLevel: 2 },
    { name: 'Wandbehang', basisWert: 400, schwierigkeit: 3, minLevel: 4 },
    { name: 'Teppich', basisWert: 750, schwierigkeit: 4, minLevel: 6 },
    { name: 'Gobelin', basisWert: 1400, schwierigkeit: 6, minLevel: 8 },
    { name: 'Tapisserie', basisWert: 2800, schwierigkeit: 7, minLevel: 11 },
    { name: 'Königlicher Wandteppich', basisWert: 5500, schwierigkeit: 9, minLevel: 14 }
];

const WEBMUSTER = [
    { name: 'Leinwand', bonus: 1.0, minLevel: 1 },
    { name: 'Köper', bonus: 1.15, minLevel: 2 },
    { name: 'Atlas', bonus: 1.3, minLevel: 3 },
    { name: 'Jacquard', bonus: 1.5, minLevel: 5 },
    { name: 'Damast', bonus: 1.7, minLevel: 7 },
    { name: 'Brokat', bonus: 1.9, minLevel: 9 },
    { name: 'Doppelgewebe', bonus: 2.3, minLevel: 12 },
    { name: 'Sternengewebe', bonus: 2.8, minLevel: 15 }
];

const QUALITAETEN = [
    { name: 'Ausgefranst', multi: 0.3, minRoll: 0 },
    { name: 'Locker', multi: 0.5, minRoll: 12 },
    { name: 'Einfach', multi: 0.8, minRoll: 25 },
    { name: 'Gleichmäßig', multi: 1.0, minRoll: 40 },
    { name: 'Fein', multi: 1.5, minRoll: 58 },
    { name: 'Prachtvoll', multi: 2.2, minRoll: 76 },
    { name: 'Legendär', multi: 3.5, minRoll: 93 }
];

const UPGRADES = {
    webstuhl: { name: 'Webstuhl', stufen: [0, 1500, 5000, 15000, 40000], bonus: [0, 0.1, 0.2, 0.35, 0.5] },
    spindel: { name: 'Spindel', stufen: [0, 2000, 6000, 18000, 45000], bonus: [0, 0.08, 0.18, 0.3, 0.45] },
    kamm: { name: 'Webkamm', stufen: [0, 2200, 7000, 20000, 50000], bonus: [0, 0.1, 0.2, 0.35, 0.52] },
    werkstatt: { name: 'Webstube', stufen: [0, 3000, 9000, 25000, 60000], bonus: [0, 1, 2, 3, 5] }
};

const WEB_EVENTS = [
    { text: '✨ Perfekter Rhythmus! Die Fäden verweben sich wie von selbst.', qualMulti: 1.5, geldMulti: 1.0 },
    { text: '🧵 Ein Faden reißt! Du musst vorsichtig reparieren.', qualMulti: 0.5, geldMulti: 1.0 },
    { text: '🌈 Die Farben der Fäden bilden ein unerwartetes Regenbogenmuster!', qualMulti: 1.6, geldMulti: 1.4 },
    { text: '👑 Eine Prinzessin bestellt sofort ein Exemplar!', qualMulti: 1.0, geldMulti: 2.5 },
    { text: '🌙 Im Mondlicht schimmern die Fäden silbern!', qualMulti: 1.4, geldMulti: 1.3 },
    { text: '💨 Zugluft im Webstuhl! Das Muster verschiebt sich.', qualMulti: 0.6, geldMulti: 0.9 },
    { text: '🕊️ Eine Taube bringt einen seltenen Faden als Geschenk!', qualMulti: 1.3, geldMulti: 2.0 }
];

const cooldowns = new Map();

function ensureWeberTable(db) {
    db.db.exec(`CREATE TABLE IF NOT EXISTS weber (
        user_id TEXT PRIMARY KEY,
        faeden TEXT DEFAULT '[]',
        muster TEXT DEFAULT '[]',
        level INTEGER DEFAULT 1,
        xp INTEGER DEFAULT 0,
        textilien_gewebt INTEGER DEFAULT 0,
        beste_qualitaet TEXT DEFAULT '',
        gesamtverdienst INTEGER DEFAULT 0,
        webstuhl INTEGER DEFAULT 0,
        spindel INTEGER DEFAULT 0,
        kamm INTEGER DEFAULT 0,
        werkstatt INTEGER DEFAULT 0,
        rhythmus INTEGER DEFAULT 0,
        farbkenntnis INTEGER DEFAULT 0,
        musterdesign INTEGER DEFAULT 0,
        ausdauer INTEGER DEFAULT 0,
        trainings INTEGER DEFAULT 0,
        duelle_gewonnen INTEGER DEFAULT 0,
        duelle_verloren INTEGER DEFAULT 0,
        letztes_weben INTEGER DEFAULT 0,
        letztes_training INTEGER DEFAULT 0
    )`);
    db.db.exec(`CREATE TABLE IF NOT EXISTS weber_lager (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        textil_typ TEXT,
        faden TEXT,
        muster TEXT,
        qualitaet TEXT,
        wert INTEGER,
        erstellt_am INTEGER DEFAULT 0
    )`);
}

function getWeber(db, uId) {
    const row = db.db.prepare('SELECT * FROM weber WHERE user_id = ?').get(uId);
    if (!row) {
        db.db.prepare('INSERT INTO weber (user_id) VALUES (?)').run(uId);
        return db.db.prepare('SELECT * FROM weber WHERE user_id = ?').get(uId);
    }
    return row;
}

function xpForLevel(l) { return l * l * 52; }

function checkLevelUp(db, uId, w) {
    let lvl = w.level;
    let xp = w.xp;
    let ups = 0;
    while (xp >= xpForLevel(lvl)) {
        xp -= xpForLevel(lvl);
        lvl++;
        ups++;
    }
    if (ups > 0) {
        db.db.prepare('UPDATE weber SET level = ?, xp = ? WHERE user_id = ?').run(lvl, xp, uId);
    }
    return { lvl, ups };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('weber')
        .setDescription('🧶 Weberei - Verwebe Fäden zu prächtigen Textilien und Teppichen!')
        .addSubcommand(s => s.setName('start').setDescription('Beginne deine Weber-Karriere'))
        .addSubcommand(s => s.setName('status').setDescription('Zeige deinen Weber-Status'))
        .addSubcommand(s => s.setName('faeden').setDescription('Zeige verfügbare Fäden'))
        .addSubcommand(s => s.setName('kaufen').setDescription('Kaufe einen neuen Faden')
            .addStringOption(o => o.setName('faden').setDescription('Name des Fadens').setRequired(true)))
        .addSubcommand(s => s.setName('weben').setDescription('Webe ein neues Textil')
            .addStringOption(o => o.setName('textil').setDescription('Textiltyp').setRequired(true))
            .addStringOption(o => o.setName('faden').setDescription('Fadenart').setRequired(true))
            .addStringOption(o => o.setName('muster').setDescription('Webmuster').setRequired(true)))
        .addSubcommand(s => s.setName('training').setDescription('Trainiere deine Weber-Fähigkeiten')
            .addStringOption(o => o.setName('typ').setDescription('Trainingstyp (rhythmus/farbkenntnis/musterdesign/ausdauer)').setRequired(true)))
        .addSubcommand(s => s.setName('upgrade').setDescription('Verbessere deine Ausrüstung')
            .addStringOption(o => o.setName('item').setDescription('Ausrüstung (webstuhl/spindel/kamm/werkstatt)').setRequired(true)))
        .addSubcommand(s => s.setName('lager').setDescription('Zeige dein Textillager'))
        .addSubcommand(s => s.setName('auftrag').setDescription('Nimm einen Webauftrag an'))
        .addSubcommand(s => s.setName('duell').setDescription('Fordere einen anderen Weber heraus')
            .addUserOption(o => o.setName('gegner').setDescription('Dein Gegner').setRequired(true))),

    async execute(interaction) {
        const db = interaction.client.db;
        const config = require('../config.json');
        ensureWeberTable(db);
        const uId = interaction.user.id;
        const sub = interaction.options.getSubcommand();

        if (sub === 'start') {
            const existing = db.db.prepare('SELECT * FROM weber WHERE user_id = ?').get(uId);
            if (existing && existing.faeden !== '[]') {
                return interaction.reply({ content: '❌ Du bist bereits ein Weber!', ephemeral: true });
            }
            db.db.prepare('INSERT OR REPLACE INTO weber (user_id, faeden, muster) VALUES (?, ?, ?)').run(
                uId, JSON.stringify([FAEDEN[0].name]), JSON.stringify([WEBMUSTER[0].name])
            );

            const embed = new EmbedBuilder()
                .setTitle('🧶 Willkommen in der Weberei!')
                .setDescription(`Du erhältst **${FAEDEN[0].name}** ${FAEDEN[0].emoji} und lernst das **${WEBMUSTER[0].name}**-Muster!`)
                .addFields(
                    { name: '🧵 Faden', value: FAEDEN[0].name, inline: true },
                    { name: '🎨 Muster', value: WEBMUSTER[0].name, inline: true },
                    { name: '💡 Nächster Schritt', value: 'Nutze `/weber weben` um dein erstes Textil zu weben!' }
                )
                .setColor(0x8B0000);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'status') {
            const w = getWeber(db, uId);
            if (w.faeden === '[]') return interaction.reply({ content: '❌ Nutze `/weber start` um zu beginnen!', ephemeral: true });
            const faeden = JSON.parse(w.faeden);
            const muster = JSON.parse(w.muster);
            const xpNeeded = xpForLevel(w.level);

            const embed = new EmbedBuilder()
                .setTitle(`🧶 Weber ${interaction.user.username}`)
                .addFields(
                    { name: '📊 Level', value: `${w.level} (${w.xp}/${xpNeeded} XP)`, inline: true },
                    { name: '🧶 Gewebt', value: `${w.textilien_gewebt} Stück`, inline: true },
                    { name: '💰 Verdienst', value: `${w.gesamtverdienst} Münzen`, inline: true },
                    { name: '🏆 Beste Qualität', value: w.beste_qualitaet || 'Keine', inline: true },
                    { name: '🪢 Webstuhl', value: `Stufe ${w.webstuhl}`, inline: true },
                    { name: '🌀 Spindel', value: `Stufe ${w.spindel}`, inline: true },
                    { name: '📏 Kamm', value: `Stufe ${w.kamm}`, inline: true },
                    { name: '🏠 Webstube', value: `Stufe ${w.werkstatt}`, inline: true },
                    { name: '🧵 Fäden', value: `${faeden.length}`, inline: true },
                    { name: '🎨 Muster', value: `${muster.length}`, inline: true },
                    { name: '🏆 Duelle', value: `${w.duelle_gewonnen}W / ${w.duelle_verloren}L`, inline: true }
                )
                .setColor(0x8B0000);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'faeden') {
            const w = getWeber(db, uId);
            const besitz = w.faeden !== '[]' ? JSON.parse(w.faeden) : [];
            const lines = FAEDEN.map(f => {
                const owned = besitz.includes(f.name) ? ' ✅' : '';
                return `${f.emoji} **${f.name}** - ${f.preis > 0 ? `${f.preis} Münzen` : 'Starter'} | Qualität: x${f.qualitaet}${owned}`;
            });
            const embed = new EmbedBuilder()
                .setTitle('🧵 Verfügbare Fäden')
                .setDescription(lines.join('\n'))
                .setColor(0x8B0000);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'kaufen') {
            const w = getWeber(db, uId);
            if (w.faeden === '[]') return interaction.reply({ content: '❌ Nutze `/weber start` um zu beginnen!', ephemeral: true });

            const fadenName = interaction.options.getString('faden');
            const faden = FAEDEN.find(f => f.name.toLowerCase() === fadenName.toLowerCase());
            if (!faden) return interaction.reply({ content: '❌ Unbekannter Faden!', ephemeral: true });

            const faeden = JSON.parse(w.faeden);
            if (faeden.includes(faden.name)) return interaction.reply({ content: '❌ Du besitzt diesen Faden bereits!', ephemeral: true });

            const user = db.getUser(uId);
            if (user.balance < faden.preis) return interaction.reply({ content: `❌ Du brauchst ${faden.preis} Münzen! (Hast: ${user.balance})`, ephemeral: true });

            db.updateBalance(uId, -faden.preis);
            faeden.push(faden.name);
            db.db.prepare('UPDATE weber SET faeden = ? WHERE user_id = ?').run(JSON.stringify(faeden), uId);

            const embed = new EmbedBuilder()
                .setTitle('🧵 Neuer Faden!')
                .setDescription(`Du hast **${faden.name}** ${faden.emoji} für **${faden.preis} Münzen** erworben!`)
                .addFields({ name: '📊 Qualitätsbonus', value: `x${faden.qualitaet}`, inline: true })
                .setColor(0x00FF00);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'weben') {
            const w = getWeber(db, uId);
            if (w.faeden === '[]') return interaction.reply({ content: '❌ Nutze `/weber start` um zu beginnen!', ephemeral: true });

            const cdKey = `weber_${uId}`;
            const cdTime = cooldowns.get(cdKey);
            if (cdTime && Date.now() - cdTime < 45000) {
                const rest = Math.ceil((45000 - (Date.now() - cdTime)) / 1000);
                return interaction.reply({ content: `⏳ Der Webstuhl rattert noch! Warte noch ${rest}s.`, ephemeral: true });
            }

            const textilName = interaction.options.getString('textil');
            const fadenName = interaction.options.getString('faden');
            const musterName = interaction.options.getString('muster');

            const textil = TEXTILIEN.find(t => t.name.toLowerCase() === textilName.toLowerCase());
            if (!textil) return interaction.reply({ content: `❌ Unbekanntes Textil! Verfügbar: ${TEXTILIEN.map(t => t.name).join(', ')}`, ephemeral: true });
            if (w.level < textil.minLevel) return interaction.reply({ content: `❌ Du brauchst Level ${textil.minLevel} für ${textil.name}!`, ephemeral: true });

            const faden = FAEDEN.find(f => f.name.toLowerCase() === fadenName.toLowerCase());
            if (!faden) return interaction.reply({ content: '❌ Unbekannter Faden!', ephemeral: true });
            const faeden = JSON.parse(w.faeden);
            if (!faeden.includes(faden.name)) return interaction.reply({ content: '❌ Du besitzt diesen Faden nicht!', ephemeral: true });

            const muster = WEBMUSTER.find(m => m.name.toLowerCase() === musterName.toLowerCase());
            if (!muster) return interaction.reply({ content: `❌ Unbekanntes Muster! Verfügbar: ${WEBMUSTER.map(m => m.name).join(', ')}`, ephemeral: true });

            const musterList = JSON.parse(w.muster);
            if (!musterList.includes(muster.name)) {
                if (w.level < muster.minLevel) return interaction.reply({ content: `❌ Du brauchst Level ${muster.minLevel} für ${muster.name}!`, ephemeral: true });
                musterList.push(muster.name);
                db.db.prepare('UPDATE weber SET muster = ? WHERE user_id = ?').run(JSON.stringify(musterList), uId);
            }

            cooldowns.set(cdKey, Date.now());

            const webstuhlBonus = UPGRADES.webstuhl.bonus[w.webstuhl];
            const spindelBonus = UPGRADES.spindel.bonus[w.spindel];
            const kammBonus = UPGRADES.kamm.bonus[w.kamm];
            const rhythmusBonus = w.rhythmus * 0.02;
            const designBonus = w.musterdesign * 0.018;

            let qualRoll = Math.random() * 100;
            qualRoll += (webstuhlBonus + spindelBonus + kammBonus + rhythmusBonus + designBonus) * 28;
            qualRoll *= faden.qualitaet * muster.bonus / textil.schwierigkeit;

            let event = null;
            if (Math.random() < 0.2) {
                event = WEB_EVENTS[Math.floor(Math.random() * WEB_EVENTS.length)];
                qualRoll *= event.qualMulti;
            }

            qualRoll = Math.min(100, qualRoll);
            let qualitaet = QUALITAETEN[0];
            for (const q of QUALITAETEN) {
                if (qualRoll >= q.minRoll) qualitaet = q;
            }

            let wert = Math.floor(textil.basisWert * qualitaet.multi * faden.qualitaet * muster.bonus * (1 + kammBonus));
            if (event) wert = Math.floor(wert * event.geldMulti);

            db.updateBalance(uId, wert);
            const xpGain = 13 + Math.floor(textil.schwierigkeit * 5) + Math.floor(wert / 50);

            db.db.prepare('INSERT INTO weber_lager (user_id, textil_typ, faden, muster, qualitaet, wert, erstellt_am) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
                uId, textil.name, faden.name, muster.name, qualitaet.name, wert, Date.now()
            );

            const besteQ = QUALITAETEN.indexOf(qualitaet) > QUALITAETEN.findIndex(q => q.name === w.beste_qualitaet) ? qualitaet.name : (w.beste_qualitaet || qualitaet.name);
            db.db.prepare('UPDATE weber SET textilien_gewebt = textilien_gewebt + 1, gesamtverdienst = gesamtverdienst + ?, xp = xp + ?, beste_qualitaet = ?, letztes_weben = ? WHERE user_id = ?').run(
                wert, xpGain, besteQ, Date.now(), uId
            );

            const updatedW = getWeber(db, uId);
            const levelUp = checkLevelUp(db, uId, updatedW);

            const embed = new EmbedBuilder()
                .setTitle(`🧶 ${textil.name} gewebt!`)
                .setDescription(`Du hast ein **${qualitaet.name}es** ${textil.name} aus **${faden.name}** ${faden.emoji} im **${muster.name}**-Muster gewebt!`)
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
            const w = getWeber(db, uId);
            if (w.faeden === '[]') return interaction.reply({ content: '❌ Nutze `/weber start` um zu beginnen!', ephemeral: true });

            const cdKey = `weber_train_${uId}`;
            const cdTime = cooldowns.get(cdKey);
            if (cdTime && Date.now() - cdTime < 60000) {
                const rest = Math.ceil((60000 - (Date.now() - cdTime)) / 1000);
                return interaction.reply({ content: `⏳ Deine Finger sind noch müde! Warte noch ${rest}s.`, ephemeral: true });
            }

            const typ = interaction.options.getString('typ').toLowerCase();
            const validTypes = ['rhythmus', 'farbkenntnis', 'musterdesign', 'ausdauer'];
            if (!validTypes.includes(typ)) return interaction.reply({ content: `❌ Unbekanntes Training! Verfügbar: ${validTypes.join(', ')}`, ephemeral: true });

            cooldowns.set(cdKey, Date.now());
            const xpGain = 12 + Math.floor(w.level * 2);
            const newVal = w[typ] + 1;

            db.db.prepare(`UPDATE weber SET ${typ} = ?, trainings = trainings + 1, xp = xp + ?, letztes_training = ? WHERE user_id = ?`).run(
                newVal, xpGain, Date.now(), uId
            );

            const updatedW = getWeber(db, uId);
            const levelUp = checkLevelUp(db, uId, updatedW);

            const embed = new EmbedBuilder()
                .setTitle(`🎓 ${typ.charAt(0).toUpperCase() + typ.slice(1)}-Training`)
                .setDescription(`Du hast deinen **${typ}** verbessert!`)
                .addFields(
                    { name: '📈 Fortschritt', value: `${w[typ]} → ${newVal}`, inline: true },
                    { name: '⭐ XP', value: `+${xpGain}`, inline: true }
                )
                .setColor(0x4169E1);

            if (levelUp.ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${levelUp.lvl}!` });

            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'upgrade') {
            const w = getWeber(db, uId);
            if (w.faeden === '[]') return interaction.reply({ content: '❌ Nutze `/weber start` um zu beginnen!', ephemeral: true });

            const item = interaction.options.getString('item').toLowerCase();
            const upg = UPGRADES[item];
            if (!upg) return interaction.reply({ content: `❌ Unbekanntes Upgrade! Verfügbar: ${Object.keys(UPGRADES).join(', ')}`, ephemeral: true });

            const currentLvl = w[item];
            if (currentLvl >= 4) return interaction.reply({ content: `❌ ${upg.name} ist bereits auf Maximum (Stufe 4)!`, ephemeral: true });

            const kosten = upg.stufen[currentLvl + 1];
            const user = db.getUser(uId);
            if (user.balance < kosten) return interaction.reply({ content: `❌ Du brauchst ${kosten} Münzen! (Hast: ${user.balance})`, ephemeral: true });

            db.updateBalance(uId, -kosten);
            db.db.prepare(`UPDATE weber SET ${item} = ? WHERE user_id = ?`).run(currentLvl + 1, uId);

            const embed = new EmbedBuilder()
                .setTitle(`⬆️ ${upg.name} verbessert!`)
                .setDescription(`Stufe ${currentLvl} → **Stufe ${currentLvl + 1}**`)
                .addFields(
                    { name: '💰 Kosten', value: `${kosten} Münzen`, inline: true },
                    { name: '📊 Bonus', value: item === 'werkstatt' ? `+${upg.bonus[currentLvl + 1]} Webplätze` : `+${(upg.bonus[currentLvl + 1] * 100).toFixed(0)}%`, inline: true }
                )
                .setColor(0xFFD700);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'lager') {
            const w = getWeber(db, uId);
            if (w.faeden === '[]') return interaction.reply({ content: '❌ Nutze `/weber start` um zu beginnen!', ephemeral: true });

            const werke = db.db.prepare('SELECT * FROM weber_lager WHERE user_id = ? ORDER BY wert DESC LIMIT 10').all(uId);

            if (werke.length === 0) {
                return interaction.reply({ content: '🧶 Dein Lager ist noch leer. Webe dein erstes Textil!', ephemeral: true });
            }

            const total = db.db.prepare('SELECT COUNT(*) as cnt, SUM(wert) as total FROM weber_lager WHERE user_id = ?').get(uId);
            const lines = werke.map((w, i) => `${i + 1}. **${w.textil_typ}** (${w.faden}/${w.muster}) - ${w.qualitaet} - ${w.wert} Münzen`);

            const embed = new EmbedBuilder()
                .setTitle('🧶 Textillager')
                .setDescription(lines.join('\n'))
                .addFields(
                    { name: '📊 Gesamt', value: `${total.cnt} Textilien`, inline: true },
                    { name: '💰 Gesamtwert', value: `${total.total} Münzen`, inline: true }
                )
                .setColor(0x8B0000);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'auftrag') {
            const w = getWeber(db, uId);
            if (w.faeden === '[]') return interaction.reply({ content: '❌ Nutze `/weber start` um zu beginnen!', ephemeral: true });

            const cdKey = `weber_auftrag_${uId}`;
            const cdTime = cooldowns.get(cdKey);
            if (cdTime && Date.now() - cdTime < 120000) {
                const rest = Math.ceil((120000 - (Date.now() - cdTime)) / 1000);
                return interaction.reply({ content: `⏳ Kein neuer Auftrag verfügbar! Warte noch ${rest}s.`, ephemeral: true });
            }

            cooldowns.set(cdKey, Date.now());
            const auftraege = [
                { kunde: 'Händler', textil: 'Tuch', belohnung: 180 + w.level * 35 },
                { kunde: 'Edelfrau', textil: 'Schal', belohnung: 280 + w.level * 50 },
                { kunde: 'Gasthof', textil: 'Decke', belohnung: 450 + w.level * 70 },
                { kunde: 'Kirche', textil: 'Wandbehang', belohnung: 700 + w.level * 90 },
                { kunde: 'Schloss', textil: 'Gobelin', belohnung: 1300 + w.level * 140 },
                { kunde: 'Kaiser', textil: 'Tapisserie', belohnung: 2500 + w.level * 220 }
            ];

            const auftrag = auftraege[Math.floor(Math.random() * Math.min(auftraege.length, 2 + Math.floor(w.level / 2)))];
            const qualBonus = 1.0 + w.rhythmus * 0.03 + w.musterdesign * 0.025;
            const verdienst = Math.floor(auftrag.belohnung * qualBonus);

            db.updateBalance(uId, verdienst);
            const xpGain = 18 + Math.floor(verdienst / 30);
            db.db.prepare('UPDATE weber SET textilien_gewebt = textilien_gewebt + 1, gesamtverdienst = gesamtverdienst + ?, xp = xp + ? WHERE user_id = ?').run(verdienst, xpGain, uId);

            const updatedW = getWeber(db, uId);
            const levelUp = checkLevelUp(db, uId, updatedW);

            const embed = new EmbedBuilder()
                .setTitle('📋 Webauftrag abgeschlossen!')
                .setDescription(`Der **${auftrag.kunde}** hat dich beauftragt, ein **${auftrag.textil}** zu weben.`)
                .addFields(
                    { name: '💰 Belohnung', value: `${verdienst} Münzen`, inline: true },
                    { name: '⭐ XP', value: `+${xpGain}`, inline: true }
                )
                .setColor(0x00FF00);

            if (levelUp.ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${levelUp.lvl}!` });

            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'duell') {
            const w = getWeber(db, uId);
            if (w.faeden === '[]') return interaction.reply({ content: '❌ Nutze `/weber start` um zu beginnen!', ephemeral: true });
            if (w.level < 3) return interaction.reply({ content: '❌ Du brauchst Level 3 für Duelle!', ephemeral: true });

            const gegner = interaction.options.getUser('gegner');
            if (gegner.id === uId) return interaction.reply({ content: '❌ Du kannst dich nicht selbst herausfordern!', ephemeral: true });
            if (gegner.bot) return interaction.reply({ content: '❌ Du kannst keinen Bot herausfordern!', ephemeral: true });

            const g = db.db.prepare('SELECT * FROM weber WHERE user_id = ?').get(gegner.id);
            if (!g || g.faeden === '[]') return interaction.reply({ content: '❌ Dein Gegner ist kein Weber!', ephemeral: true });

            const scoreA = (w.level * 10) + (w.rhythmus * 5) + (w.musterdesign * 4) + (w.webstuhl * 8) + (w.spindel * 6) + (w.kamm * 7) + Math.random() * 40;
            const scoreB = (g.level * 10) + (g.rhythmus * 5) + (g.musterdesign * 4) + (g.webstuhl * 8) + (g.spindel * 6) + (g.kamm * 7) + Math.random() * 40;

            const gewonnen = scoreA > scoreB;
            const preis = Math.floor(200 + w.level * 50 + g.level * 50);

            if (gewonnen) {
                db.updateBalance(uId, preis);
                db.db.prepare('UPDATE weber SET duelle_gewonnen = duelle_gewonnen + 1 WHERE user_id = ?').run(uId);
                db.db.prepare('UPDATE weber SET duelle_verloren = duelle_verloren + 1 WHERE user_id = ?').run(gegner.id);
            } else {
                db.updateBalance(gegner.id, preis);
                db.db.prepare('UPDATE weber SET duelle_verloren = duelle_verloren + 1 WHERE user_id = ?').run(uId);
                db.db.prepare('UPDATE weber SET duelle_gewonnen = duelle_gewonnen + 1 WHERE user_id = ?').run(gegner.id);
            }

            const embed = new EmbedBuilder()
                .setTitle('🏆 Weber-Duell')
                .setDescription(`🧶 **${interaction.user.username}** vs 🧶 **${gegner.username}**`)
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
