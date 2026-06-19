#!/usr/bin/env python3
"""Dart Assassin: Geheime Aufträge - eliminiere dein Ziel."""

import random
from dart_game import DartBoard, Color, throw_animation
from training import parse_hit_number


def assign_targets(player_names):
    names = list(player_names)
    random.shuffle(names)
    targets = {}
    for i, name in enumerate(names):
        target = names[(i + 1) % len(names)]
        targets[name] = target
    return targets


def run_assassin(player_names):
    board = DartBoard()
    segments = random.sample(range(1, 21), len(player_names))

    players = {}
    for i, name in enumerate(player_names):
        players[name] = {
            "segment": segments[i],
            "alive": True,
            "kills": 0,
            "shield": False,
            "darts_thrown": 0,
        }

    targets = assign_targets(player_names)

    print(f"\n{Color.muted('═' * 50)}")
    print(Color.title(f"{'DART ASSASSIN':^50}"))
    print(f"{Color.muted('═' * 50)}")
    print(f"  {Color.info('Geheime Aufträge!')}")
    print(f"  Jeder hat eine geheime Zahl und ein geheimes Ziel.")
    print(f"  Triff das Segment deines Ziels, um es zu eliminieren.")
    print(f"  Double = Sofort-Kill | Triple = Kill + Schild")
    print(f"  Dein Schild blockt EINEN Angriff.")
    print(f"  Letzter Überlebender gewinnt!")
    print(f"{Color.muted('═' * 50)}")

    print(f"\n  {Color.BOLD}Geheime Zuweisungen:{Color.RESET}")
    for name in player_names:
        target_name = targets[name]
        target_seg = players[target_name]["segment"]
        print(f"  {Color.muted('─' * 40)}")
        print(f"  {Color.BOLD}{name}{Color.RESET}:")
        print(f"    Deine Zahl:  {Color.CYAN}{players[name]['segment']}{Color.RESET}")
        print(f"    Dein Ziel:   {Color.RED}{target_name}{Color.RESET} "
              f"(Segment {Color.YELLOW}{target_seg}{Color.RESET})")

    print(f"\n  {Color.muted('Memoriert? Weiter geht es...')}")
    input(f"  {Color.muted('[Enter] zum Starten...')}")

    round_num = 0
    max_rounds = 20

    while sum(1 for p in players.values() if p["alive"]) > 1 and round_num < max_rounds:
        round_num += 1
        alive = [n for n in player_names if players[n]["alive"]]

        print(f"\n{Color.BOLD}{Color.MAGENTA}  ═══ Runde {round_num} ═══{Color.RESET}")

        for name in alive:
            target_name = targets[name]
            shield_icon = " 🛡" if players[name]["shield"] else ""
            print(f"  {name} ({players[name]['segment']}){shield_icon}: "
                  f"{players[name]['kills']} Kills")

        for name in alive:
            if not players[name]["alive"]:
                continue

            target_name = targets[name]
            while not players[target_name]["alive"]:
                target_name = targets[target_name]
                targets[name] = target_name

            if target_name == name:
                continue

            target_seg = players[target_name]["segment"]

            print(f"\n  {Color.BOLD}{name}{Color.RESET} ist dran")
            print(f"  Ziel: Segment {Color.YELLOW}{target_seg}{Color.RESET}")

            for dart in range(1, 4):
                if not players[name]["alive"] or not players[target_name]["alive"]:
                    break

                input(f"    Dart {dart}/3 [Enter]...")
                throw_animation()
                result, points = board.throw()
                hit_num, hit_type = parse_hit_number(result)
                players[name]["darts_thrown"] += 1

                print(f"    -> {Color.colorize_result(result, points)}", end="")

                if hit_num == target_seg:
                    if hit_type in ("double", "triple"):
                        if players[target_name]["shield"]:
                            players[target_name]["shield"] = False
                            print(f" - {Color.CYAN}Schild von {target_name} zerstört!{Color.RESET}")
                        else:
                            players[target_name]["alive"] = False
                            players[name]["kills"] += 1
                            kill_msg = "SOFORT-KILL!" if hit_type == "double" else "KILL + SCHILD!"
                            if hit_type == "triple":
                                players[name]["shield"] = True
                            print(f" - {Color.RED}{Color.BOLD}{kill_msg} {target_name} eliminiert!{Color.RESET}")

                            old_target_target = targets[target_name]
                            if old_target_target != name and players.get(old_target_target, {}).get("alive"):
                                targets[name] = old_target_target
                                new_seg = players[old_target_target]["segment"]
                                print(f"    Neues Ziel: {Color.YELLOW}{old_target_target}{Color.RESET} "
                                      f"(Segment {new_seg})")
                    elif hit_type == "single":
                        if players[target_name]["shield"]:
                            players[target_name]["shield"] = False
                            print(f" - {Color.CYAN}Schild von {target_name} zerstört!{Color.RESET}")
                        else:
                            players[target_name]["alive"] = False
                            players[name]["kills"] += 1
                            print(f" - {Color.RED}{Color.BOLD}KILL! {target_name} eliminiert!{Color.RESET}")

                            old_target_target = targets[target_name]
                            if old_target_target != name and players.get(old_target_target, {}).get("alive"):
                                targets[name] = old_target_target
                                new_seg = players[old_target_target]["segment"]
                                print(f"    Neues Ziel: {Color.YELLOW}{old_target_target}{Color.RESET} "
                                      f"(Segment {new_seg})")
                    else:
                        print(f" - {Color.muted('Kein Treffer')}")
                elif hit_num == players[name]["segment"] and hit_type == "double":
                    if not players[name]["shield"]:
                        players[name]["shield"] = True
                        print(f" - {Color.CYAN}Eigenes Double! Schild aktiviert!{Color.RESET}")
                    else:
                        print(f" - {Color.muted('Schild bereits aktiv')}")
                else:
                    for other_name, other_data in players.items():
                        if other_name != name and other_data["alive"] and other_data["segment"] == hit_num:
                            if hit_type in ("single", "double", "triple"):
                                print(f" - {Color.YELLOW}Versehentlich {other_name} getroffen!{Color.RESET}")
                                break
                    else:
                        print(f" - {Color.muted('Daneben')}")

            if sum(1 for p in players.values() if p["alive"]) <= 1:
                break

    alive_players = [n for n in player_names if players[n]["alive"]]

    print(f"\n{Color.muted('═' * 50)}")
    print(Color.title(f"{'ASSASSIN - ERGEBNIS':^50}"))
    print(f"{Color.muted('═' * 50)}")

    if len(alive_players) == 1:
        winner = alive_players[0]
        print(f"\n  {Color.BOLD}{Color.YELLOW}🗡 {winner} ist der letzte Überlebende! 🗡{Color.RESET}")
    else:
        most_kills = max(player_names, key=lambda n: players[n]["kills"])
        winner = most_kills
        print(f"\n  {Color.BOLD}Zeit abgelaufen nach {max_rounds} Runden!{Color.RESET}")
        print(f"  {Color.YELLOW}{winner} gewinnt mit den meisten Kills!{Color.RESET}")

    sorted_players = sorted(
        player_names,
        key=lambda n: (players[n]["alive"], players[n]["kills"]),
        reverse=True,
    )

    for i, name in enumerate(sorted_players):
        data = players[name]
        status = f"{Color.GREEN}Überlebt{Color.RESET}" if data["alive"] else f"{Color.RED}Eliminiert{Color.RESET}"
        medal = {0: "🗡", 1: "🥈", 2: "🥉"}.get(i, "  ")
        print(f"  {medal} {name}: {data['kills']} Kills | "
              f"{data['darts_thrown']} Darts | {status}")

    print(f"\n  Runden gespielt: {round_num}")
    print(f"{Color.muted('═' * 50)}")
    return winner


def assassin_menu():
    print(Color.muted("=" * 50))
    print(Color.title(f"{'DART ASSASSIN':^50}"))
    print(Color.muted("=" * 50))

    print(f"\n  {Color.info('Geheime Aufträge - eliminiere dein Ziel!')}")
    print("  Jeder bekommt ein geheimes Ziel zugewiesen.\n")

    try:
        num = int(input("  Anzahl Spieler (3-6): ").strip())
        num = max(3, min(6, num))
    except ValueError:
        num = 3

    names = []
    for i in range(num):
        name = input(f"  Name Spieler {i + 1}: ").strip()
        if not name:
            name = f"Agent {i + 1}"
        names.append(name)

    input(f"\n  {Color.muted('[Enter] zum Starten...')}")

    run_assassin(names)
    input(f"\n  {Color.muted('[Enter] zum Fortfahren...')}")
