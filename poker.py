#!/usr/bin/env python3
"""Dart Poker: Wirf Dart-Hände und bilde Poker-Kombinationen."""

import random
from collections import Counter
from dart_game import DartBoard, Color, throw_animation


HAND_RANKS = [
    ("Royal Flush", 10, "Alle 5 Darts auf T20 (Triple 20)"),
    ("Straight Flush", 9, "5 aufeinanderfolgende Zahlen, alle gleicher Typ"),
    ("Vier Gleiche", 8, "4 Darts auf dieselbe Zahl"),
    ("Full House", 7, "3 Gleiche + 2 Gleiche"),
    ("Flush", 6, "Alle 5 Darts gleicher Typ (Single/Double/Triple)"),
    ("Straße", 5, "5 aufeinanderfolgende Zahlen"),
    ("Drilling", 4, "3 Darts auf dieselbe Zahl"),
    ("Zwei Paare", 3, "2 verschiedene Paare"),
    ("Paar", 2, "2 Darts auf dieselbe Zahl"),
    ("Höchste Karte", 1, "Nichts - höchster Einzelwurf zählt"),
]


def parse_throw(result, points):
    if result == "Bullseye":
        return {"number": 25, "type": "double", "points": 50}
    elif result == "Bull":
        return {"number": 25, "type": "single", "points": 25}
    elif result == "Miss":
        return {"number": 0, "type": "miss", "points": 0}

    parts = result.split()
    if len(parts) == 2:
        try:
            num = int(parts[1])
        except ValueError:
            return {"number": 0, "type": "miss", "points": 0}
        if parts[0] == "Triple":
            return {"number": num, "type": "triple", "points": points}
        elif parts[0] == "Double":
            return {"number": num, "type": "double", "points": points}
    elif len(parts) == 1:
        try:
            num = int(parts[0])
            return {"number": num, "type": "single", "points": points}
        except ValueError:
            pass
    return {"number": 0, "type": "miss", "points": 0}


def evaluate_hand(throws):
    numbers = [t["number"] for t in throws if t["number"] > 0]
    types = [t["type"] for t in throws if t["type"] != "miss"]

    if not numbers:
        return 0, "Höchste Karte", 0

    num_counts = Counter(numbers)
    type_counts = Counter(types)

    is_flush = len(type_counts) == 1 and len(types) == 5

    sorted_nums = sorted(set(numbers))
    is_straight = False
    if len(sorted_nums) >= 5:
        for i in range(len(sorted_nums) - 4):
            seq = sorted_nums[i:i + 5]
            if seq[-1] - seq[0] == 4 and len(seq) == 5:
                is_straight = True
                break

    all_t20 = all(t["number"] == 20 and t["type"] == "triple" for t in throws if t["type"] != "miss")
    if all_t20 and len([t for t in throws if t["type"] != "miss"]) == 5:
        total = sum(t["points"] for t in throws)
        return 10, "Royal Flush", total

    if is_straight and is_flush:
        total = sum(t["points"] for t in throws)
        return 9, "Straight Flush", total

    counts = sorted(num_counts.values(), reverse=True)

    if len(counts) >= 1 and counts[0] >= 4:
        total = sum(t["points"] for t in throws)
        return 8, "Vier Gleiche", total

    if len(counts) >= 2 and counts[0] >= 3 and counts[1] >= 2:
        total = sum(t["points"] for t in throws)
        return 7, "Full House", total

    if is_flush:
        total = sum(t["points"] for t in throws)
        return 6, "Flush", total

    if is_straight:
        total = sum(t["points"] for t in throws)
        return 5, "Straße", total

    if len(counts) >= 1 and counts[0] >= 3:
        total = sum(t["points"] for t in throws)
        return 4, "Drilling", total

    pairs = sum(1 for c in counts if c >= 2)
    if pairs >= 2:
        total = sum(t["points"] for t in throws)
        return 3, "Zwei Paare", total

    if pairs == 1:
        total = sum(t["points"] for t in throws)
        return 2, "Paar", total

    total = max(t["points"] for t in throws) if throws else 0
    return 1, "Höchste Karte", total


def display_hand(throws, hand_name, rank):
    hand_str = " | ".join(
        f"{t['type'][0].upper()}{t['number']}" if t["type"] != "miss" else "X"
        for t in throws
    )

    if rank >= 7:
        color = Color.YELLOW
    elif rank >= 5:
        color = Color.GREEN
    elif rank >= 3:
        color = Color.CYAN
    else:
        color = Color.RESET

    print(f"    Hand: [{hand_str}]")
    print(f"    {color}{Color.BOLD}{hand_name}{Color.RESET}")


def play_poker_round(board, player_name):
    print(f"\n  {Color.BOLD}{player_name} wirft 5 Darts:{Color.RESET}")

    throws = []
    for d in range(1, 6):
        input(f"    Dart {d}/5 [Enter]...")
        throw_animation()
        result, points = board.throw()
        parsed = parse_throw(result, points)
        throws.append(parsed)
        print(f"      -> {Color.colorize_result(result, points)}")

    rank, hand_name, score = evaluate_hand(throws)
    display_hand(throws, hand_name, rank)

    return rank, hand_name, score, throws


def run_poker(player_names, num_rounds=5):
    board = DartBoard()

    print(f"\n{Color.muted('═' * 50)}")
    print(Color.title(f"{'DART POKER':^50}"))
    print(f"{Color.muted('═' * 50)}")
    print(f"  Spieler: {', '.join(player_names)}")
    print(f"  Runden:  {num_rounds}")
    print(f"  {Color.info('5 Darts pro Runde = eine Poker-Hand!')}")

    print(f"\n  {Color.muted('Hände (beste → schlechteste):')}")
    for name, rank, desc in HAND_RANKS[:5]:
        print(f"    {rank:>2}. {name:<20} {Color.muted(desc)}")
    print(f"    {Color.muted('... und mehr')}")

    print(f"{Color.muted('═' * 50)}")

    total_scores = {p: 0 for p in player_names}
    best_hands = {p: (0, "Nichts") for p in player_names}
    rounds_won = {p: 0 for p in player_names}

    for r in range(1, num_rounds + 1):
        print(f"\n  {Color.BOLD}{Color.YELLOW}═══ Runde {r}/{num_rounds} ═══{Color.RESET}")

        round_results = {}
        for player in player_names:
            rank, hand_name, score, throws = play_poker_round(board, player)
            round_results[player] = (rank, hand_name, score)

            if rank > best_hands[player][0]:
                best_hands[player] = (rank, hand_name)

        best_rank = max(r[0] for r in round_results.values())
        best_score = max(r[2] for r in round_results.values() if r[0] == best_rank)
        round_winners = [
            p for p, (rank, _, score) in round_results.items()
            if rank == best_rank and score == best_score
        ]

        print(f"\n  {Color.muted('Runden-Ergebnis:')}")
        for player in player_names:
            rank, hand_name, score = round_results[player]
            is_winner = player in round_winners
            if is_winner:
                rounds_won[player] += 1
                total_scores[player] += rank * 10 + score
                print(f"    {Color.GREEN}★{Color.RESET} {Color.BOLD}{player}{Color.RESET}: "
                      f"{hand_name} ({score} Pkt) {Color.success('GEWINNT!')}")
            else:
                total_scores[player] += rank * 5
                print(f"      {player}: {hand_name} ({score} Pkt)")

        if r < num_rounds:
            input(Color.muted("\n  [Enter] für nächste Runde..."))

    print(f"\n{Color.muted('═' * 50)}")
    print(Color.title(f"{'DART POKER - ENDERGEBNIS':^50}"))
    print(f"{Color.muted('═' * 50)}")

    final = sorted(total_scores.items(), key=lambda x: -x[1])
    medals = ["🃏", "🂠", "🂡"]

    for i, (name, score) in enumerate(final):
        medal = medals[i] if i < 3 else f"  {i+1}."
        bh_rank, bh_name = best_hands[name]
        print(f"  {medal} {Color.BOLD}{name}{Color.RESET}: {score} Pkt | "
              f"Runden: {rounds_won[name]} | Beste Hand: {bh_name}")

    winner = final[0][0]
    print(f"\n  {Color.BOLD}{Color.YELLOW}🃏 {winner} gewinnt Dart Poker! 🃏{Color.RESET}")
    print(f"{Color.muted('═' * 50)}")


def poker_menu():
    print(Color.muted("=" * 50))
    print(Color.title(f"{'DART POKER':^50}"))
    print(Color.muted("=" * 50))

    print(f"\n  {Color.info('Wirf Dart-Hände und bilde Poker-Kombinationen!')}")
    print("  5 Darts = 1 Hand | Gleiche Zahlen = Paare/Drilling\n")

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
        rounds = int(input("\n  Runden (3-10): ").strip())
        rounds = max(3, min(10, rounds))
    except ValueError:
        rounds = 5

    input(f"\n  {Color.muted('[Enter] zum Starten...')}")

    run_poker(names, rounds)
    input(f"\n  {Color.muted('[Enter] zum Fortfahren...')}")
