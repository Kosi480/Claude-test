#!/usr/bin/env python3
"""Endurance: Überlebe so viele Runden wie möglich über der Mindestpunktzahl."""

from dart_game import DartBoard, Color, throw_animation


DIFFICULTY_MODES = {
    "easy": {
        "label": "Leicht",
        "min_score": 20,
        "increase": 2,
        "lives": 3,
        "desc": "Start: 20 Punkte, +2 pro Runde, 3 Leben",
    },
    "medium": {
        "label": "Mittel",
        "min_score": 30,
        "increase": 3,
        "lives": 2,
        "desc": "Start: 30 Punkte, +3 pro Runde, 2 Leben",
    },
    "hard": {
        "label": "Schwer",
        "min_score": 40,
        "increase": 5,
        "lives": 1,
        "desc": "Start: 40 Punkte, +5 pro Runde, 1 Leben",
    },
    "extreme": {
        "label": "Extrem",
        "min_score": 50,
        "increase": 7,
        "lives": 0,
        "desc": "Start: 50 Punkte, +7 pro Runde, 0 Leben",
    },
}


def run_endurance(difficulty="medium"):
    mode = DIFFICULTY_MODES[difficulty]
    board = DartBoard()

    print(f"\n{Color.muted('═' * 48)}")
    print(Color.title(f"{'ENDURANCE':^48}"))
    print(f"{Color.muted('═' * 48)}")
    print(f"  Schwierigkeit: {Color.BOLD}{mode['label']}{Color.RESET}")
    print(f"  {mode['desc']}")
    print(f"  {Color.info('Jede Runde steigt die Mindestpunktzahl!')}")
    print(f"  {Color.info('Unter dem Minimum = Leben verlieren!')}")
    print(f"{Color.muted('═' * 48)}")

    input(f"\n  {Color.muted('[Enter] zum Starten...')}")

    current_min = mode["min_score"]
    lives = mode["lives"]
    round_num = 0
    total_points = 0
    best_round = 0
    survived_rounds = 0
    close_calls = 0

    while True:
        round_num += 1
        current_min = mode["min_score"] + (round_num - 1) * mode["increase"]

        life_display = f"{'❤' * lives}{'♡' * (mode['lives'] - lives)}" if mode["lives"] > 0 else "☠"

        print(f"\n  {Color.BOLD}Runde {round_num}{Color.RESET} | "
              f"Minimum: {Color.YELLOW}{current_min}{Color.RESET} | "
              f"Leben: {life_display}")

        if round_num >= 10:
            pressure = Color.RED
        elif round_num >= 5:
            pressure = Color.YELLOW
        else:
            pressure = Color.GREEN

        bar_max = 30
        bar_fill = min(int(current_min / 180 * bar_max), bar_max)
        bar_empty = bar_max - bar_fill
        print(f"  Schwierigkeit: [{pressure}{'█' * bar_fill}{Color.muted('░' * bar_empty)}{Color.RESET}]")

        round_score = 0
        for d in range(1, 4):
            input(f"    Dart {d}/3 [Enter]...")
            throw_animation()
            result, points = board.throw()
            round_score += points

            remaining = current_min - round_score
            if remaining > 0:
                status = f"{Color.RED}(noch {remaining} nötig){Color.RESET}"
            else:
                status = f"{Color.GREEN}(✓ Minimum erreicht){Color.RESET}"

            print(f"      -> {Color.colorize_result(result, points)} "
                  f"= {round_score} {status}")

        total_points += round_score
        if round_score > best_round:
            best_round = round_score

        if round_score >= current_min:
            survived_rounds += 1
            margin = round_score - current_min

            if margin <= 5:
                close_calls += 1
                print(f"\n    {Color.YELLOW}KNAPP! Nur {margin} über Minimum!{Color.RESET}")
            elif margin >= 50:
                print(f"\n    {Color.success(f'DOMINANT! +{margin} über Minimum!')}")
            else:
                print(f"\n    {Color.GREEN}Geschafft! (+{margin}){Color.RESET}")
        else:
            deficit = current_min - round_score

            if lives > 0:
                lives -= 1
                print(f"\n    {Color.RED}{Color.BOLD}UNTER MINIMUM! (-{deficit}){Color.RESET}")
                print(f"    {Color.RED}Leben verloren! Verbleibend: {lives}{Color.RESET}")
            else:
                print(f"\n    {Color.RED}{Color.BOLD}GAME OVER! (-{deficit}){Color.RESET}")
                break

    avg = total_points / round_num if round_num > 0 else 0

    print(f"\n{Color.muted('═' * 48)}")
    print(Color.title(f"{'ENDURANCE - ERGEBNIS':^48}"))
    print(f"{Color.muted('═' * 48)}")
    print(f"  Überlebte Runden:  {Color.BOLD}{survived_rounds}{Color.RESET}")
    print(f"  Gesamtrunden:      {round_num}")
    print(f"  Gesamtpunkte:      {total_points}")
    print(f"  Ø pro Runde:       {avg:.1f}")
    print(f"  Beste Runde:       {best_round}")
    print(f"  Knappe Runden:     {close_calls}")
    final_min = mode["min_score"] + (round_num - 1) * mode["increase"]
    print(f"  Letztes Minimum:   {final_min}")

    if survived_rounds >= 20:
        print(f"\n  {Color.BOLD}{Color.YELLOW}Bewertung: UNSTERBLICH!{Color.RESET}")
    elif survived_rounds >= 15:
        print(f"\n  {Color.success('Bewertung: Eisern!')}")
    elif survived_rounds >= 10:
        print(f"\n  {Color.success('Bewertung: Ausdauernd!')}")
    elif survived_rounds >= 5:
        print(f"\n  {Color.info('Bewertung: Solide')}")
    else:
        print(f"\n  {Color.muted('Bewertung: Mehr Ausdauer nötig!')}")

    print(f"{Color.muted('═' * 48)}")
    return survived_rounds, total_points


def endurance_vs(player_names, difficulty="medium"):
    results = []

    print(f"\n{Color.muted('═' * 50)}")
    print(Color.title(f"{'ENDURANCE VS':^50}"))
    print(f"{Color.muted('═' * 50)}")
    mode = DIFFICULTY_MODES[difficulty]
    print(f"  Modus: {mode['label']}")
    print(f"  Spieler: {', '.join(player_names)}")
    print(f"  {Color.info('Wer überlebt am längsten?')}")

    for name in player_names:
        print(f"\n  {Color.BOLD}{Color.CYAN}{'─' * 40}")
        print(f"  {name} ist dran!")
        print(f"  {'─' * 40}{Color.RESET}")

        rounds, points = run_endurance(difficulty)
        results.append({"name": name, "rounds": rounds, "points": points})

        if name != player_names[-1]:
            input(Color.muted("\n  [Enter] für nächsten Spieler..."))

    print(f"\n{Color.muted('═' * 50)}")
    print(Color.title(f"{'ENDURANCE VS - ERGEBNIS':^50}"))
    print(f"{Color.muted('═' * 50)}")

    by_rounds = sorted(results, key=lambda x: (-x["rounds"], -x["points"]))

    for i, r in enumerate(by_rounds, 1):
        if i == 1:
            print(f"  🏆 {Color.BOLD}{r['name']}{Color.RESET}: "
                  f"{r['rounds']} Runden ({r['points']} Pkt)")
        else:
            print(f"  {i}. {r['name']}: {r['rounds']} Runden ({r['points']} Pkt)")

    winner = by_rounds[0]["name"]
    print(f"\n  {Color.success(f'{winner} hat die meiste Ausdauer!')}")
    print(f"{Color.muted('═' * 50)}")


def endurance_menu():
    print(Color.muted("=" * 48))
    print(Color.title(f"{'ENDURANCE':^48}"))
    print(Color.muted("=" * 48))

    print(f"\n  {Color.info('Überlebe so viele Runden wie möglich!')}")
    print("  Jede Runde steigt die Mindestpunktzahl.\n")

    print("    1) Solo Endurance")
    print("    2) Endurance VS")
    print("    3) Zurück")

    while True:
        choice = input("  Wahl (1-3): ").strip()

        if choice == "3":
            return
        elif choice in ("1", "2"):
            print("\n  Schwierigkeit:")
            for i, (key, mode) in enumerate(DIFFICULTY_MODES.items(), 1):
                print(f"    {i}) {mode['label']} - {mode['desc']}")

            dc = input("  Wahl (1-4): ").strip()
            keys = list(DIFFICULTY_MODES.keys())
            idx = int(dc) - 1 if dc in "1234" else 1
            idx = max(0, min(len(keys) - 1, idx))
            diff = keys[idx]

            if choice == "1":
                run_endurance(diff)
            else:
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

                endurance_vs(names, diff)

            input(Color.muted("\n  [Enter] zum Fortfahren..."))
            return

        print("  Bitte 1-3 wählen.")
