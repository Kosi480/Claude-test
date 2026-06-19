#!/usr/bin/env python3
"""Dart Golf: Triff Ziele in möglichst wenigen Darts (Par-System)."""

import random
from dart_game import DartBoard, Color, throw_animation


HOLES = [
    {"target": "20", "par": 2, "name": "Loch 1", "desc": "Single 20"},
    {"target": "D10", "par": 3, "name": "Loch 2", "desc": "Double 10"},
    {"target": "T19", "par": 4, "name": "Loch 3", "desc": "Triple 19"},
    {"target": "Bull", "par": 3, "name": "Loch 4", "desc": "Bull/Bullseye"},
    {"target": "D16", "par": 3, "name": "Loch 5", "desc": "Double 16"},
    {"target": "1", "par": 2, "name": "Loch 6", "desc": "Single 1"},
    {"target": "T20", "par": 4, "name": "Loch 7", "desc": "Triple 20"},
    {"target": "Bullseye", "par": 5, "name": "Loch 8", "desc": "Bullseye"},
    {"target": "D20", "par": 3, "name": "Loch 9", "desc": "Double 20"},
]

SCORE_NAMES = {
    -3: ("Albatross", Color.YELLOW),
    -2: ("Eagle", Color.GREEN),
    -1: ("Birdie", Color.CYAN),
    0: ("Par", Color.RESET),
    1: ("Bogey", Color.RED),
    2: ("Doppel-Bogey", Color.RED),
}

MAX_DARTS_PER_HOLE = 8


def check_hit(result, target):
    if target == "Bull":
        return result in ("Bull", "Bullseye")
    if target == "Bullseye":
        return result == "Bullseye"
    if target.startswith("T"):
        num = target[1:]
        return result == f"Triple {num}"
    if target.startswith("D"):
        num = target[1:]
        return result == f"Double {num}"
    return result == target


def play_hole(board, hole, player_name):
    print(f"\n  {Color.BOLD}{Color.GREEN}{'─' * 40}")
    print(f"  {hole['name']}: {hole['desc']}")
    print(f"  Par: {hole['par']} | Max: {MAX_DARTS_PER_HOLE} Darts")
    print(f"  {'─' * 40}{Color.RESET}")

    darts = 0
    hit = False
    while darts < MAX_DARTS_PER_HOLE:
        darts += 1
        input(f"    {player_name} - Dart {darts} [Enter]...")
        throw_animation()
        result, points = board.throw()

        hit = check_hit(result, hole["target"])

        if hit:
            print(f"      -> {Color.colorize_result(result, points)} "
                  f"{Color.success('TREFFER!')}")
            break
        else:
            remaining = MAX_DARTS_PER_HOLE - darts
            print(f"      -> {Color.colorize_result(result, points)} "
                  f"{Color.muted(f'({remaining} übrig)')}")

    if not hit:
        darts = MAX_DARTS_PER_HOLE

    diff = darts - hole["par"]
    score_name, score_color = SCORE_NAMES.get(diff, (f"+{diff}", Color.RED))

    if hit:
        print(f"    {score_color}{Color.BOLD}{score_name}{Color.RESET} "
              f"({darts} Darts, Par {hole['par']})")
    else:
        print(f"    {Color.RED}{Color.BOLD}Nicht geschafft{Color.RESET} "
              f"(+{diff} über Par)")

    return darts, diff


def display_scorecard(player_name, scores, holes):
    print(f"\n  {Color.BOLD}Scorecard: {player_name}{Color.RESET}")
    print(f"  {Color.muted('─' * 48)}")

    header = "  "
    pars = "  "
    vals = "  "

    for i, (darts, diff) in enumerate(scores):
        hole = holes[i]
        header += f" {hole['name'][-1]:>3}"
        pars += f" {hole['par']:>3}"

        if diff < 0:
            vals += f" {Color.GREEN}{darts:>3}{Color.RESET}"
        elif diff == 0:
            vals += f" {darts:>3}"
        else:
            vals += f" {Color.RED}{darts:>3}{Color.RESET}"

    total_darts = sum(d for d, _ in scores)
    total_par = sum(h["par"] for h in holes[:len(scores)])
    total_diff = sum(diff for _, diff in scores)

    header += f" {'Tot':>5}"
    pars += f" {total_par:>5}"

    diff_str = f"+{total_diff}" if total_diff > 0 else str(total_diff)
    vals += f" {Color.BOLD}{total_darts:>5}{Color.RESET}"

    print(f"  Loch: {header}")
    print(f"  Par:  {pars}")
    print(f"  Dart: {vals}")
    print(f"  Gesamt: {Color.BOLD}{total_darts}{Color.RESET} ({diff_str} zu Par)")


def run_golf(player_names, num_holes=9):
    board = DartBoard()
    holes = HOLES[:num_holes]

    print(f"\n{Color.muted('═' * 50)}")
    print(Color.title(f"{'DART GOLF':^50}"))
    print(f"{Color.muted('═' * 50)}")
    print(f"  Spieler: {', '.join(player_names)}")
    total_par = sum(h["par"] for h in holes)
    print(f"  Löcher:  {num_holes} | Par: {total_par}")
    print(f"  {Color.info('Triff das Ziel in möglichst wenigen Darts!')}")
    print(f"{Color.muted('═' * 50)}")

    all_scores = {p: [] for p in player_names}

    for h_idx, hole in enumerate(holes):
        print(f"\n  {Color.BOLD}{Color.YELLOW}═══ {hole['name']} von {num_holes} ═══{Color.RESET}")

        for player in player_names:
            darts, diff = play_hole(board, hole, player)
            all_scores[player].append((darts, diff))

        if len(player_names) > 1:
            print(f"\n  {Color.muted('Zwischenstand:')}")
            standings = []
            for p in player_names:
                total = sum(d for d, _ in all_scores[p])
                total_diff = sum(diff for _, diff in all_scores[p])
                standings.append((p, total, total_diff))
            standings.sort(key=lambda x: x[1])

            for i, (name, total, diff) in enumerate(standings, 1):
                diff_str = f"+{diff}" if diff > 0 else str(diff)
                print(f"    {i}. {name}: {total} Darts ({diff_str})")

        if h_idx < len(holes) - 1:
            input(Color.muted("\n  [Enter] für nächstes Loch..."))

    print(f"\n{Color.muted('═' * 50)}")
    print(Color.title(f"{'DART GOLF - ENDERGEBNIS':^50}"))
    print(f"{Color.muted('═' * 50)}")

    for player in player_names:
        display_scorecard(player, all_scores[player], holes)

    if len(player_names) > 1:
        final = []
        for p in player_names:
            total = sum(d for d, _ in all_scores[p])
            total_diff = sum(diff for _, diff in all_scores[p])
            final.append((p, total, total_diff))
        final.sort(key=lambda x: x[1])

        print(f"\n  {Color.BOLD}Platzierung:{Color.RESET}")
        medals = ["🥇", "🥈", "🥉"]
        for i, (name, total, diff) in enumerate(final):
            medal = medals[i] if i < 3 else f"  {i+1}."
            diff_str = f"+{diff}" if diff > 0 else str(diff)
            print(f"    {medal} {name}: {total} Darts ({diff_str})")

        winner = final[0][0]
        print(f"\n  {Color.success(f'{winner} gewinnt Dart Golf!')}")
    else:
        total = sum(d for d, _ in all_scores[player_names[0]])
        total_diff = sum(diff for _, diff in all_scores[player_names[0]])

        if total_diff <= -5:
            print(f"\n  {Color.BOLD}{Color.YELLOW}Bewertung: PROFI-GOLFER!{Color.RESET}")
        elif total_diff <= 0:
            print(f"\n  {Color.success('Bewertung: Unter Par!')}")
        elif total_diff <= 5:
            print(f"\n  {Color.info('Bewertung: Ordentliche Runde')}")
        else:
            print(f"\n  {Color.muted('Bewertung: Weiter üben!')}")

    print(f"{Color.muted('═' * 50)}")


def golf_menu():
    print(Color.muted("=" * 50))
    print(Color.title(f"{'DART GOLF':^50}"))
    print(Color.muted("=" * 50))

    print(f"\n  {Color.info('Triff Ziele in möglichst wenigen Darts!')}")
    print("  Wie Golf - je weniger Darts, desto besser.\n")

    try:
        num = int(input("  Anzahl Spieler (1-4): ").strip())
        num = max(1, min(4, num))
    except ValueError:
        num = 1

    names = []
    for i in range(num):
        name = input(f"  Name Spieler {i + 1}: ").strip()
        if not name:
            name = f"Spieler {i + 1}"
        names.append(name)

    print("\n  Löcher:")
    print("    1) 5 Löcher (kurz)")
    print("    2) 9 Löcher (voll)")
    hc = input("  Wahl (1-2): ").strip()
    num_holes = 5 if hc == "1" else 9

    input(f"\n  {Color.muted('[Enter] zum Starten...')}")

    run_golf(names, num_holes)
    input(f"\n  {Color.muted('[Enter] zum Fortfahren...')}")
