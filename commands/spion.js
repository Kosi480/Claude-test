const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const COOLDOWN = 3 * 60 * 1000;
const cooldowns = new Map();

function ensureSpyTables() {
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS spies (
      user_id TEXT PRIMARY KEY,
      codename TEXT DEFAULT '',
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      stealth INTEGER DEFAULT 10,
      hacking INTEGER DEFAULT 5,
      combat INTEGER DEFAULT 5,
      charm INTEGER DEFAULT 5,
      missions_success INTEGER DEFAULT 0,
      missions_failed INTEGER DEFAULT 0,
      gadget_slots INTEGER DEFAULT 2,
      agency_rank INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS spy_gadgets (
      user_id TEXT,
      gadget TEXT,
      amount INTEGER DEFAULT 1,
      PRIMARY KEY (user_id, gadget)
    );
  `);
}

const agencyRanks = [
  { name: 'Rekrut', emoji: '🟢', minLevel: 1 },
  { name: 'Feldagent', emoji: '🔵', minLevel: 3 },
  { name: 'Spezialagent', emoji: '🟣', minLevel: 6 },
  { name: 'Elite-Operative', emoji: '🟠', minLevel: 10 },
  { name: 'Doppel-Null', emoji: '🔴', minLevel: 15 },
  { name: 'Geheimdienstchef', emoji: '⚫', minLevel: 20 },
];

const gadgets = [
  { name: 'Rauchbombe', emoji: '💨', cost: 500, stat: 'stealth', bonus: 15, desc: 'Flucht bei Entdeckung' },
  { name: 'Hacking-Gerät', emoji: '💻', cost: 800, stat: 'hacking', bonus: 20, desc: 'Sicherheitssysteme knacken' },
  { name: 'Tarnanzug', emoji: '🥷', cost: 1200, stat: 'stealth', bonus: 25, desc: 'Fast unsichtbar' },
  { name: 'EMP-Granate', emoji: '⚡', cost: 1500, stat: 'hacking', bonus: 30, desc: 'Elektronik lahmlegen' },
  { name: 'Betäubungspistole', emoji: '🔫', cost: 1000, stat: 'combat', bonus: 20, desc: 'Lautlose Ausschaltung' },
  { name: 'Verkleidungs-Kit', emoji: '🎭', cost: 900, stat: 'charm', bonus: 25, desc: 'Identität wechseln' },
  { name: 'Greifseil', emoji: '🪝', cost: 700, stat: 'stealth', bonus: 15, desc: 'Wände erklimmen' },
  { name: 'Nano-Drohne', emoji: '🤖', cost: 2000, stat: 'hacking', bonus: 35, desc: 'Aufklärung aus der Ferne' },
  { name: 'Giftring', emoji: '💍', cost: 2500, stat: 'combat', bonus: 35, desc: 'Letzte Verteidigung' },
  { name: 'Hologramm-Projektor', emoji: '🌀', cost: 3000, stat: 'charm', bonus: 40, desc: 'Täuschende Ablenkung' },
];

const missions = [
  {
    name: 'Dokumentendiebstahl',
    emoji: '📄',
    minLevel: 1,
    primaryStat: 'stealth',
    difficulty: 30,
    reward: { min: 300, max: 800 },
    xp: 25,
    phases: [
      { desc: 'Du schleichst dich ins Gebäude...', stat: 'stealth', threshold: 20 },
      { desc: 'Sicherheitskameras überall!', stat: 'hacking', threshold: 15 },
      { desc: 'Der Safe mit den Dokumenten!', stat: 'stealth', threshold: 25 },
    ],
  },
  {
    name: 'Hackerangriff',
    emoji: '💻',
    minLevel: 2,
    primaryStat: 'hacking',
    difficulty: 40,
    reward: { min: 500, max: 1200 },
    xp: 35,
    phases: [
      { desc: 'Firewall entdeckt...', stat: 'hacking', threshold: 25 },
      { desc: 'Verschlüsselung knacken!', stat: 'hacking', threshold: 30 },
      { desc: 'Daten herunterladen, bevor Alarm ausgelöst wird!', stat: 'stealth', threshold: 20 },
    ],
  },
  {
    name: 'Undercover-Infiltration',
    emoji: '🎭',
    minLevel: 3,
    primaryStat: 'charm',
    difficulty: 50,
    reward: { min: 800, max: 2000 },
    xp: 45,
    phases: [
      { desc: 'Die Wache am Eingang überzeugen...', stat: 'charm', threshold: 30 },
      { desc: 'Auf der Gala unauffällig bleiben...', stat: 'charm', threshold: 25 },
      { desc: 'Geheimes Treffen belauschen!', stat: 'stealth', threshold: 30 },
    ],
  },
  {
    name: 'Sabotage-Mission',
    emoji: '💣',
    minLevel: 5,
    primaryStat: 'combat',
    difficulty: 60,
    reward: { min: 1200, max: 3000 },
    xp: 55,
    phases: [
      { desc: 'Wachposten neutralisieren...', stat: 'combat', threshold: 35 },
      { desc: 'Sprengstoff platzieren...', stat: 'stealth', threshold: 35 },
      { desc: 'Flucht unter Beschuss!', stat: 'combat', threshold: 40 },
    ],
  },
  {
    name: 'Geheimlabor-Einbruch',
    emoji: '🧪',
    minLevel: 7,
    primaryStat: 'hacking',
    difficulty: 70,
    reward: { min: 2000, max: 5000 },
    xp: 70,
    phases: [
      { desc: 'Biometrische Sicherung umgehen...', stat: 'hacking', threshold: 45 },
      { desc: 'Lasergitter im Korridor!', stat: 'stealth', threshold: 40 },
      { desc: 'Die geheime Formel sichern!', stat: 'hacking', threshold: 50 },
      { desc: 'Selbstzerstörung aktiviert — FLUCHT!', stat: 'combat', threshold: 35 },
    ],
  },
  {
    name: 'Doppelspion-Enttarnung',
    emoji: '🕵️',
    minLevel: 10,
    primaryStat: 'charm',
    difficulty: 85,
    reward: { min: 4000, max: 10000 },
    xp: 100,
    phases: [
      { desc: 'Den Verdächtigen beschatten...', stat: 'stealth', threshold: 50 },
      { desc: 'Kommunikation abfangen!', stat: 'hacking', threshold: 45 },
      { desc: 'Konfrontation mit dem Verräter!', stat: 'charm', threshold: 55 },
      { desc: 'Verfolgungsjagd!', stat: 'combat', threshold: 50 },
    ],
  },
  {
    name: 'Weltrettung',
    emoji: '🌍',
    minLevel: 15,
    primaryStat: 'combat',
    difficulty: 100,
    reward: { min: 8000, max: 25000 },
    xp: 150,
    phases: [
      { desc: 'Ins Hauptquartier des Bösewichts eindringen...', stat: 'stealth', threshold: 60 },
      { desc: 'Das Sicherheitssystem deaktivieren!', stat: 'hacking', threshold: 55 },
      { desc: 'Die Superwaffe entschärfen!', stat: 'hacking', threshold: 65 },
      { desc: 'Endkampf mit dem Oberbösewicht!', stat: 'combat', threshold: 60 },
      { desc: 'Flucht bevor alles explodiert!', stat: 'stealth', threshold: 50 },
    ],
  },
];

const trainingCosts = { stealth: 400, hacking: 500, combat: 450, charm: 400 };
const statEmojis = { stealth: '🥷', hacking: '💻', combat: '⚔️', charm: '🎭' };

function getSpy(userId) {
  ensureSpyTables();
  let spy = db.db.prepare('SELECT * FROM spies WHERE user_id = ?').get(userId);
  if (!spy) {
    db.db.prepare('INSERT INTO spies (user_id) VALUES (?)').run(userId);
    spy = db.db.prepare('SELECT * FROM spies WHERE user_id = ?').get(userId);
  }
  return spy;
}

function getSpyGadgets(userId) {
  return db.db.prepare('SELECT * FROM spy_gadgets WHERE user_id = ? AND amount > 0').all(userId);
}

function addGadget(userId, gadgetName) {
  db.db.prepare(`INSERT INTO spy_gadgets (user_id, gadget, amount) VALUES (?, ?, 1)
    ON CONFLICT(user_id, gadget) DO UPDATE SET amount = amount + 1`).run(userId, gadgetName);
}

function useGadget(userId, gadgetName) {
  db.db.prepare('UPDATE spy_gadgets SET amount = MAX(0, amount - 1) WHERE user_id = ? AND gadget = ?').run(userId, gadgetName);
}

function getRank(level) {
  let rank = agencyRanks[0];
  for (const r of agencyRanks) {
    if (level >= r.minLevel) rank = r;
  }
  return rank;
}

function addSpyXP(userId, xp) {
  const spy = getSpy(userId);
  const newXP = spy.xp + xp;
  const needed = spy.level * 120;
  if (newXP >= needed) {
    db.db.prepare('UPDATE spies SET xp = ?, level = level + 1 WHERE user_id = ?').run(newXP - needed, userId);
    return true;
  }
  db.db.prepare('UPDATE spies SET xp = ? WHERE user_id = ?').run(newXP, userId);
  return false;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('spion')
    .setDescription('Werde ein Geheimagent — Missionen, Gadgets und Spionage!')
    .addSubcommand(sub => sub.setName('mission').setDescription('Starte eine Spionage-Mission')
      .addIntegerOption(opt => opt.setName('nummer').setDescription('Mission 1-7').setRequired(true).setMinValue(1).setMaxValue(7)))
    .addSubcommand(sub => sub.setName('profil').setDescription('Zeige dein Agenten-Profil'))
    .addSubcommand(sub => sub.setName('trainieren').setDescription('Trainiere eine Fähigkeit')
      .addStringOption(opt => opt.setName('skill').setDescription('stealth, hacking, combat oder charm').setRequired(true)
        .addChoices(
          { name: '🥷 Stealth', value: 'stealth' },
          { name: '💻 Hacking', value: 'hacking' },
          { name: '⚔️ Combat', value: 'combat' },
          { name: '🎭 Charm', value: 'charm' }
        )))
    .addSubcommand(sub => sub.setName('gadgets').setDescription('Zeige verfügbare Gadgets'))
    .addSubcommand(sub => sub.setName('kaufen').setDescription('Kaufe ein Gadget')
      .addIntegerOption(opt => opt.setName('nummer').setDescription('Gadget-Nummer').setRequired(true).setMinValue(1).setMaxValue(10)))
    .addSubcommand(sub => sub.setName('codename').setDescription('Setze deinen Codenamen')
      .addStringOption(opt => opt.setName('name').setDescription('Dein Codename').setRequired(true))),

  async execute(interaction) {
    const userId = interaction.user.id;
    const config = require('../config.json');
    const sub = interaction.options.getSubcommand();
    ensureSpyTables();

    if (sub === 'codename') {
      const name = interaction.options.getString('name').slice(0, 20);
      db.db.prepare('UPDATE spies SET codename = ? WHERE user_id = ?').run(name, userId);
      getSpy(userId);
      return interaction.reply(`🕵️ Codename gesetzt: **"${name}"**`);
    }

    if (sub === 'profil') {
      const spy = getSpy(userId);
      const rank = getRank(spy.level);
      const xpNeeded = spy.level * 120;
      const ownedGadgets = getSpyGadgets(userId);
      const successRate = spy.missions_success + spy.missions_failed > 0
        ? Math.round(spy.missions_success / (spy.missions_success + spy.missions_failed) * 100) : 0;

      const embed = new EmbedBuilder()
        .setColor('#2c3e50')
        .setTitle(`🕵️ Agent ${spy.codename || interaction.user.username}`)
        .setDescription(
          `**Rang:** ${rank.emoji} ${rank.name}\n` +
          `**Level:** ${spy.level} (${spy.xp}/${xpNeeded} XP)\n\n` +
          `**Fähigkeiten:**\n` +
          `🥷 Stealth: **${spy.stealth}**\n` +
          `💻 Hacking: **${spy.hacking}**\n` +
          `⚔️ Combat: **${spy.combat}**\n` +
          `🎭 Charm: **${spy.charm}**\n\n` +
          `**Statistiken:**\n` +
          `✅ Erfolge: **${spy.missions_success}**\n` +
          `❌ Fehlschläge: **${spy.missions_failed}**\n` +
          `📊 Erfolgsrate: **${successRate}%**\n\n` +
          `**Gadgets:** ${ownedGadgets.length > 0 ? ownedGadgets.map(g => {
            const gd = gadgets.find(x => x.name === g.gadget);
            return `${gd ? gd.emoji : '📦'} ${g.gadget} x${g.amount}`;
          }).join(', ') : '_Keine_'}`
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'trainieren') {
      const skill = interaction.options.getString('skill');
      const spy = getSpy(userId);
      const cost = trainingCosts[skill] + spy[skill] * 50;

      if (db.getBalance(userId) < cost) {
        return interaction.reply(`❌ Training kostet **${config.currencySymbol}${cost.toLocaleString()}**!`);
      }

      db.updateBalance(userId, -cost);
      db.db.prepare(`UPDATE spies SET ${skill} = ${skill} + 1 WHERE user_id = ?`).run(userId);
      const newVal = spy[skill] + 1;

      return interaction.reply(`${statEmojis[skill]} **${skill.charAt(0).toUpperCase() + skill.slice(1)}** trainiert! ${spy[skill]} → **${newVal}** (${config.currencySymbol}${cost.toLocaleString()})`);
    }

    if (sub === 'gadgets') {
      const spy = getSpy(userId);
      const owned = getSpyGadgets(userId);

      const lines = gadgets.map((g, i) => {
        const own = owned.find(o => o.gadget === g.name);
        return `**${i + 1}.** ${g.emoji} **${g.name}** — ${config.currencySymbol}${g.cost.toLocaleString()}\n` +
          `   ${g.desc} | ${statEmojis[g.stat]} +${g.bonus} ${g.stat}${own ? ` | 📦 x${own.amount}` : ''}`;
      });

      const embed = new EmbedBuilder()
        .setColor('#7f8c8d')
        .setTitle('🔧 Gadget-Shop')
        .setDescription(lines.join('\n\n') + `\n\n*Kaufe mit \`/spion kaufen nummer:<Nr>\`*`)
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'kaufen') {
      const num = interaction.options.getInteger('nummer') - 1;
      const gadget = gadgets[num];
      if (!gadget) return interaction.reply('❌ Ungültige Gadget-Nummer!');

      if (db.getBalance(userId) < gadget.cost) {
        return interaction.reply(`❌ Du brauchst **${config.currencySymbol}${gadget.cost.toLocaleString()}**!`);
      }

      db.updateBalance(userId, -gadget.cost);
      addGadget(userId, gadget.name);
      return interaction.reply(`${gadget.emoji} **${gadget.name}** gekauft! ${gadget.desc}`);
    }

    if (sub === 'mission') {
      const lastPlay = cooldowns.get(userId);
      if (lastPlay && Date.now() - lastPlay < COOLDOWN) {
        const remaining = Math.ceil((COOLDOWN - (Date.now() - lastPlay)) / 1000);
        return interaction.reply(`⏳ Nächste Mission in **${remaining}s**!`);
      }

      const missionIdx = interaction.options.getInteger('nummer') - 1;
      const mission = missions[missionIdx];
      const spy = getSpy(userId);

      if (spy.level < mission.minLevel) {
        return interaction.reply(`❌ Du brauchst **Level ${mission.minLevel}** für diese Mission! (Aktuell: Level ${spy.level})`);
      }

      cooldowns.set(userId, Date.now());

      const ownedGadgets = getSpyGadgets(userId);
      let currentPhase = 0;
      let phasesCompleted = 0;
      let usedGadgets = [];
      let missionLog = [];
      let failed = false;

      const buildMissionEmbed = (phaseText = '') => {
        const phase = mission.phases[currentPhase];
        const progress = '█'.repeat(phasesCompleted) + '░'.repeat(mission.phases.length - phasesCompleted);

        return new EmbedBuilder()
          .setColor(failed ? '#e74c3c' : '#2c3e50')
          .setTitle(`${mission.emoji} ${mission.name}`)
          .setDescription(
            `**Fortschritt:** [${progress}] ${phasesCompleted}/${mission.phases.length}\n\n` +
            (phase ? `**Phase ${currentPhase + 1}:** ${phase.desc}\n` +
              `Benötigt: ${statEmojis[phase.stat]} **${phase.stat}** (Schwelle: ${phase.threshold})\n` +
              `Dein Wert: **${spy[phase.stat]}**\n\n` : '') +
            (missionLog.length > 0 ? missionLog.slice(-3).join('\n') + '\n\n' : '') +
            (phaseText ? phaseText + '\n\n' : '') +
            `*Würfle oder setze ein Gadget ein!*`
          )
          .setFooter({ text: `Schwierigkeit: ${mission.difficulty} | Belohnung: ${config.currencySymbol}${mission.reward.min}-${mission.reward.max}` })
          .setTimestamp();
      };

      const buildButtons = () => {
        const phase = mission.phases[currentPhase];
        if (!phase) return [];

        const rows = [new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`spy_roll_${userId}`).setLabel('🎲 Würfeln').setStyle(ButtonStyle.Primary)
        )];

        const applicableGadgets = ownedGadgets.filter(g => {
          const gd = gadgets.find(x => x.name === g.gadget);
          return gd && gd.stat === phase.stat && g.amount > 0 && !usedGadgets.includes(g.gadget);
        });

        if (applicableGadgets.length > 0) {
          const gadgetBtns = applicableGadgets.slice(0, 4).map(g => {
            const gd = gadgets.find(x => x.name === g.gadget);
            return new ButtonBuilder()
              .setCustomId(`spy_gadget_${g.gadget}_${userId}`)
              .setLabel(`${gd.emoji} ${g.gadget}`)
              .setStyle(ButtonStyle.Secondary);
          });
          rows.push(new ActionRowBuilder().addComponents(gadgetBtns));
        }

        return rows;
      };

      const msg = await interaction.reply({ embeds: [buildMissionEmbed()], components: buildButtons(), fetchReply: true });
      const coll = msg.createMessageComponentCollector({ time: 60000 });

      coll.on('collect', (btn) => {
        if (btn.user.id !== userId) return btn.reply({ content: '❌ Nicht deine Mission!', flags: 64 });
        if (failed || currentPhase >= mission.phases.length) return;

        const phase = mission.phases[currentPhase];
        let statValue = spy[phase.stat];
        let gadgetBonus = 0;

        if (btn.customId.startsWith('spy_gadget_')) {
          const gadgetName = btn.customId.split('_').slice(2, -1).join('_');
          const gd = gadgets.find(x => x.name === gadgetName);
          if (gd) {
            gadgetBonus = gd.bonus;
            useGadget(userId, gadgetName);
            usedGadgets.push(gadgetName);
            const idx = ownedGadgets.findIndex(g => g.gadget === gadgetName);
            if (idx >= 0) ownedGadgets[idx].amount--;
            missionLog.push(`${gd.emoji} **${gadgetName}** eingesetzt! +${gadgetBonus} ${phase.stat}`);
          }
        }

        const roll = Math.floor(Math.random() * 20) + 1;
        const totalScore = statValue + gadgetBonus + roll;
        const success = totalScore >= phase.threshold;

        if (success) {
          phasesCompleted++;
          missionLog.push(`✅ Phase ${currentPhase + 1}: 🎲 ${roll} + ${statEmojis[phase.stat]} ${statValue}${gadgetBonus ? ` + 🔧 ${gadgetBonus}` : ''} = **${totalScore}** ≥ ${phase.threshold}`);
          currentPhase++;

          if (currentPhase >= mission.phases.length) {
            coll.stop('success');

            const reward = mission.reward.min + Math.floor(Math.random() * (mission.reward.max - mission.reward.min));
            db.updateBalance(userId, reward);
            db.db.prepare('UPDATE spies SET missions_success = missions_success + 1 WHERE user_id = ?').run(userId);
            const leveled = addSpyXP(userId, mission.xp);
            const updatedSpy = getSpy(userId);
            const rank = getRank(updatedSpy.level);

            const embed = new EmbedBuilder()
              .setColor('#27ae60')
              .setTitle(`${mission.emoji} Mission Erfolgreich! 🎉`)
              .setDescription(
                `**${mission.name}** abgeschlossen!\n\n` +
                missionLog.join('\n') +
                `\n\n💰 **+${config.currencySymbol}${reward.toLocaleString()}**\n` +
                `⭐ **+${mission.xp} XP**` +
                (leveled ? ` 🎉 **LEVEL UP → ${updatedSpy.level}!**` : '') +
                `\n\n${rank.emoji} Rang: **${rank.name}** | Level ${updatedSpy.level}`
              )
              .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
              .setTimestamp();
            btn.update({ embeds: [embed], components: [] });
            return;
          }

          coll.resetTimer({ time: 60000 });
          btn.update({ embeds: [buildMissionEmbed()], components: buildButtons() });
        } else {
          failed = true;
          coll.stop('failed');

          missionLog.push(`❌ Phase ${currentPhase + 1}: 🎲 ${roll} + ${statEmojis[phase.stat]} ${statValue}${gadgetBonus ? ` + 🔧 ${gadgetBonus}` : ''} = **${totalScore}** < ${phase.threshold}`);

          db.db.prepare('UPDATE spies SET missions_failed = missions_failed + 1 WHERE user_id = ?').run(userId);
          const partialXP = Math.floor(mission.xp * 0.3);
          addSpyXP(userId, partialXP);

          const embed = new EmbedBuilder()
            .setColor('#e74c3c')
            .setTitle(`${mission.emoji} Mission Gescheitert! 💀`)
            .setDescription(
              `**${mission.name}** fehlgeschlagen in Phase ${currentPhase + 1}!\n\n` +
              missionLog.join('\n') +
              `\n\n⭐ +${partialXP} XP (Trost)\n` +
              `*Trainiere deine Fähigkeiten oder besorge Gadgets!*`
            )
            .setTimestamp();
          btn.update({ embeds: [embed], components: [] });
        }
      });

      coll.on('end', (_, reason) => {
        if (reason === 'time' && !failed && currentPhase < mission.phases.length) {
          db.db.prepare('UPDATE spies SET missions_failed = missions_failed + 1 WHERE user_id = ?').run(userId);
          const embed = new EmbedBuilder()
            .setColor('#f39c12')
            .setTitle('⏰ Mission — Zeit abgelaufen!')
            .setDescription('Du wurdest entdeckt und musstest fliehen!')
            .setTimestamp();
          msg.edit({ embeds: [embed], components: [] });
        }
      });
    }
  },
};
