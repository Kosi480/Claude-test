#!/usr/bin/env python3
"""Dart Roulette: Zufalls-Multiplikatoren und Straf-Rad."""

import random
import time
from dart_game import DartBoard, Color, throw_animation


WHEEL_SEGMENTS = [
    {"label": "x2 Punkte!", "effect": "double", "color": Color.GREEN},
    {"label": "x3 Punkte!", "effect": "triple", "color": Color.YELLOW},
    {"label": "Halbe Punkte", "effect": "half", "color": Color.RED},
    {"label": "Normal", "effect": "normal", "color": Color.RESET},
    {"label": "Normal", "effect": "normal", "color": Color.RESET},
    {"label": "Blind-Wurf!", "effect": "blind", "color": Color.MAGENTA},
    {"label": "Bonus-Dart!", "effect": "bonus", "color": Color.CYAN},
    {"label": "Punkte-Tausch!", "effect": "swap", "color": Color.RED},
    {"label": "x2 Punkte!", "effect": "double", "color": Color.GREEN},
    {"label": "Normal", "effect": "normal", "color": Color.RESET},
    {"label": "Null-Runde!", "effect": "zero", "color": Color.RED},
    {"label": "Jackpot x5!", "effect": "jackpot", "color": Color.YELLOW},
]

SPIN_FRAMES = ["◐", "◓", "◑", "◒"]


def spin_wheel():
    print(f"\n    {Color.BOLD}Drehe das Rad...{Color.RESET}")

    segment = random.choice(WHEEL_SEGMENTS)

    for i in range(12):
        frame = SPIN_FRAMES[i % 4]
        fake = random.choice(WHEEL_SEGMENTS)
        print(f"\r    {frame} {fake['color']}{fake['label']}{Color.RESET}   ", end="", flush=True)
        time.sleep(0.12 + i * 0.03)

    print(f"\r    ★ {segment['color']}{Color.BOLD}{segment['label']}{Color.RESET}        ")
    return segment


def play_roulette_round(board, player, opponent_score, round_num, total_rounds):
    print(f"\n  {Color.BOLD}═══ Runde {round_num}/{total_rounds} ═══{Color.RESET}")
    print(f"  {player}: {Color.BOLD}{opponent_score}{Color.RESET} Punkte")

    segment = spin_wheel()
    effect = segment["effect"]

    darts = 3
    multiplier = 1
    is_blind = False

    if effect == "double":
        multiplier = 2
    elif effect == "triple":
        multiplier = 3
    elif effect == "half":
        multiplier = 0.5
    elif effect == "blind":
        is_blind = True
        print(f"    {Color.MAGENTA}Ergebnis wird erst am Ende gezeigt!{Color.RESET}")
    elif effect == "bonus":
        darts = 4
        print(f"    {Color.CYAN}Du bekommst einen Extra-Dart!{Color.RESET}")
    elif effect == "zero":
        print(f"    {Color.RED}Alle Punkte dieser Runde werden auf 0 gesetzt!{Color.RESET}")
    elif effect == "jackpot":
        multiplier = 5
        print(f"    {Color.YELLOW}JACKPOT! Alle Punkte x5!{Color.RESET}")

    total_points = 0
    for d in range(1, darts + 1):
        input(f"  Dart {d}/{darts} [Enter]...")
        throw_animation()
        result, points = board.throw()

        if is_blind:
            print(f"    -> {Color.muted('???')}")
        else:
            print(f"    -> {Color.colorize_result(result, points)}")

        total_points += points

    if effect == "zero":
        total_points = 0
    else:
        total_points = int(total_points * multiplier)

    if is_blind:
        print(f"\n    {Color.MAGENTA}Ergebnis aufgedeckt: "
              f"{Color.BOLD}{total_points}{Color.RESET} Punkte!")

    if multiplier != 1 and effect not in ("blind", "zero", "bonus"):
        print(f"    Multiplikator: x{multiplier} = {Color.BOLD}{total_points}{Color.RESET}")

    return total_points, effect


def run_roulette(player_names, num_rounds=8):
    board = DartBoard()
    scores = {p: 0 for p in player_names}

    print(f"\n{Color.muted('═' * 50)}")
    print(Color.title(f"{'DART ROULETTE':^50}"))
    print(f"{Color.muted('═' * 50)}")
    print(f"  Spieler: {', '.join(player_names)}")
    print(f"  Runden:  {num_rounds}")
    print(f"  {Color.info('Jede Runde dreht das Glücksrad!')}")
    print(f"{Color.muted('═' * 50)}")

    swap_pending = None

    for r in range(1, num_rounds + 1):
        for player in player_names:
            other = [p for p in player_names if p != player]
            other_scores = ", ".join(f"{p}: {scores[p]}" for p in other)
            opponent_display = f"{scores[player]} (Gegner: {other_scores})" if other else str(scores[player])

            points, effect = play_roulette_round(board, player, opponent_display, r, num_rounds)

            if effect == "swap" and len(player_names) >= 2:
                swap_target = random.choice([p for p in player_names if p != player])
                old_self = scores[player]
                old_other = scores[swap_target]
                scores[player] = old_other
                scores[swap_target] = old_self
                scores[player] += points
            else:
                scores[player] += points
                print(f"\n    {Color.RED}PUNKTE-TAUSCH!{Color.RESET}")
                print(f"    {player}: {old_self} → {scores[player]}")
                print(f"    {swap_target}: {old_other} → {scores[swap_target]}")

        print(f"\n  {Color.muted('Zwischenstand:')}")
        sorted_scores = sorted(scores.items(), key=lambda x: -x[1])
        for i, (name, pts) in enumerate(sorted_scores):
            marker = " ←" if i == 0 else ""
            print(f"    {i + 1}. {name}: {Color.BOLD}{pts}{Color.RESET}{marker}")

        if r < num_rounds:
            input(Color.muted("\n  [Enter] für nächste Runde..."))

    print(f"\n{Color.muted('═' * 50)}")
    print(Color.title(f"{'ROULETTE-ERGEBNIS':^50}"))
    print(f"{Color.muted('═' * 50)}")

    final = sorted(scores.items(), key=lambda x: -x[1])
    medals = ["🥇", "🥈", "🥉"]

    for i, (name, pts) in enumerate(final):
        medal = medals[i] if i < 3 else f"  {i+1}."
        print(f"  {medal} {Color.BOLD}{name}{Color.RESET} - {pts} Punkte")

    winner = final[0][0]
    print(f"\n  {Color.BOLD}{Color.YELLOW}🎰 {winner} gewinnt Dart Roulette! 🎰{Color.RESET}")
    print(f"{Color.muted('═' * 50)}")

    return winner


def roulette_menu():
    print(Color.muted("=" * 50))
    print(Color.title(f"{'DART ROULETTE':^50}"))
    print(Color.muted("=" * 50))

    print(f"\n  {Color.info('Glücksrad + Darts = Chaos!')}")
    print("  Jede Runde entscheidet das Rad über")
    print("  Multiplikatoren, Boni und Strafen.\n")

    try:
        num = int(input("  Anzahl Spieler (2-6): ").strip())
        num = max(2, min(6, num))
    except ValueError:
        num = 2

    names = []
    for i in range(num):
        name = input(f"  Name Spieler {i + 1}: ").strip()
        if not name:
            name = f"Spieler {i + 1}"
        names.append(name)

    try:
        rounds = int(input("\n  Anzahl Runden (4-12): ").strip())
        rounds = max(4, min(12, rounds))
    except ValueError:
        rounds = 8

    input(f"\n  {Color.muted('[Enter] zum Starten...')}")

    run_roulette(names, rounds)
    input(f"\n  {Color.muted('[Enter] zum Fortfahren...')}")
