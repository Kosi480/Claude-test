#!/usr/bin/env python3
"""Dart War: Rundenbasiertes Territorialspiel mit Dartwürfen."""

import random
from dart_game import DartBoard, Color, throw_animation
from training import parse_hit_number


TERRITORIES = [
    {"name": "Nordreich", "segments": [1, 2, 3, 4, 5], "bonus": 10},
    {"name": "Ostland", "segments": [6, 7, 8, 9, 10], "bonus": 10},
    {"name": "Südmark", "segments": [11, 12, 13, 14, 15], "bonus": 10},
    {"name": "Westwall", "segments": [16, 17, 18, 19, 20], "bonus": 10},
]


def run_war(player_names):
    board = DartBoard()

    print(f"\n{Color.muted('═' * 50)}")
    print(Color.title(f"{'DART WAR':^50}"))
    print(f"{Color.muted('═' * 50)}")
    print(f"  {Color.info('Erobere Territorien durch Dartwürfe!')}")
    print(f"  4 Territorien mit je 5 Segmenten.")
    print(f"  Triff ein Segment = beanspruche es.")
    print(f"  Wer ein Territorium komplett hat, bekommt Bonus.")
    print(f"  Nach 10 Runden gewinnt wer die meisten Gebiete hat.")
    print(f"{Color.muted('═' * 50)}")

    colors = [Color.CYAN, Color.YELLOW, Color.GREEN, Color.MAGENTA]
    segment_owner = {}
    territory_owner = {t["name"]: None for t in TERRITORIES}
    scores = {name: 0 for name in player_names}
    controlled = {name: [] for name in player_names}

    num_rounds = 10

    for round_num in range(1, num_rounds + 1):
        print(f"\n{Color.BOLD}{Color.MAGENTA}  ═══ Runde {round_num}/{num_rounds} ═══{Color.RESET}")

        display_war_map(TERRITORIES, segment_owner, territory_owner, player_names, colors)

        print(f"\n  {Color.muted('Punktestand:')}")
        for i, name in enumerate(player_names):
            segs = sum(1 for s in segment_owner.values() if s == name)
            terrs = sum(1 for t in territory_owner.values() if t == name)
            print(f"  {colors[i]}{name}{Color.RESET}: {segs} Segmente, "
                  f"{terrs} Territorien, {scores[name]} Punkte")

        for p_idx, name in enumerate(player_names):
            print(f"\n  {Color.BOLD}{name}{Color.RESET} ist dran")

            for dart in range(1, 4):
                input(f"    Dart {dart}/3 [Enter]...")
                throw_animation()
                result, points = board.throw()
                hit_num, hit_type = parse_hit_number(result)

                print(f"    -> {Color.colorize_result(result, points)}", end="")

                if hit_num == 0 or result in ("Miss", "Bullseye", "Bull"):
                    if result == "Bullseye":
                        scores[name] += 25
                        print(f" - {Color.YELLOW}+25 Bonuspunkte!{Color.RESET}")
                    elif result == "Bull":
                        scores[name] += 10
                        print(f" - {Color.YELLOW}+10 Bonuspunkte!{Color.RESET}")
                    else:
                        print(f" - {Color.muted('Daneben')}")
                    continue

                if hit_num not in segment_owner:
                    segment_owner[hit_num] = name
                    mult = 2 if hit_type == "double" else 3 if hit_type == "triple" else 1
                    earned = hit_num * mult
                    scores[name] += earned
                    print(f" - {Color.GREEN}Segment {hit_num} erobert! +{earned}{Color.RESET}")

                    for terr in TERRITORIES:
                        if hit_num in terr["segments"]:
                            all_owned = all(
                                segment_owner.get(s) == name for s in terr["segments"]
                            )
                            if all_owned and territory_owner[terr["name"]] != name:
                                territory_owner[terr["name"]] = name
                                scores[name] += terr["bonus"]
                                controlled[name].append(terr["name"])
                                print(f"    {Color.BOLD}{Color.YELLOW}"
                                      f"TERRITORIUM EROBERT: {terr['name']}! "
                                      f"+{terr['bonus']} Bonus{Color.RESET}")
                            break
                elif segment_owner[hit_num] == name:
                    scores[name] += 5
                    print(f" - {Color.muted('Eigenes Gebiet (+5)')}")
                else:
                    old_owner = segment_owner[hit_num]
                    if hit_type in ("double", "triple"):
                        segment_owner[hit_num] = name
                        mult = 2 if hit_type == "double" else 3
                        earned = hit_num * mult
                        scores[name] += earned
                        scores[old_owner] = max(0, scores[old_owner] - hit_num)
                        print(f" - {Color.RED}Segment {hit_num} von {old_owner} "
                              f"gestohlen! +{earned}{Color.RESET}")

                        for terr in TERRITORIES:
                            if hit_num in terr["segments"]:
                                if territory_owner[terr["name"]] == old_owner:
                                    territory_owner[terr["name"]] = None
                                    if terr["name"] in controlled[old_owner]:
                                        controlled[old_owner].remove(terr["name"])
                                    print(f"    {Color.RED}{old_owner} verliert "
                                          f"{terr['name']}!{Color.RESET}")

                                all_owned = all(
                                    segment_owner.get(s) == name for s in terr["segments"]
                                )
                                if all_owned:
                                    territory_owner[terr["name"]] = name
                                    scores[name] += terr["bonus"]
                                    controlled[name].append(terr["name"])
                                    print(f"    {Color.BOLD}{Color.YELLOW}"
                                          f"TERRITORIUM EROBERT: {terr['name']}!{Color.RESET}")
                                break
                    else:
                        print(f" - {Color.YELLOW}Gebiet von {old_owner} "
                              f"(Double/Triple nötig zum Stehlen){Color.RESET}")

    display_war_map(TERRITORIES, segment_owner, territory_owner, player_names, colors)

    print(f"\n{Color.muted('═' * 50)}")
    print(Color.title(f"{'DART WAR - ENDERGEBNIS':^50}"))
    print(f"{Color.muted('═' * 50)}")

    for name in player_names:
        terr_bonus = sum(
            t["bonus"] for t in TERRITORIES if territory_owner[t["name"]] == name
        )
        scores[name] += terr_bonus

    sorted_players = sorted(scores.items(), key=lambda x: -x[1])

    for i, (name, score) in enumerate(sorted_players):
        p_idx = player_names.index(name)
        segs = sum(1 for s in segment_owner.values() if s == name)
        terrs = sum(1 for t in territory_owner.values() if t == name)
        medal = {0: "⚔", 1: "🥈", 2: "🥉"}.get(i, "  ")
        print(f"  {medal} {colors[p_idx]}{name}{Color.RESET}: "
              f"{Color.BOLD}{score}{Color.RESET} Punkte | "
              f"{segs} Segmente | {terrs} Territorien")

    winner_name = sorted_players[0][0]
    print(f"\n  {Color.BOLD}{Color.YELLOW}"
          f"⚔ {winner_name} gewinnt Dart War! ⚔{Color.RESET}")
    print(f"{Color.muted('═' * 50)}")
    return winner_name


def display_war_map(territories, segment_owner, territory_owner, players, colors):
    print(f"\n  {Color.BOLD}Karte:{Color.RESET}")
    print(f"  {Color.muted('─' * 44)}")

    for terr in territories:
        owner = territory_owner[terr["name"]]
        if owner:
            p_idx = players.index(owner)
            terr_color = colors[p_idx]
            print(f"  {terr_color}{Color.BOLD}{terr['name']}{Color.RESET} "
                  f"[{terr_color}{owner}{Color.RESET}]")
        else:
            print(f"  {Color.muted(terr['name'])} [---]")

        seg_strs = []
        for seg in terr["segments"]:
            if seg in segment_owner:
                p_idx = players.index(segment_owner[seg])
                seg_strs.append(f"{colors[p_idx]}{seg:>2}{Color.RESET}")
            else:
                seg_strs.append(f"{Color.muted(f'{seg:>2}')}")

        print(f"    Segmente: {' | '.join(seg_strs)}")

    print(f"  {Color.muted('─' * 44)}")


def war_menu():
    print(Color.muted("=" * 50))
    print(Color.title(f"{'DART WAR':^50}"))
    print(Color.muted("=" * 50))

    print(f"\n  {Color.info('Erobere Territorien durch Dartwürfe!')}")
    print("  Segmente 1-20 aufgeteilt in 4 Gebiete.\n")

    try:
        num = int(input("  Anzahl Spieler (2-4): ").strip())
        num = max(2, min(4, num))
    except ValueError:
        num = 2

    names = []
    for i in range(num):
        name = input(f"  Name Spieler {i + 1}: ").strip()
        if not name:
            name = f"General {i + 1}"
        names.append(name)

    input(f"\n  {Color.muted('[Enter] zum Starten...')}")

    run_war(names)
    input(f"\n  {Color.muted('[Enter] zum Fortfahren...')}")
