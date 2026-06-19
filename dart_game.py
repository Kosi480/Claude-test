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


class Player:
    def __init__(self, name):
        self.name = name
        self.score = 501
        self.darts_thrown = 0
        self.rounds = 0

    def update_score(self, points):
        if self.score - points < 0:
            return False  # Bust
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

        if player.score - round_score - points < 0:
            print(f"    -> {result} ({points} Punkte) - BUST! Runde ungültig!")
            return

        round_score += points
        player.darts_thrown += 1
        print(f"    -> {result} ({points} Punkte) | Runden-Summe: {round_score}")

    player.score -= round_score
    player.rounds += 1
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

    print("\nDanke fürs Spielen!")


if __name__ == "__main__":
    main()
