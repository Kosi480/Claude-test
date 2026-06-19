#!/usr/bin/env python3
"""Dart Duel: Schneller 1v1-Modus mit Rundenherausforderungen."""

import random
from dart_game import DartBoard, Color, throw_animation


DUEL_ROUNDS = [
    {
        "name": "Höchste Single",
        "desc": "Wer trifft die höchste Einzelzahl?",
        "darts": 3,
        "score_fn": "highest_single",
    },
    {
        "name": "Double-Jagd",
        "desc": "Wer trifft mehr Doubles?",
        "darts": 5,
        "score_fn": "count_doubles",
    },
    {
        "name": "Triple-Power",
        "desc": "Wer sammelt mehr Triple-Punkte?",
        "darts": 3,
        "score_fn": "triple_points",
    },
    {
        "name": "Bullseye-Battle",
        "desc": "Wer kommt näher ans Bull?",
        "darts": 3,
        "score_fn": "bull_score",
    },
    {
        "name": "Punkte-Blitz",
        "desc": "Wer macht mehr Punkte in einer Runde?",
        "darts": 3,
        "score_fn": "total_points",
    },
]

POWERUPS = [
    {"name": "Extra-Dart", "desc": "+1 Dart in dieser Runde", "effect": "extra_dart"},
    {"name": "Doppelpunkte", "desc": "Punkte x2 in dieser Runde", "effect": "double_score"},
    {"name": "Neustart", "desc": "Gegner-Ergebnis wird halbiert", "effect": "halve_opponent"},
]


def parse_throw(result):
    if result == "Bullseye":
        return {"type": "bullseye", "number": 25, "multiplier": 2}
    elif result == "Bull":
        return {"type": "bull", "number": 25, "multiplier": 1}
    elif result == "Miss":
        return {"type": "miss", "number": 0, "multiplier": 0}

    parts = result.split()
    if len(parts) == 2:
        try:
            num = int(parts[1])
        except ValueError:
            return {"type": "miss", "number": 0, "multiplier": 0}
        if parts[0] == "Triple":
            return {"type": "triple", "number": num, "multiplier": 3}
        elif parts[0] == "Double":
            return {"type": "double", "number": num, "multiplier": 2}
    elif len(parts) == 1:
        try:
            num = int(parts[0])
            return {"type": "single", "number": num, "multiplier": 1}
        except ValueError:
            pass

    return {"type": "miss", "number": 0, "multiplier": 0}


def score_highest_single(throws):
    best = 0
    for t in throws:
        if t["type"] == "single":
            best = max(best, t["number"])
        elif t["type"] in ("double", "triple"):
            best = max(best, t["number"])
        elif t["type"] in ("bull", "bullseye"):
            best = max(best, 25)
    return best


def score_count_doubles(throws):
    return sum(1 for t in throws if t["type"] == "double")


def score_triple_points(throws):
    return sum(
        t["number"] * t["multiplier"]
        for t in throws
        if t["type"] == "triple"
    )


def score_bull_score(throws):
    total = 0
    for t in throws:
        if t["type"] == "bullseye":
            total += 50
        elif t["type"] == "bull":
            total += 25
    return total


def score_total_points(throws):
    total = 0
    for t in throws:
        if t["type"] == "miss":
            continue
        total += t["number"] * t["multiplier"]
    return total


SCORE_FUNCTIONS = {
    "highest_single": score_highest_single,
    "count_doubles": score_count_doubles,
    "triple_points": score_triple_points,
    "bull_score": score_bull_score,
    "total_points": score_total_points,
}


def throw_darts(board, num_darts, player_name):
    throws = []
    for d in range(1, num_darts + 1):
        input(f"    {player_name} - Dart {d}/{num_darts} [Enter]...")
        throw_animation()
        result, points = board.throw()
        parsed = parse_throw(result)
        throws.append(parsed)
        print(f"      -> {Color.colorize_result(result, points)}")
    return throws


def choose_powerup(available):
    if not available:
        return None

    print(f"\n    {Color.YELLOW}Power-Up verfügbar!{Color.RESET}")
    print("    0) Kein Power-Up")
    for i, pu in enumerate(available, 1):
        print(f"    {i}) {Color.BOLD}{pu['name']}{Color.RESET} - {pu['desc']}")

    choice = input("    Wahl: ").strip()
    try:
        idx = int(choice)
        if 1 <= idx <= len(available):
            selected = available.pop(idx - 1)
            return selected
    except ValueError:
        pass
    return None


def play_duel_round(board, round_info, p1_name, p2_name, p1_powerups, p2_powerups):
    print(f"\n  {Color.BOLD}{Color.CYAN}{'─' * 44}")
    r_name = round_info["name"]
    print(f"  {r_name:^44}")
    print(f"  {Color.muted(round_info['desc'])}")
    print(f"  {'─' * 44}{Color.RESET}")

    num_darts = round_info["darts"]

    p1_pu = choose_powerup(p1_powerups)
    p1_extra = 1 if p1_pu and p1_pu["effect"] == "extra_dart" else 0
    p1_mult = 2 if p1_pu and p1_pu["effect"] == "double_score" else 1
    p1_halve = p1_pu and p1_pu["effect"] == "halve_opponent"

    if p1_pu:
        print(f"    {Color.YELLOW}{p1_name} nutzt: {p1_pu['name']}!{Color.RESET}")

    print(f"\n  {Color.BOLD}{p1_name} wirft:{Color.RESET}")
    p1_throws = throw_darts(board, num_darts + p1_extra, p1_name)

    p2_pu = choose_powerup(p2_powerups)
    p2_extra = 1 if p2_pu and p2_pu["effect"] == "extra_dart" else 0
    p2_mult = 2 if p2_pu and p2_pu["effect"] == "double_score" else 1
    p2_halve = p2_pu and p2_pu["effect"] == "halve_opponent"

    if p2_pu:
        print(f"    {Color.YELLOW}{p2_name} nutzt: {p2_pu['name']}!{Color.RESET}")

    print(f"\n  {Color.BOLD}{p2_name} wirft:{Color.RESET}")
    p2_throws = throw_darts(board, num_darts + p2_extra, p2_name)

    score_fn = SCORE_FUNCTIONS[round_info["score_fn"]]
    p1_score = score_fn(p1_throws) * p1_mult
    p2_score = score_fn(p2_throws) * p2_mult

    if p1_halve:
        p2_score = p2_score // 2
        print(f"    {Color.RED}{p2_name}s Punkte halbiert!{Color.RESET}")
    if p2_halve:
        p1_score = p1_score // 2
        print(f"    {Color.RED}{p1_name}s Punkte halbiert!{Color.RESET}")

    print(f"\n  {Color.muted('Ergebnis:')}")
    print(f"    {p1_name}: {Color.BOLD}{p1_score}{Color.RESET}")
    print(f"    {p2_name}: {Color.BOLD}{p2_score}{Color.RESET}")

    if p1_score > p2_score:
        print(f"    {Color.success(f'{p1_name} gewinnt die Runde!')}")
        return 1
    elif p2_score > p1_score:
        print(f"    {Color.success(f'{p2_name} gewinnt die Runde!')}")
        return 2
    else:
        print(f"    {Color.info('Unentschieden!')}")
        return 0


def play_sudden_death(board, p1_name, p2_name):
    print(f"\n  {Color.BOLD}{Color.RED}{'!' * 44}")
    print(f"  {'SUDDEN DEATH':^44}")
    print(f"  {'Jeder wirft einen Dart - höhere Punktzahl gewinnt!':^44}")
    print(f"  {'!' * 44}{Color.RESET}")

    while True:
        input(f"\n    {p1_name} - [Enter] zum Werfen...")
        throw_animation()
        r1, pts1 = board.throw()
        print(f"      -> {Color.colorize_result(r1, pts1)}")

        input(f"    {p2_name} - [Enter] zum Werfen...")
        throw_animation()
        r2, pts2 = board.throw()
        print(f"      -> {Color.colorize_result(r2, pts2)}")

        if pts1 > pts2:
            print(f"\n    {Color.success(f'{p1_name} gewinnt Sudden Death!')}")
            return p1_name
        elif pts2 > pts1:
            print(f"\n    {Color.success(f'{p2_name} gewinnt Sudden Death!')}")
            return p2_name
        else:
            print(f"    {Color.warning('Gleichstand! Nochmal...')}")


def run_duel(p1_name, p2_name):
    board = DartBoard()

    print(f"\n{Color.muted('═' * 50)}")
    print(Color.title(f"{'DART DUEL':^50}"))
    print(f"{Color.muted('═' * 50)}")
    print(f"  {Color.BOLD}{p1_name}{Color.RESET} vs {Color.BOLD}{p2_name}{Color.RESET}")
    print(f"  5 Runden | 3 Power-Ups pro Spieler")
    print(f"{Color.muted('═' * 50)}")

    rounds = list(DUEL_ROUNDS)
    random.shuffle(rounds)

    p1_powerups = [dict(pu) for pu in POWERUPS]
    p2_powerups = [dict(pu) for pu in POWERUPS]
    random.shuffle(p1_powerups)
    random.shuffle(p2_powerups)

    p1_wins = 0
    p2_wins = 0

    for i, rnd in enumerate(rounds, 1):
        print(f"\n  {Color.BOLD}═══ Runde {i}/5 ═══{Color.RESET}")
        print(f"  Stand: {p1_name} {Color.BOLD}{p1_wins}{Color.RESET} - "
              f"{Color.BOLD}{p2_wins}{Color.RESET} {p2_name}")

        result = play_duel_round(board, rnd, p1_name, p2_name, p1_powerups, p2_powerups)
        if result == 1:
            p1_wins += 1
        elif result == 2:
            p2_wins += 1

    print(f"\n{Color.muted('═' * 50)}")
    print(f"  Endstand: {p1_name} {Color.BOLD}{p1_wins}{Color.RESET} - "
          f"{Color.BOLD}{p2_wins}{Color.RESET} {p2_name}")

    if p1_wins == p2_wins:
        winner = play_sudden_death(board, p1_name, p2_name)
    elif p1_wins > p2_wins:
        winner = p1_name
    else:
        winner = p2_name

    print(f"\n{Color.BOLD}{Color.YELLOW}")
    print(f"  {'⚔' * 25}")
    print(f"  {'':^50}")
    print(f"  {'DUEL-SIEGER':^50}")
    print(f"  {winner:^50}")
    print(f"  {'':^50}")
    score_line = f"{p1_name} {p1_wins} - {p2_wins} {p2_name}"
    print(f"  {score_line:^50}")
    print(f"  {'⚔' * 25}")
    print(f"{Color.RESET}")

    return winner


def duel_menu():
    print(Color.muted("=" * 50))
    print(Color.title(f"{'DART DUEL':^50}"))
    print(Color.muted("=" * 50))

    print(f"\n  {Color.info('Schnelles 1v1 mit 5 Herausforderungen!')}")
    print("  Jeder Spieler bekommt 3 Power-Ups.")
    print("  Bei Gleichstand: Sudden Death!\n")

    p1 = input("  Spieler 1 Name: ").strip() or "Spieler 1"
    p2 = input("  Spieler 2 Name: ").strip() or "Spieler 2"

    input(f"\n  {Color.muted('[Enter] zum Starten...')}")

    run_duel(p1, p2)
    input(f"\n  {Color.muted('[Enter] zum Fortfahren...')}")
