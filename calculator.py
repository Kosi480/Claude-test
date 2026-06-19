#!/usr/bin/env python3
"""Dart-Checkout-Rechner: Optimale Finish-Wege berechnen."""

from dart_game import Color

SINGLES = [(f"S{i}", i) for i in range(1, 21)] + [("S25", 25)]
DOUBLES = [(f"D{i}", i * 2) for i in range(1, 21)] + [("D25", 50)]
TRIPLES = [(f"T{i}", i * 3) for i in range(1, 21)]
ALL_DARTS = SINGLES + DOUBLES + TRIPLES


def find_checkouts(remaining, max_darts=3):
    if remaining < 2 or remaining > 170:
        return []

    results = []

    for d_name, d_val in DOUBLES:
        if d_val == remaining:
            results.append([d_name])

    if max_darts >= 2:
        for name1, val1 in ALL_DARTS:
            left = remaining - val1
            if left < 2:
                continue
            for d_name, d_val in DOUBLES:
                if d_val == left:
                    results.append([name1, d_name])

    if max_darts >= 3:
        for name1, val1 in ALL_DARTS:
            left1 = remaining - val1
            if left1 < 2:
                continue
            for name2, val2 in ALL_DARTS:
                left2 = left1 - val2
                if left2 < 2:
                    continue
                for d_name, d_val in DOUBLES:
                    if d_val == left2:
                        combo = [name1, name2, d_name]
                        results.append(combo)

    seen = set()
    unique = []
    for combo in results:
        key = tuple(combo)
        if key not in seen:
            seen.add(key)
            unique.append(combo)

    return _rank_checkouts(unique)


def _rank_checkouts(checkouts):
    def score_combo(combo):
        priority = 0
        for dart in combo:
            if dart.startswith("T20") or dart == "T20":
                priority -= 10
            elif dart.startswith("T19") or dart == "T19":
                priority -= 8
            elif dart.startswith("T"):
                priority -= 5
            elif dart == "D25":
                priority -= 3
            elif dart.startswith("D20") or dart == "D20":
                priority -= 7
            elif dart.startswith("D"):
                priority -= 4
            elif dart == "S25":
                priority -= 2
        priority += len(combo) * 20
        return priority

    return sorted(checkouts, key=score_combo)


def format_checkout(combo):
    parts = []
    for dart in combo:
        if dart.startswith("T"):
            parts.append(f"{Color.RED}{dart}{Color.RESET}")
        elif dart.startswith("D"):
            parts.append(f"{Color.CYAN}{dart}{Color.RESET}")
        elif dart == "S25":
            parts.append(f"{Color.GREEN}Bull{Color.RESET}")
        else:
            parts.append(dart)
    return " → ".join(parts)


def display_checkouts(remaining, max_show=8):
    if remaining < 2:
        print(f"  {Color.muted('Score zu niedrig für ein Finish.')}")
        return
    if remaining > 170:
        print(f"  {Color.muted('Kein Checkout möglich (max. 170).')}")
        return

    checkouts = find_checkouts(remaining, max_darts=3)

    if not checkouts:
        print(f"  {Color.warning('Kein Checkout-Weg gefunden.')}")
        return

    one_dart = [c for c in checkouts if len(c) == 1]
    two_dart = [c for c in checkouts if len(c) == 2]
    three_dart = [c for c in checkouts if len(c) == 3]

    print(f"\n{Color.muted('═' * 50)}")
    print(Color.title(f"{'CHECKOUT-RECHNER':^50}"))
    print(f"{Color.muted('═' * 50)}")
    print(f"  Verbleibend: {Color.BOLD}{remaining}{Color.RESET}")
    total = len(checkouts)
    print(f"  {Color.muted(f'{total} mögliche Wege gefunden')}")

    if one_dart:
        print(f"\n  {Color.success('1-Dart Finish:')}")
        for combo in one_dart:
            print(f"    {format_checkout(combo)}")

    if two_dart:
        print(f"\n  {Color.info('2-Dart Finish:')}")
        for combo in two_dart[:max_show]:
            print(f"    {format_checkout(combo)}")
        if len(two_dart) > max_show:
            print(f"    {Color.muted(f'... und {len(two_dart) - max_show} weitere')}")

    if three_dart:
        print(f"\n  {Color.muted('3-Dart Finish:')}")
        for combo in three_dart[:max_show]:
            print(f"    {format_checkout(combo)}")
        if len(three_dart) > max_show:
            print(f"    {Color.muted(f'... und {len(three_dart) - max_show} weitere')}")

    if checkouts:
        best = checkouts[0]
        print(f"\n  {Color.BOLD}Empfehlung: {format_checkout(best)}{Color.RESET}")

    print(f"{Color.muted('═' * 50)}")


def display_checkout_table():
    print(f"\n{Color.muted('═' * 56)}")
    print(Color.title(f"{'CHECKOUT-TABELLE (2-170)':^56}"))
    print(f"{Color.muted('═' * 56)}")
    print(f"  {'Score':>5}  {'Empfohlener Weg':<40}")
    print(f"  {Color.muted('─' * 52)}")

    key_scores = list(range(170, 99, -1)) + [80, 60, 50, 40, 32, 24, 20, 16, 10, 8, 4, 2]
    seen = set()

    for score in key_scores:
        if score in seen or score < 2:
            continue
        seen.add(score)
        checkouts = find_checkouts(score, max_darts=3)
        if checkouts:
            best = checkouts[0]
            path = " → ".join(best)
            darts = len(best)
            dart_label = f"({darts}D)"
            print(f"  {score:>5}  {path:<34} {Color.muted(dart_label)}")

    print(f"{Color.muted('═' * 56)}")


def interactive_calculator():
    print(f"\n{Color.muted('═' * 50)}")
    print(Color.title(f"{'INTERAKTIVER RECHNER':^50}"))
    print(f"{Color.muted('═' * 50)}")
    print(f"  {Color.info('Gib einen Score ein (2-170) oder q zum Beenden.')}")

    while True:
        inp = input(f"\n  Score: ").strip().lower()
        if inp in ("q", "quit", "exit", "zurück"):
            return
        try:
            score = int(inp)
            display_checkouts(score)
        except ValueError:
            print("  Bitte eine Zahl eingeben oder 'q' zum Beenden.")


def calculator_menu():
    print(Color.muted("=" * 50))
    print(Color.title(f"{'CHECKOUT-RECHNER':^50}"))
    print(Color.muted("=" * 50))

    print("\n    1) Score eingeben")
    print("    2) Interaktiver Modus")
    print("    3) Checkout-Tabelle (Übersicht)")
    print("    4) Zurück")

    while True:
        choice = input("  Wahl (1-4): ").strip()
        if choice == "1":
            try:
                score = int(input("  Score (2-170): ").strip())
                display_checkouts(score)
            except ValueError:
                print("  Bitte eine Zahl eingeben.")
            input("\n  [Enter] zum Fortfahren...")
            return
        elif choice == "2":
            interactive_calculator()
            return
        elif choice == "3":
            display_checkout_table()
            input("\n  [Enter] zum Fortfahren...")
            return
        elif choice == "4":
            return
        print("  Bitte 1-4 wählen.")
