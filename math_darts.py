#!/usr/bin/env python3
"""Math Darts: Löse Gleichungen durch gezielte Würfe."""

import random
from dart_game import DartBoard, Color, throw_animation


def generate_target(difficulty):
    if difficulty == "easy":
        a = random.randint(5, 20)
        b = random.randint(1, 15)
        ops = ["+", "-"]
        op = random.choice(ops)
        if op == "+":
            target = a + b
            equation = f"{a} + {b} = ?"
        else:
            target = abs(a - b)
            equation = f"{max(a, b)} - {min(a, b)} = ?"
    elif difficulty == "medium":
        mode = random.choice(["add", "mult", "combo"])
        if mode == "add":
            a = random.randint(10, 40)
            b = random.randint(5, 30)
            target = a + b
            equation = f"{a} + {b} = ?"
        elif mode == "mult":
            a = random.randint(2, 6)
            b = random.randint(3, 10)
            target = a * b
            equation = f"{a} × {b} = ?"
        else:
            a = random.randint(10, 30)
            b = random.randint(5, 15)
            c = random.randint(1, 10)
            target = a + b - c
            equation = f"{a} + {b} - {c} = ?"
    else:
        mode = random.choice(["complex", "mult", "chain"])
        if mode == "complex":
            a = random.randint(20, 60)
            b = random.randint(10, 30)
            c = random.randint(5, 20)
            target = a + b - c
            equation = f"{a} + {b} - {c} = ?"
        elif mode == "mult":
            a = random.randint(3, 8)
            b = random.randint(5, 15)
            target = a * b
            equation = f"{a} × {b} = ?"
        else:
            a = random.randint(2, 5)
            b = random.randint(10, 25)
            c = random.randint(5, 15)
            target = a * b + c
            equation = f"{a} × {b} + {c} = ?"

    target = max(1, min(180, target))
    return target, equation


def run_math_darts(difficulty="medium", num_problems=8):
    board = DartBoard()

    diff_labels = {"easy": "Leicht", "medium": "Mittel", "hard": "Schwer"}

    print(f"\n{Color.muted('═' * 48)}")
    print(Color.title(f"{'MATH DARTS':^48}"))
    print(f"{Color.muted('═' * 48)}")
    print(f"  Schwierigkeit: {Color.BOLD}{diff_labels[difficulty]}{Color.RESET}")
    print(f"  Aufgaben:      {num_problems}")
    print(f"  {Color.info('Löse die Gleichung und triff die Antwort!')}")
    print(f"  Du hast 3 Darts - Gesamtsumme muss stimmen.")
    print(f"{Color.muted('═' * 48)}")

    solved = 0
    total_darts = 0
    perfect_solves = 0

    for p in range(1, num_problems + 1):
        target, equation = generate_target(difficulty)

        print(f"\n  {Color.BOLD}Aufgabe {p}/{num_problems}{Color.RESET}")
        print(f"  {Color.YELLOW}{Color.BOLD}{equation}{Color.RESET}")
        print(f"  Ziel: Wirf genau {Color.BOLD}{target}{Color.RESET} Punkte mit 3 Darts")

        round_total = 0
        darts_used = 0

        for d in range(1, 4):
            remaining = target - round_total
            if remaining > 0:
                print(f"    Noch nötig: {Color.CYAN}{remaining}{Color.RESET}")
            elif remaining == 0:
                print(f"    {Color.GREEN}Exakt getroffen!{Color.RESET}")
                break

            input(f"    Dart {d}/3 [Enter]...")
            throw_animation()
            result, points = board.throw()
            round_total += points
            darts_used += 1
            total_darts += 1

            diff_now = abs(target - round_total)
            if round_total == target:
                print(f"      -> {Color.colorize_result(result, points)} "
                      f"= {round_total} {Color.success('PERFEKT!')}")
                break
            elif round_total > target:
                print(f"      -> {Color.colorize_result(result, points)} "
                      f"= {round_total} {Color.RED}(+{round_total - target} drüber){Color.RESET}")
            else:
                print(f"      -> {Color.colorize_result(result, points)} "
                      f"= {round_total} (noch {target - round_total})")

        if round_total == target:
            solved += 1
            if darts_used == 1:
                perfect_solves += 1
                print(f"  {Color.BOLD}{Color.YELLOW}Ein-Dart-Lösung!{Color.RESET}")
            else:
                print(f"  {Color.success('Gelöst!')}")
        else:
            diff = abs(target - round_total)
            if diff <= 5:
                print(f"  {Color.warning(f'Knapp daneben! Differenz: {diff}')}")
            else:
                print(f"  {Color.RED}Nicht gelöst. Differenz: {diff}{Color.RESET}")

    accuracy = (solved / num_problems * 100) if num_problems > 0 else 0

    print(f"\n{Color.muted('═' * 48)}")
    print(Color.title(f"{'MATH DARTS - ERGEBNIS':^48}"))
    print(f"{Color.muted('═' * 48)}")
    print(f"  Gelöst:         {Color.BOLD}{solved}/{num_problems}{Color.RESET} ({accuracy:.0f}%)")
    print(f"  Perfekt (1 Dart): {perfect_solves}")
    print(f"  Darts gesamt:   {total_darts}")

    if accuracy >= 80:
        print(f"\n  {Color.BOLD}{Color.YELLOW}Bewertung: MATHE-GENIE!{Color.RESET}")
    elif accuracy >= 60:
        print(f"\n  {Color.success('Bewertung: Clever!')}")
    elif accuracy >= 40:
        print(f"\n  {Color.info('Bewertung: Nicht schlecht')}")
    else:
        print(f"\n  {Color.muted('Bewertung: Kopfrechnen üben!')}")

    print(f"{Color.muted('═' * 48)}")
    return solved, num_problems


def math_darts_menu():
    print(Color.muted("=" * 48))
    print(Color.title(f"{'MATH DARTS':^48}"))
    print(Color.muted("=" * 48))

    print(f"\n  {Color.info('Rechne die Gleichung und triff das Ergebnis!')}")
    print("  Kopf + Hand = Sieg\n")

    print("  Schwierigkeit:")
    print("    1) Leicht (einfache Addition/Subtraktion)")
    print("    2) Mittel (Multiplikation, 3 Zahlen)")
    print("    3) Schwer (komplexe Gleichungen)")
    print("    4) Zurück")

    while True:
        choice = input("  Wahl (1-4): ").strip()

        if choice == "4":
            return
        elif choice in ("1", "2", "3"):
            diffs = {"1": "easy", "2": "medium", "3": "hard"}
            diff = diffs[choice]

            try:
                num = int(input("\n  Aufgaben (5-15): ").strip())
                num = max(5, min(15, num))
            except ValueError:
                num = 8

            run_math_darts(diff, num)
            input(Color.muted("\n  [Enter] zum Fortfahren..."))
            return

        print("  Bitte 1-4 wählen.")
