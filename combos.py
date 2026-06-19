#!/usr/bin/env python3
"""Kombo-System: Konsekutive gute Würfe mit Streak-Multiplikatoren."""

from dart_game import DartBoard, Color, throw_animation


COMBO_THRESHOLDS = [
    {"min_points": 40, "label": "Gut", "color": Color.GREEN},
    {"min_points": 50, "label": "Super", "color": Color.CYAN},
    {"min_points": 60, "label": "Mega", "color": Color.YELLOW},
]

STREAK_BONUSES = {
    2: {"label": "2x Kombo!", "mult": 1.5},
    3: {"label": "3x Kombo!!", "mult": 2.0},
    5: {"label": "5x FEUER!!!", "mult": 3.0},
    8: {"label": "8x UNAUFHALTBAR!!!!", "mult": 4.0},
    10: {"label": "10x LEGENDE!!!!!", "mult": 5.0},
}


def get_combo_threshold(points):
    for t in reversed(COMBO_THRESHOLDS):
        if points >= t["min_points"]:
            return t
    return None


def get_streak_bonus(streak):
    best = None
    for threshold, bonus in sorted(STREAK_BONUSES.items()):
        if streak >= threshold:
            best = bonus
    return best


def display_combo_bar(streak, max_streak):
    bar_width = 30
    if max_streak == 0:
        return

    fill = min(streak, 10)
    filled = int(fill / 10 * bar_width)
    empty = bar_width - filled

    if streak >= 10:
        color = Color.YELLOW
    elif streak >= 5:
        color = Color.CYAN
    elif streak >= 3:
        color = Color.GREEN
    else:
        color = Color.RESET

    bar = f"{color}{'█' * filled}{Color.muted('░' * empty)}{Color.RESET}"
    print(f"    Kombo: [{bar}] {streak}")


def run_combo_challenge(num_rounds=10):
    board = DartBoard()

    print(f"\n{Color.muted('═' * 48)}")
    print(Color.title(f"{'KOMBO-CHALLENGE':^48}"))
    print(f"{Color.muted('═' * 48)}")
    print(f"  {Color.info('Wirf konstant gut für Kombo-Multiplikatoren!')}")
    print(f"  Runden: {num_rounds} | 3 Darts pro Runde")
    print(f"  Kombo startet ab 40+ Punkte pro Dart")
    print(f"{Color.muted('═' * 48)}")

    total_score = 0
    combo_score = 0
    streak = 0
    max_streak = 0
    total_combos = 0
    highest_combo_bonus = 0

    for r in range(1, num_rounds + 1):
        print(f"\n  {Color.BOLD}Runde {r}/{num_rounds}{Color.RESET} | "
              f"Score: {Color.BOLD}{total_score}{Color.RESET} | "
              f"Streak: {streak}")

        if streak > 0:
            display_combo_bar(streak, max_streak)

        round_points = 0
        round_combo_active = True

        for d in range(1, 4):
            input(f"  Dart {d}/3 [Enter]...")
            throw_animation()
            result, points = board.throw()

            threshold = get_combo_threshold(points)

            if threshold:
                streak += 1
                if streak > max_streak:
                    max_streak = streak

                bonus = get_streak_bonus(streak)
                if bonus:
                    boosted = int(points * bonus["mult"])
                    diff = boosted - points
                    combo_score += diff
                    total_combos += 1
                    if diff > highest_combo_bonus:
                        highest_combo_bonus = diff

                    print(f"    -> {Color.colorize_result(result, points)} "
                          f"{threshold['color']}{threshold['label']}{Color.RESET} "
                          f"| {Color.YELLOW}{bonus['label']}{Color.RESET} "
                          f"(+{diff} Bonus = {boosted})")
                    round_points += boosted
                else:
                    print(f"    -> {Color.colorize_result(result, points)} "
                          f"{threshold['color']}{threshold['label']}{Color.RESET}")
                    round_points += points
            else:
                if streak >= 3:
                    print(f"    -> {Color.colorize_result(result, points)} "
                          f"{Color.RED}Kombo gebrochen! ({streak}x){Color.RESET}")
                else:
                    print(f"    -> {Color.colorize_result(result, points)}")
                streak = 0
                round_points += points

        total_score += round_points
        print(f"    Runde: {Color.BOLD}{round_points}{Color.RESET} Punkte")

    print(f"\n{Color.muted('═' * 48)}")
    print(Color.title(f"{'KOMBO-ERGEBNIS':^48}"))
    print(f"{Color.muted('═' * 48)}")
    print(f"  Gesamtscore:       {Color.BOLD}{total_score}{Color.RESET}")
    print(f"  Davon Kombo-Bonus: {Color.CYAN}{combo_score}{Color.RESET}")
    print(f"  Längste Kombo:     {Color.BOLD}{max_streak}{Color.RESET}")
    print(f"  Kombo-Aktivierungen: {total_combos}")
    print(f"  Bester Einzelbonus:  +{highest_combo_bonus}")

    base_score = total_score - combo_score
    if base_score > 0:
        boost_pct = (combo_score / base_score) * 100
        print(f"  Kombo-Boost:       +{boost_pct:.1f}%")

    avg_per_round = total_score / num_rounds if num_rounds > 0 else 0
    print(f"  Ø pro Runde:       {avg_per_round:.1f}")

    if max_streak >= 10:
        print(f"\n  {Color.BOLD}{Color.YELLOW}Bewertung: LEGENDÄR!{Color.RESET}")
    elif max_streak >= 8:
        print(f"\n  {Color.success('Bewertung: Unaufhaltbar!')}")
    elif max_streak >= 5:
        print(f"\n  {Color.success('Bewertung: Feuer!')}")
    elif max_streak >= 3:
        print(f"\n  {Color.info('Bewertung: Gut im Rhythmus')}")
    else:
        print(f"\n  {Color.muted('Bewertung: Noch nicht im Flow')}")

    print(f"{Color.muted('═' * 48)}")
    return total_score, max_streak


def combo_vs(player_names, num_rounds=8):
    results = []

    print(f"\n{Color.muted('═' * 50)}")
    print(Color.title(f"{'KOMBO VS':^50}"))
    print(f"{Color.muted('═' * 50)}")
    print(f"  Spieler: {', '.join(player_names)}")
    print(f"  {Color.info('Wer baut die längste Kombo?')}")

    for name in player_names:
        print(f"\n  {Color.BOLD}{Color.CYAN}{'─' * 40}")
        print(f"  {name} ist dran!")
        print(f"  {'─' * 40}{Color.RESET}")

        score, streak = run_combo_challenge(num_rounds)
        results.append({"name": name, "score": score, "streak": streak})

        if name != player_names[-1]:
            input(Color.muted("\n  [Enter] für nächsten Spieler..."))

    print(f"\n{Color.muted('═' * 50)}")
    print(Color.title(f"{'KOMBO VS - ERGEBNIS':^50}"))
    print(f"{Color.muted('═' * 50)}")

    by_score = sorted(results, key=lambda x: -x["score"])
    by_streak = sorted(results, key=lambda x: -x["streak"])

    print(f"\n  {Color.BOLD}Nach Punkten:{Color.RESET}")
    for i, r in enumerate(by_score, 1):
        print(f"    {i}. {r['name']}: {Color.BOLD}{r['score']}{Color.RESET}")

    print(f"\n  {Color.BOLD}Längste Kombo:{Color.RESET}")
    for i, r in enumerate(by_streak, 1):
        print(f"    {i}. {r['name']}: {Color.BOLD}{r['streak']}x{Color.RESET}")

    winner = by_score[0]["name"]
    print(f"\n  {Color.success(f'Gewinner: {winner}!')}")
    print(f"{Color.muted('═' * 50)}")


def combo_menu():
    print(Color.muted("=" * 48))
    print(Color.title(f"{'KOMBO-CHALLENGE':^48}"))
    print(Color.muted("=" * 48))

    print(f"\n  {Color.info('Halte deinen Streak für Bonus-Multiplikatoren!')}")
    print("  40+ Punkte pro Dart = Kombo hält\n")

    print("    1) Solo Kombo-Challenge")
    print("    2) Kombo VS (mehrere Spieler)")
    print("    3) Zurück")

    while True:
        choice = input("  Wahl (1-3): ").strip()

        if choice == "3":
            return
        elif choice == "1":
            try:
                rounds = int(input("\n  Runden (5-20): ").strip())
                rounds = max(5, min(20, rounds))
            except ValueError:
                rounds = 10
            run_combo_challenge(rounds)
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

            try:
                rounds = int(input("  Runden (5-15): ").strip())
                rounds = max(5, min(15, rounds))
            except ValueError:
                rounds = 8

            combo_vs(names, rounds)
            input(Color.muted("\n  [Enter] zum Fortfahren..."))
            return

        print("  Bitte 1-3 wählen.")
