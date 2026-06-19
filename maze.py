#!/usr/bin/env python3
"""Dart Maze: Navigiere durch ein Labyrinth mit Dartwürfen."""

import random
from dart_game import DartBoard, Color, throw_animation
from training import parse_hit_number

DIRECTIONS = {
    "N": (0, -1), "S": (0, 1), "W": (-1, 0), "E": (1, 0),
}

DIR_SEGMENTS = {
    "N": range(1, 6),
    "E": range(6, 11),
    "S": range(11, 16),
    "W": range(16, 21),
}


def generate_maze(width=5, height=5):
    maze = [[{"N": True, "S": True, "E": True, "W": True}
             for _ in range(width)] for _ in range(height)]
    visited = [[False] * width for _ in range(height)]
    stack = [(0, 0)]
    visited[0][0] = True

    while stack:
        x, y = stack[-1]
        neighbors = []
        for d, (dx, dy) in DIRECTIONS.items():
            nx, ny = x + dx, y + dy
            if 0 <= nx < width and 0 <= ny < height and not visited[ny][nx]:
                neighbors.append((d, nx, ny))

        if neighbors:
            d, nx, ny = random.choice(neighbors)
            opp = {"N": "S", "S": "N", "E": "W", "W": "E"}[d]
            maze[y][x][d] = False
            maze[ny][nx][opp] = False
            visited[ny][nx] = True
            stack.append((nx, ny))
        else:
            stack.pop()

    return maze


def display_maze(maze, px, py, exit_x, exit_y, fog=True):
    h = len(maze)
    w = len(maze[0])

    print(f"  {'─' * (w * 4 + 1)}")
    for y in range(h):
        top = "  │"
        mid = "  │"
        for x in range(w):
            visible = not fog or abs(x - px) + abs(y - py) <= 2

            if not visible:
                top += "███│"
                mid += "███│"
                continue

            if maze[y][x]["N"]:
                top += "───│"
            else:
                top += "   │"

            if x == px and y == py:
                cell = " @ "
            elif x == exit_x and y == exit_y:
                cell = " X "
            else:
                cell = "   "

            if maze[y][x]["E"]:
                mid += cell + "│"
            else:
                mid += cell + " "

        print(top)
        print(mid)

        if y == h - 1:
            bot = "  │"
            for x in range(w):
                bot += "───│"
            print(bot)


def run_maze(width=5, height=5, fog=True):
    board = DartBoard()
    maze = generate_maze(width, height)
    px, py = 0, 0
    exit_x, exit_y = width - 1, height - 1
    moves = 0
    items_found = 0

    items = {}
    for _ in range(3):
        ix, iy = random.randint(0, width - 1), random.randint(0, height - 1)
        if (ix, iy) != (0, 0) and (ix, iy) != (exit_x, exit_y):
            items[(ix, iy)] = random.choice(["Schluessel", "Trank", "Karte"])

    print(f"\n{Color.muted('═' * 44)}")
    print(Color.title(f"{'DART MAZE':^44}"))
    print(f"{Color.muted('═' * 44)}")
    print(f"  {Color.info('Navigiere zum Ausgang!')}")
    print("  Segment 1-5:   Norden")
    print("  Segment 6-10:  Osten")
    print("  Segment 11-15: Sueden")
    print("  Segment 16-20: Westen")
    print("  Bullseye: Zeige gesamte Karte")
    print("  @ = Du, X = Ausgang")
    print(f"{Color.muted('═' * 44)}")

    while (px, py) != (exit_x, exit_y):
        display_maze(maze, px, py, exit_x, exit_y, fog)

        available = []
        cell = maze[py][px]
        for d in ["N", "E", "S", "W"]:
            if not cell[d]:
                available.append(d)
        dir_str = ", ".join(f"{d}({min(DIR_SEGMENTS[d])}-{max(DIR_SEGMENTS[d])})"
                            for d in available)
        print(f"\n  Moegliche Wege: {Color.CYAN}{dir_str}{Color.RESET}")

        input("  [Enter] zum Werfen...")
        throw_animation()
        result, points = board.throw()
        hit_num, hit_type = parse_hit_number(result)
        moves += 1

        print(f"  -> {Color.colorize_result(result, points)}", end="")

        if result == "Bullseye":
            print(f" - {Color.YELLOW}Karte aufgedeckt!{Color.RESET}")
            display_maze(maze, px, py, exit_x, exit_y, fog=False)
            continue

        moved = False
        for d, seg_range in DIR_SEGMENTS.items():
            if hit_num in seg_range and d in available:
                dx, dy = DIRECTIONS[d]
                px, py = px + dx, py + dy
                print(f" - {Color.GREEN}Bewege nach {d}!{Color.RESET}")
                moved = True
                break

        if not moved:
            print(f" - {Color.muted('Kann nicht dorthin gehen')}")

        if (px, py) in items:
            item = items.pop((px, py))
            items_found += 1
            print(f"  {Color.YELLOW}Item gefunden: {item}!{Color.RESET}")

    print(f"\n{Color.BOLD}{Color.YELLOW}{'*' * 44}")
    print(f"  LABYRINTH GESCHAFFT!")
    print(f"  Zuege: {moves}")
    print(f"  Items: {items_found}/{items_found + len(items)}")
    print(f"{'*' * 44}{Color.RESET}")

    if moves <= width + height:
        print(Color.success("  Bewertung: PERFEKT!"))
    elif moves <= (width + height) * 2:
        print(Color.success("  Bewertung: Sehr gut!"))
    elif moves <= (width + height) * 3:
        print(Color.info("  Bewertung: Gut"))
    else:
        print(Color.muted("  Bewertung: Weiter ueben!"))


def maze_menu():
    print(Color.muted("=" * 44))
    print(Color.title(f"{'DART MAZE':^44}"))
    print(Color.muted("=" * 44))

    print(f"\n  {Color.info('Navigiere durchs Labyrinth!')}")
    print("  Wirf Darts um dich zu bewegen.\n")

    print("    1) Klein (5x5)")
    print("    2) Mittel (7x7)")
    print("    3) Gross (9x9)")
    print("    4) Zurueck")

    choice = input("  Wahl (1-4): ").strip()
    if choice == "1":
        run_maze(5, 5)
    elif choice == "2":
        run_maze(7, 7)
    elif choice == "3":
        run_maze(9, 9)
    else:
        return
    input(f"\n  {Color.muted('[Enter] zum Fortfahren...')}")
