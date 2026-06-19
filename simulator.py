#!/usr/bin/env python3
"""Dart-Simulator: Automatisierte Matches für statistische Analyse."""

import random
import time
from dart_game import DartBoard, Color, Statistics, SKILL_LEVELS, SKILL_ORDER


class SimPlayer:
    def __init__(self, name, spread):
        self.name = name
        self.spread = spread
        self.score = 501
        self.darts_thrown = 0
        self.rounds = 0
        self.stats = Statistics()


def sim_throw(board, spread):
    return board.throw(spread=spread)


def sim_leg(p1, p2, board, start_score=501):
    p1.score = start_score
    p2.score = start_score
    p1.darts_thrown = 0
    p2.darts_thrown = 0
    p1.rounds = 0
    p2.rounds = 0
    p1.stats = Statistics()
    p2.stats = Statistics()

    players = [p1, p2]
    while True:
        for player in players:
            round_score = 0
            for _ in range(3):
                result, points = sim_throw(board, player.spread)
                player.stats.record_throw(result, points)

                if player.score - round_score - points < 0:
                    player.stats.record_bust()
                    player.darts_thrown += 1
                    round_score = 0
                    break

                round_score += points
                player.darts_thrown += 1
                if player.score - round_score == 0:
                    break

            player.score -= round_score
            player.rounds += 1
            player.stats.record_round(round_score)

            if player.score == 0:
                return player


def run_simulation(name1, spread1, name2, spread2, num_games=100, start_score=501):
    board = DartBoard()
    results = {
        name1: {"wins": 0, "total_darts": [], "avg_rounds": [], "best_darts": float("inf")},
        name2: {"wins": 0, "total_darts": [], "avg_rounds": [], "best_darts": float("inf")},
    }

    print(f"\n{Color.muted('═' * 56)}")
    print(Color.title(f"{'MATCH-SIMULATION':^56}"))
    print(f"{Color.muted('═' * 56)}")
    print(f"  {Color.BOLD}{name1}{Color.RESET} (Spread: {spread1:.2f})")
    print(f"     vs")
    print(f"  {Color.BOLD}{name2}{Color.RESET} (Spread: {spread2:.2f})")
    print(f"  Spiele: {num_games} | Modus: {start_score}")
    print()

    bar_width = 40
    for i in range(num_games):
        p1 = SimPlayer(name1, spread1)
        p2 = SimPlayer(name2, spread2)
        winner = sim_leg(p1, p2, board, start_score)

        results[winner.name]["wins"] += 1

        for p in (p1, p2):
            results[p.name]["total_darts"].append(p.darts_thrown)
            results[p.name]["avg_rounds"].append(p.stats.average_per_round)
            if p.name == winner.name:
                results[p.name]["best_darts"] = min(
                    results[p.name]["best_darts"], p.darts_thrown
                )

        if (i + 1) % max(1, num_games // 20) == 0 or i == num_games - 1:
            pct = (i + 1) / num_games
            filled = int(pct * bar_width)
            bar = "█" * filled + "░" * (bar_width - filled)
            print(f"\r  [{bar}] {i + 1}/{num_games}", end="", flush=True)

    print("\n")

    w1 = results[name1]["wins"]
    w2 = results[name2]["wins"]
    total = w1 + w2

    print(f"{Color.muted('═' * 56)}")
    print(Color.title(f"{'ERGEBNISSE':^56}"))
    print(f"{Color.muted('═' * 56)}")

    p1_pct = (w1 / total * 100) if total > 0 else 0
    p2_pct = (w2 / total * 100) if total > 0 else 0

    bar_len = 40
    p1_bar = int(p1_pct / 100 * bar_len)
    p2_bar = bar_len - p1_bar

    print(f"\n  Siegverteilung:")
    print(f"  {Color.GREEN}{'█' * p1_bar}{Color.RESET}"
          f"{Color.RED}{'█' * p2_bar}{Color.RESET}")
    print(f"  {name1}: {Color.BOLD}{w1}{Color.RESET} ({p1_pct:.1f}%) | "
          f"{name2}: {Color.BOLD}{w2}{Color.RESET} ({p2_pct:.1f}%)")

    for name in (name1, name2):
        r = results[name]
        darts = r["total_darts"]
        avgs = r["avg_rounds"]

        if not darts:
            continue

        avg_d = sum(darts) / len(darts)
        best = r["best_darts"] if r["best_darts"] < float("inf") else "-"
        worst = max(darts)
        avg_r = sum(avgs) / len(avgs) if avgs else 0

        print(f"\n  {Color.BOLD}{name}{Color.RESET}:")
        print(f"    Siege:           {r['wins']}/{total} ({r['wins'] / total * 100:.1f}%)")
        print(f"    Ø Darts/Spiel:   {avg_d:.1f}")
        print(f"    Bestes Spiel:    {best} Darts")
        print(f"    Längstes Spiel:  {worst} Darts")
        print(f"    Ø Punkte/Runde:  {avg_r:.1f}")

    if w1 > w2:
        leader = name1
        margin = p1_pct - p2_pct
    elif w2 > w1:
        leader = name2
        margin = p2_pct - p1_pct
    else:
        leader = None
        margin = 0

    if leader:
        print(f"\n  {Color.BOLD}{Color.YELLOW}Gewinner: {leader} "
              f"(+{margin:.1f}% Vorsprung){Color.RESET}")
    else:
        print(f"\n  {Color.info('Unentschieden! Perfekt ausgeglichen.')}")

    print(f"{Color.muted('═' * 56)}")


def run_skill_comparison(num_games=50, start_score=501):
    board = DartBoard()

    print(f"\n{Color.muted('═' * 60)}")
    print(Color.title(f"{'SKILL-LEVEL-VERGLEICH':^60}"))
    print(f"{Color.muted('═' * 60)}")
    print(f"  Jedes Skill-Level spielt gegen jedes andere")
    print(f"  {num_games} Spiele pro Paarung | Modus: {start_score}")
    print()

    skills = list(SKILL_ORDER)
    win_matrix = {s: {s2: 0 for s2 in skills} for s in skills}
    avg_darts = {s: [] for s in skills}

    total_pairs = len(skills) * (len(skills) - 1) // 2
    pair_count = 0

    for i, s1 in enumerate(skills):
        for s2 in skills[i + 1:]:
            pair_count += 1
            sp1 = SKILL_LEVELS[s1]["spread"]
            sp2 = SKILL_LEVELS[s2]["spread"]
            label1 = SKILL_LEVELS[s1]["label"]
            label2 = SKILL_LEVELS[s2]["label"]

            print(f"\r  Simuliere... {pair_count}/{total_pairs}: "
                  f"{label1} vs {label2}    ", end="", flush=True)

            for _ in range(num_games):
                p1 = SimPlayer(label1, sp1)
                p2 = SimPlayer(label2, sp2)
                winner = sim_leg(p1, p2, board, start_score)

                if winner.name == label1:
                    win_matrix[s1][s2] += 1
                else:
                    win_matrix[s2][s1] += 1

                avg_darts[s1].append(p1.darts_thrown)
                avg_darts[s2].append(p2.darts_thrown)

    print(f"\r{'':60}")

    header = f"{'':>16}"
    for s in skills:
        header += f" {SKILL_LEVELS[s]['label'][:6]:>7}"
    print(f"\n  Siegrate (Zeile vs Spalte):")
    print(f"  {header}")
    print(f"  {Color.muted('─' * (16 + 7 * len(skills)))}")

    for s1 in skills:
        row = f"  {SKILL_LEVELS[s1]['label']:>14}"
        for s2 in skills:
            if s1 == s2:
                row += f" {Color.muted('  ---'):>7}"
            else:
                total = win_matrix[s1][s2] + win_matrix[s2][s1]
                if total > 0:
                    wr = win_matrix[s1][s2] / total * 100
                    if wr >= 60:
                        row += f" {Color.GREEN}{wr:>5.0f}%{Color.RESET}"
                    elif wr <= 40:
                        row += f" {Color.RED}{wr:>5.0f}%{Color.RESET}"
                    else:
                        row += f" {wr:>6.0f}%"
                else:
                    row += "      -"
        print(row)

    print(f"\n  Ø Darts/Spiel:")
    for s in skills:
        if avg_darts[s]:
            avg = sum(avg_darts[s]) / len(avg_darts[s])
            label = SKILL_LEVELS[s]["label"]
            bar_len = int(avg / 2)
            bar = "█" * min(bar_len, 30)
            print(f"    {label:<16} {Color.CYAN}{bar}{Color.RESET} {avg:.1f}")

    print(f"{Color.muted('═' * 60)}")


def simulator_menu():
    print(Color.muted("=" * 50))
    print(Color.title(f"{'DART-SIMULATOR':^50}"))
    print(Color.muted("=" * 50))

    print("\n    1) Match-Simulation (2 Spieler)")
    print("    2) Skill-Level-Vergleich (alle vs alle)")
    print("    3) Zurück")

    while True:
        choice = input("  Wahl (1-3): ").strip()
        if choice == "1":
            print(f"\n  Spieler 1:")
            name1 = input("    Name: ").strip() or "Spieler A"
            print("    Skill-Level:")
            for i, key in enumerate(SKILL_ORDER, 1):
                info = SKILL_LEVELS[key]
                print(f"      {i}) {info['label']}")
            s1 = input("    Wahl (1-5): ").strip()
            s1_idx = int(s1) - 1 if s1 in ("1", "2", "3", "4", "5") else 2
            spread1 = SKILL_LEVELS[SKILL_ORDER[s1_idx]]["spread"]

            print(f"\n  Spieler 2:")
            name2 = input("    Name: ").strip() or "Spieler B"
            print("    Skill-Level:")
            for i, key in enumerate(SKILL_ORDER, 1):
                info = SKILL_LEVELS[key]
                print(f"      {i}) {info['label']}")
            s2 = input("    Wahl (1-5): ").strip()
            s2_idx = int(s2) - 1 if s2 in ("1", "2", "3", "4", "5") else 2
            spread2 = SKILL_LEVELS[SKILL_ORDER[s2_idx]]["spread"]

            try:
                num = int(input("\n  Anzahl Spiele (10-1000): ").strip())
                num = max(10, min(1000, num))
            except ValueError:
                num = 100

            run_simulation(name1, spread1, name2, spread2, num)
            input(f"\n  {Color.muted('[Enter] zum Fortfahren...')}")
            return

        elif choice == "2":
            try:
                num = int(input("\n  Spiele pro Paarung (10-200): ").strip())
                num = max(10, min(200, num))
            except ValueError:
                num = 50
            run_skill_comparison(num)
            input(f"\n  {Color.muted('[Enter] zum Fortfahren...')}")
            return

        elif choice == "3":
            return
        print("  Bitte 1-3 wählen.")
