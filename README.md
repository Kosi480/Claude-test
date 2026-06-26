# Discord Economy Bot

Ein umfangreicher Economy-Bot für Discord mit 50+ Commands, geschrieben in JavaScript mit discord.js.

## Setup

1. **Node.js installieren** (v16.9+)
2. **Dependencies installieren:**
   ```bash
   npm install
   ```
3. **Bot konfigurieren:**
   ```bash
   cp config.example.json config.json
   ```
   Trage deinen Bot-Token in `config.json` ein.
4. **Bot starten:**
   ```bash
   node index.js
   ```

## Bot-Token erstellen

1. Gehe zu https://discord.com/developers/applications
2. Erstelle eine neue Application
3. Gehe zu "Bot" → "Add Bot"
4. Kopiere den Token in `config.json`
5. Aktiviere unter "Privileged Gateway Intents":
   - Message Content Intent
   - Server Members Intent
6. Lade den Bot mit dem OAuth2 URL Generator ein (Scopes: `bot`, Permissions: `Send Messages`, `Embed Links`, `Read Message History`)

## Alle Commands

### Geld verdienen
| Command | Aliases | Beschreibung |
|---------|---------|-------------|
| `!work` | `!arbeiten` | Arbeite verschiedene Jobs (30s CD) |
| `!job work` | `!beruf schicht` | Arbeite eine Schicht in deinem Beruf |
| `!daily` | `!täglich` | Tägliche Belohnung (500$) |
| `!weekly` | `!wöchentlich` | Wöchentliche Belohnung (2500$) |
| `!beg` | `!betteln` | Bettle auf der Straße (45s CD) |
| `!crime` | `!verbrechen` | Verbrechen begehen — hohes Risiko (2min CD) |
| `!fish` | `!angeln` | Angeln (benötigt Angel, 20s CD) |
| `!dig` | `!graben` | Nach Schätzen graben (benötigt Schaufel, 25s CD) |
| `!hunt` | `!jagen` | Auf die Jagd gehen (30s CD) |
| `!trivia` | `!quiz` | Quizfragen beantworten (30s CD) |
| `!scramble` | `!wortspiel` | Buchstaben entwirren (45s CD) |
| `!guess` | `!zahlenraten` | Zahl 1-100 raten |

### Konto & Bank
| Command | Aliases | Beschreibung |
|---------|---------|-------------|
| `!balance` | `!bal`, `!geld` | Guthaben anzeigen |
| `!bank` | `!einzahlen` | Bank-Verwaltung |
| `!profile` | `!profil` | Detailliertes Spielerprofil |
| `!leaderboard` | `!lb`, `!top` | Rangliste |
| `!pay` | `!überweisen` | Geld an andere senden |

### Shop & Items
| Command | Aliases | Beschreibung |
|---------|---------|-------------|
| `!shop` | `!laden` | Shop anzeigen |
| `!buy` | `!kaufen` | Item kaufen |
| `!sell` | `!verkaufen` | Item verkaufen (70% Preis) |
| `!inventory` | `!inv`, `!inventar` | Inventar anzeigen |
| `!trade` | `!handeln` | Items mit Spielern tauschen |
| `!auction` | `!auktion` | Auktionshaus |
| `!craft` | `!craften` | Items kombinieren |

### Casino & Gambling
| Command | Aliases | Beschreibung |
|---------|---------|-------------|
| `!coinflip` | `!cf`, `!münze` | Münzwurf |
| `!slots` | `!slot` | Spielautomat |
| `!blackjack` | `!bj` | Blackjack mit Buttons |
| `!roulette` | `!rlt` | Europäisches Roulette |
| `!dice` | `!würfel` | Würfelspiel |
| `!highlow` | `!hl` | Höher oder Tiefer |
| `!rps` | `!ssp`, `!schere` | Schere-Stein-Papier |
| `!lottery` | `!lotto` | Lotterie mit Jackpot |

### PvP & Multiplayer
| Command | Aliases | Beschreibung |
|---------|---------|-------------|
| `!steal` | `!klauen` | Spieler bestehlen (60s CD) |
| `!pickpocket` | `!taschendieb` | Subtiler Diebstahl (90s CD) |
| `!duel` | `!duell`, `!kampf` | PvP-Duell mit Wetteinsatz |
| `!bounty` | `!kopfgeld` | Kopfgeld auf Spieler setzen |
| `!russianroulette` | `!rr` | Russisches Roulette (2-6 Spieler) |
| `!heist` | `!überfall` | Gruppen-Überfall auf 5 Orte |

### Progression
| Command | Aliases | Beschreibung |
|---------|---------|-------------|
| `!prestige` | `!rebirth` | Reset für permanente Boni |
| `!achievements` | `!erfolge` | 16 freischaltbare Achievements |
| `!quest` | `!auftrag` | Auftrags-System |
| `!job` | `!beruf` | Karriere-System (5 Berufe) |

### Sonstiges
| Command | Aliases | Beschreibung |
|---------|---------|-------------|
| `!pet` | `!haustier` | Haustier-System |
| `!stocks` | `!börse`, `!aktien` | Aktienmarkt |
| `!drops` | `!drop` | Drop-Events aktivieren |
| `!stats` | `!statistik` | Server-Economy-Stats |
| `!admin` | `!eco` | Admin-Befehle |
| `!help` | `!hilfe` | Alle Befehle |

## Technologie

- **discord.js** v14 — Discord API
- **better-sqlite3** — Persistente Datenbank
- **Node.js** — Runtime

## Lizenz

ISC
