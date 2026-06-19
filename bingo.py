#!/usr/bin/env python3
"""Dart-Bingo: Fülle deine Bingo-Karte mit Dart-Würfen!"""

import random
from dart_game import DartBoard, Color, throw_animation
from training import parse_hit_number


BINGO_TARGETS = [
    ("S1", "Single 1", lambda r, p: r == "1"),
    ("S5", "Single 5", lambda r, p: r == "5"),
    ("S10", "Single 10", lambda r, p: r == "10"),
    ("S15", "Single 15", lambda r, p: r == "15"),
    ("S20", "Single 20", lambda r, p: r == "20"),
    ("D5", "Double 5", lambda r, p: r == "Double 5"),
    ("D10", "Double 10", lambda r, p: r == "Double 10"),
    ("D16", "Double 16", lambda r, p: r == "Double 16"),
    ("D20", "Double 20", lambda r, p: r == "Double 20"),
    ("T10", "Triple 10", lambda r, p: r == "Triple 10"),
    ("T15", "Triple 15", lambda r, p: r == "Triple 15"),
    ("T19", "Triple 19", lambda r, p: r == "Triple 19"),
    ("T20", "Triple 20", lambda r, p: r == "Triple 20"),
    ("Bull", "Bull (25)", lambda r, p: r == "Bull"),
    ("BE", "Bullseye", lambda r, p: r == "Bullseye"),
    ("20+", "20+ Punkte", lambda r, p: p >= 20 and r != "Miss"),
    ("30+", "30+ Punkte", lambda r, p: p >= 30),
    ("40+", "40+ Punkte", lambda r, p: p >= 40),
    ("50+", "50+ Punkte", lambda r, p: p >= 50),
    ("Trpl", "Irgendein Triple", lambda r, p: r.startswith("Triple")),
    ("Dbl", "Irgendein Double", lambda r, p: r.startswith("Double")),
    ("Ung", "Ungerade Zahl", lambda r, p: p > 0 and p % 2 == 1),
    ("Ger", "Gerade Zahl", lambda r, p: p > 0 and p % 2 == 0 and not r.startswith("Double") and r != "Bullseye"),
    ("Prim", "Primzahl-Score", lambda r, p: p in (2, 3, 5, 7, 11, 13, 17, 19, 23, 25, 29, 31, 37, 41, 43, 47)),
]


def generate_bingo_card(size=3):
    targets = random.sample(BINGO_TARGETS, size * size)
    card = []
    idx = 0
    for r in range(size):
        row = []
        for c in range(size):
            label, desc, check_fn = targets[idx]
            row.append({
                "label": label,
                "desc": desc,
                "check": check_fn,
                "hit": False,
            })
            idx += 1
        card.append(row)
    return card


def display_bingo_card(card):
    size = len(card)
    cell_w = 10
    border = "+" + (("-" * cell_w + "+") * size)

    print(f"\n    {border}")
    for row in card:
        line = "|"
        for cell in row:
            if cell["hit"]:
                content = f"{Color.BOLD}{Color.GREEN} ★ {cell['label']:<5}{Color.RESET}"
            else:
                content = f" {cell['label']:<8}"
            line += f"{content}|"
        print(f"    {line}")

        desc_line = "|"
        for cell in row:
            if cell["hit"]:
                desc_line += f"{Color.GREEN}{'  ✓ OK':<{cell_w}}{Color.RESET}|"
            else:
                d = cell["desc"][:cell_w - 1]
                desc_line += f" {Color.muted(d):<{cell_w + len(Color.muted('')) - len(d) + len(d) - 1}}|"
        print(f"    {desc_line}")
        print(f"    {border}")


def check_bingo(card):
    size = len(card)
    lines = []

    for r in range(size):
        lines.append([card[r][c] for c in range(size)])
    for c in range(size):
        lines.append([card[r][c] for r in range(size)])
    lines.append([card[i][i] for i in range(size)])
    lines.append([card[i][size - 1 - i] for i in range(size)])

    for line in lines:
        if all(cell["hit"] for cell in line):
            return True
    return False


def check_full_card(card):
    for row in card:
        for cell in row:
            if not cell["hit"]:
                return False
    return True


def play_bingo(player_names):
    print(f"\n{Color.muted('═' * 50)}")
    print(Color.title(f"{'DART-BINGO':^50}"))
    print(f"{Color.muted('═' * 50)}")
    print(f"\n  {Color.info('Regeln:')}")
    print("    Jeder Spieler bekommt eine 3x3 Bingo-Karte.")
    print("    Wirf Darts und versuche, die Felder zu füllen!")
    print("    Erste Reihe/Spalte/Diagonale komplett = BINGO!")
    print("    Alle 9 Felder = SUPER-BINGO!")

    board = DartBoard()
    cards = {name: generate_bingo_card(3) for name in player_names}
    max_rounds = 15

    input(Color.info("\n  [Enter] zum Starten..."))

    for round_num in range(1, max_rounds + 1):
        print(f"\n{Color.BOLD}{Color.MAGENTA}  === Runde {round_num}/{max_rounds} ==={Color.RESET}")

        winner = None
        super_winner = None

        for name in player_names:
            card = cards[name]
            print(f"\n  {Color.BOLD}{name}{Color.RESET} - Bingo-Karte:")
            display_bingo_card(card)

            remaining = sum(1 for row in card for cell in row if not cell["hit"])
            print(f"  Noch {remaining} Felder offen")

            for dart in range(1, 4):
                input(f"    Dart {dart}/3 - [Enter] zum Werfen...")
                throw_animation()
                result, points = board.throw()
                print(f"      -> {Color.colorize_result(result, points)}", end="")

                hit_any = False
                for row in card:
                    for cell in row:
                        if not cell["hit"] and cell["check"](result, points):
                            cell["hit"] = True
                            hit_any = True
                            lbl = cell["label"]
                            print(f" - {Color.success(f'✓ {lbl}!')}", end="")

                if not hit_any:
                    print(f" - {Color.muted('Kein Feld getroffen')}", end="")
                print()

                if check_full_card(card):
                    super_winner = name
                    break
                if check_bingo(card) and winner is None:
                    winner = name

            if super_winner:
                break

        if super_winner:
            print(f"\n{Color.BOLD}{Color.YELLOW}{'★' * 44}")
            print(f"  SUPER-BINGO! {super_winner} hat ALLE Felder gefüllt!")
            print(f"{'★' * 44}{Color.RESET}")
            display_bingo_card(cards[super_winner])
            return super_winner

        if winner:
            print(f"\n{Color.BOLD}{Color.YELLOW}{'*' * 44}")
            print(f"  BINGO! {winner} gewinnt!")
            print(f"{'*' * 44}{Color.RESET}")
            display_bingo_card(cards[winner])
            return winner

    best = None
    best_hits = -1
    for name in player_names:
        hits = sum(1 for row in cards[name] for cell in row if cell["hit"])
        if hits > best_hits:
            best_hits = hits
            best = name

    print(f"\n{Color.muted('Zeit abgelaufen!')}")
    print(f"  {Color.BOLD}{best}{Color.RESET} hat die meisten Felder ({best_hits}/9)")

    for name in player_names:
        print(f"\n  {name}:")
        display_bingo_card(cards[name])

    return best


def bingo_menu():
    print(Color.muted("=" * 50))
    print(Color.title(f"{'DART-BINGO':^50}"))
    print(Color.muted("=" * 50))

    num = 0
    while num < 1:
        try:
            num = int(input("\n  Anzahl Spieler (1-4): "))
            if num < 1 or num > 4:
                num = 0
                print("  Bitte 1-4 wählen.")
        except ValueError:
            print("  Bitte eine Zahl eingeben.")

    names = []
    for i in range(num):
        name = input(f"  Name Spieler {i + 1}: ").strip()
        if not name:
            name = f"Spieler {i + 1}"
        names.append(name)

    play_bingo(names)
    input(f"\n  {Color.muted('[Enter] zum Fortfahren...')}")
