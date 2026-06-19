#!/usr/bin/env python3
"""Dart Auction: Biete auf Segmente und sammle Sets."""

import random
from dart_game import DartBoard, Color, throw_animation
from training import parse_hit_number

COLLECTIONS = [
    {"name": "Niedrig", "segments": [1, 2, 3, 4, 5], "bonus": 50},
    {"name": "Mittel-Niedrig", "segments": [6, 7, 8, 9, 10], "bonus": 75},
    {"name": "Mittel-Hoch", "segments": [11, 12, 13, 14, 15], "bonus": 100},
    {"name": "Hoch", "segments": [16, 17, 18, 19, 20], "bonus": 150},
]


def run_auction(player_names, num_rounds=10):
    board = DartBoard()

    print(f"\n{Color.muted('═' * 50)}")
    print(Color.title(f"{'DART AUCTION':^50}"))
    print(f"{Color.muted('═' * 50)}")
    print(f"  {Color.info('Regeln:')}")
    print("    Jede Runde wird ein Segment versteigert.")
    print("    Biete mit deinem Dartwurf - hoechste Punktzahl gewinnt!")
    print("    Sammle komplette Sets fuer Bonuspunkte.")
    print("    Bullseye = verdopple dein Gebot!")
    print(f"{Color.muted('═' * 50)}")

    budgets = {name: 500 for name in player_names}
    owned = {name: [] for name in player_names}
    scores = {name: 0 for name in player_names}

    available = list(range(1, 21))
    random.shuffle(available)

    for round_num in range(1, min(num_rounds + 1, len(available) + 1)):
        segment = available[round_num - 1]

        coll_name = "???"
        for c in COLLECTIONS:
            if segment in c["segments"]:
                coll_name = c["name"]
                break

        print(f"\n{Color.BOLD}{Color.MAGENTA}  === Runde {round_num}/{num_rounds} ==={Color.RESET}")
        print(f"  Segment {Color.YELLOW}{segment}{Color.RESET} "
              f"({Color.muted(coll_name)}) steht zur Auktion!")

        print(f"\n  {Color.muted('Budgets:')}")
        for name in player_names:
            own_str = ", ".join(str(s) for s in sorted(owned[name])) or "keine"
            print(f"    {name}: {Color.YELLOW}{budgets[name]}{Color.RESET} "
                  f"Credits | Segmente: {own_str}")

        bids = {}
        for name in player_names:
            print(f"\n  {Color.BOLD}{name}{Color.RESET} bietet:")
            input(f"    [Enter] zum Werfen...")
            throw_animation()
            result, points = board.throw()
            hit_num, hit_type = parse_hit_number(result)

            bid = min(points, budgets[name])
            if result == "Bullseye":
                bid = min(bid * 2, budgets[name])
                print(f"    -> {Color.colorize_result(result, points)} "
                      f"- {Color.YELLOW}Gebot verdoppelt: {bid}!{Color.RESET}")
            else:
                print(f"    -> {Color.colorize_result(result, points)} "
                      f"- Gebot: {bid}")

            bids[name] = bid

        winner = max(bids, key=bids.get)
        win_bid = bids[winner]
        budgets[winner] -= win_bid
        owned[winner].append(segment)
        scores[winner] += segment

        print(f"\n  {Color.GREEN}{Color.BOLD}{winner} gewinnt Segment {segment} "
              f"fuer {win_bid} Credits!{Color.RESET}")

        for c in COLLECTIONS:
            if all(s in owned[winner] for s in c["segments"]):
                scores[winner] += c["bonus"]
                print(f"  {Color.YELLOW}{Color.BOLD}SET KOMPLETT: {c['name']}! "
                      f"+{c['bonus']} Bonus!{Color.RESET}")

    print(f"\n{Color.muted('═' * 50)}")
    print(Color.title(f"{'AUKTION ERGEBNIS':^50}"))
    print(f"{Color.muted('═' * 50)}")

    for name in player_names:
        for c in COLLECTIONS:
            if all(s in owned[name] for s in c["segments"]):
                if c["bonus"] not in [scores[name]]:
                    pass

    sorted_players = sorted(scores.items(), key=lambda x: -x[1])
    for i, (name, score) in enumerate(sorted_players):
        medal = {0: "🥇", 1: "🥈", 2: "🥉"}.get(i, "  ")
        segs = sorted(owned[name])
        print(f"  {medal} {name}: {Color.BOLD}{score}{Color.RESET} Punkte "
              f"| {len(segs)} Segmente | {budgets[name]} Credits uebrig")

    winner_name = sorted_players[0][0]
    print(f"\n  {Color.YELLOW}{Color.BOLD}{winner_name} gewinnt die Auktion!{Color.RESET}")
    print(f"{Color.muted('═' * 50)}")
    return winner_name


def auction_menu():
    print(Color.muted("=" * 50))
    print(Color.title(f"{'DART AUCTION':^50}"))
    print(Color.muted("=" * 50))

    print(f"\n  {Color.info('Biete auf Segmente mit deinen Dartwuerfen!')}")
    print("  Sammle komplette Sets fuer Bonuspunkte.\n")

    try:
        num = int(input("  Anzahl Spieler (2-4): ").strip())
        num = max(2, min(4, num))
    except ValueError:
        num = 2

    names = []
    for i in range(num):
        name = input(f"  Name Spieler {i + 1}: ").strip()
        if not name:
            name = f"Bieter {i + 1}"
        names.append(name)

    input(f"\n  {Color.muted('[Enter] zum Starten...')}")
    run_auction(names)
    input(f"\n  {Color.muted('[Enter] zum Fortfahren...')}")
