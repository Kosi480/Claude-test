#!/usr/bin/env python3
"""Dart Reaction: Reaktionstest - triff das Ziel so schnell wie möglich."""

import random
import time
from dart_game import DartBoard, Color, throw_animation
from training import parse_hit_number


TARGETS = [
    {"label": "Single 20", "match_num": 20, "match_type": "single", "difficulty": 1},
    {"label": "Single 19", "match_num": 19, "match_type": "single", "difficulty": 1},
    {"label": "Single 18", "match_num": 18, "match_type": "single", "difficulty": 1},
    {"label": "Double 16", "match_num": 16, "match_type": "double", "difficulty": 2},
    {"label": "Double 20", "match_num": 20, "match_type": "double", "difficulty": 2},
    {"label": "Triple 20", "match_num": 20, "match_type": "triple", "difficulty": 3},
    {"label": "Triple 19", "match_num": 19, "match_type": "triple", "difficulty": 3},
    {"label": "Bull", "match_num": 25, "match_type": "bull", "difficulty": 2},
    {"label": "Bullseye", "match_num": 50, "match_type": "bullseye", "difficulty": 3},
]


def check_target_hit(result, target):
    hit_num, hit_type = parse_hit_number(result)

    if target["match_type"] == "bullseye":
        return result == "Bullseye"
    if target["match_type"] == "bull":
        return result in ("Bull", "Bullseye")
    return hit_num == target["match_num"] and hit_type == target["match_type"]


def run_reaction_test(player_name, num_rounds=10):
    board = DartBoard()

    print(f"\n{Color.muted('═' * 50)}")
    print(Color.title(f"{'DART REACTION TEST':^50}"))
    print(f"{Color.muted('═' * 50)}")
    print(f"  Spieler: {Color.BOLD}{player_name}{Color.RESET}")
    print(f"  Runden:  {num_rounds}")
    print(f"  {Color.info('Ein Ziel erscheint - wirf so schnell wie möglich!')}")
    print(f"  Punkte: Treffer + Zeitbonus")
    print(f"{Color.muted('═' * 50)}")

    total_score = 0
    hits = 0
    reaction_times = []
    perfect_hits = 0

    for round_num in range(1, num_rounds + 1):
        wait_time = random.uniform(1.5, 4.0)
        print(f"\n  {Color.muted(f'Runde {round_num}/{num_rounds}')}")
        print(f"  {Color.muted('Warte...')}", end="", flush=True)

        time.sleep(wait_time)

        target = random.choice(TARGETS)
        diff_stars = "★" * target["difficulty"] + "☆" * (3 - target["difficulty"])

        print(f"\r  {Color.RED}{Color.BOLD}>>> ZIEL: {target['label']} <<< [{diff_stars}]{Color.RESET}")

        start_time = time.time()
        input(f"  WIRF JETZT! [Enter]...")
        reaction_time = time.time() - start_time
        reaction_times.append(reaction_time)

        throw_animation()
        result, points = board.throw()

        is_hit = check_target_hit(result, target)

        time_str = f"{reaction_time:.2f}s"
        print(f"    -> {Color.colorize_result(result, points)} ({time_str})")

        round_score = 0
        if is_hit:
            hits += 1
            base_points = target["difficulty"] * 100
            time_bonus = max(0, int((5.0 - reaction_time) * 20))
            round_score = base_points + time_bonus
            perfect_hits += 1 if reaction_time < 1.0 else 0

            print(f"    {Color.GREEN}{Color.BOLD}TREFFER!{Color.RESET} "
                  f"+{base_points} (Basis) +{time_bonus} (Zeit) = "
                  f"{Color.BOLD}{round_score}{Color.RESET}")
        else:
            hit_num, hit_type = parse_hit_number(result)
            if hit_num == target.get("match_num"):
                round_score = 25
                print(f"    {Color.YELLOW}Richtige Zahl, falscher Bereich!{Color.RESET} +{round_score}")
            else:
                print(f"    {Color.RED}Daneben!{Color.RESET} +0")

        total_score += round_score
        print(f"    Gesamt: {Color.BOLD}{total_score}{Color.RESET}")

    avg_time = sum(reaction_times) / len(reaction_times) if reaction_times else 0
    best_time = min(reaction_times) if reaction_times else 0
    worst_time = max(reaction_times) if reaction_times else 0

    print(f"\n{Color.muted('═' * 50)}")
    print(Color.title(f"{'REAKTIONSTEST - ERGEBNIS':^50}"))
    print(f"{Color.muted('═' * 50)}")

    print(f"\n  {Color.BOLD}{player_name}{Color.RESET}")
    print(f"  Punkte:        {Color.BOLD}{total_score}{Color.RESET}")
    print(f"  Treffer:       {hits}/{num_rounds} ({hits / num_rounds * 100:.0f}%)")
    print(f"  Perfekte:      {perfect_hits} (unter 1s)")
    print(f"  Ø Reaktion:    {avg_time:.2f}s")
    print(f"  Beste Zeit:    {Color.GREEN}{best_time:.2f}s{Color.RESET}")
    print(f"  Schlechteste:  {Color.RED}{worst_time:.2f}s{Color.RESET}")

    if avg_time < 1.5:
        rank = "Blitzschnell"
        rank_color = Color.YELLOW
    elif avg_time < 2.5:
        rank = "Schnell"
        rank_color = Color.GREEN
    elif avg_time < 3.5:
        rank = "Durchschnitt"
        rank_color = Color.CYAN
    else:
        rank = "Gemütlich"
        rank_color = Color.RED

    print(f"\n  Bewertung: {rank_color}{Color.BOLD}{rank}{Color.RESET}")

    if hits == num_rounds:
        print(f"  {Color.YELLOW}{Color.BOLD}PERFEKTE RUNDE! Alle Ziele getroffen!{Color.RESET}")

    print(f"{Color.muted('═' * 50)}")
    return total_score, avg_time


def run_reaction_vs(player_names, num_rounds=8):
    board = DartBoard()

    print(f"\n{Color.muted('═' * 50)}")
    print(Color.title(f"{'REACTION DUELL':^50}"))
    print(f"{Color.muted('═' * 50)}")
    print(f"  Spieler: {', '.join(player_names)}")
    print(f"  {Color.info('Gleiches Ziel - wer trifft besser & schneller?')}")
    print(f"{Color.muted('═' * 50)}")

    scores = {name: 0 for name in player_names}
    total_times = {name: [] for name in player_names}

    for round_num in range(1, num_rounds + 1):
        target = random.choice(TARGETS)
        diff_stars = "★" * target["difficulty"] + "☆" * (3 - target["difficulty"])

        wait_time = random.uniform(1.5, 3.5)
        print(f"\n  {Color.muted(f'Runde {round_num}/{num_rounds}')}")
        print(f"  {Color.muted('Warte...')}", end="", flush=True)
        time.sleep(wait_time)

        print(f"\r  {Color.RED}{Color.BOLD}>>> ZIEL: {target['label']} <<< [{diff_stars}]{Color.RESET}")

        round_results = {}

        for name in player_names:
            print(f"\n  {Color.BOLD}{name}{Color.RESET}:")
            start_time = time.time()
            input(f"    WIRF! [Enter]...")
            reaction = time.time() - start_time
            total_times[name].append(reaction)

            throw_animation()
            result, points = board.throw()
            is_hit = check_target_hit(result, target)

            print(f"    -> {Color.colorize_result(result, points)} ({reaction:.2f}s)")

            round_score = 0
            if is_hit:
                base = target["difficulty"] * 100
                time_bonus = max(0, int((5.0 - reaction) * 20))
                round_score = base + time_bonus
                print(f"    {Color.GREEN}TREFFER!{Color.RESET} +{round_score}")
            else:
                hit_num, _ = parse_hit_number(result)
                if hit_num == target.get("match_num"):
                    round_score = 25
                    print(f"    {Color.YELLOW}Knapp!{Color.RESET} +{round_score}")
                else:
                    print(f"    {Color.RED}Daneben!{Color.RESET}")

            round_results[name] = round_score
            scores[name] += round_score

        best_name = max(round_results, key=round_results.get)
        if round_results[best_name] > 0:
            print(f"\n  Runde geht an: {Color.BOLD}{best_name}{Color.RESET}")

        print(f"  Stand: {' | '.join(f'{n}: {s}' for n, s in scores.items())}")

    print(f"\n{Color.muted('═' * 50)}")
    print(Color.title(f"{'REACTION DUELL - ERGEBNIS':^50}"))
    print(f"{Color.muted('═' * 50)}")

    sorted_players = sorted(scores.items(), key=lambda x: -x[1])
    for i, (name, score) in enumerate(sorted_players):
        avg = sum(total_times[name]) / len(total_times[name])
        medal = {0: "⚡", 1: "🥈", 2: "🥉"}.get(i, "  ")
        print(f"  {medal} {name}: {Color.BOLD}{score}{Color.RESET} Punkte (Ø {avg:.2f}s)")

    winner_name = sorted_players[0][0]
    print(f"\n  {Color.BOLD}{Color.YELLOW}⚡ {winner_name} hat die besten Reflexe! ⚡{Color.RESET}")
    print(f"{Color.muted('═' * 50)}")
    return winner_name


def reaction_menu():
    print(Color.muted("=" * 50))
    print(Color.title(f"{'DART REACTION TEST':^50}"))
    print(Color.muted("=" * 50))

    print(f"\n  {Color.info('Teste deine Reaktion!')}")
    print("  Ziele erscheinen - triff so schnell wie möglich.\n")

    print("    1) Solo Reaktionstest")
    print("    2) Reaction Duell (2 Spieler)")
    print("    3) Zurück")

    choice = input("  Wahl (1-3): ").strip()

    if choice == "1":
        name = input("  Dein Name: ").strip() or "Spieler"
        print("\n  Schwierigkeit:")
        print("    1) Kurz (5 Runden)")
        print("    2) Normal (10 Runden)")
        print("    3) Lang (15 Runden)")
        dc = input("  Wahl (1-3): ").strip()
        rounds = {"1": 5, "2": 10, "3": 15}.get(dc, 10)

        input(f"\n  {Color.muted('[Enter] zum Starten...')}")
        run_reaction_test(name, rounds)

    elif choice == "2":
        p1 = input("  Spieler 1: ").strip() or "Spieler 1"
        p2 = input("  Spieler 2: ").strip() or "Spieler 2"

        input(f"\n  {Color.muted('[Enter] zum Starten...')}")
        run_reaction_vs([p1, p2])

    input(f"\n  {Color.muted('[Enter] zum Fortfahren...')}")
