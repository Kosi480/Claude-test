const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const VOEGEL = [
    { name: 'Turmfalke', preis: 0, seltenheit: 'Gewöhnlich', jagdBonus: 1.0, geschwindigkeit: 5, emoji: '🐦' },
    { name: 'Habicht', preis: 2000, seltenheit: 'Gewöhnlich', jagdBonus: 1.2, geschwindigkeit: 6, emoji: '🦅' },
    { name: 'Wanderfalke', preis: 5000, seltenheit: 'Ungewöhnlich', jagdBonus: 1.5, geschwindigkeit: 9, emoji: '🦅' },
    { name: 'Steinadler', preis: 12000, seltenheit: 'Selten', jagdBonus: 1.8, geschwindigkeit: 7, emoji: '🦅' },
    { name: 'Uhu', preis: 20000, seltenheit: 'Selten', jagdBonus: 2.0, geschwindigkeit: 5, emoji: '🦉' },
    { name: 'Seeadler', preis: 35000, seltenheit: 'Episch', jagdBonus: 2.5, geschwindigkeit: 8, emoji: '🦅' },
    { name: 'Schneeeule', preis: 55000, seltenheit: 'Episch', jagdBonus: 2.8, geschwindigkeit: 7, emoji: '🦉' },
    { name: 'Phönixfalke', preis: 100000, seltenheit: 'Legendär', jagdBonus: 4.0, geschwindigkeit: 10, emoji: '🔥' }
];

const JAGDGEBIETE = [
    { name: 'Stadtpark', minLevel: 1, beuteMulti: 1.0, gefahrChance: 0.05 },
    { name: 'Feldlandschaft', minLevel: 2, beuteMulti: 1.3, gefahrChance: 0.08 },
    { name: 'Waldlichtung', minLevel: 3, beuteMulti: 1.6, gefahrChance: 0.12 },
    { name: 'Bergregion', minLevel: 5, beuteMulti: 2.0, gefahrChance: 0.15 },
    { name: 'Küstenklippen', minLevel: 7, beuteMulti: 2.5, gefahrChance: 0.18 },
    { name: 'Nebelwald', minLevel: 9, beuteMulti: 3.0, gefahrChance: 0.22 },
    { name: 'Drachenberge', minLevel: 12, beuteMulti: 4.0, gefahrChance: 0.28 },
    { name: 'Himmelsinsel', minLevel: 15, beuteMulti: 5.5, gefahrChance: 0.35 }
];

const BEUTE_TYPEN = [
    { name: 'Feldmaus', wert: 20, gewicht: 0.1, seltenheit: 'Gewöhnlich' },
    { name: 'Kaninchen', wert: 50, gewicht: 0.5, seltenheit: 'Gewöhnlich' },
    { name: 'Fasan', wert: 100, gewicht: 1.0, seltenheit: 'Ungewöhnlich' },
    { name: 'Wildente', wert: 150, gewicht: 0.8, seltenheit: 'Ungewöhnlich' },
    { name: 'Rebhuhn', wert: 200, gewicht: 0.6, seltenheit: 'Ungewöhnlich' },
    { name: 'Wildhase', wert: 300, gewicht: 1.5, seltenheit: 'Selten' },
    { name: 'Silberfuchs', wert: 600, gewicht: 3.0, seltenheit: 'Selten' },
    { name: 'Goldener Fasan', wert: 1200, gewicht: 1.2, seltenheit: 'Episch' },
    { name: 'Weißer Hirsch', wert: 2500, gewicht: 5.0, seltenheit: 'Episch' },
    { name: 'Mythischer Greif', wert: 5000, gewicht: 0.0, seltenheit: 'Legendär' }
];

const UPGRADES = {
    handschuh: { name: 'Falknerhandschuh', stufen: [0, 1500, 5000, 15000, 40000], bonus: [0, 0.1, 0.2, 0.35, 0.5] },
    haube: { name: 'Falkenhaube', stufen: [0, 2000, 6000, 18000, 45000], bonus: [0, 0.08, 0.18, 0.3, 0.45] },
    geschirr: { name: 'Jagdgeschirr', stufen: [0, 2500, 7000, 20000, 50000], bonus: [0, 0.1, 0.2, 0.35, 0.55] },
    voliere: { name: 'Voliere', stufen: [0, 3000, 9000, 25000, 60000], bonus: [0, 1, 2, 3, 5] }
};

const TRAININGS = [
    { name: 'Rückruf-Training', dauer: 30, xpBonus: 10, effekt: 'gehorsamkeit' },
    { name: 'Flugmanöver', dauer: 45, xpBonus: 15, effekt: 'geschwindigkeit' },
    { name: 'Beuteerkennung', dauer: 60, xpBonus: 20, effekt: 'jagdinstinkt' },
    { name: 'Ausdauerflug', dauer: 90, xpBonus: 30, effekt: 'ausdauer' }
];

const JAGD_EVENTS = [
    { text: '🌤️ Perfektes Jagdwetter! Dein Vogel fängt doppelt so viel.', beuteMulti: 2.0, geldMulti: 1.0 },
    { text: '🌪️ Ein Sturm zieht auf! Die Jagd wird schwieriger.', beuteMulti: 0.5, geldMulti: 0.5 },
    { text: '✨ Dein Vogel entdeckt ein verstecktes Nest mit Goldmünzen!', beuteMulti: 1.0, geldMulti: 3.0 },
    { text: '🦊 Ein Fuchs versucht die Beute zu stehlen!', beuteMulti: 0.3, geldMulti: 1.0 },
    { text: '🌈 Ein seltener Regenbogenvogel erscheint und führt zu reicher Beute!', beuteMulti: 3.0, geldMulti: 2.0 },
    { text: '🏰 Ein Adliger beobachtet die Jagd und ist beeindruckt!', beuteMulti: 1.0, geldMulti: 2.5 },
    { text: '💨 Günstiger Aufwind! Dein Vogel jagt mit unglaublicher Geschwindigkeit!', beuteMulti: 2.5, geldMulti: 1.5 }
];

const cooldowns = new Map();

function ensureFalknerTable(db) {
    db.db.exec(`CREATE TABLE IF NOT EXISTS falkner (
        user_id TEXT PRIMARY KEY,
        voegel TEXT DEFAULT '[]',
        aktiver_vogel TEXT DEFAULT '',
        level INTEGER DEFAULT 1,
        xp INTEGER DEFAULT 0,
        jagden INTEGER DEFAULT 0,
        erfolgreiche_jagden INTEGER DEFAULT 0,
        gesamtbeute INTEGER DEFAULT 0,
        handschuh INTEGER DEFAULT 0,
        haube INTEGER DEFAULT 0,
        geschirr INTEGER DEFAULT 0,
        voliere INTEGER DEFAULT 0,
        gehorsamkeit INTEGER DEFAULT 0,
        geschwindigkeit_bonus INTEGER DEFAULT 0,
        jagdinstinkt INTEGER DEFAULT 0,
        ausdauer INTEGER DEFAULT 0,
        trainings INTEGER DEFAULT 0,
        duelle_gewonnen INTEGER DEFAULT 0,
        duelle_verloren INTEGER DEFAULT 0,
        letzte_jagd INTEGER DEFAULT 0,
        letztes_training INTEGER DEFAULT 0
    )`);
    db.db.exec(`CREATE TABLE IF NOT EXISTS beute_sammlung (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        beute_name TEXT,
        wert INTEGER,
        gewicht REAL,
        gebiet TEXT,
        vogel TEXT,
        gefangen_am INTEGER DEFAULT 0
    )`);
}

function getFalkner(db, uId) {
    const row = db.db.prepare('SELECT * FROM falkner WHERE user_id = ?').get(uId);
    if (!row) {
        db.db.prepare('INSERT INTO falkner (user_id) VALUES (?)').run(uId);
        return db.db.prepare('SELECT * FROM falkner WHERE user_id = ?').get(uId);
    }
    return row;
}

function xpForLevel(l) { return l * l * 60; }

function checkLevelUp(db, uId, falkner) {
    let lvl = falkner.level;
    let xp = falkner.xp;
    let ups = 0;
    while (xp >= xpForLevel(lvl)) {
        xp -= xpForLevel(lvl);
        lvl++;
        ups++;
    }
    if (ups > 0) {
        db.db.prepare('UPDATE falkner SET level = ?, xp = ? WHERE user_id = ?').run(lvl, xp, uId);
    }
    return { lvl, ups };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('falkner')
        .setDescription('🦅 Falknerei - Trainiere Greifvögel und gehe auf die Jagd!')
        .addSubcommand(s => s.setName('start').setDescription('Beginne deine Falkner-Karriere'))
        .addSubcommand(s => s.setName('status').setDescription('Zeige deinen Falkner-Status'))
        .addSubcommand(s => s.setName('voegel').setDescription('Zeige verfügbare Greifvögel'))
        .addSubcommand(s => s.setName('kaufen').setDescription('Kaufe einen neuen Greifvogel')
            .addStringOption(o => o.setName('vogel').setDescription('Name des Vogels').setRequired(true)))
        .addSubcommand(s => s.setName('auswahl').setDescription('Wähle deinen aktiven Jagdvogel')
            .addStringOption(o => o.setName('vogel').setDescription('Name des Vogels').setRequired(true)))
        .addSubcommand(s => s.setName('jagen').setDescription('Gehe auf die Jagd')
            .addStringOption(o => o.setName('gebiet').setDescription('Jagdgebiet').setRequired(true)))
        .addSubcommand(s => s.setName('training').setDescription('Trainiere deinen Vogel')
            .addStringOption(o => o.setName('typ').setDescription('Trainingstyp').setRequired(true)))
        .addSubcommand(s => s.setName('upgrade').setDescription('Verbessere deine Ausrüstung')
            .addStringOption(o => o.setName('item').setDescription('Ausrüstung (handschuh/haube/geschirr/voliere)').setRequired(true)))
        .addSubcommand(s => s.setName('sammlung').setDescription('Zeige deine Beutesammlung'))
        .addSubcommand(s => s.setName('duell').setDescription('Fordere einen anderen Falkner heraus')
            .addUserOption(o => o.setName('gegner').setDescription('Dein Gegner').setRequired(true))),

    async execute(interaction) {
        const db = interaction.client.db;
        const config = require('../config.json');
        ensureFalknerTable(db);
        const uId = interaction.user.id;
        const sub = interaction.options.getSubcommand();

        if (sub === 'start') {
            const existing = db.db.prepare('SELECT * FROM falkner WHERE user_id = ?').get(uId);
            if (existing && existing.aktiver_vogel) {
                return interaction.reply({ content: '❌ Du bist bereits ein Falkner!', ephemeral: true });
            }
            const starterVogel = VOEGEL[0];
            const voegel = [{ name: starterVogel.name, bindung: 50, energie: 100 }];
            db.db.prepare('INSERT OR REPLACE INTO falkner (user_id, voegel, aktiver_vogel) VALUES (?, ?, ?)').run(uId, JSON.stringify(voegel), starterVogel.name);

            const embed = new EmbedBuilder()
                .setTitle('🦅 Willkommen in der Falknerei!')
                .setDescription(`Du hast einen **${starterVogel.name}** ${starterVogel.emoji} als deinen ersten Greifvogel erhalten!`)
                .addFields(
                    { name: '🐦 Dein Vogel', value: `${starterVogel.name} (Bindung: 50%)`, inline: true },
                    { name: '📊 Status', value: 'Level 1 Falkner', inline: true },
                    { name: '💡 Nächster Schritt', value: 'Nutze `/falkner jagen` um auf die Jagd zu gehen!' }
                )
                .setColor(0x8B4513);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'status') {
            const f = getFalkner(db, uId);
            if (!f.aktiver_vogel) return interaction.reply({ content: '❌ Nutze `/falkner start` um zu beginnen!', ephemeral: true });
            const voegel = JSON.parse(f.voegel);
            const aktiverVogel = VOEGEL.find(v => v.name === f.aktiver_vogel);
            const xpNeeded = xpForLevel(f.level);

            const embed = new EmbedBuilder()
                .setTitle(`🦅 Falkner ${interaction.user.username}`)
                .addFields(
                    { name: '📊 Level', value: `${f.level} (${f.xp}/${xpNeeded} XP)`, inline: true },
                    { name: '🐦 Aktiver Vogel', value: `${aktiverVogel ? aktiverVogel.emoji : '🐦'} ${f.aktiver_vogel}`, inline: true },
                    { name: '🏹 Jagden', value: `${f.erfolgreiche_jagden}/${f.jagden} erfolgreich`, inline: true },
                    { name: '🎯 Gesamtbeute', value: `${f.gesamtbeute} Stück`, inline: true },
                    { name: '🧤 Handschuh', value: `Stufe ${f.handschuh}`, inline: true },
                    { name: '🎭 Haube', value: `Stufe ${f.haube}`, inline: true },
                    { name: '⛓️ Geschirr', value: `Stufe ${f.geschirr}`, inline: true },
                    { name: '🏠 Voliere', value: `Stufe ${f.voliere}`, inline: true },
                    { name: '🐦 Vögel', value: `${voegel.length} Greifvögel`, inline: true },
                    { name: '🏆 Duelle', value: `${f.duelle_gewonnen}W / ${f.duelle_verloren}L`, inline: true }
                )
                .setColor(0x8B4513);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'voegel') {
            const f = getFalkner(db, uId);
            const besitz = f.aktiver_vogel ? JSON.parse(f.voegel).map(v => v.name) : [];
            const lines = VOEGEL.map(v => {
                const owned = besitz.includes(v.name) ? ' ✅' : '';
                return `${v.emoji} **${v.name}** - ${v.preis > 0 ? `${v.preis} Münzen` : 'Starter'} | Jagd: x${v.jagdBonus} | Speed: ${v.geschwindigkeit} | ${v.seltenheit}${owned}`;
            });
            const embed = new EmbedBuilder()
                .setTitle('🐦 Verfügbare Greifvögel')
                .setDescription(lines.join('\n'))
                .setColor(0x8B4513);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'kaufen') {
            const f = getFalkner(db, uId);
            if (!f.aktiver_vogel) return interaction.reply({ content: '❌ Nutze `/falkner start` um zu beginnen!', ephemeral: true });
            const vogelName = interaction.options.getString('vogel');
            const vogel = VOEGEL.find(v => v.name.toLowerCase() === vogelName.toLowerCase());
            if (!vogel) return interaction.reply({ content: '❌ Unbekannter Greifvogel!', ephemeral: true });

            const voegel = JSON.parse(f.voegel);
            if (voegel.find(v => v.name === vogel.name)) return interaction.reply({ content: '❌ Du besitzt diesen Vogel bereits!', ephemeral: true });

            const maxVoegel = 3 + UPGRADES.voliere.bonus[f.voliere];
            if (voegel.length >= maxVoegel) return interaction.reply({ content: `❌ Deine Voliere ist voll! (${voegel.length}/${maxVoegel}) Upgrade deine Voliere!`, ephemeral: true });

            const user = db.getUser(uId);
            if (user.balance < vogel.preis) return interaction.reply({ content: `❌ Du brauchst ${vogel.preis} Münzen! (Hast: ${user.balance})`, ephemeral: true });

            db.updateBalance(uId, -vogel.preis);
            voegel.push({ name: vogel.name, bindung: 30, energie: 100 });
            db.db.prepare('UPDATE falkner SET voegel = ? WHERE user_id = ?').run(JSON.stringify(voegel), uId);

            const embed = new EmbedBuilder()
                .setTitle('🐦 Neuer Greifvogel!')
                .setDescription(`Du hast einen **${vogel.name}** ${vogel.emoji} für **${vogel.preis} Münzen** erworben!`)
                .addFields(
                    { name: '🎯 Jagdbonus', value: `x${vogel.jagdBonus}`, inline: true },
                    { name: '💨 Geschwindigkeit', value: `${vogel.geschwindigkeit}`, inline: true },
                    { name: '⭐ Seltenheit', value: vogel.seltenheit, inline: true }
                )
                .setColor(0x00FF00);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'auswahl') {
            const f = getFalkner(db, uId);
            if (!f.aktiver_vogel) return interaction.reply({ content: '❌ Nutze `/falkner start` um zu beginnen!', ephemeral: true });
            const vogelName = interaction.options.getString('vogel');
            const voegel = JSON.parse(f.voegel);
            const besitz = voegel.find(v => v.name.toLowerCase() === vogelName.toLowerCase());
            if (!besitz) return interaction.reply({ content: '❌ Du besitzt diesen Vogel nicht!', ephemeral: true });

            db.db.prepare('UPDATE falkner SET aktiver_vogel = ? WHERE user_id = ?').run(besitz.name, uId);
            const vogelDef = VOEGEL.find(v => v.name === besitz.name);
            return interaction.reply({ content: `✅ **${besitz.name}** ${vogelDef ? vogelDef.emoji : '🐦'} ist jetzt dein aktiver Jagdvogel! (Bindung: ${besitz.bindung}%)` });
        }

        if (sub === 'jagen') {
            const f = getFalkner(db, uId);
            if (!f.aktiver_vogel) return interaction.reply({ content: '❌ Nutze `/falkner start` um zu beginnen!', ephemeral: true });

            const cdKey = `falkner_jagd_${uId}`;
            const cdTime = cooldowns.get(cdKey);
            if (cdTime && Date.now() - cdTime < 45000) {
                const rest = Math.ceil((45000 - (Date.now() - cdTime)) / 1000);
                return interaction.reply({ content: `⏳ Dein Vogel ruht sich aus! Warte noch ${rest}s.`, ephemeral: true });
            }

            const gebietName = interaction.options.getString('gebiet');
            const gebiet = JAGDGEBIETE.find(g => g.name.toLowerCase() === gebietName.toLowerCase());
            if (!gebiet) return interaction.reply({ content: `❌ Unbekanntes Gebiet! Verfügbar: ${JAGDGEBIETE.map(g => g.name).join(', ')}`, ephemeral: true });
            if (f.level < gebiet.minLevel) return interaction.reply({ content: `❌ Du brauchst Level ${gebiet.minLevel} für ${gebiet.name}! (Aktuell: ${f.level})`, ephemeral: true });

            cooldowns.set(cdKey, Date.now());
            const vogelDef = VOEGEL.find(v => v.name === f.aktiver_vogel);
            const voegel = JSON.parse(f.voegel);
            const aktiverVogelData = voegel.find(v => v.name === f.aktiver_vogel);

            const handschuhBonus = UPGRADES.handschuh.bonus[f.handschuh];
            const haubeBonus = UPGRADES.haube.bonus[f.haube];
            const geschirrBonus = UPGRADES.geschirr.bonus[f.geschirr];
            const bindungBonus = (aktiverVogelData ? aktiverVogelData.bindung : 50) / 200;
            const instinktBonus = f.jagdinstinkt * 0.02;

            const erfolgChance = Math.min(0.95, 0.5 + handschuhBonus + haubeBonus + bindungBonus + instinktBonus);
            const erfolg = Math.random() < erfolgChance;

            let event = null;
            if (Math.random() < 0.2) {
                event = JAGD_EVENTS[Math.floor(Math.random() * JAGD_EVENTS.length)];
            }

            const gefahr = Math.random() < gebiet.gefahrChance;
            let results = [];
            let gesamtWert = 0;
            let beuteAnzahl = 0;

            if (erfolg && !gefahr) {
                const anzahlBeute = 1 + Math.floor(Math.random() * 3) + Math.floor(f.ausdauer / 5);
                for (let i = 0; i < anzahlBeute; i++) {
                    const beutePool = BEUTE_TYPEN.filter((_, idx) => idx <= Math.min(BEUTE_TYPEN.length - 1, 2 + f.level + Math.floor(vogelDef.jagdBonus)));
                    const beute = beutePool[Math.floor(Math.random() * beutePool.length)];
                    let wert = Math.floor(beute.wert * gebiet.beuteMulti * vogelDef.jagdBonus * (1 + geschirrBonus));
                    if (event) wert = Math.floor(wert * event.beuteMulti);
                    gesamtWert += wert;
                    beuteAnzahl++;
                    results.push(`${beute.name} (${wert} Münzen)`);

                    db.db.prepare('INSERT INTO beute_sammlung (user_id, beute_name, wert, gewicht, gebiet, vogel, gefangen_am) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
                        uId, beute.name, wert, beute.gewicht, gebiet.name, f.aktiver_vogel, Date.now()
                    );
                }

                let bonusGeld = 0;
                if (event) bonusGeld = Math.floor(gesamtWert * (event.geldMulti - 1));
                gesamtWert += bonusGeld;

                db.updateBalance(uId, gesamtWert);

                if (aktiverVogelData) {
                    aktiverVogelData.bindung = Math.min(100, aktiverVogelData.bindung + 1);
                    db.db.prepare('UPDATE falkner SET voegel = ? WHERE user_id = ?').run(JSON.stringify(voegel), uId);
                }
            }

            const xpGain = erfolg && !gefahr ? 15 + beuteAnzahl * 5 : 5;
            db.db.prepare('UPDATE falkner SET jagden = jagden + 1, erfolgreiche_jagden = erfolgreiche_jagden + ?, gesamtbeute = gesamtbeute + ?, xp = xp + ?, letzte_jagd = ? WHERE user_id = ?').run(
                erfolg && !gefahr ? 1 : 0, beuteAnzahl, xpGain, Date.now(), uId
            );

            const updatedF = getFalkner(db, uId);
            const levelUp = checkLevelUp(db, uId, updatedF);

            const embed = new EmbedBuilder()
                .setTitle(`🏹 Jagd in ${gebiet.name}`)
                .setColor(erfolg && !gefahr ? 0x00FF00 : 0xFF0000);

            if (event) embed.addFields({ name: '🎲 Ereignis', value: event.text });

            if (gefahr) {
                embed.setDescription(`⚠️ Gefahr! Ein Sturm hat die Jagd verhindert. Dein ${f.aktiver_vogel} kehrt sicher zurück.`);
            } else if (erfolg) {
                embed.setDescription(`${vogelDef.emoji} **${f.aktiver_vogel}** hatte eine erfolgreiche Jagd!`);
                embed.addFields(
                    { name: '🎯 Beute', value: results.join('\n') || 'Keine', inline: false },
                    { name: '💰 Verdienst', value: `${gesamtWert} Münzen`, inline: true },
                    { name: '⭐ XP', value: `+${xpGain}`, inline: true }
                );
            } else {
                embed.setDescription(`${vogelDef.emoji} **${f.aktiver_vogel}** konnte keine Beute fangen. Versuche es erneut!`);
                embed.addFields({ name: '⭐ XP', value: `+${xpGain}`, inline: true });
            }

            if (levelUp.ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${levelUp.lvl}!` });

            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'training') {
            const f = getFalkner(db, uId);
            if (!f.aktiver_vogel) return interaction.reply({ content: '❌ Nutze `/falkner start` um zu beginnen!', ephemeral: true });

            const cdKey = `falkner_train_${uId}`;
            const cdTime = cooldowns.get(cdKey);
            if (cdTime && Date.now() - cdTime < 60000) {
                const rest = Math.ceil((60000 - (Date.now() - cdTime)) / 1000);
                return interaction.reply({ content: `⏳ Dein Vogel braucht eine Pause! Warte noch ${rest}s.`, ephemeral: true });
            }

            const typName = interaction.options.getString('typ');
            const training = TRAININGS.find(t => t.name.toLowerCase() === typName.toLowerCase());
            if (!training) return interaction.reply({ content: `❌ Unbekanntes Training! Verfügbar: ${TRAININGS.map(t => t.name).join(', ')}`, ephemeral: true });

            cooldowns.set(cdKey, Date.now());
            const xpGain = training.xpBonus + Math.floor(f.level * 2);

            const updates = {};
            updates[training.effekt] = f[training.effekt] + 1;

            db.db.prepare(`UPDATE falkner SET ${training.effekt} = ?, trainings = trainings + 1, xp = xp + ?, letztes_training = ? WHERE user_id = ?`).run(
                updates[training.effekt], xpGain, Date.now(), uId
            );

            const voegel = JSON.parse(f.voegel);
            const aktiverVogelData = voegel.find(v => v.name === f.aktiver_vogel);
            if (aktiverVogelData) {
                aktiverVogelData.bindung = Math.min(100, aktiverVogelData.bindung + 2);
                db.db.prepare('UPDATE falkner SET voegel = ? WHERE user_id = ?').run(JSON.stringify(voegel), uId);
            }

            const updatedF = getFalkner(db, uId);
            const levelUp = checkLevelUp(db, uId, updatedF);

            const embed = new EmbedBuilder()
                .setTitle(`🎓 ${training.name}`)
                .setDescription(`Du hast **${f.aktiver_vogel}** im ${training.name} trainiert!`)
                .addFields(
                    { name: '📈 Effekt', value: `${training.effekt}: ${f[training.effekt]} → ${updates[training.effekt]}`, inline: true },
                    { name: '⭐ XP', value: `+${xpGain}`, inline: true },
                    { name: '❤️ Bindung', value: `+2% (${aktiverVogelData ? Math.min(100, aktiverVogelData.bindung + 2) : '?'}%)`, inline: true }
                )
                .setColor(0x4169E1);

            if (levelUp.ups > 0) embed.addFields({ name: '🎉 Level Up!', value: `Du bist jetzt Level ${levelUp.lvl}!` });

            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'upgrade') {
            const f = getFalkner(db, uId);
            if (!f.aktiver_vogel) return interaction.reply({ content: '❌ Nutze `/falkner start` um zu beginnen!', ephemeral: true });

            const item = interaction.options.getString('item').toLowerCase();
            const upg = UPGRADES[item];
            if (!upg) return interaction.reply({ content: `❌ Unbekanntes Upgrade! Verfügbar: ${Object.keys(UPGRADES).join(', ')}`, ephemeral: true });

            const currentLvl = f[item];
            if (currentLvl >= 4) return interaction.reply({ content: `❌ ${upg.name} ist bereits auf Maximum (Stufe 4)!`, ephemeral: true });

            const kosten = upg.stufen[currentLvl + 1];
            const user = db.getUser(uId);
            if (user.balance < kosten) return interaction.reply({ content: `❌ Du brauchst ${kosten} Münzen! (Hast: ${user.balance})`, ephemeral: true });

            db.updateBalance(uId, -kosten);
            db.db.prepare(`UPDATE falkner SET ${item} = ? WHERE user_id = ?`).run(currentLvl + 1, uId);

            const embed = new EmbedBuilder()
                .setTitle(`⬆️ ${upg.name} verbessert!`)
                .setDescription(`Stufe ${currentLvl} → **Stufe ${currentLvl + 1}**`)
                .addFields(
                    { name: '💰 Kosten', value: `${kosten} Münzen`, inline: true },
                    { name: '📊 Bonus', value: item === 'voliere' ? `+${upg.bonus[currentLvl + 1]} Vogelplätze` : `+${(upg.bonus[currentLvl + 1] * 100).toFixed(0)}%`, inline: true }
                )
                .setColor(0xFFD700);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'sammlung') {
            const f = getFalkner(db, uId);
            if (!f.aktiver_vogel) return interaction.reply({ content: '❌ Nutze `/falkner start` um zu beginnen!', ephemeral: true });

            const sammlung = db.db.prepare('SELECT beute_name, COUNT(*) as anzahl, SUM(wert) as gesamtwert FROM beute_sammlung WHERE user_id = ? GROUP BY beute_name ORDER BY gesamtwert DESC LIMIT 15').all(uId);

            if (sammlung.length === 0) {
                return interaction.reply({ content: '📦 Deine Beutesammlung ist noch leer. Gehe auf die Jagd!', ephemeral: true });
            }

            const total = db.db.prepare('SELECT COUNT(*) as cnt, SUM(wert) as total FROM beute_sammlung WHERE user_id = ?').get(uId);
            const lines = sammlung.map(s => `**${s.beute_name}** x${s.anzahl} (${s.gesamtwert} Münzen gesamt)`);

            const embed = new EmbedBuilder()
                .setTitle('🏆 Beutesammlung')
                .setDescription(lines.join('\n'))
                .addFields(
                    { name: '📊 Gesamt', value: `${total.cnt} Beutestücke`, inline: true },
                    { name: '💰 Gesamtwert', value: `${total.total} Münzen`, inline: true }
                )
                .setColor(0x8B4513);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'duell') {
            const f = getFalkner(db, uId);
            if (!f.aktiver_vogel) return interaction.reply({ content: '❌ Nutze `/falkner start` um zu beginnen!', ephemeral: true });
            if (f.level < 3) return interaction.reply({ content: '❌ Du brauchst Level 3 für Duelle!', ephemeral: true });

            const gegner = interaction.options.getUser('gegner');
            if (gegner.id === uId) return interaction.reply({ content: '❌ Du kannst dich nicht selbst herausfordern!', ephemeral: true });
            if (gegner.bot) return interaction.reply({ content: '❌ Du kannst keinen Bot herausfordern!', ephemeral: true });

            const g = db.db.prepare('SELECT * FROM falkner WHERE user_id = ?').get(gegner.id);
            if (!g || !g.aktiver_vogel) return interaction.reply({ content: '❌ Dein Gegner ist kein Falkner!', ephemeral: true });

            const vogelA = VOEGEL.find(v => v.name === f.aktiver_vogel);
            const vogelB = VOEGEL.find(v => v.name === g.aktiver_vogel);

            const scoreA = (vogelA.jagdBonus * 20) + (vogelA.geschwindigkeit * 5) + (f.level * 8) + (f.gehorsamkeit * 3) + (f.geschwindigkeit_bonus * 4) + Math.random() * 40;
            const scoreB = (vogelB.jagdBonus * 20) + (vogelB.geschwindigkeit * 5) + (g.level * 8) + (g.gehorsamkeit * 3) + (g.geschwindigkeit_bonus * 4) + Math.random() * 40;

            const gewonnen = scoreA > scoreB;
            const preis = Math.floor(200 + f.level * 50 + g.level * 50);

            if (gewonnen) {
                db.updateBalance(uId, preis);
                db.db.prepare('UPDATE falkner SET duelle_gewonnen = duelle_gewonnen + 1 WHERE user_id = ?').run(uId);
                db.db.prepare('UPDATE falkner SET duelle_verloren = duelle_verloren + 1 WHERE user_id = ?').run(gegner.id);
            } else {
                db.updateBalance(gegner.id, preis);
                db.db.prepare('UPDATE falkner SET duelle_verloren = duelle_verloren + 1 WHERE user_id = ?').run(uId);
                db.db.prepare('UPDATE falkner SET duelle_gewonnen = duelle_gewonnen + 1 WHERE user_id = ?').run(gegner.id);
            }

            const embed = new EmbedBuilder()
                .setTitle('🏆 Falkner-Duell')
                .setDescription(`${vogelA.emoji} **${f.aktiver_vogel}** vs ${vogelB.emoji} **${g.aktiver_vogel}**`)
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
