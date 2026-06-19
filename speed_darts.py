#!/usr/bin/env python3
"""Speed Darts: Zeitdruck-Modus mit Schnellwurf-Boni."""

import time
import random
from dart_game import DartBoard, Color, throw_animation, ascii_board


SPEED_MODES = {
    "blitz": {
        "name": "Blitz",
        "time_per_dart": 3.0,
        "total_darts": 20,
        "desc": "3 Sekunden pro Dart!",
    },
    "rush": {
        "name": "Rush",
        "time_per_dart": 5.0,
        "total_darts": 30,
        "desc": "5 Sekunden pro Dart",
    },
    "marathon": {
        "name": "Marathon",
        "time_per_dart": 4.0,
        "total_darts": 50,
        "desc": "50 Darts, 4 Sekunden je Wurf",
    },
}

TIME_BONUS = {
    1.0: 3.0,
    2.0: 2.0,
    3.0: 1.5,
    4.0: 1.2,
}


def get_time_multiplier(reaction_time, time_limit):
    ratio = reaction_time / time_limit
    if ratio < 0.25:
        return 3.0
    elif ratio < 0.5:
        return 2.0
    elif ratio < 0.75:
        return 1.5
    else:
        return 1.0


def play_speed_darts(player_name, mode_key="rush"):
    mode = SPEED_MODES[mode_key]
    board = DartBoard()

    print(f"\n{Color.muted('═' * 50)}")
    print(Color.title(f"{'SPEED DARTS':^50}"))
    print(f"{Color.muted('═' * 50)}")
    print(f"  Modus: {Color.BOLD}{mode['name']}{Color.RESET}")
    print(f"  {mode['desc']}")
    print(f"  Darts: {mode['total_darts']}")
    print(f"\n  {Color.info('Regeln:')}")
    print("    Drücke [Enter] so SCHNELL wie möglich zum Werfen!")
    print("    Je schneller du drückst, desto mehr Bonus-Punkte!")
    print("    Zu langsam? Der Dart verfehlt automatisch!")
    print(f"\n  Zeitmultiplikatoren:")
    print(f"    {Color.GREEN}< 25% der Zeit: x3.0{Color.RESET}")
    print(f"    {Color.CYAN}< 50% der Zeit: x2.0{Color.RESET}")
    print(f"    {Color.YELLOW}< 75% der Zeit: x1.5{Color.RESET}")
    print(f"    {Color.WHITE}Rest: x1.0{Color.RESET}")

    input(Color.info("\n  [Enter] zum Starten..."))

    total_score = 0
    total_bonus = 0
    hits = 0
    misses = 0
    timeouts = 0
    fastest = float("inf")
    combo = 0
    best_combo = 0
    time_limit = mode["time_per_dart"]

    for dart in range(1, mode["total_darts"] + 1):
        print(f"\n  {Color.BOLD}Dart {dart}/{mode['total_darts']}{Color.RESET} | "
              f"Score: {Color.BOLD}{total_score}{Color.RESET} | "
              f"Combo: {Color.YELLOW}{'🔥' * min(combo, 5)}{Color.RESET}")

        countdown = random.uniform(0.5, 1.5)
        print(f"  {Color.muted('Bereit...')}")
        time.sleep(countdown)
        print(f"  {Color.BOLD}{Color.GREEN}>>> JETZT! <<<{Color.RESET}")

        start_time = time.time()
        try:
            input()
        except EOFError:
            break
        reaction = time.time() - start_time

        if reaction > time_limit:
            timeouts += 1
            combo = 0
            print(f"  {Color.warning(f'ZU LANGSAM! ({reaction:.2f}s > {time_limit:.1f}s)')}")
            print(f"  {Color.muted('Dart verfehlt!')}")
            continue

        throw_animation()
        result, points = board.throw()
        print(f"    -> {Color.colorize_result(result, points)}", end="")

        if result == "Miss":
            misses += 1
            combo = 0
            print(f" | {Color.muted('Miss')}")
            continue

        hits += 1
        multiplier = get_time_multiplier(reaction, time_limit)
        bonus_points = int(points * (multiplier - 1))
        total_points = points + bonus_points
        total_score += total_points
        total_bonus += bonus_points
        combo += 1
        best_combo = max(best_combo, combo)

        if reaction < fastest:
            fastest = reaction

        combo_bonus = ""
        if combo >= 3:
            extra = combo * 2
            total_score += extra
            total_bonus += extra
            combo_bonus = f" +{extra} Combo!"

        if multiplier > 1.0:
            mult_color = Color.GREEN if multiplier >= 2.0 else Color.YELLOW
            print(f" | {mult_color}x{multiplier:.1f}{Color.RESET} "
                  f"({points}+{bonus_points}={total_points})"
                  f" [{reaction:.2f}s]{combo_bonus}")
        else:
            print(f" | {points} Punkte [{reaction:.2f}s]{combo_bonus}")

    print(f"\n{Color.muted('═' * 50)}")
    print(Color.title(f"{'ERGEBNIS':^50}"))
    print(f"{Color.muted('═' * 50)}")
    print(f"  Spieler: {Color.BOLD}{player_name}{Color.RESET}")
    print(f"  Modus:   {mode['name']}")
    print(f"\n  {Color.BOLD}Gesamtscore: {Color.YELLOW}{total_score}{Color.RESET}")
    print(f"  Bonus-Punkte: {Color.GREEN}+{total_bonus}{Color.RESET}")
    print(f"  Treffer:      {hits}/{mode['total_darts']} "
          f"({(hits / mode['total_darts'] * 100):.0f}%)")
    print(f"  Misses:       {misses}")
    print(f"  Timeouts:     {timeouts}")
    print(f"  Beste Combo:  {Color.YELLOW}{best_combo}{Color.RESET}")
    if fastest < float("inf"):
        print(f"  Schnellster:  {Color.GREEN}{fastest:.3f}s{Color.RESET}")

    grade = _calculate_grade(total_score, mode_key)
    print(f"\n  Bewertung: {Color.BOLD}{grade}{Color.RESET}")
    print(f"{Color.muted('═' * 50)}")

    return total_score


def _calculate_grade(score, mode_key):
    thresholds = {
        "blitz": [(1000, "S+"), (700, "S"), (500, "A"), (300, "B"), (150, "C"), (0, "D")],
        "rush": [(1500, "S+"), (1000, "S"), (700, "A"), (400, "B"), (200, "C"), (0, "D")],
        "marathon": [(3000, "S+"), (2000, "S"), (1500, "A"), (800, "B"), (400, "C"), (0, "D")],
    }
    for threshold, grade in thresholds.get(mode_key, thresholds["rush"]):
        if score >= threshold:
            if grade in ("S+", "S"):
                return f"{Color.YELLOW}{grade}{Color.RESET}"
            elif grade in ("A", "B"):
                return f"{Color.GREEN}{grade}{Color.RESET}"
            return f"{Color.WHITE}{grade}{Color.RESET}"
    return "D"


def speed_darts_menu():
    print(Color.muted("=" * 50))
    print(Color.title(f"{'SPEED DARTS':^50}"))
    print(Color.muted("=" * 50))

    name = input("\n  Dein Name: ").strip()
    if not name:
        name = "Spieler"

    print("\n  Modus wählen:")
    print(f"    1) Blitz   - {SPEED_MODES['blitz']['desc']}")
    print(f"    2) Rush    - {SPEED_MODES['rush']['desc']}")
    print(f"    3) Marathon - {SPEED_MODES['marathon']['desc']}")
    print(f"    4) Zurück")

    while True:
        choice = input("  Wahl (1-4): ").strip()
        if choice == "1":
            play_speed_darts(name, "blitz")
            input(f"\n  {Color.muted('[Enter] zum Fortfahren...')}")
            return
        elif choice == "2":
            play_speed_darts(name, "rush")
            input(f"\n  {Color.muted('[Enter] zum Fortfahren...')}")
            return
        elif choice == "3":
            play_speed_darts(name, "marathon")
            input(f"\n  {Color.muted('[Enter] zum Fortfahren...')}")
            return
        elif choice == "4":
            return
        print("  Bitte 1-4 wählen.")
