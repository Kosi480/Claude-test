#!/usr/bin/env python3
"""Dart Bowling: Bowling-Regeln mit Dartwürfen."""

import random
from dart_game import DartBoard, Color, throw_animation
from training import parse_hit_number


NUM_FRAMES = 10
PINS = list(range(1, 11))


def setup_pins():
    segments = random.sample(range(1, 21), 10)
    pins = {}
    for i, seg in enumerate(PINS):
        pins[i + 1] = {"segment": segments[i], "standing": True}
    return pins


def display_pins(pins, frame, ball):
    standing = [p for p in PINS if pins[p]["standing"]]
    knocked = [p for p in PINS if not pins[p]["standing"]]

    print(f"\n  {Color.BOLD}Frame {frame} - Wurf {ball}{Color.RESET}")
    print(f"  {Color.muted('─' * 40)}")

    rows = [[7, 8, 9, 10], [4, 5, 6], [2, 3], [1]]
    for row in rows:
        line = "  " + " " * (4 - len(row)) * 2
        for p in row:
            if pins[p]["standing"]:
                seg = pins[p]["segment"]
                line += f" {Color.YELLOW}{seg:>2}{Color.RESET} "
            else:
                line += f" {Color.muted(' ·')} "
        print(line)

    print(f"  {Color.muted('─' * 40)}")
    print(f"  Stehend: {len(standing)} | Gefallen: {len(knocked)}")


def check_hit(result, pins):
    hit_num, hit_type = parse_hit_number(result)
    knocked = []

    for pin_id, pin_data in pins.items():
        if not pin_data["standing"]:
            continue
        if pin_data["segment"] == hit_num:
            pin_data["standing"] = False
            knocked.append(pin_id)
            if hit_type == "double":
                neighbors = get_neighbors(pin_id)
                for n in neighbors:
                    if n in pins and pins[n]["standing"]:
                        pins[n]["standing"] = False
                        knocked.append(n)
            elif hit_type == "triple":
                for n in PINS:
                    if pins[n]["standing"] and abs(n - pin_id) <= 2:
                        pins[n]["standing"] = False
                        if n not in knocked:
                            knocked.append(n)
            break

    if result == "Bullseye":
        standing = [p for p in PINS if pins[p]["standing"]]
        if standing:
            target = random.choice(standing)
            pins[target]["standing"] = False
            knocked.append(target)
            n_list = get_neighbors(target)
            for n in n_list:
                if n in pins and pins[n]["standing"]:
                    pins[n]["standing"] = False
                    knocked.append(n)
    elif result == "Bull":
        standing = [p for p in PINS if pins[p]["standing"]]
        if standing:
            target = random.choice(standing)
            pins[target]["standing"] = False
            knocked.append(target)

    return list(set(knocked))


def get_neighbors(pin_id):
    neighbor_map = {
        1: [2, 3],
        2: [1, 3, 4, 5],
        3: [1, 2, 5, 6],
        4: [2, 5, 7, 8],
        5: [2, 3, 4, 6, 8, 9],
        6: [3, 5, 9, 10],
        7: [4, 8],
        8: [4, 5, 7, 9],
        9: [5, 6, 8, 10],
        10: [6, 9],
    }
    return neighbor_map.get(pin_id, [])


def display_scorecard(frames, player_name):
    print(f"\n  {Color.BOLD}{player_name} - Scorecard{Color.RESET}")
    header = "  "
    scores = "  "
    totals = "  "
    running = 0

    for i in range(1, NUM_FRAMES + 1):
        f = frames.get(i, {})
        b1 = f.get("ball1", "")
        b2 = f.get("ball2", "")
        b3 = f.get("ball3", "")
        total = f.get("total", None)

        if i == 10:
            header += f"| {Color.BOLD}{i:^8}{Color.RESET} "
            if f.get("strike1"):
                b1_str = "X"
            else:
                b1_str = str(b1) if b1 != "" else " "

            if f.get("strike2"):
                b2_str = "X"
            elif f.get("spare"):
                b2_str = "/"
            else:
                b2_str = str(b2) if b2 != "" else " "

            if f.get("strike3"):
                b3_str = "X"
            elif f.get("spare2"):
                b3_str = "/"
            else:
                b3_str = str(b3) if b3 != "" else " "

            scores += f"| {b1_str} {b2_str} {b3_str}    "
        else:
            header += f"| {Color.BOLD}{i:^5}{Color.RESET} "
            if f.get("strike"):
                scores += f"|  {Color.RED}X{Color.RESET}   "
            elif f.get("spare"):
                b1_str = str(b1) if b1 != "" else " "
                scores += f"| {b1_str} {Color.GREEN}/{Color.RESET}  "
            else:
                b1_str = str(b1) if b1 != "" else " "
                b2_str = str(b2) if b2 != "" else " "
                scores += f"| {b1_str} {b2_str}  "

        if total is not None:
            running = total
            totals += f"| {running:>4}  " if i < 10 else f"| {running:>6}  "
        else:
            totals += "|       " if i < 10 else "|         "

    print(f"  {Color.muted('─' * 75)}")
    print(header + "|")
    print(scores + "|")
    print(totals + "|")
    print(f"  {Color.muted('─' * 75)}")


def calculate_score(frames):
    total = 0
    for i in range(1, NUM_FRAMES + 1):
        f = frames.get(i, {})
        if i < 10:
            if f.get("strike"):
                total += 10
                nf = frames.get(i + 1, {})
                if i + 1 < 10:
                    if nf.get("strike"):
                        total += 10
                        nnf = frames.get(i + 2, {})
                        total += nnf.get("ball1", 0)
                    else:
                        total += nf.get("ball1", 0) + nf.get("ball2", 0)
                else:
                    total += nf.get("ball1", 0) + nf.get("ball2", 0)
            elif f.get("spare"):
                total += 10
                nf = frames.get(i + 1, {})
                total += nf.get("ball1", 0)
            else:
                total += f.get("ball1", 0) + f.get("ball2", 0)
        else:
            total += f.get("ball1", 0) + f.get("ball2", 0) + f.get("ball3", 0)
        f["total"] = total
    return total


def play_frame(board, pins, frame_num, is_tenth=False):
    frame = {}

    if is_tenth:
        for ball in range(1, 4):
            if ball == 1 or frame.get("strike1") or frame.get("strike2") or frame.get("spare"):
                if ball > 1 and ((ball == 2 and frame.get("strike1")) or frame.get("strike2") or (ball == 3 and frame.get("spare"))):
                    pins = setup_pins()

                display_pins(pins, frame_num, ball)
                input(f"    Dart [Enter]...")
                throw_animation()
                result, points = board.throw()
                knocked = check_hit(result, pins)
                knocked_count = len(knocked)

                standing_before = sum(1 for p in PINS if pins[p]["standing"]) + knocked_count
                standing_after = sum(1 for p in PINS if pins[p]["standing"])

                print(f"    -> {Color.colorize_result(result, points)}")

                if knocked_count > 0:
                    print(f"    {Color.GREEN}{knocked_count} Pins gefallen!{Color.RESET}")
                else:
                    print(f"    {Color.muted('Kein Pin getroffen')}")

                if ball == 1:
                    frame["ball1"] = knocked_count
                    if standing_after == 0:
                        frame["strike1"] = True
                        print(f"    {Color.RED}{Color.BOLD}STRIKE!{Color.RESET}")
                elif ball == 2:
                    frame["ball2"] = knocked_count
                    if standing_after == 0 and not frame.get("strike1"):
                        frame["spare"] = True
                        print(f"    {Color.GREEN}{Color.BOLD}SPARE!{Color.RESET}")
                    elif standing_after == 0:
                        frame["strike2"] = True
                        print(f"    {Color.RED}{Color.BOLD}STRIKE!{Color.RESET}")
                elif ball == 3:
                    frame["ball3"] = knocked_count
                    if standing_after == 0 and frame.get("strike2"):
                        frame["strike3"] = True
                        print(f"    {Color.RED}{Color.BOLD}STRIKE!{Color.RESET}")
                    elif standing_after == 0:
                        frame["spare2"] = True
                        print(f"    {Color.GREEN}{Color.BOLD}SPARE!{Color.RESET}")
            else:
                frame.setdefault("ball3", 0)
                break

        frame.setdefault("ball1", 0)
        frame.setdefault("ball2", 0)
        frame.setdefault("ball3", 0)

    else:
        display_pins(pins, frame_num, 1)
        input(f"    Dart [Enter]...")
        throw_animation()
        result, points = board.throw()
        knocked = check_hit(result, pins)
        knocked_count = len(knocked)

        print(f"    -> {Color.colorize_result(result, points)}")

        if knocked_count > 0:
            print(f"    {Color.GREEN}{knocked_count} Pins gefallen!{Color.RESET}")
        else:
            print(f"    {Color.muted('Kein Pin getroffen')}")

        frame["ball1"] = knocked_count

        standing = sum(1 for p in PINS if pins[p]["standing"])
        if standing == 0:
            frame["strike"] = True
            frame["ball2"] = 0
            print(f"    {Color.RED}{Color.BOLD}STRIKE!{Color.RESET}")
        else:
            display_pins(pins, frame_num, 2)
            input(f"    Dart [Enter]...")
            throw_animation()
            result2, points2 = board.throw()
            knocked2 = check_hit(result2, pins)
            knocked_count2 = len(knocked2)

            print(f"    -> {Color.colorize_result(result2, points2)}")

            if knocked_count2 > 0:
                print(f"    {Color.GREEN}{knocked_count2} Pins gefallen!{Color.RESET}")
            else:
                print(f"    {Color.muted('Kein Pin getroffen')}")

            frame["ball2"] = knocked_count2
            standing2 = sum(1 for p in PINS if pins[p]["standing"])
            if standing2 == 0:
                frame["spare"] = True
                print(f"    {Color.GREEN}{Color.BOLD}SPARE!{Color.RESET}")

    return frame


def run_bowling(player_names):
    board = DartBoard()

    print(f"\n{Color.muted('═' * 50)}")
    print(Color.title(f"{'DART BOWLING':^50}"))
    print(f"{Color.muted('═' * 50)}")
    print(f"  Spieler: {', '.join(player_names)}")
    print(f"  {Color.info('10 Frames - Bowling-Wertung mit Darts!')}")
    print(f"  Single = trifft 1 Pin")
    print(f"  Double = trifft Pin + Nachbarn")
    print(f"  Triple = trifft Bereich (±2 Pins)")
    print(f"  Bullseye = zufälliger Pin + Nachbarn")
    print(f"{Color.muted('═' * 50)}")

    all_frames = {name: {} for name in player_names}

    for frame_num in range(1, NUM_FRAMES + 1):
        is_tenth = (frame_num == 10)
        print(f"\n{Color.BOLD}{Color.MAGENTA}  ═══ Frame {frame_num}/{NUM_FRAMES} ═══{Color.RESET}")

        for name in player_names:
            pins = setup_pins()

            print(f"\n  {Color.BOLD}{name}{Color.RESET} ist dran")

            seg_list = ", ".join(f"{pins[p]['segment']}" for p in PINS)
            print(f"  Pin-Segmente: {Color.muted(seg_list)}")

            frame_result = play_frame(board, pins, frame_num, is_tenth)
            all_frames[name][frame_num] = frame_result

            calculate_score(all_frames[name])
            display_scorecard(all_frames[name], name)

    print(f"\n{Color.muted('═' * 50)}")
    print(Color.title(f"{'ENDERGEBNIS':^50}"))
    print(f"{Color.muted('═' * 50)}")

    final_scores = {}
    for name in player_names:
        total = calculate_score(all_frames[name])
        final_scores[name] = total
        display_scorecard(all_frames[name], name)

    sorted_players = sorted(final_scores.items(), key=lambda x: -x[1])
    print()
    for i, (name, score) in enumerate(sorted_players):
        medal = {0: "🏆", 1: "🥈", 2: "🥉"}.get(i, "  ")
        print(f"  {medal} {name}: {Color.BOLD}{score}{Color.RESET} Punkte")

    winner_name = sorted_players[0][0]
    winner_score = sorted_players[0][1]
    print(f"\n  {Color.BOLD}{Color.YELLOW}🎳 {winner_name} gewinnt Dart Bowling mit {winner_score} Punkten! 🎳{Color.RESET}")

    strikes = sum(1 for f in all_frames[winner_name].values() if f.get("strike") or f.get("strike1"))
    spares = sum(1 for f in all_frames[winner_name].values() if f.get("spare"))
    print(f"  Strikes: {strikes} | Spares: {spares}")

    if winner_score >= 200:
        print(f"  {Color.GREEN}{Color.BOLD}Fantastisches Spiel!{Color.RESET}")
    elif winner_score >= 150:
        print(f"  {Color.GREEN}Gutes Spiel!{Color.RESET}")

    print(f"{Color.muted('═' * 50)}")
    return winner_name


def bowling_menu():
    print(Color.muted("=" * 50))
    print(Color.title(f"{'DART BOWLING':^50}"))
    print(Color.muted("=" * 50))

    print(f"\n  {Color.info('Bowling mit Darts!')}")
    print("  10 Frames, Strikes & Spares nach Bowling-Regeln.\n")

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

    input(f"\n  {Color.muted('[Enter] zum Starten...')}")

    run_bowling(names)
    input(f"\n  {Color.muted('[Enter] zum Fortfahren...')}")
