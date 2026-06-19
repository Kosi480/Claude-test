#!/usr/bin/env python3
"""Trainingsmodi für das Dart-Spiel."""

import time
from dart_game import DartBoard, Color, throw_animation


def parse_hit_number(result):
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


def around_the_clock():
    print(Color.muted("=" * 44))
    print(Color.title(f"{'AROUND THE CLOCK':^44}"))
    print(Color.muted("=" * 44))
    print(f"\n  {Color.info('Regeln:')}")
    print("    Triff die Zahlen 1-20 der Reihe nach.")
    print("    Single, Double oder Triple zählen alle.")
    print("    Am Ende: Bullseye zum Abschluss!")

    board = DartBoard()
    target = 1
    total_darts = 0
    hits_first_try = 0

    targets = list(range(1, 21)) + [25]

    while target <= len(targets):
        current = targets[target - 1]
        label = "Bull/Bullseye" if current == 25 else str(current)
        print(f"\n  {Color.BOLD}Ziel: {Color.YELLOW}{label}{Color.RESET}")

        darts_for_target = 0
        while True:
            input(f"  Dart - [Enter] zum Werfen...")
            throw_animation()
            result, points = board.throw()
            total_darts += 1
            darts_for_target += 1

            hit_num, hit_type = parse_hit_number(result)

            if hit_num == current:
                print(f"    -> {Color.colorize_result(result, points)} - {Color.success('TREFFER!')}")
                if darts_for_target == 1:
                    hits_first_try += 1
                target += 1
                break
            else:
                print(f"    -> {Color.colorize_result(result, points)} - {Color.warning('Daneben!')}")

    print(f"\n{Color.BOLD}{Color.YELLOW}{'*' * 44}")
    print(f"  AROUND THE CLOCK GESCHAFFT!")
    print(f"  Darts gebraucht: {total_darts}")
    print(f"  Beim ersten Versuch: {hits_first_try}/21")
    accuracy = (hits_first_try / 21) * 100
    print(f"  Trefferquote: {accuracy:.0f}%")
    print(f"{'*' * 44}{Color.RESET}")

    if total_darts <= 25:
        print(Color.success("  Bewertung: WELTKLASSE!"))
    elif total_darts <= 40:
        print(Color.success("  Bewertung: Sehr gut!"))
    elif total_darts <= 60:
        print(Color.info("  Bewertung: Gut"))
    elif total_darts <= 80:
        print("  Bewertung: Ordentlich")
    else:
        print(Color.muted("  Bewertung: Weiter üben!"))


def double_out_practice():
    print(Color.muted("=" * 44))
    print(Color.title(f"{'DOUBLE OUT TRAINING':^44}"))
    print(Color.muted("=" * 44))
    print(f"\n  {Color.info('Regeln:')}")
    print("    Triff alle Doubles von D1 bis D20.")
    print("    Nur Doubles zählen als Treffer!")

    board = DartBoard()
    target_double = 1
    total_darts = 0
    hits_first_try = 0

    while target_double <= 20:
        print(f"\n  {Color.BOLD}Ziel: {Color.CYAN}D{target_double}{Color.RESET} ({target_double * 2} Punkte)")

        darts_for_target = 0
        while True:
            input(f"  Dart - [Enter] zum Werfen...")
            throw_animation()
            result, points = board.throw()
            total_darts += 1
            darts_for_target += 1

            hit_num, hit_type = parse_hit_number(result)

            if hit_type == "double" and hit_num == target_double:
                print(f"    -> {Color.colorize_result(result, points)} - {Color.success('TREFFER!')}")
                if darts_for_target == 1:
                    hits_first_try += 1
                target_double += 1
                break
            elif hit_type == "double":
                print(f"    -> {Color.colorize_result(result, points)} - {Color.warning('Falsches Double!')}")
            else:
                print(f"    -> {Color.colorize_result(result, points)} - {Color.warning('Kein Double!')}")

    print(f"\n{Color.BOLD}{Color.YELLOW}{'*' * 44}")
    print(f"  DOUBLE OUT TRAINING GESCHAFFT!")
    print(f"  Darts gebraucht: {total_darts}")
    print(f"  Beim ersten Versuch: {hits_first_try}/20")
    accuracy = (hits_first_try / 20) * 100
    print(f"  Trefferquote: {accuracy:.0f}%")
    print(f"{'*' * 44}{Color.RESET}")


def triple_challenge():
    print(Color.muted("=" * 44))
    print(Color.title(f"{'TRIPLE CHALLENGE':^44}"))
    print(Color.muted("=" * 44))
    print(f"\n  {Color.info('Regeln:')}")
    print("    Du hast 30 Darts. Triff so viele Triples")
    print("    wie möglich! Ziel: maximale Punktzahl.")

    board = DartBoard()
    total_points = 0
    triples_hit = 0
    max_darts = 30

    for dart_num in range(1, max_darts + 1):
        print(f"\n  {Color.muted(f'Dart {dart_num}/{max_darts}')} | "
              f"Triples: {Color.BOLD}{triples_hit}{Color.RESET} | "
              f"Punkte: {Color.BOLD}{total_points}{Color.RESET}")

        input(f"  [Enter] zum Werfen...")
        throw_animation()
        result, points = board.throw()

        _, hit_type = parse_hit_number(result)
        if hit_type == "triple":
            triples_hit += 1
            total_points += points
            print(f"    -> {Color.colorize_result(result, points)} - {Color.success('TRIPLE!')}")
        else:
            total_points += points
            print(f"    -> {Color.colorize_result(result, points)}")

    print(f"\n{Color.BOLD}{Color.YELLOW}{'*' * 44}")
    print(f"  TRIPLE CHALLENGE ERGEBNIS")
    print(f"  Gesamtpunkte: {total_points}")
    print(f"  Triples: {triples_hit}/30")
    print(f"  Durchschnitt: {total_points / 10:.1f} pro Runde")
    print(f"{'*' * 44}{Color.RESET}")

    if total_points >= 1000:
        print(Color.success("  Bewertung: LEGENDÄR!"))
    elif total_points >= 700:
        print(Color.success("  Bewertung: Ausgezeichnet!"))
    elif total_points >= 500:
        print(Color.info("  Bewertung: Gut"))
    elif total_points >= 300:
        print("  Bewertung: Ordentlich")
    else:
        print(Color.muted("  Bewertung: Weiter üben!"))


def training_menu():
    print(Color.muted("=" * 44))
    print(Color.title(f"{'TRAINING':^44}"))
    print(Color.muted("=" * 44))

    print("\n  Trainingsmodus wählen:")
    print("    1) Around the Clock (1-20 + Bull)")
    print("    2) Double Out (D1-D20)")
    print("    3) Triple Challenge (30 Darts)")
    print("    4) Speed Darts (Reaktionstest)")
    print("    5) Target Practice (Zieltraining)")
    print("    6) Kombo-Challenge (Streak-Bonus)")
    print("    7) Endurance (Überlebensmodus)")
    print("    8) Survival (Wellen-Modus)")
    print("    9) Zurück")

    while True:
        choice = input("  Wahl (1-9): ").strip()
        if choice == "1":
            around_the_clock()
            return
        elif choice == "2":
            double_out_practice()
            return
        elif choice == "3":
            triple_challenge()
            return
        elif choice == "4":
            from speed_darts import speed_darts_menu
            speed_darts_menu()
            return
        elif choice == "5":
            from target_practice import target_practice_menu
            target_practice_menu()
            return
        elif choice == "6":
            from combos import combo_menu
            combo_menu()
            return
        elif choice == "7":
            from endurance import endurance_menu
            endurance_menu()
            return
        elif choice == "8":
            from survival import survival_menu
            survival_menu()
            return
        elif choice == "9":
            return
        print("  Bitte 1-9 wählen.")
