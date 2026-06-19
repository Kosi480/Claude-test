#!/usr/bin/env python3
"""Penalty Shootout: Elfmeterschießen-inspiriertes 1v1 Dart-Duell."""

import random
from dart_game import DartBoard, Color, throw_animation


PENALTY_TARGETS = [
    {"name": "Oben Links", "match": ["Triple 20", "20", "Double 20"], "difficulty": "mittel"},
    {"name": "Oben Rechts", "match": ["Triple 18", "18", "Double 18"], "difficulty": "mittel"},
    {"name": "Mitte", "match": ["Bull", "Bullseye"], "difficulty": "schwer"},
    {"name": "Unten Links", "match": ["Triple 19", "19", "Double 19"], "difficulty": "mittel"},
    {"name": "Unten Rechts", "match": ["Triple 16", "16", "Double 16"], "difficulty": "mittel"},
    {"name": "Ecke Oben", "match": ["Triple 17", "Double 17"], "difficulty": "schwer"},
    {"name": "Ecke Unten", "match": ["Triple 15", "Double 15"], "difficulty": "schwer"},
]


def take_penalty(board, player_name, round_num):
    targets = random.sample(PENALTY_TARGETS, 3)

    print(f"\n    {Color.BOLD}{player_name} schießt:{Color.RESET}")
    print(f"    Wähle eine Ecke:")
    for i, t in enumerate(targets, 1):
        diff_color = Color.YELLOW if t["difficulty"] == "schwer" else Color.GREEN
        print(f"      {i}) {t['name']} ({diff_color}{t['difficulty']}{Color.RESET})")

    choice = input("    Wahl (1-3): ").strip()
    try:
        idx = int(choice) - 1
        if idx < 0 or idx >= 3:
            idx = 0
    except ValueError:
        idx = 0

    chosen = targets[idx]

    input(f"    Schuss auf {Color.BOLD}{chosen['name']}{Color.RESET} [Enter]...")
    throw_animation()
    result, points = board.throw()

    is_goal = result in chosen["match"]

    if is_goal:
        print(f"      -> {Color.colorize_result(result, points)} "
              f"{Color.GREEN}{Color.BOLD}TOR!!!{Color.RESET}")
    else:
        close = any(
            result.split()[-1] == m.split()[-1] if len(result.split()) > 0 and len(m.split()) > 0 else False
            for m in chosen["match"]
        )
        if close:
            print(f"      -> {Color.colorize_result(result, points)} "
                  f"{Color.YELLOW}Knapp daneben!{Color.RESET}")
        else:
            print(f"      -> {Color.colorize_result(result, points)} "
                  f"{Color.RED}Verschossen!{Color.RESET}")

    return is_goal


def run_penalty_shootout(p1_name, p2_name):
    board = DartBoard()

    print(f"\n{Color.muted('═' * 50)}")
    print(Color.title(f"{'PENALTY SHOOTOUT':^50}"))
    print(f"{Color.muted('═' * 50)}")
    print(f"  {Color.BOLD}{p1_name}{Color.RESET} vs {Color.BOLD}{p2_name}{Color.RESET}")
    print(f"  5 Schüsse pro Spieler")
    print(f"  {Color.info('Wähle deine Ecke und triff!')}")
    print(f"{Color.muted('═' * 50)}")

    p1_goals = 0
    p2_goals = 0
    p1_results = []
    p2_results = []

    for r in range(1, 6):
        print(f"\n  {Color.BOLD}{Color.YELLOW}═══ Runde {r}/5 ═══{Color.RESET}")

        p1_bar = "".join(f"{Color.GREEN}●{Color.RESET}" if g else f"{Color.RED}○{Color.RESET}" for g in p1_results)
        p2_bar = "".join(f"{Color.GREEN}●{Color.RESET}" if g else f"{Color.RED}○{Color.RESET}" for g in p2_results)
        if p1_results:
            print(f"  {p1_name}: {p1_bar} ({p1_goals})")
            print(f"  {p2_name}: {p2_bar} ({p2_goals})")

        g1 = take_penalty(board, p1_name, r)
        p1_results.append(g1)
        if g1:
            p1_goals += 1

        remaining = 5 - r
        if p2_goals + remaining + 1 < p1_goals and r >= 3:
            print(f"\n  {Color.muted(f'{p2_name} kann nicht mehr aufholen.')}")
            for _ in range(remaining + 1):
                p2_results.append(False)
            for _ in range(remaining):
                p1_results.append(False)
            break

        g2 = take_penalty(board, p2_name, r)
        p2_results.append(g2)
        if g2:
            p2_goals += 1

        remaining = 5 - r
        if p1_goals + remaining < p2_goals and r >= 3:
            print(f"\n  {Color.muted(f'{p1_name} kann nicht mehr aufholen.')}")
            for _ in range(remaining):
                p1_results.append(False)
            for _ in range(remaining):
                p2_results.append(False)
            break

    if p1_goals == p2_goals:
        print(f"\n  {Color.BOLD}{Color.YELLOW}SUDDEN DEATH!{Color.RESET}")
        sd_round = 0

        while p1_goals == p2_goals and sd_round < 20:
            sd_round += 1
            print(f"\n  {Color.RED}Sudden Death Runde {sd_round}{Color.RESET}")

            g1 = take_penalty(board, p1_name, 5 + sd_round)
            if g1:
                p1_goals += 1
            p1_results.append(g1)

            g2 = take_penalty(board, p2_name, 5 + sd_round)
            if g2:
                p2_goals += 1
            p2_results.append(g2)

            if g1 and not g2:
                break
            if not g1 and g2:
                break

    winner = p1_name if p1_goals > p2_goals else p2_name

    print(f"\n{Color.muted('═' * 50)}")
    print(Color.title(f"{'ENDERGEBNIS':^50}"))
    print(f"{Color.muted('═' * 50)}")

    p1_bar = " ".join(f"{Color.GREEN}●{Color.RESET}" if g else f"{Color.RED}○{Color.RESET}" for g in p1_results)
    p2_bar = " ".join(f"{Color.GREEN}●{Color.RESET}" if g else f"{Color.RED}○{Color.RESET}" for g in p2_results)

    print(f"\n  {Color.BOLD}{p1_name}{Color.RESET}: {p1_bar}  = {Color.BOLD}{p1_goals}{Color.RESET}")
    print(f"  {Color.BOLD}{p2_name}{Color.RESET}: {p2_bar}  = {Color.BOLD}{p2_goals}{Color.RESET}")

    print(f"\n  {Color.BOLD}{Color.YELLOW}⚽ {winner} gewinnt das Elfmeterschießen! ⚽{Color.RESET}")
    print(f"  Endstand: {p1_goals} - {p2_goals}")
    print(f"{Color.muted('═' * 50)}")

    return winner


def penalty_menu():
    print(Color.muted("=" * 50))
    print(Color.title(f"{'PENALTY SHOOTOUT':^50}"))
    print(Color.muted("=" * 50))

    print(f"\n  {Color.info('Elfmeterschießen mit Darts!')}")
    print("  5 Schüsse pro Spieler, Sudden Death bei Gleichstand.\n")

    p1 = input("  Spieler 1: ").strip() or "Heim"
    p2 = input("  Spieler 2: ").strip() or "Gast"

    input(f"\n  {Color.muted('[Enter] zum Starten...')}")

    run_penalty_shootout(p1, p2)
    input(f"\n  {Color.muted('[Enter] zum Fortfahren...')}")
