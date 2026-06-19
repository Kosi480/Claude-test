#!/usr/bin/env python3
"""Lucky Number: Jeder Spieler hat eine Glückszahl mit Bonus-Multiplikator."""

import random
from dart_game import DartBoard, Color, throw_animation


def parse_hit(result, points):
    if result == "Bullseye":
        return 25, "bullseye", 50
    elif result == "Bull":
        return 25, "bull", 25
    elif result == "Miss":
        return 0, "miss", 0

    parts = result.split()
    if len(parts) == 2:
        try:
            num = int(parts[1])
        except ValueError:
            return 0, "miss", 0
        if parts[0] == "Triple":
            return num, "triple", points
        elif parts[0] == "Double":
            return num, "double", points
    elif len(parts) == 1:
        try:
            num = int(parts[0])
            return num, "single", points
        except ValueError:
            pass
    return 0, "miss", 0


def run_lucky_number(player_names, num_rounds=8):
    board = DartBoard()

    lucky_numbers = {}
    for name in player_names:
        lucky_numbers[name] = random.randint(1, 20)

    scores = {p: 0 for p in player_names}
    lucky_hits = {p: 0 for p in player_names}
    bonus_points = {p: 0 for p in player_names}

    print(f"\n{Color.muted('═' * 50)}")
    print(Color.title(f"{'LUCKY NUMBER':^50}"))
    print(f"{Color.muted('═' * 50)}")
    print(f"  Spieler: {', '.join(player_names)}")
    print(f"  Runden:  {num_rounds}")
    print(f"  {Color.info('Jeder hat eine geheime Glückszahl!')}")
    print(f"  Treffer auf die Glückszahl = x3 Bonus!")
    print(f"{Color.muted('═' * 50)}")

    for name in player_names:
        print(f"\n  {Color.BOLD}{name}{Color.RESET}: Deine Glückszahl ist "
              f"{Color.YELLOW}{Color.BOLD}{lucky_numbers[name]}{Color.RESET}!")

    input(f"\n  {Color.muted('[Enter] zum Starten...')}")

    for r in range(1, num_rounds + 1):
        print(f"\n  {Color.BOLD}{Color.YELLOW}═══ Runde {r}/{num_rounds} ═══{Color.RESET}")

        for name in player_names:
            lucky = lucky_numbers[name]
            print(f"\n  {Color.BOLD}{name}{Color.RESET} (Glückszahl: "
                  f"{Color.YELLOW}{lucky}{Color.RESET})")

            round_score = 0
            for d in range(1, 4):
                input(f"    Dart {d}/3 [Enter]...")
                throw_animation()
                result, points = board.throw()

                hit_num, hit_type, raw_pts = parse_hit(result, points)

                if hit_num == lucky:
                    boosted = raw_pts * 3
                    bonus = boosted - raw_pts
                    round_score += boosted
                    lucky_hits[name] += 1
                    bonus_points[name] += bonus
                    print(f"      -> {Color.colorize_result(result, points)} "
                          f"{Color.YELLOW}{Color.BOLD}LUCKY x3! (+{bonus} Bonus = {boosted}){Color.RESET}")
                else:
                    round_score += raw_pts
                    print(f"      -> {Color.colorize_result(result, points)}")

            scores[name] += round_score
            print(f"    Runde: {round_score} | Gesamt: {Color.BOLD}{scores[name]}{Color.RESET}")

        print(f"\n  {Color.muted('Stand:')}")
        sorted_scores = sorted(scores.items(), key=lambda x: -x[1])
        for i, (name, pts) in enumerate(sorted_scores):
            lh = lucky_hits[name]
            marker = f" {Color.YELLOW}★{Color.RESET}" if i == 0 else ""
            print(f"    {i+1}. {name}: {Color.BOLD}{pts}{Color.RESET} "
                  f"(Lucky: {lh}x){marker}")

    print(f"\n{Color.muted('═' * 50)}")
    print(Color.title(f"{'LUCKY NUMBER - ERGEBNIS':^50}"))
    print(f"{Color.muted('═' * 50)}")

    final = sorted(scores.items(), key=lambda x: -x[1])
    medals = ["🍀", "🥈", "🥉"]

    for i, (name, pts) in enumerate(final):
        medal = medals[i] if i < 3 else f"  {i+1}."
        lucky = lucky_numbers[name]
        lh = lucky_hits[name]
        bp = bonus_points[name]
        print(f"  {medal} {Color.BOLD}{name}{Color.RESET}: {pts} Pkt "
              f"| Glückszahl: {lucky} | Lucky-Treffer: {lh} (+{bp} Bonus)")

    winner = final[0][0]
    most_lucky = max(lucky_hits.items(), key=lambda x: x[1])

    print(f"\n  {Color.BOLD}{Color.YELLOW}🍀 {winner} gewinnt Lucky Number! 🍀{Color.RESET}")
    if most_lucky[0] != winner and most_lucky[1] > 0:
        print(f"  {Color.info(f'Glücklichster Spieler: {most_lucky[0]} ({most_lucky[1]} Lucky-Treffer)')}")

    print(f"{Color.muted('═' * 50)}")
    return winner


def lucky_number_menu():
    print(Color.muted("=" * 50))
    print(Color.title(f"{'LUCKY NUMBER':^50}"))
    print(Color.muted("=" * 50))

    print(f"\n  {Color.info('Jeder bekommt eine geheime Glückszahl!')}")
    print("  Treffer darauf bringen x3 Punkte.\n")

    try:
        num = int(input("  Anzahl Spieler (2-6): ").strip())
        num = max(2, min(6, num))
    except ValueError:
        num = 2

    names = []
    for i in range(num):
        name = input(f"  Name Spieler {i + 1}: ").strip()
        if not name:
            name = f"Spieler {i + 1}"
        names.append(name)

    try:
        rounds = int(input("\n  Runden (5-15): ").strip())
        rounds = max(5, min(15, rounds))
    except ValueError:
        rounds = 8

    input(f"\n  {Color.muted('[Enter] zum Starten...')}")

    run_lucky_number(names, rounds)
    input(f"\n  {Color.muted('[Enter] zum Fortfahren...')}")
