#!/usr/bin/env python3
"""Dart Memory: Finde Paare durch gezielte Würfe auf Segmente."""

import random
from dart_game import DartBoard, Color, throw_animation


SYMBOLS = ["♠", "♥", "♦", "♣", "★", "●", "▲", "■"]


def create_memory_board(pairs=6):
    symbols = SYMBOLS[:pairs]
    cards = symbols * 2
    random.shuffle(cards)

    segments = random.sample(range(1, 21), len(cards))
    board_map = {}
    for i, seg in enumerate(segments):
        board_map[seg] = {
            "symbol": cards[i],
            "revealed": False,
            "matched": False,
        }

    return board_map, segments


def display_memory_board(board_map, segments):
    print(f"\n  {Color.BOLD}Memory-Board:{Color.RESET}")
    print(f"  {Color.muted('─' * 44)}")

    cols = 4
    for i in range(0, len(segments), cols):
        row_segs = segments[i:i + cols]
        line = "  "
        for seg in row_segs:
            card = board_map[seg]
            if card["matched"]:
                line += f"  {Color.GREEN}{card['symbol']} ({seg:>2}){Color.RESET}  "
            elif card["revealed"]:
                line += f"  {Color.YELLOW}{card['symbol']} ({seg:>2}){Color.RESET}  "
            else:
                line += f"  {Color.muted(f'? ({seg:>2})')}  "
        print(line)

    print(f"  {Color.muted('─' * 44)}")


def get_segment_from_throw(result):
    if result in ("Bullseye", "Bull", "Miss"):
        return 0
    parts = result.split()
    if len(parts) == 2:
        try:
            return int(parts[1])
        except ValueError:
            return 0
    elif len(parts) == 1:
        try:
            return int(parts[0])
        except ValueError:
            return 0
    return 0


def run_memory(player_names, pairs=6):
    board = DartBoard()
    mem_board, segments = create_memory_board(pairs)

    print(f"\n{Color.muted('═' * 50)}")
    print(Color.title(f"{'DART MEMORY':^50}"))
    print(f"{Color.muted('═' * 50)}")
    print(f"  Spieler: {', '.join(player_names)}")
    print(f"  Paare:   {pairs}")
    print(f"  {Color.info('Wirf auf Segmente, um Karten aufzudecken!')}")
    print(f"  Finde alle Paare!")
    print(f"{Color.muted('═' * 50)}")

    print(f"\n  Segmente mit Karten: {', '.join(str(s) for s in sorted(segments))}")

    scores = {p: 0 for p in player_names}
    total_turns = {p: 0 for p in player_names}
    matched_pairs = 0
    player_idx = 0

    while matched_pairs < pairs:
        player = player_names[player_idx % len(player_names)]
        total_turns[player] += 1

        display_memory_board(mem_board, segments)
        print(f"\n  {Color.BOLD}{player}{Color.RESET} ist dran (Paare: {scores[player]})")

        first_seg = None
        second_seg = None

        print(f"  Erste Karte aufdecken:")
        input(f"    Dart [Enter]...")
        throw_animation()
        result1, points1 = board.throw()
        seg1 = get_segment_from_throw(result1)
        print(f"    -> {Color.colorize_result(result1, points1)}")

        if seg1 in mem_board and not mem_board[seg1]["matched"]:
            mem_board[seg1]["revealed"] = True
            first_seg = seg1
            sym1 = mem_board[seg1]["symbol"]
            print(f"    Aufgedeckt: {Color.YELLOW}{sym1}{Color.RESET} auf Segment {seg1}")
        else:
            if seg1 not in mem_board:
                print(f"    {Color.muted('Kein Kartensegment getroffen!')}")
            else:
                print(f"    {Color.muted('Bereits gefunden!')}")
            player_idx += 1
            continue

        display_memory_board(mem_board, segments)

        print(f"  Zweite Karte aufdecken:")
        input(f"    Dart [Enter]...")
        throw_animation()
        result2, points2 = board.throw()
        seg2 = get_segment_from_throw(result2)
        print(f"    -> {Color.colorize_result(result2, points2)}")

        if seg2 in mem_board and not mem_board[seg2]["matched"] and seg2 != first_seg:
            mem_board[seg2]["revealed"] = True
            second_seg = seg2
            sym2 = mem_board[seg2]["symbol"]
            print(f"    Aufgedeckt: {Color.YELLOW}{sym2}{Color.RESET} auf Segment {seg2}")

            if mem_board[first_seg]["symbol"] == mem_board[second_seg]["symbol"]:
                mem_board[first_seg]["matched"] = True
                mem_board[second_seg]["matched"] = True
                matched_pairs += 1
                scores[player] += 1
                print(f"\n    {Color.GREEN}{Color.BOLD}PAAR GEFUNDEN! {sym1}{Color.RESET}")
                print(f"    {player}: {scores[player]} Paare | "
                      f"Gesamt: {matched_pairs}/{pairs}")
            else:
                print(f"\n    {Color.RED}Kein Paar ({sym1} vs {sym2}){Color.RESET}")
                mem_board[first_seg]["revealed"] = False
                mem_board[second_seg]["revealed"] = False
                player_idx += 1
        else:
            if seg2 == first_seg:
                print(f"    {Color.muted('Gleiche Karte nochmal!')}")
            elif seg2 not in mem_board:
                print(f"    {Color.muted('Kein Kartensegment getroffen!')}")
            else:
                print(f"    {Color.muted('Bereits gefunden!')}")
            mem_board[first_seg]["revealed"] = False
            player_idx += 1

    display_memory_board(mem_board, segments)

    print(f"\n{Color.muted('═' * 50)}")
    print(Color.title(f"{'MEMORY - ERGEBNIS':^50}"))
    print(f"{Color.muted('═' * 50)}")

    final = sorted(scores.items(), key=lambda x: -x[1])

    for i, (name, pts) in enumerate(final):
        turns = total_turns[name]
        if i == 0:
            print(f"  🧠 {Color.BOLD}{name}{Color.RESET}: {pts} Paare ({turns} Züge)")
        else:
            print(f"  {i+1}. {name}: {pts} Paare ({turns} Züge)")

    winner = final[0][0]
    print(f"\n  {Color.success(f'{winner} gewinnt Dart Memory!')}")
    print(f"{Color.muted('═' * 50)}")
    return winner


def memory_menu():
    print(Color.muted("=" * 50))
    print(Color.title(f"{'DART MEMORY':^50}"))
    print(Color.muted("=" * 50))

    print(f"\n  {Color.info('Finde Kartenpaare durch Dartwerfen!')}")
    print("  Triff Segmente, um Karten aufzudecken.\n")

    try:
        num = int(input("  Anzahl Spieler (1-4): ").strip())
        num = max(1, min(4, num))
    except ValueError:
        num = 2

    names = []
    for i in range(num):
        name = input(f"  Name Spieler {i + 1}: ").strip()
        if not name:
            name = f"Spieler {i + 1}"
        names.append(name)

    print("\n  Schwierigkeit:")
    print("    1) Leicht (4 Paare)")
    print("    2) Mittel (6 Paare)")
    print("    3) Schwer (8 Paare)")
    dc = input("  Wahl (1-3): ").strip()
    pairs = {
        "1": 4,
        "2": 6,
        "3": 8,
    }.get(dc, 6)

    input(f"\n  {Color.muted('[Enter] zum Starten...')}")

    run_memory(names, pairs)
    input(f"\n  {Color.muted('[Enter] zum Fortfahren...')}")
