#!/usr/bin/env python3
"""Party-Minispiele: Killer und Shanghai."""

import random
import time
from dart_game import DartBoard, Color, throw_animation
from training import parse_hit_number


def killer_game(player_names):
    print(Color.muted("=" * 50))
    print(Color.title(f"{'KILLER':^50}"))
    print(Color.muted("=" * 50))
    print(f"\n  {Color.info('Regeln:')}")
    print("    1. Jeder Spieler wirft auf ein zufälliges Double")
    print("       um seine 'Killer-Zahl' zu bestimmen.")
    print("    2. Jeder startet mit 3 Leben.")
    print("    3. Triffst du DEIN Double, wirst du zum 'Killer'.")
    print("    4. Als Killer: Triff das Double anderer Spieler,")
    print("       um ihnen Leben zu nehmen!")
    print("    5. Letzter Überlebender gewinnt.")

    board = DartBoard()

    players = {}
    segments = random.sample(range(1, 21), min(len(player_names), 20))
    for i, name in enumerate(player_names):
        players[name] = {
            "number": segments[i],
            "lives": 3,
            "is_killer": False,
            "alive": True,
        }

    print(f"\n  {Color.title('Zugewiesene Zahlen:')}")
    for name, data in players.items():
        print(f"    {name}: {Color.BOLD}D{data['number']}{Color.RESET}")

    input(Color.info("\n  [Enter] zum Starten..."))

    round_num = 0
    while sum(1 for p in players.values() if p["alive"]) > 1:
        round_num += 1
        alive_players = [n for n, p in players.items() if p["alive"]]

        print(f"\n{Color.BOLD}{Color.MAGENTA}  === Runde {round_num} ==={Color.RESET}")
        for name in alive_players:
            data = players[name]
            hearts = "♥" * data["lives"] + "♡" * (3 - data["lives"])
            killer_tag = f" {Color.RED}[KILLER]{Color.RESET}" if data["is_killer"] else ""
            print(f"  {name}: {hearts} (D{data['number']}){killer_tag}")

        for name in alive_players:
            data = players[name]
            status = f"{Color.RED}KILLER{Color.RESET}" if data["is_killer"] else "Normal"
            print(f"\n  {Color.BOLD}{name}{Color.RESET} ist dran [{status}]")

            for dart in range(1, 4):
                if not data["alive"]:
                    break

                input(f"    Dart {dart}/3 - [Enter] zum Werfen...")
                throw_animation()
                result, points = board.throw()
                hit_num, hit_type = parse_hit_number(result)

                print(f"      -> {Color.colorize_result(result, points)}", end="")

                if hit_type == "double":
                    if hit_num == data["number"] and not data["is_killer"]:
                        data["is_killer"] = True
                        print(f" - {Color.BOLD}{Color.RED} DU BIST JETZT KILLER!{Color.RESET}")
                    elif data["is_killer"]:
                        victim = None
                        for vname, vdata in players.items():
                            if vname != name and vdata["alive"] and vdata["number"] == hit_num:
                                victim = vname
                                break
                        if victim:
                            players[victim]["lives"] -= 1
                            print(f" - {Color.warning(f'{victim} verliert ein Leben!')} "
                                  f"({players[victim]['lives']} übrig)")
                            if players[victim]["lives"] <= 0:
                                players[victim]["alive"] = False
                                print(f"      {Color.warning(f'  {victim} ist AUSGESCHIEDEN!')}")
                        else:
                            print(f" - {Color.muted('Kein Treffer auf einen Gegner')}")
                    else:
                        print(f" - {Color.muted('Du bist noch kein Killer')}")
                else:
                    print(f" - {Color.muted('Kein Double')}")

            if sum(1 for p in players.values() if p["alive"]) <= 1:
                break

    winner = [n for n, p in players.items() if p["alive"]][0]
    print(f"\n{Color.BOLD}{Color.YELLOW}{'*' * 44}")
    print(f"  {winner} GEWINNT KILLER!")
    print(f"  Überlebt nach {round_num} Runden!")
    print(f"{'*' * 44}{Color.RESET}")


def shanghai_game(player_names):
    print(Color.muted("=" * 50))
    print(Color.title(f"{'SHANGHAI':^50}"))
    print(Color.muted("=" * 50))
    print(f"\n  {Color.info('Regeln:')}")
    print("    Es wird in 7 Runden gespielt (Zahlen 15-20 + Bull).")
    print("    Pro Runde zählen NUR Treffer auf die aktuelle Zahl.")
    print("    Single = 1x, Double = 2x, Triple = 3x Punkte.")
    print("    SHANGHAI: Triffst du Single + Double + Triple")
    print("    in einer Runde, gewinnst du sofort!")

    board = DartBoard()
    shanghai_numbers = [15, 16, 17, 18, 19, 20, 25]
    scores = {name: 0 for name in player_names}

    input(Color.info("\n  [Enter] zum Starten..."))

    for round_idx, target in enumerate(shanghai_numbers):
        target_label = "Bull" if target == 25 else str(target)
        print(f"\n{Color.BOLD}{Color.MAGENTA}  === Runde {round_idx + 1}/7: Ziel = {target_label} ==={Color.RESET}")

        print(f"  {Color.muted('Punktestand:')}")
        for name in player_names:
            print(f"    {name}: {Color.BOLD}{scores[name]}{Color.RESET}")

        shanghai_winner = None

        for name in player_names:
            print(f"\n  {Color.BOLD}{name}{Color.RESET} wirft auf {Color.YELLOW}{target_label}{Color.RESET}")

            round_hits = {"single": False, "double": False, "triple": False}
            round_points = 0

            for dart in range(1, 4):
                input(f"    Dart {dart}/3 - [Enter] zum Werfen...")
                throw_animation()
                result, points = board.throw()
                hit_num, hit_type = parse_hit_number(result)

                if target == 25:
                    if result == "Bullseye":
                        earned = 50
                        round_hits["double"] = True
                        round_points += earned
                        print(f"      -> {Color.colorize_result(result, points)} "
                              f"- {Color.success(f'+{earned}!')}")
                    elif result == "Bull":
                        earned = 25
                        round_hits["single"] = True
                        round_points += earned
                        print(f"      -> {Color.colorize_result(result, points)} "
                              f"- {Color.success(f'+{earned}!')}")
                    else:
                        print(f"      -> {Color.colorize_result(result, points)} "
                              f"- {Color.muted('Kein Bull')}")
                elif hit_num == target:
                    if hit_type == "single":
                        earned = target
                        round_hits["single"] = True
                    elif hit_type == "double":
                        earned = target * 2
                        round_hits["double"] = True
                    elif hit_type == "triple":
                        earned = target * 3
                        round_hits["triple"] = True
                    else:
                        earned = target
                        round_hits["single"] = True
                    round_points += earned
                    print(f"      -> {Color.colorize_result(result, points)} "
                          f"- {Color.success(f'+{earned}!')}")
                else:
                    print(f"      -> {Color.colorize_result(result, points)} "
                          f"- {Color.muted('Zählt nicht')}")

            scores[name] += round_points
            print(f"    Runden-Punkte: {Color.BOLD}{round_points}{Color.RESET} | "
                  f"Gesamt: {Color.BOLD}{scores[name]}{Color.RESET}")

            if target != 25 and all(round_hits.values()):
                shanghai_winner = name
                print(f"\n  {Color.BOLD}{Color.YELLOW}  ★★★ SHANGHAI! {name} gewinnt sofort! ★★★{Color.RESET}")
                break

        if shanghai_winner:
            break

    print(f"\n{Color.muted('=' * 50)}")
    print(Color.title(f"{'ENDERGEBNIS':^50}"))
    print(Color.muted("=" * 50))
    sorted_scores = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    for i, (name, score) in enumerate(sorted_scores, 1):
        medal = {1: "🥇", 2: "🥈", 3: "🥉"}.get(i, "  ")
        print(f"  {medal} {name:<20} {Color.BOLD}{score:>6}{Color.RESET} Punkte")

    if shanghai_winner:
        winner = shanghai_winner
    else:
        winner = sorted_scores[0][0]

    print(f"\n{Color.BOLD}{Color.YELLOW}{'*' * 44}")
    print(f"  {winner} GEWINNT SHANGHAI!")
    print(f"  Punkte: {scores[winner]}")
    print(f"{'*' * 44}{Color.RESET}")


def minigames_menu():
    print(Color.muted("=" * 44))
    print(Color.title(f"{'PARTY-MINISPIELE':^44}"))
    print(Color.muted("=" * 44))

    print("\n  Spiel wählen:")
    print("    1) Killer (3+ Spieler empfohlen)")
    print("    2) Shanghai (2+ Spieler)")
    print("    3) Dart-Bingo (1-4 Spieler)")
    print("    4) Dart Roulette (2-6 Spieler)")
    print("    5) Dart Golf (1-4 Spieler)")
    print("    6) Dart Poker (2-6 Spieler)")
    print("    7) Math Darts (Kopfrechnen)")
    print("    8) Lucky Number (Glückszahl)")
    print("    9) Dart Blackjack (1-4 Spieler)")
    print("    w) Dart War (2-4 Spieler)")
    print("    s) Dart Slots (1 Spieler)")
    print("    a) Dart Auction (2-4 Spieler)")
    print("    m) Dart Maze (Labyrinth)")
    print("    0) Zurück")

    while True:
        choice = input("  Wahl (0-9/w/s/a): ").strip().lower()
        if choice == "0":
            return

        if choice == "3":
            from bingo import bingo_menu
            bingo_menu()
            return

        if choice == "4":
            from roulette import roulette_menu
            roulette_menu()
            return

        if choice == "5":
            from golf import golf_menu
            golf_menu()
            return

        if choice == "6":
            from poker import poker_menu
            poker_menu()
            return

        if choice == "7":
            from math_darts import math_darts_menu
            math_darts_menu()
            return

        if choice == "8":
            from lucky_number import lucky_number_menu
            lucky_number_menu()
            return

        if choice == "9":
            from blackjack import blackjack_menu
            blackjack_menu()
            return

        if choice == "w":
            from war import war_menu
            war_menu()
            return

        if choice == "s":
            from slots import slots_menu
            slots_menu()
            return

        if choice == "a":
            from auction import auction_menu
            auction_menu()
            return

        if choice == "m":
            from maze import maze_menu
            maze_menu()
            return

        if choice in ("1", "2"):
            num = 0
            min_p = 2
            while num < min_p:
                try:
                    num = int(input(f"\n  Anzahl Spieler ({min_p}-6): "))
                    if num < min_p or num > 6:
                        num = 0
                        print(f"  Bitte {min_p}-6 wählen.")
                except ValueError:
                    print("  Bitte eine Zahl eingeben.")

            names = []
            for i in range(num):
                name = input(f"  Name Spieler {i + 1}: ").strip()
                if not name:
                    name = f"Spieler {i + 1}"
                names.append(name)

            if choice == "1":
                killer_game(names)
            else:
                shanghai_game(names)
            return

        print("  Bitte 0-9/w/s/a/m wählen.")
