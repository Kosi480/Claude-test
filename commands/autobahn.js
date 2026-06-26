const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const COOLDOWN = 2 * 60 * 1000;
const cooldowns = new Map();

function ensureRacingTables() {
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS racers (
      user_id TEXT PRIMARY KEY,
      car_type INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      engine INTEGER DEFAULT 1,
      turbo INTEGER DEFAULT 0,
      tires INTEGER DEFAULT 1,
      nitro INTEGER DEFAULT 0,
      handling INTEGER DEFAULT 1,
      races_won INTEGER DEFAULT 0,
      races_lost INTEGER DEFAULT 0,
      best_time REAL DEFAULT 0,
      total_prize INTEGER DEFAULT 0,
      license INTEGER DEFAULT 1
    );
  `);
}

const cars = [
  { name: 'Rostige Karre', emoji: '🚗', speed: 80, accel: 5, grip: 3, cost: 0 },
  { name: 'Stadtflitzer', emoji: '🚙', speed: 120, accel: 8, grip: 5, cost: 3000 },
  { name: 'Sportwagen', emoji: '🏎️', speed: 180, accel: 12, grip: 8, cost: 10000 },
  { name: 'Muscle Car', emoji: '🚘', speed: 200, accel: 15, grip: 7, cost: 25000 },
  { name: 'Supersportwagen', emoji: '⚡', speed: 260, accel: 20, grip: 12, cost: 60000 },
  { name: 'Hypercar', emoji: '🔥', speed: 320, accel: 25, grip: 15, cost: 150000 },
  { name: 'Formel-Bolide', emoji: '🏁', speed: 380, accel: 30, grip: 20, cost: 400000 },
];

const tracks = [
  { name: 'Parkplatz', emoji: '🅿️', minLicense: 1, length: 1, difficulty: 1, prize: { min: 200, max: 600 }, xp: 15 },
  { name: 'Stadtstraße', emoji: '🏙️', minLicense: 1, length: 2, difficulty: 2, prize: { min: 400, max: 1200 }, xp: 25 },
  { name: 'Landstraße', emoji: '🛤️', minLicense: 2, length: 3, difficulty: 3, prize: { min: 800, max: 2500 }, xp: 40 },
  { name: 'Bergpass', emoji: '⛰️', minLicense: 3, length: 4, difficulty: 4, prize: { min: 1500, max: 4000 }, xp: 55 },
  { name: 'Rennstrecke', emoji: '🏁', minLicense: 4, length: 5, difficulty: 5, prize: { min: 3000, max: 8000 }, xp: 75 },
  { name: 'Autobahn', emoji: '🛣️', minLicense: 5, length: 6, difficulty: 6, prize: { min: 5000, max: 15000 }, xp: 100 },
  { name: 'Nürburgring', emoji: '🏆', minLicense: 7, length: 8, difficulty: 8, prize: { min: 10000, max: 30000 }, xp: 150 },
];

const raceEvents = [
  { name: 'Perfekter Start', emoji: '🟢', effect: 'accel_boost', text: 'Perfekter Raketenstart!' },
  { name: 'Ölfleck', emoji: '🛢️', effect: 'grip_loss', text: 'Ölfleck auf der Strecke!' },
  { name: 'Rückenwind', emoji: '💨', effect: 'speed_boost', text: 'Starker Rückenwind!' },
  { name: 'Regeneinbruch', emoji: '🌧️', effect: 'grip_loss', text: 'Plötzlicher Regen!' },
  { name: 'Polizeikontrolle', emoji: '🚔', effect: 'slow_down', text: 'Polizei voraus! Bremsen!' },
  { name: 'Slipstream', emoji: '🌪️', effect: 'speed_boost', text: 'Im Windschatten des Gegners!' },
  { name: 'Reifenplatzer', emoji: '💥', effect: 'tire_blow', text: 'Ein Reifen platzt!' },
  { name: 'Nitro-Zündung', emoji: '🔥', effect: 'nitro_boost', text: 'Nitro perfekt eingesetzt!' },
];

const opponents = [
  { name: 'Anfänger-Andy', emoji: '😊', power: 30, level: 1 },
  { name: 'Drift-König', emoji: '😎', power: 60, level: 2 },
  { name: 'Turbo-Tina', emoji: '💨', power: 100, level: 3 },
  { name: 'Blitz-Boris', emoji: '⚡', power: 150, level: 4 },
  { name: 'Nitro-Nina', emoji: '🔥', power: 220, level: 5 },
  { name: 'Phantom-Fahrer', emoji: '👻', power: 300, level: 6 },
  { name: 'Legende Max', emoji: '🏆', power: 400, level: 7 },
];

function getRacer(userId) {
  ensureRacingTables();
  let r = db.db.prepare('SELECT * FROM racers WHERE user_id = ?').get(userId);
  if (!r) {
    db.db.prepare('INSERT INTO racers (user_id) VALUES (?)').run(userId);
    r = db.db.prepare('SELECT * FROM racers WHERE user_id = ?').get(userId);
  }
  return r;
}

function getCarPower(racer) {
  const car = cars[racer.car_type];
  return Math.floor(
    (car.speed + racer.engine * 15) * 0.4 +
    (car.accel + racer.turbo * 8) * 0.3 +
    (car.grip + racer.tires * 5 + racer.handling * 4) * 0.2 +
    racer.nitro * 10 * 0.1
  );
}

function addRacerXP(userId, xp) {
  const r = getRacer(userId);
  const newXP = r.xp + xp;
  const needed = r.level * 160;
  if (newXP >= needed) {
    db.db.prepare('UPDATE racers SET xp = ?, level = level + 1 WHERE user_id = ?').run(newXP - needed, userId);
    return true;
  }
  db.db.prepare('UPDATE racers SET xp = ? WHERE user_id = ?').run(newXP, userId);
  return false;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('autobahn')
    .setDescription('Straßenrennen — Tune dein Auto und werde Rennlegende!')
    .addSubcommand(sub => sub.setName('garage').setDescription('Zeige dein Auto und Stats'))
    .addSubcommand(sub => sub.setName('rennen').setDescription('Fahre ein Rennen')
      .addIntegerOption(opt => opt.setName('strecke').setDescription('Strecke 1-7').setRequired(true).setMinValue(1).setMaxValue(7)))
    .addSubcommand(sub => sub.setName('tuning').setDescription('Tune dein Auto'))
    .addSubcommand(sub => sub.setName('autohaus').setDescription('Kaufe ein neues Auto'))
    .addSubcommand(sub => sub.setName('lizenz').setDescription('Upgrade deine Rennlizenz'))
    .addSubcommand(sub => sub.setName('strecken').setDescription('Zeige alle Strecken'))
    .addSubcommand(sub => sub.setName('drag').setDescription('Drag Race gegen einen anderen Spieler')
      .addUserOption(opt => opt.setName('gegner').setDescription('Dein Gegner').setRequired(true))),

  async execute(interaction) {
    const userId = interaction.user.id;
    const config = require('../config.json');
    const sub = interaction.options.getSubcommand();
    ensureRacingTables();

    if (sub === 'garage') {
      const r = getRacer(userId);
      const car = cars[r.car_type];
      const power = getCarPower(r);
      const xpNeeded = r.level * 160;
      const winRate = r.races_won + r.races_lost > 0 ? Math.round(r.races_won / (r.races_won + r.races_lost) * 100) : 0;

      const embed = new EmbedBuilder()
        .setColor('#e74c3c')
        .setTitle(`${car.emoji} ${car.name}`)
        .setDescription(
          `**Fahrer:** ${interaction.user.username}\n` +
          `**Level:** ${r.level} (${r.xp}/${xpNeeded} XP)\n` +
          `**Lizenz:** Stufe ${r.license}\n` +
          `🏎️ Leistung: **${power} PS**\n\n` +
          `**Auto-Stats:**\n` +
          `💨 Speed: **${car.speed + r.engine * 15}** (Motor Lv.${r.engine})\n` +
          `🚀 Beschleunigung: **${car.accel + r.turbo * 8}** (Turbo Lv.${r.turbo})\n` +
          `🛞 Grip: **${car.grip + r.tires * 5}** (Reifen Lv.${r.tires})\n` +
          `🎯 Handling: **${r.handling}**\n` +
          `🔥 Nitro: **Stufe ${r.nitro}**\n\n` +
          `📊 **Statistiken:**\n` +
          `🏆 Siege: **${r.races_won}** | ❌ Niederlagen: **${r.races_lost}**\n` +
          `📈 Siegrate: **${winRate}%**\n` +
          `💰 Preisgelder: **${config.currencySymbol}${r.total_prize.toLocaleString()}**`
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'strecken') {
      const r = getRacer(userId);
      const lines = tracks.map((t, i) => {
        const locked = t.minLicense > r.license;
        const opp = opponents[i];
        return `**${i + 1}.** ${t.emoji} **${t.name}** — Lizenz ${t.minLicense}${locked ? ' 🔒' : ''}\n` +
          `   vs ${opp.emoji} ${opp.name} (${opp.power} PS) | 💰 ${config.currencySymbol}${t.prize.min}-${t.prize.max}`;
      });

      const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle('🏁 Rennstrecken')
        .setDescription(lines.join('\n'))
        .setFooter({ text: `Lizenz: Stufe ${r.license}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'rennen') {
      const lastPlay = cooldowns.get(userId);
      if (lastPlay && Date.now() - lastPlay < COOLDOWN) {
        const remaining = Math.ceil((COOLDOWN - (Date.now() - lastPlay)) / 1000);
        return interaction.reply(`⏳ Nächstes Rennen in **${remaining}s**!`);
      }

      const r = getRacer(userId);
      const trackIdx = interaction.options.getInteger('strecke') - 1;
      const track = tracks[trackIdx];
      const opp = opponents[trackIdx];

      if (track.minLicense > r.license) return interaction.reply(`🔒 Du brauchst **Lizenz ${track.minLicense}**!`);

      cooldowns.set(userId, Date.now());

      const playerPower = getCarPower(r);
      const event = raceEvents[Math.floor(Math.random() * raceEvents.length)];

      let powerMod = 1.0;
      let eventText = `${event.emoji} **${event.name}:** ${event.text}`;

      switch (event.effect) {
        case 'speed_boost': powerMod = 1.15; break;
        case 'accel_boost': powerMod = 1.1; break;
        case 'grip_loss': powerMod = 0.85; break;
        case 'slow_down': powerMod = 0.9; break;
        case 'tire_blow': powerMod = 0.75; break;
        case 'nitro_boost': powerMod = 1.0 + r.nitro * 0.08; break;
      }

      const roll = Math.floor(Math.random() * 30) + 1;
      const finalPower = Math.floor(playerPower * powerMod) + roll;
      const oppRoll = Math.floor(Math.random() * 20) + 1;
      const oppFinal = opp.power + oppRoll;
      const won = finalPower > oppFinal;

      const timeP = (10 + track.length * 5 - finalPower * 0.02 + Math.random() * 3).toFixed(2);
      const timeO = (10 + track.length * 5 - oppFinal * 0.02 + Math.random() * 3).toFixed(2);

      if (won) {
        const prize = track.prize.min + Math.floor(Math.random() * (track.prize.max - track.prize.min));
        db.updateBalance(userId, prize);
        db.db.prepare('UPDATE racers SET races_won = races_won + 1, total_prize = total_prize + ? WHERE user_id = ?').run(prize, userId);

        if (r.best_time === 0 || parseFloat(timeP) < r.best_time) {
          db.db.prepare('UPDATE racers SET best_time = ? WHERE user_id = ?').run(parseFloat(timeP), userId);
        }

        const leveled = addRacerXP(userId, track.xp);
        const updated = getRacer(userId);

        const embed = new EmbedBuilder()
          .setColor('#FFD700')
          .setTitle(`${track.emoji} 🏆 Rennen gewonnen!`)
          .setDescription(
            `**${track.name}** vs ${opp.emoji} ${opp.name}\n\n` +
            `${eventText}\n\n` +
            `🏎️ Du: 🎲${roll} + ⚡${Math.floor(playerPower * powerMod)} = **${finalPower}** (${timeP}s)\n` +
            `${opp.emoji} ${opp.name}: 🎲${oppRoll} + ⚡${opp.power} = **${oppFinal}** (${timeO}s)\n\n` +
            `💰 **+${config.currencySymbol}${prize.toLocaleString()}**\n` +
            `⭐ +${track.xp} XP` +
            (leveled ? ` 🎉 **LEVEL UP → ${updated.level}!**` : '')
          )
          .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      } else {
        addRacerXP(userId, Math.floor(track.xp * 0.2));
        db.db.prepare('UPDATE racers SET races_lost = races_lost + 1 WHERE user_id = ?').run(userId);

        const embed = new EmbedBuilder()
          .setColor('#e74c3c')
          .setTitle(`${track.emoji} Rennen verloren!`)
          .setDescription(
            `**${track.name}** vs ${opp.emoji} ${opp.name}\n\n` +
            `${eventText}\n\n` +
            `🏎️ Du: 🎲${roll} + ⚡${Math.floor(playerPower * powerMod)} = **${finalPower}** (${timeP}s)\n` +
            `${opp.emoji} ${opp.name}: 🎲${oppRoll} + ⚡${opp.power} = **${oppFinal}** (${timeO}s)\n\n` +
            `*Tune dein Auto oder upgrade die Lizenz!*`
          )
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }
    }

    if (sub === 'tuning') {
      const r = getRacer(userId);
      const upgrades = [
        { name: '🔧 Motor', field: 'engine', cost: 800 + r.engine * 600, max: 10, current: r.engine },
        { name: '🚀 Turbo', field: 'turbo', cost: 1200 + r.turbo * 800, max: 8, current: r.turbo },
        { name: '🛞 Reifen', field: 'tires', cost: 500 + r.tires * 400, max: 8, current: r.tires },
        { name: '🎯 Handling', field: 'handling', cost: 600 + r.handling * 500, max: 10, current: r.handling },
        { name: '🔥 Nitro', field: 'nitro', cost: 2000 + r.nitro * 1500, max: 5, current: r.nitro },
      ];

      const lines = upgrades.map((u, i) => {
        if (u.current >= u.max) return `**${i + 1}.** ${u.name} — **MAX**`;
        return `**${i + 1}.** ${u.name} Lv.${u.current}→${u.current + 1} — **${config.currencySymbol}${u.cost.toLocaleString()}**`;
      });

      const embed = new EmbedBuilder().setColor('#e67e22').setTitle('🔧 Tuning-Werkstatt')
        .setDescription(lines.join('\n'))
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` }).setTimestamp();

      const buttons = upgrades.filter(u => u.current < u.max).slice(0, 5).map(u =>
        new ButtonBuilder().setCustomId(`race_tune_${u.field}_${userId}`).setLabel(u.name).setStyle(ButtonStyle.Primary)
          .setDisabled(db.getBalance(userId) < u.cost)
      );

      const rows = buttons.length > 0 ? [new ActionRowBuilder().addComponents(buttons)] : [];
      const msg = await interaction.reply({ embeds: [embed], components: rows, fetchReply: true });

      if (buttons.length === 0) return;
      const coll = msg.createMessageComponentCollector({ time: 30000 });
      coll.on('collect', (btn) => {
        if (btn.user.id !== userId) return btn.reply({ content: '❌ Nicht deine Werkstatt!', flags: 64 });
        coll.stop();
        const field = btn.customId.split('_')[2];
        const upgrade = upgrades.find(u => u.field === field);
        if (!upgrade || upgrade.current >= upgrade.max || db.getBalance(userId) < upgrade.cost) return btn.update({ content: '❌ Fehler!', embeds: [], components: [] });
        db.updateBalance(userId, -upgrade.cost);
        db.db.prepare(`UPDATE racers SET ${field} = ${field} + 1 WHERE user_id = ?`).run(userId);
        btn.update({ content: `✅ **${upgrade.name}** auf Stufe ${upgrade.current + 1}! (${config.currencySymbol}${upgrade.cost.toLocaleString()})`, embeds: [], components: [] });
      });
      return;
    }

    if (sub === 'autohaus') {
      const r = getRacer(userId);
      const nextCar = r.car_type < cars.length - 1 ? cars[r.car_type + 1] : null;
      const currentCar = cars[r.car_type];

      let desc = `**Aktuell:** ${currentCar.emoji} ${currentCar.name}\n\n`;
      if (nextCar) {
        desc += `🏎️ **Nächstes Auto:** ${nextCar.emoji} **${nextCar.name}**\n`;
        desc += `💨 ${nextCar.speed} Speed | 🚀 ${nextCar.accel} Beschl. | 🛞 ${nextCar.grip} Grip\n`;
        desc += `💰 **${config.currencySymbol}${nextCar.cost.toLocaleString()}**`;
      } else {
        desc += '🏆 Du hast das beste Auto!';
      }

      const buttons = [];
      if (nextCar) {
        buttons.push(new ButtonBuilder().setCustomId(`race_buycar_${userId}`).setLabel(`${nextCar.emoji} ${nextCar.name}`).setStyle(ButtonStyle.Success)
          .setDisabled(db.getBalance(userId) < nextCar.cost));
      }

      const embed = new EmbedBuilder().setColor('#3498db').setTitle('🏪 Autohaus').setDescription(desc)
        .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` }).setTimestamp();
      const rows = buttons.length > 0 ? [new ActionRowBuilder().addComponents(buttons)] : [];
      const msg = await interaction.reply({ embeds: [embed], components: rows, fetchReply: true });

      if (buttons.length === 0) return;
      const coll = msg.createMessageComponentCollector({ time: 30000 });
      coll.on('collect', (btn) => {
        if (btn.user.id !== userId) return btn.reply({ content: '❌ Nicht für dich!', flags: 64 });
        coll.stop();
        const current = getRacer(userId);
        const next = cars[current.car_type + 1];
        if (!next || db.getBalance(userId) < next.cost) return btn.update({ content: '❌ Fehler!', embeds: [], components: [] });
        db.updateBalance(userId, -next.cost);
        db.db.prepare('UPDATE racers SET car_type = ? WHERE user_id = ?').run(current.car_type + 1, userId);
        btn.update({ content: `🏎️ **${next.emoji} ${next.name}** gekauft!`, embeds: [], components: [] });
      });
      return;
    }

    if (sub === 'lizenz') {
      const r = getRacer(userId);
      if (r.license >= 8) return interaction.reply('🏆 Du hast die höchste Lizenz!');
      const cost = 1000 + r.license * 2000;
      if (db.getBalance(userId) < cost) return interaction.reply(`❌ Lizenz-Upgrade kostet **${config.currencySymbol}${cost.toLocaleString()}**!`);

      db.updateBalance(userId, -cost);
      db.db.prepare('UPDATE racers SET license = license + 1 WHERE user_id = ?').run(userId);
      return interaction.reply(`🏁 **Rennlizenz Stufe ${r.license + 1}** erhalten! Neue Strecken freigeschaltet.`);
    }

    if (sub === 'drag') {
      const target = interaction.options.getUser('gegner');
      if (target.id === userId) return interaction.reply('❌ Kein Selbstrennen!');
      if (target.bot) return interaction.reply('❌ Bots können nicht fahren!');

      const r1 = getRacer(userId);
      const r2 = getRacer(target.id);
      const bet = 300 + r1.level * 80;

      if (db.getBalance(userId) < bet) return interaction.reply(`❌ Du brauchst **${config.currencySymbol}${bet}**!`);
      if (db.getBalance(target.id) < bet) return interaction.reply(`❌ **${target.username}** hat nicht genug!`);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`drag_accept_${target.id}_${userId}_${bet}`).setLabel('🏁 Annehmen').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`drag_decline_${target.id}`).setLabel('❌ Ablehnen').setStyle(ButtonStyle.Danger)
      );

      const msg = await interaction.reply({
        content: `🏁 **${interaction.user.username}** (${cars[r1.car_type].emoji} ${cars[r1.car_type].name}) fordert **${target.username}** (${cars[r2.car_type].emoji} ${cars[r2.car_type].name}) zum Drag Race! Einsatz: **${config.currencySymbol}${bet}**`,
        components: [row], fetchReply: true
      });

      const coll = msg.createMessageComponentCollector({ time: 30000 });
      coll.on('collect', (btn) => {
        if (btn.customId.startsWith('drag_decline')) {
          if (btn.user.id !== target.id) return btn.reply({ content: '❌!', flags: 64 });
          coll.stop();
          return btn.update({ content: `❌ ${target.username} lehnt ab.`, components: [] });
        }
        if (btn.user.id !== target.id) return btn.reply({ content: '❌!', flags: 64 });
        coll.stop();

        db.updateBalance(userId, -bet);
        db.updateBalance(target.id, -bet);

        const p1 = getCarPower(r1) + Math.floor(Math.random() * 30);
        const p2 = getCarPower(r2) + Math.floor(Math.random() * 30);
        const t1 = (8 - p1 * 0.015 + Math.random() * 2).toFixed(2);
        const t2 = (8 - p2 * 0.015 + Math.random() * 2).toFixed(2);

        const winner = parseFloat(t1) < parseFloat(t2) ? userId : parseFloat(t2) < parseFloat(t1) ? target.id : null;

        if (winner) {
          db.updateBalance(winner, bet * 2);
          db.db.prepare('UPDATE racers SET races_won = races_won + 1 WHERE user_id = ?').run(winner);
          const loser = winner === userId ? target.id : userId;
          db.db.prepare('UPDATE racers SET races_lost = races_lost + 1 WHERE user_id = ?').run(loser);
          const winName = winner === userId ? interaction.user.username : target.username;

          const embed = new EmbedBuilder().setColor('#FFD700').setTitle(`🏁 ${winName} gewinnt das Drag Race!`)
            .setDescription(`${interaction.user.username}: **${t1}s** | ${target.username}: **${t2}s**\n\n🏆 **+${config.currencySymbol}${(bet * 2).toLocaleString()}**`)
            .setTimestamp();
          btn.update({ embeds: [embed], components: [] });
        } else {
          db.updateBalance(userId, bet);
          db.updateBalance(target.id, bet);
          const embed = new EmbedBuilder().setColor('#f39c12').setTitle('🏁 Gleichstand!')
            .setDescription(`Beide: **${t1}s**! Einsätze zurück.`).setTimestamp();
          btn.update({ embeds: [embed], components: [] });
        }
      });

      coll.on('end', (_, reason) => {
        if (reason === 'time') msg.edit({ content: '⏰ Keine Antwort.', components: [] });
      });
    }
  },
};
