#!/usr/bin/env python3
"""Turnier-Bracket-System mit visueller Darstellung."""

import random
from dart_game import (
    DartBoard, Color, Player, Statistics,
    play_leg, choose_skill, SKILL_LEVELS,
)


def create_bracket(player_names, seeded=True):
    if seeded:
        try:
            from leaderboard import Leaderboard
            lb = Leaderboard.load()
            def elo_key(name):
                return lb.get(name, {}).get("elo", 1000)
            player_names = sorted(player_names, key=elo_key, reverse=True)
        except ImportError:
            pass
    else:
        random.shuffle(player_names)

    size = len(player_names)
    if size not in (4, 8):
        while len(player_names) < 8:
            player_names.append(None)
        size = 8

    rounds_needed = 0
    s = size
    while s > 1:
        s //= 2
        rounds_needed += 1

    matchups = []
    for i in range(0, size, 2):
        matchups.append((player_names[i], player_names[i + 1]))

    return {
        "players": player_names,
        "size": size,
        "rounds_total": rounds_needed,
        "current_round": 1,
        "brackets": [matchups],
        "results": [],
    }


def display_bracket(bracket):
    print(f"\n{Color.muted('═' * 60)}")
    print(Color.title(f"{'TURNIER-BRACKET':^60}"))
    print(f"{Color.muted('═' * 60)}")

    round_names = {1: "Viertelfinale", 2: "Halbfinale", 3: "Finale"}
    if bracket["size"] == 4:
        round_names = {1: "Halbfinale", 2: "Finale"}

    for r_idx, round_matchups in enumerate(bracket["brackets"]):
        r_num = r_idx + 1
        r_name = round_names.get(r_num, f"Runde {r_num}")

        if r_num <= len(bracket["results"]):
            status = f"{Color.GREEN}✓{Color.RESET}"
        elif r_num == bracket["current_round"]:
            status = f"{Color.YELLOW}►{Color.RESET}"
        else:
            status = f"{Color.GRAY}○{Color.RESET}"

        print(f"\n  {status} {Color.BOLD}{r_name}{Color.RESET}")
        print(f"  {Color.muted('─' * 40)}")

        for i, (p1, p2) in enumerate(round_matchups):
            name1 = p1 if p1 else "BYE"
            name2 = p2 if p2 else "BYE"

            won1 = won2 = False
            if r_num <= len(bracket["results"]):
                winner = bracket["results"][r_idx][i] if i < len(bracket["results"][r_idx]) else None
                if winner == p1:
                    won1 = True
                elif winner == p2:
                    won2 = True

            n1_fmt = f"{Color.GREEN}{Color.BOLD}{name1}{Color.RESET}" if won1 else \
                     (f"{Color.muted(name1)}" if won2 else name1)
            n2_fmt = f"{Color.GREEN}{Color.BOLD}{name2}{Color.RESET}" if won2 else \
                     (f"{Color.muted(name2)}" if won1 else name2)

            print(f"    Match {i + 1}: {n1_fmt:>20} vs {n2_fmt:<20}")

    print(f"{Color.muted('═' * 60)}")


def play_bracket_match(p1_name, p2_name, start_score, skill):
    if p1_name is None:
        return p2_name
    if p2_name is None:
        return p1_name

    print(f"\n{Color.BOLD}{Color.MAGENTA}{'*' * 50}")
    print(f"  MATCH: {p1_name} vs {p2_name}")
    print(f"{'*' * 50}{Color.RESET}")

    spread = SKILL_LEVELS[skill]["spread"]
    player1 = Player(p1_name, start_score=start_score, skill=skill)
    player2 = Player(p2_name, start_score=start_score, skill=skill)
    players = [player1, player2]
    board = DartBoard()

    input(Color.info("  [Enter] zum Starten..."))

    winner = play_leg(players, board, start_score,
                      leg_label=f"{p1_name} vs {p2_name}")

    print(f"\n  {Color.success(f'{winner.name} gewinnt das Match!')}")
    input(Color.muted("  [Enter] zum Fortfahren..."))

    return winner.name


def run_tournament(player_names, start_score=501, seeded=True):
    print(f"\n{Color.muted('═' * 60)}")
    print(Color.title(f"{'BRACKET-TURNIER':^60}"))
    print(f"{Color.muted('═' * 60)}")
    print(f"  Spieler: {len(player_names)}")
    print(f"  Modus:   {start_score}")
    seed_text = "Gesetzt (nach Elo)" if seeded else "Zufällig"
    print(f"  Setzung: {seed_text}")

    skill = choose_skill()

    bracket = create_bracket(list(player_names), seeded)
    display_bracket(bracket)

    for round_num in range(1, bracket["rounds_total"] + 1):
        bracket["current_round"] = round_num

        round_names = {1: "Viertelfinale", 2: "Halbfinale", 3: "Finale"}
        if bracket["size"] == 4:
            round_names = {1: "Halbfinale", 2: "Finale"}
        r_name = round_names.get(round_num, f"Runde {round_num}")

        print(f"\n{Color.BOLD}{Color.YELLOW}{'=' * 50}")
        print(f"  {r_name}")
        print(f"{'=' * 50}{Color.RESET}")

        current_matchups = bracket["brackets"][-1] if round_num > 1 else bracket["brackets"][0]
        round_winners = []

        for i, (p1, p2) in enumerate(current_matchups):
            winner = play_bracket_match(p1, p2, start_score, skill)
            round_winners.append(winner)

        bracket["results"].append(round_winners)

        if round_num < bracket["rounds_total"]:
            next_matchups = []
            for i in range(0, len(round_winners), 2):
                w1 = round_winners[i]
                w2 = round_winners[i + 1] if i + 1 < len(round_winners) else None
                next_matchups.append((w1, w2))
            bracket["brackets"].append(next_matchups)

        display_bracket(bracket)

    champion = bracket["results"][-1][0]
    print(f"\n{Color.BOLD}{Color.YELLOW}")
    print(f"  {'★' * 50}")
    print(f"  {'':^50}")
    print(f"  {'🏆 TURNIER-SIEGER 🏆':^50}")
    print(f"  {champion:^50}")
    print(f"  {'':^50}")
    print(f"  {'★' * 50}")
    print(f"{Color.RESET}")

    return champion


def bracket_menu():
    print(Color.muted("=" * 50))
    print(Color.title(f"{'BRACKET-TURNIER':^50}"))
    print(Color.muted("=" * 50))

    print("\n  Turniergröße:")
    print("    1) 4 Spieler")
    print("    2) 8 Spieler")
    print("    3) Zurück")

    while True:
        choice = input("  Wahl (1-3): ").strip()
        if choice == "3":
            return
        if choice in ("1", "2"):
            break
        print("  Bitte 1-3 wählen.")

    num = 4 if choice == "1" else 8

    print("\n  Setzung:")
    print("    1) Nach Elo (falls vorhanden)")
    print("    2) Zufällig")
    seed_choice = input("  Wahl (1-2): ").strip()
    seeded = seed_choice != "2"

    print("\n  Punktemodus:")
    print("    1) 301")
    print("    2) 501")
    while True:
        sc = input("  Wahl (1-2): ").strip()
        if sc == "1":
            start_score = 301
            break
        elif sc == "2":
            start_score = 501
            break
        print("  Bitte 1 oder 2 wählen.")

    names = []
    for i in range(num):
        name = input(f"  Name Spieler {i + 1}: ").strip()
        if not name:
            name = f"Spieler {i + 1}"
        names.append(name)

    run_tournament(names, start_score, seeded)
    input(f"\n  {Color.muted('[Enter] zum Fortfahren...')}")
