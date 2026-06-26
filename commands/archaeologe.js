const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

const cooldowns = new Map();

function ensureArchTables() {
    db.db.exec(`
        CREATE TABLE IF NOT EXISTS archaeologists (
            user_id TEXT PRIMARY KEY,
            title TEXT DEFAULT 'Hobbyarchäologe',
            rank INTEGER DEFAULT 0,
            prestige INTEGER DEFAULT 0,
            tools_level INTEGER DEFAULT 1,
            knowledge INTEGER DEFAULT 1,
            luck INTEGER DEFAULT 1,
            endurance INTEGER DEFAULT 1,
            excavations INTEGER DEFAULT 0,
            artifacts_found INTEGER DEFAULT 0,
            total_earned INTEGER DEFAULT 0,
            current_site TEXT DEFAULT '',
            site_progress INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    db.db.exec(`
        CREATE TABLE IF NOT EXISTS arch_collection (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            artifact_id TEXT,
            era TEXT,
            quality INTEGER DEFAULT 50,
            appraised INTEGER DEFAULT 0,
            value INTEGER DEFAULT 0,
            found_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

const RANKS = [
    { name: 'Hobbyarchäologe', prestige: 0 },
    { name: 'Feldassistent', prestige: 100 },
    { name: 'Grabungsleiter', prestige: 300 },
    { name: 'Archäologe', prestige: 700 },
    { name: 'Seniorarchäologe', prestige: 1500 },
    { name: 'Professor', prestige: 3000 },
    { name: 'Legende der Archäologie', prestige: 6000 }
];

const SITES = {
    hinterhof: { name: '🏡 Hinterhof', difficulty: 3, minRank: 0, layers: 3, desc: 'Vielleicht liegt hier was begraben...' },
    ruine: { name: '🏚️ Alte Ruine', difficulty: 8, minRank: 0, layers: 5, desc: 'Eine verfallene Struktur am Waldrand' },
    hoehle: { name: '🕳️ Tiefe Höhle', difficulty: 14, minRank: 1, layers: 6, desc: 'Uralte Höhlenmalereien an den Wänden' },
    tempel: { name: '🛕 Versunkener Tempel', difficulty: 22, minRank: 2, layers: 8, desc: 'Ein Tempel einer vergessenen Zivilisation' },
    pyramide: { name: '🔺 Pyramidenanlage', difficulty: 30, minRank: 3, layers: 10, desc: 'Geheime Kammern und Fallen' },
    unterwasser: { name: '🌊 Unterwasserstadt', difficulty: 40, minRank: 4, layers: 12, desc: 'Eine versunkene Metropole' },
    vulkan: { name: '🌋 Vulkanruinen', difficulty: 50, minRank: 5, layers: 14, desc: 'Von Lava konservierte Schätze' },
    dimension: { name: '🌀 Dimensionsriss', difficulty: 65, minRank: 6, layers: 16, desc: 'Artefakte aus einer anderen Welt' }
};

const ERAS = {
    steinzeit: { name: '🪨 Steinzeit', valueRange: [20, 80] },
    bronze: { name: '⚔️ Bronzezeit', valueRange: [50, 150] },
    antike: { name: '🏛️ Antike', valueRange: [100, 400] },
    mittelalter: { name: '🏰 Mittelalter', valueRange: [150, 500] },
    renaissance: { name: '🎨 Renaissance', valueRange: [300, 800] },
    mystisch: { name: '✨ Mystisch', valueRange: [500, 2000] },
    alien: { name: '👽 Außerirdisch', valueRange: [1000, 5000] }
};

const ARTIFACTS = {
    steinzeit: [
        { id: 'faustkeil', name: 'Faustkeil', rarity: 1 },
        { id: 'hoehlenmalerei', name: 'Höhlenmalerei-Fragment', rarity: 2 },
        { id: 'mammutfigur', name: 'Mammut-Figur', rarity: 3 }
    ],
    bronze: [
        { id: 'bronzeschwert', name: 'Bronzeschwert', rarity: 1 },
        { id: 'goldschmuck', name: 'Goldschmuck', rarity: 2 },
        { id: 'ritualmaske', name: 'Ritualmaske', rarity: 3 }
    ],
    antike: [
        { id: 'muenze', name: 'Antike Münze', rarity: 1 },
        { id: 'amphore', name: 'Verzierte Amphore', rarity: 2 },
        { id: 'statue', name: 'Marmorstatue', rarity: 3 },
        { id: 'schriftrolle', name: 'Antike Schriftrolle', rarity: 4 }
    ],
    mittelalter: [
        { id: 'ritterhelm', name: 'Ritterhelm', rarity: 1 },
        { id: 'siegel', name: 'Königliches Siegel', rarity: 2 },
        { id: 'reliquie', name: 'Heilige Reliquie', rarity: 3 },
        { id: 'krone', name: 'Vergessene Krone', rarity: 4 }
    ],
    renaissance: [
        { id: 'gemaelde', name: 'Altes Gemälde', rarity: 2 },
        { id: 'instrument', name: 'Antikes Instrument', rarity: 2 },
        { id: 'codex', name: 'Geheimer Codex', rarity: 3 },
        { id: 'meisterwerk', name: 'Meisterwerk', rarity: 4 }
    ],
    mystisch: [
        { id: 'kristall', name: 'Leuchtender Kristall', rarity: 3 },
        { id: 'amulett', name: 'Magisches Amulett', rarity: 3 },
        { id: 'orakel', name: 'Orakelstein', rarity: 4 },
        { id: 'artefakt', name: 'Mystisches Artefakt', rarity: 5 }
    ],
    alien: [
        { id: 'fragment', name: 'Alien-Fragment', rarity: 3 },
        { id: 'datenwuerfel', name: 'Datenwürfel', rarity: 4 },
        { id: 'energiekern', name: 'Energiekern', rarity: 4 },
        { id: 'sternenkarte', name: 'Sternenkarte', rarity: 5 }
    ]
};

const DIG_EVENTS = [
    { text: '💎 Du findest eine verborgene Kammer!', qualityMod: 20, bonusFind: true },
    { text: '📜 Alte Inschriften weisen den Weg!', qualityMod: 15, bonusFind: false },
    { text: '🔦 Deine Lampe flackert... etwas glänzt!', qualityMod: 10, bonusFind: false },
    { text: '⛏️ Vorsichtig legst du etwas frei...', qualityMod: 5, bonusFind: false },
    { text: '🪨 Harter Fels verlangsamt die Arbeit.', qualityMod: -5, bonusFind: false },
    { text: '🕷️ Spinnen überall! Du fällst fast hin.', qualityMod: -10, bonusFind: false },
    { text: '💀 Eine Falle! Du wirst leicht verletzt.', qualityMod: -15, bonusFind: false },
    { text: '🌊 Wasser flutet den Tunnel!', qualityMod: -20, bonusFind: false }
];

const RARITY_STARS = ['', '⭐', '⭐⭐', '⭐⭐⭐', '⭐⭐⭐⭐', '⭐⭐⭐⭐⭐'];

function getRank(prestige) {
    for (let i = RANKS.length - 1; i >= 0; i--) {
        if (prestige >= RANKS[i].prestige) return i;
    }
    return 0;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('archaeologe')
        .setDescription('⛏️ Grabe nach antiken Artefakten und Schätzen!')
        .addSubcommand(s => s.setName('profil').setDescription('Zeige dein Archäologen-Profil'))
        .addSubcommand(s => s.setName('grabung').setDescription('Starte eine Grabung')
            .addStringOption(o => o.setName('ort').setDescription('Grabungsort').setRequired(true)
                .addChoices(...Object.entries(SITES).map(([k, v]) => ({ name: v.name, value: k })))))
        .addSubcommand(s => s.setName('graben').setDescription('Grabe an deinem aktuellen Ort'))
        .addSubcommand(s => s.setName('sammlung').setDescription('Zeige deine Artefakt-Sammlung'))
        .addSubcommand(s => s.setName('bewerten').setDescription('Lass ein Artefakt bewerten')
            .addIntegerOption(o => o.setName('id').setDescription('Artefakt-ID').setRequired(true)))
        .addSubcommand(s => s.setName('verkaufen').setDescription('Verkaufe ein Artefakt')
            .addIntegerOption(o => o.setName('id').setDescription('Artefakt-ID').setRequired(true)))
        .addSubcommand(s => s.setName('trainieren').setDescription('Verbessere eine Fähigkeit')
            .addStringOption(o => o.setName('skill').setDescription('Welcher Skill').setRequired(true)
                .addChoices(
                    { name: '⛏️ Werkzeuge', value: 'tools_level' },
                    { name: '📚 Wissen', value: 'knowledge' },
                    { name: '🍀 Glück', value: 'luck' },
                    { name: '💪 Ausdauer', value: 'endurance' }
                )))
        .addSubcommand(s => s.setName('orte').setDescription('Zeige alle Grabungsorte'))
        .addSubcommand(s => s.setName('museum').setDescription('Spende ein Artefakt ans Museum für Prestige')
            .addIntegerOption(o => o.setName('id').setDescription('Artefakt-ID').setRequired(true))),

    async execute(interaction) {
        ensureArchTables();
        const config = require('../config.json');
        const sub = interaction.options.getSubcommand();
        const userId = interaction.user.id;

        let arch = db.db.prepare('SELECT * FROM archaeologists WHERE user_id = ?').get(userId);

        if (!arch && sub !== 'profil') {
            return interaction.reply({ content: '❌ Benutze zuerst `/archaeologe profil` um Archäologe zu werden!', ephemeral: true });
        }

        if (sub === 'profil') {
            if (!arch) {
                db.db.prepare('INSERT INTO archaeologists (user_id) VALUES (?)').run(userId);
                arch = db.db.prepare('SELECT * FROM archaeologists WHERE user_id = ?').get(userId);
                const embed = new EmbedBuilder()
                    .setColor('#C4A882')
                    .setTitle('⛏️ Archäologen-Karriere gestartet!')
                    .setDescription('Du hast deine Schaufel gepackt und bist bereit!\n\nStarte eine Grabung mit `/archaeologe grabung`.');
                return interaction.reply({ embeds: [embed] });
            }

            const rank = getRank(arch.prestige);
            const nextRank = rank < RANKS.length - 1 ? RANKS[rank + 1] : null;
            const artifactCount = db.db.prepare('SELECT COUNT(*) as cnt FROM arch_collection WHERE user_id = ?').get(userId).cnt;

            const embed = new EmbedBuilder()
                .setColor('#C4A882')
                .setTitle(`⛏️ ${RANKS[rank].name}`)
                .setDescription(`${nextRank ? `Nächster Rang: ${nextRank.name} (${arch.prestige}/${nextRank.prestige} Prestige)` : '👑 MAXIMALER RANG!'}`)
                .addFields(
                    { name: '⭐ Prestige', value: `${arch.prestige}`, inline: true },
                    { name: '🏺 Artefakte', value: `${artifactCount}`, inline: true },
                    { name: '⛏️ Grabungen', value: `${arch.excavations}`, inline: true },
                    { name: '⛏️ Werkzeuge', value: `Lv.${arch.tools_level}`, inline: true },
                    { name: '📚 Wissen', value: `Lv.${arch.knowledge}`, inline: true },
                    { name: '🍀 Glück', value: `Lv.${arch.luck}`, inline: true },
                    { name: '💪 Ausdauer', value: `Lv.${arch.endurance}`, inline: true },
                    { name: '💰 Verdient', value: `${arch.total_earned} Coins`, inline: true }
                );

            if (arch.current_site) {
                const site = SITES[arch.current_site];
                embed.addFields({ name: '📍 Aktuelle Grabung', value: `${site.name} — Fortschritt: ${arch.site_progress}/${site.layers} Schichten` });
            }

            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'grabung') {
            const siteId = interaction.options.getString('ort');
            const site = SITES[siteId];
            const rank = getRank(arch.prestige);

            if (rank < site.minRank) {
                return interaction.reply({ content: `❌ Du brauchst Rang ${site.minRank} (${RANKS[site.minRank].name}) für diesen Ort.`, ephemeral: true });
            }

            const cost = site.difficulty * 15;
            let balance = db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId);
            if (!balance || balance.balance < cost) {
                return interaction.reply({ content: `❌ Expedition kostet ${cost} Coins (Ausrüstung & Reise). Du hast ${balance?.balance || 0}.`, ephemeral: true });
            }

            db.db.prepare('UPDATE economy SET balance = balance - ? WHERE user_id = ?').run(cost, userId);
            db.db.prepare('UPDATE archaeologists SET current_site = ?, site_progress = 0, excavations = excavations + 1 WHERE user_id = ?').run(siteId, userId);

            const embed = new EmbedBuilder()
                .setColor('#C4A882')
                .setTitle(`📍 Neue Grabung: ${site.name}`)
                .setDescription(`${site.desc}\n\n🗺️ **${site.layers} Schichten** zu erforschen\n⚠️ Schwierigkeit: ${site.difficulty}\n💰 -${cost} Coins\n\nGrabe los mit \`/archaeologe graben\`!`);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'graben') {
            const cdKey = `arch_dig_${userId}`;
            if (cooldowns.has(cdKey) && cooldowns.get(cdKey) > Date.now()) {
                const left = Math.ceil((cooldowns.get(cdKey) - Date.now()) / 1000);
                return interaction.reply({ content: `⏳ Warte ${left}s bevor du weitergraben kannst.`, ephemeral: true });
            }

            if (!arch.current_site) {
                return interaction.reply({ content: '❌ Du hast keine aktive Grabung! Starte eine mit `/archaeologe grabung`.', ephemeral: true });
            }

            const site = SITES[arch.current_site];
            if (arch.site_progress >= site.layers) {
                db.db.prepare('UPDATE archaeologists SET current_site = \'\', site_progress = 0 WHERE user_id = ?').run(userId);
                return interaction.reply({ content: '✅ Diese Grabung ist abgeschlossen! Starte eine neue mit `/archaeologe grabung`.', ephemeral: true });
            }

            const event = DIG_EVENTS[Math.floor(Math.random() * DIG_EVENTS.length)];
            const d20 = Math.floor(Math.random() * 20) + 1;
            const toolBonus = arch.tools_level * 2;
            const enduranceBonus = arch.endurance;
            const digPower = d20 + toolBonus + enduranceBonus + event.qualityMod;
            const success = digPower >= site.difficulty;

            const embed = new EmbedBuilder().setTitle(`⛏️ Graben — ${site.name} (Schicht ${arch.site_progress + 1}/${site.layers})`);
            let desc = `${event.text}\n\n🎲 Würfel: **${d20}** + Werkzeuge: **${toolBonus}** + Ausdauer: **${enduranceBonus}** + Event: **${event.qualityMod}** = **${digPower}** vs **${site.difficulty}**\n\n`;

            if (success) {
                const eraKeys = Object.keys(ERAS);
                const depthFactor = arch.site_progress / site.layers;
                const luckBonus = arch.luck * 3;
                let eraRoll = Math.floor(Math.random() * 100) + luckBonus + Math.floor(depthFactor * 30);

                let eraId;
                if (eraRoll >= 95) eraId = 'alien';
                else if (eraRoll >= 85) eraId = 'mystisch';
                else if (eraRoll >= 70) eraId = 'renaissance';
                else if (eraRoll >= 55) eraId = 'mittelalter';
                else if (eraRoll >= 40) eraId = 'antike';
                else if (eraRoll >= 25) eraId = 'bronze';
                else eraId = 'steinzeit';

                const era = ERAS[eraId];
                const artifacts = ARTIFACTS[eraId];
                const rarityRoll = Math.random() * 100 + arch.luck * 2;
                let artifact;
                if (rarityRoll >= 95) artifact = artifacts.find(a => a.rarity >= 4) || artifacts[artifacts.length - 1];
                else if (rarityRoll >= 75) artifact = artifacts.find(a => a.rarity >= 3) || artifacts[Math.floor(artifacts.length / 2)];
                else if (rarityRoll >= 45) artifact = artifacts.find(a => a.rarity >= 2) || artifacts[0];
                else artifact = artifacts[0];

                const baseQuality = 30 + Math.floor(Math.random() * 40);
                const knowledgeBonus = arch.knowledge * 3;
                const quality = Math.min(100, baseQuality + knowledgeBonus + event.qualityMod);

                db.db.prepare('INSERT INTO arch_collection (user_id, artifact_id, era, quality) VALUES (?, ?, ?, ?)').run(userId, artifact.id, eraId, quality);
                db.db.prepare('UPDATE archaeologists SET site_progress = site_progress + 1, artifacts_found = artifacts_found + 1, prestige = prestige + ? WHERE user_id = ?')
                    .run(artifact.rarity * 5 + Math.floor(quality / 10), userId);

                desc += `✅ **Fund!**\n\n🏺 **${artifact.name}** ${RARITY_STARS[artifact.rarity]}\n${era.name}\n⭐ Qualität: ${quality}/100\n\n⭐ +${artifact.rarity * 5 + Math.floor(quality / 10)} Prestige`;

                if (event.bonusFind && Math.random() < 0.5) {
                    const bonusArtifact = artifacts[Math.floor(Math.random() * artifacts.length)];
                    db.db.prepare('INSERT INTO arch_collection (user_id, artifact_id, era, quality) VALUES (?, ?, ?, ?)').run(userId, bonusArtifact.id, eraId, quality - 10);
                    desc += `\n\n💎 **Bonusfund!** ${bonusArtifact.name} ${RARITY_STARS[bonusArtifact.rarity]}`;
                }

                embed.setColor('#00aa00');
            } else {
                db.db.prepare('UPDATE archaeologists SET site_progress = site_progress + 1 WHERE user_id = ?').run(userId);
                desc += '❌ **Nichts gefunden.** Die Schicht enthielt nur Erde und Steine.\n\nWeiter graben!';
                embed.setColor('#aa6600');
            }

            const newProgress = arch.site_progress + 1;
            if (newProgress >= site.layers) {
                desc += '\n\n🏁 **Grabung abgeschlossen!** Starte eine neue mit `/archaeologe grabung`.';
                db.db.prepare('UPDATE archaeologists SET current_site = \'\', site_progress = 0, prestige = prestige + ? WHERE user_id = ?').run(site.layers * 5, userId);
            }

            embed.setDescription(desc);
            cooldowns.set(cdKey, Date.now() + 40000);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'sammlung') {
            const artifacts = db.db.prepare('SELECT * FROM arch_collection WHERE user_id = ? ORDER BY quality DESC LIMIT 15').all(userId);

            if (artifacts.length === 0) {
                return interaction.reply({ content: '❌ Deine Sammlung ist leer! Grabe nach Artefakten.', ephemeral: true });
            }

            const list = artifacts.map(a => {
                const artInfo = Object.values(ARTIFACTS).flat().find(x => x.id === a.artifact_id);
                const era = ERAS[a.era];
                const valueStr = a.appraised ? `💰 ${a.value} Coins` : '❓ Nicht bewertet';
                return `**#${a.id} ${artInfo?.name || a.artifact_id}** ${RARITY_STARS[artInfo?.rarity || 1]}\n${era.name} | Qualität: ${a.quality}/100 | ${valueStr}`;
            }).join('\n\n');

            const total = db.db.prepare('SELECT COUNT(*) as cnt FROM arch_collection WHERE user_id = ?').get(userId).cnt;
            const embed = new EmbedBuilder()
                .setColor('#C4A882')
                .setTitle('🏺 Deine Sammlung')
                .setDescription(list)
                .setFooter({ text: `${total} Artefakte gesamt (zeigt Top 15)` });
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'bewerten') {
            const artId = interaction.options.getInteger('id');
            const artifact = db.db.prepare('SELECT * FROM arch_collection WHERE id = ? AND user_id = ?').get(artId, userId);
            if (!artifact) return interaction.reply({ content: '❌ Artefakt nicht gefunden!', ephemeral: true });
            if (artifact.appraised) return interaction.reply({ content: '❌ Dieses Artefakt wurde bereits bewertet!', ephemeral: true });

            const era = ERAS[artifact.era];
            const artInfo = Object.values(ARTIFACTS).flat().find(x => x.id === artifact.artifact_id);
            const baseValue = era.valueRange[0] + Math.floor(Math.random() * (era.valueRange[1] - era.valueRange[0]));
            const qualityMul = artifact.quality / 50;
            const rarityMul = (artInfo?.rarity || 1) * 0.5 + 0.5;
            const knowledgeMul = 1 + arch.knowledge * 0.05;
            const value = Math.floor(baseValue * qualityMul * rarityMul * knowledgeMul);

            db.db.prepare('UPDATE arch_collection SET appraised = 1, value = ? WHERE id = ?').run(value, artId);

            const embed = new EmbedBuilder()
                .setColor('#C4A882')
                .setTitle('🔍 Artefakt bewertet!')
                .setDescription(`**${artInfo?.name || artifact.artifact_id}** ${RARITY_STARS[artInfo?.rarity || 1]}\n${era.name} | Qualität: ${artifact.quality}/100\n\n💰 Geschätzter Wert: **${value} Coins**\n\nVerkaufe es mit \`/archaeologe verkaufen ${artId}\``);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'verkaufen') {
            const artId = interaction.options.getInteger('id');
            const artifact = db.db.prepare('SELECT * FROM arch_collection WHERE id = ? AND user_id = ?').get(artId, userId);
            if (!artifact) return interaction.reply({ content: '❌ Artefakt nicht gefunden!', ephemeral: true });
            if (!artifact.appraised) return interaction.reply({ content: '❌ Lass das Artefakt zuerst bewerten mit `/archaeologe bewerten`!', ephemeral: true });

            let balance = db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId);
            if (!balance) db.db.prepare('INSERT INTO economy (user_id, balance) VALUES (?, 0)').run(userId);
            db.db.prepare('UPDATE economy SET balance = balance + ? WHERE user_id = ?').run(artifact.value, userId);
            db.db.prepare('UPDATE archaeologists SET total_earned = total_earned + ? WHERE user_id = ?').run(artifact.value, userId);
            db.db.prepare('DELETE FROM arch_collection WHERE id = ?').run(artId);

            const artInfo = Object.values(ARTIFACTS).flat().find(x => x.id === artifact.artifact_id);
            const embed = new EmbedBuilder()
                .setColor('#00aa00')
                .setTitle('💰 Artefakt verkauft!')
                .setDescription(`**${artInfo?.name || artifact.artifact_id}** für **${artifact.value} Coins** verkauft!`);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'trainieren') {
            const cdKey = `arch_train_${userId}`;
            if (cooldowns.has(cdKey) && cooldowns.get(cdKey) > Date.now()) {
                const left = Math.ceil((cooldowns.get(cdKey) - Date.now()) / 1000);
                return interaction.reply({ content: `⏳ Training-Cooldown: ${left}s`, ephemeral: true });
            }

            const skill = interaction.options.getString('skill');
            const skillNames = { tools_level: '⛏️ Werkzeuge', knowledge: '📚 Wissen', luck: '🍀 Glück', endurance: '💪 Ausdauer' };
            const current = arch[skill];
            const cost = current * 80;

            let balance = db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId);
            if (!balance || balance.balance < cost) {
                return interaction.reply({ content: `❌ Training kostet ${cost} Coins. Du hast ${balance?.balance || 0}.`, ephemeral: true });
            }

            db.db.prepare('UPDATE economy SET balance = balance - ? WHERE user_id = ?').run(cost, userId);
            db.db.prepare(`UPDATE archaeologists SET ${skill} = ${skill} + 1 WHERE user_id = ?`).run(userId);

            const embed = new EmbedBuilder()
                .setColor('#C4A882')
                .setTitle('📚 Training abgeschlossen!')
                .setDescription(`${skillNames[skill]}: **${current}** → **${current + 1}**\n💰 -${cost} Coins`);
            cooldowns.set(cdKey, Date.now() + 60000);
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'orte') {
            const rank = getRank(arch.prestige);
            const list = Object.entries(SITES).map(([k, s]) => {
                const locked = rank < s.minRank;
                return `${locked ? '🔒' : '📍'} **${s.name}** ${locked ? `(Rang ${s.minRank})` : ''}\n${s.desc}\nSchwierigkeit: ${s.difficulty} | Schichten: ${s.layers} | Kosten: ${s.difficulty * 15} Coins`;
            }).join('\n\n');

            const embed = new EmbedBuilder()
                .setColor('#C4A882')
                .setTitle('🗺️ Grabungsorte')
                .setDescription(list)
                .setFooter({ text: `Dein Rang: ${RANKS[rank].name} (${rank})` });
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'museum') {
            const artId = interaction.options.getInteger('id');
            const artifact = db.db.prepare('SELECT * FROM arch_collection WHERE id = ? AND user_id = ?').get(artId, userId);
            if (!artifact) return interaction.reply({ content: '❌ Artefakt nicht gefunden!', ephemeral: true });

            const artInfo = Object.values(ARTIFACTS).flat().find(x => x.id === artifact.artifact_id);
            const rarity = artInfo?.rarity || 1;
            const prestigeGain = rarity * 15 + Math.floor(artifact.quality / 5);

            db.db.prepare('UPDATE archaeologists SET prestige = prestige + ? WHERE user_id = ?').run(prestigeGain, userId);
            db.db.prepare('DELETE FROM arch_collection WHERE id = ?').run(artId);

            const embed = new EmbedBuilder()
                .setColor('#C4A882')
                .setTitle('🏛️ Ans Museum gespendet!')
                .setDescription(`**${artInfo?.name || artifact.artifact_id}** ${RARITY_STARS[rarity]}\nwurde dem Museum gespendet.\n\n⭐ **+${prestigeGain} Prestige**\n\n*"Eine großzügige Spende für die Wissenschaft!"*`);
            return interaction.reply({ embeds: [embed] });
        }
    }
};
