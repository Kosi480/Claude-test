const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

const cooldowns = new Map();

function ensureFotoTables() {
  db.db.exec(`CREATE TABLE IF NOT EXISTS fotografen (
    user_id TEXT PRIMARY KEY,
    name TEXT DEFAULT 'Fotograf',
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    ruf INTEGER DEFAULT 0,
    fotos_total INTEGER DEFAULT 0,
    auftraege_done INTEGER DEFAULT 0,
    kreativitaet INTEGER DEFAULT 1,
    technik INTEGER DEFAULT 1,
    auge INTEGER DEFAULT 1,
    bearbeitung INTEGER DEFAULT 1,
    kamera TEXT DEFAULT 'Einwegkamera',
    upgrade_objektiv INTEGER DEFAULT 0,
    upgrade_studio INTEGER DEFAULT 0,
    upgrade_beleuchtung INTEGER DEFAULT 0,
    upgrade_software INTEGER DEFAULT 0
  )`);
  db.db.exec(`CREATE TABLE IF NOT EXISTS foto_galerie (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    motiv TEXT,
    ort TEXT,
    qualitaet INTEGER,
    stil TEXT,
    seltenheit TEXT,
    verkaufspreis INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
  )`);
}

const KAMERAS = [
  { name: 'Einwegkamera', emoji: '📷', qualBonus: 0, cost: 0, minLevel: 1 },
  { name: 'Kompaktkamera', emoji: '📸', qualBonus: 5, cost: 500, minLevel: 2 },
  { name: 'Spiegelreflex', emoji: '📷', qualBonus: 12, cost: 1500, minLevel: 4 },
  { name: 'Profi-DSLR', emoji: '📸', qualBonus: 20, cost: 4000, minLevel: 7 },
  { name: 'Mittelformat', emoji: '🎞️', qualBonus: 30, cost: 10000, minLevel: 11 },
  { name: 'Hasselblad', emoji: '✨', qualBonus: 40, cost: 25000, minLevel: 15 },
  { name: 'Leica Meister', emoji: '🏆', qualBonus: 55, cost: 50000, minLevel: 19 },
  { name: 'Quantenkamera', emoji: '🌌', qualBonus: 70, cost: 100000, minLevel: 23 }
];

const ORTE = [
  { name: 'Hinterhof', emoji: '🏡', minLevel: 1, motive: ['Katze', 'Blumen', 'Wäscheleine', 'Schmetterling'], baseWert: 30 },
  { name: 'Stadtpark', emoji: '🌳', minLevel: 1, motive: ['Enten', 'Jogger', 'Sonnenuntergang', 'Eichhörnchen'], baseWert: 50 },
  { name: 'Altstadt', emoji: '🏰', minLevel: 3, motive: ['Fachwerk', 'Marktplatz', 'Kirchturm', 'Kopfsteinpflaster'], baseWert: 80 },
  { name: 'Hafen', emoji: '⚓', minLevel: 5, motive: ['Segelboot', 'Möwen', 'Leuchtturm', 'Fischer'], baseWert: 120 },
  { name: 'Berglandschaft', emoji: '🏔️', minLevel: 7, motive: ['Gipfelkreuz', 'Almwiese', 'Bergsee', 'Adler'], baseWert: 170 },
  { name: 'Großstadt bei Nacht', emoji: '🌃', minLevel: 10, motive: ['Skyline', 'Neonlichter', 'Straßenkünstler', 'Spiegelung'], baseWert: 230 },
  { name: 'Tropischer Strand', emoji: '🏝️', minLevel: 13, motive: ['Palmen', 'Korallenriff', 'Sonnenaufgang', 'Schildkröte'], baseWert: 300 },
  { name: 'Nordlichter', emoji: '🌌', minLevel: 16, motive: ['Aurora', 'Sternenhimmel', 'Eislandschaft', 'Polarbär'], baseWert: 400 },
  { name: 'Unterwasserwelt', emoji: '🐠', minLevel: 19, motive: ['Walhai', 'Korallenpalast', 'Tiefseekreatur', 'Versunkenes Schiff'], baseWert: 500 }
];

const STILE = ['Porträt', 'Landschaft', 'Street', 'Makro', 'Architektur', 'Wildlife', 'Abstrakt', 'Nachtaufnahme'];

const FOTO_EVENTS = [
  { text: 'Perfektes Licht — die goldene Stunde!', modifier: 20 },
  { text: 'Ein unerwartetes Motiv kreuzt deinen Weg!', modifier: 15 },
  { text: 'Wolken verdecken die Sonne...', modifier: -8 },
  { text: 'Du findest den perfekten Winkel!', modifier: 18 },
  { text: 'Dein Akku ist fast leer — schnell schießen!', modifier: -5 },
  { text: 'Ein Regenbogen erscheint im Hintergrund!', modifier: 25 },
  { text: 'Jemand läuft durchs Bild...', modifier: -10 },
  { text: 'Die Spiegelung im Wasser ist atemberaubend!', modifier: 22 },
  { text: 'Deine Hand zittert leicht — unscharfes Bild.', modifier: -12 },
  { text: 'Magisches Gegenlicht zaubert einen Halo-Effekt!', modifier: 28 }
];

const AUFTRAEGE = [
  { name: 'Passfoto', emoji: '🪪', belohnung: [40, 80], minLevel: 1 },
  { name: 'Familienporträt', emoji: '👨‍👩‍👧‍👦', belohnung: [80, 160], minLevel: 2 },
  { name: 'Hochzeitsfotografie', emoji: '💒', belohnung: [200, 400], minLevel: 5 },
  { name: 'Immobilien-Fotos', emoji: '🏠', belohnung: [120, 250], minLevel: 4 },
  { name: 'Food-Fotografie', emoji: '🍽️', belohnung: [100, 200], minLevel: 3 },
  { name: 'Mode-Shooting', emoji: '👗', belohnung: [250, 500], minLevel: 8 },
  { name: 'Werbekampagne', emoji: '📺', belohnung: [400, 800], minLevel: 12 },
  { name: 'Naturdoku', emoji: '🎬', belohnung: [500, 1000], minLevel: 15 },
  { name: 'Galerie-Ausstellung', emoji: '🖼️', belohnung: [700, 1400], minLevel: 18 },
  { name: 'Weltreise-Reportage', emoji: '🌍', belohnung: [1000, 2000], minLevel: 22 }
];

const RANKS = [
  { name: 'Knipser', minLevel: 1 },
  { name: 'Hobby-Fotograf', minLevel: 3 },
  { name: 'Fotograf', minLevel: 5 },
  { name: 'Studio-Fotograf', minLevel: 8 },
  { name: 'Profi-Fotograf', minLevel: 12 },
  { name: 'Meisterfotograf', minLevel: 16 },
  { name: 'Kunstfotograf', minLevel: 20 },
  { name: 'Legendärer Fotograf', minLevel: 25 }
];

const UPGRADES = {
  objektiv: { name: 'Profi-Objektiv', field: 'upgrade_objektiv', costs: [400, 1000, 2200, 5000, 10000], desc: '+Schärfe & Qualität' },
  studio: { name: 'Fotostudio', field: 'upgrade_studio', costs: [600, 1500, 3200, 7000, 14000], desc: '+Auftrags-Belohnungen' },
  beleuchtung: { name: 'Studio-Beleuchtung', field: 'upgrade_beleuchtung', costs: [350, 900, 2000, 4500, 9000], desc: '+Lichtqualität bei Aufnahmen' },
  software: { name: 'Bearbeitungssoftware', field: 'upgrade_software', costs: [500, 1200, 2600, 5500, 11000], desc: '+Nachbearbeitung & Wert' }
};

function getRank(level) {
  let rank = RANKS[0];
  for (const r of RANKS) { if (level >= r.minLevel) rank = r; }
  return rank;
}

function xpForLevel(level) { return Math.floor(75 * Math.pow(level, 1.45)); }
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function getSeltenheit(q) {
  if (q >= 95) return 'Meisterwerk';
  if (q >= 85) return 'Hervorragend';
  if (q >= 70) return 'Professionell';
  if (q >= 50) return 'Gut';
  return 'Schnappschuss';
}

const QUAL_COLORS = {
  'Schnappschuss': '#9e9e9e', 'Gut': '#4caf50', 'Professionell': '#2196f3',
  'Hervorragend': '#9c27b0', 'Meisterwerk': '#ff9800'
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fotograf')
    .setDescription('📸 Werde Fotograf und schieße atemberaubende Fotos!')
    .addSubcommand(s => s.setName('profil').setDescription('Zeige dein Fotografen-Profil'))
    .addSubcommand(s => s.setName('name').setDescription('Ändere deinen Künstlernamen')
      .addStringOption(o => o.setName('name').setDescription('Neuer Name').setRequired(true)))
    .addSubcommand(s => s.setName('fotografieren').setDescription('Gehe an einen Ort und fotografiere')
      .addIntegerOption(o => o.setName('ort').setDescription('Ortsnummer (1-9)').setRequired(true)))
    .addSubcommand(s => s.setName('galerie').setDescription('Zeige deine Fotogalerie'))
    .addSubcommand(s => s.setName('verkaufen').setDescription('Verkaufe dein bestes Foto'))
    .addSubcommand(s => s.setName('auftrag').setDescription('Nimm einen Fotoauftrag an')
      .addIntegerOption(o => o.setName('nr').setDescription('Auftragsnummer (1-10)').setRequired(true)))
    .addSubcommand(s => s.setName('kamera').setDescription('Kaufe eine neue Kamera')
      .addIntegerOption(o => o.setName('nr').setDescription('Kameranummer (1-8)').setRequired(true)))
    .addSubcommand(s => s.setName('orte').setDescription('Zeige alle Fotoorte'))
    .addSubcommand(s => s.setName('trainieren').setDescription('Trainiere eine Fähigkeit')
      .addStringOption(o => o.setName('skill').setDescription('kreativitaet/technik/auge/bearbeitung').setRequired(true)))
    .addSubcommand(s => s.setName('upgrade').setDescription('Verbessere deine Ausrüstung')
      .addStringOption(o => o.setName('item').setDescription('objektiv/studio/beleuchtung/software').setRequired(true)))
    .addSubcommand(s => s.setName('wettbewerb').setDescription('Fotowettbewerb gegen einen anderen Spieler')
      .addUserOption(o => o.setName('gegner').setDescription('Dein Gegner').setRequired(true))),

  async execute(interaction) {
    ensureFotoTables();
    const config = require('../config.json');
    const userId = interaction.user.id;
    const sub = interaction.options.getSubcommand();

    const now = Date.now();
    const cdKey = `${userId}-${sub}`;
    const cdTime = sub === 'fotografieren' ? 20000 : sub === 'auftrag' ? 30000 : sub === 'wettbewerb' ? 60000 : 5000;
    if (cooldowns.has(cdKey) && now - cooldowns.get(cdKey) < cdTime) {
      const left = Math.ceil((cdTime - (now - cooldowns.get(cdKey))) / 1000);
      return interaction.reply({ content: `⏳ Cooldown: **${left}s**`, ephemeral: true });
    }
    cooldowns.set(cdKey, now);

    let fotograf = db.db.prepare('SELECT * FROM fotografen WHERE user_id = ?').get(userId);
    if (!fotograf && sub !== 'profil' && sub !== 'orte') {
      db.db.prepare('INSERT INTO fotografen (user_id) VALUES (?)').run(userId);
      fotograf = db.db.prepare('SELECT * FROM fotografen WHERE user_id = ?').get(userId);
    }

    if (sub === 'profil') {
      if (!fotograf) {
        db.db.prepare('INSERT INTO fotografen (user_id) VALUES (?)').run(userId);
        fotograf = db.db.prepare('SELECT * FROM fotografen WHERE user_id = ?').get(userId);
      }
      const rank = getRank(fotograf.level);
      const xpNeeded = xpForLevel(fotograf.level);
      const bal = (db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId))?.balance || 0;
      const fotoCount = db.db.prepare('SELECT COUNT(*) as c FROM foto_galerie WHERE user_id = ?').get(userId).c;
      const cam = KAMERAS.find(k => k.name === fotograf.kamera) || KAMERAS[0];

      const embed = new EmbedBuilder()
        .setTitle(`📸 ${fotograf.name}`)
        .setColor('#03a9f4')
        .addFields(
          { name: '📊 Rang', value: `${rank.name} (Lv. ${fotograf.level})`, inline: true },
          { name: '⭐ XP', value: `${fotograf.xp}/${xpNeeded}`, inline: true },
          { name: '💰 Coins', value: bal.toLocaleString(), inline: true },
          { name: '📷 Kamera', value: `${cam.emoji} ${fotograf.kamera}`, inline: true },
          { name: '🖼️ Fotos', value: `${fotograf.fotos_total} geschossen`, inline: true },
          { name: '📋 Aufträge', value: `${fotograf.auftraege_done} erledigt`, inline: true },
          { name: '⭐ Ruf', value: `${fotograf.ruf}`, inline: true },
          { name: '🖼️ Galerie', value: `${fotoCount} Fotos`, inline: true },
          { name: '💪 Skills', value: `Kreativität: ${fotograf.kreativitaet} | Technik: ${fotograf.technik}\nAuge: ${fotograf.auge} | Bearbeitung: ${fotograf.bearbeitung}`, inline: false },
          { name: '🔧 Equipment', value: `Objektiv: Lv.${fotograf.upgrade_objektiv} | Studio: Lv.${fotograf.upgrade_studio}\nLicht: Lv.${fotograf.upgrade_beleuchtung} | Software: Lv.${fotograf.upgrade_software}`, inline: false }
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'name') {
      const name = interaction.options.getString('name').substring(0, 28);
      db.db.prepare('UPDATE fotografen SET name = ? WHERE user_id = ?').run(name, userId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor('#03a9f4').setDescription(`📸 Du heißt jetzt **${name}**!`)] });
    }

    if (sub === 'orte') {
      const lines = ORTE.map((o, i) => {
        const motivList = o.motive.join(', ');
        return `**${i + 1}.** ${o.emoji} ${o.name} — Ab Lv.${o.minLevel}\n   Motive: ${motivList}`;
      }).join('\n\n');
      const aufLines = AUFTRAEGE.map((a, i) => `**${i + 1}.** ${a.emoji} ${a.name} — ${a.belohnung[0]}-${a.belohnung[1]} Coins | Ab Lv.${a.minLevel}`).join('\n');
      return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🗺️ Fotoorte & Aufträge').setColor('#03a9f4').setDescription(`**Orte:**\n${lines}\n\n**Aufträge:**\n${aufLines}`)] });
    }

    if (sub === 'fotografieren') {
      const ortIdx = interaction.options.getInteger('ort') - 1;
      if (ortIdx < 0 || ortIdx >= ORTE.length) {
        return interaction.reply({ content: `❌ Ungültiger Ort! Wähle 1-${ORTE.length}.`, ephemeral: true });
      }
      const ort = ORTE[ortIdx];
      if (fotograf.level < ort.minLevel) {
        return interaction.reply({ content: `❌ Du brauchst Level ${ort.minLevel} für ${ort.name}!`, ephemeral: true });
      }

      const motiv = ort.motive[rand(0, ort.motive.length - 1)];
      const stil = STILE[rand(0, STILE.length - 1)];
      const event = FOTO_EVENTS[rand(0, FOTO_EVENTS.length - 1)];

      const cam = KAMERAS.find(k => k.name === fotograf.kamera) || KAMERAS[0];
      const objektivBonus = fotograf.upgrade_objektiv * 5;
      const lichtBonus = fotograf.upgrade_beleuchtung * 4;
      const augeBonus = fotograf.auge * 3;
      const technikBonus = fotograf.technik * 2;

      const qualitaet = Math.max(10, Math.min(100, 40 + rand(-10, 10) + event.modifier + cam.qualBonus / 3 + objektivBonus + lichtBonus + augeBonus + technikBonus));
      const seltenheit = getSeltenheit(qualitaet);

      const softwareBonus = 1 + fotograf.upgrade_software * 0.1;
      const kreativBonus = 1 + fotograf.kreativitaet * 0.06;
      const verkaufspreis = Math.floor(ort.baseWert * (qualitaet / 50) * softwareBonus * kreativBonus);

      db.db.prepare('INSERT INTO foto_galerie (user_id, motiv, ort, qualitaet, stil, seltenheit, verkaufspreis) VALUES (?, ?, ?, ?, ?, ?, ?)').run(userId, motiv, ort.name, qualitaet, stil, seltenheit, verkaufspreis);

      const xpGain = Math.floor(10 + qualitaet * 0.4 + (ortIdx + 1) * 3);
      let newXp = fotograf.xp + xpGain;
      let newLevel = fotograf.level;
      let leveledUp = false;
      while (newXp >= xpForLevel(newLevel)) { newXp -= xpForLevel(newLevel); newLevel++; leveledUp = true; }
      db.db.prepare('UPDATE fotografen SET xp = ?, level = ?, fotos_total = fotos_total + 1 WHERE user_id = ?').run(newXp, newLevel, userId);

      const embed = new EmbedBuilder()
        .setTitle(`${ort.emoji} Foto geschossen!`)
        .setColor(QUAL_COLORS[seltenheit] || '#03a9f4')
        .setDescription(event.text)
        .addFields(
          { name: '📷 Motiv', value: `**${motiv}**`, inline: true },
          { name: '🎨 Stil', value: stil, inline: true },
          { name: '📍 Ort', value: ort.name, inline: true },
          { name: '📊 Qualität', value: `${qualitaet}% — ${seltenheit}`, inline: true },
          { name: '💰 Wert', value: `${verkaufspreis} Coins`, inline: true },
          { name: '⭐ XP', value: `+${xpGain}`, inline: true }
        );
      if (leveledUp) embed.addFields({ name: '🎉 Level Up!', value: `Level ${newLevel}! Rang: ${getRank(newLevel).name}` });
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'galerie') {
      const fotos = db.db.prepare('SELECT * FROM foto_galerie WHERE user_id = ? ORDER BY qualitaet DESC LIMIT 12').all(userId);
      if (fotos.length === 0) {
        return interaction.reply({ content: '🖼️ Galerie leer. Geh fotografieren!', ephemeral: true });
      }
      const total = db.db.prepare('SELECT COUNT(*) as c FROM foto_galerie WHERE user_id = ?').get(userId).c;
      const lines = fotos.map(f => `**#${f.id}** 📷 ${f.motiv} (${f.stil}) — ${f.ort} | Q: ${f.qualitaet}% | ${f.verkaufspreis} Coins`).join('\n');
      return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🖼️ Fotogalerie').setColor('#03a9f4').setDescription(lines).setFooter({ text: `${total} Fotos insgesamt` })] });
    }

    if (sub === 'verkaufen') {
      const foto = db.db.prepare('SELECT * FROM foto_galerie WHERE user_id = ? ORDER BY verkaufspreis DESC LIMIT 1').get(userId);
      if (!foto) {
        return interaction.reply({ content: '🖼️ Keine Fotos zum Verkaufen!', ephemeral: true });
      }

      const bearbeitungsBonus = 1 + fotograf.bearbeitung * 0.08;
      const preis = Math.floor(foto.verkaufspreis * bearbeitungsBonus);
      const rufGain = foto.qualitaet >= 80 ? 2 : 1;

      db.db.prepare('DELETE FROM foto_galerie WHERE id = ?').run(foto.id);
      db.db.prepare('UPDATE fotografen SET ruf = ruf + ? WHERE user_id = ?').run(rufGain, userId);
      db.db.prepare('UPDATE economy SET balance = balance + ? WHERE user_id = ?').run(preis, userId);

      const embed = new EmbedBuilder()
        .setTitle('🛒 Foto verkauft!')
        .setColor('#4caf50')
        .setDescription(`📷 **${foto.motiv}** (${foto.stil}) — ${foto.seltenheit}`)
        .addFields(
          { name: '📍 Ort', value: foto.ort, inline: true },
          { name: '📊 Qualität', value: `${foto.qualitaet}%`, inline: true },
          { name: '💰 Erlös', value: `**${preis}** Coins`, inline: true },
          { name: '⭐ Ruf', value: `+${rufGain}`, inline: true }
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'auftrag') {
      const aufIdx = interaction.options.getInteger('nr') - 1;
      if (aufIdx < 0 || aufIdx >= AUFTRAEGE.length) {
        return interaction.reply({ content: `❌ Ungültiger Auftrag! Wähle 1-${AUFTRAEGE.length}.`, ephemeral: true });
      }
      const auftrag = AUFTRAEGE[aufIdx];
      if (fotograf.level < auftrag.minLevel) {
        return interaction.reply({ content: `❌ Du brauchst Level ${auftrag.minLevel} für ${auftrag.name}!`, ephemeral: true });
      }

      const studioBonus = 1 + fotograf.upgrade_studio * 0.12;
      const technikBonus = 1 + fotograf.technik * 0.06;
      const rollScore = rand(1, 20) + fotograf.kreativitaet + fotograf.auge;
      const qualMod = rollScore >= 15 ? 1.3 : rollScore >= 10 ? 1.0 : 0.7;

      const belohnung = Math.floor(rand(auftrag.belohnung[0], auftrag.belohnung[1]) * studioBonus * technikBonus * qualMod);
      const rufGain = Math.floor(1 + aufIdx * 0.5);
      const xpGain = Math.floor(15 + aufIdx * 8);

      db.db.prepare('UPDATE economy SET balance = balance + ? WHERE user_id = ?').run(belohnung, userId);
      db.db.prepare('UPDATE fotografen SET auftraege_done = auftraege_done + 1, ruf = ruf + ? WHERE user_id = ?').run(rufGain, userId);

      let newXp = fotograf.xp + xpGain;
      let newLevel = fotograf.level;
      let leveledUp = false;
      while (newXp >= xpForLevel(newLevel)) { newXp -= xpForLevel(newLevel); newLevel++; leveledUp = true; }
      db.db.prepare('UPDATE fotografen SET xp = ?, level = ? WHERE user_id = ?').run(newXp, newLevel, userId);

      const qualText = qualMod >= 1.3 ? '⭐ Meisterhafte Arbeit!' : qualMod >= 1.0 ? '👍 Gute Arbeit!' : '😐 Könnte besser sein...';

      const embed = new EmbedBuilder()
        .setTitle(`${auftrag.emoji} Auftrag: ${auftrag.name}`)
        .setColor(qualMod >= 1.3 ? '#4caf50' : qualMod >= 1.0 ? '#ff9800' : '#f44336')
        .setDescription(qualText)
        .addFields(
          { name: '💰 Belohnung', value: `**${belohnung}** Coins`, inline: true },
          { name: '⭐ Ruf', value: `+${rufGain}`, inline: true },
          { name: '⭐ XP', value: `+${xpGain}`, inline: true }
        );
      if (leveledUp) embed.addFields({ name: '🎉 Level Up!', value: `Level ${newLevel}! Rang: ${getRank(newLevel).name}` });
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'kamera') {
      const camIdx = interaction.options.getInteger('nr') - 1;
      if (camIdx < 0 || camIdx >= KAMERAS.length) {
        return interaction.reply({ content: `❌ Wähle eine Kamera 1-${KAMERAS.length}!`, ephemeral: true });
      }
      const cam = KAMERAS[camIdx];
      if (fotograf.level < cam.minLevel) {
        return interaction.reply({ content: `❌ Du brauchst Level ${cam.minLevel} für ${cam.name}!`, ephemeral: true });
      }
      if (fotograf.kamera === cam.name) {
        return interaction.reply({ content: `❌ Du hast bereits die ${cam.name}!`, ephemeral: true });
      }
      if (cam.cost > 0) {
        const bal = (db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId))?.balance || 0;
        if (bal < cam.cost) {
          return interaction.reply({ content: `❌ ${cam.name} kostet **${cam.cost.toLocaleString()}** Coins!`, ephemeral: true });
        }
        db.db.prepare('UPDATE economy SET balance = balance - ? WHERE user_id = ?').run(cam.cost, userId);
      }
      db.db.prepare('UPDATE fotografen SET kamera = ? WHERE user_id = ?').run(cam.name, userId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor('#03a9f4').setDescription(`${cam.emoji} Neue Kamera: **${cam.name}**!\nQualitäts-Bonus: +${cam.qualBonus}${cam.cost > 0 ? `\n💰 -${cam.cost.toLocaleString()} Coins` : ''}`)] });
    }

    if (sub === 'trainieren') {
      const skill = interaction.options.getString('skill').toLowerCase();
      const validSkills = { kreativitaet: 'kreativitaet', technik: 'technik', auge: 'auge', bearbeitung: 'bearbeitung' };
      if (!validSkills[skill]) {
        return interaction.reply({ content: '❌ Wähle: `kreativitaet`, `technik`, `auge` oder `bearbeitung`', ephemeral: true });
      }
      const field = validSkills[skill];
      const currentVal = fotograf[field];
      const cost = currentVal * 75 + 100;
      const bal = (db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId))?.balance || 0;
      if (bal < cost) {
        return interaction.reply({ content: `❌ Training kostet **${cost}** Coins!`, ephemeral: true });
      }
      const gain = rand(1, 2);
      db.db.prepare(`UPDATE fotografen SET ${field} = ${field} + ? WHERE user_id = ?`).run(gain, userId);
      db.db.prepare('UPDATE economy SET balance = balance - ? WHERE user_id = ?').run(cost, userId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor('#03a9f4').setDescription(`🏋️ **${skill.charAt(0).toUpperCase() + skill.slice(1)}** trainiert! +${gain} (jetzt ${currentVal + gain})\n💰 -${cost} Coins`)] });
    }

    if (sub === 'upgrade') {
      const item = interaction.options.getString('item').toLowerCase();
      const upg = UPGRADES[item];
      if (!upg) {
        return interaction.reply({ content: '❌ Wähle: `objektiv`, `studio`, `beleuchtung` oder `software`', ephemeral: true });
      }
      const currentLv = fotograf[upg.field];
      if (currentLv >= upg.costs.length) {
        return interaction.reply({ content: `❌ ${upg.name} ist bereits auf Max-Level!`, ephemeral: true });
      }
      const cost = upg.costs[currentLv];
      const bal = (db.db.prepare('SELECT balance FROM economy WHERE user_id = ?').get(userId))?.balance || 0;
      if (bal < cost) {
        return interaction.reply({ content: `❌ Upgrade kostet **${cost.toLocaleString()}** Coins!`, ephemeral: true });
      }
      db.db.prepare(`UPDATE fotografen SET ${upg.field} = ${upg.field} + 1 WHERE user_id = ?`).run(userId);
      db.db.prepare('UPDATE economy SET balance = balance - ? WHERE user_id = ?').run(cost, userId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor('#03a9f4').setDescription(`🔧 **${upg.name}** auf Level ${currentLv + 1} verbessert!\n${upg.desc}\n💰 -${cost.toLocaleString()} Coins`)] });
    }

    if (sub === 'wettbewerb') {
      const opponent = interaction.options.getUser('gegner');
      if (opponent.id === userId) return interaction.reply({ content: '❌ Du kannst nicht gegen dich selbst antreten!', ephemeral: true });
      if (opponent.bot) return interaction.reply({ content: '❌ Bots fotografieren nicht!', ephemeral: true });

      const oppFoto = db.db.prepare('SELECT * FROM fotografen WHERE user_id = ?').get(opponent.id);
      if (!oppFoto) return interaction.reply({ content: '❌ Dein Gegner ist kein Fotograf!', ephemeral: true });

      const myScore = fotograf.level * 5 + fotograf.kreativitaet * 3 + fotograf.auge * 3 + fotograf.ruf * 2 + rand(1, 25);
      const oppScore = oppFoto.level * 5 + oppFoto.kreativitaet * 3 + oppFoto.auge * 3 + oppFoto.ruf * 2 + rand(1, 25);

      const won = myScore > oppScore;
      const coinPrize = Math.floor((fotograf.level + oppFoto.level) * 22 + rand(50, 180));
      const rufPrize = rand(2, 4);

      if (won) {
        db.db.prepare('UPDATE economy SET balance = balance + ? WHERE user_id = ?').run(coinPrize, userId);
        db.db.prepare('UPDATE fotografen SET ruf = ruf + ? WHERE user_id = ?').run(rufPrize, userId);
      }

      const embed = new EmbedBuilder()
        .setTitle('📸 Fotowettbewerb!')
        .setColor(won ? '#4caf50' : '#f44336')
        .setDescription(`**${fotograf.name}** vs **${oppFoto.name}**`)
        .addFields(
          { name: fotograf.name, value: `🎯 Punkte: ${myScore}`, inline: true },
          { name: oppFoto.name, value: `🎯 Punkte: ${oppScore}`, inline: true },
          { name: '🏆 Ergebnis', value: won ? `**${fotograf.name}** gewinnt!\n💰 +${coinPrize} Coins | ⭐ +${rufPrize} Ruf` : `**${oppFoto.name}** gewinnt!\nÜbe weiter!` }
        );
      return interaction.reply({ embeds: [embed] });
    }
  }
};
