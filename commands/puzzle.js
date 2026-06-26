const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const COOLDOWN = 2 * 60 * 1000;
const cooldowns = new Map();

const puzzleTypes = [
  {
    id: 'zahlen',
    name: 'Zahlenrätsel',
    emoji: '🔢',
    generate: () => {
      const target = 10 + Math.floor(Math.random() * 90);
      const a = Math.floor(Math.random() * target);
      const b = target - a;
      const ops = ['+', '-', '×'];
      const decoys = [];
      while (decoys.length < 3) {
        const d = target + (Math.floor(Math.random() * 20) - 10);
        if (d !== target && d > 0 && !decoys.includes(d)) decoys.push(d);
      }
      return {
        question: `Was ist **${a} + ${b}**?`,
        answer: target,
        options: [target, ...decoys].sort(() => Math.random() - 0.5),
        difficulty: 1,
      };
    },
  },
  {
    id: 'reihe',
    name: 'Zahlenreihe',
    emoji: '📊',
    generate: () => {
      const patterns = [
        { name: 'add', gen: () => { const start = Math.floor(Math.random() * 20); const step = 2 + Math.floor(Math.random() * 8); return Array.from({length: 5}, (_, i) => start + step * i); }},
        { name: 'mult', gen: () => { const start = 1 + Math.floor(Math.random() * 5); const mult = 2 + Math.floor(Math.random() * 3); return Array.from({length: 5}, (_, i) => start * Math.pow(mult, i)); }},
        { name: 'fib', gen: () => { const a = 1 + Math.floor(Math.random() * 5); const b = a + Math.floor(Math.random() * 5); const seq = [a, b]; for (let i = 2; i < 5; i++) seq.push(seq[i-1] + seq[i-2]); return seq; }},
      ];
      const pattern = patterns[Math.floor(Math.random() * patterns.length)];
      const seq = pattern.gen();
      const answer = seq[4];
      const shown = seq.slice(0, 4);
      const decoys = [];
      while (decoys.length < 3) {
        const d = answer + Math.floor(Math.random() * 20) - 10;
        if (d !== answer && d > 0 && !decoys.includes(d)) decoys.push(d);
      }
      return {
        question: `Setze die Reihe fort:\n**${shown.join(', ')}, ?**`,
        answer,
        options: [answer, ...decoys].sort(() => Math.random() - 0.5),
        difficulty: 2,
      };
    },
  },
  {
    id: 'logik',
    name: 'Logik-Puzzle',
    emoji: '🧠',
    generate: () => {
      const puzzles = [
        { q: 'Wenn ein Hemd 3 Stunden zum Trocknen braucht, wie lange brauchen 5 Hemden?', a: 3, opts: [3, 5, 15, 8] },
        { q: 'Ein Bauer hat 17 Schafe. Alle bis auf 9 sterben. Wie viele leben noch?', a: 9, opts: [9, 8, 17, 0] },
        { q: 'Was kommt einmal in einer Minute, zweimal in einem Moment, aber nie in 1000 Jahren vor?', a: 'M', opts: ['M', 'Z', 'E', 'N'] },
        { q: 'Ein Zug fährt nach Süden. Der Wind weht nach Norden. In welche Richtung geht der Rauch?', a: 'Süden', opts: ['Süden', 'Norden', 'Osten', 'Kein Rauch'] },
        { q: 'Du überholst den Zweiten. Welchen Platz hast du jetzt?', a: 'Platz 2', opts: ['Platz 1', 'Platz 2', 'Platz 3', 'Letzter'] },
        { q: 'Wie viele Monate haben 28 Tage?', a: 'Alle 12', opts: ['Alle 12', '1', '2', '6'] },
        { q: 'Ein Vater und Sohn haben zusammen 36 Jahre. Der Vater ist 30 Jahre älter. Wie alt ist der Sohn?', a: 3, opts: [3, 6, 12, 30] },
        { q: 'Wenn 5 Maschinen 5 Minuten für 5 Teile brauchen, wie lange brauchen 100 Maschinen für 100 Teile?', a: 5, opts: [5, 100, 20, 50] },
      ];
      const p = puzzles[Math.floor(Math.random() * puzzles.length)];
      return {
        question: p.q,
        answer: p.a,
        options: p.opts.sort(() => Math.random() - 0.5),
        difficulty: 3,
      };
    },
  },
  {
    id: 'emoji',
    name: 'Emoji-Gleichung',
    emoji: '🎭',
    generate: () => {
      const symbols = ['🍎', '🌟', '🔥', '💎', '🎯', '⚡'];
      const s1 = symbols[Math.floor(Math.random() * symbols.length)];
      const s2 = symbols.filter(s => s !== s1)[Math.floor(Math.random() * (symbols.length - 1))];
      const v1 = 2 + Math.floor(Math.random() * 8);
      const v2 = 2 + Math.floor(Math.random() * 8);
      const answer = v1 + v2;
      const decoys = [];
      while (decoys.length < 3) {
        const d = answer + Math.floor(Math.random() * 10) - 5;
        if (d !== answer && d > 0 && !decoys.includes(d)) decoys.push(d);
      }
      return {
        question: `${s1} = **${v1}**, ${s2} = **${v2}**\n\nWas ist ${s1} + ${s2}?`,
        answer,
        options: [answer, ...decoys].sort(() => Math.random() - 0.5),
        difficulty: 1,
      };
    },
  },
  {
    id: 'woerter',
    name: 'Wort-Rätsel',
    emoji: '📝',
    generate: () => {
      const riddles = [
        { q: 'Welches Wort wird kürzer, wenn man zwei Buchstaben hinzufügt?', a: 'Kurz', opts: ['Kurz', 'Lang', 'Wort', 'Klein'] },
        { q: 'Was hat Zähne, kann aber nicht beißen?', a: 'Kamm', opts: ['Kamm', 'Säge', 'Hai', 'Schlange'] },
        { q: 'Was hat einen Kopf und einen Fuß, aber keinen Körper?', a: 'Bett', opts: ['Bett', 'Nagel', 'Pilz', 'Münze'] },
        { q: 'Was fällt und wird niemals verletzt?', a: 'Regen', opts: ['Regen', 'Schnee', 'Blatt', 'Stein'] },
        { q: 'Was hat Städte, aber keine Häuser; Wälder, aber keine Bäume?', a: 'Landkarte', opts: ['Landkarte', 'Traum', 'Buch', 'Internet'] },
        { q: 'Was kann man nicht in eine Pfanne werfen?', a: 'Blick', opts: ['Blick', 'Ei', 'Stein', 'Butter'] },
        { q: 'Was gehört dir, wird aber von anderen mehr benutzt?', a: 'Dein Name', opts: ['Dein Name', 'Dein Geld', 'Dein Auto', 'Dein Haus'] },
        { q: 'Was wird nass, während es trocknet?', a: 'Handtuch', opts: ['Handtuch', 'Schwamm', 'Seife', 'Haare'] },
      ];
      const r = riddles[Math.floor(Math.random() * riddles.length)];
      return {
        question: r.q,
        answer: r.a,
        options: r.opts.sort(() => Math.random() - 0.5),
        difficulty: 2,
      };
    },
  },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('puzzle')
    .setDescription('Löse Rätsel und gewinne Geld!')
    .addIntegerOption(opt =>
      opt.setName('einsatz')
        .setDescription('Dein Einsatz')
        .setRequired(true)
        .setMinValue(50)
        .setMaxValue(15000)),
  async execute(interaction) {
    const userId = interaction.user.id;
    const config = require('../config.json');

    const lastPlay = cooldowns.get(userId);
    if (lastPlay && Date.now() - lastPlay < COOLDOWN) {
      const remaining = Math.ceil((COOLDOWN - (Date.now() - lastPlay)) / 1000);
      return interaction.reply(`⏳ Nächstes Puzzle in **${remaining}s**!`);
    }

    const bet = interaction.options.getInteger('einsatz');
    if (db.getBalance(userId) < bet) {
      return interaction.reply(`❌ Du brauchst **${config.currencySymbol}${bet.toLocaleString()}**!`);
    }

    cooldowns.set(userId, Date.now());
    db.updateBalance(userId, -bet);

    let currentRound = 0;
    const maxRounds = 5;
    let totalScore = 0;
    let streak = 0;
    let gameOver = false;
    const startTime = Date.now();
    const results = [];

    const getRandomPuzzle = () => {
      const type = puzzleTypes[Math.floor(Math.random() * puzzleTypes.length)];
      return { type, puzzle: type.generate() };
    };

    let current = getRandomPuzzle();

    const buildEmbed = (feedback = '') => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      return new EmbedBuilder()
        .setColor(gameOver ? (totalScore > 0 ? '#FFD700' : '#e74c3c') : '#3498db')
        .setTitle(`${current.type.emoji} ${current.type.name} — Runde ${currentRound + 1}/${maxRounds}`)
        .setDescription(
          `💰 Einsatz: **${config.currencySymbol}${bet.toLocaleString()}** | ⏱️ **${elapsed}s**\n` +
          `📊 Punkte: **${totalScore}** | 🔥 Streak: **${streak}**\n\n` +
          `${current.puzzle.question}\n` +
          (feedback ? `\n${feedback}` : '')
        )
        .setFooter({ text: `Schwierigkeit: ${'⭐'.repeat(current.puzzle.difficulty)} | 20s pro Frage` })
        .setTimestamp();
    };

    const buildButtons = () => {
      const row = new ActionRowBuilder();
      for (let i = 0; i < current.puzzle.options.length; i++) {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`pz_${i}_${userId}`)
            .setLabel(String(current.puzzle.options[i]))
            .setStyle(ButtonStyle.Primary)
        );
      }
      return [row];
    };

    const msg = await interaction.reply({ embeds: [buildEmbed()], components: buildButtons(), fetchReply: true });
    const collector = msg.createMessageComponentCollector({ time: 20000 });

    collector.on('collect', (btn) => {
      if (btn.user.id !== userId) return btn.reply({ content: '❌ Das ist nicht dein Puzzle!', flags: 64 });
      if (gameOver) return;

      const idx = parseInt(btn.customId.split('_')[1]);
      const chosen = current.puzzle.options[idx];
      const correct = String(chosen) === String(current.puzzle.answer);

      if (correct) {
        streak++;
        const points = current.puzzle.difficulty * 10 * (1 + streak * 0.2);
        totalScore += Math.floor(points);
        results.push(`✅ ${current.type.emoji} +${Math.floor(points)} Punkte`);
      } else {
        streak = 0;
        results.push(`❌ ${current.type.emoji} Falsch! (Richtig: ${current.puzzle.answer})`);
      }

      currentRound++;

      if (currentRound >= maxRounds) {
        gameOver = true;
        collector.stop('done');

        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const timeBonus = Math.max(0, 60 - elapsed);
        totalScore += timeBonus;

        const multiplier = totalScore >= 120 ? 3.0 :
                          totalScore >= 80 ? 2.0 :
                          totalScore >= 50 ? 1.5 :
                          totalScore >= 30 ? 1.0 :
                          totalScore >= 10 ? 0.5 : 0;

        const winnings = Math.floor(bet * multiplier);
        if (winnings > 0) db.updateBalance(userId, winnings);
        const net = winnings - bet;

        const embed = new EmbedBuilder()
          .setColor(winnings > bet ? '#FFD700' : winnings > 0 ? '#e67e22' : '#e74c3c')
          .setTitle(winnings > bet ? '🧠 Puzzle-Meister!' : winnings > 0 ? '🧠 Puzzle beendet!' : '🧠 Puzzle verloren!')
          .setDescription(
            `**Ergebnisse:**\n${results.join('\n')}\n\n` +
            `📊 Punkte: **${totalScore}** (⏱️ Zeitbonus: +${timeBonus})\n` +
            `🔄 Multiplikator: **x${multiplier}**\n\n` +
            (winnings > 0
              ? `💰 Gewinn: **+${config.currencySymbol}${winnings.toLocaleString()}** (${net >= 0 ? '+' : ''}${config.currencySymbol}${net.toLocaleString()} netto)`
              : `💸 Verloren: **-${config.currencySymbol}${bet.toLocaleString()}**`) +
            `\n\n📋 **Punkte-Tabelle:**\n` +
            `120+ Punkte → x3.0 | 80+ → x2.0\n50+ → x1.5 | 30+ → x1.0\n10+ → x0.5 | <10 → x0`
          )
          .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
          .setTimestamp();
        btn.update({ embeds: [embed], components: [] });
        return;
      }

      current = getRandomPuzzle();
      collector.resetTimer({ time: 20000 });
      btn.update({
        embeds: [buildEmbed(correct ? '✅ **Richtig!**' : `❌ **Falsch!** Richtig war: **${current.puzzle.answer}**`)],
        components: buildButtons()
      });
    });

    collector.on('end', (_, reason) => {
      if (reason === 'time' && !gameOver) {
        gameOver = true;
        const multiplier = totalScore >= 30 ? 0.5 : 0;
        const winnings = Math.floor(bet * multiplier);
        if (winnings > 0) db.updateBalance(userId, winnings);

        const embed = new EmbedBuilder()
          .setColor('#f39c12')
          .setTitle('⏰ Puzzle — Zeit abgelaufen!')
          .setDescription(
            `${results.join('\n')}\n\n` +
            `📊 Punkte: **${totalScore}**\n` +
            (winnings > 0
              ? `💰 Teilgewinn: **+${config.currencySymbol}${winnings.toLocaleString()}**`
              : `💸 Verloren: **-${config.currencySymbol}${bet.toLocaleString()}**`)
          )
          .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
          .setTimestamp();
        msg.edit({ embeds: [embed], components: [] });
      }
    });
  },
};
