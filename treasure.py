#!/usr/bin/env python3
"""Treasure Hunt: Erkunde eine Karte durch Dartwürfe und finde Schätze."""

import random
from dart_game import DartBoard, Color, throw_animation

GRID_SIZE = 5
MAX_TURNS = 20


def create_map():
    grid = [[" " for _ in range(GRID_SIZE)] for _ in range(GRID_SIZE)]

    treasures = []
    for _ in range(3):
        while True:
            r, c = random.randint(0, GRID_SIZE - 1), random.randint(0, GRID_SIZE - 1)
            if grid[r][c] == " ":
                grid[r][c] = "T"
                treasures.append((r, c))
                break

    for _ in range(2):
        while True:
            r, c = random.randint(0, GRID_SIZE - 1), random.randint(0, GRID_SIZE - 1)
            if grid[r][c] == " ":
                grid[r][c] = "X"
                break

    for _ in range(2):
        while True:
            r, c = random.randint(0, GRID_SIZE - 1), random.randint(0, GRID_SIZE - 1)
            if grid[r][c] == " ":
                grid[r][c] = "+"
                break

    return grid, treasures


def display_map(grid, visited, player_pos):
    print(f"\n  {Color.muted('   ' + '  '.join(str(c + 1) for c in range(GRID_SIZE)))}")

    for r in range(GRID_SIZE):
        row_str = f"  {r + 1} "
        for c in range(GRID_SIZE):
            if (r, c) == player_pos:
                row_str += f" {Color.CYAN}{Color.BOLD}@{Color.RESET} "
            elif (r, c) in visited:
                cell = grid[r][c]
                if cell == "T":
                    row_str += f" {Color.YELLOW}${Color.RESET} "
                elif cell == "X":
                    row_str += f" {Color.RED}!{Color.RESET} "
                elif cell == "+":
                    row_str += f" {Color.GREEN}+{Color.RESET} "
                else:
                    row_str += f" {Color.muted('.')} "
            else:
                row_str += f" {Color.muted('?')} "
        print(row_str)


def get_direction(points):
    if points >= 40:
        return "up"
    elif points >= 25:
        return "right"
    elif points >= 10:
        return "down"
    else:
        return "left"


def move(pos, direction):
    r, c = pos
    if direction == "up":
        r = max(0, r - 1)
    elif direction == "down":
        r = min(GRID_SIZE - 1, r + 1)
    elif direction == "left":
        c = max(0, c - 1)
    elif direction == "right":
        c = min(GRID_SIZE - 1, c + 1)
    return (r, c)


def run_treasure_hunt():
    board = DartBoard()
    grid, treasures = create_map()

    start_r = random.randint(0, GRID_SIZE - 1)
    start_c = random.randint(0, GRID_SIZE - 1)
    while grid[start_r][start_c] != " ":
        start_r = random.randint(0, GRID_SIZE - 1)
        start_c = random.randint(0, GRID_SIZE - 1)

    player_pos = (start_r, start_c)
    visited = {player_pos}
    gold = 0
    health = 3
    treasures_found = 0

    print(f"\n{Color.muted('═' * 50)}")
    print(Color.title(f"{'TREASURE HUNT':^50}"))
    print(f"{Color.muted('═' * 50)}")
    print(f"  {Color.info('Erkunde die Karte und finde 3 Schätze!')}")
    print(f"  Dein Wurf bestimmt die Richtung:")
    print(f"    40+ Punkte = {Color.CYAN}Hoch{Color.RESET}")
    print(f"    25-39      = {Color.CYAN}Rechts{Color.RESET}")
    print(f"    10-24      = {Color.CYAN}Runter{Color.RESET}")
    print(f"    0-9        = {Color.CYAN}Links{Color.RESET}")
    print(f"  Symbole: $ = Schatz | ! = Falle | + = Heilung")
    print(f"  Züge: {MAX_TURNS} | Leben: {health}")
    print(f"{Color.muted('═' * 50)}")

    for turn in range(1, MAX_TURNS + 1):
        display_map(grid, visited, player_pos)

        print(f"\n  Zug {turn}/{MAX_TURNS} | "
              f"Leben: {'❤' * health} | "
              f"Schätze: {treasures_found}/3 | "
              f"Gold: {gold}")

        if treasures_found >= 3:
            break

        input(f"  Dart [Enter]...")
        throw_animation()
        result, points = board.throw()
        direction = get_direction(points)

        dir_labels = {"up": "↑ Hoch", "down": "↓ Runter", "left": "← Links", "right": "→ Rechts"}
        print(f"    -> {Color.colorize_result(result, points)} "
              f"= {Color.CYAN}{dir_labels[direction]}{Color.RESET}")

        new_pos = move(player_pos, direction)

        if new_pos == player_pos:
            print(f"    {Color.muted('Rand erreicht - kein Bewegen möglich')}")
            continue

        player_pos = new_pos
        visited.add(player_pos)

        cell = grid[player_pos[0]][player_pos[1]]

        if cell == "T":
            treasures_found += 1
            reward = random.randint(50, 150)
            gold += reward
            grid[player_pos[0]][player_pos[1]] = " "
            print(f"    {Color.YELLOW}{Color.BOLD}SCHATZ GEFUNDEN! +{reward} Gold{Color.RESET}")
        elif cell == "X":
            health -= 1
            grid[player_pos[0]][player_pos[1]] = " "
            print(f"    {Color.RED}{Color.BOLD}FALLE! -1 Leben{Color.RESET}")
            if health <= 0:
                print(f"    {Color.RED}Keine Leben mehr!{Color.RESET}")
                break
        elif cell == "+":
            health = min(health + 1, 5)
            grid[player_pos[0]][player_pos[1]] = " "
            print(f"    {Color.GREEN}Heilung! +1 Leben{Color.RESET}")
        else:
            print(f"    {Color.muted('Leeres Feld')}")

    display_map(grid, visited, player_pos)

    won = treasures_found >= 3

    print(f"\n{Color.muted('═' * 50)}")
    if won:
        print(f"{Color.BOLD}{Color.YELLOW}")
        print(f"  {'★' * 25}")
        print(f"  {'ALLE SCHÄTZE GEFUNDEN!':^50}")
        print(f"  {f'{gold} Gold gesammelt':^50}")
        print(f"  {'★' * 25}")
        print(f"{Color.RESET}")
    else:
        if health <= 0:
            print(f"  {Color.RED}{Color.BOLD}GAME OVER - Keine Leben mehr!{Color.RESET}")
        else:
            print(f"  {Color.RED}Zeit abgelaufen!{Color.RESET}")
        print(f"  Schätze: {treasures_found}/3 | Gold: {gold}")

    explored = len(visited)
    total = GRID_SIZE * GRID_SIZE
    print(f"  Erkundet: {explored}/{total} Felder ({explored / total * 100:.0f}%)")
    print(f"{Color.muted('═' * 50)}")

    return won, gold


def treasure_menu():
    print(Color.muted("=" * 50))
    print(Color.title(f"{'TREASURE HUNT':^50}"))
    print(Color.muted("=" * 50))

    print(f"\n  {Color.info('Erkunde eine Karte und finde versteckte Schätze!')}")
    print("  Dein Dartwurf bestimmt die Richtung.\n")

    print("    1) Schatzsuche starten")
    print("    2) Zurück")

    choice = input("  Wahl (1-2): ").strip()
    if choice == "1":
        run_treasure_hunt()
        input(f"\n  {Color.muted('[Enter] zum Fortfahren...')}")
