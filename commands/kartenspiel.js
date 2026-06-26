const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');

const COOLDOWN = 2 * 60 * 1000;
const cooldowns = new Map();

const cardPool = [
  { id: 'goblin', name: 'Goblin', emoji: '👺', atk: 2, def: 1, tier: 1 },
  { id: 'skelett', name: 'Skelett', emoji: '💀', atk: 3, def: 1, tier: 1 },
  { id: 'schleim', name: 'Schleim', emoji: '🟢', atk: 1, def: 3, tier: 1 },
  { id: 'ratte', name: 'Ratte', emoji: '🐀', atk: 2, def: 2, tier: 1 },
  { id: 'wolf', name: 'Wolf', emoji: '🐺', atk: 4, def: 2, tier: 2 },
  { id: 'ritter', name: 'Ritter', emoji: '⚔️', atk: 3, def: 4, tier: 2 },
  { id: 'magier', name: 'Magier', emoji: '🧙', atk: 5, def: 2, tier: 2 },
  { id: 'golem', name: 'Golem', emoji: '🗿', atk: 2, def: 6, tier: 2 },
  { id: 'vampir', name: 'Vampir', emoji: '🧛', atk: 5, def: 3, tier: 2 },
  { id: 'drache', name: 'Drache', emoji: '🐉', atk: 7, def: 4, tier: 3 },
  { id: 'phoenix', name: 'Phönix', emoji: '🦅', atk: 6, def: 5, tier: 3 },
  { id: 'hydra', name: 'Hydra', emoji: '🐍', atk: 5, def: 7, tier: 3 },
  { id: 'daemon', name: 'Dämon', emoji: '😈', atk: 8, def: 3, tier: 3 },
  { id: 'engel', name: 'Engel', emoji: '👼', atk: 4, def: 8, tier: 3 },
  { id: 'titan', name: 'Titan', emoji: '🏔️', atk: 9, def: 6, tier: 4 },
  { id: 'leviathan', name: 'Leviathan', emoji: '🌊', atk: 7, def: 9, tier: 4 },
  { id: 'gott', name: 'Gottheit', emoji: '⭐', atk: 10, def: 8, tier: 4 },
];

const spellCards = [
  { id: 'heilen', name: 'Heilung', emoji: '💚', effect: 'heal', value: 3, desc: '+3 HP' },
  { id: 'feuerball', name: 'Feuerball', emoji: '🔥', effect: 'damage', value: 4, desc: '4 Schaden' },
  { id: 'schild', name: 'Schild', emoji: '🛡️', effect: 'shield', value: 3, desc: '+3 DEF nächste Runde' },
  { id: 'blitz', name: 'Blitz', emoji: '⚡', effect: 'damage', value: 6, desc: '6 Schaden' },
  { id: 'gift', name: 'Gift', emoji: '☠️', effect: 'poison', value: 2, desc: '2 Schaden/Runde für 2 Runden' },
];

function drawCard() {
  const roll = Math.random();
  let pool;
  if (roll < 0.05) {
    pool = cardPool.filter(c => c.tier === 4);
  } else if (roll < 0.2) {
    pool = cardPool.filter(c => c.tier === 3);
  } else if (roll < 0.5) {
    pool = cardPool.filter(c => c.tier === 2);
  } else {
    pool = cardPool.filter(c => c.tier === 1);
  }
  return { ...pool[Math.floor(Math.random() * pool.length)], type: 'creature' };
}

function drawSpell() {
  return { ...spellCards[Math.floor(Math.random() * spellCards.length)], type: 'spell' };
}

function drawHand(size = 4) {
  const hand = [];
  for (let i = 0; i < size; i++) {
    hand.push(Math.random() < 0.3 ? drawSpell() : drawCard());
  }
  return hand;
}

function aiDrawHand(difficulty) {
  const hand = [];
  const size = difficulty >= 3 ? 5 : 4;
  for (let i = 0; i < size; i++) {
    const roll = Math.random() + difficulty * 0.05;
    if (roll < 0.3) {
      hand.push(drawSpell());
    } else {
      const tierBoost = Math.random() + difficulty * 0.1;
      let pool;
      if (tierBoost > 0.9) pool = cardPool.filter(c => c.tier >= 3);
      else if (tierBoost > 0.6) pool = cardPool.filter(c => c.tier >= 2);
      else pool = cardPool.filter(c => c.tier >= 1);
      hand.push({ ...pool[Math.floor(Math.random() * pool.length)], type: 'creature' });
    }
  }
  return hand;
}

const opponents = [
  { name: 'Goblin-König', emoji: '👺', difficulty: 1, hp: 15, reward: 1.5 },
  { name: 'Dunkler Magier', emoji: '🧙‍♂️', difficulty: 2, hp: 20, reward: 2.0 },
  { name: 'Drachenlord', emoji: '🐉', difficulty: 3, hp: 25, reward: 3.0 },
  { name: 'Erzengel', emoji: '👼', difficulty: 4, hp: 30, reward: 4.5 },
  { name: 'Weltenverschlinger', emoji: '🌑', difficulty: 5, hp: 35, reward: 6.0 },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kartenspiel')
    .setDescription('Kartenspiel — Ziehe Karten und besiege Gegner!')
    .addIntegerOption(opt =>
      opt.setName('einsatz')
        .setDescription('Dein Einsatz')
        .setRequired(true)
        .setMinValue(100)
        .setMaxValue(20000))
    .addIntegerOption(opt =>
      opt.setName('schwierigkeit')
        .setDescription('Schwierigkeit 1-5')
        .setMinValue(1)
        .setMaxValue(5)),
  async execute(interaction) {
    const userId = interaction.user.id;
    const config = require('../config.json');

    const lastPlay = cooldowns.get(userId);
    if (lastPlay && Date.now() - lastPlay < COOLDOWN) {
      const remaining = Math.ceil((COOLDOWN - (Date.now() - lastPlay)) / 1000);
      return interaction.reply(`⏳ Nächstes Spiel in **${remaining}s**!`);
    }

    const bet = interaction.options.getInteger('einsatz');
    if (db.getBalance(userId) < bet) {
      return interaction.reply(`❌ Du brauchst **${config.currencySymbol}${bet.toLocaleString()}**!`);
    }

    const diffChoice = interaction.options.getInteger('schwierigkeit') || Math.ceil(Math.random() * 3);
    const opponent = opponents[Math.min(diffChoice - 1, opponents.length - 1)];

    cooldowns.set(userId, Date.now());
    db.updateBalance(userId, -bet);

    let playerHP = 20;
    let enemyHP = opponent.hp;
    let round = 0;
    const maxRounds = 6;
    let gameOver = false;
    let shieldBonus = 0;
    let enemyShieldBonus = 0;
    let poisonDmg = 0;
    let poisonRounds = 0;
    const battleLog = [];

    let playerHand = drawHand(4);
    const enemyHand = aiDrawHand(opponent.difficulty);

    const tierStars = (tier) => '⭐'.repeat(tier);

    const formatCard = (card, idx) => {
      if (card.type === 'spell') {
        return `${idx + 1}. ${card.emoji} ${card.name} (${card.desc})`;
      }
      return `${idx + 1}. ${card.emoji} ${card.name} [⚔️${card.atk}/🛡️${card.def}] ${tierStars(card.tier)}`;
    };

    const buildEmbed = () => {
      return new EmbedBuilder()
        .setColor(gameOver ? (playerHP > 0 ? '#FFD700' : '#e74c3c') : '#3498db')
        .setTitle(`🃏 Kartenspiel vs ${opponent.emoji} ${opponent.name}`)
        .setDescription(
          `❤️ Du: **${playerHP} HP** ${shieldBonus > 0 ? `(🛡️+${shieldBonus})` : ''} | ` +
          `💀 ${opponent.name}: **${enemyHP} HP** ${enemyShieldBonus > 0 ? `(🛡️+${enemyShieldBonus})` : ''}\n` +
          `📊 Runde: **${round + 1}/${maxRounds}** | 💰 Einsatz: **${config.currencySymbol}${bet.toLocaleString()}**\n\n` +
          `**Deine Hand:**\n${playerHand.map((c, i) => formatCard(c, i)).join('\n')}\n\n` +
          (battleLog.length > 0 ? `**Kampflog:**\n${battleLog.slice(-4).join('\n')}` : '_Wähle eine Karte zum Spielen!_')
        )
        .setFooter({ text: `Schwierigkeit: ${'⭐'.repeat(opponent.difficulty)} | Belohnung: x${opponent.reward}` })
        .setTimestamp();
    };

    const buildButtons = () => {
      const rows = [];
      const row = new ActionRowBuilder();
      for (let i = 0; i < playerHand.length; i++) {
        const card = playerHand[i];
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`ks_${i}_${userId}`)
            .setLabel(`${card.emoji} ${card.name}`)
            .setStyle(card.type === 'spell' ? ButtonStyle.Success : ButtonStyle.Primary)
        );
      }
      rows.push(row);
      return rows;
    };

    const playRound = (playerCardIdx) => {
      const playerCard = playerHand[playerCardIdx];
      const enemyCardIdx = Math.floor(Math.random() * enemyHand.length);
      const enemyCard = enemyHand[enemyCardIdx];
      round++;

      if (poisonRounds > 0) {
        enemyHP -= poisonDmg;
        battleLog.push(`☠️ Gift wirkt: **-${poisonDmg} HP** auf ${opponent.name}`);
        poisonRounds--;
      }

      if (playerCard.type === 'spell') {
        switch (playerCard.effect) {
          case 'heal':
            playerHP = Math.min(20, playerHP + playerCard.value);
            battleLog.push(`${playerCard.emoji} Du heilst **+${playerCard.value} HP**!`);
            break;
          case 'damage':
            const spellDmg = Math.max(1, playerCard.value - enemyShieldBonus);
            enemyHP -= spellDmg;
            battleLog.push(`${playerCard.emoji} ${playerCard.name}: **${spellDmg} Schaden** an ${opponent.name}!`);
            break;
          case 'shield':
            shieldBonus += playerCard.value;
            battleLog.push(`${playerCard.emoji} Du erhältst **+${playerCard.value} Schild**!`);
            break;
          case 'poison':
            poisonDmg = playerCard.value;
            poisonRounds = 2;
            battleLog.push(`${playerCard.emoji} ${opponent.name} ist vergiftet! (**${playerCard.value}/Runde**)`);
            break;
        }
      } else {
        const dmg = Math.max(1, playerCard.atk - (enemyCard.type === 'creature' ? Math.floor(enemyCard.def / 2) : 0) - enemyShieldBonus);
        enemyHP -= dmg;
        battleLog.push(`${playerCard.emoji} ${playerCard.name} greift an: **${dmg} Schaden**!`);
      }

      enemyShieldBonus = 0;

      if (enemyHP > 0) {
        if (enemyCard.type === 'spell') {
          switch (enemyCard.effect) {
            case 'heal':
              enemyHP = Math.min(opponent.hp, enemyHP + enemyCard.value);
              battleLog.push(`${enemyCard.emoji} ${opponent.name} heilt sich!`);
              break;
            case 'damage':
              const eDmg = Math.max(1, enemyCard.value - shieldBonus);
              playerHP -= eDmg;
              battleLog.push(`${enemyCard.emoji} ${opponent.name}: **${eDmg} Schaden** an dich!`);
              break;
            case 'shield':
              enemyShieldBonus += enemyCard.value;
              battleLog.push(`${enemyCard.emoji} ${opponent.name} erhält Schild!`);
              break;
            case 'poison':
              playerHP -= enemyCard.value;
              battleLog.push(`${enemyCard.emoji} ${opponent.name} vergiftet dich! **-${enemyCard.value} HP**`);
              break;
          }
        } else {
          const eDmg = Math.max(1, enemyCard.atk - Math.floor((playerCard.type === 'creature' ? playerCard.def : 0) / 2) - shieldBonus);
          playerHP -= eDmg;
          battleLog.push(`${enemyCard.emoji} ${enemyCard.name} kontert: **${eDmg} Schaden**!`);
        }
      }

      shieldBonus = 0;

      playerHand.splice(playerCardIdx, 1);
      if (playerHand.length === 0) {
        playerHand = [Math.random() < 0.3 ? drawSpell() : drawCard()];
      }

      enemyHand.splice(enemyCardIdx, 1);
      if (enemyHand.length === 0) {
        enemyHand.push(Math.random() < 0.3 ? drawSpell() : drawCard());
      }

      if (playerHP <= 0 || enemyHP <= 0 || round >= maxRounds) {
        gameOver = true;
      }
    };

    const msg = await interaction.reply({ embeds: [buildEmbed()], components: buildButtons(), fetchReply: true });
    const collector = msg.createMessageComponentCollector({ time: 60000 });

    collector.on('collect', (btn) => {
      if (btn.user.id !== userId) return btn.reply({ content: '❌ Das ist nicht dein Spiel!', flags: 64 });
      if (gameOver) return;

      const cardIdx = parseInt(btn.customId.split('_')[1]);
      if (cardIdx >= playerHand.length) return;

      playRound(cardIdx);

      if (gameOver) {
        collector.stop('done');

        const won = playerHP > 0 && (enemyHP <= 0 || playerHP > enemyHP);
        const winnings = won ? Math.floor(bet * opponent.reward) : 0;
        if (won) db.updateBalance(userId, winnings);

        const net = winnings - bet;

        const embed = new EmbedBuilder()
          .setColor(won ? '#FFD700' : '#e74c3c')
          .setTitle(won
            ? `🃏 ${opponent.emoji} ${opponent.name} besiegt!`
            : `🃏 ${opponent.emoji} ${opponent.name} gewinnt!`)
          .setDescription(
            `❤️ Du: **${Math.max(0, playerHP)} HP** | 💀 ${opponent.name}: **${Math.max(0, enemyHP)} HP**\n\n` +
            `**Kampflog:**\n${battleLog.slice(-6).join('\n')}\n\n` +
            (won
              ? `💰 Gewinn: **+${config.currencySymbol}${winnings.toLocaleString()}** (${net >= 0 ? '+' : ''}${config.currencySymbol}${net.toLocaleString()} netto)`
              : `💸 Verloren: **-${config.currencySymbol}${bet.toLocaleString()}**`)
          )
          .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
          .setTimestamp();
        btn.update({ embeds: [embed], components: [] });
        return;
      }

      collector.resetTimer({ time: 60000 });
      btn.update({ embeds: [buildEmbed()], components: buildButtons() });
    });

    collector.on('end', (_, reason) => {
      if (reason === 'time' && !gameOver) {
        gameOver = true;
        const embed = new EmbedBuilder()
          .setColor('#f39c12')
          .setTitle('⏰ Kartenspiel — Zeit abgelaufen!')
          .setDescription(`💸 Verloren: **-${config.currencySymbol}${bet.toLocaleString()}**`)
          .setFooter({ text: `Guthaben: ${config.currencySymbol}${db.getBalance(userId).toLocaleString()}` })
          .setTimestamp();
        msg.edit({ embeds: [embed], components: [] });
      }
    });
  },
};
