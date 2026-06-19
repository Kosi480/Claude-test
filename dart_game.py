#!/usr/bin/env python3
"""Ein interaktives Dart-Spiel für die Kommandozeile."""

import random
import sys


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


class Player:
    def __init__(self, name):
        self.name = name
        self.score = 501
        self.darts_thrown = 0
        self.rounds = 0
        self.stats = Statistics()

    def update_score(self, points):
        if self.score - points < 0:
            return False
        self.score -= points
        self.darts_thrown += 1
        return True


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

    round_score = 0
    for dart in range(1, 4):
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
        print(f"    -> {result} ({points} Punkte) | Runden-Summe: {round_score}")

    player.score -= round_score
    player.rounds += 1
    player.stats.record_round(round_score)
    print(f"    Neuer Stand: {player.score} Punkte")


def main():
    print("=" * 40)
    print(f"{'DART SPIEL - 501':^40}")
    print("=" * 40)

    num_players = 0
    while num_players < 1:
        try:
            num_players = int(input("\nAnzahl Spieler (1-4): "))
            if num_players < 1 or num_players > 4:
                num_players = 0
                print("Bitte 1-4 Spieler wählen.")
        except ValueError:
            print("Bitte eine Zahl eingeben.")

    players = []
    for i in range(num_players):
        name = input(f"Name Spieler {i + 1}: ").strip()
        if not name:
            name = f"Spieler {i + 1}"
        players.append(Player(name))

    board = DartBoard()

    print("\nSpiel startet! Ziel: Von 501 auf genau 0.")

    game_over = False
    while not game_over:
        display_scoreboard(players)
        for player in players:
            play_round(player, board)
            if player.score == 0:
                print(f"\n{'*' * 40}")
                print(f"  {player.name} GEWINNT mit {player.darts_thrown} Darts!")
                print(f"{'*' * 40}")
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
