#!/usr/bin/env python3
"""Dart Puzzle: Löse Zahlenrätsel durch gezielte Würfe."""

import random
from dart_game import DartBoard, Color, throw_animation
from training import parse_hit_number


def generate_arithmetic(length=4):
    start = random.randint(1, 10)
    step = random.randint(1, 4)
    seq = [start + i * step for i in range(length)]
    answer = seq[-1] + step
    return seq, answer, f"Arithmetische Folge (+{step})"


def generate_geometric():
    base = random.randint(1, 5)
    mult = random.choice([2, 3])
    seq = [base * (mult ** i) for i in range(3)]
    answer = seq[-1] * mult
    hint = f"Geometrische Folge (×{mult})"
    if answer > 20:
        return generate_arithmetic()
    return seq, answer, hint


def generate_fibonacci_like():
    a, b = random.randint(1, 3), random.randint(1, 5)
    seq = [a, b]
    for _ in range(2):
        seq.append(seq[-1] + seq[-2])
    answer = seq[-1] + seq[-2]
    if answer > 20:
        return generate_arithmetic()
    return seq, answer, "Fibonacci-artige Folge (a+b=c)"


def generate_primes():
    primes = [2, 3, 5, 7, 11, 13, 17, 19]
    start = random.randint(0, 3)
    seq = primes[start:start + 3]
    answer = primes[start + 3]
    return seq, answer, "Primzahlen"


def generate_squares():
    start = random.randint(1, 3)
    seq = [i * i for i in range(start, start + 3)]
    answer = (start + 3) ** 2
    if answer > 20:
        return generate_arithmetic()
    return seq, answer, "Quadratzahlen"


def generate_triangular():
    tri = [1, 3, 6, 10, 15]
    start = random.randint(0, 1)
    seq = tri[start:start + 3]
    answer = tri[start + 3]
    if answer > 20:
        return generate_arithmetic()
    return seq, answer, "Dreieckszahlen"


def generate_difference():
    diffs = random.choice([[1, 2, 3, 4], [2, 3, 4, 5], [1, 3, 5, 7]])
    seq = [diffs[0]]
    for i in range(1, len(diffs)):
        seq.append(seq[-1] + diffs[i])
    answer = seq[-1]
    if answer > 20:
        return generate_arithmetic()
    return seq[:-1], answer, "Wachsende Differenzen"


GENERATORS = [
    generate_arithmetic,
    generate_geometric,
    generate_fibonacci_like,
    generate_primes,
    generate_squares,
    generate_triangular,
    generate_difference,
]


def generate_puzzle(difficulty=1):
    for _ in range(20):
        gen = random.choice(GENERATORS)
        seq, answer, hint = gen()
        if 1 <= answer <= 20:
            return seq, answer, hint
    return generate_arithmetic()


def display_puzzle(seq, puzzle_num, total, hint=None):
    seq_str = "  ".join(f"{Color.CYAN}{Color.BOLD}{n}{Color.RESET}" for n in seq)
    print(f"\n  {Color.BOLD}Puzzle {puzzle_num}/{total}{Color.RESET}")
    print(f"  Folge: {seq_str}  {Color.YELLOW}{Color.BOLD}?{Color.RESET}")
    if hint:
        print(f"  {Color.muted(f'Hinweis: {hint}')}")


def run_puzzle(player_name, num_puzzles=8, show_hints=True):
    board = DartBoard()

    print(f"\n{Color.muted('═' * 50)}")
    print(Color.title(f"{'DART PUZZLE':^50}"))
    print(f"{Color.muted('═' * 50)}")
    print(f"  Spieler: {Color.BOLD}{player_name}{Color.RESET}")
    print(f"  Rätsel:  {num_puzzles}")
    print(f"  {Color.info('Erkenne das Muster und triff die nächste Zahl!')}")
    print(f"  Du hast 3 Darts pro Rätsel.")
    print(f"{Color.muted('═' * 50)}")

    score = 0
    solved = 0
    total_darts = 0

    for puzzle_num in range(1, num_puzzles + 1):
        seq, answer, hint = generate_puzzle()
        display_puzzle(seq, puzzle_num, num_puzzles, hint if show_hints else None)

        print(f"  Gesucht: Segment {Color.YELLOW}{Color.BOLD}{answer}{Color.RESET}")

        puzzle_solved = False
        for dart in range(1, 4):
            input(f"    Dart {dart}/3 [Enter]...")
            throw_animation()
            result, points = board.throw()
            hit_num, hit_type = parse_hit_number(result)
            total_darts += 1

            print(f"    -> {Color.colorize_result(result, points)}", end="")

            if hit_num == answer:
                bonus = (4 - dart) * 50
                dart_score = 100 + bonus
                if hit_type == "triple":
                    dart_score += 100
                    print(f" - {Color.GREEN}{Color.BOLD}TRIPLE-LÖSUNG! +{dart_score}{Color.RESET}")
                elif hit_type == "double":
                    dart_score += 50
                    print(f" - {Color.GREEN}{Color.BOLD}DOUBLE-LÖSUNG! +{dart_score}{Color.RESET}")
                else:
                    print(f" - {Color.GREEN}{Color.BOLD}GELÖST! +{dart_score}{Color.RESET}")

                score += dart_score
                solved += 1
                puzzle_solved = True
                break
            else:
                if hit_num != 0:
                    diff = abs(hit_num - answer)
                    if diff <= 2:
                        print(f" - {Color.YELLOW}Knapp! (±{diff}){Color.RESET}")
                    else:
                        print(f" - {Color.RED}Falsch ({hit_num} statt {answer}){Color.RESET}")
                else:
                    print(f" - {Color.muted('Daneben')}")

        if not puzzle_solved:
            print(f"    {Color.RED}Nicht gelöst! Antwort war: {answer}{Color.RESET}")
            full_seq = seq + [answer]
            seq_str = ", ".join(str(n) for n in full_seq)
            print(f"    {Color.muted(f'{hint}: {seq_str}')}")

        print(f"    Stand: {Color.BOLD}{score}{Color.RESET} Punkte | "
              f"{solved}/{puzzle_num} gelöst")

    print(f"\n{Color.muted('═' * 50)}")
    print(Color.title(f"{'PUZZLE - ERGEBNIS':^50}"))
    print(f"{Color.muted('═' * 50)}")

    accuracy = (solved / num_puzzles * 100) if num_puzzles > 0 else 0
    print(f"\n  {Color.BOLD}{player_name}{Color.RESET}")
    print(f"  Punkte:    {Color.BOLD}{score}{Color.RESET}")
    print(f"  Gelöst:    {solved}/{num_puzzles} ({accuracy:.0f}%)")
    print(f"  Darts:     {total_darts}")

    if solved == num_puzzles:
        print(f"  {Color.YELLOW}{Color.BOLD}PERFEKT! Alle Rätsel gelöst!{Color.RESET}")
        rank = "Genie"
    elif accuracy >= 75:
        rank = "Schlau"
    elif accuracy >= 50:
        rank = "Clever"
    elif accuracy >= 25:
        rank = "Anfänger"
    else:
        rank = "Übung nötig"

    print(f"  Bewertung: {Color.CYAN}{Color.BOLD}{rank}{Color.RESET}")
    print(f"{Color.muted('═' * 50)}")

    return score, solved


def run_puzzle_vs(player_names, num_puzzles=6):
    board = DartBoard()

    print(f"\n{Color.muted('═' * 50)}")
    print(Color.title(f"{'PUZZLE DUELL':^50}"))
    print(f"{Color.muted('═' * 50)}")
    print(f"  Spieler: {', '.join(player_names)}")
    print(f"  {Color.info('Gleiches Rätsel - wer löst es zuerst?')}")
    print(f"{Color.muted('═' * 50)}")

    scores = {name: 0 for name in player_names}
    solved_count = {name: 0 for name in player_names}

    for puzzle_num in range(1, num_puzzles + 1):
        seq, answer, hint = generate_puzzle()

        print(f"\n{Color.BOLD}{Color.MAGENTA}  ═══ Rätsel {puzzle_num}/{num_puzzles} ═══{Color.RESET}")
        display_puzzle(seq, puzzle_num, num_puzzles, hint)
        print(f"  Gesucht: Segment {Color.YELLOW}{Color.BOLD}{answer}{Color.RESET}")

        for name in player_names:
            print(f"\n  {Color.BOLD}{name}{Color.RESET}:")

            for dart in range(1, 4):
                input(f"    Dart {dart}/3 [Enter]...")
                throw_animation()
                result, points = board.throw()
                hit_num, _ = parse_hit_number(result)

                print(f"    -> {Color.colorize_result(result, points)}", end="")

                if hit_num == answer:
                    dart_score = 100 + (4 - dart) * 50
                    scores[name] += dart_score
                    solved_count[name] += 1
                    print(f" - {Color.GREEN}{Color.BOLD}GELÖST! +{dart_score}{Color.RESET}")
                    break
                else:
                    print(f" - {Color.RED}Falsch{Color.RESET}")

        print(f"\n  Stand: {' | '.join(f'{n}: {s}' for n, s in scores.items())}")

    print(f"\n{Color.muted('═' * 50)}")
    print(Color.title(f"{'PUZZLE DUELL - ERGEBNIS':^50}"))
    print(f"{Color.muted('═' * 50)}")

    sorted_players = sorted(scores.items(), key=lambda x: -x[1])
    for i, (name, score) in enumerate(sorted_players):
        medal = {0: "🧩", 1: "🥈", 2: "🥉"}.get(i, "  ")
        print(f"  {medal} {name}: {Color.BOLD}{score}{Color.RESET} Punkte "
              f"({solved_count[name]}/{num_puzzles} gelöst)")

    winner_name = sorted_players[0][0]
    print(f"\n  {Color.BOLD}{Color.YELLOW}🧩 {winner_name} gewinnt das Puzzle Duell!{Color.RESET}")
    print(f"{Color.muted('═' * 50)}")
    return winner_name


def puzzle_menu():
    print(Color.muted("=" * 50))
    print(Color.title(f"{'DART PUZZLE':^50}"))
    print(Color.muted("=" * 50))

    print(f"\n  {Color.info('Erkenne Zahlenmuster und triff die Lösung!')}")
    print("  Arithmetik, Fibonacci, Primzahlen und mehr.\n")

    print("    1) Solo Puzzle")
    print("    2) Puzzle Duell (2+ Spieler)")
    print("    3) Zurück")

    choice = input("  Wahl (1-3): ").strip()

    if choice == "1":
        name = input("  Dein Name: ").strip() or "Spieler"
        print("\n  Schwierigkeit:")
        print("    1) Kurz (5 Rätsel, mit Hinweisen)")
        print("    2) Normal (8 Rätsel, mit Hinweisen)")
        print("    3) Schwer (10 Rätsel, ohne Hinweise)")
        dc = input("  Wahl (1-3): ").strip()
        if dc == "1":
            puzzles, hints = 5, True
        elif dc == "3":
            puzzles, hints = 10, False
        else:
            puzzles, hints = 8, True

        input(f"\n  {Color.muted('[Enter] zum Starten...')}")
        run_puzzle(name, puzzles, hints)

    elif choice == "2":
        try:
            num = int(input("  Anzahl Spieler (2-4): ").strip())
            num = max(2, min(4, num))
        except ValueError:
            num = 2

        names = []
        for i in range(num):
            name = input(f"  Name Spieler {i + 1}: ").strip()
            if not name:
                name = f"Spieler {i + 1}"
            names.append(name)

        input(f"\n  {Color.muted('[Enter] zum Starten...')}")
        run_puzzle_vs(names)

    input(f"\n  {Color.muted('[Enter] zum Fortfahren...')}")
