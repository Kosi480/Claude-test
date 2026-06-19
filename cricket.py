#!/usr/bin/env python3
"""Cricket-Spielmodus für das Dart-Spiel."""

import time
import sys
from dart_game import DartBoard, Player, CPUPlayer, Color, Statistics


CRICKET_NUMBERS = [20, 19, 18, 17, 16, 15, "Bull"]


class CricketPlayer:
    def __init__(self, player):
        self.player = player
        self.marks = {n: 0 for n in CRICKET_NUMBERS}
        self.points = 0

    @property
    def name(self):
        return self.player.name

    @property
    def is_cpu(self):
        return self.player.is_cpu

    def is_closed(self, number):
        return self.marks[number] >= 3

    def all_closed(self):
        return all(self.is_closed(n) for n in CRICKET_NUMBERS)

    def mark_symbol(self, number):
        m = self.marks[number]
        if m == 0:
            return "   "
        elif m == 1:
            return " / "
        elif m == 2:
            return " X "
        else:
            return " ⊗ "


def parse_cricket_hit(result, points):
    if result == "Bullseye":
        return ("Bull", 2)
    elif result == "Bull":
        return ("Bull", 1)
    elif result == "Miss":
        return (None, 0)

    parts = result.split()
    if len(parts) == 2:
        prefix = parts[0]
        try:
            number = int(parts[1])
        except ValueError:
            return (None, 0)
        if prefix == "Triple":
            return (number, 3)
        elif prefix == "Double":
            return (number, 2)
    elif len(parts) == 1:
        try:
            number = int(parts[0])
            return (number, 1)
        except ValueError:
            pass

    return (None, 0)


def display_cricket_board(cricket_players):
    print(f"\n{Color.muted('=' * 56)}")
    print(Color.title(f"{'CRICKET SCOREBOARD':^56}"))
    print(Color.muted("=" * 56))

    header = f"  {'':>12}"
    for cp in cricket_players:
        header += f" {cp.name:^12}"
    print(header)
    print(Color.muted("  " + "─" * (12 + 13 * len(cricket_players))))

    for number in CRICKET_NUMBERS:
        label = str(number) if isinstance(number, int) else number
        row = f"  {label:>12}"
        for cp in cricket_players:
            sym = cp.mark_symbol(number)
            if cp.is_closed(number):
                row += f" {Color.SUCCESS if hasattr(Color, 'SUCCESS') else Color.GREEN}{Color.BOLD}{sym:^12}{Color.RESET}"
            else:
                row += f" {sym:^12}"
        print(row)

    print(Color.muted("  " + "─" * (12 + 13 * len(cricket_players))))
    points_row = f"  {'Punkte':>12}"
    for cp in cricket_players:
        pts = str(cp.points)
        points_row += f" {Color.BOLD}{pts:^12}{Color.RESET}"
    print(points_row)
    print(Color.muted("=" * 56))


def apply_cricket_hit(cricket_player, all_players, number, multiplier):
    if number not in CRICKET_NUMBERS:
        return 0

    scored = 0
    for _ in range(multiplier):
        if cricket_player.marks[number] < 3:
            cricket_player.marks[number] += 1
        else:
            others_closed = all(
                cp.is_closed(number) for cp in all_players if cp is not cricket_player
            )
            if not others_closed:
                if number == "Bull":
                    scored += 25
                else:
                    scored += number

    cricket_player.points += scored
    return scored


def play_cricket_round(cp, all_players, board):
    player = cp.player
    print(f"\n{Color.BOLD}--- {player.name} ist dran ---{Color.RESET}")

    for dart in range(1, 4):
        if player.is_cpu:
            time.sleep(0.5)
            print(Color.muted(f"  Dart {dart}/3 - {player.name} wirft..."))
            time.sleep(0.3)
            result, points = player.cpu_throw()
        else:
            input(f"  Dart {dart}/3 - [Enter] zum Werfen...")
            result, points = board.throw()

        number, multiplier = parse_cricket_hit(result, points)

        if number in CRICKET_NUMBERS:
            scored = apply_cricket_hit(cp, all_players, number, multiplier)
            mark_str = "×" * min(multiplier, 3)
            if scored > 0:
                print(f"    -> {Color.colorize_result(result, points)} | "
                      f"{Color.success(f'+{scored} Punkte')} {mark_str}")
            else:
                print(f"    -> {Color.colorize_result(result, points)} | "
                      f"Markierung: {mark_str}")
        else:
            print(f"    -> {Color.colorize_result(result, points)} | "
                  f"{Color.muted('Kein Cricket-Feld')}")

        if cp.all_closed() and all(cp.points >= other.points for other in all_players):
            return True

    return False


def play_cricket(player_list):
    print(Color.muted("=" * 56))
    print(Color.title(f"{'CRICKET':^56}"))
    print(Color.muted("=" * 56))
    print(f"\n  {Color.info('Regeln:')}")
    print("    Treffe 15, 16, 17, 18, 19, 20 und Bull je 3x.")
    print("    Nach 3 Treffern kannst du Punkte auf offene")
    print("    Felder deiner Gegner sammeln.")
    print("    Wer zuerst alles schließt UND die meisten")
    print("    Punkte hat, gewinnt!")

    board = DartBoard()
    cricket_players = [CricketPlayer(p) for p in player_list]

    game_over = False
    round_num = 0
    while not game_over:
        round_num += 1
        display_cricket_board(cricket_players)

        for cp in cricket_players:
            won = play_cricket_round(cp, cricket_players, board)
            if won:
                display_cricket_board(cricket_players)
                print(f"\n{Color.BOLD}{Color.YELLOW}{'*' * 44}")
                print(f"  {cp.name} GEWINNT CRICKET!")
                print(f"  Punkte: {cp.points}")
                print(f"{'*' * 44}{Color.RESET}")
                game_over = True
                break

        if not game_over and round_num >= 50:
            print(Color.warning("\n  Maximale Rundenzahl erreicht!"))
            winner = max(cricket_players, key=lambda c: (sum(1 for n in CRICKET_NUMBERS if c.is_closed(n)), c.points))
            print(f"  {Color.success(f'{winner.name} gewinnt nach Punkten!')}")
            game_over = True

    print(Color.info("\nCricket beendet!"))
