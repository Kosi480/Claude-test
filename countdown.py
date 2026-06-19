#!/usr/bin/env python3
"""Countdown-Modus: Wettlauf gegen die Zeit auf exakt Null."""

import time
from dart_game import DartBoard, Color, throw_animation


TIME_LIMITS = {
    "easy": {"label": "Entspannt", "seconds": 300, "score": 301},
    "medium": {"label": "Standard", "seconds": 180, "score": 301},
    "hard": {"label": "Schwer", "seconds": 120, "score": 301},
    "insane": {"label": "Wahnsinn", "seconds": 90, "score": 301},
    "sprint": {"label": "Sprint", "seconds": 60, "score": 170},
}


def format_time(seconds):
    m = int(seconds) // 60
    s = int(seconds) % 60
    ms = int((seconds % 1) * 10)
    if m > 0:
        return f"{m}:{s:02d}.{ms}"
    return f"{s}.{ms}s"


def parse_hit(result):
    if result == "Bullseye":
        return 25, "bullseye"
    elif result == "Bull":
        return 25, "bull"
    elif result == "Miss":
        return 0, "miss"

    parts = result.split()
    if len(parts) == 2:
        try:
            num = int(parts[1])
        except ValueError:
            return 0, "miss"
        if parts[0] == "Triple":
            return num, "triple"
        elif parts[0] == "Double":
            return num, "double"
    elif len(parts) == 1:
        try:
            return int(parts[0]), "single"
        except ValueError:
            return 0, "miss"
    return 0, "miss"


def run_countdown(mode_key):
    mode = TIME_LIMITS[mode_key]
    board = DartBoard()
    score = mode["score"]
    time_limit = mode["seconds"]

    print(f"\n{Color.muted('═' * 48)}")
    print(Color.title(f"{'COUNTDOWN':^48}"))
    print(f"{Color.muted('═' * 48)}")
    print(f"  Modus:     {Color.BOLD}{mode['label']}{Color.RESET}")
    print(f"  Startscore: {score}")
    print(f"  Zeitlimit:  {format_time(time_limit)}")
    print(f"  {Color.info('Erreiche exakt 0, bevor die Zeit abläuft!')}")
    print(f"{Color.muted('═' * 48)}")

    input(f"\n  {Color.muted('[Enter] zum Starten...')}")

    start_time = time.time()
    darts_thrown = 0
    rounds = 0
    busts = 0
    best_round = 0

    while score > 0:
        elapsed = time.time() - start_time
        remaining = time_limit - elapsed

        if remaining <= 0:
            print(f"\n  {Color.RED}{Color.BOLD}ZEIT ABGELAUFEN!{Color.RESET}")
            print(f"  Verbleibend: {Color.BOLD}{score}{Color.RESET} Punkte")
            break

        rounds += 1
        time_color = Color.GREEN if remaining > time_limit * 0.5 else (
            Color.YELLOW if remaining > time_limit * 0.2 else Color.RED
        )

        print(f"\n  {Color.muted(f'Runde {rounds}')} | "
              f"Score: {Color.BOLD}{score}{Color.RESET} | "
              f"Zeit: {time_color}{format_time(remaining)}{Color.RESET}")

        round_score = 0
        for d in range(3):
            elapsed = time.time() - start_time
            remaining = time_limit - elapsed
            if remaining <= 0:
                print(f"\n  {Color.RED}{Color.BOLD}ZEIT ABGELAUFEN!{Color.RESET}")
                score = max(0, score)
                break

            input(f"  Dart {d + 1}/3 [Enter]...")
            throw_animation()

            elapsed_after = time.time() - start_time
            if elapsed_after > time_limit:
                print(f"  {Color.RED}Zu spät!{Color.RESET}")
                break

            result, points = board.throw()
            darts_thrown += 1

            if score - round_score - points < 0:
                busts += 1
                print(f"    -> {Color.colorize_result(result, points)} "
                      f"{Color.RED}BUST! (Über Null){Color.RESET}")
                round_score = 0
                break

            round_score += points
            remaining_now = time_limit - (time.time() - start_time)

            if score - round_score == 0:
                print(f"    -> {Color.colorize_result(result, points)} "
                      f"{Color.success('CHECKOUT!')}")
                break
            else:
                print(f"    -> {Color.colorize_result(result, points)} "
                      f"[{score - round_score} übrig | {format_time(max(0, remaining_now))}]")

        score -= round_score
        if round_score > best_round:
            best_round = round_score

    end_time = time.time()
    total_time = end_time - start_time
    won = score == 0

    print(f"\n{Color.muted('═' * 48)}")

    if won:
        print(f"{Color.BOLD}{Color.YELLOW}")
        print(f"  {'★' * 24}")
        print(f"  {'COUNTDOWN GESCHAFFT!':^48}")
        print(f"  {'★' * 24}")
        print(f"{Color.RESET}")

        print(f"  Zeit:         {Color.BOLD}{format_time(total_time)}{Color.RESET} "
              f"/ {format_time(time_limit)}")
        time_left = time_limit - total_time
        print(f"  Restzeit:     {Color.GREEN}{format_time(time_left)}{Color.RESET}")
    else:
        print(f"  {Color.RED}{Color.BOLD}COUNTDOWN GESCHEITERT{Color.RESET}")
        print(f"  Verbleibend:  {score} Punkte")

    print(f"  Darts:        {darts_thrown}")
    print(f"  Runden:       {rounds}")
    print(f"  Busts:        {busts}")
    print(f"  Beste Runde:  {best_round}")

    if darts_thrown > 0:
        avg = (mode["score"] - score) / (darts_thrown / 3) if darts_thrown >= 3 else 0
        print(f"  Ø pro Runde:  {avg:.1f}")

    if won:
        if total_time <= time_limit * 0.4:
            print(f"\n  {Color.success('Bewertung: BLITZSCHNELL!')}")
        elif total_time <= time_limit * 0.6:
            print(f"\n  {Color.success('Bewertung: Sehr schnell!')}")
        elif total_time <= time_limit * 0.8:
            print(f"\n  {Color.info('Bewertung: Gut geschafft!')}")
        else:
            print(f"\n  {Color.warning('Bewertung: Knapp!')}")

    print(f"{Color.muted('═' * 48)}")
    return won, total_time, darts_thrown


def countdown_vs(player_names, mode_key="medium"):
    mode = TIME_LIMITS[mode_key]
    results = []

    print(f"\n{Color.muted('═' * 50)}")
    print(Color.title(f"{'COUNTDOWN VS':^50}"))
    print(f"{Color.muted('═' * 50)}")
    print(f"  Modus: {mode['label']} | {mode['score']} in {format_time(mode['seconds'])}")
    print(f"  Spieler: {', '.join(player_names)}")
    print(f"  {Color.info('Wer schafft es am schnellsten?')}")

    for name in player_names:
        print(f"\n  {Color.BOLD}{Color.CYAN}{'─' * 40}")
        print(f"  {name} ist dran!")
        print(f"  {'─' * 40}{Color.RESET}")

        won, total_time, darts = run_countdown(mode_key)
        results.append({"name": name, "won": won, "time": total_time, "darts": darts})

        if name != player_names[-1]:
            input(Color.muted("\n  [Enter] für nächsten Spieler..."))

    print(f"\n{Color.muted('═' * 50)}")
    print(Color.title(f"{'COUNTDOWN VS - ERGEBNIS':^50}"))
    print(f"{Color.muted('═' * 50)}")

    winners = [r for r in results if r["won"]]
    losers = [r for r in results if not r["won"]]

    winners.sort(key=lambda x: x["time"])
    final = winners + losers

    for i, r in enumerate(final, 1):
        if r["won"]:
            print(f"  {i}. {Color.BOLD}{r['name']}{Color.RESET} - "
                  f"{Color.GREEN}{format_time(r['time'])}{Color.RESET} "
                  f"({r['darts']} Darts)")
        else:
            print(f"  {i}. {Color.muted(r['name'])} - "
                  f"{Color.RED}Nicht geschafft{Color.RESET}")

    if winners:
        winner_name = winners[0]["name"]
        print(f"\n  {Color.success(f'Gewinner: {winner_name}!')}")

    print(f"{Color.muted('═' * 50)}")


def countdown_menu():
    print(Color.muted("=" * 48))
    print(Color.title(f"{'COUNTDOWN':^48}"))
    print(Color.muted("=" * 48))

    print("\n    1) Solo Countdown")
    print("    2) Countdown VS (mehrere Spieler)")
    print("    3) Zurück")

    while True:
        choice = input("  Wahl (1-3): ").strip()

        if choice == "3":
            return
        elif choice == "1":
            print("\n  Schwierigkeit:")
            for i, (key, mode) in enumerate(TIME_LIMITS.items(), 1):
                print(f"    {i}) {mode['label']} - {mode['score']} in {format_time(mode['seconds'])}")

            mc = input("  Wahl (1-5): ").strip()
            keys = list(TIME_LIMITS.keys())
            idx = int(mc) - 1 if mc in "12345" else 1
            idx = max(0, min(len(keys) - 1, idx))

            run_countdown(keys[idx])
            input(Color.muted("\n  [Enter] zum Fortfahren..."))
            return

        elif choice == "2":
            try:
                num = int(input("\n  Anzahl Spieler (2-4): ").strip())
                num = max(2, min(4, num))
            except ValueError:
                num = 2

            names = []
            for i in range(num):
                name = input(f"  Name Spieler {i + 1}: ").strip()
                if not name:
                    name = f"Spieler {i + 1}"
                names.append(name)

            print("\n  Schwierigkeit:")
            for i, (key, mode) in enumerate(TIME_LIMITS.items(), 1):
                print(f"    {i}) {mode['label']}")
            mc = input("  Wahl (1-5): ").strip()
            keys = list(TIME_LIMITS.keys())
            idx = int(mc) - 1 if mc in "12345" else 1
            idx = max(0, min(len(keys) - 1, idx))

            countdown_vs(names, keys[idx])
            input(Color.muted("\n  [Enter] zum Fortfahren..."))
            return

        print("  Bitte 1-3 wählen.")
