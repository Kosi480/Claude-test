#!/usr/bin/env python3
"""Ein interaktives Dart-Spiel für die Kommandozeile."""

import json
import os
import random
import sys
import time
from datetime import datetime


class DartBoard:
    SEGMENTS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5]

    def throw(self):
        accuracy = random.gauss(0, 0.35)

        if abs(accuracy) < 0.05:
            return ("Bullseye", 50)
        elif abs(accuracy) < 0.12:
            return ("Bull", 25)

        segment_index = random.randint(0, 19)
        segment = self.SEGMENTS[segment_index]

        ring = abs(accuracy)
        if ring < 0.25:
            return (f"Triple {segment}", segment * 3)
        elif ring < 0.45:
            return (f"{segment}", segment)
        elif ring < 0.55:
            return (f"Double {segment}", segment * 2)
        elif ring < 0.7:
            return (f"{segment}", segment)
        else:
            return ("Miss", 0)


class Statistics:
    def __init__(self):
        self.throws = []
        self.round_scores = []
        self.busts = 0
        self.bullseyes = 0
        self.triples = 0
        self.doubles = 0
        self.misses = 0

    def record_throw(self, result, points):
        self.throws.append((result, points))
        if result == "Bullseye":
            self.bullseyes += 1
        elif result.startswith("Triple"):
            self.triples += 1
        elif result.startswith("Double"):
            self.doubles += 1
        elif result == "Miss":
            self.misses += 1

    def record_round(self, score):
        self.round_scores.append(score)

    def record_bust(self):
        self.busts += 1

    @property
    def average_per_round(self):
        if not self.round_scores:
            return 0.0
        return sum(self.round_scores) / len(self.round_scores)

    @property
    def highest_round(self):
        return max(self.round_scores) if self.round_scores else 0

    @property
    def highest_throw(self):
        return max((p for _, p in self.throws), default=0)

    def display(self, player_name):
        print(f"\n{'─' * 40}")
        print(f"  Statistik: {player_name}")
        print(f"{'─' * 40}")
        print(f"  Würfe gesamt:       {len(self.throws)}")
        print(f"  Durchschnitt/Runde: {self.average_per_round:.1f}")
        print(f"  Höchste Runde:      {self.highest_round}")
        print(f"  Höchster Wurf:      {self.highest_throw}")
        print(f"  Bullseyes:          {self.bullseyes}")
        print(f"  Triples:            {self.triples}")
        print(f"  Doubles:            {self.doubles}")
        print(f"  Misses:             {self.misses}")
        print(f"  Busts:              {self.busts}")
        print(f"{'─' * 40}")


GAME_MODES = {
    "301": 301,
    "501": 501,
    "701": 701,
}


class Player:
    def __init__(self, name, start_score=501, is_cpu=False):
        self.name = name
        self.score = start_score
        self.start_score = start_score
        self.darts_thrown = 0
        self.rounds = 0
        self.stats = Statistics()
        self.is_cpu = is_cpu

    def update_score(self, points):
        if self.score - points < 0:
            return False
        self.score -= points
        self.darts_thrown += 1
        return True


class CPUPlayer(Player):
    DIFFICULTIES = {
        "leicht": 0.50,
        "mittel": 0.35,
        "schwer": 0.20,
    }
    DIFFICULTY_NAMES = {
        "leicht": "Anfänger",
        "mittel": "Fortgeschritten",
        "schwer": "Profi",
    }

    def __init__(self, name, difficulty="mittel", start_score=501):
        super().__init__(name, start_score=start_score, is_cpu=True)
        self.difficulty = difficulty
        self.spread = self.DIFFICULTIES[difficulty]

    def cpu_throw(self):
        accuracy = random.gauss(0, self.spread)

        if abs(accuracy) < 0.05:
            return ("Bullseye", 50)
        elif abs(accuracy) < 0.12:
            return ("Bull", 25)

        segments = DartBoard.SEGMENTS
        if self.difficulty == "schwer":
            target = 20
            nearby = [20, 1, 5]
            segment = random.choices(
                [target] + nearby,
                weights=[0.6, 0.15, 0.15, 0.1],
            )[0]
        elif self.difficulty == "mittel":
            segment = random.choices(
                segments,
                weights=[3 if s >= 15 else 1 for s in segments],
            )[0]
        else:
            segment = random.choice(segments)

        ring = abs(accuracy)
        if ring < 0.25:
            return (f"Triple {segment}", segment * 3)
        elif ring < 0.45:
            return (f"{segment}", segment)
        elif ring < 0.55:
            return (f"Double {segment}", segment * 2)
        elif ring < 0.7:
            return (f"{segment}", segment)
        else:
            return ("Miss", 0)


CHECKOUTS = {
    170: "T20 T20 Bull",
    167: "T20 T19 Bull",
    164: "T20 T18 Bull",
    161: "T20 T17 Bull",
    160: "T20 T20 D20",
    158: "T20 T20 D19",
    157: "T20 T19 D20",
    156: "T20 T20 D18",
    155: "T20 T19 D19",
    154: "T20 T18 D20",
    153: "T20 T19 D18",
    152: "T20 T20 D16",
    151: "T20 T17 D20",
    150: "T20 T18 D18",
    149: "T20 T19 D16",
    148: "T20 T16 D20",
    147: "T20 T17 D18",
    146: "T20 T18 D16",
    145: "T20 T15 D20",
    144: "T20 T20 D12",
    143: "T20 T17 D16",
    142: "T20 T14 D20",
    141: "T20 T19 D12",
    140: "T20 T20 D10",
    139: "T20 T13 D20",
    138: "T20 T18 D12",
    137: "T20 T19 D10",
    136: "T20 T20 D8",
    135: "T20 T17 D12",
    134: "T20 T14 D16",
    133: "T20 T19 D8",
    132: "T20 T16 D12",
    131: "T20 T13 D16",
    130: "T20 T18 D8",
    129: "T19 T16 D12",
    128: "T18 T14 D16",
    127: "T20 T17 D8",
    126: "T19 T19 D6",
    125: "T20 T15 D10",
    124: "T20 T16 D8",
    123: "T19 T16 D9",
    122: "T18 T20 D4",
    121: "T20 T11 D14",
    120: "T20 20 D20",
    119: "T19 T12 D13",
    118: "T20 18 D20",
    117: "T20 17 D20",
    116: "T20 16 D20",
    115: "T20 15 D20",
    114: "T20 14 D20",
    113: "T20 13 D20",
    112: "T20 12 D20",
    111: "T20 11 D20",
    110: "T20 10 D20",
    109: "T20 9 D20",
    108: "T20 8 D20",
    107: "T19 10 D20",
    106: "T20 6 D20",
    105: "T20 5 D20",
    104: "T18 10 D20",
    103: "T19 6 D20",
    102: "T20 2 D20",
    101: "T17 10 D20",
    100: "T20 D20",
    99: "T19 2 D20",
    98: "T20 D19",
    97: "T19 D20",
    96: "T20 D18",
    95: "T19 D19",
    94: "T18 D20",
    93: "T19 D18",
    92: "T20 D16",
    91: "T17 D20",
    90: "T18 D18",
    89: "T19 D16",
    88: "T16 D20",
    87: "T17 D18",
    86: "T18 D16",
    85: "T15 D20",
    84: "T20 D12",
    83: "T17 D16",
    82: "T14 D20",
    81: "T19 D12",
    80: "T20 D10",
    79: "T13 D20",
    78: "T18 D12",
    77: "T19 D10",
    76: "T20 D8",
    75: "T17 D12",
    74: "T14 D16",
    73: "T19 D8",
    72: "T16 D12",
    71: "T13 D16",
    70: "T18 D8",
    69: "T19 D6",
    68: "T20 D4",
    67: "T17 D8",
    66: "T10 D18",
    65: "T19 D4",
    64: "T16 D8",
    63: "T13 D12",
    62: "T10 D16",
    61: "T15 D8",
    60: "20 D20",
    59: "19 D20",
    58: "18 D20",
    57: "17 D20",
    56: "16 D20",
    55: "15 D20",
    54: "14 D20",
    53: "13 D20",
    52: "12 D20",
    51: "11 D20",
    50: "Bull",
    49: "9 D20",
    48: "8 D20",
    47: "7 D20",
    46: "6 D20",
    45: "13 D16",
    44: "4 D20",
    43: "3 D20",
    42: "10 D16",
    41: "9 D16",
    40: "D20",
    39: "7 D16",
    38: "D19",
    36: "D18",
    34: "D17",
    32: "D16",
    30: "D15",
    28: "D14",
    26: "D13",
    24: "D12",
    22: "D11",
    20: "D10",
    18: "D9",
    16: "D8",
    14: "D7",
    12: "D6",
    10: "D5",
    8: "D4",
    6: "D3",
    4: "D2",
    2: "D1",
}


def show_checkout_hint(remaining):
    if remaining in CHECKOUTS:
        print(f"    ** CHECKOUT: {CHECKOUTS[remaining]} **")
    elif remaining <= 170:
        print(f"    (Kein Standard-Checkout für {remaining})")


def display_scoreboard(players):
    print("\n" + "=" * 40)
    print(f"{'SCOREBOARD':^40}")
    print("=" * 40)
    for p in players:
        print(f"  {p.name:<20} {p.score:>5} Punkte")
    print("=" * 40)


def play_round(player, board):
    print(f"\n--- {player.name} ist dran (Runde {player.rounds + 1}) ---")
    print(f"    Verbleibend: {player.score} Punkte")
    if player.score <= 170 and not player.is_cpu:
        show_checkout_hint(player.score)

    round_score = 0
    for dart in range(1, 4):
        if player.is_cpu:
            time.sleep(0.5)
            print(f"  Dart {dart}/3 - {player.name} wirft...")
            time.sleep(0.3)
            result, points = player.cpu_throw()
        else:
            input(f"  Dart {dart}/3 - [Enter] zum Werfen...")
            result, points = board.throw()

        player.stats.record_throw(result, points)

        if player.score - round_score - points < 0:
            print(f"    -> {result} ({points} Punkte) - BUST! Runde ungültig!")
            player.stats.record_bust()
            player.stats.record_round(0)
            return

        round_score += points
        player.darts_thrown += 1
        remaining_after = player.score - round_score
        print(f"    -> {result} ({points} Punkte) | Runden-Summe: {round_score}")
        if remaining_after <= 170 and remaining_after > 0 and not player.is_cpu and dart < 3:
            show_checkout_hint(remaining_after)

    player.score -= round_score
    player.rounds += 1
    player.stats.record_round(round_score)
    print(f"    Neuer Stand: {player.score} Punkte")


HIGHSCORE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "highscores.json")
CPU_NAMES = ["Robo-Phil", "DartBot 3000", "KI-Taylor", "CyberBull"]


class Highscores:
    MAX_ENTRIES = 10

    @staticmethod
    def load():
        if os.path.exists(HIGHSCORE_FILE):
            with open(HIGHSCORE_FILE, "r") as f:
                return json.load(f)
        return []

    @staticmethod
    def save(entries):
        with open(HIGHSCORE_FILE, "w") as f:
            json.dump(entries, f, indent=2, ensure_ascii=False)

    @classmethod
    def add_entry(cls, name, darts, avg_round, date=None):
        entries = cls.load()
        entries.append({
            "name": name,
            "darts": darts,
            "avg_round": round(avg_round, 1),
            "date": date or datetime.now().strftime("%Y-%m-%d %H:%M"),
        })
        entries.sort(key=lambda e: e["darts"])
        entries = entries[:cls.MAX_ENTRIES]
        cls.save(entries)
        return entries

    @classmethod
    def display(cls):
        entries = cls.load()
        print(f"\n{'=' * 50}")
        print(f"{'HIGHSCORES - Top 10':^50}")
        print(f"{'=' * 50}")
        if not entries:
            print("  Noch keine Einträge vorhanden.")
        else:
            print(f"  {'#':<4} {'Name':<18} {'Darts':>6} {'Avg/Rnd':>8} {'Datum':>12}")
            print(f"  {'─' * 46}")
            for i, e in enumerate(entries, 1):
                print(f"  {i:<4} {e['name']:<18} {e['darts']:>6} {e['avg_round']:>8.1f} {e['date']:>12}")
        print(f"{'=' * 50}")


def choose_difficulty():
    print("\n  KI-Schwierigkeit:")
    print("    1) Leicht   (Anfänger)")
    print("    2) Mittel   (Fortgeschritten)")
    print("    3) Schwer   (Profi)")
    while True:
        choice = input("  Wahl (1-3): ").strip()
        if choice == "1":
            return "leicht"
        elif choice == "2":
            return "mittel"
        elif choice == "3":
            return "schwer"
        print("  Bitte 1, 2 oder 3 wählen.")


def choose_game_mode():
    print("\n  Punkte-Modus:")
    print("    1) 301  (Kurzes Spiel)")
    print("    2) 501  (Standard)")
    print("    3) 701  (Langes Spiel)")
    while True:
        choice = input("  Wahl (1-3): ").strip()
        if choice == "1":
            return 301
        elif choice == "2":
            return 501
        elif choice == "3":
            return 701
        print("  Bitte 1, 2 oder 3 wählen.")


def main():
    print("=" * 40)
    print(f"{'DART SPIEL':^40}")
    print("=" * 40)

    print("\n  Hauptmenü:")
    print("    1) Neues Spiel")
    print("    2) Highscores anzeigen")
    while True:
        menu = input("  Wahl (1-2): ").strip()
        if menu == "2":
            Highscores.display()
            input("\n  [Enter] zum Fortfahren...")
        if menu in ("1", "2"):
            if menu == "1":
                break
            continue
        print("  Bitte 1 oder 2 wählen.")

    start_score = choose_game_mode()

    print("\n  Gegner-Modus:")
    print("    1) Nur Menschen")
    print("    2) Gegen KI-Gegner")
    while True:
        mode = input("  Wahl (1-2): ").strip()
        if mode in ("1", "2"):
            break
        print("  Bitte 1 oder 2 wählen.")

    num_players = 0
    while num_players < 1:
        try:
            max_p = 4 if mode == "1" else 3
            num_players = int(input(f"\nAnzahl menschliche Spieler (1-{max_p}): "))
            if num_players < 1 or num_players > max_p:
                num_players = 0
                print(f"Bitte 1-{max_p} Spieler wählen.")
        except ValueError:
            print("Bitte eine Zahl eingeben.")

    players = []
    for i in range(num_players):
        name = input(f"Name Spieler {i + 1}: ").strip()
        if not name:
            name = f"Spieler {i + 1}"
        players.append(Player(name, start_score=start_score))

    if mode == "2":
        num_cpu = 0
        max_cpu = 4 - num_players
        while num_cpu < 1:
            try:
                num_cpu = int(input(f"\nAnzahl KI-Gegner (1-{max_cpu}): "))
                if num_cpu < 1 or num_cpu > max_cpu:
                    num_cpu = 0
                    print(f"Bitte 1-{max_cpu} wählen.")
            except ValueError:
                print("Bitte eine Zahl eingeben.")

        difficulty = choose_difficulty()
        for i in range(num_cpu):
            cpu_name = CPU_NAMES[i % len(CPU_NAMES)]
            diff_label = CPUPlayer.DIFFICULTY_NAMES[difficulty]
            cpu = CPUPlayer(f"{cpu_name} ({diff_label})", difficulty, start_score=start_score)
            players.append(cpu)

    board = DartBoard()

    print(f"\nSpiel startet! Modus: {start_score} - Ziel: Von {start_score} auf genau 0.")

    game_over = False
    while not game_over:
        display_scoreboard(players)
        for player in players:
            play_round(player, board)
            if player.score == 0:
                print(f"\n{'*' * 40}")
                print(f"  {player.name} GEWINNT mit {player.darts_thrown} Darts!")
                print(f"{'*' * 40}")
                if not player.is_cpu:
                    Highscores.add_entry(
                        player.name,
                        player.darts_thrown,
                        player.stats.average_per_round,
                    )
                    print("  Ergebnis in Highscores gespeichert!")
                game_over = True
                break

    print("\n" + "=" * 40)
    print(f"{'ENDSTATISTIKEN':^40}")
    print("=" * 40)
    for player in players:
        player.stats.display(player.name)

    print("\nDanke fürs Spielen!")


if __name__ == "__main__":
    main()
